import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { useAppStore } from '../store';
import { Node } from '../types';

export const FileUploader: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addNodeToScene } = useAppStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      
      const node: Node = {
        id: Date.now().toString(),
        type: 'image',
        transform: { x: 50, y: 50, scaleX: 1, scaleY: 1, rotate: 0 },
        props: { src: result },
        meta: { createdBy: 'user', timestamp: new Date().toISOString() }
      };

      await addNodeToScene(node);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600"
      >
        <Upload size={20} />
      </button>
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*,.svg"
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};
