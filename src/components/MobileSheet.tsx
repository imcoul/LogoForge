import React from 'react';
import { Modal } from './ui/Modal';

interface MobileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export const MobileSheet = ({ isOpen, onClose, children, title }: MobileSheetProps) => {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      titleId="mobile-sheet-title"
      className="md:hidden mt-auto mb-0 rounded-t-3xl rounded-b-none h-[80dvh] w-full max-w-full overflow-y-auto"
      hideCloseButton={true}
    >
      <div className="flex justify-between items-center mb-4 p-6 pb-0">
          <h2 id="mobile-sheet-title" className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-zinc-800 rounded-full cursor-pointer">
              Close
          </button>
      </div>
      <div className="p-6 pt-4">
        {children}
      </div>
    </Modal>
  );
};
