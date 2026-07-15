import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './services/firebase';
import { BrandGuide, RefinementSuggestion } from './services/geminiService';
import { Node } from './types';

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
  whiteboardSketches?: { id: string; name: string; path?: string; color?: string; strokeWidth?: number; type?: 'path' | 'rectangle' | 'circle' | 'line'; props?: any }[];
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
  geminiKey?: string;
  openaiKey?: string;
  customEndpoint?: string;
  role?: 'Designer' | 'Server';
  keyboardMap?: KeyboardMap;
  postgresConnectionString?: string;
  supabaseUrl?: string;
  supabasePublicKey?: string;
  supabaseAnonKey?: string;
  backupMode?: 'none' | 'postgres' | 'supabase' | 'both';
}

interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  settings: AppSettings;
  isHydrated: boolean;
  user: User | null;
  loadProjects: () => Promise<void>;
  setUser: (user: User | null) => Promise<void>;
  createProject: (name?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  bulkUpdateProjects: (ids: string[], updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteProjects: (ids: string[]) => Promise<void>;
  cloneProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  addNodeToScene: (node: Node) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

function prepareForFirestore(project: Project): any {
  return {
    ...project,
    sceneGraph: JSON.stringify(project.sceneGraph),
    sceneHistory: JSON.stringify(project.sceneHistory),
  };
}

function loadFromFirestore(data: any): Project {
  return {
    ...data,
    sceneGraph: typeof data.sceneGraph === 'string' ? JSON.parse(data.sceneGraph) : (data.sceneGraph || []),
    sceneHistory: typeof data.sceneHistory === 'string' ? JSON.parse(data.sceneHistory) : (data.sceneHistory || [{ nodes: [] }]),
  };
}

export const useAppStore = create<AppState>((setStore, getStore) => ({
  projects: [],
  activeProjectId: null,
  settings: {},
  isHydrated: false,
  user: null,

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
        // If user is already set, load remote projects
        const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fbProjects: Project[] = [];
        querySnapshot.forEach((docSnap) => {
          fbProjects.push(loadFromFirestore(docSnap.data()));
        });
        const sorted = fbProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setStore({ projects: sorted, settings: storedSettings, isHydrated: true });
        await set('projects', sorted);
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
            await setDoc(userDocRef, newProfile);
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
        const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fbProjects: Project[] = [];
        querySnapshot.forEach((docSnap) => {
          fbProjects.push(loadFromFirestore(docSnap.data()));
        });

        // 3. See if there are any local unsynced projects to merge
        const rawLocalProjects = await get<any[]>('projects') || [];
        const localProjects = rawLocalProjects.map(loadFromFirestore);
        const unsyncedProjects = localProjects.filter(p => !p.ownerId || p.ownerId === 'local');

        if (unsyncedProjects.length > 0) {
          for (const p of unsyncedProjects) {
            const syncedProject = { ...p, ownerId: user.uid, updatedAt: Date.now() };
            try {
              await setDoc(doc(db, 'projects', p.id), prepareForFirestore(syncedProject));
              // Avoid duplicates
              if (!fbProjects.some(existing => existing.id === p.id)) {
                fbProjects.push(syncedProject);
              }
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `projects/${p.id}`);
            }
          }
        }

        const sorted = fbProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
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
        handleFirestoreError(err, OperationType.LIST, 'projects');
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
      try {
        await setDoc(doc(db, 'projects', newProject.id), prepareForFirestore(newProject));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `projects/${newProject.id}`);
      }
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
      try {
        await setDoc(doc(db, 'projects', newProject.id), prepareForFirestore(newProject));
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `projects/${newProject.id}`);
      }
    }

    const updatedProjects = [newProject, ...projects];
    setStore({ projects: updatedProjects });
    await set('projects', updatedProjects);
  },

  updateProject: async (id, updates) => {
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

    if (user) {
      const updatedProject = updatedProjects.find(p => p.id === id);
      if (updatedProject) {
        try {
          console.log('Updating project in Firestore:', id, updatedProject);
          await setDoc(doc(db, 'projects', id), prepareForFirestore(updatedProject));
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
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
          try {
            await setDoc(doc(db, 'projects', id), prepareForFirestore(updatedProject));
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `projects/${id}`);
          }
        }
      }
    }
  },

  deleteProject: async (id) => {
    const { user, projects, activeProjectId } = getStore();
    const updatedProjects = projects.filter(p => p.id !== id);
    setStore({ 
      projects: updatedProjects, 
      activeProjectId: activeProjectId === id ? null : activeProjectId 
    });
    await set('projects', updatedProjects);

    if (user) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
      }
    }
  },

  deleteProjects: async (ids) => {
    const { user, projects, activeProjectId } = getStore();
    const updatedProjects = projects.filter(p => !ids.includes(p.id));
    setStore({ 
      projects: updatedProjects, 
      activeProjectId: ids.includes(activeProjectId || '') ? null : activeProjectId 
    });
    await set('projects', updatedProjects);

    if (user) {
      for (const id of ids) {
        try {
          await deleteDoc(doc(db, 'projects', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
        }
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
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email || '',
          role: newSettings.role || 'Designer',
          settings: newSettings
        }, { merge: true });
      } catch (err) {
        console.error('Failed to sync settings to Firestore', err);
      }
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
