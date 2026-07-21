import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import FocusTrap from 'focus-trap-react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
  className?: string;
  hideCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  titleId,
  children,
  className = 'max-w-md max-h-[85dvh]',
  hideCloseButton = false,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap focusTrapOptions={{ initialFocus: false, fallbackFocus: () => document.body }}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-modal flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full overflow-y-auto no-scrollbar ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              )}
              {children}
            </motion.div>
          </div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
};
