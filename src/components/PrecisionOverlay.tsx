import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, Target } from 'lucide-react';

interface PrecisionOverlayProps {
  onNudge: (dx: number, dy: number) => void;
  activeNodeId?: string;
  loupeImageUrl?: string | null;
  isVisible: boolean;
}

export function PrecisionOverlay({ onNudge, activeNodeId, loupeImageUrl, isVisible }: PrecisionOverlayProps) {
  // Only render if a node is selected and we are on mobile (typically handled by parent with media query or we assume it's always useful if requested)
  
  if (!isVisible || !activeNodeId) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-4 md:hidden pointer-events-auto"
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
            onClick={() => onNudge(0, -1)}
            onPointerDown={(e) => {
              // Optionally add long-press repeat logic here
            }}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-transform"
          >
            <ArrowUp size={24} />
          </button>
          <div />
          <button 
            onClick={() => onNudge(-1, 0)}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="w-12 h-12 flex items-center justify-center text-neutral-400">
            <ZoomIn size={20} />
          </div>
          <button 
            onClick={() => onNudge(1, 0)}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-transform"
          >
            <ArrowRight size={24} />
          </button>
          <div />
          <button 
            onClick={() => onNudge(0, 1)}
            className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-neutral-600 dark:text-zinc-300 active:scale-95 transition-transform"
          >
            <ArrowDown size={24} />
          </button>
          <div />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
