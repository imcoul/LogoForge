const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Fix showToast mismatch
content = content.replace(
  /showToast\('Project cloned successfully!'\)/g,
  `showToast('success')`
);

content = content.replace(
  /history\?\: \{url\: string\, svg\: string\}\[\];/g,
  ''
);

const projBlock = `interface Project {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  svgSource: string | null;
  history?: {url: string, svg: string}[];`;
  
content = content.replace(/interface Project \{\s+id: string;\s+name: string;\s+description: string;\s+logoUrl: string \| null;\s+svgSource: string \| null;/g, projBlock);

content = content.replace(
  /interface TemplateLibraryProps \{/g,
  `interface TemplateLibraryProps {\n  onSelectTemplate?: (svg: any, guide: any) => Promise<void>;`
);

content = content.replace(
  /ease: 'easeInOut'/g,
  `ease: "easeInOut" as const`
);

fs.writeFileSync('./src/App.tsx', content);

let gdContent = fs.readFileSync('./src/components/GoogleDriveIntegration.tsx', 'utf8');
gdContent = gdContent.replace(
  /interface BrandGuide \{/g,
  `interface BrandGuide {\n  industry?: string;\n  voiceTone?: string;\n  philosophy?: string;\n  neutralColors?: string[];\n  dos?: string[];\n  donts?: string[];`
);
fs.writeFileSync('./src/components/GoogleDriveIntegration.tsx', gdContent);

let svgContent = fs.readFileSync('./src/components/SVGPathEditor.tsx', 'utf8');
svgContent = svgContent.replace(
  /const handlePointerDown = \(e: React.MouseEvent<HTMLDivElement> \| React.TouchEvent<HTMLDivElement>/g,
  `const handlePointerDown = (e: any`
);
fs.writeFileSync('./src/components/SVGPathEditor.tsx', svgContent);

