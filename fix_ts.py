import re

# 1. App.tsx Duplicate identifier DesignChecklist
with open('src/App.tsx', 'r') as f: c = f.read()
# Let's remove duplicate imports
lines = c.split('\n')
seen_imports = set()
new_lines = []
for line in lines:
    if line.startswith('import { DesignChecklist }'):
        if 'DesignChecklist' in seen_imports: continue
        seen_imports.add('DesignChecklist')
    if line.startswith('import { Tooltip }'):
        if 'Tooltip' in seen_imports: continue
        seen_imports.add('Tooltip')
    if line.startswith('import { CustomWaveformPlayer }'):
        if 'CustomWaveformPlayer' in seen_imports: continue
        seen_imports.add('CustomWaveformPlayer')
    if line.startswith('import { sanitizeSVG }'):
        if 'sanitizeSVG' in seen_imports: continue
        seen_imports.add('sanitizeSVG')
    new_lines.append(line)
with open('src/App.tsx', 'w') as f: f.write('\n'.join(new_lines))

# Studio.tsx duplicates
with open('src/views/Studio.tsx', 'r') as f: c = f.read()
lines = c.split('\n')
seen_imports = set()
new_lines = []
for line in lines:
    if line.startswith('import { DesignChecklist }'):
        if 'DesignChecklist' in seen_imports: continue
        seen_imports.add('DesignChecklist')
    if line.startswith('import { Tooltip }'):
        if 'Tooltip' in seen_imports: continue
        seen_imports.add('Tooltip')
    if line.startswith('import { CustomWaveformPlayer }'):
        if 'CustomWaveformPlayer' in seen_imports: continue
        seen_imports.add('CustomWaveformPlayer')
    if line.startswith('import { sanitizeSVG }'):
        if 'sanitizeSVG' in seen_imports: continue
        seen_imports.add('sanitizeSVG')
    new_lines.append(line)
with open('src/views/Studio.tsx', 'w') as f: f.write('\n'.join(new_lines))

# 2. InteractiveMockupViewer logoSvg -> svgContent
with open('src/components/InteractiveMockupViewer.tsx', 'r') as f: c = f.read()
# Let's see what Project has in store.ts. It's either logoSvg or base64? Let's check store.ts if we don't know, but for now let's just replace logoSvg with svgContent if it's there. Actually, wait! Let's check store.ts
