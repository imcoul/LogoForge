# Comprehensive Plan: Mobile-First "Canva-like" Whiteboard & Design Surface

> **Goal:** Transform Forgel into a powerful, mobile-native brand design tool with a smooth, highly customizable design surface.

---

## 1. Phase 1: Foundational Architecture (Scene Graph & Data Model)
*   **Task 1.1: Schema Update** — Define the canonical `Node` interface (Shape, Path, Group, Text) in `src/types.ts`.
*   **Task 1.2: State Management** — Update `src/store.ts` to replace simple `whiteboardSketches` with a `sceneGraph` state containing an array of `Node` objects, enabling CRDT-sync (Yjs).
*   **Task 1.3: Renderer POC** — Create a `CanvasRenderer` component that renders the `sceneGraph`.

## 2. Phase 2: Core Editing Tools & Shapes
*   **Task 2.1: Parametric Primitives** — Implement `createShape(type, params)` API (rects, rounded rects, ellipses, stars, capsules).
*   **Task 2.2: Line System** — Implement Canva-like lines (straight, elbowed, curved) with interactive handles.
*   **Task 2.3: Pencil & Eraser Variations** — Support multiple pencil types (widths/styles) and two eraser modes:
    *   Sweeping: Deletes entire stroke/path.
    *   Duster: Deletes part of path (clipping).

## 3. Phase 3: Mobile UX & Precision
*   **Task 3.1: Precision Mode** — Add a modal/overlay with numeric inputs, magnifier loupe, and large handles for mobile.
*   **Task 3.2: Adaptive Toolbar** — Surface top tools as quick actions; allow swipe for more.

## 4. Phase 4: AI Integration & Imports
*   **Task 4.1: AI Interpreter** — Implement server-side Gemini API (via `gemini-api` skill) to map text/voice commands to `Command` deltas.
*   **Task 4.2: Imports** — File upload handler for SVG, PNG, etc., converting to `Node` objects.

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
