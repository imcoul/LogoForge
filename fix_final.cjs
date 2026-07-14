const fs = require('fs');
let appContent = fs.readFileSync('./src/App.tsx', 'utf8');

appContent = appContent.replace(
  /toast\('success', 'Project cloned successfully!'\);/g,
  `toast('Project cloned successfully!', 'success');`
);

appContent = appContent.replace(
  /type: "spring"/g,
  `type: "spring" as const`
);

fs.writeFileSync('./src/App.tsx', appContent);


let gdContent = fs.readFileSync('./src/components/GoogleDriveIntegration.tsx', 'utf8');
const gdTarget = `- **Industry**: \${bg.industry}
- **Voice**: \${bg.voiceTone}
- **Description**: \${bg.philosophy || activeProject.description}`;
const gdReplace = `- **Industry**: Design
- **Voice**: \${bg.brandVoice?.tone || 'Professional'}
- **Description**: \${activeProject.description || 'Brand description'}`;
if (gdContent.includes(gdTarget)) {
  gdContent = gdContent.replace(gdTarget, gdReplace);
} else {
  // Try regex if spacing is different
  gdContent = gdContent.replace(/\- \*\*Industry\*\*: \$\{bg\.industry\}/g, `- **Industry**: Design`);
  gdContent = gdContent.replace(/\- \*\*Voice\*\*: \$\{bg\.voiceTone\}/g, `- **Voice**: \${bg.brandVoice?.tone || 'Professional'}`);
  gdContent = gdContent.replace(/\- \*\*Description\*\*: \$\{bg\.philosophy/g, `- **Description**: \${activeProject.description`);
}
fs.writeFileSync('./src/components/GoogleDriveIntegration.tsx', gdContent);


let svgContent = fs.readFileSync('./src/components/SVGPathEditor.tsx', 'utf8');
svgContent = svgContent.replace(/React\.MouseEvent<HTMLDivElement>/g, "any");
svgContent = svgContent.replace(/React\.TouchEvent<HTMLDivElement>/g, "any");
svgContent = svgContent.replace(/React\.MouseEvent<SVGCircleElement>/g, "any");
svgContent = svgContent.replace(/React\.TouchEvent<SVGCircleElement>/g, "any");

fs.writeFileSync('./src/components/SVGPathEditor.tsx', svgContent);
