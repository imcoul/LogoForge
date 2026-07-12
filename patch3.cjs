const fs = require('fs');
let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf8');

function replaceCanvasRef(funcName, textToReplace) {
  code = code.replace(textToReplace, 
    textToReplace.replace(/canvasRef\.current/g, "(editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current)")
  );
}

replaceCanvasRef('handleTouchStart', `  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !actualSvgSource) return;

    const rect = canvasRef.current.getBoundingClientRect();`);

replaceCanvasRef('handleTouchMove', `  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();`);

replaceCanvasRef('handleMouseDown', `  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !actualSvgSource) return;
    const rect = canvasRef.current.getBoundingClientRect();`);

replaceCanvasRef('handleMouseMove', `  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();`);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
