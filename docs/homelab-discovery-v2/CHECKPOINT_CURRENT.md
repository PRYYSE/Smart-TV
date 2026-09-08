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

**Verified product source:** `21a21acf6f5b9fcb835c8c863c19ee3ce84929e0`  
**Workflow:** `34181464956` / run **#38** — **GREEN**

Passed:

- 12/12 focused Discovery suites
- 64/64 tests
- strict Enact lint
- legacy CSS/WebKit compatibility checks/patches
- production Enact build
- webOS IPK packaging
- preserved app identity/version/main verification
- isolated artifact upload

Artifact:

- ID: `10039078886`
- name: `Moonfin-HomeLab-webOS-DiscoveryV2-21a21acf6f5b9fcb835c8c863c19ee3ce84929e0`
- artifact digest: `sha256:af90f1782149cae8703ec8afa7237d26426800feb0e648d54b5ce9fe567cd15a`
- IPK manifest SHA-256: `7b55b12a693700ecfa587098b269cb43bb945bf0762b5605d6eb183b0e007869`
- package identity remains `org.moonfin.webos` / `2.7.0` / `index.html`

## Implemented product foundation that must not be redone

- guarded six-tab catalogue UI with stock `SeerrDiscover` fallback
- network-first server-scoped catalogue/LKG loader
- fail-closed planner aligned with Moonfin-Core filter/sort/date-token policy
- authenticated narrow Moonbase Seerr proxy client
- membership filtering, bounded lane loading, deterministic composition and post-fetch dedup
- persistent surfaced-lane rotation and refresh/reset handling
- Enact Spotlight landing navigation with exact card/See All focus restoration
- deep `See All` route/controller/virtual grid with paging, dedup, retry and remembered focus
- existing Seerr detail/request route integration
- old-TV legacy WebKit build path

## Semantic/recommendation policy

The first webOS personalisation implementation overstated semantics: differently named catalogue strategies could resolve to deterministic slots of the same recent-history source, and unknown specialised names could hash to arbitrary slots.

That behaviour has been removed. Current webOS personalisation uses explicit real signals/sources:

- Jellyfin played history, favourites and likes
- combined positive signals where the label requires them
- real Seerr watchlist
- real Seerr movie/TV recommendation endpoints seeded from real TMDB identities
- provider-ID reconciliation back to owned Jellyfin items
- explicit anime/media/runtime/era affinity filtering
- real recently-added/trending/popular-not-owned paths
- unsupported structural/context semantics fail closed instead of fabricating a row

Shared accepted semantic reference remains **486 authored / 481 active**. Current truthful webOS static capability ceiling remains **468 executable sections before runtime sparse/error hiding**.

The 13 intentionally ineligible active catalogue lanes remain:

- For You: `Continue Exploring`
- Series: `Limited-Series Spotlight`, `Continue Exploring Series`, `One-Season Wonders`, `Long-Running Favourites`, `Weekend Binge`
- Anime: `Anime Specials & TV Movies`, `One-Season Anime`, `Long-Running Anime`, `Bingeable Anime`, `Completed Anime`, `Continuing Anime`, `Anime Miniseries & Short Runs`

Do not re-enable them until a real data/filter/detail strategy proves the advertised semantics at acceptable old-TV cost.

## Deep browse / retained-state hardening — current batch

The prior milestone still had a material limitation: personalised `See All` only paged a bounded first recommendation capture locally. This batch replaces that with genuinely incremental upstream paging while keeping the landing cost bounded.

Completed and verified:

1. **Incremental personalised `See All`**
   - recommendation seed state tracks upstream page/total-pages/exhaustion
   - later deep pages request later Seerr recommendation pages instead of replaying page one
   - processed results deduplicate across the whole cached personal row
   - direct paged personal sources can advance upstream too
   - concurrent expansion of one personal row is serialised
   - each logical page has a bounded upstream request budget
2. **Landing request-cost guard**
   - personalised landing rows load only one logical page
   - landing no longer scans page 2+ merely to chase `previewLimit`
   - sparse personal deep rows disable multiplied automatic read-ahead; an explicit `Load More` action remains available
3. **`mediaType: all` correctness**
   - mixed For You personal rows now correctly accept both movie and series candidates instead of matching neither
4. **Retained deep data across detail returns**
   - deep pages are retained in a bounded in-memory cache rather than refetched from page one after returning from details
   - cache keys include server, user, section and section/query revision
   - cache uses bounded LRU behaviour
5. **Refresh correctness**
   - landing refresh now propagates `forceRefresh` into personal row loading
   - deep refresh propagates the same flag
   - tab refresh/reset invalidates retained deep snapshots for that server/user scope, so a refreshed landing cannot reopen stale pre-refresh deep pages
6. **Stale async protection**
   - deep controller generations prevent an obsolete in-flight page load from overwriting state after a newer refresh/reset
   - retained controller snapshots restore loaded pages without refetching them, then continue from the next page
7. **Regression coverage**
   - incremental upstream page 1/2/3 behaviour
   - mixed movie/series personal rows
   - one-page personalised landing cost
   - retained deep snapshots and next-page continuation
   - stale in-flight result rejection
   - retained-state scoping/invalidation/LRU eviction
   - refresh invalidation integration

## Remaining webOS work

1. **Recommendation quality / duplication with real data:** evaluate Jellyfin/Seerr output, row diversity, repeated titles and sparse lanes using the actual Home Lab data path.
2. **Failure-state polish:** catalogue/Seerr/Jellyfin partial failures, empty personal signals, exhausted paging, missing images/provider IDs and retry states.
3. **Remote/back integration:** detail -> landing, detail -> deep browse, See All -> landing, tab transitions, navbar edge, partial grids and exhausted paging on the real remote.
4. **Visual/old-TV polish:** spacing, long text, missing imagery, backdrop behaviour, 720p/1080p rendering, memory and responsiveness on the C6.
5. **Integration acceptance:** details, requests, owned/local identity, playback and return behaviour.
6. **Physical LG acceptance:** launch/resume, auth persistence, focus/back, rendering, playback and update compatibility.

## Cross-platform debt

Current Flutter/Web/Android/Android-TV v2 personalisation still uses named-strategy slot/hash mapping against a simpler current RowDataSource. Their existing green builds do not prove semantic parity. The later whole-product pass must redesign/revalidate those personalisation semantics rather than copying old slot/hash behaviour back into webOS.

## Exact next action

Continue webOS with one substantial **failure-state + remote/integration + visual/performance hardening** batch. Use code/tests first and keep the old-TV request/memory budget explicit. If that gate is strong, prepare the following batch for controlled LG OLED65C6PSA acceptance. Do not deploy yet.

## Do not

- modify `homelab/webos-v1-staging`
- overwrite preserved v1 candidate/release pointers
- change/regenerate `org.moonfin.webos`
- claim physical LG acceptance from CI
- fake personalised or structural catalogue semantics
- replace the Smart-TV client with Flutter Web merely for convenience
- treat green packaging as product completion
