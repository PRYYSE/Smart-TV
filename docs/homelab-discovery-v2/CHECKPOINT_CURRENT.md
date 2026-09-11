# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-11 Australia/Adelaide  
**Accepted branch:** `homelab/webos-discovery-v2`  
**Update branch:** `update/webos-2.8.2`

GitHub/current repo state is authoritative. Do not restart completed webOS Discovery work and do not touch live/physical systems during this update pass.

## Accepted baseline — preserve

- Discovery parity/product source `a9dfa657a220a3f8f77753261bd7d8e902c0d837`, #52 / `34439022624` GREEN.
- accepted artifact `10137277340`, digest `sha256:9d5ccfed0889a680fa6b4d3532725ce1877f950d306d9599bb6916e9d150c47f`.
- app ID `org.moonfin.webos`, accepted package `2.7.0`, entry `index.html`.
- Node 20 retained for legacy LG C6 compatibility.
- rollback `homelab/webos-v1-staging` / `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e` untouched.
- catalogue remains `486 authored / 481 active`; webOS intentionally `468 executable / 481 active`; 13 structural/context lanes fail closed.

## Stable upstream status

Corrected stable-release detector reports:

- accepted release lineage `2.7.0`.
- accepted source base `384d7cab3642f846463a4308e92d213e51507edf` — keep this real ancestry anchor.
- latest stable release `2.8.2` at `ed327948aeb8ef19098b810145ab6a3b76ccf372`.
- stable update: **YES**.
- five upstream/Home-Lab overlap paths.

## 2.8.2 isolated port — reviewed

`update/webos-2.8.2` was created directly from official 2.8.2. Draft PR #1 is a conflict probe only; do not force-merge it.

Read-only validation is complete:

- webOS Discovery #54 / `34578965395`: **GREEN**.
- Port Analysis #1 / `34578965427`: **GREEN**.
- port artifact `10190788565`, digest `sha256:f9bbed71dd7c08770748e749a45aaa75663e58da881c99c461dd4b340fa42f46`.
- exactly five conflicts:
  - `packages/app/src/context/SettingsContext.js`
  - `packages/app/src/utils/homeLayout.js`
  - `packages/app/src/utils/homeLayout.test.js`
  - `packages/app/src/utils/seerrTarget.js`
  - `packages/app/src/utils/seerrTarget.test.js`
- all other Home-Lab overlay paths merged cleanly.

Reviewed merge result preserves:

- upstream 2.8.2 settings/layout evolution and `serverPluginSections` passthrough.
- Home-Lab custom destination-row parsing/profile plumbing via `customHomeRowsFromProfile` without writing derived `customHomeRows` as an authoritative standalone profile field.
- upstream Seerr IMDb/title fallback, search matching and library helpers.
- Home-Lab owned-item routing through `seerrSelectionMediaId`, so known-owned Discovery titles open real Jellyfin detail/playback items.

Local dependency-free behavioural checks, Settings structural checks, JS parse checks and conflict-marker scan: **PASS**.

## Staging control — CURRENT

Source `f932addf2d533cafe3b513d0a1960c631078f124` changes `.github/workflows/homelab-webos-upstream-port.yml` from read-only analysis into a fail-closed one-time staging gate.

Before it may push, it requires:

- latest stable tag exactly `2.8.2` and reviewed SHA `ed327948aeb8ef19098b810145ab6a3b76ccf372`.
- target `update/webos-2.8.2` still untouched at that release SHA.
- conflict set exactly the five reviewed paths above.
- conflict-surface + Discovery tests under Node 20.
- successful `npm run build:webos`.
- exact package identity `org.moonfin.webos` / `2.8.2` / `index.html`.
- no tracked unstaged build mutations.

Only after all gates pass does it create the merge commit and fast-forward `update/webos-2.8.2`. Accepted and rollback refs are never targeted.

## Waiting — DO NOT POLL AGAIN THIS CYCLE

- Port Staging #2 / `34580576176`: captured **IN PROGRESS**.
- accepted-branch regression #55 / `34580576157`: captured **IN PROGRESS**.

Do not claim a 2.8.2 candidate SHA yet; the update branch has not been re-read after staging.

## Exact next action

1. Inspect staging #2 and regression #55 once.
2. If staging failed, inspect only its failing step/log and correct that defect.
3. If staging succeeded, fetch the resulting `update/webos-2.8.2` SHA and the update-branch Discovery workflow triggered by the push.
4. Capture tests/build/app-ID/version/IPK artifact evidence for the isolated 2.8.2 candidate.
5. Keep accepted + rollback branches unchanged until deliberate promotion and later physical/live acceptance.

## Live boundary

No physical LG acceptance is claimed by CI. Live services remain untouched.
