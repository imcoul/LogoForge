import { WhiteboardToolbar } from './WhiteboardToolbar';
import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Node } from '../types';
import { 
  Trash2, Copy, Edit2, Grid, PenTool, Square, Circle, 
  Maximize2, Save, Sparkles, BookOpen, Sliders, ChevronRight,
  Settings, CheckCircle, RefreshCw, Undo, Redo, HelpCircle, X
} from 'lucide-react';
import { ForgeAcademy } from './ForgeAcademy';

export const WhiteboardCanvas: React.FC<{ fullscreen: boolean, setFullscreen: (f: boolean) => void }> = ({ fullscreen, setFullscreen }) => {
  const { activeProjectId, projects, updateProject } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const canvasRef = useRef<SVGSVGElement>(null);
  
  // States
  const [isDrawing, setIsDrawing] = useState(false);
  const [sketches, setSketches] = useState<{ 
    id: string; 
    name: string; 
    path?: string; 
    color?: string; 
    strokeWidth?: number; 
    type?: 'path' | 'rectangle' | 'circle' | 'line'; 
    props?: any;
    fillColor?: string;
    fillOpacity?: number;
    strokeDashArray?: string;
  }[]>([]);
  
  const [currentPoints, setCurrentPoints] = useState<string>('');
  const [mode, setMode] = useState<'drawing' | 'gallery'>('drawing');
  const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line' | 'rectangle' | 'circle' | 'select'>('select');
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [pencilType, setPencilType] = useState<'pen' | 'marker'>('pen');
  const [strokeColor, setStrokeColor] = useState('#6366f1');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [editingSketch, setEditingSketch] = useState<{ id: string; name: string } | null>(null);

  // New Ruler and Grid states
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [guideMode, setGuideMode] = useState<'none' | 'linear' | 'diagonal' | 'circular'>('linear');
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bridgeNotification, setBridgeNotification] = useState<string | null>(null);
  const [academyOpen, setAcademyOpen] = useState(false);

  // Local History Stack for Undo/Redo
  const [sketchesHistory, setSketchesHistory] = useState<{ 
    id: string; 
    name: string; 
    path?: string; 
    color?: string; 
    strokeWidth?: number; 
    type?: 'path' | 'rectangle' | 'circle' | 'line'; 
    props?: any;
    fillColor?: string;
    fillOpacity?: number;
    strokeDashArray?: string;
  }[][]>([]);
  const [sketchesHistoryIndex, setSketchesHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    if (activeProject?.whiteboardSketches) {
      setSketches(activeProject.whiteboardSketches);
      // Initialize history stack on first load
      if (sketchesHistory.length === 0) {
        setSketchesHistory([activeProject.whiteboardSketches]);
        setSketchesHistoryIndex(0);
      }
    }
  }, [activeProject?.whiteboardSketches]);

  // Push updated sketches to store and commit to history
  const saveSketch = async (updatedSketches: typeof sketches) => {
    if (activeProjectId && activeProject) {
        await updateProject(activeProjectId, { whiteboardSketches: updatedSketches });
    }
  };

  const updateSketchesWithHistory = (updated: typeof sketches) => {
    setSketches(updated);
    saveSketch(updated);
    
    // Slice current stack to index and append new change
    const nextHistory = sketchesHistory.slice(0, sketchesHistoryIndex + 1);
    setSketchesHistory([...nextHistory, updated]);
    setSketchesHistoryIndex(nextHistory.length);
  };

  // Trigger local undo for whiteboard
  const handleLocalUndo = () => {
    if (sketchesHistoryIndex > 0) {
      const nextIndex = sketchesHistoryIndex - 1;
      setSketchesHistoryIndex(nextIndex);
      const restored = sketchesHistory[nextIndex];
      setSketches(restored);
      saveSketch(restored);
      triggerBanner("Whiteboard Undo Applied");
    } else {
      triggerBanner("Nothing to undo on whiteboard");
    }
  };

  // Trigger local redo for whiteboard
  const handleLocalRedo = () => {
    if (sketchesHistoryIndex < sketchesHistory.length - 1) {
      const nextIndex = sketchesHistoryIndex + 1;
      setSketchesHistoryIndex(nextIndex);
      const restored = sketchesHistory[nextIndex];
      setSketches(restored);
      saveSketch(restored);
      triggerBanner("Whiteboard Redo Applied");
    } else {
      triggerBanner("Nothing to redo on whiteboard");
    }
  };

  const triggerBanner = (message: string) => {
    setBridgeNotification(message);
    setTimeout(() => {
      setBridgeNotification(null);
    }, 4000);
  };

  const deleteSketch = (id: string) => {
    const updated = sketches.filter(s => s.id !== id);
    if (selectedSketchId === id) setSelectedSketchId(null);
    updateSketchesWithHistory(updated);
  };

  const duplicateSketch = (id: string) => {
    const sketch = sketches.find(s => s.id === id);
    if (!sketch) return;
    const newSketch = { 
      ...sketch, 
      id: Date.now().toString(), 
      name: `${sketch.name} (copy)`,
      props: sketch.props ? { ...sketch.props, x: (sketch.props.x || 0) + 20, y: (sketch.props.y || 0) + 20 } : undefined 
    };
    const updated = [...sketches, newSketch];
    updateSketchesWithHistory(updated);
  };

  const renameSketch = (id: string, name: string) => {
    const updated = sketches.map(s => s.id === id ? { ...s, name } : s);
    updateSketchesWithHistory(updated);
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: Math.round(clientX - rect.left),
      y: Math.round(clientY - rect.top)
    };
  };

  // Snaps coordinate to 10px spacing
  const snapCoords = (point: { x: number, y: number }) => {
    if (!snapToGrid) return point;
    return {
      x: Math.round(point.x / 10) * 10,
      y: Math.round(point.y / 10) * 10
    };
  };

  const getHitSketch = (point: {x: number, y: number}) => {
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
    const rawPoint = getPoint(e);
    const point = snapCoords(rawPoint);
    
    if (tool === 'select') {
        const hit = getHitSketch(rawPoint);
        if (hit) {
            setSelectedSketchId(hit.id);
            setIsDrawing(true);
            setStartPoint(rawPoint);
            setDragOffset({ x: 0, y: 0 });
        } else {
            setSelectedSketchId(null);
        }
    } else if (tool === 'pencil' || tool === 'line' || tool === 'rectangle' || tool === 'circle') {
        setSelectedSketchId(null);
        setIsDrawing(true);
        setStartPoint(point);
        setCurrentPoints(`${point.x},${point.y}`);
    } else if (tool === 'sweeping-eraser' || tool === 'duster-eraser') {
        setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rawPoint = getPoint(e);
    setMousePos(rawPoint);

    if (!isDrawing) return;
    const point = snapCoords(rawPoint);
    
    if (tool === 'select' && selectedSketchId && startPoint) {
      const dx = point.x - snapCoords(startPoint).x;
      const dy = point.y - snapCoords(startPoint).y;
      setDragOffset({ x: dx, y: dy });
    } else if (tool === 'pencil') {
      // Append raw smoother points
      setCurrentPoints(prev => `${prev} ${rawPoint.x},${rawPoint.y}`);
    } else if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint) {
      let endPoint = point;
      if ('shiftKey' in e && e.shiftKey) {
          const dx = point.x - startPoint.x;
          const dy = point.y - startPoint.y;
          const angle = Math.atan2(dy, dx);
          const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const length = Math.sqrt(dx * dx + dy * dy);
          endPoint = {
              x: startPoint.x + length * Math.cos(snappedAngle),
              y: startPoint.y + length * Math.sin(snappedAngle)
          };
      }
      setCurrentPoints(`${startPoint.x},${startPoint.y} ${endPoint.x},${endPoint.y}`);
    } else if (tool === 'sweeping-eraser') {
      const deletedSketch = sketches.find(s => {
        const threshold = 15;
        if (s.type === 'rectangle' && s.props) {
            const { x, y, width, height } = s.props;
            return rawPoint.x >= x - threshold && rawPoint.x <= x + width + threshold &&
                   rawPoint.y >= y - threshold && rawPoint.y <= y + height + threshold;
        } else if (s.type === 'circle' && s.props) {
            const { cx, cy, rx, ry } = s.props;
            const dx = (rawPoint.x - cx) / Math.max(1, rx);
            const dy = (rawPoint.y - cy) / Math.max(1, ry);
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
                if (getSqSegDist([rawPoint.x, rawPoint.y], coords[i], coords[i+1]) < threshold * threshold) {
                    return true;
                }
            }
            return false;
        }
        return false;
      });
      if (deletedSketch) {
        deleteSketch(deletedSketch.id);
      }
    } else if (tool === 'duster-eraser') {
        updateSketchesWithHistory([]);
    }
  };

  const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    if (tool === 'select' && selectedSketchId && dragOffset) {
        const dx = dragOffset.x;
        const dy = dragOffset.y;
        if (dx !== 0 || dy !== 0) {
            const updatedSketches = sketches.map(s => {
                if (s.id !== selectedSketchId) return s;
                if (s.type === 'rectangle' && s.props) {
                    return { ...s, props: { ...s.props, x: s.props.x + dx, y: s.props.y + dy } };
                } else if (s.type === 'circle' && s.props) {
                    return { ...s, props: { ...s.props, cx: s.props.cx + dx, cy: s.props.cy + dy } };
                } else if (s.path) {
                    const translatedPath = s.path.replace(/([0-9.-]+),([0-9.-]+)/g, (match, px, py) => {
                        return `${Number(px) + dx},${Number(py) + dy}`;
                    });
                    return { ...s, path: translatedPath };
                }
                return s;
            });
            updateSketchesWithHistory(updatedSketches);
        }
        setDragOffset(null);
        setStartPoint(null);
        return;
    }
    
    if (tool === 'line' && startPoint && currentPoints) {
        if (currentPoints.includes(' ')) {
            const points = currentPoints.split(' ');
            if (points.length >= 2 && points[1]) {
                const parts = points[1].split(',');
                if (parts.length >= 2) {
                    const endPointX = Number(parts[0]);
                    const endPointY = Number(parts[1]);
                    if (!isNaN(endPointX) && !isNaN(endPointY)) {
                        const newSketch = {
                            id: Date.now().toString(),
                            name: `Line ${sketches.length + 1}`,
                            type: 'line' as const,
                            path: `M ${startPoint.x},${startPoint.y} L ${endPointX},${endPointY}`,
                            color: strokeColor,
                            strokeWidth
                        };
                        const updatedSketches = [...sketches, newSketch];
                        updateSketchesWithHistory(updatedSketches);
                    }
                }
            }
        }
        setCurrentPoints('');
        setStartPoint(null);
    } else if (tool === 'rectangle' && startPoint && currentPoints) {
        if (currentPoints.includes(' ')) {
            const points = currentPoints.split(' ');
            if (points.length >= 2 && points[1]) {
                const parts = points[1].split(',');
                if (parts.length >= 2) {
                    const endPointX = Number(parts[0]);
                    const endPointY = Number(parts[1]);
                    if (!isNaN(endPointX) && !isNaN(endPointY)) {
                        const x = Math.min(startPoint.x, endPointX);
                        const y = Math.min(startPoint.y, endPointY);
                        const width = Math.abs(startPoint.x - endPointX);
                        const height = Math.abs(startPoint.y - endPointY);
                        if (width > 2 && height > 2) {
                            const newSketch = {
                                id: Date.now().toString(),
                                name: `Rectangle ${sketches.length + 1}`,
                                type: 'rectangle' as const,
                                props: { x, y, width, height, rx: 0 },
                                color: strokeColor,
                                strokeWidth,
                                fillColor: 'none',
                                fillOpacity: 1,
                                strokeDashArray: 'none'
                            };
                            const updatedSketches = [...sketches, newSketch];
                            updateSketchesWithHistory(updatedSketches);
                        }
                    }
                }
            }
        }
        setCurrentPoints('');
        setStartPoint(null);
    } else if (tool === 'circle' && startPoint && currentPoints) {
        if (currentPoints.includes(' ')) {
            const points = currentPoints.split(' ');
            if (points.length >= 2 && points[1]) {
                const parts = points[1].split(',');
                if (parts.length >= 2) {
                    const endPointX = Number(parts[0]);
                    const endPointY = Number(parts[1]);
                    if (!isNaN(endPointX) && !isNaN(endPointY)) {
                        const cx = startPoint.x + (endPointX - startPoint.x) / 2;
                        const cy = startPoint.y + (endPointY - startPoint.y) / 2;
                        const rx = Math.abs(startPoint.x - endPointX) / 2;
                        const ry = Math.abs(startPoint.y - endPointY) / 2;
                        if (rx > 1 && ry > 1) {
                            const newSketch = {
                                id: Date.now().toString(),
                                name: `Ellipse ${sketches.length + 1}`,
                                type: 'circle' as const,
                                props: { cx, cy, rx, ry },
                                color: strokeColor,
                                strokeWidth,
                                fillColor: 'none',
                                fillOpacity: 1,
                                strokeDashArray: 'none'
                            };
                            const updatedSketches = [...sketches, newSketch];
                            updateSketchesWithHistory(updatedSketches);
                        }
                    }
                }
            }
        }
        setCurrentPoints('');
        setStartPoint(null);
    } else if (tool === 'pencil' && currentPoints) {
        const smoothedPath = smoothPointsToPath(currentPoints);
        const newSketch = {
            id: Date.now().toString(),
            name: `Sketch ${sketches.length + 1}`,
            path: smoothedPath || `M ${currentPoints}`,
            color: strokeColor,
            strokeWidth,
            type: 'path' as const
        };
        const updatedSketches = [...sketches, newSketch];
        updateSketchesWithHistory(updatedSketches);
        setCurrentPoints('');
    }
  };

  // Modify individual properties of the selected sketch shape
  const handleUpdateSelectedSketch = (updatedFields: Partial<typeof sketches[0]>) => {
    if (!selectedSketchId) return;
    const updated = sketches.map(s => {
      if (s.id !== selectedSketchId) return s;
      return {
        ...s,
        ...updatedFields
      };
    });
    updateSketchesWithHistory(updated);
  };

  const handleUpdateSelectedProps = (updatedProps: any) => {
    if (!selectedSketchId) return;
    const updated = sketches.map(s => {
      if (s.id !== selectedSketchId) return s;
      return {
        ...s,
        props: {
          ...s.props,
          ...updatedProps
        }
      };
    });
    updateSketchesWithHistory(updated);
  };

  // Bi-directional bridge: Send selected shape to precision studio
  const handlePushToSvgEditor = async () => {
    const selected = sketches.find(s => s.id === selectedSketchId);
    if (!selected || !activeProjectId || !activeProject) return;

    const stroke = selected.color || '#6366f1';
    const fill = selected.fillColor || 'none';
    const fillOpacity = selected.fillOpacity !== undefined ? selected.fillOpacity : 1;
    const fillOpacityAttr = fill !== 'none' ? ` fill-opacity="${fillOpacity}"` : '';
    const sWidth = selected.strokeWidth || 3;
    const dashArray = selected.strokeDashArray || 'none';
    const dashAttr = dashArray && dashArray !== 'none' ? ` stroke-dasharray="${dashArray}"` : '';

    let tag = '';
    if (selected.type === 'rectangle' && selected.props) {
      const rxAttr = selected.props.rx ? ` rx="${selected.props.rx}" ry="${selected.props.rx}"` : '';
      tag = `<path d="M${selected.props.x},${selected.props.y} h${selected.props.width} v${selected.props.height} h-${selected.props.width} z" fill="${fill}"${fillOpacityAttr} stroke="${stroke}" stroke-width="${sWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
    } else if (selected.type === 'circle' && selected.props) {
      // Convert Ellipse to path node representation for universal compatibility
      const { cx, cy, rx, ry } = selected.props;
      tag = `<path d="M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 -${rx * 2},0" fill="${fill}"${fillOpacityAttr} stroke="${stroke}" stroke-width="${sWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
    } else {
      // It's a freehand curve
      tag = `<path d="${selected.path}" fill="${fill}"${fillOpacityAttr} stroke="${stroke}" stroke-width="${sWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
    }

    const currentSvg = activeProject.svgSource || `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">\n</svg>`;
    const closingIdx = currentSvg.lastIndexOf('</svg>');
    
    let nextSvg = '';
    if (closingIdx !== -1) {
      nextSvg = currentSvg.substring(0, closingIdx) + '\n  ' + tag + '\n' + currentSvg.substring(closingIdx);
    } else {
      nextSvg = currentSvg + '\n' + tag;
    }

    await updateProject(activeProjectId, { svgSource: nextSvg });
    triggerBanner("⚡ Sent to Precision SVG Editor!");
  };

  const selectedSketch = sketches.find(s => s.id === selectedSketchId);

  // Concentric circle centers
  const centerX = canvasRef.current ? canvasRef.current.clientWidth / 2 : 380;
  const centerY = canvasRef.current ? canvasRef.current.clientHeight / 2 : 200;

  return (
    <div className={`bg-white dark:bg-black border border-neutral-200 dark:border-zinc-800 flex flex-col gap-4 ${fullscreen ? 'fixed inset-0 z-50 w-screen h-screen p-6 rounded-none' : 'relative rounded-3xl p-4 w-full h-[540px]'}`}>
        
        {/* Animated Banner Notification */}
        {bridgeNotification && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-400 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-2xl z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
            <Sparkles size={14} className="text-amber-300 animate-pulse" />
            {bridgeNotification}
          </div>
        )}

        {/* Toolbar Component */}
        <WhiteboardToolbar 
             tool={tool} 
             setTool={setTool as any} 
             mode={mode} 
             setMode={setMode} 
             setFullscreen={setFullscreen} 
             fullscreen={fullscreen}
             onUndo={handleLocalUndo}
             onRedo={handleLocalRedo}
             color={strokeColor}
             setColor={setStrokeColor}
             strokeWidth={strokeWidth}
             setStrokeWidth={setStrokeWidth}
        />

      {/* Grid, Snap, Guidelines Floating Overlay Controls */}
      {mode === 'drawing' && (
        <div className="absolute bottom-6 left-6 z-30 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-neutral-200 dark:border-zinc-800 p-1.5 rounded-2xl shadow-lg">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${showGrid ? 'bg-indigo-500 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400'}`}
            title="Toggle grid"
          >
            <Grid size={13} /> {showGrid ? 'Grid On' : 'Grid Off'}
          </button>
          
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${snapToGrid ? 'bg-indigo-500 text-white' : 'hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400'}`}
            title="Toggle dynamic snap"
          >
            <Settings size={13} /> {snapToGrid ? 'Snap On' : 'Snap Off'}
          </button>

          <div className="w-px h-5 bg-neutral-200 dark:bg-zinc-800 mx-1" />

          {/* Guidelines Mode */}
          <select
            value={guideMode}
            onChange={(e) => setGuideMode(e.target.value as any)}
            className="text-xs font-bold bg-transparent border-0 focus:ring-0 cursor-pointer text-neutral-700 dark:text-zinc-300 pr-2 pl-1"
          >
            <option value="none" className="dark:bg-zinc-900">No Guides</option>
            <option value="linear" className="dark:bg-zinc-900">Standard Rulers</option>
            <option value="diagonal" className="dark:bg-zinc-900">Diagonal 45°</option>
            <option value="circular" className="dark:bg-zinc-900">Concentric Circle</option>
          </select>

          <div className="w-px h-5 bg-neutral-200 dark:bg-zinc-800 mx-1" />

          {/* Quick academy helper */}
          <button
            onClick={() => setAcademyOpen(true)}
            className="p-2 hover:bg-indigo-50 dark:hover:bg-zinc-800 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center gap-1 text-xs font-bold"
            title="Open Design Academy"
          >
            <BookOpen size={13} /> Academy Guide
          </button>
        </div>
      )}

      {mode === 'drawing' ? (
        <div className="relative flex-1 min-h-0 flex gap-4 w-full h-full">
          
          {/* Main Drawing Stage Area */}
          <svg 
              ref={canvasRef}
              className={`w-full border border-neutral-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-black touch-none flex-1 min-h-0 ${fullscreen ? 'h-full' : 'h-[400px]'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              >
              
              <defs>
                {/* Minor grid 10px */}
                <pattern id="wb-minor-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-neutral-200/40 dark:text-zinc-800/20" />
                </pattern>
                {/* Major grid 50px */}
                <pattern id="wb-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect width="50" height="50" fill="url(#wb-minor-grid)" />
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-neutral-300/60 dark:text-zinc-800/40" />
                </pattern>
              </defs>

              {/* Toggleable grid backing */}
              {showGrid && (
                <rect width="100%" height="100%" fill="url(#wb-grid)" className="pointer-events-none" />
              )}

              {/* Diagonal Guide Overlays & Rulers */}
              {guideMode === 'diagonal' && (
                <g className="pointer-events-none opacity-40 dark:opacity-25">
                  {/* Grid Lines */}
                  {Array.from({ length: 40 }).map((_, i) => {
                    const offset = (i - 20) * 80;
                    return (
                      <g key={`diag-guide-${i}`}>
                        <line x1={0} y1={offset} x2={1600} y2={1600 + offset} stroke="#6366f1" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1={0} y1={offset} x2={1600} y2={-1600 + offset} stroke="#6366f1" strokeWidth="1" strokeDasharray="3 3" />
                        {offset === 0 && (
                          <>
                            <text x={centerX - 120} y={centerY - 120 - 10} fontSize="8" className="fill-indigo-600 font-mono font-bold select-none">45° Axis</text>
                            <text x={centerX - 120} y={centerY + 120 + 15} fontSize="8" className="fill-indigo-600 font-mono font-bold select-none">135° Axis</text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {/* High-Fidelity 45° and 135° Diagonal Rulers */}
                  {Array.from({ length: 24 }).map((_, idx) => {
                    // d ranges from -600 to 600 in steps of 50px
                    const d = (idx - 12) * 50;
                    if (d === 0) return null; // Skip origin for neatness
                    const cosVal = 0.7071;
                    const sinVal = 0.7071;

                    // 45° ruler coordinates (y increases with x)
                    const x45 = centerX + d * cosVal;
                    const y45 = centerY + d * sinVal;

                    // 135° ruler coordinates (y decreases as x increases)
                    const x135 = centerX - d * cosVal;
                    const y135 = centerY + d * sinVal;

                    const isMajor = d % 100 === 0;
                    const h = isMajor ? 6 : 3;

                    // Perpendicular offsets
                    const px45 = -sinVal * h;
                    const py45 = cosVal * h;

                    const px135 = sinVal * h;
                    const py135 = cosVal * h;

                    return (
                      <g key={`diag-ruler-tick-${idx}`}>
                        {/* 45° Tick */}
                        {x45 >= 0 && x45 <= 1600 && y45 >= 0 && y45 <= 1600 && (
                          <>
                            <line 
                              x1={x45 - px45} y1={y45 - py45} 
                              x2={x45 + px45} y2={y45 + py45} 
                              stroke="#6366f1" strokeWidth={isMajor ? 1.5 : 0.8} 
                            />
                            {isMajor && (
                              <text 
                                x={x45 + px45 * 2.2} 
                                y={y45 + py45 * 2.2 + 3} 
                                fontSize="7" 
                                className="fill-indigo-600 font-mono font-bold select-none text-[7px]"
                                textAnchor="middle"
                              >
                                {Math.abs(d)}
                              </text>
                            )}
                          </>
                        )}

                        {/* 135° Tick */}
                        {x135 >= 0 && x135 <= 1600 && y135 >= 0 && y135 <= 1600 && (
                          <>
                            <line 
                              x1={x135 - px135} y1={y135 - py135} 
                              x2={x135 + px135} y2={y135 + py135} 
                              stroke="#6366f1" strokeWidth={isMajor ? 1.5 : 0.8} 
                            />
                            {isMajor && (
                              <text 
                                x={x135 + px135 * 2.2} 
                                y={y135 + py135 * 2.2 + 3} 
                                fontSize="7" 
                                className="fill-indigo-600 font-mono font-bold select-none text-[7px]"
                                textAnchor="middle"
                              >
                                {Math.abs(d)}
                              </text>
                            )}
                          </>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Concentric Circle Radial Guides & Polar Rulers */}
              {guideMode === 'circular' && (
                <g className="pointer-events-none opacity-40 dark:opacity-30">
                  {/* Circle Rings */}
                  {Array.from({ length: 12 }).map((_, i) => {
                    const r = (i + 1) * 45;
                    return (
                      <g key={`concentric-guide-${i}`}>
                        <circle
                          cx={centerX}
                          cy={centerY}
                          r={r}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="1.2"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={centerX + r + 4}
                          y={centerY - 4}
                          fontSize="8"
                          className="fill-indigo-600 font-mono font-bold select-none"
                        >
                          r={r}
                        </text>

                        {/* Protractor Tick marks on each ring */}
                        {Array.from({ length: 24 }).map((_, aIdx) => {
                          const angle = aIdx * 15; // 15-degree increments
                          const rad = (angle * Math.PI) / 180;
                          const cosVal = Math.cos(rad);
                          const sinVal = Math.sin(rad);
                          const isMajorAngle = angle % 45 === 0;
                          const tickH = isMajorAngle ? 5 : 2.5;

                          return (
                            <line
                              key={`ring-${r}-tick-${angle}`}
                              x1={centerX + (r - tickH) * cosVal}
                              y1={centerY + (r - tickH) * sinVal}
                              x2={centerX + (r + tickH) * cosVal}
                              y2={centerY + (r + tickH) * sinVal}
                              stroke="#6366f1"
                              strokeWidth={isMajorAngle ? 1.2 : 0.6}
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* Polar degree layout lines & labels */}
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = i * 45;
                    const rad = (angle * Math.PI) / 180;
                    const cosVal = Math.cos(rad);
                    const sinVal = Math.sin(rad);
                    const outerR = 500;
                    
                    return (
                      <g key={`polar-degree-${angle}`}>
                        <line 
                          x1={centerX} y1={centerY} 
                          x2={centerX + outerR * cosVal} y2={centerY + outerR * sinVal} 
                          stroke="#6366f1" strokeWidth="0.8" strokeDasharray="2 4" 
                        />
                        <text
                          x={centerX + (outerR + 15) * cosVal}
                          y={centerY + (outerR + 15) * sinVal + 3}
                          fontSize="8"
                          className="fill-indigo-600 font-mono font-bold select-none text-[8px]"
                          textAnchor="middle"
                        >
                          {angle}°
                        </text>
                      </g>
                    );
                  })}

                  {/* Center Crosshairs */}
                  <line x1={centerX - 500} y1={centerY} x2={centerX + 500} y2={centerY} stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" />
                  <line x1={centerX} y1={centerY - 500} x2={centerX} y2={centerY + 500} stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" />
                </g>
              )}

              {/* Saved Whiteboard Sketches */}
              {sketches.map((sketch) => {
                  const isSelected = sketch.id === selectedSketchId;
                  const tx = isSelected && dragOffset ? dragOffset.x : 0;
                  const ty = isSelected && dragOffset ? dragOffset.y : 0;
                  const transform = tx || ty ? `translate(${tx}, ${ty})` : undefined;
                  const strokeClass = isSelected ? "opacity-95 drop-shadow-lg" : "";
                  
                  if (sketch.type === 'rectangle' && sketch.props) {
                      return (
                        <rect 
                          key={sketch.id} 
                          x={sketch.props.x} 
                          y={sketch.props.y} 
                          width={sketch.props.width} 
                          height={sketch.props.height} 
                          rx={sketch.props.rx || 0}
                          ry={sketch.props.rx || 0}
                          fill={sketch.fillColor || 'none'} 
                          fillOpacity={sketch.fillOpacity ?? 1}
                          stroke={sketch.color || 'currentColor'} 
                          strokeWidth={sketch.strokeWidth || 2} 
                          strokeDasharray={sketch.strokeDashArray || 'none'}
                          transform={transform} 
                          className={strokeClass} 
                        />
                      );
                  }
                  if (sketch.type === 'circle' && sketch.props) {
                      return (
                        <ellipse 
                          key={sketch.id} 
                          cx={sketch.props.cx} 
                          cy={sketch.props.cy} 
                          rx={sketch.props.rx} 
                          ry={sketch.props.ry} 
                          fill={sketch.fillColor || 'none'} 
                          fillOpacity={sketch.fillOpacity ?? 1}
                          stroke={sketch.color || 'currentColor'} 
                          strokeWidth={sketch.strokeWidth || 2} 
                          strokeDasharray={sketch.strokeDashArray || 'none'}
                          transform={transform} 
                          className={strokeClass} 
                        />
                      );
                  }
                  return (
                    <path 
                      key={sketch.id} 
                      d={sketch.path} 
                      fill={sketch.fillColor || 'none'} 
                      fillOpacity={sketch.fillOpacity ?? 1}
                      stroke={sketch.color || 'currentColor'} 
                      strokeWidth={sketch.strokeWidth || 2} 
                      strokeDasharray={sketch.strokeDashArray || 'none'}
                      transform={transform} 
                      className={strokeClass} 
                    />
                  );
              })}

              {/* Dynamic crosshair guidelines */}
              {guideMode === 'linear' && (
                <g className="pointer-events-none text-neutral-300 dark:text-zinc-800 opacity-60">
                  <line x1={0} y1={mousePos.y} x2={2000} y2={mousePos.y} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                  <line x1={mousePos.x} y1={0} x2={mousePos.x} y2={2000} stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                </g>
              )}

              {/* Real-time Ticks Rulers Overlay */}
              {guideMode === 'linear' && (
                <g className="pointer-events-none select-none text-neutral-400 dark:text-zinc-600">
                  {/* Top Ruler backplane */}
                  <rect x={0} y={0} width="100%" height={20} fill="rgba(244, 244, 245, 0.9)" className="dark:fill-zinc-950/90 border-b border-neutral-200 dark:border-zinc-800" />
                  {/* Left Ruler backplane */}
                  <rect x={0} y={0} width={20} height="100%" fill="rgba(244, 244, 245, 0.9)" className="dark:fill-zinc-950/90 border-r border-neutral-200 dark:border-zinc-800" />
                  
                  {/* Top Tick marks & labels */}
                  {Array.from({ length: 120 }).map((_, i) => {
                    const x = i * 10;
                    if (x < 20) return null;
                    const isMajor = x % 50 === 0;
                    return (
                      <g key={`t-tick-${i}`}>
                        <line x1={x} y1={0} x2={x} y2={isMajor ? 12 : 6} stroke="currentColor" strokeWidth={isMajor ? 1.5 : 0.8} />
                        {isMajor && (
                          <text x={x} y={18} fontSize="8" className="fill-neutral-500 dark:fill-zinc-500 font-mono" textAnchor="middle">{x}</text>
                        )}
                      </g>
                    );
                  })}

                  {/* Left Tick marks & labels */}
                  {Array.from({ length: 80 }).map((_, i) => {
                    const y = i * 10;
                    if (y < 20) return null;
                    const isMajor = y % 50 === 0;
                    return (
                      <g key={`l-tick-${i}`}>
                        <line x1={0} y1={y} x2={isMajor ? 12 : 6} y2={y} stroke="currentColor" strokeWidth={isMajor ? 1.5 : 0.8} />
                        {isMajor && (
                          <text x={18} y={y + 3} fontSize="8" className="fill-neutral-500 dark:fill-zinc-500 font-mono" textAnchor="end">{y}</text>
                        )}
                      </g>
                    );
                  })}

                  {/* Live Mouse indicator markers on rulers */}
                  <line x1={mousePos.x} y1={0} x2={mousePos.x} y2={12} stroke="#6366f1" strokeWidth="2" />
                  <line x1={0} y1={mousePos.y} x2={12} y2={mousePos.y} stroke="#6366f1" strokeWidth="2" />
                </g>
              )}

              {/* Drawing Active Shapes Previews */}
              {tool === 'pencil' && <path key="current-sketch" d={currentPoints ? `M ${currentPoints}` : ''} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
              
              {tool === 'rectangle' && startPoint && currentPoints && currentPoints.includes(' ') && (
                  <rect
                      x={Math.min(startPoint.x, Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x))}
                      y={Math.min(startPoint.y, Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y))}
                      width={Math.abs(startPoint.x - Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x))}
                      height={Math.abs(startPoint.y - Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y))}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                  />
              )}
              {tool === 'circle' && startPoint && currentPoints && currentPoints.includes(' ') && (
                  <ellipse
                      cx={startPoint.x + (Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x) - startPoint.x) / 2}
                      cy={startPoint.y + (Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y) - startPoint.y) / 2}
                      rx={Math.abs(startPoint.x - Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x)) / 2}
                      ry={Math.abs(startPoint.y - Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y)) / 2}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      fill="none"
                  />
              )}
              {tool === 'line' && startPoint && currentPoints && currentPoints.includes(' ') && (
                  <line
                      x1={startPoint.x}
                      y1={startPoint.y}
                      x2={Number(currentPoints.split(' ')[1]?.split(',')[0] || startPoint.x)}
                      y2={Number(currentPoints.split(' ')[1]?.split(',')[1] || startPoint.y)}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray="4 4"
                  />
              )}
          </svg>

          {/* FIGMA-STYLE FLOATING PROPERTY PANEL */}
          {selectedSketchId && selectedSketch && (
            <div className="absolute right-4 top-4 bottom-16 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border border-neutral-200 dark:border-zinc-800 rounded-2xl w-64 shadow-2xl z-40 p-4 space-y-4 overflow-y-auto animate-in slide-in-from-right-8 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-850">
                <div className="flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-[10px] uppercase font-mono font-black text-neutral-500">Properties</span>
                </div>
                <button 
                  onClick={() => setSelectedSketchId(null)} 
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full text-neutral-400"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Title & Dimensions description */}
              <div>
                <span className="text-xs font-bold block text-neutral-800 dark:text-zinc-100 truncate">{selectedSketch.name}</span>
                <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">{selectedSketch.type || 'freehand path'}</span>
              </div>

              {/* Fill styling */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest block">Fill Color</label>
                <div className="grid grid-cols-5 gap-1">
                  {['none', '#ffffff', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#000000'].map(c => (
                    <button
                      key={c}
                      onClick={() => handleUpdateSelectedSketch({ fillColor: c })}
                      className={`h-6 rounded border transition-transform hover:scale-105 ${selectedSketch.fillColor === c ? 'ring-2 ring-indigo-500 scale-102 border-transparent' : 'border-neutral-200 dark:border-zinc-800'}`}
                      style={{ backgroundColor: c === 'none' ? 'transparent' : c }}
                      title={c}
                    >
                      {c === 'none' && <span className="text-[9px] font-mono text-neutral-400">×</span>}
                    </button>
                  ))}
                  {/* Custom Fill text input */}
                  <input
                    type="text"
                    value={selectedSketch.fillColor || 'none'}
                    onChange={(e) => handleUpdateSelectedSketch({ fillColor: e.target.value })}
                    className="col-span-2 text-[10px] font-mono px-1.5 py-0.5 border rounded bg-zinc-50 dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800 text-center"
                    placeholder="#hex"
                  />
                </div>
                {selectedSketch.fillColor && selectedSketch.fillColor !== 'none' && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                      <span>Opacity</span>
                      <span>{Math.round((selectedSketch.fillOpacity ?? 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={selectedSketch.fillOpacity ?? 1}
                      onChange={(e) => handleUpdateSelectedSketch({ fillOpacity: Number(e.target.value) })}
                      className="w-full h-1 bg-neutral-200 dark:bg-zinc-850 rounded accent-indigo-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Stroke Border styling */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest block">Border / Stroke</label>
                <div className="grid grid-cols-5 gap-1">
                  {['#000000', '#ffffff', '#6366f1', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                    <button
                      key={c}
                      onClick={() => handleUpdateSelectedSketch({ color: c })}
                      className={`h-6 rounded border transition-transform hover:scale-105 ${selectedSketch.color === c ? 'ring-2 ring-indigo-500 border-transparent' : 'border-neutral-200 dark:border-zinc-800'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="pt-1">
                  <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                    <span>Thickness</span>
                    <span>{selectedSketch.strokeWidth || 2}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={selectedSketch.strokeWidth || 2}
                    onChange={(e) => handleUpdateSelectedSketch({ strokeWidth: Number(e.target.value) })}
                    className="w-full h-1 bg-neutral-200 dark:bg-zinc-850 rounded accent-indigo-500 cursor-pointer"
                  />
                </div>
                
                {/* Border style dasharray */}
                <div className="pt-1.5">
                  <span className="text-[9px] font-mono text-neutral-400">Style</span>
                  <select
                    value={selectedSketch.strokeDashArray || 'none'}
                    onChange={(e) => handleUpdateSelectedSketch({ strokeDashArray: e.target.value })}
                    className="w-full text-[10px] mt-0.5 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 p-1"
                  >
                    <option value="none">Solid Line</option>
                    <option value="5,5">Dashed</option>
                    <option value="2,2">Dotted</option>
                  </select>
                </div>
              </div>

              {/* Rectangle-specific Corner Rounding & Sizing */}
              {selectedSketch.type === 'rectangle' && selectedSketch.props && (
                <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-zinc-850/50">
                  <label className="text-[9px] font-mono font-black text-neutral-400 uppercase block">Corner Rounding</label>
                  <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                    <span>Radius</span>
                    <span>{selectedSketch.props.rx || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={selectedSketch.props.rx || 0}
                    onChange={(e) => handleUpdateSelectedProps({ rx: Number(e.target.value) })}
                    className="w-full h-1 bg-neutral-200 dark:bg-zinc-850 rounded accent-indigo-500 cursor-pointer"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Width</span>
                      <input
                        type="number"
                        value={selectedSketch.props.width || 0}
                        onChange={(e) => handleUpdateSelectedProps({ width: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Height</span>
                      <input
                        type="number"
                        value={selectedSketch.props.height || 0}
                        onChange={(e) => handleUpdateSelectedProps({ height: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Circle Ellipse Sizing */}
              {selectedSketch.type === 'circle' && selectedSketch.props && (
                <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-zinc-850/50">
                  <label className="text-[9px] font-mono font-black text-neutral-400 uppercase block">Radii Coordinates</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Radius X</span>
                      <input
                        type="number"
                        value={selectedSketch.props.rx || 0}
                        onChange={(e) => handleUpdateSelectedProps({ rx: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Radius Y</span>
                      <input
                        type="number"
                        value={selectedSketch.props.ry || 0}
                        onChange={(e) => handleUpdateSelectedProps({ ry: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Duplication, Deletion & Bridges */}
              <div className="pt-3 border-t border-neutral-100 dark:border-zinc-850/60 space-y-2">
                <button
                  onClick={handlePushToSvgEditor}
                  className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-500/20"
                >
                  <Sparkles size={13} /> Send to SVG Editor
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => duplicateSketch(selectedSketch.id)}
                    className="py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-neutral-700 dark:text-zinc-300 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy size={11} /> Clone
                  </button>
                  <button
                    onClick={() => deleteSketch(selectedSketch.id)}
                    className="py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto max-h-[400px] p-2">
            {sketches.map(s => (
                <div key={s.id} className="border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl bg-neutral-50 dark:bg-zinc-950 space-y-2 relative group">
                    <div className="text-xs font-bold truncate pr-6">{s.name}</div>
                    <div className="text-[10px] font-mono text-neutral-400 uppercase">{s.type || 'path'}</div>
                    <div className="flex gap-1.5 justify-end pt-2">
                        <button onClick={() => duplicateSketch(s.id)} className="p-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-neutral-500 hover:text-indigo-500 cursor-pointer" title="Duplicate"><Copy size={12} /></button>
                        <button onClick={() => setEditingSketch(s)} className="p-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-neutral-500 hover:text-indigo-500 cursor-pointer" title="Rename"><Edit2 size={12} /></button>
                        <button onClick={() => deleteSketch(s.id)} className="p-1.5 bg-red-50 text-red-500 rounded-lg cursor-pointer" title="Delete"><Trash2 size={12} /></button>
                    </div>
                </div>
            ))}
            {sketches.length === 0 && (
              <div className="col-span-full py-12 text-center text-neutral-400 text-xs font-medium">
                No whiteboard sketches found. Go back to drawing mode and make some ideas!
              </div>
            )}
        </div>
      )}

      {/* Editing Sketch modal */}
      {editingSketch && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-neutral-200 dark:border-zinc-800 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
                <h3 className="font-bold text-neutral-800 dark:text-zinc-100 mb-2">Rename Sketch</h3>
                <input 
                    className="border border-neutral-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl w-full text-xs font-bold mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-800 dark:text-zinc-100"
                    value={editingSketch.name}
                    onChange={(e) => setEditingSketch({...editingSketch, name: e.target.value})}
                />
                <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingSketch(null)} className="p-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-600 dark:text-zinc-300 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
                    <button onClick={() => {
                        renameSketch(editingSketch.id, editingSketch.name);
                        setEditingSketch(null);
                    }} className="p-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer">Save Changes</button>
                </div>
            </div>
        </div>
      )}

      {/* Forge Academy Modal */}
      <ForgeAcademy 
        isOpen={academyOpen} 
        onClose={() => setAcademyOpen(false)} 
      />

    </div>
  );
};

function simplifyPoints(points: [number, number][], tolerance: number): [number, number][] {
  if (points.length <= 2) return points;

  let maxSqDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const sqDist = getSqSegDist(points[i], points[0], points[end]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > tolerance * tolerance) {
    const results1 = simplifyPoints(points.slice(0, index + 1), tolerance);
    const results2 = simplifyPoints(points.slice(index), tolerance);
    return results1.slice(0, results1.length - 1).concat(results2);
  }

  return [points[0], points[end]];
}

function getSqSegDist(p: [number, number], p1: [number, number], p2: [number, number]): number {
  let x = p1[0];
  let y = p1[1];
  let dx = p2[0] - x;
  let dy = p2[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

export function smoothPointsToPath(pointsStr: string): string {
  if (!pointsStr) return '';
  const points: [number, number][] = pointsStr.trim().split(' ')
    .map(p => {
      const parts = p.split(',');
      return [Number(parts[0]), Number(parts[1])] as [number, number];
    })
    .filter(([x, y]) => !isNaN(x) && !isNaN(y));

  if (points.length === 0) return '';
  
  const simplified = simplifyPoints(points, 1.2);
  
  if (simplified.length < 2) {
    if (simplified.length === 1) {
      return `M ${simplified[0][0]},${simplified[0][1]} L ${simplified[0][0]},${simplified[0][1]}`;
    }
    return '';
  }
  
  let d = `M ${simplified[0][0]},${simplified[0][1]}`;
  
  if (simplified.length === 2) {
    d += ` L ${simplified[1][0]},${simplified[1][1]}`;
    return d;
  }
  
  for (let i = 1; i < simplified.length - 1; i++) {
    const xc = (simplified[i][0] + simplified[i + 1][0]) / 2;
    const yc = (simplified[i][1] + simplified[i + 1][1]) / 2;
    d += ` Q ${simplified[i][0]},${simplified[i][1]} ${xc},${yc}`;
  }
  
  const last = simplified[simplified.length - 1];
  const secondLast = simplified[simplified.length - 2];
  d += ` Q ${secondLast[0]},${secondLast[1]} ${last[0]},${last[1]}`;
  
  return d;
}
