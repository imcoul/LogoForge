const fs = require('fs');
let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

content = content.replace(
    "const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line' | 'rectangle' | 'circle'>('pencil');",
    `const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line' | 'rectangle' | 'circle' | 'select'>('select');
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);`
);
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
