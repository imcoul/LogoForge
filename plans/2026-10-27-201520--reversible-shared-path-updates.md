---
title: "Reversible Shared Path Updates"
date: 2026-10-27
author: "Ibrahim"
featureId: "p1-history-003"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: "2026-10-27: Playwright 22 passed"
percySnapshot: ""
telemetrySample: ""
---

# Reversible Shared Path Updates

## Summary

Extend the shared command journal with reversible geometry and basic-presentation updates for one shared SVG path, keeping its legacy Whiteboard mirror synchronized. The slice also hardens shared-history collaboration against stale full-project snapshots, remote sibling reordering, and persistence rejection.

## Plan and outcome

- Added a typed `update-path` command containing exact before/after SVG node and Whiteboard sketch snapshots plus parent/index context.
- Allowed only `d`, `stroke`, `fill`, and `strokeWidth` changes to one unique shared path. Ambiguous, stale, multi-path, root/document, changed-parent, and unsupported changes are rejected safely.
- Routed Precision geometry edits and translation through shared commands, committing a drag once at pointer-up rather than recording preview frames.
- Added an explicit “Apply style to selected path” action for existing paths.
- Kept unrelated/unshared SVG editing on its existing local-history path; shared mirrors remain read-only in the legacy Whiteboard layer and raw XML.
- Added per-project mutation serialization and stale-baseline rebasing so rapid updates preserve independent geometry/style changes and unrelated SVG siblings/defs.
- App and Studio now merge locally applied and in-flight shared deltas into incoming full-project collaboration snapshots; undone journal tails are reapplied as inverses. When a same-path remote conflict prevents replay, the remote state wins and no stale command is recorded.
- Update/delete replay uses unique stable path/sketch IDs with unchanged parent identity, rather than relying on obsolete sibling indices. If persistence rejects after an optimistic local mutation, the exact shared delta is rolled back before the error is surfaced.
- When Precision rejects a shared update, its preview, parsed path, selected handles, and local snapshots are restored from the latest stored project state.
- No persisted project schema change was made.

## Source audit

- The canonical Phase 1 shared-history plan calls for reversible shared update/delete commands before enabling shared-path edits; shared add/link and reversible delete slices were already published.
- `SVGPathEditor.pushSvgChange` guards shared paths. Geometry edits use stable-ID path updates; coordinate/translation handlers commit after their gesture. Existing color controls only set drawing defaults, so this slice added a separate apply-selected-style action.
- Shared commands use exact node/sketch snapshots and stable IDs. The update command changes only the allowed path fields and verifies document/parent context.

## Implementation notes

- Main files: `src/types.ts`, `src/engine/sharedVectorHistory.ts`, `src/components/SVGPathEditor.tsx`, `src/views/StudioHandlers.ts`, `src/views/Studio.tsx`, `src/App.tsx`, and focused unit/component tests.
- The shared journal remains ephemeral. Current add/link state can be reconstructed from persisted markers, but update history and deletion tombstones are not durable across reload. Update/delete undo after reload remains a separate persistence/tombstone follow-up.
- Shared Whiteboard-side geometry/style editing stays disabled; Precision updates atomically synchronize the Whiteboard mirror.

## Verification

- Focused shared-history unit and two-editor integration suites: 28 passed.
- `npm run verify`: passed; TypeScript clean, lint 0 errors (137 warnings), 20 test files / 587 tests passed.
- `npm run build`: passed; Vite emitted its existing warning for chunks over 400 kB.
- `npm run test:e2e`: passed; 22 Playwright desktop/mobile smoke tests.
- Independent read-only review of collaboration merge, stable-index replay, and persistence rollback: no remaining blockers.
- `git diff --check`: passed.

## Audit trail

- 2026-10-27: Created as Planned before source changes.
- 2026-10-27: Marked In Progress after auditing the canonical Phase 1 follow-on, stable-ID mutators, shared-signature guard, and pointer gesture commit flow.
- 2026-10-27: Completed geometry/style commands, cross-editor UI wiring, queued/rebased updates, remote snapshot reconciliation, persistence rollback, and Precision latest-state restoration; all verification gates passed. Reload durability of update/delete history remains explicitly deferred.
