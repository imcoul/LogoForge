import React from 'react';
import { Pencil, Eraser, Maximize2, Grid, Edit2, Trash2, Copy } from 'lucide-react';

interface ToolbarProps {
    tool: 'pencil' | 'sweeping-eraser' | 'duster-eraser';
    setTool: (t: 'pencil' | 'sweeping-eraser' | 'duster-eraser') => void;
    mode: 'drawing' | 'gallery';
    setMode: (m: 'drawing' | 'gallery') => void;
    setFullscreen: (f: boolean) => void;
    fullscreen: boolean;
}

export const WhiteboardToolbar: React.FC<ToolbarProps> = ({ tool, setTool, mode, setMode, setFullscreen, fullscreen }) => {
    return (
        <div className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-x-auto">
            {mode === 'drawing' && (
                <div className="flex gap-2">
                    <button onClick={() => setTool('pencil')} className={`p-2 rounded ${tool === 'pencil' ? 'bg-indigo-500 text-white' : ''}`}><Pencil size={20} /></button>
                    <button onClick={() => setTool('sweeping-eraser')} className={`p-2 rounded ${tool === 'sweeping-eraser' ? 'bg-indigo-500 text-white' : ''}`}><Eraser size={20} /> (S)</button>
                    <button onClick={() => setTool('duster-eraser')} className={`p-2 rounded ${tool === 'duster-eraser' ? 'bg-indigo-500 text-white' : ''}`}><Eraser size={20} /> (D)</button>
                </div>
            )}
            <div className="flex gap-2">
                <button onClick={() => setMode(mode === 'drawing' ? 'gallery' : 'drawing')} className={`p-2 rounded ${mode === 'gallery' ? 'bg-indigo-100' : ''}`}><Grid size={20} /></button>
                <button onClick={() => setFullscreen(!fullscreen)} className="p-2 rounded"><Maximize2 size={20} /></button>
            </div>
        </div>
    );
};
