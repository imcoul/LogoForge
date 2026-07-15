# GitHub Issue Templates: Top 6 Implementation Tickets

This document aggregates the official GitHub Issue Templates for the top six prioritized engineering tickets on Forgel's vector and whiteboard refinement roadmap.

---

## Ticket 1: Canonical Schema and Store History Restructuring
*   **Title:** `[FEAT] Implement Canonical Node Schema & Centralized SceneGraph History Engine`
*   **Labels:** `architecture`, `critical`, `milestone-1`

### Description
Replace the simple whiteboard state in `src/store.ts` with the robust, hierarchical `sceneGraph: Node[]` model. Establish `updateSceneGraph` as the centralized history-aware state method to automatically capture canvas additions, shape style updates, movements, and deletions, fixing the broken whiteboard undo/redo functionality.

### Technical Plan
1.  Verify the `Node` interface in `src/types.ts`.
2.  Define `updateSceneGraph` in `src/store.ts` to manage slices of `sceneHistory` and increment/decrement pointers.
3.  Replace raw calls to `updateProject` with `updateSceneGraph` inside `WhiteboardCanvas.tsx`.

### Acceptance Criteria
- [ ] Whiteboard undo and redo buttons trigger changes on the board.
- [ ] Freehand paths, circles, and rectangles are correctly added to the same history stream.
- [ ] App compiles without TypeScript errors.

---

## Ticket 2: High-Performance Vector Math Worker Integration
*   **Title:** `[PERF] Offload Path Simplification and Rasterization to Web Workers`
*   **Labels:** `performance`, `worker`, `milestone-1`

### Description
Offload intensive mathematical vector processes—such as Ramer-Douglas-Peucker path simplification and large canvas export rasterizations—from the main browser thread to background Web Workers (`pathWorker.ts` and `renderWorker.ts`) to maintain 60fps interaction on mobile devices.

### Technical Plan
1.  Create `src/workers/pathWorker.ts` containing the Douglas-Peucker point filtering math.
2.  In `WhiteboardCanvas.tsx`, instantiate the worker and call it asynchronously on mouseUp.
3.  Provide graceful fallback to main-thread processing if Web Workers are unavailable in the browser environment.

### Acceptance Criteria
- [ ] Long freehand drawings are simplified in the background without UI stutter.
- [ ] Frame rate on mid-to-low-end devices remains above 45fps during drawing.

---

## Ticket 3: Raster-to-Vector (R2V) Pipeline with Provenance Tracking
*   **Title:** `[FEAT] Implement Raster-to-Vector (R2V) Image Tracing & Metadata Provenance`
*   **Labels:** `feature`, `vector`, `ai-refinement`

### Description
Build a Raster-to-Vector (R2V) processing utility that reads raster images (uploaded files) and traces them into structured, editable vector `<path d="..." />` nodes. Each traced node must attach audit metadata documenting original image sources, tracing parameters, and accuracy levels.

### Technical Plan
1.  Implement a path tracing function in `src/utils/vectorizer.ts`.
2.  Store origin links (`meta.provenance.tracedFrom`) and trace metrics inside the traced Node structure.
3.  Implement a Preview Modal displaying three visual quality simplification levels (low, medium, high) before writing nodes to the active canvas.

### Acceptance Criteria
- [ ] Users can trigger vectorization on uploaded PNG images.
- [ ] The generated vector path displays metadata provenance on selection.

---

## Ticket 4: Mobile Precision UX Overlay Kit (Loupe, Nudges, Chords)
*   **Title:** `[UX] Implement Mobile Precision UX Overlay (Magnifier Loupe, Numeric Nudges, Chords)`
*   **Labels:** `ux`, `mobile-first`, `milestone-2`

### Description
Build an advanced mobile-focused Precision UX Kit for vector nodes. This adds touch-friendly numeric nudge input panels, a magnifier loupe floating above active touch coordinates, and multitouch gesture chords (such as double-finger tap for undo).

### Technical Plan
1.  Create a `<PrecisionOverlay />` component inside `src/components/`.
2.  Implement a CSS canvas overlay magnifying pixels around the active pointer coordinate.
3.  Add large, high-contrast touch nudges (up, down, left, right arrow pads) for precision element alignment.

### Acceptance Criteria
- [ ] Magnifier loupe is visible during close nodes alignment.
- [ ] Elements can be nudged pixel-by-pixel using the touch control overlay.

---

## Ticket 5: Multimodal Assisted Interpreter Improvements
*   **Title:** `[FEAT] Enhance Multimodal Assistant for Visual Previews & Non-Destructive Actions`
*   **Labels:** `ai`, `gemini`, `milestone-2`

### Description
Upgrade the Gemini-powered AI Assistant (`/api/interpreter`) to return structured, undoable design operations, transparent textual summaries of changes, and side-by-side preview comparisons of AI vector recommendations before committing changes to the active project.

### Technical Plan
1.  Update the assistant system prompt to output a structured JSON schema including a `rollbackToken`.
2.  Create an AI Suggestion Preview pane showing side-by-side thumbnails.
3.  Implement a non-destructive rollback system leveraging the `rollbackToken`.

### Acceptance Criteria
- [ ] AI prompt returns valid structural change proposals.
- [ ] User can preview modifications and either accept or reject them.

---

## Ticket 6: Full Verification and Automated E2E Testing Suite
*   **Title:** `[QA] Establish Automated Playwright and Regression Snapshot Pipeline`
*   **Labels:** `qa`, `testing`, `milestone-3`

### Description
Integrate robust, automated E2E testing using Playwright to safeguard top workspace flows—specifically validating two-editor collaborative CRDT syncing, responsive layout shifts, and visual exports across mobile and desktop browser emulations.

### Technical Plan
1.  Create automated test scenarios under `e2e-tests/`.
2.  Test concurrent collaborative user sessions to verify Yjs sync behavior.
3.  Configure Playwright screenshots to catch layout regressions.

### Acceptance Criteria
- [ ] Local tests run successfully.
- [ ] Snapshot differentials on the canvas remain within specified boundaries.
