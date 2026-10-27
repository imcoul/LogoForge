import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SVGPathEditor } from '../../components/SVGPathEditor';
import { ToastProvider } from '../../components/Toast';
import { WhiteboardCanvas } from '../../components/WhiteboardCanvas';
import { listEditablePaths, replacePathDataById } from '../../engine/pathEditorBridge';
import { createSharedVectorHistoryController } from '../../engine/sharedVectorHistory';
import { useAppStore, type Project } from '../../store';

const makeProject = (): Project => ({
  id: 'integration-project',
  name: 'Shared history integration',
  createdAt: 1,
  stage: 'drafting',
  logoUrl: null,
  logoMimeType: 'image/svg+xml',
  svgSource: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path id="existing" d="M0 0 L5 5" /></svg>',
  description: '',
  brandGuide: null,
  sonicAssets: [],
  sonicPhilosophy: null,
  refinementFiles: [],
  refinementSuggestions: null,
  competitorAnalysis: null,
  ecosystemAssets: [],
  sceneGraph: [],
  sceneHistory: [],
  sceneHistoryIndex: 0,
  comments: [],
  mockups: [],
  whiteboardSketches: [],
});

const commitToStore = async (updates: Partial<Project>) => {
  const projectId = useAppStore.getState().activeProjectId;
  if (!projectId) throw new Error('Test project is not active');
  useAppStore.setState((state) => ({
    projects: state.projects.map((project) =>
      project.id === projectId ? { ...project, ...updates } : project,
    ),
  }));
};

const getProject = () => {
  const state = useAppStore.getState();
  return state.projects.find((project) => project.id === state.activeProjectId)!;
};

const EditorPair: React.FC<{
  history: ReturnType<typeof createSharedVectorHistoryController>;
  showWhiteboard?: boolean;
  updateSharedPath?: (nodeId: string, candidateSvg: string, baseSvg?: string, throttleCloud?: boolean) => Promise<boolean>;
}> = ({ history, showWhiteboard = true, updateSharedPath }) => {
  const { projects, activeProjectId } = useAppStore();
  const project = projects.find((candidate) => candidate.id === activeProjectId);

  return (
    <>
      {showWhiteboard && (
        <WhiteboardCanvas
          fullscreen={false}
          setFullscreen={() => undefined}
          onUpdateAndSync={commitToStore}
          onCreateSharedPath={history.addWhiteboardPath}
          onSharedUndo={history.undo}
          onSharedRedo={history.redo}
          canUndoShared={history.canUndo()}
          canRedoShared={history.canRedo()}
        />
      )}
      <SVGPathEditor
        svgSource={project?.svgSource}
          onUpdateSvg={(svg) => commitToStore({ svgSource: svg })}
          onLinkExistingPathToWhiteboard={history.addExistingPathToWhiteboard}
          onDeleteSharedPath={history.deleteSharedWhiteboardPath}
          onUpdateSharedPath={updateSharedPath ?? history.updateSharedWhiteboardPath}
          onSharedUndo={history.undo}
        onSharedRedo={history.redo}
        canUndoShared={history.canUndo()}
        canRedoShared={history.canRedo()}
      />
    </>
  );
};

describe('shared vector history editor integration', () => {
  beforeEach(() => {
    useAppStore.setState({
      projects: [makeProject()],
      activeProjectId: 'integration-project',
      sharedVectorHistoryByProject: {},
    });
  });

  it('creates in Whiteboard, undoes in SVGPathEditor, redoes in Whiteboard, and preserves local history order', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const { container } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    // Establish a local precision-editor snapshot before the external shared mutation.
    fireEvent.click(screen.getByText('Shapes'));
    fireEvent.click(screen.getByText('Shield Security'));
    await waitFor(() => expect(listEditablePaths(getProject().svgSource)).toHaveLength(2));

    // Draw a real line with WhiteboardCanvas's tool and pointer handlers.
    fireEvent.click(screen.getByTitle('Line'));
    const whiteboardSvg = container.querySelector('svg.touch-none');
    expect(whiteboardSvg).not.toBeNull();
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 40, clientY: 40 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 40, clientY: 40 });

    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);
    });
    const sharedSketch = getProject().whiteboardSketches![0];
    expect(sharedSketch.id.startsWith('shared-wb-')).toBe(true);
    expect(sharedSketch.locked).toBe(true);
    expect(listEditablePaths(getProject().svgSource).some((path) => path.nodeId === `whiteboard-${sharedSketch.id}`)).toBe(true);

    // The path editor must discard its stale pre-shared snapshot and undo the shared delta.
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });
    expect(getProject().svgSource).toContain('M 60,50 L 140,50');

    // Redo the same command from the Whiteboard toolbar.
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);
    });

    // A newer legacy whiteboard action must undo before the older shared command.
    fireEvent.click(screen.getByTitle('Rectangle'));
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 80, clientY: 80 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 120, clientY: 120 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 120, clientY: 120 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));

    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);

    // The next undo is the shared path; rebased local snapshots must not bring it back.
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });

    // Shared redo, then local redo, must also remain ordered and document-consistent.
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);

    // The precision editor can also undo and redo the shared step after local history moves.
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });
    fireEvent.click(screen.getByTitle('Redo stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(2);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(3);
    });

    // A new local Whiteboard action after undo is a new branch and must discard shared redo.
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(2);
    });
    expect(history.canRedo()).toBe(true);
    fireEvent.click(screen.getByTitle('Circle'));
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 150, clientY: 150 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 190, clientY: 190 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 190, clientY: 190 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    expect(history.canRedo()).toBe(false);

    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    const finalPathIds = listEditablePaths(getProject().svgSource).map((path) => path.nodeId);
    expect(finalPathIds[0]).toBe('existing');
    expect(finalPathIds).toHaveLength(2);
  });

  it('updates shared path geometry and style in Precision and undoes/redoes across both editors', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = {
      id: 'shared-wb-update-ui',
      name: 'Shared path to update',
      type: 'line' as const,
      path: 'M 10,10 L 40,40',
      color: '#123456',
      strokeWidth: 4,
      locked: true,
    };
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Precision Handles'));
    fireEvent.click(screen.getByText('M 10,10 L 40,40...'));
    fireEvent.click(screen.getByText('Move Right →'));

    await waitFor(() => {
      const sharedPath = listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`);
      expect(sharedPath?.d).toBe('M18,10 L48,40');
      expect(getProject().whiteboardSketches?.[0].path).toBe(sharedPath?.d);
    });

    // The selected-style action changes an existing path, not merely future drawing defaults.
    fireEvent.click(screen.getByText('Touch Draw Board'));
    fireEvent.click(screen.getByText('Apply style to selected path'));
    await waitFor(() => {
      const sharedPath = listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`);
      expect(sharedPath?.stroke).toBe('#6366F1');
      expect(getProject().whiteboardSketches?.[0].color).toBe('#6366F1');
    });

    // Undo style in Whiteboard, then geometry in Precision; the mirror stays synchronized.
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.[0].color).toBe('#123456');
      expect(getProject().whiteboardSketches?.[0].path).toBe('M18,10 L48,40');
    });
    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`)?.d)
        .toBe('M 10,10 L 40,40');
      expect(getProject().whiteboardSketches?.[0].path).toBe('M 10,10 L 40,40');
    });

    // Redo geometry in Precision and style in Whiteboard, preserving both command deltas.
    fireEvent.click(screen.getByTitle('Redo stroke'));
    await waitFor(() => expect(getProject().whiteboardSketches?.[0].path).toBe('M18,10 L48,40'));
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => {
      const sharedPath = listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`);
      expect(sharedPath?.stroke).toBe('#6366F1');
      expect(getProject().whiteboardSketches?.[0]).toMatchObject({
        path: 'M18,10 L48,40',
        color: '#6366F1',
      });
    });
  });

  it('restores Precision handles from the latest SVG after a shared edit is rejected', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = {
      id: 'shared-wb-rejected-update-ui',
      name: 'Shared path with a concurrent change',
      type: 'line' as const,
      path: 'M 10,10 L 40,40',
      color: '#123456',
      strokeWidth: 4,
      locked: true,
    };
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    const attemptedPathData: string[] = [];
    let remoteChangeApplied = false;
    const rejectSharedUpdate = async (nodeId: string, candidateSvg: string) => {
      attemptedPathData.push(listEditablePaths(candidateSvg).find((path) => path.nodeId === nodeId)?.d ?? '');
      if (!remoteChangeApplied) {
        remoteChangeApplied = true;
        const currentProject = getProject();
        const remotePathData = 'M 100,100 L 140,140';
        await commitToStore({
          svgSource: replacePathDataById(currentProject.svgSource!, nodeId, remotePathData),
          whiteboardSketches: currentProject.whiteboardSketches?.map((item) =>
            item.id === sketch.id ? { ...item, path: remotePathData } : item,
          ),
        });
      }
      return false;
    };

    render(
      <ToastProvider>
        <EditorPair history={history} updateSharedPath={rejectSharedUpdate} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('Precision Handles'));
    fireEvent.click(screen.getByText('M 10,10 L 40,40...'));
    fireEvent.click(screen.getByText('Move Right →'));

    await waitFor(() => expect(getProject().whiteboardSketches?.[0].path).toBe('M 100,100 L 140,140'));
    await screen.findByText('The shared path or document changed before this edit could be applied; the latest version was restored.');
    fireEvent.click(screen.getByText('Move Right →'));

    await waitFor(() => expect(attemptedPathData).toHaveLength(2));
    expect(attemptedPathData).toEqual(['M18,10 L48,40', 'M108,100 L148,140']);
    expect(getProject().whiteboardSketches?.[0].path).toBe('M 100,100 L 140,140');
    expect(listEditablePaths(getProject().svgSource).find((path) => path.nodeId === `whiteboard-${sketch.id}`)?.d)
      .toBe('M 100,100 L 140,140');
  });

  it('deletes a shared Precision layer and undoes/redoes it across both editors', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = {
      id: 'shared-wb-delete-ui',
      name: 'Shared path to delete',
      type: 'line' as const,
      path: 'M 10,10 L 40,40',
      color: '#123456',
      strokeWidth: 4,
      locked: true,
    };
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Precision Handles'));
    const deleteButtons = screen.getAllByTitle('Delete this path layer');
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[1]);
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });

    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches?.map((item) => item.id)).toEqual([sketch.id]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual([
        'existing', `whiteboard-${sketch.id}`,
      ]);
    });

    fireEvent.click(screen.getByText('Touch Draw Board'));
    fireEvent.click(screen.getByTitle('Redo stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });
  });

  it('sends an existing SVG path to Whiteboard as a shared link and clears redo', async () => {
    await commitToStore({ svgSource: getProject().svgSource.replace('M0 0 L5 5', 'M 0,0 L 5,5') });
    const history = createSharedVectorHistoryController(commitToStore);
    const { container, rerender } = render(
      <ToastProvider>
        <EditorPair history={history} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTitle('Line'));
    const whiteboardSvg = container.querySelector('svg.touch-none');
    expect(whiteboardSvg).not.toBeNull();
    fireEvent.mouseDown(whiteboardSvg!, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(whiteboardSvg!, { clientX: 40, clientY: 40 });
    fireEvent.mouseUp(whiteboardSvg!, { clientX: 40, clientY: 40 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));

    fireEvent.click(screen.getByTitle('Undo last stroke'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource)).toHaveLength(1);
    });
    expect(history.canRedo()).toBe(true);

    fireEvent.click(screen.getByText('Precision Handles'));
    fireEvent.click(screen.getAllByTitle('Send back to Whiteboard Canvas')[0]);
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    expect(history.canRedo()).toBe(false);
    expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);

    fireEvent.click(screen.getAllByTitle('Select')[0]);
    fireEvent.doubleClick(whiteboardSvg!, { clientX: 3, clientY: 3 });
    fireEvent.click(await screen.findByTitle('Open existing path in Precision'));
    expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);

    rerender(
      <ToastProvider>
        <EditorPair history={history} showWhiteboard={false} />
      </ToastProvider>,
    );
    rerender(
      <ToastProvider>
        <EditorPair history={history} showWhiteboard />
      </ToastProvider>,
    );
    const remountedWhiteboardSvg = container.querySelector('svg.touch-none');
    expect(remountedWhiteboardSvg).not.toBeNull();
    fireEvent.click(screen.getByTitle('Rectangle'));
    fireEvent.mouseDown(remountedWhiteboardSvg!, { clientX: 80, clientY: 80 });
    fireEvent.mouseMove(remountedWhiteboardSvg!, { clientX: 120, clientY: 120 });
    fireEvent.mouseUp(remountedWhiteboardSvg!, { clientX: 120, clientY: 120 });
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));

    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toHaveLength(1);
      expect(getProject().whiteboardSketches![0].id.startsWith('shared-wb-')).toBe(true);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });
    fireEvent.click(screen.getByTitle('Undo'));
    await waitFor(() => {
      expect(getProject().whiteboardSketches).toEqual([]);
      expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    });
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(1));
    fireEvent.click(screen.getByTitle('Redo'));
    await waitFor(() => expect(getProject().whiteboardSketches).toHaveLength(2));
    expect(listEditablePaths(getProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);
  });
});
