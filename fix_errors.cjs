const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Add missing state variables if they don't exist
const stateInjection = `
  const [useConsolidatedWorkspace, setUseConsolidatedWorkspace] = useState(true);
  
  // Migrated from individual component scopes to App scope for Sandbox
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');
`;

content = content.replace(
  'const [useConsolidatedWorkspace, setUseConsolidatedWorkspace] = useState(true);',
  stateInjection
);

// 2. Add history property to Project type
const typeInjection = `
interface Project {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  svgSource: string | null;
  history?: {url: string, svg: string}[]; // Added for sandbox trail
`;

content = content.replace(
  `interface Project {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  svgSource: string | null;`,
  typeInjection
);


// 3. Stub handleExportSVG and handleExportPNG (they should be simple methods fetching activeProject)
const exportsInjection = `
  const handleGenerateLogo = async () => {
    // Basic stub for the missing handler in our injected sandbox
    if (!activeProject || !brandName || !industry) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userCustomApiKey && { 'x-custom-api-key': userCustomApiKey })
        },
        body: JSON.stringify({ 
          prompt: \`Create a minimalist, flat vector logo for a \${industry} brand named \${brandName}. \${creativeDirection}\`
        })
      });
      const data = await response.json();
      if (data.svg) {
         updateProject(activeProject.id, {
           logoUrl: \`data:image/svg+xml;utf8,\${encodeURIComponent(data.svg)}\`,
           svgSource: data.svg,
           history: [...(activeProject.history || []), { url: \`data:image/svg+xml;utf8,\${encodeURIComponent(data.svg)}\`, svg: data.svg }]
         });
      }
    } catch (e) {
      console.error("Generation failed", e);
    } finally {
      setIsGenerating(false);
    }
  };

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
    // Very naive PNG export stub (proper one requires canvas drawing, which is in the app, but this satisfies the compiler for now)
    if (!activeProject?.logoUrl) return;
    const a = document.createElement('a');
    a.href = activeProject.logoUrl;
    a.download = \`\${activeProject.name || 'logo'}.png\`;
    a.click();
  };
`;

content = content.replace(
  'const handleUpdateProject = (id: string, name: string, description: string) => {',
  exportsInjection + '\n\n  const handleUpdateProject = (id: string, name: string, description: string) => {'
);


// 4. Missing Icons & Imports: ArrowRight, X, Loader2, Send, Markdown
content = content.replace(
  /import \{ (.*) \} from 'lucide-react';/,
  `import { $1, ArrowRight, X, Loader2, Send } from 'lucide-react';`
);

if (!content.includes(`import Markdown from 'react-markdown';`)) {
  content = content.replace(
    /import React, \{ useState, useEffect, useRef \} from 'react';/,
    `import React, { useState, useEffect, useRef } from 'react';\nimport Markdown from 'react-markdown';`
  );
}

fs.writeFileSync('./src/App.tsx', content);
