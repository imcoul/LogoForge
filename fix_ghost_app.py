import re

with open('src/App.tsx', 'r') as f:
    c = f.read()

c = c.replace(
    '  const handleGhostSync = (ghostData: any) => {\n    if (socket && socket.readyState === WebSocket.OPEN) {\n      socket.send(\n        JSON.stringify({\n          type: \'ghost_sync\',\n          ghostData,\n        })\n      );\n    }\n  };',
    '  const lastGhostSync = useRef<number>(0);\n  const handleGhostSync = (ghostData: any) => {\n    const now = Date.now();\n    if (now - lastGhostSync.current < 50) return;\n    lastGhostSync.current = now;\n    if (socket && socket.readyState === WebSocket.OPEN) {\n      socket.send(\n        JSON.stringify({\n          type: \'ghost_sync\',\n          ghostData,\n        })\n      );\n    }\n  };'
)

with open('src/App.tsx', 'w') as f:
    f.write(c)
