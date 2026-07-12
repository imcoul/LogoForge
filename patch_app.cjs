const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  `      {/* Global Navigation Rail */}
      <div className="w-full md:w-20 h-20 md:h-full bg-black flex flex-row md:flex-col items-center justify-around md:justify-start py-4 md:py-8 gap-4 md:gap-8 shrink-0 z-20">
        <div className="hidden md:flex w-10 h-10 bg-brand-lead rounded-xl items-center justify-center text-white font-bold mb-4 shadow-lg shadow-indigo-600/20">
          <Sparkles size={20} />
        </div>
        
        <button 
          onClick={() => setView('dashboard')}
          className={\`p-3 rounded-xl transition-all \${view === 'dashboard' ? 'bg-white dark:bg-zinc-900/20 text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-white hover:bg-white dark:bg-zinc-900/10'}\`}
          title="Asset Library / Workspace"
        >
          <FolderArchive size={24} />
        </button>
        
        <button 
          onClick={() => setView('studio')}
          className={\`p-3 rounded-xl transition-all \${view === 'studio' ? 'bg-white dark:bg-zinc-900/20 text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-white hover:bg-white dark:bg-zinc-900/10'}\`}
          title="Refinement Studio"
        >`,
  `      {/* Global Navigation Rail */}
      <div className="w-full md:w-20 h-20 md:h-full bg-white dark:bg-zinc-950 border-t md:border-t-0 md:border-r border-neutral-200 dark:border-zinc-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-4 md:py-8 gap-4 md:gap-8 shrink-0 z-20">
        <div className="hidden md:flex w-10 h-10 bg-brand-lead rounded-xl items-center justify-center text-white font-bold mb-4 shadow-lg shadow-indigo-600/20">
          <Sparkles size={20} />
        </div>
        
        <button 
          onClick={() => setView('dashboard')}
          className={\`p-3 rounded-xl transition-all \${view === 'dashboard' ? 'bg-indigo-50 dark:bg-zinc-800 text-brand-lead dark:text-indigo-400' : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900'}\`}
          title="Asset Library / Workspace"
        >
          <FolderArchive size={24} />
        </button>
        
        <button 
          onClick={() => setView('studio')}
          className={\`p-3 rounded-xl transition-all \${view === 'studio' ? 'bg-indigo-50 dark:bg-zinc-800 text-brand-lead dark:text-indigo-400' : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900'}\`}
          title="Refinement Studio"
        >`
);

code = code.replace(
  `                {/* Mobile Bottom Navigation */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-neutral-200 dark:border-zinc-800 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">`,
  `                {/* Mobile Bottom Navigation */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-neutral-200 dark:border-zinc-800 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">`
);

fs.writeFileSync('src/App.tsx', code);
