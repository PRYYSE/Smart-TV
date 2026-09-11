# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-11 Australia/Adelaide  
**Accepted branch:** `homelab/webos-discovery-v2`  
**Isolated update branch:** `update/webos-2.8.2`

GitHub/current repo is authoritative. Do not restart completed Discovery work or touch live/physical systems during this update pass.

## Accepted baseline — preserve

- Discovery parity/product source `a9dfa657a220a3f8f77753261bd7d8e902c0d837`; #52 / `34439022624` GREEN.
- accepted artifact `10137277340`; ZIP digest `sha256:9d5ccfed0889a680fa6b4d3532725ce1877f950d306d9599bb6916e9d150c47f`.
- app ID `org.moonfin.webos`; accepted package version `2.7.0`; entry `index.html`.
- Node 20 retained for legacy LG C6 compatibility.
- rollback `homelab/webos-v1-staging` / `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e` untouched.
- catalogue remains `486 authored / 481 active`; webOS intentionally `468 executable / 481 active`; 13 structural/context lanes fail closed.

## Stable upstream status

Official upstream `Moonfin-Client/Smart-TV` latest stable release is `2.8.2` at `ed327948aeb8ef19098b810145ab6a3b76ccf372`.

Corrected stable detector evidence:

- accepted release lineage `2.7.0`.
- accepted real source base `384d7cab3642f846463a4308e92d213e51507edf` — preserve as ancestry anchor.
- stable update **YES**.
- exactly five upstream/Home-Lab overlap paths:
  - `packages/app/src/context/SettingsContext.js`
  - `packages/app/src/utils/homeLayout.js`
  - `packages/app/src/utils/homeLayout.test.js`
  - `packages/app/src/utils/seerrTarget.js`
  - `packages/app/src/utils/seerrTarget.test.js`

## Reviewed 2.8.2 port evidence

- `update/webos-2.8.2` was created directly from official `2.8.2`.
- Draft PR #1 is a **conflict probe only — DO NOT MERGE**.
- webOS validation #54 / `34578965395`: GREEN.
- read-only Port Analysis #1 / `34578965427`: GREEN.
- port-analysis artifact `10190788565`; digest `sha256:f9bbed71dd7c08770748e749a45aaa75663e58da881c99c461dd4b340fa42f46`.
- all non-overlap Home-Lab paths merged cleanly in the analysis workspace.
- reviewed resolution preserves upstream 2.8.2 settings/layout + Seerr IMDb/title fallback while retaining Home-Lab custom destination rows and owned-item Jellyfin routing via `seerrSelectionMediaId`.
- local conflict-resolution behavioural/structural/parse checks passed.

## Staging recovery

Staging #2 / `34580576176` at `f932addf2d533cafe3b513d0a1960c631078f124` **FAILED only in the staging control**:

- exact stable release/target checks passed.
- exact five conflicts were found and the reviewed resolver ran.
- an over-broad `git diff --check` rejected unrelated pre-existing whitespace in workflow heredoc content and Markdown hard-breaks.
- tests/build/push were skipped; therefore the isolated update branch was not advanced by #2.
- accepted-branch regression #55 / `34580576157` was GREEN.

The resolver was then hardened:

- `tooling/webos-2.8.2-reviewed-conflicts.patch` now transforms the **actual conflict-marker workspace** into the already-reviewed resolved five files, preserving clean auto-merged hunks inside those files.
- fixed patch SHA-256: `23d7800c6d15812cea030a8e5329bea267a5dd17d18be9003efb9b4904f54848`.
- dry apply with `--whitespace=error` reproduced the reviewed files byte-for-byte.
- repair source `8fb273c024c773d730bd22304fa3d12961db18a2` also fails closed if product/package files changed after reviewed source `2c2a7627db8910752d587328cdacef6c76afb537`, if release/target SHA changed, if the conflict set differs, or if the patch digest differs.
- whitespace validation is now scoped to the five actually resolved product files.
- staging still requires Node 20 focused tests, `npm run build:webos`, exact `org.moonfin.webos` / `2.8.2` / `index.html`, then pushes only `update/webos-2.8.2`.

## Waiting — inspect each ONCE next continuation

- Port Staging #3 / `34582511512`, source `8fb273c024c773d730bd22304fa3d12961db18a2`: captured **IN PROGRESS**.
- accepted-branch regression #57 / `34582511474`, same source: captured **IN PROGRESS**.

Do not poll these again in this waiting cycle.

## Exact next action

1. Inspect #3 and #57 once.
2. If #3 failed, inspect only its failing step and repair that genuine staging defect.
3. If #3 is green, fetch `update/webos-2.8.2` once and capture the produced merge-candidate SHA.
4. A push made by Actions `GITHUB_TOKEN` does not create the normal follow-on push workflow run. Therefore create one external same-tree GitHub commit on `update/webos-2.8.2` solely to trigger `.github/workflows/homelab-webos-discovery-v2.yml`; record its exact run once.
5. When that established validation is green, capture IPK artifact metadata/hash and mark the GitHub/code 2.8.2 update integrated. Do not promote the accepted branch or touch live/device state yet.

## Live boundary

No physical LG acceptance is claimed by CI. Live services and rollback refs remain untouched.
