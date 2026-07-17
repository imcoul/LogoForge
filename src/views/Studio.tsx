import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import DOMPurify from 'dompurify';
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Palette,
  Download,
  Move,
  Upload,
  BookOpen,
  Image as ImageIcon,
  ChevronRight,
  FolderArchive,
  MessageSquare,
  FileText,
  Music,
  Plus,
  Trash2,
  Globe,
  Layers,
  Check,
  CheckCircle,
  Info,
  Terminal,
  Lock,
  Unlock,
  Copy,
  Target,
  Users,
  X,
  Loader2,
  Send,
} from 'lucide-react';

import { useStudioHandlers, StudioTab, WorkspaceType } from './StudioHandlers';
import { useAppStore, Project } from '../store';
import { AccessibilityScore } from '../components/AccessibilityScore';
import { TemplateLibrary } from '../components/TemplateLibrary';
import { SVGPathEditor } from '../components/SVGPathEditor';
import { WhiteboardCanvas } from '../components/WhiteboardCanvas';
import { InteractiveMockupViewer } from '../components/InteractiveMockupViewer';
import { TouchGesturesHelp } from '../components/TouchGesturesHelp';
import { VectorizePreviewModal } from '../components/VectorizePreviewModal';
import { Sheet } from '../components/Sheet';
import { StudioControls } from '../components/StudioControls';
import { KeyboardManager } from '../components/KeyboardManager';

const sanitizeSVG = (svg: string | null): string => {
  if (!svg) return '';
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['style'],
  });
};

const ANIMATIONS = {
  float: { animate: { y: [0, -15, 0] }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const } },
  pulse: {
    animate: { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] },
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const },
  },
  spin: { animate: { rotate: 360 }, transition: { duration: 8, repeat: Infinity, ease: 'linear' as const } },
  pop: {
    animate: { scale: [0.8, 1.1, 1] },
    transition: { duration: 0.5, type: 'spring' as const, bounce: 0.6, repeat: Infinity, repeatDelay: 1 },
  },
  flip: { animate: { rotateY: 360 }, transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const, repeatDelay: 1 } },
};

type AnimationType = keyof typeof ANIMATIONS;

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
      tip: 'Avoid ultra-thin lines, intricate patterns, or tiny secondary text. Try viewing the design as a small browser tab icon.',
    },
    {
      id: 'contrast',
      label: 'High Contrast',
      desc: 'Passes WCAG AA contrast ratio (at least 4.5:1) against primary backgrounds.',
      tip: 'Check your foreground and background color hex codes. Adjust shades or values to maximize distinction.',
    },
    {
      id: 'monochrome',
      label: 'Monochrome Readability',
      desc: 'Design holds up perfectly in pure black and pure white.',
      tip: 'Do not rely entirely on color hue to separate elements. Ensure overlapping elements have distinct light/dark value contrasts.',
    },
    {
      id: 'balance',
      label: 'Visual Balance',
      desc: 'Optical weight is balanced; no single element overpowers the composition.',
      tip: 'Try squinting or blurring your vision. If one element or area pops out disproportionately, adjust scale or spacing.',
    },
    {
      id: 'simplicity',
      label: 'Simplicity',
      desc: 'Removes unnecessary details to remain memorable and easy to reproduce.',
      tip: 'Experiment with removing single lines or decoration details. If the brand message still carries, leave them out.',
    },
  ];

  const toggleCheck = (id: string) => setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  const resetChecks = () => setChecks({});
  const hasChecks = Object.values(checks).some((checked) => checked);

  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-sm border border-neutral-200 dark:border-zinc-800 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-xl font-bold font-display flex items-center gap-2">
          <CheckCircle size={20} className="text-brand-lead" /> Design Best Practices
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
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 dark:border-zinc-800 hover:border-brand-lead transition-colors cursor-pointer"
            onClick={() => toggleCheck(item.id)}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  checks[item.id] ? 'bg-brand-lead border-brand-lead text-white' : 'border-neutral-300 dark:border-zinc-700'
                }`}
              >
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
      audioRef.current.play().catch((err) => console.error(err));
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
          {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:
          {(Math.floor(duration % 60)).toString().padStart(2, '0')}
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

        <div className="flex-1 flex items-center gap-1 h-10 overflow-hidden px-1">
          {Array.from({ length: 24 }).map((_, i) => {
            const baseHeight = 12 + Math.sin(i * 0.5) * 8;
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

interface StudioViewProps {
  setView: (view: 'dashboard' | 'studio' | 'course' | 'settings') => void;
  isDarkMode: boolean;
  setIsDarkMode: (darkMode: boolean) => void;
}

export function Studio({ setView, isDarkMode, setIsDarkMode }: StudioViewProps) {
  const { t } = useTranslation();
  const state = useStudioHandlers();

  const {
    activeProject,
    activeProjectId,
    mode,
    setMode,
    description,
    setDescription,
    isGenerating,
    isGeneratingVariation,
    isGeneratingGuide,
    isRefining,
    isGeneratingSonic,
    rationale,
    isGeneratingRationale,
    isR2VModalOpen,
    setIsR2VModalOpen,
    synthWaveType,
    setSynthWaveType,
    synthADSR,
    setSynthADSR,
    isSynthPlaying,
    synthRippleIntensity,
    activeWorkspace,
    setActiveWorkspace,
    sandboxSubTab,
    setSandboxSubTab,
    workbenchSubTab,
    setWorkbenchSubTab,
    identitySubTab,
    setIdentitySubTab,
    strategySubTab,
    setStrategySubTab,
    activeTab,
    setActiveTab,
    isCollabDrawerOpen,
    setIsCollabDrawerOpen,
    brandName,
    setBrandName,
    industry,
    setIndustry,
    creativeDirection,
    setCreativeDirection,
    error,
    socket,
    activeUsers,
    remoteCursors,
    username,
    saveLatencyMs,
    isSaving,
    worker,
    benchmarkResult,
    newSnapshotName,
    setNewSnapshotName,
    isAddingSticky,
    setIsAddingSticky,
    stickyNoteText,
    setStickyNoteText,
    selectedStickyColor,
    setSelectedStickyColor,
    competitorNameInput,
    setCompetitorNameInput,
    competitorLogoUrlInput,
    setCompetitorLogoUrlInput,
    isAnalyzingCompetitor,
    ecosystemAssetType,
    setEcosystemAssetType,
    isGeneratingEcosystem,
    fullscreen,
    setFullscreen,
    criticRole,
    setCriticRole,
    isCriticLoading,
    setIsCriticLoading,
    commentText,
    setCommentText,
    copiedColorHex,
    mockupTab,
    setMockupTab,
    selectedTemplate,
    setSelectedTemplate,
    cardBg,
    setCardBg,
    mockupRotateX,
    setMockupRotateX,
    mockupRotateY,
    setMockupRotateY,
    mockupRotateZ,
    setMockupRotateZ,
    mockupScale,
    setMockupScale,
    mockupPerspective,
    setMockupPerspective,
    mockupBlendMode,
    setMockupBlendMode,

    fileInputRef,
    refineInputRef,
    sonicInputRef,
    cursorRafRef,

    handleUpdateAndSync,
    handleUndoLogo,
    playBrandMelody,
    applySynthPreset,
    handleGenerateLogo,
    handleGenerateVariation,
    handleGenerateGuide,
    handleRefineUpload,
    applyRefinedPrompt,
    handleSonicUpload,
    handleAnalyzeCompetitor,
    handleGenerateEcosystem,
    handleMockupUpload,
    handleGenerateRationale,
    handleDownloadSVG,
    handleCopyColor,
    handleDownloadBrandGuide,
  } = state;

  const currentAnim = ANIMATIONS[activeProject?.stage === 'discovery' ? 'float' : 'pulse'];

  return (
    <>
      <KeyboardManager
        onSave={() => {
          if (activeProject) {
            handleUpdateAndSync({});
          }
        }}
        onUndo={handleUndoLogo}
        onRedo={() => console.log('Keyboard redo: Already latest revision.')}
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

      <div className="min-h-screen bg-neutral-100 dark:bg-zinc-950 text-neutral-800 dark:text-zinc-200 flex flex-col md:pl-24 transition-colors duration-300">
        <header className="px-6 py-5 md:px-12 flex justify-between items-center border-b border-neutral-200/50 dark:border-zinc-900 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Studio Workspace</span>
            {activeProject && (
              <span className="px-3 py-1 bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-zinc-800 text-xs font-bold rounded-full">
                {activeProject.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Live Collaboration Signal & Connection Status Pill */}
            <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-1 px-2.5 rounded-full select-none">
              {/* Connection Status Dot */}
              <div className="flex items-center gap-1.5 border-r border-neutral-200 dark:border-zinc-850 pr-2.5">
                <span className={`w-1.5 h-1.5 rounded-full ${socket && socket.readyState === WebSocket.OPEN ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-zinc-400 uppercase tracking-wider">
                  {socket && socket.readyState === WebSocket.OPEN ? 'Live' : 'Cloud'}
                </span>
              </div>
              
              {/* Co-editors counter */}
              <button
                onClick={() => setIsCollabDrawerOpen(true)}
                className="flex items-center gap-1 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer text-neutral-600 dark:text-zinc-300"
              >
                <Users size={11} />
                <span className="text-[10px] font-mono font-bold uppercase">
                  {activeUsers.length > 0 ? `${activeUsers.length} Online` : 'Solo'}
                </span>
              </button>
            </div>

            {/* Autosave Telemetry Display */}
            <div className="text-right shrink-0 hidden sm:block">
              {isSaving ? (
                <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1.5">
                  <RefreshCw size={10} className="animate-spin" /> Saving changes...
                </span>
              ) : saveLatencyMs !== null ? (
                <span className="text-[10px] text-neutral-400 font-mono">Autosaved ({saveLatencyMs}ms)</span>
              ) : (
                <span className="text-[10px] text-neutral-400 font-mono">Ready</span>
              )}
            </div>

            <button
              onClick={() => setView('dashboard')}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Exit Studio
            </button>
          </div>
        </header>

        {/* Workspace Quick Navigator */}
        <div className="px-6 py-4 md:px-12 bg-white/40 dark:bg-zinc-950/20 border-b border-neutral-200/40 dark:border-zinc-900 flex gap-2.5 overflow-x-auto select-none no-scrollbar">
          {[
            { id: 'sandbox', label: '1. Brand Sandbox 🎨', desc: 'Creative synthesis' },
            { id: 'workbench', label: '2. Drawing Board 📐', desc: 'Node coordinates' },
            { id: 'identity', label: '3. Identity Guideline 📖', desc: 'Compliance' },
            { id: 'strategy', label: '4. Strategy Hub 🎯', desc: 'Competitor engine' },
          ].map((ws) => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id as WorkspaceType)}
              className={`px-5 py-3 rounded-2xl transition-all cursor-pointer text-left shrink-0 border ${
                activeWorkspace === ws.id
                  ? 'bg-neutral-900 text-white border-transparent dark:bg-white dark:text-black shadow-md'
                  : 'bg-white dark:bg-zinc-900 text-neutral-500 dark:text-zinc-400 border-neutral-200/50 dark:border-zinc-800/80 hover:bg-neutral-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="block text-xs font-bold uppercase tracking-wider">{ws.label}</span>
              <span className={`block text-[10px] mt-0.5 opacity-75`}>{ws.desc}</span>
            </button>
          ))}
        </div>

        <main className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            {!activeProject ? (
              <motion.div
                key="no-project"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="max-w-md bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 space-y-6">
                  <Wand2 className="w-16 h-16 text-indigo-500 mx-auto animate-bounce" />
                  <h2 className="text-2xl font-bold font-display">No Active Project</h2>
                  <p className="text-sm text-neutral-500">Please select or create a project on the dashboard to access the design Studio workspace.</p>
                  <button
                    onClick={() => setView('dashboard')}
                    className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </motion.div>
            ) : activeWorkspace === 'sandbox' ? (
              /* --- WORKSPACE 1: BRAND SANDBOX --- */
              <motion.div
                key="brand-sandbox"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight">Brand Sandbox</h2>
                    <p className="text-sm text-neutral-500">Synthesize prompts, evaluate variants, and write master specifications</p>
                  </div>
                  <div className="flex bg-neutral-200 dark:bg-zinc-800 p-1 rounded-xl">
                    {[
                      { id: 'preview', label: 'Generator' },
                      { id: 'prompt', label: 'Upload' },
                      { id: 'rationales', label: 'Rationale' },
                      { id: 'critic', label: 'AI Critic' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSandboxSubTab(tab.id as any)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          sandboxSubTab === tab.id
                            ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white'
                            : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {sandboxSubTab === 'preview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Left Panel: Inputs */}
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-500">Master Prompt Description</label>
                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe your brand identity, e.g., 'A modern minimalist geometric line-art logo for a wellness organic spa company, featuring a delicate lotus shape, serene sage green and gold accents.'"
                            className="w-full h-36 bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleGenerateLogo}
                          disabled={isGenerating || !description.trim()}
                          className="flex-1 py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 size={16} />}
                          <span>Generate Identity</span>
                        </button>
                      </div>

                      {error && <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl">{error}</div>}
                    </div>

                    {/* Right Panel: Canvas & Variations */}
                    <div className="lg:col-span-3 space-y-6">
                      <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[420px] shadow-sm relative group overflow-hidden">
                        {isGenerating ? (
                          <div className="flex flex-col items-center gap-3.5 text-center">
                            <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
                            <p className="text-sm font-bold uppercase tracking-wider text-indigo-500 animate-pulse">Forging visual nodes...</p>
                          </div>
                        ) : activeProject.logoUrl ? (
                          <div className="flex flex-col items-center gap-6 w-full">
                            <motion.div {...currentAnim} className="w-64 h-64 bg-neutral-50 dark:bg-zinc-950 border border-neutral-100 dark:border-zinc-900 rounded-3xl p-6 shadow-inner flex items-center justify-center">
                              <img src={activeProject.logoUrl} className="max-w-full max-h-full object-contain" />
                            </motion.div>
                            <div className="flex gap-2.5">
                              <button
                                onClick={handleGenerateVariation}
                                disabled={isGeneratingVariation}
                                className="px-5 py-2.5 bg-neutral-50 dark:bg-zinc-800 hover:bg-neutral-100 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-neutral-200 dark:border-zinc-700 flex items-center gap-2 cursor-pointer"
                              >
                                {isGeneratingVariation ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Sparkles size={14} />}
                                <span>Iterate Variant</span>
                              </button>
                              <button
                                onClick={handleGenerateGuide}
                                disabled={isGeneratingGuide}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                              >
                                {isGeneratingGuide ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <BookOpen size={14} />}
                                <span>Assemble Brand Guide</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center space-y-4">
                            <Wand2 className="w-16 h-16 mx-auto text-neutral-300 dark:text-zinc-800 animate-pulse" />
                            <h3 className="font-bold text-lg">Identity Awaiting Forging</h3>
                            <p className="text-xs text-neutral-500 max-w-xs">Write your brand specifications on the left to initiate model rendering.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {sandboxSubTab === 'prompt' && (
                  <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Upload Context Image</h3>
                    <p className="text-sm text-neutral-500 mb-6">Import external brand assets, sketch uploads, or existing vector guides to kick off your Studio canvas.</p>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-3xl p-12 text-center hover:border-indigo-500 hover:text-indigo-500 transition-colors bg-neutral-50 dark:bg-zinc-950 cursor-pointer"
                    >
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const r = new FileReader();
                          r.onload = (ev) => {
                            handleUpdateAndSync({ logoUrl: ev.target?.result as string, logoMimeType: file.type });
                            setSandboxSubTab('preview');
                          };
                          r.readAsDataURL(file);
                        }
                      }} />
                      <Upload className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
                      <span className="font-bold uppercase tracking-wider text-xs">Choose or Drop Image</span>
                      <span className="block text-[10px] text-neutral-400 mt-1">PNG, JPEG up to 10MB</span>
                    </div>
                  </div>
                )}

                {sandboxSubTab === 'rationales' && (
                  <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-neutral-100 dark:border-zinc-800 pb-4">
                      <h3 className="text-xl font-bold font-display">Semantic Rationale</h3>
                      <button
                        onClick={handleGenerateRationale}
                        disabled={isGeneratingRationale}
                        className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                      >
                        {isGeneratingRationale ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : <Wand2 size={14} />}
                        <span>Synthesize Rationale</span>
                      </button>
                    </div>

                    {rationale ? (
                      <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-serif">
                        {rationale}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-neutral-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-bold">No Rationale Compiled</p>
                        <p className="text-xs opacity-75">Click synthesize to let Gemini draft a professional brand presentation.</p>
                      </div>
                    )}
                  </div>
                )}

                {sandboxSubTab === 'critic' && (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Critic Input */}
                    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
                      <h3 className="text-lg font-bold font-display">Aesthetic Auditor</h3>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-500">Critic persona</label>
                        <select
                          value={criticRole}
                          onChange={(e) => setCriticRole(e.target.value)}
                          className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm cursor-pointer"
                        >
                          <option>Senior Art Director 🎨</option>
                          <option>Corporate Branding Strategist 📊</option>
                          <option>Modern Typographer & Illustrator 📐</option>
                        </select>
                      </div>

                      <button
                        onClick={async () => {
                          if (!activeProject) return;
                          setIsCriticLoading(true);
                          try {
                            const res = await handleUpdateAndSync({ comments: [] }); // simple triggers can go here
                          } finally {
                            setIsCriticLoading(false);
                          }
                        }}
                        className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 dark:bg-white text-white dark:text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isCriticLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <MessageSquare size={16} />}
                        Audit Composition
                      </button>
                    </div>

                    {/* Right Comments */}
                    <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-lg font-bold font-display">Aesthetic Notes</h3>
                      <div className="space-y-3.5 max-h-72 overflow-y-auto">
                        {activeProject.comments && activeProject.comments.length > 0 ? (
                          activeProject.comments.map((cmt) => (
                            <div key={cmt.id} className="p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-100 dark:border-zinc-800">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{cmt.author}</span>
                                <span className="text-[10px] text-neutral-400 font-mono">{new Date(cmt.timestamp).toLocaleTimeString()}</span>
                              </div>
                              <p className="text-sm text-neutral-700 dark:text-zinc-300 leading-normal">{cmt.text}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-neutral-400">No audits recorded yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : activeWorkspace === 'workbench' ? (
              /* --- WORKSPACE 2: DRAWING BOARD --- */
              <motion.div
                key="drawing-board"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight">Drawing Workbench</h2>
                    <p className="text-sm text-neutral-500">Edit raw coordinate nodes, manage snapshots, and synchronize revisions</p>
                  </div>
                  <div className="flex bg-neutral-200 dark:bg-zinc-800 p-1 rounded-xl">
                    {[
                      { id: 'sketch', label: 'Whiteboard' },
                      { id: 'precision', label: 'Precision Studio' },
                      { id: 'versions', label: 'Snapshots' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setWorkbenchSubTab(tab.id as any)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          workbenchSubTab === tab.id
                            ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white'
                            : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {workbenchSubTab === 'sketch' && (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-neutral-200 dark:border-zinc-800">
                    <WhiteboardCanvas fullscreen={fullscreen} setFullscreen={setFullscreen} />
                  </div>
                )}

                {workbenchSubTab === 'precision' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: SVG Canvas Workspace */}
                    <div className="lg:col-span-2 space-y-6">
                      <div
                        className="relative aspect-square w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-3xl flex items-center justify-center p-12 overflow-hidden shadow-inner cursor-crosshair"
                        onMouseMove={(e) => {
                          if (!socket || socket.readyState !== WebSocket.OPEN) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = ((e.clientX - rect.left) / rect.width) * 100;
                          const y = ((e.clientY - rect.top) / rect.height) * 100;
                          if (cursorRafRef.current) cancelAnimationFrame(cursorRafRef.current);
                          cursorRafRef.current = requestAnimationFrame(() => {
                            socket.send(
                              JSON.stringify({
                                type: 'cursor',
                                username,
                                color: '#6366F1',
                                x,
                                y,
                              })
                            );
                          });
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
                            color: selectedStickyColor,
                          };

                          handleUpdateAndSync({
                            stickyNotes: [...(activeProject.stickyNotes || []), newNote],
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
                            <div key={uid} className="absolute pointer-events-none transition-all duration-75 z-40" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md animate-bounce" style={{ backgroundColor: c.color }} />
                              <span
                                className="text-[9px] text-white px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 block -mt-1 ml-2 shadow"
                                style={{ backgroundColor: c.color }}
                              >
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
                                  stickyNotes: (activeProject.stickyNotes || []).filter((n) => n.id !== note.id),
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

                      {/* WCAG Compliance grading */}
                      <AccessibilityScore
                        primaryColors={activeProject.brandGuide?.primaryColors || []}
                        bgColors={[
                          { hex: '#FFFFFF', name: 'Standard Light' },
                          { hex: '#09090B', name: 'Operating System Dark' },
                        ]}
                      />

                      {/* Interactive Template Auto-Populator */}
                      <TemplateLibrary activeProjectId={activeProjectId} onApplyTemplate={handleUpdateAndSync} />
                    </div>

                    {/* Right: Manual XML Code & SVG Node Coordinate Editor */}
                    <div className="space-y-6">
                      <SVGPathEditor
                        svgContent={activeProject.svgSource || ''}
                        onChange={(newSvg, throttleCloud) => handleUpdateAndSync({ svgSource: newSvg }, throttleCloud)}
                        fullscreen={fullscreen}
                        setFullscreen={setFullscreen}
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
                            className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                          />

                          <div className="flex items-center justify-between gap-2.5">
                            <div className="flex gap-2">
                              {['#FDE047', '#FDA4AF', '#86EFAC', '#93C5FD'].map((hex) => (
                                <button
                                  key={hex}
                                  onClick={() => setSelectedStickyColor(hex)}
                                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                                    selectedStickyColor === hex
                                      ? 'scale-125 border-neutral-800 dark:border-white ring-2 ring-indigo-500/20'
                                      : 'border-transparent'
                                  }`}
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
                    </div>
                  </div>
                )}

                {workbenchSubTab === 'versions' && (
                  <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold font-display">Version Snapshots</h3>
                        <p className="text-xs text-neutral-500">Instant coordinate state recovery points</p>
                      </div>
                    </div>

                    <div className="flex gap-2 max-w-md">
                      <input
                        type="text"
                        value={newSnapshotName}
                        onChange={(e) => setNewSnapshotName(e.target.value)}
                        placeholder="Snapshot name (e.g., Draft V1)"
                        className="flex-1 bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!activeProject) return;
                          const nextSnap = {
                            id: Math.random().toString(36).substring(7),
                            name: newSnapshotName || `Version ${new Date().toLocaleTimeString()}`,
                            timestamp: Date.now(),
                            svgSource: activeProject.svgSource || '',
                            logoUrl: activeProject.logoUrl || '',
                          };
                          handleUpdateAndSync({
                            snapshots: [...(activeProject.snapshots || []), nextSnap],
                          });
                          setNewSnapshotName('');
                        }}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                      >
                        Save
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {(activeProject.snapshots || []).length === 0 ? (
                        <p className="text-xs text-neutral-400 p-4">No versions saved yet.</p>
                      ) : (
                        (activeProject.snapshots || []).map((snap) => (
                          <div
                            key={snap.id}
                            className="flex justify-between items-center p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-100 dark:border-zinc-900"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-neutral-800 dark:text-zinc-200 block truncate">{snap.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono block">{new Date(snap.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <button
                              onClick={() =>
                                handleUpdateAndSync({
                                  svgSource: snap.svgSource,
                                  logoUrl: snap.logoUrl,
                                })
                              }
                              className="px-3.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-neutral-100 border border-neutral-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold uppercase transition-colors cursor-pointer animate-none"
                            >
                              Restore
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : activeWorkspace === 'identity' ? (
              /* --- WORKSPACE 3: BRAND IDENTITY --- */
              <motion.div
                key="brand-identity"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight">Identity & Guidelines</h2>
                    <p className="text-sm text-neutral-500">Configure corporate branding collateral, check color palettes, and audioscape</p>
                  </div>
                  <div className="flex bg-neutral-200 dark:bg-zinc-800 p-1 rounded-xl">
                    {[
                      { id: 'guidelines', label: 'Master Guide' },
                      { id: 'compliance', label: 'Mockups' },
                      { id: 'sonic', label: 'Audioscape' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setIdentitySubTab(tab.id as any)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          identitySubTab === tab.id
                            ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white'
                            : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {identitySubTab === 'guidelines' && (
                  <div className="space-y-6">
                    {activeProject.brandGuide ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* Primary Guidelines Markdown */}
                        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-neutral-200/50 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
                          <div className="flex justify-between items-center border-b border-neutral-100 dark:border-zinc-800 pb-4 mb-6">
                            <h3 className="text-xl font-bold font-display">{activeProject.brandGuide.brandName} Core Specs</h3>
                            <button
                              onClick={handleDownloadBrandGuide}
                              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <Download size={12} /> Guide.md
                            </button>
                          </div>

                          <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
                            <h4 className="font-bold text-base">Photography & Iconography</h4>
                            <p>{activeProject.brandGuide.photography}</p>
                            <p>{activeProject.brandGuide.iconography}</p>
                            <h4 className="font-bold text-base mt-6">Typography Rules</h4>
                            <p>Primary Font: {activeProject.brandGuide.typography.primaryFont}</p>
                            <p>Secondary Font: {activeProject.brandGuide.typography.secondaryFont}</p>
                            <p>{activeProject.brandGuide.typography.guidelines}</p>
                          </div>
                        </div>

                        {/* Visual Swatches */}
                        <div className="space-y-6">
                          {/* Color Grader panel */}
                          <div className="bg-white dark:bg-zinc-900 border border-neutral-200/50 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-400 mb-4">Color Grading Laboratory</h3>
                            <div className="grid grid-cols-2 gap-3.5">
                              {[
                                { id: 'warm', label: 'Sienna Warm 🍁' },
                                { id: 'cool', label: 'Nordic Cool ❄️' },
                                { id: 'brutalist', label: 'Brutalist High Contrast 🧱' },
                                { id: 'cinematic', label: 'Cinematic Twilight 🍿' },
                              ].map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => {
                                    if (!worker || !activeProject.brandGuide) return;
                                    const allColors = [
                                      ...activeProject.brandGuide.primaryColors.map((c) => ({ ...c, category: 'primary' })),
                                      ...activeProject.brandGuide.secondaryColors.map((c) => ({ ...c, category: 'secondary' })),
                                    ];
                                    worker.postMessage({
                                      type: 'GRADE_COLORS',
                                      payload: { colors: allColors, filterType: p.id },
                                    });
                                  }}
                                  className="p-3 bg-neutral-50 dark:bg-zinc-950 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition-all border border-neutral-100 dark:border-zinc-800 text-left"
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="bg-white dark:bg-zinc-900 border border-neutral-200/50 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-400">Primary Swatches</h3>
                            <div className="space-y-2.5">
                              {activeProject.brandGuide.primaryColors.map((c, i) => (
                                <div
                                  key={i}
                                  onClick={() => handleCopyColor(c.hex)}
                                  className="flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-100 dark:border-zinc-800 hover:border-indigo-500 transition-all cursor-pointer relative"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl shadow-inner border border-neutral-200" style={{ backgroundColor: c.hex }} />
                                    <div>
                                      <span className="font-bold text-xs text-neutral-800 dark:text-zinc-200 block">{c.name}</span>
                                      <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">{c.hex}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] bg-indigo-50 dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                    {c.usage}
                                  </span>
                                  {copiedColorHex === c.hex && (
                                    <span className="absolute inset-0 bg-neutral-900/90 text-white rounded-2xl flex items-center justify-center text-xs font-bold">
                                      Copied!
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-3xl p-12 text-center text-neutral-500">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="font-bold text-lg mb-2">No Guidelines Assembled</h3>
                        <p className="text-xs max-w-sm mx-auto mb-4">Go to the Generator tab in Sandbox first to compile model-driven guide documents.</p>
                      </div>
                    )}
                  </div>
                )}

                {identitySubTab === 'compliance' && (
                  <InteractiveMockupViewer
                    activeProject={activeProject}
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    cardBg={cardBg}
                    setCardBg={setCardBg}
                    mockupRotateX={mockupRotateX}
                    setMockupRotateX={setMockupRotateX}
                    mockupRotateY={mockupRotateY}
                    setMockupRotateY={setMockupRotateY}
                    mockupRotateZ={mockupRotateZ}
                    setMockupRotateZ={setMockupRotateZ}
                    mockupScale={mockupScale}
                    setMockupScale={setMockupScale}
                    mockupPerspective={mockupPerspective}
                    setMockupPerspective={setMockupPerspective}
                    mockupBlendMode={mockupBlendMode}
                    setMockupBlendMode={setMockupBlendMode}
                  />
                )}

                {identitySubTab === 'sonic' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Panel: Synth Audio Engine */}
                    <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 space-y-6 shadow-sm">
                      <div className="border-b border-neutral-100 dark:border-zinc-800 pb-4">
                        <h3 className="text-lg font-bold font-display">Acoustic Synth Presets</h3>
                        <p className="text-xs text-neutral-500">Configure modular synth properties to render corporate melodies.</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3.5">
                        {['bell', 'pad', 'retro'].map((p) => (
                          <button
                            key={p}
                            onClick={() => applySynthPreset(p as any)}
                            className="p-3 bg-neutral-50 dark:bg-zinc-950 hover:bg-neutral-100 rounded-xl text-xs font-bold transition-all border border-neutral-100 dark:border-zinc-800 cursor-pointer uppercase tracking-wider"
                          >
                            {p} Preset
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-500">Synth Oscillator Wave</label>
                          <select
                            value={synthWaveType}
                            onChange={(e) => setSynthWaveType(e.target.value as OscillatorType)}
                            className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm cursor-pointer"
                          >
                            <option value="sine">Sine (Polished & Soft)</option>
                            <option value="triangle">Triangle (Deep Warm Pad)</option>
                            <option value="sawtooth">Sawtooth (Cinematic Retro)</option>
                            <option value="square">Square (Brutalist Modern)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-500">ADSR Envelopes</label>
                          <div className="grid grid-cols-2 gap-4">
                            {['attack', 'decay', 'sustain', 'release'].map((k) => (
                              <div key={k}>
                                <label className="block text-[10px] text-neutral-400 uppercase font-bold mb-1">{k}</label>
                                <input
                                  type="range"
                                  min={k === 'sustain' ? 0 : 0.01}
                                  max={k === 'release' ? 3 : 1}
                                  step="0.05"
                                  value={(synthADSR as any)[k]}
                                  onChange={(e) => setSynthADSR((prev) => ({ ...prev, [k]: parseFloat(e.target.value) }))}
                                  className="w-full accent-indigo-600 cursor-pointer"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={playBrandMelody}
                        disabled={isSynthPlaying}
                        className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Music size={16} /> Play Corporate Chord
                      </button>
                    </div>

                    {/* Right Panel: Acoustic Uploads */}
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-sm space-y-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-neutral-400">Animal/Environmental Context</h3>
                        <div className="space-y-3">
                          {activeProject.sonicAssets.map((asset, i) => (
                            <CustomWaveformPlayer key={i} base64Data={asset.base64Data} name={asset.name} />
                          ))}
                        </div>
                        <input type="file" ref={sonicInputRef} className="hidden" onChange={handleSonicUpload} accept="audio/*" />
                        <button
                          onClick={() => sonicInputRef.current?.click()}
                          disabled={isGeneratingSonic}
                          className="w-full py-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-xl bg-neutral-50 dark:bg-zinc-900 hover:bg-indigo-50 hover:border-indigo-300 text-neutral-500 dark:text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <Upload className="w-6 h-6 text-neutral-400" />
                          <span className="font-bold uppercase tracking-wider text-xs">Import Ambient Environmental Clips</span>
                        </button>
                      </div>

                      {activeProject.sonicPhilosophy && (
                        <div className="bg-neutral-900 text-neutral-100 p-6 rounded-3xl shadow-sm border border-neutral-800 whitespace-pre-wrap font-serif leading-relaxed text-sm">
                          {activeProject.sonicPhilosophy}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* --- WORKSPACE 4: STRATEGY HUB --- */
              <motion.div
                key="strategy-hub"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-6 md:p-12 max-w-6xl mx-auto w-full space-y-8"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-3xl font-display font-bold tracking-tight">Competitor & Ecosystem</h2>
                    <p className="text-sm text-neutral-500">Perform rival brand intelligence and generate automated marketing collateral</p>
                  </div>
                  <div className="flex bg-neutral-200 dark:bg-zinc-800 p-1 rounded-xl">
                    {[
                      { id: 'rivals', label: 'Rival Intel' },
                      { id: 'ecosystem', label: 'Ecosystem Assets' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStrategySubTab(tab.id as any)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          strategySubTab === tab.id
                            ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white'
                            : 'text-neutral-500 dark:text-zinc-400 hover:text-black dark:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {strategySubTab === 'rivals' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-sm space-y-6">
                      <h3 className="font-bold text-lg">Analyze Rival Brand</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2">Competitor Name</label>
                          <input
                            type="text"
                            value={competitorNameInput}
                            onChange={(e) => setCompetitorNameInput(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none"
                            placeholder="e.g., Stripe, Nike, Apple"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2">Competitor Logo URL (Optional)</label>
                          <input
                            type="text"
                            value={competitorLogoUrlInput || ''}
                            onChange={(e) => setCompetitorLogoUrlInput(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none"
                            placeholder="https://..."
                          />
                        </div>

                        <button
                          onClick={handleAnalyzeCompetitor}
                          disabled={isAnalyzingCompetitor || !competitorNameInput}
                          className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {isAnalyzingCompetitor ? <RefreshCw className="animate-spin w-4 h-4" /> : <Target size={16} />}
                          Analyze Competitor
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {activeProject.competitorAnalysis ? (
                        <div className="bg-neutral-900 text-neutral-100 p-6 rounded-3xl border border-neutral-800 shadow-sm prose prose-invert max-w-none">
                          <h3 className="text-xl font-bold font-display mb-4 text-emerald-400">Strategic Rival Analysis</h3>
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">{activeProject.competitorAnalysis}</div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-3xl p-12 text-center text-neutral-500 flex flex-col justify-center items-center">
                          <Target className="w-16 h-16 opacity-50 mb-4" />
                          <p className="font-bold">No Rival Analysis Yet</p>
                          <p className="text-xs">Compile strategic brand comparisons using the left panel.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {strategySubTab === 'ecosystem' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-neutral-200 dark:border-zinc-800 shadow-sm space-y-6">
                      <h3 className="font-bold text-lg">Generate Marketing Collateral</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider mb-2">Asset Target Channel</label>
                          <select
                            value={ecosystemAssetType}
                            onChange={(e) => setEcosystemAssetType(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl p-3 focus:outline-none text-sm cursor-pointer"
                          >
                            <option value="Instagram Post Caption">Instagram Post</option>
                            <option value="Twitter Thread Hook">Twitter Thread Hook</option>
                            <option value="LinkedIn Post">LinkedIn Post</option>
                            <option value="Email Newsletter Intro">Newsletter Intro</option>
                            <option value="Website Hero Copy">Website Hero Copy</option>
                          </select>
                        </div>

                        <button
                          onClick={handleGenerateEcosystem}
                          disabled={isGeneratingEcosystem}
                          className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-black text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isGeneratingEcosystem ? <RefreshCw className="animate-spin w-4 h-4" /> : <Wand2 size={16} />}
                          Generate Asset
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                      {activeProject.ecosystemAssets && activeProject.ecosystemAssets.length > 0 ? (
                        activeProject.ecosystemAssets.map((asset, i) => (
                          <div
                            key={i}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-neutral-200 dark:border-zinc-800 shadow-sm relative group space-y-3.5"
                          >
                            <span className="inline-block px-2.5 py-1 bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-bold uppercase tracking-wider">
                              {asset.type}
                            </span>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{asset.content}</div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(asset.content);
                              }}
                              className="absolute top-4 right-4 p-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-zinc-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="border-2 border-dashed border-neutral-300 dark:border-zinc-800 rounded-3xl p-12 text-center text-neutral-500 flex flex-col justify-center items-center h-full">
                          <Globe className="w-16 h-16 opacity-50 mb-4" />
                          <p className="font-bold">No Ecosystem Assets Generated</p>
                          <p className="text-xs">Compile on-brand website hero copy or social channel captions using the guidelines.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Real-time Collaboration Side Drawer Overlay */}
      <AnimatePresence>
        {isCollabDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCollabDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-full max-w-sm h-full bg-white dark:bg-zinc-900 border-l border-neutral-200 dark:border-zinc-800 relative z-10 p-6 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-zinc-800 pb-4 mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Users className="text-indigo-500" size={18} />
                  <span className="font-bold text-sm">Active Session Collaborators</span>
                </div>
                <button
                  onClick={() => setIsCollabDrawerOpen(false)}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {activeUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-zinc-950 border border-neutral-100 dark:border-zinc-800 rounded-2xl">
                    <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shrink-0" style={{ backgroundColor: u.color }}>
                      <span className="text-[10px] font-bold text-white uppercase">{u.username.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block truncate">{u.username}</span>
                      <span className="text-[9px] text-neutral-400 block font-mono">{u.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
