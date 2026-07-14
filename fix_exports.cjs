const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The react-markdown was added correctly, but the history type is still an issue because of duplicate declarations.
// Let's replace the EXACT interface manually.
content = content.replace(
  /history\?\: \{url\: string\, svg\: string\}\[\];\n/g, ''
); // clean up the blind replace

const interfaceMatch = `interface Project {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  svgSource: string | null;`;

const newInterface = `interface Project {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  svgSource: string | null;
  history?: {url: string, svg: string}[];`;
  
content = content.replace(interfaceMatch, newInterface);

// Let's check where handleExportSVG is. It should be inside the component.
const exportsInjection = `
  const handleExportSVG = () => {
    if (!activeProject?.svgSource) return;
    const blob = new Blob([activeProject.svgSource], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`\${activeProject.name || 'logo'}.svg\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!activeProject?.logoUrl) return;
    const a = document.createElement('a');
    a.href = activeProject.logoUrl;
    a.download = \`\${activeProject.name || 'logo'}.png\`;
    a.click();
  };
`;

// Remove the old injection
content = content.replace(exportsInjection, '');

// Put it immediately after the main App declaration
const appDecl = 'function App() {';
if (content.includes(appDecl)) {
  content = content.replace(appDecl, appDecl + '\n' + exportsInjection);
}

fs.writeFileSync('./src/App.tsx', content);
