// TemplateLibrary.tsx - Auto-populates pre-built brand templates
import React from 'react';
import { Sparkles, Leaf, Shield, Gem } from 'lucide-react';
import { useAppStore, Project } from '../store';

const TEMPLATES = [
  {
    id: 'volt',
    name: 'Volt Cybernetics',
    industry: 'Deep Tech & AI',
    theme: 'Cybernetic Brutalist',
    icon: Shield,
    colorClasses: 'from-cyan-500 to-slate-900',
    svgSource: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#0B0F19"/>
  <!-- Cyber Hexagonal Node -->
  <polygon points="100,30 160,65 160,135 100,170 40,135 40,65" fill="none" stroke="#06B6D4" stroke-width="4" stroke-linejoin="round"/>
  <!-- Outer Energy Accents -->
  <line x1="100" y1="10" x2="100" y2="30" stroke="#06B6D4" stroke-width="4" stroke-linecap="round"/>
  <line x1="30" y1="140" x2="45" y2="132" stroke="#06B6D4" stroke-width="4" stroke-linecap="round"/>
  <line x1="170" y1="140" x2="155" y2="132" stroke="#06B6D4" stroke-width="4" stroke-linecap="round"/>
  <!-- Central Stylized "V" Node -->
  <path d="M70,80 L100,130 L130,80" fill="none" stroke="#F43F5E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="100" cy="130" r="4" fill="#06B6D4"/>
</svg>`,
    brandGuide: {
      brandName: "Volt Cybernetics",
      primaryColors: [
        { hex: "#06B6D4", name: "Volt Cyan", usage: "Primary digital branding, focus glows, and links." },
        { hex: "#F43F5E", name: "Laser Pink", usage: "Action anchors, warning buttons, and highlights." }
      ],
      secondaryColors: [
        { hex: "#0F172A", name: "Deep Slate", usage: "Canvas background, code blocks, and primary text." },
        { hex: "#F8FAFC", name: "Pure White", usage: "Contrast cards, crisp body copy." }
      ],
      typography: {
        primaryFont: "Space Grotesk",
        secondaryFont: "JetBrains Mono",
        guidelines: "Keep typography high contrast, tabular layout spacing, mono-fonts for statistics and technical details."
      },
      logoUsage: {
        clearSpace: "Minimum 40px padding around all bounding margins.",
        minimumSize: "24px width on low-res screens.",
        doNot: [
          "Do not tilt or wrap the isometric hexagon.",
          "Do not combine with pastel light colors or warm beige gradients."
        ]
      },
      brandVoice: {
        tone: "Authoritative, Objective, Cybernetic",
        keywords: ["Cybernetic", "Unyielding", "Accurate", "Secure"],
        description: "Operating with absolute accuracy and modular durability, Volt guides security operations across distributed clouds."
      },
      photography: "High contrast monochrome, cyber-grunge aesthetic, cold cyan backlighting.",
      iconography: "Sharp geometric vectors, double-outline hexes, unrounded corners.",
      dosAndDonts: [
        "Use cold cyan overlays for secondary assets.",
        "Do not apply soft shadows, gradients, or blur highlights.",
        "Keep text capitalized in monospaced grids.",
        "Avoid cursive or classical serif fonts."
      ]
    }
  },
  {
    id: 'eco',
    name: 'EcoFresh Market',
    industry: 'Organic Grocery',
    theme: 'Warm Organic Minimalist',
    icon: Leaf,
    colorClasses: 'from-emerald-500 to-amber-100',
    svgSource: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#FBFBF8"/>
  <!-- Minimalist Double Leaves -->
  <path d="M60,130 C60,90 100,70 100,70 C100,70 100,110 60,130 Z" fill="#10B981" opacity="0.9"/>
  <path d="M100,70 C100,30 140,40 140,40 C140,40 110,80 100,70 Z" fill="#059669" opacity="0.8"/>
  <!-- Stem Accent -->
  <path d="M100,70 Q90,120 70,140" fill="none" stroke="#F59E0B" stroke-width="5" stroke-linecap="round"/>
  <!-- Decorative Ring -->
  <circle cx="100" cy="95" r="65" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="6 6"/>
</svg>`,
    brandGuide: {
      brandName: "EcoFresh Market",
      primaryColors: [
        { hex: "#10B981", name: "Fresh Emerald", usage: "Main logo identity, natural foliage elements." },
        { hex: "#F59E0B", name: "Harvest Gold", usage: "Stems, badge details, organic packaging highlights." }
      ],
      secondaryColors: [
        { hex: "#FBFBF8", name: "Warm Flax", usage: "Outer canvas background, recycled card backdrops." },
        { hex: "#1E293B", name: "Slate Charcoal", usage: "Legible typographic body copy." }
      ],
      typography: {
        primaryFont: "Outfit",
        secondaryFont: "Inter",
        guidelines: "Use fluid, organic curves, centered layouts, and generous line height."
      },
      logoUsage: {
        clearSpace: "Keep clear space proportional to the leaf width (2x spacer).",
        minimumSize: "35px width on mobile apps.",
        doNot: [
          "Do not paint leaf items in synthetic purple, neon blue, or neon red.",
          "Do not apply deep artificial gradients."
        ]
      },
      brandVoice: {
        tone: "Warm, Inviting, Wholesome",
        keywords: ["Wholesome", "Nurturing", "Authentic", "Local"],
        description: "Committed to delivering earth-first nourishment, EcoFresh prioritizes local micro-farmers and zero-plastic packaging."
      },
      photography: "Naturally lit, shallow depth of field, focused on authentic soil textures and dew drops.",
      iconography: "Hand-drawn curves, soft line endings, rustic elements.",
      dosAndDonts: [
        "Include local botanical illustrations on cards.",
        "Do not align headers with cold robotic borders.",
        "Use warm-toned, unbleached papers for print.",
        "Never use pure clinical neon backdrops."
      ]
    }
  },
  {
    id: 'luxe',
    name: 'Luxe Diamond',
    industry: 'High Jewelry',
    theme: 'Classical Luxury Opera',
    icon: Gem,
    colorClasses: 'from-amber-600 to-zinc-900',
    svgSource: `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#111115"/>
  <!-- Luxury Golden Diamond Emblem -->
  <polygon points="100,35 150,75 100,165 50,75" fill="none" stroke="#D97706" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="100,35 125,75 100,165 75,75" fill="none" stroke="#F59E0B" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="50" y1="75" x2="150" y2="75" stroke="#D97706" stroke-width="2"/>
  <!-- Top Facets -->
  <line x1="75" y1="75" x2="100" y2="35" stroke="#F59E0B" stroke-width="1.5"/>
  <line x1="125" y1="75" x2="100" y2="35" stroke="#F59E0B" stroke-width="1.5"/>
  <!-- Glow Accents -->
  <circle cx="100" cy="35" r="2" fill="#FFFFFF"/>
  <circle cx="100" cy="165" r="2" fill="#FFFFFF"/>
</svg>`,
    brandGuide: {
      brandName: "Luxe Diamond",
      primaryColors: [
        { hex: "#D97706", name: "Amber Gold", usage: "Emblems, premium crest hot stamps, and gold foils." },
        { hex: "#111115", name: "Obsidian Black", usage: "Main backdrop, luxury box velvets, dark mode." }
      ],
      secondaryColors: [
        { hex: "#F59E0B", name: "Spark Gold", usage: "Subtle lines, facet shine, and secondary text." },
        { hex: "#FFFFFF", name: "Ice White", usage: "High contrast diamond sparkles, typography headers." }
      ],
      typography: {
        primaryFont: "Playfair Display",
        secondaryFont: "Inter",
        guidelines: "Use classical serif display headings with elegant wide letter-spacing, accompanied by clean small sans-serif subtitles."
      },
      logoUsage: {
        clearSpace: "Provide ample clear space (3x emblem size) to convey breathing room and high-end exclusivity.",
        minimumSize: "18px width on high-density prints.",
        doNot: [
          "Do not bundle or overlap other badge outlines next to the Golden Crest.",
          "Do not use casual comic or playful handwritten scripts."
        ]
      },
      brandVoice: {
        tone: "Sophisticated, Refined, Timeless",
        keywords: ["Timeless", "Prestigious", "Exclusive", "Refined"],
        description: "Crafting modern heirlooms, Luxe Diamond honors centuries of meticulous gemstone setting with an unyielding devotion to brilliance."
      },
      photography: "Dramatic key-lighting, deep obsidian shadows, crisp macro focus reflecting golden facets.",
      iconography: "Ultra-thin geometric wireframes, pristine alignments, symmetry.",
      dosAndDonts: [
        "Ensure all print materials are embossed with golden foil.",
        "Do not align layouts in crowded, high-density grids.",
        "Emphasize single-column typography grids.",
        "Avoid overly saturated background greens, purples, or cyans."
      ]
    }
  }
];

interface TemplateLibraryProps {
  onSelectTemplate?: (svg: any, guide: any) => Promise<void> | void;
  activeProjectId: string | null;
  onApplyTemplate: (updatedFields: Partial<Project>) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  activeProjectId,
  onApplyTemplate
}) => {
  if (!activeProjectId) return null;

  const handleSelectTemplate = (tpl: typeof TEMPLATES[0]) => {
    // Convert SVG to dataURL to store in logoUrl for instant display
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(tpl.svgSource)}`;
    
    onApplyTemplate({
      name: tpl.name,
      svgSource: tpl.svgSource,
      logoUrl: dataUrl,
      description: `Premium pre-populated Brand Identity for ${tpl.name} (${tpl.industry}) matching the ${tpl.theme} theme.`,
      brandGuide: tpl.brandGuide,
      stage: 'refinement'
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <Sparkles className="text-amber-500" size={18} />
        <div>
          <h3 className="text-sm font-bold text-neutral-800 dark:text-zinc-200">Pre-Built Brand Templates</h3>
          <p className="text-xs text-neutral-500">Auto-populate with custom, professional assets instantly</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TEMPLATES.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="flex flex-col text-left p-4 rounded-2xl border border-neutral-200 dark:border-zinc-800 hover:border-brand-lead dark:hover:border-indigo-400 hover:shadow-md transition-all bg-neutral-50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 cursor-pointer group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tpl.colorClasses} flex items-center justify-center text-white mb-3 shadow-sm`}>
                <Icon size={18} />
              </div>
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-brand-lead dark:group-hover:text-indigo-400 transition-colors">
                {tpl.name}
              </h4>
              <p className="text-[10px] text-neutral-400 font-medium mt-0.5">{tpl.industry}</p>
              <span className="text-[9px] text-neutral-500 font-mono mt-2 uppercase tracking-wide bg-neutral-200/50 dark:bg-zinc-800 px-2 py-0.5 rounded-full w-max">
                {tpl.theme.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
