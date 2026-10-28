---
title: "Node-Backed Whiteboard Drag Translation"
date: 2026-10-28
author: "Ibrahim"
featureId: "p1-document-005"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Node-Backed Whiteboard Drag Translation

## Summary
Route Whiteboard movement through the shared Node model and a complete SVG path-data parser, then project the edited Node back into the legacy sketch record without changing persistence. Path and endpoint-line selection now follows the rendered layer's stable Whiteboard ID rather than relying only on the legacy coordinate heuristic.

## Context and sequencing
Phase 1's largest remaining slice is folding `whiteboardSketches` into the shared Node tree. The prior rendering step already sends adapter-convertible saved sketches through `renderNode`, but movement still edited legacy paths with a regex that could corrupt arc flags or valid space-separated coordinates. This bounded geometry operation is an incremental step toward Node-backed Whiteboard editing; project hydration, history ownership, and persisted migration remain separate.

## Plan
1. Add a strict SVG path translator that handles absolute and relative commands, implicit repetitions, exponent notation, arc flags, and comma/whitespace separators. Reject malformed or non-finite input instead of rewriting a partial path.
2. Add a pure adapter operation that converts a supported sketch to a Node, translates `rect`, `ellipse`, `line`, or `path` geometry, and reverse-projects while retaining legacy-only provenance fields, including numeric-string coordinate types.
3. Route selection-drag and supported path-coordinate nudges through the Node-backed operation. Prefer the rendered layer's stable Whiteboard ID for pointer selection. Safely reject failures without mutating the stored sketch.
4. Limit coordinate nudges to strictly parsed linear `M/L/H/V/Z` path data with exact fractional bounds; disable curve/arc/malformed nudges and direct users to canvas drag rather than guessing their bounds.
5. Add path grammar, adapter round-trip, and real Whiteboard interaction regressions.

## Acceptance Criteria
- Functional: dragging a supported rectangle, ellipse, endpoint-only line, or path changes only its geometry and preserves unrelated sketch/style metadata.
- Functional: translated absolute path coordinates move by `(dx, dy)`; relative deltas stay unchanged; arc radii, rotation, and flags are never treated as coordinates.
- Selection: adapter-rendered paths and endpoint-only lines can be selected via their rendered SVG layer, including whitespace-separated path data.
- Safety: malformed/truncated/non-finite path geometry is rejected, displays a message, and leaves the stored sketch unchanged.
- Nudge safety: line-only paths use exact fractional bounds and a same-value edit is a no-op; curves, arcs, and malformed paths cannot be nudged using guessed bounds and retain canvas-drag movement.
- Persistence: `whiteboardSketches` remains the storage boundary; no schema, sceneGraph, SVG, or database write semantics change.
- Compatibility: the editor no longer calls the unsafe legacy `translatePath` regex; adapter-rejected legacy records retain their existing rendering/hit-test fallback.

## Implementation Notes
- Expected files: `src/engine/pathData.ts`, `src/engine/whiteboardNodeAdapter.ts`, `src/components/WhiteboardCanvas.tsx`, `src/tests/engine/pathData.test.ts`, `src/tests/engine/whiteboardNodeAdapter.test.ts`, and `src/tests/engine/sharedVectorHistory.integration.test.tsx`.
- Do not delete `legacyWhiteboardGeometry.ts` in this slice; drawing, selection fallback, and other legacy consumers remain outside scope.
- This is an incremental Node-backed geometry operation, not a claim that the Node tree is now the sole persisted or runtime state.

## Tests
- Path translation unit tests cover absolute/relative commands, H/V, repeated coordinates, curves, arc flags/radii, exponent notation, comma/space separators, zero offsets, and malformed/non-finite inputs.
- Adapter unit tests cover rectangle, ellipse, endpoint-line, and path geometry; provenance/style and numeric-string preservation; unsupported/malformed geometry rejection; and source immutability.
- Whiteboard integration tests exercise a whitespace-separated arc drag, malformed-path rejection after selecting the actual rendered path, endpoint-only line dragging, disabled arc nudges, and exact fractional linear-path nudges.

## Verification Results
- Focused suites: 85 tests passed across path-data, adapter, and Whiteboard integration files.
- `npx tsc --noEmit`: passed.
- `npm run verify`: passed, 22 test files and 665 tests; ESLint reported 0 errors and 137 warnings.
- `npm run build`: passed; Vite emitted the existing large-chunk advisory for a vendor bundle over 400 KB.
- `npm run test:e2e`: passed, 22 Playwright desktop/mobile smoke tests.
- `git diff --check`: passed; persistence/schema audit found no `src/store.ts`, `src/types.ts`, server, package, or lockfile changes.
- Independent read-only review: no blocking issues. The reviewer confirmed arc/whitespace path and endpoint-line selection, malformed-path warning/no-op, exact fractional nudge, and numeric-string preservation. Remaining caveat: adapter-rejected legacy fallback records still use heuristic selection; that fallback is outside this migration slice.

## Findings & Fixes
- Replaced coordinate-pair regex movement with strict, command-aware Node geometry translation; relative deltas remain unchanged and arc parameters are preserved.
- Pointer selection now resolves the rendered `[data-logoforge-whiteboard-id]` layer first, enabling supported paths and endpoint-only lines that the old coordinate heuristic could not select.
- Path-coordinate controls now use exact parsed bounds for line-only paths, support decimals, avoid same-value drift, and disable on curves/arcs/malformed data with canvas-drag guidance.
- Numeric-string geometry properties retain their legacy string type after translation.
- The malformed-path regression now targets an actual rendered path and asserts the safe-rejection notification, so it proves the rejection path executes.

## Audit Trail
- 2026-10-28 23:03 UTC: Dated plan created as Planned before source edits; branch `work/logo-forge-implementation` was clean and synchronized at `fcde284`.
- 2026-10-28 23:03 UTC: Marked In Progress after confirming selection-drag was the remaining coordinate-pair regex path and defining safe Node round-trip behavior.
- 2026-10-28 23:23 UTC: Completed after review-driven selection, nudge, malformed-input, and numeric-string fixes; final verification and browser smoke gates passed.
