const fs = require('fs');

let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The block causing the TS error:
// {activeProject?.history && activeProject.history.length > 0 && (
//   <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-zinc-800">
//     <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-neutral-500">History Trail</h3>
//     <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
//       {activeProject.history.map((item, idx) => (
//         <button 
//           key={idx}
//           onClick={() => {
//             updateProject(activeProject.id, { 
//               logoUrl: item.url,
//               svgSource: item.svg
//             });
//           }}

const target = `{activeProject?.history && activeProject.history.length > 0 && (`;
const replacement = `{activeProject?.logoHistory && activeProject.logoHistory.length > 0 && (`;

content = content.replace(target, replacement);

const target2 = `{activeProject.history.map((item, idx) => (`;
const replacement2 = `{activeProject.logoHistory.map((itemSvg, idx) => {
                                        const dataUrl = \`data:image/svg+xml;utf8,\${encodeURIComponent(itemSvg)}\`;
                                        return (`;

content = content.replace(target2, replacement2);

const target3 = `logoUrl: item.url,
                                              svgSource: item.svg
                                            });`;
const replacement3 = `logoUrl: dataUrl,
                                              svgSource: itemSvg
                                            });`;

content = content.replace(target3, replacement3);

const target4 = `className="relative shrink-0 w-16 h-16 rounded-xl border border-neutral-200 dark:border-zinc-700 overflow-hidden group hover:border-brand-lead transition-colors focus:outline-none focus:ring-2 focus:ring-brand-lead"
                                        >
                                          <img src={item.url} alt={\`History \${idx + 1}\`} className="w-full h-full object-contain p-2" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <RotateCcw size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}`;
const replacement4 = `className="relative shrink-0 w-16 h-16 rounded-xl border border-neutral-200 dark:border-zinc-700 overflow-hidden group hover:border-brand-lead transition-colors focus:outline-none focus:ring-2 focus:ring-brand-lead"
                                        >
                                          <img src={dataUrl} alt={\`History \${idx + 1}\`} className="w-full h-full object-contain p-2" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <RotateCcw size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                          </div>
                                        </button>
                                      );
                                      })}
                                    </div>
                                  </div>
                                )}`;

content = content.replace(target4, replacement4);

fs.writeFileSync('./src/App.tsx', content);

