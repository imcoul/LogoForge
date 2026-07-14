const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

const replacement = `
                {/* Desktop Tabs (Old) */}
                {!useConsolidatedWorkspace && (
                  <div className="relative z-20 hidden md:flex justify-start md:justify-center pt-6 pb-2 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-md px-4 overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex gap-2 p-1 bg-neutral-200 dark:bg-zinc-800 rounded-full shrink-0">
                      <button onClick={() => setActiveTab('preview')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'preview' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><ImageIcon size={14} /> {t('studio_tabs_preview')}</button>
                      <button onClick={() => setActiveTab('draw')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'draw' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Hammer size={14} /> DRAW</button>
                      <button onClick={() => setActiveTab('precision')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'precision' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><FileText size={14} /> PRECISION</button>
                      <button onClick={() => setActiveTab('mockups')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'mockups' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Layers size={14} /> MOCKUPS</button>
                      <button onClick={() => setActiveTab('competitor')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'competitor' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Target size={14} /> COMPETITOR</button>
                      <button onClick={() => setActiveTab('ecosystem')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'ecosystem' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Globe size={14} /> ECOSYSTEM</button>
                      <button onClick={() => setActiveTab('guide')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'guide' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><BookOpen size={14} /> {t('studio_tabs_guide')}</button>
                      <button onClick={() => setActiveTab('refine')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'refine' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Sparkles size={14} /> {t('studio_tabs_refine')}</button>
                      <button onClick={() => setActiveTab('sonic')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'sonic' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Music size={14} /> {t('studio_tabs_sonic')}</button>
                      <button onClick={() => setActiveTab('comments')} className={\`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeTab === 'comments' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><MessageSquare size={14} /> {t('studio_tabs_collab')}</button>
                    </div>
                    
                    <button onClick={handleExportNotion} className="ml-auto flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0">
                      <Share2 size={14} /> {t('export_notion')}
                    </button>
                  </div>
                )}
                
                {/* Consolidated Workspace Tabs */}
                {useConsolidatedWorkspace && (
                  <div className="relative z-20 hidden md:flex justify-start md:justify-center pt-6 pb-2 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-md px-4 overflow-x-auto no-scrollbar scroll-smooth">
                    <div className="flex gap-2 p-1 bg-neutral-200 dark:bg-zinc-800 rounded-full shrink-0">
                      <button onClick={() => setActiveWorkspace('sandbox')} className={\`px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeWorkspace === 'sandbox' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Wand2 size={14} /> LOGO SANDBOX</button>
                      <button onClick={() => setActiveWorkspace('workbench')} className={\`px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeWorkspace === 'workbench' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Hammer size={14} /> VECTOR WORKBENCH</button>
                      <button onClick={() => setActiveWorkspace('identity')} className={\`px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeWorkspace === 'identity' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><BookOpen size={14} /> IDENTITY PORTAL</button>
                      <button onClick={() => setActiveWorkspace('strategy')} className={\`px-6 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 \${activeWorkspace === 'strategy' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}\`}><Target size={14} /> STRATEGY CENTRE</button>
                    </div>
                    
                    <button onClick={handleExportNotion} className="ml-auto flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0">
                      <Share2 size={14} /> {t('export_notion')}
                    </button>
                  </div>
                )}
`;

content = content.replace(
  /\{\/\* Desktop Tabs \*\/\}(.|\n)*?\{\/\* Mobile Bottom Navigation \*\/\}/gm, 
  replacement + '\n\n                {/* Mobile Bottom Navigation */}'
);

fs.writeFileSync('./src/App.tsx', content);
