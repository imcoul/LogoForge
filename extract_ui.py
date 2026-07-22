import re
import os

def read_file(path):
    with open(path, 'r') as f: return f.read()

def write_file(path, content):
    with open(path, 'w') as f: f.write(content)

studio_content = read_file('src/views/Studio.tsx')
app_content = read_file('src/App.tsx')
dash_content = read_file('src/views/Dashboard.tsx')
svg_content = read_file('src/components/SVGPathEditor.tsx')
mockup_content = read_file('src/components/InteractiveMockupViewer.tsx')

# 1. CustomWaveformPlayer
cw_match = re.search(r'(const CustomWaveformPlayer: React\.FC.*?\n\};\n)', studio_content, re.DOTALL)
if cw_match:
    cw_code = cw_match.group(1)
    write_file('src/components/ui/CustomWaveformPlayer.tsx', "import React, { useState, useRef, useEffect } from 'react';\nimport { Play, Pause } from 'lucide-react';\n\nexport " + cw_code)
    studio_content = studio_content.replace(cw_match.group(1), '')
    studio_content = "import { CustomWaveformPlayer } from '../components/ui/CustomWaveformPlayer';\n" + studio_content
    app_content = re.sub(r'const CustomWaveformPlayer: React\.FC.*?\n\};\n', '', app_content, flags=re.DOTALL)

# 2. DesignChecklist
dc_match = re.search(r'(const DesignChecklist: React\.FC.*?\n\};\n)', studio_content, re.DOTALL)
if dc_match:
    dc_code = dc_match.group(1)
    write_file('src/components/ui/DesignChecklist.tsx', "import React from 'react';\nimport { CheckCircle, Clock } from 'lucide-react';\n\nexport " + dc_code)
    studio_content = studio_content.replace(dc_match.group(1), '')
    studio_content = "import { DesignChecklist } from '../components/ui/DesignChecklist';\n" + studio_content
    app_content = re.sub(r'const DesignChecklist: React\.FC.*?\n\};\n', '', app_content, flags=re.DOTALL)

# 3. safeFormatDate
sfd_match = re.search(r'(const safeFormatDate = .*?\n\};\n)', app_content, re.DOTALL)
if sfd_match:
    sfd_code = sfd_match.group(1)
    write_file('src/components/ui/safeFormatDate.ts', "export " + sfd_code)
    app_content = app_content.replace(sfd_match.group(1), '')
    # Dashboard has it too?
    dash_content = re.sub(r'const safeFormatDate = .*?\n\};\n', '', dash_content, flags=re.DOTALL)
    dash_content = "import { safeFormatDate } from '../components/ui/safeFormatDate';\n" + dash_content
    app_content = "import { safeFormatDate } from './components/ui/safeFormatDate';\n" + app_content
else:
    sfd_match = re.search(r'(const safeFormatDate = .*?\n\};\n)', dash_content, re.DOTALL)
    if sfd_match:
        sfd_code = sfd_match.group(1)
        write_file('src/components/ui/safeFormatDate.ts', "export " + sfd_code)
        dash_content = dash_content.replace(sfd_match.group(1), '')
        dash_content = "import { safeFormatDate } from '../components/ui/safeFormatDate';\n" + dash_content

# 4. sanitizeSVG
ssvg_match = re.search(r'(const sanitizeSVG = .*?\n\};\n)', app_content, re.DOTALL)
if ssvg_match:
    ssvg_code = ssvg_match.group(1)
    write_file('src/components/ui/sanitizeSVG.ts', "export " + ssvg_code)
    app_content = app_content.replace(ssvg_match.group(1), '')
    studio_content = re.sub(r'const sanitizeSVG = .*?\n\};\n', '', studio_content, flags=re.DOTALL)
    dash_content = re.sub(r'const sanitizeSVG = .*?\n\};\n', '', dash_content, flags=re.DOTALL)
    svg_content = re.sub(r'const sanitizeSVG = .*?\n\};\n', '', svg_content, flags=re.DOTALL)
    mockup_content = re.sub(r'const sanitizeSVG = .*?\n\};\n', '', mockup_content, flags=re.DOTALL)
    
    app_content = "import { sanitizeSVG } from './components/ui/sanitizeSVG';\n" + app_content
    studio_content = "import { sanitizeSVG } from '../components/ui/sanitizeSVG';\n" + studio_content
    dash_content = "import { sanitizeSVG } from '../components/ui/sanitizeSVG';\n" + dash_content
    svg_content = "import { sanitizeSVG } from './ui/sanitizeSVG';\n" + svg_content
    mockup_content = "import { sanitizeSVG } from './ui/sanitizeSVG';\n" + mockup_content

# 5. ANIMATIONS
anim_match = re.search(r'(const ANIMATIONS = \{.*?\n\};\n)', app_content, re.DOTALL)
if anim_match:
    anim_code = anim_match.group(1)
    write_file('src/components/ui/ANIMATIONS.ts', "export " + anim_code)
    app_content = app_content.replace(anim_match.group(1), '')
    studio_content = re.sub(r'const ANIMATIONS = \{.*?\n\};\n', '', studio_content, flags=re.DOTALL)
    
    app_content = "import { ANIMATIONS } from './components/ui/ANIMATIONS';\n" + app_content
    studio_content = "import { ANIMATIONS } from '../components/ui/ANIMATIONS';\n" + studio_content

write_file('src/views/Studio.tsx', studio_content)
write_file('src/App.tsx', app_content)
write_file('src/views/Dashboard.tsx', dash_content)
write_file('src/components/SVGPathEditor.tsx', svg_content)
write_file('src/components/InteractiveMockupViewer.tsx', mockup_content)
print("Extracted ui components")
