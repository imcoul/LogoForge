import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  FileJson, 
  Send, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import { useAppStore, Project } from '../store';
import { 
  generateDesignTokens, 
  testFigmaConnection, 
  pushVariablesToFigma 
} from '../utils/figmaExport';
import { useToast } from './Toast';
import { Modal } from './ui/Modal';

interface FigmaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const FigmaExportModal: React.FC<FigmaExportModalProps> = ({ isOpen, onClose, project }) => {
  const { toast } = useToast();
  const { settings, updateSettings } = useAppStore();
  
  const [tokenFormat, setTokenFormat] = useState<'w3c' | 'tokens-studio'>('w3c');
  const [copied, setCopied] = useState(false);
  const [figmaToken, setFigmaToken] = useState(settings.figmaToken || '');
  const [figmaFileId, setFigmaFileId] = useState(settings.figmaFileId || '');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; name?: string; error?: string } | null>(null);
  
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFigmaToken(settings.figmaToken || '');
      setFigmaFileId(settings.figmaFileId || '');
      setTestResult(null);
      setPushResult(null);
    }
  }, [isOpen, settings]);

  if (!isOpen || !project) return null;

  const tokenJson = generateDesignTokens(project, tokenFormat);
  const jsonString = JSON.stringify(tokenJson, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast('Tokens copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast('Failed to copy tokens.', 'error');
    }
  };

  const handleSaveSettings = async () => {
    await updateSettings({
      figmaToken,
      figmaFileId
    });
    toast('Figma integration parameters saved locally.', 'success');
  };

  const handleTestConnection = async () => {
    if (!figmaToken) {
      toast('Please enter your Figma Personal Access Token first.', 'error');
      return;
    }
    if (!figmaFileId) {
      toast('Please enter your Figma File Key first.', 'error');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    // Save settings first
    await updateSettings({ figmaToken, figmaFileId });
    
    const result = await testFigmaConnection(figmaToken, figmaFileId);
    setTestResult(result);
    setIsTesting(false);
    
    if (result.success) {
      toast(`Successfully connected to Figma file: ${result.name}`, 'success');
    } else {
      toast(`Figma Connection Failed: ${result.error}`, 'error');
    }
  };

  const handlePushVariables = async () => {
    if (!figmaToken || !figmaFileId) {
      toast('Please save and verify your Figma connection first.', 'error');
      return;
    }

    setIsPushing(true);
    setPushResult(null);

    const result = await pushVariablesToFigma(figmaToken, figmaFileId, project);
    setPushResult(result);
    setIsPushing(false);

    if (result.success) {
      toast(result.message, 'success');
    } else {
      toast(result.message, 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      titleId="figma-export-title"
      className="max-w-4xl max-h-[90dvh]"
      hideCloseButton={true}
    >
      <div className="flex flex-col h-full">
        
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-zinc-900 flex items-center justify-between bg-neutral-50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-lead/10 rounded-xl flex items-center justify-center border border-brand-lead/20 text-brand-lead dark:text-purple-400">
              <FileJson size={20} />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                Figma Design Token Exporter
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full bg-[#40e0d0]/10 text-[#40e0d0] border border-[#40e0d0]/20">
                  Phase E
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Export your design system tokens and sync variables to Figma</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-full text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Direct Token Generation & Code Block */}
          <div className="lg:col-span-7 flex flex-col h-full min-h-[400px]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Design Tokens Schema
              </label>
              
              <div className="flex bg-neutral-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-neutral-200 dark:border-zinc-800">
                <button
                  onClick={() => setTokenFormat('w3c')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    tokenFormat === 'w3c'
                      ? 'bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white shadow-sm border border-neutral-200 dark:border-zinc-700'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  W3C Draft ($value)
                </button>
                <button
                  onClick={() => setTokenFormat('tokens-studio')}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    tokenFormat === 'tokens-studio'
                      ? 'bg-white dark:bg-zinc-800 text-neutral-900 dark:text-white shadow-sm border border-neutral-200 dark:border-zinc-700'
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Tokens Studio (value)
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-neutral-950 rounded-2xl border border-neutral-900 overflow-hidden flex flex-col shadow-inner">
              <div className="absolute top-3 right-3 z-10 flex gap-2">
                <button
                  onClick={handleCopy}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="flex-1 p-4 overflow-auto font-mono text-[11px] text-zinc-300 leading-relaxed select-all">
                {jsonString}
              </pre>
            </div>
            
            <div className="mt-3 flex items-start gap-2 p-3 bg-neutral-50 dark:bg-zinc-900/40 rounded-xl border border-neutral-200 dark:border-zinc-900/60 text-[11px] text-neutral-500">
              <HelpCircle size={14} className="shrink-0 text-[#40e0d0] mt-0.5" />
              <p>
                <strong>Import Instructions:</strong> Copy this JSON and use plugins like <em>Tokens Studio for Figma</em> or <em>Design Tokens</em> inside Figma to automatically build variables, styles, and asset directories instantly!
              </p>
            </div>
          </div>

          {/* Right Column: Figma Live API Sync */}
          <div className="lg:col-span-5 flex flex-col space-y-5">
            
            {/* API Parameters Card */}
            <div className="bg-neutral-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-neutral-200 dark:border-zinc-900">
              <h3 className="text-sm font-bold font-display text-neutral-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-lead" />
                Figma Live API Connection
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    Figma Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    placeholder="figd_..."
                    value={figmaToken}
                    onChange={(e) => setFigmaToken(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-lead text-neutral-800 dark:text-zinc-100"
                  />
                  <a 
                    href="https://www.figma.com/developers/api#access-tokens" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-brand-lead mt-1 hover:underline"
                  >
                    Generate a Figma Token <ExternalLink size={10} />
                  </a>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    Figma File Key / ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7mY6bTzK..."
                    value={figmaFileId}
                    onChange={(e) => setFigmaFileId(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-lead text-neutral-800 dark:text-zinc-100"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Found in your Figma file URL: <code>figma.com/file/<strong>[FILE_KEY]</strong>/title</code>
                  </p>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSaveSettings}
                    className="py-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Save Parameters
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="py-2.5 bg-brand-lead hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isTesting ? <RefreshCw className="animate-spin" size={12} /> : null}
                    Verify Connection
                  </button>
                </div>
              </div>
            </div>

            {/* Test Results Display */}
            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 duration-150 ${
                testResult.success 
                  ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300'
                  : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
              }`}>
                {testResult.success ? (
                  <CheckCircle size={16} className="shrink-0 text-green-500" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-red-500" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">
                    {testResult.success ? 'Connection Validated!' : 'API Connection Error'}
                  </p>
                  <p className="text-[11px] leading-normal">
                    {testResult.success 
                      ? `Access confirmed to Figma File: "${testResult.name}"` 
                      : testResult.error}
                  </p>
                </div>
              </div>
            )}

            {/* Direct Sync command Card */}
            {testResult?.success && (
              <div className="bg-[#40e0d0]/5 dark:bg-[#40e0d0]/5 p-5 rounded-2xl border border-[#40e0d0]/20 space-y-4 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-white">
                    Direct Variable Sync (Push)
                  </h4>
                  <span className="text-[9px] bg-[#40e0d0]/10 text-[#40e0d0] px-2 py-0.5 rounded font-bold uppercase border border-[#40e0d0]/20">
                    Pro/Enterprise
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-normal">
                  Publish your Forgel palette colors directly into this Figma file as a unified local variable collection named <strong>"Forgel OS Brand Colors"</strong>.
                </p>
                
                <button
                  onClick={handlePushVariables}
                  disabled={isPushing}
                  className="w-full py-3 bg-gradient-to-r from-brand-lead to-[#40e0d0] hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {isPushing ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Send size={14} />
                  )}
                  {isPushing ? 'Syncing Variables...' : 'Push Variables to Figma'}
                </button>

                {pushResult && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 duration-150 ${
                    pushResult.success 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-150 text-green-800 dark:text-green-300'
                      : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 text-amber-800 dark:text-amber-300'
                  }`}>
                    {pushResult.success ? (
                      <CheckCircle size={14} className="shrink-0 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle size={14} className="shrink-0 text-amber-500 mt-0.5" />
                    )}
                    <p className="text-[11px] leading-relaxed">
                      {pushResult.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-zinc-900 bg-neutral-50 dark:bg-zinc-900/20 text-center text-[11px] text-neutral-400">
          Built by Srvel — Serve. Grow. Lead.
        </div>

      </div>
    </Modal>
  );
};
