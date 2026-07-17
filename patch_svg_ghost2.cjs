const fs = require('fs');
let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');

code = code.replace(
  `    return elements;`,
  `
    Object.entries(ephemeralGhosts || {}).forEach(([senderId, ghost]) => {
      if (ghost && ghost.mode === 'coordinate' && ghost.x !== undefined && ghost.y !== undefined) {
         elements.push(
            <circle 
              key={\`ghost-\${senderId}\`}
              cx={ghost.x} cy={ghost.y} r={4}
              fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="2 2"
            />
         );
      }
    });
    return elements;`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
