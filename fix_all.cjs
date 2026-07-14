const fs = require('fs');

// App.tsx Fixes
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// 1. Fix showToast signature
content = content.replace(
  /showToast\('Project cloned successfully!'\)/g,
  `showToast('success')`
);

// 2. Fix Project interface
// Remove any incorrect history definition first
content = content.replace(/  history\?\: \{url\: string\, svg\: string\}\[\];\n/g, '');

const interfaceMatch = `interface Project {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  svgSource: string | null;`;

const interfaceReplacement = `interface Project {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  svgSource: string | null;
  history?: {url: string, svg: string}[];`;
  
content = content.replace(interfaceMatch, interfaceReplacement);

// 3. Fix TemplateLibraryProps
content = content.replace(
  /interface TemplateLibraryProps \{/g,
  `interface TemplateLibraryProps {\n  onSelectTemplate?: (svg: any, guide: any) => Promise<void>;`
);

// 4. Fix Framer Motion ease string issue
content = content.replace(
  /ease: 'easeInOut'/g,
  `ease: "easeInOut" as const`
);

fs.writeFileSync('./src/App.tsx', content);

// 5. Fix GoogleDriveIntegration.tsx
let gdContent = fs.readFileSync('./src/components/GoogleDriveIntegration.tsx', 'utf8');
const brandGuideMatch = `interface BrandGuide {
  primaryColors: string[];
  typography: {
    heading: string;
    body: string;
  };
  keywords: string[];
}`;

const brandGuideReplacement = `interface BrandGuide {
  primaryColors: string[];
  typography: {
    heading: string;
    body: string;
  };
  keywords: string[];
  industry?: string;
  voiceTone?: string;
  philosophy?: string;
  neutralColors?: string[];
  dos?: string[];
  donts?: string[];
}`;
if (gdContent.includes(brandGuideMatch)) {
  gdContent = gdContent.replace(brandGuideMatch, brandGuideReplacement);
} else {
  // fallback if the interface doesn't match perfectly
  gdContent = gdContent.replace(
    /interface BrandGuide \{/g,
    `interface BrandGuide {\n  industry?: string;\n  voiceTone?: string;\n  philosophy?: string;\n  neutralColors?: string[];\n  dos?: string[];\n  donts?: string[];`
  );
}

fs.writeFileSync('./src/components/GoogleDriveIntegration.tsx', gdContent);

// 6. Fix SVGPathEditor.tsx
let svgContent = fs.readFileSync('./src/components/SVGPathEditor.tsx', 'utf8');
svgContent = svgContent.replace(
  /const handlePointerDown = \(e: React.MouseEvent<HTMLDivElement> \| React.TouchEvent<HTMLDivElement>/g,
  `const handlePointerDown = (e: any`
);
fs.writeFileSync('./src/components/SVGPathEditor.tsx', svgContent);

