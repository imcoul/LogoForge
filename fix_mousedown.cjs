const fs = require('fs');

let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

const oldMouseDown = `const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'drawing') return;
    if (tool === 'pencil' || tool === 'line') {
        setIsDrawing(true);
        const point = getPoint(e);
        setStartPoint(point);
        setCurrentPoints(\`\${point.x},\${point.y}\`);
    } else if (tool === 'sweeping-eraser' || tool === 'duster-eraser') {
        // Simple sweeping eraser: clear path if close enough
        // This is a naive implementation
        setIsDrawing(true);
        // ... (implement path intersection later)
    }
  };`;

const newMouseDown = `const getHitSketch = (point: {x: number, y: number}) => {
      const threshold = 15;
      return sketches.slice().reverse().find(s => {
        if (s.type === 'rectangle' && s.props) {
            const { x, y, width, height } = s.props;
            return point.x >= x - threshold && point.x <= x + width + threshold &&
                   point.y >= y - threshold && point.y <= y + height + threshold;
        } else if (s.type === 'circle' && s.props) {
            const { cx, cy, rx, ry } = s.props;
            const dx = (point.x - cx) / Math.max(1, rx);
            const dy = (point.y - cy) / Math.max(1, ry);
            return dx*dx + dy*dy <= 1.2;
        } else if (s.path) {
            const cleanPath = s.path.replace(/M |L |Q /g, '').trim();
            if (!cleanPath) return false;
            const coords = cleanPath.split(' ')
            .map(p => {
                const parts = p.split(',');
                if (parts.length < 2) return null;
                const x = Number(parts[0]);
                const y = Number(parts[1]);
                return isNaN(x) || isNaN(y) ? null : [x, y] as [number, number];
            })
            .filter((coord): coord is [number, number] => coord !== null);
            for (let i = 0; i < coords.length - 1; i++) {
                if (getSqSegDist([point.x, point.y], coords[i], coords[i+1]) < threshold * threshold) {
                    return true;
                }
            }
            return false;
        }
        return false;
      });
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'drawing') return;
    const point = getPoint(e);
    
    if (tool === 'select') {
        const hit = getHitSketch(point);
        if (hit) {
            setSelectedSketchId(hit.id);
            setIsDrawing(true);
            setStartPoint(point);
            setDragOffset({ x: 0, y: 0 }); // To accumulate total translation during the drag
        } else {
            setSelectedSketchId(null);
        }
    } else if (tool === 'pencil' || tool === 'line' || tool === 'rectangle' || tool === 'circle') {
        setSelectedSketchId(null);
        setIsDrawing(true);
        setStartPoint(point);
        setCurrentPoints(\`\${point.x},\${point.y}\`);
    } else if (tool === 'sweeping-eraser' || tool === 'duster-eraser') {
        setIsDrawing(true);
    }
  };`;

content = content.replace(oldMouseDown, newMouseDown);
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
