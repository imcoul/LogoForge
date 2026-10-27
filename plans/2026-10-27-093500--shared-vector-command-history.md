---
title: "Shared Vector Command History — First Cross-Editor Slice"
date: 2026-10-27
author: "Ibrahim"
featureId: "p1-history-001"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Shared Vector Command History — First Cross-Editor Slice

## Summary
Added bounded cross-editor history for Whiteboard-created paths and a reversible link action for existing SVG paths. The shared path remains a single SVG node and can be undone/redone from either editor.

## Plan and acceptance
This slice uses the existing lossless SVG `Node`/`SvgDocument` model and stable path IDs without changing the project schema or migrating legacy Whiteboard data. It implements reversible commands for adding a Whiteboard-created path and linking an existing SVG path; both operations use a per-project shared command journal, with applied history reconstructed from persisted markers after reload. Both editors’ undo/redo controls operate on the journal. Mirrored paths remain read-only in legacy Whiteboard/Precision mutation paths and raw XML until edits/deletions are represented as reversible shared commands. Fresh local actions invalidate shared redo, while local snapshot undo/redo preserves valid shared history.

Acceptance criteria achieved: bounded forward/inverse deltas rather than full-document snapshots; no duplicate SVG node for link-existing-path; cross-editor undo/redo and Whiteboard unmount/remount ordering; safe no-ops for stale or ambiguous IDs; protections against snapshot/manual XML/legacy editor paths silently altering shared nodes; reload recovery without a persisted journal schema; and the existing project serialization/cloud persistence path remains in use. Fabric installation/cutover and stored-project migration remain out of scope because the pinned dependency reference and migration decision are unresolved.

## Architecture findings
The app previously kept `sceneGraph` with store snapshot history, `svgSource` with app/local SVG snapshot histories, and `whiteboardSketches` with local Whiteboard snapshot history. The editors did not share a document or undo stack; the existing `Command` union had no executor, inverse/delta history, or cross-editor application path. The Phase 1 cross-editor history gate was unmet. This implementation deliberately starts with two reversible operations rather than migrating every Whiteboard shape or removing legacy snapshot history at once.

## Implementation notes
- Added `src/engine/sharedVectorHistory.ts` with stable-ID add and link commands, precise inverses, safe stale-target consumption, shared-node validation, and reconstruction of applied commands from persisted SVG/sketch markers.
- Added an ephemeral per-project Zustand journal. SVG and Whiteboard markers are sufficient to reconstruct applied history after reload; the journal itself is not persisted and no project-schema migration was added.
- Whiteboard mirrors use `shared-wb-*` IDs and remain protected against legacy local edit/deletion. Precision edits to shared nodes are rejected, Manual XML is disabled while mirrors exist, and both App and Studio legacy logo-snapshot undo paths reject restores that change/remove shared-node signatures.
- Whiteboard local history is rebased around shared additions/removals. On remount, preexisting shared actions are seeded at the local history baseline so a new local shape is undone before older shared actions. The SVG editor invalidates stale local snapshots after external shared-document changes; duplicate Whiteboard mouseup handling is idempotent.
- The SVG-to-Whiteboard action links the existing path and records a reversible shared command. The Whiteboard-to-Precision bridge opens an existing shared path rather than appending duplicate geometry.
- Shared-node integrity signatures include root attributes, raw `<defs>`, the target node’s authored ID and serializable state (including `transformRaw`, `locked`, and `visible`), ancestor context/transform state, node index, and preceding-sibling identities/order. This preserves unrelated path-data edits even when the editor persists a stable ID on that sibling. Deliberate limitation: following siblings are not part of the signature, so reordering only following layers while leaving the target and preceding context unchanged is not detected; including following sibling identities would also block ordinary appended unrelated layers.
- Add-path undo requires an exact matching path node and exactly one unchanged sketch. Existing-path link undo restores/removes the prior node-ID marker exactly and removes temporary shared/provenance attributes, including after history reconstruction.

## Tests
- `src/tests/engine/sharedVectorHistory.test.ts`: stable IDs, delta undo/redo, link-existing-path without duplication, reload reconstruction (including empty journal), malformed/stale targets, reused-ID rectangles, changed path data, missing/duplicate sketches, read-only mirrors, redo-tail invalidation, and full node/root/ancestor/preceding-sibling signature changes.
- `src/tests/engine/sharedVectorHistory.integration.test.tsx`: real two-editor components, cross-editor undo/redo, local history order, the actual Send-back UI, no duplicate geometry, and local-before-shared undo after Whiteboard unmount/remount.
- Existing SVG bridge/serialization, store, security, persistence, and feature integration suites remain green.

## Fabric dependency decision remains unresolved
- Notion D-016 selects Fabric.js, but the Sep 15 handover pins `imcoul/fabric.js#5.3.1` and says a manual fork is required. GitHub reports `imcoul/fabric.js` does not exist.
- The prototype branch instead claims `imcoul/fabricjs#5.3.1`; the audit found no declared Fabric dependency or matching 5.3.1 tag, and the implementation expects an unbootstrapped `window.fabric` global. Do not port it or substitute another package/version without an explicit decision update.
- Official upstream documentation recommends `@fabricjs/browser` for new browser applications and describes `fabric` as a legacy compatibility facade. Official upstream and registry sources report Fabric `7.4.0` under MIT; release notes include a security fix. The scoped browser package’s registry metadata was not successfully extracted in this audit, so do not pin it based only on snippets.
- Current upstream pages differ on Node support (installation docs say Node 18+, repository README says Node 20+); the LogoForge environment is Node 22.

## Source references
- LogoForge current-state reconciliation (25 Oct 2026): https://app.notion.com/p/4047e0fa905a815e8b09d874e05a8086
- LogoForge Phase 1 roadmap and progress log: https://app.notion.com/p/3b57e0fa905a81ea92c1cb043ade4dd1
- LogoForge Fabric integration handover (15 Sep 2026): https://app.notion.com/p/3dc7e0fa905a813eb4c1f49bd45b8e76
- LogoForge architecture and decisions: https://app.notion.com/p/3b57e0fa905a81e1844df2b4755dabe3 and https://app.notion.com/p/3b57e0fa905a81ee9671f0b1b08f413c
- Fabric.js official install guidance: https://fabricjs.com/docs/getting-started/installing/
- Fabric.js official repository and README: https://github.com/fabricjs/fabric.js
- Fabric.js official releases: https://github.com/fabricjs/fabric.js/releases
- Fabric.js license: https://raw.githubusercontent.com/fabricjs/fabric.js/master/LICENSE
- Fabric npm registry metadata: https://registry.npmjs.org/fabric/latest

## Verification
- `npx tsc --noEmit`: passed.
- `npm run verify`: passed; 20 test files and 572 tests passed. Lint completed with 0 errors and 137 warnings.
- Focused shared-history suites: 13 tests passed, including the real Send-back button, empty-journal reconstruction, remount ordering, and marker restoration.
- `npm run build`: passed; Vite reported the repository’s existing >400 kB chunk-size advisory.
- `npm run test:e2e`: passed; 22 Playwright smoke tests.
- Independent read-only review: no blockers; preceding-sibling-only limitation documented above.
- `git diff --check`: passed.

## Findings & fixes
- Review found that legacy Whiteboard edits/deletion could alter only `whiteboardSketches`, and that fresh local edits after a shared undo could leave shared redo available. Shared mirrors are now read-only and fresh local actions truncate shared redo.
- Review found that Precision “Send back to Whiteboard” bypassed redo invalidation and Whiteboard history. It now records a reversible existing-path link, does not duplicate the SVG node, truncates shared redo, and remains undoable after a Whiteboard remount.
- Review found that legacy logo snapshot undo wrote SVG directly and could desynchronize mirrors. Both App and Studio undo fallbacks reject snapshot restores that alter/remove shared nodes; applied shared history is rebuilt after reload from persisted markers.
- Follow-on work should add reversible shared update/delete commands before enabling direct edits to mirrored paths. Fabric cutover remains blocked on choosing a resolvable package/fork reference and migration decision; Open Design was held until this foundation stabilized.

## Audit trail
- 2026-10-27: Plan created before Phase 1 shared-history source changes. P0 clean install, verify, build, and E2E gates had passed on `work/logo-forge-implementation`.
- 2026-10-27: Marked In Progress after confirming editor callbacks, Whiteboard path creation, SVG node-ID behavior, and independent snapshot stacks.
- 2026-10-27: Implemented add-path and existing-path link commands, reload-safe journal reconstruction, snapshot/Whiteboard bridge guards, remount-local ordering, exact inverse safety, and expanded regression coverage. Final review found no blockers; typecheck, verify (572 tests), build, and 22 E2E tests passed.
