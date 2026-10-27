---
title: "Whiteboard Sketch-to-Node Migration Adapter"
date: 2026-10-27
author: "Ibrahim"
featureId: "p1-document-001"
status: "Completed & Verified"
schemaVersion: 3
relatedPR: ""
storybook: ""
e2eRun: "npm run test:e2e — 22 passed"
percySnapshot: ""
telemetrySample: ""
---

# Whiteboard Sketch-to-Node Migration Adapter

## Summary
Added a pure, lossless adapter between legacy `WhiteboardSketch` records and the shared `Node` model as the first bounded step toward folding Whiteboard artwork into one document tree.

## Context and sequencing
The current LogoForge model still stores artwork in `sceneGraph`, `svgSource`, and `whiteboardSketches`. The committed shared path commands improve cross-editor history but do not remove this duplication. The canonical repo roadmap puts the Whiteboard fold before deleting `legacyWhiteboardGeometry.ts`; the 25 Oct Notion reconciliation confirms document/engine integrity precedes persistence, mobile expansion, and broader integrations.

Fabric.js is D-016 but the Notion handover requires the `imcoul/fabric.js` fork, which GitHub did not find on 2026-10-27. This slice therefore has no Fabric dependency and makes no external repository changes. Excalidraw (D-018) remains deferred post-Phase 1. The adapter is a safe code-only prerequisite while the fork is unresolved.

## Plan
1. Add a pure adapter for legacy path, rectangle, ellipse-like circle, and line sketches to corresponding supported `Node` forms.
2. Preserve stable IDs, names, geometry, fill/stroke, width, opacity, dash, lock, mask, and unknown legacy sketch fields. Keep an opaque cloned legacy record with the migrated node so rollback/reconstruction can reproduce the original record exactly while the node is unchanged.
3. Add a reverse projection that restores the exact saved record when the Node is unchanged, merges supported Node edits into the legacy record without discarding legacy-only data, and offers a documented best-effort projection for ordinary supported SVG primitives.
4. Reject malformed/unsupported input and ambiguous or unrepresentable Node state rather than silently dropping it. Allow callers to exclude already-present node IDs to prevent duplicate shared mirrors.
5. Keep this initial slice pure: no project hydration, persistence, CanvasRenderer, or Whiteboard UI wiring. Those changes require a separate migration plan and parity decision.

## Acceptance Criteria
- Functional: conversion is deterministic, non-mutating, and covers the four legacy shape kinds with stable IDs and complete presentation metadata, including valid zero/empty values.
- Functional: reverse projection exactly reproduces all original fields, including unknown fields, when a migrated node has not changed; supported edits update only the fields that changed and preserve legacy-only data.
- Functional: malformed/unsupported sketches and unrepresentable or ambiguous Node state produce an explicit rejection; existing node IDs can be excluded from the batch projection.
- Persistence: no storage or cloud write is introduced; the adapter does not change project payloads or database schemas.
- Telemetry: no telemetry events are emitted in this pure conversion slice; the repository currently has no established feature-event implementation.

## Implementation Notes
- Files changed: `src/engine/whiteboardNodeAdapter.ts`, `src/tests/engine/whiteboardNodeAdapter.test.ts`, and this plan.
- Migrated Nodes carry an opaque `legacyWhiteboardSource` sidecar in project data. The sidecar is intentionally not emitted by `serializeSvg`; the converter does not change SVG/project persistence in this slice.
- SVG presentation attributes supported by the existing serializer are used for fill opacity, stroke dash, and mask references. Mask-specific legacy metadata remains available in provenance.
- `legacyWhiteboardGeometry.ts` remains unchanged; known behavior is left to its owning migration.

## Tests
- Unit: path, rectangle, ellipse-like circle, curved/path-backed line, and endpoint-only line conversion.
- Unit: exact unchanged round-trip including unknown fields, fill opacity, stroke dash, mask metadata, and nested props; field-aware edits preserve source-only metadata and optional/falsy fields.
- Unit: deterministic/non-mutating output, object-key order independence, existing/shared-ID exclusion, duplicate identities, malformed and unsupported rejection, strict ambiguous geometry/attribute handling, numeric SVG strings, and fallback node-to-sketch projection.
- SVG boundary: serialized rectangles, ellipses, endpoint lines, paths, and ordinary SVG circles reverse-project correctly; migration sidecar does not leak into SVG markup.

## Verification Steps and Results
1. Focused adapter suite: `npx vitest run src/tests/engine/whiteboardNodeAdapter.test.ts` — 16 tests passed.
2. TypeScript: `npx tsc --noEmit` — passed.
3. Focused ESLint: `npx eslint src/engine/whiteboardNodeAdapter.ts src/tests/engine/whiteboardNodeAdapter.test.ts` — passed.
4. Full gate: `npm run verify` — 21 test files and 603 tests passed; typecheck and lint passed. Existing unrelated React `act(...)` warnings were emitted by feature integration tests.
5. Production: `npm run build` — passed. Vite reported the existing large vendor chunk warning (Firebase vendor bundle is above the 400 kB threshold); no build failure.
6. Browser smoke: `npm run test:e2e` — 22 passed across desktop/mobile projects.
7. Independent review: review findings on string-valued SVG geometry, complete Node-state comparison, provenance merging, ambiguity rejection, circles, and falsy-value preservation were addressed; no blocker remained.

## Findings & Fixes
- Preserved zero and empty style values in forward conversion using nullish defaults, with explicit assertions for `strokeWidth: 0`, empty color/fill/dash, and `fillOpacity: 0`; absent values receive explicit defaults.
- Accepted finite numeric strings from parsed SVG attributes, added native SVG `<circle>` fallback, and made Node comparison canonical/key-order independent while including visibility, transforms, metadata, children, and other enumerable state.
- Made reverse edits field-aware so unrelated changes do not materialize defaults or add a synthetic path to endpoint-only line records. Supported edits preserve unknown legacy fields, custom props, mask type, and curved-line identity.
- Rejected conflicting path representations, nonuniform rectangle corner radii, invalid opacity/mask/stroke-width values, hidden/transformed/metadata-bearing nodes, and children rather than silently losing unsupported state.
- No database, project schema, or UI behavior was changed. End-to-end project migration remains a later slice.

## Audit Trail
- 2026-10-27 21:23 UTC: Dated plan created and marked In Progress before source edits, after confirming the D-016 Fabric fork was unavailable.
- 2026-10-27 21:49 UTC: Marked Completed & Verified after focused/full tests, typecheck, lint, build, Playwright smoke, and independent review; migration UI/persistence wiring remains intentionally deferred.
