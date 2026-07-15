const fs = require('fs');

let content = fs.readFileSync('src/components/WhiteboardCanvas.tsx', 'utf-8');

const toolbarRegex = /<WhiteboardToolbar[\s\S]*?\/>/;
const newToolbar = `<WhiteboardToolbar 
                 tool={tool} 
                 setTool={setTool as any} 
                 mode={mode} 
                 setMode={setMode} 
                 setFullscreen={setFullscreen} 
                 fullscreen={fullscreen}
                onUndo={undo}
                onRedo={redo}
                color={strokeColor}
                setColor={setStrokeColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
            />`;

content = content.replace(toolbarRegex, newToolbar);
fs.writeFileSync('src/components/WhiteboardCanvas.tsx', content);
