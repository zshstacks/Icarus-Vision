# Icarus Vision — Architecture & Decisions Log

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

- `Altitude/Speed/Heading/VerticalRate` are `*float64` — OpenSky omits
  these often, pointer lets `nil` mean "unknown" instead of a lying `0`.
- Timestamp uses `last_contact`, not `time_position` (latter can be
  null even for tracked aircraft).
- Altitude uses `baro_altitude` not `geo_altitude` — matches what
  every other tracker shows.
- ICAO24 normalization (lowercase/trim) happens in `ingest/adsb`, not
  `domain` — keeps `domain.Track` trusted, avoids duplicate map keys.
- `Event.Data` reuses `Track` for both update/removed events (removed
  only sets `ID`). Skipped a separate shape — discipline problem for
  the frontend (check `event.type`), not a type problem.

## WebSocket (`internal/transport/ws`)

**Hub** — single goroutine owns the client map, no mutex needed. Takes
`ctx`, exits on `ctx.Done()`.
- Marshal JSON once per event, fan out same bytes to everyone.
- Fan-out is non-blocking (`select`+`default`) — one slow client gets
  evicted instead of stalling everyone. `send` buffer = 32, unmeasured
  guess.
- Both removal paths check `if _, ok := h.clients[client]` before
  closing — otherwise a client flagged dead from both sides
  double-closes the channel and panics the hub.

**Client** — `conn`, `send chan`, back-ref to `hub`.
- `ReadPump` discards messages but has to run — only way to detect
  disconnect.
- `ReadPump` uses `context.Background()`, not the request context —
  the latter dies right after the Echo handler returns (right after
  upgrade), which would kill the connection instantly.
- `WritePump` uses a per-write timeout — protects against a write
  stuck on a half-dead TCP connection (hub's non-blocking send doesn't
  cover that).

## Data source: OpenSky, not adsb.lol

adsb.lol has no true global endpoint — checked their actual docs,
everything's point+radius or category-filtered, their global map runs
on feeder-only `re-api`. OpenSky has a real global `/states/all`.

Trade-off: credit system caps polling. Global query = 4 credits,
4,000/day standard tier → ~1,000 calls/day → can't go below ~90s.
Using 120s for margin. Map updates every couple minutes, not
real-time — acceptable for global + predictable.

## Ingest (`internal/ingest/adsb`)

- OAuth2 client credentials required (anonymous capped at 400
  credits/day). `TokenManager` caches token, refetches within 30s of
  the documented 30-min expiry.
- States array is positional (`row[5]`=lon, `row[6]`=lat — easy to
  flip). Decoded as `[][]interface{}`, all type assertions use the
  safe two-value form.
- Hard reject: bad/missing ICAO24, on_ground, last_contact, lat/lon —
  no valid position/identity isn't useful, and defaulting to 0,0 would
  draw a phantom aircraft in the Gulf of Guinea.
- Soft default to nil/empty: altitude, speed, heading, vertical_rate,
  callsign.
- Measured rejection rate: ~1% (129/12,523 in one tick) — normal, from
  aircraft tracked via Mode S with no current position fix. Logged as
  a per-tick summary now so a future spike actually means something.
- Worker implements `ingest.Source` so Phase 2+ sources (AIS,
  satellites) plug in without touching broadcaster/hub.
- Failure isolation: a failed `FetchStates` logs+continues to next
  tick; a bad row logs+skips without killing the batch.
- `out <- track` is a blocking send, no eviction — accepted risk, a
  stalled broadcaster means something's already badly broken.

## Broadcaster (`internal/broadcaster`)

Fan-in: `domain.Track` → `domain.Event` → `hub.Broadcast`. Coupled
directly to `*ws.Hub`, no interface — one hub, no second target
planned, YAGNI.

Now also holds `*store.TrackRepo`. Order in `Run`: broadcast first
(live/user-facing, shouldn't wait on DB), then
`UpsertLatest`/`InsertPosition` independently, each logged-not-fatal
on error — one failed write shouldn't kill broadcasting for every
future track.

## Storage (`internal/store`)

**Schema** — `tracks_latest` (one row/aircraft, `id`=ICAO24 PK, upsert
target, full live-state columns) and `track_positions` (append-only,
`BIGSERIAL` id, indexed on `(track_id, recorded_at)`).

`track_positions` is deliberately narrow — just `track_id, lat, lon,
altitude, recorded_at`. Live-state fields (callsign, speed, heading
etc.) don't belong on a table written every 120s forever with no read
pattern that needs them per-point.

No FK between the two tables, on purpose — trail history should
survive independent of whatever `tracks_latest` looks like later
(pruning, etc.), and an FK would force insert ordering + block pruning.

Both tables generate `geometry(Point, 4326)` off lat/lon (one source
of truth, GiST index free). `tracks_latest` also keeps plain lat/lon
columns since it's read constantly — beats `ST_X`/`ST_Y` calls.
`track_positions` skips the duplication, it's write-heavy/rarely read.

Bug hit: `TIMESTAMP` as a bare column name is reserved, breaks the
parser — renamed to `recorded_at`.

**Migrations** run from `main.go` on startup (`golang-migrate` Go API,
not CLI) — one VPS, no pipeline, a manual pre-deploy step is exactly
the thing that gets forgotten. Needs blank imports for the file +
postgres drivers (self-register via `init()`, compiles fine without
them but fails at runtime).

**Pool** — `pgxpool.New` + explicit `Ping` right after (`New` alone
doesn't guarantee a live connection). `pool.Close()` on failed ping to
avoid leaking the resources `New` already allocated. Returns a raw
`*pgxpool.Pool`, no wrapper — one consumer, no swap planned.

**`TrackRepo`** — concrete struct, not an interface (unlike
`ingest.Source`, which has real multiple implementations coming).
Nothing driving a need to mock this yet — adding the interface now
would be speculative.

- `UpsertLatest` — `ON CONFLICT (id) DO UPDATE`, explicit
  `updated_at = now()` on conflict (its default only fires on insert).
- `InsertPosition` — plain insert, narrow columns.

`*float64` fields pass straight through — confirmed `pgx` treats nil
as SQL NULL, no `sql.NullFloat64` needed. `Timestamp` (int64 unix)
converts via `time.Unix()` before binding — pgx won't infer that
conversion itself.

**Retention** — `track_positions` grows unbounded otherwise
(~12,400 rows/tick × ~12s ticks measured → millions of rows/day), so
`RunRetentionLoop` (in `store/retention.go`) runs on its own ticker,
same goroutine-with-ctx shape as everything else:
`DELETE FROM track_positions WHERE recorded_at < now() - window`,
checked once every 24h, 7-day window. Wired into `main.go` as its own
`go func()`, same `ctx` as everything else.

Both interval and window are just parameters passed in from `main.go`
(`RunRetentionLoop(ctx, pool, 24*time.Hour, 7*24*time.Hour)`), not
hardcoded in `store` — easy to change without touching store code.

Once-daily errs on the side of "don't run it more than needed," not
"don't run it enough" — deleting week-old rows a few hours later
changes nothing. A single failed pass just logs and tries again next
tick — no caller upstream needs to know or react.

**Known gap**: on a fresh deploy or after any extended downtime,
`track_positions` sits unpruned for up to a full 24h before the first
tick fires (ticker starts counting from process start, not from some
persisted "last ran at" time). Not a bug, just means the "grows
forever" problem isn't fully closed off until that first tick
actually runs — acceptable at Phase 0 scale, but if the VPS ever
restarts frequently (crash loops, redeploys), this table could grow
more than expected between runs. Would need either a "run once
immediately on startup, then every 24h" pattern, or a persisted
last-run timestamp, to fully close.

## Graceful Shutdown

`signal.NotifyContext(..., os.Interrupt, syscall.SIGTERM)` instead of
bare `context.Background()`, threaded through every goroutine.

Echo v5 dropped `e.Shutdown()` entirely — real breaking change, not a
mistake. Replaced with `echo.StartConfig{GracefulTimeout}` +
`sc.Start(ctx, e)`, which is itself context-aware and drains in-flight
requests on cancel.

Order: signal → ctx cancels → goroutines exit → Echo drains → `main()`
returns → deferred `pool.Close()` last (LIFO, guaranteed last step —
closing earlier risks killing a write mid-shutdown).

## Echo v5 gotchas

- `echo.Context` is `*echo.Context` now, not an interface.
- No `e.Logger.Fatal()` — v5 uses `log/slog`, use stdlib `log.Fatal`.
- No `e.Shutdown()` — see above. Still returns `http.ErrServerClosed`
  on clean shutdown (`errors.Is` check unchanged).

## Config

Missing `.env` just warns, not fatal (VPS uses real env vars).
`DATABASE_URL` fails fast like the OpenSky creds — same standard.

## Local dev

Postgres/PostGIS via Docker Compose, `postgis/postgis:17-3.5` — not
`latest` (reproducibility), not `18-3.6` (different internal volume
path, changed in PG18+, mismatches the legacy path most guidance
assumes). Named volume needs an explicit top-level `volumes:` block.

Host port `5433:5432`, not `5432` — had a native Postgres on Windows
already squatting on 5432 from an old project. Docker didn't complain,
container ran fine, `docker exec` into it worked the whole time (never
touches the host port) — but every host-side connection (Go app,
`psql` from Windows) was silently hitting the native install instead,
which had no `icarus_vision` user. Looked like a plain auth failure,
gave no hint it was the wrong database. Found via `netstat -ano |
findstr 5432` (two PIDs) → `Get-Process` on both → one was native
`postgres.exe`. Moved container to 5433 rather than touch the native
install.

## Open questions

- `send` buffer size (32) — unmeasured guess.
- Speed/VerticalRate unit conversion (m/s → knots?) — undecided.
- 120s poll → choppy trails, might need client-side interpolation.
- adsb.lol rate limit is undocumented/dynamic — revisit scoped to one
  region if OpenSky's credit ceiling becomes a real problem.