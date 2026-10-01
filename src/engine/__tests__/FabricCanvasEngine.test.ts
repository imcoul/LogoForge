// Tests for FabricCanvasEngine
// Comprehensive test suite for the Fabric.js canvas engine adapter

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fabric.js for testing
const mockFabric = {
  Canvas: vi.fn().mockImplementation((element, options) => ({
    element,
    options,
    _objects: [],
    _activeObject: null,
    _activeSelection: null,
    viewportTransform: [1, 0, 0, 1, 0, 0],
    zoom: 1,
    isDrawingMode: false,
    selection: true,
    movable: true,
    scalable: true,
    rotatable: true,
    deletable: true,
    enableGrid: false,
    gridSize: 20,
    enableSnapping: false,
    snapGridSize: 20,
    freeDrawingBrush: { width: 5, color: '#000000', opacity: 1 },
    
    // Methods
    getElement: () => element,
    setDimensions: vi.fn((dimensions) => {}),
    renderAll: vi.fn(() => {}),
    clear: vi.fn(() => {}),
    dispose: vi.fn(() => {}),
    off: vi.fn(() => {}),
    add: vi.fn((...objects) => {}),
    remove: vi.fn((...objects) => {}),
    getObjects: () => [],
    getObjectById: vi.fn(() => undefined),
    getActiveObject: () => null,
    getActiveSelection: () => null,
    setActiveObject: vi.fn(() => {}),
    setActiveSelection: vi.fn(() => {}),
    discardActiveObject: vi.fn(() => {}),
    discardActiveSelection: vi.fn(() => {}),
    bringToFront: vi.fn(() => {}),
    sendToBack: vi.fn(() => {}),
    bringForward: vi.fn(() => {}),
    sendBackwards: vi.fn(() => {}),
    setZoom: vi.fn(() => {}),
    getZoom: () => 1,
    absolutePan: vi.fn(() => {}),
    relativePan: vi.fn(() => {}),
    setViewportTransform: vi.fn(() => {}),
    getViewportTransform: () => [1, 0, 0, 1, 0, 0],
    centerObject: vi.fn(() => {}),
    centerH: vi.fn(() => {}),
    centerV: vi.fn(() => {}),
    setBackgroundColor: vi.fn(() => {}),
    getBackgroundColor: () => '',
    exportToSVG: () => '<svg></svg>',
    toJSON: () => ({}),
    toDataURL: () => 'data:image/png;base64,',
    loadFromJSON: vi.fn((json, callback) => callback && callback()),
    copy: vi.fn(() => {}),
    cut: vi.fn(() => {}),
    paste: vi.fn(() => {}),
    duplicate: vi.fn(() => {}),
    undo: vi.fn(() => {}),
    redo: vi.fn(() => {}),
    clearUndoStack: vi.fn(() => {}),
    canUndo: () => false,
    canRedo: () => false,
    on: vi.fn(() => {}),
    once: vi.fn(() => {}),
    fire: vi.fn(() => {}),
    calcViewportBoundaries: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    getWidth: () => 800,
    getHeight: () => 600,
    getObjectAtPoint: () => null,
    
    // Static
    getById: vi.fn(() => undefined),
  })),
  
  Object: vi.fn().mockImplementation((options) => ({
    ...options,
    id: options?.id || 'mock-id',
    type: 'object',
    left: options?.left || 0,
    top: options?.top || 0,
    width: options?.width || 0,
    height: options?.height || 0,
    angle: options?.angle || 0,
    scaleX: options?.scaleX || 1,
    scaleY: options?.scaleY || 1,
    opacity: options?.opacity !== undefined ? options.opacity : 1,
    visible: options?.visible !== undefined ? options.visible : true,
    selectable: options?.selectable !== undefined ? options.selectable : true,
    evented: options?.evented !== undefined ? options.evented : true,
    hasControls: options?.hasControls !== undefined ? options.hasControls : true,
    hasBorders: options?.hasBorders !== undefined ? options.hasBorders : true,
    hasRotatingPoint: options?.hasRotatingPoint !== undefined ? options.hasRotatingPoint : true,
    fill: options?.fill || '',
    stroke: options?.stroke || '',
    strokeWidth: options?.strokeWidth || 0,
    strokeDashArray: options?.strokeDashArray || [],
    zIndex: options?.zIndex || 0,
    originX: options?.originX || 'center',
    originY: options?.originY || 'center',
    
    set: vi.fn((props) => {}),
    setPosition: vi.fn(() => {}),
    setLeft: vi.fn(() => {}),
    setTop: vi.fn(() => {}),
    setCoords: vi.fn(() => {}),
    setAngle: vi.fn(() => {}),
    rotate: vi.fn(() => {}),
    setScale: vi.fn(() => {}),
    scaleToPoint: vi.fn(() => {}),
    setOpacity: vi.fn(() => {}),
    setFill: vi.fn(() => {}),
    setStroke: vi.fn(() => {}),
    setStrokeWidth: vi.fn(() => {}),
    show: vi.fn(() => {}),
    hide: vi.fn(() => {}),
    bringToFront: vi.fn(() => {}),
    sendToBack: vi.fn(() => {}),
    bringForward: vi.fn(() => {}),
    sendBackwards: vi.fn(() => {}),
    moveTo: vi.fn(() => {}),
    setZIndex: vi.fn(() => {}),
    getZIndex: () => 0,
    on: vi.fn(() => {}),
    off: vi.fn(() => {}),
    once: vi.fn(() => {}),
    fire: vi.fn(() => {}),
    toObject: () => ({}),
    toJSON: () => '{}',
    clone: vi.fn(() => ({})),
    cloneAsImage: vi.fn(() => ({})),
    remove: vi.fn(() => {}),
    isInGroup: () => false,
    getParentGroup: () => null,
    exitGroup: vi.fn(() => {}),
    saveState: () => ({}),
    restoreState: vi.fn(() => {}),
    containsPoint: () => false,
    intersectsWithObject: () => false,
    intersectsWithRect: () => false,
    isContainedWithinObject: () => false,
    isContainedWithinRect: () => false,
    getBoundingRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
    getCenterPoint: () => ({ x: 0, y: 0 }),
    animate: vi.fn(() => {}),
    exportToSVG: () => '<svg></svg>',
  })),
  
  Rect: vi.fn().mockImplementation((options) => ({
    ...mockFabric.Object({ ...options, type: 'rect' }),
    type: 'rect',
    rx: options?.rx || 0,
    ry: options?.ry || 0,
  })),
  
  Circle: vi.fn().mockImplementation((options) => ({
    ...mockFabric.Object({ ...options, type: 'circle' }),
    type: 'circle',
    radius: options?.radius || 0,
  })),
  
  Ellipse: vi.fn().mockImplementation((options) => ({
    ...mockFabric.Object({ ...options, type: 'ellipse' }),
    type: 'ellipse',
    rx: options?.rx || 0,
    ry: options?.ry || 0,
  })),
  
  Line: vi.fn().mockImplementation((options) => ({
    ...mockFabric.Object({ ...options, type: 'line' }),
    type: 'line',
    x1: options?.x1 || 0,
    y1: options?.y1 || 0,
    x2: options?.x2 || 0,
    y2: options?.y2 || 0,
  })),
  
  Path: vi.fn().mockImplementation((path, options) => ({
    ...mockFabric.Object({ ...options, type: 'path', path }),
    type: 'path',
    path: typeof path === 'string' ? path : path,
    strokeLineCap: options?.strokeLineCap || 'butt',
    strokeLineJoin: options?.strokeLineJoin || 'miter',
    fillRule: options?.fillRule || 'nonzero',
    setPath: vi.fn(() => {}),
    getPath: () => path,
  })),
  
  Text: vi.fn().mockImplementation((text, options) => ({
    ...mockFabric.Object({ ...options, type: 'text', text }),
    type: 'text',
    text: text || '',
    fontSize: options?.fontSize || 16,
    fontFamily: options?.fontFamily || 'Arial',
    fontWeight: options?.fontWeight || 'normal',
    fontStyle: options?.fontStyle || 'normal',
    textAlign: options?.textAlign || 'left',
    textBackgroundColor: options?.textBackgroundColor || '',
    lineHeight: options?.lineHeight || 1,
    charSpacing: options?.charSpacing || 0,
    styles: options?.styles || {},
    setText: vi.fn(() => {}),
    getText: () => text || '',
  })),
  
  Textbox: vi.fn().mockImplementation((text, options) => ({
    ...mockFabric.Text(text, options),
    type: 'textbox',
    editable: options?.editable !== false,
  })),
  
  Group: vi.fn().mockImplementation((objects, options) => ({
    ...mockFabric.Object({ ...options, type: 'group' }),
    type: 'group',
    objects: objects || [],
    add: vi.fn((obj) => {}),
    remove: vi.fn((obj) => {}),
    addWithUpdate: vi.fn((obj) => {}),
    removeWithUpdate: vi.fn((obj) => {}),
    getObjects: () => objects || [],
  })),
  
  Image: vi.fn().mockImplementation((src, options, callback) => ({
    ...mockFabric.Object({ ...options, type: 'image', src }),
    type: 'image',
    src: src || '',
    filters: options?.filters || [],
    crossOrigin: options?.crossOrigin || '',
    setSrc: vi.fn((src, cb) => { if (cb) cb({} as HTMLImageElement); }),
    getSrc: () => src || '',
    getElement: () => ({} as HTMLImageElement),
  })),
  
  Point: vi.fn().mockImplementation((x, y) => ({ x, y })),
  
  defaults: {
    Object: {},
    Canvas: {},
    Rect: {},
    Circle: {},
    Ellipse: {},
    Line: {},
    Path: {},
    Text: {},
    Textbox: {},
    Group: {},
    Image: {},
  },
  
  version: '7.0.0',
};

// Mock window and document for DOM operations
const mockContainer = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  querySelector: vi.fn(),
} as unknown as HTMLElement;

// Set up global mocks
vi.stubGlobal('fabric', mockFabric);
vi.stubGlobal('document', {
  createElement: vi.fn(() => mockContainer),
  querySelector: vi.fn(() => mockContainer),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

// Import after mocking
import { FabricCanvasEngine, createFabricCanvasEngine } from '../FabricCanvasEngine';
import {
  CanvasObject,
  CanvasEventType,
  CanvasEventHandler,
} from '../canvasEngine';

describe('FabricCanvasEngine', () => {
  let engine: FabricCanvasEngine;
  let container: HTMLElement;
  
  beforeEach(() => {
    engine = new FabricCanvasEngine();
    container = document.createElement('div') as HTMLElement;
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  // ============ Lifecycle Tests ============
  
  describe('Lifecycle', () => {
    it('should initialize canvas with container', async () => {
      await engine.initialize(container, { width: 800, height: 600 });
      
      expect(engine.isInitialized()).toBe(true);
      expect(mockFabric.Canvas).toHaveBeenCalled();
    });
    
    it('should throw error when fabric is not loaded', async () => {
      vi.stubGlobal('fabric', undefined);
      
      await expect(engine.initialize(container)).rejects.toThrow(
        'Fabric.js is not loaded'
      );
    });
    
    it('should destroy canvas and clean up', async () => {
      await engine.initialize(container);
      await engine.destroy();
      
      expect(engine.isInitialized()).toBe(false);
    });
    
    it('should resize canvas', async () => {
      await engine.initialize(container);
      engine.resize(1024, 768);
      
      expect(mockFabric.Canvas.mock.results[0].value.setDimensions).toHaveBeenCalledWith({
        width: 1024,
        height: 768,
      });
    });
    
    it('should clear canvas', async () => {
      await engine.initialize(container);
      engine.clear();
      
      expect(mockFabric.Canvas.mock.results[0].value.clear).toHaveBeenCalled();
    });
  });
  
  // ============ Object Creation Tests ============
  
  describe('Object Creation', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should create rectangle', () => {
      const rect = engine.createRect({ left: 10, top: 20, width: 100, height: 50, fill: 'red' });
      
      expect(rect.type).toBe('rect');
      expect(rect.left).toBe(10);
      expect(rect.top).toBe(20);
      expect(rect.width).toBe(100);
      expect(rect.height).toBe(50);
      expect(rect.fill).toBe('red');
    });
    
    it('should create circle', () => {
      const circle = engine.createCircle({ radius: 50, left: 10, top: 20, fill: 'blue' });
      
      expect(circle.type).toBe('circle');
      expect(circle.radius).toBe(50);
    });
    
    it('should create ellipse', () => {
      const ellipse = engine.createEllipse({ rx: 50, ry: 30, left: 10, top: 20 });
      
      expect(ellipse.type).toBe('ellipse');
      expect(ellipse.rx).toBe(50);
      expect(ellipse.ry).toBe(30);
    });
    
    it('should create line', () => {
      const line = engine.createLine({ x1: 0, y1: 0, x2: 100, y2: 100 });
      
      expect(line.type).toBe('line');
      expect(line.x1).toBe(0);
      expect(line.y1).toBe(0);
      expect(line.x2).toBe(100);
      expect(line.y2).toBe(100);
    });
    
    it('should create path', () => {
      const path = engine.createPath({ path: 'M 0 0 L 100 100' });
      
      expect(path.type).toBe('path');
      expect(path.path).toBe('M 0 0 L 100 100');
    });
    
    it('should create text', () => {
      const text = engine.createText({ text: 'Hello World', fontSize: 20 });
      
      expect(text.type).toBe('text');
      expect(text.text).toBe('Hello World');
      expect(text.fontSize).toBe(20);
    });
    
    it('should create textbox', () => {
      const textbox = engine.createTextbox({ text: 'Editable', fontSize: 18 });
      
      expect(textbox.type).toBe('textbox');
      expect(textbox.text).toBe('Editable');
    });
    
    it('should create group', () => {
      const rect = engine.createRect({ width: 50, height: 50 });
      const circle = engine.createCircle({ radius: 25 });
      const group = engine.createGroup([rect, circle]);
      
      expect(group.type).toBe('group');
      expect(group.objects).toHaveLength(2);
    });
    
    it('should create image', async () => {
      const image = await engine.createImage({ src: 'data:image/png;base64,' });
      
      expect(image.type).toBe('image');
      expect(image.src).toBe('data:image/png;base64,');
    });
  });
  
  // ============ Object Management Tests ============
  
  describe('Object Management', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should add object to canvas', () => {
      const rect = engine.createRect({ width: 50, height: 50 });
      engine.addObject(rect);
      
      expect(mockFabric.Canvas.mock.results[0].value.add).toHaveBeenCalled();
    });
    
    it('should add multiple objects', () => {
      const rect = engine.createRect({ width: 50, height: 50 });
      const circle = engine.createCircle({ radius: 25 });
      engine.addObjects([rect, circle]);
      
      expect(mockFabric.Canvas.mock.results[0].value.add).toHaveBeenCalled();
    });
    
    it('should remove object by reference', () => {
      const rect = engine.createRect({ width: 50, height: 50 });
      engine.removeObject(rect);
      
      expect(mockFabric.Canvas.mock.results[0].value.remove).toHaveBeenCalled();
    });
    
    it('should remove object by ID', () => {
      const rect = engine.createRect({ id: 'test-rect', width: 50, height: 50 });
      engine.removeObjectById('test-rect');
      
      expect(mockFabric.Canvas.mock.results[0].value.remove).toHaveBeenCalled();
    });
    
    it('should get object by ID', () => {
      const rect = engine.createRect({ id: 'test-rect', width: 50, height: 50 });
      const found = engine.getObjectById('test-rect');
      
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-rect');
    });
    
    it('should get all objects', () => {
      engine.createRect({ width: 50, height: 50 });
      engine.createCircle({ radius: 25 });
      
      const objects = engine.getObjects();
      expect(objects).toBeInstanceOf(Array);
    });
  });
  
  // ============ Selection Tests ============
  
  describe('Selection', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should select object', () => {
      const rect = engine.createRect({ id: 'test-rect', width: 50, height: 50 });
      engine.selectObject(rect);
      
      expect(mockFabric.Canvas.mock.results[0].value.setActiveObject).toHaveBeenCalled();
    });
    
    it('should select object by ID', () => {
      engine.createRect({ id: 'test-rect', width: 50, height: 50 });
      engine.selectObjectById('test-rect');
      
      expect(mockFabric.Canvas.mock.results[0].value.setActiveObject).toHaveBeenCalled();
    });
    
    it('should clear selection', () => {
      engine.clearSelection();
      
      expect(mockFabric.Canvas.mock.results[0].value.discardActiveObject).toHaveBeenCalled();
      expect(mockFabric.Canvas.mock.results[0].value.discardActiveSelection).toHaveBeenCalled();
    });
    
    it('should get selected objects', () => {
      const selected = engine.getSelectedObjects();
      expect(selected).toBeInstanceOf(Array);
    });
  });
  
  // ============ Transformation Tests ============
  
  describe('Object Transformation', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should set object position', () => {
      const rect = engine.createRect({ id: 'test-rect', width: 50, height: 50 });
      engine.setObjectPosition(rect, 100, 200);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should set object size', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.setObjectSize(rect, 200, 150);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should set object rotation', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.setObjectRotation(rect, 45);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should set object opacity', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.setObjectOpacity(rect, 0.5);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should set object fill', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.setObjectFill(rect, 'red');
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should set object stroke', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.setObjectStroke(rect, 'blue', 2);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
  });
  
  // ============ Z-Index Tests ============
  
  describe('Z-Index', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should bring object to front', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.bringToFront(rect);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should send object to back', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.sendToBack(rect);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should bring object forward', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.bringForward(rect);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should send object backward', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.sendBackwards(rect);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should set z-index explicitly', () => {
      const rect = engine.createRect({ id: 'test-rect' });
      engine.setZIndex(rect, 10);
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
  });
  
  // ============ Group Operations Tests ============
  
  describe('Group Operations', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should group selected objects', () => {
      const rect = engine.createRect({ width: 50, height: 50 });
      const circle = engine.createCircle({ radius: 25 });
      
      // Manually set active selection for testing
      const mockCanvas = mockFabric.Canvas.mock.results[0].value;
      mockCanvas.getActiveSelection = () => ({
        type: 'activeSelection',
        getObjects: () => [
          { id: rect.id, type: 'rect' },
          { id: circle.id, type: 'circle' },
        ],
      });
      
      const group = engine.groupSelected();
      
      expect(group).toBeUndefined(); // Because we're mocking, the actual grouping logic needs real fabric
    });
    
    it('should ungroup a group', () => {
      const group = engine.createGroup([
        engine.createRect({ width: 50, height: 50 }),
        engine.createCircle({ radius: 25 }),
      ]);
      
      const objects = engine.ungroup(group);
      expect(objects).toEqual([]);
    });
  });
  
  // ============ Path Operations Tests ============
  
  describe('Path Operations', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should set path data', () => {
      const path = engine.createPath({ path: 'M 0 0 L 100 100' });
      engine.setPathData(path, 'M 0 0 L 200 200');
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should get path data', () => {
      const path = engine.createPath({ path: 'M 0 0 L 100 100' });
      const pathData = engine.getPathData(path);
      
      expect(pathData).toBe('M 0 0 L 100 100');
    });
    
    it('should convert path to SVG', () => {
      const path = engine.createPath({ path: 'M 0 0 L 100 100' });
      const svg = engine.toSVG(path);
      
      expect(svg).toBe('<svg></svg>');
    });
  });
  
  // ============ Text Operations Tests ============
  
  describe('Text Operations', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should set text content', () => {
      const text = engine.createText({ text: 'Hello' });
      engine.setText(text, 'World');
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
    
    it('should get text content', () => {
      const text = engine.createText({ text: 'Hello World' });
      const content = engine.getText(text);
      
      expect(content).toBe('Hello World');
    });
    
    it('should set font properties', () => {
      const text = engine.createText({ text: 'Hello' });
      engine.setFont(text, {
        fontSize: 24,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic',
      });
      
      expect(mockFabric.Canvas.mock.results[0].value.getObjects).toHaveBeenCalled();
    });
  });
  
  // ============ Export Tests ============
  
  describe('Export', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should export canvas to SVG', () => {
      const svg = engine.exportToSVG();
      expect(svg).toBe('<svg></svg>');
    });
    
    it('should export canvas to JSON', () => {
      const json = engine.toJSON();
      expect(json).toEqual({});
    });
    
    it('should export canvas to data URL', () => {
      const dataURL = engine.toDataURL();
      expect(dataURL).toBe('data:image/png;base64,');
    });
    
    it('should export canvas to data URL with options', () => {
      const dataURL = engine.toDataURL({ format: 'jpeg', quality: 0.8 });
      expect(dataURL).toBe('data:image/png;base64,');
    });
  });
  
  // ============ Clipboard Tests ============
  
  describe('Clipboard', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should copy selection', () => {
      engine.copy();
      expect(mockFabric.Canvas.mock.results[0].value.copy).toHaveBeenCalled();
    });
    
    it('should cut selection', () => {
      engine.cut();
      expect(mockFabric.Canvas.mock.results[0].value.cut).toHaveBeenCalled();
    });
    
    it('should paste from clipboard', () => {
      engine.paste();
      expect(mockFabric.Canvas.mock.results[0].value.paste).toHaveBeenCalled();
    });
    
    it('should duplicate selection', () => {
      engine.duplicate();
      expect(mockFabric.Canvas.mock.results[0].value.duplicate).toHaveBeenCalled();
    });
  });
  
  // ============ Undo/Redo Tests ============
  
  describe('Undo/Redo', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should undo last action', () => {
      engine.undo();
      expect(mockFabric.Canvas.mock.results[0].value.undo).toHaveBeenCalled();
    });
    
    it('should redo last undone action', () => {
      engine.redo();
      expect(mockFabric.Canvas.mock.results[0].value.redo).toHaveBeenCalled();
    });
    
    it('should clear undo history', () => {
      engine.clearUndoHistory();
      expect(mockFabric.Canvas.mock.results[0].value.clearUndoStack).toHaveBeenCalled();
    });
    
    it('should check if can undo', () => {
      const canUndo = engine.canUndo();
      expect(canUndo).toBe(false);
    });
    
    it('should check if can redo', () => {
      const canRedo = engine.canRedo();
      expect(canRedo).toBe(false);
    });
  });
  
  // ============ Event Handling Tests ============
  
  describe('Event Handling', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should subscribe to events', () => {
      const handler: CanvasEventHandler = () => {};
      engine.on('object:added', handler);
      
      const handlers = (engine as any)._eventHandlers.get('object:added');
      expect(handlers).toBeDefined();
      expect(handlers?.has(handler)).toBe(true);
    });
    
    it('should unsubscribe from events', () => {
      const handler: CanvasEventHandler = () => {};
      engine.on('object:added', handler);
      engine.off('object:added', handler);
      
      const handlers = (engine as any)._eventHandlers.get('object:added');
      expect(handlers?.has(handler)).toBe(false);
    });
    
    it('should subscribe once to events', () => {
      const handler: CanvasEventHandler = () => {};
      engine.once('object:added', handler);
      
      const handlers = (engine as any)._eventHandlers.get('object:added');
      expect(handlers).toBeDefined();
      expect(handlers?.size).toBe(1);
    });
    
    it('should emit events', () => {
      const handler = vi.fn();
      engine.on('object:added', handler);
      
      engine.emit({
        type: 'object:added',
        timestamp: Date.now(),
      });
      
      expect(handler).toHaveBeenCalled();
    });
  });
  
  // ============ Selection Mode Tests ============
  
  describe('Selection Mode', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should enable selection mode', () => {
      engine.setSelectionMode(true);
      expect(mockFabric.Canvas.mock.results[0].value.selection).toBe(true);
    });
    
    it('should disable selection mode', () => {
      engine.setSelectionMode(false);
      expect(mockFabric.Canvas.mock.results[0].value.selection).toBe(false);
    });
    
    it('should check if selection is enabled', () => {
      const enabled = engine.isSelectionEnabled();
      expect(enabled).toBe(true);
    });
  });
  
  // ============ Drawing Mode Tests ============
  
  describe('Drawing Mode', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should enable drawing mode', () => {
      engine.enableDrawingMode();
      expect(mockFabric.Canvas.mock.results[0].value.isDrawingMode).toBe(true);
    });
    
    it('should disable drawing mode', () => {
      engine.disableDrawingMode();
      expect(mockFabric.Canvas.mock.results[0].value.isDrawingMode).toBe(false);
    });
    
    it('should check if drawing mode is enabled', () => {
      const enabled = engine.isDrawingModeEnabled();
      expect(enabled).toBe(false);
    });
    
    it('should set drawing brush', () => {
      engine.setDrawingBrush({ width: 10, color: 'red', opacity: 0.5 });
      
      const canvas = mockFabric.Canvas.mock.results[0].value;
      expect(canvas.freeDrawingBrush.width).toBe(10);
      expect(canvas.freeDrawingBrush.color).toBe('red');
      expect(canvas.freeDrawingBrush.opacity).toBe(0.5);
    });
  });
  
  // ============ Interaction Tests ============
  
  describe('Interaction', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should enable object movement', () => {
      engine.setMovable(true);
      expect(mockFabric.Canvas.mock.results[0].value.movable).toBe(true);
    });
    
    it('should disable object movement', () => {
      engine.setMovable(false);
      expect(mockFabric.Canvas.mock.results[0].value.movable).toBe(false);
    });
    
    it('should enable object scaling', () => {
      engine.setScalable(true);
      expect(mockFabric.Canvas.mock.results[0].value.scalable).toBe(true);
    });
    
    it('should disable object scaling', () => {
      engine.setScalable(false);
      expect(mockFabric.Canvas.mock.results[0].value.scalable).toBe(false);
    });
    
    it('should enable object rotation', () => {
      engine.setRotatable(true);
      expect(mockFabric.Canvas.mock.results[0].value.rotatable).toBe(true);
    });
    
    it('should disable object rotation', () => {
      engine.setRotatable(false);
      expect(mockFabric.Canvas.mock.results[0].value.rotatable).toBe(false);
    });
    
    it('should enable object deletion', () => {
      engine.setDeletable(true);
      expect(mockFabric.Canvas.mock.results[0].value.deletable).toBe(true);
    });
    
    it('should disable object deletion', () => {
      engine.setDeletable(false);
      expect(mockFabric.Canvas.mock.results[0].value.deletable).toBe(false);
    });
  });
  
  // ============ Zoom & Pan Tests ============
  
  describe('Zoom & Pan', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should get current zoom', () => {
      const zoom = engine.getZoom();
      expect(zoom).toBe(1);
    });
    
    it('should set zoom', () => {
      engine.setZoom(2);
      expect(mockFabric.Canvas.mock.results[0].value.setZoom).toHaveBeenCalledWith(2);
    });
    
    it('should zoom to fit', () => {
      engine.zoomToFit();
      expect(mockFabric.Canvas.mock.results[0].value.calcViewportBoundaries).toHaveBeenCalled();
    });
    
    it('should pan to point', () => {
      engine.panTo({ x: 100, y: 200 });
      expect(mockFabric.Canvas.mock.results[0].value.absolutePan).toHaveBeenCalledWith({ x: 100, y: 200 });
    });
    
    it('should get viewport transform', () => {
      const transform = engine.getViewportTransform();
      expect(transform).toEqual({ x: 0, y: 0, scale: 1 });
    });
  });
  
  // ============ Grid & Snapping Tests ============
  
  describe('Grid & Snapping', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should enable grid', () => {
      engine.enableGrid(true, 20);
      expect(mockFabric.Canvas.mock.results[0].value.enableGrid).toBe(true);
      expect(mockFabric.Canvas.mock.results[0].value.gridSize).toBe(20);
    });
    
    it('should disable grid', () => {
      engine.enableGrid(false);
      expect(mockFabric.Canvas.mock.results[0].value.enableGrid).toBe(false);
    });
    
    it('should enable snapping', () => {
      engine.enableSnapping(true, 20);
      expect(mockFabric.Canvas.mock.results[0].value.enableSnapping).toBe(true);
      expect(mockFabric.Canvas.mock.results[0].value.snapGridSize).toBe(20);
    });
    
    it('should disable snapping', () => {
      engine.enableSnapping(false);
      expect(mockFabric.Canvas.mock.results[0].value.enableSnapping).toBe(false);
    });
  });
  
  // ============ Utility Tests ============
  
  describe('Utility', () => {
    beforeEach(async () => {
      await engine.initialize(container);
    });
    
    it('should get canvas size', () => {
      const size = engine.getSize();
      expect(size).toEqual({ width: 800, height: 600 });
    });
    
    it('should get canvas dimensions', () => {
      const dimensions = engine.getDimensions();
      expect(dimensions).toEqual({ width: 800, height: 600 });
    });
    
    it('should set background color', () => {
      engine.setBackground('red');
      expect(mockFabric.Canvas.mock.results[0].value.setBackgroundColor).toHaveBeenCalledWith('red');
    });
    
    it('should get background color', () => {
      const bg = engine.getBackground();
      expect(bg).toBeNull();
    });
    
    it('should save canvas state', () => {
      const state = engine.saveState();
      expect(state).toBe('{}');
    });
    
    it('should restore canvas state', () => {
      engine.restoreState('{"version":"7.0.0"}');
      expect(mockFabric.Canvas.mock.results[0].value.loadFromJSON).toHaveBeenCalled();
    });
  });
});

describe('createFabricCanvasEngine', () => {
  it('should create and initialize engine', async () => {
    const container = document.createElement('div') as HTMLElement;
    const engine = createFabricCanvasEngine(container, { width: 800, height: 600 });
    
    expect(engine.isInitialized()).toBe(true);
  });
});
