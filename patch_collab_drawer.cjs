const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The comments tab starts around line 4330
const startIndex = content.indexOf(`) : activeTab === 'comments' ? (`);
if (startIndex === -1) {
  console.log("Could not find start index");
  process.exit(1);
}

// Find the matching close parenthesis/brace for the activeTab === 'comments' branch.
// It ends with:
//                     </div>
//                   </motion.div>
//                 ) : (
const endMarker = `                  </motion.div>
                ) : (
                  <div className="flex-1"></div>
                )}`;
const endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.log("Could not find end index");
  process.exit(1);
}

// Extract the comment tab code to put in the drawer
const commentsTabCode = content.substring(startIndex, endIndex + `                  </motion.div>`.length);

// Also we need to inject the FAB and the drawer itself outside the main content area.
// It looks like `src/App.tsx` renders a `<div className="flex h-screen bg-neutral-100 dark:bg-zinc-950 font-sans text-neutral-900 dark:text-neutral-100 overflow-hidden relative selection:bg-brand-lead selection:text-white">`
// Let's inject at the very end of this div.
const containerEnd = `    </div>
  );
}`;
const containerEndIdx = content.lastIndexOf(containerEnd);

// Let's replace the tab branch with just the fallback empty div, and remove it from the ternaries.
let newContent = content.substring(0, startIndex) + `) : (
                  <div className="flex-1"></div>
                )}` + content.substring(endIndex + endMarker.length);


const collabDrawerCode = `
      {/* Collab FAB */}
      {view === 'studio' && (
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
        className={\`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-zinc-900 border-l border-neutral-200 dark:border-zinc-800 shadow-2xl z-[55] transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] \${isCollabDrawerOpen ? 'translate-x-0' : 'translate-x-full'}\`}
      >
        <div className="h-full flex flex-col pt-safe">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare size={18} /> Collaboration
            </h2>
            <button 
              onClick={() => setIsCollabDrawerOpen(false)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
            <div className="mb-8">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-brand-lead">
                <Wand2 size={16} /> AI Creative Directors
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => requestAiCritique('minimalist')}
                  disabled={isCritiquing}
                  className="p-3 text-left border border-neutral-200 dark:border-zinc-800 rounded-xl hover:border-brand-lead hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group disabled:opacity-50"
                >
                  <div className="font-bold text-sm group-hover:text-brand-lead transition-colors">Dieter Rams</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-1">Minimalist Critique</div>
                </button>
                <button 
                  onClick={() => requestAiCritique('playful')}
                  disabled={isCritiquing}
                  className="p-3 text-left border border-neutral-200 dark:border-zinc-800 rounded-xl hover:border-brand-lead hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group disabled:opacity-50"
                >
                  <div className="font-bold text-sm group-hover:text-brand-lead transition-colors">Paula Scher</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-1">Playful Critique</div>
                </button>
              </div>
            </div>
            
            {/* Thread */}
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 border-b border-neutral-200 dark:border-zinc-800 pb-2">
              Project Thread
            </h3>
            
            <div className="space-y-4 mb-4">
              {activeProject?.comments?.map((comment) => (
                <div key={comment.id} className={\`p-4 rounded-xl shadow-sm border \${comment.userId === 'ai' ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50' : 'bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800'}\`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={\`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white \${comment.userId === 'ai' ? 'bg-brand-lead' : 'bg-neutral-800'}\`}>
                      {comment.userId === 'ai' ? <Wand2 size={12} /> : comment.username.charAt(0)}
                    </div>
                    <span className="font-bold text-xs">{comment.userId === 'ai' ? 'AI Critic' : comment.username}</span>
                    <span className="text-[10px] text-neutral-400 ml-auto">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  {comment.userId === 'ai' ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug">
                      <Markdown>{comment.text}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{comment.text}</p>
                  )}
                </div>
              ))}
              
              {isCritiquing && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-lead flex items-center justify-center">
                      <Loader2 size={12} className="text-white animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 animate-pulse">The Critic is analyzing the logo...</span>
                  </div>
                </div>
              )}
              
              {(!activeProject?.comments || activeProject.comments.length === 0) && !isCritiquing && (
                <div className="text-center py-8 text-neutral-400 dark:text-zinc-500">
                  <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No comments yet.</p>
                  <p className="text-xs mt-1">Request an AI critique or add a note below.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-neutral-50 dark:bg-zinc-950 border-t border-neutral-200 dark:border-zinc-800 shrink-0">
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-white dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-lead"
              />
              <button 
                type="submit"
                disabled={!newCommentText.trim()}
                className="p-2 bg-brand-lead hover:bg-brand-lead/90 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
`;

newContent = newContent.substring(0, newContent.lastIndexOf(containerEnd)) + collabDrawerCode + '\n' + containerEnd;

fs.writeFileSync('./src/App.tsx', newContent);
