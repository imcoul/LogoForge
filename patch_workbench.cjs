const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The precision block
function extractBlock(startStr, endStr) {
  const startIdx = content.indexOf(startStr);
  if (startIdx === -1) return null;
  const endIdx = content.indexOf(endStr, startIdx);
  if (endIdx === -1) return null;
  return content.substring(startIdx + startStr.length, endIdx);
}

const drawBlock = extractBlock(`) : activeTab === 'draw' ? (`, `) : activeTab === 'ecosystem' ? (`);
const precisionBlock = extractBlock(`) : activeTab === 'precision' ? (`, `) : activeTab === 'mockups' ? (`);

const workbenchSketchPlaceholder = `{workbenchSubTab === 'sketch' ? (
                            <WhiteboardCanvas 
                              socket={socket} 
                              projectId={activeProject.id} 
                              username={username}
                              color={activeUsers.find(u => u.username === username)?.color || '#3b82f6'}
                            />
                          ) : (`;

const workbenchPrecisionPlaceholder = `<SVGPathEditor 
                                svgSource={activeProject.svgSource || ''} 
                                onChange={(src) => updateProject(activeProject.id, { svgSource: src })} 
                             />
                          )}`;


// For workbench we just want to replace the whole workbench view area actually
// Let's replace the whole {activeWorkspace === 'workbench' && ( ... )} block because we want it to be full screen.

const workbenchStart = `{activeWorkspace === 'workbench' && (
                      <div className="flex-1 flex flex-col w-full h-full">`;
                      
const workbenchEnd = `                      </div>
                    )}`;

const startIndex = content.indexOf(workbenchStart);
const endIndex = content.indexOf(workbenchEnd, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newWorkbenchBlock = `{activeWorkspace === 'workbench' && (
                      <div className="flex-1 flex flex-col w-full h-full relative">
                        {/* Vector Workbench View */}
                        <div className="absolute top-4 left-4 z-50 flex gap-4 p-2 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur shadow-sm border border-neutral-200 dark:border-zinc-800">
                          <button onClick={() => setWorkbenchSubTab('sketch')} className={\`px-4 py-2 text-xs font-bold rounded-xl \${workbenchSubTab === 'sketch' ? 'bg-brand-lead text-white' : 'bg-transparent text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'}\`}>Freeform Sketching</button>
                          <button onClick={() => setWorkbenchSubTab('precision')} className={\`px-4 py-2 text-xs font-bold rounded-xl \${workbenchSubTab === 'precision' ? 'bg-brand-lead text-white' : 'bg-transparent text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800'}\`}>Precision Nodes</button>
                        </div>
                        
                        <div className="flex-1 relative w-full h-full">
                          {workbenchSubTab === 'sketch' ? (
                            \n` + (drawBlock ? drawBlock.trim() : `<WhiteboardCanvas socket={socket} projectId={activeProject.id} username={username} color={activeUsers.find(u => u.username === username)?.color || '#3b82f6'} />`) + `\n
                          ) : (
                            \n` + (precisionBlock ? precisionBlock.trim() : `<SVGPathEditor svgSource={activeProject.svgSource || ''} onChange={(src) => updateProject(activeProject.id, { svgSource: src })} />`) + `\n
                          )}
                        </div>
                      </div>
                    )}`;

  content = content.substring(0, startIndex) + newWorkbenchBlock + content.substring(endIndex + workbenchEnd.length);
  fs.writeFileSync('./src/App.tsx', content);
  console.log("Workbench updated.");
} else {
  console.log("Could not find workbench block.");
}
