const fs = require('fs');
let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf8');

code = code.replace(
  `    if (e.button === 1 || e.shiftKey) {
      // Middle click or Shift + Drag pans
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (drawTool === 'brush') {`,
  `    if (e.button === 1 || e.shiftKey || editorMode === 'coordinate') {
      // Middle click or Shift + Drag pans (or any click in coordinate mode background)
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (drawTool === 'brush') {`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
