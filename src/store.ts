import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, setDoc, doc, deleteDoc, disableNetwork } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './services/firebase';
import { BrandGuide, RefinementSuggestion } from './services/geminiService';
import { syncProjectToPostgres, syncProjectToSupabase, deleteProjectFromPostgres, deleteProjectFromSupabase, loadProjectsFromSupabase } from './utils/dbBackupClient';
import { Node } from './types';

const cloudSyncTimeouts: Record<string, NodeJS.Timeout | null> = {};
const pendingCloudUpdates: Record<string, Partial<Project>> = {};

let isCloudSyncSuspended = false;

export const handleCloudErrorGracefully = (err: any) => {
  const errMsg = err instanceof Error ? err.message : String(err);
  const isQuota = 
    errMsg.includes('resource-exhausted') || 
    errMsg.includes('Quota limit exceeded') || 
    errMsg.includes('quota') || 
    (err && err.code === 'resource-exhausted');

  if (isQuota) {
    console.warn("Cloud operation failed due to Firestore Quota limit:", errMsg);
    if (!isCloudSyncSuspended) {
      isCloudSyncSuspended = true;
      try {
        useAppStore.setState({ isCloudSyncSuspended: true });
      } catch (e) {
        console.warn("Failed to set isCloudSyncSuspended in store state", e);
      }
      
      // Call disableNetwork to stop any write stream background connections
      try {
        disableNetwork(db).catch(dnsErr => {
          console.warn("Failed to cleanly disable Firestore network:", dnsErr);
        });
      } catch (dnsErr) {
        console.warn("Failed to call disableNetwork:", dnsErr);
      }

      console.warn("⚠️ Firestore Daily Quota Exceeded. Safely falling back to Local Offline-first Storage (IndexedDB)!");
      try {
        window.dispatchEvent(new CustomEvent('cloud-sync-suspended', { 
          detail: { 
            message: "⚠️ Cloud Sync paused: Firestore Daily Quota Exceeded. Safely falling back to Local Offline-first Storage (IndexedDB) so your work is preserved!" 
          } 
        }));
      } catch (e) {
        // Safe if running server-side or without window
      }
    }
    return true; // Quota exceeded handled
  } else {
    console.error("Cloud write failed:", errMsg);
  }
  return false; // Not a quota issue
};

async function safeWriteToFirestore(writeFn: () => Promise<void>) {
  if (isCloudSyncSuspended) {
    return;
  }
  try {
    await writeFn();
  } catch (err) {
    const isQuotaExceeded = handleCloudErrorGracefully(err);
    if (!isQuotaExceeded) {
      throw err; // Rethrow other errors
    }
  }
}

export type ProjectStage = 'discovery' | 'ideation' | 'drafting' | 'refinement' | 'delivery';

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface Mockup {
  id: string;
  name: string;
  base64Data: string;
  mimeType: string;
}

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  svgSource: string | null;
  logoUrl: string | null;
}

export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export type Project = {
  id: string;
  ownerId?: string; // Firebase user ID or 'local'
  name: string;
  createdAt: number;
  updatedAt?: number; // Last modified timestamp
  archived?: boolean; // Archived status for 30+ days inactive projects
  stage: ProjectStage;
  logoUrl: string | null;
  logoMimeType: string;
  svgSource: string | null; // For raw SVG editing
  description: string;
  brandGuide: BrandGuide | null;
  sonicAssets: { name: string; base64Data: string; mimeType: string }[]; 
  sonicPhilosophy: string | null;
  refinementFiles: { name: string; base64Data: string; mimeType: string }[];
  refinementSuggestions: RefinementSuggestion | null;
  competitorAnalysis: string | null; // Phase D: Competitor Engine
  ecosystemAssets: { type: string; content: string }[]; // Phase D: Ecosystem Automation
  sceneGraph: Node[];
  sceneHistory: { nodes: Node[] }[];
  sceneHistoryIndex: number;
  comments: Comment[];
  mockups: Mockup[];
  logoHistory?: string[]; // Stack of logo history
  snapshots?: Snapshot[]; // List of version snapshots
  stickyNotes?: StickyNote[]; // Interactive sticky notes anchored to canvas
  whiteboardSketches?: { id: string; name: string; path?: string; color?: string; strokeWidth?: number; type?: 'path' | 'rectangle' | 'circle' | 'line'; props?: any; fillColor?: string; fillOpacity?: number; strokeDashArray?: string; locked?: boolean; maskId?: string; maskType?: 'hide' | 'reveal' }[];
  driveFileId?: string; // Linked Google Drive file identifier
  tags?: string[]; // Bulk tags for organization
};

export interface KeyboardMap {
  save: string;
  undo: string;
  redo: string;
  export: string;
  tabPreview: string;
  tabPrecision: string;
  tabMockups: string;
  tabGuide: string;
  tabRefine: string;
  tabSonic: string;
  comments: string;
}

export interface AppSettings {
  primaryDatabase?: 'firestore' | 'supabase';
  geminiKey?: string;
  openaiKey?: string;
  customEndpoint?: string;
  activeModel?: string; // 'gemini' | 'stepfun' | 'poolside' | 'tencent'
  stepfunKey?: string;
  stepfunEndpoint?: string;
  poolsideKey?: string;
  poolsideEndpoint?: string;
  tencentKey?: string;
  tencentEndpoint?: string;
  role?: 'Designer' | 'Server';
  keyboardMap?: KeyboardMap;
  postgresConnectionString?: string;
  supabaseUrl?: string;
  supabasePublicKey?: string;
  supabaseAnonKey?: string;
  backupMode?: 'none' | 'postgres' | 'supabase' | 'both';
  figmaToken?: string;
  figmaFileId?: string;
  assistantModel?: string;
  assistantTemperature?: number;
  assistantTopK?: number;
}

interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  settings: AppSettings;
  isHydrated: boolean;
  user: User | null;
  isCloudSyncSuspended: boolean;
  loadProjects: () => Promise<void>;
  setUser: (user: User | null) => Promise<void>;
  createProject: (name?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>, throttleCloud?: boolean | 'skip') => Promise<void>;
  bulkUpdateProjects: (ids: string[], updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteProjects: (ids: string[]) => Promise<void>;
  cloneProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  addNodeToScene: (node: Node) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  ephemeralGhosts: Record<string, any>;
  setEphemeralGhost: (id: string, ghostData: any) => void;
  clearEphemeralGhost: (id: string) => void;
}

import { computePayloadHash } from './utils/serializers';

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned;
  }
  return obj;
}

function restoreOmittedFields(fbProj: Project, localProj?: Project): Project {
  if (!localProj) return fbProj;
  
  const restored = { ...fbProj };
  
  if (fbProj.mockups && localProj.mockups) {
    restored.mockups = fbProj.mockups.map(fbMockup => {
      if (fbMockup.base64Data && fbMockup.base64Data.includes('omitted for Cloud Sync')) {
        const localMockup = localProj.mockups.find(m => m.id === fbMockup.id);
        if (localMockup && localMockup.base64Data && !localMockup.base64Data.includes('omitted for Cloud Sync')) {
          return { ...fbMockup, base64Data: localMockup.base64Data };
        }
      }
      return fbMockup;
    });
  }
  
  if (fbProj.sonicAssets && localProj.sonicAssets) {
    restored.sonicAssets = fbProj.sonicAssets.map(fbSonic => {
      if (fbSonic.base64Data && fbSonic.base64Data.includes('omitted for Cloud Sync')) {
        const localSonic = localProj.sonicAssets.find(s => s.name === fbSonic.name);
        if (localSonic && localSonic.base64Data && !localSonic.base64Data.includes('omitted for Cloud Sync')) {
          return { ...fbSonic, base64Data: localSonic.base64Data };
        }
      }
      return fbSonic;
    });
  }
  
  if (fbProj.refinementFiles && localProj.refinementFiles) {
    restored.refinementFiles = fbProj.refinementFiles.map(fbRef => {
      if (fbRef.base64Data && fbRef.base64Data.includes('omitted for Cloud Sync')) {
        const localRef = localProj.refinementFiles.find(r => r.name === fbRef.name);
        if (localRef && localRef.base64Data && !localRef.base64Data.includes('omitted for Cloud Sync')) {
          return { ...fbRef, base64Data: localRef.base64Data };
        }
      }
      return fbRef;
    });
  }
  
  if (fbProj.logoUrl && fbProj.logoUrl.includes('Omitted for cloud space') && localProj.logoUrl && !localProj.logoUrl.includes('Omitted for cloud space')) {
    restored.logoUrl = localProj.logoUrl;
  }
  
  return restored;
}

export function prepareForFirestore(project: Project): any {
  // Work on a shallow copy of the project object so we do not mutate original local store state
  const p = { ...project };

  // Initial serialization and clean-up
  let serialized = {
    ...p,
    sceneGraph: JSON.stringify(p.sceneGraph || []),
    sceneHistory: JSON.stringify(p.sceneHistory || []),
  };

  let cleaned = cleanUndefined(serialized);
  let currentSize = JSON.stringify(cleaned).length;

  const MAX_FIRESTORE_SIZE = 950000; // Leave buffer for metadata

  // --- Progressive Reduction Steps ---

  // Step 1: Prune scene history to last 5 entries
  if (currentSize > MAX_FIRESTORE_SIZE && p.sceneHistory && p.sceneHistory.length > 5) {
    const index = typeof p.sceneHistoryIndex === 'number' ? p.sceneHistoryIndex : 0;
    const startIdx = Math.max(0, p.sceneHistory.length - 5);
    p.sceneHistory = p.sceneHistory.slice(startIdx);
    p.sceneHistoryIndex = Math.max(0, index - startIdx);
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 2: Prune scene history to last 2 entries
  if (currentSize > MAX_FIRESTORE_SIZE && p.sceneHistory && p.sceneHistory.length > 2) {
    const index = typeof p.sceneHistoryIndex === 'number' ? p.sceneHistoryIndex : 0;
    const startIdx = Math.max(0, p.sceneHistory.length - 2);
    p.sceneHistory = p.sceneHistory.slice(startIdx);
    p.sceneHistoryIndex = Math.max(0, index - startIdx);
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 3: Prune scene history to only 1 entry (current state)
  if (currentSize > MAX_FIRESTORE_SIZE && p.sceneHistory && p.sceneHistory.length > 1) {
    p.sceneHistory = [{ nodes: p.sceneGraph || [] }];
    p.sceneHistoryIndex = 0;
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 4: Prune logoHistory list
  if (currentSize > MAX_FIRESTORE_SIZE && p.logoHistory && p.logoHistory.length > 2) {
    p.logoHistory = p.logoHistory.slice(-2);
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 5: Prune version snapshots list
  if (currentSize > MAX_FIRESTORE_SIZE && p.snapshots && p.snapshots.length > 1) {
    p.snapshots = p.snapshots.slice(-1);
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 6: Truncate large base64 mockups (> 25KB)
  if (currentSize > MAX_FIRESTORE_SIZE && p.mockups && p.mockups.length > 0) {
    p.mockups = p.mockups.map(m => {
      if (m.base64Data && m.base64Data.length > 25000) {
        return {
          ...m,
          base64Data: `[Large mockup asset omitted for Cloud Sync. Size: ${m.base64Data.length} chars. Fully preserved in local browser database.]`
        };
      }
      return m;
    });
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 7: Truncate large base64 sonic assets (> 25KB)
  if (currentSize > MAX_FIRESTORE_SIZE && p.sonicAssets && p.sonicAssets.length > 0) {
    p.sonicAssets = p.sonicAssets.map(s => {
      if (s.base64Data && s.base64Data.length > 25000) {
        return {
          ...s,
          base64Data: `[Large sonic asset omitted for Cloud Sync. Size: ${s.base64Data.length} chars. Fully preserved in local browser database.]`
        };
      }
      return s;
    });
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 8: Truncate large base64 refinement files (> 25KB)
  if (currentSize > MAX_FIRESTORE_SIZE && p.refinementFiles && p.refinementFiles.length > 0) {
    p.refinementFiles = p.refinementFiles.map(r => {
      if (r.base64Data && r.base64Data.length > 25000) {
        return {
          ...r,
          base64Data: `[Large refinement asset omitted for Cloud Sync. Size: ${r.base64Data.length} chars. Fully preserved in local browser database.]`
        };
      }
      return r;
    });
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  // Step 9: Truncate large logoUrl if it's base64 data URL
  if (currentSize > MAX_FIRESTORE_SIZE && p.logoUrl && p.logoUrl.startsWith('data:') && p.logoUrl.length > 50000) {
    p.logoUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text y="50">Omitted for cloud space</text></svg>`;
    
    serialized = {
      ...p,
      sceneGraph: JSON.stringify(p.sceneGraph || []),
      sceneHistory: JSON.stringify(p.sceneHistory || []),
    };
    cleaned = cleanUndefined(serialized);
    currentSize = JSON.stringify(cleaned).length;
  }

  return cleaned;
}

function loadFromFirestore(data: any): Project {
  return {
    ...data,
    sceneGraph: typeof data.sceneGraph === 'string' ? JSON.parse(data.sceneGraph) : (data.sceneGraph || []),
    sceneHistory: typeof data.sceneHistory === 'string' ? JSON.parse(data.sceneHistory) : (data.sceneHistory || [{ nodes: [] }]),
  };
}

const lastSyncHashes: Record<string, string> = {};

async function triggerBackupMirror(project: Project, settings: AppSettings) {
  const prepared = prepareForFirestore(project);
  const payloadStr = JSON.stringify(prepared);
  
  // Implement robust payload hash tracking to avoid redundant network hits
  const backupHash = await computePayloadHash(prepared);
  
  if (lastSyncHashes[project.id] === backupHash) {
    return; // Throttle: No changes detected
  }
  lastSyncHashes[project.id] = backupHash;

  // Add audit and drift tracking metadata
  const mirroredProject = {
    ...prepared,
    backupHash,
    schemaVersion: '1.1.0'
  };

  // Implement chunked document processing for Firestore limits (Simulated via segmenting large collections)
  // ... chunking logic can be handled deeper in sync services if necessary
  
  if (settings.backupMode === 'postgres' || settings.backupMode === 'both') {
    syncProjectToPostgres(mirroredProject, settings.postgresConnectionString).then((res) => {
      if (!res.success) {
        console.warn('Auto PostgreSQL Backup failed:', res.message);
      }
    });
  }
  if (settings.backupMode === 'supabase' || settings.backupMode === 'both') {
    syncProjectToSupabase(mirroredProject, settings.supabaseUrl, settings.supabaseAnonKey).then((res) => {
      if (!res.success) {
        console.warn('Auto Supabase Backup failed:', res.message);
      }
    });
  }
}

async function triggerBackupDelete(id: string, settings: AppSettings) {
  if (settings.backupMode === 'postgres' || settings.backupMode === 'both') {
    deleteProjectFromPostgres(id, settings.postgresConnectionString).then((res) => {
      if (!res.success) {
        console.warn('Auto PostgreSQL Delete failed:', res.message);
      }
    });
  }
  if (settings.backupMode === 'supabase' || settings.backupMode === 'both') {
    deleteProjectFromSupabase(id, settings.supabaseUrl, settings.supabaseAnonKey).then((res) => {
      if (!res.success) {
        console.warn('Auto Supabase Delete failed:', res.message);
      }
    });
  }
}

export const useAppStore = create<AppState>((setStore, getStore) => ({
  projects: [],
  activeProjectId: null,
  settings: {},
  isHydrated: false,
  user: null,
  isCloudSyncSuspended: false,
  ephemeralGhosts: {},
  setEphemeralGhost: (id, ghostData) => setStore((state) => ({
    ephemeralGhosts: { ...state.ephemeralGhosts, [id]: ghostData }
  })),
  clearEphemeralGhost: (id) => setStore((state) => {
    const next = { ...state.ephemeralGhosts };
    delete next[id];
    return { ephemeralGhosts: next };
  }),

  // ... (existing methods remain the same, just adding undo/redo)
  undo: async () => {
    const { activeProjectId, projects, updateProject } = getStore();
    if (!activeProjectId) return;
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;

    const history = (project.sceneHistory || [{ nodes: project.sceneGraph || [] }]).map(h => h.nodes);
    const index = typeof project.sceneHistoryIndex === 'number' ? project.sceneHistoryIndex : 0;
    
    if (index <= 0) return;
    
    const newIndex = index - 1;
    await updateProject(activeProjectId, {
      sceneGraph: history[newIndex],
      sceneHistoryIndex: newIndex
    });
  },

  redo: async () => {
    const { activeProjectId, projects, updateProject } = getStore();
    if (!activeProjectId) return;
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;
    
    const history = (project.sceneHistory || [{ nodes: project.sceneGraph || [] }]).map(h => h.nodes);
    const index = typeof project.sceneHistoryIndex === 'number' ? project.sceneHistoryIndex : 0;

    if (index >= history.length - 1) return;
    
    const newIndex = index + 1;
    await updateProject(activeProjectId, {
      sceneGraph: history[newIndex],
      sceneHistoryIndex: newIndex
    });
  },

  loadProjects: async () => {
    try {
      const rawStoredProjects = await get<any[]>('projects') || [];
      const storedProjects = rawStoredProjects.map(loadFromFirestore);
      const storedSettings = await get<AppSettings>('settings') || {};
      if (!storedSettings.role) {
        storedSettings.role = 'Designer';
      }
      
      const { user } = getStore();
      if (user) {
        try {
          // If user is already set, load remote projects
          let fbProjects: Project[] = [];
          if (storedSettings.primaryDatabase === 'supabase') {
            const res = await loadProjectsFromSupabase(user.uid, storedSettings.supabaseUrl, storedSettings.supabaseAnonKey);
            if (res.success && res.projects) {
              fbProjects = res.projects.map(loadFromFirestore);
            } else {
              throw new Error(res.message);
            }
          } else {
            const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => {
              fbProjects.push(loadFromFirestore(docSnap.data()));
            });
          }
          const sorted = fbProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setStore({ projects: sorted, settings: storedSettings, isHydrated: true });
          await set('projects', sorted);
        } catch (fbError) {
          console.error('Failed to load remote projects from Firestore, falling back to local cache:', fbError);
          handleCloudErrorGracefully(fbError);
          const userProjects = storedProjects.filter(p => p.ownerId === user.uid || !p.ownerId || p.ownerId === 'local');
          setStore({ projects: userProjects, settings: storedSettings, isHydrated: true });
        }
      } else {
        // Otherwise use local projects
        const localOnly = storedProjects.filter(p => !p.ownerId || p.ownerId === 'local');
        setStore({ projects: localOnly, settings: storedSettings, isHydrated: true });
      }
    } catch (e) {
      console.error('Failed to load projects/settings', e);
      setStore({ isHydrated: true });
    }
  },

  setUser: async (user: User | null) => {
    setStore({ user });
    if (user) {
      try {
        // 1. Fetch or create user preferences/role in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        let userRole: 'Designer' | 'Server' = 'Designer';
        let userSettings: AppSettings = {};

        try {
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const profileData = docSnap.data();
            userRole = profileData.role || 'Designer';
            userSettings = profileData.settings || {};
          } else {
            // Profile does not exist yet, create it!
            userRole = user.email === 'lcoulagency@gmail.com' ? 'Server' : 'Designer';
            const localSettings = await get<AppSettings>('settings') || {};
            userSettings = { ...localSettings };
            
            const newProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              role: userRole,
              settings: userSettings
            };
            await safeWriteToFirestore(async () => {
              await setDoc(userDocRef, cleanUndefined(newProfile));
            });
          }
        } catch (err) {
          console.error('Failed to load user profile from Firestore, using default', err);
          userRole = user.email === 'lcoulagency@gmail.com' ? 'Server' : 'Designer';
          userSettings = await get<AppSettings>('settings') || {};
        }

        // Apply loaded role and settings
        userSettings.role = userRole;
        setStore({ settings: userSettings });
        await set('settings', userSettings);

        // 2. Fetch remote projects
        let fbProjects: Project[] = [];
        if (userSettings.primaryDatabase === 'supabase') {
          const res = await loadProjectsFromSupabase(user.uid, userSettings.supabaseUrl, userSettings.supabaseAnonKey);
          if (res.success && res.projects) {
            fbProjects = res.projects.map(loadFromFirestore);
          } else {
            console.error('Failed to load projects from Supabase in setUser:', res.message);
          }
        } else {
          const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((docSnap) => {
            fbProjects.push(loadFromFirestore(docSnap.data()));
          });
        }

        // 3. See if there are any local unsynced projects to merge
        const rawLocalProjects = await get<any[]>('projects') || [];
        const localProjects = rawLocalProjects.map(loadFromFirestore);
        const unsyncedProjects = localProjects.filter(p => !p.ownerId || p.ownerId === 'local');

        if (unsyncedProjects.length > 0) {
          for (const p of unsyncedProjects) {
            const syncedProject = { ...p, ownerId: user.uid, updatedAt: Date.now() };
            let writeSuccessful = false;
            await safeWriteToFirestore(async () => {
              await setDoc(doc(db, 'projects', p.id), prepareForFirestore(syncedProject));
              writeSuccessful = true;
            });
            // Mirror to cloud backup, even if cloud sync is suspended
            triggerBackupMirror(syncedProject, userSettings);
            if (writeSuccessful || isCloudSyncSuspended) {
              // Avoid duplicates
              if (!fbProjects.some(existing => existing.id === p.id)) {
                fbProjects.push(syncedProject);
              }
            }
          }
        }

        const restoredFbProjects = fbProjects.map(fbProj => {
          const matchingLocal = localProjects.find(lp => lp.id === fbProj.id);
          return restoreOmittedFields(fbProj, matchingLocal);
        });

        const sorted = restoredFbProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        const initializedProjects = sorted.map(p => ({
            ...p,
            sceneHistory: (Array.isArray(p.sceneHistory) && p.sceneHistory.length > 0 && typeof (p.sceneHistory[0] as any).nodes !== 'undefined')
                ? p.sceneHistory
                : [{ nodes: p.sceneGraph || [] }],
            sceneHistoryIndex: typeof p.sceneHistoryIndex === 'number' ? p.sceneHistoryIndex : 0,
            sceneGraph: p.sceneGraph || []
        }));
        setStore({ projects: initializedProjects });
        await set('projects', initializedProjects);
      } catch (err) {
        console.error('Failed to sync or authenticate user profile', err);
        const isQuota = handleCloudErrorGracefully(err);
        if (!isQuota) {
          handleFirestoreError(err, OperationType.LIST, 'projects');
        } else {
          const rawStoredProjects = await get<any[]>('projects') || [];
          const storedProjects = rawStoredProjects.map(loadFromFirestore);
          const userProjects = storedProjects.filter(p => p.ownerId === user.uid || !p.ownerId || p.ownerId === 'local');
          setStore({ projects: userProjects });
        }
      }
    } else {
      // User logged out, restore local-only projects & reset settings to local state
      const rawStoredProjects = await get<any[]>('projects') || [];
      const storedProjects = rawStoredProjects.map(loadFromFirestore);
      const localOnly = storedProjects.filter(p => !p.ownerId || p.ownerId === 'local');
      const storedSettings = await get<AppSettings>('settings') || {};
      if (!storedSettings.role) {
        storedSettings.role = 'Designer';
      }
      setStore({ projects: localOnly, activeProjectId: null, settings: storedSettings });
    }
  },

  createProject: async (name = 'Untitled Brand') => {
    const now = Date.now();
    const { user, projects } = getStore();
    const ownerId = user ? user.uid : 'local';

    const newProject: Project = {
      id: crypto.randomUUID(),
      ownerId,
      name,
      createdAt: now,
      updatedAt: now,
      archived: false,
      stage: 'discovery',
      logoUrl: null,
      logoMimeType: 'image/png',
      svgSource: null,
      description: '',
      brandGuide: null,
      sonicAssets: [],
      sonicPhilosophy: null,
      refinementFiles: [],
      refinementSuggestions: null,
      competitorAnalysis: null,
      ecosystemAssets: [],
      sceneGraph: [],
      sceneHistory: [{ nodes: [] }],
      sceneHistoryIndex: 0,
      comments: [],
      mockups: [],
      logoHistory: [],
      snapshots: [],
      stickyNotes: []
    };
    
    if (user) {
      await safeWriteToFirestore(async () => {
        await setDoc(doc(db, 'projects', newProject.id), prepareForFirestore(newProject));
      });
      // Mirror to cloud backup, even if cloud sync is suspended
      triggerBackupMirror(newProject, getStore().settings);
    }

    const updatedProjects = [newProject, ...projects];
    setStore({ projects: updatedProjects, activeProjectId: newProject.id });
    await set('projects', updatedProjects);
    return newProject;
  },

  cloneProject: async (id) => {
    const { user, projects } = getStore();
    const projectToClone = projects.find(p => p.id === id);
    if (!projectToClone) return;

    const ownerId = user ? user.uid : 'local';
    const newProject: Project = {
      ...projectToClone,
      id: crypto.randomUUID(),
      ownerId,
      name: `Copy of ${projectToClone.name}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
      sceneHistory: projectToClone.sceneHistory || [{ nodes: projectToClone.sceneGraph || [] }]
    };

    if (user) {
      await safeWriteToFirestore(async () => {
        await setDoc(doc(db, 'projects', newProject.id), prepareForFirestore(newProject));
      });
      // Mirror to cloud backup, even if cloud sync is suspended
      triggerBackupMirror(newProject, getStore().settings);
    }

    const updatedProjects = [newProject, ...projects];
    setStore({ projects: updatedProjects });
    await set('projects', updatedProjects);
  },

  updateProject: async (id, updates, throttleCloud: boolean | 'skip' = true) => {
    const { user, projects } = getStore();
    const updatedProjects = projects.map(p => {
      if (p.id !== id) return p;
      const finalUpdates = { ...updates };
      if (updates.stage) {
        const stages = ['discovery', 'ideation', 'drafting', 'refinement', 'delivery'];
        const currentIdx = stages.indexOf(p.stage);
        const nextIdx = stages.indexOf(updates.stage);
        if (nextIdx < currentIdx) {
          delete finalUpdates.stage;
        }
      }
      return { ...p, ...finalUpdates, updatedAt: Date.now() };
    });
    setStore({ projects: updatedProjects });
    await set('projects', updatedProjects);

    if (user && throttleCloud !== 'skip') {
      if (throttleCloud) {
        // Accumulate updates in the pending map
        pendingCloudUpdates[id] = { ...(pendingCloudUpdates[id] || {}), ...updates };
        
        if (!cloudSyncTimeouts[id]) {
          // Set a 1-second timeout to flush changes
          cloudSyncTimeouts[id] = setTimeout(async () => {
            const accumulatedUpdates = pendingCloudUpdates[id];
            delete pendingCloudUpdates[id];
            cloudSyncTimeouts[id] = null;
            
            const { projects: currentProjects } = getStore();
            const currentProj = currentProjects.find(p => p.id === id);
            if (currentProj) {
              console.log('Flushing throttled updates to Firestore:', id);
              await safeWriteToFirestore(async () => {
                await setDoc(doc(db, 'projects', id), prepareForFirestore(currentProj));
              });
              // Mirror to cloud backup, even if cloud sync is suspended
              triggerBackupMirror(currentProj, getStore().settings);
            }
          }, 1000);
        }
      } else {
        // Immediate save: clear active timeouts and merge pending accumulators
        if (cloudSyncTimeouts[id]) {
          clearTimeout(cloudSyncTimeouts[id]);
          cloudSyncTimeouts[id] = null;
        }
        delete pendingCloudUpdates[id];
        
        const updatedProject = updatedProjects.find(p => p.id === id);
        if (updatedProject) {
          console.log('Immediate update to Firestore:', id);
          await safeWriteToFirestore(async () => {
            await setDoc(doc(db, 'projects', id), prepareForFirestore(updatedProject));
          });
          // Mirror to cloud backup, even if cloud sync is suspended
          triggerBackupMirror(updatedProject, getStore().settings);
        }
      }
    }
  },

  bulkUpdateProjects: async (ids, updates) => {
    const { user, projects } = getStore();
    const updatedProjects = projects.map(p => {
      if (!ids.includes(p.id)) return p;
      const finalUpdates = { ...updates };
      if (updates.stage) {
        const stages = ['discovery', 'ideation', 'drafting', 'refinement', 'delivery'];
        const currentIdx = stages.indexOf(p.stage);
        const nextIdx = stages.indexOf(updates.stage);
        if (nextIdx < currentIdx) {
          delete finalUpdates.stage;
        }
      }
      return { ...p, ...finalUpdates, updatedAt: Date.now() };
    });
    setStore({ projects: updatedProjects });
    await set('projects', updatedProjects);

    if (user) {
      for (const id of ids) {
        const updatedProject = updatedProjects.find(p => p.id === id);
        if (updatedProject) {
          await safeWriteToFirestore(async () => {
            await setDoc(doc(db, 'projects', id), prepareForFirestore(updatedProject));
          });
          // Mirror to cloud backup, even if cloud sync is suspended
          triggerBackupMirror(updatedProject, getStore().settings);
        }
      }
    }
  },

  deleteProject: async (id) => {
    const { user, projects, activeProjectId, settings } = getStore();
    const updatedProjects = projects.filter(p => p.id !== id);
    setStore({ 
      projects: updatedProjects, 
      activeProjectId: activeProjectId === id ? null : activeProjectId 
    });
    await set('projects', updatedProjects);

    // Sync deletion to Postgres/Supabase backups
    triggerBackupDelete(id, settings);

    if (user) {
      await safeWriteToFirestore(async () => {
        await deleteDoc(doc(db, 'projects', id));
      });
    }
  },

  deleteProjects: async (ids) => {
    const { user, projects, activeProjectId, settings } = getStore();
    const updatedProjects = projects.filter(p => !ids.includes(p.id));
    setStore({ 
      projects: updatedProjects, 
      activeProjectId: ids.includes(activeProjectId || '') ? null : activeProjectId 
    });
    await set('projects', updatedProjects);

    // Sync deletions to Postgres/Supabase backups
    for (const id of ids) {
      triggerBackupDelete(id, settings);
    }

    if (user) {
      for (const id of ids) {
        await safeWriteToFirestore(async () => {
          await deleteDoc(doc(db, 'projects', id));
        });
      }
    }
  },

  setActiveProject: (id) => {
    setStore({ activeProjectId: id });
  },

  updateSettings: async (updates) => {
    const { settings, user } = getStore();
    const newSettings = { ...settings, ...updates };
    setStore({ settings: newSettings });
    await set('settings', newSettings);

    if (user) {
      await safeWriteToFirestore(async () => {
        await setDoc(doc(db, 'users', user.uid), cleanUndefined({
          uid: user.uid,
          email: user.email || '',
          role: newSettings.role || 'Designer',
          settings: newSettings
        }), { merge: true });
      });
    }
  },

  addNodeToScene: async (node) => {
    const { activeProjectId, projects, updateProject } = getStore();
    if (!activeProjectId) return;
    const project = projects.find(p => p.id === activeProjectId);
    if (!project) return;
    const updatedNodes = [...(project.sceneGraph || []), node];
    
    // Ensure history exists
    const history = project.sceneHistory || [{ nodes: project.sceneGraph || [] }];
    const index = typeof project.sceneHistoryIndex === 'number' ? project.sceneHistoryIndex : 0;
    
    // Maintain history: Remove redo history if we are in the middle of the stack
    const newHistory = history.slice(0, index + 1);
    newHistory.push({ nodes: updatedNodes });
    
    await updateProject(activeProjectId, { 
      sceneGraph: updatedNodes,
      sceneHistory: newHistory,
      sceneHistoryIndex: newHistory.length - 1
    });
  }
}));
