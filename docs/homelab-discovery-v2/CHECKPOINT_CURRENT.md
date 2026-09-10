# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-10 Australia/Adelaide  
**Primary branch:** `homelab/webos-discovery-v2`

This is the Smart-TV/webOS resume point for Home Lab Discovery v2. Preserve the known-good v1 branch/candidate. Do not publish/install a replacement or claim real-TV acceptance until physical gates are deliberately run.

## Objective / quality lock

Maintain LG/webOS as a first-class Moonfin target using the lightweight Enact/webOS client and the same server-driven Discovery product model as Moonfin-Core. Truthful semantics and old-TV request/memory cost take priority over nominal lane counts.

GitHub-only platform mechanics are already mature. The current gate is one narrow semantic correction found during the final cross-repo reconciliation; physical LG work remains deferred.

## Preserved baseline

- known-good branch: `homelab/webos-v1-staging`
- preserved candidate: `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e`
- app ID: `org.moonfin.webos`
- baseline version: `2.7.0`
- entry point: `index.html`
- target TV: LG OLED65C6PSA

Do not overwrite the preserved v1 candidate or app identity.

## Last verified product milestone

**Verified product source:** `a3a3317894a90bbab8b12cc7764187a8c5591369`  
**Workflow:** `34184420915` / run **#50** — **GREEN**

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

- ID `10040048352`
- name `Moonfin-HomeLab-webOS-DiscoveryV2-a3a3317894a90bbab8b12cc7764187a8c5591369`
- artifact size `4,312,422` bytes
- artifact digest `sha256:6e765d2ad65fcd0cfb487bfc13075da209332e3f5004ea3e14a434b8d2661eef`
- IPK manifest SHA-256 `24e7a3af27c6ddf77d747b9990780073edb692ad6cef6453957d3afc45ee8e06`
- package identity `org.moonfin.webos` / `2.7.0` / `index.html`

A narrow comparison from this source to the pre-correction branch HEAD `7f2fc28c8224ffe426645ed28dc35651eec31fa3` confirmed the only intervening change was this checkpoint document; there were no hidden unverified product-source changes.

## Implemented product foundation — do not redo

- guarded six-tab catalogue UI with stock `SeerrDiscover` fallback
- network-first server-scoped catalogue/LKG loader
- fail-closed planner aligned with Moonfin-Core filter/sort/date-token policy
- authenticated narrow Moonbase Seerr proxy client
- membership filtering, bounded lane loading, deterministic composition and post-fetch dedup
- persistent surfaced-lane rotation and refresh/reset handling
- real Jellyfin/Seerr personalisation sources; unsupported structural/context semantics fail closed
- Enact Spotlight landing navigation with exact card/See All focus restoration
- deep `See All` route/controller/virtual grid with incremental paging, dedup, retry and retained data/focus
- owned Discovery selections preserve Jellyfin identity and open the real local detail/playback path
- refresh failure preserves usable retained rows and reports failure instead of replacing them with an empty state
- remotely reachable retry/Load More/error states
- old-TV legacy WebKit build path
- performance-aware visual policy, compact <=800 px deep browsing, artwork fallbacks, provider-ID safety, explicit exhausted paging and opt-in aggregate quality diagnostics

## Semantic accounting

Shared accepted catalogue remains **486 authored / 481 active**. The established webOS static capability ceiling before runtime sparse/error hiding remains **468 executable sections**.

The 13 deliberately ineligible active catalogue lanes remain:

- For You: `Continue Exploring`
- Series: `Limited-Series Spotlight`, `Continue Exploring Series`, `One-Season Wonders`, `Long-Running Favourites`, `Weekend Binge`
- Anime: `Anime Specials & TV Movies`, `One-Season Anime`, `Long-Running Anime`, `Bingeable Anime`, `Completed Anime`, `Continuing Anime`, `Anime Miniseries & Short Runs`

Do not re-enable them until a real data/filter/detail strategy proves the advertised semantics at acceptable old-TV cost.

## Current semantic correction — CI PENDING

During final cross-repo reconciliation, the catalogue labels `Based on Your Highest Ratings` and `Similar to Anime You Rated Highly` were checked against the webOS source implementation. Jellyfin's current `UserItemDataDto` exposes numeric per-user `Rating`; Moonfin-Core's newer proven source adapter treats ratings >=8/10 as high-rating seeds. The webOS implementation was still sourcing `high-ratings` from Likes + Favourites and even rendered the dynamic title as `Because You Liked ...`, which did not truthfully match those lane labels.

Product source commit:

`42854590caf4dbf847696483d943a886d5ab8ed7` — `fix(discovery-v2): use real Jellyfin high-rating seeds`

Changes are deliberately narrow:

- `high-ratings` now performs one bounded Jellyfin item query (`Limit: 100`, played items ordered by `DatePlayed`) and keeps only `UserData.Rating >= 8`
- anime `anime-high-ratings` inherits the same real rating provenance plus its existing anime filter
- dynamic heading now says `Because You Rated <title> Highly`
- focused regression proves the numeric rating filter, single bounded source query, selected recommendation seed and anime alias policy
- the old implementation used two parallel Jellyfin source requests; the new rating source uses one, so this correction does not increase initial request fan-out
- no catalogue, structural-lane, UI/focus, packaging identity or live-service changes

Current required workflow:

- **#51 / `34432674158`**
- exact source `42854590caf4dbf847696483d943a886d5ab8ed7`
- status when checkpointed: **in progress**
- workflow `Home Lab webOS Discovery v2`
- expected gates: focused Discovery tests, strict Enact lint, legacy CSS check, production Enact build, IPK packaging, preserved `org.moonfin.webos` / `2.7.0` / `index.html` identity, isolated artifact upload

Do not poll this long workflow repeatedly. On the next continuation inspect this exact run once.

## Cross-platform parity after #51

Do not copy Flutter's old slot/hash behaviour back into webOS. Current evidence instead requires a deliberate semantic matrix:

- retain webOS real-source implementations where their advertised semantics are truthful
- retain Moonfin-Core's newer provenance-specific sources such as numeric high ratings where stronger
- reconcile remaining strategy-support differences, especially webOS-proven novelty/rewatch/anime-not-owned behaviour versus current Flutter fail-closed handling
- keep the 13 structural/context lanes fail-closed until independently proven
- use real-data aggregate diagnostics later for quality tuning; do not tune recommendation policy from synthetic tests alone

## Physical/live gates — DEFERRED

No physical LG acceptance is claimed by CI. Later acceptance must cover real Home Lab recommendation quality, remote focus/back, 720p/1080p presentation, long text/missing imagery, responsiveness/memory, deep paging, owned playback, Seerr request actions, detail return, failure recovery, auth persistence, relaunch/resume and same-ID update compatibility.

Live remains untouched.

## Exact next action

Inspect workflow **#51 / `34432674158` once**. If green, capture test/build/package/identity/artifact/hash evidence, mark this semantic correction and webOS GitHub reconciliation complete, then advance to cross-platform parity/recommendation-quality work. If red, inspect only the failing gate and fix its root cause without weakening semantics or tests.

## Do not

- modify `homelab/webos-v1-staging`
- overwrite preserved v1 candidate/release pointers
- change/regenerate `org.moonfin.webos`
- claim physical LG acceptance from CI
- fake personalised or structural catalogue semantics
- replace the Smart-TV client with Flutter Web merely for convenience
- treat green packaging as physical product acceptance
