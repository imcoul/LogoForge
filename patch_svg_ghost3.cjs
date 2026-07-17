const fs = require('fs');

let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');

code = code.replace(
  `const SVGPathEditor = ({ svgContent, onChange, fullscreen, setFullscreen, onGhostSync }: SVGPathEditorProps) => {`,
  `const SVGPathEditor = ({ svgContent, onChange, fullscreen, setFullscreen, onGhostSync }: SVGPathEditorProps) => {
  const { ephemeralGhosts } = useAppStore();`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
