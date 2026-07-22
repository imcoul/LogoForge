import re

def read_file(path):
    with open(path, 'r') as f: return f.read()

def write_file(path, content):
    with open(path, 'w') as f: f.write(content)

app_content = read_file('src/App.tsx')

# Extract Tooltip
start = app_content.find("interface TooltipProps {")
end = app_content.find("const DesignChecklist = () => {")

if start != -1 and end != -1:
    tooltip_code = app_content[start:end]
    write_file('src/components/ui/Tooltip.tsx', "import React, { useState } from 'react';\nimport { motion, AnimatePresence } from 'motion/react';\n\nexport " + tooltip_code.replace("const Tooltip =", "const Tooltip ="))
    app_content = app_content[:start] + app_content[end:]
    app_content = "import { Tooltip } from './components/ui/Tooltip';\n" + app_content
    print("Extracted Tooltip")

# Extract DesignChecklist
start = app_content.find("const DesignChecklist = () => {")
end = app_content.find("// --- PRODUCT REQUIREMENT DOCUMENT (PRD) DATA & EXPORT UTILITIES ---")

if start != -1 and end != -1:
    dc_code = app_content[start:end]
    write_file('src/components/ui/DesignChecklist.tsx', "import React, { useState } from 'react';\nimport { CheckCircle, Check, Info, RefreshCw } from 'lucide-react';\nimport { Tooltip } from './Tooltip';\n\nexport " + dc_code)
    app_content = app_content[:start] + app_content[end:]
    app_content = "import { DesignChecklist } from './components/ui/DesignChecklist';\n" + app_content
    print("Extracted DesignChecklist")

write_file('src/App.tsx', app_content)

# Same for Studio.tsx
studio_content = read_file('src/views/Studio.tsx')
start = studio_content.find("interface TooltipProps {")
end = studio_content.find("const DesignChecklist = () => {")
if start != -1 and end != -1:
    studio_content = studio_content[:start] + studio_content[end:]
    studio_content = "import { Tooltip } from '../components/ui/Tooltip';\n" + studio_content

start = studio_content.find("const DesignChecklist = () => {")
end = studio_content.find("const CustomWaveformPlayer: React.FC")
if start != -1 and end != -1:
    studio_content = studio_content[:start] + studio_content[end:]
    studio_content = "import { DesignChecklist } from '../components/ui/DesignChecklist';\n" + studio_content

start = studio_content.find("const CustomWaveformPlayer: React.FC")
end = studio_content.find("export const Studio = () => {")
if start != -1 and end != -1:
    studio_content = studio_content[:start] + studio_content[end:]
    studio_content = "import { CustomWaveformPlayer } from '../components/ui/CustomWaveformPlayer';\n" + studio_content

write_file('src/views/Studio.tsx', studio_content)

