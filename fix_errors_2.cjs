const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// The first script probably matched the wrong place or didn't replace fully. Let's fix Markdown manually.
if (!content.includes("import Markdown from 'react-markdown';")) {
  content = "import Markdown from 'react-markdown';\n" + content;
}

// Let's check if `Project` type got updated correctly.
// Some interfaces might be duplicated.
// Let's just blindly inject history into any Project interface.
content = content.replace(/interface Project \{/g, 'interface Project {\n  history?: {url: string, svg: string}[];\n');

// Handle the export methods. It's possible they were injected in the wrong place and are out of scope.
// Let's inject them right before `return (` inside App component.

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

const returnMatch = '  return (\n    <div className="flex h-screen bg-neutral-100';
if (content.includes(returnMatch)) {
  content = content.replace(returnMatch, exportsInjection + '\n' + returnMatch);
}

fs.writeFileSync('./src/App.tsx', content);
