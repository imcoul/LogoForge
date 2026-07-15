const fs = require('fs');
let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

const oldRender = `{sketches.map((sketch) => {
                if (sketch.type === 'rectangle' && sketch.props) {
                    return <rect key={sketch.id} x={sketch.props.x} y={sketch.props.y} width={sketch.props.width} height={sketch.props.height} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} />;
                }
                if (sketch.type === 'circle' && sketch.props) {
                    return <ellipse key={sketch.id} cx={sketch.props.cx} cy={sketch.props.cy} rx={sketch.props.rx} ry={sketch.props.ry} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} />;
                }
                return <path key={sketch.id} d={sketch.path} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} />;
            })}`;

const newRender = `{sketches.map((sketch) => {
                const isSelected = sketch.id === selectedSketchId;
                const tx = isSelected && dragOffset ? dragOffset.x : 0;
                const ty = isSelected && dragOffset ? dragOffset.y : 0;
                const transform = tx || ty ? \`translate(\${tx}, \${ty})\` : undefined;
                const strokeClass = isSelected ? "opacity-75 drop-shadow-md" : "";
                
                if (sketch.type === 'rectangle' && sketch.props) {
                    return <rect key={sketch.id} x={sketch.props.x} y={sketch.props.y} width={sketch.props.width} height={sketch.props.height} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} transform={transform} className={strokeClass} />;
                }
                if (sketch.type === 'circle' && sketch.props) {
                    return <ellipse key={sketch.id} cx={sketch.props.cx} cy={sketch.props.cy} rx={sketch.props.rx} ry={sketch.props.ry} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} transform={transform} className={strokeClass} />;
                }
                return <path key={sketch.id} d={sketch.path} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} transform={transform} className={strokeClass} />;
            })}`;

content = content.replace(oldRender, newRender);
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
