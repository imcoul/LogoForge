const fs = require('fs');
let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf8');

code = code.replace(
  `    if (e.touches.length === 1) {
      const coords = getEventCoords(e, rect);
      if (!coords) return;

      // Single finger panning is active only if we are in Brush and holding down without drawing active,
      // or we are simply navigating. To make it seamless: if drawTool is active we draw, if not we pan.
      if (drawTool === 'brush') {`,
  `    if (e.touches.length === 1) {
      const coords = getEventCoords(e, rect);
      if (!coords) return;

      if (editorMode === 'coordinate') {
        setIsPanning(true);
        setPanStart({ x: coords.clientX - panOffset.x, y: coords.clientY - panOffset.y });
        return;
      }

      if (drawTool === 'brush') {`
);

code = code.replace(
  `    if (e.touches.length === 1 && isDrawing && drawTool === 'brush') {
      e.preventDefault();
      const coords = getEventCoords(e, rect);
      if (!coords) return;

      const lastPoint = brushPoints[brushPoints.length - 1];
      if (!lastPoint || Math.abs(lastPoint.x - coords.x) > 1.5 || Math.abs(lastPoint.y - coords.y) > 1.5) {
        setBrushPoints((prev) => [...prev, { x: coords.x, y: coords.y }]);
      }
    }`,
  `    if (e.touches.length === 1) {
      if (isPanning) {
        e.preventDefault();
        setPanOffset({
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y
        });
        return;
      }
      
      if (isDrawing && drawTool === 'brush') {
        e.preventDefault();
        const coords = getEventCoords(e, rect);
        if (!coords) return;

        const lastPoint = brushPoints[brushPoints.length - 1];
        if (!lastPoint || Math.abs(lastPoint.x - coords.x) > 1.5 || Math.abs(lastPoint.y - coords.y) > 1.5) {
          setBrushPoints((prev) => [...prev, { x: coords.x, y: coords.y }]);
        }
      }
    }`
);

code = code.replace(
  `  // Handle Touch ends
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      setInitialDistance(null);
      setSwipeStartX(null);
    }

    if (drawTool === 'brush' && isDrawing && brushPoints.length > 1) {`,
  `  // Handle Touch ends
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      setInitialDistance(null);
      setSwipeStartX(null);
    }
    
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (drawTool === 'brush' && isDrawing && brushPoints.length > 1) {`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
