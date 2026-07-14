const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

const target = `<TemplateLibrary 
                          onSelectTemplate={(svg, guide) => handleUpdateAndSync({ svgSource: svg, brandGuide: guide })} 
                        />`;

const replace = `<TemplateLibrary 
                          activeProjectId={activeProjectId} 
                          onApplyTemplate={handleUpdateAndSync} 
                        />`;

content = content.replace(target, replace);
content = content.replace(target, replace); // do it twice for line 4618

fs.writeFileSync('./src/App.tsx', content);

