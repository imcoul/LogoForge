// Whacanudo.tsx - Forgel Capabilities, Core Help, & Server-Privileged PRD Center
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { Sparkles, Download, Shield, Eye, HelpCircle } from 'lucide-react';
import { Modal } from './ui/Modal';

interface WhacanudoProps {
  onClose: () => void;
}

export const Whacanudo: React.FC<WhacanudoProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const { settings } = useAppStore();
  const role = settings?.role || 'Designer';
  const isServer = role === 'Server';

  const [activePrdTab, setActivePrdTab] = useState<'overview' | 'prd'>('overview');

  // Multi-lingual content dictionaries
  const dict: Record<string, any> = {
    en: {
      title: "What Can Forgel Do? (Whacanudo)",
      why_title: "Why Forgel Exists",
      why_text: "Forgel bridges the gap between AI generation and professional brand identity workflows. We don't just output random images; we forge persistent, real-time-collaborative brand operating systems.",
      how_title: "How To Use Forgel",
      how_steps: [
        "1. Feed the Forge: Input a clear business philosophy and target audience description.",
        "2. Shape and Polish: Fine-tune the SVG path coordinates in the Precision Canvas.",
        "3. Live Collaboration: Share your workspace and co-edit vectors with colleagues in real time.",
        "4. Brand Deployment: Instantly package assets into a unified ZIP suite or export professional PPTX presentations."
      ],
      features_title: "Core Brand Modules",
      use_cases_title: "Branding Use Cases",
      designer_note: "Standard User Access (Designer Role)",
      server_note: "Privileged Superuser Access (Server Role)",
      roles_desc: "You have superuser access. You can export detailed PRDs of each feature block below.",
      export_btn: "Export PRD to",
      features: [
        { name: "Real-time Collaboration", desc: "True server-authoritative CRDT WebSocket synchronization with visual mouse pointers and active co-editor trackers." },
        { name: "Offscreen Vector Renderer", desc: "Background Web Workers to render ultra-high resolution PNG vectors and calculate performance benchmarks." },
        { name: "SVG Precision Editor", desc: "Interactive node coordinate manipulation and auto-simplification algorithms to compress assets." },
        { name: "Brand Deck Generator", desc: "Server-side presentation slide compiles for client pitch presentations, containing brand boards and typography specifications." },
        { name: "Contrast Guard", desc: "Automated mathematical relative luminance compliance scoring to ensure WCAG AA/AAA visibility pass." }
      ],
      use_cases: [
        "Startup Launcher: Auto-populate templates like Volt Cybernetics to draft logos and guidelines in under 60 seconds.",
        "Agency Proofing: Create client-facing presentations and sync live modifications while on preview calls.",
        "Accessibility Auditing: Validate typography and contrast ranges against W3C accessibility laws before going public."
      ]
    },
    fr: {
      title: "Que peut faire Forgel ? (Whacanudo)",
      why_title: "Pourquoi Forgel existe",
      why_text: "Forgel comble le fossé entre la génération d'IA et les flux de travail professionnels d'identité de marque. Nous créons des systèmes d'exploitation de marque persistants et collaboratifs en temps réel.",
      how_title: "Comment utiliser Forgel",
      how_steps: [
        "1. Alimentez la Forge : Saisissez une philosophie d'entreprise claire et une description de l'audience.",
        "2. Affinez : Ajustez les coordonnées des chemins SVG dans le canevas de précision.",
        "3. Collaboration en Direct : Partagez votre espace de travail et co-éditez des vecteurs en temps réel.",
        "4. Déploiement : Enregistrez vos actifs dans une archive ZIP ou exportez des présentations PPTX."
      ],
      features_title: "Modules Principaux",
      use_cases_title: "Cas d'Utilisation",
      designer_note: "Accès Utilisateur Standard (Rôle Designer)",
      server_note: "Accès Super-utilisateur Privilégié (Rôle Serveur)",
      roles_desc: "Vous disposez d'un accès administrateur complet. Vous pouvez exporter des PRD détaillés de chaque fonctionnalité.",
      export_btn: "Exporter le PRD en",
      features: [
        { name: "Collaboration en Temps Réel", desc: "Synchronisation WebSocket avec pointeurs de souris visuels et suivi des éditeurs actifs." },
        { name: "Rendu Vectoriel d'Arrière-plan", desc: "Web Workers d'arrière-plan pour le rendu de vecteurs PNG haute résolution." },
        { name: "Éditeur de Canevas SVG", desc: "Manipulation des coordonnées des nœuds et algorithmes d'auto-simplification." },
        { name: "Générateur de Présentations PPTX", desc: "Compilation de diapositives de marque côté serveur pour les présentations clients." },
        { name: "Garde de Contraste", desc: "Évaluation de la conformité de luminance relative WCAG AA/AAA." }
      ],
      use_cases: [
        "Lancement de Startup : Générez des logos et des guides de marque complets en moins de 60 secondes.",
        "Validation en Agence : Créez des présentations et synchronisez les commentaires des clients en direct.",
        "Audit d'Accessibilité : Validez les contrastes de couleurs avant le déploiement public."
      ]
    },
    ar: {
      title: "ماذا يمكن أن تفعل Forgel؟ (Whacanudo)",
      why_title: "لماذا Forgel موجودة",
      why_text: "تجمع Forgel بين الذكاء الاصطناعي التوليدي وسير العمل المهني للهوية التجارية، لتقديم نظام تشغيل متكامل للعلامات التجارية.",
      how_title: "كيفية استخدام Forgel",
      how_steps: [
        "1. تغذية الاستوديو: أدخل وصفاً واضحاً لفلسفة شركتك والجمهور المستهدف.",
        "2. تحسين التفاصيل: قم بتعديل مسارات SVG في لوحة التحكم الدقيقة.",
        "3. التعاون الحي: شارك رابط المشروع للعمل المشترك وتعديل المتجهات مع زملائك في الوقت الفعلي.",
        "4. تصدير الأصول: قم بتجميع الهوية في ملف ZIP واحد أو إنشاء عروض PPTX احترافية."
      ],
      features_title: "الوحدات الأساسية للعلامة التجارية",
      use_cases_title: "حالات الاستخدام العملي",
      designer_note: "وصول قياسي للمستخدم (دور مصمم)",
      server_note: "وصول مميز للمسؤول (دور خادم)",
      roles_desc: "لديك صلاحيات المسؤول الفائق. يمكنك تصدير مستندات متطلبات المنتج (PRDs) التفصيلية.",
      export_btn: "تصدير مستند PRD بصيغة",
      features: [
        { name: "التعاون الفوري في الوقت الفعلي", desc: "مزامنة وثيقة عبر WebSocket مع مؤشرات الماوس المرئية للأعضاء النشطين." },
        { name: "معالج الرسوميات غير المرئي", desc: "استخدام Web Workers لمعالجة وتصدير متجهات عالية الدقة بدون أي تأخير." },
        { name: "محرر مسار SVG الدقيق", desc: "التحكم المباشر في إحداثيات النقاط والتبسيط التلقائي للمتجهات." },
        { name: "منشئ العروض التقديمية PPTX", desc: "توليد ملفات PowerPoint تفصيلية للهويات التجارية على الخادم." },
        { name: "مدقق التباين وسهولة الوصول", desc: "حساب دقيق لنسبة تباين الألوان للتوافق التام مع معايير W3C WCAG AA/AAA." }
      ],
      use_cases: [
        "إطلاق المشاريع السريعة: إنشاء شعار متكامل ودليل هوية كامل في أقل من 60 ثانية.",
        "مراجعة الوكالات الإبداعية: تعديل ومزامنة التغييرات مباشرة أثناء مكالمات المعاينة مع العملاء.",
        "تدقيق سهولة الوصول: التأكد من تباين الألوان ومقروئية الخطوط ومطابقة القوانين الرقمية العالمية."
      ]
    }
  };

  const baseLang = i18n.language ? i18n.language.split('-')[0] : 'en';
  const c = dict[baseLang] || dict.en;

  // Comprehensive PRD Data
  interface Feature {
    id: string;
    name: string;
    desc: string;
    filesUsed: string[];
    details: string;
    subFeatures?: Feature[];
  }

  const getPRDContent = () => {
    const features: Feature[] = [
      {
        id: "1.0",
        name: "STATE MANAGEMENT",
        desc: "Canonical document schema and local synchronization.",
        filesUsed: ["src/App.tsx", "src/types.ts", "src/components/SVGPathEditor.tsx"],
        details: "Uses React useState and useEffect for local state. SVG editor updates state via updatePathAtIndex."
      },
      {
        id: "2.0",
        name: "SVG PRECISION EDITOR",
        desc: "Interactive node coordinate manipulation and auto-simplification algorithms.",
        filesUsed: ["src/components/SVGPathEditor.tsx"],
        details: "Implements touch gesture handlers, debounced node updates, and keyboard accessibility for point navigation."
      },
      {
        id: "3.0",
        name: "HELP & ROLE INFORMATION",
        desc: "System documentation and feature overview.",
        filesUsed: ["src/components/Whacanudo.tsx"],
        details: "Generates the PRD and documentation dynamically based on feature list."
      },
      {
        id: "4.0",
        name: "EXPORT PIPELINE",
        desc: "Multi-format asset and documentation export.",
        filesUsed: ["src/components/Whacanudo.tsx"],
        details: "Handles conversion of internal state and documentation to various file formats (md, json, etc.)"
      }
    ];

    const formatFeature = (f: Feature, indent: number = 0): string => {
      const pad = "  ".repeat(indent);
      let res = `${pad}${f.id} ${f.name}\n`;
      res += `${pad}   - Description: ${f.desc}\n`;
      res += `${pad}   - Files Used: ${f.filesUsed.join(', ')}\n`;
      res += `${pad}   - Details: ${f.details}\n`;
      if (f.subFeatures) {
        f.subFeatures.forEach(sf => res += formatFeature(sf, indent + 2));
      }
      return res;
    };

    let content = `=====================================================
PRODUCT REQUIREMENTS DOCUMENT (PRD) - FORGEL PLATFORM
=====================================================
Document Classification: SERVER-CONFIDENTIAL-SUPERUSER
Version: 1.5.0-STABLE
Author: Forgel Core Engineering Group

FEATURES DETAILED MATRIX:
-------------------------
${features.map(f => formatFeature(f)).join('\n')}
`;
    return content;
  };

  const detailedPRD = getPRDContent();

  // Export PRD files in various formats
  const handleExportPRD = (format: 'md' | 'json' | 'csv' | 'yaml' | 'xml') => {
    let content = '';
    let mimeType = 'text/plain';
    let fileExtension = format;

    if (format === 'md') {
      content = `# FORGEL SPECIFICATIONS (PRD)\n\n${detailedPRD}`;
      mimeType = 'text/markdown';
    } else if (format === 'json') {
      content = JSON.stringify({
        classification: "SERVER-CONFIDENTIAL",
        title: "Forgel Product Specifications",
        prd: detailedPRD.split('\n')
      }, null, 2);
      mimeType = 'application/json';
    } else if (format === 'csv') {
      content = "Section,Description\n" +
        "\"1. Schema\",\"Canonical state representation and local IndexedDB\"\n" +
        "\"2. Sync\",\"Real-time WebSocket connection on port 3000 with cursor presence\"\n" +
        "\"3. Worker\",\"Background Web Workers rendering PNG under 16ms frame-time\"\n" +
        "\"4. PPTX\",\"Server-side deck compiled utilizing Node process\"";
      mimeType = 'text/csv';
    } else if (format === 'yaml') {
      content = `classification: SERVER-CONFIDENTIAL\nplatform: Forgel\nspecs:\n  schema: Canonical IndexedDB\n  collab: WebSocket CRDT\n  performance: Web Worker rendering\n  exports: PPTX/ZIP`;
      mimeType = 'text/yaml';
      fileExtension = 'yaml';
    } else if (format === 'xml') {
      content = `<prd><classification>SERVER-CONFIDENTIAL</classification><title>Forgel Spec Sheet</title><features><feature name="CRDT">WebSocket sync</feature><feature name="Worker">Background offscreen render</feature></features></prd>`;
      mimeType = 'application/xml';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forgel_prd_specification.${fileExtension}`;
    a.click();
  };

  const isRTL = baseLang === 'ar';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      titleId="whacanudo-title"
      className="max-w-2xl max-h-[85dvh]"
      hideCloseButton={true}
    >
      <div dir={isRTL ? 'rtl' : 'ltr'} className="flex flex-col h-full">
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-zinc-800 flex justify-between items-center bg-neutral-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <Sparkles className="text-amber-500 shrink-0" size={24} />
            <div>
              <h3 id="whacanudo-title" className="text-lg font-bold text-neutral-900 dark:text-white">{c.title}</h3>
              <p className="text-xs text-neutral-500">
                {isServer ? c.server_note : c.designer_note}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-800 dark:hover:text-white text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Tabs for Server role */}
        {isServer && (
          <div className="flex bg-neutral-100 dark:bg-zinc-800 border-b border-neutral-200 dark:border-zinc-800 shrink-0">
            <button
              onClick={() => setActivePrdTab('overview')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activePrdTab === 'overview' ? 'border-brand-lead text-brand-lead dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-zinc-900' : 'border-transparent text-neutral-500'}`}
            >
              Interactive Overview
            </button>
            <button
              onClick={() => setActivePrdTab('prd')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${activePrdTab === 'prd' ? 'border-brand-lead text-brand-lead dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-zinc-900' : 'border-transparent text-neutral-500'}`}
            >
              Detailed PRD specifications
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {(!isServer || activePrdTab === 'overview') ? (
            <>
              {/* Mission Statement */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{c.why_title}</h4>
                <p className="text-sm text-neutral-600 dark:text-zinc-300 leading-relaxed bg-neutral-50 dark:bg-zinc-950 p-4 rounded-2xl border border-neutral-100 dark:border-zinc-900">
                  {c.why_text}
                </p>
              </div>

              {/* Core Features */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{c.features_title}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {c.features.map((feat: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-2xl border border-neutral-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                      <h5 className="text-xs font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        {feat.name}
                      </h5>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How To Steps */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{c.how_title}</h4>
                <div className="space-y-1.5">
                  {c.how_steps.map((step: string, idx: number) => (
                    <p key={idx} className="text-xs text-neutral-600 dark:text-zinc-400">
                      {step}
                    </p>
                  ))}
                </div>
              </div>

              {/* Use Cases */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{c.use_cases_title}</h4>
                <div className="space-y-2">
                  {c.use_cases.map((use: string, idx: number) => (
                    <div key={idx} className="text-xs p-3 bg-indigo-50/30 dark:bg-indigo-950/20 text-neutral-700 dark:text-zinc-300 rounded-xl border border-indigo-100/30">
                      {use}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Privileged Server PRD View */
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-start gap-3">
                <Shield className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider block">Superuser Configuration Center</span>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 leading-normal">{c.roles_desc}</p>
                </div>
              </div>

              {/* Export PRD buttons bar */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block">Export Raw Spec Sheets</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'md', label: 'Markdown (.md)' },
                    { key: 'json', label: 'JSON (.json)' },
                    { key: 'csv', label: 'CSV (.csv)' },
                    { key: 'yaml', label: 'YAML (.yaml)' },
                    { key: 'xml', label: 'XML (.xml)' }
                  ].map((format) => (
                    <button
                      key={format.key}
                      onClick={() => handleExportPRD(format.key as any)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100 text-white rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer"
                    >
                      <Download size={12} />
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PRD Text Block */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block">Product Specifications Sheet Preview</span>
                <pre className="p-4 bg-zinc-950 text-emerald-400 font-mono text-[10px] leading-relaxed rounded-2xl overflow-x-auto custom-scrollbar border border-zinc-800 select-all max-h-72">
                  {detailedPRD}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-zinc-900 border-t border-neutral-200 dark:border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

