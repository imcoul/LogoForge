const fs = require('fs');

let content = fs.readFileSync('docs/whiteboard_and_mobile_editor_plan.md', 'utf-8');

const phase6Regex = /## 6\. Phase 6: Advanced Shape Drawing & Canvas Enhancements \[✅ Completed\][\s\S]*?---\n/m;
const phase6Match = content.match(phase6Regex);

if (phase6Match) {
    content = content.replace(phase6Regex, '');
    
    // Add it after Phase 5 Refinement
    const phase5Regex = /## 5\. Phase 5: Refinement[\s\S]*?---\n/m;
    content = content.replace(phase5Regex, (match) => match + phase6Match[0]);
}

fs.writeFileSync('docs/whiteboard_and_mobile_editor_plan.md', content);
