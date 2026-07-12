const fs = require('fs');
let code = fs.readFileSync('src/components/SVGPathEditor.tsx', 'utf8');

code = code.replace(
  `              ref={coordCanvasRef}
              className="relative aspect-square w-full rounded-2xl border-2 border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 overflow-hidden shadow-inner flex items-center justify-center cursor-crosshair touch-none select-none"
            >`,
  `              ref={coordCanvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="relative aspect-square w-full rounded-2xl border-2 border-neutral-200 dark:border-zinc-800 bg-neutral-50 dark:bg-zinc-950 overflow-hidden shadow-inner flex items-center justify-center cursor-crosshair touch-none select-none"
            >`
);

fs.writeFileSync('src/components/SVGPathEditor.tsx', code);
