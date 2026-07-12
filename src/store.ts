import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { BrandGuide, RefinementSuggestion } from './services/geminiService';

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

export interface Project {
  id: string;
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
  comments: Comment[];
  mockups: Mockup[];
  logoHistory?: string[]; // Stack of logo history
  snapshots?: Snapshot[]; // List of version snapshots
  stickyNotes?: StickyNote[]; // Interactive sticky notes anchored to canvas
  driveFileId?: string; // Linked Google Drive file identifier
}

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
}

interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  settings: AppSettings;
  isHydrated: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteProjects: (ids: string[]) => Promise<void>;
  cloneProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((setStore, getStore) => ({
  projects: [],
  activeProjectId: null,
  settings: {},
  isHydrated: false,

  loadProjects: async () => {
    try {
      const storedProjects = await get<Project[]>('projects') || [];
      const storedSettings = await get<AppSettings>('settings') || {};
      if (!storedSettings.role) {
        storedSettings.role = 'Designer';
      }
      setStore({ projects: storedProjects, settings: storedSettings, isHydrated: true });
    } catch (e) {
      console.error('Failed to load projects/settings', e);
      setStore({ isHydrated: true });
    }
  },

  createProject: async (name = 'Untitled Brand') => {
    const now = Date.now();
    const newProject: Project = {
      id: crypto.randomUUID(),
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
      comments: [],
      mockups: [],
      logoHistory: [],
      snapshots: [],
      stickyNotes: []
    };
    
    const { projects } = getStore();
    const updatedProjects = [newProject, ...projects];
    setStore({ projects: updatedProjects, activeProjectId: newProject.id });
    await set('projects', updatedProjects);
    return newProject;
  },

  cloneProject: async (id) => {
    const { projects } = getStore();
    const projectToClone = projects.find(p => p.id === id);
    if (!projectToClone) return;

    const newProject: Project = {
      ...projectToClone,
      id: crypto.randomUUID(),
      name: `Copy of ${projectToClone.name}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false
    };

    const updatedProjects = [newProject, ...projects];
    setStore({ projects: updatedProjects });
    await set('projects', updatedProjects);
  },

  updateProject: async (id, updates) => {
    const { projects } = getStore();
    const updatedProjects = projects.map(p => 
      p.id === id 
        ? { ...p, ...updates, updatedAt: Date.now() } 
        : p
    );
    setStore({ projects: updatedProjects });
    await set('projects', updatedProjects);
  },

  deleteProject: async (id) => {
    const { projects, activeProjectId } = getStore();
    const updatedProjects = projects.filter(p => p.id !== id);
    setStore({ 
      projects: updatedProjects, 
      activeProjectId: activeProjectId === id ? null : activeProjectId 
    });
    await set('projects', updatedProjects);
  },

  deleteProjects: async (ids) => {
    const { projects, activeProjectId } = getStore();
    const updatedProjects = projects.filter(p => !ids.includes(p.id));
    setStore({ 
      projects: updatedProjects, 
      activeProjectId: ids.includes(activeProjectId || '') ? null : activeProjectId 
    });
    await set('projects', updatedProjects);
  },

  setActiveProject: (id) => {
    setStore({ activeProjectId: id });
  },

  updateSettings: async (updates) => {
    const { settings } = getStore();
    const newSettings = { ...settings, ...updates };
    setStore({ settings: newSettings });
    await set('settings', newSettings);
  }
}));
