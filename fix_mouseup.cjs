const fs = require('fs');
let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

const oldMouseUp = `const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint && currentPoints) {`;

const newMouseUp = `const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (tool === 'select' && selectedSketchId && dragOffset) {
        const dx = dragOffset.x;
        const dy = dragOffset.y;
        const updatedSketches = sketches.map(s => {
            if (s.id !== selectedSketchId) return s;
            
            if (s.type === 'rectangle' && s.props) {
                return { ...s, props: { ...s.props, x: s.props.x + dx, y: s.props.y + dy } };
            } else if (s.type === 'circle' && s.props) {
                return { ...s, props: { ...s.props, cx: s.props.cx + dx, cy: s.props.cy + dy } };
            } else if (s.path) {
                // simple translation of all points in the path
                const translatedPath = s.path.replace(/([0-9.-]+),([0-9.-]+)/g, (match, px, py) => {
                    return \`\${Number(px) + dx},\${Number(py) + dy}\`;
                });
                return { ...s, path: translatedPath };
            }
            return s;
        });
        setSketches(updatedSketches);
        await saveSketch(updatedSketches);
        setDragOffset(null);
        setStartPoint(null);
        return;
    }
    
    if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint && currentPoints) {`;

content = content.replace(oldMouseUp, newMouseUp);
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
