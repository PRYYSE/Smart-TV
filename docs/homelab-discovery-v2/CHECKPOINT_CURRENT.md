# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-10 Australia/Adelaide  
**Primary branch:** `homelab/webos-discovery-v2`

This is the Smart-TV/webOS durable resume point for Home Lab Discovery v2. The GitHub/code reconciliation is complete. Preserve the known-good v1 branch/candidate and do not claim physical LG acceptance until the later live/device phase.

## Current boundary

- Smart-TV/webOS Discovery v2: **GITHUB/CODE COMPLETE**
- Next whole-product stage: **cross-platform parity + recommendation quality**
- Physical LG/device/live acceptance: **DEFERRED**

## Preserved baseline — do not modify

- known-good branch: `homelab/webos-v1-staging`
- preserved candidate: `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e`
- app ID: `org.moonfin.webos`
- version: `2.7.0`
- entry point: `index.html`
- target TV: LG OLED65C6PSA

## Final verified webOS product source

`42854590caf4dbf847696483d943a886d5ab8ed7` — `fix(discovery-v2): use real Jellyfin high-rating seeds`

Required workflow **#51 / `34432674158`**: **GREEN**.

Verified:

- 16/16 focused Discovery/integration test suites passed
- 86/86 tests passed
- strict Enact lint passed
- legacy CSS/WebKit compatibility check passed
- legacy compatibility patch stage completed: 17 files modified, 0 skipped
- optimized production Enact build compiled successfully
- webOS IPK packaging succeeded
- package identity verification passed: `org.moonfin.webos` / `2.7.0` / `index.html`
- final IPK: `Moonfin_webOS_2.7.0.ipk`
- IPK SHA-256: `80a54d415b99c813b893c6abc7b465fa8f383244be01aab791cd9aefd0a90d10`
- artifact ID: `10135098617`
- artifact name: `Moonfin-HomeLab-webOS-DiscoveryV2-42854590caf4dbf847696483d943a886d5ab8ed7`
- artifact size: `4,312,912` bytes
- artifact ZIP digest: `sha256:7b7b1f60d05587a59fbd5913d0f3762fad150529c5e1a0a5f09bba09c8bd7c67`

The previous #50 source `a3a3317894a90bbab8b12cc7764187a8c5591369` remains a valid earlier rollback/reference candidate, but #51 is now the accepted GitHub/code source.

## Final reconciliation outcome

The final comparison against Moonfin-Core's current Discovery contract found one product-semantic defect that required correction: webOS lanes advertised highest user ratings but sourced `high-ratings` from Likes + Favourites. The final source now uses one bounded Jellyfin item query and real numeric `UserData.Rating >= 8` seeds; `anime-high-ratings` inherits the same provenance and the dynamic heading says `Because You Rated <title> Highly`.

This correction reduced the source fan-out from two Jellyfin calls to one and did not change catalogue structure, TV focus/UI mechanics, app/package identity or live services.

No other GitHub/code blocker remained after the cross-repo reconciliation and #51 validation.

## Implemented webOS foundation — do not redo

- guarded six-tab catalogue UI with stock `SeerrDiscover` fallback
- network-first server-scoped catalogue/LKG loader
- fail-closed planner aligned with Moonfin-Core filter/sort/date-token policy
- authenticated narrow Moonbase Seerr proxy client
- membership filtering, bounded lane loading, deterministic composition and post-fetch dedup
- persistent surfaced-lane rotation and refresh/reset handling
- real Jellyfin/Seerr personalisation sources; unsupported structural/context semantics fail closed
- Enact Spotlight landing navigation with exact card/See All focus restoration
- deep `See All` route/controller/virtual grid with incremental paging, dedup, retry and retained data/focus
- owned Discovery selections preserve Jellyfin identity and open the local detail/playback path
- refresh failure preserves usable retained rows and reports failure
- remotely reachable Retry/Load More/error states
- legacy WebKit build path
- performance-aware visual policy for constrained LG hardware
- compact <=800 px deep browsing while preserving VirtualGrid positioning
- artwork fallbacks and invalid provider-ID rejection
- explicit exhausted-paging state
- opt-in aggregate recommendation-quality diagnostics without titles/Jellyfin IDs

## Semantic accounting

Shared catalogue reference remains **486 authored / 481 active**. webOS intentionally supports a truthful static ceiling of **468 executable sections** before runtime sparse/error hiding.

The 13 deliberately ineligible active catalogue lanes remain fail-closed because no sufficiently truthful and low-cost implementation is yet proven:

- For You: `Continue Exploring`
- Series: `Limited-Series Spotlight`, `Continue Exploring Series`, `One-Season Wonders`, `Long-Running Favourites`, `Weekend Binge`
- Anime: `Anime Specials & TV Movies`, `One-Season Anime`, `Long-Running Anime`, `Bingeable Anime`, `Completed Anime`, `Continuing Anime`, `Anime Miniseries & Short Runs`

Do not re-enable these merely to reach 481/481. Revisit them only with independently proven semantics and acceptable old-TV request/memory cost.

## Next stage: cross-platform parity + recommendation quality

Use an explicit semantic matrix across Moonfin-Core Web, Android mobile/tablet, Android TV/Google TV and this Enact/webOS client. Preserve truthful real-source implementations rather than forcing identical internal code.

Priority comparisons include:

- personalisation source provenance and strategy support
- novelty/rotation/rewatch behaviour
- anime/not-owned handling
- membership/requestability/availability semantics
- identity/detail routing
- dedup, sparse-row behaviour, refresh/reset and retained state
- bounded request cost and deep paging/retry behaviour
- recommendation diversity/quality using real Home Lab diagnostics only when available

Keep structural/context lanes fail-closed until proven. Do not copy old slot/hash semantics into webOS.

## Deferred physical/live acceptance

No physical LG acceptance is claimed by CI. The later device phase still needs the actual LG OLED65C6PSA checked for remote focus/back, 720p/1080p presentation, long text/missing imagery, responsiveness/memory, deep paging, owned playback, Seerr request actions, detail return, failure recovery, auth persistence, relaunch/resume and same-ID update compatibility.

Live remains untouched.

## Non-blocking release/tooling debt

The #51 install step still reports legacy dependency audit/deprecation warnings, including Node 20/action deprecation notices and old browser-compatibility metadata. These did not fail the current product gate and should be assessed deliberately during the later whole-product CI/release-engineering stage rather than by blindly upgrading the old-TV dependency stack now.

## Exact next action

Start the cross-platform parity + recommendation-quality stage from the current verified sources. Do not reopen platform implementation work unless the parity matrix or real-data evidence demonstrates a genuine defect.
