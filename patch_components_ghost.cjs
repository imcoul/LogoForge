const fs = require('fs');

// Patch WhiteboardCanvas
let wbCode = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');
wbCode = wbCode.replace(
  `onUpdateAndSync?: (updates: any, throttleCloud?: boolean) => Promise<void> }`,
  `onUpdateAndSync?: (updates: any, throttleCloud?: boolean) => Promise<void>, onGhostSync?: (ghostData: any) => void }`
);
wbCode = wbCode.replace(
  `setFullscreen, onUpdateAndSync`,
  `setFullscreen, onUpdateAndSync, onGhostSync`
);
wbCode = wbCode.replace(
  `const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {`,
  `const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'select' && selectedSketchId && startPoint && isDrawing && onGhostSync) {
      const point = snapCoords(getPoint(e));
      const dx = point.x - snapCoords(startPoint).x;
      const dy = point.y - snapCoords(startPoint).y;
      onGhostSync({ sketchId: selectedSketchId, dx, dy });
    }
    `
);
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', wbCode);

// Patch SVGPathEditor
let svgCode = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');
svgCode = svgCode.replace(
  `interface SVGPathEditorProps {`,
  `interface SVGPathEditorProps {
  onGhostSync?: (ghostData: any) => void;`
);
svgCode = svgCode.replace(
  `fullscreen, setFullscreen }: SVGPathEditorProps`,
  `fullscreen, setFullscreen, onGhostSync }: SVGPathEditorProps`
);
svgCode = svgCode.replace(
  `const handleTouchMove = (e: any) => {`,
  `const handleTouchMove = (e: any) => {
    if (draggedNode && onGhostSync) {
      const rect = (editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current)?.getBoundingClientRect();
      if (rect) {
        const { x, y } = getEventCoords(e.touches[0], rect);
        onGhostSync({ nodeId: draggedNode, x, y, mode: editorMode });
      }
    }
    `
);
svgCode = svgCode.replace(
  `const handleMouseMove = (e: any) => {`,
  `const handleMouseMove = (e: any) => {
    if (draggedNode && onGhostSync) {
      const rect = (editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current)?.getBoundingClientRect();
      if (rect) {
        const { x, y } = getEventCoords(e, rect);
        onGhostSync({ nodeId: draggedNode, x, y, mode: editorMode });
      }
    }
    `
);
fs.writeFileSync('src/components/SVGPathEditor.tsx', svgCode);

