import { sanitizeSVG } from '../components/ui/sanitizeSVG';
import { safeFormatDate } from '../components/ui/safeFormatDate';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Hammer, 
  Search, 
  Filter, 
  FolderArchive, 
  Wand2, 
  Trash2, 
  Copy, 
  CheckCircle, 
  Check, 
  Download, 
  RefreshCw, 
  Info, 
  Cloud, 
  HelpCircle, 
  Sun, 
  Moon, 
  Lock 
} from 'lucide-react';
import { useAppStore, Project } from '../store';
import { signInWithGoogle, logout } from '../services/firebase';
import { lazyNamed, ChunkBoundary } from '../lazyNamed';

// ProjectAnalytics pulls in recharts; it is only rendered when the panel is opened.
const ProjectAnalytics = lazyNamed(() => import('../components/ProjectAnalytics'), 'ProjectAnalytics');
import { useToast } from '../components/Toast';
import DOMPurify from 'dompurify';

interface DashboardProps {
  setView: (view: 'dashboard' | 'studio' | 'course' | 'settings') => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  setIsGoogleDriveOpen: (open: boolean) => void;
}



export const Dashboard: React.FC<DashboardProps> = ({
  setView,
  isDarkMode,
  setIsDarkMode,
  setIsGoogleDriveOpen
}) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const {
    projects,
    isHydrated,
    user,
    createProject,
    updateProject,
    bulkUpdateProjects,
    deleteProject,
    deleteProjects,
    cloneProject,
    setActiveProject
  } = useAppStore();

  // Local state for dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [projectsToDelete, setProjectsToDelete] = useState<string[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'active' | 'archived'>('active');
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isExportingBulk, setIsExportingBulk] = useState(false);
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [bulkRenameValue, setBulkRenameValue] = useState('');
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [bulkTagValue, setBulkTagValue] = useState('');

  const handleCreateNewProject = async () => {
    try {
      await createProject();
      setView('studio');
      toast(`Fresh Brand Workspace created!`, "success");
    } catch (err) {
      toast("Error creating workspace", "error");
    }
  };

  const handleCreateNewBlankProject = async () => {
    try {
      const p = await createProject('New Blank Project');
      await updateProject(p.id, {
        logoUrl: null,
        svgSource: null,
        brandGuide: null,
        sceneGraph: [],
        sceneHistory: [{ nodes: [] }],
        sceneHistoryIndex: 0
      });
      setView('studio');
      toast(`Blank Workspace Created!`, "success");
    } catch (err) {
      toast("Error creating blank workspace", "error");
    }
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

  return (
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
            <button 
              id="btn-create-blank-project"
              onClick={handleCreateNewBlankProject} 
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-6 py-3 rounded-xl font-bold shadow-sm transition-all cursor-pointer"
            >
              <Hammer size={18} /> New Blank Project
            </button>
          </div>
        </div>

        {/* Active vs Archived Brands Tab Control */}
        <div className="flex border-b border-neutral-200 dark:border-zinc-900 mb-8 gap-6">
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
        <ChunkBoundary label="analytics">
          <ProjectAnalytics />
        </ChunkBoundary>
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
                                  const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
                                  await updateProject(proj.id, { updatedAt: thirtyOneDaysAgo, archived: true });
                                }} 
                                className="p-2 bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 hover:bg-amber-100 rounded-lg opacity-100 transition-all cursor-pointer" 
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
                                className="p-2 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg opacity-100 transition-all cursor-pointer" 
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
                                className="p-2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg opacity-100 transition-all cursor-pointer" 
                                title="Archive Brand Space"
                              >
                                <FolderArchive size={14} />
                              </button>
                            )}

                            <button 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                await cloneProject(proj.id);
                                toast('Project cloned successfully!', 'success');
                              }} 
                              className="p-2 bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 hover:bg-amber-100 rounded-lg opacity-100 transition-all cursor-pointer" 
                              title="Clone Project"
                            >
                              <Copy size={14} />
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setProjectToDelete(proj.id);
                              }} 
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg opacity-100 transition-all cursor-pointer" 
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
                        <div className="aspect-square rounded-2xl bg-neutral-100 dark:bg-zinc-950 flex items-center justify-center mb-6 overflow-hidden border border-neutral-200 dark:border-zinc-900 p-4">
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
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white dark:bg-zinc-950 border border-neutral-800 dark:border-zinc-800 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 z-dropdown max-w-lg w-full justify-between"
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
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-neutral-300"
              >
                Select All
              </button>
              <button
                onClick={() => setShowBulkRename(true)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-neutral-300"
              >
                Rename
              </button>
              <button
                onClick={() => setShowBulkTag(true)}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-neutral-300"
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
          <div className="fixed inset-0 bg-black/60 z-max flex items-center justify-center p-4 backdrop-blur-sm">
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
          <div className="fixed inset-0 bg-black/60 z-max flex items-center justify-center p-4 backdrop-blur-sm">
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
          <div className="fixed inset-0 bg-black/60 z-max flex items-center justify-center p-4 backdrop-blur-sm">
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
                    <div className="mt-2 p-2 bg-neutral-50 dark:bg-zinc-950 rounded-xl border border-neutral-100 dark:border-zinc-900 text-[10px] font-mono text-neutral-500 dark:text-zinc-400 flex items-center gap-1.5">
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
          <div className="fixed inset-0 bg-black/60 z-modal flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Delete {projectToDelete ? 'Brand Space' : 'Brand Spaces'}</h3>
              <p className="text-sm text-neutral-500 dark:text-zinc-400">
                Are you sure you want to permanently delete {projectToDelete ? (
                  <span className="font-bold text-neutral-900 truncate max-w-full dark:text-white">"{projects.find(p => p.id === projectToDelete)?.name}"</span>
                ) : (
                  <span className="font-bold text-neutral-900 truncate max-w-full dark:text-white">{projectsToDelete.length} selected brand spaces</span>
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
  );
};
