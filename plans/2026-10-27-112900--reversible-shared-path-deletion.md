---
title: "Reversible Shared-Path Deletion"
date: 2026-10-27
author: "Ibrahim"
featureId: "p1-history-002"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Reversible Shared-Path Deletion

## Summary
Added a shared-history operation that deletes a mirrored SVG path from Precision together with its Whiteboard sketch. Undo and redo use the shared project journal and preserve the path’s root or nested SVG position.

## Scope and acceptance
The typed `delete-path` command only targets one unambiguous shared SVG path and one matching Whiteboard sketch. Forward deletion checks project identity, node and sketch snapshots, stable markers, path data, exact parent chain/context, and indices before mutating. Undo restores the captured node and sketch at their original parent and order, and safely no-ops if IDs, sketches, or parent context conflict. The Precision layer delete action uses the shared controller for shared paths; ordinary Precision path deletion still uses the legacy path helper. Legacy Whiteboard mutation/delete controls and raw XML remain read-only for shared mirrors, and direct shared geometry/style edits remain disabled until those operations receive their own reversible commands.

No project schema or persistence contract changed. Shared command commits continue through the canonical update/persistence callback. The command journal remains in memory: after reload, a deleted node and sketch are both absent, so the delete inverse cannot be reconstructed and delete undo is unavailable. Existing reload reconstruction remains limited to applied add/link mirrors.

## Source audit
The store’s shared history is a command union with generic cursor actions, so no new store reducer was needed. App and Studio central updates allow the existing `recordLogoHistory: false` shared-command exception. The Precision layer delete handler previously sent every deletion through `pushSvgChange`, which intentionally rejects direct changes to shared-node signatures. The new controller callback is exposed by StudioHandlers/Studio only; Whiteboard shared paths remain read-only.

## Implementation notes
- Added `SharedWhiteboardDeleteCommand` with an exact node snapshot, sketch snapshot, original node/sketch indices, and a parent path whose entries capture ancestor IDs, indices, and serializable context.
- Added safe create/apply/undo functions and controller dispatch for shared deletion. Nested parent resolution validates the same groups and transform/context before removing or restoring the path.
- Wired the Precision layer delete action to the shared command when the target is mirrored; non-shared paths retain ordinary deletion. Undo from Whiteboard and redo from the Precision editor are covered through the real controls.
- The journal truncates redo on a fresh deletion and keeps document serialization in the existing project update path. Whiteboard-side delete, lock, and legacy mutation controls remain disabled for shared mirrors.
- Shared geometry/style edits remain locked pending a separate reversible update-command slice.

## Tests
- Unit coverage verifies root add/delete/undo/redo, existing linked paths nested under groups, exact restoration to the original parent chain, stale parent transform no-ops, changed geometry, duplicate IDs/sketches, and preservation of conflicting content.
- Integration coverage uses the Precision layer delete button, then Whiteboard Undo and Precision Redo; existing add/link/remount history regressions remain green.
- Full repository suites, persistence characterization, and Playwright browser smoke tests remain green.

## Findings & Fixes
- Directly deleting a shared SVG path through the legacy editor would remove only the SVG node or be blocked without updating its Whiteboard mirror. Deletion now records one reversible command that updates both representations atomically.
- Nested groups could change between delete and undo; the command now validates captured parent IDs, indices, and context and no-ops rather than inserting into a different container.
- A stale or ambiguous shared target cannot fall through to ordinary path deletion; the existing shared signature guard still blocks such a fallback.
- Delete undo is intentionally session-only because the journal is ephemeral. Persisting undo for deleted paths would require a separate tombstone/journal persistence decision.

## Verification
- `npx tsc --noEmit`: passed.
- Focused shared-history unit and integration suites: 17 tests passed.
- `npm run verify`: passed; 20 test files and 576 tests passed. Lint reported 0 errors and 137 existing warnings.
- `npm run build`: passed; Vite reported the repository’s existing >400 kB chunk-size advisory.
- `npm run test:e2e`: passed; 22 Playwright smoke tests.
- Independent read-only review: no blockers.
- `git diff --check`: passed.

## Audit trail
- 2026-10-27: Created after publishing shared add/link history foundation (`1ce47b9`); plan marked In Progress after auditing the shared journal and Studio update callback.
- 2026-10-27: Implemented shared delete/undo/redo with nested parent validation and Precision UI wiring. Independent review found no blockers; typecheck, 17 focused tests, full verify (576 tests), build, and 22 browser smoke tests passed. Plan marked Completed & Verified.
