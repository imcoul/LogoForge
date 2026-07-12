import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, Undo2, Redo2, X } from 'lucide-react';

export const TouchGesturesHelp: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasShown = localStorage.getItem('forgel_touch_gesture_help_shown');
    // Check if on mobile device. Basic check for now.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!hasShown && isMobile) {
      setIsVisible(true);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('forgel_touch_gesture_help_shown', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Master Studio Gestures</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Hand className="text-indigo-500" size={24} />
                <p className="text-sm text-zinc-600 dark:text-zinc-400"><strong>One Finger:</strong> Pan and drag to move.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                    <Undo2 className="text-zinc-500" size={20} />
                    <Redo2 className="text-zinc-500" size={20} />
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400"><strong>Two Fingers:</strong> Tap to Undo / Redo.</p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="w-full mt-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
