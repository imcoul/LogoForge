const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /else if \(msg\.type === "comment" && currentRoomId\) \{/,
  `else if (msg.type === "ghost_sync" && currentRoomId) {
          const { ghostData } = msg;
          broadcastToRoom(currentRoomId, ws, {
            type: "ghost_sync",
            senderId: userId,
            ghostData
          });
        }
        else if (msg.type === "comment" && currentRoomId) {`
);

fs.writeFileSync('server.ts', code);
