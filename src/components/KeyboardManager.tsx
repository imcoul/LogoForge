// KeyboardManager.tsx - Global Keyboard Shortcuts and Remapping UI
import React, { useEffect, useState } from 'react';
import { useAppStore, KeyboardMap } from '../store';
import { Keyboard, Check, RefreshCw } from 'lucide-react';
import { Modal } from './ui/Modal';

const DEFAULT_MAP: KeyboardMap = {
  save: 's',
  undo: 'z',
  redo: 'y',
  export: 'e',
  tabPreview: '1',
  tabPrecision: '2',
  tabMockups: '3',
  tabGuide: '4',
  tabRefine: '5',
  tabSonic: '6',
  comments: '7'
};

interface KeyboardManagerProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onSelectTab: (tab: any) => void;
}

export const KeyboardManager: React.FC<KeyboardManagerProps> = ({
  onSave,
  onUndo,
  onRedo,
  onExport,
  onSelectTab
}) => {
  const { settings, updateSettings } = useAppStore();
  const currentMap = settings?.keyboardMap || DEFAULT_MAP;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listeningFor, setListeningFor] = useState<keyof KeyboardMap | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in inputs or textareas
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (ctrlOrCmd) {
        if (key === currentMap.save) {
          e.preventDefault();
          onSave();
        } else if (key === currentMap.undo) {
          e.preventDefault();
          onUndo();
        } else if (key === currentMap.redo) {
          e.preventDefault();
          onRedo();
        } else if (key === currentMap.export) {
          e.preventDefault();
          onExport();
        }
      } else {
        // Tab switching
        if (key === currentMap.tabPreview) {
          onSelectTab('preview');
        } else if (key === currentMap.tabPrecision) {
          onSelectTab('precision');
        } else if (key === currentMap.tabMockups) {
          onSelectTab('mockups');
        } else if (key === currentMap.tabGuide) {
          onSelectTab('guide');
        } else if (key === currentMap.tabRefine) {
          onSelectTab('refine');
        } else if (key === currentMap.tabSonic) {
          onSelectTab('sonic');
        } else if (key === currentMap.comments) {
          onSelectTab('comments');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentMap, onSave, onUndo, onRedo, onExport, onSelectTab]);

  const startListening = (actionKey: keyof KeyboardMap) => {
    setListeningFor(actionKey);
  };

  useEffect(() => {
    if (!listeningFor) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      const newKey = e.key.toLowerCase();
      
      const newMap = { ...currentMap, [listeningFor]: newKey };
      updateSettings({ keyboardMap: newMap });
      setListeningFor(null);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [listeningFor, currentMap, updateSettings]);

  const resetToDefault = () => {
    updateSettings({ keyboardMap: DEFAULT_MAP });
  };

  return (
    <div id="keyboard-manager-root">
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
        title="Keyboard Shortcuts Manager"
      >
        <Keyboard size={14} />
        Shortcuts
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        titleId="keyboard-manager-title"
        className="max-w-lg max-h-[85dvh]"
        hideCloseButton={true}
      >
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-neutral-200 dark:border-zinc-800 flex justify-between items-center bg-neutral-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <Keyboard className="text-brand-lead dark:text-indigo-400 shrink-0" size={24} />
                <div>
                  <h3 id="keyboard-manager-title" className="text-lg font-bold text-neutral-900 dark:text-white">Command Center Shortcuts</h3>
                  <p className="text-xs text-neutral-500">View and remap shortcuts dynamically</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 p-3.5 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <strong>Hotkey Tip:</strong> Actions starting with <strong>Ctrl / ⌘</strong> require holding down the control key. Numeric hotkeys transition workspace tabs instantly.
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Global Operations</h4>
                {[
                  { key: 'save', label: 'Save Project', prefix: 'Ctrl + ' },
                  { key: 'undo', label: 'Undo Last Logo', prefix: 'Ctrl + ' },
                  { key: 'redo', label: 'Redo Logo', prefix: 'Ctrl + ' },
                  { key: 'export', label: 'Export Asset Suite', prefix: 'Ctrl + ' }
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-zinc-800/50 text-sm">
                    <span className="text-neutral-700 dark:text-zinc-300">{item.label}</span>
                    <button
                      onClick={() => startListening(item.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                        listeningFor === item.key
                          ? 'bg-indigo-600 border-indigo-600 text-white animate-pulse'
                          : 'bg-neutral-50 dark:bg-zinc-800/80 border-neutral-200 dark:border-zinc-700 text-neutral-800 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {listeningFor === item.key ? 'Press any key...' : `${item.prefix}${currentMap[item.key as keyof KeyboardMap]?.toUpperCase()}`}
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Workspace Tab Switching</h4>
                {[
                  { key: 'tabPreview', label: 'Preview Tab' },
                  { key: 'tabPrecision', label: 'Precision Tab' },
                  { key: 'tabMockups', label: 'Mockups Tab' },
                  { key: 'tabGuide', label: 'Brand Guide Tab' },
                  { key: 'tabRefine', label: 'Refine Tab' },
                  { key: 'tabSonic', label: 'Sonic Tab' },
                  { key: 'comments', label: 'Collaboration Tab' }
                ].map((item) => (
                  <div key={item.key} className="flex justify-between items-center py-2 border-b border-neutral-100 dark:border-zinc-800/50 text-sm">
                    <span className="text-neutral-700 dark:text-zinc-300">{item.label}</span>
                    <button
                      onClick={() => startListening(item.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                        listeningFor === item.key
                          ? 'bg-indigo-600 border-indigo-600 text-white animate-pulse'
                          : 'bg-neutral-50 dark:bg-zinc-800/80 border-neutral-200 dark:border-zinc-700 text-neutral-800 dark:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {listeningFor === item.key ? 'Press any key...' : currentMap[item.key as keyof KeyboardMap]}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-zinc-900 border-t border-neutral-200 dark:border-zinc-800 flex justify-between shrink-0">
              <button
                onClick={resetToDefault}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:underline cursor-pointer"
              >
                <RefreshCw size={12} /> Reset to Defaults
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold tracking-wide uppercase hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Check size={14} /> Done
              </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

