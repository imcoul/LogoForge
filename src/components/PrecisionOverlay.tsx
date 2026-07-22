import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, Target } from 'lucide-react';

interface PrecisionOverlayProps {
  onNudge: (dx: number, dy: number) => void;
  activeNodeId?: string;
  loupeImageUrl?: string | null;
  isVisible: boolean;
}

export function PrecisionOverlay({ onNudge, activeNodeId, loupeImageUrl, isVisible }: PrecisionOverlayProps) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear interval helper
  const clearNudgeInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Start continuous nudge repeat when button is held
  const handlePressStart = (dx: number, dy: number) => {
    clearNudgeInterval();
    // Fire immediately
    onNudge(dx, dy);
    // Setup interval for repeat
    intervalRef.current = setInterval(() => {
      onNudge(dx, dy);
    }, 120); // 120ms tick rate
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearNudgeInterval();
  }, []);

  if (!isVisible || !activeNodeId) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 right-6 z-modal flex flex-col items-center gap-4 md:hidden pointer-events-auto"
      >
        {/* Loupe Preview */}
        {loupeImageUrl && (
          <div className="w-24 h-24 rounded-full bg-white dark:bg-zinc-900 border-4 border-indigo-500 shadow-xl overflow-hidden relative flex items-center justify-center">
            <img src={loupeImageUrl} alt="Loupe magnifier" className="w-full h-full object-cover" />
            <div className="absolute inset-0 m-auto w-1 h-1 bg-red-500 rounded-full" />
            <Target className="absolute inset-0 m-auto w-6 h-6 text-red-500/50" />
          </div>
        )}

        {/* Nudge D-Pad */}
        <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-2 rounded-3xl shadow-2xl border border-neutral-200 dark:border-zinc-800 grid grid-cols-3 grid-rows-3 gap-1">
          <div />
          <button 
            onPointerDown={() => handlePressStart(0, -1)}
            onPointerUp={clearNudgeInterval}
            onPointerLeave={clearNudgeInterval}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-all select-none touch-none cursor-pointer"
          >
            <ArrowUp size={24} />
          </button>
          <div />
          <button 
            onPointerDown={() => handlePressStart(-1, 0)}
            onPointerUp={clearNudgeInterval}
            onPointerLeave={clearNudgeInterval}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-all select-none touch-none cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="w-12 h-12 flex items-center justify-center text-neutral-400">
            <ZoomIn size={20} />
          </div>
          <button 
            onPointerDown={() => handlePressStart(1, 0)}
            onPointerUp={clearNudgeInterval}
            onPointerLeave={clearNudgeInterval}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-all select-none touch-none cursor-pointer"
          >
            <ArrowRight size={24} />
          </button>
          <div />
          <button 
            onPointerDown={() => handlePressStart(0, 1)}
            onPointerUp={clearNudgeInterval}
            onPointerLeave={clearNudgeInterval}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-all select-none touch-none cursor-pointer"
          >
            <ArrowDown size={24} />
          </button>
          <div />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
