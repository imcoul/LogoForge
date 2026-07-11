import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { BrandGuide, RefinementSuggestion } from './services/geminiService';

export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  logoUrl: string | null;
  logoMimeType: string;
  description: string;
  brandGuide: BrandGuide | null;
  sonicAssets: { name: string; base64Data: string; mimeType: string }[]; 
  sonicPhilosophy: string | null;
  refinementFiles: { name: string; base64Data: string; mimeType: string }[];
  refinementSuggestions: RefinementSuggestion | null;
  comments: Comment[]; 
}

interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  isHydrated: boolean;
  loadProjects: () => Promise<void>;
  createProject: (name?: string) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setActiveProject: (id: string | null) => void;
}

export const useAppStore = create<AppState>((setStore, getStore) => ({
  projects: [],
  activeProjectId: null,
  isHydrated: false,

  loadProjects: async () => {
    try {
      const storedProjects = await get<Project[]>('projects') || [];
      setStore({ projects: storedProjects, isHydrated: true });
    } catch (e) {
      console.error('Failed to load projects', e);
      setStore({ isHydrated: true });
    }
  },

  createProject: async (name = 'Untitled Brand') => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      logoUrl: null,
      logoMimeType: 'image/png',
      description: '',
      brandGuide: null,
      sonicAssets: [],
      sonicPhilosophy: null,
      refinementFiles: [],
      refinementSuggestions: null,
      comments: []
    };
    
    const { projects } = getStore();
    const updatedProjects = [newProject, ...projects];
    setStore({ projects: updatedProjects, activeProjectId: newProject.id });
    await set('projects', updatedProjects);
    return newProject;
  },

  updateProject: async (id, updates) => {
    const { projects } = getStore();
    const updatedProjects = projects.map(p => p.id === id ? { ...p, ...updates } : p);
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

  setActiveProject: (id) => {
    setStore({ activeProjectId: id });
  }
}));
