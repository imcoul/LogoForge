import re

def read_file(path):
    with open(path, 'r') as f: return f.read()

def write_file(path, content):
    with open(path, 'w') as f: f.write(content)

app_content = read_file('src/App.tsx')
studio_content = read_file('src/views/Studio.tsx')

# Find Tooltip
start = app_content.find("interface TooltipProps {")
end = app_content.find("};\n\nconst App = ")
if start != -1 and end != -1:
    tooltip_code = app_content[start:end+2]
    write_file('src/components/ui/Tooltip.tsx', "import React, { useState } from 'react';\nimport { motion, AnimatePresence } from 'motion/react';\n\nexport " + tooltip_code.replace("const Tooltip =", "const Tooltip ="))
    app_content = app_content[:start] + app_content[end+2:]
    
    # Do the same for studio
    s_start = studio_content.find("interface TooltipProps {")
    # In studio, what's after Tooltip? Let's use regex for studio
    studio_content = re.sub(r'interface TooltipProps \{.*?(?=const CustomWaveformPlayer|export const Studio)', '', studio_content, flags=re.DOTALL)
    
    app_content = "import { Tooltip } from './components/ui/Tooltip';\n" + app_content
    studio_content = "import { Tooltip } from '../components/ui/Tooltip';\n" + studio_content
    
    write_file('src/App.tsx', app_content)
    write_file('src/views/Studio.tsx', studio_content)
    print("Extracted Tooltip")
