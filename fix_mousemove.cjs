const fs = require('fs');
let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

const oldMouseMove = `if (tool === 'pencil') {
      setCurrentPoints(prev => \`\${prev} \${point.x},\${point.y}\`);
    } else if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint) {`;

const newMouseMove = `if (tool === 'select' && selectedSketchId && startPoint) {
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;
      setDragOffset({ x: dx, y: dy });
    } else if (tool === 'pencil') {
      setCurrentPoints(prev => \`\${prev} \${point.x},\${point.y}\`);
    } else if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint) {`;

content = content.replace(oldMouseMove, newMouseMove);
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
