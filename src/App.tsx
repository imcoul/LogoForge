import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, Wand2, RefreshCw, Palette, Download, Move, Upload, 
  BookOpen, Image as ImageIcon, ChevronRight, FolderArchive, 
  MessageSquare, FileText, Music, LayoutDashboard, Share2, Plus, Trash2, Globe
} from 'lucide-react';
import { generateLogoImage, generateBrandGuide, analyzeRefinementContext, generateSonicPhilosophy } from './services/geminiService';
import { useAppStore, Project } from './store';

const ANIMATIONS = {
  float: { animate: { y: [0, -15, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  pulse: { animate: { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
  spin: { animate: { rotate: 360 }, transition: { duration: 8, repeat: Infinity, ease: "linear" } },
  pop: { animate: { scale: [0.8, 1.1, 1] }, transition: { duration: 0.5, type: "spring", bounce: 0.6, repeat: Infinity, repeatDelay: 1 } },
  flip: { animate: { rotateY: 360 }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 } }
};

type AnimationType = keyof typeof ANIMATIONS;
type ViewMode = 'dashboard' | 'studio';
type StudioTab = 'preview' | 'guide' | 'refine' | 'sonic' | 'comments';

export default function App() {
  const { 
    projects, activeProjectId, isHydrated, 
    loadProjects, createProject, updateProject, deleteProject, setActiveProject 
  } = useAppStore();

  const [view, setView] = useState<ViewMode>('dashboard');
  
  // Current Studio State
  const [mode, setMode] = useState<'create' | 'upload'>('create');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingSonic, setIsGeneratingSonic] = useState(false);
  
  const [activeAnimation, setActiveAnimation] = useState<AnimationType>('float');
  const [activeTab, setActiveTab] = useState<StudioTab>('preview');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const refineInputRef = useRef<HTMLInputElement>(null);
  const sonicInputRef = useRef<HTMLInputElement>(null);
  const [commentText, setCommentText] = useState('');

  const { t, i18n } = useTranslation();

  // Load active project
  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

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
        alert('Please allow popups for this site to connect to Notion.');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      alert(error.message);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && activeProject) {
        alert(`Successfully connected to Notion workspace: ${event.data.workspace}`);
        
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
            alert(`Export successful! Notion Page: ${exportData.url}`);
          } else {
            throw new Error(exportData.error);
          }
        } catch (exportErr: any) {
           alert(`Failed to export: ${exportErr.message}`);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeProject]);

  const currentAnim = ANIMATIONS[activeAnimation];

  if (!isHydrated) {
    return <div className="min-h-screen bg-neutral-100 flex items-center justify-center"><RefreshCw className="animate-spin w-8 h-8 text-neutral-400" /></div>;
  }

  return (
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-neutral-100 text-neutral-900 font-sans flex shadow-inner overflow-hidden">
      
      {/* Global Navigation Rail */}
      <div className="w-20 bg-black flex flex-col items-center py-8 gap-8 shrink-0 z-20">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold mb-4 shadow-lg shadow-indigo-600/20">
          <Sparkles size={20} />
        </div>
        
        <button 
          onClick={() => setView('dashboard')}
          className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-white/20 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/10'}`}
          title="Asset Library / Workspace"
        >
          <FolderArchive size={24} />
        </button>
        
        <button 
          onClick={() => setView('studio')}
          className={`p-3 rounded-xl transition-all ${view === 'studio' ? 'bg-white/20 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/10'}`}
          title="Refinement Studio"
        >
          <Palette size={24} />
        </button>
      </div>

      {view === 'dashboard' ? (
        <div className="flex-1 p-12 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-black">{t('app_title')}</h1>
                <p className="text-neutral-500">{t('app_description')}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex bg-neutral-200 p-1 rounded-lg">
                  {['en', 'fr', 'ar'].map(lang => (
                    <button
                      key={lang}
                      onClick={() => i18n.changeLanguage(lang)}
                      className={`px-3 py-1 text-xs font-bold uppercase rounded-md transition-colors ${i18n.language === lang ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-black'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <button onClick={handleCreateNewProject} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-colors">
                  <Plus size={18} /> {t('new_project')}
                </button>
              </div>
            </div>
            
            {projects.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-neutral-200 border-dashed">
                <FolderArchive className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
                <h3 className="text-xl font-bold mb-2">{t('no_projects')}</h3>
                <p className="text-neutral-500 mb-6">{t('create_first_project')}</p>
                <button onClick={handleCreateNewProject} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm inline-flex items-center gap-2">
                  <Plus size={18} /> {t('create_project')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(proj => (
                  <div key={proj.id} className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden" onClick={() => { setActiveProject(proj.id); setView('studio'); }}>
                    <button onClick={(e) => { e.stopPropagation(); deleteProject(proj.id); }} className="absolute top-4 right-4 p-2 bg-red-100 text-red-600 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-200 transition-all z-10" title="Delete Project">
                      <Trash2 size={16} />
                    </button>
                    <div className="aspect-square rounded-2xl bg-neutral-100 flex items-center justify-center mb-6 overflow-hidden border border-neutral-200 p-4">
                      {proj.logoUrl ? (
                        <img src={proj.logoUrl} alt={proj.name} className="w-full h-full object-contain filter drop-shadow-sm" />
                      ) : (
                        <Wand2 size={32} className="text-neutral-300" />
                      )}
                    </div>
                    <h3 className="font-bold text-lg truncate pr-8">{proj.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">{new Date(proj.createdAt).toLocaleDateString()}</p>
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
                      {proj.brandGuide && <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] uppercase tracking-wider font-bold rounded shrink-0">Guide</span>}
                      {proj.sonicAssets.length > 0 && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] uppercase tracking-wider font-bold rounded shrink-0">Sonic</span>}
                      {proj.refinementFiles.length > 0 && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] uppercase tracking-wider font-bold rounded shrink-0">Files</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row relative">
          {/* Studio Control Panel */}
          <div className="w-full md:w-5/12 lg:w-[400px] bg-white border-r border-neutral-300 p-8 flex flex-col shrink-0 z-10 overflow-y-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight mb-1 text-black">{t('refinement_studio')}</h1>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-widest">{activeProject?.name || 'No Project Selected'}</p>
            </div>

            {!activeProject ? (
              <div className="flex-1 flex items-center justify-center flex-col text-center opacity-50">
                <LayoutDashboard className="w-12 h-12 mb-4" />
                <p>{t('no_project_selected')}</p>
              </div>
            ) : (
              <>
                <div className="flex bg-neutral-100 p-1 rounded-xl mb-8">
                  <button
                    onClick={() => setMode('create')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'create' ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:text-black'}`}
                  >
                    {t('create_new')}
                  </button>
                  <button
                    onClick={() => setMode('upload')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-black' : 'text-neutral-500 hover:text-black'}`}
                  >
                    {t('upload_logo')}
                  </button>
                </div>

                <div className="flex-1 space-y-8">
              {mode === 'create' ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-800">{t('company_description')}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('company_desc_placeholder')}
                    className="w-full h-32 p-4 text-sm bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all resize-none font-medium placeholder:text-neutral-400"
                  />
                  <button
                    onClick={handleGenerateLogo}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                  >
                    {isGenerating ? <><RefreshCw className="animate-spin w-5 h-5" /> Forging...</> : <><Palette className="w-5 h-5" /> {t('generate_logo')}</>}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-neutral-800">1. Upload Logo</label>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 text-neutral-500 transition-colors"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-semibold">Click to select an image</span>
                  </button>
                </div>
              )}

              <div className="space-y-3">
                 <label className="block text-xs font-bold uppercase tracking-widest text-neutral-800">Animation Mode</label>
                 <div className="grid grid-cols-2 gap-2">
                   {(Object.keys(ANIMATIONS) as AnimationType[]).map((anim) => (
                     <button
                       key={anim}
                       onClick={() => setActiveAnimation(anim)}
                       className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${activeAnimation === anim ? 'bg-black text-white border-black' : 'bg-white text-neutral-600 hover:bg-neutral-50'}`}
                     >
                       <Move size={14} /> {anim}
                     </button>
                   ))}
                 </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-700 text-sm font-medium border border-red-200 rounded-xl">{error}</div>}
            </div>

            {activeProject?.logoUrl && (
              <div className="mt-8 pt-8 border-t border-neutral-200">
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
          <div className="flex-1 bg-neutral-100 relative overflow-hidden flex flex-col border-l border-white/50">
            {activeProject?.logoUrl && (
              <div className="relative z-20 flex justify-center pt-6 pb-2 border-b border-neutral-200 bg-white/50 backdrop-blur-md px-4 overflow-x-auto">
                <div className="flex gap-2 p-1 bg-neutral-200 rounded-full shrink-0">
                  <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'preview' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-black'}`}><ImageIcon size={14} /> {t('studio_tabs_preview')}</button>
                  <button onClick={() => setActiveTab('guide')} disabled={!activeProject.brandGuide} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'guide' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-black disabled:opacity-40'}`}><BookOpen size={14} /> {t('studio_tabs_guide')}</button>
                  <button onClick={() => setActiveTab('refine')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'refine' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-black'}`}><FileText size={14} /> {t('studio_tabs_refine')}</button>
                  <button onClick={() => setActiveTab('sonic')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'sonic' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-black'}`}><Music size={14} /> {t('studio_tabs_sonic')}</button>
                  <button onClick={() => setActiveTab('comments')} className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all flex items-center gap-2 ${activeTab === 'comments' ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-black'}`}><MessageSquare size={14} /> {t('studio_tabs_collab')}</button>
                </div>
                
                <button onClick={handleExportNotion} className="ml-auto flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors shrink-0">
                  <Share2 size={14} /> {t('export_notion')}
                </button>
              </div>
            )}

            <div className="flex-1 relative overflow-y-auto flex">
              <div className="absolute inset-0 border-[rgba(0,0,0,0.03)] filter grid pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
              
              <AnimatePresence mode="wait">
                {!activeProject?.logoUrl ? (
                  <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm px-6 m-auto h-full">
                    <div className="w-32 h-32 mb-6 rounded-full border-2 border-dashed border-neutral-400 flex items-center justify-center text-neutral-400 bg-white/50"><Wand2 size={40} className="opacity-50" /></div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-800 mb-2">Blank Canvas</h2>
                    <p className="text-neutral-500 font-medium">Create or upload a logo on the left to begin.</p>
                  </motion.div>
                ) : activeTab === 'preview' ? (
                  <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative z-10 flex flex-col items-center justify-center gap-8 m-auto w-full py-12">
                    <motion.div {...currentAnim} className="w-64 h-64 md:w-96 md:h-96 rounded-full bg-white shadow-[0_20px_60px_rgba(0,0,0,0.1)] border break-words p-4 flex items-center justify-center overflow-hidden border-neutral-200">
                      <img src={activeProject.logoUrl} alt="Logo" className="w-full h-full object-contain filter drop-shadow-sm" referrerPolicy="no-referrer" />
                    </motion.div>
                  </motion.div>
                ) : activeTab === 'refine' ? (
                  <motion.div key="refine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-4xl mx-auto w-full">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-bold">AI Refinement Studio</h2>
                      {activeProject.refinementSuggestions && (
                         <button onClick={applyRefinedPrompt} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                           <Wand2 size={16} /> Apply Suggestions & Regenerate Logo
                         </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Left: Uploads */}
                      <div className="col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
                          <h3 className="font-bold mb-4">Context Files</h3>
                          <div className="space-y-3 mb-4">
                            {activeProject.refinementFiles.map((f, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                                <FileText size={14} className="text-neutral-400" /> <span className="truncate">{f.name}</span>
                              </div>
                            ))}
                          </div>
                          
                          <input type="file" ref={refineInputRef} className="hidden" onChange={handleRefineUpload} accept=".pdf,.txt,.md,image/*" />
                          <button
                            onClick={() => refineInputRef.current?.click()}
                            disabled={isRefining}
                            className="w-full py-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 text-neutral-500 transition-colors disabled:opacity-50"
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
                             <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
                               <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Move size={18} className="text-indigo-600" /> Layout & Structure</h3>
                               <ul className="space-y-2">
                                 {activeProject.refinementSuggestions.layoutImprovements.map((item, i) => (
                                   <li key={i} className="flex gap-3 text-neutral-700 text-sm"><span className="text-indigo-600 font-bold">•</span> {item}</li>
                                 ))}
                               </ul>
                             </div>
                             
                             {/* Vector Adjustments */}
                             <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
                               <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Palette size={18} className="text-purple-600" /> Vector Adjustments</h3>
                               <ul className="space-y-2">
                                 {activeProject.refinementSuggestions.vectorAdjustments.map((item, i) => (
                                   <li key={i} className="flex gap-3 text-neutral-700 text-sm"><span className="text-purple-600 font-bold">•</span> {item}</li>
                                 ))}
                               </ul>
                             </div>

                             {/* Color Alternatives */}
                             <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-200">
                               <h3 className="text-lg font-bold mb-4">Color Alternatives</h3>
                               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                 {activeProject.refinementSuggestions.colorAlternatives.map((c, i) => (
                                   <div key={i} className="flex items-center gap-3 bg-neutral-50 p-2 rounded-xl">
                                     <div className="w-8 h-8 rounded-full border border-neutral-200 shadow-inner" style={{ backgroundColor: c.hex }}></div>
                                     <div className="text-xs">
                                       <p className="font-bold">{c.name}</p>
                                       <p className="text-neutral-500 font-mono">{c.hex}</p>
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
                  <motion.div key="sonic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-4xl mx-auto w-full">
                    <h2 className="text-3xl font-bold mb-6">Organic Sonic Branding</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Uploads */}
                      <div className="col-span-1 space-y-6">
                        <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-200">
                          <p className="text-neutral-600 mb-6 text-sm">Upload environmental or animal sounds. Instruments are strictly prohibited. The AI will mix these organic sounds into a cohesive auditory identity.</p>
                          
                          <div className="space-y-3 mb-6">
                            {activeProject.sonicAssets.map((asset, i) => (
                              <div key={i} className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                <div className="flex items-center gap-3 mb-2 text-sm font-semibold">
                                  <Music size={16} className="text-indigo-600" />
                                  <span className="truncate">{asset.name}</span>
                                </div>
                                <audio controls src={asset.base64Data} className="w-full h-8" />
                              </div>
                            ))}
                          </div>

                          <input type="file" ref={sonicInputRef} className="hidden" onChange={handleSonicUpload} accept="audio/*" />
                          <button
                            onClick={() => sonicInputRef.current?.click()}
                            disabled={isGeneratingSonic}
                            className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-xl bg-neutral-50 hover:bg-indigo-50 hover:border-indigo-300 text-neutral-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
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
                  <motion.div key="comments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 p-12 max-w-2xl mx-auto w-full flex flex-col h-full">
                    <h2 className="text-3xl font-bold mb-6 shrink-0">Collaboration & Comments</h2>
                    
                    <div className="flex-1 bg-white rounded-3xl shadow-sm border border-neutral-200 flex flex-col overflow-hidden">
                      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-50">
                        {activeProject.comments.length === 0 ? (
                          <div className="text-center text-neutral-400 py-16 flex flex-col items-center justify-center h-full">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-30" />
                            <p className="font-medium">No comments yet.</p>
                            <p className="text-sm">Start the conversation below.</p>
                          </div>
                        ) : (
                          activeProject.comments.map(c => (
                            <div key={c.id} className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-100 flex gap-4">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                                {c.author.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="font-bold text-sm text-neutral-900">{c.author}</span>
                                  <span className="text-xs text-neutral-400">{new Date(c.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-neutral-700 text-sm leading-relaxed">{c.text}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      
                      <div className="p-4 bg-white border-t border-neutral-200 flex gap-2">
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
                          className="flex-1 bg-neutral-100 border-none rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
