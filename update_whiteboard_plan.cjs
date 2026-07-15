const fs = require('fs');

let content = fs.readFileSync('docs/whiteboard_and_mobile_editor_plan.md', 'utf-8');

// Check off Task 2.3 as we implemented sweeping, color, thickness
content = content.replace(
    '*   [ ] **Task 2.3: Pencil & Eraser Variations**',
    '*   [x] **Task 2.3: Pencil & Eraser Variations**'
);
content = content.replace(
    '    *   *Finding:* Implemented basic tool state and UI. Sweeping eraser structure is in place but needs robust collision detection (path parsing). Duster eraser pending.',
    '    *   *Finding:* Implemented color and thickness selection for pencils. Implemented robust sweeping eraser with distance checking and collision logic for paths, lines, rectangles, and circles. Duster eraser clears the board.'
);

// We should add Phase 6 here and complete the plan
const phase6 = `
## 6. Phase 6: Advanced Shape Drawing & Canvas Enhancements [✅ Completed]
*   [x] **Task 6.1: Brush Controls (Color & Thickness)** — Add color and thickness properties to the Whiteboard Toolbar, sync these to state, and pass them into \`WhiteboardCanvas\`.
*   [x] **Task 6.2: Shape Primitives (Rectangle & Circle)** — Add rectangle and circle modes to the toolbar, allowing drag-to-draw shape creation using the same stroke color and width.
*   [x] **Task 6.3: Refined Eraser Mechanics** — Implemented bounding box and radius checks for shapes, and segment distance calculations for drawn bezier paths, to allow intuitive sweeping erasure.
`;

content = content.replace(
    '---',
    phase6 + '\n---'
);

fs.writeFileSync('docs/whiteboard_and_mobile_editor_plan.md', content);
