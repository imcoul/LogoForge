import { WhiteboardToolbar } from './WhiteboardToolbar';
import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store';
import {
  getSqSegDist,
  snapCoords as snapCoordsToGrid,
  translatePath,
  convertShapeToPath,
  isPointInsideShape,
} from '../engine/legacyWhiteboardGeometry';
import { 
  Trash2, Copy, Edit2, Grid, PenTool, Square, Circle, 
  Maximize2, Save, Sparkles, BookOpen, Sliders, ChevronRight,
  Settings, CheckCircle, RefreshCw, Undo, Redo, HelpCircle, X,
  Lock, Unlock
} from 'lucide-react';
import { ForgeAcademy } from './ForgeAcademy';
import { useToast } from './Toast';
import { AiPreviewSlider } from './AiPreviewSlider';

// Define a worker pool for geometric processing
let pathWorkerInstance: Worker | null = null;
if (typeof window !== 'undefined') {
  try {
    pathWorkerInstance = new Worker(new URL('../workers/pathWorker.ts', import.meta.url), { type: 'module' });
  } catch (e) {
    console.warn("Failed to initialize pathWorker", e);
  }
}

export const WhiteboardCanvas: React.FC<{ fullscreen: boolean, setFullscreen: (f: boolean) => void, onUpdateAndSync?: (updates: any, throttleCloud?: boolean) => Promise<void>, onGhostSync?: (ghostData: any) => void, onRedirectToPrecision?: () => void }> = ({ fullscreen, setFullscreen, onUpdateAndSync, onGhostSync, onRedirectToPrecision }) => {
  const { activeProjectId, projects, updateProject, ephemeralGhosts, settings } = useAppStore();
  const { toast } = useToast();
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
    locked?: boolean;
    maskId?: string;
    maskType?: 'hide' | 'reveal';
  }[]>([]);
  
  const [currentPoints, setCurrentPoints] = useState<string>('');
  const [mode, setMode] = useState<'drawing' | 'gallery'>('drawing');
  const [tool, setTool] = useState<'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'slice-eraser' | 'line' | 'rectangle' | 'circle' | 'select'>('select');
  const [selectedSketchId, setSelectedSketchId] = useState<string | null>(null);
  const [showOptionsPanel, setShowOptionsPanel] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<{ sketchId: string; handleId: string } | null>(null);
  const [dragOffset, setDragOffset] = useState<{x: number, y: number} | null>(null);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
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

  // AI Sketch Copilot States
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiDraftSketches, setAiDraftSketches] = useState<any[] | null>(null);
  const [aiDraftMetadata, setAiDraftMetadata] = useState<{ model: string, prompt: string, timestamp: string } | null>(null);
  const [isAiDraftMode, setIsAiDraftMode] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    try {
      const activeModel = settings.assistantModel || 'gemini-2.5-flash';
      const temperature = settings.assistantTemperature !== undefined ? settings.assistantTemperature : 0.2;
      const topK = settings.assistantTopK !== undefined ? settings.assistantTopK : 40;

      const systemInstruction = `You are an expert design co-pilot that generates whiteboard vector elements.
You MUST output a raw JSON array of whiteboard sketches representing the user's request.
Each element in the array MUST match this TypeScript type structure exactly:
{
  "id": "string", // unique random id e.g. "ai-sketch-1"
  "name": "string", // human readable name
  "type": "rectangle" | "circle" | "line" | "path",
  "color": "string", // stroke hex color
  "strokeWidth": 3, // stroke width (1-20)
  "fillColor": "string", // optional fill color or "none"
  "fillOpacity": 1, // optional fill opacity (0.0 - 1.0)
  "strokeDashArray": "string", // optional e.g. "none" or "5,5" or "2,2"
  "path": "string", // required for 'line' or 'path' e.g. "M 100,100 L 200,200"
  "props": {
    "x": 100, // for rectangle
    "y": 100, // for rectangle
    "width": 150, // for rectangle
    "height": 100, // for rectangle
    "rx": 8, // for rounded rectangle corners
    "cx": 100, // for circle
    "cy": 100, // for circle
    "rx": 50, // for circle radius X
    "ry": 50, // for circle radius Y
    "x1": 100, // for line
    "y1": 100, // for line
    "x2": 200, // for line
    "y2": 200, // for line
    "lineStyle": "straight" | "curved" | "elbow"
  }
}

Create a beautifully styled, perfectly structured visual diagram, flowchart, or shape layout on an 800x600 canvas.
Make sure the shapes have modern, cohesive flat colors (e.g., slate, indigo, emerald) and are properly positioned so they don't overlap awkwardly.
Always return ONLY the JSON block. Do NOT wrap it in markdown block code fences, and do NOT write any markdown conversational text.`;

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-custom-api-key': settings.geminiKey || ''
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          model: activeModel,
          temperature,
          topK,
          systemInstruction,
          responseMimeType: 'application/json'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate from Gemini server endpoint');
      }

      const data = await response.json();
      let generatedSketches = JSON.parse(data.text);
      if (Array.isArray(generatedSketches)) {
        // Inject generation metadata
        generatedSketches = generatedSketches.map((item, idx) => ({
          ...item,
          id: item.id || `ai-${Date.now()}-${idx}`,
          color: item.color || '#6366f1',
          strokeWidth: item.strokeWidth || 3,
          props: {
            ...item.props,
            generatedBy: activeModel,
            generationPrompt: aiPrompt,
            generatedAt: new Date().toISOString()
          }
        }));

        setAiDraftSketches(generatedSketches);
        setAiDraftMetadata({
          model: activeModel,
          prompt: aiPrompt,
          timestamp: new Date().toISOString()
        });
        setIsAiDraftMode(true);
        toast(`Generated ${generatedSketches.length} AI elements. Please review to accept or discard.`, 'success');
        setAiPrompt('');
        setIsAiPanelOpen(false);
      } else {
        throw new Error('Gemini response is not a valid list of whiteboard sketches.');
      }
    } catch (err: any) {
      console.error(err);
      toast('AI whiteboarding error: ' + (err.message || String(err)), 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

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
    locked?: boolean;
    maskId?: string;
    maskType?: 'hide' | 'reveal';
  }[][]>([]);
  const [sketchesHistoryIndex, setSketchesHistoryIndex] = useState<number>(-1);

  // Multitouch Gesture Chords tracking
  const tapStartTimeRef = useRef<number>(0);
  const tapMaxFingersRef = useRef<number>(0);
  const tapMovedRef = useRef<boolean>(false);

  const getSketchBoundingBox = (sketch: any) => {
    if (!sketch) return null;
    if (sketch.type === 'rectangle' && sketch.props) {
      const { x, y, width, height } = sketch.props;
      return { x, y: y - 45, width, height };
    } else if (sketch.type === 'circle' && sketch.props) {
      const { cx, cy, rx, ry } = sketch.props;
      return { x: cx - rx, y: cy - ry - 45, width: rx * 2, height: ry * 2 };
    } else if (sketch.type === 'line') {
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
      const matchQ = sketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*Q\s*([0-9.-]+),([0-9.-]+)\s*([0-9.-]+),([0-9.-]+)/i);
      const matchL = sketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/i);
      if (matchQ) {
        x1 = parseFloat(matchQ[1]);
        y1 = parseFloat(matchQ[2]);
        x2 = parseFloat(matchQ[5]);
        y2 = parseFloat(matchQ[6]);
      } else if (matchL) {
        x1 = parseFloat(matchL[1]);
        y1 = parseFloat(matchL[2]);
        x2 = parseFloat(matchL[3]);
        y2 = parseFloat(matchL[4]);
      }
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      return { x: minX, y: minY - 45, width: Math.abs(x1 - x2), height: Math.abs(y1 - y2) };
    } else if (sketch.path) {
      const matches = [...sketch.path.matchAll(/([0-9.-]+),([0-9.-]+)/g)];
      if (matches.length > 0) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        matches.forEach(m => {
          const px = parseFloat(m[1]);
          const py = parseFloat(m[2]);
          if (px < minX) minX = px;
          if (py < minY) minY = py;
          if (px > maxX) maxX = px;
          if (py > maxY) maxY = py;
        });
        return { x: minX, y: minY - 45, width: maxX - minX, height: maxY - minY };
      }
    }
    return { x: 100, y: 100, width: 200, height: 100 };
  };

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
  const saveSketch = async (updatedSketches: typeof sketches, throttleCloud: boolean = true) => {
    if (activeProjectId && activeProject) {
        if (onUpdateAndSync) {
            await onUpdateAndSync({ whiteboardSketches: updatedSketches }, throttleCloud);
        } else {
            await updateProject(activeProjectId, { whiteboardSketches: updatedSketches }, throttleCloud);
        }
    }
  };

  const updateSketchesWithHistory = (updated: typeof sketches, throttleCloud: boolean = true) => {
    // Basic deduplication
    if (updated === sketches || (updated.length === sketches.length && JSON.stringify(updated) === JSON.stringify(sketches))) return;

    setSketches(updated);
    saveSketch(updated, throttleCloud);
    
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
    const target = sketches.find(s => s.id === id);
    if (target?.locked) return;
    const updated = sketches.filter(s => s.id !== id);
    if (selectedSketchId === id) setSelectedSketchId(null);
    updateSketchesWithHistory(updated, true);
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
  const snapCoords = (point: { x: number, y: number }) => snapCoordsToGrid(point, snapToGrid);

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

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (tool !== 'select') return;
    const rawPoint = getPoint(e);
    const hit = getHitSketch(rawPoint);
    if (hit) {
      setSelectedSketchId(hit.id);
      setShowOptionsPanel(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'drawing') return;

    if ('touches' in e) {
      if (e.touches.length === 1) {
        tapStartTimeRef.current = Date.now();
        tapMaxFingersRef.current = 1;
        tapMovedRef.current = false;
      } else if (e.touches.length > tapMaxFingersRef.current) {
        tapMaxFingersRef.current = e.touches.length;
        tapMovedRef.current = false;
      }
      
      // Cancel drawing if multi-touch
      if (e.touches.length > 1) {
        setIsDrawing(false);
        return;
      }
    }

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
            setShowOptionsPanel(false);
        }
    } else if (tool === 'pencil' || tool === 'line' || tool === 'rectangle' || tool === 'circle') {
        setSelectedSketchId(null);
        setIsDrawing(true);
        setStartPoint(point);
        setCurrentPoints(`${point.x},${point.y}`);
    } else if (tool === 'sweeping-eraser' || tool === 'duster-eraser' || tool === 'slice-eraser') {
        setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'select' && selectedSketchId && startPoint && isDrawing && onGhostSync) {
      const point = snapCoords(getPoint(e));
      const dx = point.x - snapCoords(startPoint).x;
      const dy = point.y - snapCoords(startPoint).y;
      onGhostSync({ sketchId: selectedSketchId, dx, dy });
    }
    
    if ('touches' in e) {
      tapMovedRef.current = true;
      if (e.touches.length > 1) return;
    }

    const rawPoint = getPoint(e);
    setMousePos(rawPoint);

    if (!isDrawing) return;
    const point = snapCoords(rawPoint);

    if (activeHandle) {
      const sketch = sketches.find(s => s.id === activeHandle.sketchId);
      if (sketch && !sketch.locked) {
        let updatedSketches = sketches;
        if (sketch.type === 'rectangle' && sketch.props) {
          const props = sketch.props;
          let newX = props.x;
          let newY = props.y;
          let newW = props.width;
          let newH = props.height;
          
          if (activeHandle.handleId === 'br') {
            newW = Math.max(5, point.x - props.x);
            newH = Math.max(5, point.y - props.y);
          } else if (activeHandle.handleId === 'tl') {
            newX = Math.min(props.x + props.width - 5, point.x);
            newY = Math.min(props.y + props.height - 5, point.y);
            newW = props.x + props.width - newX;
            newH = props.y + props.height - newY;
          } else if (activeHandle.handleId === 'tr') {
            newY = Math.min(props.y + props.height - 5, point.y);
            newW = Math.max(5, point.x - props.x);
            newH = props.y + props.height - newY;
          } else if (activeHandle.handleId === 'bl') {
            newX = Math.min(props.x + props.width - 5, point.x);
            newW = props.x + props.width - newX;
            newH = Math.max(5, point.y - props.y);
          }
          
          updatedSketches = sketches.map(s => {
            if (s.id === sketch.id) {
              return { ...s, props: { ...s.props, x: newX, y: newY, width: newW, height: newH } };
            }
            return s;
          });
        } else if (sketch.type === 'circle' && sketch.props) {
          const props = sketch.props;
          let newRx = props.rx;
          let newRy = props.ry;
          
          if (activeHandle.handleId === 'top' || activeHandle.handleId === 'bottom') {
            newRy = Math.max(5, Math.abs(point.y - props.cy));
          } else if (activeHandle.handleId === 'left' || activeHandle.handleId === 'right') {
            newRx = Math.max(5, Math.abs(point.x - props.cx));
          }
          
          updatedSketches = sketches.map(s => {
            if (s.id === sketch.id) {
              return { ...s, props: { ...s.props, rx: newRx, ry: newRy } };
            }
            return s;
          });
        } else if (sketch.type === 'line') {
          let x1 = sketch.props?.x1;
          let y1 = sketch.props?.y1;
          let x2 = sketch.props?.x2;
          let y2 = sketch.props?.y2;
          let cx = sketch.props?.curveX;
          let cy = sketch.props?.curveY;

          const lineStyle = sketch.props?.lineStyle || (sketch.path?.includes('Q') ? 'curved' : 'straight');

          if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
            const matchQ = sketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*Q\s*([0-9.-]+),([0-9.-]+)\s*([0-9.-]+),([0-9.-]+)/i);
            const matchL = sketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/i);
            if (matchQ) {
              x1 = parseFloat(matchQ[1]);
              y1 = parseFloat(matchQ[2]);
              cx = parseFloat(matchQ[3]);
              cy = parseFloat(matchQ[4]);
              x2 = parseFloat(matchQ[5]);
              y2 = parseFloat(matchQ[6]);
            } else if (matchL) {
              x1 = parseFloat(matchL[1]);
              y1 = parseFloat(matchL[2]);
              x2 = parseFloat(matchL[3]);
              y2 = parseFloat(matchL[4]);
              cx = (x1 + x2) / 2;
              cy = (y1 + y2) / 2;
            } else {
              x1 = 0; y1 = 0; x2 = 100; y2 = 100;
              cx = 50; cy = 50;
            }
          }

          if (cx === undefined || cy === undefined) {
            cx = (x1 + x2) / 2;
            cy = (y1 + y2) / 2;
          }

          if (activeHandle.handleId === 'start') {
            x1 = point.x;
            y1 = point.y;
          } else if (activeHandle.handleId === 'end') {
            x2 = point.x;
            y2 = point.y;
          } else if (activeHandle.handleId === 'curve') {
            cx = point.x;
            cy = point.y;
          }

          let newPath = '';
          if (lineStyle === 'curved') {
            newPath = `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
          } else if (lineStyle === 'elbow') {
            newPath = `M ${x1},${y1} L ${x2},${y1} L ${x2},${y2}`;
          } else {
            newPath = `M ${x1},${y1} L ${x2},${y2}`;
          }

          updatedSketches = sketches.map(s => {
            if (s.id === sketch.id) {
              return { 
                ...s, 
                path: newPath,
                props: { 
                  ...s.props,
                  x1,
                  y1,
                  x2,
                  y2,
                  curveX: cx,
                  curveY: cy,
                  lineStyle
                } 
              };
            }
            return s;
          });
        }
        
        setSketches(updatedSketches);
      }
      return;
    }
    
    if (tool === 'select' && selectedSketchId && startPoint) {
      const selectedSketch = sketches.find(s => s.id === selectedSketchId);
      if (selectedSketch?.locked) return;
      const rawDx = rawPoint.x - startPoint.x;
      const rawDy = rawPoint.y - startPoint.y;
      const dx = snapToGrid ? Math.round(rawDx / 10) * 10 : rawDx;
      const dy = snapToGrid ? Math.round(rawDy / 10) * 10 : rawDy;
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
        if (s.locked) return false;
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
    } else if (tool === 'slice-eraser') {
      const threshold = 15;
      let anyChanged = false;
      const updatedSketches = sketches.map(s => {
        if (s.locked || !s.path || s.type !== 'path') return s;
        const commands = s.path.match(/[A-Za-z][^A-Za-z]*/g);
        if (!commands) return s;
        let newPath = '';
        let wasErased = false;
        let s_changed = false;
        let lastSafePoint: [number, number] | null = null;

        for (const cmdStr of commands) {
            const type = cmdStr.trim()[0];
            const nums = cmdStr.substring(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            let erased = false;
            if (nums.length >= 2) {
                const ex = nums[nums.length - 2];
                const ey = nums[nums.length - 1];
                
                // If it's a line or curve, check distance to the segment if we have a previous point
                let segErased = false;
                if (lastSafePoint) {
                   const distSq = getSqSegDist([rawPoint.x, rawPoint.y], lastSafePoint, [ex, ey]);
                   if (distSq < threshold * threshold) {
                       segErased = true;
                   }
                } else {
                   const distSq = (rawPoint.x - ex) ** 2 + (rawPoint.y - ey) ** 2;
                   if (distSq < threshold * threshold) {
                       segErased = true;
                   }
                }
                
                if (segErased) {
                    wasErased = true;
                    s_changed = true;
                    erased = true;
                } else {
                    lastSafePoint = [ex, ey];
                }
            }
            if (erased) continue;

            if (wasErased && type !== 'M' && type !== 'Z' && nums.length >= 2) {
                newPath += `M ${nums[nums.length - 2]},${nums[nums.length - 1]} `;
                wasErased = false;
            } else {
                newPath += cmdStr + ' ';
            }
        }
        if (s_changed) {
            anyChanged = true;
            return { ...s, path: newPath.trim() };
        }
        return s;
      });
      
      if (anyChanged) {
          updateSketchesWithHistory(updatedSketches, true);
      }
    } else if (tool === 'duster-eraser') {
        if (sketches.length > 0) {
            updateSketchesWithHistory([], true);
        }
    }
  };

  const handleMouseUp = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'changedTouches' in e && e.touches.length === 0 && tapMaxFingersRef.current >= 2) {
      const touchDuration = Date.now() - tapStartTimeRef.current;
      if (touchDuration < 350 && !tapMovedRef.current) {
        if (tapMaxFingersRef.current === 2) {
           handleLocalUndo();
        } else if (tapMaxFingersRef.current === 3) {
           handleLocalRedo();
        }
      }
      tapMaxFingersRef.current = 0;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeHandle) {
      updateSketchesWithHistory(sketches);
      setActiveHandle(null);
      return;
    }
    
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
        const rawPoints = currentPoints;
        setCurrentPoints('');
        
        if (pathWorkerInstance) {
          const tempId = Date.now().toString();
          
          // Render immediate unsmoothed path
          const newSketch = {
            id: tempId,
            name: `Sketch ${sketches.length + 1}`,
            path: `M ${rawPoints}`,
            color: strokeColor,
            strokeWidth,
            type: 'path' as const
          };
          updateSketchesWithHistory([...sketches, newSketch]);
          
          // Setup message handler
          const workerHandler = (e: MessageEvent) => {
             if (e.data.id === tempId) {
                 pathWorkerInstance!.removeEventListener('message', workerHandler);
                 if (e.data.error) {
                    console.error("pathWorker error:", e.data.error);
                    return;
                 }
                 
                 const simplified: {x: number, y: number}[] = e.data.points;
                 if (!simplified || simplified.length < 2) return;
                 
                 let d = `M ${simplified[0].x},${simplified[0].y}`;
                 if (simplified.length === 2) {
                   d += ` L ${simplified[1].x},${simplified[1].y}`;
                 } else {
                   for (let i = 1; i < simplified.length - 1; i++) {
                     const xc = (simplified[i].x + simplified[i + 1].x) / 2;
                     const yc = (simplified[i].y + simplified[i + 1].y) / 2;
                     d += ` Q ${simplified[i].x},${simplified[i].y} ${xc},${yc}`;
                   }
                   const last = simplified[simplified.length - 1];
                   const secondLast = simplified[simplified.length - 2];
                   d += ` Q ${secondLast.x},${secondLast.y} ${last.x},${last.y}`;
                 }

                 // We must update the state functionally to avoid stale closure on `sketches`
                 setSketches(prev => {
                    const updated = prev.map(s => s.id === tempId ? { ...s, path: d } : s);
                    saveSketch(updated); // Background push
                    
                    // We also need to update sketchesHistory for correct redo/undo state
                    setSketchesHistory(history => {
                       const newHistory = [...history];
                       if (newHistory.length > 0) {
                         const currentIdx = sketchesHistoryIndex;
                         // Replace the last history item (which was the unsmoothed one) with this smoothed one
                         newHistory[currentIdx] = updated;
                       }
                       return newHistory;
                    });
                    
                    return updated;
                 });
             }
          };
          
          // Let's parse current points to {x,y} array for the worker
          const pointsArr = rawPoints.trim().split(' ').map(p => {
             const [x,y] = p.split(',');
             return {x: Number(x), y: Number(y)};
          });
          
          pathWorkerInstance.addEventListener('message', workerHandler);
          pathWorkerInstance.postMessage({ id: tempId, points: pointsArr, tolerance: 1.2 });

        } else {
          const smoothedPath = smoothPointsToPath(rawPoints);
          const newSketch = {
              id: Date.now().toString(),
              name: `Sketch ${sketches.length + 1}`,
              path: smoothedPath || `M ${rawPoints}`,
              color: strokeColor,
              strokeWidth,
              type: 'path' as const
          };
          updateSketchesWithHistory([...sketches, newSketch]);
        }
    }
  };

  // Keep latest handler closures accessible to global listeners without re-binding overhead
  const mouseMoveRef = useRef(handleMouseMove);
  const mouseUpRef = useRef(handleMouseUp);

  useEffect(() => {
    mouseMoveRef.current = handleMouseMove;
    mouseUpRef.current = handleMouseUp;
  });

  useEffect(() => {
    if (!isDrawing) return;

    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      mouseMoveRef.current(e as any);
    };

    const handleGlobalUp = (e: MouseEvent | TouchEvent) => {
      mouseUpRef.current(e as any);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleGlobalMove, { passive: false });
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [isDrawing]);

  // Modify individual properties of the selected sketch shape
  const handleUpdateSelectedSketch = (updatedFields: Partial<typeof sketches[0]>, throttleCloud?: boolean) => {
    if (!selectedSketchId) return;
    const target = sketches.find(s => s.id === selectedSketchId);
    if (target?.locked && Object.keys(updatedFields).length > 0 && !('locked' in updatedFields)) {
      return;
    }
    const updated = sketches.map(s => {
      if (s.id !== selectedSketchId) return s;
      return {
        ...s,
        ...updatedFields
      };
    });
    updateSketchesWithHistory(updated, throttleCloud);
  };

  const handleUpdateSelectedProps = (updatedProps: any, throttleCloud?: boolean) => {
    if (!selectedSketchId) return;
    const target = sketches.find(s => s.id === selectedSketchId);
    if (target?.locked) return;
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
    updateSketchesWithHistory(updated, throttleCloud);
  };

  // Helper: Offset/translate all coordinates in a path string by dx and dy
  // Geometry helpers live in ../engine/legacyWhiteboardGeometry so they can be characterized.

  // Perform Boolean Union operation (Compound Path)
  const handleUnionOfShapes = (targetId: string) => {
    const selected = sketches.find(s => s.id === selectedSketchId);
    const target = sketches.find(s => s.id === targetId);
    if (!target || !selected) return;
    
    const pathA = convertShapeToPath(selected);
    const pathB = convertShapeToPath(target);
    const unifiedPath = `${pathA} ${pathB}`.trim();
    
    const updated = sketches.map(s => {
      if (s.id === selected.id) {
        return {
          ...s,
          type: 'path' as const,
          path: unifiedPath,
          fillColor: selected.fillColor !== 'none' ? selected.fillColor : (target.fillColor !== 'none' ? target.fillColor : 'none'),
          color: selected.color || target.color,
          props: undefined
        };
      }
      return s;
    }).filter(s => s.id !== target.id);
    
    setSelectedSketchId(selected.id);
    updateSketchesWithHistory(updated, true);
    toast("✨ Vector Union (Compound Path) Created!", "success");
  };

  // Perform Non-Destructive Subtraction (using dynamic SVG Masking)
  const handleSubtractNonDestructive = (targetId: string) => {
    if (!selectedSketchId) return;
    const updated = sketches.map(s => {
      if (s.id === selectedSketchId) {
        return {
          ...s,
          maskId: targetId,
          maskType: 'hide' as const
        };
      }
      return s;
    });
    updateSketchesWithHistory(updated, true);
    toast("✨ Non-destructive Subtraction Applied!", "success");
  };

  // Perform Destructive Subtraction (by clipping points & splitting segments)
  const handleSubtractDestructive = (targetId: string) => {
    const selected = sketches.find(s => s.id === selectedSketchId);
    const target = sketches.find(s => s.id === targetId);
    if (!target || !selected) return;
    
    if (selected.type !== 'path' || !selected.path) {
      toast("⚠️ Destructive Subtraction only supports freehand paths. Use Non-destructive instead!", "info");
      return;
    }
    
    const commands = selected.path.match(/[A-Za-z][^A-Za-z]*/g);
    if (!commands) return;
    
    let newPath = '';
    let wasInside = false;
    
    for (const cmdStr of commands) {
      const type = cmdStr.trim()[0];
      const nums = cmdStr.substring(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      if (nums.length >= 2) {
        const x = nums[nums.length - 2];
        const y = nums[nums.length - 1];
        const inside = isPointInsideShape({ x, y }, target);
        
        if (inside) {
          wasInside = true;
          continue;
        }
        
        if (wasInside && type !== 'M' && type !== 'Z') {
          newPath += `M ${x},${y} `;
          wasInside = false;
        } else {
          newPath += cmdStr + ' ';
        }
      } else {
        newPath += cmdStr + ' ';
      }
    }
    
    const updated = sketches.map(s => {
      if (s.id === selected.id) {
        return {
          ...s,
          path: newPath.trim()
        };
      }
      return s;
    });
    
    updateSketchesWithHistory(updated, true);
    toast("✨ Destructive Subtraction Successful!", "success");
  };

  // Perform Stroke Vectorization (converting an outline stroke to a filled shape)
  const handleVectorizeStroke = () => {
    const selected = sketches.find(s => s.id === selectedSketchId);
    if (!selected) return;
    
    const strokeW = selected.strokeWidth || 3;
    const strokeColor = selected.color || '#6366f1';
    let vectorizedPath = '';
    
    if (selected.type === 'line' && selected.props) {
      const x1 = selected.props.x1 ?? 0;
      const y1 = selected.props.y1 ?? 0;
      const x2 = selected.props.x2 ?? 100;
      const y2 = selected.props.y2 ?? 100;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;
        const wHalf = strokeW / 2;
        const p1x = x1 + nx * wHalf;
        const p1y = y1 + ny * wHalf;
        const p2x = x2 + nx * wHalf;
        const p2y = y2 + ny * wHalf;
        const p3x = x2 - nx * wHalf;
        const p3y = y2 - ny * wHalf;
        const p4x = x1 - nx * wHalf;
        const p4y = y1 - ny * wHalf;
        vectorizedPath = `M ${p1x},${p1y} L ${p2x},${p2y} L ${p3x},${p3y} L ${p4x},${p4y} Z`;
      }
    } else if (selected.type === 'path' && selected.path) {
      const coords = selected.path.match(/-?[0-9.]+/g);
      if (coords && coords.length >= 4) {
        const points: { x: number, y: number }[] = [];
        for (let i = 0; i < coords.length; i += 2) {
          if (coords[i] && coords[i+1]) {
            points.push({ x: Number(coords[i]), y: Number(coords[i+1]) });
          }
        }
        
        const leftPoints: { x: number, y: number }[] = [];
        const rightPoints: { x: number, y: number }[] = [];
        const wHalf = strokeW / 2;
        
        for (let i = 0; i < points.length; i++) {
          let dx = 0, dy = 0;
          if (i < points.length - 1) {
            dx += points[i+1].x - points[i].x;
            dy += points[i+1].y - points[i].y;
          }
          if (i > 0) {
            dx += points[i].x - points[i-1].x;
            dy += points[i].y - points[i-1].y;
          }
          
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const nx = -dy / len;
            const ny = dx / len;
            leftPoints.push({ x: points[i].x + nx * wHalf, y: points[i].y + ny * wHalf });
            rightPoints.push({ x: points[i].x - nx * wHalf, y: points[i].y - ny * wHalf });
          } else {
            leftPoints.push(points[i]);
            rightPoints.push(points[i]);
          }
        }
        
        let d = `M ${leftPoints[0].x},${leftPoints[0].y} `;
        for (let i = 1; i < leftPoints.length; i++) {
          d += `L ${leftPoints[i].x},${leftPoints[i].y} `;
        }
        for (let i = rightPoints.length - 1; i >= 0; i--) {
          d += `L ${rightPoints[i].x},${rightPoints[i].y} `;
        }
        d += 'Z';
        vectorizedPath = d;
      }
    } else if (selected.type === 'rectangle' && selected.props) {
      const { x, y, width, height } = selected.props;
      const outer = `M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z`;
      const inner = `M ${x + strokeW},${y + strokeW} L ${x + width - strokeW},${y + strokeW} L ${x + width - strokeW},${y + height - strokeW} L ${x + strokeW},${y + height - strokeW} Z`;
      vectorizedPath = `${outer} ${inner}`;
    }
    
    if (vectorizedPath) {
      const updated = sketches.map(s => {
        if (s.id === selected.id) {
          return {
            ...s,
            type: 'path' as const,
            path: vectorizedPath,
            fillColor: strokeColor,
            color: 'none',
            strokeWidth: 0,
            props: undefined
          };
        }
        return s;
      });
      
      updateSketchesWithHistory(updated, true);
      toast("✨ Stroke Vectorized successfully!", "success");
    } else {
      toast("⚠️ Vectorization only supports straight lines, paths, or rectangles currently.", "info");
    }
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

    // Every branch below assigns a tag, so compute it as an expression rather than
    // pre-seeding an empty string that is never read.
    const buildTag = (): string => {
    if (selected.type === 'rectangle' && selected.props) {
      const { x, y, width, height } = selected.props;
      return `<path d="M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z" fill="${fill}"${fillOpacityAttr} stroke="${stroke}" stroke-width="${sWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
    } else if (selected.type === 'circle' && selected.props) {
      // Convert Ellipse to absolute Cubic Bezier path representation (4 cardinal sections approximated with kappa factor)
      const { cx, cy, rx, ry } = selected.props;
      const kappa = 0.5522847498307933;
      const ox = rx * kappa;
      const oy = ry * kappa;
      
      const p1 = `${cx + rx},${cy}`;
      const c1_1 = `${cx + rx},${cy + oy}`;
      const c1_2 = `${cx + ox},${cy + ry}`;
      const p2 = `${cx},${cy + ry}`;
      const c2_1 = `${cx - ox},${cy + ry}`;
      const c2_2 = `${cx - rx},${cy + oy}`;
      const p3 = `${cx - rx},${cy}`;
      const c3_1 = `${cx - rx},${cy - oy}`;
      const c3_2 = `${cx - ox},${cy - ry}`;
      const p4 = `${cx},${cy - ry}`;
      const c4_1 = `${cx + ox},${cy - ry}`;
      const c4_2 = `${cx + rx},${cy - oy}`;
      
      return `<path d="M ${p1} C ${c1_1} ${c1_2} ${p2} C ${c2_1} ${c2_2} ${p3} C ${c3_1} ${c3_2} ${p4} C ${c4_1} ${c4_2} ${p1} Z" fill="${fill}"${fillOpacityAttr} stroke="${stroke}" stroke-width="${sWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
    } else {
      // It's a freehand curve
      return `<path d="${selected.path}" fill="${fill}"${fillOpacityAttr} stroke="${stroke}" stroke-width="${sWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`;
    }
    };
    const tag = buildTag();

    const currentSvg = activeProject.svgSource || `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">\n</svg>`;
    const closingIdx = currentSvg.lastIndexOf('</svg>');
    
    const nextSvg =
      closingIdx !== -1
        ? currentSvg.substring(0, closingIdx) + '\n  ' + tag + '\n' + currentSvg.substring(closingIdx)
        : currentSvg + '\n' + tag;

    await updateProject(activeProjectId, { svgSource: nextSvg });
    triggerBanner("⚡ Sent to Precision SVG Editor!");
    onRedirectToPrecision?.();
  };

  const selectedSketch = sketches.find(s => s.id === selectedSketchId);

  // Concentric circle centers
  const centerX = canvasRef.current ? canvasRef.current.clientWidth / 2 : 380;
  const centerY = canvasRef.current ? canvasRef.current.clientHeight / 2 : 200;

  return (
    <div className={`bg-white dark:bg-black border border-neutral-200 dark:border-zinc-800 flex flex-col gap-4 ${fullscreen ? 'fixed inset-0 z-modal w-screen h-screen p-6 rounded-none' : 'relative rounded-3xl p-4 w-full h-full min-h-[50vh]'}`}>
        
        {/* Animated Banner Notification */}
        {bridgeNotification && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-400 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-2xl z-modal flex items-center gap-2 slide-in-from-top-4">
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
        <div className="absolute bottom-6 left-6 z-dropdown flex items-center gap-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-neutral-200 dark:border-zinc-800 p-1.5 rounded-2xl shadow-lg">
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
              onDoubleClick={handleDoubleClick}
              onMouseMove={handleMouseMove}
              onMouseUp={(e) => handleMouseUp(e)}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={(e) => handleMouseUp(e)}
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

                {/* Dynamic Masks for Boolean operations & clipping */}
                {sketches.map(s => {
                  const isUsedAsMask = sketches.some(other => other.maskId === s.id);
                  if (!isUsedAsMask) return null;
                  
                  const target = sketches.find(other => other.maskId === s.id);
                  const mType = target?.maskType || 'reveal';
                  
                  const renderMaskContent = (item: any, color: string) => {
                    if (item.type === 'rectangle' && item.props) {
                      return (
                        <rect 
                          x={item.props.x} 
                          y={item.props.y} 
                          width={item.props.width} 
                          height={item.props.height} 
                          rx={item.props.rx || 0}
                          ry={item.props.rx || 0}
                          fill={color} 
                        />
                      );
                    }
                    if (item.type === 'circle' && item.props) {
                      return (
                        <ellipse 
                          cx={item.props.cx} 
                          cy={item.props.cy} 
                          rx={item.props.rx} 
                          ry={item.props.ry} 
                          fill={color} 
                        />
                      );
                    }
                    if (item.type === 'line' && item.props) {
                      return (
                        <line 
                          x1={item.props.x1} 
                          y1={item.props.y1} 
                          x2={item.props.x2} 
                          y2={item.props.y2} 
                          stroke={color} 
                          strokeWidth={item.strokeWidth || 3} 
                        />
                      );
                    }
                    return (
                      <path 
                        d={item.path} 
                        fill={item.fillColor && item.fillColor !== 'none' ? color : 'none'} 
                        stroke={color} 
                        strokeWidth={item.strokeWidth || 3} 
                      />
                    );
                  };

                  return (
                    <mask key={`mask-def-${s.id}`} id={`mask-${s.id}`}>
                      {mType === 'reveal' ? (
                        <>
                          <rect x="-10000" y="-10000" width="20000" height="20000" fill="black" />
                          {renderMaskContent(s, 'white')}
                        </>
                      ) : (
                        <>
                          <rect x="-10000" y="-10000" width="20000" height="20000" fill="white" />
                          {renderMaskContent(s, 'black')}
                        </>
                      )}
                    </mask>
                  );
                })}
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
                  
                  // If this shape is acting as a mask and is not selected, hide it from direct rendering
                  const isActingAsMask = sketches.some(other => other.maskId === sketch.id);
                  if (isActingAsMask && !isSelected) {
                      return null;
                  }

                  const tx = isSelected && dragOffset ? dragOffset.x : 0;
                  const ty = isSelected && dragOffset ? dragOffset.y : 0;
                  const transform = tx || ty ? `translate(${tx}, ${ty})` : undefined;
                  
                  // Style masks subtly when selected so they are editable but distinct
                  let strokeClass = isSelected ? "opacity-95 drop-shadow-lg" : "";
                  let maskStrokeDash = sketch.strokeDashArray || 'none';
                  let maskOpacity = sketch.fillOpacity ?? 1;
                  
                  if (isActingAsMask && isSelected) {
                      maskStrokeDash = "4 4";
                      maskOpacity = 0.45;
                      strokeClass = "opacity-50 drop-shadow-sm";
                  }

                  const maskAttr = sketch.maskId ? `url(#mask-${sketch.maskId})` : undefined;
                  
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
                          fillOpacity={maskOpacity}
                          stroke={sketch.color || 'currentColor'} 
                          strokeWidth={sketch.strokeWidth || 2} 
                          strokeDasharray={maskStrokeDash}
                          transform={transform} 
                          className={strokeClass} 
                          mask={maskAttr}
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
                          fillOpacity={maskOpacity}
                          stroke={sketch.color || 'currentColor'} 
                          strokeWidth={sketch.strokeWidth || 2} 
                          strokeDasharray={maskStrokeDash}
                          transform={transform} 
                          className={strokeClass} 
                          mask={maskAttr}
                        />
                      );
                  }
                  return (
                    <path 
                      key={sketch.id} 
                      d={sketch.path} 
                      fill={sketch.fillColor || 'none'} 
                      fillOpacity={maskOpacity}
                      stroke={sketch.color || 'currentColor'} 
                      strokeWidth={sketch.strokeWidth || 2} 
                      strokeDasharray={maskStrokeDash}
                      transform={transform} 
                      className={strokeClass} 
                      mask={maskAttr}
                    />
                  );
              })}

              {/* Draw Ghost States */}
              {Object.entries(ephemeralGhosts || {}).map(([senderId, ghost]) => {
                if (ghost && ghost.sketchId) {
                  const sketch = sketches.find(s => s.id === ghost.sketchId);
                  if (sketch) {
                    const transform = ghost.dx || ghost.dy ? `translate(${ghost.dx}, ${ghost.dy})` : '';
                    if (sketch.type === 'rectangle' && sketch.props) {
                      return (
                        <rect 
                          key={`ghost-${senderId}`}
                          x={sketch.props.x} y={sketch.props.y}
                          width={sketch.props.width} height={sketch.props.height}
                          fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5"
                          transform={transform} opacity={0.5}
                        />
                      );
                    }
                    if (sketch.type === 'circle' && sketch.props) {
                      return (
                        <ellipse 
                          key={`ghost-${senderId}`}
                          cx={sketch.props.cx} cy={sketch.props.cy}
                          rx={sketch.props.rx} ry={sketch.props.ry}
                          fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5"
                          transform={transform} opacity={0.5}
                        />
                      );
                    }
                    return (
                      <path 
                        key={`ghost-${senderId}`}
                        d={sketch.path}
                        fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5"
                        transform={transform} opacity={0.5}
                      />
                    );
                  }
                }
                return null;
              })}

              {/* AI Draft Sketches */}
              {isAiDraftMode && aiDraftSketches && aiDraftSketches.map((sketch) => {
                  const strokeClass = "opacity-80 drop-shadow-md animate-pulse";
                  
                  if (sketch.type === 'rectangle' && sketch.props) {
                      return (
                        <rect 
                          key={sketch.id} 
                          x={sketch.props.x} 
                          y={sketch.props.y} 
                          width={sketch.props.width} 
                          height={sketch.props.height} 
                          rx={sketch.props.rx || 0}
                          stroke={sketch.color} 
                          strokeWidth={sketch.strokeWidth} 
                          fill={sketch.fillColor || "none"}
                          fillOpacity={sketch.fillOpacity || 1}
                          strokeDasharray={sketch.strokeDashArray !== 'none' ? sketch.strokeDashArray : undefined}
                          className={strokeClass}
                        />
                      );
                  } else if (sketch.type === 'circle' && sketch.props) {
                      return (
                        <ellipse 
                          key={sketch.id} 
                          cx={sketch.props.cx} 
                          cy={sketch.props.cy} 
                          rx={sketch.props.rx} 
                          ry={sketch.props.ry} 
                          stroke={sketch.color} 
                          strokeWidth={sketch.strokeWidth} 
                          fill={sketch.fillColor || "none"}
                          fillOpacity={sketch.fillOpacity || 1}
                          strokeDasharray={sketch.strokeDashArray !== 'none' ? sketch.strokeDashArray : undefined}
                          className={strokeClass}
                        />
                      );
                  } else if (sketch.path) {
                    if (sketch.type === 'line') {
                      return (
                        <path 
                          key={sketch.id} 
                          d={sketch.path} 
                          stroke={sketch.color} 
                          strokeWidth={sketch.strokeWidth} 
                          fill="none" 
                          strokeDasharray={sketch.strokeDashArray !== 'none' ? sketch.strokeDashArray : undefined}
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className={strokeClass}
                        />
                      );
                    } else if (sketch.type === 'path') {
                      return (
                        <path 
                          key={sketch.id} 
                          d={sketch.path} 
                          stroke={sketch.color} 
                          strokeWidth={sketch.strokeWidth} 
                          fill={sketch.fillColor || "none"}
                          fillOpacity={sketch.fillOpacity || 1}
                          strokeDasharray={sketch.strokeDashArray !== 'none' ? sketch.strokeDashArray : undefined}
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className={strokeClass}
                        />
                      );
                    }
                  }
                  return null;
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

              {/* INTERACTIVE RESIZE & RESHAPE HANDLES */}
              {selectedSketchId && selectedSketch && (
                <g>
                  {/* Rectangle Handles */}
                  {selectedSketch.type === 'rectangle' && selectedSketch.props && (
                    <>
                      {/* Bounding outline */}
                      <rect
                        x={selectedSketch.props.x}
                        y={selectedSketch.props.y}
                        width={selectedSketch.props.width}
                        height={selectedSketch.props.height}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="pointer-events-none"
                      />
                      {/* Corner Handles */}
                      {[
                        { id: 'tl', x: selectedSketch.props.x, y: selectedSketch.props.y, cursor: 'nwse-resize' },
                        { id: 'tr', x: selectedSketch.props.x + selectedSketch.props.width, y: selectedSketch.props.y, cursor: 'nesw-resize' },
                        { id: 'bl', x: selectedSketch.props.x, y: selectedSketch.props.y + selectedSketch.props.height, cursor: 'nesw-resize' },
                        { id: 'br', x: selectedSketch.props.x + selectedSketch.props.width, y: selectedSketch.props.y + selectedSketch.props.height, cursor: 'nwse-resize' },
                      ].map(h => (
                        <g key={h.id}>
                          {/* Visual Handle */}
                          <rect
                            x={h.x - 5}
                            y={h.y - 5}
                            width={10}
                            height={10}
                            fill="#ffffff"
                            stroke="#4f46e5"
                            strokeWidth="2"
                            style={{ cursor: h.cursor }}
                            className="pointer-events-none"
                          />
                          {/* Invisible Large Touch Overlay (44px target) */}
                          <rect
                            x={h.x - 22}
                            y={h.y - 22}
                            width={44}
                            height={44}
                            fill="transparent"
                            style={{ cursor: h.cursor }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDrawing(true);
                              setActiveHandle({ sketchId: selectedSketch.id, handleId: h.id });
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setIsDrawing(true);
                              setActiveHandle({ sketchId: selectedSketch.id, handleId: h.id });
                            }}
                          />
                        </g>
                      ))}
                    </>
                  )}

                  {/* Circle/Ellipse Handles */}
                  {selectedSketch.type === 'circle' && selectedSketch.props && (
                    <>
                      {/* Bounding outline */}
                      <rect
                        x={selectedSketch.props.cx - selectedSketch.props.rx}
                        y={selectedSketch.props.cy - selectedSketch.props.ry}
                        width={selectedSketch.props.rx * 2}
                        height={selectedSketch.props.ry * 2}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        className="pointer-events-none"
                      />
                      {/* Axis handles */}
                      {[
                        { id: 'top', x: selectedSketch.props.cx, y: selectedSketch.props.cy - selectedSketch.props.ry, cursor: 'ns-resize' },
                        { id: 'bottom', x: selectedSketch.props.cx, y: selectedSketch.props.cy + selectedSketch.props.ry, cursor: 'ns-resize' },
                        { id: 'left', x: selectedSketch.props.cx - selectedSketch.props.rx, y: selectedSketch.props.cy, cursor: 'ew-resize' },
                        { id: 'right', x: selectedSketch.props.cx + selectedSketch.props.rx, y: selectedSketch.props.cy, cursor: 'ew-resize' },
                      ].map(h => (
                        <g key={h.id}>
                          {/* Visual Handle */}
                          <circle
                            cx={h.x}
                            cy={h.y}
                            r={5}
                            fill="#ffffff"
                            stroke="#4f46e5"
                            strokeWidth="2"
                            style={{ cursor: h.cursor }}
                            className="pointer-events-none"
                          />
                          {/* Invisible Large Touch Overlay (44px target) */}
                          <circle
                            cx={h.x}
                            cy={h.y}
                            r={22}
                            fill="transparent"
                            style={{ cursor: h.cursor }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsDrawing(true);
                              setActiveHandle({ sketchId: selectedSketch.id, handleId: h.id });
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setIsDrawing(true);
                              setActiveHandle({ sketchId: selectedSketch.id, handleId: h.id });
                            }}
                          />
                        </g>
                      ))}
                    </>
                  )}

                  {/* Line Handles */}
                  {selectedSketch.type === 'line' && (
                    (() => {
                      let x1 = selectedSketch.props?.x1;
                      let y1 = selectedSketch.props?.y1;
                      let x2 = selectedSketch.props?.x2;
                      let y2 = selectedSketch.props?.y2;
                      let cx = selectedSketch.props?.curveX;
                      let cy = selectedSketch.props?.curveY;

                      const isCurved = selectedSketch.path?.includes('Q') || selectedSketch.props?.lineStyle === 'curved';

                      if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
                        const matchQ = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*Q\s*([0-9.-]+),([0-9.-]+)\s*([0-9.-]+),([0-9.-]+)/i);
                        const matchL = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/i);
                        if (matchQ) {
                          x1 = parseFloat(matchQ[1]);
                          y1 = parseFloat(matchQ[2]);
                          cx = parseFloat(matchQ[3]);
                          cy = parseFloat(matchQ[4]);
                          x2 = parseFloat(matchQ[5]);
                          y2 = parseFloat(matchQ[6]);
                        } else if (matchL) {
                          x1 = parseFloat(matchL[1]);
                          y1 = parseFloat(matchL[2]);
                          x2 = parseFloat(matchL[3]);
                          y2 = parseFloat(matchL[4]);
                          cx = (x1 + x2) / 2;
                          cy = (y1 + y2) / 2;
                        } else {
                          x1 = 0; y1 = 0; x2 = 100; y2 = 100;
                          cx = 50; cy = 50;
                        }
                      }

                      if (cx === undefined || cy === undefined) {
                        cx = (x1 + x2) / 2;
                        cy = (y1 + y2) / 2;
                      }

                      return (
                        <>
                          {/* End 1 handle */}
                          <g>
                            <circle
                              cx={x1}
                              cy={y1}
                              r={6}
                              fill="#ffffff"
                              stroke="#4f46e5"
                              strokeWidth="2"
                              style={{ cursor: 'move' }}
                              className="pointer-events-none"
                            />
                            <circle
                              cx={x1}
                              cy={y1}
                              r={22}
                              fill="transparent"
                              style={{ cursor: 'move' }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDrawing(true);
                                setActiveHandle({ sketchId: selectedSketch.id, handleId: 'start' });
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                setIsDrawing(true);
                                setActiveHandle({ sketchId: selectedSketch.id, handleId: 'start' });
                              }}
                            />
                          </g>
                          {/* End 2 handle */}
                          <g>
                            <circle
                              cx={x2}
                              cy={y2}
                              r={6}
                              fill="#ffffff"
                              stroke="#4f46e5"
                              strokeWidth="2"
                              style={{ cursor: 'move' }}
                              className="pointer-events-none"
                            />
                            <circle
                              cx={x2}
                              cy={y2}
                              r={22}
                              fill="transparent"
                              style={{ cursor: 'move' }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDrawing(true);
                                setActiveHandle({ sketchId: selectedSketch.id, handleId: 'end' });
                              }}
                              onTouchStart={(e) => {
                                e.stopPropagation();
                                setIsDrawing(true);
                                setActiveHandle({ sketchId: selectedSketch.id, handleId: 'end' });
                              }}
                            />
                          </g>
                          {/* Midpoint Curve control handle */}
                          {isCurved && (
                            <>
                              <line
                                x1={x1}
                                y1={y1}
                                x2={cx}
                                y2={cy}
                                stroke="#4f46e5"
                                strokeWidth="0.8"
                                strokeDasharray="2 2"
                                className="pointer-events-none"
                              />
                              <line
                                x1={x2}
                                y1={y2}
                                x2={cx}
                                y2={cy}
                                stroke="#4f46e5"
                                strokeWidth="0.8"
                                strokeDasharray="2 2"
                                className="pointer-events-none"
                              />
                              <g>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={6}
                                  fill="#4f46e5"
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  style={{ cursor: 'pointer' }}
                                  className="pointer-events-none"
                                />
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={22}
                                  fill="transparent"
                                  style={{ cursor: 'pointer' }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDrawing(true);
                                    setActiveHandle({ sketchId: selectedSketch.id, handleId: 'curve' });
                                  }}
                                  onTouchStart={(e) => {
                                    e.stopPropagation();
                                    setIsDrawing(true);
                                    setActiveHandle({ sketchId: selectedSketch.id, handleId: 'curve' });
                                  }}
                                />
                              </g>
                            </>
                          )}
                        </>
                      );
                    })()
                  )}
                </g>
              )}
          </svg>

          {/* COMPACT INLINE MINI-INSPECTOR */}
          {selectedSketchId && selectedSketch && (
            <div 
              className={`absolute bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-neutral-200 dark:border-zinc-800 shadow-xl px-3.5 py-1.5 flex flex-wrap items-center gap-3 z-dropdown transition-all duration-300 rounded-2xl sm:rounded-full max-w-[280px] sm:max-w-none md:max-w-none gap-y-2 ${
                dragOffset && (dragOffset.x !== 0 || dragOffset.y !== 0)
                  ? 'opacity-25 pointer-events-none scale-95'
                  : 'opacity-100 scale-100 pointer-events-auto'
              }`}
              style={{
                left: `${Math.min(window.innerWidth - 300, Math.max(12, getSketchBoundingBox(selectedSketch)?.x ?? 100))}px`,
                top: `${Math.max(12, (getSketchBoundingBox(selectedSketch)?.y ?? 100) - 20)}px`,
              }}
            >
              {/* Stroke Color Circles */}
              <div className="flex items-center gap-1.5 border-r border-neutral-200 dark:border-zinc-800 pr-2.5">
                <span className="text-[9px] font-mono font-black text-neutral-400 dark:text-zinc-500 uppercase">Border</span>
                {['#6366f1', '#10b981', '#ef4444', '#000000'].map(c => (
                  <button
                    key={c}
                    onClick={() => handleUpdateSelectedSketch({ color: c })}
                    className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 cursor-pointer ${selectedSketch.color === c ? 'ring-1 ring-offset-1 ring-indigo-500 scale-110' : 'border-neutral-200 dark:border-zinc-700'}`}
                    style={{ backgroundColor: c }}
                    title={`Stroke: ${c}`}
                  />
                ))}
              </div>

              {/* Fill Color Circles */}
              <div className="flex items-center gap-1.5 border-r border-neutral-200 dark:border-zinc-800 pr-2.5">
                <span className="text-[9px] font-mono font-black text-neutral-400 dark:text-zinc-500 uppercase">Fill</span>
                {['none', '#ffffff', '#6366f1', '#10b981', '#ef4444', '#000000'].map(c => (
                  <button
                    key={c}
                    onClick={() => handleUpdateSelectedSketch({ fillColor: c })}
                    className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 cursor-pointer flex items-center justify-center ${selectedSketch.fillColor === c ? 'ring-1 ring-offset-1 ring-indigo-500 scale-110' : 'border-neutral-200 dark:border-zinc-700'}`}
                    style={{ backgroundColor: c === 'none' ? 'transparent' : c }}
                    title={`Fill: ${c}`}
                  >
                    {c === 'none' && <span className="text-[8px] leading-none text-neutral-400 font-bold">×</span>}
                  </button>
                ))}
              </div>

              {/* Stroke Width Buttons */}
              <div className="flex items-center gap-1 border-r border-neutral-200 dark:border-zinc-800 pr-2.5">
                {[
                  { label: 'S', value: 2 },
                  { label: 'M', value: 4 },
                  { label: 'L', value: 8 },
                ].map(w => (
                  <button
                    key={w.label}
                    onClick={() => handleUpdateSelectedSketch({ strokeWidth: w.value })}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${selectedSketch.strokeWidth === w.value ? 'bg-indigo-500 text-white' : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'}`}
                    title={`Width: ${w.value}px`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {/* Lock/Unlock Toggle */}
              <button
                onClick={() => handleUpdateSelectedSketch({ locked: !selectedSketch.locked })}
                className={`p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ${selectedSketch.locked ? 'text-red-500 bg-red-50 dark:bg-red-950/20' : 'text-neutral-500 dark:text-zinc-400'}`}
                title={selectedSketch.locked ? "Unlock element" : "Lock element"}
              >
                {selectedSketch.locked ? <Lock size={12} className="text-red-500" /> : <Unlock size={12} />}
              </button>

              {/* Delete Button */}
              <button
                onClick={() => deleteSketch(selectedSketch.id)}
                className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Delete element"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}

          {/* FIGMA-STYLE FLOATING PROPERTY PANEL */}
          {selectedSketchId && selectedSketch && showOptionsPanel && (!dragOffset || (dragOffset.x === 0 && dragOffset.y === 0)) && (
            <div className="absolute right-4 top-4 bottom-16 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border border-neutral-200 dark:border-zinc-800 rounded-2xl w-64 shadow-2xl z-dropdown p-4 space-y-4 overflow-y-auto duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-zinc-900">
                <div className="flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-500 animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="text-[10px] uppercase font-mono font-black text-neutral-500">Properties</span>
                </div>
                <button 
                  onClick={() => { setSelectedSketchId(null); setShowOptionsPanel(false); }} 
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full text-neutral-400"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Title & Dimensions description */}
              <div className="flex items-center justify-between bg-neutral-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-800">
                <div className="overflow-hidden">
                  <span className="text-xs font-bold block text-neutral-800 dark:text-zinc-100 truncate">{selectedSketch.name}</span>
                  <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase">{selectedSketch.type || 'freehand path'}</span>
                </div>
                <button
                  onClick={() => handleUpdateSelectedSketch({ locked: !selectedSketch.locked })}
                  className={`p-1.5 px-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedSketch.locked 
                      ? 'bg-red-500/10 hover:bg-red-500/15 text-red-500 border-red-500/30 dark:border-red-500/20' 
                      : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-zinc-900 text-neutral-500 border-neutral-300 dark:border-zinc-800 hover:text-indigo-500'
                  }`}
                  title={selectedSketch.locked ? "Unlock element" : "Lock element"}
                >
                  {selectedSketch.locked ? <Lock size={12} className="text-red-500" /> : <Unlock size={12} />}
                  <span className="text-[9px] font-mono font-bold uppercase">{selectedSketch.locked ? "Locked" : "Lock"}</span>
                </button>
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
                      onChange={(e) => handleUpdateSelectedSketch({ fillOpacity: Number(e.target.value) }, true)}
                      onMouseUp={() => saveSketch(sketches, false)}
                      onTouchEnd={() => saveSketch(sketches, false)}
                      className="w-full h-1 bg-neutral-200 dark:bg-zinc-900 rounded accent-indigo-500 cursor-pointer"
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
                    onChange={(e) => handleUpdateSelectedSketch({ strokeWidth: Number(e.target.value) }, true)}
                    onMouseUp={() => saveSketch(sketches, false)}
                    onTouchEnd={() => saveSketch(sketches, false)}
                    className="w-full h-1 bg-neutral-200 dark:bg-zinc-900 rounded accent-indigo-500 cursor-pointer"
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
                <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-zinc-900/50">
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
                    onChange={(e) => handleUpdateSelectedProps({ rx: Number(e.target.value) }, true)}
                    onMouseUp={() => saveSketch(sketches, false)}
                    onTouchEnd={() => saveSketch(sketches, false)}
                    className="w-full h-1 bg-neutral-200 dark:bg-zinc-900 rounded accent-indigo-500 cursor-pointer"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1.5">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">X</span>
                      <input
                        type="number"
                        value={selectedSketch.props.x || 0}
                        onChange={(e) => handleUpdateSelectedProps({ x: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Y</span>
                      <input
                        type="number"
                        value={selectedSketch.props.y || 0}
                        onChange={(e) => handleUpdateSelectedProps({ y: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
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
                <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-zinc-900/50">
                  <label className="text-[9px] font-mono font-black text-neutral-400 uppercase block">Radii Coordinates</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">CX</span>
                      <input
                        type="number"
                        value={selectedSketch.props.cx || 0}
                        onChange={(e) => handleUpdateSelectedProps({ cx: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">CY</span>
                      <input
                        type="number"
                        value={selectedSketch.props.cy || 0}
                        onChange={(e) => handleUpdateSelectedProps({ cy: Number(e.target.value) })}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
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

              {/* Line Style Options */}
              {selectedSketch.type === 'line' && (
                <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-zinc-900/50">
                  <label className="text-[9px] font-mono font-black text-neutral-400 uppercase block">Line Coordinates</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">X1</span>
                      <input
                        type="number"
                        value={selectedSketch.props.x1 ?? 0}
                        onChange={(e) => {
                          const newX1 = Number(e.target.value);
                          const path = `M ${newX1},${selectedSketch.props.y1 ?? 0} L ${selectedSketch.props.x2 ?? 100},${selectedSketch.props.y2 ?? 100}`;
                          handleUpdateSelectedProps({ x1: newX1 });
                          handleUpdateSelectedSketch({ path });
                        }}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Y1</span>
                      <input
                        type="number"
                        value={selectedSketch.props.y1 ?? 0}
                        onChange={(e) => {
                          const newY1 = Number(e.target.value);
                          const path = `M ${selectedSketch.props.x1 ?? 0},${newY1} L ${selectedSketch.props.x2 ?? 100},${selectedSketch.props.y2 ?? 100}`;
                          handleUpdateSelectedProps({ y1: newY1 });
                          handleUpdateSelectedSketch({ path });
                        }}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">X2</span>
                      <input
                        type="number"
                        value={selectedSketch.props.x2 ?? 100}
                        onChange={(e) => {
                          const newX2 = Number(e.target.value);
                          const path = `M ${selectedSketch.props.x1 ?? 0},${selectedSketch.props.y1 ?? 0} L ${newX2},${selectedSketch.props.y2 ?? 100}`;
                          handleUpdateSelectedProps({ x2: newX2 });
                          handleUpdateSelectedSketch({ path });
                        }}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Y2</span>
                      <input
                        type="number"
                        value={selectedSketch.props.y2 ?? 100}
                        onChange={(e) => {
                          const newY2 = Number(e.target.value);
                          const path = `M ${selectedSketch.props.x1 ?? 0},${selectedSketch.props.y1 ?? 0} L ${selectedSketch.props.x2 ?? 100},${newY2}`;
                          handleUpdateSelectedProps({ y2: newY2 });
                          handleUpdateSelectedSketch({ path });
                        }}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center"
                      />
                    </div>
                  </div>
                  <label className="text-[9px] font-mono font-black text-neutral-400 uppercase block">Line Connection Style</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => {
                        let x1 = selectedSketch.props?.x1;
                        let y1 = selectedSketch.props?.y1;
                        let x2 = selectedSketch.props?.x2;
                        let y2 = selectedSketch.props?.y2;
                        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
                          const matchQ = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*Q\s*([0-9.-]+),([0-9.-]+)\s*([0-9.-]+),([0-9.-]+)/i);
                          const matchL = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/i);
                          if (matchQ) {
                            x1 = parseFloat(matchQ[1]);
                            y1 = parseFloat(matchQ[2]);
                            x2 = parseFloat(matchQ[5]);
                            y2 = parseFloat(matchQ[6]);
                          } else if (matchL) {
                            x1 = parseFloat(matchL[1]);
                            y1 = parseFloat(matchL[2]);
                            x2 = parseFloat(matchL[3]);
                            y2 = parseFloat(matchL[4]);
                          } else {
                            x1 = 0; y1 = 0; x2 = 100; y2 = 100;
                          }
                        }
                        const newPath = `M ${x1},${y1} L ${x2},${y2}`;
                        handleUpdateSelectedSketch({
                          path: newPath,
                          props: { ...selectedSketch.props, x1, y1, x2, y2, lineStyle: 'straight' }
                        });
                      }}
                      className={`py-1.5 px-3 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors ${
                        selectedSketch.props?.lineStyle === 'straight' || (!selectedSketch.props?.lineStyle && !selectedSketch.path?.includes('Q'))
                          ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                          : 'bg-neutral-200 dark:bg-zinc-900 text-neutral-750 dark:text-zinc-400 hover:bg-neutral-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Straight Line
                    </button>
                    <button
                      onClick={() => {
                        let x1 = selectedSketch.props?.x1;
                        let y1 = selectedSketch.props?.y1;
                        let x2 = selectedSketch.props?.x2;
                        let y2 = selectedSketch.props?.y2;
                        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
                          const matchQ = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*Q\s*([0-9.-]+),([0-9.-]+)\s*([0-9.-]+),([0-9.-]+)/i);
                          const matchL = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/i);
                          if (matchQ) {
                            x1 = parseFloat(matchQ[1]);
                            y1 = parseFloat(matchQ[2]);
                            x2 = parseFloat(matchQ[5]);
                            y2 = parseFloat(matchQ[6]);
                          } else if (matchL) {
                            x1 = parseFloat(matchL[1]);
                            y1 = parseFloat(matchL[2]);
                            x2 = parseFloat(matchL[3]);
                            y2 = parseFloat(matchL[4]);
                          } else {
                            x1 = 0; y1 = 0; x2 = 100; y2 = 100;
                          }
                        }
                        const cx = (x1 + x2) / 2;
                        const cy = (y1 + y2) / 2 - 35;
                        const newPath = `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
                        handleUpdateSelectedSketch({
                          path: newPath,
                          props: { ...selectedSketch.props, x1, y1, x2, y2, lineStyle: 'curved', curveX: cx, curveY: cy }
                        });
                      }}
                      className={`py-1.5 px-3 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors ${
                        selectedSketch.props?.lineStyle === 'curved' || (selectedSketch.path?.includes('Q'))
                          ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                          : 'bg-neutral-200 dark:bg-zinc-900 text-neutral-750 dark:text-zinc-400 hover:bg-neutral-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Flexible Rope / Curve
                    </button>
                    <button
                      onClick={() => {
                        let x1 = selectedSketch.props?.x1;
                        let y1 = selectedSketch.props?.y1;
                        let x2 = selectedSketch.props?.x2;
                        let y2 = selectedSketch.props?.y2;
                        if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
                          const matchQ = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*Q\s*([0-9.-]+),([0-9.-]+)\s*([0-9.-]+),([0-9.-]+)/i);
                          const matchL = selectedSketch.path?.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/i);
                          if (matchQ) {
                            x1 = parseFloat(matchQ[1]);
                            y1 = parseFloat(matchQ[2]);
                            x2 = parseFloat(matchQ[5]);
                            y2 = parseFloat(matchQ[6]);
                          } else if (matchL) {
                            x1 = parseFloat(matchL[1]);
                            y1 = parseFloat(matchL[2]);
                            x2 = parseFloat(matchL[3]);
                            y2 = parseFloat(matchL[4]);
                          } else {
                            x1 = 0; y1 = 0; x2 = 100; y2 = 100;
                          }
                        }
                        const newPath = `M ${x1},${y1} L ${x2},${y1} L ${x2},${y2}`;
                        handleUpdateSelectedSketch({
                          path: newPath,
                          props: { ...selectedSketch.props, x1, y1, x2, y2, lineStyle: 'elbow' }
                        });
                      }}
                      className={`py-1.5 px-3 rounded-lg text-[10px] font-bold text-center cursor-pointer transition-colors ${
                        selectedSketch.props?.lineStyle === 'elbow'
                          ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                          : 'bg-neutral-200 dark:bg-zinc-900 text-neutral-750 dark:text-zinc-400 hover:bg-neutral-200 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Elbow Connector / Orthogonal
                    </button>
                  </div>
                </div>
              )}

              {/* Path/Freehand Coordinate Inputs */}
              {selectedSketch.type === 'path' && (
                <div className="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-zinc-900/50">
                  <label className="text-[9px] font-mono font-black text-neutral-400 uppercase block">Path Coordinates</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">X (Left Bound)</span>
                      <input
                        type="number"
                        value={Math.round(getSketchBoundingBox(selectedSketch)?.x ?? 0)}
                        onChange={(e) => {
                          const bbox = getSketchBoundingBox(selectedSketch);
                          const currentX = bbox ? bbox.x : 0;
                          const newX = Number(e.target.value);
                          const dx = newX - currentX;
                          const translated = translatePath(selectedSketch.path, dx, 0);
                          handleUpdateSelectedSketch({ path: translated });
                        }}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center animate-pulse"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-neutral-400">Y (Top Bound)</span>
                      <input
                        type="number"
                        value={Math.round((getSketchBoundingBox(selectedSketch)?.y ?? 0) + 45)}
                        onChange={(e) => {
                          const bbox = getSketchBoundingBox(selectedSketch);
                          const currentY = bbox ? bbox.y + 45 : 0;
                          const newY = Number(e.target.value);
                          const dy = newY - currentY;
                          const translated = translatePath(selectedSketch.path, 0, dy);
                          handleUpdateSelectedSketch({ path: translated });
                        }}
                        className="w-full text-xs font-mono px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border rounded border-neutral-200 dark:border-zinc-800 text-center animate-pulse"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vector Operations & Masking Section */}
              {sketches.length > 1 && (
                <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-zinc-900/50">
                  <label className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest block">Vector Ops & Masking</label>
                  <span className="text-[9px] font-mono text-neutral-400 block leading-tight">Combine with another element:</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {sketches
                      .filter(s => s.id !== selectedSketch.id)
                      .map(other => {
                        const isMaskingSelected = selectedSketch.maskId === other.id;
                        return (
                          <div key={other.id} className="flex flex-col gap-1 p-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-900">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-neutral-600 dark:text-zinc-400 truncate max-w-[120px]">
                                {other.type.toUpperCase()} ({other.id.slice(0,4)})
                              </span>
                              <div className="w-2.5 h-2.5 rounded-full border border-neutral-400" style={{ backgroundColor: other.color || '#fff' }} />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 mt-1">
                              <button
                                onClick={() => handleUnionOfShapes(other.id)}
                                className="py-1 px-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 rounded transition-colors text-center cursor-pointer"
                                title="Combines both elements into a single compound path"
                              >
                                Union
                              </button>
                              <button
                                onClick={() => handleSubtractDestructive(other.id)}
                                className="py-1 px-1 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:hover:bg-orange-900/30 text-[9px] font-bold text-orange-600 dark:text-orange-400 rounded transition-colors text-center cursor-pointer"
                                title="Clips the overlapping region from this element"
                              >
                                Subtract (Dest)
                              </button>
                              <button
                                onClick={() => handleSubtractNonDestructive(other.id)}
                                className={`py-1 px-1 text-[9px] font-bold rounded transition-colors text-center cursor-pointer ${
                                  isMaskingSelected
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}
                                title="Dynamically masks this element using the target element (non-destructive)"
                              >
                                {isMaskingSelected ? 'Unmask' : 'Mask Subtract'}
                              </button>
                              {selectedSketch.maskId === other.id && (
                                <button
                                  onClick={() => handleUpdateSelectedSketch({ maskId: undefined, maskType: undefined })}
                                  className="py-1 px-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-[9px] font-bold text-red-600 dark:text-red-400 rounded transition-colors text-center cursor-pointer"
                                >
                                  Clear Mask
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Stroke Vectorization Action */}
              {(selectedSketch.type === 'path' || selectedSketch.type === 'rectangle' || selectedSketch.type === 'line') && (
                <div className="pt-2.5 border-t border-neutral-100 dark:border-zinc-900/50">
                  <button
                    onClick={handleVectorizeStroke}
                    className="w-full py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    title="Converts the thin outline stroke into a stylized, editable vector filled shape"
                  >
                    Vectorize Stroke Outline
                  </button>
                </div>
              )}

              {/* Duplication, Deletion & Bridges */}
              <div className="pt-3 border-t border-neutral-100 dark:border-zinc-900/60 space-y-2">
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
                    {s.locked && (
                      <div className="absolute top-4 right-4 text-red-500" title="Locked element">
                        <Lock size={12} />
                      </div>
                    )}
                    <div className="flex gap-1.5 justify-end pt-2">
                        <button onClick={() => duplicateSketch(s.id)} className="p-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-neutral-500 hover:text-indigo-500 cursor-pointer" title="Duplicate"><Copy size={12} /></button>
                        <button onClick={() => setEditingSketch(s)} className="p-1.5 bg-white dark:bg-zinc-900 border rounded-lg text-neutral-500 hover:text-indigo-500 cursor-pointer" title="Rename"><Edit2 size={12} /></button>
                        <button onClick={() => deleteSketch(s.id)} className={`p-1.5 rounded-lg cursor-pointer ${s.locked ? 'bg-neutral-100 dark:bg-zinc-900 text-neutral-300 dark:text-zinc-700 cursor-not-allowed' : 'bg-red-50 text-red-500 hover:bg-red-100'}`} title={s.locked ? "Locked" : "Delete"} disabled={s.locked}><Trash2 size={12} /></button>
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
        <div className="fixed inset-0 z-modal bg-black bg-opacity-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-neutral-200 dark:border-zinc-800 max-w-sm w-full shadow-2xl duration-150">
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

      {/* AI Whiteboard Copilot Trigger Button */}
      <div className="absolute left-4 bottom-4 z-dropdown">
        <button
          onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          <Sparkles size={14} className={isAiGenerating ? "animate-pulse" : ""} />
          AI Copilot
        </button>
      </div>

      {/* AI WHITEBOARD COPILOT POPUP */}
      {isAiPanelOpen && (
        <div className="absolute left-4 bottom-16 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border border-neutral-200 dark:border-zinc-800 rounded-3xl w-72 shadow-2xl z-dropdown p-5 space-y-4 duration-200">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-900 pb-2">
            <div className="flex items-center gap-1.5 text-neutral-900 dark:text-white">
              <Sparkles size={15} className="text-indigo-500 animate-pulse" />
              <span className="text-xs font-bold font-display">AI Whiteboard Copilot</span>
            </div>
            <button
              onClick={() => setIsAiPanelOpen(false)}
              className="p-1 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full text-neutral-400 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-[10px] text-neutral-500 leading-relaxed">
            Describe a visual diagram, flowchart, mindmap, or custom shapes to have AI construct them automatically on the canvas.
          </p>

          <div className="space-y-3">
            <textarea
              placeholder="Draw a central box labeled 'Design System' and connect it to two other boxes for 'Colors' and 'Typography'..."
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="w-full text-xs p-3 bg-neutral-50 dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-800 dark:text-zinc-100 placeholder-neutral-400"
            />

            <div className="flex items-center justify-between text-[9px] font-mono font-bold text-neutral-400 uppercase">
              <span>Model: {settings.assistantModel || 'gemini-2.5-flash'}</span>
              <span>Temp: {settings.assistantTemperature !== undefined ? settings.assistantTemperature : 0.2}</span>
            </div>

            <button
              onClick={handleAiGenerate}
              disabled={isAiGenerating || !aiPrompt.trim()}
              className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-neutral-200 dark:disabled:bg-zinc-800 text-white disabled:text-neutral-400 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-500/10"
            >
              {isAiGenerating ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  Generate Elements
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Preview Slider Overlay */}
      <AiPreviewSlider 
        isVisible={isAiDraftMode} 
        metadata={aiDraftMetadata || undefined} 
        onDiscard={() => {
          setAiDraftSketches(null);
          setIsAiDraftMode(false);
          toast("AI drafted elements discarded.", "info");
        }}
        onAccept={() => {
          if (aiDraftSketches) {
            updateSketchesWithHistory([...sketches, ...aiDraftSketches]);
            toast(`Merged ${aiDraftSketches.length} AI elements into project!`, "success");
          }
          setAiDraftSketches(null);
          setIsAiDraftMode(false);
        }}
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
