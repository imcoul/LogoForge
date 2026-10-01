// Fabric Migration Handler
// Handles migration from legacy canvas implementations to Fabric.js

import {
  CanvasEngine,
  CanvasObject,
  Point,
  Rect,
} from '../canvasEngine';
import { FabricCanvasEngine } from '../FabricCanvasEngine';

/**
 * Migration mode for the canvas
 */
export type MigrationMode = 
  | 'legacy-only'      // Only use legacy canvas
  | 'fabric-only'      // Only use Fabric.js canvas
  | 'dual-write'       // Write to both canvases (for migration)
  | 'fabric-primary';  // Use Fabric.js as primary, legacy as fallback

/**
 * Migration status for tracking progress
 */
export interface MigrationStatus {
  mode: MigrationMode;
  legacyObjects: number;
  fabricObjects: number;
  migratedCount: number;
  errors: string[];
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Options for the migration handler
 */
export interface FabricMigrationOptions {
  /** Migration mode to use */
  mode?: MigrationMode;
  
  /** Whether to validate objects during migration */
  validate?: boolean;
  
  /** Whether to automatically sync changes */
  autoSync?: boolean;
  
  /** Callback for migration progress */
  onProgress?: (progress: { current: number; total: number; objectId: string }) => void;
  
  /** Callback for migration errors */
  onError?: (error: { objectId: string; error: string; original: any }) => void;
  
  /** Callback for migration completion */
  onComplete?: (status: MigrationStatus) => void;
}

/**
 * Legacy canvas object structure (from WhiteboardCanvas)
 * This represents the old format that we need to migrate from
 */
export interface LegacyCanvasObject {
  id: string;
  type: 'rect' | 'circle' | 'ellipse' | 'line' | 'path' | 'text' | 'image' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
  
  // Type-specific properties
  rx?: number;
  ry?: number;
  radius?: number;
  points?: { x: number; y: number }[];
  path?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  src?: string;
  children?: LegacyCanvasObject[];
}

/**
 * Legacy canvas state
 */
export interface LegacyCanvasState {
  objects: LegacyCanvasObject[];
  width: number;
  height: number;
  background?: string;
  zoom?: number;
  panX?: number;
  panY?: number;
}

/**
 * Fabric Migration Handler
 * Manages the migration from legacy canvas to Fabric.js
 */
export class FabricMigration {
  private _legacyEngine: CanvasEngine | null = null;
  private _fabricEngine: FabricCanvasEngine | null = null;
  private _mode: MigrationMode = 'dual-write';
  private _status: MigrationStatus;
  private _options: FabricMigrationOptions;
  
  constructor(options: FabricMigrationOptions = {}) {
    this._options = {
      mode: 'dual-write',
      validate: true,
      autoSync: true,
      ...options,
    };
    
    this._status = {
      mode: this._options.mode!,
      legacyObjects: 0,
      fabricObjects: 0,
      migratedCount: 0,
      errors: [],
      startedAt: new Date(),
    };
  }
  
  // ============ Setup ============
  
  /**
   * Initialize the migration handler with both engines
   */
  setLegacyEngine(engine: CanvasEngine): void {
    this._legacyEngine = engine;
    this._status.legacyObjects = engine.getObjects().length;
  }
  
  setFabricEngine(engine: FabricCanvasEngine): void {
    this._fabricEngine = engine;
    this._status.fabricObjects = engine.getObjects().length;
  }
  
  setMode(mode: MigrationMode): void {
    this._mode = mode;
    this._status.mode = mode;
  }
  
  getMode(): MigrationMode {
    return this._mode;
  }
  
  getStatus(): MigrationStatus {
    return { ...this._status };
  }
  
  // ============ Migration ============
  
  /**
   * Migrate a single legacy object to Fabric.js format
   */
  migrateObject(legacyObj: LegacyCanvasObject): CanvasObject {
    const base: any = {
      id: legacyObj.id,
      left: legacyObj.x,
      top: legacyObj.y,
      width: legacyObj.width,
      height: legacyObj.height,
      angle: legacyObj.rotation || 0,
      scaleX: legacyObj.scaleX || 1,
      scaleY: legacyObj.scaleY || 1,
      fill: legacyObj.fill || '',
      stroke: legacyObj.stroke || '',
      strokeWidth: legacyObj.strokeWidth || 0,
      opacity: legacyObj.opacity !== undefined ? legacyObj.opacity : 1,
      visible: legacyObj.visible !== undefined ? legacyObj.visible : true,
      zIndex: legacyObj.zIndex || 0,
    };
    
    switch (legacyObj.type) {
      case 'rect':
        return {
          ...base,
          type: 'rect' as const,
          rx: legacyObj.rx || 0,
          ry: legacyObj.ry || 0,
        };
      
      case 'circle':
        return {
          ...base,
          type: 'circle' as const,
          radius: legacyObj.radius || Math.min(legacyObj.width, legacyObj.height) / 2,
        };
      
      case 'ellipse':
        return {
          ...base,
          type: 'ellipse' as const,
          rx: legacyObj.rx || legacyObj.width / 2,
          ry: legacyObj.ry || legacyObj.height / 2,
        };
      
      case 'line':
        // For line, we need to calculate x1, y1, x2, y2 from the legacy format
        const halfWidth = legacyObj.width / 2;
        const halfHeight = legacyObj.height / 2;
        return {
          ...base,
          type: 'line' as const,
          x1: legacyObj.x - halfWidth,
          y1: legacyObj.y - halfHeight,
          x2: legacyObj.x + halfWidth,
          y2: legacyObj.y + halfHeight,
        };
      
      case 'path':
        return {
          ...base,
          type: 'path' as const,
          path: legacyObj.path || '',
        };
      
      case 'text':
        return {
          ...base,
          type: 'text' as const,
          text: legacyObj.text || '',
          fontSize: legacyObj.fontSize || 16,
          fontFamily: legacyObj.fontFamily || 'Arial',
          fontWeight: legacyObj.fontWeight || 'normal',
          fontStyle: 'normal' as const,
          textAlign: legacyObj.textAlign || 'left',
        };
      
      case 'image':
        return {
          ...base,
          type: 'image' as const,
          src: legacyObj.src || '',
        };
      
      case 'group':
        const children = (legacyObj.children || []).map(child => this.migrateObject(child));
        return {
          ...base,
          type: 'group' as const,
          objects: children,
        };
      
      default:
        // Unknown type - return base object
        console.warn(`Unknown legacy object type: ${legacyObj.type}`);
        return {
          ...base,
          type: 'rect' as const,
        };
    }
  }
  
  /**
   * Migrate all objects from legacy canvas to Fabric.js
   */
  async migrateAll(): Promise<MigrationStatus> {
    if (!this._legacyEngine || !this._fabricEngine) {
      throw new Error('Both legacy and fabric engines must be set before migration');
    }
    
    this._status.startedAt = new Date();
    this._status.migratedCount = 0;
    this._status.errors = [];
    
    const legacyObjects = this._legacyEngine.getObjects();
    const total = legacyObjects.length;
    
    // Clear existing fabric objects
    this._fabricEngine.clear();
    
    // Migrate each object
    for (let i = 0; i < legacyObjects.length; i++) {
      const legacyObj = legacyObjects[i];
      
      try {
        // Convert legacy object to CanvasObject format
        const migrated = this.migrateObject(legacyObj as unknown as LegacyCanvasObject);
        
        // Validate if needed
        if (this._options.validate) {
          this.validateObject(migrated);
        }
        
        // Add to fabric engine
        this._fabricEngine.addObject(migrated);
        
        this._status.migratedCount++;
        
        // Call progress callback
        if (this._options.onProgress) {
          this._options.onProgress({
            current: i + 1,
            total,
            objectId: migrated.id,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this._status.errors.push(`Failed to migrate ${legacyObj.id}: ${errorMessage}`);
        
        if (this._options.onError) {
          this._options.onError({
            objectId: legacyObj.id,
            error: errorMessage,
            original: legacyObj,
          });
        }
      }
    }
    
    // Update status
    this._status.fabricObjects = this._fabricEngine.getObjects().length;
    this._status.completedAt = new Date();
    
    // Call completion callback
    if (this._options.onComplete) {
      this._options.onComplete({ ...this._status });
    }
    
    return { ...this._status };
  }
  
  /**
   * Validate a migrated object
   */
  validateObject(obj: CanvasObject): void {
    if (!obj.id) {
      throw new Error('Object must have an id');
    }
    
    if (!obj.type) {
      throw new Error('Object must have a type');
    }
    
    if (typeof obj.left !== 'number' || typeof obj.top !== 'number') {
      throw new Error('Object must have valid position (left, top)');
    }
    
    if (typeof obj.width !== 'number' || typeof obj.height !== 'number') {
      throw new Error('Object must have valid dimensions (width, height)');
    }
    
    if (obj.type === 'circle' && typeof (obj as any).radius !== 'number') {
      throw new Error('Circle must have a radius');
    }
    
    if (obj.type === 'ellipse') {
      if (typeof (obj as any).rx !== 'number' || typeof (obj as any).ry !== 'number') {
        throw new Error('Ellipse must have rx and ry');
      }
    }
    
    if (obj.type === 'line') {
      if (
        typeof (obj as any).x1 !== 'number' ||
        typeof (obj as any).y1 !== 'number' ||
        typeof (obj as any).x2 !== 'number' ||
        typeof (obj as any).y2 !== 'number'
      ) {
        throw new Error('Line must have x1, y1, x2, y2');
      }
    }
    
    if (obj.type === 'path' && !obj.path) {
      throw new Error('Path must have path data');
    }
    
    if ((obj.type === 'text' || obj.type === 'textbox') && !obj.text) {
      throw new Error('Text must have text content');
    }
    
    if (obj.type === 'image' && !obj.src) {
      throw new Error('Image must have a src');
    }
  }
  
  // ============ Sync Operations ============
  
  /**
   * Sync an object from legacy to fabric
   */
  syncObjectToFabric(legacyObj: CanvasObject): void {
    if (!this._fabricEngine) {
      throw new Error('Fabric engine not set');
    }
    
    // Remove existing fabric object with same ID
    this._fabricEngine.removeObjectById(legacyObj.id);
    
    // Add the new object
    this._fabricEngine.addObject(legacyObj);
  }
  
  /**
   * Sync an object from fabric to legacy
   */
  syncObjectToLegacy(fabricObj: CanvasObject): void {
    if (!this._legacyEngine) {
      throw new Error('Legacy engine not set');
    }
    
    // Remove existing legacy object with same ID
    try {
      this._legacyEngine.removeObjectById(fabricObj.id);
    } catch (e) {
      // Legacy engine might not have removeObjectById
      console.warn('Legacy engine does not support removeObjectById');
    }
    
    // Add the new object
    this._legacyEngine.addObject(fabricObj);
  }
  
  /**
   * Sync all objects from legacy to fabric
   */
  syncLegacyToFabric(): void {
    if (!this._legacyEngine || !this._fabricEngine) {
      throw new Error('Both engines must be set');
    }
    
    const legacyObjects = this._legacyEngine.getObjects();
    
    // Clear fabric and re-add all
    this._fabricEngine.clear();
    legacyObjects.forEach(obj => this._fabricEngine.addObject(obj));
  }
  
  /**
   * Sync all objects from fabric to legacy
   */
  syncFabricToLegacy(): void {
    if (!this._legacyEngine || !this._fabricEngine) {
      throw new Error('Both engines must be set');
    }
    
    const fabricObjects = this._fabricEngine.getObjects();
    
    // Clear legacy and re-add all
    this._legacyEngine.clear();
    fabricObjects.forEach(obj => this._legacyEngine.addObject(obj));
  }
  
  // ============ Dual-Write Operations ============
  
  /**
   * Create an object on both canvases
   */
  createObjectOnBoth(type: 'rect' | 'circle' | 'ellipse' | 'line' | 'path' | 'text' | 'textbox', options: any): CanvasObject {
    if (!this._legacyEngine || !this._fabricEngine) {
      throw new Error('Both engines must be set for dual-write mode');
    }
    
    let obj: CanvasObject;
    
    switch (type) {
      case 'rect':
        obj = this._legacyEngine.createRect(options);
        this._fabricEngine.addObject(obj);
        break;
      case 'circle':
        obj = this._legacyEngine.createCircle(options);
        this._fabricEngine.addObject(obj);
        break;
      case 'ellipse':
        obj = this._legacyEngine.createEllipse(options);
        this._fabricEngine.addObject(obj);
        break;
      case 'line':
        obj = this._legacyEngine.createLine(options);
        this._fabricEngine.addObject(obj);
        break;
      case 'path':
        obj = this._legacyEngine.createPath(options);
        this._fabricEngine.addObject(obj);
        break;
      case 'text':
        obj = this._legacyEngine.createText(options);
        this._fabricEngine.addObject(obj);
        break;
      case 'textbox':
        obj = this._legacyEngine.createTextbox(options);
        this._fabricEngine.addObject(obj);
        break;
      default:
        throw new Error(`Unknown object type: ${type}`);
    }
    
    return obj;
  }
  
  /**
   * Remove an object from both canvases
   */
  removeObjectFromBoth(obj: CanvasObject): void {
    if (this._legacyEngine) {
      this._legacyEngine.removeObject(obj);
    }
    if (this._fabricEngine) {
      this._fabricEngine.removeObject(obj);
    }
  }
  
  /**
   * Update an object on both canvases
   */
  updateObjectOnBoth(obj: CanvasObject, updates: Partial<CanvasObject>): void {
    const updated = { ...obj, ...updates };
    
    if (this._legacyEngine) {
      // For legacy engine, we need to remove and re-add
      this._legacyEngine.removeObjectById(obj.id);
      this._legacyEngine.addObject(updated);
    }
    
    if (this._fabricEngine) {
      this._fabricEngine.removeObjectById(obj.id);
      this._fabricEngine.addObject(updated);
    }
  }
  
  // ============ Rollback ============
  
  /**
   * Rollback to legacy canvas only
   */
  rollbackToLegacy(): void {
    if (this._fabricEngine) {
      this._fabricEngine.destroy();
      this._fabricEngine = null;
    }
    this._mode = 'legacy-only';
    this._status.mode = 'legacy-only';
  }
  
  /**
   * Rollback to fabric canvas only
   */
  rollbackToFabric(): void {
    this._legacyEngine = null;
    this._mode = 'fabric-only';
    this._status.mode = 'fabric-only';
  }
  
  // ============ Utility ============
  
  /**
   * Check if migration is complete
   */
  isComplete(): boolean {
    return this._status.completedAt !== undefined;
  }
  
  /**
   * Check if migration had errors
   */
  hasErrors(): boolean {
    return this._status.errors.length > 0;
  }
  
  /**
   * Get error count
   */
  getErrorCount(): number {
    return this._status.errors.length;
  }
  
  /**
   * Get migration duration in milliseconds
   */
  getDuration(): number | undefined {
    if (this._status.completedAt && this._status.startedAt) {
      return this._status.completedAt.getTime() - this._status.startedAt.getTime();
    }
    return undefined;
  }
  
  /**
   * Reset migration status
   */
  resetStatus(): void {
    this._status = {
      mode: this._mode,
      legacyObjects: this._legacyEngine ? this._legacyEngine.getObjects().length : 0,
      fabricObjects: this._fabricEngine ? this._fabricEngine.getObjects().length : 0,
      migratedCount: 0,
      errors: [],
      startedAt: new Date(),
      completedAt: undefined,
    };
  }
}

/**
 * WhiteboardFabricBridge - Compatibility layer between WhiteboardCanvas and FabricCanvasEngine
 * 
 * This class provides a bridge to gradually migrate from the existing WhiteboardCanvas
 * to the new FabricCanvasEngine while maintaining compatibility.
 */
export class WhiteboardFabricBridge {
  private _legacyCanvas: any = null; // Reference to the legacy WhiteboardCanvas
  private _fabricEngine: FabricCanvasEngine | null = null;
  private _migration: FabricMigration;
  
  constructor() {
    this._migration = new FabricMigration({ mode: 'dual-write' });
  }
  
  /**
   * Initialize the bridge with both canvases
   */
  initialize(legacyCanvas: any, fabricEngine: FabricCanvasEngine): void {
    this._legacyCanvas = legacyCanvas;
    this._fabricEngine = fabricEngine;
    
    // Set up migration
    this._migration.setLegacyEngine(this._legacyCanvas);
    this._migration.setFabricEngine(fabricEngine);
  }
  
  /**
   * Get the FabricCanvasEngine instance
   */
  getFabricEngine(): FabricCanvasEngine | null {
    return this._fabricEngine;
  }
  
  /**
   * Get the migration handler
   */
  getMigration(): FabricMigration {
    return this._migration;
  }
  
  /**
   * Run the migration from legacy to fabric
   */
  async migrate(): Promise<MigrationStatus> {
    return this._migration.migrateAll();
  }
  
  /**
   * Create a fabric canvas engine for a container
   */
  static createEngine(container: HTMLElement, options?: any): FabricCanvasEngine {
    return new FabricCanvasEngine();
  }
  
  /**
   * Factory method to create a bridge with a fabric engine
   */
  static createBridge(legacyCanvas: any, container: HTMLElement, options?: any): WhiteboardFabricBridge {
    const bridge = new WhiteboardFabricBridge();
    const fabricEngine = new FabricCanvasEngine();
    fabricEngine.initialize(container, options);
    bridge.initialize(legacyCanvas, fabricEngine);
    return bridge;
  }
}

/**
 * Utility function to convert legacy canvas state to Fabric.js format
 */
export function convertLegacyStateToFabric(legacyState: LegacyCanvasState): any {
  const migration = new FabricMigration();
  const fabricState: any = {
    objects: [],
    width: legacyState.width,
    height: legacyState.height,
    background: legacyState.background || '',
  };
  
  // Convert each object
  legacyState.objects.forEach(legacyObj => {
    const fabricObj = migration.migrateObject(legacyObj);
    fabricState.objects.push(fabricObj);
  });
  
  return fabricState;
}

/**
 * Utility function to check if an object is a legacy format
 */
export function isLegacyObject(obj: any): obj is LegacyCanvasObject {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'type' in obj &&
    ('x' in obj || 'left' in obj) &&
    ('y' in obj || 'top' in obj)
  );
}

/**
 * Utility function to check if an object is a CanvasObject format
 */
export function isCanvasObject(obj: any): obj is CanvasObject {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'type' in obj &&
    'left' in obj &&
    'top' in obj &&
    'width' in obj &&
    'height' in obj
  );
}
