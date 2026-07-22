import re
import glob

for f in glob.glob('src/**/*.tsx', recursive=True):
    with open(f, 'r') as file: c = file.read()
    orig = c
    # Instead of parsing everything, let's just add it to any button that doesn't have it
    # We can replace 'disabled:opacity-50 disabled:cursor-not-allowed' inside classNames?
    # It's better to just regex replace <button.*?className="([^"]+)".*?disabled
    # Actually, let's just search for `cursor-not-allowed` and replace the conditional strings with Tailwind's `disabled:opacity-50 disabled:cursor-not-allowed`? The user said "Disabled state styling not standardized".
    # I'll just skip this script for now and just add a global button disabled style in index.css
    pass
