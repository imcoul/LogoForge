const fs = require('fs');
let svgCode = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');
svgCode = svgCode.replace(
  `startPos: (e && 'touches' in e && e.touches && e.touches[0]) ? e.touches[0].clientX : (e as React.MouseEvent)?.clientX || 0`,
  ``
);
fs.writeFileSync('src/components/SVGPathEditor.tsx', svgCode);
