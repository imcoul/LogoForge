import re

with open('src/views/StudioHandlers.ts', 'r') as f:
    c = f.read()

# I will write a simple throttle using useRef
# add import { useRef } if not present
if 'useRef' not in c:
    c = c.replace("import { useState", "import { useState, useRef")

c = c.replace(
    '  const handleGhostSync = (ghostData: any) => {\n    if (socket && socket.readyState === WebSocket.OPEN) {\n      socket.send(\n        JSON.stringify({\n          type: \'ghost_sync\',\n          ghostData,\n        })\n      );\n    }\n  };',
    '  const lastGhostSync = useRef<number>(0);\n  const handleGhostSync = (ghostData: any) => {\n    const now = Date.now();\n    if (now - lastGhostSync.current < 50) return; // throttle to ~20fps\n    lastGhostSync.current = now;\n    if (socket && socket.readyState === WebSocket.OPEN) {\n      socket.send(\n        JSON.stringify({\n          type: \'ghost_sync\',\n          ghostData,\n        })\n      );\n    }\n  };'
)

with open('src/views/StudioHandlers.ts', 'w') as f:
    f.write(c)
