const fs = require('fs');

let content = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');
content = content.replace(
    'const [editorMode, setEditorMode] = useState<\'draw\' | \'coordinate\'>(\'draw\');',
    `const [editorMode, setEditorMode] = useState<'draw' | 'coordinate'>('draw');
  const [gestureToast, setGestureToast] = useState<string | null>(null);`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', content);
