// WhiteboardCanvasFabric - Enhanced WhiteboardCanvas with Fabric.js integration
// Provides a drop-in replacement that adds Fabric.js capabilities

import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { WhiteboardCanvas } from './WhiteboardCanvas';
import { FabricCanvasWrapper } from './FabricCanvasWrapper';
import { Sketch } from '../hooks/useWhiteboardFabricBridge';
import { FabricCanvasEngine } from '../engine/FabricCanvasEngine';
import { WhiteboardFabricBridge } from '../engine/whiteboardFabricBridge';

// Define props type for WhiteboardCanvas
interface WhiteboardCanvasProps {
  fullscreen: boolean;
  setFullscreen: (f: boolean) => void;
  onUpdateAndSync?: (updates: any, throttleCloud?: boolean) => Promise<void>;
  onGhostSync?: (ghostData: any) => void;
  onRedirectToPrecision?: () => void;
}

export interface WhiteboardCanvasFabricProps extends Omit<WhiteboardCanvasProps, 'ref'> {
  /** Enable Fabric.js canvas (default: false for backwards compatibility) */
  useFabric?: boolean;
  /** Start in Fabric-only mode (default: false, uses dual-write when useFabric=true) */
  fabricOnly?: boolean;
  /** Callback when Fabric engine is ready */
  onFabricReady?: (engine: FabricCanvasEngine, bridge: WhiteboardFabricBridge) => void;
  /** Callback when error occurs */
  onFabricError?: (error: Error) => void;
  /** Initial sketches to migrate to Fabric */
  initialSketches?: Sketch[];
}

export interface WhiteboardCanvasFabricHandle {
  /** Switch to Fabric-only mode */
  switchToFabric: () => void;
  /** Switch to SVG-only mode (legacy) */
  switchToLegacy: () => void;
  /** Get current mode */
  getMode: () => 'legacy' | 'fabric' | 'dual';
}

/**
 * WhiteboardCanvasFabric - Enhanced canvas with optional Fabric.js integration
 * 
 * This component wraps the existing WhiteboardCanvas and adds Fabric.js support.
 * It provides:
 * - Backwards compatibility (renders WhiteboardCanvas when useFabric=false)
 * - Dual-write mode (both SVG and Fabric render simultaneously)
 * - Fabric-only mode (uses Fabric.js for rendering)
 * - Smooth migration path
 */
export const WhiteboardCanvasFabric = forwardRef<WhiteboardCanvasFabricHandle, WhiteboardCanvasFabricProps>(
  (
    {
      useFabric = false,
      fabricOnly = false,
      onFabricReady,
      onFabricError,
      initialSketches = [],
      ...whiteboardProps
    },
    ref
  ) => {
    const fabricWrapperRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [mode, setMode] = useState<'legacy' | 'fabric' | 'dual'>(
      useFabric ? (fabricOnly ? 'fabric' : 'dual') : 'legacy'
    );
    const [isFabricReady, setIsFabricReady] = useState(false);
    const [fabricError, setFabricError] = useState<Error | null>(null);
    
    // Handle Fabric ready
    const handleFabricReady = (engine: FabricCanvasEngine, bridge: WhiteboardFabricBridge) => {
      setIsFabricReady(true);
      onFabricReady?.(engine, bridge);
    };

    // Handle Fabric error
    const handleFabricError = (error: Error) => {
      setFabricError(error);
      onFabricError?.(error);
    };

    // Switch to Fabric-only mode
    const switchToFabric = () => {
      setMode('fabric');
    };

    // Switch to legacy mode
    const switchToLegacy = () => {
      setMode('legacy');
    };

    // Expose handle
    useImperativeHandle(ref, () => ({
      switchToFabric,
      switchToLegacy,
      getMode: () => mode,
    }));

    // Render based on mode
    if (mode === 'fabric') {
      // Fabric-only mode - hide legacy canvas
      return (
        <div ref={containerRef} className="w-full h-full">
          <FabricCanvasWrapper
            ref={fabricWrapperRef}
            width={whiteboardProps.fullscreen ? window.innerWidth : 800}
            height={whiteboardProps.fullscreen ? window.innerHeight : 400}
            className="w-full h-full"
            onReady={handleFabricReady}
            onError={handleFabricError}
            useFabricPrimary={true}
            migrationMode="fabric-only"
          />
          
          {fabricError && (
            <div className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded text-sm">
              Fabric Error: {fabricError.message}
              <button onClick={switchToLegacy} className="ml-2 underline">
                Fallback to Legacy
              </button>
            </div>
          )}
        </div>
      );
    }

    if (mode === 'dual') {
      // Dual-write mode - render both
      return (
        <div ref={containerRef} className="w-full h-full relative">
          {/* Legacy canvas (hidden but still functional) */}
          <div className="absolute inset-0 opacity-0 pointer-events-none">
            <WhiteboardCanvas
              {...whiteboardProps}
            />
          </div>
          
          {/* Fabric canvas (visible) */}
          <FabricCanvasWrapper
            ref={fabricWrapperRef}
            width={whiteboardProps.fullscreen ? window.innerWidth : 800}
            height={whiteboardProps.fullscreen ? window.innerHeight : 400}
            className="w-full h-full"
            onReady={handleFabricReady}
            onError={handleFabricError}
            useFabricPrimary={true}
            migrationMode="dual-write"
          />
          
          {fabricError && (
            <div className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded text-sm">
              Fabric Error: {fabricError.message}
              <button onClick={switchToLegacy} className="ml-2 underline">
                Fallback to Legacy
              </button>
            </div>
          )}
          
          {isFabricReady && (
            <div className="absolute bottom-4 right-4 bg-green-500 text-white p-2 rounded text-sm">
              Fabric.js Ready (Dual-Write Mode)
            </div>
          )}
        </div>
      );
    }

    // Legacy mode (default) - just render the original WhiteboardCanvas
    return (
      <div ref={containerRef} className="w-full h-full">
        <WhiteboardCanvas
          {...whiteboardProps}
        />
        
        {useFabric && (
          <div className="absolute bottom-4 right-4 bg-blue-500 text-white p-2 rounded text-sm">
            <button onClick={switchToFabric} className="underline">
              Enable Fabric.js
            </button>
          </div>
        )}
      </div>
    );
  }
);

WhiteboardCanvasFabric.displayName = 'WhiteboardCanvasFabric';

// Export the original WhiteboardCanvas for backwards compatibility
export { WhiteboardCanvas };
