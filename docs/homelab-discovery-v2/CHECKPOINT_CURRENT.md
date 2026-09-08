# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-08 Australia/Adelaide  
**Primary branch:** `homelab/webos-discovery-v2`

This is the Smart-TV/webOS resume point for Home Lab Discovery v2. Preserve the known-good v1 branch/candidate. Do not publish/install a replacement or claim real-TV acceptance until the remaining product gates are met.

## Objective / quality lock

Maintain LG/webOS as a first-class Moonfin target using the lightweight Enact/webOS client and the same server-driven Discovery product model as Moonfin-Core. Quality, truthful behaviour and old-TV request/memory cost take priority over nominal lane counts or packaging speed.

webOS is the current implementation slice, not the end of Moonfin. After LG acceptance reaches a credible state, return to Web, Android mobile/tablet, Google TV/Android TV and webOS together for shared semantic validation, recommendation quality, UX/performance/integration refinement and final real-device acceptance.

## Preserved baseline

- known-good branch: `homelab/webos-v1-staging`
- preserved candidate: `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e`
- app ID: `org.moonfin.webos`
- baseline version: `2.7.0`
- entry point: `index.html`
- target TV: LG OLED65C6PSA

Do not overwrite the preserved v1 candidate or app identity.

## Current verified product milestone

**Verified product source:** `3cf33a70b45854f7db9b703a011511f941f21802`  
**Workflow:** `34184135140` / run **#49** — **GREEN**

Passed:

- 16/16 focused Discovery/integration suites
- 85/85 tests
- strict Enact lint
- legacy CSS/WebKit compatibility checks/patches
- production Enact build
- webOS IPK packaging
- preserved app identity/version/main verification
- isolated artifact upload

Artifact:

- ID: `10039954551`
- name: `Moonfin-HomeLab-webOS-DiscoveryV2-3cf33a70b45854f7db9b703a011511f941f21802`
- artifact size: 4,312,559 bytes
- artifact digest: `sha256:870e681ff9b3023c007b8ee1392e23362b78b1b1ea277a61683836e457fb0e6c`
- IPK manifest SHA-256: `5f7012852c7c0dbad17876cb079ba9eb98e28cfa335b7b1414ec6ce13e29a030`
- package identity remains `org.moonfin.webos` / `2.7.0` / `index.html`

The branch may contain newer documentation-only commits. The verified product source above remains the code/package acceptance point until another source-changing workflow passes.

## Implemented product foundation that must not be redone

- guarded six-tab catalogue UI with stock `SeerrDiscover` fallback
- network-first server-scoped catalogue/LKG loader
- fail-closed planner aligned with Moonfin-Core filter/sort/date-token policy
- authenticated narrow Moonbase Seerr proxy client
- membership filtering, bounded lane loading, deterministic composition and post-fetch dedup
- persistent surfaced-lane rotation and refresh/reset handling
- real Jellyfin/Seerr personalisation sources; unsupported semantics fail closed
- Enact Spotlight landing navigation with exact card/See All focus restoration
- deep `See All` route/controller/virtual grid with incremental paging, dedup, retry and retained data/focus
- owned Discovery selections preserve Jellyfin identity and open the real local detail/playback path
- refresh failure preserves usable retained rows and reports failure instead of replacing them with an empty state
- remotely reachable retry/Load More/error states
- old-TV legacy WebKit build path

## Semantic accounting

Shared accepted semantic reference remains **486 authored / 481 active**. Current truthful webOS static capability ceiling remains **468 executable sections before runtime sparse/error hiding**.

The 13 deliberately ineligible active catalogue lanes remain:

- For You: `Continue Exploring`
- Series: `Limited-Series Spotlight`, `Continue Exploring Series`, `One-Season Wonders`, `Long-Running Favourites`, `Weekend Binge`
- Anime: `Anime Specials & TV Movies`, `One-Season Anime`, `Long-Running Anime`, `Bingeable Anime`, `Completed Anime`, `Continuing Anime`, `Anime Miniseries & Short Runs`

Do not re-enable them until a real data/filter/detail strategy proves the advertised semantics at acceptable old-TV cost.

## Current old-TV / edge-state / quality hardening

The latest verified batch deliberately reduces work on constrained LG hardware without multiplying initial Discovery I/O.

1. **Performance-aware visual policy**
   - existing performance tier now drives Discovery-specific visual cost
   - low tier uses `w780` backdrops, no backdrop blur, no backdrop scale/fade animation, a longer 240 ms focus debounce and non-animated row scrolling
   - mid tier caps configured backdrop blur at 4 px; high tier preserves configured quality
   - when Home backdrops are disabled, focus no longer schedules/fetches invisible backdrop images
   - this does not change lane-loading concurrency or personalised landing paging, so initial request cost is not amplified
2. **Compact deep browsing for shorter displays**
   - viewports at or below 800 px height use a 160 x 300 virtual-grid footprint, 240 px poster area, tighter spacing and lower-resolution backdrop asset
   - normal 1080p behaviour retains the existing 190 x 350 grid footprint
3. **Artwork failure behaviour**
   - missing poster paths and poster network/image failures now use the existing text fallback instead of leaving a broken-image tile
4. **Provider identity safety**
   - Discovery page membership now drops missing, non-numeric, zero and negative TMDB identities before they can become dead/unselectable cards
   - valid numeric-string TMDB identities remain accepted
5. **Exhausted deep paging**
   - a populated deep list now explicitly reports `End of list` when no more pages are available rather than silently appearing stalled
   - sparse personal lists retain the explicit bounded `Load More` path
6. **Real-data quality diagnostics preparation**
   - each active loaded tab can produce an aggregate diagnostic snapshot through the existing opt-in diagnostic logger
   - snapshot measures lane/card counts, cross-lane repeat rate, underfilled rows, hidden/failed rows, missing identity/artwork and owned-item ratio
   - it does not include media titles or Jellyfin IDs
   - logger remains dormant unless existing diagnostic/server logging is enabled; no new telemetry or external service was added

Regression coverage now includes the visual policy, aggregate quality accounting and malformed-identity filtering in addition to the earlier personalisation/deep/refresh/detail-routing gates.

## Remaining webOS gates

1. **Real Home Lab recommendation-quality capture:** run the aggregate diagnostic against actual Jellyfin/Seerr data, review row diversity/repeat rate/sparse signals and only then tune recommendation policy if evidence warrants it.
2. **Physical LG OLED65C6PSA acceptance:** remote focus/back across landing/detail/deep, 720p/1080p presentation, long text/missing imagery, responsiveness/memory, exhausted paging and app lifecycle.
3. **Request/detail/playback acceptance:** exercise owned local playback, Seerr request actions, detail return and failure recovery against the real services/device.
4. **Launch/resume/update acceptance:** authentication persistence, relaunch/resume and same-ID update compatibility on the physical LG.

No physical LG acceptance is claimed by CI.

## Cross-platform debt

Current Flutter/Web/Android/Android-TV v2 personalisation still uses named-strategy slot/hash mapping against a simpler current RowDataSource. Their existing green builds do not prove semantic parity. The later whole-product pass must redesign/revalidate those personalisation semantics rather than copying old slot/hash behaviour back into webOS.

## Exact next action

Prepare and execute a controlled **LG OLED65C6PSA acceptance** pass using the verified `3cf33a70...` candidate. Keep installation/update reversible and capture only the minimum diagnostics needed to evaluate launch, rendering/performance, remote focus/back, real-data recommendation quality, requests/details and owned playback. Do not promote it to production merely because the package installs.

If direct device execution is unavailable from the current agent, prepare the exact candidate/install/rollback and acceptance procedure with minimal user-side commands rather than pretending the physical gate passed.

## Do not

- modify `homelab/webos-v1-staging`
- overwrite preserved v1 candidate/release pointers
- change/regenerate `org.moonfin.webos`
- claim physical LG acceptance from CI
- fake personalised or structural catalogue semantics
- replace the Smart-TV client with Flutter Web merely for convenience
- treat green packaging as product completion
