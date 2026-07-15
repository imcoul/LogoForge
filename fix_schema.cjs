const fs = require('fs');

let content = fs.readFileSync('src/tests/unit/schema_validation.test.ts', 'utf-8');
content = content.replace(
    /import { Node, BrandGuide } from '..\/..\/types';/,
    "import { Node } from '../../types';\nimport { BrandGuide } from '../../services/geminiService';"
);

fs.writeFileSync('src/tests/unit/schema_validation.test.ts', content);
