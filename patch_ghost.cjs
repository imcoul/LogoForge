const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  `} else if (msg.type === "pointer_move" && currentRoomId) {`,
  `
        } else if (msg.type === "ghost_sync" && currentRoomId) {
          const { ghostData } = msg;
          broadcastToRoom(currentRoomId, ws, {
            type: "ghost_sync",
            senderId: userId,
            ghostData
          });
        } else if (msg.type === "pointer_move" && currentRoomId) {`
);

// If "pointer_move" doesn't exist, we can inject it right after the sync block:
if (!code.includes("ghost_sync")) {
  code = code.replace(
    /if \(msg\.type === "add_comment" && currentRoomId\) \{/,
    `if (msg.type === "ghost_sync" && currentRoomId) {
          const { ghostData } = msg;
          broadcastToRoom(currentRoomId, ws, {
            type: "ghost_sync",
            senderId: userId,
            ghostData
          });
        }
        else if (msg.type === "add_comment" && currentRoomId) {`
  );
}

fs.writeFileSync('server.ts', code);
