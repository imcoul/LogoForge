---
title: "Node-Backed Whiteboard Primitive Inspector Geometry"
date: 2026-10-29
author: "Ibrahim"
featureId: "p1-document-008-primitive-inspector"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: "npm run test:e2e — 22 passed (2026-10-29 UTC)"
percySnapshot: ""
telemetrySample: ""
---

# Node-Backed Whiteboard Primitive Inspector Geometry

## Summary
Route rectangle bounds and ellipse/circle center/radius numeric inspector edits through the existing strict shared-Node geometry adapter, without changing the legacy persistence boundary.

## Context and sequencing
Supported Whiteboard rendering, pointer translation, pointer resize, and line-handle reshape now pass through shared Nodes and lossless projection. The numeric primitive inspector was a separate remaining entry point that shallow-merged legacy `props` directly. This slice closes only that primitive geometry gap. Fabric/OpenDesign/Excalidraw and persisted project migration remain deferred.

## Plan
1. Add a focused component helper that reads the selected rectangle or ellipse through `whiteboardSketchToNode`, constructs a complete finite `WhiteboardSketchGeometryUpdate`, calls `updateWhiteboardSketchGeometry`, and commits the projected sketch through the existing `updateSketchesWithHistory` path.
2. Route only rectangle `x`, `y`, `width`, and `height` inputs and ellipse/circle `cx`, `cy`, `rx`, and `ry` inputs through that helper.
3. Preserve lock behavior, minimum geometry of 5, history semantics, metadata, styling, and numeric-string representation. Rejected input must not mutate the sketch or create history.
4. Add real Whiteboard integration coverage for both primitive input groups, invalid/minimum input, unchanged corner-radius behavior, lock protection, and undo/redo.

## Acceptance Criteria
- Functional: rectangle bounds and ellipse/circle center/radius inspector inputs update through shared Node geometry and render the committed values.
- Safety: blank/non-finite values and dimensions/radii below 5 leave the sketch and history unchanged; locked sketches cannot be edited.
- Compatibility: preserve arbitrary legacy metadata, presentation style, and numeric-string types for fields originally stored as strings. The rectangle corner-radius (`rx`) slider remains outside this geometry adapter slice and behaves as before.
- History: each accepted field edit is one normal Whiteboard history update and remains undoable/redoable.
- Persistence: `whiteboardSketches` remains the only write boundary; no `Project`, `sceneGraph`, SVG source, database, cloud-sync, or schema changes.
- Scope: general fill/stroke/opacity/dash styling, rectangle corner radius, line inspector, path/boolean tools, creation/duplication, migration application, and Fabric/OpenDesign/Excalidraw integration remain separate work.

## Implementation Notes
- Files changed: `src/components/WhiteboardCanvas.tsx`, `src/tests/engine/sharedVectorHistory.integration.test.tsx`, and this plan. The adapter contract in `src/engine/whiteboardNodeAdapter.ts` was reused without modification.
- `handleUpdateSelectedPrimitiveGeometry` converts the current selected sketch through `whiteboardSketchToNode`, reads the complete current Node geometry, replaces exactly one allowed field, calls `updateWhiteboardSketchGeometry`, and uses `updateSketchesWithHistory` for persistence/history. It rejects blank and non-finite raw values, malformed source geometry, mismatched fields/types, and locked targets.
- The existing adapter enforces finite geometry and minimum width/height/radius values of 5, and its reverse projection preserves metadata and the original numeric-string representation. Numeric controls now have accessible labels and the width/height/radius fields advertise the minimum.
- Rectangle corner radius still uses the existing `handleUpdateSelectedProps` path and is not included in Node geometry updates. Shared mirror rebasing and the project persistence contract are unchanged.

## Tests
- Adapter coverage already verifies non-finite geometry rejection and the minimum-size contract.
- Whiteboard integration coverage selects and edits each rectangle bounds field and each ellipse center/radius field from numeric-string legacy data. It checks the rendered SVG, preserved metadata/style/custom props, numeric-string values, invalid blank/too-small inputs, locked-target rejection, and the unchanged rectangle corner-radius slider.
- Undo/redo assertions prove each accepted field edit is a discrete history step: undoing rectangle height keeps the prior width edit; undoing ellipse `ry` keeps the prior `rx` edit.

## Verification Steps
1. Focused adapter and Whiteboard integration suites passed: 45 tests across 2 files.
2. `npm run verify` passed: TypeScript check, lint with 0 errors and 137 existing warnings, and 682 tests across 22 files.
3. `npm run build` passed; the existing Rollup large-chunk advisory remains.
4. `npm run test:e2e` passed: 22 Playwright tests.
5. `git diff --check` passed. Final scope is the component, integration test, and this plan; no package/dependency manifests, `Project`/`WhiteboardSketch` schema, store, migration, or SVG persistence files changed, and no secret patterns were found.
6. Independent read-only review found no implementation blockers. It noted no UI-level `Infinity` event simulation or explicit concurrent/stale-geometry regression; the adapter unit tests cover non-finite geometry, the UI helper rejects non-finite raw values, and the helper constructs full geometry from the current selected Node.

## Findings & Fixes
- The existing number inputs used `Number(value)`, which turns blank input into zero. The Node-backed handler now parses raw strings and fails closed for blanks before they can become unintended coordinates.
- The inspector previously had no accessible names for its numeric fields. Stable `aria-label`s were added to these fields and the separate corner-radius slider to support accessible interaction and deterministic tests.
- All eight supported numeric geometry controls now use the strict Node operation. Locked targets do not update or create history; the rectangle corner-radius slider remains on the existing style/property path.

## Audit Trail
- 2026-10-29 00:23 UTC: Dated plan created as Planned after pushing the Node-backed line-handle slice at `88bd442`; branch `work/logo-forge-implementation` was clean and synchronized.
- 2026-10-29 00:33 UTC: Implementation, full verification, build, Playwright, scope/secret audit, and independent review completed with no blockers. Status changed to Completed & Verified.
