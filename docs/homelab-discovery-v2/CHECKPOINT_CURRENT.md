# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-08 Australia/Adelaide  
**Primary branch:** `homelab/webos-discovery-v2`

This is the Smart-TV/webOS resume point for Home Lab Discovery v2. Preserve the known-good webOS branch/tag and do not publish or install a replacement until the current webOS product slice and real LG acceptance gates are met.

## Objective / quality lock

Maintain LG/webOS as a first-class Moonfin target while implementing the same server-driven Home Lab Discovery product used by Moonfin-Core. The Smart-TV client remains its lightweight Enact/webOS implementation; do not force Flutter Web onto the old LG platform.

webOS is the current implementation slice, not the end of Moonfin. After webOS reaches a strong equivalent state, return to the whole Discovery product across Web, Android mobile/tablet, Google TV/Android TV and LG webOS for semantic validation, UX refinement, real-device acceptance and final polish.

Quality, maintainability and real remote/navigation behaviour take priority over speed. Green CI and a successful IPK are milestones only.

## Preserved known-good baseline

- repository: `PRYYSE/Smart-TV`
- known-good branch: `homelab/webos-v1-staging`
- preserved candidate commit: `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e`
- app ID: `org.moonfin.webos`
- version: `2.7.0`
- entry point: `index.html`
- package builder: `packages/build-webos/`
- target physical client: LG OLED65C6PSA

Do not rewrite the old staging branch or overwrite its candidate release while v2 is under development.

## Current verified v2 milestone

Branch head before this documentation commit:

`08df13b15bf0b5bd66fdf7dceb6359b18d67042b`

Workflow `34178662792` / run **#15** — **GREEN**.

Artifact:

- ID: `10038154398`
- name: `Moonfin-HomeLab-webOS-DiscoveryV2-08df13b15bf0b5bd66fdf7dceb6359b18d67042b`
- GitHub artifact digest: `sha256:8babd2765d40c5480acf765a186a673c648ec2c790f7d088d71b76ee3b611d3e`
- IPK manifest SHA-256: `ebceaf7da758c792eaf939102d76ceac9b2d3d1ae330d9bf69eea7960ca14018`
- package: `Moonfin_webOS_2.7.0.ipk`
- app ID verified: `org.moonfin.webos`
- version verified: `2.7.0`
- main verified: `index.html`

Run #15 passed dependency install, all focused Discovery tests, strict lint/build checks, legacy-WebKit compatibility processing, production Enact build, IPK packaging, identity verification and isolated artifact upload.

Focused test result: **11 suites passed, 53 tests passed**.

## What survived the desynchronised run and is now verified

The old Moonfin-Core checkpoint was behind this work. The following Smart-TV work is real repository state and must not be redone:

1. **Guarded six-tab catalogue UI**
   - feature-local `HomeLabDiscovery` view
   - valid compatible catalogue -> custom Discovery
   - unavailable/invalid/incompatible catalogue -> preserved stock `SeerrDiscover`
   - loading/retry/empty/partial-failure/refresh states
2. **Remote/focus navigation foundation**
   - Enact Spotlight containers and spottable cards/buttons
   - active-tab focus scheduling
   - row focus memory
   - left-edge navbar return
   - deterministic vertical row movement
3. **Deep `See All` browse**
   - feature-local deep route/controller
   - virtual grid
   - persistent in-session focus memory
   - restoration can load through the remembered index
   - bounded page loading/dedup/error recovery
4. **Catalogue/service foundation**
   - fail-closed query planner matching Moonfin-Core filter/sort/date-token policy
   - network-first server-scoped catalogue/LKG loader
   - authenticated Moonbase Seerr proxy client with path/query allow-lists
   - membership filtering
   - deterministic tab loading and post-fetch presentation
5. **Jellyfin-backed personalisation**
   - sixteen deterministic personal strategy slots reuse the existing Smart-TV Home recommendation engine
   - Jellyfin candidates are hydrated when required before TMDB mapping
   - movie/series filtering plus explicit anime filtering
   - dynamic `Because You Watched ...` display titles
   - unavailable/fabricated personalisation is not silently substituted
   - personal results use the normal Discovery membership/dedup path
6. **Persistent surfaced-lane rotation**
   - server/user/tab-scoped rotation history
   - refresh advances rotation and forces personalised first-page refresh
   - reset persists the cleared state

## Batch 1 recovery repair

The desynchronised commit `dd1b52eb5503ee37e74fbaba56f65360ad24f8a7` introduced valid personalisation/rotation work but workflow #13 failed before packaging because Jest imported the full Enact/Jellyfin runtime while initialising otherwise pure service tests.

The repair deliberately preserved production behaviour rather than weakening tests:

- `635574bac20bb0a8a75ddf6dab117d8bc2d5add1` — isolated production Jellyfin/Home-recommendation runtime resolution behind lazy adapters so dependency-injected personalisation tests remain platform-neutral;
- all 11 Discovery suites then initialised and all 53 tests passed;
- reaching the full production builder exposed one pre-existing strict `no-shadow` warning in the personalised lane path;
- `08df13b15bf0b5bd66fdf7dceb6359b18d67042b` — removed that warning without changing behaviour;
- workflow #15 then completed the complete test/build/package/identity/artifact path successfully.

Do not revert the runtime boundary merely to use top-level imports in tests.

## Still open in the webOS slice

The current candidate is a strong implemented milestone, not a finished webOS product. Next work should assess and improve the actual Discovery experience rather than rushing to deployment:

1. semantic regression accounting against the accepted legacy 481/486 Discovery result, including explicit unsupported-lane reasons;
2. recommendation/lane quality, personalised strategy diversity and cross-row duplication quality;
3. landing + deep-browse remote/focus/back behaviour, especially tab transitions, row/card restoration, navbar return, partial grids and load-more edges;
4. visual consistency, spacing, card/backdrop behaviour, responsiveness and old-TV rendering constraints;
5. performance/caching, retained-state correctness and stale-request handling;
6. loading/error/empty/partial-failure behaviour under real failure combinations;
7. request/detail/local-media/playback integration and return-from-detail behaviour;
8. edge cases around catalogue refresh/change, missing images/provider IDs, sparse lanes and exhausted paging;
9. physical LG OLED65C6PSA acceptance: launch/resume, remote navigation, Back, rendering, auth persistence, details/request/playback and update compatibility.

Only after webOS reaches a strong equivalent state should the project return to the shared Moonfin Discovery product and re-review Web, Android mobile/tablet and Android TV/Google TV alongside webOS. Existing Flutter CI/build milestones are not final acceptance.

## Do not

- modify `homelab/webos-v1-staging`
- overwrite preserved v1 candidate/release pointers
- change/regenerate `org.moonfin.webos`
- claim physical LG acceptance from CI
- fake personalised recommendations or unsafe unresolved catalogue semantics
- replace the Smart-TV client with Flutter Web merely for convenience
- treat a green package as permission to skip semantic/UX/cross-platform polish
