import React from 'react';
import { Pencil, Eraser, Maximize2, Grid, Edit2, Trash2, Copy, Undo, Redo } from 'lucide-react';
import { FileUploader } from './FileUploader';

interface ToolbarProps {
    tool: 'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line';
    setTool: (t: 'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'line') => void;
    mode: 'drawing' | 'gallery';
    setMode: (m: 'drawing' | 'gallery') => void;
    setFullscreen: (f: boolean) => void;
    fullscreen: boolean;
    onUndo: () => void;
    onRedo: () => void;
}

export const WhiteboardToolbar: React.FC<ToolbarProps> = ({ tool, setTool, mode, setMode, setFullscreen, fullscreen, onUndo, onRedo }) => {
    return (
        <div className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-x-auto">
            {mode === 'drawing' && (
                <div className="flex gap-2">
                    <button onClick={() => setTool('pencil')} className={`p-2 rounded ${tool === 'pencil' ? 'bg-indigo-500 text-white' : ''}`}><Pencil size={20} /></button>
                    <button onClick={() => setTool('line')} className={`p-2 rounded ${tool === 'line' ? 'bg-indigo-500 text-white' : ''}`}><Edit2 size={20} /></button>
                    <button onClick={() => setTool('sweeping-eraser')} className={`p-2 rounded ${tool === 'sweeping-eraser' ? 'bg-indigo-500 text-white' : ''}`}><Eraser size={20} /> (S)</button>
                    <button onClick={() => setTool('duster-eraser')} className={`p-2 rounded ${tool === 'duster-eraser' ? 'bg-indigo-500 text-white' : ''}`}><Eraser size={20} /> (D)</button>
                    <button onClick={onUndo} className="p-2 rounded"><Undo size={20} /></button>
                    <button onClick={onRedo} className="p-2 rounded"><Redo size={20} /></button>
                    <FileUploader />
                </div>
            )}
            <div className="flex gap-2">
                <button onClick={() => setMode(mode === 'drawing' ? 'gallery' : 'drawing')} className={`p-2 rounded ${mode === 'gallery' ? 'bg-indigo-100' : ''}`}><Grid size={20} /></button>
                <button onClick={() => setFullscreen(!fullscreen)} className="p-2 rounded"><Maximize2 size={20} /></button>
            </div>
        </div>
    );
};
