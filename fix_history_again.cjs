const fs = require('fs');

let content = fs.readFileSync('./src/App.tsx', 'utf8');

// I will just use regex to fix the map closure
// Wait, the error is at 3405. Let me look at 3390-3410
const block = `                                          className="relative shrink-0 w-16 h-16 rounded-xl border border-neutral-200 dark:border-zinc-700 overflow-hidden group hover:border-brand-lead transition-colors focus:outline-none focus:ring-2 focus:ring-brand-lead"
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
                                )}`;

const newBlock = `                                          className="relative shrink-0 w-16 h-16 rounded-xl border border-neutral-200 dark:border-zinc-700 overflow-hidden group hover:border-brand-lead transition-colors focus:outline-none focus:ring-2 focus:ring-brand-lead"
                                        >
                                          <img src={dataUrl} alt="History" className="w-full h-full object-cover" />
                                        </button>
                                      );
                                      })}
                                    </div>
                                  </div>
                                )}`;

content = content.replace(block, newBlock);

fs.writeFileSync('./src/App.tsx', content);

