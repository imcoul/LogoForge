---
title: "Node-Backed Whiteboard Line Inspector Endpoints"
date: 2026-10-29
author: "Ibrahim"
featureId: "p1-document-009-line-inspector-endpoints"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: "npm run test:e2e — 22 passed (2026-10-29 UTC)"
percySnapshot: ""
telemetrySample: ""
---

# Node-Backed Whiteboard Line Inspector Endpoints

## Summary
Route the four numeric Whiteboard line-inspector endpoint fields through the existing Node-backed line geometry adapter while preserving native, straight, quadratic, and elbow geometry.

## Context and sequencing
Whiteboard line selection and handle reshape already used strict shared-Node geometry, but the numeric line inspector still read legacy props/defaults, synthesized a straight path on each field change, and performed separate props/path updates. That could overwrite curve/elbow geometry, concatenate numeric-string endpoints, or split history. This slice closes only the four endpoint-coordinate controls. Line-style conversion buttons and curve-control fields remain separate; Fabric/OpenDesign/Excalidraw and persisted project migration remain deferred.

## Plan
1. Derive the selected line's supported endpoint values from `readWhiteboardSketchLineGeometry` rather than legacy defaults or regex parsing.
2. Add a field-specific component helper that parses raw numeric input, constructs a strict start/end handle update with `updateWhiteboardSketchLineHandle`, and commits the projected sketch once through `updateSketchesWithHistory`.
3. Route only `x1`, `y1`, `x2`, and `y2` inspector inputs through the helper. Preserve the current geometry kind when editing an endpoint; leave line-style conversion buttons unchanged.
4. Add real Whiteboard integration tests for native endpoint lines and path-backed straight, quadratic, and elbow geometry, including validation, metadata/type preservation, and history.

## Acceptance Criteria
- Functional: valid endpoint edits update supported native lines and exact path-backed `M/L`, `M/Q`, or elbow `M/L/L` forms through Nodes.
- Geometry preservation: changing an endpoint retains the current supported straight/curved/elbow form and quadratic control point; it does not silently reconstruct a straight path.
- Safety: blank/non-finite input, malformed or unsupported path data, mismatched geometry, locked targets, and shared-vector IDs fail closed without partial writes or history changes.
- Compatibility: preserve numeric-string representation for existing legacy endpoint fields, arbitrary metadata, and line styling; add numeric endpoint props when path-backed source data did not contain them.
- History: each accepted endpoint field change creates one Whiteboard history update and can be undone/redone without reverting unrelated fields.
- Persistence: `whiteboardSketches` remains the only write boundary; no `Project`, `sceneGraph`, SVG source, database, cloud-sync, or schema changes.
- Scope: line-style conversion buttons, curve-control handles/fields, line creation, path/boolean tools, arbitrary SVG paths, project migration, and Fabric/OpenDesign/Excalidraw remain separate work.

## Implementation Notes
- Files changed: `src/components/WhiteboardCanvas.tsx`, `src/tests/engine/sharedVectorHistory.integration.test.tsx`, and this plan. The existing adapter APIs in `src/engine/whiteboardNodeAdapter.ts` were reused without contract changes.
- `handleUpdateSelectedLineEndpoint` converts raw input and rejects blank/non-finite values, missing/locked targets, and IDs beginning with `SHARED_WHITEBOARD_SKETCH_PREFIX`. It reads current supported line geometry, maps `x1/y1` to the `start` handle and `x2/y2` to `end`, preserves the other coordinate, calls `updateWhiteboardSketchLineHandle`, and commits once through `updateSketchesWithHistory`.
- Inspector values use `readWhiteboardSketchLineGeometry` so path-backed values come from the actual path geometry rather than legacy defaults. Inputs use `step="any"` and accessible labels. The separate line-style conversion buttons are unchanged.
- The existing adapter preserves native lines, supported straight/quadratic/elbow path forms, curve control points, legacy metadata, and source numeric-string types. Path-backed source data without endpoint props receives numeric endpoint props on edit.

## Tests
- Native numeric-string line integration coverage edits all four endpoint inputs, checks rendered SVG geometry plus style/metadata, rejects a blank field, and verifies one-step undo/redo.
- Path-backed integration coverage edits straight, quadratic, and elbow lines; it checks kind preservation, preserved quadratic controls/elbow bend, metadata, string-vs-number projection behavior, and one-step undo/redo.
- Unsupported cubic path data is left unchanged. Locked and explicitly unlocked `shared-wb-` line records are both exercised through the rendered inspector and remain unchanged.
- The UI test does not dispatch a literal `Infinity` token; the component's finite-value guard is explicit, and adapter unit tests cover non-finite values including Infinity.

## Verification Steps
1. Focused adapter and Whiteboard integration suites passed: 47 tests across 2 files. After adding the shared-ID guard, the focused shared-read-only case passed again; the independent reviewer also ran all 17 integration tests successfully.
2. `npx tsc --noEmit` passed and focused lint reported 0 errors (11 existing unused-import warnings in `WhiteboardCanvas.tsx`).
3. Final post-guard `npm run verify` passed: 0 lint errors / 137 existing warnings and 684 tests across 22 files.
4. Final post-guard `npm run build` passed; the existing Rollup large-chunk advisory remains.
5. Final post-guard `npm run test:e2e` passed: 22 Playwright tests.
6. `git diff --check` passed. Final scope is the component, integration test, and this plan; no package/dependency manifests, `Project`/`WhiteboardSketch` schema, store, migration, or SVG persistence files changed, and no secret patterns were found.
7. Independent read-only review of the current shared-ID guard and test found no blockers. It confirmed the unlocked shared record actually exercises the prefix guard, endpoint mapping/history are correct, and style buttons remain unchanged.

## Findings & Fixes
- The old endpoint inputs independently changed legacy props and synthesized a straight path. The Node-backed handler now preserves the current supported geometry and updates both endpoint coordinates in one history transaction.
- Path-backed endpoint controls previously showed prop/default values rather than actual path coordinates. They now derive values from the strict Node line-geometry reader.
- Shared records are identified by ID prefix as well as the `locked` flag. The helper explicitly blocks `shared-wb-` targets even when `locked` is false, with a dedicated integration regression.
- Blank numeric input previously could become zero through numeric coercion; raw input parsing now rejects blanks before any update. Non-finite rejection is additionally covered by adapter tests.

## Audit Trail
- 2026-10-29 00:35 UTC: Dated plan created as Planned after pushing the primitive inspector geometry slice at `ec1796c`; branch `work/logo-forge-implementation` was clean and synchronized.
- 2026-10-29 00:44 UTC: Endpoint implementation, final post-guard verification/build/Playwright, scope/secret audit, and independent review completed with no blockers. Status changed to Completed & Verified.
