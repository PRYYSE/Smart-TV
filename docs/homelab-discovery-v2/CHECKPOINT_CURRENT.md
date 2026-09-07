# Home Lab webOS Discovery v2 — Current Checkpoint

**Last updated:** 2026-09-07 Australia/Adelaide  
**Primary branch:** `homelab/webos-discovery-v2`

This is the Smart-TV/webOS resume point for Home Lab Discovery v2. Preserve the known-good webOS branch/tag and do not publish or install a replacement until the new Discovery UI and real LG acceptance gates are met.

## Objective / quality lock

Maintain LG/webOS as a first-class Moonfin target while moving Discovery to the same server-driven catalogue concept used by Moonfin-Core. The Smart-TV client remains its lightweight Enact/webOS implementation; do not force the Flutter Web build onto the old LG platform.

Quality, maintainability and real remote/navigation behaviour take priority over speed.

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

## New isolated branch

`homelab/webos-discovery-v2` was branched from the exact preserved candidate.

Verified service foundation source before this documentation commit:

`eb6b4ad409a76134745263cfcfc5eefbb8789272`

Implemented:

1. `homeLabDiscoveryPlanner.js`
   - fail-closed server-catalogue query planner
   - mirrors Moonfin-Core filter/sort/date-token policy
   - allow-lists executable Seerr discovery routes
   - unresolved semantic names fail closed
   - `personalised` and unresolved `externalList` are not faked
2. `homeLabDiscoveryCatalogue.js`
   - strict catalogue validation
   - network-first `/Moonfin/Web/homelab/discovery.catalogue.json`
   - server-scoped localStorage LKG
   - schema versions 1/2
   - client capability 2; future higher-capability catalogues are rejected and a compatible LKG may be used
3. `homeLabDiscoveryClient.js`
   - narrow authenticated Moonbase Seerr proxy client
   - path and query allow-lists
   - existing request queue/timeout path reused
   - Moonbase `FileContents` envelopes handled explicitly
   - HTTP/JSON errors surface instead of becoming empty lanes
4. focused unit coverage for planner, catalogue recovery/capability and proxy execution
5. isolated CI with `contents: read`; it tests, builds, verifies identity and uploads an artifact only. It does not publish a release/tag.

## Verification

**Workflow:** `34089074388`  
**Source head:** `eb6b4ad409a76134745263cfcfc5eefbb8789272`  
**Result:** GREEN

Passed:

- dependency install
- all focused Discovery service tests
- webOS package build
- preserved app identity/package verification
- artifact upload

Artifact:

- ID: `10006229535`
- name: `Moonfin-HomeLab-webOS-DiscoveryV2-eb6b4ad409a76134745263cfcfc5eefbb8789272`
- GitHub artifact digest: `sha256:a591f0e48d868f8509859a5625a159bb476f2599d38b533157da6f3a29deba7f`

Independent downloaded IPK verification:

- IPK SHA-256: `c8c989d3d88a4e4c9f70fab04be06af7e87846f72187de538bba3b8a193ee9c3`
- checksum manifest: PASS
- package format: Debian/IPK format 2.0
- extracted app ID: `org.moonfin.webos`
- extracted version: `2.7.0`
- extracted main: `index.html`
- `handlesRelaunch`: true
- `disableBackHistoryAPI`: true

The package is only a verified service-foundation build. The new catalogue-driven Discovery UI is not integrated yet, so it is not a device-test candidate.

## Exact next work

1. Keep the existing stock Smart-TV `SeerrDiscover` screen intact as guarded fallback.
2. Build a new feature-local catalogue-driven Discovery view using the existing Enact Spotlight remote primitives.
3. Load the catalogue from the active Jellyfin/Moonfin server credentials supplied by the existing Auth/Seerr contexts.
4. Valid compatible catalogue -> custom six-tab Discovery; unavailable/invalid/incompatible -> existing stock `SeerrDiscover` unchanged.
5. Implement deterministic lane selection/presentation appropriate to the Smart-TV client without pretending to support `personalised` rows until a real Jellyfin-backed strategy is verified.
6. Add deep/See-All browsing with remote focus retention and back behaviour.
7. Add automated service/component/Spotlight regression coverage where practical.
8. Build another isolated IPK and preserve `org.moonfin.webos`/2.7.0 upgrade identity.
9. Only then perform real LG OLED65C6PSA remote/focus/back/resume/rendering/update acceptance.

## Do not

- modify `homelab/webos-v1-staging`
- overwrite `homelab-webos-v1-candidate` or `homelab-webos-beta-latest`
- change app ID during v2 work
- claim physical LG acceptance from CI
- fake personalised recommendations or unsafe unresolved catalogue semantics
- replace the Smart-TV client with Flutter Web merely for implementation convenience
