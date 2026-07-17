const fs = require('fs');

let wbCode = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

wbCode = wbCode.replace(
  `const { activeProjectId, projects, updateProject } = useAppStore();`,
  `const { activeProjectId, projects, updateProject, ephemeralGhosts } = useAppStore();`
);

wbCode = wbCode.replace(
  `useEffect(() => {
    redrawCanvas();
  }, [sketches, selectedSketchId]);`,
  `useEffect(() => {
    redrawCanvas();
  }, [sketches, selectedSketchId, ephemeralGhosts]);`
);

wbCode = wbCode.replace(
  `// Draw selection box`,
  `// Draw ghosts
    Object.values(ephemeralGhosts || {}).forEach(ghost => {
      if (ghost && ghost.sketchId) {
        const originalSketch = sketches.find(s => s.id === ghost.sketchId);
        if (originalSketch) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          // Apply ghost delta translation
          ctx.translate(ghost.dx, ghost.dy);
          // Simplified ghost render
          ctx.strokeStyle = '#3B82F6';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(originalSketch.x, originalSketch.y, originalSketch.width || 100, originalSketch.height || 100);
          ctx.restore();
        }
      }
    });

    // Draw selection box`
);

fs.writeFileSync('src/components/WhiteboardCanvas.tsx', wbCode);

