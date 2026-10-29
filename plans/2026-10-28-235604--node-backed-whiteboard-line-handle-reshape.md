---
title: "Node-Backed Whiteboard Line Handle Reshape"
date: 2026-10-28
author: "Ibrahim"
featureId: "p1-document-006-line-reshape"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: "npm run test:e2e — 22 passed (2026-10-29 UTC)"
percySnapshot: ""
telemetrySample: ""
---

# Node-Backed Whiteboard Line Handle Reshape

## Summary
Route supported Whiteboard line endpoint and quadratic-control handle geometry through shared Nodes and lossless reverse projection, preserving line semantics and the `whiteboardSketches` persistence boundary.

## Context and sequencing
Phase 1 remains focused on one shared document model. Rendering, translation, and primitive resizing already route supported Whiteboard records through Nodes. This slice replaces the remaining direct line-handle geometry calculation and mutation for supported line forms. Fabric/OpenDesign/Excalidraw integration remains deferred.

## Plan
1. Add a pure adapter operation that reads and updates supported legacy line representations through their shared Node form: native endpoint-only `line` Nodes and path-backed straight `M/L`, quadratic `M/Q`, or horizontal-then-vertical elbow `M/L/L` geometry. Reuse strict path parsing and fail closed on malformed or unsupported commands.
2. Preserve arbitrary legacy metadata, provenance, and existing numeric-string geometry types when reverse-projecting line edits.
3. Route line handle coordinate derivation and start/end/curve previews through the Node adapter. Use the actual quadratic control point from valid path geometry rather than guessing from endpoint arithmetic.
4. Rebase active previews against the latest same-project sketch set; cancel safely if the active sketch is removed or the project changes. Preserve local/shared history ordering and commit one undoable step on successful release.
5. Add adapter unit and real Whiteboard interaction regressions for native and path-backed line forms, malformed inputs, numeric strings, concurrent synchronization, deletion, project switching, and undo/redo.

## Acceptance Criteria
- Functional: endpoint-only lines and supported straight, quadratic, and elbow paths update through shared Node geometry; the curve handle is shown only for valid quadratic geometry.
- Safety: accept only documented line forms and exact geometry updates; reject malformed paths, unsupported sequences, mismatched types, and non-finite coordinates without partial mutation.
- Compatibility: preserve handle placement, line-style semantics, colors, widths, and unrelated legacy metadata. An inferred elbow writes `props.lineStyle = 'elbow'` on edit because the existing line-style inspector uses that field to show the active mode; this is covered by a unit test.
- Numeric safety: use finite numeric coordinates even when persisted props are strings; preserve string representation for geometry fields that existed as strings.
- Interaction: same-project updates retain the active preview and release commits once; deleting the active target or switching projects cancels the drag without saving a stale preview or allowing local undo to resurrect a removed target. Successful edits remain undoable/redoable.
- Persistence: `whiteboardSketches` remains the storage boundary; no schema, `sceneGraph`, SVG document, database, or cloud-write semantics change.
- Scope: arbitrary path editing, line drawing/tool changes, direct line-style inspector mutations, migration application, and Fabric/OpenDesign/Excalidraw integration remain separate work.

## Implementation Notes
- Files changed: `src/engine/whiteboardNodeAdapter.ts`, `src/components/WhiteboardCanvas.tsx`, `src/tests/engine/whiteboardNodeAdapter.test.ts`, and `src/tests/engine/sharedVectorHistory.integration.test.tsx`.
- `readWhiteboardSketchLineGeometry` recognizes only native endpoint lines, exact absolute `M/L`, `M/Q`, and horizontal-then-vertical `M/L/L` elbow path shapes. `updateWhiteboardSketchLineHandle` accepts exact own-data `{handleId, x, y}` updates, rejects unsafe or malformed inputs, applies geometry through Nodes, and reverse-projects metadata/provenance.
- Path serialization uses the repository's canonical serializer. Geometry is equivalent even where separators/whitespace differ from the original path string.
- The legacy inspector's elbow selected state depends on `props.lineStyle`; when an elbow is inferred from its path and that field was missing, the adapter materializes the semantic value on edit. Existing explicit line-style values remain preserved.
- Same-project sync carries only the active handle's preview coordinate onto the latest version of that line. If the target disappears, it cancels the active transaction and removes the non-shared target from local history snapshots. A project-ID transition clears all active-handle refs/state before installing the new project's sketches.
- Existing direct line-style inspector edits and other ad-hoc line/path consumers remain legacy paths outside this bounded slice.

## Tests
- Adapter coverage: native endpoint start/end; straight path; quadratic start/end/control; elbow start/end; inferred elbow semantics; numeric-string geometry; metadata/provenance preservation; source immutability; malformed/unsupported/mismatched geometry; non-finite, extra-key, and accessor rejection.
- Whiteboard integration coverage: Node-rendered straight, quadratic, and elbow handles; numeric-safe coordinates; local preview before release; persistence and local undo/redo; preview survival through an unrelated shared edit and immediate release; cancellation on active-target removal without persistence/history resurrection; and same-ID project-switch cancellation.

## Verification Steps
1. Focused adapter and integration suites passed: 30 adapter tests and 14 shared-history/Whiteboard integration tests.
2. `npm run verify` passed: TypeScript check, lint with 0 errors and 137 existing warnings, and 681 tests across 22 files.
3. `npm run build` passed; existing Rollup large-chunk advisory remains.
4. `npm run test:e2e` passed: 22 Playwright tests.
5. `git diff --check` passed. Final scope was the four files above plus this plan; no package/dependency manifests, schema/type/store files, or secret patterns were changed/found.
6. Independent read-only reviews found no blockers. Review gaps for handle coverage, active-target removal, and project switching were addressed and retested. The remaining non-blocking observation is that `selectedSketchId` is not reset on project change, so a same-ID sketch may remain visually selected; active drag state is cleared and no stale commit occurs.

## Findings & Fixes
- During handle-drag testing, project sync removing the active local line was reproduced to call persistence on release and create an undoable removal diff. The active transaction is now canceled and the deleted local target is filtered out of history snapshots.
- Independent review identified a same-ID project-switch stale-handle risk. The project transition branch now clears active refs/state before loading the next project's sketches; a regression proves release leaves both projects unchanged.
- Endpoint/control handle combinations and inferred elbow inspector semantics received direct unit coverage. All review findings are resolved; only the documented non-blocking visual selection carry-over remains.

## Audit Trail
- 2026-10-28 23:56 UTC: Dated plan created as Planned after pushing the rectangle/ellipse resize slice at `189443d`; branch `work/logo-forge-implementation` was clean and synchronized.
- 2026-10-29 00:19 UTC: Implementation completed; full verification, build, Playwright, scope/secret audit, and independent review passed. Status changed to Completed & Verified.
