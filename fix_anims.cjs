const fs = require('fs');
let content = fs.readFileSync('./src/App.tsx', 'utf8');

// Replace ANIMATIONS
const block = `const ANIMATIONS = {
  float: { animate: { y: [0, -15, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  pulse: { animate: { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
  spin: { animate: { rotate: 360 }, transition: { duration: 8, repeat: Infinity, ease: "linear" } },
  pop: { animate: { scale: [0.8, 1.1, 1] }, transition: { duration: 0.5, type: "spring", bounce: 0.6, repeat: Infinity, repeatDelay: 1 } },
  flip: { animate: { rotateY: 360 }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 } }
};`;

const newBlock = `const ANIMATIONS = {
  float: { animate: { y: [0, -15, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
  pulse: { animate: { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const } },
  spin: { animate: { rotate: 360 }, transition: { duration: 8, repeat: Infinity, ease: "linear" as const } },
  pop: { animate: { scale: [0.8, 1.1, 1] }, transition: { duration: 0.5, type: "spring", bounce: 0.6, repeat: Infinity, repeatDelay: 1 } },
  flip: { animate: { rotateY: 360 }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" as const, repeatDelay: 1 } }
};`;

content = content.replace(block, newBlock);
fs.writeFileSync('./src/App.tsx', content);

let libContent = fs.readFileSync('./src/components/TemplateLibrary.tsx', 'utf8');
const libBlock = `interface TemplateLibraryProps {
  onSelectTemplate?: (svg: string, guide: any) => void;
}`;
const newLibBlock = `interface TemplateLibraryProps {
  onSelectTemplate?: (svg: any, guide: any) => Promise<void> | void;
}`;
libContent = libContent.replace(libBlock, newLibBlock);
// If it was already something else:
libContent = libContent.replace(/interface TemplateLibraryProps \{/g, `interface TemplateLibraryProps {\n  onSelectTemplate?: (svg: any, guide: any) => Promise<void> | void;`);

fs.writeFileSync('./src/components/TemplateLibrary.tsx', libContent);
