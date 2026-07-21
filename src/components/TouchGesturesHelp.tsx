import React, { useState, useEffect } from 'react';
import { Hand, Undo2, Redo2 } from 'lucide-react';
import { Modal } from './ui/Modal';

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
    <Modal
      isOpen={isVisible}
      onClose={dismiss}
      titleId="gestures-help-title"
      className="max-w-sm"
    >
      <div className="p-6">
        <h3 id="gestures-help-title" className="text-lg font-bold text-zinc-900 dark:text-white mb-4 pr-8">
          Master Studio Gestures
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Hand className="text-indigo-500 shrink-0" size={24} />
            <p className="text-sm text-zinc-600 dark:text-zinc-400"><strong>One Finger:</strong> Pan and drag to move.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 shrink-0">
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
      </div>
    </Modal>
  );
};

