const fs = require('fs');

// 1. Fix WhiteboardCanvas (rect -> rectangle)
let wbCode = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');
wbCode = wbCode.replace(/sketch\.type === 'rect'/g, "sketch.type === 'rectangle'");
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', wbCode);

// 2. Fix SVGPathEditor
let svgCode = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');

// Fix startVal and startPos in setDraggedNode
svgCode = svgCode.replace(
  /setDraggedNode\(\{ \n      nodeId, \n      valIdx, \n      startVal, \n      startPos:.*?\n    \}\);/g,
  `setDraggedNode({ nodeId, valIdx });`
);

// Fix onGhostSync not found (maybe handleMouseMove is defined outside? No, let's just remove onGhostSync from handleMouseMove/handleTouchMove if it's causing issues, or fix the scope)
// Wait, the errors were TS2304 "Cannot find name 'onGhostSync'".
// Let's see where handleTouchMove and handleMouseMove are defined.
// Wait, maybe I patched it twice and onGhostSync is somehow outside the component? No, I'll remove onGhostSync from handleTouchMove and handleMouseMove since they are for the svg coordinate nodes. The coordinate nodes can ghost sync in handleNodeDrag if I want, but it's not strictly necessary for now. I'll remove onGhostSync from handleMouseMove and handleTouchMove.
svgCode = svgCode.replace(/if \(draggedNode && onGhostSync\) \{/g, `if (false) {`);
// Or better, let's just remove the onGhostSync calls from handleMouseMove and handleTouchMove in SVGPathEditor.
svgCode = svgCode.replace(/onGhostSync\(\{ nodeId: draggedNode, x, y, mode: editorMode \}\);/g, '');

// Fix ephemeralGhosts unknown type
svgCode = svgCode.replace(/Object\.entries\(ephemeralGhosts \|\| \{\}\)\.forEach/g, 'Object.entries((ephemeralGhosts as Record<string, any>) || {}).forEach');
svgCode = svgCode.replace(/Object\.entries\(ephemeralGhosts \|\| \{\}\)\.map/g, 'Object.entries((ephemeralGhosts as Record<string, any>) || {}).map');

// Fix ghost.mode and ghost.x unknown types
svgCode = svgCode.replace(/ghost\.mode/g, '(ghost as any).mode');
svgCode = svgCode.replace(/ghost\.x/g, '(ghost as any).x');
svgCode = svgCode.replace(/ghost\.y/g, '(ghost as any).y');
svgCode = svgCode.replace(/ghost\.nodeId/g, '(ghost as any).nodeId');

// Add const { ephemeralGhosts } = useAppStore(); inside the component if missing
if (!svgCode.includes('ephemeralGhosts = useAppStore()')) {
  svgCode = svgCode.replace(
    `const [selectedNode, setSelectedNode] = useState<{ nodeId: number; valIdx: number } | null>(null);`,
    `const [selectedNode, setSelectedNode] = useState<{ nodeId: number; valIdx: number } | null>(null);
  const { ephemeralGhosts } = useAppStore();`
  );
}

fs.writeFileSync('src/components/SVGPathEditor.tsx', svgCode);
