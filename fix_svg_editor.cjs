const fs = require('fs');

let svgContent = fs.readFileSync('./src/components/SVGPathEditor.tsx', 'utf8');

const target1 = `const handleNodeDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, nodeId: string, valIdx: number, initialValue: number) => {`;
const replace1 = `const handleNodeDragStart = (e: any, nodeId: string, valIdx: number, initialValue: number) => {`;

svgContent = svgContent.replace(target1, replace1);

const target2 = `const handlePointerDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {`;
const replace2 = `const handlePointerDown = (e: any) => {`;

svgContent = svgContent.replace(target2, replace2);

fs.writeFileSync('./src/components/SVGPathEditor.tsx', svgContent);

