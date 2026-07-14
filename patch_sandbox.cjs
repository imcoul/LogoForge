const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

function extractBlock(startStr, endStr) {
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) return null;
  const endIdx = content.indexOf(endStr, startIdx);
  if (endIdx === -1) return null;
  return content.substring(startIdx + startStr.length, endIdx);
}

// Preview block in old tabs is: activeTab === 'preview' ? ( ... ) : activeTab === 'draw'
const previewBlock = extractBlock(`) : activeTab === 'preview' ? (`, `) : activeTab === 'draw' ? (`);

// We want to update the sandbox block
const sandboxStart = `{activeWorkspace === 'sandbox' && (`;
const sandboxEnd = `                      </div>
                    )}`;

const startIndex = content.indexOf(sandboxStart);
const endIndex = content.indexOf(sandboxEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newSandboxBlock = `{activeWorkspace === 'sandbox' && (
                      <div className="flex-1 flex flex-col lg:flex-row w-full h-full relative">
                        {/* Logo Sandbox View */}
                        <div className="w-full lg:w-[400px] bg-white dark:bg-zinc-900 border-r border-neutral-200 dark:border-zinc-800 flex flex-col z-20 shadow-xl">
                          <div className="p-4 border-b border-neutral-200 dark:border-zinc-800 shrink-0">
                            <h2 className="text-xl font-bold font-display tracking-tight mb-4">Logo Sandbox</h2>
                            <div className="flex gap-2">
                              <button onClick={() => setSandboxSubTab('preview')} className={\`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-colors \${sandboxSubTab === 'preview' ? 'bg-brand-lead text-white' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-200'}\`}>Generation</button>
                              <button onClick={() => setSandboxSubTab('refine')} className={\`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-colors \${sandboxSubTab === 'refine' ? 'bg-brand-lead text-white' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-200'}\`}>Refine</button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6">
                            {sandboxSubTab === 'preview' && (
                              <div className="space-y-6">
                                {/* Generation Form */}
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 mb-2">{t('brand_name')}</label>
                                  <input 
                                    type="text" 
                                    value={brandName}
                                    onChange={(e) => setBrandName(e.target.value)}
                                    placeholder={t('brand_name_placeholder')}
                                    className="w-full bg-neutral-100 dark:bg-zinc-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-lead dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 mb-2">{t('industry')}</label>
                                  <input 
                                    type="text" 
                                    value={industry}
                                    onChange={(e) => setIndustry(e.target.value)}
                                    placeholder={t('industry_placeholder')}
                                    className="w-full bg-neutral-100 dark:bg-zinc-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-lead dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 mb-2">Creative Direction</label>
                                  <textarea 
                                    value={creativeDirection}
                                    onChange={(e) => setCreativeDirection(e.target.value)}
                                    placeholder="Describe the vibe, metaphor, or specific symbols..."
                                    className="w-full bg-neutral-100 dark:bg-zinc-800 border-none rounded-xl p-3 min-h-[100px] focus:ring-2 focus:ring-brand-lead dark:text-white resize-none"
                                  />
                                </div>
                                <button
                                  onClick={handleGenerateLogo}
                                  disabled={isGenerating || !brandName || !industry}
                                  className="w-full py-4 bg-brand-lead hover:bg-brand-lead/90 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                                  {isGenerating ? 'Forging Logo...' : 'Forge Initial Concept'}
                                </button>
                                
                                {activeProject?.history && activeProject.history.length > 0 && (
                                  <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-zinc-800">
                                    <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-neutral-500">History Trail</h3>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                      {activeProject.history.map((item, idx) => (
                                        <button 
                                          key={idx}
                                          onClick={() => {
                                            updateProject(activeProject.id, { 
                                              logoUrl: item.url,
                                              svgSource: item.svg
                                            });
                                          }}
                                          className="relative shrink-0 w-16 h-16 rounded-xl border border-neutral-200 dark:border-zinc-700 overflow-hidden group hover:border-brand-lead transition-colors focus:outline-none focus:ring-2 focus:ring-brand-lead"
                                        >
                                          {item.url ? (
                                            <img src={item.url} alt="History" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-neutral-400">Vector</div>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {sandboxSubTab === 'refine' && (
                              <div className="space-y-6">
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                  <h3 className="font-bold text-sm text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-2"><Sparkles size={16} /> Concept Refinement</h3>
                                  <p className="text-xs text-indigo-700 dark:text-indigo-400">Iterate on the current concept using AI instructions. The AI will preserve the core structure and modify based on your input.</p>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-zinc-400 mb-2">Modification Prompt</label>
                                  <textarea 
                                    value={creativeDirection}
                                    onChange={(e) => setCreativeDirection(e.target.value)}
                                    placeholder="e.g. Make the edges sharper, change to a geometric style..."
                                    className="w-full bg-neutral-100 dark:bg-zinc-800 border-none rounded-xl p-3 min-h-[100px] focus:ring-2 focus:ring-brand-lead dark:text-white resize-none"
                                  />
                                </div>
                                <button
                                  onClick={handleGenerateLogo}
                                  disabled={isGenerating || !activeProject?.logoUrl}
                                  className="w-full py-3 bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                  {isGenerating ? 'Refining...' : 'Apply Refinement'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-1 p-6 lg:p-12 flex flex-col items-center justify-center relative bg-neutral-50/50 dark:bg-zinc-950/50">
                           {!activeProject?.logoUrl ? (
                              <div className="flex flex-col items-center justify-center text-center max-w-sm">
                                <div className="w-32 h-32 mb-6 rounded-full border-2 border-dashed border-neutral-300 dark:border-zinc-700 flex items-center justify-center text-neutral-400 bg-white dark:bg-zinc-900"><Wand2 size={40} className="opacity-50" /></div>
                                <h2 className="text-2xl font-display font-bold tracking-tight text-neutral-800 dark:text-zinc-200 mb-2">Ready to Forge</h2>
                                <p className="text-neutral-500 dark:text-zinc-400 font-medium">Use the panel on the left to generate your first logo concept.</p>
                              </div>
                           ) : (
                              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
                                <img src={activeProject.logoUrl} alt="Logo" className="w-full h-full object-contain filter drop-shadow-2xl" />
                              </motion.div>
                           )}
                           
                           {/* Quick Actions overlay */}
                           {activeProject?.logoUrl && (
                             <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-white/20 dark:border-zinc-800">
                                <button onClick={handleExportSVG} className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-bold text-sm flex items-center gap-2"><Download size={16} /> SVG</button>
                                <button onClick={handleExportPNG} className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-xl transition-colors font-bold text-sm flex items-center gap-2"><Download size={16} /> PNG</button>
                                <div className="w-px h-6 bg-neutral-200 dark:bg-zinc-800 mx-1"></div>
                                <button onClick={() => setActiveWorkspace('workbench')} className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl transition-colors font-bold text-sm flex items-center gap-2">Edit Vector <ArrowRight size={16} /></button>
                             </div>
                           )}
                        </div>
                      </div>
                    )}`;

  content = content.substring(0, startIndex) + newSandboxBlock + content.substring(endIndex + sandboxEnd.length);
  fs.writeFileSync('./src/App.tsx', content);
  console.log("Sandbox updated.");
} else {
  console.log("Could not find sandbox block.");
}
