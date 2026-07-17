const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf-8');

code = code.replace(
  `undo: () => Promise<void>;
  redo: () => Promise<void>;`,
  `undo: () => Promise<void>;
  redo: () => Promise<void>;
  ephemeralGhosts: Record<string, any>;
  setEphemeralGhost: (id: string, ghostData: any) => void;
  clearEphemeralGhost: (id: string) => void;`
);

code = code.replace(
  `socket: null,
  socketError: null,
  users: [],`,
  `socket: null,
  socketError: null,
  users: [],
  ephemeralGhosts: {},
  setEphemeralGhost: (id, ghostData) => set((state) => ({
    ephemeralGhosts: { ...state.ephemeralGhosts, [id]: ghostData }
  })),
  clearEphemeralGhost: (id) => set((state) => {
    const next = { ...state.ephemeralGhosts };
    delete next[id];
    return { ephemeralGhosts: next };
  }),`
);

fs.writeFileSync('src/store.ts', code);
