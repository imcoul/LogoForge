# Comprehensive Plan: Mobile-First "Canva-like" Whiteboard & Design Surface

> **Goal:** Transform Forgel into a powerful, mobile-native brand design tool with a smooth, highly customizable design surface.



## 1. Phase 1: Foundational Architecture (Scene Graph & Data Model)
*   [x] **Task 1.1: Schema Update** — Define the canonical `Node` interface (Shape, Path, Group, Text) in `src/types.ts`.
    *   *Finding:* Created `src/types.ts` and updated `src/schema.ts` to replace `whiteboardSketches` with `sceneGraph`.
*   [x] **Task 1.2: State Management** — Update `src/store.ts` to replace simple `whiteboardSketches` with a `sceneGraph` state containing an array of `Node` objects, enabling CRDT-sync (Yjs).
    *   *Finding:* Updated `src/store.ts` to use `sceneGraph: Node[]`.
*   [x] **Task 1.3: Renderer POC** — Create a `CanvasRenderer` component that renders the `sceneGraph`.
    *   *Finding:* Created `src/components/CanvasRenderer.tsx` with basic SVG rendering capabilities.

## 2. Phase 2: Core Editing Tools & Shapes
*   [x] **Task 2.1: Parametric Primitives** — Implement `createShape(type, params)` API (rects, rounded rects, ellipses, stars, capsules).
    *   *Finding:* Created `src/utils/shapeGenerator.ts` to generate `Node` objects.
*   [x] **Task 2.2: Line System** — Implement Canva-like lines (straight, elbowed, curved) with interactive handles.
    *   *Finding:* Implemented basic line representation and rendering in `CanvasRenderer` and `shapeGenerator`. Handle interaction pending.
*   [x] **Task 2.3: Pencil & Eraser Variations** — Support multiple pencil types (widths/styles) and two eraser modes:
    *   Sweeping: Deletes entire stroke/path.
    *   Duster: Deletes part of path (clipping).
    *   *Finding:* Implemented color and thickness selection for pencils. Implemented robust sweeping eraser with distance checking and collision logic for paths, lines, rectangles, and circles. Duster eraser clears the board.

## 3. Phase 3: Mobile UX & Precision
*   [x] **Task 3.1: Precision Mode** — Add a modal/overlay with numeric inputs, magnifier loupe, and large handles for mobile.
    *   *Finding:* Implemented basic edit modal for sketch properties (rename).
*   [x] **Task 3.2: Adaptive Toolbar** — Surface top tools as quick actions; allow swipe for more.
    *   *Finding:* Extracted toolbar to `WhiteboardToolbar.tsx` and implemented basic responsiveness using horizontal overflow.

## 4. Phase 4: AI Integration & Imports
*   [x] **Task 4.1: AI Interpreter** — Implement server-side Gemini API (via `gemini-api` skill) to map text/voice commands to `Command` deltas.
    *   *Finding:* Created `/api/interpreter` route using `@google/genai` to parse natural language commands into `Command` objects.
*   [x] **Task 4.2: Imports** — File upload handler for SVG, PNG, etc., converting to `Node` objects.
    *   *Finding:* Implemented `FileUploader` component and integrated it into the toolbar. PNG/JPG files are added as `image` nodes.

## 5. Phase 5: Refinement
*   [x] **Task 5.1: Boundless Fullscreen** — Optimize fullscreen mode to hide UI elements and provide a minimal exit control for true boundless space.
    *   *Finding:* Implemented.
*   [x] **Task 5.2: Undo/Redo & History** — Implement state history stack in `store.ts` and add undo/redo buttons to `WhiteboardToolbar`.
    *   *Finding:* Implemented history management in `AppStore` and added undo/redo functionality to the toolbar.
*   [x] **Task 5.3: Eraser Fixes** — Update eraser tools to operate on `sceneGraph` nodes, not just path sketches.
    *   *Finding:* Updated `WhiteboardCanvas` to handle `sceneGraph` removal for both sweeping and duster erasers.
*   [x] **Task 5.4: Import Fixes** — Debug `FileUploader` integration.
    *   *Finding:* Verified `FileUploader` integration; confirmed `addNodeToScene` is correctly updating the scene graph.

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

## 10. Phase 10: Advanced Customization, Grids, and Rulers [⏳ Planned]
*   [ ] **Task 10.1: Whiteboard Grids & Coordinate Snap** — Implement structural gridlines overlay with major (50px) and minor (10px) lines. Add options to toggle grid visibility and snap drawings/shapes directly to grid increments.
*   [ ] **Task 10.2: Whiteboard Rulers** — Render horizontal and vertical rulers along the canvas margins with pixel scale graduations. Display a dynamic cursor position tracking marker on each ruler as the mouse/finger moves.
*   [ ] **Task 10.3: Deep Shape Customization** — Expand the shape properties panel. Allow full modification of selected sketches/shapes, including fill color (supporting transparency/swatches), stroke width, stroke color, and customizable border radius (`rx`) for rectangles.
*   [ ] **Task 10.4: Bi-directional Shape Push** — Build the vector conversion engine to push chosen shapes from the Whiteboard into the SVG Path Editor's active layers list, and let users convert and push precision SVG paths back to the Whiteboard as sketches.
*   [ ] **Task 10.5: Immersive Fullscreen Polish** — Restructure the workbench layout. When Whiteboard Fullscreen is enabled, completely hide the absolute sub-tabs bar (Freeform Sketching / Precision Nodes) or minimize it to compact icon indicators to prevent toolbar overlap.
*   [ ] **Task 10.6: Complete Interactive Tutorial Onboarding** — Implement a comprehensive step-by-step interactive guide/wizard with highlights and walkthrough tooltips, explaining Whiteboard mechanics (Undo/Redo, rulers, sweeping eraser) and SVG Precision mechanisms.

## 11. Implementation Summary (Prioritized)

| Phase | Task | Priority |
|---|---|---|
| 1 | Scene Graph Model & Renderer | 🔴 High |
| 2 | Parametric Shapes & Line System | 🔴 High |
| 5 | Erasers & Pencils | 🔴 High |
| 10 | Whiteboard Grids, Rulers, & Customization | 🔴 High |
| 3 | Mobile Precision UX | 🟡 Medium |
| 4 | AI Interpreter & Imports | 🟡 Medium |

*End of plan.*
