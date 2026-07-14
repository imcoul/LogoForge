const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

const injection = `useConsolidatedWorkspace ? (
                  <div className="w-full h-full flex flex-col relative">
                    {activeWorkspace === 'sandbox' && (
                      <div className="flex-1 flex flex-col lg:flex-row w-full h-full">
                        {/* Logo Sandbox View */}
                        <div className="w-full lg:w-1/3 p-6 border-r border-neutral-200 dark:border-zinc-800 overflow-y-auto">
                          <h2 className="text-xl font-bold mb-4">Logo Sandbox</h2>
                          <div className="flex gap-2 mb-4">
                            <button onClick={() => setSandboxSubTab('preview')} className={\`flex-1 py-2 text-xs font-bold rounded-lg \${sandboxSubTab === 'preview' ? 'bg-black text-white' : 'bg-neutral-200'}\`}>Preview</button>
                            <button onClick={() => setSandboxSubTab('refine')} className={\`flex-1 py-2 text-xs font-bold rounded-lg \${sandboxSubTab === 'refine' ? 'bg-black text-white' : 'bg-neutral-200'}\`}>Refine</button>
                          </div>
                          {sandboxSubTab === 'preview' && (
                            <div className="text-sm text-neutral-500">
                              Generate console and history trail go here.
                            </div>
                          )}
                          {sandboxSubTab === 'refine' && (
                            <div className="text-sm text-neutral-500">
                              AI prompt console and refinement cards go here.
                            </div>
                          )}
                        </div>
                        <div className="w-full lg:w-2/3 p-6 flex flex-col items-center justify-center relative bg-neutral-50 dark:bg-zinc-900/50">
                           {!activeProject?.logoUrl ? (
                              <div className="text-center text-neutral-500">No logo generated yet.</div>
                           ) : (
                              <img src={activeProject.logoUrl} alt="Logo" className="max-w-md w-full object-contain filter drop-shadow-2xl rounded-2xl" />
                           )}
                        </div>
                      </div>
                    )}
                    
                    {activeWorkspace === 'workbench' && (
                      <div className="flex-1 flex flex-col w-full h-full">
                        {/* Vector Workbench View */}
                        <div className="flex gap-4 p-4 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <button onClick={() => setWorkbenchSubTab('sketch')} className={\`px-4 py-2 text-xs font-bold rounded-full \${workbenchSubTab === 'sketch' ? 'bg-brand-lead text-white' : 'bg-neutral-100'}\`}>Freeform Sketching</button>
                          <button onClick={() => setWorkbenchSubTab('precision')} className={\`px-4 py-2 text-xs font-bold rounded-full \${workbenchSubTab === 'precision' ? 'bg-brand-lead text-white' : 'bg-neutral-100'}\`}>Precision Nodes</button>
                        </div>
                        <div className="flex-1 relative">
                          {workbenchSubTab === 'sketch' ? (
                            <WhiteboardCanvas 
                              socket={socket} 
                              projectId={activeProject.id} 
                              username={username}
                              color={activeUsers.find(u => u.username === username)?.color || '#3b82f6'}
                            />
                          ) : (
                             <SVGPathEditor 
                                svgSource={activeProject.svgSource || ''} 
                                onChange={(src) => updateProject(activeProject.id, { svgSource: src })} 
                             />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {activeWorkspace === 'identity' && (
                      <div className="flex-1 flex flex-col w-full h-full">
                        {/* Identity Portal View */}
                         <div className="flex gap-4 p-4 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <button onClick={() => setIdentitySubTab('guidelines')} className={\`px-4 py-2 text-xs font-bold rounded-full \${identitySubTab === 'guidelines' ? 'bg-black text-white' : 'bg-neutral-100'}\`}>Brand Guidelines</button>
                          <button onClick={() => setIdentitySubTab('mockups')} className={\`px-4 py-2 text-xs font-bold rounded-full \${identitySubTab === 'mockups' ? 'bg-black text-white' : 'bg-neutral-100'}\`}>Live Mockups</button>
                          <button onClick={() => setIdentitySubTab('collateral')} className={\`px-4 py-2 text-xs font-bold rounded-full \${identitySubTab === 'collateral' ? 'bg-black text-white' : 'bg-neutral-100'}\`}>Marketing Kit</button>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto">
                          {identitySubTab === 'guidelines' && (
                            <div className="text-sm">Guidelines integration...</div>
                          )}
                          {identitySubTab === 'mockups' && (
                            <div className="text-sm">Mockups integration...</div>
                          )}
                          {identitySubTab === 'collateral' && (
                            <div className="text-sm">Ecosystem integration...</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {activeWorkspace === 'strategy' && (
                      <div className="flex-1 flex flex-col w-full h-full">
                        {/* Strategy Centre View */}
                        <div className="flex gap-4 p-4 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                          <button onClick={() => setStrategySubTab('rivals')} className={\`px-4 py-2 text-xs font-bold rounded-full \${strategySubTab === 'rivals' ? 'bg-black text-white' : 'bg-neutral-100'}\`}>Competitor Rivals</button>
                          <button onClick={() => setStrategySubTab('sonic')} className={\`px-4 py-2 text-xs font-bold rounded-full \${strategySubTab === 'sonic' ? 'bg-black text-white' : 'bg-neutral-100'}\`}>Sonic Guidelines</button>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto">
                           {strategySubTab === 'rivals' && (
                             <div className="text-sm">Competitors...</div>
                           )}
                           {strategySubTab === 'sonic' && (
                             <div className="text-sm">Sonic audio synth...</div>
                           )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'preview' && !activeProject?.logoUrl ? (`;

content = content.replace(/activeTab === 'preview' && !activeProject\?\.logoUrl \? \(/, injection);

fs.writeFileSync('./src/App.tsx', content);
