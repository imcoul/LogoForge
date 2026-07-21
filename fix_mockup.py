with open('src/components/InteractiveMockupViewer.tsx', 'r') as f:
    lines = f.readlines()

for i in range(len(lines)-1, -1, -1):
    if '</div>' in lines[i]:
        lines[i] = lines[i].replace('</div>', '', 1)
        break

with open('src/components/InteractiveMockupViewer.tsx', 'w') as f:
    f.writelines(lines)
