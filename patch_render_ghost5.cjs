const fs = require('fs');

let wbCode = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

// I will insert the ghost rendering just after rendering sketches.
wbCode = wbCode.replace(
  `              })}
              {/* Dynamic crosshair guidelines */}`,
  `              })}
              {/* Draw Ghost States */}
              {Object.entries(ephemeralGhosts || {}).map(([senderId, ghost]) => {
                if (ghost && ghost.sketchId) {
                  const sketch = sketches.find(s => s.id === ghost.sketchId);
                  if (sketch) {
                    const transform = ghost.dx || ghost.dy ? \`translate(\${ghost.dx}, \${ghost.dy})\` : '';
                    if (sketch.type === 'rect' && sketch.props) {
                      return (
                        <rect 
                          key={\`ghost-\${senderId}\`}
                          x={sketch.props.x} y={sketch.props.y}
                          width={sketch.props.width} height={sketch.props.height}
                          fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5"
                          transform={transform} opacity={0.5}
                        />
                      );
                    }
                    if (sketch.type === 'circle' && sketch.props) {
                      return (
                        <ellipse 
                          key={\`ghost-\${senderId}\`}
                          cx={sketch.props.cx} cy={sketch.props.cy}
                          rx={sketch.props.rx} ry={sketch.props.ry}
                          fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5"
                          transform={transform} opacity={0.5}
                        />
                      );
                    }
                    return (
                      <path 
                        key={\`ghost-\${senderId}\`}
                        d={sketch.path}
                        fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5"
                        transform={transform} opacity={0.5}
                      />
                    );
                  }
                }
                return null;
              })}
              {/* Dynamic crosshair guidelines */}`
);

fs.writeFileSync('src/components/WhiteboardCanvas.tsx', wbCode);
