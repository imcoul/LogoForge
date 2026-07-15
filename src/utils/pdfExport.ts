import { jsPDF } from 'jspdf';
import { Project } from '../store';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 120, g: 120, b: 120 };
}

function rgbToCmyk(r: number, g: number, b: number) {
  const rPercent = r / 255;
  const gPercent = g / 255;
  const bPercent = b / 255;

  const k = 1 - Math.max(rPercent, gPercent, bPercent);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = Math.round(((1 - rPercent - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gPercent - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bPercent - k) / (1 - k)) * 100);
  const kPercent = Math.round(k * 100);

  return { c, m, y, k: kPercent };
}

export const exportBrandGuidePDF = (project: Project) => {
  if (!project.brandGuide) return;
  const guide = project.brandGuide;
  const brandName = guide.brandName || project.name;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Fetch primary/accent colors
  const primaryColorHex = guide.primaryColors?.[0]?.hex || '#6366f1';
  const secondaryColorHex = guide.secondaryColors?.[0]?.hex || '#10b981';
  const rgbPrimary = hexToRgb(primaryColorHex);
  const rgbSecondary = hexToRgb(secondaryColorHex);
  
  // ==========================================
  // PAGE 1: HIGH-IMPACT COVER SLIDE
  // ==========================================
  // Deep elegant charcoal/indigo background
  doc.setFillColor(18, 18, 24);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Custom design background accents (Brand Color Corner Flares)
  doc.setFillColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.rect(0, 0, 4, pageHeight, 'F'); // Left vertical brand accent bar
  
  doc.setFillColor(rgbSecondary.r, rgbSecondary.g, rgbSecondary.b);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F'); // Bottom horizontal secondary accent bar
  
  // Draw an abstract vector design frame on the cover page
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.25);
  doc.rect(15, 15, pageWidth - 30, pageHeight - 40, 'D');
  
  // Try to render the logo in a central card on the cover
  let logoAdded = false;
  if (project.logoUrl) {
    try {
      // Create a centered white circular shield or rectangle for the logo
      doc.setFillColor(255, 255, 255);
      doc.rect(pageWidth / 2 - 25, 45, 50, 50, 'F');
      doc.setDrawColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
      doc.setLineWidth(1);
      doc.rect(pageWidth / 2 - 25, 45, 50, 50, 'D');
      
      // Embed logo
      doc.addImage(project.logoUrl, 'PNG', pageWidth / 2 - 20, 50, 40, 40);
      logoAdded = true;
    } catch (e) {
      console.warn('Failed to embed logo image into cover page:', e);
    }
  }
  
  // Cover Headings
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  
  const textY = logoAdded ? 120 : 80;
  doc.text(brandName.toUpperCase(), pageWidth / 2, textY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 160);
  doc.text('OFFICIAL VISUAL IDENTITY & BRAND GUIDELINES', pageWidth / 2, textY + 8, { align: 'center' });
  
  // Draw separator line
  doc.setDrawColor(100, 100, 110);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 30, textY + 16, pageWidth / 2 + 30, textY + 16);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.text('FORGEL BRANDING SYSTEM', pageWidth / 2, textY + 24, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 120);
  doc.text(`AUTHENTIC SN SNAPSHOT ID: ${project.id.substring(0, 12).toUpperCase()}`, pageWidth / 2, textY + 32, { align: 'center' });
  doc.text(`PUBLISHED ON: ${new Date(project.createdAt).toLocaleDateString()}`, pageWidth / 2, textY + 38, { align: 'center' });
  
  // ==========================================
  // PAGE 2: BRAND MISSION, VALUES & TONE
  // ==========================================
  doc.addPage();
  
  // Clean header line
  doc.setFillColor(245, 245, 247);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  doc.setTextColor(100, 100, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SECTION 01: BRAND STRATEGY', 20, 12);
  
  doc.setTextColor(20, 20, 24);
  doc.setFontSize(14);
  doc.text(brandName.toUpperCase(), 20, 20);
  
  doc.setDrawColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setLineWidth(1);
  doc.line(20, 28, 40, 28);
  
  // 2.1 Brand Philosophy / Description
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Core Brand Philosophy', 20, 45);
  
  doc.setTextColor(40, 40, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const voiceDesc = guide.brandVoice?.description || 'Forgel branding engines have crafted this strategy to resonate seamlessly across target demographic touchpoints, anchoring visual forms within standard structural benchmarks.';
  const philosophyLines = doc.splitTextToSize(voiceDesc, pageWidth - 40);
  doc.text(philosophyLines, 20, 52);
  
  let yOffset = 52 + (philosophyLines.length * 6) + 12;
  
  // 2.2 Core Values Cards
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Corporate Core Principles', 20, yOffset);
  
  yOffset += 8;
  
  const values = [
    { title: 'Architectural Honesty', desc: 'A commitment to structure, transparent geometric vector forms, and functional aesthetics.' },
    { title: 'Demographic Precision', desc: 'Crafting brand assets to meet specific client specifications and target audiences.' },
    { title: 'Creative Agility', desc: 'Empowering iterative modification cycles and fluid canvas manipulation.' }
  ];
  
  values.forEach((val, i) => {
    // Card Box
    doc.setFillColor(250, 250, 252);
    doc.rect(20, yOffset, pageWidth - 40, 16, 'F');
    doc.setDrawColor(230, 230, 235);
    doc.setLineWidth(0.3);
    doc.rect(20, yOffset, pageWidth - 40, 16, 'D');
    
    // Colored side tag
    doc.setFillColor(i === 0 ? rgbPrimary.r : i === 1 ? rgbSecondary.r : 120, i === 0 ? rgbPrimary.g : i === 1 ? rgbSecondary.g : 120, i === 0 ? rgbPrimary.b : i === 1 ? rgbSecondary.b : 120);
    doc.rect(20, yOffset, 2, 16, 'F');
    
    doc.setTextColor(20, 20, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(val.title, 26, yOffset + 5);
    
    doc.setTextColor(100, 100, 110);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(val.desc, 26, yOffset + 11);
    
    yOffset += 20;
  });
  
  yOffset += 4;
  
  // 2.3 Brand Voice & Attributes
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Tone of Voice Blueprint', 20, yOffset);
  
  yOffset += 8;
  
  doc.setTextColor(80, 80, 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('We express our visual and verbal identity through the following high-precision keywords:', 20, yOffset);
  
  yOffset += 8;
  const keywords = guide.brandVoice?.keywords || ['Sophisticated', 'Dynamic', 'Functional', 'Forward-looking'];
  
  keywords.forEach((word, index) => {
    const colIdx = index % 2;
    const rowIdx = Math.floor(index / 2);
    
    const chipX = 20 + colIdx * 85;
    const chipY = yOffset + rowIdx * 12;
    
    // Chip rectangle
    doc.setFillColor(240, 240, 250);
    doc.rect(chipX, chipY, 75, 8, 'F');
    
    doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`●  ${word.toUpperCase()}`, chipX + 4, chipY + 6);
  });
  
  // Footer Page Number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 160);
  doc.text('SECTION 01: STRATEGY  |  PAGE 2', pageWidth / 2, pageHeight - 12, { align: 'center' });
  
  // ==========================================
  // PAGE 3: VISUAL GUIDELINES & SPECIFICATIONS
  // ==========================================
  doc.addPage();
  
  // Clean header line
  doc.setFillColor(245, 245, 247);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  doc.setTextColor(100, 100, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SECTION 02: VISUAL GUIDELINES', 20, 12);
  
  doc.setTextColor(20, 20, 24);
  doc.setFontSize(14);
  doc.text('VISUAL IDENTITY SYSTEM', 20, 20);
  
  doc.setDrawColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setLineWidth(1);
  doc.line(20, 28, 40, 28);
  
  // Color Palette Grid with RGB/CMYK Calculations
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Color System Specifications', 20, 42);
  
  const allColors = [
    { name: 'Primary Core Color', hex: primaryColorHex },
    { name: 'Secondary Core Color', hex: secondaryColorHex },
    { name: 'Dominant Dark Base', hex: '#16161a' },
    { name: 'Paper White Canvas', hex: '#fbfbfe' }
  ];
  
  let colOffset = 48;
  allColors.forEach((color, idx) => {
    const rgb = hexToRgb(color.hex);
    const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
    
    // Draw Box wrapper
    doc.setFillColor(252, 252, 253);
    doc.rect(20, colOffset, pageWidth - 40, 22, 'F');
    doc.setDrawColor(235, 235, 240);
    doc.setLineWidth(0.3);
    doc.rect(20, colOffset, pageWidth - 40, 22, 'D');
    
    // Swatch
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
    doc.rect(24, colOffset + 3, 25, 16, 'F');
    
    doc.setDrawColor(200, 200, 205);
    doc.rect(24, colOffset + 3, 25, 16, 'D'); // Swatch border
    
    // Specifications
    doc.setTextColor(30, 30, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(color.name, 56, colOffset + 7);
    
    doc.setTextColor(80, 80, 95);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`HEX:  ${color.hex.toUpperCase()}`, 56, colOffset + 12);
    doc.text(`RGB:  ${rgb.r}, ${rgb.g}, ${rgb.b}`, 56, colOffset + 17);
    doc.text(`CMYK: ${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%`, 130, colOffset + 12);
    
    colOffset += 26;
  });
  
  // Typography Specifications
  colOffset += 4;
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Typography Hierarchy', 20, colOffset);
  
  colOffset += 8;
  
  // Title font
  doc.setTextColor(20, 20, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Display Typography: ${guide.typography?.primaryFont || 'Inter'}`, 20, colOffset);
  
  doc.setTextColor(80, 80, 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Used primarily for bold headings, main slide introductions, and display metrics.', 20, colOffset + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww', 20, colOffset + 12);
  
  colOffset += 20;
  
  // Body font
  doc.setTextColor(20, 20, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Secondary / Body Typography: ${guide.typography?.secondaryFont || 'JetBrains Mono'}`, 20, colOffset);
  
  doc.setTextColor(80, 80, 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Used for general text descriptions, interface labels, and strategic documentation summaries.', 20, colOffset + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww', 20, colOffset + 12);
  
  // Footer Page Number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 160);
  doc.text('SECTION 02: VISUAL GUIDELINES  |  PAGE 3', pageWidth / 2, pageHeight - 12, { align: 'center' });
  
  // ==========================================
  // PAGE 4: INTERACTIVE MOCKUP APPLICATIONS
  // ==========================================
  doc.addPage();
  
  // Clean header line
  doc.setFillColor(245, 245, 247);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  doc.setTextColor(100, 100, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SECTION 03: ENVIRONMENTAL APPLICATIONS', 20, 12);
  
  doc.setTextColor(20, 20, 24);
  doc.setFontSize(14);
  doc.text('REAL-WORLD COMPOSITING', 20, 20);
  
  doc.setDrawColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setLineWidth(1);
  doc.line(20, 28, 40, 28);
  
  // Mockup applications details
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Corporate Applications & Collateral', 20, 42);
  
  let mockupY = 50;
  
  const mockupsData = [
    { title: 'Corporate Business Cards (Stationary Card 💳)', desc: 'Printed on luxury 350gsm premium cream/matte linen, the logo occupies the central shield position. Clean geometry supports structured readability.', accent: 'Linen / Charcoal / Forest Velvet' },
    { title: 'Mobile Launch Interface (App Splash Screen 📱)', desc: 'A minimalist dark launch view utilizing deep ambient gradients and responsive entry curves. The active logo glows softly against a sleek UI backdrop.', accent: 'Screen Glow / Responsive Fade' },
    { title: 'Urban Architecture Showcase (Billboard Signage 🏢)', desc: 'Architectural display panels mapping vector forms across high-contrast grid lines. Utilizes neon shadow offsets to maximize high-visibility environmental footprints.', accent: 'Brutalist Framework / Neon Shadow' }
  ];
  
  mockupsData.forEach((mock, idx) => {
    doc.setFillColor(250, 251, 253);
    doc.rect(20, mockupY, pageWidth - 40, 24, 'F');
    doc.setDrawColor(225, 226, 232);
    doc.setLineWidth(0.35);
    doc.rect(20, mockupY, pageWidth - 40, 24, 'D');
    
    // Title
    doc.setTextColor(20, 20, 25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(mock.title, 24, mockupY + 6);
    
    // Description
    doc.setTextColor(80, 80, 90);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitDesc = doc.splitTextToSize(mock.desc, pageWidth - 48);
    doc.text(splitDesc, 24, mockupY + 11);
    
    // Key values
    doc.setTextColor(rgbSecondary.r, rgbSecondary.g, rgbSecondary.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`THEME: ${mock.accent.toUpperCase()}`, 24, mockupY + 21);
    
    mockupY += 28;
  });
  
  // Auditory Branding / Sonic section
  mockupY += 2;
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Auditory Signature Architecture', 20, mockupY);
  
  mockupY += 8;
  
  doc.setFillColor(248, 245, 253);
  doc.rect(20, mockupY, pageWidth - 40, 32, 'F');
  doc.setDrawColor(215, 200, 245);
  doc.setLineWidth(0.4);
  doc.rect(20, mockupY, pageWidth - 40, 32, 'D');
  
  // Left sonic column
  doc.setTextColor(20, 20, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Acoustic Motif Model', 24, mockupY + 7);
  
  doc.setTextColor(70, 70, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('● Synthesizer Chord: C4 Major-9th (Ascending Arpeggio)', 24, mockupY + 13);
  doc.text('● Filter Topology: 24dB/oct dynamic Biquad lowpass', 24, mockupY + 19);
  doc.text('● Custom ADSR Envelope shaping enabled', 24, mockupY + 25);
  
  // Right sonic column (ADSR parameters)
  doc.setTextColor(rgbPrimary.r, rgbPrimary.g, rgbPrimary.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ADSR Target Matrix', 130, mockupY + 7);
  
  doc.setTextColor(100, 100, 115);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('• Attack Time: 0.10s', 130, mockupY + 13);
  doc.text('• Decay Time:  0.30s', 130, mockupY + 19);
  doc.text('• Sustain Hold: 50%', 130, mockupY + 25);
  
  // Footer Page Number
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 160);
  doc.text('SECTION 03: ENVIRONMENTAL  |  PAGE 4', pageWidth / 2, pageHeight - 12, { align: 'center' });
  
  // ==========================================
  // SAVE & EXPORT
  // ==========================================
  const sanitizedName = brandName.replace(/\s+/g, '-').toLowerCase();
  doc.save(`${sanitizedName}-brand-guidelines.pdf`);
};
