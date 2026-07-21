import React, { useState } from 'react';
import { X, BookOpen, Sparkles, Layers, PenTool, HelpCircle, ArrowRight, CheckCircle, Sliders } from 'lucide-react';
import { Modal } from './ui/Modal';

interface ForgeAcademyProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgeAcademy: React.FC<ForgeAcademyProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'whiteboard' | 'precision' | 'workflow'>('whiteboard');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="forge-academy-title"
      className="max-w-3xl max-h-[85dvh]"
      hideCloseButton={true}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-neutral-150 dark:border-zinc-800 flex items-center justify-between bg-neutral-50 dark:bg-zinc-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500 text-white rounded-2xl shadow-md shadow-indigo-500/20 shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 id="forge-academy-title" className="text-xl font-display font-bold text-neutral-900 dark:text-white">Forge Design Academy</h2>
              <p className="text-xs text-neutral-500">Master the Whiteboard, Precision Studio & Bi-Directional Workflow</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-neutral-200 dark:hover:bg-zinc-800 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-neutral-150 dark:border-zinc-800 p-2 gap-1 bg-white dark:bg-zinc-900">
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'whiteboard' ? 'bg-indigo-500 text-white shadow-md' : 'text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'}`}
          >
            <Sparkles size={14} /> 1. Whiteboard Canvas
          </button>
          <button
            onClick={() => setActiveTab('precision')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'precision' ? 'bg-indigo-500 text-white shadow-md' : 'text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'}`}
          >
            <Sliders size={14} /> 2. Precision SVG Studio
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'workflow' ? 'bg-indigo-500 text-white shadow-md' : 'text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'}`}
          >
            <ArrowRight size={14} /> 3. Hybrid Workflow
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* TAB 1: Whiteboard Canvas */}
          {activeTab === 'whiteboard' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-zinc-100">Welcome to the Freeform Whiteboard!</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  The Whiteboard is designed for rapid brainstorming, initial sketches, and shape blocking. You can sketch freehand using custom pencil weights or inject geometrically-perfect shapes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-indigo-500 block">🎨 Drawing Tools</span>
                  <ul className="text-xs text-neutral-600 dark:text-zinc-400 space-y-2">
                    <li className="flex gap-2">
                      <strong className="text-indigo-600 dark:text-indigo-400">Select Tool:</strong> Drag drawn sketches, resize rectangles or ellipses, and customize properties.
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-indigo-600 dark:text-indigo-400">Pencil Tool:</strong> Sketch natural hand-drawn curves. Built-in path smoothing removes jitter.
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-indigo-600 dark:text-indigo-400">Shapes:</strong> Draw straight lines, clean circles/ellipses, and rounded rectangles.
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">📐 Precision Rulers & Snaps</span>
                  <ul className="text-xs text-neutral-600 dark:text-zinc-400 space-y-2">
                    <li className="flex gap-2">
                      <strong className="text-emerald-600 dark:text-emerald-400">Standard Grid & Rulers:</strong> View pixel ticks with dynamic mouse tracking and snapping (10px spacing).
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-emerald-600 dark:text-emerald-400">Diagonal Overlays:</strong> Overlay 45° and 135° blueprint guides for isometric sketching.
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-emerald-600 dark:text-emerald-400">Circular Overlays:</strong> Draw perfect concentric circular guides to organize emblem badges.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-zinc-300">Pro Tips for Whiteboard</h4>
                <div className="space-y-2 text-xs text-neutral-500 leading-relaxed">
                  <p className="flex gap-2 items-start">
                    <CheckCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    <span>Select any shape (rectangle or circle) to slide open its <strong>Properties Panel</strong>. From there, you can round corners, add colorful fills, tweak stroke widths, and dynamically resize its bounds!</span>
                  </p>
                  <p className="flex gap-2 items-start">
                    <CheckCircle size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                    <span>Clicking <strong>Send to SVG Editor</strong> on any sketch automatically parses it and pushes it into the Precision SVG Studio as a production-grade vector element!</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Precision SVG Studio */}
          {activeTab === 'precision' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-zinc-100">Welcome to Precision SVG Studio!</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Precision Studio treats curves as mathematics. Unlike the whiteboard, every stroke has coordinate anchors (nodes) that you can drag, shift, and fine-tune for millimeter-perfect logos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100/50 dark:border-purple-900/30 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-purple-600 block">🎛️ Node Coordinates Panel</span>
                  <ul className="text-xs text-neutral-600 dark:text-zinc-400 space-y-2">
                    <li className="flex gap-2">
                      <strong className="text-purple-600 dark:text-purple-400">Interactive Anchors:</strong> Toggle "Precision Handles" to display circular drag nodes directly on the canvas.
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-purple-600 dark:text-purple-400">Manual Coords:</strong> Tune numerical coordinates in the sidebar using precise input sliders (X/Y up to your grid size!).
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">🔬 Navigation & Magnifier Loupes</span>
                  <ul className="text-xs text-neutral-600 dark:text-zinc-400 space-y-2">
                    <li className="flex gap-2">
                      <strong className="text-amber-600 dark:text-amber-400">Pinch & Zoom:</strong> Use the zoom controls or a trackpad pinch to magnify the vector pad (up to 500% zoom!).
                    </li>
                    <li className="flex gap-2">
                      <strong className="text-amber-600 dark:text-amber-400">Zoom Loupe:</strong> When dragging a node, a real-time magnifier loupe pops up, showing exactly where the coordinates snap.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-5 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-black uppercase text-neutral-700 dark:text-zinc-300">How to Master Bezier & Drawing Tools</h4>
                <div className="space-y-3 text-xs text-neutral-500 leading-relaxed">
                  <p className="flex gap-2 items-start">
                    <strong className="text-indigo-600 dark:text-indigo-400 shrink-0">1. Brush Tool:</strong> Perfect for freehand drawing.
                  </p>
                  <p className="flex gap-2 items-start">
                    <strong className="text-indigo-600 dark:text-indigo-400 shrink-0">2. Auto-Bezier:</strong> Click points on the canvas. The editor automatically generates a smooth, curved Bezier vector path connecting them.
                  </p>
                  <p className="flex gap-2 items-start">
                    <strong className="text-indigo-600 dark:text-indigo-400 shrink-0">3. Pen Dots Tool:</strong> Place exact vertices (corners) to draw precise straight-edged geometric polygons.
                  </p>
                  <p className="flex gap-2 items-start">
                    <strong className="text-emerald-600 dark:text-emerald-400 shrink-0">Grid Size Selector:</strong> Toggle between <strong>200x200</strong>, <strong>400x400</strong>, or <strong>800x800</strong> canvas grids to expand your design space!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Bi-Directional Workflow */}
          {activeTab === 'workflow' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-neutral-800 dark:text-zinc-100">The Power of the Hybrid Bridge</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">
                  Forge logos aren't made in isolation. By leveraging the bi-directional bridge, you can shift sketches back and forth between organic hand-drawings and mathematically precise vector lines.
                </p>
              </div>

              <div className="space-y-4">
                <div className="relative pl-8 border-l-2 border-indigo-500 space-y-1">
                  <div className="absolute left-[-9px] top-0.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-zinc-900" />
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-white">Step 1: Ideation & Sketching</h4>
                  <p className="text-xs text-neutral-500">Open the Whiteboard, toggle standard circular grids, and sketch out a basic emblem or geometry concept.</p>
                </div>

                <div className="relative pl-8 border-l-2 border-indigo-500 space-y-1">
                  <div className="absolute left-[-9px] top-0.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-zinc-900" />
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-white">Step 2: Sending to Precision Studio</h4>
                  <p className="text-xs text-neutral-500">Select your sketched rectangle, ellipse, or path. Open the properties panel, and click <strong className="text-indigo-500">Send to SVG Editor</strong>.</p>
                </div>

                <div className="relative pl-8 border-l-2 border-indigo-500 space-y-1">
                  <div className="absolute left-[-9px] top-0.5 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-zinc-900" />
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-white">Step 3: Coordinate Tuning & Symmetry</h4>
                  <p className="text-xs text-neutral-500">Switch to the Precision Studio tab. Drag nodes to tune Bezier anchors and input coordinates to establish mathematical symmetry.</p>
                </div>

                <div className="relative pl-8 space-y-1">
                  <div className="absolute left-[-7px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-zinc-900" />
                  <h4 className="text-sm font-bold text-neutral-800 dark:text-white">Step 4: Push back for additional layers</h4>
                  <p className="text-xs text-neutral-500">Found a path layer you want to expand with more annotations or doodles? Select the layer and click <strong className="text-emerald-500">Send to Whiteboard</strong> to keep building on top!</p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Ready to design something beautiful?</span>
                <button 
                  onClick={onClose}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 transition-colors shadow-lg cursor-pointer"
                >
                  Let's Begin!
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-150 dark:border-zinc-800 flex justify-end bg-neutral-50 dark:bg-zinc-950 shrink-0">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 bg-neutral-200 dark:bg-zinc-800 hover:bg-neutral-300 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-200 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
          >
            Close Guide
          </button>
        </div>

      </div>
    </Modal>
  );
};
