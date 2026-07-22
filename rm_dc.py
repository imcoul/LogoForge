import re
with open('src/views/Studio.tsx', 'r') as f: c = f.read()
c = re.sub(r'const DesignChecklist = \(\) => \{.*?\};\n\n', '', c, flags=re.DOTALL)
with open('src/views/Studio.tsx', 'w') as f: f.write(c)
