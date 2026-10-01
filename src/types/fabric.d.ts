// Type declarations for fabric.js v7
// Minimal but complete type definitions for the Fabric.js library

// ============================================================================
// Core Types
// ============================================================================

declare module 'fabric' {
  export = fabric;
}

declare namespace fabric {
  // ============ Basic Types ============
  
  export interface Point {
    x: number;
    y: number;
    set(x: number, y: number): Point;
    add(point: Point): Point;
    subtract(point: Point): Point;
    multiply(scalar: number): Point;
    divide(scalar: number): Point;
    distanceFrom(point: Point): number;
    midPointFrom(point: Point): Point;
    clone(): Point;
  }
  
  export interface Size {
    width: number;
    height: number;
  }
  
  export interface Rect {
    left: number;
    top: number;
    width: number;
    height: number;
  }
  
  // ============ Event Types ============
  
  export type EventName = 
    | 'added'
    | 'removed'
    | 'modified'
    | 'selected'
    | 'deselected'
    | 'moving'
    | 'scaling'
    | 'rotating'
    | 'mousedown'
    | 'mouseup'
    | 'mousemove'
    | 'mouseover'
    | 'mouseout'
    | 'keydown'
    | 'keyup'
    | 'before:render'
    | 'after:render';
  
  export interface Event {
    type: EventName;
    target?: Object;
    targets?: Object[];
    e?: MouseEvent | KeyboardEvent | Event;
    pointer?: Point;
    absolutePointer?: Point;
    transform?: any;
    key?: string;
    stopPropagation(): void;
    preventDefault(): void;
  }
  
  export type EventHandler = (event: Event) => void;
  
  // ============ Object Classes ============
  
  export interface ObjectOptions {
    id?: string;
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    angle?: number;
    scaleX?: number;
    scaleY?: number;
    opacity?: number;
    visible?: boolean;
    selectable?: boolean;
    evented?: boolean;
    hasControls?: boolean;
    hasBorders?: boolean;
    hasRotatingPoint?: boolean;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeDashArray?: number[];
    strokeLineCap?: 'butt' | 'round' | 'square';
    strokeLineJoin?: 'miter' | 'round' | 'bevel';
    zIndex?: number;
    originX?: 'left' | 'center' | 'right';
    originY?: 'top' | 'center' | 'bottom';
    padding?: number;
    [key: string]: any;
  }
  
  export interface ObjectEvents {
    added?: EventHandler;
    removed?: EventHandler;
    modified?: EventHandler;
    selected?: EventHandler;
    deselected?: EventHandler;
    moving?: EventHandler;
    scaling?: EventHandler;
    rotating?: EventHandler;
    mousedown?: EventHandler;
    mouseup?: EventHandler;
    mousemove?: EventHandler;
    mouseover?: EventHandler;
    mouseout?: EventHandler;
    keydown?: EventHandler;
    keyup?: EventHandler;
  }
  
  export class Object {
    id: string;
    type: string;
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
    fill: string | null;
    stroke: string | null;
    strokeWidth: number;
    strokeDashArray: number[] | null;
    originX: 'left' | 'center' | 'right';
    originY: 'top' | 'center' | 'bottom';
    zIndex: number;
    canvas: Canvas | null;
    
    constructor(options?: ObjectOptions);
    
    // Position & Size
    set(options: ObjectOptions): void;
    setPosition(point: Point): void;
    setLeft(left: number): void;
    setTop(top: number): void;
    setCoords(skipCanvasEvent?: boolean): void;
    
    // Transform
    setAngle(angle: number): void;
    rotate(angle: number): void;
    setScale(scale: number): void;
    scaleToPoint(point: Point, originPoint: Point): void;
    
    // Appearance
    setOpacity(opacity: number): void;
    setFill(color: string): void;
    setStroke(color: string): void;
    setStrokeWidth(width: number): void;
    
    // Visibility & Selection
    show(): void;
    hide(): void;
    bringToFront(): void;
    sendToBack(): void;
    bringForward(intersecting?: boolean): void;
    sendBackwards(intersecting?: boolean): void;
    moveTo(index: number): void;
    
    // Z-index
    setZIndex(zIndex: number): void;
    getZIndex(): number;
    
    // Events
    on(event: EventName, handler: EventHandler): void;
    off(event: EventName, handler?: EventHandler): void;
    once(event: EventName, handler: EventHandler): void;
    fire(event: EventName, options?: any): void;
    
    // Serialization
    toObject(propertiesToInclude?: string[]): any;
    toJSON(): string;
    
    // Cloning
    clone(callback?: (clone: Object) => void): Object;
    cloneAsImage(callback?: (clone: Image) => void): Image;
    
    // Removal
    remove(): void;
    
    // Group
    isInGroup(): boolean;
    getParentGroup(): Group | null;
    exitGroup(): void;
    
    // State
    saveState(): any;
    restoreState(state: any): void;
    
    // Utilities
    containsPoint(point: Point): boolean;
    intersectsWithObject(other: Object): boolean;
    intersectsWithRect(rect: Rect): boolean;
    isContainedWithinObject(other: Object): boolean;
    isContainedWithinRect(rect: Rect): boolean;
    getBoundingRect(): Rect;
    getCenterPoint(): Point;
    
    // Animation
    animate(property: string, to: any, options?: any): void;
    
    // Static
    static fromObject(object: any, callback?: (obj: Object) => void): Object;
  }
  
  // ============ Specific Object Types ============
  
  export interface RectOptions extends ObjectOptions {
    rx?: number;
    ry?: number;
  }
  
  export class Rect extends Object {
    rx: number;
    ry: number;
    
    constructor(options?: RectOptions);
    
    static fromObject(object: any, callback?: (obj: Rect) => void): Rect;
  }
  
  export interface CircleOptions extends ObjectOptions {
    radius: number;
  }
  
  export class Circle extends Object {
    radius: number;
    
    constructor(options?: CircleOptions);
    
    static fromObject(object: any, callback?: (obj: Circle) => void): Circle;
  }
  
  export interface EllipseOptions extends ObjectOptions {
    rx: number;
    ry: number;
  }
  
  export class Ellipse extends Object {
    rx: number;
    ry: number;
    
    constructor(options?: EllipseOptions);
    
    static fromObject(object: any, callback?: (obj: Ellipse) => void): Ellipse;
  }
  
  export interface LineOptions extends ObjectOptions {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  
  export class Line extends Object {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    
    constructor(options?: LineOptions);
    
    static fromObject(object: any, callback?: (obj: Line) => void): Line;
  }
  
  export interface PathOptions extends ObjectOptions {
    path: string | any[];
    fillRule?: 'nonzero' | 'evenodd';
    strokeLineCap?: 'butt' | 'round' | 'square';
    strokeLineJoin?: 'miter' | 'round' | 'bevel';
  }
  
  export class Path extends Object {
    path: any[] | string;
    fillRule: 'nonzero' | 'evenodd';
    strokeLineCap: 'butt' | 'round' | 'square';
    strokeLineJoin: 'miter' | 'round' | 'bevel';
    
    constructor(path: string | any[], options?: PathOptions);
    
    setPath(path: string | any[]): void;
    getPath(): any[];
    
    static fromObject(object: any, callback?: (obj: Path) => void): Path;
    static fromSVGPath(svgPath: string): Path;
  }
  
  export interface TextOptions extends ObjectOptions {
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
    textDecoration?: 'underline' | 'line-through' | 'overline' | 'none';
    textLineBackgroundColor?: string;
  }
  
  export class Text extends Object {
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string | number;
    fontStyle: 'normal' | 'italic' | 'oblique';
    textAlign: 'left' | 'center' | 'right' | 'justify';
    textBackgroundColor: string | null;
    lineHeight: number;
    charSpacing: number;
    styles: Record<string, any>;
    textDecoration: 'underline' | 'line-through' | 'overline' | 'none';
    textLines: string[];
    
    constructor(text: string, options?: TextOptions);
    
    setText(text: string): void;
    getText(): string;
    setFontSize(size: number): void;
    setFontFamily(family: string): void;
    setFontWeight(weight: string | number): void;
    setFontStyle(style: 'normal' | 'italic' | 'oblique'): void;
    setTextAlign(align: 'left' | 'center' | 'right' | 'justify'): void;
    setTextBackgroundColor(color: string): void;
    setLineHeight(height: number): void;
    setCharSpacing(spacing: number): void;
    
    static fromObject(object: any, callback?: (obj: Text) => void): Text;
  }
  
  export interface TextboxOptions extends TextOptions {
    width?: number;
    editable?: boolean;
  }
  
  export class Textbox extends Text {
    editable: boolean;
    
    constructor(text: string, options?: TextboxOptions);
    
    static fromObject(object: any, callback?: (obj: Textbox) => void): Textbox;
  }
  
  export class IText extends Textbox {
    constructor(text: string, options?: TextboxOptions);
    
    static fromObject(object: any, callback?: (obj: IText) => void): IText;
  }
  
  export interface GroupOptions extends ObjectOptions {
    objects?: Object[];
  }
  
  export class Group extends Object {
    objects: Object[];
    
    constructor(objects?: Object[], options?: GroupOptions);
    
    add(object: Object): void;
    remove(object: Object): void;
    addWithUpdate(object: Object): void;
    removeWithUpdate(object: Object): void;
    
    static fromObject(object: any, callback?: (obj: Group) => void): Group;
  }
  
  export interface ImageOptions extends ObjectOptions {
    src: string;
    crossOrigin?: string;
    filters?: any[];
  }
  
  export class Image extends Object {
    src: string;
    filters: any[];
    crossOrigin: string;
    
    constructor(src: string, options?: ImageOptions, callback?: (img: HTMLImageElement) => void);
    
    setSrc(src: string, callback?: (img: HTMLImageElement) => void): void;
    getSrc(): string;
    
    static fromObject(object: any, callback?: (obj: Image) => void): Image;
    static fromURL(url: string, callback?: (img: Image) => void, options?: ImageOptions): void;
  }
  
  // ============ Canvas ============
  
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
    selection?: boolean;
    selectionFullyContained?: boolean;
    preserveObjectStacking?: boolean;
    center?: Point;
    zoom?: number;
    pan?: Point;
    
    // Grid
    enableGrid?: boolean;
    gridSize?: number;
    gridColor?: string;
    gridLineColor?: string;
    
    // Snapping
    enableSnapping?: boolean;
    snapThreshold?: number;
    snapGridSize?: number;
  }
  
  export class Canvas {
    width: number;
    height: number;
    backgroundColor: string;
    selectionColor: string;
    selectionBorderColor: string;
    selectionLineWidth: number;
    
    // Objects
    _objects: Object[];
    _activeObject: Object | null;
    _activeSelection: Group | null;
    
    // State
    _currentTransform: any;
    _isDrawingMode: boolean;
    
    // Viewport
    viewportTransform: number[];
    zoom: number;
    
    constructor(element: HTMLCanvasElement | string, options?: CanvasOptions);
    
    // Initialization
    initialize(options?: CanvasOptions): void;
    
    // Lifecycle
    destroy(): void;
    dispose(): void;
    
    // Rendering
    renderAll(): void;
    requestRenderAll(): void;
    calcViewportBoundaries(): Rect;
    
    // Size
    resize(width: number, height: number): void;
    setDimensions(dimensions: { width: number; height: number }): void;
    getWidth(): number;
    getHeight(): number;
    
    // Objects
    add(...objects: Object[]): void;
    addObject(obj: Object): void;
    addObjects(objects: Object[]): void;
    insertAt(obj: Object, index: number, nonSplicing?: boolean): void;
    
    remove(...objects: Object[]): void;
    removeObject(obj: Object): void;
    removeObjects(objects: Object[]): void;
    
    getObjects(type?: string): Object[];
    getObjectById(id: string): Object | undefined;
    getObjectByName(name: string): Object | undefined;
    item(index: number): Object;
    
    contains(obj: Object): boolean;
    size(): number;
    isEmpty(): boolean;
    
    // Selection
    getActiveObject(): Object | null;
    getActiveObjects(): Object[];
    getActiveSelection(): Group | null;
    
    setActiveObject(obj: Object | null, fireEvent?: boolean): void;
    setActiveSelection(selection: Group | null, fireEvent?: boolean): void;
    
    discardActiveObject(): void;
    discardActiveSelection(): void;
    
    selectAll(): void;
    deselectAll(): void;
    
    // Z-index
    bringToFront(obj: Object): void;
    sendToBack(obj: Object): void;
    bringForward(obj: Object, intersecting?: boolean): void;
    sendBackwards(obj: Object, intersecting?: boolean): void;
    moveTo(obj: Object, index: number): void;
    
    // Events
    on(event: EventName, handler: EventHandler): void;
    on(event: string, handler: EventHandler): void;
    off(event: EventName, handler?: EventHandler): void;
    off(event: string, handler?: EventHandler): void;
    once(event: EventName, handler: EventHandler): void;
    once(event: string, handler: EventHandler): void;
    fire(event: EventName, options?: any): void;
    fire(event: string, options?: any): void;
    
    // Clipboard
    copy(): void;
    cut(): void;
    paste(): void;
    duplicate(): void;
    
    // Undo/Redo
    undo(): void;
    redo(): void;
    clearUndoStack(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    
    // Drawing Mode
    isDrawingMode: boolean;
    enableDrawingMode(): void;
    disableDrawingMode(): void;
    
    // Free Drawing Brush
    freeDrawingBrush: any;
    setFreeDrawingBrush(options: any): void;
    
    // Interaction
    selection: boolean;
    selectionFullyContained: boolean;
    enableSelection(enabled: boolean): void;
    
    // Object Movement
    movable: boolean;
    enableMovable(enabled: boolean): void;
    
    // Object Scaling
    scalable: boolean;
    enableScalable(enabled: boolean): void;
    
    // Object Rotation
    rotatable: boolean;
    enableRotatable(enabled: boolean): void;
    
    // Object Deletion
    deletable: boolean;
    enableDeletable(enabled: boolean): void;
    
    // Grid
    enableGrid: boolean;
    gridSize: number;
    
    // Snapping
    enableSnapping: boolean;
    snapGridSize: number;
    
    // Export
    toSVG(options?: any): string;
    toJSON(propertiesToInclude?: string[]): any;
    toDatalessJSON(propertiesToInclude?: string[]): any;
    toDatalessObject(propertiesToInclude?: string[]): any;
    
    // Data URL
    toDataURL(options?: { format?: 'png' | 'jpeg'; quality?: number; multiplier?: number }): string;
    
    // Viewport
    setViewportTransform(transform: number[]): void;
    getViewportTransform(): number[];
    
    zoomToPoint(point: Point, zoom: number): void;
    relativePan(pan: Point): void;
    absolutePan(point: Point): void;
    
    setZoom(zoom: number): void;
    getZoom(): number;
    
    // Center
    centerObject(obj: Object): void;
    centerH(obj: Object): void;
    centerV(obj: Object): void;
    
    // Background
    setBackgroundColor(color: string): void;
    getBackgroundColor(): string;
    
    // Clear
    clear(): void;
    
    // Get object at point
    getObjectAtPoint(point: Point): Object | null;
    
    // Get objects in rect
    getObjectsInRect(rect: Rect): Object[];
    
    // Clipboard state
    clipboard: any;
    
    // Static
    static getById(id: string): Canvas | undefined;
    
    // Load from JSON
    loadFromJSON(json: any, callback?: () => void): void;
  }
  
  // ============ Static Utilities ============
  
  export function loadSVGFromString(svg: string, callback: (objects: Object[], options: any) => void, reviver?: (element: SVGElement, object: Object) => void): void;
  export function loadSVGFromURL(url: string, callback: (objects: Object[], options: any) => void, reviver?: (element: SVGElement, object: Object) => void): void;
  
  // ============ Version ============
  
  export const version: string;
  
  // ============ Defaults ============
  
  export const defaults: {
    Object: ObjectOptions;
    Canvas: CanvasOptions;
    Rect: RectOptions;
    Circle: CircleOptions;
    Ellipse: EllipseOptions;
    Line: LineOptions;
    Path: PathOptions;
    Text: TextOptions;
    Textbox: TextboxOptions;
    Group: GroupOptions;
    Image: ImageOptions;
  };
}
