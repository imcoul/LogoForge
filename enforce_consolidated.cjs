const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// Switch the default state of useConsolidatedWorkspace to true
content = content.replace(
  /const \[useConsolidatedWorkspace, setUseConsolidatedWorkspace\] = useState\(false\);/,
  /const [useConsolidatedWorkspace, setUseConsolidatedWorkspace] = useState(true);/
);

// We need to pass the state as true directly.
content = content.replace(
  'const [useConsolidatedWorkspace, setUseConsolidatedWorkspace] = useState(false);',
  'const [useConsolidatedWorkspace, setUseConsolidatedWorkspace] = useState(true);'
);

fs.writeFileSync('./src/App.tsx', content);
