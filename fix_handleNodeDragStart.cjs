const fs = require('fs');

let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf-8');

// Replace the messed up block
code = code.replace(
  /\/\/ this was handled by patch[\s\S]*?triggerHaptic\(20\);\n  };/m,
  `const handleNodeDragStart = (
    e: React.MouseEvent | React.TouchEvent | any,
    nodeId: number,
    valIdx: number,
    startVal: number
  ) => {
    e.stopPropagation();
    
    if (e && 'touches' in e) {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        setContextMenuNode(nodeId);
        setDraggedNode(null); 
      }, 500);
    }
    
    setDraggedNode({ 
      nodeId, 
      valIdx, 
      startVal, 
      startPos: (e && 'touches' in e && e.touches && e.touches[0]) ? e.touches[0].clientX : (e as React.MouseEvent)?.clientX || 0 
    });
    setSelectedNode({ nodeId, valIdx });
    triggerHaptic(20);
  };`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);

