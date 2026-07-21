import re
import os

# 1. CanvasRenderer.tsx
p = 'src/components/CanvasRenderer.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    c = c.replace('className="absolute inset-0 flex items-center justify-center bg-white/50 z-10"', 'className="absolute inset-0 flex items-center justify-center bg-white/50 z-10 animate-pulse text-neutral-500"')
    with open(p, 'w') as f: f.write(c)

# 2. WhiteboardToolbar.tsx
p = 'src/components/WhiteboardToolbar.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    c = c.replace('import { MousePointer,', 'import { MousePointer2,')
    c = c.replace('MousePointer,', 'MousePointer2,')
    c = c.replace('<MousePointer ', '<MousePointer2 ')
    with open(p, 'w') as f: f.write(c)

# 3. StudioControls.tsx
p = 'src/components/StudioControls.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    c = re.sub(r'(<button[^>]*onClick=\{onExport\}[^>]*className="[^"]*)', r'\1 hover:brightness-110 active:scale-95', c)
    with open(p, 'w') as f: f.write(c)

# 5. ProjectAnalytics.tsx
p = 'src/components/ProjectAnalytics.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    empty_state = """
        {analyticsData.events.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-neutral-200 dark:border-zinc-800 rounded-3xl">
            <h3 className="text-sm font-bold text-neutral-400">No Analytics Data</h3>
            <p className="text-xs text-neutral-500 mt-1">Events will appear here once the project has activity.</p>
          </div>
        )}
"""
    if "No Analytics Data" not in c:
        c = c.replace('          {/* Basic Metrics */}', empty_state + '          {/* Basic Metrics */}')
    with open(p, 'w') as f: f.write(c)

print("Done phase 3")
