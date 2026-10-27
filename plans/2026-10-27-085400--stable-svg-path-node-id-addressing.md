---
title: "Stable-ID SVG Path Editing"
date: 2026-10-27
author: "Ibrahim"
featureId: "engine-002"
status: "In Progress"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: ""
percySnapshot: ""
telemetrySample: ""
---

# Stable-ID SVG Path Editing

## Summary
Move SVG path selection and mutation from document-order indexes to persistent editor node IDs while preserving the SVG's own IDs and unrecognized attributes.

## Plan
- Add path lookup and mutation operations keyed by a stable editor node ID, including paths nested in groups.
- Persist generated editor IDs in an app-owned `data-logoforge-node-id` SVG attribute on the first path mutation; preserve existing SVG `id` values and do not conflate path-command anchor indexes with document-node IDs.
- Migrate SVGPathEditor selection and all path data/style/delete callbacks to stable IDs. Use list positions only for visual ordering and proximity hit-testing.
- Ensure missing or ambiguous IDs do not silently fall through to another path, then remove the ordinal-addressing mutation helpers.

### Acceptance criteria
- Once an editor node ID is persisted, path selection and edits still target that same path after other paths are inserted, removed, or reordered.
- Paths nested in groups can be selected and edited by ID without modifying a sibling or removing their parent group.
- Path data, presentation changes, and deletion preserve unrelated nodes, authored SVG IDs, and unknown SVG attributes.
- Missing or ambiguous IDs and unparseable SVG leave the source unchanged and do not redirect edits by index.
- Existing editor behavior and the SVG round-trip corpus remain covered by tests.

## Implementation notes
- Files changed: `src/engine/pathEditorBridge.ts`, `src/engine/svgIo.ts`, `src/components/SVGPathEditor.tsx`, and `src/tests/engine/pathEditorBridge.test.ts`.
- The private `data-logoforge-node-id` attribute is unknown SVG metadata and is retained by the existing lossless parser/serializer. It does not replace or alter an authored SVG `id`.
- `svgIo` tracks authored-versus-generated ID provenance transiently, so authored IDs like `n0` remain intact without changing the serialized `Node` schema.
- Duplicate authored IDs remain displayable but are rejected by mutators as ambiguous; the source is returned unchanged.
- This slice does not alter project persistence, database selection, Fabric.js dependency loading, or undo behavior.

## Tests and verification
- Focused path bridge tests: 35 passed.
- Full unit suite: 559 passed across 18 files.
- Production build: passed.
- Repository ESLint: passed with 0 errors and 138 warnings.
- Typecheck/`npm run verify`: blocked by four pre-existing errors in `src/components/ErrorBoundary.tsx` (`setState`) and `src/views/StudioHandlers.ts` (`React` namespace at lines 581, 639, 717); the same diagnostics were present before this slice and remain unchanged.
- Playwright mobile/desktop smoke tests could not launch because the sandbox lacks the installed Chromium executable. No browser-based result is claimed.
- `npm ci` fails because the checked-in lockfile is incomplete for the manifest. Tests/build used `npm install --no-save --package-lock=false --legacy-peer-deps`; no dependency manifest or lockfile was changed.
- Do not claim full Phase 1 completion: verified Fabric integration, shared command-based undo, and stored-project migration remain separate work.

## Findings & fixes
- Replaced ordinal path mutation helpers with stable-ID replace/style/delete APIs, and migrated SVGPathEditor selection, coordinate edits, cleanup, and deletion to node IDs.
- Fallback identities are persisted on first path mutation; sibling insertion/reordering after persistence is covered by regression tests.
- Added safe no-op behavior for missing/ambiguous targets and preserved authored IDs that resemble generated positional IDs.

## Audit trail
- 2026-10-27: Plan created before source changes on `claude/design-tool-repos-eval-dasaa0` at `dccf9f53cba1057b86917842a6e304861221c5a7`.
- 2026-10-27: Status moved to In Progress after confirming ordinal path addressing was unfinished Phase 1 work and choosing a durable SVG metadata marker.
- 2026-10-27: Implemented the stable-ID slice on local branch `work/logo-forge-implementation`; code review identified and the patch fixed authored `n0` ID loss and ambiguous duplicate-ID mutation.
- 2026-10-27: Focused tests, full unit suite, build, lint, and whitespace check passed; typecheck and E2E remain blocked by the baseline issues recorded above.
