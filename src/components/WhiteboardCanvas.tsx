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
  const [sketches, setSketches] = useState<{ id: string; name: string; path: string }[]>([]);
  const [currentPoints, setCurrentPoints] = useState<string>('');
  const [mode, setMode] = useState<'drawing' | 'gallery'>('drawing');
  const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line'>('pencil');
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [pencilType, setPencilType] = useState<'pen' | 'marker'>('pen');
  const [editingSketch, setEditingSketch] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (activeProject?.whiteboardSketches) {
      setSketches(activeProject.whiteboardSketches);
    }
  }, [activeProject?.whiteboardSketches]);

  const saveSketch = async (updatedSketches: { id: string; name: string; path: string }[]) => {
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

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'drawing') return;
    if (tool === 'pencil' || tool === 'line') {
        setIsDrawing(true);
        const point = getPoint(e);
        setStartPoint(point);
        setCurrentPoints(`${point.x},${point.y}`);
    } else if (tool === 'sweeping-eraser' || tool === 'duster-eraser') {
        // Simple sweeping eraser: clear path if close enough
        // This is a naive implementation
        setIsDrawing(true);
        // ... (implement path intersection later)
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const point = getPoint(e);
    
    if (tool === 'pencil') {
      setCurrentPoints(prev => `${prev} ${point.x},${point.y}`);
    } else if (tool === 'line' && startPoint) {
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
      // Find a sketch to delete
      const deletedSketch = sketches.find(s => {
        if (!s.path) return false;
        const cleanPath = s.path.replace('M ', '').trim();
        if (!cleanPath) return false;
        const coords = cleanPath.split(' ')
          .map(p => {
            const parts = p.split(',');
            if (parts.length < 2) return null;
            const x = Number(parts[0]);
            const y = Number(parts[1]);
            return isNaN(x) || isNaN(y) ? null : [x, y];
          })
          .filter((coord): coord is [number, number] => coord !== null);
        return coords.some(([x, y]) => Math.sqrt((x - point.x)**2 + (y - point.y)**2) < 20);
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
    } else if (tool === 'pencil' && currentPoints) {
        const smoothedPath = smoothPointsToPath(currentPoints);
        const newSketch = {
            id: Date.now().toString(),
            name: `Sketch ${sketches.length + 1}`,
            path: smoothedPath || `M ${currentPoints}`
        };
        const updatedSketches = [...sketches, newSketch];
        setSketches(updatedSketches);
        await saveSketch(updatedSketches);
        setCurrentPoints('');
    }
  };

  return (
    <div className={`relative bg-white dark:bg-black rounded-3xl p-4 border border-neutral-200 dark:border-zinc-800 ${fullscreen ? 'fixed inset-0 z-50' : 'w-full h-[500px]'}`}>
        {!fullscreen && (
            <WhiteboardToolbar 
                tool={tool} 
                setTool={setTool} 
                mode={mode} 
                setMode={setMode} 
                setFullscreen={setFullscreen} 
                fullscreen={fullscreen}
                onUndo={undo}
                onRedo={redo}
            />
        )}
        {fullscreen && (
            <button 
                onClick={() => setFullscreen(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg"
            >
                <Maximize2 size={20} />
            </button>
        )}

      {mode === 'drawing' ? (
        <svg 
            ref={canvasRef}
            className="w-full h-[400px] border border-neutral-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-black touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
            >
            {sketches.map((sketch) => (
                <path key={sketch.id} d={sketch.path} fill="none" stroke="currentColor" strokeWidth="2" />
            ))}
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
            {tool === 'pencil' && <path key="current-sketch" d={currentPoints ? `M ${currentPoints}` : ''} fill="none" stroke="currentColor" strokeWidth="2" />}
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
