import re
import os

# 1. FileUploader.tsx
p = 'src/components/FileUploader.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    c = c.replace('className="w-full max-w-md', 'className="w-full max-w-md min-w-[320px]')
    with open(p, 'w') as f: f.write(c)

# 2. Dashboard.tsx
p = 'src/views/Dashboard.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    c = c.replace('className="font-bold text-neutral-900', 'className="font-bold text-neutral-900 truncate max-w-full')
    c = c.replace('className="text-xs text-neutral-500 line-clamp-2"', 'className="text-xs text-neutral-500 line-clamp-2 truncate max-w-full"')
    with open(p, 'w') as f: f.write(c)

# 3. SVGPathEditor.tsx
p = 'src/components/SVGPathEditor.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    c = c.replace('overflow-auto bg-neutral-100', 'overflow-auto bg-neutral-100 touch-pan-x touch-pan-y')
    c = c.replace('style={{ backgroundImage:', 'style={{ WebkitOverflowScrolling: "touch", backgroundImage:')
    with open(p, 'w') as f: f.write(c)

# 4. AiPreviewSlider.tsx
p = 'src/components/AiPreviewSlider.tsx'
if os.path.exists(p):
    with open(p, 'r') as f: c = f.read()
    c = c.replace('p-4 space-y-4', 'p-4 pb-safe space-y-4')
    with open(p, 'w') as f: f.write(c)

print("Done phase 2")
