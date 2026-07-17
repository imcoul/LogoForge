const fs = require('fs');
let code = fs.readFileSync('src/views/StudioHandlers.ts', 'utf-8');

code = code.replace(
  `  const handleUpdateAndSync = async`,
  `  const handleGhostSync = (ghostData: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'ghost_sync',
          ghostData,
        })
      );
    }
  };

  const handleUpdateAndSync = async`
);

code = code.replace(
  `    socket,`,
  `    socket,
    handleGhostSync,`
);

fs.writeFileSync('src/views/StudioHandlers.ts', code);
