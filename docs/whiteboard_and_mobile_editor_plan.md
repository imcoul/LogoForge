# Comprehensive Plan: Mobile-First "Canva-like" Whiteboard & Design Surface

> **Goal:** Transform Forgel into a powerful, mobile-native brand design tool with a smooth, highly customizable design surface.

---

## 1. Phase 1: Foundational Architecture (Scene Graph & Data Model) [✅ Completed]
*   [x] **Task 1.1: Schema Update** — Define the canonical `Node` interface (Shape, Path, Group, Text) in `src/types.ts`.
*   [x] **Task 1.2: State Management** — Update `src/store.ts` to replace simple `whiteboardSketches` with a `sceneGraph` state containing an array of `Node` objects, enabling CRDT-sync (Yjs).
*   [x] **Task 1.3: Renderer POC** — Create a `CanvasRenderer` component that renders the `sceneGraph`.

---

## 2. Phase 2: Core Editing Tools & Shapes [✅ Completed]
*   [x] **Task 2.1: Parametric Primitives** — Implement `createShape(type, params)` API (rects, rounded rects, ellipses, stars, capsules).
*   [x] **Task 2.2: Line System** — Implement Canva-like lines (straight, elbowed, curved) with interactive handles.
*   [x] **Task 2.3: Pencil & Eraser Variations** — Support multiple pencil types (widths/styles) and two eraser modes:
    *   Sweeping: Deletes entire stroke/path.
    *   Duster: Deletes part of path (clipping).

---

## 3. Phase 3: Mobile UX & Precision [✅ Completed]
*   [x] **Task 3.1: Precision Mode** — Add a edit modal/overlay with properties tuning and coordinate updates.
*   [x] **Task 3.2: Adaptive Toolbar** — Surface top tools as quick actions; allow swipe for more.

---

## 4. Phase 4: AI Integration & Imports [✅ Completed]
*   [x] **Task 4.1: AI Interpreter** — Implement server-side Gemini API (via `gemini-api` skill) to map text/voice commands to `Command` deltas.
*   [x] **Task 4.2: Imports** — File upload handler for SVG, PNG, etc., converting to `Node` objects.

---

## 5. Phase 5: Refinement [✅ Completed]
*   [x] **Task 5.1: Boundless Fullscreen** — Optimize fullscreen mode to hide UI elements and provide a minimal exit control.
*   [x] **Task 5.2: Undo/Redo & History** — Implement state history stack in `store.ts` and add undo/redo buttons to `WhiteboardToolbar`.
*   [x] **Task 5.3: Eraser Fixes** — Update eraser tools to operate on `sceneGraph` nodes, not just path sketches.
*   [x] **Task 5.4: Import Fixes** — Debug `FileUploader` integration.

---

## 6. Phase 6: Advanced Shape Drawing & Canvas Enhancements [✅ Completed]
*   [x] **Task 6.1: Brush Controls (Color & Thickness)** — Add color and thickness properties to the Whiteboard Toolbar, sync these to state, and pass them into `WhiteboardCanvas`.
*   [x] **Task 6.2: Shape Primitives (Rectangle & Circle)** — Add rectangle and circle modes to the toolbar, allowing drag-to-draw shape creation using the same stroke color and width.
*   [x] **Task 6.3: Refined Eraser Mechanics** — Implemented bounding box and radius checks for shapes, and segment distance calculations for drawn bezier paths, to allow intuitive sweeping erasure.

---

## 7. Phase 7: Advanced Object Manipulation (Move & Select) [✅ Completed]
*   [x] **Task 7.1: Selection Tool** — Introduce a 'pointer' or 'select' mode in the toolbar.
*   [x] **Task 7.2: Object Translation** — Allow dragging selected shapes, lines, and paths across the canvas, updating their coordinate properties in real-time.

---

## 8. Phase 8: Robust Canvas Persistence & Immersive Layout Refinement [✅ Completed]
*   [x] **Task 8.1: Full Shape Creation Persistence** — Fixed mouse-up handlers for drag-to-draw rectangle and ellipse primitives, ensuring they are saved to the project's sketches array instead of disappearing.
*   [x] **Task 8.2: Selection Translate Persistence** — Implemented coordinate-shifting translation math on mouse-up for selected rectangles, ellipses, and paths, writing changes back to Firestore upon completing a drag.
*   [x] **Task 8.3: Overflow-Proof Adaptive Toolbar** — Upgraded the toolbar layout to support horizontal-scrolling strips on small-screen viewports, preventing layout overflow.
*   [x] **Task 8.4: True Immersive Fullscreen Mode** — Refactored fullscreen layout to let the canvas dynamically fill 100% of the viewport, with the adaptive toolbar cleanly integrated.
*   [x] **Task 8.5: Centralized Stage-Gate Protection** — Enforced a forward-only stage flow (`discovery` -> `ideation` -> `drafting` -> `refinement` -> `delivery`) in `store.ts` to prevent stages from moving backward.
*   [x] **Task 8.6: Compiler Config Integration** — Enabled `resolveJsonModule` in `tsconfig.json` to safely import `firebase-applet-config.json` in TypeScript.

---

## 9. Phase 9: Unified Workspace Enhancement & Layout Correction [✅ Completed]
*   [x] **Task 9.1: Correct Undo/Redo Engine integration**
    *   *Problem:* Drawings, erasures, and shape movements direct-update `sceneGraph` on mouseUp without recording to the `sceneHistory` stack, rendering undo/redo inactive.
    *   *Solution:* Expose `updateSceneGraph(nodes: Node[])` inside `src/store.ts` that handles compiling a fresh, sliced history snapshot, committing it to IndexedDB/Firestore, and updating the active history index pointer. Replace all raw `updateProject` whiteboard-state overrides with `updateSceneGraph`.
    *   *Findings/Status:* Completed & verified. Designed a local history stack manager with a rollback mechanism tracking sketch arrays. Synchronized with the global store upon each mutation. Added visual Undo/Redo triggers onto the toolbar.
*   [x] **Task 9.2: Whiteboard Rulers & Dynamic Tracking Guidelines**
    *   *Specification:* Overlay elegant, modern horizontal and vertical ruler rails on the top and left of the canvas.
    *   *Markings:* Grid increments of 10px (minor tick) and 50px (major tick with numeric coordinates).
    *   *Dynamic Tracking:* Show high-contrast guideline crosshair markers on the rulers matching the active cursor or pointer coordinate as the designer draws or translates shapes.
    *   *Findings/Status:* Completed & verified. Configured high-fidelity horizontal and vertical ruler backplanes on top and left margins. Added dynamic cursor indicator ticks and crosshairs following pointer position on SVG enter.
*   [x] **Task 9.3: Whiteboard Background Grids & Snapping Control**
    *   *Specification:* Introduce a customizable grid overlay pattern inside the drawing canvas.
    *   *Gridlines Toggle:* Add a neat toggle switch (e.g. "Show Grid") in the canvas toolbar.
    *   *Magnetic Snap:* When snapping is toggled active, constrain pointer/mouse drawing and object translate coordinates to the nearest grid step (e.g., 10px snap grid bounds), allowing for perfect visual alignment of rectangles, circles, and curves.
    *   *Findings/Status:* Completed & verified. Built a dual minor/major grid pattern backed by SVG defs. Integrated snap-to-grid utility logic into the coordinate translator to lock vectors perfectly to 10px grid junctions when snap is toggled active.
*   [x] **Task 9.4: Immersive Fullscreen Layout Correction (Toolbar Layers)**
    *   *Problem:* Entering fullscreen mode leaves workbench sub-tabs (e.g. "Freeform Sketching" and "Precision Nodes" selectors) hovering or overlapping the main canvas drawing controls.
    *   *Solution:* Explicitly hide parent navigation headers, sub-tabs bars, and layout dividers when `fullscreen` mode is active. Restructure the full viewport to maximize negative space, keeping only the highly functional, horizontal-scrolled whiteboard toolbar floating at the top of the viewport.
    *   *Findings/Status:* Completed & verified. Isolated the fullscreen whiteboard to a full-viewport overlay layer to bypass parent layout boundaries. Rewrote layout motion keys (`precision-workbench` and `precision-sandbox`) in `App.tsx` to completely isolate tabs and eliminate layout leakage.
*   [x] **Task 9.5: Live Shape Style Properties Panel**
    *   *Specification:* Build a collapsible or floating properties tuning panel that activates whenever a whiteboard shape (rectangle, circle, etc.) is selected in Pointer mode.
    *   *Controllable Attributes:*
        *   **Fill Color:** Fully customizable HEX values with quick-select swatches and custom opacity controls (enabling transparent fills).
        *   **Border Color:** Distinct color picker for outlines.
        *   **Border Radius (`rx` / `ry`):** Numeric sliders from 0px (sharp) up to 100px (fully rounded capsules) for rectangles.
        *   **Outline Width (Stroke):** Fine-grained slide selectors for borders.
        *   **Size Mixing & Resizing:** Draggable anchor nodes on selected shape borders to allow quick width, height, and scale updates.
    *   *Findings/Status:* Completed & verified. Created a Figma-inspired collapsable floating properties panel. Supports direct Hex entries, preset swatches, border-radius controls for rectangles, custom opacity adjustments, and dotted/dashed line style borders.
*   [x] **Task 9.6: Diagonal & Circular Drafting Rulers & Polar Guides**
    *   *Specification:* Integrate blueprint-level layout aids that help establish isometric symmetries and emblem roundness.
    *   *Angle Overlays:* Multi-diagonal lines tracking 45° and 135° axes.
    *   *Radial Overlays:* Concentric circle guidelines centered on the workbench canvas.
    *   *High-Fidelity Ticks & Labels:* Real-time numeric offsets printed along the 45°/135° axes, and protractor-style degree markings (every 15° around each concentric ring, with dotted layout lines and major angle tags like 0°, 45°, 90°, 135°, etc.).
    *   *Findings/Status:* Completed & verified. Implemented selectable isometric 45° line matrices with precise, perpendicular tick-marks and coordinate labels every 50px of distance. Designed polar protractor circular rulers with 15-degree sub-ticks on each ring, 45-degree dotted radial axes, and large degree text markers. All are styled with beautiful brand colors.

---

## 10. Phase 10: Interactive Onboarding Tutorial & Bi-directional SVG Editor Bridge [✅ Completed]
*   [x] **Task 10.1: Bi-directional Shape & Vector Translation Bridge**
    *   *Push to SVG Editor:* Add an action button in the shape selection overlay: **"Push to Precision SVG Editor"**. This translates the whiteboard shape or path coordinates into compliant XML format (e.g. converting a circle node to `<circle cx="..." cy="..." r="..." fill="..." />` or a bezier stroke to `<path d="..." />`), appending it as a fresh layer in the precision editor.
    *   *Push to Whiteboard:* Inside the SVG Editor's layers view, place a **"Convert & Send to Whiteboard"** trigger. This parses the active SVG node attributes and coordinate tags, translating and projecting them back into whiteboard `Node` objects, appending them into the `sceneGraph` workspace.
    *   *Findings/Status:* Completed & verified. Created a bi-directional conversion bridge. Pushing from the whiteboard maps shape nodes (circles, rounded rects, freehand paths) directly into compliant raw SVG XML code, injecting it as a fresh layer within Precision SVG Editor.
*   [x] **Task 10.2: Immersive Interactive Onboarding Wizard**
    *   *Specification:* Add a "Quick Start Tutorial" interactive onboarding trigger in both the Whiteboard and the SVG Editor.
    *   *Whiteboard Walkthrough:* Step-by-step overlays directing the user through:
        1.  *Dynamic Rulers:* Tracking positions.
        2.  *Grid Snapping:* Aligning coordinates.
        3.  *Parametric Customizer:* Tuning borders, fills, and corner radii.
        4.  *The Sweeping Eraser:* Fast touch wiping.
    *   *SVG Editor Walkthrough:* An interactive, visual tooltip guide designed to simplify coordinate vectors:
        1.  *Zoom & Pan:* Moving around the 200x200 (or expanded) canvas area.
        2.  *Coordinate Nodes:* Showing how coordinates map to anchor nodes.
        3.  *Path Handles:* Adjusting Bezier curves and control points.
        4.  *The Bridge:* How to bounce elements between the whiteboard and vector views effortlessly.
    *   *Findings/Status:* Completed & verified. Created `ForgeAcademy.tsx` providing a multi-tab guide covering the drawing controls, snapping aids, node coordinates, zoom louping, and the bi-directional workspace bridge.

---

## 11. Implementation Summary (Prioritized Roadmap)

| Phase | Task | Status | Focus |
|---|---|---|---|
| 9 | Correct Undo/Redo Engine | ✅ Verified | High-performance local state restoration stack |
| 9 | Immersive Fullscreen Toolbar Clean | ✅ Verified | Isolated viewport and layer protection |
| 9 | Whiteboard Grids, Snapping & Rulers | ✅ Verified | Multi-grid SVG patterns, 10px magnetic snapping & ruler ticks |
| 9 | Diagonal & Circular Guides | ✅ Verified | Isometric axes (45°/135°) & concentric radial rings with radius labels |
| 9 | Live Shape Style Properties Panel | ✅ Verified | Collapsible Figma-style panel with colors, opacity, radius & styles |
| 10 | Bi-directional Vector Bridge | ✅ Verified | Real-time translation between SVG XML elements and whiteboard shapes |
| 10 | Interactive Tutorial Walkthrough | ✅ Verified | ForgeAcademy multi-tab walkthrough guidelines and onboarding panels |

*End of plan.*
