const fs = require('fs');

let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

// Replace render loop for sketches
const sketchRender = `{sketches.map((sketch) => (
                <path key={sketch.id} d={sketch.path} fill="none" stroke="currentColor" strokeWidth="2" />
            ))}`;

const newSketchRender = `{sketches.map((sketch) => {
                if (sketch.type === 'rectangle' && sketch.props) {
                    return <rect key={sketch.id} x={sketch.props.x} y={sketch.props.y} width={sketch.props.width} height={sketch.props.height} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} />;
                }
                if (sketch.type === 'circle' && sketch.props) {
                    return <ellipse key={sketch.id} cx={sketch.props.cx} cy={sketch.props.cy} rx={sketch.props.rx} ry={sketch.props.ry} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} />;
                }
                return <path key={sketch.id} d={sketch.path} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} />;
            })}`;
content = content.replace(sketchRender, newSketchRender);

// Replace current sketch preview
const previewRender = `{tool === 'pencil' && <path key="current-sketch" d={currentPoints ? \`M \${currentPoints}\` : ''} fill="none" stroke="currentColor" strokeWidth="2" />}`;
const newPreviewRender = `{tool === 'pencil' && <path key="current-sketch" d={currentPoints ? \`M \${currentPoints}\` : ''} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />}`;
content = content.replace(previewRender, newPreviewRender);

// Add rectangle preview
const linePreview = `{tool === 'line' && startPoint && currentPoints && currentPoints.includes(' ') && (`;
const shapesPreview = `{tool === 'rectangle' && startPoint && currentPoints && currentPoints.includes(' ') && (
                <rect
                    x={Math.min(startPoint.x, Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x))}
                    y={Math.min(startPoint.y, Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y))}
                    width={Math.abs(startPoint.x - Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x))}
                    height={Math.abs(startPoint.y - Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y))}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
            )}
            {tool === 'circle' && startPoint && currentPoints && currentPoints.includes(' ') && (
                <ellipse
                    cx={startPoint.x + (Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x) - startPoint.x) / 2}
                    cy={startPoint.y + (Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y) - startPoint.y) / 2}
                    rx={Math.abs(startPoint.x - Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x)) / 2}
                    ry={Math.abs(startPoint.y - Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y)) / 2}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
            )}
            ` + linePreview;
content = content.replace(linePreview, shapesPreview);

fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
