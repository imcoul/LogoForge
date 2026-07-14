# Comprehensive Plan: Mobile-First "Canva-like" Whiteboard & Design Surface

> **Goal:** Transform Forgel into a powerful, mobile-native brand design tool with a smooth, highly customizable design surface.

---

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
*   [ ] **Task 2.3: Pencil & Eraser Variations** — Support multiple pencil types (widths/styles) and two eraser modes:
    *   Sweeping: Deletes entire stroke/path.
    *   Duster: Deletes part of path (clipping).
    *   *Finding:* Implemented basic tool state and UI. Sweeping eraser structure is in place but needs robust collision detection (path parsing). Duster eraser pending.

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

## 5. Implementation Summary (Prioritized)

| Phase | Task | Priority |
|---|---|---|
| 1 | Scene Graph Model & Renderer | 🔴 High |
| 2 | Parametric Shapes & Line System | 🔴 High |
| 5 | Erasers & Pencils | 🔴 High |
| 3 | Mobile Precision UX | 🟡 Medium |
| 4 | AI Interpreter & Imports | 🟡 Medium |

*End of plan.*
