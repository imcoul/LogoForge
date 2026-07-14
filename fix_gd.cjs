const fs = require('fs');

let gdContent = fs.readFileSync('./src/components/GoogleDriveIntegration.tsx', 'utf8');

// The incorrect fields are:
// industry, voiceTone, philosophy, neutralColors, dos, donts

// Let's replace the markdown string generation:
const oldMd = `- **Industry Category**: \${bg.industry}
- **Tone of Voice**: \${bg.voiceTone}
- **Description**: \${bg.philosophy || activeProject.description}

## 2. Color Palette Hex Hierarchy
- **Primary Color**: \${bg.primaryColors[0]?.name || 'Accent'} (\${bg.primaryColors[0]?.hex || '#000000'})
- **Secondary Color**: \${bg.secondaryColors[0]?.name || 'Supporting'} (\${bg.secondaryColors[0]?.hex || '#777777'})
- **Background Palette**: \${bg.neutralColors?.[0]?.name || 'Canvas'} (\${bg.neutralColors?.[0]?.hex || '#ffffff'})

## 3. Brand Directives (Dos and Don'ts)
- **Do's**:
\${bg.dos?.map(item => \`  - \${item}\`).join('\\n') || '  - Preserve color values\\n  - Ensure visual contrast'}
- **Don'ts**:
\${bg.donts?.map(item => \`  - \${item}\`).join('\\n') || '  - Distort vector coordinates\\n  - Apply low contrast backgrounds'}`;

const newMd = `- **Industry Category**: Design
- **Tone of Voice**: \${bg.brandVoice?.tone || 'Professional'}
- **Description**: \${activeProject.description || 'Brand description'}

## 2. Color Palette Hex Hierarchy
- **Primary Color**: \${bg.primaryColors?.[0]?.name || 'Accent'} (\${bg.primaryColors?.[0]?.hex || '#000000'})
- **Secondary Color**: \${bg.secondaryColors?.[0]?.name || 'Supporting'} (\${bg.secondaryColors?.[0]?.hex || '#777777'})

## 3. Brand Directives (Dos and Don'ts)
- **Do's**:
  - Preserve color values
  - Ensure visual contrast
- **Don'ts**:
\${bg.logoUsage?.doNot?.map(item => \`  - \${item}\`).join('\\n') || '  - Distort vector coordinates\\n  - Apply low contrast backgrounds'}`;

gdContent = gdContent.replace(oldMd, newMd);

// Also check line 631 for industry
const oldMd2 = `- **Industry**: \${bg.industry}
- **Voice**: \${bg.voiceTone}
- **Description**: \${bg.philosophy || activeProject.description}`;

const newMd2 = `- **Industry**: Design
- **Voice**: \${bg.brandVoice?.tone || 'Professional'}
- **Description**: \${activeProject.description || 'Brand description'}`;

gdContent = gdContent.replace(oldMd2, newMd2);


fs.writeFileSync('./src/components/GoogleDriveIntegration.tsx', gdContent);

