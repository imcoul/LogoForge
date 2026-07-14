import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Trash2, Copy, Edit2, Grid, PenTool, Square, Circle, Maximize2, Save } from 'lucide-react';

export const WhiteboardCanvas: React.FC = () => {
  const { activeProjectId, projects, updateProject } = useAppStore();
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const canvasRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sketches, setSketches] = useState<{ id: string; name: string; path: string }[]>([]);
  const [currentPoints, setCurrentPoints] = useState<string>('');
  const [mode, setMode] = useState<'drawing' | 'gallery'>('drawing');
  const [fullscreen, setFullscreen] = useState(false);

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
    setIsDrawing(true);
    const point = getPoint(e);
    setCurrentPoints(`${point.x},${point.y}`);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'drawing') return;
    const point = getPoint(e);
    setCurrentPoints(prev => `${prev} ${point.x},${point.y}`);
  };

  const handleMouseUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints) {
        const newSketch = {
            id: Date.now().toString(),
            name: `Sketch ${sketches.length + 1}`,
            path: `M ${currentPoints}`
        };
        const updatedSketches = [...sketches, newSketch];
        setSketches(updatedSketches);
        await saveSketch(updatedSketches);
        setCurrentPoints('');
    }
  };

  return (
    <div className={`relative bg-white dark:bg-black rounded-3xl p-4 border border-neutral-200 dark:border-zinc-800 ${fullscreen ? 'fixed inset-0 z-50' : 'w-full h-[500px]'}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
            <button onClick={() => setMode('drawing')} className={`p-2 rounded ${mode === 'drawing' ? 'bg-indigo-100' : ''}`}><PenTool size={20} /></button>
            <button onClick={() => setMode('gallery')} className={`p-2 rounded ${mode === 'gallery' ? 'bg-indigo-100' : ''}`}><Grid size={20} /></button>
            <button onClick={() => setFullscreen(!fullscreen)} className="p-2 rounded"><Maximize2 size={20} /></button>
        </div>
        <div className="font-bold">{mode === 'drawing' ? 'Drawing' : 'Gallery'}</div>
      </div>

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
            <path key="current-sketch" d={currentPoints ? `M ${currentPoints}` : ''} fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <div className="grid grid-cols-2 gap-4">
            {sketches.map(s => (
                <div key={s.id} className="border p-2 rounded">
                    <div className="text-xs truncate">{s.name}</div>
                    <div className="flex gap-1 justify-end">
                        <button onClick={() => deleteSketch(s.id)}><Trash2 size={16} /></button>
                        <button onClick={() => duplicateSketch(s.id)}><Copy size={16} /></button>
                        <button onClick={() => renameSketch(s.id, prompt('New name:', s.name) || s.name)}><Edit2 size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};
