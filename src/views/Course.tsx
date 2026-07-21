import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Info } from 'lucide-react';
import { useToast } from '../components/Toast';

export const Course: React.FC = () => {
  const { toast } = useToast();

  // Local state for interactive playgrounds and academy chapters
  const [activeCourseModule, setActiveCourseModule] = useState<number | null>(null);
  const [completedModules, setCompletedModules] = useState<Record<number, boolean>>({ 0: true });
  const [moduleShape, setModuleShape] = useState<'round' | 'sharp'>('round');
  const [moduleColorTriad, setModuleColorTriad] = useState<'serve' | 'grow' | 'lead'>('serve');
  const [moduleTypographyStyle, setModuleTypographyStyle] = useState<'tech' | 'serif'>('tech');
  const [promptSector, setPromptSector] = useState('Wellness 🌿');
  const [promptTone, setPromptTone] = useState('Organic & Minimalist 🌸');
  const [promptSubject, setPromptSubject] = useState('');
  const [moduleAnchorOffset, setModuleAnchorOffset] = useState<number>(0);

  return (
    <div className="flex-1 p-6 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <GraduationCap size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">Beginex Design Academy</h1>
            <p className="text-neutral-500 mt-0.5">Confidently master shape grammar, typography pairs, brand vibes, and expert prompting.</p>
          </div>
        </div>

        <div className="space-y-6 mt-8">
          {[
            { 
              id: 0,
              title: '1. The Psychology of Shapes', 
              desc: 'Why do round logos feel friendly and sharp logos feel aggressive?', 
              completed: completedModules[0],
              content: (
                <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                  <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                    Shapes create immediate subconscious reactions. **Rounded, organic paths** imply inclusion, softness, and empathy (friendly/natural). **Angular, sharp geometries** imply speed, precision, power, and engineering (high-performance/tech).
                  </p>
                  
                  <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive Shape Playground</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setModuleShape('round')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleShape === 'round' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                        >
                          Friendly Round
                        </button>
                        <button 
                          onClick={() => setModuleShape('sharp')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleShape === 'sharp' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                        >
                          Precise Sharp
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-8 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50">
                      <div 
                        className={`transition-all duration-500 flex items-center justify-center p-6 ${
                          moduleShape === 'round' 
                            ? 'w-32 h-32 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 shadow-lg shadow-teal-500/10' 
                            : 'w-32 h-32 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 [clip-path:polygon(50%_0%,_0%_100%,_100%_100%)] shadow-none translate-y-1'
                        }`}
                      >
                        <span className="font-display font-black text-sm tracking-widest text-center uppercase">
                          {moduleShape === 'round' ? 'Gentle' : 'Velocity'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-neutral-400 mt-6 text-center">
                        {moduleShape === 'round' 
                          ? 'Structure: Soft boundaries, Teal spectrum, Friendly sans-serif.' 
                          : 'Structure: High-contrast vertices, Purple spectrum, Aggressive display.'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            },
            { 
              id: 1,
              title: '2. Color Theory in Branding', 
              desc: 'Understanding the Srvel Triad: Serve (Turquoise), Grow (Yellow), Lead (Purple).', 
              completed: completedModules[1],
              content: (
                <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                  <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                    Colors are emotional signals. We categorize our custom brand guides using the **Srvel Triad**:
                    <br />- **Serve**: Turquoise/Teal. Evokes security, service, health, trust, and cleanliness.
                    <br />- **Grow**: Amber/Yellow. Evokes optimism, development, organic success, warmth, and discovery.
                    <br />- **Lead**: Royal Purple. Evokes excellence, luxury, leadership, innovation, and futuristic technology.
                  </p>

                  <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive Palette Vibe Tester</span>
                      <div className="flex gap-2">
                        {['serve', 'grow', 'lead'].map(triad => (
                          <button
                            key={triad}
                            onClick={() => setModuleColorTriad(triad as any)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${moduleColorTriad === triad ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                          >
                            {triad}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50">
                      {[
                        { 
                          id: 'serve', name: 'Turquoise / Mint', hex: '#0ea5e9', desc: 'Secure Trust',
                          activeBg: 'bg-sky-500 text-white', inactiveBg: 'bg-sky-50 dark:bg-zinc-950 text-sky-600'
                        },
                        { 
                          id: 'grow', name: 'Yellow / Gold', hex: '#eab308', desc: 'Warm Optimism',
                          activeBg: 'bg-yellow-500 text-black', inactiveBg: 'bg-yellow-50 dark:bg-zinc-950 text-yellow-600'
                        },
                        { 
                          id: 'lead', name: 'Purple / Violet', hex: '#8b5cf6', desc: 'Noble Innovation',
                          activeBg: 'bg-purple-500 text-white', inactiveBg: 'bg-purple-50 dark:bg-zinc-950 text-purple-600'
                        }
                      ].map(chip => (
                        <div 
                          key={chip.id} 
                          className={`p-4 rounded-xl flex flex-col justify-between h-28 border transition-all ${
                            moduleColorTriad === chip.id 
                              ? `${chip.activeBg} border-transparent scale-105 shadow-md` 
                              : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-100 dark:border-zinc-900 text-neutral-400'
                          }`}
                        >
                          <span className="text-[10px] font-mono font-bold tracking-wider uppercase">{chip.desc}</span>
                          <div>
                            <p className="font-bold text-sm tracking-tight">{chip.name}</p>
                            <p className="text-[10px] font-mono mt-0.5 opacity-80">{chip.hex}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            },
            { 
              id: 2,
              title: '3. Typography Pairings', 
              desc: 'Why we pair geometric sans-serifs with humanist displays.', 
              completed: completedModules[2],
              content: (
                <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                  <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                    Typography handles the verbal storytelling. A heavy, geometric display font establishes presence, while a high-legibility geometric sans-serif or mono subtitle guarantees easy communication across tiny displays or physical goods.
                  </p>

                  <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive Typography Pairer</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModuleTypographyStyle('tech')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleTypographyStyle === 'tech' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                        >
                          Modern Tech Mono
                        </button>
                        <button
                          onClick={() => setModuleTypographyStyle('serif')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleTypographyStyle === 'serif' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                        >
                          Editorial Luxury Serif
                        </button>
                      </div>
                    </div>

                    <div className="p-8 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50 text-center space-y-3">
                      <div className="transition-all duration-300">
                        {moduleTypographyStyle === 'tech' ? (
                          <div className="space-y-2">
                            <h4 className="text-3xl font-mono tracking-tight font-black uppercase text-zinc-900 dark:text-white">VERTEX.IO</h4>
                            <p className="text-xs font-mono tracking-widest text-indigo-600 uppercase">HIGH-FREQUENCY AGENTIC FORGE</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <h4 className="text-3xl font-serif tracking-normal font-bold italic text-zinc-900 dark:text-white">Vértex Studio</h4>
                            <p className="text-[10px] tracking-[0.2em] font-sans font-medium text-neutral-500 uppercase">FINE ART ARCHITECTURE & CURATION</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            },
            { 
              id: 3,
              title: '4. The AI Prompting Framework', 
              desc: 'How to write a brand brief that the Forge understands perfectly.', 
              completed: completedModules[3],
              content: (
                <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                  <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                    To get elite vector results from generative models, do not just say "make a logo." Standardize your structure using three building blocks: **Core Metaphor**, **Visual Treatment**, and **Negative Space/Boundary Constraints**.
                  </p>

                  <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider mb-1">1. Market Sector</label>
                        <select 
                          value={promptSector} 
                          onChange={(e) => setPromptSector(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-medium cursor-pointer"
                        >
                          <option value="Wellness 🌿">Wellness & Spa 🌿</option>
                          <option value="Cybertech 🤖">Artificial Intelligence 🤖</option>
                          <option value="Specialty Coffee ☕">Specialty Coffee ☕</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider mb-1">2. Brand Energy</label>
                        <select 
                          value={promptTone} 
                          onChange={(e) => setPromptTone(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-medium cursor-pointer"
                        >
                          <option value="Organic & Minimalist 🌸">Organic & Minimalist 🌸</option>
                          <option value="Futuristic Cyberpunk ⚡">Brutalist & Cyberpunk ⚡</option>
                          <option value="Editorial Classic 🏛️">Editorial Classic 🏛️</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider mb-1">3. Core Metaphor</label>
                        <input 
                          type="text" 
                          value={promptSubject} 
                          onChange={(e) => setPromptSubject(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-lead"
                          placeholder="e.g. Lotus blossom"
                        />
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 space-y-2 relative">
                      <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-bold">Constructed Brand Brief</span>
                      <p className="text-xs font-mono text-neutral-800 dark:text-zinc-200 leading-relaxed pr-16">
                        "A masterfully forged logo for a {promptSector} startup. Style is {promptTone}. Incorporating a clean, isolated vector mark of a {promptSubject}. Rendered on an absolute pure white background, flat vector paths, perfect visual balance, vector aesthetic, high contrast."
                      </p>
                      <button 
                        onClick={() => {
                          const promptText = `A masterfully forged logo for a ${promptSector} startup. Style is ${promptTone}. Incorporating a clean, isolated vector mark of a ${promptSubject}. Rendered on an absolute pure white background, flat vector paths, perfect visual balance, vector aesthetic, high contrast.`;
                          navigator.clipboard.writeText(promptText);
                          toast("Constructed prompt brief copied to clipboard!", 'success');
                        }}
                        className="absolute top-4 right-4 bg-brand-lead hover:bg-brand-lead/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded cursor-pointer"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              )
            },
            { 
              id: 4,
              title: '5. Manual Refinement & SVG', 
              desc: 'Cleaning up the anchor points on your generated logo.', 
              completed: completedModules[4],
              content: (
                <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                  <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                    Vector paths use mathematical coordinates (anchors and control handles) to build flawless, infinite resolutions. Learning to shift anchor properties allows you to turn raw, slightly wobbly shapes into perfectly clean, pristine geometries.
                  </p>

                  <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive SVG Anchor Manipulator</span>
                      <span className="text-xs font-mono text-brand-lead font-bold">Offset: {moduleAnchorOffset}px</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50 p-6 flex flex-col items-center justify-center gap-6">
                      {/* Live SVG container */}
                      <svg className="w-48 h-24 border border-dashed border-neutral-200 dark:border-zinc-800 rounded bg-neutral-50 dark:bg-zinc-950" viewBox="0 0 200 100">
                        {/* Curved path that shifts with slider */}
                        <path 
                          d={`M 20 50 Q ${100 + moduleAnchorOffset * 5} ${50 + moduleAnchorOffset * 4} 180 50`} 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="3" 
                          className="text-brand-lead" 
                        />
                        {/* Anchor Point representation */}
                        <circle cx="20" cy="50" r="5" className="fill-zinc-800 dark:fill-white" />
                        <circle cx="180" cy="50" r="5" className="fill-zinc-800 dark:fill-white" />
                        <circle cx={100 + moduleAnchorOffset * 5} cy={50 + moduleAnchorOffset * 4} r="6" className="fill-brand-lead animate-pulse" />
                        <line x1="20" y1="50" x2={100 + moduleAnchorOffset * 5} y2={50 + moduleAnchorOffset * 4} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1="180" y1="50" x2={100 + moduleAnchorOffset * 5} y2={50 + moduleAnchorOffset * 4} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                      </svg>

                      <div className="w-full max-w-xs space-y-1">
                        <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                          <span>Left Handle</span>
                          <span>Anchor Offset Control</span>
                          <span>Right Handle</span>
                        </div>
                        <input 
                          type="range"
                          min="-10"
                          max="10"
                          value={moduleAnchorOffset}
                          onChange={(e) => setModuleAnchorOffset(parseInt(e.target.value))}
                          className="w-full accent-brand-lead cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            },
          ].map((module) => {
            const isExpanded = activeCourseModule === module.id;
            return (
              <div 
                key={module.id} 
                className={`bg-white dark:bg-zinc-900 p-6 rounded-3xl border transition-all duration-300 ${isExpanded ? 'border-brand-lead shadow-md' : 'border-neutral-200 dark:border-zinc-800 hover:border-brand-lead/60'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div 
                    onClick={() => setActiveCourseModule(isExpanded ? null : module.id)}
                    className="flex-1 flex items-start gap-4 cursor-pointer"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-sm ${module.completed ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500'}`}>
                      {module.completed ? '✓' : module.id + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold font-display text-neutral-900 dark:text-white">{module.title}</h3>
                      <p className="text-neutral-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed">{module.desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCompletedModules(prev => ({
                        ...prev,
                        [module.id]: !prev[module.id]
                      }));
                    }}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border cursor-pointer shrink-0 ${
                      module.completed 
                        ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-950' 
                        : 'bg-white dark:bg-zinc-900 text-neutral-500 border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50'
                    }`}
                  >
                    {module.completed ? 'Completed' : 'Mark Done'}
                  </button>
                </div>

                {isExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    {module.content}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
