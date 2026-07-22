import React from 'react';
import { Pencil, Eraser, Maximize2, Grid, Edit2, Undo, Redo, Square, Circle, MousePointer2, Scissors, Bomb } from 'lucide-react';
import { FileUploader } from './FileUploader';

export type WhiteboardTool = 'pencil' | 'sweeping-eraser' | 'duster-eraser' | 'slice-eraser' | 'line' | 'rectangle' | 'circle' | 'select';

interface ToolbarProps {
    tool: WhiteboardTool;
    setTool: (t: WhiteboardTool) => void;
    mode: 'drawing' | 'gallery';
    setMode: (m: 'drawing' | 'gallery') => void;
    setFullscreen: (f: boolean) => void;
    fullscreen: boolean;
    onUndo: () => void;
    onRedo: () => void;
    color: string;
    setColor: (c: string) => void;
    strokeWidth: number;
    setStrokeWidth: (w: number) => void;
}

export const WhiteboardToolbar: React.FC<ToolbarProps> = ({ 
    tool, setTool, mode, setMode, setFullscreen, fullscreen, onUndo, onRedo,
    color, setColor, strokeWidth, setStrokeWidth
}) => {
    return (
        <div className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl gap-2 w-full max-w-full overflow-hidden">
            {mode === 'drawing' && (
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2">
                    <button onClick={() => setTool('select')} className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${tool === 'select' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`} title="Select"><MousePointer2 size={18} /></button>
                    <button onClick={() => setTool('pencil')} className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${tool === 'pencil' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`} title="Pencil"><Pencil size={18} /></button>
                    <button onClick={() => setTool('line')} className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${tool === 'line' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`} title="Line"><Edit2 size={18} /></button>
                    <button onClick={() => setTool('rectangle')} className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${tool === 'rectangle' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`} title="Rectangle"><Square size={18} /></button>
                    <button onClick={() => setTool('circle')} className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${tool === 'circle' ? 'bg-indigo-500 text-white' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`} title="Circle"><Circle size={18} /></button>
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-0.5 shrink-0" />
                    {/* Beautiful color-coded grouped eraser toggle list */}
                    <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-neutral-200/50 dark:border-zinc-700/50 shrink-0 shadow-sm" title="Eraser Modes">
                      <button 
                        onClick={() => setTool('sweeping-eraser')} 
                        className={`p-1.5 sm:p-2 rounded-lg shrink-0 transition-all ${
                          tool === 'sweeping-eraser' 
                            ? 'bg-indigo-500 text-white shadow-sm scale-102' 
                            : 'hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`} 
                        title="Object Eraser: Deletes full shapes on contact"
                      >
                        <Eraser size={18} />
                      </button>
                      <button 
                        onClick={() => setTool('slice-eraser')} 
                        className={`p-1.5 sm:p-2 rounded-lg shrink-0 transition-all ${
                          tool === 'slice-eraser' 
                            ? 'bg-emerald-500 text-white shadow-sm scale-102' 
                            : 'hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`} 
                        title="Slice Eraser: Erases points and splits path segments"
                      >
                        <Scissors size={18} />
                      </button>
                      <button 
                        onClick={() => setTool('duster-eraser')} 
                        className={`p-1.5 sm:p-2 rounded-lg shrink-0 transition-all ${
                          tool === 'duster-eraser' 
                            ? 'bg-rose-500 text-white shadow-sm scale-102 animate-pulse' 
                            : 'hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`} 
                        title="Canvas Duster: Wipes the entire board"
                      >
                        <Bomb size={18} />
                      </button>
                    </div>
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-0.5 shrink-0" />
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)} 
                        className="w-7 h-7 sm:w-8 h-8 rounded-lg cursor-pointer border-0 p-0 shrink-0"
                        title="Stroke Color"
                    />
                    <input 
                        type="range" 
                        min="1" 
                        max="20" 
                        value={strokeWidth} 
                        onChange={(e) => setStrokeWidth(Number(e.target.value))} 
                        className="w-16 sm:w-24 accent-indigo-500 shrink-0"
                        title="Stroke Width"
                    />
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-0.5 shrink-0" />
                    <button onClick={onUndo} className="p-1.5 sm:p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0" title="Undo"><Undo size={18} /></button>
                    <button onClick={onRedo} className="p-1.5 sm:p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0" title="Redo"><Redo size={18} /></button>
                    <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-0.5 shrink-0" />
                    <div className="shrink-0">
                        <FileUploader />
                    </div>
                </div>
            )}
            <div className="flex gap-1 sm:gap-1.5 shrink-0">
                <button onClick={() => setMode(mode === 'drawing' ? 'gallery' : 'drawing')} className={`p-1.5 sm:p-2 rounded-lg ${mode === 'gallery' ? 'bg-indigo-100 dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}`} title="Toggle Gallery"><Grid size={18} /></button>
                <button onClick={() => setFullscreen(!fullscreen)} className="p-1.5 sm:p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300" title="Toggle Fullscreen"><Maximize2 size={18} /></button>
            </div>
        </div>
    );
};
