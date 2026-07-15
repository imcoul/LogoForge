const fs = require('fs');
let content = fs.readFileSync('src/tests/unit/schema_validation.test.ts', 'utf-8');
content = content.replace(/voiceAndTone: 'Professional'/g, "");
content = content.replace(/voiceAndTone: ''/g, "");
fs.writeFileSync('src/tests/unit/schema_validation.test.ts', content);
