const fs = require('fs');

let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

const oldEraser = `} else if (tool === 'sweeping-eraser') {
      // Find a sketch to delete
      const deletedSketch = sketches.find(s => {
        if (!s.path) return false;
        const cleanPath = s.path.replace('M ', '').trim();
        if (!cleanPath) return false;
        const coords = cleanPath.split(' ')
          .map(p => {
            const parts = p.split(',');
            if (parts.length < 2) return null;
            const x = Number(parts[0]);
            const y = Number(parts[1]);
            return isNaN(x) || isNaN(y) ? null : [x, y];
          })
          .filter((coord): coord is [number, number] => coord !== null);
        return coords.some(([x, y]) => Math.sqrt((x - point.x)**2 + (y - point.y)**2) < 20);
      });
      if (deletedSketch) {
        deleteSketch(deletedSketch.id);
      }`;

const newEraser = `} else if (tool === 'sweeping-eraser') {
      // Find a sketch to delete using refined eraser mechanics
      const deletedSketch = sketches.find(s => {
        const threshold = 15;
        if (s.type === 'rectangle' && s.props) {
            const { x, y, width, height } = s.props;
            return point.x >= x - threshold && point.x <= x + width + threshold &&
                   point.y >= y - threshold && point.y <= y + height + threshold;
        } else if (s.type === 'circle' && s.props) {
            const { cx, cy, rx, ry } = s.props;
            // Simplified ellipse collision
            const dx = (point.x - cx) / Math.max(1, rx);
            const dy = (point.y - cy) / Math.max(1, ry);
            return dx*dx + dy*dy <= 1.2; // 20% margin
        } else if (s.path) {
            // Distance to bezier/path curve (simplified segment check)
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
      if (deletedSketch) {
        deleteSketch(deletedSketch.id);
      }`;

content = content.replace(oldEraser, newEraser);

fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
