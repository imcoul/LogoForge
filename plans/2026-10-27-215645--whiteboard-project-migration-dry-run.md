---
title: "Whiteboard Project Migration Dry-Run"
date: 2026-10-27
author: "Ibrahim"
featureId: "p1-document-002"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: "Playwright: 22 passed"
percySnapshot: ""
telemetrySample: ""
---

# Whiteboard Project Migration Dry-Run

## Summary
Add a pure project-level preview that reports whether legacy Whiteboard sketches can be folded into the current shared Node document without writing or mutating stored project data.

## Context and sequencing
The Phase 1 roadmap requires `whiteboardSketches` to fold into the shared node tree and calls for a dry-run migration before stored-project writes. Existing projects may also contain `sceneGraph` and `svgSource`; the roadmap warns this migration overlaps Phase 2's persistence/database work. The previous slice added a pure per-sketch adapter, but it is not wired into project hydration or persistence. The project preview therefore fails closed when its source document cannot be reconciled and does not choose a persistence backend or apply changes.

Shared history can link an existing SVG path to a Whiteboard sketch through `data-logoforge-shared-whiteboard-id`; the preview recognizes this as already represented rather than appending duplicate geometry. OpenDesign/Excalidraw remains deferred until the document foundation is stable; Fabric.js remains blocked on the unavailable `imcoul/fabric.js` fork.

## Plan
1. Build a pure preview API over a project ID, `sceneGraph`, `svgSource`, and `whiteboardSketches`, reusing `whiteboardNodeAdapter`.
2. Select a base document only when source state is unambiguous: parse `svgSource` when present; if `sceneGraph` is also populated, require a canonical match or report a blocker.
3. Inspect SVG markup for unsupported tags/comments or parse failures that `parseSvg` would otherwise omit; reject duplicate node IDs and duplicate shared-link markers.
4. Deduplicate sketches already represented by their reserved migrated node ID or shared-link marker. Report candidate additions, skipped records, conversion rejections, and blockers.
5. Return a proposed document only when the entire preview is safe; any rejected sketch or structural ambiguity blocks the whole preview. The API performs no store, IndexedDB, Firestore, Supabase, network, or file writes.
6. Add focused tests for source selection, source conflicts, deduplication, unsupported markup, invalid sketches, non-mutation, and idempotent repeat previews.

## Acceptance Criteria
- Functional: valid projects produce a deterministic preview document and explicit counts/IDs for added and already-represented sketches.
- Functional: shared-link markers and reserved adapter IDs prevent duplicate paths; duplicate sketch/node IDs are blockers.
- Functional: malformed SVG, parser-loss risks, divergent `sceneGraph`/`svgSource`, or any rejected sketch blocks the preview and yields no commit-ready document.
- Functional: the project and nested input objects remain unchanged; no persistence action occurs.
- Persistence: this is an opt-in, in-memory dry-run only. No project schema, database, cloud-sync, or hydration behavior changes.
- Telemetry: no events are emitted; no existing project migration telemetry convention is present.

## Implementation Notes
- Added `src/engine/whiteboardProjectMigration.ts`, centralized the shared-link marker and batch dedup support in `src/engine/whiteboardNodeAdapter.ts`, and reused the marker in `src/engine/sharedVectorHistory.ts`.
- Added `src/tests/engine/whiteboardProjectMigration.test.ts`; expanded shared-history safety coverage in `src/tests/engine/sharedVectorHistory.test.ts`.
- The preview uses the type-only `Project` contract and pure SVG/adapter modules; it does not import the Zustand store at runtime.
- `sceneGraph` and `svgSource` remain separate persisted fields. Nonmatching populated sources require manual reconciliation; the preview does not silently prefer one and discard the other.
- Proposed nodes carry opaque legacy provenance so a later explicit migration can roll back unsupported or edited records safely.
- Hardened parsing, cloning, and serialization to preserve SVG `__proto__` attributes, authored/generated SVG ID provenance, and generated-looking IDs from sceneGraph-only projects. Hostile project/array accessors and proxy traps fail closed.
- Review also found shared commands were not consistently bound to their originating project. Add/link/delete/update forward and inverse paths now validate `projectId`; malformed command inputs return safe no-ops rather than escaping exceptions.

## Tests
- Unit: empty project, valid `svgSource` base, `sceneGraph`-only base, equivalent dual sources, divergent dual-source rejection, and repeated non-mutating previews.
- Unit: existing migrated IDs and `data-logoforge-shared-whiteboard-id` links are skipped; duplicate sketch/node IDs and reserved identity collisions block the preview.
- Unit: malformed SVG, unsupported SVG elements/comments, invalid sketches, serializer loss, malformed Node/provenance descriptors, sparse/extra arrays, accessors, and hostile proxies block without a proposed document.
- Unit: `__proto__` SVG attributes survive parse → proposal → serialize; authored `n0` IDs survive shared update/delete undo; cross-project command replay and malformed add/link/delete/update commands are rejected safely.

## Verification Steps
1. Focused migration and shared-history tests passed.
2. `npx tsc --noEmit` passed; focused ESLint passed.
3. `npm run verify` passed: 22 test files, 647 tests; lint reported 137 warnings and 0 errors.
4. `npm run build` passed. Vite/Rollup emitted its existing large-chunk advisory.
5. `npm run test:e2e` passed: 22 Playwright tests.
6. Independent read-only review found no blockers for typed project/command paths. Its additional project-ID and malformed-command hardening findings were fixed and covered by tests.

## Findings & Fixes
- The dry-run is conservative by design. It may block links under root presentation attributes or `<defs><style>`, paths/groups with presentation context, transformed/hidden ancestors, unsupported markup/comments, or grouped passthrough attributes whenever parity cannot be proven.
- Legacy Whiteboard JSON records with an own `__proto__` key are rejected as unsafe; this does not affect SVG attribute maps, which preserve valid XML `__proto__` attributes through null-prototype maps and safe property copying.
- No migration is applied automatically, and the preview reports `persistenceReady: false`. Persisted project migration, hydration changes, and backend reconciliation remain deferred until the Phase 2 persistence work is planned.

## Audit Trail
- 2026-10-27 21:56 UTC: Dated dry-run plan created before source edits; prior adapter commit was verified clean and pushed as `12869ea`.
- 2026-10-27 23:17 UTC: Implementation completed; independent review findings addressed; verification passed (647 unit tests, production build, 22 Playwright tests). Ready to commit and push on `work/logo-forge-implementation`.
