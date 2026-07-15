const fs = require('fs');

let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

// Update handleMouseMove
content = content.replace(
    "} else if (tool === 'line' && startPoint) {",
    "} else if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint) {"
);

// Update handleMouseUp to save rect/circle
const oldLineSave = `} else if (tool === 'line' && startPoint && currentPoints) {
        if (currentPoints.includes(' ')) {
            const points = currentPoints.split(' ');
            if (points.length >= 2 && points[1]) {
                const parts = points[1].split(',');
                if (parts.length >= 2) {
                    const endPointX = Number(parts[0]);
                    const endPointY = Number(parts[1]);
                    if (!isNaN(endPointX) && !isNaN(endPointY)) {
                        const newNode: Node = {
                            id: Date.now().toString(),
                            type: 'line',
                            transform: { x: startPoint.x, y: startPoint.y, scaleX: 1, scaleY: 1, rotate: 0 },
                            props: { x2: endPointX - startPoint.x, y2: endPointY - startPoint.y },
                            meta: { createdBy: 'user', timestamp: new Date().toISOString() }
                        };
                        if (activeProjectId) {
                            const updatedNodes = [...(activeProject?.sceneGraph || []), newNode];
                            await updateProject(activeProjectId, { sceneGraph: updatedNodes });
                        }
                    }
                }
            }
        }
        setCurrentPoints('');
        setStartPoint(null);
    } else if (tool === 'pencil' && currentPoints) {`;

const newLineSave = `} else if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint && currentPoints) {
        if (currentPoints.includes(' ')) {
            const points = currentPoints.split(' ');
            if (points.length >= 2 && points[1]) {
                const parts = points[1].split(',');
                if (parts.length >= 2) {
                    const endPointX = Number(parts[0]);
                    const endPointY = Number(parts[1]);
                    if (!isNaN(endPointX) && !isNaN(endPointY)) {
                        if (tool === 'line') {
                            const newNode: Node = {
                                id: Date.now().toString(),
                                type: 'line',
                                transform: { x: startPoint.x, y: startPoint.y, scaleX: 1, scaleY: 1, rotate: 0 },
                                props: { x2: endPointX - startPoint.x, y2: endPointY - startPoint.y },
                                meta: { createdBy: 'user', timestamp: new Date().toISOString() }
                            };
                            if (activeProjectId) {
                                const updatedNodes = [...(activeProject?.sceneGraph || []), newNode];
                                await updateProject(activeProjectId, { sceneGraph: updatedNodes });
                            }
                        } else {
                            // save as a sketch for rectangle/circle
                            let props: any = {};
                            if (tool === 'rectangle') {
                                props = {
                                    x: Math.min(startPoint.x, endPointX),
                                    y: Math.min(startPoint.y, endPointY),
                                    width: Math.abs(startPoint.x - endPointX),
                                    height: Math.abs(startPoint.y - endPointY)
                                };
                            } else if (tool === 'circle') {
                                props = {
                                    cx: startPoint.x + (endPointX - startPoint.x) / 2,
                                    cy: startPoint.y + (endPointY - startPoint.y) / 2,
                                    rx: Math.abs(startPoint.x - endPointX) / 2,
                                    ry: Math.abs(startPoint.y - endPointY) / 2
                                };
                            }
                            
                            const newSketch = {
                                id: Date.now().toString(),
                                name: \`\${tool} \${sketches.length + 1}\`,
                                type: tool,
                                props,
                                color: strokeColor,
                                strokeWidth
                            };
                            const updatedSketches = [...sketches, newSketch];
                            setSketches(updatedSketches);
                            await saveSketch(updatedSketches);
                        }
                    }
                }
            }
        }
        setCurrentPoints('');
        setStartPoint(null);
    } else if (tool === 'pencil' && currentPoints) {`;

content = content.replace(oldLineSave, newLineSave);

// Also pass color and strokeWidth when saving pencil
const oldPencilSave = `const newSketch = {
            id: Date.now().toString(),
            name: \`Sketch \${sketches.length + 1}\`,
            path: smoothedPath || \`M \${currentPoints}\`
        };`;

const newPencilSave = `const newSketch = {
            id: Date.now().toString(),
            name: \`Sketch \${sketches.length + 1}\`,
            path: smoothedPath || \`M \${currentPoints}\`,
            color: strokeColor,
            strokeWidth
        };`;

content = content.replace(oldPencilSave, newPencilSave);

fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
