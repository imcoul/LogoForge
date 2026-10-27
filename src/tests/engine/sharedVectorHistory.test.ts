import { beforeEach, describe, expect, it } from 'vitest';
import { deletePathById, listEditablePaths, replacePathDataById, updatePathStyleById } from '../../engine/pathEditorBridge';
import {
  applySharedWhiteboardDeleteCommand,
  applySharedWhiteboardLinkCommand,
  applySharedWhiteboardPathCommand,
  createSharedVectorHistoryController,
  createSharedWhiteboardDeleteCommand,
  createSharedWhiteboardLinkCommand,
  createSharedWhiteboardPathCommand,
  createSharedWhiteboardUpdateCommand,
  mergeLocalSharedHistoryIntoRemoteProject,
  preserveSharedWhiteboardSketches,
  sharedWhiteboardPathsUnchanged,
  undoSharedWhiteboardDeleteCommand,
  undoSharedWhiteboardLinkCommand,
  undoSharedWhiteboardPathCommand,
  undoSharedWhiteboardUpdateCommand,
  applySharedWhiteboardUpdateCommand,
} from '../../engine/sharedVectorHistory';
import { parseSvg, serializeSvg } from '../../engine/svgIo';
import { useAppStore, type Project } from '../../store';
import { IDENTITY_TRANSFORM, type Node, type WhiteboardSketch } from '../../types';

const makeProject = (): Project => ({
  id: 'project-1',
  name: 'History fixture',
  createdAt: 1,
  stage: 'drafting',
  logoUrl: null,
  logoMimeType: 'image/svg+xml',
  svgSource: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path id="existing" d="M0 0 L5 5" aria-label="keep me" /></svg>',
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
});

const makeSketch = (id = 'shared-wb-sketch-1'): WhiteboardSketch => ({
  id,
  name: `Line ${id}`,
  type: 'line',
  path: 'M 10,10 L 40,40',
  color: '#123456',
  strokeWidth: 4,
});

const commitToStore = async (updates: Partial<Project>) => {
  const state = useAppStore.getState();
  const activeProjectId = state.activeProjectId;
  if (!activeProjectId) throw new Error('No active project in test fixture');
  useAppStore.setState((current) => ({
    projects: current.projects.map((project) =>
      project.id === activeProjectId ? { ...project, ...updates } : project,
    ),
  }));
};

const getCurrentProject = () => {
  const state = useAppStore.getState();
  return state.projects.find((project) => project.id === state.activeProjectId)!;
};

describe('shared whiteboard path command history', () => {
  beforeEach(() => {
    useAppStore.setState({
      projects: [makeProject()],
      activeProjectId: 'project-1',
      sharedVectorHistoryByProject: {},
    });
  });

  it('makes a whiteboard path visible to the path editor and undoes/redoes the same delta', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch();

    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    const afterAdd = getCurrentProject();
    const path = listEditablePaths(afterAdd.svgSource).find((candidate) => candidate.nodeId === `whiteboard-${sketch.id}`);

    expect(path).toMatchObject({
      nodeId: `whiteboard-${sketch.id}`,
      d: sketch.path,
      stroke: sketch.color,
      strokeWidth: sketch.strokeWidth,
    });
    expect(afterAdd.whiteboardSketches).toEqual([sketch]);
    expect(afterAdd.svgSource).toContain('aria-label="keep me"');
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    expect(await history.undo()).toBe(true);
    const afterUndo = getCurrentProject();
    expect(listEditablePaths(afterUndo.svgSource).map((candidate) => candidate.nodeId)).toEqual(['existing']);
    expect(afterUndo.whiteboardSketches).toEqual([]);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    expect(await history.redo()).toBe(true);
    const afterRedo = getCurrentProject();
    expect(listEditablePaths(afterRedo.svgSource).map((candidate) => candidate.nodeId)).toEqual(['existing', `whiteboard-${sketch.id}`]);
    expect(afterRedo.whiteboardSketches).toEqual([sketch]);
  });

  it('clears the redo branch when a new shared path is added after undo', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    expect(await history.addWhiteboardPath(makeSketch('shared-wb-first'))).toBe(true);
    expect(await history.undo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    expect(await history.addWhiteboardPath(makeSketch('shared-wb-second'))).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(listEditablePaths(getCurrentProject().svgSource).map((path) => path.nodeId)).toContain('whiteboard-shared-wb-second');
  });

  it('records a link-existing-path action in shared history and clears the prior redo branch', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    expect(await history.addWhiteboardPath(makeSketch('shared-wb-first'))).toBe(true);
    expect(await history.addWhiteboardPath(makeSketch('shared-wb-second'))).toBe(true);
    expect(await history.undo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    const linkedSketch = { ...makeSketch('shared-wb-linked-existing'), type: 'path' as const, path: 'M0 0 L5 5', locked: true };
    expect(await history.addExistingPathToWhiteboard('existing', linkedSketch)).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(getCurrentProject().whiteboardSketches?.map((sketch) => sketch.id)).toEqual([
      'shared-wb-first', 'shared-wb-linked-existing',
    ]);
    expect(listEditablePaths(getCurrentProject().svgSource).map((path) => path.nodeId)).toEqual([
      'existing', 'whiteboard-shared-wb-first',
    ]);

    expect(await history.undo()).toBe(true);
    expect(getCurrentProject().whiteboardSketches?.map((sketch) => sketch.id)).toEqual(['shared-wb-first']);
    expect(await history.redo()).toBe(true);
    expect(getCurrentProject().whiteboardSketches?.map((sketch) => sketch.id)).toEqual([
      'shared-wb-first', 'shared-wb-linked-existing',
    ]);
  });

  it('reconstructs applied add and link history from persisted IDs after the ephemeral journal resets', async () => {
    const initialHistory = createSharedVectorHistoryController(commitToStore);
    expect(await initialHistory.addWhiteboardPath(makeSketch('shared-wb-persisted'))).toBe(true);
    const linkedSketch = { ...makeSketch('shared-wb-linked-persisted'), type: 'path' as const, path: 'M0 0 L5 5', locked: true };
    expect(await initialHistory.addExistingPathToWhiteboard('existing', linkedSketch)).toBe(true);

    useAppStore.setState({ sharedVectorHistoryByProject: { 'project-1': { commands: [], index: -1 } } });
    const restoredHistory = createSharedVectorHistoryController(commitToStore);
    expect(restoredHistory.canUndo()).toBe(true);

    expect(await restoredHistory.undo()).toBe(true);
    expect(getCurrentProject().whiteboardSketches?.map((sketch) => sketch.id)).toEqual(['shared-wb-persisted']);
    expect(parseSvg(getCurrentProject().svgSource).nodes.find((node) => node.id === 'existing')?.attrs?.['data-logoforge-node-id'])
      .toBeUndefined();
    const restoredLinkedNode = parseSvg(getCurrentProject().svgSource).nodes.find((node) => node.id === 'existing')!;
    expect(restoredLinkedNode.attrs?.['data-logoforge-shared-whiteboard-id']).toBeUndefined();
    expect(restoredLinkedNode.attrs?.['data-logoforge-shared-original-node-id-present']).toBeUndefined();
    expect(restoredLinkedNode.attrs?.['data-logoforge-shared-original-node-id']).toBeUndefined();
    expect(await restoredHistory.undo()).toBe(true);
    expect(getCurrentProject().whiteboardSketches).toEqual([]);
    expect(listEditablePaths(getCurrentProject().svgSource).map((path) => path.nodeId)).toEqual(['existing']);

    expect(await restoredHistory.redo()).toBe(true);
    expect(getCurrentProject().whiteboardSketches?.map((sketch) => sketch.id)).toEqual(['shared-wb-persisted']);
    expect(await restoredHistory.redo()).toBe(true);
    expect(getCurrentProject().whiteboardSketches?.map((sketch) => sketch.id)).toEqual([
      'shared-wb-persisted', 'shared-wb-linked-persisted',
    ]);
    expect(listEditablePaths(getCurrentProject().svgSource)).toHaveLength(2);
  });

  it('rejects malformed documents and treats missing targets as safe no-ops', () => {
    const project = makeProject();
    const malformed = { ...project, svgSource: '<svg><path d="M0 0"</svg>' };
    expect(createSharedWhiteboardPathCommand(malformed, makeSketch())).toBeNull();

    const command = createSharedWhiteboardPathCommand(project, makeSketch(), 'command-1');
    expect(command).not.toBeNull();
    const withPath = applySharedWhiteboardPathCommand(project, command!);
    expect(withPath).not.toBeNull();

    expect(undoSharedWhiteboardPathCommand(project, command!)).toBeNull();

    const removed = undoSharedWhiteboardPathCommand({
      ...project,
      svgSource: withPath!.svgSource,
      whiteboardSketches: withPath!.whiteboardSketches,
    }, command!);
    expect(removed).not.toBeNull();
    expect(listEditablePaths(removed!.svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    expect(removed!.whiteboardSketches).toEqual([]);
  });

  it('does not remove a conflicting or edited node during stale add-path undo', () => {
    const project = makeProject();
    const command = createSharedWhiteboardPathCommand(project, makeSketch(), 'safe-inverse');
    const applied = applySharedWhiteboardPathCommand(project, command!);
    expect(applied).not.toBeNull();

    const conflictingDoc = parseSvg(applied!.svgSource);
    const sharedIndex = conflictingDoc.nodes.findIndex((node) => node.id === command!.nodeId);
    conflictingDoc.nodes[sharedIndex] = {
      ...conflictingDoc.nodes[sharedIndex],
      type: 'rect',
      props: { x: 0, y: 0, width: 10, height: 10 },
    };
    const conflictingSvg = serializeSvg(conflictingDoc);
    expect(undoSharedWhiteboardPathCommand({ ...project, ...applied, svgSource: conflictingSvg }, command!)).toBeNull();
    expect(parseSvg(conflictingSvg).nodes.some((node) => node.id === command!.nodeId && node.type === 'rect')).toBe(true);

    const editedDoc = parseSvg(applied!.svgSource);
    const editedPath = editedDoc.nodes.find((node) => node.id === command!.nodeId)!;
    editedPath.props = { ...editedPath.props, d: 'M 0,0 L 99,99' };
    expect(undoSharedWhiteboardPathCommand({ ...project, ...applied, svgSource: serializeSvg(editedDoc) }, command!)).toBeNull();
    expect(undoSharedWhiteboardPathCommand({ ...project, svgSource: applied!.svgSource, whiteboardSketches: [] }, command!)).toBeNull();
    expect(undoSharedWhiteboardPathCommand({
      ...project,
      ...applied,
      whiteboardSketches: [...(applied!.whiteboardSketches || []), command!.sketch],
    }, command!)).toBeNull();
  });

  it('consumes a stale shared undo without allowing fallback to unrelated history', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    expect(await history.addWhiteboardPath(makeSketch())).toBe(true);
    await commitToStore({ svgSource: makeProject().svgSource });

    let legacyFallbackCount = 0;
    const handled = await history.undo();
    if (!handled) legacyFallbackCount += 1;

    expect(handled).toBe(true);
    expect(legacyFallbackCount).toBe(0);
    expect(getCurrentProject().svgSource).toBe(makeProject().svgSource);
    expect(useAppStore.getState().canUndoSharedVector('project-1')).toBe(false);
  });

  it('rejects shared links for transformed paths, transformed ancestors, or non-path sketches', () => {
    const sketch = { ...makeSketch('shared-wb-link-safety'), type: 'path' as const, path: 'M0 0 L5 5' };
    const ownTransform = {
      ...makeProject(),
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg"><path id="existing" transform="translate(1 2)" d="M0 0 L5 5" /></svg>',
    };
    const parentTransform = {
      ...makeProject(),
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg"><g id="parent" transform="translate(1 2)"><path id="existing" d="M0 0 L5 5" /></g></svg>',
    };

    expect(createSharedWhiteboardLinkCommand(ownTransform, 'existing', sketch)).toBeNull();
    expect(createSharedWhiteboardLinkCommand(parentTransform, 'existing', sketch)).toBeNull();
    expect(createSharedWhiteboardLinkCommand(makeProject(), 'existing', { ...sketch, type: 'rectangle' })).toBeNull();

    const presentationCases = [
      makeProject().svgSource!.replace('<svg ', '<svg fill="red" '),
      makeProject().svgSource!.replace('aria-label="keep me"', 'opacity="0" aria-label="keep me"'),
      makeProject().svgSource!.replace('aria-label="keep me"', 'display="none" aria-label="keep me"'),
      makeProject().svgSource!.replace('aria-label="keep me"', 'visibility="hidden" aria-label="keep me"'),
      makeProject().svgSource!.replace('aria-label="keep me"', 'style="opacity:0" aria-label="keep me"'),
      makeProject().svgSource!.replace('</svg>', '<defs><style>path { opacity: 0 }</style></defs></svg>'),
    ];
    for (const svgSource of presentationCases) {
      expect(createSharedWhiteboardLinkCommand({ ...makeProject(), svgSource }, 'existing', sketch)).toBeNull();
    }

    const base = makeProject();
    const command = createSharedWhiteboardLinkCommand(base, 'existing', sketch, 'duplicate-marker-command');
    expect(command).not.toBeNull();
    const withExistingMarker = { ...base };
    const duplicateDoc = parseSvg(withExistingMarker.svgSource);
    duplicateDoc.nodes.push({
      id: 'other-marker-path', type: 'path', transform: { ...IDENTITY_TRANSFORM }, props: { d: 'M9 9 L10 10' },
      attrs: { 'data-logoforge-shared-whiteboard-id': sketch.id },
    });
    withExistingMarker.svgSource = serializeSvg(duplicateDoc);
    expect(createSharedWhiteboardLinkCommand(withExistingMarker, 'existing', sketch)).toBeNull();
    expect(applySharedWhiteboardLinkCommand(withExistingMarker, command!)).toBeNull();

    const applied = applySharedWhiteboardLinkCommand(base, command!);
    expect(applied).not.toBeNull();
    const duplicateAfterApply = parseSvg(applied!.svgSource);
    duplicateAfterApply.nodes.push({
      id: 'other-marker-path', type: 'path', transform: { ...IDENTITY_TRANSFORM }, props: { d: 'M9 9 L10 10' },
      attrs: { 'data-logoforge-shared-whiteboard-id': sketch.id },
    });
    expect(undoSharedWhiteboardLinkCommand({ ...base, ...applied, svgSource: serializeSvg(duplicateAfterApply) }, command!)).toBeNull();
  });

  it('enforces shared sketch identity across add-path and existing-path link commands', () => {
    const sketch = { ...makeSketch('shared-wb-identity'), type: 'path' as const, path: 'M0 0 L5 5' };
    const base = makeProject();
    const addCommand = createSharedWhiteboardPathCommand(base, sketch, 'add-identity');
    const linkCommand = createSharedWhiteboardLinkCommand(base, 'existing', sketch, 'link-identity');
    expect(addCommand).not.toBeNull();
    expect(linkCommand).not.toBeNull();
    expect(createSharedWhiteboardPathCommand({ ...base, whiteboardSketches: [sketch] }, sketch)).toBeNull();

    const markerDoc = parseSvg(base.svgSource);
    markerDoc.nodes.push({
      id: 'orphan-marker', type: 'path', transform: { ...IDENTITY_TRANSFORM }, props: { d: 'M9 9 L10 10' },
      attrs: { 'data-logoforge-shared-whiteboard-id': sketch.id },
    });
    const markerProject = { ...base, svgSource: serializeSvg(markerDoc) };
    expect(createSharedWhiteboardPathCommand(markerProject, sketch)).toBeNull();
    expect(applySharedWhiteboardPathCommand(markerProject, addCommand!)).toBeNull();

    const reservedDoc = parseSvg(base.svgSource);
    reservedDoc.nodes.push({
      id: 'separate-reserved-path', type: 'path', transform: { ...IDENTITY_TRANSFORM }, props: { d: 'M9 9 L10 10' },
      attrs: { 'data-logoforge-node-id': 'whiteboard-shared-wb-identity' },
    });
    const reservedProject = { ...base, svgSource: serializeSvg(reservedDoc) };
    expect(createSharedWhiteboardLinkCommand(reservedProject, 'existing', sketch)).toBeNull();
    expect(applySharedWhiteboardLinkCommand(reservedProject, linkCommand!)).toBeNull();

    const selfProject = {
      ...base,
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg"><path id="whiteboard-shared-wb-self" d="M0 0 L5 5" /></svg>',
    };
    const selfSketch = { ...sketch, id: 'shared-wb-self' };
    const selfLink = createSharedWhiteboardLinkCommand(selfProject, 'whiteboard-shared-wb-self', selfSketch);
    expect(selfLink).not.toBeNull();
    expect(applySharedWhiteboardLinkCommand(selfProject, selfLink!)).not.toBeNull();
  });

  it('links an existing SVG path into Whiteboard without duplicating it and restores the link on undo/redo', () => {
    const project = makeProject();
    const sketch = { ...makeSketch('shared-wb-existing'), type: 'path' as const, path: 'M0 0 L5 5', locked: true };
    const command = createSharedWhiteboardLinkCommand(project, 'existing', sketch, 'link-existing-1');
    expect(command).not.toBeNull();
    expect(command!.previousNodeIdMarker).toBeUndefined();

    const linked = applySharedWhiteboardLinkCommand(project, command!);
    expect(linked).not.toBeNull();
    expect(listEditablePaths(linked!.svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    expect(linked!.whiteboardSketches).toEqual([sketch]);
    expect(sharedWhiteboardPathsUnchanged(project.svgSource, linked!.svgSource)).toBe(false);

    const undone = undoSharedWhiteboardLinkCommand({ ...project, ...linked }, command!);
    expect(undone).not.toBeNull();
    expect(listEditablePaths(undone!.svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    expect(undone!.whiteboardSketches).toEqual([]);
    const restoredNode = parseSvg(undone!.svgSource).nodes.find((node) => node.id === 'existing')!;
    expect(restoredNode.attrs?.['data-logoforge-node-id']).toBeUndefined();
    expect(restoredNode.attrs?.['data-logoforge-shared-whiteboard-id']).toBeUndefined();
    expect(restoredNode.attrs?.['data-logoforge-shared-original-node-id-present']).toBeUndefined();
    expect(restoredNode.attrs?.['data-logoforge-shared-original-node-id']).toBeUndefined();
    expect(sharedWhiteboardPathsUnchanged(linked!.svgSource, undone!.svgSource)).toBe(false);

    const redone = applySharedWhiteboardLinkCommand({ ...project, ...undone }, command!);
    expect(redone).not.toBeNull();
    expect(listEditablePaths(redone!.svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    expect(redone!.whiteboardSketches).toEqual([sketch]);

    const markedProject = {
      ...project,
      svgSource: project.svgSource.replace('id="existing"', 'id="existing" data-logoforge-node-id="existing"'),
    };
    const markedCommand = createSharedWhiteboardLinkCommand(markedProject, 'existing', sketch, 'link-existing-marked');
    expect(markedCommand?.previousNodeIdMarker).toBe('existing');
    const markedLink = applySharedWhiteboardLinkCommand(markedProject, markedCommand!);
    expect(markedLink).not.toBeNull();
    const markedUndo = undoSharedWhiteboardLinkCommand({ ...markedProject, ...markedLink! }, markedCommand!);
    expect(markedUndo).not.toBeNull();
    const markedRestoredNode = parseSvg(markedUndo!.svgSource).nodes.find((node) => node.id === 'existing')!;
    expect(markedRestoredNode.attrs?.['data-logoforge-node-id']).toBe('existing');
    expect(markedRestoredNode.attrs?.['data-logoforge-shared-whiteboard-id']).toBeUndefined();
    expect(markedRestoredNode.attrs?.['data-logoforge-shared-original-node-id-present']).toBeUndefined();
    expect(markedRestoredNode.attrs?.['data-logoforge-shared-original-node-id']).toBeUndefined();
  });

  it('binds shared add and link commands to their originating project', () => {
    const projectA = makeProject();
    const projectB = { ...projectA, id: 'project-b' };
    const addSketch = makeSketch('shared-wb-cross-project-add');
    const addCommand = createSharedWhiteboardPathCommand(projectA, addSketch, 'cross-project-add');
    expect(addCommand?.projectId).toBe(projectA.id);
    const addDelta = applySharedWhiteboardPathCommand(projectA, addCommand!);
    expect(addDelta).not.toBeNull();
    expect(applySharedWhiteboardPathCommand(projectB, addCommand!)).toBeNull();
    expect(undoSharedWhiteboardPathCommand({ ...projectB, ...addDelta }, addCommand!)).toBeNull();

    const linkSketch = { ...makeSketch('shared-wb-cross-project-link'), type: 'path' as const, path: 'M0 0 L5 5' };
    const linkCommand = createSharedWhiteboardLinkCommand(projectA, 'existing', linkSketch, 'cross-project-link');
    expect(linkCommand?.projectId).toBe(projectA.id);
    const linkDelta = applySharedWhiteboardLinkCommand(projectA, linkCommand!);
    expect(linkDelta).not.toBeNull();
    expect(applySharedWhiteboardLinkCommand(projectB, linkCommand!)).toBeNull();
    expect(undoSharedWhiteboardLinkCommand({ ...projectB, ...linkDelta }, linkCommand!)).toBeNull();
  });

  it('returns safe no-ops for malformed shared commands or project accessors', () => {
    const project = makeProject();
    const addCommand = createSharedWhiteboardPathCommand(project, makeSketch('shared-wb-malformed-command'), 'bad-command');
    const linkSketch = { ...makeSketch('shared-wb-malformed-link'), type: 'path' as const, path: 'M0 0 L5 5' };
    const linkCommand = createSharedWhiteboardLinkCommand(project, 'existing', linkSketch, 'bad-link-command');
    const accessorProject = { ...project };
    Object.defineProperty(accessorProject, 'id', { get: () => { throw new Error('must be caught'); }, enumerable: true });

    expect(() => applySharedWhiteboardPathCommand(accessorProject as Project, addCommand!)).not.toThrow();
    expect(applySharedWhiteboardPathCommand(accessorProject as Project, addCommand!)).toBeNull();
    expect(() => applySharedWhiteboardLinkCommand(accessorProject as Project, linkCommand!)).not.toThrow();
    expect(applySharedWhiteboardLinkCommand(accessorProject as Project, linkCommand!)).toBeNull();
    expect(applySharedWhiteboardPathCommand(project, null as never)).toBeNull();
    expect(applySharedWhiteboardLinkCommand(project, null as never)).toBeNull();
    expect(undoSharedWhiteboardPathCommand(project, null as never)).toBeNull();
    expect(undoSharedWhiteboardLinkCommand(project, null as never)).toBeNull();
    expect(applySharedWhiteboardDeleteCommand(project, null as never)).toBeNull();
    expect(undoSharedWhiteboardDeleteCommand(project, null as never)).toBeNull();
    expect(applySharedWhiteboardUpdateCommand(project, null as never)).toBeNull();
    expect(undoSharedWhiteboardUpdateCommand(project, null as never)).toBeNull();
  });

  it('deletes a shared path with its sketch and restores the same root node/order on undo', () => {
    const project = makeProject();
    const sketch = makeSketch('shared-wb-delete-root');
    const addCommand = createSharedWhiteboardPathCommand(project, sketch, 'add-before-delete');
    const withSharedPath = { ...project, ...applySharedWhiteboardPathCommand(project, addCommand!)! };
    const deleteCommand = createSharedWhiteboardDeleteCommand(withSharedPath, addCommand!.nodeId, 'delete-root');
    expect(deleteCommand).not.toBeNull();

    const deleted = applySharedWhiteboardDeleteCommand(withSharedPath, deleteCommand!);
    expect(deleted).not.toBeNull();
    expect(listEditablePaths(deleted!.svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    expect(deleted!.whiteboardSketches).toEqual([]);

    const restored = undoSharedWhiteboardDeleteCommand({ ...withSharedPath, ...deleted }, deleteCommand!);
    expect(restored).not.toBeNull();
    expect(listEditablePaths(restored!.svgSource).map((path) => path.nodeId)).toEqual(['existing', addCommand!.nodeId]);
    expect(restored!.whiteboardSketches).toEqual([sketch]);
    expect(sharedWhiteboardPathsUnchanged(withSharedPath.svgSource, restored!.svgSource)).toBe(true);

    const redone = applySharedWhiteboardDeleteCommand({ ...withSharedPath, ...restored }, deleteCommand!);
    expect(redone).not.toBeNull();
    expect(listEditablePaths(redone!.svgSource).map((path) => path.nodeId)).toEqual(['existing']);
    expect(redone!.whiteboardSketches).toEqual([]);
  });

  it('restores a deleted linked path inside the same nested SVG parent chain', () => {
    const project = {
      ...makeProject(),
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><g id="outer"><g id="inner"><path id="nested" d="M0 0 L5 5" /></g></g></svg>',
    };
    const sketch = { ...makeSketch('shared-wb-nested-delete'), type: 'path' as const, path: 'M0 0 L5 5', locked: true };
    const linkCommand = createSharedWhiteboardLinkCommand(project, 'nested', sketch, 'nested-link');
    const linked = { ...project, ...applySharedWhiteboardLinkCommand(project, linkCommand!)! };
    const deleteCommand = createSharedWhiteboardDeleteCommand(linked, 'nested', 'nested-delete');
    expect(deleteCommand?.parentPath.map((step) => step.nodeId)).toEqual(['outer', 'inner']);

    const changedParentDoc = parseSvg(linked.svgSource);
    changedParentDoc.nodes.find((node) => node.id === 'outer')!.transformRaw = 'translate(9 10)';
    expect(applySharedWhiteboardDeleteCommand({ ...linked, svgSource: serializeSvg(changedParentDoc) }, deleteCommand!))
      .toBeNull();

    const deleted = applySharedWhiteboardDeleteCommand(linked, deleteCommand!);
    expect(deleted).not.toBeNull();
    const changedDeletedDoc = parseSvg(deleted!.svgSource);
    changedDeletedDoc.nodes.find((node) => node.id === 'outer')!.transformRaw = 'translate(9 10)';
    expect(undoSharedWhiteboardDeleteCommand({
      ...linked,
      ...deleted,
      svgSource: serializeSvg(changedDeletedDoc),
    }, deleteCommand!)).toBeNull();
    const restored = undoSharedWhiteboardDeleteCommand({ ...linked, ...deleted }, deleteCommand!);
    expect(restored).not.toBeNull();
    const outer = parseSvg(restored!.svgSource).nodes.find((node) => node.id === 'outer')!;
    const inner = outer.children?.find((node) => node.id === 'inner') ?? null;
    expect(inner?.children?.find((node) => node.id === 'nested')?.attrs?.['data-logoforge-shared-whiteboard-id'])
      .toBe(sketch.id);
    expect(restored!.whiteboardSketches).toEqual([sketch]);
  });

  it('rejects stale or ambiguous shared-path deletion targets without modifying either representation', () => {
    const project = makeProject();
    const addCommand = createSharedWhiteboardPathCommand(project, makeSketch('shared-wb-delete-safe'), 'add-delete-safe');
    const withSharedPath = { ...project, ...applySharedWhiteboardPathCommand(project, addCommand!)! };
    const deleteCommand = createSharedWhiteboardDeleteCommand(withSharedPath, addCommand!.nodeId, 'delete-safe');
    const changedDoc = parseSvg(withSharedPath.svgSource);
    changedDoc.nodes.find((node) => node.id === addCommand!.nodeId)!.props!.d = 'M 0,0 L 99,99';
    expect(applySharedWhiteboardDeleteCommand({ ...withSharedPath, svgSource: serializeSvg(changedDoc) }, deleteCommand!))
      .toBeNull();
    expect(createSharedWhiteboardDeleteCommand({
      ...withSharedPath,
      whiteboardSketches: [...(withSharedPath.whiteboardSketches || []), addCommand!.sketch],
    }, addCommand!.nodeId)).toBeNull();

    const duplicateNodeDoc = parseSvg(withSharedPath.svgSource);
    duplicateNodeDoc.nodes.push({ ...duplicateNodeDoc.nodes[1], id: 'duplicate-shared-node' });
    duplicateNodeDoc.nodes[2].attrs = { ...duplicateNodeDoc.nodes[2].attrs, 'data-logoforge-node-id': addCommand!.nodeId };
    expect(createSharedWhiteboardDeleteCommand({ ...withSharedPath, svgSource: serializeSvg(duplicateNodeDoc) }, addCommand!.nodeId))
      .toBeNull();
  });

  it('preserves shared Whiteboard mirrors against local mutation, reordering, and deletion', () => {
    const legacy = makeSketch('legacy-sketch');
    const shared = { ...makeSketch('shared-wb-read-only'), locked: true };
    const attemptedMutation = { ...shared, name: 'Changed locally', path: 'M 0,0 L 1,1', locked: false };

    expect(preserveSharedWhiteboardSketches([legacy, shared], [{ ...legacy, name: 'Local edit' }, attemptedMutation]))
      .toEqual([{ ...legacy, name: 'Local edit' }, shared]);
    expect(preserveSharedWhiteboardSketches([legacy, shared], [legacy])).toEqual([legacy, shared]);
    expect(preserveSharedWhiteboardSketches([legacy, shared], [attemptedMutation, legacy])).toEqual([legacy, shared]);
  });

  it('preserves authored n0 IDs across shared delete undo and detects ID-source changes', () => {
    const project = {
      ...makeProject(),
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg"><path id="n0" d="M 0 0 L5 5" /></svg>',
    };
    const sketch = { ...makeSketch('shared-wb-authored-n0'), type: 'path' as const, path: 'M 0 0 L5 5' };
    const linkCommand = createSharedWhiteboardLinkCommand(project, 'n0', sketch, 'link-authored-n0');
    const linked = applySharedWhiteboardLinkCommand(project, linkCommand!);
    expect(linked).not.toBeNull();
    const linkedProject = { ...project, ...linked };
    const deleteCommand = createSharedWhiteboardDeleteCommand(linkedProject, 'n0', 'delete-authored-n0');
    const deleted = applySharedWhiteboardDeleteCommand(linkedProject, deleteCommand!);
    expect(deleted).not.toBeNull();
    const restored = undoSharedWhiteboardDeleteCommand({ ...linkedProject, ...deleted }, deleteCommand!);
    expect(restored).not.toBeNull();
    expect(restored!.svgSource).toContain('id="n0"');

    const updateCandidate = replacePathDataById(linked!.svgSource, 'n0', 'M 0 0 L8 8');
    const updateCommand = createSharedWhiteboardUpdateCommand(linkedProject, 'n0', updateCandidate, 'update-authored-n0');
    expect(updateCommand).not.toBeNull();
    const updated = applySharedWhiteboardUpdateCommand(linkedProject, updateCommand!);
    expect(updated).not.toBeNull();
    expect(updated!.svgSource).toContain('id="n0"');
    const updateUndone = undoSharedWhiteboardUpdateCommand({ ...linkedProject, ...updated }, updateCommand!);
    expect(updateUndone).not.toBeNull();
    expect(updateUndone!.svgSource).toContain('id="n0"');

    const generatedLooking = linked!.svgSource.replace(' id="n0"', '');
    expect(sharedWhiteboardPathsUnchanged(linked!.svgSource, generatedLooking)).toBe(false);
  });

  it('keeps mirrored shared SVG paths read-only while allowing unrelated path edits', () => {
    const project = makeProject();
    const command = createSharedWhiteboardPathCommand(project, makeSketch(), 'command-immutable');
    const withSharedPath = applySharedWhiteboardPathCommand(project, command!);
    const sharedSvg = withSharedPath!.svgSource;

    expect(sharedWhiteboardPathsUnchanged(sharedSvg, sharedSvg)).toBe(true);
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, project.svgSource)).toBe(false);

    const renamedDoc = parseSvg(sharedSvg);
    const renamedNode = renamedDoc.nodes.find((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId);
    expect(renamedNode).toBeDefined();
    renamedNode!.id = 'renamed-authored-node';
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, serializeSvg(renamedDoc))).toBe(false);

    const reparentedDoc = parseSvg(sharedSvg);
    const sharedNodeIndex = reparentedDoc.nodes.findIndex((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId);
    const [sharedNode] = reparentedDoc.nodes.splice(sharedNodeIndex, 1);
    const parent: Node = {
      id: 'changed-parent',
      type: 'group',
      transform: { ...IDENTITY_TRANSFORM, x: 12 },
      children: [sharedNode],
    };
    reparentedDoc.nodes.splice(sharedNodeIndex, 0, parent);
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, serializeSvg(reparentedDoc))).toBe(false);

    const rawParentDoc = parseSvg(sharedSvg);
    const rawParentIndex = rawParentDoc.nodes.findIndex((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId);
    const [rawParentPath] = rawParentDoc.nodes.splice(rawParentIndex, 1);
    const rawParent: Node = {
      id: 'raw-transform-parent',
      type: 'group',
      transform: { ...IDENTITY_TRANSFORM },
      transformRaw: 'matrix(1 0 0 1 0 0)',
      children: [rawParentPath],
    };
    rawParentDoc.nodes.splice(rawParentIndex, 0, rawParent);
    const rawTransformBefore = serializeSvg(rawParentDoc);
    const rawTransformAfterDoc = parseSvg(rawTransformBefore);
    rawTransformAfterDoc.nodes[rawParentIndex].transformRaw = 'matrix(1 0 0 1 99 0)';
    expect(sharedWhiteboardPathsUnchanged(rawTransformBefore, serializeSvg(rawTransformAfterDoc))).toBe(false);
    const rawTargetDoc = parseSvg(sharedSvg);
    rawTargetDoc.nodes.find((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId)!.transformRaw =
      'matrix(1 0 0 1 99 0)';
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, serializeSvg(rawTargetDoc))).toBe(false);

    const hiddenDoc = parseSvg(sharedSvg);
    hiddenDoc.nodes.find((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId)!.visible = false;
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, serializeSvg(hiddenDoc))).toBe(false);
    const lockedDoc = parseSvg(sharedSvg);
    lockedDoc.nodes.find((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId)!.locked = true;
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, serializeSvg(lockedDoc))).toBe(false);

    const defsDoc = parseSvg(sharedSvg);
    defsDoc.defs = '<defs><clipPath id="clip-a"><rect width="10" height="10" /></clipPath></defs>';
    const defsBefore = serializeSvg(defsDoc);
    const defsAfterDoc = parseSvg(defsBefore);
    defsAfterDoc.defs = defsAfterDoc.defs!.replace('clip-a', 'clip-b');
    expect(sharedWhiteboardPathsUnchanged(defsBefore, serializeSvg(defsAfterDoc))).toBe(false);

    const siblingDoc = parseSvg(sharedSvg);
    const originalSharedIndex = siblingDoc.nodes.findIndex((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId);
    const makeSibling = (id: string): Node => ({
      id,
      type: 'path',
      transform: { ...IDENTITY_TRANSFORM },
      props: { d: 'M 0,0 L 2,2' },
    });
    siblingDoc.nodes.splice(originalSharedIndex, 0, makeSibling('sibling-a'), makeSibling('sibling-b'));
    const siblingBefore = serializeSvg(siblingDoc);
    const siblingAfterDoc = parseSvg(siblingBefore);
    const sharedIndexBeforeSwap = siblingAfterDoc.nodes.findIndex((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId);
    const [siblingA, siblingB] = siblingAfterDoc.nodes.splice(sharedIndexBeforeSwap - 2, 2);
    siblingAfterDoc.nodes.splice(sharedIndexBeforeSwap - 2, 0, siblingB, siblingA);
    expect(siblingAfterDoc.nodes.findIndex((node) => node.attrs?.['data-logoforge-node-id'] === command!.nodeId))
      .toBe(sharedIndexBeforeSwap);
    expect(sharedWhiteboardPathsUnchanged(siblingBefore, serializeSvg(siblingAfterDoc))).toBe(false);

    const reorderedDoc = parseSvg(sharedSvg);
    reorderedDoc.nodes.reverse();
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, serializeSvg(reorderedDoc))).toBe(false);

    const changedRootDoc = parseSvg(sharedSvg);
    changedRootDoc.rootAttrs.viewBox = '1 1 398 398';
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, serializeSvg(changedRootDoc))).toBe(false);

    expect(sharedWhiteboardPathsUnchanged(
      sharedSvg,
      replacePathDataById(sharedSvg, command!.nodeId, 'M 11,11 L 41,41'),
    )).toBe(false);
    expect(sharedWhiteboardPathsUnchanged(sharedSvg, deletePathById(sharedSvg, command!.nodeId))).toBe(false);
    expect(sharedWhiteboardPathsUnchanged(
      sharedSvg,
      replacePathDataById(sharedSvg, 'existing', 'M 0,0 L 6,6'),
    )).toBe(true);
  });

  it('applies and reverses a shared path geometry/style update without changing document siblings', () => {
    const project = makeProject();
    const sketch = makeSketch('shared-wb-update');
    const addCommand = createSharedWhiteboardPathCommand(project, sketch, 'add-before-update');
    const withSharedPath = { ...project, ...applySharedWhiteboardPathCommand(project, addCommand!)! };
    const candidateSvg = updatePathStyleById(
      replacePathDataById(withSharedPath.svgSource, addCommand!.nodeId, 'M 12,12 L 44,44'),
      addCommand!.nodeId,
      { stroke: '#e11d48', fill: '#abcdef', strokeWidth: 7 },
    );
    const command = createSharedWhiteboardUpdateCommand(withSharedPath, addCommand!.nodeId, candidateSvg, 'update-1');
    expect(command).toMatchObject({ kind: 'update-path', sketchId: sketch.id, nodeIndex: 1, sketchIndex: 0 });

    const applied = applySharedWhiteboardUpdateCommand(withSharedPath, command!);
    expect(applied).not.toBeNull();
    const updatedPath = listEditablePaths(applied!.svgSource).find((path) => path.nodeId === addCommand!.nodeId);
    expect(updatedPath).toMatchObject({ d: 'M 12,12 L 44,44', stroke: '#e11d48', fill: '#abcdef', strokeWidth: 7 });
    expect(applied!.whiteboardSketches).toEqual([{
      ...sketch,
      path: 'M 12,12 L 44,44',
      color: '#e11d48',
      fillColor: '#abcdef',
      strokeWidth: 7,
    }]);
    expect(listEditablePaths(applied!.svgSource).map((path) => path.nodeId)).toEqual(['existing', addCommand!.nodeId]);

    const undone = undoSharedWhiteboardUpdateCommand({ ...withSharedPath, ...applied }, command!);
    expect(undone).not.toBeNull();
    expect(listEditablePaths(undone!.svgSource)).toEqual(listEditablePaths(withSharedPath.svgSource));
    expect(undone!.whiteboardSketches).toEqual([sketch]);

    const redone = applySharedWhiteboardUpdateCommand({ ...withSharedPath, ...undone }, command!);
    expect(redone).not.toBeNull();
    expect(listEditablePaths(redone!.svgSource)).toEqual(listEditablePaths(applied!.svgSource));
    expect(redone!.whiteboardSketches).toEqual(applied!.whiteboardSketches);
  });

  it('rejects multi-target/stale updates and validates the original nested parent context', () => {
    const project = makeProject();
    const sketch = makeSketch('shared-wb-update-safe');
    const addCommand = createSharedWhiteboardPathCommand(project, sketch, 'add-before-update-safe');
    const withSharedPath = { ...project, ...applySharedWhiteboardPathCommand(project, addCommand!)! };
    const candidateSvg = replacePathDataById(withSharedPath.svgSource, addCommand!.nodeId, 'M 11,11 L 41,41');

    const changedSiblingSvg = updatePathStyleById(candidateSvg, 'existing', { stroke: '#ff0000' });
    expect(createSharedWhiteboardUpdateCommand(withSharedPath, addCommand!.nodeId, changedSiblingSvg)).toBeNull();
    const changedRoot = parseSvg(candidateSvg);
    changedRoot.rootAttrs.viewBox = '1 1 398 398';
    expect(createSharedWhiteboardUpdateCommand(withSharedPath, addCommand!.nodeId, serializeSvg(changedRoot))).toBeNull();

    const command = createSharedWhiteboardUpdateCommand(withSharedPath, addCommand!.nodeId, candidateSvg, 'update-safe');
    const applied = applySharedWhiteboardUpdateCommand(withSharedPath, command!);
    const tamperedNodeCommand = {
      ...command!,
      afterNode: { ...command!.afterNode, transformRaw: 'rotate(12)' },
    };
    expect(applySharedWhiteboardUpdateCommand(withSharedPath, tamperedNodeCommand)).toBeNull();
    const tamperedSketchCommand = {
      ...command!,
      afterSketch: { ...command!.afterSketch, color: '#00ff00' },
    };
    expect(applySharedWhiteboardUpdateCommand(withSharedPath, tamperedSketchCommand)).toBeNull();
    const staleDoc = parseSvg(applied!.svgSource);
    staleDoc.nodes.find((node) => node.attrs?.['data-logoforge-node-id'] === addCommand!.nodeId)!.props!.d = 'M 1,1 L 99,99';
    expect(undoSharedWhiteboardUpdateCommand({ ...withSharedPath, ...applied, svgSource: serializeSvg(staleDoc) }, command!))
      .toBeNull();

    const nestedProject = {
      ...makeProject(),
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><g id="outer"><g id="inner"><path id="nested" d="M0 0 L5 5" /></g></g></svg>',
    };
    const nestedSketch = { ...makeSketch('shared-wb-update-nested'), type: 'path' as const, path: 'M0 0 L5 5', locked: true };
    const linkCommand = createSharedWhiteboardLinkCommand(nestedProject, 'nested', nestedSketch, 'nested-link-update');
    const linked = { ...nestedProject, ...applySharedWhiteboardLinkCommand(nestedProject, linkCommand!)! };
    const nestedCandidate = replacePathDataById(linked.svgSource, 'nested', 'M1 1 L6 6');
    const nestedCommand = createSharedWhiteboardUpdateCommand(linked, 'nested', nestedCandidate, 'nested-update');
    expect(nestedCommand?.parentPath.map((step) => step.nodeId)).toEqual(['outer', 'inner']);
    const nestedApplied = applySharedWhiteboardUpdateCommand(linked, nestedCommand!);
    const changedParentDoc = parseSvg(nestedApplied!.svgSource);
    changedParentDoc.nodes.find((node) => node.id === 'outer')!.transformRaw = 'translate(9 10)';
    expect(undoSharedWhiteboardUpdateCommand({ ...linked, ...nestedApplied, svgSource: serializeSvg(changedParentDoc) }, nestedCommand!))
      .toBeNull();
    const nestedUndo = undoSharedWhiteboardUpdateCommand({ ...linked, ...nestedApplied }, nestedCommand!);
    expect(nestedUndo).not.toBeNull();
    expect(listEditablePaths(nestedUndo!.svgSource).find((path) => path.nodeId === 'nested')?.d).toBe('M0 0 L5 5');
    expect(nestedUndo!.whiteboardSketches).toEqual([nestedSketch]);
  });

  it('serializes rapid shared updates and rebases independent geometry/style fields', async () => {
    const setupHistory = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch('shared-wb-serialized-update');
    expect(await setupHistory.addWhiteboardPath(sketch)).toBe(true);
    const baseSvg = useAppStore.getState().projects[0].svgSource!;
    const nodeId = `whiteboard-${sketch.id}`;

    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    let markFirstStarted!: () => void;
    let markSecondStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => { markFirstStarted = resolve; });
    const secondStarted = new Promise<void>((resolve) => { markSecondStarted = resolve; });
    let commitCount = 0;
    let secondPendingUpdates: Partial<Project> | null = null;
    const delayedCommit = (updates: Partial<Project>) => new Promise<void>((resolve) => {
      commitCount += 1;
      const release = (
        markStarted: () => void,
        setRelease: (callback: () => void) => void,
        afterPersist?: () => Promise<void>,
      ) => {
        setRelease(() => {
          void commitToStore(updates).then(async () => {
            if (afterPersist) await afterPersist();
            resolve();
          });
        });
        markStarted();
      };
      if (commitCount === 1) release(markFirstStarted, (callback) => { releaseFirst = callback; }, async () => {
        const currentSvg = useAppStore.getState().projects[0].svgSource!;
        const concurrentDoc = parseSvg(currentSvg);
        concurrentDoc.defs = '<defs><linearGradient id="unrelated-gradient"></linearGradient></defs>';
        await commitToStore({
          svgSource: replacePathDataById(serializeSvg(concurrentDoc), 'existing', 'M 2,2 L 8,8'),
        });
      });
      else if (commitCount === 2) {
        secondPendingUpdates = updates;
        release(markSecondStarted, (callback) => { releaseSecond = callback; });
      }
      else void commitToStore(updates).then(resolve);
    });
    const history = createSharedVectorHistoryController(delayedCommit);
    const styleCandidate = updatePathStyleById(baseSvg, nodeId, { stroke: '#e11d48' });
    const geometryCandidate = replacePathDataById(baseSvg, nodeId, 'M 20,20 L 50,50');
    const styleUpdate = history.updateSharedWhiteboardPath(nodeId, styleCandidate, baseSvg);
    const geometryUpdate = history.updateSharedWhiteboardPath(nodeId, geometryCandidate, baseSvg);

    await firstStarted;
    expect(commitCount).toBe(1);
    releaseFirst();
    await secondStarted;
    expect(commitCount).toBe(2);
    const queuedGeometry = listEditablePaths(secondPendingUpdates?.svgSource ?? '')
      .find((path) => path.nodeId === nodeId);
    expect(queuedGeometry).toMatchObject({ d: 'M 20,20 L 50,50', stroke: '#e11d48' });
    expect(listEditablePaths(secondPendingUpdates?.svgSource ?? '').find((path) => path.nodeId === 'existing')?.d)
      .toBe('M 2,2 L 8,8');
    releaseSecond();

    expect(await Promise.all([styleUpdate, geometryUpdate])).toEqual([true, true]);
    expect(useAppStore.getState().sharedVectorHistoryByProject['project-1']).toMatchObject({ index: 2 });
    expect(useAppStore.getState().projects[0].whiteboardSketches?.[0]).toMatchObject({
      path: 'M 20,20 L 50,50',
      color: '#e11d48',
    });
    expect(listEditablePaths(useAppStore.getState().projects[0].svgSource).find((path) => path.nodeId === 'existing')?.d)
      .toBe('M 2,2 L 8,8');
    expect(useAppStore.getState().projects[0].svgSource).toContain('unrelated-gradient');

    expect(await history.undo()).toBe(true);
    expect(useAppStore.getState().projects[0].whiteboardSketches?.[0]).toMatchObject({
      path: sketch.path,
      color: '#e11d48',
    });
    expect(await history.undo()).toBe(true);
    expect(useAppStore.getState().projects[0].whiteboardSketches?.[0]).toEqual(sketch);
    expect(listEditablePaths(useAppStore.getState().projects[0].svgSource).find((path) => path.nodeId === 'existing')?.d)
      .toBe('M 2,2 L 8,8');
  });

  it('merges locally applied and undone shared commands onto remote snapshots', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch('shared-wb-remote-merge');
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    const projectAfterAdd = useAppStore.getState().projects[0];
    const staleRemoteBeforeAdd = { ...makeProject(), description: 'remote description' };

    const mergedApplied = mergeLocalSharedHistoryIntoRemoteProject(staleRemoteBeforeAdd);
    expect(mergedApplied.description).toBe('remote description');
    expect(mergedApplied.whiteboardSketches).toEqual([sketch]);
    expect(listEditablePaths(mergedApplied.svgSource).some((path) => path.nodeId === `whiteboard-${sketch.id}`)).toBe(true);

    expect(await history.undo()).toBe(true);
    const mergedUndone = mergeLocalSharedHistoryIntoRemoteProject({
      ...projectAfterAdd,
      description: 'newer remote description',
    });
    expect(mergedUndone.description).toBe('newer remote description');
    expect(mergedUndone.whiteboardSketches ?? []).toEqual(useAppStore.getState().projects[0].whiteboardSketches ?? []);
    expect(listEditablePaths(mergedUndone.svgSource)).toHaveLength(1);
  });

  it('replays and undoes shared updates after a remote sibling shifts the target index', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch('shared-wb-reordered-update');
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    const projectBeforeUpdate = useAppStore.getState().projects[0];
    const nodeId = `whiteboard-${sketch.id}`;
    const candidate = updatePathStyleById(projectBeforeUpdate.svgSource!, nodeId, { stroke: '#e11d48' });
    expect(await history.updateSharedWhiteboardPath(nodeId, candidate, projectBeforeUpdate.svgSource!)).toBe(true);

    const remoteDoc = parseSvg(projectBeforeUpdate.svgSource!);
    const targetIndex = remoteDoc.nodes.findIndex((node) => node.id === nodeId || node.attrs?.['data-logoforge-node-id'] === nodeId);
    remoteDoc.nodes.splice(targetIndex, 0, {
      id: 'remote-sibling',
      type: 'path',
      transform: { ...IDENTITY_TRANSFORM },
      props: { d: 'M 1,1 L 2,2' },
      style: { stroke: '#222222' },
    });
    const merged = mergeLocalSharedHistoryIntoRemoteProject({
      ...projectBeforeUpdate,
      svgSource: serializeSvg(remoteDoc),
      description: 'remote sibling was inserted',
    });

    expect(merged.description).toBe('remote sibling was inserted');
    expect(listEditablePaths(merged.svgSource).map((path) => path.nodeId)).toContain('remote-sibling');
    expect(listEditablePaths(merged.svgSource).find((path) => path.nodeId === nodeId)?.stroke).toBe('#e11d48');
    expect(merged.whiteboardSketches?.[0].color).toBe('#e11d48');

    useAppStore.setState((state) => ({
      projects: state.projects.map((project) => project.id === merged.id ? merged : project),
    }));
    expect(await history.undo()).toBe(true);
    expect(listEditablePaths(useAppStore.getState().projects[0].svgSource).find((path) => path.nodeId === nodeId)?.stroke)
      .toBe('#123456');
    expect(listEditablePaths(useAppStore.getState().projects[0].svgSource).map((path) => path.nodeId)).toContain('remote-sibling');
  });

  it('replays and undoes shared deletion after a remote sibling shifts the target index', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch('shared-wb-reordered-delete');
    expect(await history.addWhiteboardPath(sketch)).toBe(true);
    const projectBeforeDelete = useAppStore.getState().projects[0];
    const nodeId = `whiteboard-${sketch.id}`;
    expect(await history.deleteSharedWhiteboardPath(nodeId)).toBe(true);

    const remoteDoc = parseSvg(projectBeforeDelete.svgSource!);
    const targetIndex = remoteDoc.nodes.findIndex((node) => node.id === nodeId || node.attrs?.['data-logoforge-node-id'] === nodeId);
    remoteDoc.nodes.splice(targetIndex, 0, {
      id: 'remote-sibling',
      type: 'path',
      transform: { ...IDENTITY_TRANSFORM },
      props: { d: 'M 1,1 L 2,2' },
      style: { stroke: '#222222' },
    });
    const merged = mergeLocalSharedHistoryIntoRemoteProject({
      ...projectBeforeDelete,
      svgSource: serializeSvg(remoteDoc),
      description: 'remote sibling was inserted',
    });

    expect(merged.description).toBe('remote sibling was inserted');
    expect(listEditablePaths(merged.svgSource).map((path) => path.nodeId)).toEqual(['existing', 'remote-sibling']);
    expect(merged.whiteboardSketches).toEqual([]);

    useAppStore.setState((state) => ({
      projects: state.projects.map((project) => project.id === merged.id ? merged : project),
    }));
    expect(await history.undo()).toBe(true);
    expect(listEditablePaths(useAppStore.getState().projects[0].svgSource).map((path) => path.nodeId)).toContain(nodeId);
    expect(listEditablePaths(useAppStore.getState().projects[0].svgSource).map((path) => path.nodeId)).toContain('remote-sibling');
    expect(useAppStore.getState().projects[0].whiteboardSketches).toEqual([sketch]);
  });

  it('preserves a pending shared update when a remote snapshot arrives before its journal record', async () => {
    const setupHistory = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch('shared-wb-pending-remote-merge');
    expect(await setupHistory.addWhiteboardPath(sketch)).toBe(true);
    const projectBeforeUpdate = useAppStore.getState().projects[0];
    const nodeId = `whiteboard-${sketch.id}`;
    let mergedDuringCommit: Project | null = null;
    const delayedCommit = async (updates: Partial<Project>) => {
      await commitToStore(updates);
      mergedDuringCommit = mergeLocalSharedHistoryIntoRemoteProject({
        ...projectBeforeUpdate,
        description: 'remote edit received during commit',
      });
    };
    const updateHistory = createSharedVectorHistoryController(delayedCommit);
    const candidate = updatePathStyleById(projectBeforeUpdate.svgSource!, nodeId, { stroke: '#e11d48' });

    expect(await updateHistory.updateSharedWhiteboardPath(nodeId, candidate, projectBeforeUpdate.svgSource!)).toBe(true);
    expect(mergedDuringCommit?.description).toBe('remote edit received during commit');
    expect(listEditablePaths(mergedDuringCommit?.svgSource ?? '').find((path) => path.nodeId === nodeId)?.stroke)
      .toBe('#e11d48');
    expect(mergedDuringCommit?.whiteboardSketches?.[0].color).toBe('#e11d48');
  });

  it('does not record a pending update when a remote snapshot conflicts on the same shared path', async () => {
    const setupHistory = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch('shared-wb-conflicting-remote-merge');
    expect(await setupHistory.addWhiteboardPath(sketch)).toBe(true);
    const projectBeforeUpdate = useAppStore.getState().projects[0];
    const nodeId = `whiteboard-${sketch.id}`;
    const remotePathData = 'M 100,100 L 140,140';
    const remoteConflict: Project = {
      ...projectBeforeUpdate,
      svgSource: replacePathDataById(projectBeforeUpdate.svgSource!, nodeId, remotePathData),
      whiteboardSketches: projectBeforeUpdate.whiteboardSketches?.map((item) =>
        item.id === sketch.id ? { ...item, path: remotePathData } : item,
      ),
    };
    const delayedCommit = async (updates: Partial<Project>) => {
      await commitToStore(updates);
      const merged = mergeLocalSharedHistoryIntoRemoteProject(remoteConflict);
      useAppStore.setState((state) => ({
        projects: state.projects.map((project) => project.id === remoteConflict.id ? merged : project),
      }));
    };
    const updateHistory = createSharedVectorHistoryController(delayedCommit);
    const candidate = updatePathStyleById(projectBeforeUpdate.svgSource!, nodeId, { stroke: '#e11d48' });

    expect(await updateHistory.updateSharedWhiteboardPath(nodeId, candidate, projectBeforeUpdate.svgSource!)).toBe(false);
    expect(listEditablePaths(useAppStore.getState().projects[0].svgSource).find((path) => path.nodeId === nodeId))
      .toMatchObject({ d: remotePathData, stroke: '#123456' });
    expect(useAppStore.getState().projects[0].whiteboardSketches?.[0]).toMatchObject({ path: remotePathData, color: '#123456' });
    expect(useAppStore.getState().sharedVectorHistoryByProject['project-1']).toMatchObject({ index: 0 });
    expect(useAppStore.getState().sharedVectorHistoryByProject['project-1']?.commands).toHaveLength(1);
  });

  it('rolls back the shared mirror when persistence rejects after applying an update locally', async () => {
    const setupHistory = createSharedVectorHistoryController(commitToStore);
    const sketch = makeSketch('shared-wb-persistence-rollback');
    expect(await setupHistory.addWhiteboardPath(sketch)).toBe(true);
    const projectBeforeUpdate = useAppStore.getState().projects[0];
    const nodeId = `whiteboard-${sketch.id}`;
    const failingCommit = async (updates: Partial<Project>) => {
      await commitToStore(updates);
      throw new Error('storage unavailable');
    };
    const failingHistory = createSharedVectorHistoryController(failingCommit);
    const candidate = updatePathStyleById(projectBeforeUpdate.svgSource!, nodeId, { stroke: '#e11d48' });

    await expect(failingHistory.updateSharedWhiteboardPath(nodeId, candidate, projectBeforeUpdate.svgSource!))
      .rejects.toThrow('storage unavailable');

    const currentProject = useAppStore.getState().projects[0];
    expect(listEditablePaths(currentProject.svgSource).find((path) => path.nodeId === nodeId)?.stroke).toBe('#123456');
    expect(currentProject.whiteboardSketches?.[0].color).toBe('#123456');
    expect(useAppStore.getState().sharedVectorHistoryByProject['project-1']).toMatchObject({ index: 0 });
    expect(useAppStore.getState().sharedVectorHistoryByProject['project-1']?.commands).toHaveLength(1);
  });

  it('discards a shared redo tail when a fresh local action is recorded', async () => {
    const history = createSharedVectorHistoryController(commitToStore);
    expect(await history.addWhiteboardPath(makeSketch('shared-wb-first'))).toBe(true);
    expect(await history.addWhiteboardPath(makeSketch('shared-wb-second'))).toBe(true);
    expect(await history.undo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    useAppStore.getState().discardSharedVectorRedoBranch('project-1');

    expect(history.canRedo()).toBe(false);
    expect(useAppStore.getState().sharedVectorHistoryByProject['project-1']).toMatchObject({
      index: 0,
      commands: [{ sketch: { id: 'shared-wb-first' } }],
    });
  });
});
