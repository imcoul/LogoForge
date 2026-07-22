import re
import os
import glob

def fix_css_in_file(path):
    with open(path, 'r') as f: c = f.read()
    orig = c
    
    # fix z-indexes
    c = c.replace('z-[100]', 'z-max')
    c = c.replace('z-[99]', 'z-max')
    c = c.replace('z-55', 'z-overlay')
    # we have to be careful with z-50/40/30, let's just do a regex replace if they are whole words
    c = re.sub(r'\bz-50\b', 'z-modal', c)
    c = re.sub(r'\bz-40\b', 'z-dropdown', c)
    c = re.sub(r'\bz-30\b', 'z-dropdown', c)
    
    # fix backdrop-blur-xs
    c = re.sub(r'\bbackdrop-blur-xs\b', 'backdrop-blur-sm', c)
    
    # fix animate-fadeIn
    c = re.sub(r'\banimate-fadeIn\b', 'animate-fade', c)
    
    # remove animate-in fade-in zoom-in-95 slide-in-from-right-8 slide-in-from-left-8 slide-in-from-bottom-8
    c = re.sub(r'\banimate-in\s+', '', c)
    c = re.sub(r'\bfade-in\s+', '', c)
    c = re.sub(r'\bzoom-in-95\s+', '', c)
    c = re.sub(r'\bslide-in-from-[a-z]+-[0-9]+\s+', '', c)
    c = re.sub(r'\bfade-in-0\s+', '', c)
    c = re.sub(r'\bzoom-in\s+', '', c)
    c = re.sub(r'\banimate-fade\b', '', c) # just remove it entirely as requested? The user said "animate-fadeIn still in 5 places" and "animate-in / fade-in / zoom-in-95... still in ForgeAcademy". Let's just remove them all.
    
    # Custom shades
    # 850 -> 800, 855 -> 900, 150 -> 200, 250 -> 300, 350 -> 400
    c = re.sub(r'neutral-850', 'neutral-900', c)
    c = re.sub(r'zinc-855', 'zinc-900', c)
    c = re.sub(r'neutral-150', 'neutral-200', c)
    c = re.sub(r'neutral-250', 'neutral-300', c)
    c = re.sub(r'neutral-350', 'neutral-400', c)
    c = re.sub(r'zinc-150', 'zinc-200', c)
    c = re.sub(r'zinc-250', 'zinc-300', c)
    c = re.sub(r'zinc-350', 'zinc-400', c)
    c = re.sub(r'zinc-850', 'zinc-900', c)

    if c != orig:
        with open(path, 'w') as f: f.write(c)
        print(f"Fixed {path}")

for f in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    fix_css_in_file(f)
