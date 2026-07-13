import { jsPDF } from 'jspdf';
import { Project } from '../store';

export const exportBrandGuidePDF = (project: Project) => {
  if (!project.brandGuide) return;
  const guide = project.brandGuide;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(`Brand Guidelines: ${guide.brandName || project.name}`, 20, 30);
  
  // Philosophy
  doc.setFontSize(16);
  doc.text('Brand Philosophy', 20, 50);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const philosophyLines = doc.splitTextToSize(guide.brandVoice?.description || 'No description provided.', pageWidth - 40);
  doc.text(philosophyLines, 20, 60);
  
  let currentY = 60 + (philosophyLines.length * 7) + 15;
  
  // Colors
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Color Palette', 20, currentY);
  currentY += 15;
  
  const colors = [
    { label: 'Primary 1', hex: guide.primaryColors?.[0]?.hex },
    { label: 'Primary 2', hex: guide.primaryColors?.[1]?.hex },
    { label: 'Secondary 1', hex: guide.secondaryColors?.[0]?.hex },
    { label: 'Secondary 2', hex: guide.secondaryColors?.[1]?.hex }
  ];
  
  doc.setFont('helvetica', 'normal');
  colors.forEach((color) => {
    if (color.hex) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFillColor(color.hex);
      doc.rect(20, currentY, 20, 20, 'F');
      
      // Border for white colors
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, currentY, 20, 20, 'D');
      
      doc.setFontSize(10);
      doc.text(`${color.label}: ${color.hex}`, 45, currentY + 12);
      currentY += 25;
    }
  });
  
  currentY += 5;
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }
  
  // Typography
  if (guide.typography) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Typography', 20, currentY);
    currentY += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Primary Font: ${guide.typography.primaryFont}`, 20, currentY);
    currentY += 10;
    doc.text(`Secondary Font: ${guide.typography.secondaryFont}`, 20, currentY);
    currentY += 15;
  }
  
  // Tone of Voice
  if (guide.brandVoice?.keywords && guide.brandVoice.keywords.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Tone of Voice Keywords', 20, currentY);
    currentY += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const keywordsLines = doc.splitTextToSize(guide.brandVoice.keywords.join(', '), pageWidth - 40);
    doc.text(keywordsLines, 20, currentY);
  }
  
  doc.save(`${project.name.replace(/\s+/g, '-').toLowerCase()}-brand-guide.pdf`);
};
