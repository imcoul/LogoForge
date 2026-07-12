// SVGPathEditor.tsx - Premium Mobile-First SVG Vector Path Editor & Drawing Sketchpad
import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, Edit2, Sliders, ChevronRight, Zap, Trash2, 
  Plus, MousePointer, Paintbrush, Circle, Palette, 
  Sparkles, Check, RotateCcw, Move, LayoutGrid,
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, HelpCircle
} from 'lucide-react';
import DOMPurify from 'dompurify';

const sanitizeSVG = (svg: string | null): string => {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
  });
};

interface SVGPathEditorProps {
  svgSource?: string | null;
  svgContent?: string | null;
  onUpdateSvg?: (newSvg: string) => void;
  onChange?: (newSvg: string) => void;
}

interface ParsedPath {
  index: number;
  raw: string;
  d: string;
  stroke: string;
  fill: string;
  strokeWidth: number;
}

interface PathNode {
  id: number;
  type: string;
  values: number[];
}

export const SVGPathEditor: React.FC<SVGPathEditorProps> = ({
  svgSource,
  svgContent,
  onUpdateSvg,
  onChange
}) => {
  // Map compatible props safely
  const actualSvgSource = svgSource !== undefined ? svgSource : (svgContent || null);
  const actualOnUpdateSvg = onUpdateSvg || onChange;

  // Editor Mode: 'draw' (manual draw pad) | 'coordinate' (coordinate tuning)
  const [editorMode, setEditorMode] = useState<'draw' | 'coordinate'>('draw');
  
  // Drawing sub-tool: 'brush' (freehand) | 'bezier' (cubic Bezier curves) | 'pen' (vector dots) | 'shapes' (injection)
  const [drawTool, setDrawTool] = useState<'brush' | 'bezier' | 'pen' | 'shapes'>('brush');
  
  // Canvas Transform states (Pinch-to-zoom & Pan layer)
  const [zoom, setZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch Gesture tracking state (zoom & swipe)
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState<number>(1);
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [gestureToast, setGestureToast] = useState<string | null>(null);

  // Active styling state for new elements
  const [activeStrokeColor, setActiveStrokeColor] = useState<string>('#6366F1');
  const [activeFillColor, setActiveFillColor] = useState<string>('none');
  const [activeStrokeWidth, setActiveStrokeWidth] = useState<number>(4);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Parse path state
  const [parsedPaths, setParsedPaths] = useState<ParsedPath[]>([]);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [precision, setPrecision] = useState<number>(1);

  // Bezier Tap-to-Draw state
  const [bezierPoints, setBezierPoints] = useState<{ x: number; y: number }[]>([]);
  const [closeBezierLoop, setCloseBezierLoop] = useState<boolean>(false);

  // Local drawing session tracking
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [brushPoints, setBrushPoints] = useState<{ x: number; y: number }[]>([]);
  const [penPoints, setPenPoints] = useState<{ x: number; y: number }[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const coordCanvasRef = useRef<HTMLDivElement>(null);

  // Magnifier Loupe state for Precision node dragging
  const [draggedNode, setDraggedNode] = useState<{ nodeId: number; valIdx: number } | null>(null);
  const [loupeCoords, setLoupeCoords] = useState<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const [snappingLines, setSnappingLines] = useState<{ x?: number; y?: number } | null>(null);
  const [showGestureMap, setShowGestureMap] = useState<boolean>(false);

  // Local undo/redo stacks
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const colorsList = [
    { name: 'Indigo', hex: '#6366F1' },
    { name: 'Emerald', hex: '#10B981' },
    { name: 'Rose', hex: '#F43F5E' },
    { name: 'Amber', hex: '#F59E0B' },
    { name: 'Cyan', hex: '#06B6D4' },
    { name: 'Charcoal', hex: '#1E293B' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Transparent', hex: 'none' }
  ];

  // Quick Shape presets
  const shapePresets = [
    { name: 'Shield Security', d: 'M 60,50 L 140,50 C 140,110 100,160 100,160 C 100,160 60,110 60,50 Z' },
    { name: 'Organic Leaf', d: 'M 60,140 C 60,80 100,50 100,50 C 100,50 140,80 140,140 C 140,140 100,140 60,140 Z' },
    { name: 'Star Mark', d: 'M 100,40 L 115,80 L 155,80 L 123,105 L 135,145 L 100,120 L 65,145 L 77,105 L 45,80 L 85,80 Z' },
    { name: 'Modern Hexagon', d: 'M 100,30 L 155,60 L 155,130 L 100,165 L 45,130 L 45,60 Z' },
    { name: 'Infinity Tech', d: 'M 70,100 C 40,70 40,130 70,100 C 100,70 100,130 130,100 C 160,70 160,130 130,100 C 100,70 100,130 70,100' },
    { name: 'Diamond Crest', d: 'M 100,40 L 150,100 L 100,160 L 50,100 Z' }
  ];

  // Helper: Trigger mobile haptic feedback safely
  const triggerHaptic = (pattern: number | number[] = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Suppress restriction or frame permission warnings silently
      }
    }
  };

  // Helper: Retrieve attribute values from raw path tag
  const getAttr = (tag: string, attr: string, fallback: string): string => {
    const match = new RegExp(`${attr}="([^"]*)"`).exec(tag);
    return match ? match[1] : fallback;
  };

  // Synchronize internal paths list on external svgSource updates
  useEffect(() => {
    if (!actualSvgSource) {
      setParsedPaths([]);
      return;
    }

    const regex = /<path([^>]+)\/?>/g;
    const pathsList: ParsedPath[] = [];
    let match;
    let index = 0;

    while ((match = regex.exec(actualSvgSource)) !== null) {
      const fullTag = match[0];
      const attrs = match[1];
      const d = getAttr(attrs, 'd', '');
      const stroke = getAttr(attrs, 'stroke', 'none');
      const fill = getAttr(attrs, 'fill', 'none');
      const strokeWidthStr = getAttr(attrs, 'stroke-width', '2');
      const strokeWidth = parseFloat(strokeWidthStr) || 2;

      pathsList.push({
        index,
        raw: fullTag,
        d,
        stroke,
        fill,
        strokeWidth
      });
      index++;
    }

    setParsedPaths(pathsList);
    if (pathsList.length > 0 && selectedPathIndex >= pathsList.length) {
      setSelectedPathIndex(0);
    }
  }, [actualSvgSource, selectedPathIndex]);

  // Parse path coordinates when selected path changes
  useEffect(() => {
    if (parsedPaths.length === 0 || !parsedPaths[selectedPathIndex]) {
      setNodes([]);
      return;
    }

    const pathString = parsedPaths[selectedPathIndex].d;
    const tokens = pathString.match(/[a-df-z]|[+-]?\d+(?:\.\d+)?/gi) || [];

    const parsedNodes: PathNode[] = [];
    let currentNodeType = 'M';
    let valuesAcc: number[] = [];
    let nodeIdCounter = 0;

    tokens.forEach((token) => {
      if (isNaN(Number(token))) {
        if (valuesAcc.length > 0 || parsedNodes.length === 0) {
          if (parsedNodes.length > 0 || valuesAcc.length > 0) {
            parsedNodes.push({
              id: nodeIdCounter++,
              type: currentNodeType,
              values: valuesAcc
            });
          }
          valuesAcc = [];
        }
        currentNodeType = token;
      } else {
        valuesAcc.push(Number(token));
      }
    });

    if (valuesAcc.length > 0) {
      parsedNodes.push({
        id: nodeIdCounter++,
        type: currentNodeType,
        values: valuesAcc
      });
    }

    setNodes(parsedNodes);
  }, [parsedPaths, selectedPathIndex]);

  // Push new SVG to parent and update internal undo history
  const pushSvgChange = (nextSvg: string) => {
    if (!actualOnUpdateSvg || !actualSvgSource) return;
    if (nextSvg === actualSvgSource) return;

    // Track state for Touch Undo/Redo
    setUndoStack((prev) => [...prev, actualSvgSource]);
    setRedoStack([]); // Clear redo on fresh manual action

    actualOnUpdateSvg(nextSvg);
  };

  // Undo manual design actions (Triggered via toolbar or two-finger swipe)
  const handleUndo = () => {
    if (undoStack.length === 0 || !actualSvgSource || !actualOnUpdateSvg) {
      triggerHaptic(40);
      return;
    }
    triggerHaptic(25);
    const prevSvg = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, actualSvgSource]);
    actualOnUpdateSvg(prevSvg);

    setGestureToast('🔄 Undo Action');
    setTimeout(() => setGestureToast(null), 1200);
  };

  // Redo manual design actions (Triggered via toolbar or two-finger swipe)
  const handleRedo = () => {
    if (redoStack.length === 0 || !actualSvgSource || !actualOnUpdateSvg) {
      triggerHaptic(40);
      return;
    }
    triggerHaptic(25);
    const nextSvg = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, actualSvgSource]);
    actualOnUpdateSvg(nextSvg);

    setGestureToast('➡️ Redo Action');
    setTimeout(() => setGestureToast(null), 1200);
  };

  // Handle manual coordinate changes via sliders/inputs
  const handleValueChange = (nodeId: number, valIdx: number, newVal: number) => {
    const updatedNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        const nextVals = [...node.values];
        nextVals[valIdx] = parseFloat(newVal.toFixed(precision));
        return { ...node, values: nextVals };
      }
      return node;
    });

    setNodes(updatedNodes);
    reconstructSvgFromNodes(updatedNodes);
  };

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reconstruct SVG source from nodes
  const reconstructSvgFromNodes = (currentNodes: PathNode[]) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (!actualSvgSource || parsedPaths.length === 0) return;

      const newPathString = currentNodes
        .map((n) => `${n.type}${n.values.join(',')}`)
        .join(' ');

      updatePathAtIndex(selectedPathIndex, { d: newPathString });
    }, 150);
  };

  // Re-write path attributes for a selected index and broadcast changes
  const updatePathAtIndex = (indexToUpdate: number, newAttrs: Partial<ParsedPath>) => {
    if (!actualSvgSource || !actualOnUpdateSvg) return;

    let index = 0;
    const regex = /<path([^>]+)\/?>/g;
    
    const newSvg = actualSvgSource.replace(regex, (match) => {
      if (index === indexToUpdate) {
        const updated = { ...parsedPaths[indexToUpdate], ...newAttrs };
        const strokeAttr = updated.stroke && updated.stroke !== 'none' ? ` stroke="${updated.stroke}"` : '';
        const fillAttr = updated.fill && updated.fill !== 'none' ? ` fill="${updated.fill}"` : ' fill="none"';
        const strokeWidthAttr = updated.stroke && updated.stroke !== 'none' ? ` stroke-width="${updated.strokeWidth}"` : '';
        
        const newTag = `<path d="${updated.d}"${strokeAttr}${fillAttr}${strokeWidthAttr} stroke-linecap="round" stroke-linejoin="round" />`;
        index++;
        return newTag;
      }
      index++;
      return match;
    });

    pushSvgChange(newSvg);
  };

  // Push brand background updates safely
  const handleBgColorUpdate = (colorHex: string) => {
    if (!actualSvgSource || !actualOnUpdateSvg) return;
    const rectRegex = /<rect width="100%" height="100%" fill="([^"]+)"/g;
    let nextSvg = '';
    if (rectRegex.test(actualSvgSource)) {
      nextSvg = actualSvgSource.replace(rectRegex, `<rect width="100%" height="100%" fill="${colorHex}"`);
    } else {
      const svgOpenTag = /<svg([^>]+)>/;
      nextSvg = actualSvgSource.replace(svgOpenTag, `<svg$1>\n  <rect width="100%" height="100%" fill="${colorHex}" rx="16"/>`);
    }
    pushSvgChange(nextSvg);
  };

  // Delete path element from SVG list
  const handleDeletePath = (targetIndex: number) => {
    if (!actualSvgSource || !actualOnUpdateSvg) return;

    let index = 0;
    const regex = /<path([^>]+)\/?>/g;
    const newSvg = actualSvgSource.replace(regex, (match) => {
      const replaceContent = index === targetIndex ? '' : match;
      index++;
      return replaceContent;
    });

    pushSvgChange(newSvg);
    if (selectedPathIndex >= parsedPaths.length - 1) {
      setSelectedPathIndex(Math.max(0, parsedPaths.length - 2));
    }
  };

  // Initialize brand canvas manually from fresh slate
  const handleInitBlankCanvas = (bgColor: string) => {
    if (!actualOnUpdateSvg) return;
    const freshSvg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="${bgColor}" rx="16"/>
  <path d="M60,100 L140,100" stroke="#6366F1" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;
    pushSvgChange(freshSvg);
    setSelectedPathIndex(0);
  };

  // Clear all paths inside the current canvas
  const handleClearAllPaths = () => {
    if (!actualSvgSource || !actualOnUpdateSvg) return;
    const cleanSvg = actualSvgSource.replace(/<path([^>]+)\/?>/g, '');
    pushSvgChange(cleanSvg);
    setParsedPaths([]);
    setSelectedPathIndex(0);
  };

  // Translate entire active path coordinates
  const handleTranslatePath = (dx: number, dy: number) => {
    const shifted = nodes.map((node) => {
      const shiftedVals = node.values.map((val, idx) => {
        if (idx % 2 === 0) return val + dx;
        return val + dy;
      });
      return { ...node, values: shiftedVals };
    });

    setNodes(shifted);
    reconstructSvgFromNodes(shifted);
  };

  // Simplify coordinates with node rounding
  const handleAutoSimplify = () => {
    const simplified = nodes.map((node) => {
      const roundedVals = node.values.map((val) => {
        const factor = Math.pow(10, precision);
        return Math.round(val * factor) / factor;
      });
      return { ...node, values: roundedVals };
    });

    setNodes(simplified);
    reconstructSvgFromNodes(simplified);
  };

  // Map client/screen coords to 200x200 canvas coords taking panOffset & zoom into account
  const getEventCoords = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
    rect: DOMRect
  ) => {
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Relative coordinates within the container element
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    // Inverse pan and zoom formulas to find coordinate on the 200x200 SVG canvas
    // Canvas is centered inside the rect. Width of 200 matches the visual bounds.
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const canvasX = ((relX - centerX - panOffset.x) / zoom) + centerX;
    const canvasY = ((relY - centerY - panOffset.y) / zoom) + centerY;

    const x = Math.round((canvasX / rect.width) * 200);
    const y = Math.round((canvasY / rect.height) * 200);

    return {
      x: Math.max(0, Math.min(200, x)),
      y: Math.max(0, Math.min(200, y)),
      clientX,
      clientY
    };
  };

  // Handle touch starts on drawing board (panning, swiping, zooming, drawing)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!(editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current) || !actualSvgSource) return;

    const rect = (editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current).getBoundingClientRect();

    if (e.touches.length === 3) {
      // 3-Finger horizontal swipe tracking
      e.preventDefault();
      setIsDrawing(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const t3 = e.touches[2];

      const midX = (t1.clientX + t2.clientX + t3.clientX) / 3;
      const midY = (t1.clientY + t2.clientY + t3.clientY) / 3;

      setSwipeStartX(midX);
      setSwipeStartY(midY);
      return;
    }

    if (e.touches.length === 2) {
      // 2-Finger Pinch Zoom and horizontal swipe start
      e.preventDefault();
      setIsDrawing(false);

      const t1 = e.touches[0];
      const t2 = e.touches[1];

      // Calculate initial pinch distance
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      setInitialDistance(dist);
      setInitialZoom(zoom);

      // Save initial pan for dual touch drag panning
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      setPanStart({ x: midX - panOffset.x, y: midY - panOffset.y });

      // Track horizontal swipes
      setSwipeStartX(midX);
      setSwipeStartY(midY);
      return;
    }

    if (e.touches.length === 1) {
      const coords = getEventCoords(e, rect);
      if (!coords) return;

      if (editorMode === 'coordinate') {
        setIsPanning(true);
        setPanStart({ x: coords.clientX - panOffset.x, y: coords.clientY - panOffset.y });
        return;
      }

      if (drawTool === 'brush') {
        setIsDrawing(true);
        setBrushPoints([{ x: coords.x, y: coords.y }]);
      } else if (drawTool === 'bezier') {
        // Automatically append point to cubic Bezier list on single touch tap
        const nextPoints = [...bezierPoints, { x: coords.x, y: coords.y }];
        setBezierPoints(nextPoints);
        triggerHaptic(15);
      } else if (drawTool === 'pen') {
        const updatedPenPoints = [...penPoints, { x: coords.x, y: coords.y }];
        setPenPoints(updatedPenPoints);
        triggerHaptic(15);

        if (updatedPenPoints.length > 1) {
          const penD = buildPathD(updatedPenPoints);
          appendOrUpdatePathInSvg(penD);
        }
      }
    }
  };

  // Handle Touch moves
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!(editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current)) return;
    const rect = (editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current).getBoundingClientRect();

    if (e.touches.length === 3 && swipeStartX !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const t3 = e.touches[2];

      const midX = (t1.clientX + t2.clientX + t3.clientX) / 3;
      const midY = (t1.clientY + t2.clientY + t3.clientY) / 3;

      const deltaX = midX - swipeStartX;
      const deltaY = midY - (swipeStartY || midY);

      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 40) {
        if (deltaX > 50) {
          handleUndo();
          setGestureToast("↩️ Undo");
        } else {
          handleRedo();
          setGestureToast("↪️ Redo");
        }
        setTimeout(() => setGestureToast(null), 1000);
        setSwipeStartX(null);
      }
      return;
    }

    if (e.touches.length === 2 && initialDistance !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      // 1. Zoom calculation (Pinch)
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const zoomFactor = currentDist / initialDistance;
      const nextZoom = Math.max(0.5, Math.min(5, initialZoom * zoomFactor));
      setZoom(nextZoom);

      // 2. Pan calculation (Dual drag)
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      setPanOffset({
        x: midX - panStart.x,
        y: midY - panStart.y
      });

      // 3. Two-finger horizontal swipe tracking for Undo/Redo
      if (swipeStartX !== null) {
        const deltaX = midX - swipeStartX;
        const deltaY = midY - (swipeStartY || midY);
        // Ensure swipe is mostly horizontal
        if (Math.abs(deltaX) > 70 && Math.abs(deltaY) < 40) {
          if (deltaX > 70) {
            handleUndo();
            setGestureToast("↩️ Undo");
          } else {
            handleRedo();
            setGestureToast("↪️ Redo");
          }
          setTimeout(() => setGestureToast(null), 1000);
          // Reset swipeStartX so it doesn't double trigger in the same swipe gesture
          setSwipeStartX(null);
        }
      }
      return;
    }

    if (e.touches.length === 1) {
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
    }
  };

  // Handle Touch ends
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      setInitialDistance(null);
      setSwipeStartX(null);
    }
    
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (drawTool === 'brush' && isDrawing && brushPoints.length > 1) {
      const brushD = buildPathD(brushPoints);
      appendPathToSvgSource(brushD);
    }
    setIsDrawing(false);
    setBrushPoints([]);
  };

  // Handle Desktop Mouse Event Start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!(editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current) || !actualSvgSource) return;
    const rect = (editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current).getBoundingClientRect();
    const coords = getEventCoords(e, rect);
    if (!coords) return;

    if (e.button === 1 || e.shiftKey || editorMode === 'coordinate') {
      // Middle click or Shift + Drag pans (or any click in coordinate mode background)
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (drawTool === 'brush') {
      setIsDrawing(true);
      setBrushPoints([{ x: coords.x, y: coords.y }]);
    } else if (drawTool === 'bezier') {
      // Automatic cubic bezier point placement
      const nextPoints = [...bezierPoints, { x: coords.x, y: coords.y }];
      setBezierPoints(nextPoints);
      triggerHaptic(15);
    } else if (drawTool === 'pen') {
      const updatedPenPoints = [...penPoints, { x: coords.x, y: coords.y }];
      setPenPoints(updatedPenPoints);
      triggerHaptic(15);
      
      if (updatedPenPoints.length > 1) {
        const penD = buildPathD(updatedPenPoints);
        appendOrUpdatePathInSvg(penD);
      }
    }
  };

  // Handle Desktop Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!(editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current)) return;
    const rect = (editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current).getBoundingClientRect();

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (isDrawing && drawTool === 'brush') {
      const coords = getEventCoords(e, rect);
      if (!coords) return;

      const lastPoint = brushPoints[brushPoints.length - 1];
      if (!lastPoint || Math.abs(lastPoint.x - coords.x) > 1.5 || Math.abs(lastPoint.y - coords.y) > 1.5) {
        setBrushPoints((prev) => [...prev, { x: coords.x, y: coords.y }]);
      }
    }
  };

  // Handle Desktop Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (drawTool === 'brush' && isDrawing && brushPoints.length > 1) {
      const brushD = buildPathD(brushPoints);
      appendPathToSvgSource(brushD);
    }
    setIsDrawing(false);
    setBrushPoints([]);
  };

  // Helper: Build basic path 'd' string from point arrays (straight lines)
  const buildPathD = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x},${pts[i].y}`;
    }
    return d;
  };

  // Generates smooth cubic Bezier path from a set of points (Catmull-Rom math formula)
  const generateCubicBezierPath = (pts: { x: number; y: number }[], closed = false): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    if (pts.length === 2) {
      let d = `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
      if (closed) d += ' Z';
      return d;
    }
    
    let d = `M ${pts[0].x},${pts[0].y}`;
    const tension = 0.25; // curate flow smoothness
    const count = pts.length;
    
    for (let i = 0; i < (closed ? count : count - 1); i++) {
      const p1 = pts[i % count];
      const p2 = pts[(i + 1) % count];
      const p0 = pts[(i - 1 + count) % count];
      const p3 = pts[(i + 2) % count];
      
      const cp1x = Math.round(p1.x + (p2.x - p0.x) * tension);
      const cp1y = Math.round(p1.y + (p2.y - p0.y) * tension);
      const cp2x = Math.round(p2.x - (p3.x - p1.x) * tension);
      const cp2y = Math.round(p2.y - (p3.y - p1.y) * tension);
      
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    
    if (closed) {
      d += ' Z';
    }
    return d;
  };

  // Add the newly created Cubic Bezier curve to the SVG file
  const handleLockBezierPath = () => {
    if (bezierPoints.length < 2) return;
    const bezierD = generateCubicBezierPath(bezierPoints, closeBezierLoop);
    appendPathToSvgSource(bezierD);
    setBezierPoints([]);
    triggerHaptic([30, 60]);
  };

  // Append new manual vector path string to current XML source
  const appendPathToSvgSource = (pathData: string) => {
    if (!actualSvgSource || !actualOnUpdateSvg) return;

    const strokeAttr = activeStrokeColor !== 'none' ? ` stroke="${activeStrokeColor}"` : '';
    const fillAttr = activeFillColor !== 'none' ? ` fill="${activeFillColor}"` : ' fill="none"';
    const strokeWidthAttr = activeStrokeColor !== 'none' ? ` stroke-width="${activeStrokeWidth}"` : '';

    const newPathTag = `<path d="${pathData}"${strokeAttr}${fillAttr}${strokeWidthAttr} stroke-linecap="round" stroke-linejoin="round" />`;
    
    const closeTagIndex = actualSvgSource.lastIndexOf('</svg>');
    if (closeTagIndex === -1) return;

    const updatedSvg = actualSvgSource.slice(0, closeTagIndex) + '\n  ' + newPathTag + '\n' + actualSvgSource.slice(closeTagIndex);
    pushSvgChange(updatedSvg);
  };

  // Pen tool live editor
  const appendOrUpdatePathInSvg = (pathData: string) => {
    appendPathToSvgSource(pathData);
  };

  // Complete and save Pen points path element
  const handleFinishPenPath = () => {
    if (penPoints.length < 2) {
      setPenPoints([]);
      return;
    }
    const penD = buildPathD(penPoints);
    appendPathToSvgSource(penD);
    setPenPoints([]);
    triggerHaptic([20, 40]);
  };

  // Inject beautiful premade geometric brand shapes
  const handleInjectShapePreset = (shapeD: string) => {
    appendPathToSvgSource(shapeD);
    triggerHaptic(20);
  };

  // Interactive coordinate handle drag start (Precision Tab)
  const handleNodeKeyDown = (e: React.KeyboardEvent, nodeId: number, valIdx: number, val: number) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      let newVal = val;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') newVal -= 1;
      else newVal += 1;
      handleValueChange(nodeId, valIdx, newVal);
    }
  };

  const handleNodeDragStart = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, 
    nodeId: number, 
    valIdx: number, 
    initialVal: number
  ) => {
    e.stopPropagation();
    setDraggedNode({ nodeId, valIdx });
    triggerHaptic(20);
  };

  // Interactive coordinate handle dragging with Magnifier Loupe calculation and path-snapping behavior
  useEffect(() => {
    if (draggedNode === null) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      const activeRef = editorMode === 'coordinate' ? coordCanvasRef.current : canvasRef.current;
      if (!activeRef || draggedNode === null) return;

      const rect = activeRef.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // Calculate relative coordinates
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      const canvasX = ((relX - centerX - panOffset.x) / zoom) + centerX;
      const canvasY = ((relY - centerY - panOffset.y) / zoom) + centerY;

      const rawX = Math.round((canvasX / rect.width) * 200);
      const rawY = Math.round((canvasY / rect.height) * 200);

      // Now apply Snapping!
      let snapThreshold = 4;
      let finalX = Math.max(0, Math.min(200, rawX));
      let finalY = Math.max(0, Math.min(200, rawY));
      let isSnappedX = false;
      let isSnappedY = false;

      // Snapping guide list
      const snapGridPoints = [0, 25, 50, 75, 100, 125, 150, 175, 200];

      // 1. Grid snap check
      for (const gp of snapGridPoints) {
        if (Math.abs(finalX - gp) <= snapThreshold) {
          finalX = gp;
          isSnappedX = true;
          break;
        }
      }
      for (const gp of snapGridPoints) {
        if (Math.abs(finalY - gp) <= snapThreshold) {
          finalY = gp;
          isSnappedY = true;
          break;
        }
      }

      // 2. Symmetrical/Matching check with other nodes
      nodes.forEach((otherNode) => {
        if (otherNode.id !== draggedNode.nodeId) {
          otherNode.values.forEach((otherVal, otherIdx) => {
            const isOtherX = otherIdx % 2 === 0;
            if (isOtherX) {
              if (Math.abs(finalX - otherVal) <= snapThreshold) {
                finalX = otherVal;
                isSnappedX = true;
              }
              const symX = 200 - otherVal;
              if (Math.abs(finalX - symX) <= snapThreshold) {
                finalX = symX;
                isSnappedX = true;
              }
            } else {
              if (Math.abs(finalY - otherVal) <= snapThreshold) {
                finalY = otherVal;
                isSnappedY = true;
              }
              const symY = 200 - otherVal;
              if (Math.abs(finalY - symY) <= snapThreshold) {
                finalY = symY;
                isSnappedY = true;
              }
            }
          });
        }
      });

      // Gentle haptic hum when snap occurs
      if (isSnappedX || isSnappedY) {
        triggerHaptic(5);
      } else {
        triggerHaptic(8);
      }

      // Store snapping line state
      setSnappingLines({
        x: isSnappedX ? finalX : undefined,
        y: isSnappedY ? finalY : undefined
      });

      // Set Loupe rendering state
      setLoupeCoords({
        x: finalX,
        y: finalY,
        clientX,
        clientY
      });

      // Now update the coordinate values
      const updatedNodes = nodes.map((node) => {
        if (node.id === draggedNode.nodeId) {
          const nextVals = [...node.values];
          
          if (editorMode === 'coordinate') {
            // Dragging on 2D visual coordinate canvas: update BOTH X and Y values
            const baseIdx = draggedNode.valIdx;
            nextVals[baseIdx] = parseFloat(finalX.toFixed(precision));
            if (baseIdx + 1 < nextVals.length) {
              nextVals[baseIdx + 1] = parseFloat(finalY.toFixed(precision));
            }
          } else {
            // Dragging on 1D range slider
            const targetVal = draggedNode.valIdx % 2 === 0 ? finalX : finalY;
            nextVals[draggedNode.valIdx] = parseFloat(targetVal.toFixed(precision));
          }
          return { ...node, values: nextVals };
        }
        return node;
      });

      setNodes(updatedNodes);
      reconstructSvgFromNodes(updatedNodes);
    };

    const handleGlobalEnd = () => {
      setDraggedNode(null);
      setLoupeCoords(null);
      setSnappingLines(null);
      triggerHaptic([15, 30]);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalEnd);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [draggedNode, nodes, panOffset, zoom, precision, editorMode]);

  // Implement a 'Clean SVG' feature in the Precision tab that automatically removes redundant nodes,
  // optimizes path data, and simplifies complex Bezier curves while preserving the overall logo geometry.
  const handleCleanSvg = () => {
    if (!actualSvgSource || !actualOnUpdateSvg || nodes.length === 0) return;
    triggerHaptic([30, 50]);

    let cleanedNodes: PathNode[] = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;
    let redundantRemoved = 0;
    let curvesSimplified = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const { type, values } = node;

      if (type.toUpperCase() === 'M') {
        if (values.length >= 2) {
          startX = values[0];
          startY = values[1];
          currentX = values[0];
          currentY = values[1];
        }
        cleanedNodes.push({ ...node });
      } else if (type.toUpperCase() === 'L') {
        if (values.length >= 2) {
          const tx = values[0];
          const ty = values[1];
          // Check if distance is negligible (redundant/zero-length node)
          const dist = Math.hypot(tx - currentX, ty - currentY);
          if (dist < 1.0) {
            redundantRemoved++;
            continue; // skip redundant node!
          }
          currentX = tx;
          currentY = ty;
        }
        cleanedNodes.push({ ...node });
      } else if (type.toUpperCase() === 'C') {
        // Cubic bezier: C cp1x cp1y, cp2x cp2y, endx endy
        if (values.length >= 6) {
          const cp1x = values[0];
          const cp1y = values[1];
          const cp2x = values[2];
          const cp2y = values[3];
          const endx = values[4];
          const endy = values[5];

          // Check if control points are nearly collinear with currentX,currentY and endx,endy
          // If collinear or extremely close to the straight line, convert curve to simple straight line (L)
          const isCollinear = (x1: number, y1: number, x2: number, y2: number, px: number, py: number) => {
            const area = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1);
            const base = Math.hypot(x2 - x1, y2 - y1);
            if (base === 0) return true;
            return (area / base) < 2.5; // pixel threshold
          };

          if (isCollinear(currentX, currentY, endx, endy, cp1x, cp1y) && 
              isCollinear(currentX, currentY, endx, endy, cp2x, cp2y)) {
            // Simplify curve C to line L!
            cleanedNodes.push({
              id: node.id,
              type: 'L',
              values: [endx, endy]
            });
            curvesSimplified++;
          } else {
            cleanedNodes.push({ ...node });
          }
          currentX = endx;
          currentY = endy;
        } else {
          cleanedNodes.push({ ...node });
        }
      } else if (type.toUpperCase() === 'Z') {
        currentX = startX;
        currentY = startY;
        cleanedNodes.push({ ...node });
      } else {
        if (values.length >= 2) {
          currentX = values[values.length - 2];
          currentY = values[values.length - 1];
        }
        cleanedNodes.push({ ...node });
      }
    }

    // Now re-index IDs of cleaned nodes
    cleanedNodes = cleanedNodes.map((n, idx) => ({ ...n, id: idx }));

    // Reconstruct optimized path string
    const newPathString = cleanedNodes
      .map((n) => `${n.type}${n.values.map(v => Math.round(v * 10) / 10).join(',')}`)
      .join(' ')
      .replace(/([A-DF-Z])/gi, ' $1 ')
      .replace(/,/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    setNodes(cleanedNodes);
    updatePathAtIndex(selectedPathIndex, { d: newPathString });

    setGestureToast(`✨ Cleaned: ${redundantRemoved} redundant points, simplified ${curvesSimplified} curves!`);
    setTimeout(() => setGestureToast(null), 3000);
  };

  const renderPrecisionNodes = () => {
    const elements: React.ReactNode[] = [];
    let lastX = 0;
    let lastY = 0;

    nodes.forEach((node) => {
      const { type, values, id } = node;

      if (type.toUpperCase() === 'M' || type.toUpperCase() === 'L') {
        if (values.length >= 2) {
          const x = values[0];
          const y = values[1];
          elements.push(
            <g key={`node-${id}-main`}>
              <circle
                cx={x}
                cy={y}
                r="6"
                tabIndex={0}
                role="button"
                aria-label={`Node ${id} point at ${x},${y}`}
                onKeyDown={(e) => handleNodeKeyDown(e, id, 0, x)}
                className={`cursor-pointer transition-all ${draggedNode?.nodeId === id && draggedNode?.valIdx === 0 ? 'fill-indigo-600 stroke-white stroke-2 scale-125' : 'fill-white stroke-indigo-600 stroke-2 hover:fill-indigo-50'}`}
                onMouseDown={(e) => handleNodeDragStart(e, id, 0, x)}
                onTouchStart={(e) => handleNodeDragStart(e, id, 0, x)}
              />
              <text x={x + 8} y={y - 4} className="text-[7px] font-bold fill-neutral-500 pointer-events-none">{type}#{id}</text>
            </g>
          );
          lastX = x;
          lastY = y;
        }
      } else if (type.toUpperCase() === 'C') {
        if (values.length >= 6) {
          const cp1x = values[0];
          const cp1y = values[1];
          const cp2x = values[2];
          const cp2y = values[3];
          const endx = values[4];
          const endy = values[5];

          // Lines from endpoints to control points
          elements.push(
            <g key={`node-${id}-ctrl-lines`}>
              <line x1={lastX} y1={lastY} x2={cp1x} y2={cp1y} stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 2" />
              <line x1={endx} y1={endy} x2={cp2x} y2={cp2y} stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 2" />
            </g>
          );

          // Control point 1
          elements.push(
            <circle
              key={`node-${id}-cp1`}
              cx={cp1x}
              cy={cp1y}
              r="4"
              className={`cursor-pointer transition-all ${draggedNode?.nodeId === id && draggedNode?.valIdx === 0 ? 'fill-amber-600 stroke-white stroke-2 scale-125' : 'fill-white stroke-amber-500 stroke-1.5 hover:fill-amber-50'}`}
              onMouseDown={(e) => handleNodeDragStart(e, id, 0, cp1x)}
              onTouchStart={(e) => handleNodeDragStart(e, id, 0, cp1x)}
            />
          );

          // Control point 2
          elements.push(
            <circle
              key={`node-${id}-cp2`}
              cx={cp2x}
              cy={cp2y}
              r="4"
              className={`cursor-pointer transition-all ${draggedNode?.nodeId === id && draggedNode?.valIdx === 2 ? 'fill-amber-600 stroke-white stroke-2 scale-125' : 'fill-white stroke-amber-500 stroke-1.5 hover:fill-amber-50'}`}
              onMouseDown={(e) => handleNodeDragStart(e, id, 2, cp2x)}
              onTouchStart={(e) => handleNodeDragStart(e, id, 2, cp2x)}
            />
          );

          // End point
          elements.push(
            <g key={`node-${id}-end`}>
              <circle
                cx={endx}
                cy={endy}
                r="6"
                className={`cursor-pointer transition-all ${draggedNode?.nodeId === id && draggedNode?.valIdx === 4 ? 'fill-indigo-600 stroke-white stroke-2 scale-125' : 'fill-white stroke-indigo-600 stroke-2 hover:fill-indigo-50'}`}
                onMouseDown={(e) => handleNodeDragStart(e, id, 4, endx)}
                onTouchStart={(e) => handleNodeDragStart(e, id, 4, endx)}
              />
              <text x={endx + 8} y={endy - 4} className="text-[7px] font-bold fill-neutral-500 pointer-events-none">C#{id}</text>
            </g>
          );

          lastX = endx;
          lastY = endy;
        }
      }
    });

    return elements;
  };

  // View state if svgSource is missing: Force Initial Blank Slate Options
  if (!actualSvgSource) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 text-center space-y-6">
        <div className="max-w-md mx-auto space-y-2">
          <Sparkles className="w-10 h-10 mx-auto text-indigo-500 animate-pulse" />
          <h3 className="text-lg font-extrabold text-neutral-800 dark:text-zinc-200">Start with a Pristine Manual Canvas</h3>
          <p className="text-xs text-neutral-500">Choose your base background to start sketching your vector logo manually with mobile touch controls.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          <button
            onClick={() => handleInitBlankCanvas('#FBFBF8')}
            className="p-4 bg-amber-50/50 dark:bg-zinc-950 border border-amber-200/50 dark:border-zinc-800 rounded-2xl hover:scale-102 transition-transform text-xs font-bold text-neutral-700 dark:text-zinc-300 cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-[#FBFBF8] border border-neutral-300" />
            Warm Linen Blank
          </button>
          <button
            onClick={() => handleInitBlankCanvas('#0F172A')}
            className="p-4 bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl hover:scale-102 transition-transform text-xs font-bold text-neutral-700 dark:text-zinc-300 cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-[#0F172A] border border-zinc-700" />
            Cyber Slate Blank
          </button>
          <button
            onClick={() => handleInitBlankCanvas('#09090B')}
            className="p-4 bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl hover:scale-102 transition-transform text-xs font-bold text-neutral-700 dark:text-zinc-300 cursor-pointer flex flex-col items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-[#09090B] border border-zinc-800" />
            Obsidian Charcoal Blank
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 space-y-6 shadow-xs relative">
      
      {/* Floating Two-Finger Gesture Toast Indicator */}
      {gestureToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-black shadow-2xl z-50 animate-bounce flex items-center gap-1.5 border border-indigo-400">
          <Zap size={12} className="animate-spin" />
          {gestureToast}
        </div>
      )}

      {/* Header controls with tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-100 dark:border-zinc-855">
        <div>
          <h3 className="text-sm font-black tracking-widest uppercase text-neutral-800 dark:text-zinc-200 flex items-center gap-2">
            <Sliders className="text-indigo-500" size={16} />
            Creative Touch Sketchpad
          </h3>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Pinch Zoom • Multi-Touch Draw • Auto-Bezier Curves</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-neutral-100 dark:bg-zinc-950 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => { setEditorMode('draw'); triggerHaptic(15); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${editorMode === 'draw' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-zinc-400'}`}
          >
            <Paintbrush size={13} /> Touch Draw Board
          </button>
          <button
            onClick={() => { setEditorMode('coordinate'); triggerHaptic(15); }}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${editorMode === 'coordinate' ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-zinc-400'}`}
          >
            <Move size={13} /> Precision Handles
          </button>
        </div>
      </div>

      {/* Editor Main Content Panels */}
      {editorMode === 'draw' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Mobile-First Tactile Drawing Board */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Tactile Vector Pad (200x200 Grid)</span>
                {/* Gestures guide helper */}
                <div className="group relative">
                  <HelpCircle size={12} className="text-neutral-300 dark:text-zinc-700 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-48 p-2.5 bg-zinc-950 text-white text-[9px] rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 leading-relaxed font-mono">
                    💡 <span className="text-indigo-400 font-bold">Touch Gestures:</span> Pinch with 2 fingers to zoom/pan. Swipe 2 fingers horizontally to Undo/Redo!
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5">
                {/* Manual Zoom/Pan triggers */}
                <button
                  onClick={() => setZoom((prev) => Math.min(5, prev + 0.25))}
                  className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-lg text-neutral-600 dark:text-zinc-400 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={12} />
                </button>
                <button
                  onClick={() => setZoom((prev) => Math.max(0.5, prev - 0.25))}
                  className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-lg text-neutral-600 dark:text-zinc-400 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={12} />
                </button>
                <button
                  onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); triggerHaptic(10); }}
                  className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-lg text-neutral-600 dark:text-zinc-400 cursor-pointer"
                  title="Reset viewport"
                >
                  <Maximize2 size={12} />
                </button>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${showGrid ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900' : 'bg-transparent border-neutral-200 dark:border-zinc-800 text-neutral-400'}`}
                  title="Toggle Assistant Grid Lines"
                >
                  <LayoutGrid size={12} />
                </button>
                <button
                  onClick={handleClearAllPaths}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[9px] font-bold uppercase rounded-lg transition-colors cursor-pointer"
                  title="Wipe canvas elements"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Render Drawing Area */}
            <div 
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative aspect-square w-full rounded-2xl border-2 border-dashed border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 overflow-hidden shadow-inner flex items-center justify-center cursor-crosshair touch-none"
            >
              {/* Dynamic Zoom & Pan Transform Layer */}
              <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Grid Overlay Assist Lines */}
                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 flex flex-col justify-between p-0 z-0">
                    <div className="w-full h-[1px] bg-neutral-300 dark:bg-zinc-700 mt-[25%]" />
                    <div className="w-full h-[1px] bg-neutral-400 dark:bg-zinc-600 border-dashed" />
                    <div className="w-full h-[1px] bg-neutral-300 dark:bg-zinc-700 mb-[25%]" />
                    
                    {/* Vertical lines */}
                    <div className="absolute inset-0 flex justify-between p-0">
                      <div className="w-[1px] h-full bg-neutral-300 dark:bg-zinc-700 ml-[25%]" />
                      <div className="w-[1px] h-full bg-neutral-400 dark:bg-zinc-600 border-dashed" />
                      <div className="w-[1px] h-full bg-neutral-300 dark:bg-zinc-700 mr-[25%]" />
                    </div>
                  </div>
                )}

                {/* LIVE PREVIEW OF CURRENT LOGO BASE */}
                <div 
                  dangerouslySetInnerHTML={{ __html: sanitizeSVG(actualSvgSource) }} 
                  className="w-full h-full max-w-[280px] max-h-[280px] flex items-center justify-center pointer-events-none select-none z-10"
                />

                {/* Brush Drawing Preview Line */}
                {isDrawing && brushPoints.length > 1 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 200 200">
                    <path 
                      d={buildPathD(brushPoints)} 
                      fill="none" 
                      stroke={activeStrokeColor} 
                      strokeWidth={activeStrokeWidth} 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="opacity-80"
                    />
                  </svg>
                )}

                {/* Vector Dots Node Anchor Preview Points */}
                {penPoints.map((pt, pIdx) => (
                  <div
                    key={pIdx}
                    className="absolute w-3 h-3 rounded-full bg-indigo-600 border border-white -translate-x-1/2 -translate-y-1/2 shadow pointer-events-none z-30 animate-pulse"
                    style={{ left: `${(pt.x / 200) * 100}%`, top: `${(pt.y / 200) * 100}%` }}
                  />
                ))}

                {/* Auto Cubic Bezier Curve Points overlay */}
                {drawTool === 'bezier' && bezierPoints.map((pt, pIdx) => (
                  <div key={pIdx} className="absolute -translate-x-1/2 -translate-y-1/2 z-40" style={{ left: `${(pt.x / 200) * 100}%`, top: `${(pt.y / 200) * 100}%` }}>
                    {/* Visual anchor node with index label */}
                    <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center text-[8px] font-black text-white">
                      {pIdx + 1}
                    </div>
                  </div>
                ))}

                {/* Dashed guidelines linking auto Bezier points */}
                {drawTool === 'bezier' && bezierPoints.length > 1 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 200 200">
                    <path 
                      d={buildPathD(bezierPoints)} 
                      fill="none" 
                      stroke="#10B981" 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4" 
                      className="opacity-60"
                    />
                    {/* Real-time Bezier Curve preview */}
                    <path 
                      d={generateCubicBezierPath(bezierPoints, closeBezierLoop)} 
                      fill={activeFillColor !== 'none' ? activeFillColor : 'none'} 
                      stroke={activeStrokeColor} 
                      strokeWidth={activeStrokeWidth} 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="opacity-95"
                    />
                  </svg>
                )}
              </div>

              {/* Draw instructions watermark */}
              <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-zinc-900/90 border border-neutral-200/50 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-[9px] font-mono text-neutral-500 font-semibold pointer-events-none shadow-xs z-30">
                {drawTool === 'brush' ? '✍️ Brush: Swipe to draw freehand' : drawTool === 'bezier' ? '🟢 Smooth Bezier: Tap canvas to link curves' : drawTool === 'pen' ? '🎯 Pen: Tap to add sharp line paths' : '💫 Shapes: Stamp vector presets'}
              </div>

              {/* Floating Undo/Redo quick action on Touch Draw Board */}
              <div className="absolute top-3 right-3 flex bg-white/90 dark:bg-zinc-900/90 border border-neutral-200/50 dark:border-zinc-800 rounded-xl p-1 gap-1 z-30 shadow-md">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                  title="Undo last stroke"
                >
                  <Undo2 size={13} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
                  title="Redo stroke"
                >
                  <Redo2 size={13} />
                </button>
              </div>
            </div>

            {/* Bezier Draw Custom Toolbar */}
            {drawTool === 'bezier' && (
              <div className="flex flex-col sm:flex-row gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl justify-between items-center animate-fadeIn">
                <div className="space-y-1 text-center sm:text-left">
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">Bezier Canvas Curve Generator</span>
                  <p className="text-[10px] text-neutral-500 font-medium">{bezierPoints.length} anchors placed. Tap canvas to design beautiful organic curves.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-[10px] font-bold text-neutral-600 dark:text-zinc-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={closeBezierLoop} 
                      onChange={(e) => { setCloseBezierLoop(e.target.checked); triggerHaptic(10); }}
                      className="accent-emerald-500 rounded"
                    />
                    Close Path Loop
                  </label>

                  <button
                    onClick={() => { setBezierPoints([]); triggerHaptic(15); }}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100 text-xs font-bold text-neutral-600 dark:text-zinc-300 rounded-xl cursor-pointer"
                  >
                    Reset
                  </button>

                  <button
                    onClick={handleLockBezierPath}
                    disabled={bezierPoints.length < 2}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                  >
                    <Check size={13} /> Create Curve Layer
                  </button>
                </div>
              </div>
            )}

            {/* Pen completion controls */}
            {drawTool === 'pen' && penPoints.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-xl justify-between">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">{penPoints.length} anchors ready</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPenPoints([])}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-900 text-xs font-bold border border-neutral-200 dark:border-zinc-800 rounded-lg cursor-pointer text-neutral-600"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleFinishPenPath}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Check size={12} /> Lock Path
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Modern Mobile Swatch Styling and Tool Belt */}
          <div className="lg:col-span-5 space-y-5">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Drawing Engine Control</span>

            {/* Quick tool selection (Grid style for finger tapping) */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => { setDrawTool('brush'); setPenPoints([]); setBezierPoints([]); triggerHaptic(15); }}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${drawTool === 'brush' ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-100 dark:border-zinc-850 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100'}`}
              >
                <Paintbrush size={15} />
                <span className="text-[9px] font-black uppercase tracking-tight">Brush Free</span>
              </button>

              <button
                onClick={() => { setDrawTool('bezier'); setPenPoints([]); setBrushPoints([]); triggerHaptic(15); }}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${drawTool === 'bezier' ? 'bg-emerald-600 border-emerald-600 text-white shadow' : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-100 dark:border-zinc-850 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100'}`}
              >
                <Circle size={15} />
                <span className="text-[9px] font-black uppercase tracking-tight">Auto-Bezier</span>
              </button>

              <button
                onClick={() => { setDrawTool('pen'); setBrushPoints([]); setBezierPoints([]); triggerHaptic(15); }}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${drawTool === 'pen' ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-100 dark:border-zinc-850 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100'}`}
              >
                <MousePointer size={15} />
                <span className="text-[9px] font-black uppercase tracking-tight">Sharp Pen</span>
              </button>

              <button
                onClick={() => { setDrawTool('shapes'); setPenPoints([]); setBezierPoints([]); triggerHaptic(15); }}
                className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${drawTool === 'shapes' ? 'bg-indigo-600 border-indigo-600 text-white shadow' : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-100 dark:border-zinc-850 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100'}`}
              >
                <Sparkles size={15} />
                <span className="text-[9px] font-black uppercase tracking-tight">Stamp Shape</span>
              </button>
            </div>

            {/* Context Tool Details (Color/Shape pickers) */}
            {drawTool === 'shapes' ? (
              <div className="p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-150 dark:border-zinc-850 space-y-3">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest block">Insert Vector Brand Preset</span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {shapePresets.map((shape) => (
                    <button
                      key={shape.name}
                      onClick={() => handleInjectShapePreset(shape.d)}
                      className="p-2.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 hover:border-indigo-400 text-[10px] font-bold text-neutral-700 dark:text-zinc-300 rounded-xl text-center cursor-pointer transition-all hover:scale-101"
                    >
                      {shape.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-150 dark:border-zinc-855 space-y-4">
                {/* Stroke Weight */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400">
                    <span>LINE THICKNESS (STROKE)</span>
                    <span className="font-mono text-neutral-600 dark:text-zinc-400">{activeStrokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={activeStrokeWidth}
                    onChange={(e) => setActiveStrokeWidth(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-neutral-200 dark:bg-zinc-850 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Stroke Color */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase">LINE / BRUSH COLOR</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {colorsList.map((col) => (
                      <button
                        key={col.name}
                        onClick={() => { setActiveStrokeColor(col.hex); triggerHaptic(10); }}
                        className={`p-1 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${activeStrokeColor === col.hex ? 'border-indigo-500 bg-white dark:bg-zinc-900 shadow-xs' : 'border-neutral-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900'}`}
                      >
                        <div 
                          className="w-4 h-4 rounded-md border border-neutral-300 dark:border-zinc-700" 
                          style={{ backgroundColor: col.hex === 'none' ? 'transparent' : col.hex }}
                        >
                          {col.hex === 'none' && <div className="w-full h-full bg-red-100 flex items-center justify-center text-[7px] font-bold text-red-500">❌</div>}
                        </div>
                        <span className="text-[8px] font-bold text-neutral-500 truncate max-w-full">{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fill Color */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/50 dark:border-zinc-850">
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase">Fill Color (shapes / bezier paths)</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {colorsList.map((col) => (
                      <button
                        key={col.name}
                        onClick={() => { setActiveFillColor(col.hex); triggerHaptic(10); }}
                        className={`p-1 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-all ${activeFillColor === col.hex ? 'border-indigo-500 bg-white dark:bg-zinc-900 shadow-xs' : 'border-neutral-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900'}`}
                      >
                        <div 
                          className="w-4 h-4 rounded-md border border-neutral-300 dark:border-zinc-700" 
                          style={{ backgroundColor: col.hex === 'none' ? 'transparent' : col.hex }}
                        >
                          {col.hex === 'none' && <div className="w-full h-full bg-red-100 flex items-center justify-center text-[7px] font-bold text-red-500">❌</div>}
                        </div>
                        <span className="text-[8px] font-bold text-neutral-500 truncate max-w-full">{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Background Canvas Settings */}
            <div className="p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-150 dark:border-zinc-850 space-y-2.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest block">Canvas background color</span>
              <div className="flex flex-wrap gap-2">
                {['#FBFBF8', '#0F172A', '#09090B', '#10B981', '#6366F1'].map((col) => (
                  <button
                    key={col}
                    onClick={() => { handleBgColorUpdate(col); triggerHaptic(12); }}
                    className="w-7 h-7 rounded-full border border-neutral-300 dark:border-zinc-700 transition-transform hover:scale-110 shadow-xs cursor-pointer"
                    style={{ backgroundColor: col }}
                    title={`Change background to ${col}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Magnifier Loupe Overlay Portal (shown when node is dragged) */}
          {draggedNode !== null && loupeCoords !== null && (
            <div 
              className="fixed pointer-events-none z-50 rounded-full border-3 border-indigo-600 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden flex items-center justify-center animate-pulse"
              style={{
                width: '100px',
                height: '100px',
                left: `${loupeCoords.clientX - 50}px`,
                top: `${loupeCoords.clientY - 120}px` // positioned 120px above finger to never block view
              }}
            >
              {/* Zoomed-in crop viewport centered on coordinate being tuned */}
              <div 
                className="w-24 h-24 flex items-center justify-center bg-neutral-150 dark:bg-zinc-950"
              >
                <svg 
                  viewBox={`${loupeCoords.x - 20} ${loupeCoords.y - 20} 40 40`} 
                  className="w-full h-full scale-110"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Assistant magnification background pattern */}
                  <rect x="-1000" y="-1000" width="3000" height="3000" fill="#0A0A0A" />
                  
                  {/* Grid overlay */}
                  <line x1={loupeCoords.x} y1={loupeCoords.y - 20} x2={loupeCoords.x} y2={loupeCoords.y + 20} stroke="#444" strokeWidth="0.5" strokeDasharray="1 1" />
                  <line x1={loupeCoords.x - 20} y1={loupeCoords.y} x2={loupeCoords.x + 20} y2={loupeCoords.y} stroke="#444" strokeWidth="0.5" strokeDasharray="1 1" />

                  {/* Original SVG path structures in loupe */}
                  <g dangerouslySetInnerHTML={{ __html: sanitizeSVG(actualSvgSource).replace(/<rect[^>]*\/>/g, '') }} />

                  {/* Centered crosshair handle indicator */}
                  <circle cx={loupeCoords.x} cy={loupeCoords.y} r="1.5" fill="none" stroke="#6366F1" strokeWidth="0.8" />
                  <circle cx={loupeCoords.x} cy={loupeCoords.y} r="3" fill="none" stroke="#FFFFFF" strokeWidth="0.4" />
                </svg>
              </div>
              
              {/* Magnifier grid HUD text */}
              <span className="absolute bottom-1 bg-zinc-950/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 font-extrabold shadow">
                X:{loupeCoords.x} Y:{loupeCoords.y}
              </span>
            </div>
          )}

          {/* Column 1: Path Selector & Translation, plus newly added Precision Toolbox */}
          <div className="md:col-span-1 space-y-4">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Canvas Path Layers</span>
            
            {parsedPaths.length === 0 ? (
              <div className="p-4 text-center bg-amber-50 dark:bg-amber-950/20 border border-amber-100 rounded-xl">
                <p className="text-xs text-amber-800 dark:text-amber-300">No layered vector paths available. Touch draw to paint some elements!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {parsedPaths.map((pathItem, idx) => (
                  <div
                    key={idx}
                    onClick={() => { setSelectedPathIndex(idx); triggerHaptic(10); }}
                    className={`w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-center justify-between cursor-pointer ${selectedPathIndex === idx ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 text-neutral-900 dark:text-white' : 'border-neutral-100 dark:border-zinc-855 hover:bg-neutral-50 text-neutral-500'}`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-5 h-5 rounded bg-neutral-100 dark:bg-zinc-950 flex items-center justify-center text-[9px] font-mono font-bold">
                        #{idx + 1}
                      </div>
                      <span className="font-mono truncate max-w-[130px]">{pathItem.d.slice(0, 20)}...</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePath(idx);
                        }}
                        className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete this path layer"
                      >
                        <Trash2 size={12} />
                      </button>
                      <ChevronRight size={13} className="text-neutral-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Translation and coordinate shifts */}
            {parsedPaths.length > 0 && (
              <div className="p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-150 dark:border-zinc-855 space-y-3">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest block">Position translate</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { handleTranslatePath(-8, 0); triggerHaptic(12); }}
                    className="px-2.5 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-100 cursor-pointer"
                  >
                    ← Move Left
                  </button>
                  <button
                    onClick={() => { handleTranslatePath(8, 0); triggerHaptic(12); }}
                    className="px-2.5 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-100 cursor-pointer"
                  >
                    Move Right →
                  </button>
                  <button
                    onClick={() => { handleTranslatePath(0, -8); triggerHaptic(12); }}
                    className="px-2.5 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-100 cursor-pointer"
                  >
                    ↑ Move Up
                  </button>
                  <button
                    onClick={() => { handleTranslatePath(0, 8); triggerHaptic(12); }}
                    className="px-2.5 py-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-neutral-100 cursor-pointer"
                  >
                    Move Down ↓
                  </button>
                </div>
              </div>
            )}

            {/* Precision Toolbox card */}
            <div className="p-4 bg-neutral-50 dark:bg-zinc-950 border border-neutral-150 dark:border-zinc-855 rounded-2xl space-y-3.5">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest block">Precision Toolbox</span>
              
              <button
                onClick={handleCleanSvg}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:scale-101 cursor-pointer flex items-center justify-center gap-1.5"
                title="Automatically remove redundant nodes & simplify curves"
              >
                <Sparkles size={14} />
                Clean & Simplify SVG
              </button>

              <button
                onClick={() => { setShowGestureMap(true); triggerHaptic(15); }}
                className="w-full py-2.5 px-3 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 hover:border-indigo-400 text-neutral-700 dark:text-zinc-300 text-xs font-bold rounded-xl shadow-2xs transition-all hover:scale-101 cursor-pointer flex items-center justify-center gap-1.5"
                title="View interactive touch gesture guide"
              >
                <HelpCircle size={14} className="text-indigo-500" />
                Touch Gesture Guide
              </button>
            </div>
          </div>

          {/* Column 2: Visual Coordinate Canvas with Snapping & Interactive Drag Nodes */}
          <div className="md:col-span-1 space-y-4">
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">Visual Anchor Editor</span>
            
            <div 
              ref={coordCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative aspect-square w-full rounded-2xl border-2 border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 overflow-hidden shadow-inner flex items-center justify-center cursor-crosshair touch-none select-none"
            >
              {/* Dynamic Zoom & Pan Transform Layer */}
              <div 
                className="w-full h-full flex items-center justify-center transition-transform duration-75 ease-out"
                style={{ 
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Visual coordinate Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 flex flex-col justify-between p-0 z-0">
                  {[25, 50, 75, 100, 125, 150, 175].map((pos) => (
                    <div key={`h-grid-${pos}`} className="w-full h-[1px] bg-neutral-400 dark:bg-zinc-600" style={{ marginTop: `${pos / 2}%` }} />
                  ))}
                  <div className="absolute inset-0 flex justify-between p-0">
                    {[25, 50, 75, 100, 125, 150, 175].map((pos) => (
                      <div key={`v-grid-${pos}`} className="w-[1px] h-full bg-neutral-400 dark:bg-zinc-600" style={{ marginLeft: `${pos / 2}%` }} />
                    ))}
                  </div>
                </div>

                {/* Main Logo Base Preview */}
                <div 
                  dangerouslySetInnerHTML={{ __html: sanitizeSVG(actualSvgSource) }} 
                  className="w-full h-full max-w-[280px] max-h-[280px] flex items-center justify-center pointer-events-none select-none z-10 opacity-40 dark:opacity-20"
                />

                {/* Snapping Grid Helper Lines */}
                {draggedNode !== null && snappingLines && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-30" viewBox="0 0 200 200">
                    {snappingLines.x !== undefined && (
                      <g>
                        <line 
                          x1={snappingLines.x} 
                          y1="0" 
                          x2={snappingLines.x} 
                          y2="200" 
                          stroke="#10B981" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 3" 
                        />
                        <text x={snappingLines.x + 3} y="15" className="fill-emerald-500 font-mono text-[8px] font-bold">X: {snappingLines.x}</text>
                      </g>
                    )}
                    {snappingLines.y !== undefined && (
                      <g>
                        <line 
                          x1="0" 
                          y1={snappingLines.y} 
                          x2="200" 
                          y2={snappingLines.y} 
                          stroke="#10B981" 
                          strokeWidth="1.5" 
                          strokeDasharray="3 3" 
                        />
                        <text x="5" y={snappingLines.y - 3} className="fill-emerald-500 font-mono text-[8px] font-bold">Y: {snappingLines.y}</text>
                      </g>
                    )}
                  </svg>
                )}

                {/* Draggable Anchor Nodes & Control lines */}
                {nodes.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full z-40" viewBox="0 0 200 200">
                    {renderPrecisionNodes()}
                  </svg>
                )}
              </div>

              {/* Instructions badge */}
              <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-zinc-900/90 border border-neutral-200/50 dark:border-zinc-800 rounded-lg px-2.5 py-1 text-[9px] font-mono text-neutral-500 font-semibold pointer-events-none shadow-xs z-30">
                🎯 Drag circle nodes to position coordinates
              </div>
            </div>
          </div>

          {/* Column 3: Coordinate Node Anchors list */}
          <div className="md:col-span-1 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Anchor Coordinates</span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => { handleAutoSimplify(); triggerHaptic(20); }}
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                >
                  <Zap size={11} /> Round
                </button>
                <div className="flex bg-neutral-100 dark:bg-zinc-950 p-1 rounded-lg items-center">
                  {[0, 1, 2].map((dec) => (
                    <button
                      key={dec}
                      onClick={() => { setPrecision(dec); triggerHaptic(10); }}
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${precision === dec ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' : 'text-neutral-500'}`}
                    >
                      {dec}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {nodes.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-dashed border-neutral-200 dark:border-zinc-855">
                <p className="text-xs text-neutral-500">No active path layer selected. Select a path layer to view and adjust coordinate nodes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {nodes.map((node) => (
                    <div key={node.id} className="p-3 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-200 dark:border-zinc-855 flex flex-col justify-between gap-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold uppercase text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                          CMD: {node.type}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-mono">Node #{node.id}</span>
                      </div>

                      {node.values.length === 0 ? (
                        <span className="text-[10px] text-neutral-400 font-mono">No coordinates</span>
                      ) : (
                        <div className="space-y-2">
                          {node.values.map((val, vIdx) => (
                            <div key={vIdx} className="flex items-center gap-2 text-[11px]">
                              <span className="text-neutral-400 font-mono w-4 shrink-0">{vIdx % 2 === 0 ? 'X' : 'Y'}:</span>
                              
                              <div 
                                onMouseDown={(e) => handleNodeDragStart(e, node.id, vIdx, val)}
                                onTouchStart={(e) => handleNodeDragStart(e, node.id, vIdx, val)}
                                className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-850 hover:border-indigo-400 rounded px-2 py-1 text-[10px] font-mono text-neutral-800 dark:text-zinc-200 cursor-ew-resize flex justify-between items-center shadow-xs transition-colors"
                              >
                                <span>{val}</span>
                                <span className="text-[7px] text-neutral-400 uppercase font-black tracking-tight">DRAG</span>
                              </div>

                              <input
                                type="range"
                                min="0"
                                max="200"
                                value={val}
                                onChange={(e) => handleValueChange(node.id, vIdx, Number(e.target.value))}
                                className="w-12 accent-indigo-500 h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Gesture Map Overlay Modal */}
      {showGestureMap && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => { setShowGestureMap(false); triggerHaptic(10); }}
              className="absolute top-4 right-4 p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-950 dark:hover:bg-zinc-800 rounded-full text-neutral-500 dark:text-zinc-400 cursor-pointer transition-colors"
            >
              <Check size={16} />
            </button>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <h3 className="text-base font-extrabold text-neutral-800 dark:text-zinc-100">Interactive Gesture Map</h3>
              </div>
              <p className="text-xs text-neutral-500 dark:text-zinc-400 font-semibold leading-normal">Tap on any gesture map node below to preview and test the interactive visual instructions for mobile screens.</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Pinch to Zoom */}
              <button
                onClick={() => { 
                  triggerHaptic([20, 50]); 
                  setGestureToast("🔍 Try Pinching with Two Fingers!"); 
                  setTimeout(() => setGestureToast(null), 1500); 
                }}
                className="p-4 bg-neutral-50 hover:bg-indigo-50/20 dark:bg-zinc-950 dark:hover:bg-indigo-950/10 border border-neutral-200 dark:border-zinc-800 rounded-2xl text-left transition-all hover:scale-101 cursor-pointer group flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-mono text-xl shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="16" r="2" />
                    <circle cx="16" cy="8" r="2" />
                    <path d="m10 14 4-4" />
                    <path d="m14 14 1-1" />
                    <path d="m9 9 1 1" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-neutral-800 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5">
                    Two-Finger Pinch Zoom
                    <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full font-bold">Zoom/Pan</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-zinc-400 leading-normal">Pinch two fingers together to shrink the workspace, or spread them apart to zoom in up to 500% with absolute vector precision.</p>
                </div>
              </button>

              {/* Single Finger Pan */}
              <button
                onClick={() => { 
                  triggerHaptic(20); 
                  setGestureToast("✋ Drag with Shift key / middle mouse or Single finger to Pan!"); 
                  setTimeout(() => setGestureToast(null), 1500); 
                }}
                className="p-4 bg-neutral-50 hover:bg-emerald-50/20 dark:bg-zinc-950 dark:hover:bg-emerald-950/10 border border-neutral-200 dark:border-zinc-800 rounded-2xl text-left transition-all hover:scale-101 cursor-pointer group flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
                  <Move size={22} />
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-neutral-800 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5">
                    Single-Finger Drag Pan
                    <span className="text-[8px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold">Canvas Navigation</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-zinc-400 leading-normal">Drag a single finger across empty space to pan and reposition the infinite grid. On desktop, hold Shift key or use middle-mouse drag.</p>
                </div>
              </button>

              {/* Three Finger Swipe */}
              <button
                onClick={() => { 
                  triggerHaptic([30, 60]); 
                  setGestureToast("🔄 Swipe 3 fingers horizontally to Undo/Redo!"); 
                  setTimeout(() => setGestureToast(null), 1500); 
                }}
                className="p-4 bg-neutral-50 hover:bg-rose-50/20 dark:bg-zinc-950 dark:hover:bg-rose-950/10 border border-neutral-200 dark:border-zinc-800 rounded-2xl text-left transition-all hover:scale-101 cursor-pointer group flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform">
                  <div className="flex gap-1">
                    <Undo2 size={14} />
                    <Redo2 size={14} />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-xs font-black text-neutral-800 dark:text-zinc-200 uppercase tracking-wide flex items-center gap-1.5">
                    Three-Finger Swipe History
                    <span className="text-[8px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">Undo/Redo</span>
                  </span>
                  <p className="text-[11px] text-neutral-500 dark:text-zinc-400 leading-normal">Swipe horizontally with three fingers anywhere on the screen: swipe right to Redo or swipe left to instantly Undo design revisions.</p>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => { setShowGestureMap(false); triggerHaptic(10); }}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black rounded-xl text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Close Gesture Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Dynamic Gesture/Status Notification Toast */}
      {gestureToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-neutral-900/90 dark:bg-white/90 text-white dark:text-neutral-900 text-[11px] font-black tracking-wide uppercase px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 dark:border-neutral-200 animate-slideUp">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{gestureToast}</span>
        </div>
      )}
    </div>
  );
};
