import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export const Sheet = ({ isOpen, onClose, children, title }: SheetProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-zinc-900 border-t border-neutral-200 dark:border-zinc-800 p-6 rounded-t-3xl h-[80vh] overflow-y-auto md:hidden"
          >
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{title}</h2>
                <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-zinc-800 rounded-full">
                    Close
                </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
