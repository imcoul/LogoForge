import re
import os
import glob

def replace_in_file(path, old, new):
    with open(path, 'r') as f:
        c = f.read()
    if old in c:
        with open(path, 'w') as f:
            f.write(c.replace(old, new))
        print(f"Replaced in {path}")

# WhiteboardCanvas
replace_in_file('src/components/WhiteboardCanvas.tsx', 'h-[540px]', 'h-full min-h-[50vh]')

# SVGPathEditor
replace_in_file('src/components/SVGPathEditor.tsx', 'w-[70vh] h-[70vh]', 'w-full max-w-2xl aspect-square')

# AiPreviewSlider
replace_in_file('src/components/AiPreviewSlider.tsx', 'w-[400px]', 'w-full max-w-sm')

# Studio.tsx
replace_in_file('src/views/Studio.tsx', 'min-h-[420px]', 'min-h-[40vh]')

# Modals h-[80vh] and h-[90vh]
for f in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(f, 'r') as file: c = file.read()
    orig = c
    c = re.sub(r'\bh-\[80vh\]\b', 'h-[80dvh]', c)
    c = re.sub(r'\bh-\[90vh\]\b', 'h-[90dvh]', c)
    if orig != c:
        with open(f, 'w') as file: file.write(c)
        print(f"Replaced vh to dvh in {f}")

