const fs = require('fs');

let svgCode = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');

// I will look for the end of the file and ensure it ends properly.
// In the previous step, `patch_context_menu.cjs`, I might have injected something weird.
// Let's remove any extra `}` at the end of the file.
let lines = svgCode.split('\\n');
let bracketCount = 0;
// We can just count braces, but let's just use regex to remove multiple closing braces at the end
svgCode = svgCode.replace(/\}\;\n\}\;\n$/g, '};\n');

// The error was at line 2632 "Unexpected }". This usually means an extra `}` at the end of the component.
// I will just read the last 30 lines to see.
fs.writeFileSync('src/components/SVGPathEditor.tsx', svgCode);
