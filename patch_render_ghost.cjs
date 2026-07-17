const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf-8');
  
  // Studio.tsx has `handleGhostSync` in destructuring if we export it from StudioHandlers
  if (filepath.includes('Studio.tsx')) {
    code = code.replace(
      /handleUpdateAndSync,/,
      `handleUpdateAndSync,
    handleGhostSync,`
    );
  }

  code = code.replace(
    /<WhiteboardCanvas([^>]*)onUpdateAndSync=\{handleUpdateAndSync\}/g,
    `<WhiteboardCanvas$1onUpdateAndSync={handleUpdateAndSync} onGhostSync={handleGhostSync}`
  );
  
  code = code.replace(
    /<SVGPathEditor([^>]*)onUpdateAndSync=\{handleUpdateAndSync\}/g,
    `<SVGPathEditor$1onUpdateAndSync={handleUpdateAndSync} onGhostSync={handleGhostSync}`
  );

  fs.writeFileSync(filepath, code);
}

patchFile('src/views/Studio.tsx');
patchFile('src/App.tsx');
