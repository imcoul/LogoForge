const fs = require('fs');
let gdContent = fs.readFileSync('./src/components/GoogleDriveIntegration.tsx', 'utf8');

gdContent = gdContent.replace(
  /{activeProject.brandGuide\?\.industry/g,
  `{activeProject.brandGuide?.brandVoice?.tone`
);

fs.writeFileSync('./src/components/GoogleDriveIntegration.tsx', gdContent);
