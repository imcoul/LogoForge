const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf-8');

code = code.replace(
  `  user: null,`,
  `  user: null,
  ephemeralGhosts: {},
  setEphemeralGhost: (id, ghostData) => setStore((state) => ({
    ephemeralGhosts: { ...state.ephemeralGhosts, [id]: ghostData }
  })),
  clearEphemeralGhost: (id) => setStore((state) => {
    const next = { ...state.ephemeralGhosts };
    delete next[id];
    return { ephemeralGhosts: next };
  }),`
);

fs.writeFileSync('src/store.ts', code);
