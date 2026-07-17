const fs = require('fs');

function patchFile(filepath) {
  let code = fs.readFileSync(filepath, 'utf-8');
  if (code.includes('ghost_sync')) return;

  code = code.replace(
    /else if \(msg\.type === 'cursor'\) \{/,
    `else if (msg.type === 'ghost_sync') {
            const store = useAppStore.getState();
            store.setEphemeralGhost(msg.senderId, msg.ghostData);
            // Clear ghost after 500ms of inactivity
            setTimeout(() => {
              store.clearEphemeralGhost(msg.senderId);
            }, 500);
          } else if (msg.type === 'cursor') {`
  );

  fs.writeFileSync(filepath, code);
}

patchFile('src/App.tsx');
patchFile('src/views/StudioHandlers.ts');

