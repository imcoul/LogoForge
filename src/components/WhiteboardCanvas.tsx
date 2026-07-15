import { WhiteboardToolbar } from './WhiteboardToolbar';
import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Node } from '../types';
import { Trash2, Copy, Edit2, Grid, PenTool, Square, Circle, Maximize2, Save } from 'lucide-react';

export const WhiteboardCanvas: React.FC<{ fullscreen: boolean, setFullscreen: (f: boolean) => void }> = ({ fullscreen, setFullscreen }) => {
  const { activeProjectId, projects, updateProject, undo, redo } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const canvasRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sketches, setSketches] = useState<{ id: string; name: string; path?: string; color?: string; strokeWidth?: number; type?: 'path' | 'rectangle' | 'circle' | 'line'; props?: any }[]>([]);
  const [currentPoints, setCurrentPoints] = useState<string>('');
  const [mode, setMode] = useState<'drawing' | 'gallery'>('drawing');
  const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line' | 'rectangle' | 'circle' | 'select'>('select');
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [pencilType, setPencilType] = useState<'pen' | 'marker'>('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [editingSketch, setEditingSketch] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (activeProject?.whiteboardSketches) {
      setSketches(activeProject.whiteboardSketches);
    }
  }, [activeProject?.whiteboardSketches]);

  const saveSketch = async (updatedSketches: { id: string; name: string; path?: string; color?: string; strokeWidth?: number; type?: 'path' | 'rectangle' | 'circle' | 'line'; props?: any }[]) => {
    if (activeProjectId && activeProject) {
        await updateProject(activeProjectId, { whiteboardSketches: updatedSketches });
    }
  };

  const deleteSketch = (id: string) => {
    const updated = sketches.filter(s => s.id !== id);
    setSketches(updated);
    saveSketch(updated);
  };

  const duplicateSketch = (id: string) => {
    const sketch = sketches.find(s => s.id === id);
    if (!sketch) return;
    const newSketch = { ...sketch, id: Date.now().toString(), name: `${sketch.name} (copy)` };
    const updated = [...sketches, newSketch];
    setSketches(updated);
    saveSketch(updated);
  };

  const renameSketch = (id: string, name: string) => {
    const updated = sketches.map(s => s.id === id ? { ...s, name } : s);
    setSketches(updated);
    saveSketch(updated);
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = canvasRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
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
    const point = getPoint(e);
    
    if (tool === 'select') {
        const hit = getHitSketch(point);
        if (hit) {
            setSelectedSketchId(hit.id);
            setIsDrawing(true);
            setStartPoint(point);
            setDragOffset({ x: 0, y: 0 }); // To accumulate total translation during the drag
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
    if (!isDrawing) return;
    const point = getPoint(e);
    
    if (tool === 'select' && selectedSketchId && startPoint) {
      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;
      setDragOffset({ x: dx, y: dy });
    } else if (tool === 'pencil') {
      setCurrentPoints(prev => `${prev} ${point.x},${point.y}`);
    } else if ((tool === 'line' || tool === 'rectangle' || tool === 'circle') && startPoint) {
      let endPoint = point;
      if (e.shiftKey) {
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
      }
      
      // Find a node to delete
      const nodeToDelete = (activeProject?.sceneGraph || []).find(n => {
          return Math.sqrt((n.transform.x - point.x)**2 + (n.transform.y - point.y)**2) < 50; // simple distance check
      });
      if (nodeToDelete && activeProjectId) {
          const updatedNodes = (activeProject?.sceneGraph || []).filter(n => n.id !== nodeToDelete.id);
          updateProject(activeProjectId, { sceneGraph: updatedNodes });
      }
    } else if (tool === 'duster-eraser') {
        setSketches([]);
        saveSketch([]);
        if (activeProjectId) {
            updateProject(activeProjectId, { sceneGraph: [] });
        }
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
                    // simple translation of all points in the path
                    const translatedPath = s.path.replace(/([0-9.-]+),([0-9.-]+)/g, (match, px, py) => {
                        return `${Number(px) + dx},${Number(py) + dy}`;
                    });
                    return { ...s, path: translatedPath };
                }
                return s;
            });
            setSketches(updatedSketches);
            await saveSketch(updatedSketches);
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
                        const newNode: Node = {
                            id: Date.now().toString(),
                            type: 'line',
                            transform: { x: startPoint.x, y: startPoint.y, scaleX: 1, scaleY: 1, rotate: 0 },
                            props: { x2: endPointX - startPoint.x, y2: endPointY - startPoint.y },
                            meta: { createdBy: 'user', timestamp: new Date().toISOString() }
                        };
                        if (activeProjectId) {
                            const updatedNodes = [...(activeProject?.sceneGraph || []), newNode];
                            await updateProject(activeProjectId, { sceneGraph: updatedNodes });
                        }
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
                                props: { x, y, width, height },
                                color: strokeColor,
                                strokeWidth
                            };
                            const updatedSketches = [...sketches, newSketch];
                            setSketches(updatedSketches);
                            await saveSketch(updatedSketches);
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
                                strokeWidth
                            };
                            const updatedSketches = [...sketches, newSketch];
                            setSketches(updatedSketches);
                            await saveSketch(updatedSketches);
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
            strokeWidth
        };
        const updatedSketches = [...sketches, newSketch];
        setSketches(updatedSketches);
        await saveSketch(updatedSketches);
        setCurrentPoints('');
    }
  };

  return (
    <div className={`bg-white dark:bg-black border border-neutral-200 dark:border-zinc-800 flex flex-col gap-4 ${fullscreen ? 'fixed inset-0 z-50 w-screen h-screen p-6 rounded-none' : 'relative rounded-3xl p-4 w-full h-[520px]'}`}>
        <WhiteboardToolbar 
             tool={tool} 
             setTool={setTool as any} 
             mode={mode} 
             setMode={setMode} 
             setFullscreen={setFullscreen} 
             fullscreen={fullscreen}
            onUndo={undo}
            onRedo={redo}
            color={strokeColor}
            setColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
        />

      {mode === 'drawing' ? (
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
            {sketches.map((sketch) => {
                const isSelected = sketch.id === selectedSketchId;
                const tx = isSelected && dragOffset ? dragOffset.x : 0;
                const ty = isSelected && dragOffset ? dragOffset.y : 0;
                const transform = tx || ty ? `translate(${tx}, ${ty})` : undefined;
                const strokeClass = isSelected ? "opacity-75 drop-shadow-md" : "";
                
                if (sketch.type === 'rectangle' && sketch.props) {
                    return <rect key={sketch.id} x={sketch.props.x} y={sketch.props.y} width={sketch.props.width} height={sketch.props.height} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} transform={transform} className={strokeClass} />;
                }
                if (sketch.type === 'circle' && sketch.props) {
                    return <ellipse key={sketch.id} cx={sketch.props.cx} cy={sketch.props.cy} rx={sketch.props.rx} ry={sketch.props.ry} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} transform={transform} className={strokeClass} />;
                }
                return <path key={sketch.id} d={sketch.path} fill="none" stroke={sketch.color || 'currentColor'} strokeWidth={sketch.strokeWidth || 2} transform={transform} className={strokeClass} />;
            })}
            {(activeProject?.sceneGraph || []).filter(n => n.type === 'line').map((node) => (
                <line
                    key={node.id}
                    x1={0}
                    y1={0}
                    x2={node.props?.x2}
                    y2={node.props?.y2}
                    transform={`translate(${node.transform.x}, ${node.transform.y})`}
                    stroke="currentColor"
                    strokeWidth="2"
                />
            ))}
            {(activeProject?.sceneGraph || []).filter(n => n.type === 'image').map((node) => (
                <image 
                    key={node.id} 
                    href={node.props?.src} 
                    x={node.transform.x} 
                    y={node.transform.y} 
                    width={100} 
                    height={100} 
                />
            ))}
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
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                />
            )}
        </svg>
      ) : (
        <div className="grid grid-cols-2 gap-4">
            {sketches.map(s => (
                <div key={s.id} className="border p-2 rounded">
                    <div className="text-xs truncate">{s.name}</div>
                    <div className="flex gap-1 justify-end">
                        <button onClick={() => deleteSketch(s.id)}><Trash2 size={16} /></button>
                        <button onClick={() => duplicateSketch(s.id)}><Copy size={16} /></button>
                        <button onClick={() => setEditingSketch(s)}><Edit2 size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
      )}
      {editingSketch && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg">
                <h3 className="font-bold mb-2">Edit Sketch</h3>
                <input 
                    className="border p-2 w-full mb-4"
                    value={editingSketch.name}
                    onChange={(e) => setEditingSketch({...editingSketch, name: e.target.value})}
                />
                <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingSketch(null)} className="p-2">Cancel</button>
                    <button onClick={() => {
                        renameSketch(editingSketch.id, editingSketch.name);
                        setEditingSketch(null);
                    }} className="p-2 bg-indigo-500 text-white rounded">Save</button>
                </div>
            </div>
        </div>
      )}
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
  
  // Simplify points using Ramer-Douglas-Peucker (RDP) algorithm to remove noisy jitter
  const simplified = simplifyPoints(points, 1.2);
  
  if (simplified.length < 2) {
    if (simplified.length === 1) {
      return `M ${simplified[0][0]},${simplified[0][1]} L ${simplified[0][0]},${simplified[0][1]}`;
    }
    return '';
  }
  
  // Interpolate using smooth quadratic Bezier curves (midpoint curve-fitting)
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
  
  // Connect cleanly to the last point
  const last = simplified[simplified.length - 1];
  const secondLast = simplified[simplified.length - 2];
  d += ` Q ${secondLast[0]},${secondLast[1]} ${last[0]},${last[1]}`;
  
  return d;
}
