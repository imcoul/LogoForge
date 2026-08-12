import { ANIMATIONS } from './components/ui/ANIMATIONS';
// react-markdown is ~40 kB gzip and is only needed when comment text is displayed.
const Markdown = lazyNamed(() => import('react-markdown'), 'default');
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Wand2, RefreshCw, Palette, FolderArchive, MessageSquare, Moon, Sun, GraduationCap, Settings as SettingsIcon, HelpCircle, Lock, Unlock, ShieldAlert, X, Send } from 'lucide-react';
import { generateAICriticComment } from './services/geminiService';
import { useAppStore, Project, handleCloudErrorGracefully } from './store';
import { auth, signInWithGoogle, logout, db } from './services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { syncProjectToPostgres, syncProjectToSupabase } from './utils/dbBackupClient';
import { KeyboardManager } from './components/KeyboardManager';
import { lazyNamed, ChunkBoundary } from './lazyNamed';

/*
 * Code splitting (Phase 4).
 *
 * Everything below is loaded on demand rather than in the initial bundle. The two editors
 * alone are ~6,300 LOC, ProjectAnalytics pulls in recharts, and GoogleDriveIntegration pulls
 * in the Drive client — none of which a user needs before first paint. Measured baseline was
 * a single 572 kB gzip chunk and a 15 s first contentful paint on a throttled phone.
 */
const Whacanudo = lazyNamed(() => import('./components/Whacanudo'), 'Whacanudo');
const GoogleDriveIntegration = lazyNamed(() => import('./components/GoogleDriveIntegration'), 'GoogleDriveIntegration');
import { useToast } from './components/Toast';
const Dashboard = lazyNamed(() => import('./views/Dashboard'), 'Dashboard');
const Course = lazyNamed(() => import('./views/Course'), 'Course');
const Settings = lazyNamed(() => import('./views/Settings'), 'Settings');
const Studio = lazyNamed(() => import('./views/Studio'), 'Studio');



type AnimationType = keyof typeof ANIMATIONS;
type ViewMode = 'dashboard' | 'studio' | 'course' | 'settings';
type WorkspaceType = 'sandbox' | 'workbench' | 'identity' | 'strategy';
type SandboxSubTab = 'preview' | 'refine';
type WorkbenchSubTab = 'sketch' | 'precision';
type IdentitySubTab = 'guidelines' | 'mockups' | 'collateral';
type StrategySubTab = 'rivals' | 'sonic';
type StudioTab = 'preview' | 'guide' | 'refine' | 'sonic' | 'comments' | 'precision' | 'mockups' | 'competitor' | 'ecosystem' | 'draw'; // keep it temporarily for backwards comp or gradual replacement

// --- PRODUCT REQUIREMENT DOCUMENT (PRD) DATA & EXPORT UTILITIES ---


export default function App() {



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


  
  // Current Studio State
  const [description, setDescription] = useState('');
  
  // Acoustic Synthesizer states

  const [activeTab, setActiveTab] = useState<StudioTab>('preview'); // Temporary
  const [isCollabDrawerOpen, setIsCollabDrawerOpen] = useState(false);
  
  
  // Migrated from individual component scopes to App scope for Sandbox


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
  
  // Sticky Notes state

  // Mobile drawer state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check user preference or system preference
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [commentText, setCommentText] = useState('');

  // New Interactive states
  const [criticRole, setCriticRole] = useState<string>('Senior Art Director 🎨');
  const [isCriticLoading, setIsCriticLoading] = useState(false);

  // Phase D States

  // Dashboard search, stage filtering, and custom animated delete modal states

  // Dashboard states for auto-archive, interactive tour, and bulk export
  const [tourStep, setTourStep] = useState<number | null>(null);

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

  const { t, i18n } = useTranslation();




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


  // Phase D Handlers


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



  // Bulk ZIP packaging function


  // PPTX deck exporter

  // High-res PNG rendering pipeline

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
          id="btn-nav-dashboard"
          onClick={() => setView('dashboard')}
          className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-50 dark:bg-zinc-800 text-brand-lead dark:text-indigo-400' : 'text-neutral-500 dark:text-zinc-400 hover:bg-neutral-50 dark:hover:bg-zinc-900'}`}
          title="Asset Library / Workspace"
        >
          <FolderArchive size={24} />
        </button>
        
        <button 
          id="btn-nav-studio"
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
          id="btn-nav-settings"
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

        <ChunkBoundary>
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
        </ChunkBoundary>
      </div>

      {/* Google Drive Storage Modal — only fetched once the user opens it. */}
      {isGoogleDriveOpen && (
        <ChunkBoundary label="Google Drive">
          <GoogleDriveIntegration
            isOpen={isGoogleDriveOpen}
            onClose={() => setIsGoogleDriveOpen(false)}
            activeProject={activeProject}
            onImportSuccess={() => setView('dashboard')}
          />
        </ChunkBoundary>
      )}

      {/* Whacanudo Help and Role Information Overlay Modal */}
      {isWhacanudoOpen && (
        <ChunkBoundary label="help">
          <Whacanudo onClose={() => setIsWhacanudoOpen(false)} />
        </ChunkBoundary>
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
                      <ChunkBoundary>
                        <Markdown>{comment.text}</Markdown>
                      </ChunkBoundary>
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