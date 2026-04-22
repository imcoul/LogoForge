import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Wand2, RefreshCw, Palette, Download, Move } from 'lucide-react';
import { generateLogoImage } from './services/geminiService';

const ANIMATIONS = {
  float: {
    animate: { y: [0, -15, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
  },
  pulse: {
    animate: { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] },
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
  },
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 8, repeat: Infinity, ease: "linear" }
  },
  pop: {
    animate: { scale: [0.8, 1.1, 1] },
    transition: { duration: 0.5, type: "spring", bounce: 0.6, repeat: Infinity, repeatDelay: 1 }
  },
  flip: {
    animate: { rotateY: 360 },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }
  }
};

type AnimationType = keyof typeof ANIMATIONS;

export default function App() {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<AnimationType>('float');

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please describe your company before generating.");
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      const url = await generateLogoImage(description);
      setLogoUrl(url);
    } catch (err: any) {
      console.error("Failed to generate logo:", err);
      setError(err.message || "An unexpected error occurred while generating the logo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentAnim = ANIMATIONS[activeAnimation];

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col md:flex-row shadow-inner">
      {/* Sidebar Control Panel */}
      <div className="w-full md:w-5/12 lg:w-[400px] bg-white border-r border-neutral-300 p-8 flex flex-col shrink-0 z-10 sticky top-0 md:h-screen overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 uppercase text-black flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            Logo Forge
          </h1>
          <p className="text-sm font-medium text-neutral-500 uppercase tracking-widest">
            AI-Powered Identity
          </p>
        </div>

        <div className="flex-1 space-y-8">
          <div className="space-y-3">
            <label htmlFor="description" className="block text-xs font-bold uppercase tracking-widest text-neutral-800">
              1. Company Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A modern coffee shop specializing in single-origin beans, warm, geometric, plant-based."
              className="w-full h-32 p-4 text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all resize-none font-medium placeholder:text-neutral-400"
            />
          </div>

          <div className="space-y-3">
             <label className="block text-xs font-bold uppercase tracking-widest text-neutral-800">
               2. Animation Mode
             </label>
             <div className="grid grid-cols-2 gap-2">
               {(Object.keys(ANIMATIONS) as AnimationType[]).map((anim) => (
                 <button
                   key={anim}
                   onClick={() => setActiveAnimation(anim)}
                   className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all ${
                     activeAnimation === anim 
                       ? 'bg-black text-white border-black shadow-[0_4px_12px_rgba(0,0,0,0.1)]' 
                       : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400'
                   }`}
                 >
                   <Move size={14} />
                   {anim}
                 </button>
               ))}
             </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-medium border border-red-200 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-neutral-200">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_12px_24px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:translate-y-0"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" />
                Forging...
              </>
            ) : (
              <>
                <Palette />
                Generate Logo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-neutral-100 relative overflow-hidden flex items-center justify-center min-h-[500px]">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 border-[rgba(0,0,0,0.03)] filter grid" style={{ backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <AnimatePresence mode="wait">
          {logoUrl ? (
            <motion.div
              key="logo-preview"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative z-10 flex flex-col items-center gap-8"
            >
               <motion.div
                  {...currentAnim}
                  className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-white shadow-[0_20px_60px_rgba(0,0,0,0.1)] border break-words p-4 flex items-center justify-center overflow-hidden border-neutral-200"
               >
                 <img 
                    src={logoUrl} 
                    alt="Generated Logo" 
                    className="w-full h-full object-contain filter drop-shadow-sm" 
                    referrerPolicy="no-referrer"
                 />
               </motion.div>
               
               <div className="flex items-center gap-4">
                  <a
                    href={logoUrl}
                    download="generated-logo.png"
                    target="_blank"
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-neutral-200 shadow-sm rounded-full text-sm font-bold tracking-wider text-neutral-800 hover:bg-neutral-50 transition-colors"
                  >
                    <Download size={16} />
                    DOWNLOAD
                  </a>
               </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 flex flex-col items-center text-center max-w-sm px-6"
            >
              <div className="w-32 h-32 mb-6 rounded-full border-2 border-dashed border-neutral-400 flex items-center justify-center text-neutral-400 bg-white/50">
                <Wand2 size={40} className="opacity-50" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-800 mb-2">Blank Canvas</h2>
              <p className="text-neutral-500 font-medium">
                Describe your company on the left to forge your new logo.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
