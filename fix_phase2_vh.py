import re
import glob

for f in glob.glob('src/components/**/*.tsx', recursive=True):
    with open(f, 'r') as file: c = file.read()
    orig = c
    c = re.sub(r'\bh-\[80dvh\]\b', 'max-h-[85dvh] h-full', c)
    c = re.sub(r'\bh-\[90dvh\]\b', 'max-h-[90dvh] h-full', c)
    if orig != c:
        with open(f, 'w') as file: file.write(c)
        print(f"Removed fixed vh in {f}")

