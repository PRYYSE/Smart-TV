# Home Lab webOS Discovery v2 — Current Checkpoint

**Updated:** 2026-09-11 Australia/Adelaide  
**Accepted branch:** `homelab/webos-discovery-v2`  
**Validated update branch:** `update/webos-2.8.2`

GitHub/current repo is authoritative. webOS GitHub/code work is complete; do not restart it unless physical acceptance exposes a genuine defect or a newer official release arrives.

## Status — GitHub/code COMPLETE

No known webOS GitHub/code-side work remains before physical LG acceptance.

## Accepted/live baseline — preserve until physical acceptance

- Discovery parity/product source `a9dfa657a220a3f8f77753261bd7d8e902c0d837`; #52 / `34439022624` GREEN.
- accepted artifact `10137277340`; ZIP digest `sha256:9d5ccfed0889a680fa6b4d3532725ce1877f950d306d9599bb6916e9d150c47f`.
- accepted release `2.7.0`; real source-base ancestry `384d7cab3642f846463a4308e92d213e51507edf`.
- app ID `org.moonfin.webos`; entry `index.html`; Node 20 retained for legacy LG C6 compatibility.
- rollback `homelab/webos-v1-staging` / `f5c3078ba388f8ba1da85166f62ebf7fe0bbda1e` untouched.
- catalogue remains `486 authored / 481 active`; webOS intentionally `468 executable / 481 active`; 13 structural/context lanes fail closed.

## Validated 2.8.2 candidate

Official latest stable is still `2.8.2` at `ed327948aeb8ef19098b810145ab6a3b76ccf372`.

- Port Analysis #1 / `34578965427`: GREEN; exactly five overlap paths explicitly reviewed.
- reviewed conflict patch SHA-256 `23d7800c6d15812cea030a8e5329bea267a5dd17d18be9003efb9b4904f54848`.
- repair/control source `8fb273c024c773d730bd22304fa3d12961db18a2`.
- Port Staging #3 / `34582511512`: GREEN; exact release/ref/conflict checks, focused tests, Node 20 build, `org.moonfin.webos` / `2.8.2` / `index.html`, and isolated candidate push passed.
- accepted-branch regression #57 / `34582511474`: GREEN.
- isolated product merge `44a72276e87f611791348fbd11584e6aff56641a`; tree `f3422be8bc22c312fbb94807b71a90e815c0213e`.
- validation trigger `3dc9d2d3ba4e2e94793d70c14d18c3fb5c1b2568` changes only `.github/homelab-webos-2.8.2-validation.txt`; no product/package content changed.
- established update-branch validation #58 / `34582969197`: GREEN; Discovery tests, webOS build, preserved app identity/package verification and artifact upload all passed.
- #58 artifact `10192446254`; ZIP digest `sha256:7cb6387cde7681fb598edb431d31bb7f596a9e86dd1be27b0fc5c6d3c7fb4717`.
- packaged IPK SHA-256 `75be2fedecbd3b503a5f74d2c2fad403e9ac0bede4c842d4da87bd80cae2460a`, independently verified against the packaged checksum.
- conflict-probe PR #1 is CLOSED and unmerged.
- validation marker is deliberately retained on the isolated branch as provenance; it is outside application/package scope.

## Exact next action

Do not promote `update/webos-2.8.2` yet. When the project explicitly enters physical acceptance, install/test the candidate on the LG OLED65C6PSA and verify in-place update, launch/auth, Discovery navigation/focus/back, details/request/local playback, playback compatibility and constrained-TV behaviour. Promote only after real acceptance passes.

## Live boundary

No physical LG acceptance is claimed by CI. Live services, accepted product branch and rollback refs remain untouched.
