import { DesignChecklist } from './components/ui/DesignChecklist';
import { CustomWaveformPlayer } from './components/ui/CustomWaveformPlayer';
import { Tooltip } from './components/ui/Tooltip';
import { ANIMATIONS } from './components/ui/ANIMATIONS';
import { sanitizeSVG } from './components/ui/sanitizeSVG';
import { safeFormatDate } from './components/ui/safeFormatDate';
import Markdown from 'react-markdown';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Wand2, RefreshCw, Palette, Download, Move, Upload, BookOpen, Image as ImageIcon, ChevronRight, FolderArchive, MessageSquare, FileText, Music, LayoutDashboard, Share2, Plus, Trash2, Globe, Moon, Sun, Layers, GraduationCap, Settings as SettingsIcon, Check, CheckCircle, Info, HelpCircle, ShieldCheck, Terminal, Code, Lock, Unlock, Hammer, Search, Filter, Cloud, Copy, Target, Users, ShieldAlert, ArrowRight, X, Loader2, Send, Zap } from 'lucide-react';
import { generateLogoImage, generateBrandGuide, analyzeRefinementContext, generateSonicPhilosophy, generateDesignRationale, generateAICriticComment, analyzeCompetitor, generateEcosystemAsset } from './services/geminiService';
import { useAppStore, Project, Mockup, handleCloudErrorGracefully } from './store';
import { auth, signInWithGoogle, logout, db } from './services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { syncProjectToPostgres, syncProjectToSupabase } from './utils/dbBackupClient';
import { KeyboardManager } from './components/KeyboardManager';
import { vectorizeImage } from './utils/vectorizer';
import { TouchGesturesHelp } from './components/TouchGesturesHelp';
import { MobileSheet } from './components/MobileSheet';
import { StudioControls } from './components/StudioControls';
import { TemplateLibrary } from './components/TemplateLibrary';
import { SVGPathEditor } from './components/SVGPathEditor';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { AccessibilityScore } from './components/AccessibilityScore';
import { ProjectAnalytics } from './components/ProjectAnalytics';
import { Whacanudo } from './components/Whacanudo';
import { GoogleDriveIntegration } from './components/GoogleDriveIntegration';
import { useToast } from './components/Toast';
import { Dashboard } from './views/Dashboard';
import { Course } from './views/Course';
import { Settings } from './views/Settings';
import { Studio } from './views/Studio';
import { InteractiveMockupViewer } from './components/InteractiveMockupViewer';
import { VectorizePreviewModal } from './components/VectorizePreviewModal';
import DOMPurify from 'dompurify';



type AnimationType = keyof typeof ANIMATIONS;
type ViewMode = 'dashboard' | 'studio' | 'course' | 'settings';
type WorkspaceType = 'sandbox' | 'workbench' | 'identity' | 'strategy';
type SandboxSubTab = 'preview' | 'refine';
type WorkbenchSubTab = 'sketch' | 'precision';
type IdentitySubTab = 'guidelines' | 'mockups' | 'collateral';
type StrategySubTab = 'rivals' | 'sonic';
type StudioTab = 'preview' | 'guide' | 'refine' | 'sonic' | 'comments' | 'precision' | 'mockups' | 'competitor' | 'ecosystem' | 'draw'; // keep it temporarily for backwards comp or gradual replacement

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


export default function App() {

  const handleExportSVG = () => {
    if (!activeProject?.svgSource) return;
    const blob = new Blob([activeProject.svgSource], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name || 'logo'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = () => {
    if (!activeProject?.logoUrl) return;
    const a = document.createElement('a');
    a.href = activeProject.logoUrl;
    a.download = `${activeProject.name || 'logo'}.png`;
    a.click();
  };

  const { toast } = useToast();
  const { 
    projects, activeProjectId, isHydrated, settings, user, setUser,
    loadProjects, createProject, updateProject, bulkUpdateProjects, deleteProject, deleteProjects, cloneProject, setActiveProject, updateSettings,
    isCloudSyncSuspended
  } = useAppStore();

  const [view, setView] = useState<ViewMode>('dashboard');
  const [isSuspendedBannerDismissed, setIsSuspendedBannerDismissed] = useState(false);
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
      const isQuota = handleCloudErrorGracefully(err);
      if (!isQuota) {
        console.error('Failed to fetch users:', err);
      }
    } finally {
      setIsUsersLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'settings' && user) {
      fetchUsers();
    }
  }, [view, user]);

  useEffect(() => {
    const handleSyncSuspended = (e: any) => {
      toast(e.detail?.message || "Cloud Sync paused: Quota Exceeded. Safely falling back to Local Storage (IndexedDB).", "error");
    };
    window.addEventListener('cloud-sync-suspended', handleSyncSuspended);
    return () => {
      window.removeEventListener('cloud-sync-suspended', handleSyncSuspended);
    };
  }, [toast]);

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
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('resource-exhausted') || 
        errMsg.includes('Quota limit exceeded') || 
        errMsg.includes('quota') || 
        (err && (err as any).code === 'resource-exhausted')
      ) {
        useAppStore.setState({ isCloudSyncSuspended: true });
        toast("Cloud sync suspended: Quota limit exceeded. Your action was saved locally.", "error");
        setAllUsers(prev => prev.map(u => u.uid === targetUserId ? { ...u, role: newRole } : u));
      } else {
        toast("Error updating role: " + errMsg, "error");
      }
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
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.includes('resource-exhausted') || 
        errMsg.includes('Quota limit exceeded') || 
        errMsg.includes('quota') || 
        (err && (err as any).code === 'resource-exhausted')
      ) {
        useAppStore.setState({ isCloudSyncSuspended: true });
        toast("Cloud sync suspended: Quota limit exceeded. Your action was processed locally.", "error");
        setAllUsers(prev => prev.filter(u => u.uid !== targetUserId));
      } else {
        toast("Error deleting user: " + errMsg, "error");
      }
    }
  };
  
  // Current Studio State
  const [mode, setMode] = useState<'create' | 'upload'>('create');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVariation, setIsGeneratingVariation] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingSonic, setIsGeneratingSonic] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [isGeneratingRationale, setIsGeneratingRationale] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isR2VModalOpen, setIsR2VModalOpen] = useState(false);
  
  // Acoustic Synthesizer states
  const [synthWaveType, setSynthWaveType] = useState<OscillatorType>('sine');
  const [synthADSR, setSynthADSR] = useState({
    attack: 0.1,
    decay: 0.3,
    sustain: 0.5,
    release: 0.8
  });
  const [isSynthPlaying, setIsSynthPlaying] = useState(false);
  const [synthRippleIntensity, setSynthRippleIntensity] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [activeAnimation, setActiveAnimation] = useState<AnimationType>('float');
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType>('sandbox');
  const [sandboxSubTab, setSandboxSubTab] = useState<SandboxSubTab>('preview');
  const [workbenchSubTab, setWorkbenchSubTab] = useState<WorkbenchSubTab>('sketch');
  const [identitySubTab, setIdentitySubTab] = useState<IdentitySubTab>('guidelines');
  const [strategySubTab, setStrategySubTab] = useState<StrategySubTab>('rivals');
  const [activeTab, setActiveTab] = useState<StudioTab>('preview'); // Temporary
  const [isCollabDrawerOpen, setIsCollabDrawerOpen] = useState(false);
  
  const [useConsolidatedWorkspace, setUseConsolidatedWorkspace] = useState(true);
  
  // Migrated from individual component scopes to App scope for Sandbox
  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [creativeDirection, setCreativeDirection] = useState('');

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
  const [fullscreen, setFullscreen] = useState(false);
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
  const cursorRafRef = useRef<number | null>(null);
  const [commentText, setCommentText] = useState('');

  // New Interactive states
  const [activeCourseModule, setActiveCourseModule] = useState<number | null>(null);
  const [completedModules, setCompletedModules] = useState<Record<number, boolean>>({ 0: true });
  const [mockupTab, setMockupTab] = useState<'templates' | 'uploaded'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<'card' | 'splash' | 'billboard'>('card');
  const [cardBg, setCardBg] = useState<'cream' | 'charcoal' | 'forest'>('cream');
  const [mockupRotateX, setMockupRotateX] = useState<number>(15);
  const [mockupRotateY, setMockupRotateY] = useState<number>(-20);
  const [mockupRotateZ, setMockupRotateZ] = useState<number>(5);
  const [mockupScale, setMockupScale] = useState<number>(1.0);
  const [mockupPerspective, setMockupPerspective] = useState<number>(1200);
  const [mockupBlendMode, setMockupBlendMode] = useState<'normal' | 'multiply' | 'screen' | 'overlay' | 'difference' | 'color-dodge'>('normal');
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
  const [generationMode, setGenerationMode] = useState<'compact' | 'complete'>('complete');
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
  const lastGhostSync = useRef<number>(0);
  const handleGhostSync = (ghostData: any) => {
    const now = Date.now();
    if (now - lastGhostSync.current < 50) return;
    lastGhostSync.current = now;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'ghost_sync',
          ghostData,
        })
      );
    }
  };

  const handleUpdateAndSync = async (updates: Partial<Project>, throttleCloud?: boolean) => {
    if (!activeProjectId) return;
    const start = performance.now();
    setIsSaving(true);
    
    // Maintain logoHistory stack for Undo (Batch 1 feature)
    const nextUpdates = { ...updates };
    if (updates.svgSource && updates.svgSource !== activeProject?.svgSource) {
      const history = activeProject?.logoHistory || [];
      if (activeProject?.svgSource) {
        nextUpdates.logoHistory = [...history, activeProject.svgSource];
      }
      nextUpdates.logoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(updates.svgSource)}`;
    }

    await updateProject(activeProjectId, nextUpdates, throttleCloud);
    
    const duration = performance.now() - start;
    setSaveLatencyMs(parseFloat(duration.toFixed(2)));
    setTimeout(() => setIsSaving(false), 800);

    const mergedProject = {
      ...activeProject,
      ...nextUpdates,
      updatedAt: Date.now()
    } as Project;

    // Trigger Cloud Backups/Mirrors if configured
    // Trigger Cloud Backups/Mirrors
    if (!throttleCloud) {
      if (settings.backupMode === 'postgres' || settings.backupMode === 'both') {
        syncProjectToPostgres(mergedProject).then((res) => {
          if (!res.success) {
            console.warn('Postgres Backup Failed:', res.message);
          }
        });
      }
      if (settings.backupMode === 'supabase' || settings.backupMode === 'both') {
        syncProjectToSupabase(mergedProject).then((res) => {
          if (!res.success) {
            console.warn('Supabase Backup Failed:', res.message);
          }
        });
      }
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
      res = await syncProjectToPostgres(activeProject);
    } else {
      res = await syncProjectToSupabase(activeProject);
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
      const wsUrl = `${protocol}//${window.location.host}/ws-collab`;
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
              updateProject(activeProjectId, msg.projectState, 'skip');
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
              updateProject(activeProjectId, msg.projectState, 'skip');
            }
          } else if (msg.type === 'ghost_sync') {
            const store = useAppStore.getState();
            store.setEphemeralGhost(msg.senderId, msg.ghostData);
            // Clear ghost after 500ms of inactivity
            setTimeout(() => {
              store.clearEphemeralGhost(msg.senderId);
            }, 500);
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
        console.warn('[Collab] WebSocket stream is currently offline or unreachable in this container/preview network:', err);
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

  const handleCreateNewBlankProject = async () => {
    const proj = await createProject('New Blank Project');
    setView('studio');
    setMode('create');
    setActiveTab('draw');
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

  const handleGenerateVariation = async () => {
    if (!activeProject || !activeProject.description) {
      toast('No description found to base the variation on.', 'error');
      return;
    }
    try {
      setIsGeneratingVariation(true);
      setError(null);
      const url = await generateLogoImage(activeProject.description, true);
      await updateProject(activeProject.id, { logoUrl: url, logoMimeType: 'image/png' });
      toast('Logo variation generated successfully.', 'success');
    } catch (err: any) {
      console.error(err);
      toast(err.message || "Failed to generate variation.", 'error');
    } finally {
      setIsGeneratingVariation(false);
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

  const handleVectorizeLogo = () => {
    if (!activeProject?.logoUrl || !activeProjectId) {
      toast('Please generate or upload a logo first.', 'error');
      return;
    }
    setIsR2VModalOpen(true);
  };

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  const triggerVoice = (frequency: number, duration: number = 0.5) => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filterNode = ctx.createBiquadFilter();

      osc.type = synthWaveType;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Simple but high-fidelity low-pass dynamic biquad filter
      filterNode.type = 'lowpass';
      if (synthWaveType === 'sine') {
        filterNode.frequency.setValueAtTime(1200, ctx.currentTime);
      } else if (synthWaveType === 'triangle') {
        filterNode.frequency.setValueAtTime(1400, ctx.currentTime);
      } else if (synthWaveType === 'sawtooth') {
        filterNode.frequency.setValueAtTime(1000, ctx.currentTime);
      } else {
        filterNode.frequency.setValueAtTime(800, ctx.currentTime);
      }

      // ADSR Envelope Phase Calculations
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      
      // Attack: Linear ramp to max volume
      gainNode.gain.linearRampToValueAtTime(0.4, now + synthADSR.attack);
      
      // Decay: Exponential ramp down to Sustain level
      const sustainLevel = Math.max(synthADSR.sustain * 0.4, 0.001);
      gainNode.gain.setValueAtTime(0.4, now + synthADSR.attack);
      gainNode.gain.exponentialRampToValueAtTime(sustainLevel, now + synthADSR.attack + synthADSR.decay);

      osc.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);

      // Release: Trigger ramp down to zero after note duration
      const releaseStart = now + synthADSR.attack + synthADSR.decay + duration;
      gainNode.gain.setValueAtTime(sustainLevel, releaseStart);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseStart + synthADSR.release);

      // Stop oscillator cleanly once release completes
      osc.stop(releaseStart + synthADSR.release);

      // Visual feedback ripple animation trigger
      setSynthRippleIntensity(prev => Math.min(prev + 1, 5));
      setTimeout(() => {
        setSynthRippleIntensity(prev => Math.max(prev - 1, 0));
      }, (synthADSR.attack + synthADSR.decay + duration + synthADSR.release) * 1000);

    } catch (err) {
      console.error('Synthesizer Voice allocation error:', err);
    }
  };

  const playBrandMelody = () => {
    if (isSynthPlaying) return;
    setIsSynthPlaying(true);
    
    // Play a corporate chord arpeggio progression (Major 9th / Sparkle sound)
    const notes = [
      { freq: 261.63, delay: 0.0, dur: 0.8 }, // C4
      { freq: 329.63, delay: 0.15, dur: 0.8 }, // E4
      { freq: 392.00, delay: 0.3, dur: 0.8 }, // G4
      { freq: 523.25, delay: 0.45, dur: 1.2 }, // C5
      { freq: 659.25, delay: 0.6, dur: 1.2 }  // E5
    ];

    notes.forEach((note) => {
      setTimeout(() => {
        triggerVoice(note.freq, note.dur);
      }, note.delay * 1000);
    });

    const totalDur = (0.6 + 1.2 + synthADSR.release) * 1000;
    setTimeout(() => {
      setIsSynthPlaying(false);
    }, totalDur);
  };

  const applySynthPreset = (presetName: 'bell' | 'pad' | 'retro') => {
    if (presetName === 'bell') {
      setSynthWaveType('sine');
      setSynthADSR({ attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.5 });
    } else if (presetName === 'pad') {
      setSynthWaveType('triangle');
      setSynthADSR({ attack: 0.6, decay: 0.8, sustain: 0.7, release: 1.5 });
    } else if (presetName === 'retro') {
      setSynthWaveType('square');
      setSynthADSR({ attack: 0.02, decay: 0.1, sustain: 0.4, release: 0.2 });
    }
    toast(`Applied acoustic preset: ${presetName.toUpperCase()}`, 'success');
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
      const guide = await generateBrandGuide(base64Data, mimeType, context, generationMode);
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
      const allowedOrigins = [
        window.location.origin,
        'https://accounts.google.com',
        'https://notion.so'
      ];
      if (!allowedOrigins.includes(event.origin)) {
        console.warn(`[Security] Blocked message from untrusted origin: ${event.origin}`);
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
          <span className="absolute left-full ml-2 px-2 py-1 bg-zinc-950 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-modal">
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
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-950 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-modal shadow-md">
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
              <span className="absolute left-full ml-3 px-2.5 py-1 bg-zinc-950 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-modal shadow-md">
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
          <SettingsIcon size={24} />
        </button>

        {/* Brand Attribution */}
        <div className="hidden md:flex flex-col items-center justify-center text-center px-1 pb-4 pt-4 group cursor-default" title="Built by Srvel — Serve. Grow. Lead.">
          <span className="text-[9px] font-display font-bold text-neutral-400 dark:text-zinc-500 group-hover:text-brand-lead transition-colors uppercase tracking-wider">Built by Srvel</span>
          <span className="text-[9px] font-sans font-medium text-neutral-500 dark:text-zinc-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-200 transition-colors uppercase tracking-widest mt-0.5 whitespace-nowrap">Serve. Grow. Lead.</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {isCloudSyncSuspended && !isSuspendedBannerDismissed && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-400 px-5 py-3 text-xs font-medium flex items-center justify-between gap-4 shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <ShieldAlert size={18} className="text-amber-500 shrink-0 animate-pulse" />
              <span>
                <strong>Cloud Sync Paused (Firestore Quota Limit Met):</strong> Safely fell back to local offline storage (IndexedDB). Your work is preserved and will resume syncing when quotas reset tomorrow. For details, view the <a href="https://firebase.google.com/pricing#cloud-firestore" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-amber-600 dark:hover:text-amber-300">Firebase Pricing Guide</a>.
              </span>
            </div>
            <button 
              onClick={() => setIsSuspendedBannerDismissed(true)}
              className="text-neutral-500 dark:text-zinc-400 hover:text-neutral-700 dark:hover:text-zinc-200 transition-colors p-1 cursor-pointer"
              title="Dismiss warning"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {view === 'dashboard' ? (
          <Dashboard
            setView={setView}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            setIsGoogleDriveOpen={setIsGoogleDriveOpen}
          />
        ) : view === 'studio' ? (
          <Studio
            setView={setView}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        ) : view === 'course' ? (
          <Course />
        ) : view === 'settings' ? (
          <Settings setIsGoogleDriveOpen={setIsGoogleDriveOpen} />
        ) : null}
      </div>

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

      {/* Collab FAB */}
      {view === 'dashboard' && (
        <button 
          onClick={() => setIsCollabDrawerOpen(!isCollabDrawerOpen)}
          className="fixed bottom-6 right-6 p-4 bg-brand-lead text-white rounded-full shadow-2xl z-[60] hover:bg-brand-lead/90 active:scale-95 transition-all cursor-pointer flex items-center justify-center border-4 border-white dark:border-zinc-900"
        >
          <MessageSquare size={24} />
          {activeUsers.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white dark:border-zinc-900">
              {activeUsers.length}
            </span>
          )}
        </button>
      )}

      {/* Collaboration Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-zinc-900 border-l border-neutral-200 dark:border-zinc-800 shadow-2xl z-[65] transform transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isCollabDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="h-full flex flex-col pt-safe">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageSquare size={18} /> Collaboration
            </h2>
            <button 
              onClick={() => setIsCollabDrawerOpen(false)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
            {/* Active Users presence bar */}
            <div className="mb-6 p-4 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Active Presence
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-zinc-800 text-xs font-bold">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                  You ({username})
                </div>
                {activeUsers.filter(u => u.username !== username).map(u => (
                  <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-neutral-200 dark:border-zinc-800 text-xs font-bold">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }}></div>
                    {u.username}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Critic Panel */}
            <div className="mb-6">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-brand-lead">
                <Wand2 size={16} /> AI Creative Directors
              </h3>
              <div className="flex flex-col gap-2">
                 <select 
                   value={criticRole}
                   onChange={(e) => setCriticRole(e.target.value)}
                   className="w-full bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
                 >
                   <option value="Senior Art Director 🎨">Senior Art Director (Metaphor)</option>
                   <option value="Typography Specialist ✍️">Typography Specialist (Legibility)</option>
                   <option value="Color Specialist 💧">Color Specialist (Harmony)</option>
                 </select>
                 <button 
                   onClick={handleRequestAICritic}
                   disabled={isCriticLoading || !activeProject}
                   className="p-3 text-center border border-neutral-200 dark:border-zinc-800 rounded-xl hover:border-brand-lead hover:bg-brand-lead hover:text-white transition-colors disabled:opacity-50 font-bold text-sm cursor-pointer"
                 >
                   {isCriticLoading ? 'Analyzing...' : 'Request Feedback'}
                 </button>
              </div>
            </div>
            
            {/* Thread */}
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 border-b border-neutral-200 dark:border-zinc-800 pb-2">
              Project Thread
            </h3>
            
            <div className="flex-1 space-y-4 mb-4">
              {activeProject?.comments?.map((comment) => (
                <div key={comment.id} className={`p-4 rounded-xl shadow-sm border ${comment.author.includes('AI') ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50' : 'bg-white dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${comment.author.includes('AI') ? 'bg-brand-lead' : 'bg-neutral-800 dark:bg-zinc-700'}`}>
                      {comment.author.includes('AI') ? <Wand2 size={12} /> : comment.author.charAt(0)}
                    </div>
                    <span className="font-bold text-xs">{comment.author}</span>
                    <span className="text-[10px] text-neutral-400 ml-auto">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  
                  {comment.author.includes('AI') ? (
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug">
                      <Markdown>{comment.text}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{comment.text}</p>
                  )}
                </div>
              ))}
              
              {isCriticLoading && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-lead flex items-center justify-center">
                      <RefreshCw size={12} className="text-white animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 animate-pulse">The Critic is analyzing the logo...</span>
                  </div>
                </div>
              )}
              
              {(!activeProject?.comments || activeProject.comments.length === 0) && !isCriticLoading && (
                <div className="text-center py-8 text-neutral-400 dark:text-zinc-500">
                  <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No comments yet.</p>
                  <p className="text-xs mt-1">Request an AI critique or add a note below.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-4 bg-neutral-50 dark:bg-zinc-950 border-t border-neutral-200 dark:border-zinc-800 shrink-0">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (commentText.trim() && activeProject) {
                updateProject(activeProject.id, {
                  comments: [...activeProject.comments, {
                    id: Math.random().toString(36).substring(7),
                    author: 'You',
                    text: commentText.trim(),
                    timestamp: Date.now()
                  }]
                });
                setCommentText('');
              }
            }} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-white dark:bg-zinc-900 border border-neutral-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-lead"
              />
              <button 
                type="submit"
                disabled={!commentText.trim()}
                className="p-2 bg-brand-lead hover:bg-brand-lead/90 text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}