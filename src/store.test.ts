import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from './store';

vi.mock('idb-keyval', () => {
  const store: Record<string, any> = {};
  return {
    get: async (key: string) => store[key],
    set: async (key: string, val: any) => { store[key] = val; },
  };
});

describe('AppStore', () => {
  beforeEach(() => {
    // Reset state before each test
    useAppStore.setState({ projects: [], activeProjectId: null });
  });

  it('creates a new project', async () => {
    const store = useAppStore.getState();
    const newProject = await store.createProject();
    
    expect(newProject).toBeDefined();
    expect(newProject.name).toBe('Untitled Brand');
    expect(newProject.stage).toBe('discovery');
    
    const updatedStore = useAppStore.getState();
    expect(updatedStore.projects.length).toBe(1);
    expect(updatedStore.activeProjectId).toBe(newProject.id);
  });

  it('handles sticky notes and snapshots', async () => {
    const store = useAppStore.getState();
    const newProject = await store.createProject();

    // Add sticky note
    const note = { id: 'n1', text: 'Corner radius update', x: 50, y: 50, color: '#FDE047' };
    await store.updateProject(newProject.id, {
      stickyNotes: [note],
      snapshots: [
        { id: 's1', name: 'Draft 1', timestamp: Date.now(), svgSource: '<svg></svg>', logoUrl: null }
      ]
    });

    const updatedProject = useAppStore.getState().projects[0];
    expect(updatedProject.stickyNotes?.length).toBe(1);
    expect(updatedProject.stickyNotes?.[0].text).toBe('Corner radius update');
    expect(updatedProject.snapshots?.length).toBe(1);
    expect(updatedProject.snapshots?.[0].name).toBe('Draft 1');
  });

  it('updates an existing project', async () => {
    const store = useAppStore.getState();
    const newProject = await store.createProject();
    
    await store.updateProject(newProject.id, { name: 'Updated Name', stage: 'ideation' });
    
    const updatedProject = useAppStore.getState().projects[0];
    expect(updatedProject.name).toBe('Updated Name');
    expect(updatedProject.stage).toBe('ideation');
  });

  it('deletes a project', async () => {
    const store = useAppStore.getState();
    const newProject = await store.createProject();
    expect(useAppStore.getState().projects.length).toBe(1);
    
    store.deleteProject(newProject.id);
    expect(useAppStore.getState().projects.length).toBe(0);
    expect(useAppStore.getState().activeProjectId).toBeNull();
  });
});
