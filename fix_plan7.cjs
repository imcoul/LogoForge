const fs = require('fs');
let content = fs.readFileSync('docs/whiteboard_and_mobile_editor_plan.md', 'utf-8');

content = content.replace(
    '## 7. Phase 7: Advanced Object Manipulation (Move & Select) [In Progress]',
    '## 7. Phase 7: Advanced Object Manipulation (Move & Select) [✅ Completed]'
);
content = content.replace(
    '*   [ ] **Task 7.1: Selection Tool** — Introduce a \'pointer\' or \'select\' mode in the toolbar.',
    '*   [x] **Task 7.1: Selection Tool** — Introduce a \'pointer\' or \'select\' mode in the toolbar.'
);
content = content.replace(
    '*   [ ] **Task 7.2: Object Translation** — Allow dragging selected shapes, lines, and paths across the canvas, updating their coordinate properties in real-time.',
    '*   [x] **Task 7.2: Object Translation** — Allow dragging selected shapes, lines, and paths across the canvas, updating their coordinate properties in real-time.'
);

fs.writeFileSync('docs/whiteboard_and_mobile_editor_plan.md', content);
