with open('src/components/InteractiveMockupViewer.tsx', 'r') as f: c = f.read()
c = c.replace('logoSvg', 'svgSource')
with open('src/components/InteractiveMockupViewer.tsx', 'w') as f: f.write(c)

with open('src/components/ui/CustomWaveformPlayer.tsx', 'r') as f: c = f.read()
c = c.replace("import { Play, Pause } from 'lucide-react';", "import { Play, Pause, Music, ChevronRight } from 'lucide-react';")
with open('src/components/ui/CustomWaveformPlayer.tsx', 'w') as f: f.write(c)

with open('src/components/ui/LoadingSkeleton.tsx', 'r') as f: c = f.read()
c = c.replace('direction: "alternate"', 'repeatType: "reverse"')
with open('src/components/ui/LoadingSkeleton.tsx', 'w') as f: f.write(c)

with open('src/components/ui/sanitizeSVG.ts', 'r') as f: c = f.read()
c = "import DOMPurify from 'dompurify';\n" + c
with open('src/components/ui/sanitizeSVG.ts', 'w') as f: f.write(c)
