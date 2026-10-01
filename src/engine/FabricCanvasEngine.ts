// FabricCanvasEngine - Fabric.js adapter implementation
// Implements the CanvasEngine interface using Fabric.js library
//
// Note: Fabric.js is loaded at runtime in the browser, not as a TypeScript module.
// We use type assertions and any for fabric types to avoid compile-time dependencies.

import {
  CanvasEngine,
  CanvasObject,
  CanvasObjectType,
  CanvasEvent,
  CanvasEventType,
  CanvasEventHandler,
  CanvasOptions,
  CreateObjectOptions,
  Point,
  Size,
  Rect,
  RectObject,
  CircleObject,
  EllipseObject,
  LineObject,
  PathObject,
  TextObject,
  TextboxObject,
  GroupObject,
  ImageObject,
} from './canvasEngine';

// Type for fabric objects - we use any since fabric is loaded at runtime
// In a real implementation, you would have proper fabric.d.ts types
type FabricObject = any;
type FabricCanvas = any;
type FabricPoint = { x: number; y: number };
type FabricRect = { left: number; top: number; width: number; height: number };

/**
 * Helper to create a fabric Point from our Point type
 */
function toFabricPoint(p: Point): FabricPoint {
  return { x: p.x, y: p.y };
}

/**
 * Helper to convert fabric Point to our Point type
 */
function fromFabricPoint(fp: FabricPoint): Point {
  return { x: fp.x, y: fp.y };
}

/**
 * Helper to convert fabric Rect to our Rect type
 */
function fromFabricRect(r: FabricRect): Rect {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * FabricCanvasEngine - Concrete implementation of CanvasEngine using Fabric.js
 * 
 * This class wraps Fabric.js canvas and provides a type-safe interface
 * that matches the CanvasEngine contract.
 */
export class FabricCanvasEngine implements CanvasEngine {
  private _canvas: FabricCanvas | null = null;
  private _container: HTMLElement | null = null;
  private _eventHandlers: Map<CanvasEventType, Set<CanvasEventHandler>> = new Map();
  private _initialized: boolean = false;
  private _objectIdCounter: number = 0;
  
  // ============ Lifecycle ============
  
  async initialize(container: HTMLElement, options?: CanvasOptions): Promise<void> {
    if (this._initialized) {
      console.warn('Canvas already initialized');
      return;
    }
    
    this._container = container;
    
    // Ensure fabric is loaded globally
    if (typeof (window as any).fabric === 'undefined') {
      throw new Error('Fabric.js is not loaded. Make sure to include fabric.js before initializing the engine.');
    }
    
    const fabric = (window as any).fabric;
    
    // Create canvas element
    const canvasEl = document.createElement('canvas');
    if (options?.width) {
      canvasEl.width = options.width;
    }
    if (options?.height) {
      canvasEl.height = options.height;
    }
    
    container.appendChild(canvasEl);
    
    // Create fabric canvas
    this._canvas = new fabric.Canvas(canvasEl, {
      width: options?.width || 800,
      height: options?.height || 600,
      backgroundColor: options?.backgroundColor || '',
      selectionColor: options?.selectionColor || 'rgba(100, 100, 255, 0.3)',
      selectionBorderColor: options?.selectionBorderColor || 'rgba(100, 100, 255, 0.7)',
      selectionLineWidth: options?.selectionLineWidth || 1,
      defaultCursor: options?.defaultCursor || 'default',
      moveCursor: options?.moveCursor || 'move',
      freeDrawingCursor: options?.freeDrawingCursor || 'crosshair',
      rotationCursor: options?.rotationCursor || 'default',
      hoverCursor: options?.hoverCursor || 'pointer',
      preserveObjectStacking: true,
    });
    
    // Setup event forwarding
    this._setupEventForwarding();
    
    // Setup default object properties
    this._setupDefaultObjectProperties();
    
    this._initialized = true;
  }
  
  async destroy(): Promise<void> {
    if (this._canvas) {
      // Clear all event listeners
      this._canvas.off();
      
      // Clear all objects
      this._canvas.clear();
      
      // Remove canvas element
      if (this._container && this._canvas.getElement) {
        const element = this._canvas.getElement();
        if (element && this._container.contains(element)) {
          this._container.removeChild(element);
        }
      }
      
      // Dispose canvas
      if (this._canvas.dispose) {
        this._canvas.dispose();
      }
      this._canvas = null;
    }
    
    this._container = null;
    this._initialized = false;
    this._eventHandlers.clear();
  }
  
  getCanvasElement(): HTMLElement | null {
    if (this._canvas && this._canvas.getElement) {
      return this._canvas.getElement();
    }
    return null;
  }
  
  resize(width: number, height: number): void {
    if (this._canvas) {
      this._canvas.setDimensions({ width, height });
      this._canvas.renderAll();
    }
  }
  
  clear(): void {
    if (this._canvas) {
      this._canvas.clear();
      this._canvas.discardActiveObject();
      this._canvas.discardActiveSelection();
      this._canvas.renderAll();
    }
  }
  
  renderAll(): void {
    if (this._canvas) {
      this._canvas.renderAll();
    }
  }
  
  isInitialized(): boolean {
    return this._initialized;
  }
  
  // ============ Private Helpers ============
  
  private _generateId(): string {
    return `fabric-obj-${Date.now()}-${++this._objectIdCounter}`;
  }
  
  private _ensureCanvas(): FabricCanvas {
    if (!this._canvas) {
      throw new Error('Canvas not initialized. Call initialize() first.');
    }
    return this._canvas;
  }
  
  private get _fabric(): any {
    return (window as any).fabric;
  }
  
  private _setupEventForwarding(): void {
    if (!this._canvas) return;
    
    const canvas = this._canvas;
    
    // Map fabric events to engine events
    const fabricToEngineEvents: Record<string, CanvasEventType> = {
      'object:added': 'object:added',
      'object:removed': 'object:removed',
      'object:modified': 'object:modified',
      'object:selected': 'object:selected',
      'object:deselected': 'object:deselected',
      'selection:created': 'selection:created',
      'selection:updated': 'selection:updated',
      'selection:cleared': 'selection:cleared',
      'mouse:down': 'mouse:down',
      'mouse:move': 'mouse:move',
      'mouse:up': 'mouse:up',
      'mouse:over': 'mouse:over',
      'mouse:out': 'mouse:out',
      'key:down': 'key:down',
      'key:up': 'key:up',
      'before:render': 'before:render',
      'after:render': 'after:render',
    };
    
    Object.entries(fabricToEngineEvents).forEach(([fabricEvent, engineEvent]) => {
      canvas.on(fabricEvent, (e: any) => {
        this._forwardEvent(engineEvent, e);
      });
    });
  }
  
  private _setupDefaultObjectProperties(): void {
    if (!this._canvas) return;
    
    const fabric = this._fabric;
    // Set default properties for new objects
    if (fabric.Object && fabric.Object.prototype) {
      fabric.Object.prototype.originX = 'center';
      fabric.Object.prototype.originY = 'center';
      fabric.Object.prototype.padding = 0;
    }
  }
  
  private _forwardEvent(type: CanvasEventType, fabricEvent: any): void {
    const handlers = this._eventHandlers.get(type);
    if (!handlers || handlers.size === 0) return;
    
    const event: CanvasEvent = {
      type,
      target: fabricEvent.target ? this._toCanvasObject(fabricEvent.target) : undefined,
      targets: fabricEvent.targets ? fabricEvent.targets.map((t: any) => this._toCanvasObject(t)) : undefined,
      pointer: fabricEvent.pointer ? fromFabricPoint(fabricEvent.pointer) : undefined,
      absolutePointer: fabricEvent.absolutePointer ? fromFabricPoint(fabricEvent.absolutePointer) : undefined,
      key: fabricEvent.key,
      keyEvent: fabricEvent.e,
      timestamp: Date.now(),
    };
    
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in canvas event handler:', error);
      }
    });
  }
  
  private _toCanvasObject(fabricObj: FabricObject): CanvasObject {
    const base: any = {
      id: fabricObj.id || this._generateId(),
      type: fabricObj.type as CanvasObjectType,
      left: fabricObj.left || 0,
      top: fabricObj.top || 0,
      width: fabricObj.width || 0,
      height: fabricObj.height || 0,
      angle: fabricObj.angle || 0,
      scaleX: fabricObj.scaleX || 1,
      scaleY: fabricObj.scaleY || 1,
      opacity: fabricObj.opacity !== undefined ? fabricObj.opacity : 1,
      visible: fabricObj.visible !== undefined ? fabricObj.visible : true,
      selectable: fabricObj.selectable !== undefined ? fabricObj.selectable : true,
      evented: fabricObj.evented !== undefined ? fabricObj.evented : true,
      hasControls: fabricObj.hasControls !== undefined ? fabricObj.hasControls : true,
      hasBorders: fabricObj.hasBorders !== undefined ? fabricObj.hasBorders : true,
      hasRotatingPoint: fabricObj.hasRotatingPoint !== undefined ? fabricObj.hasRotatingPoint : true,
      fill: fabricObj.fill || '',
      stroke: fabricObj.stroke || '',
      strokeWidth: fabricObj.strokeWidth || 0,
      strokeDashArray: fabricObj.strokeDashArray || [],
      zIndex: fabricObj.zIndex || 0,
    };
    
    switch (fabricObj.type) {
      case 'rect':
        return {
          ...base,
          type: 'rect',
          rx: fabricObj.rx || 0,
          ry: fabricObj.ry || 0,
        } as RectObject;
      
      case 'circle':
        return {
          ...base,
          type: 'circle',
          radius: fabricObj.radius || 0,
        } as CircleObject;
      
      case 'ellipse':
        return {
          ...base,
          type: 'ellipse',
          rx: fabricObj.rx || 0,
          ry: fabricObj.ry || 0,
        } as EllipseObject;
      
      case 'line':
        return {
          ...base,
          type: 'line',
          x1: fabricObj.x1 || 0,
          y1: fabricObj.y1 || 0,
          x2: fabricObj.x2 || 0,
          y2: fabricObj.y2 || 0,
        } as LineObject;
      
      case 'path':
        return {
          ...base,
          type: 'path',
          path: typeof fabricObj.path === 'string' ? fabricObj.path : this._pathToString(fabricObj.path),
          strokeLineCap: fabricObj.strokeLineCap || 'butt',
          strokeLineJoin: fabricObj.strokeLineJoin || 'miter',
          fillRule: fabricObj.fillRule || 'nonzero',
        } as PathObject;
      
      case 'text':
        return {
          ...base,
          type: 'text',
          text: fabricObj.text || '',
          fontSize: fabricObj.fontSize || 0,
          fontFamily: fabricObj.fontFamily || '',
          fontWeight: fabricObj.fontWeight || '',
          fontStyle: fabricObj.fontStyle || 'normal',
          textAlign: fabricObj.textAlign || 'left',
          textBackgroundColor: fabricObj.textBackgroundColor || '',
          lineHeight: fabricObj.lineHeight || 1,
          charSpacing: fabricObj.charSpacing || 0,
          styles: fabricObj.styles || {},
        } as TextObject;
      
      case 'textbox':
      case 'i-text':
        return {
          ...base,
          type: 'textbox',
          text: fabricObj.text || '',
          fontSize: fabricObj.fontSize || 0,
          fontFamily: fabricObj.fontFamily || '',
          fontWeight: fabricObj.fontWeight || '',
          fontStyle: fabricObj.fontStyle || 'normal',
          textAlign: fabricObj.textAlign || 'left',
          textBackgroundColor: fabricObj.textBackgroundColor || '',
          lineHeight: fabricObj.lineHeight || 1,
          charSpacing: fabricObj.charSpacing || 0,
          styles: fabricObj.styles || {},
        } as TextboxObject;
      
      case 'group':
        return {
          ...base,
          type: 'group',
          objects: (fabricObj.objects || []).map((o: FabricObject) => this._toCanvasObject(o)),
        } as GroupObject;
      
      case 'image':
        return {
          ...base,
          type: 'image',
          src: fabricObj.src || '',
        } as ImageObject;
      
      default:
        return base as CanvasObject;
    }
  }
  
  private _pathToString(path: any[]): string {
    return path.map(cmd => {
      if (Array.isArray(cmd)) {
        return `${cmd[0]}${cmd.slice(1).map(v => ` ${v}`).join('')}`;
      }
      return String(cmd);
    }).join(' ');
  }
  
  private _toFabricObject(obj: CanvasObject): FabricObject {
    const fabric = this._fabric;
    const commonOptions: any = {
      id: obj.id,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height,
      angle: obj.angle,
      scaleX: obj.scaleX,
      scaleY: obj.scaleY,
      opacity: obj.opacity,
      visible: obj.visible,
      selectable: obj.selectable,
      evented: obj.evented,
      hasControls: obj.hasControls,
      hasBorders: obj.hasBorders,
      hasRotatingPoint: obj.hasRotatingPoint,
      fill: obj.fill,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      strokeDashArray: obj.strokeDashArray,
      zIndex: obj.zIndex,
      originX: 'center',
      originY: 'center',
    };
    
    switch (obj.type) {
      case 'rect':
        return new fabric.Rect({
          ...commonOptions,
          rx: (obj as RectObject).rx || 0,
          ry: (obj as RectObject).ry || 0,
        });
      
      case 'circle':
        return new fabric.Circle({
          ...commonOptions,
          radius: (obj as CircleObject).radius,
        });
      
      case 'ellipse':
        return new fabric.Ellipse({
          ...commonOptions,
          rx: (obj as EllipseObject).rx,
          ry: (obj as EllipseObject).ry,
        });
      
      case 'line':
        return new fabric.Line({
          ...commonOptions,
          x1: (obj as LineObject).x1,
          y1: (obj as LineObject).y1,
          x2: (obj as LineObject).x2,
          y2: (obj as LineObject).y2,
        });
      
      case 'path':
        return new fabric.Path((obj as PathObject).path, {
          ...commonOptions,
          strokeLineCap: (obj as PathObject).strokeLineCap || 'butt',
          strokeLineJoin: (obj as PathObject).strokeLineJoin || 'miter',
          fillRule: (obj as PathObject).fillRule || 'nonzero',
        });
      
      case 'text':
        return new fabric.Text((obj as TextObject).text, {
          ...commonOptions,
          fontSize: (obj as TextObject).fontSize || 16,
          fontFamily: (obj as TextObject).fontFamily || 'Arial',
          fontWeight: (obj as TextObject).fontWeight || 'normal',
          fontStyle: (obj as TextObject).fontStyle || 'normal',
          textAlign: (obj as TextObject).textAlign || 'left',
          textBackgroundColor: (obj as TextObject).textBackgroundColor || '',
          lineHeight: (obj as TextObject).lineHeight || 1,
          charSpacing: (obj as TextObject).charSpacing || 0,
          styles: (obj as TextObject).styles || {},
        });
      
      case 'textbox':
        return new fabric.Textbox((obj as TextboxObject).text, {
          ...commonOptions,
          fontSize: (obj as TextboxObject).fontSize || 16,
          fontFamily: (obj as TextboxObject).fontFamily || 'Arial',
          fontWeight: (obj as TextboxObject).fontWeight || 'normal',
          fontStyle: (obj as TextboxObject).fontStyle || 'normal',
          textAlign: (obj as TextboxObject).textAlign || 'left',
          textBackgroundColor: (obj as TextboxObject).textBackgroundColor || '',
          lineHeight: (obj as TextboxObject).lineHeight || 1,
          charSpacing: (obj as TextboxObject).charSpacing || 0,
          styles: (obj as TextboxObject).styles || {},
          editable: true,
        });
      
      case 'group':
        const groupObjs = (obj as GroupObject).objects.map(o => this._toFabricObject(o));
        return new fabric.Group(groupObjs, commonOptions);
      
      case 'image':
        return new fabric.Image((obj as ImageObject).src, {
          ...commonOptions,
          crossOrigin: 'anonymous',
        });
      
      default:
        return new fabric.Object(commonOptions);
    }
  }
  
  // ============ Object Creation ============
  
  createRect(options: CreateObjectOptions = {}): RectObject {
    const fabric = this._fabric;
    const fabricObj = new fabric.Rect({
      ...options,
      id: options.id || this._generateId(),
      originX: 'center',
      originY: 'center',
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as RectObject;
  }
  
  createCircle(options: CreateObjectOptions & { radius: number }): CircleObject {
    const fabric = this._fabric;
    const fabricObj = new fabric.Circle({
      ...options,
      id: options.id || this._generateId(),
      radius: options.radius,
      originX: 'center',
      originY: 'center',
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as CircleObject;
  }
  
  createEllipse(options: CreateObjectOptions & { rx: number; ry: number }): EllipseObject {
    const fabric = this._fabric;
    const fabricObj = new fabric.Ellipse({
      ...options,
      id: options.id || this._generateId(),
      rx: options.rx,
      ry: options.ry,
      originX: 'center',
      originY: 'center',
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as EllipseObject;
  }
  
  createLine(options: CreateObjectOptions & { x1: number; y1: number; x2: number; y2: number }): LineObject {
    const fabric = this._fabric;
    const fabricObj = new fabric.Line({
      ...options,
      id: options.id || this._generateId(),
      x1: options.x1,
      y1: options.y1,
      x2: options.x2,
      y2: options.y2,
      originX: 'center',
      originY: 'center',
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as LineObject;
  }
  
  createPath(options: CreateObjectOptions & { path: string }): PathObject {
    const fabric = this._fabric;
    const fabricObj = new fabric.Path(options.path, {
      ...options,
      id: options.id || this._generateId(),
      originX: 'center',
      originY: 'center',
      strokeLineCap: options.strokeLineCap || 'butt',
      strokeLineJoin: options.strokeLineJoin || 'miter',
      fillRule: options.fillRule || 'nonzero',
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as PathObject;
  }
  
  createText(options: CreateObjectOptions & { text: string }): TextObject {
    const fabric = this._fabric;
    const fabricObj = new fabric.Text(options.text, {
      ...options,
      id: options.id || this._generateId(),
      originX: 'center',
      originY: 'center',
      fontSize: options.fontSize || 16,
      fontFamily: options.fontFamily || 'Arial',
      fontWeight: options.fontWeight || 'normal',
      fontStyle: options.fontStyle || 'normal',
      textAlign: options.textAlign || 'center',
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as TextObject;
  }
  
  createTextbox(options: CreateObjectOptions & { text: string }): TextboxObject {
    const fabric = this._fabric;
    const fabricObj = new fabric.Textbox(options.text, {
      ...options,
      id: options.id || this._generateId(),
      originX: 'center',
      originY: 'center',
      fontSize: options.fontSize || 16,
      fontFamily: options.fontFamily || 'Arial',
      fontWeight: options.fontWeight || 'normal',
      fontStyle: options.fontStyle || 'normal',
      textAlign: options.textAlign || 'center',
      editable: true,
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as TextboxObject;
  }
  
  createGroup(objects: CanvasObject[], options: CreateObjectOptions = {}): GroupObject {
    const fabric = this._fabric;
    const fabricObjs = objects.map(obj => this._toFabricObject(obj));
    const fabricObj = new fabric.Group(fabricObjs, {
      ...options,
      id: options.id || this._generateId(),
      originX: 'center',
      originY: 'center',
    });
    
    if (this._canvas) {
      this._canvas.add(fabricObj);
    }
    
    return this._toCanvasObject(fabricObj) as GroupObject;
  }
  
  async createImage(options: CreateObjectOptions & { src: string }): Promise<ImageObject> {
    const fabric = this._fabric;
    return new Promise((resolve) => {
      const fabricObj = new fabric.Image(options.src, {
        ...options,
        id: options.id || this._generateId(),
        originX: 'center',
        originY: 'center',
        crossOrigin: 'anonymous',
      }, (img: HTMLImageElement) => {
        if (this._canvas) {
          this._canvas.add(fabricObj);
        }
        resolve(this._toCanvasObject(fabricObj) as ImageObject);
      });
    });
  }
  
  // ============ Object Management ============
  
  addObject(obj: CanvasObject): void {
    if (this._canvas) {
      this._canvas.add(this._toFabricObject(obj));
    }
  }
  
  addObjects(objects: CanvasObject[]): void {
    if (this._canvas) {
      this._canvas.add(...objects.map(obj => this._toFabricObject(obj)));
    }
  }
  
  removeObject(obj: CanvasObject): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        this._canvas.remove(fabricObj);
      }
    }
  }
  
  removeObjectById(id: string): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === id);
      if (fabricObj) {
        this._canvas.remove(fabricObj);
      }
    }
  }
  
  removeObjects(objects: CanvasObject[]): void {
    if (this._canvas) {
      const fabricObjs = objects
        .map(obj => this._canvas.getObjects().find((o: any) => o.id === obj.id))
        .filter((o: any): o is FabricObject => o !== undefined);
      this._canvas.remove(...fabricObjs);
    }
  }
  
  getObjectById(id: string): CanvasObject | undefined {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === id);
      if (fabricObj) {
        return this._toCanvasObject(fabricObj);
      }
    }
    return undefined;
  }
  
  getObjects(): CanvasObject[] {
    if (this._canvas) {
      return this._canvas.getObjects().map((obj: any) => this._toCanvasObject(obj));
    }
    return [];
  }
  
  getSelectedObjects(): CanvasObject[] {
    if (this._canvas) {
      const activeSelection = this._canvas.getActiveSelection();
      if (activeSelection) {
        return activeSelection.getObjects().map((obj: any) => this._toCanvasObject(obj));
      }
      const activeObject = this._canvas.getActiveObject();
      if (activeObject) {
        return [this._toCanvasObject(activeObject)];
      }
    }
    return [];
  }
  
  getActiveSelection(): GroupObject | undefined {
    if (this._canvas) {
      const activeSelection = this._canvas.getActiveSelection();
      if (activeSelection && activeSelection.type === 'group') {
        return this._toCanvasObject(activeSelection) as GroupObject;
      }
    }
    return undefined;
  }
  
  clearSelection(): void {
    if (this._canvas) {
      this._canvas.discardActiveObject();
      this._canvas.discardActiveSelection();
      this._canvas.renderAll();
    }
  }
  
  selectObject(obj: CanvasObject): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        this._canvas.setActiveObject(fabricObj);
        this._canvas.renderAll();
      }
    }
  }
  
  selectObjects(objects: CanvasObject[]): void {
    if (this._canvas && objects.length > 0) {
      const fabricObjs = objects
        .map(obj => this._canvas.getObjects().find((o: any) => o.id === obj.id))
        .filter((o: any): o is FabricObject => o !== undefined);
      
      if (fabricObjs.length > 0) {
        const Group = this._fabric.Group;
        const group = new Group(fabricObjs);
        this._canvas.setActiveSelection(group);
        this._canvas.renderAll();
      }
    }
  }
  
  selectObjectById(id: string): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === id);
      if (fabricObj) {
        this._canvas.setActiveObject(fabricObj);
        this._canvas.renderAll();
      }
    }
  }
  
  // ============ Object Transformation ============
  
  setObjectPosition(obj: CanvasObject, left: number, top: number): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set({ left, top });
        this._canvas.renderAll();
      }
    }
  }
  
  setObjectSize(obj: CanvasObject, width: number, height: number): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set({ width, height });
        this._canvas.renderAll();
      }
    }
  }
  
  setObjectScale(obj: CanvasObject, scaleX: number, scaleY: number): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set({ scaleX, scaleY });
        this._canvas.renderAll();
      }
    }
  }
  
  setObjectRotation(obj: CanvasObject, angle: number): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set({ angle });
        this._canvas.renderAll();
      }
    }
  }
  
  setObjectOpacity(obj: CanvasObject, opacity: number): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set({ opacity });
        this._canvas.renderAll();
      }
    }
  }
  
  setObjectFill(obj: CanvasObject, color: string): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set({ fill: color });
        this._canvas.renderAll();
      }
    }
  }
  
  setObjectStroke(obj: CanvasObject, color: string, width: number = obj.strokeWidth || 1): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.set({ stroke: color, strokeWidth: width });
        this._canvas.renderAll();
      }
    }
  }
  
  bringToFront(obj: CanvasObject): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.bringToFront();
        this._canvas.renderAll();
      }
    }
  }
  
  sendToBack(obj: CanvasObject): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.sendToBack();
        this._canvas.renderAll();
      }
    }
  }
  
  bringForward(obj: CanvasObject): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.bringForward();
        this._canvas.renderAll();
      }
    }
  }
  
  sendBackwards(obj: CanvasObject): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.sendBackwards();
        this._canvas.renderAll();
      }
    }
  }
  
  setZIndex(obj: CanvasObject, zIndex: number): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        fabricObj.setZIndex(zIndex);
        this._canvas.renderAll();
      }
    }
  }
  
  // ============ Group Operations ============
  
  groupSelected(): GroupObject | undefined {
    if (this._canvas) {
      const activeSelection = this._canvas.getActiveSelection();
      if (activeSelection && activeSelection.getObjects && activeSelection.getObjects().length > 0) {
        const Group = this._fabric.Group;
        const group = new Group(activeSelection.getObjects());
        this._canvas.remove(...activeSelection.getObjects());
        this._canvas.add(group);
        this._canvas.setActiveObject(group);
        this._canvas.renderAll();
        return this._toCanvasObject(group) as GroupObject;
      }
    }
    return undefined;
  }
  
  ungroup(group: GroupObject): CanvasObject[] {
    if (this._canvas) {
      const fabricGroup = this._canvas.getObjects().find((o: any) => o.id === group.id);
      if (fabricGroup && fabricGroup.getObjects) {
        const objects = fabricGroup.getObjects();
        this._canvas.remove(fabricGroup);
        this._canvas.add(...objects);
        this._canvas.renderAll();
        return objects.map((obj: any) => this._toCanvasObject(obj));
      }
    }
    return [];
  }
  
  addToGroup(group: GroupObject, obj: CanvasObject): void {
    if (this._canvas) {
      const fabricGroup = this._canvas.getObjects().find((o: any) => o.id === group.id);
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      
      if (fabricGroup && fabricGroup.add && fabricObj) {
        fabricGroup.add(fabricObj);
        this._canvas.renderAll();
      }
    }
  }
  
  removeFromGroup(group: GroupObject, obj: CanvasObject): void {
    if (this._canvas) {
      const fabricGroup = this._canvas.getObjects().find((o: any) => o.id === group.id);
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      
      if (fabricGroup && fabricGroup.remove && fabricObj) {
        fabricGroup.remove(fabricObj);
        this._canvas.renderAll();
      }
    }
  }
  
  // ============ Path Operations ============
  
  setPathData(obj: PathObject, path: string): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj && fabricObj.set) {
        fabricObj.set({ path });
        this._canvas.renderAll();
      }
    }
  }
  
  getPathData(obj: PathObject): string {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        if (typeof fabricObj.path === 'string') {
          return fabricObj.path;
        }
        return this._pathToString(fabricObj.path);
      }
    }
    return obj.path;
  }
  
  toSVG(obj: CanvasObject): string {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj && fabricObj.toSVG) {
        return fabricObj.toSVG();
      }
    }
    return '';
  }
  
  // ============ Text Operations ============
  
  setText(obj: TextObject | TextboxObject, text: string): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj && fabricObj.set) {
        fabricObj.set({ text });
        this._canvas.renderAll();
      }
    }
  }
  
  getText(obj: TextObject | TextboxObject): string {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj && fabricObj.text) {
        return fabricObj.text;
      }
    }
    return obj.text;
  }
  
  setFont(obj: TextObject | TextboxObject, options: { fontSize?: number; fontFamily?: string; fontWeight?: string | number; fontStyle?: 'normal' | 'italic' | 'oblique' }): void {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj && fabricObj.set) {
        fabricObj.set({
          fontSize: options.fontSize,
          fontFamily: options.fontFamily,
          fontWeight: options.fontWeight,
          fontStyle: options.fontStyle,
        });
        this._canvas.renderAll();
      }
    }
  }
  
  // ============ Image Operations ============
  
  async setImageSrc(obj: ImageObject, src: string): Promise<void> {
    return new Promise((resolve) => {
      if (this._canvas) {
        const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
        if (fabricObj && fabricObj.setSrc) {
          fabricObj.setSrc(src, () => {
            this._canvas?.renderAll();
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }
  
  getImageDataURL(obj: ImageObject): string {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj && fabricObj.getElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = fabricObj.width || 0;
          canvas.height = fabricObj.height || 0;
          ctx.drawImage(fabricObj.getElement(), 0, 0);
          return canvas.toDataURL();
        }
      }
    }
    return '';
  }
  
  // ============ Export ============
  
  exportToSVG(): string {
    if (this._canvas && this._canvas.toSVG) {
      return this._canvas.toSVG();
    }
    return '';
  }
  
  toJSON(): any {
    if (this._canvas && this._canvas.toJSON) {
      return this._canvas.toJSON();
    }
    return {};
  }
  
  toDataURL(options?: { format?: 'png' | 'jpeg'; quality?: number }): string {
    if (this._canvas && this._canvas.toDataURL) {
      return this._canvas.toDataURL({
        format: options?.format || 'png',
        quality: options?.quality || 1,
      });
    }
    return '';
  }
  
  toObjectJSON(obj: CanvasObject): any {
    if (this._canvas) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj && fabricObj.toObject) {
        return fabricObj.toObject();
      }
    }
    return {};
  }
  
  // ============ Clipboard ============
  
  copy(): void {
    if (this._canvas && this._canvas.copy) {
      this._canvas.copy();
    }
  }
  
  cut(): void {
    if (this._canvas && this._canvas.cut) {
      this._canvas.cut();
    }
  }
  
  paste(): void {
    if (this._canvas && this._canvas.paste) {
      this._canvas.paste();
    }
  }
  
  duplicate(): void {
    if (this._canvas && this._canvas.duplicate) {
      this._canvas.duplicate();
    }
  }
  
  // ============ Undo/Redo ============
  
  undo(): void {
    if (this._canvas && this._canvas.undo) {
      this._canvas.undo();
    }
  }
  
  redo(): void {
    if (this._canvas && this._canvas.redo) {
      this._canvas.redo();
    }
  }
  
  clearUndoHistory(): void {
    if (this._canvas && this._canvas.clearUndoStack) {
      this._canvas.clearUndoStack();
    }
  }
  
  canUndo(): boolean {
    return this._canvas?.canUndo?.() || false;
  }
  
  canRedo(): boolean {
    return this._canvas?.canRedo?.() || false;
  }
  
  // ============ Event Handling ============
  
  on(event: CanvasEventType, handler: CanvasEventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler);
  }
  
  off(event: CanvasEventType, handler: CanvasEventHandler): void {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  once(event: CanvasEventType, handler: CanvasEventHandler): void {
    const onceHandler: CanvasEventHandler = (e) => {
      handler(e);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }
  
  emit(event: CanvasEvent): void {
    const handlers = this._eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(h => h(event));
    }
  }
  
  // ============ Selection ============
  
  setSelectionMode(enabled: boolean): void {
    if (this._canvas && this._canvas.enableSelection) {
      this._canvas.enableSelection(enabled);
    }
  }
  
  isSelectionEnabled(): boolean {
    return this._canvas?.selection || false;
  }
  
  // ============ Drawing Mode ============
  
  enableDrawingMode(): void {
    if (this._canvas) {
      this._canvas.isDrawingMode = true;
    }
  }
  
  disableDrawingMode(): void {
    if (this._canvas) {
      this._canvas.isDrawingMode = false;
    }
  }
  
  isDrawingModeEnabled(): boolean {
    return this._canvas?.isDrawingMode || false;
  }
  
  setDrawingBrush(options: { width?: number; color?: string; opacity?: number }): void {
    if (this._canvas) {
      this._canvas.freeDrawingBrush = {
        width: options.width || this._canvas.freeDrawingBrush?.width || 5,
        color: options.color || this._canvas.freeDrawingBrush?.color || '#000000',
        opacity: options.opacity || this._canvas.freeDrawingBrush?.opacity || 1,
      };
    }
  }
  
  // ============ Interaction ============
  
  setMovable(enabled: boolean): void {
    if (this._canvas && this._canvas.enableMovable) {
      this._canvas.enableMovable(enabled);
    }
  }
  
  setScalable(enabled: boolean): void {
    if (this._canvas && this._canvas.enableScalable) {
      this._canvas.enableScalable(enabled);
    }
  }
  
  setRotatable(enabled: boolean): void {
    if (this._canvas && this._canvas.enableRotatable) {
      this._canvas.enableRotatable(enabled);
    }
  }
  
  setDeletable(enabled: boolean): void {
    if (this._canvas && this._canvas.enableDeletable) {
      this._canvas.enableDeletable(enabled);
    }
  }
  
  // ============ Zoom & Pan ============
  
  getZoom(): number {
    return this._canvas?.getZoom?.() || 1;
  }
  
  setZoom(zoom: number): void {
    if (this._canvas && this._canvas.setZoom) {
      this._canvas.setZoom(zoom);
    }
  }
  
  zoomToFit(): void {
    if (this._canvas && this._canvas.calcViewportBoundaries) {
      const objects = this._canvas.getObjects();
      if (objects.length > 0) {
        const bounds = this._canvas.calcViewportBoundaries();
        const padding = 20;
        const width = bounds.width + padding * 2;
        const height = bounds.height + padding * 2;
        const zoom = Math.min(
          (this._canvas.getWidth() - padding * 2) / width,
          (this._canvas.getHeight() - padding * 2) / height
        );
        this._canvas.setZoom(zoom);
        this._canvas.absolutePan({
          x: -bounds.left - padding,
          y: -bounds.top - padding,
        });
        this._canvas.renderAll();
      }
    }
  }
  
  panTo(point: Point): void {
    if (this._canvas && this._canvas.absolutePan) {
      this._canvas.absolutePan(toFabricPoint(point));
    }
  }
  
  getViewportTransform(): { x: number; y: number; scale: number } {
    if (this._canvas && this._canvas.getViewportTransform) {
      const transform = this._canvas.getViewportTransform();
      return {
        x: transform[4] || 0,
        y: transform[5] || 0,
        scale: transform[0] || 1,
      };
    }
    return { x: 0, y: 0, scale: 1 };
  }
  
  // ============ Grid & Snapping ============
  
  enableGrid(enabled: boolean, size: number = 20): void {
    if (this._canvas && this._canvas.setGrid) {
      this._canvas.setGrid(enabled, size);
    }
  }
  
  enableSnapping(enabled: boolean, gridSize: number = 20): void {
    if (this._canvas && this._canvas.setSnapping) {
      this._canvas.setSnapping(enabled, gridSize);
    }
  }
  
  // ============ Utility ============
  
  getObjectAtPoint(point: Point): CanvasObject | undefined {
    if (this._canvas && this._canvas.getObjectAtPoint) {
      const fabricObj = this._canvas.getObjectAtPoint(toFabricPoint(point));
      if (fabricObj) {
        return this._toCanvasObject(fabricObj);
      }
    }
    return undefined;
  }
  
  getObjectsInRect(rect: Rect): CanvasObject[] {
    if (this._canvas && this._canvas.getObjectsInRect) {
      const fabricRect = new this._fabric.Rect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      const objects = this._canvas.getObjectsInRect(fromFabricRect(fabricRect.getBoundingRect()));
      return objects.map((obj: any) => this._toCanvasObject(obj));
    }
    return [];
  }
  
  centerObject(obj: CanvasObject): void {
    if (this._canvas && this._canvas.centerObject) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        this._canvas.centerObject(fabricObj);
        this._canvas.renderAll();
      }
    }
  }
  
  centerH(obj: CanvasObject): void {
    if (this._canvas && this._canvas.centerH) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        this._canvas.centerH(fabricObj);
        this._canvas.renderAll();
      }
    }
  }
  
  centerV(obj: CanvasObject): void {
    if (this._canvas && this._canvas.centerV) {
      const fabricObj = this._canvas.getObjects().find((o: any) => o.id === obj.id);
      if (fabricObj) {
        this._canvas.centerV(fabricObj);
        this._canvas.renderAll();
      }
    }
  }
  
  getSize(): Size {
    if (this._canvas) {
      return {
        width: this._canvas.getWidth(),
        height: this._canvas.getHeight(),
      };
    }
    return { width: 0, height: 0 };
  }
  
  getDimensions(): { width: number; height: number } {
    return this.getSize();
  }
  
  setBackground(color: string | null): void {
    if (this._canvas && this._canvas.setBackgroundColor) {
      this._canvas.setBackgroundColor(color || '');
    }
  }
  
  getBackground(): string | null {
    if (this._canvas && this._canvas.getBackgroundColor) {
      const bg = this._canvas.getBackgroundColor();
      return bg || null;
    }
    return null;
  }
  
  saveState(): string {
    if (this._canvas && this._canvas.toJSON) {
      return JSON.stringify(this._canvas.toJSON());
    }
    return '{}';
  }
  
  restoreState(state: string): void {
    if (this._canvas && this._canvas.loadFromJSON) {
      try {
        const json = JSON.parse(state);
        this._canvas.loadFromJSON(json, () => {
          this._canvas.renderAll();
        });
      } catch (error) {
        console.error('Failed to restore canvas state:', error);
      }
    }
  }
}

/**
 * Factory function to create a FabricCanvasEngine
 */
export function createFabricCanvasEngine(
  container: HTMLElement,
  options?: CanvasOptions
): CanvasEngine {
  const engine = new FabricCanvasEngine();
  // Initialize immediately if container is provided
  if (container) {
    engine.initialize(container, options);
  }
  return engine;
}
