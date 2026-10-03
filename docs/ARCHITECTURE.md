***Icarus Vision - Log***

Flow

OpenSky (poll 120s) -> adsb worker -> broadcaster ─┬─► Postgres (latest + positions)
                                                   └─► WS hub -> clients

Three HTTP reads on top: snapshot on load, trail on selection, altitude history
for the chart. Route lookup happens client-side against ADSBDB.

Decisions worth remembering

OpenSky, not adsb.lol. adsb.lol has no global endpoint. OpenSky does, but charges
credits - 4 per global call, 4k/day. 120s is the fastest sustainable rate. A bbox
would poll faster but the map is genuinely global, so no.

*float64 for nullable fields. OpenSky omits altitude/speed/heading/vertical_rate
often. Pointer lets nil mean "unknown" instead of a lying 0.

Two tables. tracks_latest is the live state, one row per aircraft. track_positions
is append-only history. No FK between them - history should survive pruning.

Raw pgx. Two tables, five queries. GORM would be a second data-access pattern for
nothing.

Migrations run from main.go. One VPS, no pipeline. A manual pre-deploy step is
exactly the thing that gets forgotten.

Concrete repos, no interfaces. Nothing to mock. ingest.Source is an interface
because more sources are coming.

WS hub: one goroutine owns the client map, non-blocking fan-out, slow clients
evicted. Removals check the map before closing the channel - otherwise double-close
panics the hub.

Broadcast before persist. Live data shouldn't wait on the DB. Write errors log and
move on.

Bugs worth remembering

    TIMESTAMP is a reserved column name. Renamed to recorded_at.

    GetAllLatest had no WHERE - 69k rows instead of ~9k, and the giant setData
    crashed MapLibre's icon worker. Added a 5-minute window.

    Echo group middleware only applies to routes registered after .Use(). /api/me
    was unauthenticated because it was registered first.

    Reuse detection existed but was never called from the revoked branch.

    The rotation revoke call swallowed its error - two valid tokens could coexist.

    sourceReady was read in an effect but missing from its deps array, so it never
    re-fired.

    Axios refresh in one shared in-flight promise. Without it, two concurrent 401s
    both rotate the same refresh token, and the second one looks exactly like a
    replayed stolen token. Would log out every session over a client race. Now
    covered by a test that fails if the dedupe is removed.

Rate limiting

loginLimiter - per-IP token bucket on /auth/login, 5 then 1/min. In-memory,
sweeper drops idle IPs. Runs before bcrypt so throttled requests never burn CPU.

First version read X-Forwarded-For unconditionally. Fully spoofable - random XFF
per request means a fresh bucket per attempt, limiter was a no-op. Fix:
TRUSTED_PROXIES env (CIDRs). Empty = trust nothing, use RemoteAddr. Populated =
only read XFF when the peer is trusted, walk right-to-left. Prod: 127.0.0.1/32,::1/128.

Config bug: loadTrustedProxies had two inverted conditions - returned nil even when
the env var was set. Compiles fine, silently wrong.

Gaps: per-IP only (botnet bypasses), buckets reset on restart. Both deferred.

Trails + altitude profile

track_positions was writing 1.5GB/day and nothing read it. Now the selected plane
draws a polyline and an altitude sparkline over the trail window.

GET /api/tracks/:id/history?minutes=N returns GeoJSON. Default 60, capped 24h. Now
also ships a telemetry array (timestamp + altitude per point) so the chart doesn't
need a second endpoint. Refetches every 30s.

The gap bug: WS moves the icon instantly but the trail only refreshes every 30s -
for up to 30s the plane is ahead of its own trail. Fix: merge the live Redux
position as the last coordinate before setData. Duplicate-guarded, because a dup
right after a refetch distorts line-gradient normalization.

Chart only renders with ≥2 non-null altitudes. OpenSky omits baro_altitude
regularly, so half a trail can be flat-lined by nulls.

Density: 120s poll × 15-min default = ~7 points. Choppy. Options are leave it, poll
faster (credits say no), or spline interp (cosmetic, deferred).

No UNIQUE (track_id, recorded_at) yet, so dup rows accumulate. DISTINCT handles
reads, not writes. Needs a dedupe migration first.

Route info

ADSBDB (api.adsbdb.com/v0/callsign/{callsign}) resolves callsign -> airline +
origin + destination. Free, keyless, CORS-open.

Module-level Map cache, not React state. A callsign's route is static for the
session, so we hit the API at most once per callsign. Failures cache as null too -
retrying an unknown callsign on every render is pointless traffic.

Five states: idle / loading / ready / unknown / error. Fixed height across loading
and ready so switching aircraft doesn't cause a vertical jump.

Direction caveat: ADSBDB returns whatever route the callsign is currently filed
for, which occasionally differs from the canonical direction (DLH441 usually runs
FRA->IAH but shows IAH->FRA on the return). Not a bug, just a limitation of the
free endpoint.

Airline logos

Kiwi.com CDN (images.kiwi.com/airlines/64/{IATA}.png). Free, keyless, CORS-open.
The callsign prefix is the ICAO code (UAL, DAL, BAW) which maps 1:1 to IATA (UA,
DL, BA). Local map of ~70 airlines; unknown codes fall through to no logo, which
is correct for GA.

onError hides the image. No broken-image icon ever reaches the user.

Deployment

Oracle Ampere VM, 150GB volume. Caddy (TLS + static) -> Go on loopback -> Postgres
on loopback. Only 80/443/22 exposed.

Two Oracle firewalls to open: VCN Security List and iptables on the VM. Cost an
hour.

Go binds 127.0.0.1:%s in prod, not :%s. Only Caddy can reach it.

Budget: ~1.5GB/day. 7-day retention = ~10GB. Room for more.

Echo v5 gotchas

    echo.Context is *echo.Context, not an interface.
    No e.Shutdown() - use echo.StartConfig{GracefulTimeout} + sc.Start(ctx, e).
    No e.Logger.Fatal() - use stdlib log.Fatal.

Local dev

Docker Compose with postgis/postgis:17-3.5. Host port 5433, not 5432 - a native
Postgres on Windows was already squatting 5432 and every host-side connection was
silently hitting it. Looked like an auth failure. Found via netstat.

Frontend notes

    Selection is one field, one reducer. Layer-scoped click selects, plain click
    checks queryRenderedFeatures and only deselects if nothing was hit - otherwise
    both handlers fire and deselect clobbers select.

    Icon color is feature-state, not a rebuilt paint property. Real top-level id
    per feature. Hover reads selectedId from a ref so selection changes don't tear
    down mouse listeners.

    Hover popup is transient, selected popup is persistent and re-positions on
    every tick.

    WS reconnect backs off exponentially (1s–30s, 6 attempts). retryTimer cancels
    stale queued retries so a manual retry doesn't get torn down a moment later.

    Snapshot-then-connect, not parallel. A slow snapshot landing after a live tick
    would overwrite fresher data.

    authSlice has three states (unknown/authenticated/unauthenticated), not a
    boolean - unknown during the initial /api/me probe stops a logged-in user
    flashing the login screen.

    Map instance lives in AppShell via callback, not Redux. A WebGL instance isn't
    serializable.

    Telemetry panel uses != null for nullable fields, not truthy - 0 is a real
    value.

    Units convert at the panel, not the API. Backend ships SI. (Earlier log claimed
    this was broken - it isn't.)

    Airline logo and route info both key off the callsign prefix, not ICAO24.
    ICAO24 identifies the airframe, not the flight - the same plane flies a
    different route tomorrow.

Auth

Cookie JWT, rotation, reuse detection. Access 15min at Path=/, refresh 7d scoped to
/auth/refresh. Tokens stored hashed. Rotation revokes the old token; a revoked
token presented again = theft -> revoke every token for that user.

WS auth: cookies ride the upgrade handshake. Checked before Accept, not after.
Checked once - a WS outliving the token is expected, not chased.

Register exists but isn't wired into the router. Bootstrapped the admin user by
temporarily wiring the route, then deleting the line (not commenting it - a
commented route is one keystroke from live).

Tests

Backend: auth rotation + reuse detection, rate-limiter XFF trust chain, ADS-B row
parsing. DB tests skip when TEST_DATABASE_URL is unset, so `go test ./...` works on
a fresh machine.

Frontend (Vitest, 22 tests, ~2s):
- selectSlice: recent cap, dedup on re-select, following reset on deselect
- tracksSlice: insert, last-write-wins, partial removal
- findTrack: exact id, case-insensitive callsign, empty/null
- airlines: ICAO parse, IATA map, unknown prefix -> null, CDN URL
- api refresh race: 3 concurrent refreshOnce() calls collapse to 1 network hit;
  sequential calls each fire; a rejected refresh clears the in-flight promise so
  the next attempt isn't bricked

Open

    Mobile responsiveness. AppShell sidebars are w-80 absolute; on a phone the map
    is completely hidden behind them. Collapse to drawers on <md.

    send buffer (32) - unmeasured.

    UNIQUE (track_id, recorded_at) - needs dedupe migration first.

    Per-username login limiting - needs a body read inside the handler.