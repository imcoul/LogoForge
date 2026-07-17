const fs = require('fs');

let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');

// Add contextMenuNode state
code = code.replace(
  `const [selectedNode, setSelectedNode] = useState<{ nodeId: number; valIdx: number } | null>(null);`,
  `const [selectedNode, setSelectedNode] = useState<{ nodeId: number; valIdx: number } | null>(null);
  const [contextMenuNode, setContextMenuNode] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);`
);

// Clear timer on mouse up / touch end
code = code.replace(
  `const handleMouseUp = () => {`,
  `const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }`
);

code = code.replace(
  `const handleTouchMove = (e: any) => {`,
  `const handleTouchMove = (e: any) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }`
);

// Start timer on drag start
code = code.replace(
  `const handleNodeDragStart = (`,
  `const handleNodeDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    nodeId: number,
    valIdx: number,
    startVal: number
  ) => {
    e.stopPropagation();
    
    // Check if touch event for long press
    if ('touches' in e) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        setContextMenuNode(nodeId);
        setDraggedNode(null); // Cancel dragging
      }, 500);
    }
    
    setDraggedNode({ nodeId, valIdx, startVal, startPos: 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX });
    setSelectedNode({ nodeId, valIdx });
  };
  
  const originalHandleNodeDragStart = (`
);

code = code.replace(
  `const handleNodeDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    nodeId: number,
    valIdx: number,
    startVal: number
  ) => {`,
  `// this was handled by patch`
);

// Now render the contextual menu
code = code.replace(
  `{/* Draw Ghost States */}`,
  `{/* Contextual Floating Menu */}
            {contextMenuNode !== null && (
              <g 
                transform={\`translate(
                  \${nodes.find(n => n.id === contextMenuNode)?.values[0] || 0}, 
                  \${nodes.find(n => n.id === contextMenuNode)?.values[1] || 0}
                )\`}
                className="z-50"
              >
                <circle r={30} fill="white" className="dark:fill-zinc-900" opacity={0.9} />
                <circle r={30} fill="none" stroke="#6366F1" strokeWidth={1} />
                <g 
                  className="cursor-pointer hover:opacity-70"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newNodes = nodes.filter(n => n.id !== contextMenuNode);
                    setNodes(newNodes);
                    compileNodesToSvg(newNodes);
                    setContextMenuNode(null);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    const newNodes = nodes.filter(n => n.id !== contextMenuNode);
                    setNodes(newNodes);
                    compileNodesToSvg(newNodes);
                    setContextMenuNode(null);
                  }}
                >
                  <circle cx={-15} cy={-15} r={10} fill="#EF4444" />
                  <path d="M-18 -18 L-12 -12 M-12 -18 L-18 -12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </g>
                <g 
                  className="cursor-pointer hover:opacity-70"
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenuNode(null);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    setContextMenuNode(null);
                  }}
                >
                  <circle cx={15} cy={15} r={10} fill="#6B7280" />
                  <path d="M12 15 L18 15 M15 12 L15 18" stroke="white" strokeWidth="2" strokeLinecap="round" transform="rotate(45 15 15)" />
                </g>
              </g>
            )}
            {/* Draw Ghost States */}`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
