const fs = require('fs');
let content = fs.readFileSync('docs/detailed_consolidation_and_refinement_plan.md', 'utf-8');

const newPhase = `
## 11. Phase 6: Whiteboard Feature Expansion [In Progress]
*   **Focus:** Elevate the collaborative Whiteboard with advanced drawing primitives, color selection, thickness controls, and refined erasing.

### Task 6.1: Brush Controls (Color & Thickness)
*   **Action:** Add a color palette and stroke width slider to \`WhiteboardToolbar\`. Feed these properties into \`WhiteboardCanvas\` so users can draw with various styles. Update the sketch schema to include \`color\` and \`strokeWidth\`.

### Task 6.2: Shape Primitives (Rectangle & Circle)
*   **Action:** Add rectangle and circle modes to the toolbar. Implement drag-to-draw logic in \`WhiteboardCanvas\` for these shapes.

### Task 6.3: Refined Eraser Mechanics
*   **Action:** Implement precise intersection logic for the "sweeping-eraser" to remove specific sketched strokes based on a threshold radius, providing a more intuitive experience than the current naive implementation.
`;

content += newPhase;
fs.writeFileSync('docs/detailed_consolidation_and_refinement_plan.md', content);
