const fs = require('fs');

let content = fs.readFileSync('src/components/WhiteboardToolbar.tsx', 'utf-8');

content = content.replace(
    "import { Pencil, Eraser, Maximize2, Grid, Edit2, Undo, Redo, Square, Circle } from 'lucide-react';",
    "import { Pencil, Eraser, Maximize2, Grid, Edit2, Undo, Redo, Square, Circle, MousePointer2 } from 'lucide-react';"
);

content = content.replace(
    "export type WhiteboardTool = 'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line' | 'rectangle' | 'circle';",
    "export type WhiteboardTool = 'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line' | 'rectangle' | 'circle' | 'select';"
);

content = content.replace(
    `<button onClick={() => setTool('pencil')} className={\`p-2 rounded \${tool === 'pencil' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}\`} title="Pencil"><Pencil size={20} /></button>`,
    `<button onClick={() => setTool('select')} className={\`p-2 rounded \${tool === 'select' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}\`} title="Select"><MousePointer2 size={20} /></button>
                    <button onClick={() => setTool('pencil')} className={\`p-2 rounded \${tool === 'pencil' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700'}\`} title="Pencil"><Pencil size={20} /></button>`
);

fs.writeFileSync('src/components/WhiteboardToolbar.tsx', content);
