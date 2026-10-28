---
title: "Node-Backed Whiteboard Primitive Resize"
date: 2026-10-28
author: "Ibrahim"
featureId: "p1-document-005-resize"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Node-Backed Whiteboard Primitive Resize

## Summary
Route rectangle and ellipse/circle resize-handle previews and commits through shared `Node` geometry and lossless reverse projection, without changing the persisted Whiteboard schema.

## Context and sequencing
The Phase 1 roadmap's next large milestone is folding Whiteboard into the shared Node model. The preceding bounded slices now render supported saved sketches from Nodes and translate them through the adapter. Rectangle corner and ellipse radius handles still construct `WhiteboardSketch` geometry directly in `WhiteboardCanvas`; this is the next geometry edit seam to move behind the Node adapter. The saved storage boundary remains `whiteboardSketches` for now.

The handle overlays stop event propagation, so their pointer-down path must explicitly reset the same mouse-up idempotency guard used by ordinary SVG gestures; otherwise a prior handled mouse-up can suppress the resize commit.

## Plan
1. Add a pure, allowlisted adapter operation for updating native rectangle (`x/y/width/height`) and ellipse (`cx/cy/rx/ry`) Node geometry, rejecting wrong types, non-finite values, and invalid dimensions without mutating the input.
2. Route rectangle corner and ellipse axis-handle preview geometry through that Node operation and reverse-project into the original sketch, preserving style and legacy-only metadata.
3. Give resize touch overlays stable data attributes and reset gesture idempotency on both mouse and touch handle starts.
4. Add adapter unit tests and real Whiteboard pointer-handle integration tests for geometry, metadata, commit behavior, and safe rejection.

## Acceptance Criteria
- Functional: supported rectangle and ellipse/circle resize handles update their native Node geometry, then project the result back without losing unrelated sketch/style fields.
- Safety: only the appropriate geometry keys are accepted for each primitive; non-finite, negative, too-small, or mismatched geometry updates are rejected with no partial mutation.
- Interaction: a resize gesture commits exactly once even after a previously handled pointer gesture, and the resize overlay can be targeted through a stable data attribute.
- Compatibility: preserve the existing minimum size of 5 canvas units and the current handle layout.
- Persistence: `whiteboardSketches` remains the storage boundary; no schema, `sceneGraph`, SVG, database, or cloud write semantics change.
- Scope: line/path reshaping, import/migration, and removal of `legacyWhiteboardGeometry.ts` remain separate work.

## Implementation Notes
- Expected files: `src/engine/whiteboardNodeAdapter.ts`, `src/components/WhiteboardCanvas.tsx`, `src/tests/engine/whiteboardNodeAdapter.test.ts`, and `src/tests/engine/sharedVectorHistory.integration.test.tsx`.
- Shared-history reconciliation and coverage also touch `src/engine/sharedVectorHistory.ts` and `src/tests/engine/sharedVectorHistory.test.ts`.
- Keep the change focused on native rectangle and ellipse handles; do not rewrite line handles or drawing tools in this slice.
- Use strict validation and reverse projection so unsupported legacy records remain unchanged rather than falling through a partially applied update.

## Tests
- Adapter unit tests: successful rectangle/ellipse geometry updates, unchanged style and arbitrary provenance, numeric-string geometry preservation, wrong-type/unknown-key/non-finite/invalid-dimension rejection, and source immutability.
- Shared-history unit tests: rebase shared mirror updates/additions/removals while retaining local edits.
- UI integration tests: select a Node-rendered rectangle, resize its bottom-right handle, and verify the saved dimensions; resize an ellipse axis handle; prove a handle gesture commits after an already-handled selection gesture.
- UI regression tests: numeric-string handle coordinates are numeric, and concurrent shared edits/removals during resize preserve both the in-flight preview and local undo/redo without requiring another pointer move.

## Verification Steps
1. Run focused adapter and Whiteboard integration suites.
2. Run `npx tsc --noEmit` and lint touched files.
3. Run `npm run verify`, `npm run build`, and `npm run test:e2e`.
4. Audit `git diff --check` and confirm no schema or persistence changes.
5. Mark Completed & Verified only after all checks and independent review pass.

## Findings & Fixes
- Implemented strict `updateWhiteboardSketchGeometry` for exact own-data `rect` and `ellipse` updates. It rejects inherited/accessor/extra-key or malformed updates, non-finite values, and dimensions/radii below 5; reverse projection preserves original numeric-string types and legacy-only metadata without mutating the source.
- Routed rectangle-corner and ellipse-axis resize previews through shared Node geometry. Handle coordinates now coerce saved numeric strings to numbers, and mouse/touch starts reset the duplicate mouse-up guard.
- Fixed a pre-existing release transaction defect: resize previews mutate local state, so comparing the final array to itself skipped persistence/history. The commit now compares against a handle-start snapshot and creates one local undo step.
- Independent review found and prompted fixes for stale shared mirrors on release and for sync replacing active previews. The commit now rebases against the latest store state, local history snapshots follow shared mirror edits/additions/removals, and active Node-backed rect/ellipse geometry is carried onto the latest canonical sketch so release works even without another pointer move.
- Known limits kept out of this slice: line endpoint/curve-handle drags remain on the legacy edit path. A project sync during a line-handle drag can still reset its preview, and numeric-string curved-line props can still concatenate in midpoint math; address these with the separate Node-backed line/path reshape work.

## Audit Trail
- 2026-10-28 23:25 UTC: Dated plan created as Planned before source changes; branch `work/logo-forge-implementation` was clean and synchronized at `5f1f9e7`.
- 2026-10-28 23:26 UTC: Marked In Progress after confirming the resize preview still mutates legacy props directly and resize-handle starts do not reset the duplicate mouse-up guard.
- 2026-10-28 23:52 UTC: Completed implementation and independent review. `npm run verify` passed (22 files, 671 tests; 0 lint errors, 137 existing warnings); `npm run build` passed (existing large-chunk warning); `npm run test:e2e` passed (22 tests); the focused no-extra-move regression passed; TypeScript and `git diff --check` passed. Secret-pattern scan was clean; `.gitignore` already excludes environment files, secret material, credentials, and service-account JSON. No persistence schema or dependency-manifest changes.
- 2026-10-28 23:52 UTC: Independent read-only follow-up review found no blockers. Review findings on stale shared snapshots, numeric-string handle coordinates, and active-preview loss during sync were fixed and covered by regressions. Line-handle limitations remain explicitly deferred as noted above.
