// Canvas Engine Interface
// Type-safe contract for all canvas implementations (Fabric.js, native, etc.)

/**
 * Represents a 2D point with x and y coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents a size with width and height
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Represents a rectangle with position and size
 */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Canvas object types supported by the engine
 */
export type CanvasObjectType = 
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'path'
  | 'text'
  | 'textbox'
  | 'group'
  | 'image';

/**
 * Base properties for all canvas objects
 */
export interface BaseCanvasObject {
  id: string;
  type: CanvasObjectType;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  selectable: boolean;
  evented: boolean;
  hasControls: boolean;
  hasBorders: boolean;
  hasRotatingPoint: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDashArray?: number[];
  zIndex?: number;
}

/**
 * Rectangle object
 */
export interface RectObject extends BaseCanvasObject {
  type: 'rect';
  rx?: number;
  ry?: number;
}

/**
 * Circle object
 */
export interface CircleObject extends BaseCanvasObject {
  type: 'circle';
  radius: number;
}

/**
 * Ellipse object
 */
export interface EllipseObject extends BaseCanvasObject {
  type: 'ellipse';
  rx: number;
  ry: number;
}

/**
 * Line object
 */
export interface LineObject extends BaseCanvasObject {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Path object (SVG path)
 */
export interface PathObject extends BaseCanvasObject {
  type: 'path';
  path: string;
  strokeLineCap?: 'butt' | 'round' | 'square';
  strokeLineJoin?: 'miter' | 'round' | 'bevel';
  fillRule?: 'nonzero' | 'evenodd';
}

/**
 * Text object
 */
export interface TextObject extends BaseCanvasObject {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textBackgroundColor?: string;
  lineHeight?: number;
  charSpacing?: number;
  styles?: Record<string, any>;
}

/**
 * Textbox object (editable text)
 */
export interface TextboxObject extends BaseCanvasObject {
  type: 'textbox';
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textBackgroundColor?: string;
  lineHeight?: number;
  charSpacing?: number;
  styles?: Record<string, any>;
}

/**
 * Group object (container for other objects)
 */
export interface GroupObject extends BaseCanvasObject {
  type: 'group';
  objects: CanvasObject[];
}

/**
 * Image object
 */
export interface ImageObject extends BaseCanvasObject {
  type: 'image';
  src: string;
  filters?: any[];
  crossOrigin?: string;
}

/**
 * Union type for all canvas objects
 */
export type CanvasObject = 
  | RectObject
  | CircleObject
  | EllipseObject
  | LineObject
  | PathObject
  | TextObject
  | TextboxObject
  | GroupObject
  | ImageObject;

/**
 * Event types emitted by the canvas
 */
export type CanvasEventType = 
  | 'object:added'
  | 'object:removed'
  | 'object:modified'
  | 'object:selected'
  | 'object:deselected'
  | 'selection:created'
  | 'selection:updated'
  | 'selection:cleared'
  | 'mouse:down'
  | 'mouse:move'
  | 'mouse:up'
  | 'mouse:over'
  | 'mouse:out'
  | 'key:down'
  | 'key:up'
  | 'before:render'
  | 'after:render';

/**
 * Canvas event payload
 */
export interface CanvasEvent {
  type: CanvasEventType;
  target?: CanvasObject | null;
  targets?: CanvasObject[];
  pointer?: Point;
  absolutePointer?: Point;
  key?: string;
  keyEvent?: KeyboardEvent;
  timestamp: number;
}

/**
 * Event handler function type
 */
export type CanvasEventHandler = (event: CanvasEvent) => void;

/**
 * Options for creating objects
 */
export interface CreateObjectOptions {
  id?: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  selectable?: boolean;
  evented?: boolean;
  [key: string]: any;
}

/**
 * Options for canvas itself
 */
export interface CanvasOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  selectionColor?: string;
  selectionBorderColor?: string;
  selectionLineWidth?: number;
  defaultCursor?: string;
  moveCursor?: string;
  freeDrawingCursor?: string;
  rotationCursor?: string;
  hoverCursor?: string;
}

/**
 * CanvasEngine Interface
 * Main contract for all canvas implementations
 */
export interface CanvasEngine {
  // ============ Lifecycle ============
  
  /** Initialize the canvas with a container element */
  initialize(container: HTMLElement, options?: CanvasOptions): Promise<void>;
  
  /** Destroy the canvas and clean up resources */
  destroy(): Promise<void>;
  
  /** Resize the canvas */
  resize(width: number, height: number): void;
  
  /** Clear the entire canvas */
  clear(): void;
  
  /** Render the canvas (request a frame) */
  renderAll(): void;
  
  /** Check if canvas is initialized */
  isInitialized(): boolean;
  
  // ============ Object Creation ============
  
  /** Create a rectangle */
  createRect(options: CreateObjectOptions): RectObject;
  
  /** Create a circle */
  createCircle(options: CreateObjectOptions & { radius: number }): CircleObject;
  
  /** Create an ellipse */
  createEllipse(options: CreateObjectOptions & { rx: number; ry: number }): EllipseObject;
  
  /** Create a line */
  createLine(options: CreateObjectOptions & { x1: number; y1: number; x2: number; y2: number }): LineObject;
  
  /** Create a path from SVG path string */
  createPath(options: CreateObjectOptions & { path: string }): PathObject;
  
  /** Create a text object */
  createText(options: CreateObjectOptions & { text: string }): TextObject;
  
  /** Create an editable textbox */
  createTextbox(options: CreateObjectOptions & { text: string }): TextboxObject;
  
  /** Create a group from objects */
  createGroup(objects: CanvasObject[], options?: CreateObjectOptions): GroupObject;
  
  /** Create an image from URL */
  createImage(options: CreateObjectOptions & { src: string }): Promise<ImageObject>;
  
  // ============ Object Management ============
  
  /** Add an object to the canvas */
  addObject(obj: CanvasObject): void;
  
  /** Add multiple objects to the canvas */
  addObjects(objects: CanvasObject[]): void;
  
  /** Remove an object from the canvas */
  removeObject(obj: CanvasObject): void;
  
  /** Remove objects by ID */
  removeObjectById(id: string): void;
  
  /** Remove multiple objects */
  removeObjects(objects: CanvasObject[]): void;
  
  /** Get an object by ID */
  getObjectById(id: string): CanvasObject | undefined;
  
  /** Get all objects on the canvas */
  getObjects(): CanvasObject[];
  
  /** Get selected objects */
  getSelectedObjects(): CanvasObject[];
  
  /** Get the active selection (group of selected objects) */
  getActiveSelection(): GroupObject | undefined;
  
  /** Clear selection */
  clearSelection(): void;
  
  /** Select an object */
  selectObject(obj: CanvasObject): void;
  
  /** Select objects */
  selectObjects(objects: CanvasObject[]): void;
  
  /** Select object by ID */
  selectObjectById(id: string): void;
  
  // ============ Object Transformation ============
  
  /** Set object position */
  setObjectPosition(obj: CanvasObject, left: number, top: number): void;
  
  /** Set object size */
  setObjectSize(obj: CanvasObject, width: number, height: number): void;
  
  /** Set object scale */
  setObjectScale(obj: CanvasObject, scaleX: number, scaleY: number): void;
  
  /** Set object rotation */
  setObjectRotation(obj: CanvasObject, angle: number): void;
  
  /** Set object opacity */
  setObjectOpacity(obj: CanvasObject, opacity: number): void;
  
  /** Set object fill color */
  setObjectFill(obj: CanvasObject, color: string): void;
  
  /** Set object stroke */
  setObjectStroke(obj: CanvasObject, color: string, width?: number): void;
  
  /** Move object to front */
  bringToFront(obj: CanvasObject): void;
  
  /** Move object to back */
  sendToBack(obj: CanvasObject): void;
  
  /** Bring object forward one step */
  bringForward(obj: CanvasObject): void;
  
  /** Send object backward one step */
  sendBackwards(obj: CanvasObject): void;
  
  /** Set z-index explicitly */
  setZIndex(obj: CanvasObject, zIndex: number): void;
  
  // ============ Group Operations ============
  
  /** Group selected objects */
  groupSelected(): GroupObject | undefined;
  
  /** Ungroup a group */
  ungroup(group: GroupObject): CanvasObject[];
  
  /** Add object to group */
  addToGroup(group: GroupObject, obj: CanvasObject): void;
  
  /** Remove object from group */
  removeFromGroup(group: GroupObject, obj: CanvasObject): void;
  
  // ============ Path Operations ============
  
  /** Set path data for a path object */
  setPathData(obj: PathObject, path: string): void;
  
  /** Get path data as string */
  getPathData(obj: PathObject): string;
  
  /** Convert path to SVG string */
  toSVG(obj: CanvasObject): string;
  
  // ============ Text Operations ============
  
  /** Set text content */
  setText(obj: TextObject | TextboxObject, text: string): void;
  
  /** Get text content */
  getText(obj: TextObject | TextboxObject): string;
  
  /** Set font properties */
  setFont(obj: TextObject | TextboxObject, options: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string | number;
    fontStyle?: 'normal' | 'italic' | 'oblique';
  }): void;
  
  // ============ Image Operations ============
  
  /** Set image source */
  setImageSrc(obj: ImageObject, src: string): Promise<void>;
  
  /** Get image as data URL */
  getImageDataURL(obj: ImageObject): string;
  
  // ============ Export ============
  
  /** Export canvas to SVG string */
  exportToSVG(): string;
  
  /** Export canvas to JSON */
  toJSON(): any;
  
  /** Export canvas to data URL (PNG) */
  toDataURL(options?: { format?: 'png' | 'jpeg'; quality?: number }): string;
  
  /** Export object to JSON */
  toObjectJSON(obj: CanvasObject): any;
  
  // ============ Clipboard ============
  
  /** Copy selected objects to clipboard */
  copy(): void;
  
  /** Cut selected objects to clipboard */
  cut(): void;
  
  /** Paste from clipboard */
  paste(): void;
  
  /** Duplicate selected objects */
  duplicate(): void;
  
  // ============ Undo/Redo ============
  
  /** Undo last action */
  undo(): void;
  
  /** Redo last undone action */
  redo(): void;
  
  /** Clear undo history */
  clearUndoHistory(): void;
  
  /** Can undo */
  canUndo(): boolean;
  
  /** Can redo */
  canRedo(): boolean;
  
  // ============ Event Handling ============
  
  /** Subscribe to canvas events */
  on(event: CanvasEventType, handler: CanvasEventHandler): void;
  
  /** Unsubscribe from canvas events */
  off(event: CanvasEventType, handler: CanvasEventHandler): void;
  
  /** Subscribe to events once */
  once(event: CanvasEventType, handler: CanvasEventHandler): void;
  
  /** Emit an event */
  emit(event: CanvasEvent): void;
  
  // ============ Selection ============
  
  /** Enable/disable selection */
  setSelectionMode(enabled: boolean): void;
  
  /** Is selection enabled */
  isSelectionEnabled(): boolean;
  
  // ============ Drawing Mode ============
  
  /** Enable free drawing mode */
  enableDrawingMode(): void;
  
  /** Disable free drawing mode */
  disableDrawingMode(): void;
  
  /** Is drawing mode enabled */
  isDrawingModeEnabled(): boolean;
  
  /** Set drawing brush */
  setDrawingBrush(options: { width?: number; color?: string; opacity?: number }): void;
  
  // ============ Interaction ============
  
  /** Enable/disable object movement */
  setMovable(enabled: boolean): void;
  
  /** Enable/disable object scaling */
  setScalable(enabled: boolean): void;
  
  /** Enable/disable object rotation */
  setRotatable(enabled: boolean): void;
  
  /** Enable/disable object deletion */
  setDeletable(enabled: boolean): void;
  
  // ============ Zoom & Pan ============
  
  /** Get current zoom level */
  getZoom(): number;
  
  /** Set zoom level */
  setZoom(zoom: number): void;
  
  /** Zoom to fit all objects */
  zoomToFit(): void;
  
  /** Pan to point */
  panTo(point: Point): void;
  
  /** Get viewport transform */
  getViewportTransform(): { x: number; y: number; scale: number };
  
  // ============ Grid & Snapping ============
  
  /** Enable/disable grid */
  enableGrid(enabled: boolean, size?: number): void;
  
  /** Enable/disable snapping */
  enableSnapping(enabled: boolean, gridSize?: number): void;
  
  // ============ Utility ============
  
  /** Get object at point */
  getObjectAtPoint(point: Point): CanvasObject | undefined;
  
  /** Get objects in rectangle */
  getObjectsInRect(rect: Rect): CanvasObject[];
  
  /** Center object on canvas */
  centerObject(obj: CanvasObject): void;
  
  /** Center object horizontally */
  centerH(obj: CanvasObject): void;
  
  /** Center object vertically */
  centerV(obj: CanvasObject): void;
  
  /** Get canvas size */
  getSize(): Size;
  
  /** Get canvas dimensions */
  getDimensions(): { width: number; height: number };
  
  /** Set canvas background */
  setBackground(color: string | null): void;
  
  /** Get canvas background */
  getBackground(): string | null;
  
  /** Save canvas state */
  saveState(): string;
  
  /** Restore canvas state */
  restoreState(state: string): void;
}

/**
 * Factory function type for creating canvas engines
 */
export type CanvasEngineFactory = (container: HTMLElement, options?: CanvasOptions) => CanvasEngine;
