# Mobile Precision & Sync Refinement Plan

> **Goal:** Introduce advanced mobile precision tools, multi-touch gestures, and high-frequency synchronization refinements to make Forgel's vector and whiteboard canvases ultra-responsive and seamless on mobile viewports.

---

## 1. Feature 1: Mobile Precision UX Overlay (Magnifier Loupe & Tactile D-Pad)
*   **Task 1.1: Long-Press & Hold Nudges:** Enhance `<PrecisionOverlay />` to support continuous nudging when a nudge button is pressed and held (using `setInterval` with a 100ms tick rate).
*   **Task 1.2: Integrated Whiteboard Nudges:** Mount `<PrecisionOverlay />` in `WhiteboardCanvas.tsx` when a shape is selected in 'pointer' mode. Let users nudge shapes, paths, or sticky notes by 1px (or grid-snapped increments) on mobile viewports.
*   **Task 1.3: Real-Time Mobile Loupe for Whiteboard:** Add a floating magnifying loupe to `WhiteboardCanvas.tsx` during node dragging or path drawing, displaying a high-contrast zoomed preview centered on the cursor/pointer to ensure micro-alignment.

---

## 2. Feature 2: Multitouch Gesture Chords (Chords)
*   **Task 2.1: Double-Finger Tap for Undo:** Listen for touch events inside `WhiteboardCanvas` and `SVGPathEditor`. If a two-finger touch tap is detected, trigger the local or global `undo()` action.
*   **Task 2.2: Triple-Finger Tap for Redo:** If a three-finger touch tap is detected, trigger the `redo()` action.
*   **Task 2.3: Pinch-to-Zoom & Two-Finger Pan:** Implement robust viewport zooming and panning on mobile by calculating touch distance deltas during multitouch movements.

---

## 3. Feature 3: High-Frequency Sync Stutter Mitigation
*   **Task 3.1: Throttled State Sync:** In `src/store.ts` and `WhiteboardCanvas.tsx`, replace immediate Firestore document writes during active dragging or brush drawing with a 100ms throttle timer.
*   **Task 3.2: Batch MouseUp commits:** Maintain hot local reactive state during active mouse/touch drag movements, and perform a single final consolidated save to Firestore on `pointerUp`. This prevents frame rate drops and network flooding.

---

## 4. Feature 4: Layer Locking & Co-Editor Status
*   **Task 4.1: Element Locking Toggle:** Support a `locked?: boolean` flag on scene graph nodes and whiteboard sketches. Provide a padlock icon button in the properties panel to lock elements, preventing accidental dragging or erasure.
*   **Task 4.2: Connection Status & co-editors Counter:** Render a highly polished real-time synchronization state badge in the headers (`● Synchronized` or `● Syncing...`) and show a simulated co-editor headcount (e.g. `2 Designers online`) based on active collaboration sessions.

---

## 5. Prioritized Roadmap & Verification

| Module | Refinement | Target | Verification Method |
|---|---|---|---|
| UX | Continuous Nudges | `PrecisionOverlay.tsx` | Hold D-Pad buttons for smooth continuous movement |
| UX | Whiteboard Integration | `WhiteboardCanvas.tsx` | Nudge selected shapes using touch control pad |
| Gestures | Double/Triple Finger Chords | Canvas views | Tap with 2 fingers to Undo, 3 fingers to Redo |
| Performance | Throttled Save Engine | `store.ts` | Measure network writes; confirm non-blocking drag |
| Security | Node/Sketch Padlock Locking | Canvas properties | Lock shape; verify drag and delete are disabled |
| UI | Live Connection Badge | App headers | View co-editor counts and live sync states |
