const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/if \(cursorRafRef\.current\) cancelAnimationFrame\(cursorRafRef\.current\);\n                            cursorRafRef\.current = requestAnimationFrame\(\(\) => {\n                              socket\.send\(JSON\.stringify\(\{/g, 'socket.send(JSON.stringify({');
fs.writeFileSync('src/App.tsx', code);
