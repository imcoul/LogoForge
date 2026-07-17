const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf-8');
  
  code = code.replace(
    /onChange=\{\(newSvg, throttleCloud\)/g,
    `onGhostSync={handleGhostSync}
                        onChange={(newSvg, throttleCloud)`
  );

  fs.writeFileSync(filepath, code);
}

patchFile('src/views/Studio.tsx');
patchFile('src/App.tsx');
