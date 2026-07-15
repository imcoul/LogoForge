const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            socket.send(JSON.stringify({
                              type: 'cursor',
                              username,
                              color: '#6366F1',
                              x,
                              y
                            }));`;

const replacement = `const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
                            cursorRafRef.current = requestAnimationFrame(() => {
                              socket.send(JSON.stringify({
                                type: 'cursor',
                                username,
                                color: '#6366F1',
                                x,
                                y
                              }));
                            });`;

code = code.replaceAll(target, replacement);
fs.writeFileSync('src/App.tsx', code);
