const fs = require('fs');

let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');

code = code.replace(
  `const SVGPathEditor = ({ svgContent, onChange, fullscreen, setFullscreen, onGhostSync }: SVGPathEditorProps) => {`,
  `const SVGPathEditor = ({ svgContent, onChange, fullscreen, setFullscreen, onGhostSync }: SVGPathEditorProps) => {
  const { ephemeralGhosts } = useAppStore();`
);

// We need to render ghosts inside the main <svg> or coord canvas.
// The main SVG rendering is around line 1464? Let's check where the SVG nodes are rendered.
// Nodes are typically rendered inside an <svg> tag. Let's find `<svg`
code = code.replace(
  `{/* Dynamic guide lines */}`,
  `{/* Draw Ghost States */}
            {Object.entries(ephemeralGhosts || {}).map(([senderId, ghost]) => {
              if (ghost && ghost.nodeId && ghost.x !== undefined && ghost.y !== undefined) {
                 return (
                    <circle 
                      key={\`ghost-\${senderId}\`}
                      cx={ghost.x} cy={ghost.y} r={4}
                      fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="2 2"
                    />
                 );
              }
              return null;
            })}
            
            {/* Dynamic guide lines */}`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
