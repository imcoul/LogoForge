import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Layers, 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  Palette, 
  Lock, 
  Unlock, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  Info,
  Database
} from 'lucide-react';
import { useAppStore, prepareForFirestore } from '../store';
import { db } from '../services/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from '../components/Toast';
import { syncProjectToPostgres, syncProjectToSupabase } from '../utils/dbBackupClient';
import { FigmaExportModal } from '../components/FigmaExportModal';

interface SettingsProps {
  setIsGoogleDriveOpen: (open: boolean) => void;
}

export const Settings: React.FC<SettingsProps> = ({ setIsGoogleDriveOpen }) => {
  const { toast } = useToast();
  const {
    settings,
    updateSettings,
    projects,
    activeProjectId,
    user
  } = useAppStore();

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  // Local state for DB backups and mirroring
  const [isBackingUpDb, setIsBackingUpDb] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);

  // Local state for user directory roles
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
    if (user) {
      fetchUsers();
    }
  }, [user]);

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

  const handleSyncAllToDb = async (target: 'postgres' | 'supabase') => {
    if (projects.length === 0) {
      toast('No projects found to backup.', 'error');
      return;
    }
    setIsSyncingAll(true);
    let successCount = 0;
    let failCount = 0;
    for (const project of projects) {
      const prepared = prepareForFirestore(project);
      const res = target === 'postgres' 
        ? await syncProjectToPostgres(prepared, settings.postgresConnectionString)
        : await syncProjectToSupabase(prepared, settings.supabaseUrl, settings.supabaseAnonKey);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    setIsSyncingAll(false);
    if (failCount === 0) {
      toast(`Perfect sync! All ${successCount} projects have been fully backed up/synchronized with your ${target === 'postgres' ? 'PostgreSQL' : 'Supabase'} database.`, 'success');
    } else {
      toast(`Synchronized: ${successCount} succeeded, ${failCount} failed. Check your DB config.`, 'error');
    }
  };

  const handleExportNotion = async () => {
    if (!activeProject) return;

    try {
      const response = await fetch('/api/oauth/notion/url');
      if (!response.ok) {
        throw new Error('Failed to get auth URL. Check NOTION_CLIENT_ID configuration.');
      }
      const { url } = await response.json();

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

  return (
    <div className="flex-1 p-12 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <FigmaExportModal 
          isOpen={isFigmaModalOpen} 
          onClose={() => setIsFigmaModalOpen(false)} 
          project={activeProject} 
        />
        <h1 className="text-4xl font-display font-bold tracking-tight mb-12 text-black dark:text-white">Settings</h1>
        
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold font-display mb-4 text-neutral-900 dark:text-white">AI Model Integration</h2>
            <p className="text-sm text-neutral-500 mb-6">Bring your own keys to use custom models for generation and reasoning.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Google Gemini API Key</label>
                <input 
                  type="password" 
                  placeholder="AIzaSy..." 
                  value={settings.geminiKey || ''} 
                  onChange={(e) => updateSettings({ geminiKey: e.target.value })} 
                  className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                />
                {settings.geminiKey ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Custom Key Active — Requests will use your own billing limits
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Shared Workspace Key — Requests use the developer's limits
                  </span>
                )}
              </div>
               <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Active Generation AI Model</label>
                <select
                  value={settings.activeModel || 'gemini'}
                  onChange={(e) => updateSettings({ activeModel: e.target.value })}
                  className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-xs font-bold"
                >
                  <option value="gemini">Google Gemini 3.1 Pro (Recommended / Default)</option>
                  <option value="stepfun">StepFun: Step 3.7 Flash (Free Model Preset)</option>
                  <option value="poolside">Poolside: Laguna M.1 (Free Model Preset)</option>
                  <option value="tencent">Tencent: Hy3 (Free Model Preset)</option>
                </select>
                <p className="text-[10px] text-neutral-400 mt-1.5">Switching model redirects brand spec rationale & sonic guidelines generation to your chosen AI engine.</p>
              </div>

              {settings.activeModel === 'stepfun' && (
                <div className="p-4 bg-indigo-50/50 dark:bg-zinc-950/50 border border-indigo-100 dark:border-zinc-850 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">⚡ StepFun Configuration</span>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">StepFun API Key</label>
                    <input 
                      type="password" 
                      placeholder="Enter StepFun API Key..." 
                      value={settings.stepfunKey || ''} 
                      onChange={(e) => updateSettings({ stepfunKey: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Custom Endpoint (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="https://api.stepfun.com/v1/chat/completions" 
                      value={settings.stepfunEndpoint || ''} 
                      onChange={(e) => updateSettings({ stepfunEndpoint: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                    />
                  </div>
                </div>
              )}

              {settings.activeModel === 'poolside' && (
                <div className="p-4 bg-indigo-50/50 dark:bg-zinc-950/50 border border-indigo-100 dark:border-zinc-850 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">⚡ Poolside Configuration</span>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Poolside API Key</label>
                    <input 
                      type="password" 
                      placeholder="Enter Poolside API Key..." 
                      value={settings.poolsideKey || ''} 
                      onChange={(e) => updateSettings({ poolsideKey: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Custom Endpoint (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="https://api.poolside.ai/v1/chat/completions" 
                      value={settings.poolsideEndpoint || ''} 
                      onChange={(e) => updateSettings({ poolsideEndpoint: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                    />
                  </div>
                </div>
              )}

              {settings.activeModel === 'tencent' && (
                <div className="p-4 bg-indigo-50/50 dark:bg-zinc-950/50 border border-indigo-100 dark:border-zinc-850 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">⚡ Tencent Hy3 Configuration</span>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Tencent API Key</label>
                    <input 
                      type="password" 
                      placeholder="Enter Tencent API Key..." 
                      value={settings.tencentKey || ''} 
                      onChange={(e) => updateSettings({ tencentKey: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">Custom Endpoint (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="https://api.hunyuan.tencent.com/v1/chat/completions" 
                      value={settings.tencentEndpoint || ''} 
                      onChange={(e) => updateSettings({ tencentEndpoint: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">OpenAI API Key</label>
                <input 
                  type="password" 
                  placeholder="sk-..." 
                  value={settings.openaiKey || ''} 
                  onChange={(e) => updateSettings({ openaiKey: e.target.value })} 
                  className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Local/Custom LLM Endpoint</label>
                <input 
                  type="url" 
                  placeholder="http://localhost:11434/api/generate" 
                  value={settings.customEndpoint || ''} 
                  onChange={(e) => updateSettings({ customEndpoint: e.target.value })} 
                  className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" 
                />
                <p className="text-xs text-neutral-400 mt-2">Useful for connecting to local models like Ollama or LM Studio.</p>
              </div>
              <button onClick={() => toast('Settings saved locally.', 'success')} className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold text-sm mt-4 w-full hover:opacity-80 transition-opacity cursor-pointer">Save API Keys</button>
            </div>
          </div>

          {/* AI Assistant Configurations Group */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold font-display mb-4 text-neutral-900 dark:text-white">AI Assistant Configurations</h2>
            <p className="text-sm text-neutral-500 mb-6">Fine-tune the model selection and runtime generation properties for the Canvas AI copilot.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Assistant AI Model</label>
                <select
                  value={settings.assistantModel || 'gemini-2.5-flash'}
                  onChange={(e) => updateSettings({ assistantModel: e.target.value })}
                  className="w-full bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-xs font-bold"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Standard - Instant Generation)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Premium - Sophisticated Canvas Construction)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Legacy - Fast Generation)</option>
                </select>
                <p className="text-[10px] text-neutral-400 mt-1.5">Determines the core reasoning and generation engine for whiteboard sketch operations.</p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">
                  <span>Temperature</span>
                  <span className="font-mono text-indigo-500">{settings.assistantTemperature !== undefined ? settings.assistantTemperature : 0.2}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.assistantTemperature !== undefined ? settings.assistantTemperature : 0.2}
                  onChange={(e) => updateSettings({ assistantTemperature: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-850 rounded accent-indigo-500 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-400 mt-1.5">Higher values increase creativity/variety, lower values keep outputs deterministic.</p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">
                  <span>Top-K Sampling</span>
                  <span className="font-mono text-indigo-500">{settings.assistantTopK !== undefined ? settings.assistantTopK : 40}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={settings.assistantTopK !== undefined ? settings.assistantTopK : 40}
                  onChange={(e) => updateSettings({ assistantTopK: Number(e.target.value) })}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-850 rounded accent-indigo-500 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-400 mt-1.5">Limits the token pool to the top-K most probable choices during generation.</p>
              </div>

              <button onClick={() => toast('AI Assistant configuration updated.', 'success')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm mt-4 w-full transition-opacity cursor-pointer shadow-sm">
                Save Assistant Configurations
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold font-display mb-4 text-neutral-900 dark:text-white">Integrations</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center font-serif text-xl font-bold text-black border border-neutral-200">N</div>
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-white">Notion</h3>
                    <p className="text-xs text-neutral-500">Export Brand Guides to your workspace.</p>
                  </div>
                </div>
                <button onClick={handleExportNotion} className="bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:border-brand-lead transition-colors cursor-pointer text-neutral-800 dark:text-zinc-200">
                  Connect
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg shadow-sm flex items-center justify-center border border-indigo-150">
                    <Cloud size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-white">Google Drive</h3>
                    <p className="text-xs text-neutral-500">Import/Export SVGs and Brand Manuals instantly.</p>
                  </div>
                </div>
                <button onClick={() => setIsGoogleDriveOpen(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer">
                  Manage Storage
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-zinc-950 rounded-2xl border border-neutral-200 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/20 rounded-lg shadow-sm flex items-center justify-center border border-purple-100 dark:border-purple-900/30">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 120 180" fill="currentColor">
                      <path d="M30 45C30 20.1472 50.1472 0 75 0C99.8528 0 120 20.1472 120 45C120 69.8528 99.8528 90 75 90C50.1472 90 30 69.8528 30 45Z" fill="#F24E1E"/>
                      <path d="M30 135C30 110.147 50.1472 90 75 90C75 90 120 90 120 90V135C120 159.853 99.8528 180 75 180C50.1472 180 30 159.853 30 135Z" fill="#0ACF83"/>
                      <path d="M0 135C0 110.147 20.1472 90 45 90H75V135C75 159.853 54.8528 180 30 180C13.4315 180 0 166.569 0 150V135Z" fill="#1ABC9C" fillOpacity="0.1"/>
                      <path d="M0 135C0 110.147 20.1472 90 45 90C45 90 75 90 75 90V135C75 159.853 54.8528 180 30 180C13.4315 180 0 166.569 0 135Z" fill="#1ABC9C"/>
                      <path d="M0 45C0 20.1472 20.1472 0 45 0H75V90H45C20.1472 90 0 69.8528 0 45Z" fill="#FF7262"/>
                      <path d="M75 90C75 65.1472 95.1472 45 120 45V90H75Z" fill="#A259FF"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 dark:text-white">Figma Exporter</h3>
                    <p className="text-xs text-neutral-500">Export active colors, typography and SVGs as tokens.</p>
                  </div>
                </div>
                <button onClick={() => setIsFigmaModalOpen(true)} className="bg-[#800080] hover:opacity-95 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer">
                  Export Tokens
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-neutral-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold font-display mb-2 flex items-center gap-2 text-neutral-900 dark:text-white">
              <Database size={22} className="text-indigo-500" />
              Primary Cloud Database
            </h2>
            <p className="text-sm text-neutral-500 mb-6">
              Configure your primary storage backend. Supabase provides a scalable relational database, while Firestore is ideal for real-time document sync.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {(['firestore', 'supabase'] as const).map((dbOption) => (
                <button
                  key={dbOption}
                  onClick={() => updateSettings({ primaryDatabase: dbOption })}
                  className={`px-4 py-3 text-sm font-bold rounded-2xl border capitalize transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    (settings.primaryDatabase || 'firestore') === dbOption
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-neutral-50 dark:bg-zinc-950 border-neutral-200 dark:border-zinc-800 text-neutral-600 dark:text-zinc-400 hover:border-indigo-400'
                  }`}
                >
                  {dbOption === 'firestore' ? 'Firestore 🔥' : 'Supabase ⚡'}
                </button>
              ))}
            </div>
          </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">Backup Provider</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['none', 'postgres', 'supabase', 'both'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateSettings({ backupMode: mode })}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border capitalize transition-all cursor-pointer ${
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
                      className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-800 dark:text-zinc-100"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1.5">Leave blank to use the server-side default DATABASE_URL variable, or enter your own.</p>
                  </div>
                  
                  {activeProject && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleManualBackup('postgres')}
                        disabled={isBackingUpDb || isSyncingAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 w-full cursor-pointer"
                      >
                        <RefreshCw size={12} className={isBackingUpDb ? "animate-spin" : ""} />
                        {isBackingUpDb ? 'Mirroring...' : 'Mirror Active Project to Postgres Now'}
                      </button>
                      <button
                        onClick={() => handleSyncAllToDb('postgres')}
                        disabled={isBackingUpDb || isSyncingAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/50 rounded-xl text-xs font-bold transition-all disabled:opacity-50 w-full cursor-pointer"
                      >
                        <Database size={12} className={isSyncingAll ? "animate-spin" : ""} />
                        {isSyncingAll ? 'Syncing All...' : `Sync All Projects to Postgres (${projects.length})`}
                      </button>
                    </div>
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
                        className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-800 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-500 mb-1.5">Anon API Key</label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={settings.supabaseAnonKey || ''}
                        onChange={(e) => updateSettings({ supabaseAnonKey: e.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-neutral-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400">Leave blank to use the server-side pre-configured fallback keys, or enter custom ones.</p>
                  
                  {activeProject && (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleManualBackup('supabase')}
                        disabled={isBackingUpDb || isSyncingAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-neutral-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50 w-full cursor-pointer"
                      >
                        <RefreshCw size={12} className={isBackingUpDb ? "animate-spin" : ""} />
                        {isBackingUpDb ? 'Mirroring...' : 'Mirror Active Project to Supabase Now'}
                      </button>
                      <button
                        onClick={() => handleSyncAllToDb('supabase')}
                        disabled={isBackingUpDb || isSyncingAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50 rounded-xl text-xs font-bold transition-all disabled:opacity-50 w-full cursor-pointer"
                      >
                        <Database size={12} className={isSyncingAll ? "animate-spin" : ""} />
                        {isSyncingAll ? 'Syncing All...' : `Sync All Projects to Supabase (${projects.length})`}
                      </button>
                    </div>
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
            <h2 className="text-xl font-bold font-display mb-2 flex items-center gap-2 text-neutral-900 dark:text-white">
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
                                          className="px-2.5 py-1.5 bg-white border border-neutral-200 hover:bg-neutral-100 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
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
  );
};
