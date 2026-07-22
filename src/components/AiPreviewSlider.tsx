import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Code, Sparkles, SlidersHorizontal } from 'lucide-react';

interface AiPreviewSliderProps {
  isVisible: boolean;
  onAccept: () => void;
  onDiscard: () => void;
  metadata?: {
    model: string;
    prompt: string;
    timestamp: string;
  };
}

export function AiPreviewSlider({ isVisible, onAccept, onDiscard, metadata }: AiPreviewSliderProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-modal bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-neutral-200 dark:border-zinc-800 rounded-3xl p-4 shadow-2xl w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-500 font-bold uppercase tracking-wider text-xs">
            <Sparkles size={16} className="animate-pulse" />
            AI Draft Ready
          </div>
          <div className="text-[10px] bg-neutral-100 dark:bg-zinc-900 text-neutral-500 dark:text-zinc-400 px-2 py-1 rounded-full font-mono">
            {metadata?.model || 'gemini-2.5-flash'}
          </div>
        </div>
        
        <p className="text-xs text-neutral-600 dark:text-zinc-300 mb-4 line-clamp-2 italic">
          "{metadata?.prompt}"
        </p>
        
        {/* Placeholder for actual side-by-side split view control. 
            In the canvas, the new shapes are rendered with a distinct selection overlay or ghost opacity. */}
        <div className="h-1 w-full bg-neutral-200 dark:bg-zinc-800 rounded-full mb-4 overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 bg-indigo-500 w-full animate-pulse opacity-50" />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDiscard}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-zinc-900 hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-700 dark:text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <X size={14} /> Discard
          </button>
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold transition-colors shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <Check size={14} /> Accept & Merge
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
