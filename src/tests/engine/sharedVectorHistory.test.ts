import { beforeEach, describe, expect, it } from 'vitest';
import { deletePathById, listEditablePaths, replacePathDataById } from '../../engine/pathEditorBridge';
import {
  applySharedWhiteboardLinkCommand,
  applySharedWhiteboardPathCommand,
  createSharedVectorHistoryController,
  createSharedWhiteboardLinkCommand,
  createSharedWhiteboardPathCommand,
  preserveSharedWhiteboardSketches,
  sharedWhiteboardPathsUnchanged,
  undoSharedWhiteboardLinkCommand,
  undoSharedWhiteboardPathCommand,
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

    const linkedSketch = { ...makeSketch('shared-wb-linked-existing'), path: 'M0 0 L5 5', locked: true };
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
    const linkedSketch = { ...makeSketch('shared-wb-linked-persisted'), path: 'M0 0 L5 5', locked: true };
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

  it('links an existing SVG path into Whiteboard without duplicating it and restores the link on undo/redo', () => {
    const project = makeProject();
    const sketch = { ...makeSketch('shared-wb-existing'), path: 'M0 0 L5 5', locked: true };
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

  it('preserves shared Whiteboard mirrors against local mutation, reordering, and deletion', () => {
    const legacy = makeSketch('legacy-sketch');
    const shared = { ...makeSketch('shared-wb-read-only'), locked: true };
    const attemptedMutation = { ...shared, name: 'Changed locally', path: 'M 0,0 L 1,1', locked: false };

    expect(preserveSharedWhiteboardSketches([legacy, shared], [{ ...legacy, name: 'Local edit' }, attemptedMutation]))
      .toEqual([{ ...legacy, name: 'Local edit' }, shared]);
    expect(preserveSharedWhiteboardSketches([legacy, shared], [legacy])).toEqual([legacy, shared]);
    expect(preserveSharedWhiteboardSketches([legacy, shared], [attemptedMutation, legacy])).toEqual([legacy, shared]);
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
