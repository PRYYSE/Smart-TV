# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-08 Australia/Adelaide  
**Primary branch:** `homelab/webos-discovery-v2`

This is the Smart-TV/webOS resume point for Home Lab Discovery v2. Preserve the known-good v1 branch/candidate. Do not publish/install a replacement or claim real-TV acceptance until the remaining webOS product gates are met.

## Objective / quality lock

Maintain LG/webOS as a first-class Moonfin target while implementing the same server-driven Discovery product used by Moonfin-Core. The old LG client remains the lightweight Enact/webOS implementation; do not force Flutter Web onto it.

webOS is the current implementation slice, not the end of Moonfin. After it reaches a strong equivalent state, return to Web, Android mobile/tablet, Google TV/Android TV and webOS together for shared semantic validation, UX/performance/integration refinement, real-device acceptance and final polish.

Quality and truthful behaviour take priority over nominal lane counts or packaging speed. Green CI/IPK generation is a milestone only.

## Preserved baseline

- known-good branch: `homelab/webos-v1-staging`
- preserved candidate: `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e`
- app ID: `org.moonfin.webos`
- baseline version: `2.7.0`
- entry point: `index.html`
- target TV: LG OLED65C6PSA

Do not rewrite/overwrite the preserved v1 candidate or app identity.

## Current verified product milestone

**Verified product source:** `0a234e8d83b67c6a7aa9a5775dc016d476721da6`  
**Workflow:** `34180294426` / run **#23** — **GREEN**

Passed:

- 11/11 focused Discovery suites
- 56/56 tests
- strict Enact lint
- legacy CSS/WebKit compatibility checks/patches
- production Enact build
- webOS IPK packaging
- preserved app identity/version/main verification
- isolated artifact upload

Artifact:

- ID: `10038690055`
- name: `Moonfin-HomeLab-webOS-DiscoveryV2-0a234e8d83b67c6a7aa9a5775dc016d476721da6`
- artifact digest: `sha256:4de853e478c6633f3b4eb0316b3b080c66db1691f58de870a7d36e4b83e9224c`
- IPK manifest SHA-256: `ff0319b5032d29dd8535f54b05a01da60586332f97e5e221ea1465580669d013`
- package identity remains `org.moonfin.webos` / `2.7.0` / `index.html`

## Implemented product foundation that must not be redone

- guarded six-tab catalogue UI with stock `SeerrDiscover` fallback
- strict network-first server-scoped catalogue/LKG loader
- fail-closed query planner aligned with Moonfin-Core filter/sort/date-token policy
- authenticated narrow Moonbase Seerr proxy client
- membership filtering, bounded lane loading, deterministic tab composition and post-fetch dedup
- persistent surfaced-lane rotation and refresh/reset handling
- Enact Spotlight landing navigation with navbar return and deterministic vertical row movement
- deep `See All` route/controller/virtual grid with paging, dedup, failure recovery and remembered deep index
- existing Seerr detail/request route integration preserved
- old-TV legacy WebKit build path remains intact

## Semantic/recommendation audit — 2026-09-08

A substantive semantic defect was found in the first webOS personalisation implementation.

The catalogue gave strategies names such as `favourites`, `watchlist`, `high-ratings`, specialised anime affinity labels and structural labels. The implementation was actually routing them through deterministic row slots of the same local/recent-history recommendation source, and unknown specialised strategy names could hash to arbitrary slots. That produced different rows but did **not** truthfully implement the labels.

The accepted legacy Flutter implementation had a materially richer seed pool/mixer, while current stable RowDataSource is simpler. Therefore mirroring slot numbers alone was not sufficient semantic parity.

### Corrected webOS policy

`homeLabDiscoveryPersonalisation.js` now uses explicit signal-backed policies instead of arbitrary strategy hashing:

- recent history -> Jellyfin played history
- favourites -> Jellyfin favourites
- likes/high-rating signals -> Jellyfin likes/favourites
- mixed-positive -> combined positive Jellyfin signals
- watchlist -> real Seerr watchlist
- recommendation rows -> Seerr movie/TV recommendations seeded by the selected real TMDB item
- owned recommendation results -> provider-ID resolution back into Jellyfin so availability/played/local identity are retained
- anime aliases -> explicit anime membership checks rather than title assumptions
- movie/series, short-runtime, older/recent and anime affinity variants -> explicit seed constraints
- rewatch -> played positive items
- recently-added -> actual Seerr recently-added source
- trending anime / popular anime-not-in-library -> real Seerr discovery sources plus anime/library filtering
- refresh still invalidates the personal row cache

Unsupported personal semantics now fail closed at eligibility/load time. They are never replaced by a random recommendation slot.

### Static 481/486 accounting

Shared accepted semantic reference remains **486 authored / 481 active**, with the five previously documented compiler-resolution failures kept explicit.

For the accepted 481 active reference, webOS now has a truthful static capability ceiling of **468 executable sections before runtime sparse/error hiding**. The 13 intentionally ineligible catalogue lanes are labels for which the current data path does not prove the advertised structural/context semantics:

- For You: `Continue Exploring`
- Series: `Limited-Series Spotlight`, `Continue Exploring Series`, `One-Season Wonders`, `Long-Running Favourites`, `Weekend Binge`
- Anime: `Anime Specials & TV Movies`, `One-Season Anime`, `Long-Running Anime`, `Bingeable Anime`, `Completed Anime`, `Continuing Anime`, `Anime Miniseries & Short Runs`

This is an **explicit semantic gap**, not an unexplained regression. The previous generic slot/hash behaviour could make these rows appear but did not actually establish the meaning in their labels. Re-enable them only when a real source/filter/detail strategy proves the semantics without unreasonable old-TV request cost.

All compiled non-personal sources continue through the same allow-listed query policy as Moonfin-Core. Reviewed external-list placeholders are compiled upstream into normal executable Discovery queries; unresolved semantic names/lists still fail closed.

## Navigation hardening in this milestone

Landing focus now remembers and restores the **exact card or See All target**, not merely the row:

- card focus records tab + row + item index
- See All records its own focus target
- return/remount restores the exact spotlight target
- stale row/item indices clamp safely when catalogue contents change
- toolbar DOWN returns to the remembered item rather than a generic row container
- tests cover exact-card, See All, stale-memory and empty-lane focus targets

This complements the existing deep-grid index restoration. Physical remote behaviour still requires real LG validation.

## Known remaining webOS work

1. **Personal deep browse depth:** the new recommendation source is cached and paged locally but still draws a bounded first recommendation set; deeper `See All` should become genuinely incremental without multiplying initial old-TV network load.
2. **Recommendation quality/duplication:** validate real Jellyfin/Seerr results, row diversity and session dedup with live data rather than relying only on service tests.
3. **Retained state/cache correctness:** review server/user scoping, catalogue refresh/change, stale async work and resume behaviour.
4. **Remote/back edge cases:** detail -> landing, See All -> landing, tabs, navbar edge, partial grids and exhausted paging on the actual remote.
5. **Visual/old-TV polish:** card/backdrop spacing, long text, missing imagery, 720p/1080p rendering and memory/performance on the C6.
6. **Failure-state polish:** catalogue/Seerr/Jellyfin partial failures, sparse lanes, empty personal signals and retry behaviour.
7. **Integration acceptance:** details, requests, owned/local identity, playback and return behaviour.
8. **Physical LG acceptance:** launch/resume, auth persistence, focus/back, rendering, playback and update compatibility.

## Cross-platform debt discovered by this audit

The current Flutter v2 personalisation adapter still maps named strategies to row slots and hashes specialised names against the simpler current stable RowDataSource. After the webOS slice is strong enough, the whole-product pass must re-evaluate Flutter/Web/Android/Android-TV personalisation semantics rather than treating their existing green build as final parity.

Do not copy the old slot/hash behaviour back into webOS to make lane counts match.

## Exact next action

Continue webOS with one substantial **deep-browse + retained-state/performance/error/integration hardening** batch. Prioritise real correctness and old-TV request cost. Do not deploy yet.

## Do not

- modify `homelab/webos-v1-staging`
- overwrite preserved v1 candidate/release pointers
- change/regenerate `org.moonfin.webos`
- claim physical LG acceptance from CI
- fake personalised or structural catalogue semantics
- replace the Smart-TV client with Flutter Web merely for convenience
- treat green packaging as product completion
