// FabricCanvasWrapper - React component wrapper for FabricCanvasEngine
// Provides a React-friendly interface to the Fabric.js canvas engine

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { 
  CanvasEngine,
  CanvasObject,
  CanvasOptions,
  CanvasEventType,
  CanvasEventHandler,
  Point,
  Size,
} from '../engine/canvasEngine';
import { FabricCanvasEngine } from '../engine/FabricCanvasEngine';
import { WhiteboardFabricBridge, WhiteboardState } from '../engine/whiteboardFabricBridge';

export interface FabricCanvasWrapperProps {
  width?: number;
  height?: number;
  className?: string;
  onReady?: (engine: FabricCanvasEngine, bridge: WhiteboardFabricBridge) => void;
  onError?: (error: Error) => void;
  useFabricPrimary?: boolean;
  migrationMode?: 'dual-write' | 'fabric-only' | 'legacy-only';
  initialState?: WhiteboardState;
}

export interface FabricCanvasWrapperHandle {
  getEngine: () => FabricCanvasEngine | null;
  getBridge: () => WhiteboardFabricBridge | null;
  getCanvasElement: () => HTMLElement | null;
  clear: () => void;
  destroy: () => Promise<void>;
  toSVG: () => string;
  toJSON: () => any;
  toDataURL: (options?: { format?: 'png' | 'jpeg'; quality?: number }) => string;
  migrateFromState: (state: WhiteboardState) => Promise<void>;
  saveState: () => string;
  restoreState: (state: string) => void;
}

/**
 * FabricCanvasWrapper - React component that wraps FabricCanvasEngine
 * 
 * This component provides a React-friendly way to use the Fabric.js canvas engine.
 * It handles:
 * - Engine initialization and cleanup
 * - Event forwarding
 * - State management
 * - Integration with existing WhiteboardCanvas
 */
export const FabricCanvasWrapper = forwardRef<FabricCanvasWrapperHandle, FabricCanvasWrapperProps>(
  (
    {
      width = 800,
      height = 600,
      className = '',
      onReady,
      onError,
      useFabricPrimary = false,
      migrationMode = 'dual-write',
      initialState,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<FabricCanvasEngine | null>(null);
    const bridgeRef = useRef<WhiteboardFabricBridge | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Initialize engine on mount
    useEffect(() => {
      const initialize = async () => {
        try {
          if (!containerRef.current) return;

          // Create bridge
          bridgeRef.current = new WhiteboardFabricBridge();

          // Initialize bridge with container
          await bridgeRef.current.initialize(containerRef.current, {
            width,
            height,
            useFabricPrimary,
            migrationMode,
          });

          // Get fabric engine from bridge
          engineRef.current = bridgeRef.current.getFabricEngine();

          if (!engineRef.current) {
            throw new Error('Failed to initialize FabricCanvasEngine');
          }

          // Migrate initial state if provided
          if (initialState) {
            await bridgeRef.current.migrateFromWhiteboard(initialState);
          }

          setIsReady(true);
          onReady?.(engineRef.current, bridgeRef.current);
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          onError?.(error);
          console.error('FabricCanvasWrapper initialization error:', error);
        }
      };

      initialize();

      return () => {
        // Cleanup on unmount
        const cleanup = async () => {
          if (bridgeRef.current) {
            try {
              await bridgeRef.current.destroy();
            } catch (e) {
              console.error('Error destroying bridge:', e);
            }
          }
          bridgeRef.current = null;
          engineRef.current = null;
        };
        cleanup();
      };
    }, [width, height, useFabricPrimary, migrationMode, initialState, onReady, onError]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getEngine: () => engineRef.current,
      getBridge: () => bridgeRef.current,
      getCanvasElement: () => {
        if (engineRef.current && engineRef.current.isInitialized()) {
          return engineRef.current.getCanvasElement();
        }
        return null;
      },
      clear: () => {
        engineRef.current?.clear();
      },
      destroy: async () => {
        if (bridgeRef.current) {
          await bridgeRef.current.destroy();
          bridgeRef.current = null;
          engineRef.current = null;
        }
      },
      toSVG: () => {
        if (bridgeRef.current) {
          return bridgeRef.current.toSVG();
        }
        return '';
      },
      toJSON: () => {
        if (bridgeRef.current) {
          return bridgeRef.current.toJSON();
        }
        return {};
      },
      toDataURL: (options) => {
        if (bridgeRef.current) {
          return bridgeRef.current.toDataURL(options);
        }
        return '';
      },
      migrateFromState: async (state: WhiteboardState) => {
        if (bridgeRef.current) {
          await bridgeRef.current.migrateFromWhiteboard(state);
        }
      },
      saveState: () => {
        if (bridgeRef.current) {
          return bridgeRef.current.saveState();
        }
        return '';
      },
      restoreState: (state: string) => {
        if (bridgeRef.current) {
          bridgeRef.current.restoreState(state);
        }
      },
    }));

    if (error) {
      return (
        <div
          className={`fabric-canvas-error ${className}`}
          style={{ width, height }}
        >
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            <strong>Fabric.js Error:</strong> {error.message}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={`fabric-canvas-container ${className}`}
        style={{ width, height, position: 'relative' }}
      >
        {!isReady && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Initializing Fabric.js...
            </div>
          </div>
        )}
        
        {/* Canvas will be inserted here by FabricCanvasEngine */}
      </div>
    );
  }
);

FabricCanvasWrapper.displayName = 'FabricCanvasWrapper';

// Helper hook for using FabricCanvasWrapper
export const useFabricCanvas = (
  containerRef: React.RefObject<HTMLDivElement>,
  options: Omit<FabricCanvasWrapperProps, 'onReady' | 'onError'> = {}
) => {
  const [engine, setEngine] = useState<FabricCanvasEngine | null>(null);
  const [bridge, setBridge] = useState<WhiteboardFabricBridge | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!containerRef.current) return;

        const bridgeInstance = new WhiteboardFabricBridge();
        await bridgeInstance.initialize(containerRef.current, {
          width: options.width || 800,
          height: options.height || 600,
          useFabricPrimary: options.useFabricPrimary,
          migrationMode: options.migrationMode,
        });

        const engineInstance = bridgeInstance.getFabricEngine();
        if (!engineInstance) {
          throw new Error('Failed to initialize FabricCanvasEngine');
        }

        setEngine(engineInstance);
        setBridge(bridgeInstance);
        setIsReady(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error('useFabricCanvas initialization error:', error);
      }
    };

    initialize();

    return () => {
      const cleanup = async () => {
        if (bridge) {
          try {
            await bridge.destroy();
          } catch (e) {
            console.error('Error destroying bridge:', e);
          }
        }
      };
      cleanup();
    };
  }, [containerRef, options]);

  return { engine, bridge, isReady, error };
};
