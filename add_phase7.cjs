const fs = require('fs');

let content = fs.readFileSync('docs/whiteboard_and_mobile_editor_plan.md', 'utf-8');

const phase7 = `## 7. Phase 7: Advanced Object Manipulation (Move & Select) [In Progress]
*   [ ] **Task 7.1: Selection Tool** — Introduce a 'pointer' or 'select' mode in the toolbar.
*   [ ] **Task 7.2: Object Translation** — Allow dragging selected shapes, lines, and paths across the canvas, updating their coordinate properties in real-time.

---
`;

content = content.replace('## 5. Implementation Summary (Prioritized)', phase7 + '## 5. Implementation Summary (Prioritized)');

fs.writeFileSync('docs/whiteboard_and_mobile_editor_plan.md', content);
