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

`ws`, `ingest/adsb`, and `broadcaster` are built and verified against
live OpenSky data. `store` (Postgres/PostGIS) is next — nothing persists
yet, tracks only flow through to connected WS clients.

## Domain Layer (`internal/domain`)

- `Altitude`, `Speed`, `Heading`, `VerticalRate` are `*float64`, not
  `float64`. OpenSky often omits them — a pointer lets `nil` mean
  "unknown" instead of a plain `0` lying about it (e.g. grounded aircraft
  near-zero altitude vs. genuinely missing data).
- Timestamp uses `last_contact`, not `time_position` — the latter can be
  `null` even for actively-tracked aircraft.
- Altitude uses `baro_altitude`, not `geo_altitude` — baro is what every
  other flight tracker displays; geo (GPS-derived) would disagree by
  hundreds of feet and look "wrong" by comparison.
- ICAO24 normalization (lowercase/trim) happens in `ingest/adsb`, not
  `domain`. Keeps `domain.Track` a trusted canonical shape, and avoids the
  same aircraft producing two map keys (`"4b1812"` vs `"4B1812"`) if
  normalization were scattered or skipped somewhere downstream.
- `Event.Data` reuses `Track` for both `track_update` and `track_removed`
  (removed events only populate `ID`). Considered a separate payload shape
  but skipped it — payload size is irrelevant at this scale, and "don't
  read stale coords off a removed event" is a discipline problem (check
  `event.type` first in the frontend), not a type-system one. Revisit if
  Phase 2+ actually needs a different removal shape.

## WebSocket Transport (`internal/transport/ws`)

**Hub** — client set + register/unregister/broadcast channels, all only
touched inside `Run()`'s single goroutine (no mutex needed as a result).

- `broadcast` carries `*domain.Event`; JSON marshaling happens once per
  event inside `Run()`, then the same bytes fan out to every client —
  marshaling per-client would be redundant work for identical output.
- Fan-out send is non-blocking (`select` + `default`) — without it, one
  slow client would stall delivery to everyone. A slow/stuck client gets
  evicted instead. `send` is buffered at 32 (a guess, not measured —
  revisit once real broadcast rate is known).
- Both removal paths (`unregister` case, and slow-reader eviction inside
  `broadcast`) check `if _, ok := h.clients[client]; ok` before closing/
  deleting. Without it, a client removed via one path and then again via
  the other (e.g. read pump and write pump both independently detect the
  same dead connection) would double-`close()` the channel — which panics
  and crashes the whole hub goroutine.

**Client** — holds `conn`, `send chan []byte`, and a `hub *Hub` back-
reference (not a duplicate channel — channels are owned by `Hub`).

- `ReadPump` discards incoming messages (frontend never sends real data,
  it's a one-way push stream) but still has to run — it's the only way to
  detect disconnect (`Read` errors), and `coder/websocket` handles
  ping/pong internally as part of `Read()`.
- `ReadPump` uses `context.Background()`, not the HTTP request's context.
  First instinct was `c.Request().Context()` — wrong, since that context
  dies when the Echo handler returns, which happens almost immediately
  after the WS upgrade, killing the connection right after it opens.
- `WritePump` uses a per-write timeout instead — the hub's non-blocking
  send only protects the hub, not a write that's already in flight and
  hanging on a half-dead TCP connection. `conn.Close()` runs via `defer`
  so it fires on every exit path, including the case where the loop just
  ends because the hub already closed `send` (no error, no explicit
  return through the error branch).
- Rule to remember: a dead connection **triggers** unregister; the hub
  never reaches into a client's connection directly.

## Data source: OpenSky, not adsb.lol (decision, not just a pick)

Originally planned adsb.lol (no OAuth, no daily credit ceiling — simpler).
Reversed after checking their actual public API docs: there's no true
global endpoint. Every position query is point+radius (max 250nm) or
category-filtered (military, PIA, squawk, etc.) — no "all aircraft on
Earth" call. Their own website's global map uses `re-api`, which is
feeder-only (requires physically running a receiver feeding their
network) — confirmed via browser Network tab, not assumption. Since
Phase 0 wants global coverage, went back to OpenSky, which does have a
documented, genuinely global `/states/all`.

Trade-off accepted: OpenSky's credit system caps how often a global call
can run. Global query = 4 credits/call, Standard tier = 4,000 credits/day
→ ~1,000 calls/day max → poll interval can't go below ~90s. Using 120s
for margin. This means the map won't feel sub-second-live — more "updates
every 2 minutes" than "smooth real-time" — but it's global, predictable,
and won't silently break from an undocumented rate limit tightening.

## Ingest (`internal/ingest/adsb`)

**Auth** — OpenSky requires OAuth2 client credentials, not anonymous
access (anonymous is capped at 400 credits/day, unusable for 24/7
global polling). `TokenManager` caches the token in memory and only
refetches when it's within 30s of the documented 30-minute expiry —
avoids hitting the auth endpoint on every poll tick for no reason. No
mutex on it: only one goroutine (`Worker.Start`) ever calls it in
Phase 0, so there's no real concurrent-access case to guard against yet.

**Row parsing (`convert.go`)** — OpenSky's `states` array is positional,
not named JSON fields (`row[6]` is latitude, `row[5]` is longitude — easy
to get backwards). Decoded into `[][]interface{}` since a row mixes
strings, numbers, bools, and nulls. Type assertions use the safe
two-value form everywhere (`v, ok := row[i].(float64)`), since a bad
assertion on live external data would otherwise panic the worker.

Fields split into two tiers based on OpenSky's own docs (fields
documented as nullable vs. not):
- **Hard-reject the row**: row too short, missing/wrong-typed ICAO24,
  on_ground, last_contact, or lat/lon. A track with no valid position or
  identity isn't useful data — silently defaulting lat/lon to `0.0` would
  be worse than dropping the row, since `0,0` is a real coordinate (Gulf
  of Guinea) and would draw a phantom aircraft on the map.
- **Soft-default to nil/empty**: altitude, speed, heading, vertical_rate
  (all `*float64`, OpenSky docs say "can be null"), and callsign (empty
  string on failure, since a plane without a callsign is still worth
  showing).

**Worker (`worker.go`)** — implements the `ingest.Source` interface
(`Name() string`, `Start(ctx, out chan<- domain.Track) error`) designed
before any ingest code existed, so a second source (Phase 2+ AIS/
satellites) can plug into the same broadcaster without changes there.
Go doesn't need an explicit "implements" declaration — structural typing,
any type with matching methods satisfies the interface automatically.

Two failure-isolation decisions, same "contain the blast radius" logic
used elsewhere in this project:
- A failed `FetchStates` call (network blip, auth hiccup) logs and
  `continue`s to the next tick — doesn't kill the worker goroutine
  permanently. One bad poll shouldn't require a manual restart.
- A single row that fails `rowToTrack` is logged and skipped — doesn't
  abort the whole batch. One malformed aircraft entry (out of hundreds)
  shouldn't drop every other valid one for that cycle.

`out <- track` is a plain, blocking send (unbuffered channel from
`main.go`) — unlike the hub's non-blocking fan-out, there's no
`default`/eviction here. Accepted risk for Phase 0: if the broadcaster
ever stalls, the worker blocks too. Not defended against, since a stalled
broadcaster would already indicate something more seriously broken.

## Broadcaster (`internal/broadcaster`)

Fan-in from `ingest.Source` to `ws.Hub`: reads `domain.Track` off a
channel, wraps each into a `domain.Event{Type: "track_update", Source,
Data}`, forwards to `hub.Broadcast`.

Coupled directly to `*ws.Hub` rather than an interface (`Publisher`
with a `Broadcast` method). Considered the interface for decoupling, but
there's exactly one hub implementation and no planned second one —
YAGNI. Cheap to extract an interface later if a second broadcast target
ever shows up; not worth the abstraction now.

## Echo v5 gotchas (differ from v4 / most tutorials)

- `echo.Context` is `*echo.Context` — a pointer — in v5, not a plain
  interface value like v4. Hit a compile error assuming otherwise.
- No `e.Logger.Fatal()` — v5 uses `log/slog`, which has no `Fatal`. Use
  stdlib `log.Fatal(err)` for fatal startup errors.
- `e.Start(...)` returns `http.ErrServerClosed` on graceful shutdown —
  not a real failure. Check `errors.Is(err, http.ErrServerClosed)` before
  treating it as fatal.

## Config

Missing `.env` logs a warning, not fatal — the VPS uses real env vars, not
a shipped `.env` file, and `getEnv` already falls back to `os.Getenv` then
to defaults either way.

## Open questions

- `send` buffer size (32) — guess, not measured against real traffic.
- Unit conversion for `Speed`/`VerticalRate` (m/s → knots?) — not decided,
  needs to happen in exactly one place once it is.
- 120s poll interval means trails will look choppy on the frontend map —
  may need client-side interpolation between updates to fake smoothness,
  not decided yet.
- No graceful shutdown yet — `main.go` uses `context.Background()`
  everywhere, so `worker.Start`/`broadcaster.Run` never actually exit.
  Fine for now, needs revisiting before deploy (SIGTERM handling on the
  VPS should stop the ingest pipeline cleanly, not just get killed).
- adsb.lol's rate limit is undocumented/dynamic — if OpenSky's credit
  ceiling becomes a real problem later, revisit adsb.lol scoped to a
  single region instead of trying to tile for global coverage.