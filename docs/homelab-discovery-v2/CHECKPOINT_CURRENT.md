# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-11 Australia/Adelaide  
**Accepted branch:** `homelab/webos-discovery-v2`  
**Update branch:** `update/webos-2.8.2`

GitHub/current repo state is authoritative. Do not restart completed webOS Discovery work and do not touch live/physical systems during this update pass.

## Accepted Home Lab baseline — preserve

- Discovery parity/product source: `a9dfa657a220a3f8f77753261bd7d8e902c0d837`
- parity workflow #52 / `34439022624`: **GREEN**
- accepted candidate artifact `10137277340`
- artifact digest `sha256:9d5ccfed0889a680fa6b4d3532725ce1877f950d306d9599bb6916e9d150c47f`
- app ID `org.moonfin.webos`
- accepted package version `2.7.0`
- entry `index.html`
- Node 20 retained for legacy LG C6 compatibility
- rollback branch `homelab/webos-v1-staging`
- rollback candidate `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e`

Shared catalogue remains `486 authored / 481 active`; webOS intentionally supports `468 executable / 481 active`. The 13 structural/context lanes remain fail-closed. Cross-platform parity/recommendation semantics are complete for existing GitHub/code evidence.

## Stable upstream status

Official upstream: `Moonfin-Client/Smart-TV`.

The corrected Home Lab stable-release detector reports:

- accepted release lineage: `2.7.0`
- accepted source base: `384d7cab3642f846463a4308e92d213e51507edf`
- latest stable release: `2.8.2`
- official 2.8.2 commit: `ed327948aeb8ef19098b810145ab6a3b76ccf372`
- stable update: **YES**
- 156 commits from accepted source base to 2.8.2
- five upstream/Home-Lab overlap paths

Do not replace the accepted source base with the older 2.7.0 tag commit; `384d7cab...` is the real source ancestry used by the accepted Home-Lab overlay.

## Smart-TV 2.8.2 isolated update — CURRENT

`update/webos-2.8.2` was created directly from official 2.8.2 `ed327948aeb8ef19098b810145ab6a3b76ccf372`. Accepted and rollback branches remain untouched by the update candidate.

Draft PR #1 (`homelab/webos-discovery-v2` -> `update/webos-2.8.2`) is only a three-way conflict probe. GitHub reports it is not automatically mergeable; do not force-merge it.

Explicit overlap set:

- `packages/app/src/context/SettingsContext.js`
- `packages/app/src/utils/homeLayout.js`
- `packages/app/src/utils/homeLayout.test.js`
- `packages/app/src/utils/seerrTarget.js`
- `packages/app/src/utils/seerrTarget.test.js`

Required merge intent:

- preserve upstream 2.8.2 settings/layout changes; add only Home-Lab custom-row profile/layout plumbing and its tests
- preserve upstream 2.8.2 Seerr IMDb/title search fallback and related helpers/tests
- also preserve Home-Lab Discovery selection semantics that open known-owned items as real Jellyfin items through `seerrSelectionMediaId`
- do not regress old-TV CSS/build constraints, app identity, focus/deep browse semantics or fail-closed Discovery behaviour

Workflow support commit `a4e0a3251bf3a987e6c92ad4c1575e5c528401e0` added `update/webos-*` validation while retaining Node 20 and protected app identity; #53 / `34576558771` validated it GREEN.

Port-analysis commit `2c2a7627db8910752d587328cdacef6c76afb537` adds `.github/workflows/homelab-webos-upstream-port.yml`. It is read-only: it resolves the latest stable release, attempts the three-way merge without pushing, records unresolved paths/status/conflict diff and uploads the complete merge worktree. It never deploys or alters accepted/rollback refs.

## Waiting runs — inspect once next continuation

- webOS Discovery validation #54 / `34578965395`: captured **IN PROGRESS**
- webOS Upstream Port Analysis #1 / `34578965427`: captured **IN PROGRESS**

Do not poll these again in the current waiting cycle.

## Exact next action

1. Inspect #54 and Port Analysis #1 once.
2. If Port Analysis is green, download its worktree artifact and resolve only actual conflict paths.
3. Commit the resolved tree only to `update/webos-2.8.2`.
4. Run the update branch through `.github/workflows/homelab-webos-discovery-v2.yml` and capture tests/build/app-ID/version/IPK evidence.
5. Keep the accepted and rollback branches unchanged until later physical/live acceptance and deliberate promotion.

## Live boundary

No physical LG acceptance is claimed by CI. Live services remain untouched.
