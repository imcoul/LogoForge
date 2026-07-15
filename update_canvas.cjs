const fs = require('fs');

let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

// Update sketch state type
content = content.replace(
    'const [sketches, setSketches] = useState<{ id: string; name: string; path: string }[]>([]);',
    `const [sketches, setSketches] = useState<{ id: string; name: string; path?: string; color?: string; strokeWidth?: number; type?: 'path' | 'rectangle' | 'circle' | 'line'; props?: any }[]>([]);`
);

// Update saveSketch type
content = content.replace(
    'const saveSketch = async (updatedSketches: { id: string; name: string; path: string }[]) => {',
    `const saveSketch = async (updatedSketches: { id: string; name: string; path?: string; color?: string; strokeWidth?: number; type?: 'path' | 'rectangle' | 'circle' | 'line'; props?: any }[]) => {`
);

// Add color and strokeWidth states
content = content.replace(
    "const [pencilType, setPencilType] = useState<'pen' | 'marker'>('pen');",
    `const [pencilType, setPencilType] = useState<'pen' | 'marker'>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);`
);

// Update tool type
content = content.replace(
    "const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line'>('pencil');",
    "const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line' | 'rectangle' | 'circle'>('pencil');"
);

// Pass new props to WhiteboardToolbar
content = content.replace(
    `<WhiteboardToolbar \n                 tool={tool} \n                 setTool={setTool} \n                 mode={mode} \n                 setMode={setMode} \n                 setFullscreen={setFullscreen} \n                 fullscreen={fullscreen}\n                onUndo={undo}\n                onRedo={redo}\n            />`,
    `<WhiteboardToolbar \n                 tool={tool} \n                 setTool={setTool} \n                 mode={mode} \n                 setMode={setMode} \n                 setFullscreen={setFullscreen} \n                 fullscreen={fullscreen}\n                onUndo={undo}\n                onRedo={redo}\n                color={strokeColor}\n                setColor={setStrokeColor}\n                strokeWidth={strokeWidth}\n                setStrokeWidth={setStrokeWidth}\n            />`
);

fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
