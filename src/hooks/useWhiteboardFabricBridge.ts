// useWhiteboardFabricBridge - Hook for integrating WhiteboardCanvas with FabricCanvasEngine
// Provides dual-write capability and gradual migration

import { useRef, useState, useEffect, useCallback } from 'react';
import { 
  CanvasEngine,
  CanvasObject,
  CanvasObjectType,
  Point,
} from '../engine/canvasEngine';
import { FabricCanvasEngine } from '../engine/FabricCanvasEngine';
import { WhiteboardFabricBridge, WhiteboardState } from '../engine/whiteboardFabricBridge';

/**
 * Sketch type from WhiteboardCanvas
 */
export interface Sketch {
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
}

/**
 * Options for the bridge hook
 */
export interface UseWhiteboardFabricBridgeOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  width?: number;
  height?: number;
  useFabricPrimary?: boolean;
  migrationMode?: 'dual-write' | 'fabric-only' | 'legacy-only';
}

/**
 * Result from the bridge hook
 */
export interface UseWhiteboardFabricBridgeResult {
  /** Whether the bridge is ready */
  isReady: boolean;
  /** Whether Fabric is the primary canvas */
  isFabricPrimary: boolean;
  /** The Fabric engine instance */
  fabricEngine: FabricCanvasEngine | null;
  /** The bridge instance */
  bridge: WhiteboardFabricBridge | null;
  /** Error if initialization failed */
  error: Error | null;
  
  /** Initialize the bridge */
  initialize: () => Promise<void>;
  /** Destroy the bridge */
  destroy: () => Promise<void>;
  
  /** Convert sketches to canvas objects and add to Fabric */
  syncSketchesToFabric: (sketches: Sketch[]) => Promise<void>;
  /** Convert Fabric objects to sketches */
  syncFabricToSketches: () => Promise<Sketch[]>;
  /** Add a single sketch to Fabric */
  addSketchToFabric: (sketch: Sketch) => Promise<CanvasObject | null>;
  /** Update a sketch in Fabric */
  updateSketchInFabric: (sketchId: string, updates: Partial<Sketch>) => Promise<void>;
  /** Remove a sketch from Fabric */
  removeSketchFromFabric: (sketchId: string) => Promise<void>;
  
  /** Get SVG export from Fabric */
  getFabricSVG: () => string;
  /** Get JSON export from Fabric */
  getFabricJSON: () => any;
  
  /** Handle mouse down for dual-write */
  handleFabricMouseDown: (e: React.MouseEvent | React.TouchEvent, tool: string, sketches: Sketch[]) => Promise<void>;
  /** Handle mouse move for dual-write */
  handleFabricMouseMove: (e: React.MouseEvent | React.TouchEvent, tool: string, isDrawing: boolean) => Promise<void>;
  /** Handle mouse up for dual-write */
  handleFabricMouseUp: (e: React.MouseEvent | React.TouchEvent, tool: string) => Promise<void>;
}

/**
 * Convert a Sketch to a CanvasObject
 */
function sketchToCanvasObject(sketch: Sketch): CanvasObject {
  const base: any = {
    id: sketch.id,
    type: mapSketchType(sketch.type) as CanvasObjectType,
    left: sketch.props?.x || 0,
    top: sketch.props?.y || 0,
    width: sketch.props?.width || 0,
    height: sketch.props?.height || 0,
    fill: sketch.fillColor || 'none',
    stroke: sketch.color || '#000000',
    strokeWidth: sketch.strokeWidth || 3,
    opacity: sketch.fillOpacity !== undefined ? sketch.fillOpacity : 1,
    visible: true,
    selectable: !sketch.locked,
    evented: true,
  };

  switch (sketch.type) {
    case 'rectangle':
      return {
        ...base,
        type: 'rect' as const,
        rx: sketch.props?.rx || 0,
        ry: sketch.props?.ry || 0,
      };
    case 'circle':
      return {
        ...base,
        type: 'circle' as const,
        radius: Math.min(base.width, base.height) / 2,
      };
    case 'line':
      // Parse path to get line points
      if (sketch.path) {
        const match = sketch.path.match(/M\s*([0-9.-]+),([0-9.-]+)\s*L\s*([0-9.-]+),([0-9.-]+)/);
        if (match) {
          return {
            ...base,
            type: 'line' as const,
            x1: parseFloat(match[1]),
            y1: parseFloat(match[2]),
            x2: parseFloat(match[3]),
            y2: parseFloat(match[4]),
          };
        }
      }
      return { ...base, type: 'line' as const, x1: 0, y1: 0, x2: 0, y2: 0 };
    case 'path':
    default:
      return {
        ...base,
        type: 'path' as const,
        path: sketch.path || '',
      };
  }
}

/**
 * Map sketch type to canvas object type
 */
function mapSketchType(type?: string): CanvasObjectType {
  const map: Record<string, CanvasObjectType> = {
    'rectangle': 'rect',
    'circle': 'circle',
    'line': 'line',
    'path': 'path',
  };
  return map[type || 'path'] || 'path';
}

/**
 * Map canvas object type to sketch type
 */
function mapToSketchType(type: CanvasObjectType): Sketch['type'] {
  const map: Record<CanvasObjectType, Sketch['type']> = {
    'rect': 'rectangle',
    'circle': 'circle',
    'ellipse': 'path',
    'line': 'line',
    'path': 'path',
    'text': 'path',
    'textbox': 'path',
    'group': 'path',
    'image': 'path',
  };
  return map[type];
}

/**
 * Convert a CanvasObject to a Sketch
 */
function canvasObjectToSketch(obj: CanvasObject): Sketch {
  const type = mapToSketchType(obj.type);
  
  if (obj.type === 'rect') {
    return {
      id: obj.id,
      name: `Sketch ${obj.id}`,
      type,
      props: {
        x: obj.left,
        y: obj.top,
        width: obj.width,
        height: obj.height,
        rx: (obj as any).rx || 0,
      },
      color: obj.stroke,
      strokeWidth: obj.strokeWidth,
      fillColor: obj.fill,
      fillOpacity: obj.opacity,
    };
  }
  
  if (obj.type === 'circle') {
    return {
      id: obj.id,
      name: `Sketch ${obj.id}`,
      type,
      props: {
        cx: obj.left,
        cy: obj.top,
        radius: (obj as any).radius || 0,
      },
      color: obj.stroke,
      strokeWidth: obj.strokeWidth,
      fillColor: obj.fill,
      fillOpacity: obj.opacity,
    };
  }
  
  if (obj.type === 'line') {
    const lineObj = obj as any;
    return {
      id: obj.id,
      name: `Sketch ${obj.id}`,
      type,
      path: `M ${lineObj.x1},${lineObj.y1} L ${lineObj.x2},${lineObj.y2}`,
      color: obj.stroke,
      strokeWidth: obj.strokeWidth,
    };
  }
  
  if (obj.type === 'path') {
    return {
      id: obj.id,
      name: `Sketch ${obj.id}`,
      type,
      path: (obj as any).path || '',
      color: obj.stroke,
      strokeWidth: obj.strokeWidth,
      fillColor: obj.fill,
      fillOpacity: obj.opacity,
    };
  }
  
  // Default fallback
  return {
    id: obj.id,
    name: `Sketch ${obj.id}`,
    type: 'path',
    path: '',
    color: obj.stroke,
    strokeWidth: obj.strokeWidth,
  };
}

/**
 * Hook for integrating WhiteboardCanvas with FabricCanvasEngine
 */
export function useWhiteboardFabricBridge(
  options: UseWhiteboardFabricBridgeOptions
): UseWhiteboardFabricBridgeResult {
  const { containerRef, width = 800, height = 600, useFabricPrimary = false, migrationMode = 'dual-write' } = options;
  
  const bridgeRef = useRef<WhiteboardFabricBridge | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize bridge
  const initialize = useCallback(async () => {
    try {
      if (!containerRef.current) {
        throw new Error('Container ref not available');
      }

      bridgeRef.current = new WhiteboardFabricBridge();
      
      await bridgeRef.current.initialize(containerRef.current, {
        width,
        height,
        useFabricPrimary,
        migrationMode,
      });

      setIsReady(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('useWhiteboardFabricBridge initialization error:', error);
    }
  }, [containerRef, width, height, useFabricPrimary, migrationMode]);

  // Destroy bridge
  const destroy = useCallback(async () => {
    if (bridgeRef.current) {
      try {
        await bridgeRef.current.destroy();
      } catch (e) {
        console.error('Error destroying bridge:', e);
      }
      bridgeRef.current = null;
    }
    setIsReady(false);
  }, []);

  // Sync sketches to Fabric
  const syncSketchesToFabric = useCallback(async (sketches: Sketch[]) => {
    if (!bridgeRef.current) return;
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return;

    // Clear existing objects
    engine.clear();
    
    // Convert and add each sketch
    for (const sketch of sketches) {
      const canvasObj = sketchToCanvasObject(sketch);
      engine.addObject(canvasObj);
    }
    
    // Render
    engine.renderAll();
  }, []);

  // Sync Fabric to sketches
  const syncFabricToSketches = useCallback(async (): Promise<Sketch[]> => {
    if (!bridgeRef.current) return [];
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return [];

    const objects = engine.getObjects();
    return objects.map(canvasObjectToSketch);
  }, []);

  // Add single sketch to Fabric
  const addSketchToFabric = useCallback(async (sketch: Sketch): Promise<CanvasObject | null> => {
    if (!bridgeRef.current) return null;
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return null;

    const canvasObj = sketchToCanvasObject(sketch);
    engine.addObject(canvasObj);
    engine.renderAll();
    
    return canvasObj;
  }, []);

  // Update sketch in Fabric
  const updateSketchInFabric = useCallback(async (sketchId: string, updates: Partial<Sketch>) => {
    if (!bridgeRef.current) return;
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return;

    // Find and remove old object
    const existingObj = engine.getObjects().find(o => o.id === sketchId);
    if (existingObj) {
      engine.removeObject(existingObj);
    }
    
    // Create updated object
    const updatedSketch: Sketch = { ...existingObj as any, ...updates, id: sketchId };
    const canvasObj = sketchToCanvasObject(updatedSketch);
    engine.addObject(canvasObj);
    engine.renderAll();
  }, []);

  // Remove sketch from Fabric
  const removeSketchFromFabric = useCallback(async (sketchId: string) => {
    if (!bridgeRef.current) return;
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return;

    const objToRemove = engine.getObjects().find(o => o.id === sketchId);
    if (objToRemove) {
      engine.removeObject(objToRemove);
      engine.renderAll();
    }
  }, []);

  // Get SVG from Fabric
  const getFabricSVG = useCallback((): string => {
    if (!bridgeRef.current) return '';
    return bridgeRef.current.toSVG();
  }, []);

  // Get JSON from Fabric
  const getFabricJSON = useCallback((): any => {
    if (!bridgeRef.current) return {};
    return bridgeRef.current.toJSON();
  }, []);

  // Handle mouse down for dual-write
  const handleFabricMouseDown = useCallback(async (
    e: React.MouseEvent | React.TouchEvent,
    tool: string,
    sketches: Sketch[]
  ) => {
    if (!bridgeRef.current) return;
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return;

    // Get point from event
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.touches[0]?.clientX || 0;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0]?.clientY || 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Handle different tools
    if (tool === 'select') {
      // Find object at point
      const hitObj = engine.getObjectAtPoint({ x, y });
      if (hitObj) {
        engine.selectObject(hitObj);
      } else {
        engine.clearSelection();
      }
    } else if (tool === 'pencil' || tool === 'line' || tool === 'rectangle' || tool === 'circle') {
      // Start drawing
      // In dual-write mode, we'd also start the legacy drawing
    }
  }, [containerRef]);

  // Handle mouse move for dual-write
  const handleFabricMouseMove = useCallback(async (
    e: React.MouseEvent | React.TouchEvent,
    tool: string,
    isDrawing: boolean
  ) => {
    if (!bridgeRef.current || !isDrawing) return;
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return;

    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : e.touches[0]?.clientX || 0;
    const clientY = 'clientY' in e ? e.clientY : e.touches[0]?.clientY || 0;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Update drawing based on tool
    if (tool === 'pencil') {
      // Continue path drawing
    } else if (tool === 'select') {
      // Update selection position
    }
  }, [containerRef]);

  // Handle mouse up for dual-write
  const handleFabricMouseUp = useCallback(async (
    e: React.MouseEvent | React.TouchEvent,
    tool: string
  ) => {
    if (!bridgeRef.current) return;
    
    const engine = bridgeRef.current.getFabricEngine();
    if (!engine) return;

    // End drawing
    engine.renderAll();
  }, []);

  return {
    isReady,
    isFabricPrimary: useFabricPrimary,
    fabricEngine: bridgeRef.current?.getFabricEngine() || null,
    bridge: bridgeRef.current,
    error,
    initialize,
    destroy,
    syncSketchesToFabric,
    syncFabricToSketches,
    addSketchToFabric,
    updateSketchInFabric,
    removeSketchFromFabric,
    getFabricSVG,
    getFabricJSON,
    handleFabricMouseDown,
    handleFabricMouseMove,
    handleFabricMouseUp,
  };
}
