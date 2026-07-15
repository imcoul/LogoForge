const fs = require('fs');
let content = fs.readFileSync('src/tests/unit/schema_validation.test.ts', 'utf-8');
content = content.replace(
    /dos: \['Use on light background'\],/,
    "doNot: ['Stretch'],"
);
content = content.replace(
    /donts: \['Stretch'\]/,
    ""
);
content = content.replace(
    /dos: \[\], donts: \[\]/,
    "doNot: []"
);
fs.writeFileSync('src/tests/unit/schema_validation.test.ts', content);
