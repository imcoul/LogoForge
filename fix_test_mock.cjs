const fs = require('fs');
let content = fs.readFileSync('src/tests/unit/schema_validation.test.ts', 'utf-8');

content = content.replace(
    /const mockBrandGuide: BrandGuide = {/g,
    "const mockBrandGuide: BrandGuide = {"
);
// just use 'as unknown as BrandGuide'
content = content.replace(
    /const mockBrandGuide: BrandGuide = {([\s\S]*?)};/m,
    "const mockBrandGuide = {$1} as unknown as BrandGuide;"
);

content = content.replace(
    /const fallbackGuide: BrandGuide = {([\s\S]*?)};/m,
    "const fallbackGuide = {$1} as unknown as BrandGuide;"
);

fs.writeFileSync('src/tests/unit/schema_validation.test.ts', content);
