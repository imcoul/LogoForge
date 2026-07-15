const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf-8');
code = code.replace(
  'whiteboardSketches?: { id: string; name: string; path: string }[];',
  'whiteboardSketches?: { id: string; name: string; path?: string; color?: string; strokeWidth?: number; type?: \'path\' | \'rectangle\' | \'circle\' | \'line\'; props?: any }[];'
);
fs.writeFileSync('src/store.ts', code);
