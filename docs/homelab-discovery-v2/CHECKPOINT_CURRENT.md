# Home Lab webOS Discovery v2 — Current Checkpoint

**Updated:** 2026-09-11 Australia/Adelaide
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

## Stable upstream / reviewed port

Official latest stable is `2.8.2` at `ed327948aeb8ef19098b810145ab6a3b76ccf372`; accepted real source-base ancestry remains `384d7cab3642f846463a4308e92d213e51507edf`.

Port Analysis #1 / `34578965427` was GREEN and identified exactly five overlap paths. The reviewed resolution preserves upstream 2.8.2 settings/layout and Seerr IMDb/title fallback while retaining Home-Lab custom destination rows and owned-item Jellyfin routing.

- reviewed conflict patch SHA-256 `23d7800c6d15812cea030a8e5329bea267a5dd17d18be9003efb9b4904f54848`.
- repair/control source `8fb273c024c773d730bd22304fa3d12961db18a2`.
- staging #3 / `34582511512`: **GREEN**; release/ref guard, exact five-conflict gate, patch application, dependency install, focused tests, webOS build, exact `org.moonfin.webos` / `2.8.2` / `index.html`, and isolated branch push all passed.
- accepted-branch regression #57 / `34582511474`: **GREEN**; Discovery tests, build, identity/package verification and artifact upload passed.
- regression artifact `10192272864`; ZIP digest `sha256:a37554228197b4b8640a722f96b274eebe0a0daf6f3003a3d9fc31fa3796370c`.

## Isolated 2.8.2 candidate — CURRENT

Staging produced merge candidate:

- product merge commit `44a72276e87f611791348fbd11584e6aff56641a`.
- tree `f3422be8bc22c312fbb94807b71a90e815c0213e`.
- parents: official 2.8.2 `ed327948...` and reviewed Home-Lab source `8fb273c...`.
- same-tree checkpoint `26883e4dc3d1d2d25ce820756cf09a845227e3c1` changed no product files.
- external validation trigger `3dc9d2d3ba4e2e94793d70c14d18c3fb5c1b2568` adds only `.github/homelab-webos-2.8.2-validation.txt`; it records the product source and contains no product/package content.

Normal update-branch validation:

- Home Lab webOS Discovery v2 #58 / `34582969197`.
- source `3dc9d2d3ba4e2e94793d70c14d18c3fb5c1b2568`.
- captured **IN PROGRESS** (dependency-install step) after initial queued capture.
- **DO NOT POLL AGAIN THIS CYCLE**.

Draft PR #1 remains a conflict probe only and is explicitly labelled **DO NOT MERGE**.

## Exact next action

1. On next continuation inspect #58 exactly once.
2. If green, capture its artifact metadata/digest and verify all established Discovery test/build/identity/package steps passed.
3. Remove the temporary validation marker from the isolated branch using a content-API commit if desired, then validate that cleanup only if it changes executable/package scope (it should not).
4. Mark Smart-TV 2.8.2 GitHub/code integration complete and update the stable baseline/checkpoints; close or clearly retire conflict-probe PR #1.
5. Then create/update the explicit whole-project GitHub completion checkpoint if no other stable/code blocker remains.
6. Do not promote accepted/rollback refs or touch live/physical devices without an explicit later acceptance step.

## Live boundary

No physical LG acceptance is claimed by CI. Live services, accepted product branch and rollback refs remain untouched.
