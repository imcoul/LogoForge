---
title: "Remove Residual Editable-Path Ordinals"
date: 2026-10-27
author: "Ibrahim"
featureId: "p1-document-003"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: "2026-10-27: Playwright 22 passed"
percySnapshot: ""
telemetrySample: ""
---

# Remove Residual Editable-Path Ordinals

## Summary
Remove the unused ordinal `index` property from the editor's `EditablePath` contract so UI callers receive stable path identity without exposing a positional mutation hint.

## Context and sequencing
The canonical Phase 1 roadmap calls for the precision editor to address paths by `nodeId`, then remove the bridge once the live document model no longer needs its SVG import/export seam. The editor already selects and mutates by `nodeId`; repository-wide source audit found no editor consumer of `EditablePath.index`, while the bridge still returned it and tests asserted it. This slice completes the public stable-ID contract without deleting the bridge prematurely or changing how projects are stored.

## Plan and outcome
1. Removed `index` from `EditablePath` and the objects returned by `listEditablePaths`.
2. Kept document-order enumeration and internal unique-ID lookup behavior unchanged; ambiguous duplicate source identities remain non-editable.
3. Updated bridge tests to assert stable IDs, document order, and absence of the ordinal field.
4. Ran focused tests, repository verification, production build, browser smoke tests, and final diff audit.

## Acceptance Criteria
- Functional: `EditablePath` exposes `nodeId` and path/presentation data but no ordinal `index` — verified by type and regression test.
- Functional: list ordering and generated/authored node identities do not change.
- Safety: all mutations continue to target stable IDs; duplicate/ambiguous IDs remain safe no-ops.
- Persistence: no project schema or stored-project data changes.
- Scope: retained `pathEditorBridge.ts` as the SVG serializer seam; deletion of that module waits for the broader single-node-model integration.

## Implementation Notes
- Changed `src/engine/pathEditorBridge.ts` and `src/tests/engine/pathEditorBridge.test.ts`.
- The bridge still uses parsed array positions internally to pair path nodes with their stable IDs and preserve document order; no ordinal field is exposed to callers or used as a mutation target.

## Tests
- Focused path bridge suite: 35 tests passed.
- Full suite: 22 test files and 647 tests passed.
- Regression verifies returned path records have no `index` property and retain deterministic stable IDs.

## Verification
- `npx tsc --noEmit`: passed.
- Focused ESLint on changed files: passed.
- `npm run verify`: passed; lint reported 137 warnings and 0 errors.
- `npm run build`: passed; Vite emitted the existing large-chunk advisory.
- `npm run test:e2e`: passed; 22 Playwright desktop/mobile tests.
- `git diff --check`: passed.

## Findings & Fixes
- No remaining blockers. `pathEditorBridge.ts` remains because the application still stores/imports SVG strings; removing the bridge is deferred until the larger live Node-tree migration.

## Audit Trail
- 2026-10-27 23:20 UTC: Dated plan created as Planned before source edits; migration preview commit `9bda0f4` is pushed and the work branch is clean.
- 2026-10-27 23:20 UTC: Marked In Progress after confirming no editor source consumes the ordinal.
- 2026-10-27 23:21–23:23 UTC: Removed the public index field; focused bridge tests, TypeScript, focused ESLint, full verification (647 tests), production build, 22 Playwright tests, and final diff check all passed. Ready for commit/push.
