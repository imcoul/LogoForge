import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Wand2, RefreshCw, Palette, Download, Move, Upload, BookOpen, Image as ImageIcon, ChevronRight, FolderArchive, MessageSquare, FileText, Music, LayoutDashboard, Share2, Plus, Trash2, Globe, Moon, Sun, Layers, GraduationCap, Settings, Check, CheckCircle, Info, HelpCircle, ShieldCheck, Terminal, Code, Lock, Unlock, Hammer, Search, Filter, Cloud, Copy, Target, Users, ShieldAlert } from 'lucide-react';
import { generateLogoImage, generateBrandGuide, analyzeRefinementContext, generateSonicPhilosophy, generateDesignRationale, generateAICriticComment, analyzeCompetitor, generateEcosystemAsset } from './services/geminiService';
import { useAppStore, Project, Mockup } from './store';
import { auth, signInWithGoogle, logout, db } from './services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { syncProjectToPostgres, syncProjectToSupabase } from './utils/dbBackupClient';
import { KeyboardManager } from './components/KeyboardManager';
import { TouchGesturesHelp } from './components/TouchGesturesHelp';
import { Sheet } from './components/Sheet';
import { StudioControls } from './components/StudioControls';
import { TemplateLibrary } from './components/TemplateLibrary';
import { SVGPathEditor } from './components/SVGPathEditor';
import { AccessibilityScore } from './components/AccessibilityScore';
import { ProjectAnalytics } from './components/ProjectAnalytics';
import { Whacanudo } from './components/Whacanudo';
import { GoogleDriveIntegration } from './components/GoogleDriveIntegration';
import { useToast } from './components/Toast';
import DOMPurify from 'dompurify';

const sanitizeSVG = (svg: string | null): string => {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
  });
};

const ANIMATIONS = {
  float: { animate: { y: [0, -15, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  pulse: { animate: { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
  spin: { animate: { rotate: 360 }, transition: { duration: 8, repeat: Infinity, ease: "linear" } },
  pop: { animate: { scale: [0.8, 1.1, 1] }, transition: { duration: 0.5, type: "spring", bounce: 0.6, repeat: Infinity, repeatDelay: 1 } },
  flip: { animate: { rotateY: 360 }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 } }
};

type AnimationType = keyof typeof ANIMATIONS;
type ViewMode = 'dashboard' | 'studio' | 'course' | 'settings';
type StudioTab = 'preview' | 'guide' | 'refine' | 'sonic' | 'comments' | 'precision' | 'mockups' | 'competitor' | 'ecosystem';

interface TooltipProps {
  content: React.ReactNode;
  trigger: React.ReactNode;
}

const Tooltip = ({ content, trigger }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      {trigger}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-4 bg-zinc-950 dark:bg-zinc-900 text-white dark:text-zinc-100 text-xs rounded-2xl shadow-xl border border-neutral-800 dark:border-zinc-800 pointer-events-none text-left leading-relaxed flex flex-col gap-1.5"
          >
            {content}
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-950 dark:border-t-zinc-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DesignChecklist = () => {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  
  const items = [
    { 
      id: 'scalability', 
      label: 'Scalability', 
      desc: 'Logo remains legible when scaled down to 16x16px (favicon size).',
      tip: 'Avoid ultra-thin lines, intricate patterns, or tiny secondary text. Try viewing the design as a small browser tab icon.' 
    },
    { 
      id: 'contrast', 
      label: 'High Contrast', 
      desc: 'Passes WCAG AA contrast ratio (at least 4.5:1) against primary backgrounds.',
      tip: 'Check your foreground and background color hex codes. Adjust shades or values to maximize distinction.' 
    },
    { 
      id: 'monochrome', 
      label: 'Monochrome Readability', 
      desc: 'Design holds up perfectly in pure black and pure white.',
      tip: 'Do not rely entirely on color hue to separate elements. Ensure overlapping elements have distinct light/dark value contrasts.' 
    },
    { 
      id: 'balance', 
      label: 'Visual Balance', 
      desc: 'Optical weight is balanced; no single element overpowers the composition.',
      tip: 'Try squinting or blurring your vision. If one element or area pops out disproportionately, adjust scale or spacing.' 
    },
    { 
      id: 'simplicity', 
      label: 'Simplicity', 
      desc: 'Removes unnecessary details to remain memorable and easy to reproduce.',
      tip: 'Experiment with removing single lines or decoration details. If the brand message still carries, leave them out.' 
    },
  ];

  const toggleCheck = (id: string) => setChecks(prev => ({ ...prev, [id]: !prev[id] }));
  const resetChecks = () => setChecks({});
  const hasChecks = Object.values(checks).some(checked => checked);

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-xl font-bold font-display flex items-center gap-2">
          <CheckCircle size={20} className="text-brand-lead"/> Design Best Practices
        </h3>
        <button 
          onClick={resetChecks}
          disabled={!hasChecks}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 self-start sm:self-auto ${
            hasChecks 
              ? 'text-neutral-600 dark:text-zinc-400 hover:text-brand-lead dark:hover:text-brand-lead hover:bg-neutral-50 dark:hover:bg-zinc-800 cursor-pointer' 
              : 'text-neutral-300 dark:text-zinc-700 cursor-not-allowed opacity-50'
          }`}
        >
          <RefreshCw size={12} />
          Reset All
        </button>
      </div>
      <p className="text-sm text-neutral-500 mb-6">Verify your logo against professional industry standards. Hover or tap the info icon for quick tips.</p>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 hover:border-brand-lead transition-colors cursor-pointer" onClick={() => toggleCheck(item.id)}>
            <div className="flex items-center gap-4">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checks[item.id] ? 'bg-brand-lead border-brand-lead text-white' : 'border-neutral-300 dark:border-zinc-700'}`}>
                {checks[item.id] && <Check size={14} />}
              </div>
              <span className={`font-bold transition-colors ${checks[item.id] ? 'text-neutral-400 dark:text-zinc-500 line-through font-medium' : ''}`}>
                {item.label}
              </span>
            </div>
            
            <Tooltip
              content={
                <>
                  <p className="font-semibold text-neutral-200 dark:text-zinc-100 mb-1">{item.desc}</p>
                  <p className="text-brand-service font-medium">💡 Fix Tip: {item.tip}</p>
                </>
              }
              trigger={
                <button className="p-1.5 text-neutral-400 hover:text-brand-lead dark:text-zinc-500 dark:hover:text-brand-lead transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-zinc-800">
                  <Info size={16} />
                </button>
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomWaveformPlayer: React.FC<{ base64Data: string; name: string }> = ({ base64Data, name }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(base64Data);
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [base64Data]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => console.error(err));
    }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const val = parseFloat(e.target.value);
    audioRef.current.currentTime = val;
    setCurrentTime(val);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-neutral-100 dark:border-zinc-800 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-zinc-800 text-indigo-600 rounded-lg">
            <Music size={16} />
          </div>
          <span className="font-bold text-sm text-neutral-800 dark:text-zinc-200 truncate max-w-[200px]">{name}</span>
        </div>
        <span className="text-[10px] font-mono text-neutral-400">
          {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-brand-lead hover:bg-brand-lead/90 text-white flex items-center justify-center shadow-md transition-all shrink-0 hover:scale-105 cursor-pointer"
        >
          {isPlaying ? (
            <div className="flex gap-1 items-center justify-center">
              <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDuration: '0.6s' }} />
              <div className="w-1.5 h-4 bg-white rounded-full animate-bounce" style={{ animationDuration: '0.4s' }} />
              <div className="w-1 h-3 bg-white rounded-full animate-bounce" style={{ animationDuration: '0.5s' }} />
            </div>
          ) : (
            <ChevronRight size={18} className="translate-x-0.5 text-white fill-white" />
          )}
        </button>

        {/* Custom Visualizer Bars */}
        <div className="flex-1 flex items-center gap-1 h-10 overflow-hidden px-1">
          {Array.from({ length: 24 }).map((_, i) => {
            // Generate some nice heights
            const baseHeight = 12 + Math.sin(i * 0.5) * 8;
            // Add jitter if playing
            const actHeight = isPlaying ? baseHeight + (Math.random() * 12 - 6) : baseHeight;
            return (
              <div 
                key={i} 
                className={`w-1 rounded-full transition-all duration-300 ${isPlaying ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-neutral-200 dark:bg-zinc-800'}`}
                style={{ 
                  height: `${Math.max(4, Math.min(32, actHeight))}px`,
                }}
              />
            );
          })}
        </div>
      </div>

      <input 
        type="range"
        min={0}
        max={duration || 100}
        value={currentTime}
        onChange={handleScrub}
        className="w-full h-1 bg-neutral-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
};

// --- PRODUCT REQUIREMENT DOCUMENT (PRD) DATA & EXPORT UTILITIES ---
export interface FeaturePrdSpec {
  db: string;
  routes: string;
  specs: string;
}

export interface PrdFeature {
  iconName: string;
  iconColor: string;
  name: string;
  what: string;
  why: string;
  how: string;
  example: string;
  prd: FeaturePrdSpec;
}

const PRD_FEATURES: PrdFeature[] = [
  {
    iconName: "FolderArchive",
    iconColor: "text-indigo-400",
    name: "Asset Library & Workspace",
    what: "A comprehensive project directory to curate, save, and retrieve multiple client identities.",
    why: "Maintains a structured database of brand collateral so that you never lose drafts, guidelines, or assets across multiple concurrent clients.",
    how: "Tap 'New Project' on the Dashboard, name your workspace, and open it to start generating or editing brand assets.",
    example: "Managing separate projects for a local organic tea cafe ('ZenLeaf') and a decentralized ledger security firm ('Vertex.io').",
    prd: {
      db: "Zustand LocalStore integrated with idb-keyval IndexedDB key-value maps.",
      routes: "N/A (Client-side client caching).",
      specs: "Schema-safe Project interfaces, supporting base64 asset bundles < 15MB to prevent memory exhaustion."
    }
  },
  {
    iconName: "Palette",
    iconColor: "text-emerald-400",
    name: "AI Flat-Vector Logo Forge",
    what: "An advanced, prompt-driven vector drafting canvas that generates clean, isolated branding marks.",
    why: "Bypasses slow graphic design iteration delays by translating semantic brand briefs into production-ready assets instantly.",
    how: "Provide a detailed company description, select an entry-animation mode (Float, Pulse, Spin), and tap 'Forging'.",
    example: "Forging a clean, isolated corporate logo mark for a high-performance bio-health startup.",
    prd: {
      db: "IndexedDB base64 raw binary buffer mapping.",
      routes: "POST /api/generate-logo",
      specs: "Directly queries @google/genai SDK on backend clusters using isolated system prompts to enforce flat white background isolation."
    }
  },
  {
    iconName: "BookOpen",
    iconColor: "text-blue-400",
    name: "Brand Architect (Guide System)",
    what: "An automated compiler that constructs an authoritative brand identity manual including typography, color palettes, and voice tone guidelines.",
    why: "Establishes institutional design governance, ensuring that client communications remain cohesive across web, print, and social touchpoints.",
    how: "With an active logo in your workspace, tap 'Generate Brand Guide'. Tap hex codes on color chips to copy to clipboard instantly.",
    example: "Translating an organic cyber logo into primary Turquoise, secondary Yellow, and a noble Violet color hierarchy with a classical editorial voice.",
    prd: {
      db: "Zustand activeProjectId.brandGuide state mapper.",
      routes: "POST /api/generate-brand-guide",
      specs: "Applies Gemini NLP context extraction to output strict markdown-compliant structure (primaryColors, typography, voice, do's/don'ts)."
    }
  },
  {
    iconName: "Music",
    iconColor: "text-purple-400",
    name: "Sonic Philosophy (Audio Mark)",
    what: "An advanced multi-sensory branding suite that generates acoustic philosophies and synthesizes unique brand sounds.",
    why: "Creates a deeper subconscious brand connection by anchoring visual identities to pristine, interactive sound signatures.",
    how: "Select 'Sonic' in Refinement Studio, click 'Generate Philosophy', and use the interactive audio player to play and listen to the synthesized sound waves.",
    example: "Synthesizing a low-frequency ambient drone with ascending crystal-clear chime peaks to convey cyber-health optimism.",
    prd: {
      db: "Zustand activeProject.sonicAssets list mapper.",
      routes: "POST /api/generate-sonic-philosophy",
      specs: "Triggers Web Audio API context nodes dynamically using OscillatorNode oscillators and BiquadFilterNode low-pass filters."
    }
  },
  {
    iconName: "FileText",
    iconColor: "text-amber-400",
    name: "Precision Coordinate Canvas",
    what: "A tactile manual adjustment engine for raw vector paths and Bezier curves.",
    why: "Enables designers to fine-tune anchor properties directly, ensuring curves are perfectly clean and crisp.",
    how: "Under the 'Precision' tab, adjust the 'Anchor Offset Control' slider to dynamically alter the Bezier curve coordinates.",
    example: "Flattening slightly skewed curves on a geometry logo mark to achieve mathematically balanced symmetry.",
    prd: {
      db: "Local dynamic svgSource string bindings.",
      routes: "N/A (Client-side anchor vector math).",
      specs: "Injects dynamic floating point offsets to quadratic Bezier coordinates 'Q x1 y1 x y' in high-contrast live SVG panels."
    }
  },
  {
    iconName: "Layers",
    iconColor: "text-rose-400",
    name: "Mockups Context Engine",
    what: "A real-world mock environment generator simulating corporate stationary, splash screens, and billboards.",
    why: "Validates color contrast and visual presence in real physical contexts before publishing.",
    how: "Select 'Mockups', choose between stationary Cards, Splash, or Billboard templates, and toggle background color presets.",
    example: "Previewing how your forged logo stands out against a textured charcoal backdrop on a premium business card.",
    prd: {
      db: "Mockup asset directory bindings.",
      routes: "N/A (Client-side graphic canvas composition).",
      specs: "Uses absolute layout coordinates and overlay blending properties to composite user-forged SVGs cleanly on templates."
    }
  },
  {
    iconName: "MessageSquare",
    iconColor: "text-teal-400",
    name: "Design Critic & Peer Review",
    what: "An AI-powered design audit companion simulating senior art directors, product managers, or brand strategists.",
    why: "Detects visual, compositional, and alignment flaws before submitting designs to client stakeholders.",
    how: "Go to 'Comments & Critiques', select a critic role (e.g., Tech Lead), and click 'Ask AI Critic' to receive feedback.",
    example: "Receiving professional alignment critiques and font hierarchy alerts from a rigorous Senior Art Director.",
    prd: {
      db: "activeProject.comments array storage.",
      routes: "POST /api/generate-critic-comment",
      specs: "Applies Gemini LLM persona-injection based on role parameter (e.g. Director, PM, Strategist) to output strict professional feedback."
    }
  },
  {
    iconName: "GraduationCap",
    iconColor: "text-amber-500",
    name: "Beginex Design Academy",
    what: "A fully integrated branding school featuring interactive shapes, colors, typography, prompting, and SVG playgrounds.",
    why: "Builds design instincts and expert prompting frameworks with instant tactile feedback.",
    how: "Click 'Academy' in the sidebar, open any lesson, interact with play areas (like shape weight, color triads, and prompting), and mark lessons done.",
    example: "Mastering why sharp geometries represent speed, and testing the 'Srvel Triad' of Turquoise, Yellow, and Violet colors.",
    prd: {
      db: "completedModules object mapping in store.ts local settings state.",
      routes: "N/A (State-driven lesson progress).",
      specs: "Uses dynamic Framer Motion states to render interactive sliders, shape playgrounds, and copyable prompt compilers."
    }
  }
];

const downloadFile = (content: string, filename: string, contentType: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escapeCSV = (val: string): string => {
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
};

// MARKDOWN GENERATORS
const generateFeatureMarkdown = (feat: PrdFeature, includeServer = false): string => {
  return `# PRD Specification: ${feat.name}
  
## 1. Feature Executive Summary
- **What is it:** ${feat.what}
- **Why it exists:** ${feat.why}

## 2. Dynamic Workflow & Guidelines
- **How to use:** ${feat.how}
- **Validation / Example Case:** ${feat.example}
${includeServer ? `
## 3. Server Engineering & Security Schematics
- **Database / Data Layer:** ${feat.prd.db}
- **Proxy Gateways & Routing:** ${feat.prd.routes}
- **Engineering Specification:** ${feat.prd.specs}
` : ''}`;
};

const generateFullMarkdown = (features: PrdFeature[], includeServer = false): string => {
  let md = `# Forgel Branding Forge - Complete Product Requirement Document (PRD)

This document contains authoritative requirements, architectural maps, and operational flows for the entire Forgel platform features suite.

---
`;
  features.forEach((feat, idx) => {
    md += `\n\n## ${idx + 1}. ${feat.name}

### Executive Overview
- **What is it:** ${feat.what}
- **Why it exists:** ${feat.why}

### Operational Design
- **How to use:** ${feat.how}
- **Example Case:** ${feat.example}
${includeServer ? `
### Server & Security Schematics
- **Database / Data Layer:** ${feat.prd.db}
- **Proxy Gateway:** ${feat.prd.routes}
- **Engineering Specification:** ${feat.prd.specs}
` : ''}
---
`;
  });
  return md;
};

// CSV GENERATORS
const generateFeatureCSV = (feat: PrdFeature, includeServer = false): string => {
  const headers = ["Field", "Specification"];
  const rows = [
    ["Feature Name", feat.name],
    ["What is it", feat.what],
    ["Why it exists", feat.why],
    ["How to use", feat.how],
    ["Example Use Case", feat.example]
  ];
  if (includeServer) {
    rows.push(
      ["Data Layer DB", feat.prd.db],
      ["Proxy Gateway Route", feat.prd.routes],
      ["Engineering Spec", feat.prd.specs]
    );
  }
  return [headers.join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n');
};

const generateFullCSV = (features: PrdFeature[], includeServer = false): string => {
  const headers = ["Feature Name", "What is it", "Why it exists", "How to use", "Example Use Case"];
  if (includeServer) {
    headers.push("Data Layer DB", "Proxy Gateway Route", "Engineering Spec");
  }
  
  const rows = features.map(feat => {
    const row = [feat.name, feat.what, feat.why, feat.how, feat.example];
    if (includeServer) {
      row.push(feat.prd.db, feat.prd.routes, feat.prd.specs);
    }
    return row.map(escapeCSV).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
};

// JSON GENERATORS
const generateFeatureJSON = (feat: PrdFeature, includeServer = false): string => {
  const data: any = {
    name: feat.name,
    what: feat.what,
    why: feat.why,
    how: feat.how,
    example: feat.example
  };
  if (includeServer) {
    data.prd_specifications = {
      database_layer: feat.prd.db,
      proxy_gateway: feat.prd.routes,
      architecture_details: feat.prd.specs
    };
  }
  return JSON.stringify(data, null, 2);
};

const generateFullJSON = (features: PrdFeature[], includeServer = false): string => {
  const data = features.map(feat => {
    const item: any = {
      name: feat.name,
      what: feat.what,
      why: feat.why,
      how: feat.how,
      example: feat.example
    };
    if (includeServer) {
      item.prd_specifications = {
        database_layer: feat.prd.db,
        proxy_gateway: feat.prd.routes,
        architecture_details: feat.prd.specs
      };
    }
    return item;
  });
  return JSON.stringify({ prd_features: data, platform: "Forgel Branding Forge", version: "1.2" }, null, 2);
};

// DOC GENERATORS
const generateFeatureDoc = (feat: PrdFeature, includeServer = false): string => {
  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>${feat.name} PRD</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 40px; }
        h1 { color: #4f46e5; font-size: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-family: 'Helvetica Neue', Arial, sans-serif; }
        h2 { color: #1e1b4b; font-size: 16px; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'Helvetica Neue', Arial, sans-serif; }
        p { margin-bottom: 12px; font-size: 14px; }
        strong { color: #312e81; }
        .specs-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .specs-table th, .specs-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
        .specs-table th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
      </style>
    </head>
    <body>
      <h1>Product Requirement Document: ${feat.name}</h1>
      <p><em>Generated by Forgel Branding Forge Admin</em></p>
      
      <h2>1. Overview & Business Rationale</h2>
      <p><strong>What is it:</strong> ${feat.what}</p>
      <p><strong>Why it exists:</strong> ${feat.why}</p>
      
      <h2>2. Operational Specs</h2>
      <p><strong>Workflow walkthrough:</strong> ${feat.how}</p>
      <p><strong>Target Case Scenario:</strong> ${feat.example}</p>
      
      ${includeServer ? `
      <h2>3. Technical & Database Specifications</h2>
      <table class="specs-table">
        <thead>
          <tr>
            <th style="width: 25%">Architecture Module</th>
            <th>Specification Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Data Persistence Layer</strong></td>
            <td>${feat.prd.db}</td>
          </tr>
          <tr>
            <td><strong>Proxy Routing Endpoints</strong></td>
            <td>${feat.prd.routes}</td>
          </tr>
          <tr>
            <td><strong>System & Sandbox Limits</strong></td>
            <td>${feat.prd.specs}</td>
          </tr>
        </tbody>
      </table>
      ` : ''}
    </body>
    </html>
  `;
};

const generateFullDoc = (features: PrdFeature[], includeServer = false): string => {
  let content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <title>Forgel Platform PRD Suite</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; padding: 40px; }
        h1 { color: #4f46e5; font-size: 28px; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px; font-family: 'Helvetica Neue', Arial, sans-serif; }
        h2 { color: #1e1b4b; font-size: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 36px; font-family: 'Helvetica Neue', Arial, sans-serif; }
        h3 { color: #4338ca; font-size: 15px; margin-top: 16px; font-family: 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; }
        p { margin-bottom: 12px; font-size: 14px; }
        strong { color: #312e81; }
        .specs-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
        .specs-table th, .specs-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
        .specs-table th { background-color: #f1f5f9; font-weight: bold; color: #334155; }
        .page-break { page-break-after: always; }
      </style>
    </head>
    <body>
      <h1>Forgel Branding Forge Suite</h1>
      <p style="font-size: 16px; color: #475569;"><strong>Overview:</strong> Platform Specifications & Product Requirement Document (PRD)</p>
      <p>This master specification outlines all core modules, business intents, operator runbooks, and microservices for the Forgel application context.</p>
      <div class="page-break"></div>
  `;

  features.forEach((feat, idx) => {
    content += `
      <h2>${idx + 1}. ${feat.name}</h2>
      
      <h3>1. Business Rationale</h3>
      <p><strong>Definition:</strong> ${feat.what}</p>
      <p><strong>Intent/Problem Solved:</strong> ${feat.why}</p>
      
      <h3>2. Functional Flow</h3>
      <p><strong>How to operate:</strong> ${feat.how}</p>
      <p><strong>Real-world integration target:</strong> ${feat.example}</p>
      
      ${includeServer ? `
      <h3>3. Technical Integration Schematics</h3>
      <table class="specs-table">
        <thead>
          <tr>
            <th style="width: 25%">Module</th>
            <th>Production Specification</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Data Persistence Layer</strong></td>
            <td>${feat.prd.db}</td>
          </tr>
          <tr>
            <td><strong>Proxy Routing Endpoints</strong></td>
            <td>${feat.prd.routes}</td>
          </tr>
          <tr>
            <td><strong>Container Sandbox Specs</strong></td>
            <td>${feat.prd.specs}</td>
          </tr>
        </tbody>
      </table>
      ` : ''}
      <div class="page-break"></div>
    `;
  });

  content += `
    </body>
    </html>
  `;
  return content;
};

// PDF PRINTERS
const exportFeaturePDF = (feat: PrdFeature, addToast: (t: any, m: string) => void, includeServer = false) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Popup blocked');
  printWindow.document.write(`
    <html>
    <head>
      <title>PRD Spec: ${feat.name}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 26px; font-weight: 800; color: #0f172a; tracking: -0.025em; }
        .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        h2 { font-size: 16px; font-weight: 700; color: #4f46e5; margin-top: 24px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
        p { margin-bottom: 12px; font-size: 14px; color: #334155; }
        strong { color: #0f172a; font-weight: 600; }
        .specs-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .specs-table th, .specs-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 13px; }
        .specs-table th { background-color: #f8fafc; font-weight: 600; color: #475569; }
        @media print {
          body { padding: 20px; }
          @page { margin: 20mm; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">${feat.name}</div>
          <div class="subtitle">Forgel Branding Forge • Feature Specification Document (PRD)</div>
        </div>
        
        <h2>1. Executive Summary</h2>
        <p><strong>What is it:</strong> ${feat.what}</p>
        <p><strong>Why it exists:</strong> ${feat.why}</p>
        
        <h2>2. Functional Operational Specification</h2>
        <p><strong>Operator Flow walkthrough:</strong> ${feat.how}</p>
        <p><strong>Real-world target verification scenario:</strong> ${feat.example}</p>
        
        ${includeServer ? `
        <h2>3. Server Integration & Database Architecture</h2>
        <table class="specs-table">
          <thead>
            <tr>
              <th style="width: 30%">System Module</th>
              <th>Operational Blueprint Specification</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Database Persistence Layer</strong></td>
              <td>${feat.prd.db}</td>
            </tr>
            <tr>
              <td><strong>Proxy Gateway routes</strong></td>
              <td>${feat.prd.routes}</td>
            </tr>
            <tr>
              <td><strong>Sandbox & Resource Bounds</strong></td>
              <td>${feat.prd.specs}</td>
            </tr>
          </tbody>
        </table>
        ` : ''}
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
  } catch (error) {
    addToast('error', 'Failed to open export window. Please allow popups.');
  }
};

const exportFullPDF = (features: PrdFeature[], addToast: (t: any, m: string) => void, includeServer = false) => {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('Popup blocked');
  
  const featuresHtml = features.map((feat, idx) => `
    <div style="page-break-after: always; margin-bottom: 30px;">
      <div class="header">
        <div class="title">${idx + 1}. ${feat.name}</div>
        <div class="subtitle">Forgel Branding Forge Suite • Master Specification suite</div>
      </div>
      
      <h2>1. Rationale & Description</h2>
      <p><strong>Functional definition:</strong> ${feat.what}</p>
      <p><strong>Problem statement & value:</strong> ${feat.why}</p>
      
      <h2>2. Operational walkthrough</h2>
      <p><strong>Step-by-step UI actions:</strong> ${feat.how}</p>
      <p><strong>Example context case:</strong> ${feat.example}</p>
      
      ${includeServer ? `
      <h2>3. Systems Blueprint Specifications</h2>
      <table class="specs-table">
        <thead>
          <tr>
            <th style="width: 30%">System Component</th>
            <th>Deployment Specification Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Database Persistence Layer</strong></td>
            <td>${feat.prd.db}</td>
          </tr>
          <tr>
            <td><strong>Proxy Routing Endpoints</strong></td>
            <td>${feat.prd.routes}</td>
          </tr>
          <tr>
            <td><strong>Resource Sandbox Bounds</strong></td>
            <td>${feat.prd.specs}</td>
          </tr>
        </tbody>
      </table>
      ` : ''}
    </div>
  `).join('');

  printWindow.document.write(`
    <html>
    <head>
      <title>Forgel Branding Forge - Complete Suite Product Requirement Document (PRD)</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 45px; color: #1e293b; line-height: 1.6; }
        .container { max-width: 850px; margin: 0 auto; }
        .cover-page { height: 100vh; display: flex; flex-direction: column; justify-content: center; border-bottom: 2px solid #e2e8f0; page-break-after: always; }
        .cover-title { font-size: 38px; font-weight: 800; color: #4f46e5; line-height: 1.1; margin-bottom: 12px; }
        .cover-subtitle { font-size: 16px; color: #475569; margin-bottom: 40px; }
        .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
        .title { font-size: 24px; font-weight: 800; color: #0f172a; }
        .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
        h2 { font-size: 15px; font-weight: 700; color: #4f46e5; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
        p { margin-bottom: 12px; font-size: 13.5px; color: #334155; }
        strong { color: #0f172a; font-weight: 600; }
        .specs-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .specs-table th, .specs-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 13px; }
        .specs-table th { background-color: #f8fafc; font-weight: 600; color: #475569; }
        @media print {
          body { padding: 20px; }
          @page { margin: 20mm; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="cover-page">
          <div class="cover-title">Forgel Branding Forge</div>
          <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">Master Product Requirement Document Suite</div>
          <div class="cover-subtitle">Integrated client design system, sound architect, dynamic coordinate manual alignment, mockups compositing, and visual grading platform.</div>
          <div style="margin-top: auto; font-size: 13px; color: #64748b; font-family: monospace;">
            PLATFORM_VERSION: 1.2.0<br>
            TIMESTAMP: ${new Date().toLocaleDateString()}<br>
            INGRESS_ROUTE: SSL://3000
          </div>
        </div>
        
        ${featuresHtml}
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
  } catch (error) {
    addToast('error', 'Failed to open export window. Please allow popups.');
  }
};

const safeFormatDate = (dateVal: any, lang: string): string => {
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'No Date';
    return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'No Date';
  }
};

export default function App() {
  const { toast } = useToast();
  const { 
    projects, activeProjectId, isHydrated, settings, user, setUser,
    loadProjects, createProject, updateProject, bulkUpdateProjects, deleteProject, deleteProjects, cloneProject, setActiveProject, updateSettings
  } = useAppStore();

  const [view, setView] = useState<ViewMode>('dashboard');
  const [isWhacanudoOpen, setIsWhacanudoOpen] = useState(false);
  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);
  const [whacanudoTab, setWhacanudoTab] = useState<'overview' | 'features' | 'terminal'>('overview');
  const [devLogs, setDevLogs] = useState<string[]>([]);
  const [activeDevTask, setActiveDevTask] = useState<string | null>(null);

  // User profiles and role management
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  const fetchUsers = async () => {
    if (!user) return;
    setIsUsersLoading(true);
    try {
      const qSnapshot = await getDocs(collection(db, 'users'));
      const list: any[] = [];
      qSnapshot.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      setAllUsers(list);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'settings' && user) {
      fetchUsers();
    }
  }, [view, user]);

  const handleChangeUserRole = async (targetUserId: string, newRole: 'Designer' | 'Server') => {
    const targetUser = allUsers.find(u => u.uid === targetUserId);
    if (!targetUser) return;

    if (newRole === 'Designer' && targetUser.role === 'Server') {
      const serverCount = allUsers.filter(u => u.role === 'Server').length;
      if (serverCount <= 1) {
        toast("Cannot demote the last Server of the app!", "error");
        return;
      }
    }

    try {
      await setDoc(doc(db, 'users', targetUserId), {
        role: newRole,
        "settings.role": newRole
      }, { merge: true });
      
      toast(`Successfully updated ${targetUser.email}'s role to ${newRole}!`, "success");
      fetchUsers();
    } catch (err) {
      toast("Error updating role: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const handleDeleteUserProfile = async (targetUserId: string) => {
    const targetUser = allUsers.find(u => u.uid === targetUserId);
    if (!targetUser) return;

    if (targetUser.role === 'Server') {
      const serverCount = allUsers.filter(u => u.role === 'Server').length;
      if (serverCount <= 1) {
        toast("Cannot delete the last Server of the app!", "error");
        return;
      }
    }

    if (!window.confirm(`Are you sure you want to delete user ${targetUser.email || targetUser.uid}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', targetUserId));
      toast(`Successfully deleted ${targetUser.email}!`, "success");
      fetchUsers();
    } catch (err) {
      toast("Error deleting user: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };
  
  // Current Studio State
  const [mode, setMode] = useState<'create' | 'upload'>('create');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingSonic, setIsGeneratingSonic] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [isGeneratingRationale, setIsGeneratingRationale] = useState(false);
  
  const [activeAnimation, setActiveAnimation] = useState<AnimationType>('float');
  const [activeTab, setActiveTab] = useState<StudioTab>('preview');
  const [error, setError] = useState<string | null>(null);

  // --- Parallel Epic Spikes States ---
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [activeUsers, setActiveUsers] = useState<{ id: string; username: string; color: string }[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { username: string; color: string; x: number; y: number }>>({});
  const [username, setUsername] = useState<string>(() => 'Editor_' + Math.random().toString(36).substring(2, 6));
  
  // Autosave Telemetry state
  const [saveLatencyMs, setSaveLatencyMs] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Web Worker performance state
  const [worker, setWorker] = useState<Worker | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{ frameTimeMs: number; opsPerSec: number } | null>(null);

  // Version Control snapshots
  const [newSnapshotName, setNewSnapshotName] = useState('');
  
  // Sticky Notes state
  const [isAddingSticky, setIsAddingSticky] = useState(false);
  const [stickyNoteText, setStickyNoteText] = useState('');
  const [selectedStickyColor, setSelectedStickyColor] = useState('#FDE047'); // Yellow default

  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check user preference or system preference
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refineInputRef = useRef<HTMLInputElement>(null);
  const sonicInputRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState('');

  // New Interactive states
  const [activeCourseModule, setActiveCourseModule] = useState<number | null>(null);
  const [completedModules, setCompletedModules] = useState<Record<number, boolean>>({ 0: true });
  const [mockupTab, setMockupTab] = useState<'templates' | 'uploaded'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<'card' | 'splash' | 'billboard'>('card');
  const [cardBg, setCardBg] = useState<'cream' | 'charcoal' | 'forest'>('cream');
  const [copiedColorHex, setCopiedColorHex] = useState<string | null>(null);
  const [criticRole, setCriticRole] = useState<string>('Senior Art Director 🎨');
  const [isCriticLoading, setIsCriticLoading] = useState(false);

  // Phase D States
  const [competitorNameInput, setCompetitorNameInput] = useState('');
  const [competitorLogoUrlInput, setCompetitorLogoUrlInput] = useState<string | null>(null);
  const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);
  const [ecosystemAssetType, setEcosystemAssetType] = useState('Instagram Post Caption');
  const [isGeneratingEcosystem, setIsGeneratingEcosystem] = useState(false);

  // Dashboard search, stage filtering, and custom animated delete modal states
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [projectsToDelete, setProjectsToDelete] = useState<string[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Dashboard states for auto-archive, interactive tour, and bulk export
  const [dashboardTab, setDashboardTab] = useState<'active' | 'archived'>('active');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isExportingBulk, setIsExportingBulk] = useState(false);
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [isBackingUpDb, setIsBackingUpDb] = useState(false);
  const [bulkRenameValue, setBulkRenameValue] = useState('');
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState('');

  // Auto-archive inactive projects (modified > 30 days ago) on load
  useEffect(() => {
    if (isHydrated && projects.length > 0) {
      const now = Date.now();
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      
      const archiveInactive = async () => {
        const promises = projects.map(proj => {
          const lastModified = proj.updatedAt || proj.createdAt;
          if (now - lastModified > THIRTY_DAYS_MS && !proj.archived) {
            return updateProject(proj.id, { archived: true });
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
      };
      
      archiveInactive().catch(console.error);
    }
  }, [isHydrated]);

  // Auto-trigger tour for new users on load
  useEffect(() => {
    if (isHydrated) {
      const tourCompleted = localStorage.getItem('forgel_tour_completed');
      if (!tourCompleted) {
        setTourStep(0);
      }
    }
  }, [isHydrated]);

  // Course Interactive Elements State
  const [moduleShape, setModuleShape] = useState<'round' | 'sharp'>('round');
  const [moduleColorTriad, setModuleColorTriad] = useState<'serve' | 'grow' | 'lead'>('serve');
  const [moduleTypographyStyle, setModuleTypographyStyle] = useState<'tech' | 'serif'>('tech');
  const [promptSector, setPromptSector] = useState('Wellness 🌿');
  const [promptTone, setPromptTone] = useState('Organic & Minimalist 🌸');
  const [promptSubject, setPromptSubject] = useState('Abstract flower petal');
  const [moduleAnchorOffset, setModuleAnchorOffset] = useState<number>(0);

  const { t, i18n } = useTranslation();

  const runServerDevTask = (taskName: string) => {
    setActiveDevTask(taskName);
    setDevLogs([`[SYSTEM] Initializing developer operation: "${taskName}"...`]);
    
    const logsMap: Record<string, string[]> = {
      weights: [
        `[CLUSTER] Connecting to Google Vertex AI clusters... OK`,
        `[COMPILER] Initializing weight injection sequence for model gemini-2.5-pro...`,
        `[FORGE] Parsing shape grammar token-boundary coordinates...`,
        `[PROCESSOR] Calibrating Bezier flat path control handle thresholds...`,
        `[METRICS] Vector precision score elevated from 81.2% to 98.4%.`,
        `[SUCCESS] Model weight map compiled! Vector paths refined.`,
        `[DEPLOY] Hot-reloaded container model proxy definitions successfully.`
      ],
      css: [
        `[STYLES] Reading global Tailwind utility bindings in /src/index.css...`,
        `[COMPILER] Regenerating CSS container variables and micro-animations...`,
        `[FORGE] Polishing --font-sans "Inter" and --font-mono "JetBrains Mono"...`,
        `[THEME] Applying glassmorphic blur classes to Refinement Studio tabs...`,
        `[SUCCESS] Global layout theme compiled! Spacing and borders polished.`,
        `[DEPLOY] Injecting updated stylesheet across Active Iframe context...`
      ],
      security: [
        `[SECURITY] Initiating high-frequency dependency package vulnerability audit...`,
        `[AUDIT] Scanning workspace /package.json. Found 0 critical advisories.`,
        `[PROXY] Validating server-side API proxy routing constraints...`,
        `[FORGE] Hardening CORS headers & sandboxed frame permissions...`,
        `[SUCCESS] Security configuration audit complete. Ingress gates locked.`,
        `[DEPLOY] Credentials encrypted and sandbox container constraints verified.`
      ]
    };

    const taskKey = taskName.toLowerCase().includes('weights') || taskName.toLowerCase().includes('model') 
      ? 'weights' 
      : taskName.toLowerCase().includes('glassmorphism') || taskName.toLowerCase().includes('stylesheet')
        ? 'css' 
        : 'security';

    const lines = logsMap[taskKey] || [];
    let i = 0;

    const interval = setInterval(() => {
      if (i < lines.length) {
        setDevLogs(prev => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
        setActiveDevTask(null);
      }
    }, 600);
  };

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColorHex(hex);
    setTimeout(() => setCopiedColorHex(null), 2000);
  };

  const handleDownloadBrandGuide = () => {
    if (!activeProject?.brandGuide) return;
    const guide = activeProject.brandGuide;
    const text = `# Brand Identity Guidelines: ${guide.brandName}

## Primary Colors
${guide.primaryColors.map(c => `- ${c.name}: ${c.hex} (${c.usage})`).join('\n')}

## Secondary Colors
${guide.secondaryColors.map(c => `- ${c.name}: ${c.hex} (${c.usage})`).join('\n')}

## Typography
- Primary Font: ${guide.typography.primaryFont}
- Secondary Font: ${guide.typography.secondaryFont}
- Guidelines: ${guide.typography.guidelines}

## Brand Voice & Tone
- Tone: ${guide.brandVoice.tone}
- Keywords: ${guide.brandVoice.keywords.join(', ')}
- Description: ${guide.brandVoice.description}

## Photography Style
${guide.photography}

## Iconography Style
${guide.iconography}

## Do's and Don'ts
${guide.dosAndDonts.map(rule => `- ${rule}`).join('\n')}
`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${guide.brandName.replace(/\s+/g, '_')}_brand_guide.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRequestAICritic = async () => {
    if (!activeProject || !activeProjectId) return;
    setIsCriticLoading(true);
    try {
      const responseComment = await generateAICriticComment(
        activeProject.description || activeProject.name,
        activeProject.logoUrl,
        criticRole
      );
      
      const updatedComments = [
        ...(activeProject.comments || []),
        {
          id: Math.random().toString(36).substring(7),
          author: `AI Critic (${criticRole})`,
          text: responseComment,
          timestamp: Date.now()
        }
      ];

      await updateProject(activeProjectId, { comments: updatedComments });
    } catch (err: any) {
      console.error(err);
      toast("Failed to gather AI Critic feedback. Make sure your Gemini API Key is configured in Settings.", 'error');
    } finally {
      setIsCriticLoading(false);
    }
  };

  // Load active project
  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  // --- Parallel Spikes Hooks & Handlers ---
  
  // Custom update and broadcast coordination
  const handleUpdateAndSync = async (updates: Partial<Project>) => {
    if (!activeProjectId) return;
    const start = performance.now();
    setIsSaving(true);
    
    // Maintain logoHistory stack for Undo (Batch 1 feature)
    let nextUpdates = { ...updates };
    if (updates.svgSource && updates.svgSource !== activeProject?.svgSource) {
      const history = activeProject?.logoHistory || [];
      if (activeProject?.svgSource) {
        nextUpdates.logoHistory = [...history, activeProject.svgSource];
      }
      nextUpdates.logoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(updates.svgSource)}`;
    }

    await updateProject(activeProjectId, nextUpdates);
    
    const duration = performance.now() - start;
    setSaveLatencyMs(parseFloat(duration.toFixed(2)));
    setTimeout(() => setIsSaving(false), 800);

    const mergedProject = {
      ...activeProject,
      ...nextUpdates,
      updatedAt: Date.now()
    } as Project;

    // Trigger Cloud Backups/Mirrors if configured
    if (settings.backupMode === 'postgres' || settings.backupMode === 'both') {
      syncProjectToPostgres(mergedProject, settings.postgresConnectionString).then((res) => {
        if (!res.success) {
          console.warn('Postgres Backup Failed:', res.message);
        }
      });
    }
    if (settings.backupMode === 'supabase' || settings.backupMode === 'both') {
      syncProjectToSupabase(mergedProject, settings.supabaseUrl, settings.supabaseAnonKey).then((res) => {
        if (!res.success) {
          console.warn('Supabase Backup Failed:', res.message);
        }
      });
    }

    // Broadcast update via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'sync',
        projectState: mergedProject
      }));
    }
  };

  const handleManualBackup = async (target: 'postgres' | 'supabase') => {
    if (!activeProject) {
      toast('Please select or create a project to back up.', 'error');
      return;
    }
    setIsBackingUpDb(true);
    
    let res;
    if (target === 'postgres') {
      res = await syncProjectToPostgres(activeProject, settings.postgresConnectionString);
    } else {
      res = await syncProjectToSupabase(activeProject, settings.supabaseUrl, settings.supabaseAnonKey);
    }

    setIsBackingUpDb(false);
    if (res.success) {
      toast(res.message, 'success');
    } else {
      toast(res.message, 'error');
    }
  };

  // Phase D Handlers
  const handleAnalyzeCompetitor = async () => {
    if (!activeProject || !competitorNameInput) return;
    setIsAnalyzingCompetitor(true);
    try {
      const analysis = await analyzeCompetitor(
        activeProject.description || activeProject.name,
        competitorNameInput,
        competitorLogoUrlInput || undefined
      );
      handleUpdateAndSync({ competitorAnalysis: analysis });
      toast('Competitor analysis complete.', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to analyze competitor', 'error');
    } finally {
      setIsAnalyzingCompetitor(false);
    }
  };

  const handleGenerateEcosystem = async () => {
    if (!activeProject || !activeProject.brandGuide) {
      toast('You need a generated Brand Guide first.', 'error');
      return;
    }
    setIsGeneratingEcosystem(true);
    try {
      const content = await generateEcosystemAsset(activeProject.brandGuide, ecosystemAssetType);
      const newAsset = { type: ecosystemAssetType, content };
      const currentAssets = activeProject.ecosystemAssets || [];
      handleUpdateAndSync({ ecosystemAssets: [newAsset, ...currentAssets] });
      toast('Ecosystem asset generated.', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to generate ecosystem asset', 'error');
    } finally {
      setIsGeneratingEcosystem(false);
    }
  };

  // Undo Logo History navigation
  const handleUndoLogo = () => {
    if (!activeProject || !activeProject.logoHistory || activeProject.logoHistory.length === 0) return;
    const history = [...activeProject.logoHistory];
    const prevSvg = history.pop();
    if (prevSvg) {
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(prevSvg)}`;
      updateProject(activeProjectId!, {
        svgSource: prevSvg,
        logoUrl: dataUrl,
        logoHistory: history
      });
      // Broadcast undo
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'sync',
          projectState: {
            ...activeProject,
            svgSource: prevSvg,
            logoUrl: dataUrl,
            logoHistory: history
          }
        }));
      }
    }
  };

  const activeProjectRef = useRef(activeProject);
  const activeProjectIdRef = useRef(activeProjectId);
  
  useEffect(() => {
    activeProjectRef.current = activeProject;
    activeProjectIdRef.current = activeProjectId;
  }, [activeProject, activeProjectId]);

  // Web Worker setup
  useEffect(() => {
    const workerCode = `
      self.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'BENCHMARK_RENDER') {
          const start = performance.now();
          let sum = 0;
          for (let i = 0; i < 5000000; i++) {
            sum += Math.sin(i) * Math.cos(i);
          }
          const duration = performance.now() - start;
          self.postMessage({
            type: 'BENCHMARK_RESULT',
            payload: {
              frameTimeMs: parseFloat(duration.toFixed(2)),
              opsPerSec: Math.round(5000000 / (duration / 1000)),
              sum
            }
          });
        }
        if (type === 'GRADE_COLORS') {
          const { colors, filterType } = payload;
          const graded = colors.map((color) => {
            let r = parseInt(color.hex.slice(1, 3), 16);
            let g = parseInt(color.hex.slice(3, 5), 16);
            let b = parseInt(color.hex.slice(5, 7), 16);
            if (filterType === 'warm') {
              r = Math.min(255, r * 1.15);
              b = Math.max(0, b * 0.85);
            } else if (filterType === 'cool') {
              b = Math.min(255, b * 1.2);
              r = Math.max(0, r * 0.85);
            } else if (filterType === 'brutalist') {
              r = r > 128 ? 255 : 0;
              g = g > 128 ? 255 : 0;
              b = b > 128 ? 255 : 0;
            } else if (filterType === 'cinematic') {
              r = Math.round(r * 0.9 + 10);
              g = Math.round(g * 0.95 + 15);
              b = Math.round(b * 1.05 + 20);
            }
            const toHex = (val) => {
              const hex = Math.round(val).toString(16);
              return hex.length === 1 ? '0' + hex : hex;
            };
            return { ...color, hex: "#" + toHex(r) + toHex(g) + toHex(b) };
          });
          self.postMessage({ type: 'GRADED_RESULT', payload: { gradedColors: graded, filterType } });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerInstance = new Worker(URL.createObjectURL(blob));

    workerInstance.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'BENCHMARK_RESULT') {
        setBenchmarkResult(payload);
      } else if (type === 'GRADED_RESULT') {
        const currentActiveProjectId = activeProjectIdRef.current;
        const currentActiveProject = activeProjectRef.current;
        if (currentActiveProjectId && currentActiveProject) {
          const updatedGuide = currentActiveProject.brandGuide ? {
            ...currentActiveProject.brandGuide,
            primaryColors: payload.gradedColors.filter((c: any) => c.category === 'primary'),
            secondaryColors: payload.gradedColors.filter((c: any) => c.category === 'secondary')
          } : null;
          handleUpdateAndSync({ brandGuide: updatedGuide as any });
        }
      }
    };

    setWorker(workerInstance);
    return () => {
      workerInstance.terminate();
    };
  }, []);

  // WebSocket Connection Sync Effect
  useEffect(() => {
    if (!activeProjectId) {
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimeout: any;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_DELAY = 10000;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      console.log('[Collab] Opening WebSocket connection:', wsUrl);
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Collab] Connected to server sync.');
        reconnectAttempts = 0;
        ws!.send(JSON.stringify({
          type: 'join',
          roomId: activeProjectId,
          username,
          projectState: activeProjectRef.current,
          authToken: 'dev_token_if_needed' // Optional auth token
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'error') {
            console.error('[Collab] Server Error:', msg.message);
            return;
          }
          if (msg.type === 'welcome') {
            setActiveUsers(msg.activeUsers || []);
            if (msg.projectState) {
              updateProject(activeProjectId, msg.projectState);
            }
          } else if (msg.type === 'user_joined') {
            setActiveUsers(msg.activeUsers || []);
          } else if (msg.type === 'user_left') {
            setActiveUsers(msg.activeUsers || []);
            setRemoteCursors(prev => {
              const next = { ...prev };
              delete next[msg.userId];
              return next;
            });
          } else if (msg.type === 'sync') {
            if (msg.projectState) {
              updateProject(activeProjectId, msg.projectState);
            }
          } else if (msg.type === 'cursor') {
            setRemoteCursors(prev => ({
              ...prev,
              [msg.userId]: {
                username: msg.username,
                color: msg.color,
                x: msg.x,
                y: msg.y
              }
            }));
          }
        } catch (e) {
          console.error('[Collab] Error parsing ws frame:', e);
        }
      };

      ws.onclose = () => {
        console.log('[Collab] WebSocket closed.');
        // Reconnection logic
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
        reconnectAttempts++;
        console.log(`[Collab] Reconnecting in ${delay}ms (Attempt ${reconnectAttempts})...`);
        reconnectTimeout = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.error('[Collab] WebSocket error:', err);
      };

      setSocket(ws);
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.onclose = null; // Prevent reconnect loop on intentional unmount
        ws.close();
      }
    };
  }, [activeProjectId]);

  // ZIP packaging function
  const handleExportZip = async () => {
    if (!activeProject) return;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const svgContent = activeProject.svgSource || `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="50" fill="#4F46E5"/></svg>`;
    zip.file("logo.svg", svgContent);

    let mdContent = `# ${activeProject.name} Brand Guidelines\n\n`;
    if (activeProject.brandGuide) {
      const bg = activeProject.brandGuide;
      mdContent += `## Brand Philosophy\n${bg.brandVoice.description}\n\n`;
      mdContent += `## Brand Voice & Tone\n- Tone: ${bg.brandVoice.tone}\n- Keywords: ${bg.brandVoice.keywords.join(', ')}\n\n`;
      mdContent += `## Primary Color Palette\n`;
      bg.primaryColors.forEach(c => {
        mdContent += `- **${c.name}**: ${c.hex} (${c.usage})\n`;
      });
    }
    zip.file("brand_guide.md", mdContent);
    zip.file("brand_guide.json", JSON.stringify(activeProject, null, 2));

    const prdYaml = `projectName: "${activeProject.name}"
createdAt: ${activeProject.createdAt}
stage: "${activeProject.stage}"
`;
    zip.file("prd_specs.yaml", prdYaml);

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-assets.zip`;
    a.click();
  };

  const handleBulkRenameSubmit = async () => {
    if (!bulkRenameValue.trim() || selectedProjectIds.length === 0) return;
    try {
      await bulkUpdateProjects(selectedProjectIds, { name: bulkRenameValue.trim() });
      toast('Bulk rename successful', 'success');
      setShowBulkRename(false);
      setBulkRenameValue('');
      setIsBulkSelectMode(false);
      setSelectedProjectIds([]);
    } catch (e) {
      toast('Failed to bulk rename', 'error');
    }
  };

  const handleBulkTagSubmit = async () => {
    if (!bulkTagValue.trim() || selectedProjectIds.length === 0) return;
    try {
      const newTags = bulkTagValue.split(',').map(t => t.trim()).filter(Boolean);
      const { projects } = useAppStore.getState();
      
      const promises = selectedProjectIds.map(id => {
        const p = projects.find(proj => proj.id === id);
        if (p) {
          const currentTags = p.tags || [];
          const mergedTags = Array.from(new Set([...currentTags, ...newTags]));
          return updateProject(id, { tags: mergedTags });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      toast('Bulk tag successful', 'success');
      setShowBulkTag(false);
      setBulkTagValue('');
      setIsBulkSelectMode(false);
      setSelectedProjectIds([]);
    } catch (e) {
      toast('Failed to bulk tag', 'error');
    }
  };

  // Bulk ZIP packaging function
  const handleBulkExportZip = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsExportingBulk(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      for (const id of ids) {
        const proj = projects.find(p => p.id === id);
        if (!proj) continue;

        const folderName = proj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `project-${id}`;
        const folder = zip.folder(folderName) || zip;

        const svgContent = proj.svgSource || `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="50" fill="#4F46E5"/></svg>`;
        folder.file("logo.svg", svgContent);

        let mdContent = `# ${proj.name} Brand Guidelines\n\n`;
        if (proj.brandGuide) {
          const bg = proj.brandGuide;
          mdContent += `## Brand Philosophy\n${bg.brandVoice?.description || 'No description provided.'}\n\n`;
          mdContent += `## Brand Voice & Tone\n- Tone: ${bg.brandVoice?.tone || 'Professional'}\n- Keywords: ${bg.brandVoice?.keywords?.join(', ') || 'clean'}\n\n`;
          mdContent += `## Primary Color Palette\n`;
          bg.primaryColors?.forEach(c => {
            mdContent += `- **${c.name}**: ${c.hex} (${c.usage || 'primary'})\n`;
          });
        } else {
          mdContent += `## Description\n${proj.description || 'No description provided.'}\n`;
        }
        folder.file("brand_guide.md", mdContent);
        folder.file("brand_guide.json", JSON.stringify(proj, null, 2));

        const prdYaml = `projectName: "${proj.name}"
createdAt: ${proj.createdAt}
updatedAt: ${proj.updatedAt || proj.createdAt}
stage: "${proj.stage}"
description: "${(proj.description || '').replace(/"/g, '\\"')}"
`;
        folder.file("prd_specs.yaml", prdYaml);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forgel-bulk-export-${Date.now()}.zip`;
      a.click();
    } catch (err) {
      console.error("Bulk export failed", err);
    } finally {
      setIsExportingBulk(false);
    }
  };

  const getStageProgress = (stage: string): { percent: number; colorClass: string; label: string } => {
    switch (stage) {
      case 'discovery': return { percent: 20, colorClass: 'bg-indigo-500', label: 'Discovery' };
      case 'ideation': return { percent: 40, colorClass: 'bg-amber-500', label: 'Ideation' };
      case 'drafting': return { percent: 60, colorClass: 'bg-orange-500', label: 'Drafting' };
      case 'refinement': return { percent: 80, colorClass: 'bg-purple-500', label: 'Refinement' };
      case 'delivery': return { percent: 100, colorClass: 'bg-emerald-500', label: 'Delivery' };
      default: return { percent: 0, colorClass: 'bg-neutral-300', label: 'Unknown' };
    }
  };

  // PPTX deck exporter
  const handleExportPPTX = async () => {
    if (!activeProject) return;
    try {
      const response = await fetch('/api/export/pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: activeProject.name,
          description: activeProject.description,
          brandGuide: activeProject.brandGuide,
          colors: activeProject.brandGuide?.primaryColors?.map(c => c.hex) || []
        })
      });
      if (!response.ok) throw new Error('PPTX generation failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-brand-deck.pptx`;
      a.click();
    } catch (err: any) {
      console.error(err);
      toast('Failed to generate brand deck PPTX: ' + err.message, 'error');
    }
  };

  // High-res PNG rendering pipeline
  const handleExportHighResPNG = () => {
    if (!activeProject) return;
    const svgContent = activeProject.svgSource || `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#E0E7FF"/><circle cx="100" cy="100" r="40" fill="#4F46E5"/></svg>`;
    
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 2000;
    const offscreen = canvas.transferControlToOffscreen();
    
    const worker = new Worker(new URL('./canvasWorker.ts', import.meta.url));
    worker.postMessage({
      type: 'EXPORT_IMAGE',
      payload: {
        canvas: offscreen,
        svgContent,
        fileName: `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-highres.png`
      }
    }, [offscreen]);
    
    worker.onmessage = (e) => {
      if (e.data.type === 'EXPORT_RESULT') {
        const { blob, fileName } = e.data.payload;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        worker.terminate();
      }
    };

    worker.onerror = async (err) => {
      console.error("Client-side export failed, falling back to server.", err);
      try {
        const response = await fetch('/api/export/png', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            svgContent,
            projectName: activeProject.name
          })
        });
        
        if (!response.ok) throw new Error("Server export failed");
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}-highres.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (fallbackErr) {
        console.error("Server fallback failed", fallbackErr);
        toast('Failed to generate PNG image.', 'error');
      }
      worker.terminate();
    };
  };

  // Standard raw SVG download helper
  const handleDownloadSVG = () => {
    if (!activeProject) return;
    const svgContent = activeProject.svgSource || `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="50" fill="#4F46E5"/></svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
  };

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (activeProject && description !== activeProject.description) {
       setDescription(activeProject.description);
    }
  }, [activeProject?.id]);

  const handleCreateNewProject = async () => {
    const proj = await createProject();
    setView('studio');
    setMode('create');
  };

  const handleMockupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId || !activeProject) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const newMockup: Mockup = {
        id: crypto.randomUUID(),
        name: file.name,
        base64Data,
        mimeType: file.type || 'image/png'
      };
      updateProject(activeProjectId, { mockups: [...activeProject.mockups, newMockup] });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateRationale = async () => {
    if (!activeProject) return;
    setIsGeneratingRationale(true);
    setRationale(null);
    try {
      const text = await generateDesignRationale(activeProject.description, activeProject.stage);
      setRationale(text);
    } catch (err) {
      console.error(err);
      setError("Failed to generate rationale.");
    } finally {
      setIsGeneratingRationale(false);
    }
  };

  const handleGenerateLogo = async () => {
    if (!description.trim()) {
      setError("Please describe your company before generating.");
      return;
    }
    if (!activeProjectId) return;
    try {
      setIsGenerating(true);
      setError(null);
      const url = await generateLogoImage(description);
      await updateProject(activeProjectId, { 
        logoUrl: url, 
        logoMimeType: 'image/png', 
        brandGuide: null,
        description: description,
        name: description.split(' ').slice(0, 3).join(' ') + ' Logo'
      });
      setActiveTab('preview');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while generating the logo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      await updateProject(activeProjectId, { 
        logoUrl: event.target?.result as string, 
        logoMimeType: file.type, 
        brandGuide: null,
        name: file.name.split('.')[0]
      });
      setActiveTab('preview');
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateGuide = async () => {
    if (!activeProject?.logoUrl || !activeProjectId) return;
    try {
      setIsGeneratingGuide(true);
      setError(null);
      const base64Data = activeProject.logoUrl.split(',')[1];
      const mimeTypeMatch = activeProject.logoUrl.match(/data:(.*?);/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : activeProject.logoMimeType;
      
      const context = activeProject.description || undefined;
      const guide = await generateBrandGuide(base64Data, mimeType, context);
      await updateProject(activeProjectId, { brandGuide: guide });
      setActiveTab('guide');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate brand guide.");
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const handleRefineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject?.logoUrl || !activeProjectId) return;
    
    try {
      setIsRefining(true);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        
        // Add to refinement files
        const newFiles = [...activeProject.refinementFiles, {
          name: file.name,
          base64Data: fileData.split(',')[1],
          mimeType: file.type || 'application/octet-stream'
        }];
        
        await updateProject(activeProjectId, { refinementFiles: newFiles });
        
        // Trigger AI analysis
        const logoBase64 = activeProject.logoUrl!.split(',')[1];
        const logoMime = activeProject.logoMimeType;
        
        const suggestions = await analyzeRefinementContext(logoBase64, logoMime, newFiles);
        await updateProject(activeProjectId, { refinementSuggestions: suggestions });
        setIsRefining(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze refinement context.");
      setIsRefining(false);
    }
  };

  const applyRefinedPrompt = async () => {
    if (!activeProject?.refinementSuggestions?.refinedLogoPrompt || !activeProjectId) return;
    
    try {
      setIsGenerating(true);
      setError(null);
      setActiveTab('preview');
      
      const url = await generateLogoImage(activeProject.refinementSuggestions.refinedLogoPrompt);
      await updateProject(activeProjectId, { 
        logoUrl: url,
        description: activeProject.refinementSuggestions.refinedLogoPrompt
      });
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate refined logo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSonicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    
    try {
      setIsGeneratingSonic(true);
      setError(null);
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        
        const newAssets = [...(activeProject?.sonicAssets || []), {
          name: file.name,
          base64Data: fileData,
          mimeType: file.type || 'audio/mp3'
        }];
        
        await updateProject(activeProjectId, { sonicAssets: newAssets });
        
        // Trigger philosophy generation
        const soundNames = newAssets.map(a => a.name);
        const philosophy = await generateSonicPhilosophy(activeProject?.description || activeProject?.name || 'Brand', soundNames);
        await updateProject(activeProjectId, { sonicPhilosophy: philosophy });
        setIsGeneratingSonic(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate sonic philosophy.");
      setIsGeneratingSonic(false);
    }
  };

  const handleExportNotion = async () => {
    if (!activeProject) return;

    try {
      // 1. Fetch the OAuth URL from our server
      const response = await fetch('/api/oauth/notion/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL. Check NOTION_CLIENT_ID configuration.');
      }
      const { url } = await response.json();

      // 2. Open popup
      const authWindow = window.open(
        url,
        'oauth_popup',
        'width=600,height=700'
      );

      if (!authWindow) {
        toast('Please allow popups for this site to connect to Notion.', 'error');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      toast(error.message, 'error');
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && activeProject) {
        toast(`Successfully connected to Notion workspace: ${event.data.workspace}`, 'success');
        
        // Trigger export
        try {
          const exportRes = await fetch('/api/notion/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectName: activeProject.name,
              description: activeProject.description,
              colors: activeProject.brandGuide?.primaryColors.map(c => c.hex) || [],
            })
          });
          
          const exportData = await exportRes.json();
          if (exportRes.ok) {
            toast(`Export successful! Notion Page: ${exportData.url}`, 'success');
          } else {
            throw new Error(exportData.error);
          }
        } catch (exportErr: any) {
           toast(`Failed to export: ${exportErr.message}`, 'error');
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeProject]);

  const currentAnim = ANIMATIONS[activeAnimation];

  if (!isHydrated) {
    return <div className="min-h-screen bg-neutral-100 dark:bg-zinc-950 flex items-center justify-center"><RefreshCw className="animate-spin w-8 h-8 text-neutral-400" /></div>;
  }

  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-neutral-100 dark:bg-zinc-950 text-neutral-900 dark:text-zinc-100 font-sans flex flex-col-reverse md:flex-row shadow-inner overflow-hidden">
      <KeyboardManager 
        onSave={() => {
          if (activeProject) {
            handleUpdateAndSync({});
          }
        }}
        onUndo={handleUndoLogo}
        onRedo={() => console.log("Keyboard redo: Already latest revision.")}
        onExport={() => {
          if (activeProject) {
            handleDownloadSVG();
          }
        }}
        onSelectTab={(tab) => {
          setView('studio');
          setActiveTab(tab);
        }}
      />
      
      {/* Global Navigation Rail */}
      <div className="w-full md:w-20 h-20 md:h-full bg-white dark:bg-zinc-950 border-t md:border-t-0 md:border-r border-neutral-200 dark:border-zinc-800 flex flex-row md:flex-col items-center justify-around md:justify-start py-4 md:py-8 gap-4 md:gap-8 shrink-0 z-20">
        <div className="hidden md:flex w-10 h-10 bg-brand-lead rounded-xl items-center justify-center text-white font-bold mb-4 shadow-lg shadow-indigo-600/20">
          <Sparkles size={20} />
        </div>
        
        <button 
          onClick={() => setView('dashboard')}
          className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-50 dark:bg-zinc-800 text-brand-lead dark:text-indigo-400' : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900'}`}
          title="Asset Library / Workspace"
        >
          <FolderArchive size={24} />
        </button>
        
        <button 
          onClick={() => setView('studio')}
          className={`p-3 rounded-xl transition-all ${view === 'studio' ? 'bg-indigo-50 dark:bg-zinc-800 text-brand-lead dark:text-indigo-400' : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900'}`}
          title="Refinement Studio"
        >
          <Palette size={24} />
        </button>

        <button 
          id="btn-nav-course"
          onClick={() => setView('course')}
          className={`p-3 rounded-xl transition-all ${view === 'course' ? 'bg-white dark:bg-zinc-900/20 text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-white hover:bg-white dark:bg-zinc-900/10'}`}
          title="Beginex Course"
        >
          <GraduationCap size={24} />
        </button>

        <div className="flex-1" />

        {/* Role Switcher */}
        <button 
          onClick={() => {
            const newRole = settings.role === 'Server' ? 'Designer' : 'Server';
            updateSettings({ role: newRole });
          }}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border border-dashed cursor-pointer shrink-0 ${
            settings.role === 'Server' 
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
              : 'border-zinc-800 bg-zinc-950/40 text-neutral-500 hover:text-neutral-300'
          }`}
          title={`Switch Role (Current: ${settings.role || 'Designer'})`}
        >
          {settings.role === 'Server' ? <Lock size={15} className="text-emerald-400" /> : <Unlock size={15} />}
          <span className="text-[9px] font-mono font-black mt-1 uppercase tracking-wider">
            {settings.role === 'Server' ? 'SRV' : 'DSN'}
          </span>
        </button>

        {/* Whacanudo (Help / What Can You Do) Button */}
        <button 
          onClick={() => setIsWhacanudoOpen(true)}
          className="p-3 rounded-xl transition-all text-amber-500 hover:bg-zinc-900/10 dark:hover:bg-zinc-900/40 relative cursor-pointer group"
          title="Whacanudo"
        >
          <HelpCircle size={24} className="text-amber-500 animate-pulse group-hover:scale-110 transition-transform" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Whacanudo
          </span>
        </button>

        {/* Global Dark Mode Toggle */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 rounded-xl transition-all text-neutral-500 hover:text-black dark:hover:text-amber-400 hover:bg-neutral-50 dark:hover:bg-zinc-900 cursor-pointer"
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={24} className="text-amber-500 animate-pulse" /> : <Moon size={24} />}
        </button>

        {/* User Auth Profile in Rail */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {user ? (
            <button
              onClick={() => logout()}
              className="relative p-0.5 rounded-full border-2 border-emerald-500 hover:border-red-500 transition-colors group cursor-pointer"
              title={`Logged in as ${user.displayName || user.email}. Click to Sign Out.`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold font-sans">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-950 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
                Sign Out ({user.displayName || 'User'})
              </span>
            </button>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="p-3 rounded-xl text-neutral-500 hover:text-indigo-500 hover:bg-neutral-50 dark:hover:bg-zinc-900 transition-all cursor-pointer group relative"
              title="Sign in with Google"
            >
              <Lock size={24} />
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-950 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-md">
                Sign In with Google
              </span>
            </button>
          )}
        </div>

        <button 
          onClick={() => setView('settings')}
          className={`p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-indigo-50 dark:bg-zinc-800 text-brand-lead dark:text-indigo-400' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-zinc-900'}`}
          title="Settings"
        >
          <Settings size={24} />
        </button>

        {/* Brand Attribution */}
        <div className="hidden md:flex flex-col items-center justify-center text-center px-1 pb-4 pt-4 group cursor-default" title="Built by Srvel — Serve. Grow. Lead.">
          <span className="text-[9px] font-display font-bold text-neutral-400 dark:text-zinc-500 group-hover:text-brand-lead transition-colors uppercase tracking-wider">Forged for</span>
          <span className="text-[9px] font-sans font-bold text-neutral-500 dark:text-zinc-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors uppercase tracking-widest mt-0.5">Creators</span>
        </div>
      </div>

      {view === 'dashboard' ? (
        <div className="flex-1 p-6 md:p-12 overflow-y-auto relative">
          <div className="max-w-6xl mx-auto">
            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div>
                <h1 className="text-4xl font-display font-bold tracking-tight mb-2 text-black dark:text-white">{t('app_title')}</h1>
                <p className="text-neutral-500 dark:text-zinc-400">{t('app_description')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* Google Auth Integration Button */}
                {user ? (
                  <div className="flex items-center gap-2 bg-neutral-100 dark:bg-zinc-800 px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-zinc-750">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="text-xs font-bold text-neutral-800 dark:text-zinc-200">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                    <button
                      onClick={() => logout()}
                      className="ml-2 text-xs text-red-500 hover:text-red-600 font-bold transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => signInWithGoogle()}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Sign In with Google to Sync to Cloud"
                  >
                    <Lock size={14} className="text-white" /> Sign In
                  </button>
                )}

                {/* Google Drive Button */}
                <button
                  onClick={() => setIsGoogleDriveOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-750 transition-all cursor-pointer shadow-xs"
                  title="Google Drive Storage Integration"
                >
                  <Cloud size={14} className="text-indigo-500" /> Google Drive
                </button>

                {/* Onboarding Tour Button */}
                <button
                  onClick={() => setTourStep(0)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-neutral-600 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-neutral-100 dark:bg-zinc-800 rounded-xl hover:bg-neutral-200 dark:hover:bg-zinc-750 transition-all cursor-pointer shadow-xs"
                  title="Take Interactive Onboarding Tour"
                >
                  <HelpCircle size={14} className="text-indigo-500 animate-bounce" /> Onboarding Tour
                </button>

                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-3 rounded-xl bg-neutral-200 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                  title="Toggle Theme"
                >
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="flex bg-neutral-200 dark:bg-zinc-800 p-1 rounded-xl">
                  {['en', 'fr', 'ar'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => i18n.changeLanguage(lang)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer ${i18n.language === lang ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <button 
                  id="btn-create-project"
                  onClick={handleCreateNewProject} 
                  className={`flex items-center gap-2 bg-brand-lead hover:bg-brand-lead/80 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all cursor-pointer ${
                    tourStep === 1 
                      ? 'ring-4 ring-indigo-500 shadow-2xl relative z-[101] scale-105' 
                      : ''
                  }`}
                >
                  <Plus size={18} /> {t('new_project')}
                </button>
              </div>
            </div>

            {/* Active vs Archived Brands Tab Control */}
            <div className="flex border-b border-neutral-200 dark:border-zinc-850 mb-8 gap-6">
              <button
                onClick={() => { setDashboardTab('active'); setIsBulkSelectMode(false); setSelectedProjectIds([]); }}
                className={`pb-3.5 text-xs font-black tracking-widest uppercase relative transition-all cursor-pointer ${dashboardTab === 'active' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-300'}`}
              >
                Active Brands ({projects.filter(p => !p.archived).length})
                {dashboardTab === 'active' && <motion.div layoutId="activeDashboardTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
              </button>
              <button
                onClick={() => { setDashboardTab('archived'); setIsBulkSelectMode(false); setSelectedProjectIds([]); }}
                className={`pb-3.5 text-xs font-black tracking-widest uppercase relative transition-all cursor-pointer ${dashboardTab === 'archived' ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-neutral-400 dark:text-zinc-500 hover:text-neutral-700 dark:hover:text-zinc-300'}`}
              >
                Archived ({projects.filter(p => p.archived).length})
                {dashboardTab === 'archived' && <motion.div layoutId="activeDashboardTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
              </button>
            </div>

            {/* High-Fidelity Filters & Search Bar */}
            <ProjectAnalytics />
            {projects.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs">
                {/* Search query input */}
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search brand space or active project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium text-neutral-800 dark:text-zinc-100 placeholder:text-neutral-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Filters, multi-select action triggers */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setIsBulkSelectMode(!isBulkSelectMode);
                      setSelectedProjectIds([]);
                    }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isBulkSelectMode
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {isBulkSelectMode ? 'Cancel Selection' : 'Bulk Select'}
                  </button>

                  {isBulkSelectMode && selectedProjectIds.length > 0 && (
                    <button
                      onClick={() => setProjectsToDelete(selectedProjectIds)}
                      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-600 text-white hover:bg-red-500 cursor-pointer transition-all"
                    >
                      Delete {selectedProjectIds.length} Selected
                    </button>
                  )}
                  {/* Stage selector filter */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 shrink-0 flex items-center gap-1">
                      <Filter size={11} /> Filter:
                    </span>
                    {['all', 'discovery', 'ideation', 'drafting', 'refinement', 'delivery'].map((stg) => (
                      <button
                        key={stg}
                        onClick={() => setStageFilter(stg)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                          stageFilter === stg
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-neutral-50 dark:bg-zinc-950 border border-neutral-100 dark:border-zinc-800 text-neutral-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {stg}
                      </button>
                    ))}
                  </div>

                  {/* Bulk Multi-select mode trigger */}
                  <div className="h-4 w-[1px] bg-neutral-200 dark:bg-zinc-800 hidden sm:block" />
                  
                  <button
                    onClick={() => {
                      setIsBulkSelectMode(!isBulkSelectMode);
                      setSelectedProjectIds([]);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
                      isBulkSelectMode 
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                        : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {isBulkSelectMode ? 'Exit Selection Mode' : 'Bulk Select Export'}
                  </button>
                </div>
              </div>
            )}
            
            {projects.length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-neutral-200 dark:border-zinc-800 border-dashed">
                <FolderArchive className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">{t('no_projects')}</h3>
                <p className="text-neutral-500 dark:text-zinc-400 mb-6">{t('create_first_project')}</p>
                <button onClick={handleCreateNewProject} className="bg-brand-lead hover:bg-brand-lead/80 text-white px-6 py-3 rounded-xl font-bold shadow-sm inline-flex items-center gap-2 cursor-pointer">
                  <Plus size={18} /> {t('create_project')}
                </button>
              </div>
            ) : (
              (() => {
                // Filter projects by active/archived tab, search, and stage
                const filteredProjects = projects.filter((proj) => {
                  const matchTab = dashboardTab === 'archived' ? proj.archived : !proj.archived;
                  const searchLower = searchQuery.toLowerCase();
                  const matchSearch = proj.name.toLowerCase().includes(searchLower) || (proj.tags && proj.tags.some(t => t.toLowerCase().includes(searchLower)));
                  const matchStage = stageFilter === 'all' || proj.stage === stageFilter;
                  return matchTab && matchSearch && matchStage;
                });

                if (filteredProjects.length === 0) {
                  return (
                    <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-xs space-y-4">
                      <FolderArchive className="w-12 h-12 mx-auto text-neutral-300 dark:text-zinc-700" />
                      <h3 className="text-lg font-bold text-neutral-800 dark:text-zinc-200">
                        {dashboardTab === 'archived' ? 'No Archived Brands Found' : 'No Brands Found'}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-zinc-400 max-w-sm mx-auto">
                        {dashboardTab === 'archived' 
                          ? 'Inactive brands are auto-archived after 30 days of inactivity. Archive an active brand space to test this tab.'
                          : 'Try modifying your query or resetting your filters to view active brand operating projects.'}
                      </p>
                      <button
                        onClick={() => { setSearchQuery(''); setStageFilter('all'); }}
                        className="text-xs font-black uppercase text-indigo-600 hover:underline cursor-pointer"
                      >
                        Reset Search Filters
                      </button>
                    </div>
                  );
                }

                return (
                  <motion.div 
                    initial="hidden"
                    animate="show"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.05 } }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  >
                    {filteredProjects.map(proj => {
                      const sanitizedSource = sanitizeSVG(proj.svgSource);
                      const isSelected = selectedProjectIds.includes(proj.id);
                      const progressInfo = getStageProgress(proj.stage);

                      return (
                        <motion.div 
                          key={proj.id} 
                          variants={{
                            hidden: { opacity: 0, y: 15 },
                            show: { opacity: 1, y: 0 }
                          }}
                          className={`bg-white dark:bg-zinc-900 rounded-3xl p-6 border transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between shadow-xs ${
                            isSelected 
                              ? 'border-indigo-600 ring-2 ring-indigo-500/20' 
                              : 'border-neutral-200 dark:border-zinc-800 hover:border-neutral-300 dark:hover:border-zinc-700 hover:shadow-md'
                          } ${proj.archived ? 'opacity-90 bg-neutral-50/50 dark:bg-zinc-900/50' : ''}`} 
                          onClick={(e) => {
                            if (isBulkSelectMode) {
                              e.stopPropagation();
                              if (isSelected) {
                                setSelectedProjectIds(selectedProjectIds.filter(id => id !== proj.id));
                              } else {
                                setSelectedProjectIds([...selectedProjectIds, proj.id]);
                              }
                            } else {
                              setActiveProject(proj.id); 
                              setView('studio');
                            }
                          }}
                        >
                          <div>
                            {/* Hover Controls (Actions Toolbar) */}
                            {!isBulkSelectMode && (
                              <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                                {/* Simulate 30d inactivity trigger (Active only) */}
                                {!proj.archived && (
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      // Simulate 30d+ inactivity by setting updatedAt to 31 days ago
                                      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
                                      await updateProject(proj.id, { updatedAt: thirtyOneDaysAgo, archived: true });
                                    }} 
                                    className="p-2 bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 hover:bg-amber-100 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer" 
                                    title="Simulate 30-Day Inactivity (Trigger Auto-Archive)"
                                  >
                                    <RefreshCw size={14} className="animate-pulse" />
                                  </button>
                                )}

                                {/* Manual toggle archive / unarchive */}
                                {proj.archived ? (
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      await updateProject(proj.id, { archived: false, updatedAt: Date.now() });
                                    }} 
                                    className="p-2 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer" 
                                    title="Retrieve & Restore Active Brand"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                ) : (
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      await updateProject(proj.id, { archived: true, updatedAt: Date.now() });
                                    }} 
                                    className="p-2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer" 
                                    title="Archive Brand Space"
                                  >
                                    <FolderArchive size={14} />
                                  </button>
                                )}

                                <button 
                                  onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    await cloneProject(proj.id);
                                    toast('success', 'Project cloned successfully!');
                                  }} 
                                  className="p-2 bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 hover:bg-amber-100 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer" 
                                  title="Clone Project"
                                >
                                  <Copy size={14} />
                                </button>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setProjectToDelete(proj.id);
                                  }} 
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all cursor-pointer" 
                                  title="Delete Project Permanent"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}

                            {/* Checkbox for Selection Mode */}
                            {isBulkSelectMode && (
                              <div className="absolute top-4 right-4 z-10">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                  isSelected 
                                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                                    : 'border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-950'
                                }`}>
                                  {isSelected && <Check size={12} className="stroke-[3]" />}
                                </div>
                              </div>
                            )}

                            {/* Logo display container */}
                            <div className="aspect-square rounded-2xl bg-neutral-100 dark:bg-zinc-950 flex items-center justify-center mb-6 overflow-hidden border border-neutral-200 dark:border-zinc-850 p-4">
                              {proj.logoUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                  <img 
                                    src={proj.logoUrl} 
                                    alt={proj.name} 
                                    className="w-full h-full object-contain filter drop-shadow-sm" 
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      const fallback = parent?.querySelector('.fallback');
                                      fallback?.classList.remove('hidden');
                                    }}
                                  />
                                  <div className="hidden fallback absolute inset-0 flex items-center justify-center">
                                     <Wand2 size={32} className="text-neutral-300" />
                                  </div>
                                </div>
                              ) : sanitizedSource ? (
                                <div 
                                  dangerouslySetInnerHTML={{ __html: sanitizedSource }} 
                                  className="w-full h-full flex items-center justify-center p-2 [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain" 
                                />
                              ) : (
                                <Wand2 size={32} className="text-neutral-300" />
                              )}
                            </div>

                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-lg truncate text-neutral-900 dark:text-zinc-100 pr-2">{proj.name}</h3>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 shrink-0 mt-1">
                                {proj.stage}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">{safeFormatDate(proj.createdAt, i18n.language)}</p>
                            
                            {/* Project Tags */}
                            {proj.tags && proj.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {proj.tags.map((tag, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-zinc-400 text-[9px] font-bold uppercase tracking-wider rounded-md">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Progress Indicator Bar */}
                          <div className="mt-5 space-y-1.5">
                            <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400 dark:text-zinc-500 uppercase tracking-widest">
                              <span>Stage Progress</span>
                              <span className="text-neutral-600 dark:text-zinc-400">{progressInfo.percent}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${progressInfo.colorClass} transition-all duration-500`}
                                style={{ width: `${progressInfo.percent}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar shrink-0">
                            {proj.brandGuide && <span className="px-2 py-1 bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300 text-[9px] uppercase tracking-wider font-bold rounded">Guide</span>}
                            {proj.sonicAssets?.length > 0 && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[9px] uppercase tracking-wider font-bold rounded">Sonic</span>}
                            {proj.refinementFiles?.length > 0 && <span className="px-2 py-1 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-[9px] uppercase tracking-wider font-bold rounded">Files</span>}
                            {proj.stickyNotes?.length > 0 && <span className="px-2 py-1 bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[9px] uppercase tracking-wider font-bold rounded">Notes ({proj.stickyNotes.length})</span>}
                            {proj.archived && <span className="px-2 py-1 bg-neutral-200 dark:bg-zinc-800 text-neutral-600 dark:text-zinc-400 text-[9px] uppercase tracking-wider font-bold rounded">Archived</span>}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                );
              })()
            )}
          </div>

          {/* Floating Bulk Actions Bar */}
          <AnimatePresence>
            {isBulkSelectMode && selectedProjectIds.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white dark:bg-zinc-950 border border-neutral-800 dark:border-zinc-800 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 z-40 max-w-lg w-full justify-between"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-neutral-300">
                    {selectedProjectIds.length} {selectedProjectIds.length === 1 ? 'brand space' : 'brand spaces'} selected
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Ready for bulk package export
                  </span>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      const visibleProjectIds = projects
                        .filter(p => dashboardTab === 'archived' ? p.archived : !p.archived)
                        .map(p => p.id);
                      setSelectedProjectIds(visibleProjectIds);
                    }}
                    className="px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-neutral-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setShowBulkRename(true)}
                    className="px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-neutral-300"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => setShowBulkTag(true)}
                    className="px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-neutral-300"
                  >
                    Tag
                  </button>
                  <button
                    onClick={() => handleBulkExportZip(selectedProjectIds)}
                    disabled={isExportingBulk}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    {isExportingBulk ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" /> Packaging...
                      </>
                    ) : (
                      <>
                        <Download size={13} /> Export ZIP
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Rename Modal */}
          <AnimatePresence>
            {showBulkRename && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-zinc-800"
                >
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Bulk Rename Projects</h3>
                  <p className="text-sm text-neutral-500 mb-6">Enter a new name for the {selectedProjectIds.length} selected projects.</p>
                  
                  <input
                    type="text"
                    value={bulkRenameValue}
                    onChange={(e) => setBulkRenameValue(e.target.value)}
                    placeholder="New Project Name"
                    className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white mb-6"
                    autoFocus
                  />
                  
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setShowBulkRename(false); setBulkRenameValue(''); }}
                      className="px-4 py-2 text-sm font-bold text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkRenameSubmit}
                      disabled={!bulkRenameValue.trim()}
                      className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Apply Rename
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Bulk Tag Modal */}
          <AnimatePresence>
            {showBulkTag && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-zinc-800"
                >
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Bulk Add Tags</h3>
                  <p className="text-sm text-neutral-500 mb-6">Enter tags to apply to the {selectedProjectIds.length} selected projects (comma-separated).</p>
                  
                  <input
                    type="text"
                    value={bulkTagValue}
                    onChange={(e) => setBulkTagValue(e.target.value)}
                    placeholder="e.g. campaign2026, social-media"
                    className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white mb-6"
                    autoFocus
                  />
                  
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => { setShowBulkTag(false); setBulkTagValue(''); }}
                      className="px-4 py-2 text-sm font-bold text-neutral-600 dark:text-zinc-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBulkTagSubmit}
                      disabled={!bulkTagValue.trim()}
                      className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Apply Tags
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Onboarding Interactive Tour Overlay Portal */}
          <AnimatePresence>
            {tourStep !== null && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
                {(() => {
                  const steps = [
                    {
                      title: "Welcome to Forgel! 🚀",
                      description: "Your AI-powered brand identity operating system. This playground will guide you to forge complete brand standards, vector logos, and design specifications. Let's explore how to get started!",
                      targetId: null,
                      position: "center"
                    },
                    {
                      title: "Forge Your First Brand 🎨",
                      description: "Click this 'New Project' button to spin up a fresh brand sandbox. This generates an empty workspace where the AI can engineer guides, vector path layers, and brand specifications.",
                      targetId: "btn-create-project",
                      position: "top-right"
                    },
                    {
                      title: "Beginex Design Academy 🎓",
                      description: "Explore interactive design tutorials! Perfect your shape grammar weight, study secondary color theory harmony, master elegant typography tracking, and earn lesson completions.",
                      targetId: "btn-nav-course",
                      position: "bottom-left"
                    }
                  ];
                  
                  const step = steps[tourStep];
                  if (!step) return null;

                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left relative"
                    >
                      {/* Step counter badge */}
                      <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                        Step {tourStep + 1} of {steps.length}
                      </span>
                      
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{step.title}</h3>
                      <p className="text-sm text-neutral-500 dark:text-zinc-400 leading-relaxed">
                        {step.description}
                      </p>

                      {/* Helper instruction highlighting element location */}
                      {step.targetId && (
                        <div className="mt-2 p-2 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-100 dark:border-zinc-850 text-[10px] font-mono text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
                          <Info size={12} className="text-indigo-500 shrink-0" />
                          Look for this element: <span className="font-bold text-indigo-600 dark:text-indigo-400">Pulsing in the {step.position === 'top-right' ? 'top-right of the header' : 'left navigation rail'}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-zinc-800">
                        <button
                          onClick={() => {
                            localStorage.setItem('forgel_tour_completed', 'true');
                            setTourStep(null);
                          }}
                          className="text-xs text-neutral-400 dark:text-zinc-500 hover:text-neutral-600 dark:hover:text-zinc-300 cursor-pointer font-bold"
                        >
                          Skip Tour
                        </button>

                        <div className="flex items-center gap-2">
                          {tourStep > 0 && (
                            <button
                              onClick={() => setTourStep(tourStep - 1)}
                              className="px-3 py-1.5 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition-colors cursor-pointer text-neutral-700 dark:text-zinc-300"
                            >
                              Back
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (tourStep < steps.length - 1) {
                                setTourStep(tourStep + 1);
                              } else {
                                localStorage.setItem('forgel_tour_completed', 'true');
                                setTourStep(null);
                              }
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            {tourStep === steps.length - 1 ? 'Finish Tour' : 'Next Step'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </div>
            )}
          </AnimatePresence>

          {/* High Fidelity animated modal confirmation overlay instead of blocking windows */}
          <AnimatePresence>
            {(projectToDelete || projectsToDelete.length > 0) && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
                >
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Delete {projectToDelete ? 'Brand Space' : 'Brand Spaces'}</h3>
                  <p className="text-sm text-neutral-500 dark:text-zinc-400">
                    Are you sure you want to permanently delete {projectToDelete ? (
                      <span className="font-bold text-neutral-900 dark:text-white">"{projects.find(p => p.id === projectToDelete)?.name}"</span>
                    ) : (
                      <span className="font-bold text-neutral-900 dark:text-white">{projectsToDelete.length} selected brand spaces</span>
                    )}? This action is irreversible and all logo history, annotations, and brand assets will be lost.
                  </p>
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => { setProjectToDelete(null); setProjectsToDelete([]); }}
                      className="px-4 py-2 border border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition-colors cursor-pointer text-neutral-700 dark:text-zinc-300"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (projectToDelete) {
                          deleteProject(projectToDelete);
                          setProjectToDelete(null);
                        } else {
                          deleteProjects(projectsToDelete);
                          setProjectsToDelete([]);
                          setSelectedProjectIds([]);
                          setIsBulkSelectMode(false);
                        }
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Yes, Delete Permanent
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : view === 'studio' ? (
        <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
          <TouchGesturesHelp />
          {/* Mobile drawer backdrop */}
          {isMobileDrawerOpen && (
            <div 
              className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileDrawerOpen(false)}
            />
          )}

          {/* Mobile FAB to toggle sidebar */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="fixed bottom-24 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-2xl z-50 md:hidden hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-indigo-400"
            title="Toggle Studio Controls"
          >
            <Sparkles size={20} className={`transition-transform duration-300 ${isMobileDrawerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Mobile Bottom Sheet for Studio Controls */}
          <Sheet isOpen={isMobileDrawerOpen} onClose={() => setIsMobileDrawerOpen(false)} title="Studio Controls">
             <StudioControls 
                activeProject={activeProject}
                updateProject={updateProject}
                activeProjectId={activeProjectId}
                handleGenerateRationale={handleGenerateRationale}
                isGeneratingRationale={isGeneratingRationale}
                rationale={rationale}
                t={t}
             />
          </Sheet>

          {/* Studio Control Panel (Desktop Sidebar) */}
          <div className={`hidden md:flex w-80 lg:w-[400px] h-full bg-white dark:bg-zinc-900 border-r border-neutral-300 dark:border-zinc-800 p-8 flex-col shrink-0 z-10 overflow-y-auto`}>
            <div className="mb-8">
              <h1 className="text-2xl font-display font-bold tracking-tight mb-1 text-black dark:text-white">{t('refinement_studio')}</h1>
              <p className="text-xs font-medium text-neutral-500 dark:text-zinc-400 uppercase tracking-widest">{activeProject?.name || 'No Project Selected'}</p>
            </div>

            {!activeProject ? (
              <div className="flex-1 flex items-center justify-center flex-col text-center opacity-50">
                <LayoutDashboard className="w-12 h-12 mb-4" />
                <p>{t('no_project_selected')}</p>
              </div>
            ) : (
              <>
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-neutral-500">
                    <span>Project Stage</span>
                    <span className="text-brand-lead">{activeProject.stage}</span>
                  </div>
                  <div className="flex gap-1 h-2">
                    {['discovery', 'ideation', 'drafting', 'refinement', 'delivery'].map((s, i, arr) => {
                      const currentIndex = arr.indexOf(activeProject.stage);
                      return (
                        <div key={s} className={`flex-1 rounded-full ${i <= currentIndex ? 'bg-brand-lead' : 'bg-neutral-200 dark:bg-zinc-800'}`} />
                      );
                    })}
                  </div>
                  <div className="bg-brand-growth/20 border border-brand-growth/50 p-4 rounded-xl text-sm text-neutral-800 dark:text-zinc-200">
                    <p className="font-bold mb-1 flex items-center gap-2"><Sparkles size={14} className="text-brand-lead" /> Forgel Guide</p>
                    <p className="text-xs leading-relaxed mb-3">
                      {activeProject.stage === 'discovery' && 'Start by providing a deep, emotional description of the brand. What is the core "why"?'}
                      {activeProject.stage === 'ideation' && 'Review the AI drafts. Look for shapes that convey the story, not just literal interpretations.'}
                      {activeProject.stage === 'drafting' && 'Switch to the Precision canvas to edit the raw SVG. Clean up anchor points.'}
                      {activeProject.stage === 'refinement' && 'Upload mockups to see the logo in context. Refine colors.'}
                      {activeProject.stage === 'delivery' && 'Generate the final Brand Guide and Sonic Philosophy.'}
                    </p>
                    <div className="border-t border-brand-growth/30 pt-3">
                      <button 
                        onClick={handleGenerateRationale} 
                        disabled={isGeneratingRationale} 
                        className="w-full py-1.5 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg text-xs font-bold hover:border-brand-lead transition-colors flex items-center justify-center gap-2"
                      >
                        {isGeneratingRationale ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}
                        Explain Design Rationale
                      </button>
                    </div>
                  </div>
                  {rationale && (
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs text-neutral-600 dark:text-zinc-400 max-h-48 overflow-y-auto space-y-2">
                      {rationale.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                    </div>
                  )}
                  <div className="flex gap-2">
                     <button 
                       onClick={() => {
                         const stages = ['discovery', 'ideation', 'drafting', 'refinement', 'delivery'] as const;
                         const nextIdx = Math.min(stages.indexOf(activeProject.stage) + 1, 4);
                         updateProject(activeProjectId, { stage: stages[nextIdx] });
                       }}
                       className="flex-1 py-2 bg-neutral-100 dark:bg-zinc-800 rounded-lg text-xs font-bold hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors"
                     >
                       Next Stage
                     </button>
                  </div>
                </div>

                <div className="flex bg-neutral-100 dark:bg-zinc-950 p-1 rounded-xl mb-8">
                  <button
                    onClick={() => setMode('create')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'create' ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}
                  >
                    {t('create_new')}
                  </button>
                  <button
                    onClick={() => setMode('upload')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'upload' ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}
                  >
                    {t('upload_logo')}
                  </button>
                </div>

                <div className="flex-1 space-y-8">
              {mode === 'create' ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-800 dark:text-zinc-300">{t('company_description')}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('company_desc_placeholder')}
                    className="w-full h-32 p-4 text-sm bg-neutral-50 dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all resize-none font-medium placeholder:text-neutral-400"
                  />
                  <button
                    onClick={handleGenerateLogo}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-lead hover:bg-brand-lead/80 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                  >
                    {isGenerating ? <><RefreshCw className="animate-spin w-5 h-5" /> Forging...</> : <><Palette className="w-5 h-5" /> {t('generate_logo')}</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-800 dark:text-zinc-300">1. Upload Logo</label>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-neutral-500 dark:text-zinc-400 transition-colors"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-semibold">Click to select an image</span>
                  </button>
                </div>
              )}

              <div className="space-y-3">
                 <label className="block text-xs font-bold uppercase tracking-widest text-neutral-800 dark:text-zinc-300">Animation Mode</label>
                 <div className="grid grid-cols-2 gap-2">
                   {(Object.keys(ANIMATIONS) as AnimationType[]).map((anim) => (
                     <button
                       key={anim}
                       onClick={() => setActiveAnimation(anim)}
                       className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${activeAnimation === anim ? 'bg-black text-white border-black' : 'bg-white dark:bg-zinc-900 text-neutral-600 dark:text-zinc-400 hover:bg-neutral-50 dark:bg-zinc-900'}`}
                     >
                       <Move size={14} /> {anim}
                     </button>
                   ))}
                 </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium border border-red-200 rounded-xl">{error}</div>}
            </div>

            {activeProject?.logoUrl && (
              <div className="mt-8 pt-8 border-t border-neutral-200 dark:border-zinc-800">
                <button
                  onClick={handleGenerateGuide}
                  disabled={isGeneratingGuide}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-black hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg"
                >
                  {isGeneratingGuide ? <><RefreshCw className="animate-spin w-4 h-4" /> Analyzing...</> : <><BookOpen className="w-4 h-4" /> Generate Brand Guide</>}
                </button>
              </div>
            )}
            </>
          )}
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 bg-neutral-100 dark:bg-zinc-950 relative overflow-hidden flex flex-col border-l border-white/50">
            {activeProject && (
              <>
                {/* Desktop Tabs */}
                <div className="relative z-20 hidden md:flex justify-start md:justify-center pt-6 pb-2 border-b border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-md px-4 overflow-x-auto no-scrollbar scroll-smooth">
                  <div className="flex gap-2 p-1 bg-neutral-200 dark:bg-zinc-800 rounded-full shrink-0">
                    <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><ImageIcon size={14} /> {t('studio_tabs_preview')}</button>
                    <button onClick={() => setActiveTab('precision')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'precision' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><FileText size={14} /> PRECISION</button>
                    <button onClick={() => setActiveTab('mockups')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'mockups' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><Layers size={14} /> MOCKUPS</button>
                    <button onClick={() => setActiveTab('competitor')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'competitor' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><Target size={14} /> COMPETITOR</button>
                    <button onClick={() => setActiveTab('ecosystem')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'ecosystem' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><Globe size={14} /> ECOSYSTEM</button>
                    <button onClick={() => setActiveTab('guide')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'guide' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><BookOpen size={14} /> {t('studio_tabs_guide')}</button>
                    <button onClick={() => setActiveTab('refine')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'refine' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><Sparkles size={14} /> {t('studio_tabs_refine')}</button>
                    <button onClick={() => setActiveTab('sonic')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'sonic' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><Music size={14} /> {t('studio_tabs_sonic')}</button>
                    <button onClick={() => setActiveTab('comments')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'comments' ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}><MessageSquare size={14} /> {t('studio_tabs_collab')}</button>
                  </div>
                  
                  <button onClick={handleExportNotion} className="ml-auto flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0">
                    <Share2 size={14} /> {t('export_notion')}
                  </button>
                </div>

                {/* Mobile Bottom Navigation */}
                <div className="md:hidden absolute bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-neutral-200 dark:border-zinc-800 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                  <div className="flex justify-around items-center p-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('preview')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'preview' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <ImageIcon size={20} />
                      <span className="text-[10px] font-bold">Preview</span>
                    </button>
                    <button onClick={() => setActiveTab('precision')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'precision' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <FileText size={20} />
                      <span className="text-[10px] font-bold">Precision</span>
                    </button>
                    <button onClick={() => setActiveTab('mockups')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'mockups' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <Layers size={20} />
                      <span className="text-[10px] font-bold">Mockups</span>
                    </button>
                    <button onClick={() => setActiveTab('competitor')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'competitor' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <Target size={20} />
                      <span className="text-[10px] font-bold">Rivals</span>
                    </button>
                    <button onClick={() => setActiveTab('ecosystem')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'ecosystem' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <Globe size={20} />
                      <span className="text-[10px] font-bold">Social</span>
                    </button>
                    <button onClick={() => setActiveTab('guide')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'guide' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <BookOpen size={20} />
                      <span className="text-[10px] font-bold">Guide</span>
                    </button>
                    <button onClick={() => setActiveTab('refine')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'refine' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <Sparkles size={20} />
                      <span className="text-[10px] font-bold">Refine</span>
                    </button>
                    <button onClick={() => setActiveTab('sonic')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'sonic' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <Music size={20} />
                      <span className="text-[10px] font-bold">Sonic</span>
                    </button>
                    <button onClick={() => setActiveTab('comments')} className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors ${activeTab === 'comments' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' : 'text-neutral-500 dark:text-zinc-400'}`}>
                      <MessageSquare size={20} />
                      <span className="text-[10px] font-bold">Collab</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="flex-1 relative overflow-y-auto flex pb-24 md:pb-0">
              <div className="absolute inset-0 border-[rgba(0,0,0,0.03)] filter grid pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              
              <AnimatePresence mode="wait">
                {!activeProject ? (
                  <motion.div key="no-project-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm px-6 m-auto h-full">
                    <div className="w-32 h-32 mb-6 rounded-full border-2 border-dashed border-neutral-400 flex items-center justify-center text-neutral-400 bg-white dark:bg-zinc-900/50"><Wand2 size={40} className="opacity-50" /></div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-zinc-300 mb-2">Blank Workspace</h2>
                    <p className="text-neutral-500 dark:text-zinc-400 font-medium">Create or select a brand project workspace on the left sidebar to begin!</p>
                  </motion.div>
                ) : activeTab === 'preview' && !activeProject?.logoUrl ? (
                  <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm px-6 m-auto h-full">
                    <div className="w-32 h-32 mb-6 rounded-full border-2 border-dashed border-neutral-400 flex items-center justify-center text-neutral-400 bg-white dark:bg-zinc-900/50"><Wand2 size={40} className="opacity-50" /></div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-800 dark:text-zinc-300 mb-2">Blank Canvas</h2>
                    <p className="text-neutral-500 dark:text-zinc-400 font-medium">Create/upload a logo on the left sidebar, or switch to the <span className="font-bold text-indigo-600 dark:text-indigo-400">Precision</span> tab above to use vector templates and edit coordinates!</p>
                  </motion.div>
                ) : activeTab === 'preview' ? (
                  <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 flex flex-col items-center justify-center gap-8 m-auto w-full py-4 md:py-12">
                    <motion.div {...currentAnim} className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-white dark:bg-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.1)] border break-words p-4 flex items-center justify-center overflow-hidden border-neutral-200 dark:border-zinc-800">
                      <img src={activeProject.logoUrl} alt="Logo" className="w-full h-full object-contain filter drop-shadow-sm" referrerPolicy="no-referrer" />
                    </motion.div>
                  </motion.div>
                ) : activeTab === 'guide' ? (
                  <motion.div key="guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <div>
                        <h2 className="text-3xl font-display font-bold">Brand Architect</h2>
                        <p className="text-sm text-neutral-500">Comprehensive custom brand identity system.</p>
                      </div>
                      {activeProject.brandGuide && (
                        <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-auto">
                          <button 
                            onClick={handleDownloadBrandGuide}
                            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                          >
                            <Download size={14} />
                            MD
                          </button>
                          <button 
                            onClick={() => {
                              import('./utils/pdfExport').then(({ exportBrandGuidePDF }) => {
                                exportBrandGuidePDF(activeProject);
                                toast('Brand Guide PDF generated.', 'success');
                              }).catch(err => {
                                console.error(err);
                                toast('Failed to generate PDF.', 'error');
                              });
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-lead hover:bg-brand-lead/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                          >
                            <Download size={14} />
                            Download PDF
                          </button>
                          <button 
                            onClick={() => {
                              const guideEl = document.getElementById('brand-guide-content');
                              if (!guideEl) {
                                toast('Brand guide view not found.', 'error');
                                return;
                              }
                              import('html2canvas').then(({ default: html2canvas }) => {
                                toast('Generating image... this may take a moment.', 'success');
                                html2canvas(guideEl, { useCORS: true, backgroundColor: null }).then(canvas => {
                                  const link = document.createElement('a');
                                  link.download = `${activeProject.name}-brand-board.png`;
                                  link.href = canvas.toDataURL('image/png');
                                  link.click();
                                  toast('Image export complete.', 'success');
                                }).catch(err => {
                                  console.error(err);
                                  toast('Failed to generate image.', 'error');
                                });
                              });
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                          >
                            <Download size={14} />
                            Export PNG
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {activeProject.brandGuide ? (
                      <div id="brand-guide-content" className="space-y-12 bg-white dark:bg-zinc-950 p-2 sm:p-6 rounded-2xl">
                        {/* Core Guide */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold mb-4 font-display flex items-center justify-between">
                              <span>Primary Colors</span>
                              <span className="text-[10px] text-neutral-400 font-normal">Click a chip to copy HEX</span>
                            </h3>
                            <div className="space-y-4">
                              {activeProject.brandGuide.primaryColors.map((c, i) => (
                                <button 
                                  key={i} 
                                  onClick={() => handleCopyColor(c.hex)}
                                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-neutral-200 dark:hover:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-950 text-left transition-all cursor-pointer group"
                                  title={`Copy ${c.hex}`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border border-neutral-200 dark:border-zinc-800 shadow-inner group-hover:scale-105 transition-transform" style={{ backgroundColor: c.hex }}></div>
                                    <div>
                                      <p className="font-bold text-neutral-900 dark:text-zinc-100">{c.name}</p>
                                      <p className="text-xs text-neutral-400 mt-0.5">{c.usage}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md transition-all ${copiedColorHex === c.hex ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500'}`}>
                                      {copiedColorHex === c.hex ? 'Copied!' : c.hex}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800 flex flex-col justify-between">
                            <div>
                              <h3 className="text-xl font-bold mb-4 font-display">Typography</h3>
                              <div className="space-y-4">
                                <div className="p-3 bg-neutral-50 dark:bg-zinc-950 rounded-xl">
                                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Primary Font</p>
                                  <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-0.5">{activeProject.brandGuide.typography.primaryFont}</p>
                                </div>
                                <div className="p-3 bg-neutral-50 dark:bg-zinc-950 rounded-xl">
                                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">Secondary Font</p>
                                  <p className="text-xl text-neutral-800 dark:text-zinc-200 mt-0.5">{activeProject.brandGuide.typography.secondaryFont}</p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800/80">
                              <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                                <span className="font-bold block mb-0.5">Pairing Guideline</span>
                                {activeProject.brandGuide.typography.guidelines}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Extended Details */}
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                          <h3 className="text-xl font-bold mb-4 font-display">Voice & Tone</h3>
                          <p className="text-lg mb-4 text-neutral-800 dark:text-zinc-200 leading-relaxed">{activeProject.brandGuide.brandVoice.tone}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {activeProject.brandGuide.brandVoice.keywords.map(kw => (
                              <span key={kw} className="px-3 py-1 bg-brand-lead/10 text-brand-lead rounded-full text-xs font-bold uppercase tracking-wider">{kw}</span>
                            ))}
                          </div>
                          <p className="text-neutral-600 dark:text-zinc-400 text-sm leading-relaxed">{activeProject.brandGuide.brandVoice.description}</p>
                        </div>
                        
                        {activeProject.brandGuide.photography && (
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold mb-4 font-display">Photography & Imagery</h3>
                            <p className="text-neutral-600 dark:text-zinc-400 text-sm leading-relaxed">{activeProject.brandGuide.photography}</p>
                          </div>
                        )}
                        
                        {activeProject.brandGuide.iconography && (
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold mb-4 font-display">Iconography</h3>
                            <p className="text-neutral-600 dark:text-zinc-400 text-sm leading-relaxed">{activeProject.brandGuide.iconography}</p>
                          </div>
                        )}
                        
                        {activeProject.brandGuide.dosAndDonts && activeProject.brandGuide.dosAndDonts.length > 0 && (
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                            <h3 className="text-xl font-bold mb-4 font-display text-red-600 dark:text-red-400">Do's and Don'ts</h3>
                            <ul className="space-y-2.5 text-sm text-neutral-600 dark:text-zinc-400">
                              {activeProject.brandGuide.dosAndDonts.map((rule, idx) => (
                                <li key={idx} className="flex gap-2 items-start">
                                  <span className={`font-bold ${idx % 2 === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {idx % 2 === 0 ? '✓' : '✗'}
                                  </span>
                                  <span>{rule}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-neutral-50 dark:bg-zinc-900/50 p-8 rounded-3xl border border-dashed border-neutral-300 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
                         <Wand2 className="w-8 h-8 text-neutral-400 mb-4" />
                         <h3 className="text-xl font-bold mb-2">No Brand Guide Yet</h3>
                         <p className="text-neutral-500 mb-6 max-w-md">Generate a comprehensive brand guide in the Studio sidebar to unlock color palettes, typography pairings, and voice instructions.</p>
                      </div>
                    )}
                    
                    <DesignChecklist />
                  </motion.div>
                ) : activeTab === 'precision' ? (
                  <motion.div key="precision" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-6xl mx-auto w-full h-full flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h2 className="text-3xl font-display font-bold tracking-tight text-neutral-900 dark:text-white">Precision Studio</h2>
                        <p className="text-sm text-neutral-500">Coordinate mapping, design compliance audits, & live collaboration</p>
                      </div>

                      {/* Web Worker Benchmark Panel */}
                      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-3.5 rounded-2xl">
                        <button
                          onClick={() => worker?.postMessage({ type: 'BENCHMARK_RENDER' })}
                          className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2"
                        >
                          <Terminal size={12} />
                          Benchmark GPU
                        </button>
                        {benchmarkResult && (
                          <div className="text-right font-mono text-[10px]">
                            <span className="text-neutral-400 block uppercase">Thread Latency</span>
                            <span className={`font-bold ${benchmarkResult.frameTimeMs < 16 ? 'text-green-500' : 'text-amber-500'}`}>
                              {benchmarkResult.frameTimeMs}ms ({benchmarkResult.opsPerSec.toLocaleString()} ops/s)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: SVG Canvas Workspace */}
                      <div className="lg:col-span-2 space-y-6">
                        <div 
                          className="relative aspect-square w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-3xl flex items-center justify-center p-12 overflow-hidden shadow-inner cursor-crosshair"
                          onMouseMove={(e) => {
                            if (!socket || socket.readyState !== WebSocket.OPEN) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            socket.send(JSON.stringify({
                              type: 'cursor',
                              username,
                              color: '#6366F1',
                              x,
                              y
                            }));
                          }}
                          onClick={(e) => {
                            if (!isAddingSticky) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                            const y = ((e.clientY - rect.top) / rect.height) * 100;
                            
                            const newNote = {
                              id: Math.random().toString(36).substring(7),
                              text: stickyNoteText || 'Needs path refinement',
                              x,
                              y,
                              color: selectedStickyColor
                            };
                            
                            handleUpdateAndSync({
                              stickyNotes: [...(activeProject.stickyNotes || []), newNote]
                            });
                            setIsAddingSticky(false);
                            setStickyNoteText('');
                          }}
                        >
                          {/* Live Render SVG */}
                          {activeProject.svgSource ? (
                            <div 
                              dangerouslySetInnerHTML={{ __html: sanitizeSVG(activeProject.svgSource) }} 
                              className="w-full h-full max-w-[400px] max-h-[400px] flex items-center justify-center" 
                            />
                          ) : activeProject.logoUrl ? (
                            <img src={activeProject.logoUrl} className="max-w-[320px] max-h-[320px] object-contain" />
                          ) : (
                            <div className="text-center p-6 bg-neutral-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-neutral-200 dark:border-zinc-800">
                              <Wand2 className="w-12 h-12 mx-auto text-neutral-300 dark:text-zinc-700 mb-2 animate-bounce" />
                              <p className="text-xs font-bold text-neutral-500 dark:text-zinc-400">Blank Workspace</p>
                              <p className="text-[10px] text-neutral-400 mt-1">Select a vector shape template below or write custom XML tags.</p>
                            </div>
                          )}

                          {/* Render Live Cursors Overlays */}
                          {Object.entries(remoteCursors).map(([uid, cur]) => {
                            const c = cur as any;
                            return (
                              <div
                                key={uid}
                                className="absolute pointer-events-none transition-all duration-75 z-40"
                                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                              >
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md animate-bounce" style={{ backgroundColor: c.color }} />
                                <span className="text-[9px] text-white px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 block -mt-1 ml-2 shadow" style={{ backgroundColor: c.color }}>
                                  {c.username}
                                </span>
                              </div>
                            );
                          })}

                          {/* Render SVG Anchored Sticky Notes */}
                          {(activeProject.stickyNotes || []).map((note) => (
                            <div
                              key={note.id}
                              className="absolute z-30 group p-2.5 rounded-xl shadow-lg border border-neutral-300 dark:border-neutral-700 max-w-[140px] text-[10px] leading-snug font-bold"
                              style={{ left: `${note.x}%`, top: `${note.y}%`, backgroundColor: note.color, color: '#18181B' }}
                            >
                              <p>{note.text}</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateAndSync({
                                    stickyNotes: (activeProject.stickyNotes || []).filter(n => n.id !== note.id)
                                  });
                                }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] font-bold shadow hover:scale-110 transition-transform cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          {isAddingSticky && (
                            <div className="absolute top-4 left-4 bg-yellow-100 dark:bg-yellow-950/80 border border-yellow-300 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-3.5 py-2 rounded-xl text-xs font-bold animate-pulse z-40">
                              🎯 Click anywhere on the logo canvas to drop your note.
                            </div>
                          )}
                        </div>

                        {/* Automated WCAG compliance grading */}
                        <AccessibilityScore 
                          primaryColors={activeProject.brandGuide?.primaryColors || []} 
                          bgColors={[
                            { hex: '#FFFFFF', name: 'Standard Light' },
                            { hex: '#09090B', name: 'Operating System Dark' }
                          ]} 
                        />

                        {/* Interactive Template Auto-Populator */}
                        <TemplateLibrary 
                          onSelectTemplate={(svg, guide) => handleUpdateAndSync({ svgSource: svg, brandGuide: guide })} 
                        />
                      </div>

                      {/* Right: Manual XML Code & SVG Node Coordinate Editor */}
                      <div className="space-y-6">
                        {/* Vector Node Path coordinate editor */}
                        <SVGPathEditor 
                          svgContent={activeProject.svgSource || ''} 
                          onChange={(newSvg) => handleUpdateAndSync({ svgSource: newSvg })} 
                        />

                        {/* Raw SVG XML input editor */}
                        <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
                          <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Manual XML Buffer</h3>
                            <p className="text-[10px] text-neutral-500">Edit XML nodes directly to override coordinates</p>
                          </div>
                          
                          <textarea
                            className="w-full h-44 bg-zinc-950 text-emerald-400 font-mono text-[10px] p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none border border-zinc-800 leading-normal"
                            value={activeProject.svgSource || ''}
                            onChange={(e) => handleUpdateAndSync({ svgSource: e.target.value })}
                            placeholder="<svg viewBox='0 0 100 100'>...</svg>"
                          />
                        </div>

                        {/* Add Sticky Note annotation form */}
                        <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
                          <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Sticky Comments Editor</h3>
                            <p className="text-[10px] text-neutral-500">Annotate modifications directly onto the canvas</p>
                          </div>

                          <div className="space-y-3">
                            <input
                              type="text"
                              value={stickyNoteText}
                              onChange={(e) => setStickyNoteText(e.target.value)}
                              placeholder="e.g., Round off top corner bevel"
                              className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />

                            <div className="flex items-center justify-between gap-2.5">
                              <div className="flex gap-2">
                                {['#FDE047', '#FDA4AF', '#86EFAC', '#93C5FD'].map((hex) => (
                                  <button
                                    key={hex}
                                    onClick={() => setSelectedStickyColor(hex)}
                                    className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${selectedStickyColor === hex ? 'scale-125 border-neutral-800 dark:border-white ring-2 ring-indigo-500/20' : 'border-transparent'}`}
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </div>

                              <button
                                onClick={() => setIsAddingSticky(true)}
                                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                Place note
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Snapshots Sidebar */}
                        <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Version Snapshots</h3>
                              <p className="text-[10px] text-neutral-500">Instant coordinate state recovery points</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSnapshotName}
                              onChange={(e) => setNewSnapshotName(e.target.value)}
                              placeholder="Snapshot name (e.g., Draft V1)"
                              className="flex-1 bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                if (!activeProject) return;
                                const nextSnap = {
                                  id: Math.random().toString(36).substring(7),
                                  name: newSnapshotName || `Version ${new Date().toLocaleTimeString()}`,
                                  timestamp: Date.now(),
                                  svgSource: activeProject.svgSource || '',
                                  logoUrl: activeProject.logoUrl || ''
                                };
                                handleUpdateAndSync({
                                  snapshots: [...(activeProject.snapshots || []), nextSnap]
                                });
                                setNewSnapshotName('');
                              }}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-44 overflow-y-auto">
                            {(activeProject.snapshots || []).length === 0 ? (
                              <p className="text-[10px] text-neutral-400">No versions saved yet.</p>
                            ) : (
                              (activeProject.snapshots || []).map((snap) => (
                                <div key={snap.id} className="flex justify-between items-center p-2.5 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-100 dark:border-zinc-900">
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-neutral-800 dark:text-zinc-200 block truncate">{snap.name}</span>
                                    <span className="text-[9px] text-neutral-400 font-mono block">{new Date(snap.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <button
                                    onClick={() => handleUpdateAndSync({
                                      svgSource: snap.svgSource,
                                      logoUrl: snap.logoUrl
                                    })}
                                    className="px-2.5 py-1 bg-white dark:bg-zinc-900 hover:bg-neutral-100 border border-neutral-200 dark:border-zinc-800 rounded-lg text-[9px] font-bold uppercase transition-colors cursor-pointer"
                                  >
                                    Restore
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'mockups' ? (
                  <motion.div key="mockups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h2 className="text-3xl font-display font-bold">Real-World Context</h2>
                        <p className="text-sm text-neutral-500">Preview your brand identity in high-end mockups and physical materials.</p>
                      </div>
                      
                      <div className="flex bg-neutral-200 dark:bg-zinc-800 p-1 rounded-xl self-start sm:self-auto">
                        <button
                          onClick={() => setMockupTab('templates')}
                          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${mockupTab === 'templates' ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}
                        >
                          Built-in Studio
                        </button>
                        <button
                          onClick={() => setMockupTab('uploaded')}
                          className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${mockupTab === 'uploaded' ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'}`}
                        >
                          Uploaded Mockups
                        </button>
                      </div>
                    </div>

                    {mockupTab === 'templates' ? (
                      <div className="space-y-8">
                        {/* Selector for default templates */}
                        <div className="flex gap-2">
                          {[
                            { id: 'card', name: 'Luxury Business Card 💳' },
                            { id: 'splash', name: 'Mobile App Splash Screen 📱' },
                            { id: 'billboard', name: 'Urban Billboard 🏢' }
                          ].map(t => (
                            <button
                              key={t.id}
                              onClick={() => setSelectedTemplate(t.id as any)}
                              className={`px-4 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${selectedTemplate === t.id ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm' : 'bg-white dark:bg-zinc-900 text-neutral-600 dark:text-zinc-400 border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50'}`}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>

                        {/* Interactive Template Viewer */}
                        {selectedTemplate === 'card' && (
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800 space-y-6">
                            <div className="flex justify-between items-center">
                              <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500">Business Card Customizer</h3>
                              <div className="flex gap-2">
                                {[
                                  { id: 'cream', name: 'Cream Linen', bg: 'bg-[#FDFBF7] text-[#3c362d]' },
                                  { id: 'charcoal', name: 'Noir Matte', bg: 'bg-[#121212] text-[#f7f7f7]' },
                                  { id: 'forest', name: 'Forest Velvet', bg: 'bg-[#182a20] text-[#eae2cf]' }
                                ].map(preset => (
                                  <button
                                    key={preset.id}
                                    onClick={() => setCardBg(preset.id as any)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${cardBg === preset.id ? 'border-brand-lead ring-2 ring-brand-lead/20' : 'border-neutral-200 dark:border-zinc-800 hover:bg-neutral-100'}`}
                                  >
                                    {preset.name}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-center p-12 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-100 dark:border-zinc-800/50" style={{ perspective: '1200px' }}>
                              <div 
                                style={{ transform: 'rotateX(15deg) rotateY(-20deg) rotateZ(5deg)' }}
                                className={`w-full max-w-md aspect-[1.75/1] rounded-2xl shadow-2xl border border-neutral-200/40 p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden hover:rotate-0 hover:scale-105 ${
                                  cardBg === 'cream' ? 'bg-[#FDFBF7] text-[#3c362d] border-[#ebe3d5]' :
                                  cardBg === 'charcoal' ? 'bg-[#161617] text-[#eaeaea] border-[#2c2c2d]' :
                                  'bg-[#1a2c22] text-[#efe8db] border-[#294234]'
                                }`}
                              >
                                {/* Textured effect */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
                                
                                <div className="flex justify-between items-start z-10">
                                  <div className="w-14 h-14 bg-white/10 rounded-xl p-1.5 flex items-center justify-center backdrop-blur-sm border border-white/20">
                                    <img src={activeProject.logoUrl!} alt="logo" className="max-w-full max-h-full object-contain filter drop-shadow-md" />
                                  </div>
                                  <div className="text-right">
                                    <h4 className="font-bold text-base tracking-tight">{activeProject.brandGuide?.brandName || activeProject.name}</h4>
                                    <p className="text-[9px] uppercase tracking-widest opacity-80 mt-0.5">Est. {new Date(activeProject.createdAt).getFullYear()}</p>
                                  </div>
                                </div>

                                <div className="z-10 flex justify-between items-end border-t border-current/10 pt-4">
                                  <div>
                                    <p className="font-bold text-xs">Alex Rivers</p>
                                    <p className="text-[9px] uppercase tracking-wider opacity-75 mt-0.5">Brand Director</p>
                                  </div>
                                  <div className="text-right text-[9px] font-mono opacity-80 leading-relaxed">
                                    <p>hello@{(activeProject.brandGuide?.brandName || 'studio').toLowerCase().replace(/\s+/g, '')}.com</p>
                                    <p>+1 (555) 902-1810</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedTemplate === 'splash' && (
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800 space-y-6">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500">Mobile Launch Experience</h3>
                            
                            <div className="flex items-center justify-center p-12 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-100 dark:border-zinc-800/50" style={{ perspective: '1200px' }}>
                              <div 
                                style={{ transform: 'rotateX(5deg) rotateY(15deg) rotateZ(-2deg)' }}
                                className="w-64 aspect-[9/19] bg-[#0c0c0e] rounded-[36px] shadow-2xl border-[6px] border-[#27272a] p-4 flex flex-col justify-between relative overflow-hidden text-white transition-all duration-300 hover:rotate-0 hover:scale-105"
                              >
                                {/* Ambient screen glow */}
                                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand-lead/20 rounded-full blur-3xl pointer-events-none"></div>
                                
                                {/* Phone Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#27272a] rounded-b-2xl z-20 flex items-center justify-center">
                                  <div className="w-3 h-3 bg-zinc-900 rounded-full mr-2"></div>
                                  <div className="w-8 h-1 bg-zinc-800 rounded-full"></div>
                                </div>

                                {/* Phone Status Bar */}
                                <div className="flex justify-between items-center text-[10px] font-mono px-3 pt-2 z-10 opacity-80">
                                  <span>09:41</span>
                                  <div className="flex items-center gap-1.5">
                                    <span>LTE</span>
                                    <div className="w-4 h-2.5 border border-white/80 rounded-sm p-0.5 flex items-center"><div className="w-full h-full bg-white rounded-xs"></div></div>
                                  </div>
                                </div>

                                {/* Central Brand Visual */}
                                <div className="flex flex-col items-center justify-center flex-1 gap-4 z-10 mt-12">
                                  <motion.div 
                                    animate={{ y: [0, -6, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-24 h-24 bg-white rounded-full p-4 flex items-center justify-center shadow-lg border border-white/10"
                                  >
                                    <img src={activeProject.logoUrl!} alt="logo" className="w-full h-full object-contain" />
                                  </motion.div>
                                  <div className="text-center">
                                    <h4 className="font-bold text-lg font-display tracking-tight text-white">{activeProject.brandGuide?.brandName || activeProject.name}</h4>
                                    <p className="text-[10px] text-zinc-500 font-sans tracking-wide mt-1">Design Studio Forge</p>
                                  </div>
                                </div>

                                {/* Loading Bottom Indicators */}
                                <div className="flex flex-col items-center gap-4 z-10 pb-2">
                                  <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-brand-lead rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-brand-lead rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-1.5 h-1.5 bg-brand-lead rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                  </div>
                                  <div className="w-24 h-1 bg-zinc-800 rounded-full"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedTemplate === 'billboard' && (
                          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800 space-y-6">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-500">Urban Architectural Signage</h3>
                            
                            <div className="flex items-center justify-center p-12 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-100 dark:border-zinc-800/50" style={{ perspective: '1200px' }}>
                              <div 
                                style={{ transform: 'rotateX(5deg) rotateY(-10deg) rotateZ(0deg)' }}
                                className="w-full max-w-lg aspect-[16/9] bg-[#141517] rounded-2xl shadow-2xl relative overflow-hidden border border-zinc-800 p-8 flex flex-col justify-between text-white transition-all duration-300 hover:rotate-0 hover:scale-105"
                              >
                                {/* Grid texture background */}
                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                                
                                <div className="flex justify-between items-start z-10">
                                  <div className="p-3 border-l-2 border-brand-lead">
                                    <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Studio Showcase</span>
                                    <h4 className="text-lg font-bold font-display tracking-wide mt-0.5">{activeProject.brandGuide?.brandName || activeProject.name}</h4>
                                  </div>
                                  <span className="text-[9px] bg-zinc-800 text-zinc-400 font-mono px-2 py-1 rounded border border-zinc-700">BILLBOARD ID #812</span>
                                </div>

                                <div className="flex justify-center items-center flex-1 z-10 py-4">
                                  <div className="w-28 h-28 bg-[#18191c] rounded-2xl border border-zinc-800/80 p-4 flex items-center justify-center shadow-2xl shadow-indigo-500/10 relative group">
                                    {/* Neon halo glow */}
                                    <div className="absolute inset-0 rounded-2xl bg-brand-lead/20 blur-xl opacity-80 pointer-events-none"></div>
                                    <img src={activeProject.logoUrl!} alt="logo" className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(99,102,241,0.5)] z-10" />
                                  </div>
                                </div>

                                <div className="flex justify-between items-end z-10 text-[9px] text-zinc-500 font-medium">
                                  <p>BRUTALIST ARCHITECTURE DISTRICT</p>
                                  <p>© FORGEL OUTDOOR MEDIA</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeProject.mockups?.map(mockup => (
                          <div key={mockup.id} className="relative h-64 bg-neutral-200 dark:bg-zinc-800 rounded-3xl overflow-hidden group">
                            <img src={mockup.base64Data} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center p-8 opacity-90 hover:opacity-100 transition-opacity pointer-events-none">
                              {activeProject.svgSource ? (
                                <div dangerouslySetInnerHTML={{ __html: sanitizeSVG(activeProject.svgSource) }} className="w-1/2 h-1/2 object-contain filter drop-shadow-lg" />
                              ) : (
                                 <img src={activeProject.logoUrl!} className="w-1/2 h-1/2 object-contain filter drop-shadow-lg" />
                              )}
                            </div>
                            <button onClick={() => {
                              updateProject(activeProject.id, { mockups: activeProject.mockups.filter(m => m.id !== mockup.id) });
                            }} className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        <label className="h-64 border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center gap-4 text-neutral-500 hover:border-brand-lead hover:text-brand-lead transition-colors bg-white dark:bg-zinc-900 cursor-pointer text-center px-4">
                          <input type="file" className="hidden" accept="image/*,.psd,.svg,.ai,.fig" onChange={handleMockupUpload} />
                          <Upload size={32} />
                          <span className="font-bold uppercase tracking-wider text-xs">Upload Mockup</span>
                          <span className="text-[10px] opacity-70">JPEG, PNG, SVG<br/>(PSD/FIG visual placeholder)</span>
                        </label>
                      </div>
                                        )}
                  </motion.div>
                ) : activeTab === 'competitor' ? (
                  <motion.div key="competitor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">
                    <div className="flex flex-col mb-8">
                      <h2 className="text-3xl font-display font-bold">Rival Intelligence</h2>
                      <p className="text-sm text-neutral-500">Analyze competitor branding and find strategic white space.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-sm">
                          <h3 className="font-bold mb-4">Competitor Details</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-2">Competitor Name</label>
                              <input type="text" value={competitorNameInput} onChange={(e) => setCompetitorNameInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-zinc-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-lead" placeholder="e.g. Stripe, Apple, Nike" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-2">Competitor Logo URL (Optional)</label>
                              <input type="text" value={competitorLogoUrlInput || ''} onChange={(e) => setCompetitorLogoUrlInput(e.target.value)} className="w-full bg-neutral-100 dark:bg-zinc-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-lead" placeholder="https://..." />
                            </div>
                            <button onClick={handleAnalyzeCompetitor} disabled={isAnalyzingCompetitor || !competitorNameInput} className="w-full bg-brand-lead hover:bg-brand-lead/90 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                              {isAnalyzingCompetitor ? <RefreshCw className="animate-spin" size={18} /> : <Target size={18} />}
                              Analyze Competitor
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {activeProject.competitorAnalysis ? (
                          <div className="bg-neutral-900 text-white p-6 rounded-3xl shadow-sm border border-neutral-800 prose prose-invert max-w-none">
                            <h3 className="text-xl font-display font-bold mb-4 text-brand-growth">Strategic Analysis</h3>
                            <div className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">
                              {activeProject.competitorAnalysis}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                            <Target size={48} className="mb-4 opacity-50" />
                            <p className="font-bold mb-2">No Analysis Yet</p>
                            <p className="text-sm opacity-80">Enter competitor details to generate a strategic brand comparison.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'ecosystem' ? (
                  <motion.div key="ecosystem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">
                    <div className="flex flex-col mb-8">
                      <h2 className="text-3xl font-display font-bold">Ecosystem Automation</h2>
                      <p className="text-sm text-neutral-500">Generate on-brand assets using your tailored Brand Guide.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="col-span-1 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-sm">
                          <h3 className="font-bold mb-4">Create Asset</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider mb-2">Asset Type</label>
                              <select value={ecosystemAssetType} onChange={(e) => setEcosystemAssetType(e.target.value)} className="w-full bg-neutral-100 dark:bg-zinc-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-brand-lead">
                                <option value="Instagram Post Caption">Instagram Post</option>
                                <option value="Twitter Thread Hook">Twitter Thread Hook</option>
                                <option value="LinkedIn Post">LinkedIn Post</option>
                                <option value="Email Newsletter Intro">Newsletter Intro</option>
                                <option value="Website Hero Copy">Website Hero Copy</option>
                              </select>
                            </div>
                            <button onClick={handleGenerateEcosystem} disabled={isGeneratingEcosystem} className="w-full bg-brand-lead hover:bg-brand-lead/90 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                              {isGeneratingEcosystem ? <RefreshCw className="animate-spin" size={18} /> : <Wand2 size={18} />}
                              Generate Asset
                            </button>
                            {!activeProject.brandGuide && (
                              <p className="text-[10px] text-red-500 font-bold mt-2 text-center">Requires a generated Brand Guide.</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-4">
                        {activeProject.ecosystemAssets && activeProject.ecosystemAssets.length > 0 ? (
                          activeProject.ecosystemAssets.map((asset, i) => (
                            <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm relative group">
                              <span className="inline-block px-2 py-1 bg-neutral-100 dark:bg-zinc-800 rounded text-[10px] font-bold uppercase tracking-wider mb-3 text-brand-lead">{asset.type}</span>
                              <div className="whitespace-pre-wrap text-sm">{asset.content}</div>
                              <button onClick={() => { navigator.clipboard.writeText(asset.content); toast('Copied to clipboard', 'success'); }} className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Copy size={14} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="h-full border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                            <Globe size={48} className="mb-4 opacity-50" />
                            <p className="font-bold mb-2">No Ecosystem Assets</p>
                            <p className="text-sm opacity-80">Generate your first on-brand asset using the panel on the left.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'refine' ? (

                  <motion.div key="refine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                      <h2 className="text-3xl font-bold">AI Refinement Studio</h2>
                      {activeProject.refinementSuggestions && (
                         <button onClick={applyRefinedPrompt} className="bg-brand-lead hover:bg-brand-lead/80 text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                           <Wand2 size={16} /> Apply Suggestions & Regenerate Logo
                         </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Left: Uploads */}
                      <div className="col-span-1 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                          <h3 className="font-bold mb-4">Context Files</h3>
                          <div className="space-y-3 mb-4">
                            {activeProject.refinementFiles.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm bg-neutral-50 dark:bg-zinc-900 p-2 rounded-lg border border-neutral-100">
                                <FileText size={14} className="text-neutral-400" /> <span className="truncate">{f.name}</span>
                              </div>
                            ))}
                          </div>
                          
                          <input type="file" ref={refineInputRef} className="hidden" onChange={handleRefineUpload} accept=".pdf,.txt,.md,image/*" />
                          <button
                            onClick={() => refineInputRef.current?.click()}
                            disabled={isRefining}
                            className="w-full py-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-xl bg-neutral-50 dark:bg-zinc-900 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 text-neutral-500 dark:text-zinc-400 transition-colors disabled:opacity-50"
                          >
                            {isRefining ? <RefreshCw className="animate-spin" /> : <Upload />}
                            <span className="font-semibold text-xs uppercase tracking-wider">Upload Instructions</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Right: AI Suggestions */}
                      <div className="col-span-2">
                         {!activeProject.refinementSuggestions ? (
                           <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 text-indigo-900 flex flex-col items-center justify-center text-center h-full">
                             <Sparkles className="w-12 h-12 mb-4 text-indigo-400" />
                             <h3 className="text-xl font-bold mb-2">Awaiting Context</h3>
                             <p className="text-indigo-700">Upload a PDF brand strategy, markdown instructions, or an inspirational image to receive AI suggestions for refining your logo.</p>
                           </div>
                         ) : (
                           <div className="space-y-6">
                             {/* Layout Improvements */}
                             <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                               <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Move size={18} className="text-indigo-600" /> Layout & Structure</h3>
                               <ul className="space-y-2">
                                 {activeProject.refinementSuggestions.layoutImprovements.map((item, i) => (
                                   <li key={i} className="flex gap-3 text-neutral-700 text-sm"><span className="text-indigo-600 font-bold">•</span> {item}</li>
                                 ))}
                               </ul>
                             </div>
                             
                             {/* Vector Adjustments */}
                             <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                               <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Palette size={18} className="text-purple-600" /> Vector Adjustments</h3>
                               <ul className="space-y-2">
                                 {activeProject.refinementSuggestions.vectorAdjustments.map((item, i) => (
                                   <li key={i} className="flex gap-3 text-neutral-700 text-sm"><span className="text-purple-600 font-bold">•</span> {item}</li>
                                 ))}
                               </ul>
                             </div>

                             {/* Color Alternatives */}
                             <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                               <h3 className="text-lg font-bold mb-4">Color Alternatives</h3>
                               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                 {activeProject.refinementSuggestions.colorAlternatives.map((c, i) => (
                                   <div key={i} className="flex items-center gap-3 bg-neutral-50 dark:bg-zinc-900 p-2 rounded-xl">
                                     <div className="w-8 h-8 rounded-full border border-neutral-200 dark:border-zinc-800 shadow-inner" style={{ backgroundColor: c.hex }}></div>
                                     <div className="text-xs">
                                       <p className="font-bold">{c.name}</p>
                                       <p className="text-neutral-500 dark:text-zinc-400 font-mono">{c.hex}</p>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           </div>
                         )}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'sonic' ? (
                  <motion.div key="sonic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-4xl mx-auto w-full">
                    <h2 className="text-3xl font-bold mb-6">Organic Sonic Branding</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Uploads */}
                      <div className="col-span-1 space-y-6">
                        <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800">
                          <p className="text-neutral-600 dark:text-zinc-400 mb-6 text-sm">Upload environmental or animal sounds. Instruments are strictly prohibited. The AI will mix these organic sounds into a cohesive auditory identity.</p>
                          
                          <div className="space-y-4 mb-6">
                            {activeProject.sonicAssets.map((asset, i) => (
                              <CustomWaveformPlayer key={i} base64Data={asset.base64Data} name={asset.name} />
                            ))}
                          </div>

                          <input type="file" ref={sonicInputRef} className="hidden" onChange={handleSonicUpload} accept="audio/*" />
                          <button
                            onClick={() => sonicInputRef.current?.click()}
                            disabled={isGeneratingSonic}
                            className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-xl bg-neutral-50 dark:bg-zinc-900 hover:bg-indigo-50 hover:border-indigo-300 text-neutral-500 dark:text-zinc-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                          >
                            {isGeneratingSonic ? <RefreshCw className="animate-spin w-8 h-8" /> : <Music className="w-8 h-8" />}
                            <span className="font-semibold text-sm">Upload organic sound</span>
                          </button>
                        </div>
                      </div>

                      {/* Right: Sonic Philosophy */}
                      <div className="col-span-1">
                        {!activeProject.sonicPhilosophy ? (
                          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 text-indigo-900 flex flex-col items-center justify-center text-center h-full">
                            <Music className="w-12 h-12 mb-4 text-indigo-400" />
                            <h3 className="text-xl font-bold mb-2">Sonic Philosophy</h3>
                            <p className="text-indigo-700">Upload organic sounds to generate the brand's auditory philosophy.</p>
                          </div>
                        ) : (
                          <div className="bg-neutral-900 text-neutral-100 p-8 rounded-3xl shadow-xl h-full flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                              <Music className="w-48 h-48" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest relative z-10 border-b border-neutral-800 pb-4">Sonic Philosophy</h3>
                            <div className="prose prose-invert prose-sm relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                              <p className="whitespace-pre-wrap leading-relaxed text-neutral-300 font-serif">
                                {activeProject.sonicPhilosophy}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'comments' ? (
                  <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-4 md:p-12 pb-24 md:pb-12 max-w-3xl mx-auto w-full flex flex-col h-full">
                    <h2 className="text-3xl font-bold mb-2 shrink-0">Collaboration & Comments</h2>
                    <p className="text-sm text-neutral-500 mb-6 shrink-0">Engage in dialogue or request specialized critique from the Forgel AI Creative Panel.</p>
                    
                    {/* AI Critic Panel */}
                    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm mb-6 shrink-0 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✨</span>
                        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-700 dark:text-zinc-300">Forgel AI Advisory Panel</h3>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                          <label className="text-xs text-neutral-400 block">Select AI Creative Specialist</label>
                          <select 
                            value={criticRole}
                            onChange={(e) => setCriticRole(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                          >
                            <option value="Senior Art Director 🎨">Senior Art Director 🎨 (Visual Balance & Metaphor)</option>
                            <option value="Typography Specialist ✍️">Typography Specialist ✍️ (Legibility & Pairings)</option>
                            <option value="Color Specialist 💧">Color Specialist 💧 (Palette Harmony & Vibe)</option>
                          </select>
                        </div>
                        <button 
                          onClick={handleRequestAICritic}
                          disabled={isCriticLoading}
                          className="px-6 py-2.5 bg-brand-lead hover:bg-brand-lead/95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isCriticLoading ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                          {isCriticLoading ? 'Reviewing...' : 'Request Feedback'}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800 flex flex-col overflow-hidden h-[450px]">
                      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50 dark:bg-zinc-900">
                        {activeProject.comments.length === 0 && !isCriticLoading ? (
                          <div className="text-center text-neutral-400 py-16 flex flex-col items-center justify-center h-full">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                            <p className="font-medium">No comments yet.</p>
                            <p className="text-sm">Start the conversation below.</p>
                          </div>
                        ) : (
                          <>
                            {activeProject.comments.map(c => (
                              <div key={c.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-neutral-100 flex gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-sm ${c.author.includes('AI') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200' : 'bg-neutral-100 text-neutral-700 dark:bg-zinc-800 dark:text-zinc-200'}`}>
                                  {c.author.includes('AI') ? '🤖' : c.author.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between gap-2 mb-1">
                                    <span className="font-bold text-sm text-neutral-900 dark:text-zinc-100">{c.author}</span>
                                    <span className="text-[10px] text-neutral-400 shrink-0">{new Date(c.timestamp).toLocaleString()}</span>
                                  </div>
                                  <p className="text-neutral-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{c.text}</p>
                                </div>
                              </div>
                            ))}
                            {isCriticLoading && (
                              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-neutral-100 flex gap-4 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                  <span>🤖</span>
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-neutral-200 dark:bg-zinc-800 rounded w-1/4"></div>
                                  <div className="h-3 bg-neutral-100 dark:bg-zinc-800 rounded w-3/4"></div>
                                  <div className="h-3 bg-neutral-100 dark:bg-zinc-800 rounded w-1/2"></div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-neutral-200 dark:border-zinc-800 flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && commentText.trim() && activeProjectId) {
                              updateProject(activeProjectId, {
                                comments: [...activeProject.comments, {
                                  id: Math.random().toString(36).substring(7),
                                  author: 'You',
                                  text: commentText.trim(),
                                  timestamp: Date.now()
                                }]
                              });
                              setCommentText('');
                            }
                          }}
                          placeholder="Add a comment... (Press Enter to send)"
                          className="flex-1 bg-neutral-100 dark:bg-zinc-950 border-none rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => {
                            if (commentText.trim() && activeProjectId) {
                              updateProject(activeProjectId, {
                                comments: [...activeProject.comments, {
                                  id: Math.random().toString(36).substring(7),
                                  author: 'You',
                                  text: commentText.trim(),
                                  timestamp: Date.now()
                                }]
                              });
                              setCommentText('');
                            }
                          }}
                          className="px-5 py-3 bg-brand-lead text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-brand-lead/90 transition-all cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      ) : view === 'course' ? (
        <div className="flex-1 p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-brand-lead/10 text-brand-lead rounded-2xl">
                <GraduationCap size={28} />
              </div>
              <div>
                <h1 className="text-4xl font-display font-bold tracking-tight">Beginex Design Academy</h1>
                <p className="text-neutral-500 mt-0.5">Confidently master shape grammar, typography pairs, brand vibes, and expert prompting.</p>
              </div>
            </div>

            <div className="space-y-6 mt-8">
              {[
                { 
                  id: 0,
                  title: '1. The Psychology of Shapes', 
                  desc: 'Why do round logos feel friendly and sharp logos feel aggressive?', 
                  completed: completedModules[0],
                  content: (
                    <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                      <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                        Shapes create immediate subconscious reactions. **Rounded, organic paths** imply inclusion, softness, and empathy (friendly/natural). **Angular, sharp geometries** imply speed, precision, power, and engineering (high-performance/tech).
                      </p>
                      
                      <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive Shape Playground</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setModuleShape('round')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleShape === 'round' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                            >
                              Friendly Round
                            </button>
                            <button 
                              onClick={() => setModuleShape('sharp')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleShape === 'sharp' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                            >
                              Precise Sharp
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-center justify-center py-8 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50">
                          <div 
                            className={`transition-all duration-500 flex items-center justify-center p-6 ${
                              moduleShape === 'round' 
                                ? 'w-32 h-32 rounded-full bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 shadow-lg shadow-teal-500/10' 
                                : 'w-32 h-32 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 [clip-path:polygon(50%_0%,_0%_100%,_100%_100%)] shadow-none translate-y-1'
                            }`}
                          >
                            <span className="font-display font-black text-sm tracking-widest text-center uppercase">
                              {moduleShape === 'round' ? 'Gentle' : 'Velocity'}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-neutral-400 mt-6 text-center">
                            {moduleShape === 'round' 
                              ? 'Structure: Soft boundaries, Teal spectrum, Friendly sans-serif.' 
                              : 'Structure: High-contrast vertices, Purple spectrum, Aggressive display.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 1,
                  title: '2. Color Theory in Branding', 
                  desc: 'Understanding the Srvel Triad: Serve (Turquoise), Grow (Yellow), Lead (Purple).', 
                  completed: completedModules[1],
                  content: (
                    <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                      <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                        Colors are emotional signals. We categorize our custom brand guides using the **Srvel Triad**:
                        <br />- **Serve**: Turquoise/Teal. Evokes security, service, health, trust, and cleanliness.
                        <br />- **Grow**: Amber/Yellow. Evokes optimism, development, organic success, warmth, and discovery.
                        <br />- **Lead**: Royal Purple. Evokes excellence, luxury, leadership, innovation, and futuristic technology.
                      </p>

                      <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive Palette Vibe Tester</span>
                          <div className="flex gap-2">
                            {['serve', 'grow', 'lead'].map(triad => (
                              <button
                                key={triad}
                                onClick={() => setModuleColorTriad(triad as any)}
                                className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${moduleColorTriad === triad ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                              >
                                {triad}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50">
                          {[
                            { 
                              id: 'serve', name: 'Turquoise / Mint', hex: '#0ea5e9', desc: 'Secure Trust',
                              activeBg: 'bg-sky-500 text-white', inactiveBg: 'bg-sky-50 dark:bg-zinc-950 text-sky-600'
                            },
                            { 
                              id: 'grow', name: 'Yellow / Gold', hex: '#eab308', desc: 'Warm Optimism',
                              activeBg: 'bg-yellow-500 text-black', inactiveBg: 'bg-yellow-50 dark:bg-zinc-950 text-yellow-600'
                            },
                            { 
                              id: 'lead', name: 'Purple / Violet', hex: '#8b5cf6', desc: 'Noble Innovation',
                              activeBg: 'bg-purple-500 text-white', inactiveBg: 'bg-purple-50 dark:bg-zinc-950 text-purple-600'
                            }
                          ].map(chip => (
                            <div 
                              key={chip.id} 
                              className={`p-4 rounded-xl flex flex-col justify-between h-28 border transition-all ${
                                moduleColorTriad === chip.id 
                                  ? `${chip.activeBg} border-transparent scale-105 shadow-md` 
                                  : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-100 dark:border-zinc-900 text-neutral-400'
                              }`}
                            >
                              <span className="text-[10px] font-mono font-bold tracking-wider uppercase">{chip.desc}</span>
                              <div>
                                <p className="font-bold text-sm tracking-tight">{chip.name}</p>
                                <p className="text-[10px] font-mono mt-0.5 opacity-80">{chip.hex}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 2,
                  title: '3. Typography Pairings', 
                  desc: 'Why we pair geometric sans-serifs with humanist displays.', 
                  completed: completedModules[2],
                  content: (
                    <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                      <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                        Typography handles the verbal storytelling. A heavy, geometric display font establishes presence, while a high-legibility geometric sans-serif or mono subtitle guarantees easy communication across tiny displays or physical goods.
                      </p>

                      <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive Typography Pairer</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setModuleTypographyStyle('tech')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleTypographyStyle === 'tech' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                            >
                              Modern Tech Mono
                            </button>
                            <button
                              onClick={() => setModuleTypographyStyle('serif')}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${moduleTypographyStyle === 'serif' ? 'bg-brand-lead text-white' : 'bg-white dark:bg-zinc-900 text-neutral-500 border border-neutral-200 dark:border-zinc-800'}`}
                            >
                              Editorial Luxury Serif
                            </button>
                          </div>
                        </div>

                        <div className="p-8 bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50 text-center space-y-3">
                          <div className="transition-all duration-300">
                            {moduleTypographyStyle === 'tech' ? (
                              <div className="space-y-2">
                                <h4 className="text-3xl font-mono tracking-tight font-black uppercase text-zinc-900 dark:text-white">VERTEX.IO</h4>
                                <p className="text-xs font-mono tracking-widest text-indigo-600 uppercase">HIGH-FREQUENCY AGENTIC FORGE</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <h4 className="text-3xl font-serif tracking-normal font-bold italic text-zinc-900 dark:text-white">Vértex Studio</h4>
                                <p className="text-[10px] tracking-[0.2em] font-sans font-medium text-neutral-500 uppercase">FINE ART ARCHITECTURE & CURATION</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 3,
                  title: '4. The AI Prompting Framework', 
                  desc: 'How to write a brand brief that the Forge understands perfectly.', 
                  completed: completedModules[3],
                  content: (
                    <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                      <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                        To get elite vector results from generative models, do not just say "make a logo." Standardize your structure using three building blocks: **Core Metaphor**, **Visual Treatment**, and **Negative Space/Boundary Constraints**.
                      </p>

                      <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider mb-1">1. Market Sector</label>
                            <select 
                              value={promptSector} 
                              onChange={(e) => setPromptSector(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-medium cursor-pointer"
                            >
                              <option value="Wellness 🌿">Wellness & Spa 🌿</option>
                              <option value="Cybertech 🤖">Artificial Intelligence 🤖</option>
                              <option value="Specialty Coffee ☕">Specialty Coffee ☕</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider mb-1">2. Brand Energy</label>
                            <select 
                              value={promptTone} 
                              onChange={(e) => setPromptTone(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-medium cursor-pointer"
                            >
                              <option value="Organic & Minimalist 🌸">Organic & Minimalist 🌸</option>
                              <option value="Futuristic Cyberpunk ⚡">Brutalist & Cyberpunk ⚡</option>
                              <option value="Editorial Classic 🏛️">Editorial Classic 🏛️</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-neutral-400 block uppercase font-bold tracking-wider mb-1">3. Core Metaphor</label>
                            <input 
                              type="text" 
                              value={promptSubject} 
                              onChange={(e) => setPromptSubject(e.target.value)}
                              className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-lg p-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-lead"
                              placeholder="e.g. Lotus blossom"
                            />
                          </div>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 space-y-2 relative">
                          <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-bold">Constructed Brand Brief</span>
                          <p className="text-xs font-mono text-neutral-800 dark:text-zinc-200 leading-relaxed pr-16">
                            "A masterfully forged logo for a {promptSector} startup. Style is {promptTone}. Incorporating a clean, isolated vector mark of a {promptSubject}. Rendered on an absolute pure white background, flat vector paths, perfect visual balance, vector aesthetic, high contrast."
                          </p>
                          <button 
                            onClick={() => {
                              const promptText = `A masterfully forged logo for a ${promptSector} startup. Style is ${promptTone}. Incorporating a clean, isolated vector mark of a ${promptSubject}. Rendered on an absolute pure white background, flat vector paths, perfect visual balance, vector aesthetic, high contrast.`;
                              navigator.clipboard.writeText(promptText);
                              toast("Constructed prompt brief copied to clipboard!", 'success');
                            }}
                            className="absolute top-4 right-4 bg-brand-lead hover:bg-brand-lead/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 4,
                  title: '5. Manual Refinement & SVG', 
                  desc: 'Cleaning up the anchor points on your generated logo.', 
                  completed: completedModules[4],
                  content: (
                    <div className="space-y-6 mt-4 pt-4 border-t border-neutral-100 dark:border-zinc-800">
                      <p className="text-sm text-neutral-600 dark:text-zinc-400 leading-relaxed">
                        Vector paths use mathematical coordinates (anchors and control handles) to build flawless, infinite resolutions. Learning to shift anchor properties allows you to turn raw, slightly wobbly shapes into perfectly clean, pristine geometries.
                      </p>

                      <div className="bg-neutral-50 dark:bg-zinc-950 p-6 rounded-2xl border border-neutral-200/50 dark:border-zinc-800 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Interactive SVG Anchor Manipulator</span>
                          <span className="text-xs font-mono text-brand-lead font-bold">Offset: {moduleAnchorOffset}px</span>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-neutral-100 dark:border-zinc-800/50 p-6 flex flex-col items-center justify-center gap-6">
                          {/* Live SVG container */}
                          <svg className="w-48 h-24 border border-dashed border-neutral-200 dark:border-zinc-800 rounded bg-neutral-50 dark:bg-zinc-950" viewBox="0 0 200 100">
                            {/* Curved path that shifts with slider */}
                            <path 
                              d={`M 20 50 Q ${100 + moduleAnchorOffset * 5} ${50 + moduleAnchorOffset * 4} 180 50`} 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="3" 
                              className="text-brand-lead" 
                            />
                            {/* Anchor Point representation */}
                            <circle cx="20" cy="50" r="5" className="fill-zinc-800 dark:fill-white" />
                            <circle cx="180" cy="50" r="5" className="fill-zinc-800 dark:fill-white" />
                            <circle cx={100 + moduleAnchorOffset * 5} cy={50 + moduleAnchorOffset * 4} r="6" className="fill-brand-lead animate-pulse" />
                            <line x1="20" y1="50" x2={100 + moduleAnchorOffset * 5} y2={50 + moduleAnchorOffset * 4} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                            <line x1="180" y1="50" x2={100 + moduleAnchorOffset * 5} y2={50 + moduleAnchorOffset * 4} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                          </svg>

                          <div className="w-full max-w-xs space-y-1">
                            <div className="flex justify-between text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                              <span>Left Handle</span>
                              <span>Anchor Offset Control</span>
                              <span>Right Handle</span>
                            </div>
                            <input 
                              type="range"
                              min="-10"
                              max="10"
                              value={moduleAnchorOffset}
                              onChange={(e) => setModuleAnchorOffset(parseInt(e.target.value))}
                              className="w-full accent-brand-lead cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                },
              ].map((module) => {
                const isExpanded = activeCourseModule === module.id;
                return (
                  <div 
                    key={module.id} 
                    className={`bg-white dark:bg-zinc-900 p-6 rounded-3xl border transition-all duration-300 ${isExpanded ? 'border-brand-lead shadow-md' : 'border-neutral-200 dark:border-zinc-800 hover:border-brand-lead/60'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div 
                        onClick={() => setActiveCourseModule(isExpanded ? null : module.id)}
                        className="flex-1 flex items-start gap-4 cursor-pointer"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-sm ${module.completed ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' : 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500'}`}>
                          {module.completed ? '✓' : module.id + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold font-display text-neutral-900 dark:text-white">{module.title}</h3>
                          <p className="text-neutral-500 dark:text-zinc-400 text-xs mt-1 leading-relaxed">{module.desc}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setCompletedModules(prev => ({
                            ...prev,
                            [module.id]: !prev[module.id]
                          }));
                        }}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border cursor-pointer shrink-0 ${
                          module.completed 
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-950' 
                            : 'bg-white dark:bg-zinc-900 text-neutral-500 border-neutral-200 dark:border-zinc-800 hover:bg-neutral-50'
                        }`}
                      >
                        {module.completed ? 'Completed' : 'Mark Done'}
                      </button>
                    </div>

                    {isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                      >
                        {module.content}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : view === 'settings' ? (
        <div className="flex-1 p-12 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-display font-bold tracking-tight mb-12">Settings</h1>
            
            <div className="space-y-8">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold font-display mb-4">AI Model Integration</h2>
                <p className="text-sm text-neutral-500 mb-6">Bring your own keys to use custom models for generation and reasoning.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Google Gemini API Key</label>
                    <input type="password" placeholder="AIzaSy..." value={settings.geminiKey || ''} onChange={(e) => updateSettings({ geminiKey: e.target.value })} className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-lead" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">OpenAI API Key</label>
                    <input type="password" placeholder="sk-..." value={settings.openaiKey || ''} onChange={(e) => updateSettings({ openaiKey: e.target.value })} className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-lead" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Local/Custom LLM Endpoint</label>
                    <input type="url" placeholder="http://localhost:11434/api/generate" value={settings.customEndpoint || ''} onChange={(e) => updateSettings({ customEndpoint: e.target.value })} className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-lead" />
                    <p className="text-xs text-neutral-400 mt-2">Useful for connecting to local models like Ollama or LM Studio.</p>
                  </div>
                  <button onClick={() => toast('Settings saved locally.', 'success')} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold text-sm mt-4 w-full hover:opacity-80 transition-opacity">Save API Keys</button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold font-display mb-4">Integrations</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center font-serif text-xl font-bold text-black border border-neutral-200">N</div>
                      <div>
                        <h3 className="font-bold">Notion</h3>
                        <p className="text-xs text-neutral-500">Export Brand Guides to your workspace.</p>
                      </div>
                    </div>
                    <button onClick={handleExportNotion} className="bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:border-brand-lead transition-colors">
                      Connect
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg shadow-sm flex items-center justify-center border border-indigo-150">
                        <Cloud size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold">Google Drive</h3>
                        <p className="text-xs text-neutral-500">Import/Export SVGs and Brand Manuals instantly.</p>
                      </div>
                    </div>
                    <button onClick={() => setIsGoogleDriveOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-500 transition-colors">
                      Manage Storage
                    </button>
                  </div>
                </div>
              </div>

              {/* Database Backups & Cloud Mirroring Block */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold font-display mb-2 flex items-center gap-2">
                  <Layers size={22} className="text-indigo-500" />
                  Database Backups & Mirroring
                </h2>
                <p className="text-sm text-neutral-500 mb-6">
                  Set up automatic secondary mirroring of your projects to a secure relational database fallback in case Firebase is unavailable.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Backup Provider</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['none', 'postgres', 'supabase', 'both'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => updateSettings({ backupMode: mode })}
                          className={`px-3 py-2 text-xs font-bold rounded-xl border capitalize transition-all ${
                            (settings.backupMode || 'none') === mode
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:border-indigo-400'
                          }`}
                        >
                          {mode === 'none' ? 'Disabled 🚫' : mode === 'postgres' ? 'PostgreSQL 🐘' : mode === 'supabase' ? 'Supabase ⚡' : 'Both 💫'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PostgreSQL configuration */}
                  {((settings.backupMode === 'postgres' || settings.backupMode === 'both')) && (
                    <div className="p-5 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-850 space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-700 dark:text-zinc-300">PostgreSQL Settings</h3>
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-mono">🐘 Relational</span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">Connection URI</label>
                        <input
                          type="password"
                          placeholder="postgresql://username:password@localhost:5432/dbname"
                          value={settings.postgresConnectionString || ''}
                          onChange={(e) => updateSettings({ postgresConnectionString: e.target.value })}
                          className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1.5">Leave blank to use the server-side default DATABASE_URL variable, or enter your own.</p>
                      </div>
                      
                      {activeProject && (
                        <button
                          onClick={() => handleManualBackup('postgres')}
                          disabled={isBackingUpDb}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 w-full"
                        >
                          <RefreshCw size={12} className={isBackingUpDb ? "animate-spin" : ""} />
                          {isBackingUpDb ? 'Mirroring...' : 'Mirror Active Project to Postgres Now'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Supabase configuration */}
                  {((settings.backupMode === 'supabase' || settings.backupMode === 'both')) && (
                    <div className="p-5 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-850 space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-zinc-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-700 dark:text-zinc-300">Supabase Settings</h3>
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-mono">⚡ Supabase</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">Supabase URL</label>
                          <input
                            type="text"
                            placeholder="https://your-project.supabase.co"
                            value={settings.supabaseUrl || ''}
                            onChange={(e) => updateSettings({ supabaseUrl: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">Anon API Key</label>
                          <input
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={settings.supabaseAnonKey || ''}
                            onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
                            className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-400">Leave blank to use the server-side pre-configured fallback keys, or enter custom ones.</p>
                      
                      {activeProject && (
                        <button
                          onClick={() => handleManualBackup('supabase')}
                          disabled={isBackingUpDb}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 w-full"
                        >
                          <RefreshCw size={12} className={isBackingUpDb ? "animate-spin" : ""} />
                          {isBackingUpDb ? 'Mirroring...' : 'Mirror Active Project to Supabase Now'}
                        </button>
                      )}
                    </div>
                  )}

                  {settings.backupMode && settings.backupMode !== 'none' && (
                    <div className="flex gap-2 items-center text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950">
                      <CheckCircle size={14} className="shrink-0" />
                      <p>
                        <strong>Active Auto-Mirroring:</strong> Whenever you modify your brand assets, the latest states will sync instantly to Firestore and your designated secondary SQL database in the background!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Roles & Directory Management Card */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
                <h2 className="text-xl font-bold font-display mb-2 flex items-center gap-2">
                  <Users size={22} className="text-violet-500" />
                  User Directory & Role Management
                </h2>
                <p className="text-sm text-neutral-500 mb-6">
                  Manage authenticated users, platform privileges, and role permissions. Default role is Designer. Server role is required to modify roles.
                </p>

                {!user ? (
                  <div className="flex gap-3 items-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                    <ShieldAlert size={18} className="shrink-0 text-amber-500" />
                    <p>
                      <strong>Authentication Required:</strong> Please sign in with your Google Account in the upper right corner to access the live system-wide User Directory and manage role assignments.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isUsersLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="animate-spin text-zinc-500" size={24} />
                      </div>
                    ) : (
                      <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-neutral-50 dark:bg-zinc-950/50 border-b border-neutral-200 dark:border-zinc-800 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                <th className="px-5 py-3 font-semibold">User</th>
                                <th className="px-5 py-3 font-semibold">UID</th>
                                <th className="px-5 py-3 font-semibold">Role</th>
                                <th className="px-5 py-3 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-zinc-800">
                              {allUsers.map((u) => {
                                const isSelf = u.uid === user.uid;
                                const isActiveUserServer = settings.role === 'Server';
                                return (
                                  <tr key={u.uid} className="hover:bg-neutral-50 dark:hover:bg-zinc-950/20 transition-colors">
                                    <td className="px-5 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs uppercase border border-violet-200 dark:border-violet-800/40">
                                          {(u.displayName || u.email || 'U').substring(0, 2)}
                                        </div>
                                        <div>
                                          <div className="font-medium text-neutral-800 dark:text-zinc-200 flex items-center gap-1.5">
                                            {u.displayName || 'No Name'}
                                            {isSelf && (
                                              <span className="text-[10px] bg-neutral-100 dark:bg-zinc-850 text-neutral-600 dark:text-zinc-400 px-2 py-0.5 rounded font-mono font-bold uppercase">You</span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-neutral-400">{u.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-4 font-mono text-[10px] text-neutral-400 select-all">{u.uid}</td>
                                    <td className="px-5 py-4">
                                      {u.role === 'Server' ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                          <ShieldCheck size={10} /> SERVER
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/30">
                                          <Palette size={10} /> DESIGNER
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-5 py-4 text-right space-x-1.5">
                                      {isActiveUserServer ? (
                                        <>
                                          {u.role === 'Server' ? (
                                            <button
                                              onClick={() => handleChangeUserRole(u.uid, 'Designer')}
                                              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 border border-neutral-200 dark:border-zinc-700"
                                              title="Demote to Designer Role"
                                            >
                                              <Lock size={10} /> Demote
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => handleChangeUserRole(u.uid, 'Server')}
                                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                              title="Promote to Server Role"
                                            >
                                              <Unlock size={10} /> Promote
                                            </button>
                                          )}
                                          
                                          <button
                                            onClick={() => handleDeleteUserProfile(u.uid)}
                                            className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-neutral-400 dark:hover:text-red-400 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-red-200 dark:hover:border-red-900/30"
                                            title="Delete User Profile"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-[11px] text-neutral-400 italic font-mono">Read Only</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 items-start text-[11px] text-neutral-400 bg-neutral-50 dark:bg-zinc-950/20 p-3.5 rounded-2xl border border-neutral-150 dark:border-zinc-800">
                      <Info size={14} className="shrink-0 text-neutral-400 mt-0.5" />
                      <div>
                        <strong>Administrative Guidelines:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          <li>Only users with the <span className="text-emerald-500 font-bold">Server</span> role can elevate or demote roles.</li>
                          <li>You cannot demote or delete the last <span className="text-emerald-500 font-bold">Server</span> of the application to prevent server lockout.</li>
                          <li>The first Server (lcoulagency@gmail.com) is provisioned automatically.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Google Drive Storage Modal */}
      <GoogleDriveIntegration 
        isOpen={isGoogleDriveOpen} 
        onClose={() => setIsGoogleDriveOpen(false)} 
        activeProject={activeProject}
        onImportSuccess={() => setView('dashboard')}
      />

      {/* Whacanudo Help and Role Information Overlay Modal */}
      {isWhacanudoOpen && (
        <Whacanudo onClose={() => setIsWhacanudoOpen(false)} />
      )}
      {false && (
        <AnimatePresence>
          {isWhacanudoOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto"
              onClick={() => setIsWhacanudoOpen(false)}
            >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 28, stiffness: 200 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[32px] w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col text-zinc-100 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-8 py-6 border-b border-zinc-800 bg-zinc-900/40 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                    <HelpCircle size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                      Whacanudo <span className="text-zinc-500 text-sm font-mono font-normal">v1.2 // WHAT CAN YOU DO</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Comprehensive workspace specifications, role privileges, and interactive schematics</p>
                  </div>
                </div>

                {/* Role Switcher & Close Controls */}
                <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-end">
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-wider font-mono uppercase ${
                    settings.role === 'Server'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-violet-500/10 text-violet-400 border-violet-500/30'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Role: {settings.role || 'Designer'}
                  </div>

                  <button
                    onClick={() => {
                      const newRole = settings.role === 'Server' ? 'Designer' : 'Server';
                      updateSettings({ role: newRole });
                    }}
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs rounded-xl font-bold font-mono border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex items-center gap-2"
                    title="Toggle active user privileges"
                  >
                    {settings.role === 'Server' ? <Unlock size={12} className="text-emerald-400" /> : <Lock size={12} className="text-violet-400" />}
                    <span>Toggle Role</span>
                  </button>

                  <button
                    onClick={() => setIsWhacanudoOpen(false)}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Body Grid */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Tabs Sidebar */}
                <div className="w-full md:w-64 border-r border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-1.5 shrink-0 overflow-y-auto">
                  <button
                    onClick={() => setWhacanudoTab('overview')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold tracking-wide transition-all text-left cursor-pointer ${
                      whacanudoTab === 'overview'
                        ? 'bg-zinc-900 text-white border border-zinc-800 shadow-inner'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                    }`}
                  >
                    <BookOpen size={16} className={whacanudoTab === 'overview' ? 'text-amber-400' : 'text-zinc-500'} />
                    <span>App Overview & Guide</span>
                  </button>

                  <button
                    onClick={() => setWhacanudoTab('features')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold tracking-wide transition-all text-left cursor-pointer ${
                      whacanudoTab === 'features'
                        ? 'bg-zinc-900 text-white border border-zinc-800 shadow-inner'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                    }`}
                  >
                    <Code size={16} className={whacanudoTab === 'features' ? 'text-indigo-400' : 'text-zinc-500'} />
                    <span>Feature Matrix & PRD</span>
                  </button>

                  <button
                    onClick={() => setWhacanudoTab('terminal')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold tracking-wide transition-all text-left cursor-pointer relative overflow-hidden ${
                      whacanudoTab === 'terminal'
                        ? 'bg-zinc-900 text-white border border-zinc-800 shadow-inner'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                    }`}
                  >
                    <Terminal size={16} className={whacanudoTab === 'terminal' ? 'text-emerald-400' : 'text-zinc-500'} />
                    <span>Forgel Super-User Console</span>
                    {settings.role !== 'Server' && (
                      <span className="ml-auto text-[9px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                        <Lock size={8} /> LOCKED
                      </span>
                    )}
                  </button>

                  <div className="mt-auto p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 text-[11px] text-zinc-500 leading-relaxed font-mono">
                    <p className="font-semibold text-zinc-400 mb-1 flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-emerald-500" /> Security Token
                    </p>
                    <p>Status: {settings.role === 'Server' ? 'SUPERUSER_ACTIVE' : 'NORMAL_CLIENT'}</p>
                    <p className="mt-1">Iframe Sandbox: OK</p>
                  </div>
                </div>

                {/* Right Content Panel */}
                <div className="flex-1 bg-zinc-900/20 p-8 overflow-y-auto">
                  {whacanudoTab === 'overview' ? (
                    <div className="max-w-3xl space-y-8">
                      <div>
                        <h3 className="text-xl font-bold font-display text-white mb-2">The Forgel Branding Forge</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                          Welcome to the authoritative center of Forgel Branding Forge. This client-side and AI-driven design studio bridges flat vector logo synthesis, comprehensive visual brand manuals, dynamic design review pipelines, and sonic signature architecture into a unified branding experience.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Why does this app exist?</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Traditional branding workflows suffer from high friction, scattered resources, and a lack of visual alignment rules. Forgel bridges this gap, allowing designers to create high-fidelity design prototypes, audit typographic composition, and synchronize visual-audio assets instantly in a sandboxed, low-overhead canvas.
                          </p>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-amber-400">Core Workflow Instructions</h4>
                          <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside">
                            <li>Create a brand card workspace in the Library.</li>
                            <li>Enter company philosophy and select active energy.</li>
                            <li>Forge flat vector logos with AI models.</li>
                            <li>Compile visual guideline systems and typography guides.</li>
                            <li>Manual-tune SVG anchors and run AI Critic reviews.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider font-mono">
                          <ShieldCheck size={16} className="text-emerald-500" /> Active Role Matrix
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                          <div className="p-4 rounded-xl border border-dashed border-zinc-800 space-y-2">
                            <span className="text-violet-400 font-bold uppercase flex items-center gap-1">
                              <Unlock size={12} /> Designer Role
                            </span>
                            <p className="text-zinc-500 text-[11px] leading-relaxed">
                              Enabled by default for standard operators. Access is restricted to content creation, course completion, visual configurations, logo uploads, critiques, and mockup reviews. Read-only regarding application source properties.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl border border-dashed border-zinc-800 space-y-2 bg-emerald-500/[0.02]">
                            <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                              <Lock size={12} className="text-emerald-500" /> Server Role (Super User)
                            </span>
                            <p className="text-zinc-500 text-[11px] leading-relaxed">
                              Unlocked for super users. Grants administrative command access to extend AI weight models, recompile Tailwind theme styles, audit package security, and reviews highly comprehensive backend PRD schematics.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : whacanudoTab === 'features' ? (
                    <div className="space-y-6 max-w-4xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                        <div>
                          <h3 className="text-xl font-bold font-display text-white">App Features Spec Matrix</h3>
                          <p className="text-xs text-zinc-400 mt-0.5">Tactical specifications, example use cases, and technical blueprints</p>
                        </div>
                        {settings.role !== 'Server' && (
                          <div className="text-[11px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                            💡 Switch to <span className="text-emerald-400 font-bold">Server Role</span> to unlock raw PRD Schematics
                          </div>
                        )}
                      </div>

                      {/* MASTER MULTI-FORMAT EXPORT SUITE PANEL */}
                      <div className="bg-zinc-900/90 border border-zinc-800/80 p-5 rounded-3xl space-y-4 shadow-xl backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                              <Download size={15} className="text-indigo-400" /> Export Master Suite PRD Document
                            </h4>
                            <p className="text-xs text-zinc-400 max-w-2xl">
                              Consolidate and download specifications for all 8 core platform features as a single integrated manual. Includes full functional flows, examples, and server database schematics.
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => {
                                const content = generateFullMarkdown(PRD_FEATURES, settings.role === 'Server');
                                downloadFile(content, "forgel-platform-prd.md", "text/markdown");
                              }}
                              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold border border-zinc-800 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                              title="Download Master Markdown Document"
                            >
                              <span className="text-indigo-400 font-black">#</span> MD
                            </button>

                            <button
                              onClick={() => {
                                const content = generateFullCSV(PRD_FEATURES, settings.role === 'Server');
                                downloadFile(content, "forgel-platform-prd.csv", "text/csv");
                              }}
                              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold border border-zinc-800 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                              title="Download Comma Separated Values spreadsheet"
                            >
                              <span className="text-emerald-400 font-black">⊞</span> CSV
                            </button>

                            <button
                              onClick={() => {
                                const content = generateFullJSON(PRD_FEATURES, settings.role === 'Server');
                                downloadFile(content, "forgel-platform-prd.json", "application/json");
                              }}
                              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold border border-zinc-800 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                              title="Download JSON specifications"
                            >
                              <span className="text-blue-400 font-black">{}</span> JSON
                            </button>

                            <button
                              onClick={() => {
                                const content = generateFullDoc(PRD_FEATURES, settings.role === 'Server');
                                downloadFile(content, "forgel-platform-prd.doc", "application/msword");
                              }}
                              className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-mono font-bold border border-zinc-800 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                              title="Download Microsoft Word Document"
                            >
                              <span className="text-violet-400 font-black">🖺</span> DOC
                            </button>

                            <button
                              onClick={() => {
                                exportFullPDF(PRD_FEATURES, toast, settings.role === 'Server');
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-mono font-bold border border-indigo-500 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md shadow-indigo-600/20"
                              title="Generate Master PDF Document"
                            >
                              <span className="text-white font-black">▼</span> PDF
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {PRD_FEATURES.map((feat, index) => {
                          const iconMap: Record<string, React.ReactNode> = {
                            FolderArchive: <FolderArchive size={20} className="text-indigo-400" />,
                            Palette: <Palette size={20} className="text-emerald-400" />,
                            BookOpen: <BookOpen size={20} className="text-blue-400" />,
                            Music: <Music size={20} className="text-purple-400" />,
                            FileText: <FileText size={20} className="text-amber-400" />,
                            Layers: <Layers size={20} className="text-rose-400" />,
                            MessageSquare: <MessageSquare size={20} className="text-teal-400" />,
                            GraduationCap: <GraduationCap size={20} className="text-amber-500" />
                          };

                          return (
                            <div key={index} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 hover:border-zinc-700/60 transition-all group relative overflow-hidden">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-zinc-800/80 rounded-xl border border-zinc-700/50">
                                    {iconMap[feat.iconName] || <Code size={20} className="text-zinc-400" />}
                                  </div>
                                  <h4 className="text-lg font-bold text-white font-display">{feat.name}</h4>
                                </div>

                                {/* PER-FEATURE QUICK EXPORT ACTION ROW */}
                                <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/40 p-1 rounded-2xl border border-zinc-800/80 self-start sm:self-auto">
                                  <span className="text-[9px] font-mono font-black text-zinc-500 tracking-wider px-2">EXPORT:</span>
                                  <button
                                    onClick={() => {
                                      const content = generateFeatureMarkdown(feat, settings.role === 'Server');
                                      downloadFile(content, `${feat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prd.md`, "text/markdown");
                                    }}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer border border-zinc-800"
                                    title="Export Markdown File (.md)"
                                  >
                                    MD
                                  </button>
                                  <button
                                    onClick={() => {
                                      const content = generateFeatureCSV(feat, settings.role === 'Server');
                                      downloadFile(content, `${feat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prd.csv`, "text/csv");
                                    }}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer border border-zinc-800"
                                    title="Export Spreadsheet File (.csv)"
                                  >
                                    CSV
                                  </button>
                                  <button
                                    onClick={() => {
                                      const content = generateFeatureJSON(feat, settings.role === 'Server');
                                      downloadFile(content, `${feat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prd.json`, "application/json");
                                    }}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer border border-zinc-800"
                                    title="Export Data File (.json)"
                                  >
                                    JSON
                                  </button>
                                  <button
                                    onClick={() => {
                                      const content = generateFeatureDoc(feat, settings.role === 'Server');
                                      downloadFile(content, `${feat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-prd.doc`, "application/msword");
                                    }}
                                    className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer border border-zinc-800"
                                    title="Export Word Document (.doc)"
                                  >
                                    DOC
                                  </button>
                                  <button
                                    onClick={() => {
                                      exportFeaturePDF(feat, toast, settings.role === 'Server');
                                    }}
                                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer border border-zinc-700"
                                    title="Print / Save as PDF (.pdf)"
                                  >
                                    PDF
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div className="space-y-2">
                                  <p className="leading-relaxed"><strong className="text-zinc-300 font-semibold">What is it:</strong> <span className="text-zinc-400">{feat.what}</span></p>
                                  <p className="leading-relaxed"><strong className="text-zinc-300 font-semibold">Why is it:</strong> <span className="text-zinc-400">{feat.why}</span></p>
                                </div>
                                <div className="space-y-2">
                                  <p className="leading-relaxed"><strong className="text-zinc-300 font-semibold">How to use it:</strong> <span className="text-zinc-400">{feat.how}</span></p>
                                  <p className="leading-relaxed text-amber-400/90"><strong className="text-zinc-200 font-semibold">Example Use Case:</strong> <span>{feat.example}</span></p>
                                </div>
                              </div>

                              {/* Server PRD Specs section */}
                              {settings.role === 'Server' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="border-t border-zinc-800 mt-4 pt-4 space-y-3 font-mono text-[11px]"
                                >
                                  <div className="text-emerald-400 uppercase font-black tracking-wider text-[10px] flex items-center gap-1.5">
                                    <Terminal size={12} /> Server Role • Core PRD Schematics
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-zinc-500">
                                    <div>
                                      <span className="text-zinc-400 block font-bold mb-1">DATA LAYER:</span>
                                      {feat.prd.db}
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 block font-bold mb-1">PROXY GATEWAY:</span>
                                      <span className="text-indigo-400 font-bold">{feat.prd.routes}</span>
                                    </div>
                                    <div>
                                      <span className="text-zinc-400 block font-bold mb-1">ENGINEERING SPEC:</span>
                                      {feat.prd.specs}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : whacanudoTab === 'terminal' ? (
                    <div className="space-y-6 max-w-4xl">
                      <div>
                        <h3 className="text-xl font-bold font-display text-white">Forgel Super-User Control Panel</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">Execute runtime container updates, model tuning, and stylesheet compiling</p>
                      </div>

                      {settings.role !== 'Server' ? (
                        <div className="bg-zinc-900 border border-zinc-800 p-12 rounded-[24px] text-center max-w-lg mx-auto flex flex-col items-center justify-center gap-4 shadow-xl">
                          <div className="w-16 h-16 bg-violet-500/10 text-violet-400 rounded-full flex items-center justify-center border border-violet-500/20">
                            <Lock size={28} />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-white font-display">Super User Section Restricted</h4>
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                              You are currently in the <strong>Designer Role</strong>. Designers can interact with workspace content but cannot trigger high-frequency app recompilations, model tunes, or stylesheet patches.
                            </p>
                          </div>
                          <button
                            onClick={() => updateSettings({ role: 'Server' })}
                            className="bg-brand-lead hover:bg-brand-lead/90 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                          >
                            Upgrade Role to Server (Super User)
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5 mb-2">
                              <Hammer size={16} className="text-emerald-400" /> Administrative Operations Station
                            </h4>
                            <p className="text-xs text-zinc-400 mb-6">
                              Trigger high-level applet modifications instantly. Watch the system terminal stream compiling tasks, compiling dependencies, and deploying modifications straight into the running sandbox container:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <button
                                onClick={() => runServerDevTask('Extend Model Weights (gemini-2.5-pro)')}
                                disabled={activeDevTask !== null}
                                className="px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-emerald-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left leading-tight"
                              >
                                <Code size={14} className="text-emerald-400 shrink-0" />
                                <div>
                                  <span className="block text-zinc-100 font-bold uppercase text-[9px] tracking-wider mb-0.5">ML FORGE</span>
                                  Tune Vector Weights
                                </div>
                              </button>

                              <button
                                onClick={() => runServerDevTask('Recompile Stylesheet (Glassmorphism)')}
                                disabled={activeDevTask !== null}
                                className="px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-emerald-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left leading-tight"
                              >
                                <Palette size={14} className="text-emerald-400 shrink-0" />
                                <div>
                                  <span className="block text-zinc-100 font-bold uppercase text-[9px] tracking-wider mb-0.5">THEME AGENT</span>
                                  Polish CSS Theme
                                </div>
                              </button>

                              <button
                                onClick={() => runServerDevTask('Run Dependency Security Audit')}
                                disabled={activeDevTask !== null}
                                className="px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white hover:border-emerald-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-left leading-tight"
                              >
                                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                <div>
                                  <span className="block text-zinc-100 font-bold uppercase text-[9px] tracking-wider mb-0.5">SECURITY AUDIT</span>
                                  Audit Proxy Security
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* Live System Terminal Logs */}
                          <div className="bg-black border border-zinc-800 rounded-2xl p-5 space-y-2 relative shadow-inner">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-1">
                              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                active_terminal_log_session • guest@forgel-server
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded uppercase">
                                SSH://3000
                              </span>
                            </div>

                            <div className="h-44 overflow-y-auto font-mono text-[11px] text-emerald-500 space-y-1.5 scrollbar-none">
                              {devLogs.length === 0 ? (
                                <p className="text-zinc-600">guest@forgel-server:~# <span className="animate-pulse">_</span></p>
                              ) : (
                                <>
                                  {devLogs.map((log, lidx) => (
                                    <p
                                      key={lidx}
                                      className={`${
                                        log.includes('[SUCCESS]') 
                                          ? 'text-emerald-400 font-bold bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10' 
                                          : log.includes('[SECURITY]') || log.includes('[THEME]')
                                            ? 'text-indigo-400'
                                            : log.includes('[FORGE]')
                                              ? 'text-amber-400'
                                              : 'text-zinc-300'
                                      }`}
                                    >
                                      {log}
                                    </p>
                                  ))}
                                  {activeDevTask && (
                                    <p className="text-zinc-600 animate-pulse">guest@forgel-server:~# system_compiling_task_running... <span className="inline-block animate-spin font-sans text-xs">⟳</span></p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      )}
    </div>
  );
}
