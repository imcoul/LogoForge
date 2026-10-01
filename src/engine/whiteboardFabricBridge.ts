// WhiteboardFabricBridge - Compatibility layer for WhiteboardCanvas
// Provides a bridge to integrate FabricCanvasEngine with the existing WhiteboardCanvas

import {
  CanvasEngine,
  CanvasObject,
  CanvasObjectType,
  Point,
  Rect,
  CanvasOptions,
} from './canvasEngine';
import { FabricCanvasEngine } from './FabricCanvasEngine';
import { FabricMigration, MigrationMode, MigrationStatus } from './migrations/fabricMigration';

/**
 * Whiteboard state that can be migrated
 */
export interface WhiteboardState {
  objects: any[];
  width: number;
  height: number;
  background?: string;
  zoom?: number;
  panX?: number;
  panY?: number;
}

/**
 * WhiteboardFabricBridge - Main bridge class
 * 
 * This class provides a compatibility layer between the existing WhiteboardCanvas
 * and the new FabricCanvasEngine. It allows for:
 * - Gradual migration from legacy to Fabric.js
 * - Dual-write mode for testing
 * - Fallback to legacy when needed
 */
export class WhiteboardFabricBridge {
  private _fabricEngine: FabricCanvasEngine | null = null;
  private _container: HTMLElement | null = null;
  private _migration: FabricMigration | null = null;
  private _isInitialized: boolean = false;
  private _useFabricPrimary: boolean = false;
  
  // Event handlers for bridge-specific events
  private _onFabricReady: (() => void)[] = [];
  private _onMigrationComplete: ((status: MigrationStatus) => void)[] = [];
  private _onError: ((error: Error) => void)[] = [];
  
  constructor() {
    // Initialize with default settings
    this._migration = new FabricMigration({ mode: 'dual-write' });
  }
  
  // ============ Initialization ============
  
  /**
   * Initialize the bridge with a container element
   */
  async initialize(
    container: HTMLElement,
    options: CanvasOptions & {
      useFabricPrimary?: boolean;
      migrationMode?: MigrationMode;
    } = {}
  ): Promise<void> {
    if (this._isInitialized) {
      console.warn('WhiteboardFabricBridge already initialized');
      return;
    }
    
    this._container = container;
    this._useFabricPrimary = options.useFabricPrimary || false;
    
    // Create fabric engine
    this._fabricEngine = new FabricCanvasEngine();
    
    try {
      // Initialize fabric engine
      await this._fabricEngine.initialize(container, options);
      
      // Update migration mode
      if (options.migrationMode) {
        this._migration?.setMode(options.migrationMode);
      }
      
      this._isInitialized = true;
      
      // Notify that fabric is ready
      this._notifyFabricReady();
    } catch (error) {
      this._notifyError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  /**
   * Check if bridge is initialized
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }
  
  /**
   * Destroy the bridge and clean up
   */
  async destroy(): Promise<void> {
    if (this._fabricEngine) {
      await this._fabricEngine.destroy();
      this._fabricEngine = null;
    }
    
    this._container = null;
    this._isInitialized = false;
    this._onFabricReady = [];
    this._onMigrationComplete = [];
    this._onError = [];
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
  getMigration(): FabricMigration | null {
    return this._migration;
  }
  
  // ============ Event Handling ============
  
  /**
   * Subscribe to fabric ready event
   */
  onFabricReady(callback: () => void): void {
    this._onFabricReady.push(callback);
  }
  
  /**
   * Subscribe to migration complete event
   */
  onMigrationComplete(callback: (status: MigrationStatus) => void): void {
    this._onMigrationComplete.push(callback);
  }
  
  /**
   * Subscribe to error events
   */
  onError(callback: (error: Error) => void): void {
    this._onError.push(callback);
  }
  
  private _notifyFabricReady(): void {
    this._onFabricReady.forEach(cb => {
      try {
        cb();
      } catch (error) {
        console.error('Error in fabric ready callback:', error);
      }
    });
  }
  
  private _notifyMigrationComplete(status: MigrationStatus): void {
    this._onMigrationComplete.forEach(cb => {
      try {
        cb(status);
      } catch (error) {
        console.error('Error in migration complete callback:', error);
      }
    });
  }
  
  private _notifyError(error: Error): void {
    this._onError.forEach(cb => {
      try {
        cb(error);
      } catch (e) {
        console.error('Error in error callback:', e);
      }
    });
  }
  
  // ============ Migration ============
  
  /**
   * Migrate whiteboard state to fabric
   */
  async migrateFromWhiteboard(whiteboardState: WhiteboardState): Promise<MigrationStatus> {
    if (!this._fabricEngine || !this._migration) {
      throw new Error('Bridge not initialized');
    }
    
    // Convert whiteboard state to canvas objects
    const canvasObjects = this._convertWhiteboardObjects(whiteboardState.objects);
    
    // Clear fabric canvas
    this._fabricEngine.clear();
    
    // Set canvas dimensions
    this._fabricEngine.resize(whiteboardState.width, whiteboardState.height);
    
    // Set background
    if (whiteboardState.background) {
      this._fabricEngine.setBackground(whiteboardState.background);
    }
    
    // Add all objects
    canvasObjects.forEach(obj => this._fabricEngine.addObject(obj));
    
    // Update migration status
    const status: MigrationStatus = {
      mode: this._migration.getMode(),
      legacyObjects: whiteboardState.objects.length,
      fabricObjects: canvasObjects.length,
      migratedCount: canvasObjects.length,
      errors: [],
      startedAt: new Date(),
      completedAt: new Date(),
    };
    
    this._notifyMigrationComplete(status);
    
    return status;
  }
  
  /**
   * Convert whiteboard objects to canvas objects
   */
  private _convertWhiteboardObjects(whiteboardObjects: any[]): CanvasObject[] {
    return whiteboardObjects.map(whiteboardObj => {
      // Map whiteboard object properties to canvas object
      const base: any = {
        id: whiteboardObj.id || `wb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: this._mapWhiteboardType(whiteboardObj.type),
        left: whiteboardObj.x || whiteboardObj.left || 0,
        top: whiteboardObj.y || whiteboardObj.top || 0,
        width: whiteboardObj.width || 0,
        height: whiteboardObj.height || 0,
        angle: whiteboardObj.rotation || whiteboardObj.angle || 0,
        scaleX: whiteboardObj.scaleX || 1,
        scaleY: whiteboardObj.scaleY || 1,
        fill: whiteboardObj.fill || whiteboardObj.fillColor || '',
        stroke: whiteboardObj.stroke || whiteboardObj.strokeColor || '',
        strokeWidth: whiteboardObj.strokeWidth || 0,
        opacity: whiteboardObj.opacity !== undefined ? whiteboardObj.opacity : 1,
        visible: whiteboardObj.visible !== undefined ? whiteboardObj.visible : true,
        zIndex: whiteboardObj.zIndex || whiteboardObj.z || 0,
      };
      
      // Add type-specific properties
      switch (whiteboardObj.type) {
        case 'rect':
        case 'rectangle':
          return {
            ...base,
            type: 'rect' as const,
            rx: whiteboardObj.rx || whiteboardObj.cornerRadius || 0,
            ry: whiteboardObj.ry || whiteboardObj.cornerRadius || 0,
          };
        
        case 'circle':
          return {
            ...base,
            type: 'circle' as const,
            radius: whiteboardObj.radius || Math.min(base.width, base.height) / 2,
          };
        
        case 'ellipse':
        case 'oval':
          return {
            ...base,
            type: 'ellipse' as const,
            rx: whiteboardObj.rx || base.width / 2,
            ry: whiteboardObj.ry || base.height / 2,
          };
        
        case 'line':
          // Calculate line points from center position
          const halfWidth = base.width / 2;
          const halfHeight = base.height / 2;
          return {
            ...base,
            type: 'line' as const,
            x1: base.left - halfWidth,
            y1: base.top - halfHeight,
            x2: base.left + halfWidth,
            y2: base.top + halfHeight,
          };
        
        case 'path':
        case 'svg':
          return {
            ...base,
            type: 'path' as const,
            path: whiteboardObj.path || whiteboardObj.d || '',
            strokeLineCap: whiteboardObj.strokeLineCap || 'butt',
            strokeLineJoin: whiteboardObj.strokeLineJoin || 'miter',
            fillRule: whiteboardObj.fillRule || 'nonzero',
          };
        
        case 'text':
          return {
            ...base,
            type: 'text' as const,
            text: whiteboardObj.text || whiteboardObj.content || '',
            fontSize: whiteboardObj.fontSize || 16,
            fontFamily: whiteboardObj.fontFamily || 'Arial',
            fontWeight: whiteboardObj.fontWeight || 'normal',
            fontStyle: whiteboardObj.fontStyle || whiteboardObj.italic ? 'italic' : 'normal',
            textAlign: whiteboardObj.textAlign || whiteboardObj.align || 'left',
            textBackgroundColor: whiteboardObj.textBackgroundColor || '',
            lineHeight: whiteboardObj.lineHeight || 1,
            charSpacing: whiteboardObj.charSpacing || 0,
          };
        
        case 'textbox':
        case 'i-text':
          return {
            ...base,
            type: 'textbox' as const,
            text: whiteboardObj.text || whiteboardObj.content || '',
            fontSize: whiteboardObj.fontSize || 16,
            fontFamily: whiteboardObj.fontFamily || 'Arial',
            fontWeight: whiteboardObj.fontWeight || 'normal',
            fontStyle: whiteboardObj.fontStyle || whiteboardObj.italic ? 'italic' : 'normal',
            textAlign: whiteboardObj.textAlign || whiteboardObj.align || 'left',
            textBackgroundColor: whiteboardObj.textBackgroundColor || '',
            lineHeight: whiteboardObj.lineHeight || 1,
            charSpacing: whiteboardObj.charSpacing || 0,
          };
        
        case 'group':
          const children = whiteboardObj.objects || whiteboardObj.children || [];
          return {
            ...base,
            type: 'group' as const,
            objects: this._convertWhiteboardObjects(children),
          };
        
        case 'image':
          return {
            ...base,
            type: 'image' as const,
            src: whiteboardObj.src || whiteboardObj.url || '',
          };
        
        default:
          console.warn(`Unknown whiteboard object type: ${whiteboardObj.type}`);
          return {
            ...base,
            type: 'rect' as const,
          };
      }
    });
  }
  
  /**
   * Map whiteboard object type to canvas object type
   */
  private _mapWhiteboardType(type: string): CanvasObjectType {
    const typeMap: Record<string, CanvasObjectType> = {
      'rect': 'rect',
      'rectangle': 'rect',
      'circle': 'circle',
      'ellipse': 'ellipse',
      'oval': 'ellipse',
      'line': 'line',
      'path': 'path',
      'svg': 'path',
      'text': 'text',
      'textbox': 'textbox',
      'i-text': 'textbox',
      'group': 'group',
      'image': 'image',
    };
    
    return typeMap[type] || 'rect';
  }
  
  // ============ State Management ============
  
  /**
   * Save the current fabric canvas state
   */
  saveState(): string {
    if (!this._fabricEngine) {
      throw new Error('Fabric engine not initialized');
    }
    
    return this._fabricEngine.saveState();
  }
  
  /**
   * Restore fabric canvas state
   */
  restoreState(state: string): void {
    if (!this._fabricEngine) {
      throw new Error('Fabric engine not initialized');
    }
    
    this._fabricEngine.restoreState(state);
  }
  
  /**
   * Export fabric canvas to JSON
   */
  toJSON(): any {
    if (!this._fabricEngine) {
      throw new Error('Fabric engine not initialized');
    }
    
    return this._fabricEngine.toJSON();
  }
  
  /**
   * Export fabric canvas to SVG
   */
  toSVG(): string {
    if (!this._fabricEngine) {
      throw new Error('Fabric engine not initialized');
    }
    
    return this._fabricEngine.toSVG();
  }
  
  /**
   * Export fabric canvas to data URL
   */
  toDataURL(options?: { format?: 'png' | 'jpeg'; quality?: number }): string {
    if (!this._fabricEngine) {
      throw new Error('Fabric engine not initialized');
    }
    
    return this._fabricEngine.toDataURL(options);
  }
  
  // ============ Utility ============
  
  /**
   * Check if fabric is the primary canvas
   */
  isFabricPrimary(): boolean {
    return this._useFabricPrimary;
  }
  
  /**
   * Set fabric as the primary canvas
   */
  setFabricPrimary(primary: boolean): void {
    this._useFabricPrimary = primary;
  }
  
  /**
   * Get the container element
   */
  getContainer(): HTMLElement | null {
    return this._container;
  }
  
  /**
   * Check if migration is complete
   */
  isMigrationComplete(): boolean {
    return this._migration?.isComplete() || false;
  }
  
  /**
   * Get migration status
   */
  getMigrationStatus(): MigrationStatus | null {
    return this._migration?.getStatus() || null;
  }
  
  // ============ Factory Methods ============
  
  /**
   * Create a fabric canvas engine directly
   */
  static createFabricEngine(container: HTMLElement, options?: CanvasOptions): FabricCanvasEngine {
    const engine = new FabricCanvasEngine();
    engine.initialize(container, options);
    return engine;
  }
  
  /**
   * Create a bridge with automatic initialization
   */
  static create(
    container: HTMLElement,
    options: CanvasOptions & {
      useFabricPrimary?: boolean;
      migrationMode?: MigrationMode;
    } = {}
  ): WhiteboardFabricBridge {
    const bridge = new WhiteboardFabricBridge();
    bridge.initialize(container, options);
    return bridge;
  }
  
  /**
   * Create a bridge and migrate from existing state
   */
  static async createAndMigrate(
    container: HTMLElement,
    whiteboardState: WhiteboardState,
    options: CanvasOptions & {
      useFabricPrimary?: boolean;
      migrationMode?: MigrationMode;
    } = {}
  ): Promise<WhiteboardFabricBridge> {
    const bridge = new WhiteboardFabricBridge();
    await bridge.initialize(container, options);
    await bridge.migrateFromWhiteboard(whiteboardState);
    return bridge;
  }
}

/**
 * Helper function to create a fabric engine for a whiteboard
 */
export function createFabricEngineForWhiteboard(
  container: HTMLElement,
  options?: CanvasOptions
): FabricCanvasEngine {
  return WhiteboardFabricBridge.createFabricEngine(container, options);
}

/**
 * Helper function to migrate whiteboard state to fabric
 */
export async function migrateWhiteboardToFabric(
  container: HTMLElement,
  whiteboardState: WhiteboardState,
  options?: CanvasOptions & {
    useFabricPrimary?: boolean;
    migrationMode?: MigrationMode;
  }
): Promise<WhiteboardFabricBridge> {
  return WhiteboardFabricBridge.createAndMigrate(container, whiteboardState, options);
}
