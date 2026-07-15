const fs = require('fs');

let content = fs.readFileSync('docs/detailed_consolidation_and_refinement_plan.md', 'utf-8');

content = content.replace(
    '## 11. Phase 6: Whiteboard Feature Expansion [In Progress]',
    '## 11. Phase 6: Whiteboard Feature Expansion [✅ Completed]'
);

content = content.replace(
    '### Task 6.1: Brush Controls (Color & Thickness)',
    '### Task 6.1: Brush Controls (Color & Thickness) [✅ Completed & Verified]'
);

content = content.replace(
    '### Task 6.2: Shape Primitives (Rectangle & Circle)',
    '### Task 6.2: Shape Primitives (Rectangle & Circle) [✅ Completed & Verified]'
);

content = content.replace(
    '### Task 6.3: Refined Eraser Mechanics',
    '### Task 6.3: Refined Eraser Mechanics [✅ Completed & Verified]'
);

fs.writeFileSync('docs/detailed_consolidation_and_refinement_plan.md', content);
