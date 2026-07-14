const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

const startIndex = content.indexOf(`) : activeTab === 'comments' ? (`);
const endIndex = content.indexOf(`) : null}`, startIndex) + `) : null}`.length;

let newContent = content.substring(0, startIndex) + `) : null}` + content.substring(endIndex);

const collabDrawerCode = `
      {/* Collab FAB */}
      {view === 'dashboard' && (
        <button 
          onClick={() => setIsCollabDrawerOpen(!isCollabDrawerOpen)}
          className="fixed bottom-6 right-6 p-4 bg-brand-lead text-white rounded-full shadow-2xl z-[60] hover:bg-brand-lead/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center border-4 border-white dark:border-zinc-900"
        >
          <MessageSquare size={24} />
          {activeUsers.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-zinc-900">
              {activeUsers.length}
            </span>
          )}
        </button>
      )}

      {/* Collaboration Drawer */}
      <div 
        className={\`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-zinc-900 border-l border-neutral-200 dark:border-zinc-800 shadow-2xl z-[65] transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] \${isCollabDrawerOpen ? 'translate-x-0' : 'translate-x-full'}\`}
      >
        <div className="h-full flex flex-col pt-safe">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare size={18} /> Collaboration
            </h2>
            <button 
              onClick={() => setIsCollabDrawerOpen(false)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
            {/* Active Users presence bar */}
            <div className="mb-6 p-4 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Active Presence
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-zinc-800 text-xs font-bold">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                  You ({username})
                </div>
                {activeUsers.filter(u => u.username !== username).map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-zinc-800 text-xs font-bold">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }}></div>
                    {u.username}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Critic Panel */}
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-brand-lead">
                <Wand2 size={16} /> AI Creative Directors
              </h3>
              <div className="flex flex-col gap-2">
                 <select 
                   value={criticRole}
                   onChange={(e) => setCriticRole(e.target.value)}
                   className="w-full bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                 >
                   <option value="Senior Art Director 🎨">Senior Art Director (Metaphor)</option>
                   <option value="Typography Specialist ✍️">Typography Specialist (Legibility)</option>
                   <option value="Color Specialist 💧">Color Specialist (Harmony)</option>
                 </select>
                 <button 
                   onClick={handleRequestAICritic}
                   disabled={isCriticLoading || !activeProject}
                   className="p-3 text-center border border-neutral-200 dark:border-zinc-800 rounded-xl hover:border-brand-lead hover:bg-brand-lead hover:text-white transition-colors disabled:opacity-50 font-bold text-sm cursor-pointer"
                 >
                   {isCriticLoading ? 'Analyzing...' : 'Request Feedback'}
                 </button>
              </div>
            </div>
            
            {/* Thread */}
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 border-b border-neutral-200 dark:border-zinc-800 pb-2">
              Project Thread
            </h3>
            
            <div className="flex-1 space-y-4 mb-4">
              {activeProject?.comments?.map((comment) => (
                <div key={comment.id} className={\`p-4 rounded-xl shadow-sm border \${comment.author.includes('AI') ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50' : 'bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800'}\`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white \${comment.author.includes('AI') ? 'bg-brand-lead' : 'bg-neutral-800 dark:bg-zinc-700'}\`}>
                      {comment.author.includes('AI') ? <Wand2 size={12} /> : comment.author.charAt(0)}
                    </div>
                    <span className="font-bold text-xs">{comment.author}</span>
                    <span className="text-[10px] text-neutral-400 ml-auto">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  {comment.author.includes('AI') ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug">
                      <Markdown>{comment.text}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{comment.text}</p>
                  )}
                </div>
              ))}
              
              {isCriticLoading && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-lead flex items-center justify-center">
                      <RefreshCw size={12} className="text-white animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 animate-pulse">The Critic is analyzing the logo...</span>
                  </div>
                </div>
              )}
              
              {(!activeProject?.comments || activeProject.comments.length === 0) && !isCriticLoading && (
                <div className="text-center py-8 text-neutral-400 dark:text-zinc-500">
                  <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No comments yet.</p>
                  <p className="text-xs mt-1">Request an AI critique or add a note below.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-neutral-50 dark:bg-zinc-950 border-t border-neutral-200 dark:border-zinc-800 shrink-0">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (commentText.trim() && activeProject) {
                updateProject(activeProject.id, {
                  comments: [...activeProject.comments, {
                    id: Math.random().toString(36).substring(7),
                    author: 'You',
                    text: commentText.trim(),
                    timestamp: Date.now()
                  }]
                });
                setCommentText('');
              }
            }} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-white dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-lead"
              />
              <button 
                type="submit"
                disabled={!commentText.trim()}
                className="p-2 bg-brand-lead hover:bg-brand-lead/90 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
`;

const containerEnd = `    </div>
  );
}`;
const containerEndIdx = newContent.lastIndexOf(containerEnd);
newContent = newContent.substring(0, containerEndIdx) + collabDrawerCode + '\n' + containerEnd;

fs.writeFileSync('./src/App.tsx', newContent);
