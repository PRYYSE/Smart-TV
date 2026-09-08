# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-08 Australia/Adelaide  
**Primary branch:** `homelab/webos-discovery-v2`

This is the Smart-TV/webOS resume point for Home Lab Discovery v2. Preserve the known-good v1 branch/candidate. Do not publish/install a replacement or claim real-TV acceptance until the remaining product gates are met.

## Objective / quality lock

Maintain LG/webOS as a first-class Moonfin target while implementing the same server-driven Discovery product used by Moonfin-Core. The LG client remains the lightweight Enact/webOS implementation; do not force Flutter Web onto it.

webOS is the current implementation slice, not the end of Moonfin. After it reaches a strong equivalent state, return to Web, Android mobile/tablet, Google TV/Android TV and webOS together for shared semantic validation, UX/performance/integration refinement, real-device acceptance and final polish.

Quality, truthful behaviour and old-TV request/memory cost take priority over nominal lane counts or packaging speed. Green CI/IPK generation is a milestone only.

## Preserved baseline

- known-good branch: `homelab/webos-v1-staging`
- preserved candidate: `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e`
- app ID: `org.moonfin.webos`
- baseline version: `2.7.0`
- entry point: `index.html`
- target TV: LG OLED65C6PSA

Do not rewrite/overwrite the preserved v1 candidate or app identity.

## Current verified product milestone

**Verified product source:** `1f15b031207551d86eea52326fa8bd9eda394517`  
**Workflow:** `34182625716` / run **#39** — **GREEN**

Passed:

- 13/13 focused Discovery/integration suites
- 78/78 tests
- strict Enact lint
- legacy CSS/WebKit compatibility checks/patches
- production Enact build
- webOS IPK packaging
- preserved app identity/version/main verification
- isolated artifact upload

Artifact:

- ID: `10039454952`
- name: `Moonfin-HomeLab-webOS-DiscoveryV2-1f15b031207551d86eea52326fa8bd9eda394517`
- artifact digest: `sha256:059f75d539a7937d1f4593930a0a21b7797e79cc20ccfbad9e7542b18f86d4b3`
- IPK manifest SHA-256: `f98d3b8556b4822c61e20e1c07b68475c18dce09f71387c7803318296d9cd099`
- package identity remains `org.moonfin.webos` / `2.7.0` / `index.html`

## Implemented product foundation that must not be redone

- guarded six-tab catalogue UI with stock `SeerrDiscover` fallback
- network-first server-scoped catalogue/LKG loader
- fail-closed planner aligned with Moonfin-Core filter/sort/date-token policy
- authenticated narrow Moonbase Seerr proxy client
- membership filtering, bounded lane loading, deterministic composition and post-fetch dedup
- persistent surfaced-lane rotation and refresh/reset handling
- Enact Spotlight landing navigation with exact card/See All focus restoration
- deep `See All` route/controller/virtual grid with incremental paging, dedup, retry and remembered focus/data
- real Jellyfin/Seerr personalisation sources with unsupported semantics failing closed
- old-TV legacy WebKit build path

## Semantic accounting

Shared accepted semantic reference remains **486 authored / 481 active**. Current truthful webOS static capability ceiling remains **468 executable sections before runtime sparse/error hiding**.

The 13 intentionally ineligible active catalogue lanes remain:

- For You: `Continue Exploring`
- Series: `Limited-Series Spotlight`, `Continue Exploring Series`, `One-Season Wonders`, `Long-Running Favourites`, `Weekend Binge`
- Anime: `Anime Specials & TV Movies`, `One-Season Anime`, `Long-Running Anime`, `Bingeable Anime`, `Completed Anime`, `Continuing Anime`, `Anime Miniseries & Short Runs`

Do not re-enable them until a real data/filter/detail strategy proves the advertised semantics at acceptable old-TV cost.

## Deep-browse / retained-state milestone already completed

Do not regress the prior verified work:

- personalised `See All` incrementally advances later Seerr recommendation pages instead of slicing only the first capture
- personal landing previews intentionally stay one logical page to bound initial request cost
- mixed `mediaType: all` personal rows accept both movies and series
- retained deep pages survive detail-return in a bounded server/user/section-revision LRU cache
- refresh/reset invalidates retained deep state for the affected server/user scope
- stale in-flight deep loads cannot overwrite newer refresh/reset state
- sparse personal deep rows avoid multiplied automatic read-ahead and expose explicit Load More continuation

## Failure / remote / detail integration hardening — current batch

A code audit found three concrete product defects and one integration defect. All are corrected in the verified source above.

1. **Owned Discovery titles now open the real Jellyfin detail item**
   - provider-ID reconciliation already retained `mediaInfo.jellyfinMediaId`, but landing/deep selection previously discarded it and always opened a Seerr-only detail stub
   - Discovery selection now carries a deliberately typed local identity when one is known
   - the existing Seerr selection adapter converts that owned selection into a normal Jellyfin detail pointer, so Details fetches the real local item and keeps normal local playback/integration behaviour
   - requestable/not-owned titles remain on the existing Seerr-only detail path
   - focused tests cover owned movie, owned series, external-only and blank-local-ID cases
2. **Failed refresh no longer destroys usable retained rows**
   - a total refresh failure keeps the last usable result visible and surfaces a `Refresh failed` warning
   - a successful or genuinely empty refresh still replaces old content normally
   - all-lane transport failures are explicitly classified as failure, not genuine empty content
3. **Zero-row states are reachable by D-pad**
   - toolbar DOWN now targets the retry control when no usable rows exist instead of consuming input with nowhere to focus
   - completed zero-row states schedule focus to an explicit retry Spotlight target
   - retry while no rows are available shows loading rather than allowing repeated requests
4. **Deep failure actions are explicit and remotely focusable**
   - initial deep transport failure is no longer labelled `No items found`
   - catalogue retry, initial retry, sparse Load More and partial-page retry have stable Spotlight IDs
   - no-card failure/continuation states schedule focus to the relevant action without stealing focus from existing cards on partial failures
5. **Back/history architecture reviewed**
   - landing -> detail -> Back returns to Discovery through existing panel history
   - landing -> See All -> Back returns to landing
   - See All -> detail -> Back returns to retained deep browse
   - the deep view deliberately returns `false` from its local Back handler so the app-level history remains the single owner of these transitions

The workflow now includes `seerrTarget.test.js` in the Discovery gate because local-vs-Seerr detail selection is part of the Discovery integration contract.

## Remaining webOS work

1. **Real-data recommendation quality / duplication:** evaluate actual Jellyfin/Seerr output, repeated titles, row diversity and sparse personal signals.
2. **Visual/old-TV performance:** spacing, long text, missing imagery, backdrop behaviour, 720p/1080p rendering, memory and responsiveness on the C6.
3. **Physical remote integration:** validate the now-reviewed landing/detail/deep/Back paths, tabs, navbar edge, partial grids and exhausted paging on the real LG remote.
4. **Request/detail/playback acceptance:** exercise request actions, owned/local playback, detail-return and failure recovery against the real services/device.
5. **Lifecycle acceptance:** launch/resume, auth persistence and update compatibility on the LG OLED65C6PSA.

## Cross-platform debt

Current Flutter/Web/Android/Android-TV v2 personalisation still uses named-strategy slot/hash mapping against a simpler current RowDataSource. Their existing green builds do not prove semantic parity. The later whole-product pass must redesign/revalidate those personalisation semantics rather than copying old slot/hash behaviour back into webOS.

## Exact next action

Continue webOS with one substantial **visual/old-TV performance + remaining failure-edge + real-data recommendation-quality preparation** batch. Keep changes code/test driven. If that gate is strong, the following batch can begin controlled LG OLED65C6PSA acceptance. Do not deploy production yet.

## Do not

- modify `homelab/webos-v1-staging`
- overwrite preserved v1 candidate/release pointers
- change/regenerate `org.moonfin.webos`
- claim physical LG acceptance from CI
- fake personalised or structural catalogue semantics
- replace the Smart-TV client with Flutter Web merely for convenience
- treat green packaging as product completion
