# SVG Editor Refinement Plan: Immersive Vector Controls & Onboarding

This document outlines the detailed roadmap, technical architecture, and UX specification to refine Forgel's SVG Path Editor (Creative Touch Sketchpad). The core objectives are to make the precision vector canvas highly intuitive, expandable, fully immersive, and integrated with the whiteboard.

---

## 1. Feature 1: Expandable Canvas & NxN Grid Scale
To enable detailed and complex brand icon designs, we will upgrade the SVG editor's internal canvas from a hardcoded 200x200 grid to an expandable, scalable grid system (e.g., 200x200, 400x400, 800x800).

### Implementation Specification:
*   **Grid Scale State:** Introduce `gridScale` (number) in `SVGPathEditor.tsx`, defaulted to `200`.
*   **User Selection Interface:** Add a size selector dropdown in the canvas controls (e.g., "Grid Size: 200x200", "400x400", "800x800").
*   **Dynamic Coordinate Translation:**
    *   Update coordinate transformation formula in `getEventCoords` to scale dynamically based on `gridScale` instead of hardcoded `200`:
        ```typescript
        const x = Math.round((canvasX / rect.width) * gridScale);
        const y = Math.round((canvasY / rect.height) * gridScale);
        ```
    *   Scale the main SVG container `viewBox` dynamically using `0 0 gridScale gridScale`.
    *   Update the snapping guides and ruler markings to align with the chosen `gridScale`.

---

## 2. Feature 2: Immersive Fullscreen Mode
To maximize design focus and provide a boundless drawing feel on mobile and desktop viewports, we will implement a fully-functional immersive fullscreen view for the SVG Editor.

### Implementation Specification:
*   **Fullscreen State:** Track `isFullscreen` (boolean) in `SVGPathEditor.tsx`.
*   **Dynamic Layout Shift:** When fullscreen is active, use a fixed overlay class:
    ```tailwind
    "fixed inset-0 z-50 bg-white dark:bg-zinc-950 w-screen h-screen p-6 md:p-8 flex flex-col overflow-hidden"
    ```
*   **Outer Component Hiding:** Leverage React context or callback triggers to hide global application headers, sidebar panels, and navigation tabs when the SVG editor is fullscreen.
*   **Exit Controls:** Add a highly visual floating "Exit Fullscreen" action button with an active hover/active scale-up transition.

---

## 3. Feature 3: Bi-directional Bridge (Send Shape Vice-Versa)
We will build a high-performance vector conversion bridge that allows designers to easily push shapes between the Freeform Whiteboard and the Precision SVG Editor.

### Whiteboard ➔ SVG Editor:
*   Add a "Send to SVG Editor" action button in the properties panel of any selected shape/path on the Whiteboard.
*   **Mathematical Mapping:** Convert the whiteboard's sketch object parameters (like `x`, `y`, `width`, `height` or bezier `path` coordinates) into a standard `<path d="..." />` XML string tag.
*   **Target Append:** Append this generated path node to the project's `svgSource` XML and notify the SVG Editor via state updates.

### SVG Editor ➔ Whiteboard:
*   Add a "Send Selected Layer to Whiteboard" button inside the SVG layers panel.
*   **Mathematical Mapping:** Parse the selected SVG `<path d="..." />` coordinates. Extract the command list and convert them into absolute whiteboard coordinates, creating a corresponding whiteboard sketch element with matching stroke width, colors, and type.
*   **Target Push:** Append the new sketch element to `whiteboardSketches` in the active project state.

---

## 4. Feature 4: Interactive Onboarding Tutorial
Since the precision SVG editor offers powerful vector mathematical tools (Bezier, Anchor Snapping, Node Rounding) that can be challenging for new users, we will build an interactive, step-by-step tutorial overlay.

### Tutorial Modules:
1.  **Welcome & Layout Orientation:** Highlighting the Zoom & Pan Viewport, Tactile Draw Pad, and Coordinate Anchors Panel.
2.  **Freehand Brush vs. Auto-Bezier:** Guided visual examples of drawing flowing curves. Explain how clicking dots on the canvas automatically maps organic cubic bezier curves.
3.  **Sharp Pen & Stamp Tool:** Explaining sharp path drawings (M/L coordinates) and custom structural shapes presets.
4.  **Precision Handle Dragger:** Directing users how to grab anchor circles, view the magnifier loupe, and slide inputs for coordinate tuning.
5.  **Alignment Snapping & Simplified Clean:** Explaining how path coordinate snapping guides work and how the "Clean & Simplify" algorithm removes unnecessary points.

### UI Delivery:
*   An elegant popup tour card with high-contrast visual indicators, progress steps, and quick walkthrough actions that can be triggered at any time using a "Quick Start Tutorial" button.

---

*Plan formulated and ready for approval.*
