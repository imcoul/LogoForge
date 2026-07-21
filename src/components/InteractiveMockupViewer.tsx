import React from 'react';

import { motion } from 'motion/react';
import { Sliders, RotateCw, Layers, Compass, Wand2 } from 'lucide-react';
import { Project } from '../store';

interface InteractiveMockupViewerProps {
  activeProject: Project;
  selectedTemplate: 'card' | 'splash' | 'billboard';
  setSelectedTemplate: (val: 'card' | 'splash' | 'billboard') => void;
  cardBg: 'cream' | 'charcoal' | 'forest';
  setCardBg: (val: 'cream' | 'charcoal' | 'forest') => void;
  mockupRotateX: number;
  setMockupRotateX: (val: number) => void;
  mockupRotateY: number;
  setMockupRotateY: (val: number) => void;
  mockupRotateZ: number;
  setMockupRotateZ: (val: number) => void;
  mockupScale: number;
  setMockupScale: (val: number) => void;
  mockupPerspective: number;
  setMockupPerspective: (val: number) => void;
  mockupBlendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'difference' | 'color-dodge';
  setMockupBlendMode: (val: 'normal' | 'multiply' | 'screen' | 'overlay' | 'difference' | 'color-dodge') => void;
}

export const InteractiveMockupViewer: React.FC<InteractiveMockupViewerProps> = ({
  activeProject,
  selectedTemplate,
  setSelectedTemplate,
  cardBg,
  setCardBg,
  mockupRotateX,
  setMockupRotateX,
  mockupRotateY,
  setMockupRotateY,
  mockupRotateZ,
  setMockupRotateZ,
  mockupScale,
  setMockupScale,
  mockupPerspective,
  setMockupPerspective,
  mockupBlendMode,
  setMockupBlendMode,
}) => {
  const applyPresetAngle = (preset: 'front' | 'isometric' | 'tilt' | 'dramatic') => {
    switch (preset) {
      case 'front':
        setMockupRotateX(0);
        setMockupRotateY(0);
        setMockupRotateZ(0);
        setMockupScale(1.0);
        setMockupPerspective(1200);
        break;
      case 'isometric':
        setMockupRotateX(15);
        setMockupRotateY(-20);
        setMockupRotateZ(5);
        setMockupScale(1.0);
        setMockupPerspective(1200);
        break;
      case 'tilt':
        setMockupRotateX(5);
        setMockupRotateY(15);
        setMockupRotateZ(-2);
        setMockupScale(1.0);
        setMockupPerspective(1200);
        break;
      case 'dramatic':
        setMockupRotateX(25);
        setMockupRotateY(-35);
        setMockupRotateZ(10);
        setMockupScale(1.05);
        setMockupPerspective(1000);
        break;
    }
  };

  const sanitizeSVG = (svgStr: string) => {
    // Basic sanitization/cleanup of user forged SVGs
    if (!svgStr) return '';
    return svgStr
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '');
  };

  return (
    <div className="space-y-8">
      {/* Selector for default templates */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'card', name: 'Luxury Business Card 💳' },
          { id: 'splash', name: 'Mobile App Splash Screen 📱' },
          { id: 'billboard', name: 'Urban Billboard 🏢' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              const id = t.id as 'card' | 'splash' | 'billboard';
              setSelectedTemplate(id);
              if (id === 'card') {
                setMockupRotateX(15);
                setMockupRotateY(-20);
                setMockupRotateZ(5);
              } else if (id === 'splash') {
                setMockupRotateX(5);
                setMockupRotateY(15);
                setMockupRotateZ(-2);
              } else if (id === 'billboard') {
                setMockupRotateX(5);
                setMockupRotateY(-10);
                setMockupRotateZ(0);
              }
            }}
            className={`px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${selectedTemplate === t.id ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm' : 'bg-white dark:bg-zinc-900 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Active 3D Preview Viewport */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-8 rounded-3xl space-y-6">
          <div className="flex justify-between items-center border-b border-neutral-100 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500">
                {selectedTemplate === 'card' && 'Business Card Customizer'}
                {selectedTemplate === 'splash' && 'Mobile Launch Experience'}
                {selectedTemplate === 'billboard' && 'Urban Architectural Signage'}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">Drag sliders or hover to inspect perspective projection.</p>
            </div>

            {selectedTemplate === 'card' && (
              <div className="flex gap-1">
                {[
                  { id: 'cream', name: 'Cream', bg: 'bg-[#FDFBF7] text-[#3c362d]' },
                  { id: 'charcoal', name: 'Noir', bg: 'bg-[#121212] text-[#f7f7f7]' },
                  { id: 'forest', name: 'Forest', bg: 'bg-[#182a20] text-[#eae2cf]' }
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setCardBg(preset.id as any)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all cursor-pointer ${cardBg === preset.id ? 'border-brand-lead ring-2 ring-brand-lead/20 bg-neutral-50 dark:bg-zinc-800' : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100'}`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div 
            className="flex items-center justify-center p-6 md:p-12 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-100 dark:border-zinc-800/50 min-h-[360px] overflow-hidden" 
            style={{ perspective: `${mockupPerspective}px` }}
          >
            {/* Template Card */}
            {selectedTemplate === 'card' && (
              <div 
                style={{ transform: `rotateX(${mockupRotateX}deg) rotateY(${mockupRotateY}deg) rotateZ(${mockupRotateZ}deg) scale(${mockupScale})` }}
                className={`w-full max-w-sm aspect-[1.75/1] rounded-2xl shadow-2xl border border-neutral-200/40 p-6 md:p-8 flex flex-col justify-between transition-transform duration-100 relative overflow-hidden ${
                  cardBg === 'cream' ? 'bg-[#FDFBF7] text-[#3c362d] border-[#ebe3d5]' :
                  cardBg === 'charcoal' ? 'bg-[#161617] text-[#eaeaea] border-[#2c2c2d]' :
                  'bg-[#1a2c22] text-[#efe8db] border-[#294234]'
                }`}
              >
                {/* Textured effect */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
                
                {/* Subtle lighting overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                
                <div className="flex justify-between items-start z-10">
                  <div className="w-12 h-12 bg-white/10 rounded-xl p-1.5 flex items-center justify-center backdrop-blur-sm border border-white/20">
                    {activeProject.logoUrl ? (
                      <img 
                        src={activeProject.logoUrl} 
                        alt="logo" 
                        className="max-w-full max-h-full object-contain filter drop-shadow-md" 
                        style={{ mixBlendMode: mockupBlendMode }}
                      />
                    ) : (
                      <Wand2 className="text-current opacity-40 w-6 h-6" />
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-sm tracking-tight">{activeProject.brandGuide?.brandName || activeProject.name}</h4>
                    <p className="text-[8px] uppercase tracking-widest opacity-80 mt-0.5">Est. {new Date(activeProject.createdAt).getFullYear()}</p>
                  </div>
                </div>

                <div className="z-10 flex justify-between items-end border-t border-current/10 pt-4">
                  <div>
                    <p className="font-bold text-[10px]">Alex Rivers</p>
                    <p className="text-[8px] uppercase tracking-wider opacity-75 mt-0.5">Brand Director</p>
                  </div>
                  <div className="text-right text-[8px] font-mono opacity-80 leading-relaxed">
                    <p>hello@{(activeProject.brandGuide?.brandName || 'studio').toLowerCase().replace(/\s+/g, '')}.com</p>
                    <p>+1 (555) 902-1810</p>
                  </div>
                </div>
              </div>
            )}

            {/* Template Splash */}
            {selectedTemplate === 'splash' && (
              <div 
                style={{ transform: `rotateX(${mockupRotateX}deg) rotateY(${mockupRotateY}deg) rotateZ(${mockupRotateZ}deg) scale(${mockupScale})` }}
                className="w-56 aspect-[9/19] bg-[#0c0c0e] rounded-[30px] shadow-2xl border-[5px] border-[#27272a] p-3 flex flex-col justify-between relative overflow-hidden text-white transition-transform duration-100"
              >
                {/* Ambient screen glow */}
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-lead/20 rounded-full blur-3xl pointer-events-none"></div>
                
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#27272a] rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-zinc-900 rounded-full mr-2"></div>
                  <div className="w-6 h-0.5 bg-zinc-800 rounded-full"></div>
                </div>

                {/* Phone Status Bar */}
                <div className="flex justify-between items-center text-[8px] font-mono px-2 pt-1 z-10 opacity-80">
                  <span>09:41</span>
                  <div className="flex items-center gap-1">
                    <span>LTE</span>
                    <div className="w-3.5 h-2 border border-white/80 rounded-xs p-0.5 flex items-center"><div className="w-full h-full bg-white rounded-2xs"></div></div>
                  </div>
                </div>

                {/* Central Brand Visual */}
                <div className="flex flex-col items-center justify-center flex-1 gap-3 z-10 mt-8">
                  <motion.div 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 bg-white rounded-full p-3 flex items-center justify-center shadow-lg border border-white/10"
                  >
                    {activeProject.logoUrl ? (
                      <img 
                        src={activeProject.logoUrl} 
                        alt="logo" 
                        className="w-full h-full object-contain" 
                        style={{ mixBlendMode: mockupBlendMode }}
                      />
                    ) : (
                      <Wand2 className="text-zinc-300 w-8 h-8" />
                    )}
                  </motion.div>
                  <div className="text-center">
                    <h4 className="font-bold text-sm font-display tracking-tight text-white">{activeProject.brandGuide?.brandName || activeProject.name}</h4>
                    <p className="text-[8px] text-zinc-500 font-sans tracking-wide mt-0.5">Design Studio Forge</p>
                  </div>
                </div>

                {/* Loading Bottom Indicators */}
                <div className="flex flex-col items-center gap-3 z-10 pb-1">
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-brand-lead rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1 h-1 bg-brand-lead rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-brand-lead rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <div className="w-16 h-0.5 bg-zinc-800 rounded-full"></div>
                </div>
              </div>
            )}

            {/* Template Billboard */}
            {selectedTemplate === 'billboard' && (
              <div 
                style={{ transform: `rotateX(${mockupRotateX}deg) rotateY(${mockupRotateY}deg) rotateZ(${mockupRotateZ}deg) scale(${mockupScale})` }}
                className="w-full max-w-md aspect-[16/9] bg-[#141517] rounded-xl shadow-2xl relative overflow-hidden border border-zinc-800 p-6 flex flex-col justify-between text-white transition-transform duration-100"
              >
                {/* Grid texture background */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                
                <div className="flex justify-between items-start z-10">
                  <div className="p-2.5 border-l border-brand-lead">
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Studio Showcase</span>
                    <h4 className="text-sm font-bold font-display tracking-wide mt-0.5">{activeProject.brandGuide?.brandName || activeProject.name}</h4>
                  </div>
                  <span className="text-[8px] bg-zinc-800 text-zinc-400 font-mono px-1.5 py-0.5 rounded border border-zinc-700">BILLBOARD ID #812</span>
                </div>

                <div className="flex justify-center items-center flex-1 z-10 py-2">
                  <div className="w-20 h-20 bg-[#18191c] rounded-xl border border-zinc-800/80 p-3 flex items-center justify-center shadow-2xl shadow-indigo-500/10 relative group">
                    {/* Neon halo glow */}
                    <div className="absolute inset-0 rounded-xl bg-brand-lead/10 blur-xl opacity-80 pointer-events-none"></div>
                    {activeProject.logoUrl ? (
                      <img 
                        src={activeProject.logoUrl} 
                        alt="logo" 
                        className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(99,102,241,0.4)] z-10" 
                        style={{ mixBlendMode: mockupBlendMode }}
                      />
                    ) : (
                      <Wand2 className="text-zinc-600 w-8 h-8" />
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end z-10 text-[8px] text-zinc-500 font-medium">
                  <p>BRUTALIST ARCHITECTURE DISTRICT</p>
                  <p>© FORGEL OUTDOOR MEDIA</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Compositing & 3D Studio Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Alignment Presets */}
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-800 dark:text-zinc-200">
              <Compass size={16} className="text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Macro Angle Presets</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'front', label: 'Frontal Plane', desc: '0° Flat Ortho' },
                { id: 'isometric', label: 'Isometric Skew', desc: 'Default Symmetrical' },
                { id: 'tilt', label: 'Dynamic Tilt', desc: 'Mobile Angle' },
                { id: 'dramatic', label: 'Dramatic Pitch', desc: 'Aggressive 3D' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPresetAngle(p.id as any)}
                  className="p-2.5 text-left bg-neutral-50 hover:bg-neutral-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-neutral-200 dark:border-zinc-800/80 rounded-xl transition-all cursor-pointer select-none"
                >
                  <div className="text-[11px] font-bold text-neutral-800 dark:text-zinc-200">{p.label}</div>
                  <div className="text-[9px] text-neutral-400 font-mono mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-6 rounded-3xl space-y-5 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-800 dark:text-zinc-200 border-b border-neutral-100 dark:border-zinc-800 pb-3">
              <Sliders size={16} className="text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">3D Coordinate Engine</h4>
            </div>

            <div className="space-y-4">
              {/* Pitch RotateX */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-neutral-500">X-Axis Pitch</span>
                  <span className="font-bold text-purple-600">{mockupRotateX}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={mockupRotateX}
                  onChange={(e) => setMockupRotateX(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Yaw RotateY */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-neutral-500">Y-Axis Yaw</span>
                  <span className="font-bold text-purple-600">{mockupRotateY}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={mockupRotateY}
                  onChange={(e) => setMockupRotateY(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Roll RotateZ */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-neutral-500">Z-Axis Roll</span>
                  <span className="font-bold text-purple-600">{mockupRotateZ}°</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={mockupRotateZ}
                  onChange={(e) => setMockupRotateZ(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Perspective */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-neutral-500">Perspective Depth</span>
                  <span className="font-bold text-purple-600">{mockupPerspective}px</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="2000"
                  step="50"
                  value={mockupPerspective}
                  onChange={(e) => setMockupPerspective(parseInt(e.target.value))}
                  className="w-full h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Scale */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="font-semibold text-neutral-500">Mockup Scale</span>
                  <span className="font-bold text-purple-600">{Math.round(mockupScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={mockupScale}
                  onChange={(e) => setMockupScale(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>
          </div>

          {/* Blend Mode Overlay Selector */}
          <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-6 rounded-3xl space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-800 dark:text-zinc-200">
              <Layers size={16} className="text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Physical Blend Compositing</h4>
            </div>
            
            <p className="text-[10px] text-neutral-400 leading-normal">
              Select standard layer blending profiles to physically composite raster or vector signatures seamlessly over textured mockup assets.
            </p>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'normal', name: 'Normal' },
                { id: 'multiply', name: 'Multiply' },
                { id: 'screen', name: 'Screen' },
                { id: 'overlay', name: 'Overlay' },
                { id: 'difference', name: 'Diff' },
                { id: 'color-dodge', name: 'Dodge' }
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => setMockupBlendMode(b.id as any)}
                  className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border text-center transition-all cursor-pointer ${
                    mockupBlendMode === b.id 
                      ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                      : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-200 dark:border-zinc-800 text-neutral-700 dark:text-zinc-400 hover:bg-neutral-100'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

