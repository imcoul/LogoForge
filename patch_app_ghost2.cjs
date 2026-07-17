const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

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

fs.writeFileSync('src/App.tsx', code);
