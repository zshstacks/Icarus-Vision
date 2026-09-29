# Icarus Vision - Architecture & Decisions Log

Running log of the "why" behind the code, for future.

## Data Flow (Phase 0)

```
OpenSky API
   │  (poll every N sec)
   ▼
ingest/adsb worker (goroutine)
   │  normalize raw response -> domain.Track
   ▼
broadcaster
   │  fan-out
   ├──► store/track_repo ──► Postgres/PostGIS
   └──► ws/hub.Broadcast(event) ──► all connected WS clients
```



Everything above is built and running against live OpenSky data.

## Domain (`internal/domain`)

- `Altitude/Speed/Heading/VerticalRate` are `*float64` - OpenSky omits
  these often, pointer lets `nil` mean "unknown" instead of a lying `0`.
- Timestamp uses `last_contact`, not `time_position` (latter can be
  null even for tracked aircraft).
- Altitude uses `baro_altitude` not `geo_altitude` - matches what
  every other tracker shows.
- ICAO24 normalization (lowercase/trim) happens in `ingest/adsb`, not
  `domain` - keeps `domain.Track` trusted, avoids duplicate map keys.
- `Event.Data` reuses `Track` for both update/removed events (removed
  only sets `ID`). Skipped a separate shape - discipline problem for
  the frontend (check `event.type`), not a type problem.

## WebSocket (`internal/transport/ws`)

**Hub** - single goroutine owns the client map, no mutex needed. Takes
`ctx`, exits on `ctx.Done()`.
- Marshal JSON once per event, fan out same bytes to everyone.
- Fan-out is non-blocking (`select`+`default`) - one slow client gets
  evicted instead of stalling everyone. `send` buffer = 32, unmeasured
  guess.
- Both removal paths check `if _, ok := h.clients[client]` before
  closing - otherwise a client flagged dead from both sides
  double-closes the channel and panics the hub.

**Client** - `conn`, `send chan`, back-ref to `hub`.
- `ReadPump` discards messages but has to run - only way to detect
  disconnect.
- `ReadPump` uses `context.Background()`, not the request context -
  the latter dies right after the Echo handler returns (right after
  upgrade), which would kill the connection instantly.
- `WritePump` uses a per-write timeout - protects against a write
  stuck on a half-dead TCP connection (hub's non-blocking send doesn't
  cover that).

## Data source: OpenSky, not adsb.lol

adsb.lol has no true global endpoint - checked their actual docs,
everything's point+radius or category-filtered, their global map runs
on feeder-only `re-api`. OpenSky has a real global `/states/all`.

Trade-off: credit system caps polling. Global query = 4 credits,
4,000/day standard tier - ~1,000 calls/day - can't go below ~90s.
Using 120s for margin. Map updates every couple minutes, not
real-time - acceptable for global + predictable.

## Ingest (`internal/ingest/adsb`)

- OAuth2 client credentials required (anonymous capped at 400
  credits/day). `TokenManager` caches token, refetches within 30s of
  the documented 30-min expiry.
- States array is positional (`row[5]`=lon, `row[6]`=lat - easy to
  flip). Decoded as `[][]interface{}`, all type assertions use the
  safe two-value form.
- Hard reject: bad/missing ICAO24, on_ground, last_contact, lat/lon -
  no valid position/identity isn't useful, and defaulting to 0,0 would
  draw a phantom aircraft in the Gulf of Guinea.
- Soft default to nil/empty: altitude, speed, heading, vertical_rate,
  callsign.
- Measured rejection rate: ~1% (129/12,523 in one tick) - normal, from
  aircraft tracked via Mode S with no current position fix. Logged as
  a per-tick summary now so a future spike actually means something.
- Worker implements `ingest.Source` so Phase 2+ sources (AIS,
  satellites) plug in without touching broadcaster/hub.
- Failure isolation: a failed `FetchStates` logs+continues to next
  tick; a bad row logs+skips without killing the batch.
- `out <- track` is a blocking send, no eviction - accepted risk, a
  stalled broadcaster means something's already badly broken.

## Broadcaster (`internal/broadcaster`)

Fan-in: `domain.Track` - `domain.Event` - `hub.Broadcast`. Coupled
directly to `*ws.Hub`, no interface - one hub, no second target
planned, YAGNI.

Now also holds `*store.TrackRepo`. Order in `Run`: broadcast first
(live/user-facing, shouldn't wait on DB), then
`UpsertLatest`/`InsertPosition` independently, each logged-not-fatal
on error - one failed write shouldn't kill broadcasting for every
future track.

## Storage (`internal/store`)

**Schema** - `tracks_latest` (one row/aircraft, `id`=ICAO24 PK, upsert
target, full live-state columns) and `track_positions` (append-only,
`BIGSERIAL` id, indexed on `(track_id, recorded_at)`).

`track_positions` is deliberately narrow - just `track_id, lat, lon,
altitude, recorded_at`. Live-state fields (callsign, speed, heading
etc.) don't belong on a table written every 120s forever with no read
pattern that needs them per-point.

No FK between the two tables, on purpose - trail history should
survive independent of whatever `tracks_latest` looks like later
(pruning, etc.), and an FK would force insert ordering + block pruning.

Both tables generate `geometry(Point, 4326)` off lat/lon (one source
of truth, GiST index free). `tracks_latest` also keeps plain lat/lon
columns since it's read constantly - beats `ST_X`/`ST_Y` calls.
`track_positions` skips the duplication, it's write-heavy/rarely read.

Bug hit: `TIMESTAMP` as a bare column name is reserved, breaks the
parser - renamed to `recorded_at`.

**Migrations** run from `main.go` on startup (`golang-migrate` Go API,
not CLI) - one VPS, no pipeline, a manual pre-deploy step is exactly
the thing that gets forgotten. Needs blank imports for the file +
postgres drivers (self-register via `init()`, compiles fine without
them but fails at runtime).

**Pool** - `pgxpool.New` + explicit `Ping` right after (`New` alone
doesn't guarantee a live connection). `pool.Close()` on failed ping to
avoid leaking the resources `New` already allocated. Returns a raw
`*pgxpool.Pool`, no wrapper - one consumer, no swap planned.

**`TrackRepo`** - concrete struct, not an interface (unlike
`ingest.Source`, which has real multiple implementations coming).
Nothing driving a need to mock this yet - adding the interface now
would be speculative.

- `UpsertLatest` - `ON CONFLICT (id) DO UPDATE`, explicit
  `updated_at = now()` on conflict (its default only fires on insert).
- `InsertPosition` - plain insert, narrow columns.
- `GetAllLatest` - reads `tracks_latest` back out for the snapshot
  endpoint (see Frontend). Standard `Query`/`rows.Next()`/`Scan` loop,
  `defer rows.Close()`, `rows.Err()` checked after the loop - the loop
  just exiting isn't the same as exiting clean, a dropped connection
  mid-scan ends it too. `recorded_at` scans into `time.Time` first,
  converted to `t.Timestamp` via `.Unix()` after.
- Bug: first version had no `WHERE` clause - `tracks_latest` never
  deletes rows, so a plane that landed hours ago just sits there
  forever. Returned 69k+ rows instead of a realistic ~9-12k. Added
  `WHERE recorded_at > now() - interval '5 minutes'`, roughly 2.5
  poll-cycles of slack - enough to survive a missed tick without
  reintroducing stale phantom aircraft.

`*float64` fields pass straight through - confirmed `pgx` treats nil
as SQL NULL, no `sql.NullFloat64` needed. `Timestamp` (int64 unix)
converts via `time.Unix()` before binding - pgx won't infer that
conversion itself.

**Retention** - `track_positions` grows unbounded otherwise
(~12,400 rows/tick × ~12s ticks measured - millions of rows/day), so
`RunRetentionLoop` (in `store/retention.go`) runs on its own ticker,
same goroutine-with-ctx shape as everything else:
`DELETE FROM track_positions WHERE recorded_at < now() - window`,
checked once every 24h, 7-day window. Wired into `main.go` as its own
`go func()`, same `ctx` as everything else.

Both interval and window are just parameters passed in from `main.go`
(`RunRetentionLoop(ctx, pool, 24*time.Hour, 7*24*time.Hour)`), not
hardcoded in `store` - easy to change without touching store code.

Once-daily errs on the side of "don't run it more than needed," not
"don't run it enough" - deleting week-old rows a few hours later
changes nothing. A single failed pass just logs and tries again next
tick - no caller upstream needs to know or react.

**Known gap**: on a fresh deploy or after any extended downtime,
`track_positions` sits unpruned for up to a full 24h before the first
tick fires (ticker starts counting from process start, not from some
persisted "last ran at" time). Not a bug, just means the "grows
forever" problem isn't fully closed off until that first tick
actually runs - acceptable at Phase 0 scale, but if the VPS ever
restarts frequently (crash loops, redeploys), this table could grow
more than expected between runs. Would need either a "run once
immediately on startup, then every 24h" pattern, or a persisted
last-run timestamp, to fully close.

## Graceful Shutdown

`signal.NotifyContext(..., os.Interrupt, syscall.SIGTERM)` instead of
bare `context.Background()`, threaded through every goroutine.

Echo v5 dropped `e.Shutdown()` entirely - real breaking change, not a
mistake. Replaced with `echo.StartConfig{GracefulTimeout}` +
`sc.Start(ctx, e)`, which is itself context-aware and drains in-flight
requests on cancel.

Order: signal - ctx cancels - goroutines exit - Echo drains - `main()`
returns - deferred `pool.Close()` last (LIFO, guaranteed last step -
closing earlier risks killing a write mid-shutdown).

## Echo v5 gotchas

- `echo.Context` is `*echo.Context` now, not an interface.
- No `e.Logger.Fatal()` - v5 uses `log/slog`, use stdlib `log.Fatal`.
- No `e.Shutdown()` - see above. Still returns `http.ErrServerClosed`
  on clean shutdown (`errors.Is` check unchanged).

## Config

Missing `.env` just warns, not fatal (VPS uses real env vars).
`DATABASE_URL` fails fast like the OpenSky creds - same standard.

## Local dev

Postgres/PostGIS via Docker Compose, `postgis/postgis:17-3.5` - not
`latest` (reproducibility), not `18-3.6` (different internal volume
path, changed in PG18+, mismatches the legacy path most guidance
assumes). Named volume needs an explicit top-level `volumes:` block.

Host port `5433:5432`, not `5432` - had a native Postgres on Windows
already squatting on 5432 from an old project. Docker didn't complain,
container ran fine, `docker exec` into it worked the whole time (never
touches the host port) - but every host-side connection (Go app,
`psql` from Windows) was silently hitting the native install instead,
which had no `icarus_vision` user. Looked like a plain auth failure,
gave no hint it was the wrong database. Found via `netstat -ano |
findstr 5432` (two PIDs) - `Get-Process` on both - one was native
`postgres.exe`. Moved container to 5433 rather than touch the native
install.

## Frontend (`frontend/src`)

**Selection** (`selectSlice`) - one field, `id: string | null`, one
reducer. Select and deselect are the same action, just a different
payload.

`TrackLayer` click handling: layer-scoped click dispatches the
clicked feature's id; a second, plain click checks
`queryRenderedFeatures` at the point and only dispatches `null` if
nothing was hit - otherwise clicking a plane fires both handlers and
deselect clobbers select.

**Icon color** - feature-state, not rebuilding the paint property.
Real top-level `id` on each feature, `icon-color` is one `["any",
hover, selected]` expression. Selected syncs from Redux (clears the
old id, sets the new one, previous value kept in a ref). Hover is
local/mouse-driven - `mousemove`/`mouseleave` on the layer, a ref
tracks the currently-hovered id so repeated `mousemove` on the same
plane doesn't keep re-setting state. Hover reads `selectedId` from a
ref rather than closing over the Redux value directly, so a selection
change doesn't force the mouse listeners to tear down and
re-register.

**Popups** - hover and selected look the same (yellow) but aren't the
same mechanism. Hover: a `Popup` created/removed on
mousemove/mouseleave, skipped if the hovered plane is already the
selected one. Selected: a separate, persistent `Popup` that
re-positions on every tick the plane's coordinates change, alive
until deselected. Dark CSS override for both - MapLibre's default
popup is a plain white box.

**Bug - MapLibre icon crash on load.** `bucket.icon.opacityVertexArray
!== ...` on every reload, icon layer silently stopped rendering (base
map fine, no planes). Two things stacked:
1. `GetAllLatest` had no `WHERE` clause (see Storage) - snapshot was
   ~69k features in one `.setData()` call, MapLibre's icon worker
   couldn't keep up before the next WS tick's `.setData()` landed on
   top and tore the buffers. Fixing the row count alone (~9k) made it
   stop reproducing, even under throttled network.
2. Separate issue, still there after #1: icons didn't show until the
   *next* tick after reload. Snapshot dispatch and `addSource`/
   `addLayer` are two unrelated async chains - if data lands before
   the layer exists, the `setData` effect no-ops and nothing
   retriggers it once the layer's actually ready. Added a
   `sourceReady` flag (same idea as `MapView`'s `ready`) - first pass
   checked it in the effect body but forgot to add it to the deps
   array, so it still didn't fire.

**WS reconnection** (`tracksMiddleware`) - no `onclose`/`onerror` at
all originally, so any real disconnect froze the map for good; never
showed up in dev since localhost doesn't drop. Rebuilt as a
self-reconnecting `connect()`: `onopen` resets retry state, `onclose`
backs off exponentially (1s-30s cap) up to 6 attempts then gives up
and shows `disconnected` instead of retrying forever silently,
`onerror` just closes the socket and lets `onclose` handle retry.
Manual retry button dispatches a plain action the middleware
intercepts to call `connect()` directly - only way a component
reaches a function living in a middleware closure. `retryTimer`
cancels a stale queued auto-retry so a successful manual retry
doesn't get torn down by it a moment later. `connectionSlice` is its
own slice, not folded into `tracksSlice`.

**Snapshot on load** - reload used to sit on an empty map until the
first WS tick. Added `GET /api/tracks` off `tracks_latest` and a
`loadSnapshot()` that dispatches into the same `trackUpdated` reducer
the WS path uses. Sequenced fetch-then-connect, not parallel - a slow
snapshot landing after a live tick would overwrite fresher data.
Snapshot failure doesn't block `connect()`, just falls back to the
old empty-until-first-tick behavior.

**Search** (`MapSearch`) - `findTrack` lives in `utility/`, not the
component, pure lookup so it's testable on its own. Exact ICAO24
first, callsign scan as fallback, case-insensitive. Empty-query guard
matters because a blank callsign is a real value OpenSky sometimes
sends - without the guard an empty search could match a random plane
instead of doing nothing. Hit dispatches selection + `flyTo`. Miss
shows a dismissible message instead of a silent no-op.

`Map` instance needed to reach `MapSearch`, a sibling of `MapView` -
lifted to `AppShell` via an `onMapReady` callback rather than putting
it in Redux (a live WebGL instance isn't serializable state).
`MapView` dropped its own duplicate `map` state once the lift
existed.

**Telemetry panel** - one selector deriving both `selectedId` and the
track record, explicit `id ? ... : null` rather than relying on
`tracks["null"]` coercing to `undefined`. Every nullable field
(`altitude`/`speed`/`heading`/`vertical_rate`) uses `!= null`, not
truthy - `0` is a real value for all four. `formatVerticalRate`
drives both the vertical-rate row and the altitude arrow off the same
sign, so they can't drift out of sync. "Last update" is relative
("just now"/"Xs ago"/"Xm ago"), thresholds picked around the 120s
poll interval rather than finer, kept live with a `setInterval`
re-render while something's selected.

## Auth

Portfolio-motivated (single-admin app, nothing here actually needs
gating) - cookie JWT with refresh rotation and reuse detection.
Picked over a toy localStorage token because rotation/revocation is
the part worth being able to explain, not just "JWT exists."

**Schema** - `users` (bcrypt password_hash) and a separate
`refresh_tokens` table (user_id, token_hash, expires_at, revoked) -
one user can have many tokens over time, wants its own table, not
columns bolted onto `users`. Tokens stored as SHA-256 hash only, never
raw. Partial index on `expires_at WHERE NOT revoked` matches the
actual query pattern. No GORM - everything else in this codebase is
raw `pgx`, `AuthRepo` follows `TrackRepo`'s shape, two tables and five
queries doesn't justify a second data-access pattern. `gen_random_uuid()`
is native on PG17, no `pgcrypto` extension needed.

No signup endpoint live. `Register` still exists on the service/handler
but isn't wired into `router.go` - bootstrapped the one admin user by
temporarily wiring the route, registering once via Postman, then
deleting the line outright (not commenting it out - a commented route
is one keystroke from live again).

**Tokens** - access: 15min JWT, httpOnly cookie, `Path=/`. Refresh:
7-day random token, httpOnly cookie scoped to `Path=/auth/refresh`
only. `Secure` on both driven by `cfg.JWT.SecureCookie` (=`isProd`),
not hardcoded - a "flip this in prod" comment is exactly the step
that gets forgotten.

**Rotation + reuse detection** - every refresh revokes the old token
and issues a new pair. If a client ever presents an already-revoked
token, that's treated as theft (legit client and attacker both held
the same token, whoever refreshed first wins, the loser looks like a
replay) - revokes every token for that user, forces a real re-login.
First pass had the revoke-all function written but never called from
the `revoked` branch - detection was declared, not implemented.
Also: the revoke call during normal rotation now actually checks its
error and aborts issuing a new pair on failure - silently swallowing
it would leave two valid tokens at once, defeating half the point of
rotating.

**WS auth** - cookies ride the WS upgrade handshake automatically
(it's a normal HTTP GET before switching protocols), so no query-param
token needed. `Handler.authenticate` checks the cookie before
`websocket.Accept`, not after - reject before upgrading, not after.
Known gap: a connection's only checked once, at handshake - nothing
re-validates mid-connection if the access token expires while the
socket's open. Not enforceable without extra machinery, and a
long-lived WS outliving a 15-minute token is expected, not chased.

**`/api/me`** - dedicated endpoint for "is this session valid,"
rather than piggybacking on `/api/tracks`. No DB hit, just
cookie-decode through the middleware. Bug: first version registered
the route before calling `.Use(JWTMiddleware)` on the group - Echo
only applies group middleware to routes registered after `.Use()`, so
`/me` ran unauthenticated and always returned 200. Meant the frontend
session check couldn't actually reject anyone. Fixed by reordering.

**Frontend auth flow** - `authSlice` is three states
(unknown/authenticated/unauthenticated), not a boolean - `unknown`
during the initial `/api/me` probe is what stops an already-logged-in
user from flashing the login screen for a moment on load.

401 handling: one axios interceptor (skipped for login/refresh so a
bad login doesn't loop), refreshes once and retries the original
request once, logs out on a second failure. Went with silent refresh
over "401 - straight to login" - a 15-minute token would otherwise
kick the admin back to login every 15 minutes of inactivity, and the
whole rotation mechanism would be dead code.

Refresh itself is wrapped in one shared in-flight promise instead of
each 401 firing its own call - not just to save a request, it's load-
bearing given the reuse detection above. Two requests 401ing at once
(REST call + WS reconnect, say) would otherwise both read the same
refresh token, and whoever's rotation lands second looks exactly like
a replayed stolen token - revoking every session over a plain client
race, not an attack. One in-flight promise means only one real
refresh call ever goes out, everyone else just waits on it.

## Open questions

- `send` buffer size (32) 
- Speed/VerticalRate unit conversion (m/s - knots?) 
- 120s poll - choppy trails, might need client-side interpolation.
