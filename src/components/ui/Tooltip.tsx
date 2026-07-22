import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface TooltipProps {
  content: React.ReactNode;
  trigger: React.ReactNode;
}

export const Tooltip = ({ content, trigger }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      {trigger}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[80] bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-zinc-950 dark:bg-zinc-900 text-white dark:text-zinc-100 text-xs rounded-2xl shadow-xl border border-neutral-800 dark:border-zinc-800 pointer-events-none text-left leading-relaxed flex flex-col gap-1.5"
          >
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-950 dark:border-t-zinc-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
