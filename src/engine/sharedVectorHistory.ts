import {
  IDENTITY_TRANSFORM,
  type Node,
  type SharedWhiteboardCommand,
  type SharedWhiteboardDeleteCommand,
  type SharedWhiteboardLinkCommand,
  type SharedWhiteboardPathCommand,
  type WhiteboardSketch,
} from '../types';
import { useAppStore, type Project } from '../store';
import { parseSvg, serializeSvg, walkNodes } from './svgIo';

export type SharedHistoryCommit = (
  updates: Partial<Project>,
  throttleCloud?: boolean,
  options?: { recordLogoHistory?: boolean; preserveSharedRedo?: boolean },
) => Promise<void>;

const NODE_ID_ATTRIBUTE = 'data-logoforge-node-id';
const SHARED_WHITEBOARD_SKETCH_ATTRIBUTE = 'data-logoforge-shared-whiteboard-id';
const LINK_ORIGINAL_NODE_ID_PRESENT_ATTRIBUTE = 'data-logoforge-shared-original-node-id-present';
const LINK_ORIGINAL_NODE_ID_ATTRIBUTE = 'data-logoforge-shared-original-node-id';
export const SHARED_WHITEBOARD_SKETCH_PREFIX = 'shared-wb-';

/** Keep mirrored shared paths immutable in the legacy Whiteboard layer until edits are shared commands. */
export function preserveSharedWhiteboardSketches(
  current: WhiteboardSketch[],
  proposed: WhiteboardSketch[],
): WhiteboardSketch[] {
  const sharedSketches = current
    .map((sketch, index) => ({ sketch, index }))
    .filter(({ sketch }) => sketch.id.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX));
  if (sharedSketches.length === 0) return proposed;

  const sharedIds = new Set(sharedSketches.map(({ sketch }) => sketch.id));
  const preserved = proposed.filter((sketch) => !sharedIds.has(sketch.id));
  for (const { sketch, index } of sharedSketches) {
    preserved.splice(Math.max(0, Math.min(index, preserved.length)), 0, sketch);
  }
  return preserved;
}

function cloneNode(node: Node): Node {
  return {
    ...node,
    transform: { ...node.transform },
    style: node.style ? { ...node.style } : undefined,
    props: node.props ? { ...node.props } : undefined,
    attrs: node.attrs ? { ...node.attrs } : undefined,
    children: node.children?.map(cloneNode),
  };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function sameSerializableValue(first: unknown, second: unknown): boolean {
  return JSON.stringify(stableValue(first)) === JSON.stringify(stableValue(second));
}

function nodeContextValue(node: Node) {
  return {
    id: node.id,
    type: node.type,
    name: node.name,
    locked: node.locked,
    visible: node.visible,
    transform: node.transform,
    transformRaw: node.transformRaw,
    style: node.style,
    props: node.props,
    attrs: node.attrs,
  };
}

function nodeContextSignature(node: Node): string {
  return JSON.stringify(stableValue(nodeContextValue(node)));
}

type NodeLocation = {
  node: Node;
  nodeIndex: number;
  parentPath: SharedWhiteboardDeleteCommand['parentPath'];
};

function locateNodes(
  nodes: Node[],
  matches: (node: Node) => boolean,
  parentPath: SharedWhiteboardDeleteCommand['parentPath'] = [],
): NodeLocation[] {
  const locations: NodeLocation[] = [];
  nodes.forEach((node, nodeIndex) => {
    if (matches(node)) locations.push({ node, nodeIndex, parentPath });
    if (node.children) {
      locations.push(...locateNodes(node.children, matches, [
        ...parentPath,
        { nodeId: node.id, index: nodeIndex, context: nodeContextSignature(node) },
      ]));
    }
  });
  return locations;
}

function resolveParentContainer(
  docNodes: Node[],
  parentPath: SharedWhiteboardDeleteCommand['parentPath'],
): Node[] | null {
  let container = docNodes;
  for (const step of parentPath) {
    const parent = container[step.index];
    if (
      !parent ||
      parent.id !== step.nodeId ||
      parent.type !== 'group' ||
      !parent.children ||
      nodeContextSignature(parent) !== step.context
    ) return null;
    container = parent.children;
  }
  return container;
}

function getSharedSketchIdForNode(node: Node): string | null {
  const linkedSketchId = node.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE];
  if (linkedSketchId?.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX)) return linkedSketchId;
  const stableNodeId = node.attrs?.[NODE_ID_ATTRIBUTE] || node.id;
  const addNodePrefix = `whiteboard-${SHARED_WHITEBOARD_SKETCH_PREFIX}`;
  return stableNodeId.startsWith(addNodePrefix) ? stableNodeId.slice('whiteboard-'.length) : null;
}

function pathNodeExists(svgSource: string, nodeId: string): boolean {
  const doc = parseSvg(svgSource);
  let found = false;
  walkNodes(doc.nodes, (node) => {
    if (node.id === nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === nodeId) found = true;
  });
  return found;
}

function sharedWhiteboardPathSignature(svgSource: string): string {
  const doc = parseSvg(svgSource);
  const signature: Array<[string, string]> = [];
  const markerPrefix = `whiteboard-${SHARED_WHITEBOARD_SKETCH_PREFIX}`;
  type AncestorContext = { node: Node; index: number; siblings: Node[] };
  const nodeContext = (node: Node) => ({
    id: node.id,
    type: node.type,
    name: node.name,
    locked: node.locked,
    visible: node.visible,
    transform: node.transform,
    transformRaw: node.transformRaw,
    style: node.style,
    props: node.props,
    attrs: node.attrs,
  });
  const siblingIdentity = (siblings: Node[], index: number) => siblings.slice(0, index).map((sibling) => ({
    id: sibling.id,
    type: sibling.type,
    name: sibling.name,
  }));
  const visit = (node: Node, index: number, ancestors: AncestorContext[], siblings: Node[]) => {
    const stableId = node.attrs?.[NODE_ID_ATTRIBUTE];
    const linkedSketchId = node.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE];
    const signatureId = typeof linkedSketchId === 'string' && linkedSketchId.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX)
      ? `linked:${linkedSketchId}`
      : typeof stableId === 'string' && stableId.startsWith(markerPrefix)
        ? stableId
        : null;
    if (signatureId) {
      signature.push([
        signatureId,
        JSON.stringify(stableValue({
          rootAttrs: doc.rootAttrs,
          defs: doc.defs ?? '',
          ancestors: ancestors.map(({ node: parent, index: parentIndex, siblings: parentSiblings }) => ({
            index: parentIndex,
            precedingSiblings: siblingIdentity(parentSiblings, parentIndex),
            ...nodeContext(parent),
          })),
          precedingSiblings: siblingIdentity(siblings, index),
          index,
          node: nodeContext(node),
        })),
      ]);
    }
    node.children?.forEach((child, childIndex, children) => visit(
      child,
      childIndex,
      [...ancestors, { node, index, siblings }],
      children,
    ));
  };
  doc.nodes.forEach((node, index, siblings) => visit(node, index, [], siblings));
  return JSON.stringify(signature);
}

/** Shared mirrored paths are read-only until their edits are represented as reversible commands. */
export function sharedWhiteboardPathsUnchanged(beforeSvg: string, afterSvg: string): boolean {
  try {
    return sharedWhiteboardPathSignature(beforeSvg) === sharedWhiteboardPathSignature(afterSvg);
  } catch {
    return false;
  }
}

function reconstructAppliedSharedCommands(project: Project): SharedWhiteboardCommand[] {
  if (!project.svgSource) return [];
  try {
    const doc = parseSvg(project.svgSource);
    const sketches = project.whiteboardSketches || [];
    const commands: SharedWhiteboardCommand[] = [];

    sketches.forEach((sketch, sketchIndex) => {
      if (!sketch.id.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX)) return;

      const linkedMatches: Node[] = [];
      walkNodes(doc.nodes, (node) => {
        if (node.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE] === sketch.id) linkedMatches.push(node);
      });
      if (linkedMatches.length > 0) {
        if (linkedMatches.length !== 1 || linkedMatches[0].type !== 'path') return;
        const node = linkedMatches[0];
        const nodeId = node.attrs?.[NODE_ID_ATTRIBUTE] || node.id;
        const previousMarkerState = node.attrs?.[LINK_ORIGINAL_NODE_ID_PRESENT_ATTRIBUTE];
        const previousNodeIdMarker = previousMarkerState === 'false'
          ? undefined
          : previousMarkerState === 'true'
            ? node.attrs?.[LINK_ORIGINAL_NODE_ID_ATTRIBUTE]
            : nodeId;
        if (previousMarkerState === 'true' && previousNodeIdMarker === undefined) return;
        commands.push({
          kind: 'link-existing-path',
          commandId: `recovered:${project.id}:${sketch.id}`,
          projectId: project.id,
          nodeId,
          sketch: { ...sketch, props: sketch.props ? { ...sketch.props } : undefined },
          sketchIndex,
          previousNodeIdMarker,
        });
        return;
      }

      const nodeId = `whiteboard-${sketch.id}`;
      const pathMatches: Node[] = [];
      walkNodes(doc.nodes, (node) => {
        if (node.id === nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === nodeId) pathMatches.push(node);
      });
      if (pathMatches.length !== 1 || pathMatches[0].type !== 'path') return;
      const nodeIndex = doc.nodes.indexOf(pathMatches[0]);
      if (nodeIndex < 0) return;
      commands.push({
        kind: 'add-path',
        commandId: `recovered:${project.id}:${sketch.id}`,
        projectId: project.id,
        nodeId,
        node: cloneNode(pathMatches[0]),
        sketch: { ...sketch, props: sketch.props ? { ...sketch.props } : undefined },
        nodeIndex,
        sketchIndex,
      });
    });

    return commands;
  } catch {
    return [];
  }
}

/** Build a bounded add-path command from a valid current SVG and a reserved shared Whiteboard sketch. */
export function createSharedWhiteboardPathCommand(
  project: Project,
  sketch: WhiteboardSketch,
  commandId: string = globalThis.crypto?.randomUUID?.() ?? `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
): SharedWhiteboardPathCommand | null {
  if (
    !project.svgSource?.trim() ||
    !sketch.id ||
    !sketch.id.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX) ||
    !sketch.path?.trim()
  ) return null;

  try {
    const doc = parseSvg(project.svgSource);
    const nodeId = `whiteboard-${sketch.id}`;
    if (pathNodeExists(project.svgSource, nodeId)) return null;

    const node: Node = {
      id: nodeId,
      type: 'path',
      name: sketch.name,
      transform: { ...IDENTITY_TRANSFORM },
      style: {
        fill: sketch.fillColor || 'none',
        stroke: sketch.color || '#6366f1',
      },
      props: {
        d: sketch.path,
        strokeWidth: sketch.strokeWidth ?? 3,
      },
      attrs: { [NODE_ID_ATTRIBUTE]: nodeId },
    };

    return {
      kind: 'add-path',
      commandId,
      projectId: project.id,
      nodeId,
      node,
      sketch: { ...sketch, props: sketch.props ? { ...sketch.props } : undefined },
      nodeIndex: doc.nodes.length,
      sketchIndex: project.whiteboardSketches?.length ?? 0,
    };
  } catch {
    return null;
  }
}

/** Link an existing SVG path to a shared Whiteboard mirror without creating a duplicate SVG node. */
export function createSharedWhiteboardLinkCommand(
  project: Project,
  nodeId: string,
  sketch: WhiteboardSketch,
  commandId: string = globalThis.crypto?.randomUUID?.() ?? `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
): SharedWhiteboardLinkCommand | null {
  if (!project.svgSource?.trim() || !nodeId || !sketch.id?.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX) || !sketch.path?.trim()) return null;
  if (project.whiteboardSketches?.some((item) => item.id === sketch.id)) return null;

  try {
    const doc = parseSvg(project.svgSource);
    const matches: Node[] = [];
    walkNodes(doc.nodes, (node) => {
      if (node.id === nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === nodeId) matches.push(node);
    });
    if (matches.length !== 1 || matches[0].type !== 'path') return null;
    const target = matches[0];
    if (target.props?.d !== sketch.path || target.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE]) return null;
    const existingNodeIdMarker = target.attrs?.[NODE_ID_ATTRIBUTE];
    if (existingNodeIdMarker !== undefined && existingNodeIdMarker !== nodeId) return null;
    const previousNodeIdMarker = existingNodeIdMarker;

    return {
      kind: 'link-existing-path',
      commandId,
      projectId: project.id,
      nodeId,
      sketch: { ...sketch, props: sketch.props ? { ...sketch.props } : undefined },
      sketchIndex: project.whiteboardSketches?.length ?? 0,
      previousNodeIdMarker,
    };
  } catch {
    return null;
  }
}

/** Apply the forward delta for an existing-path link by adding only markers and the Whiteboard record. */
export function applySharedWhiteboardLinkCommand(
  project: Project,
  command: SharedWhiteboardLinkCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  if (!project.svgSource) return null;
  try {
    const doc = parseSvg(project.svgSource);
    const matches: Node[] = [];
    walkNodes(doc.nodes, (node) => {
      if (node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId) matches.push(node);
    });
    if (matches.length !== 1 || matches[0].type !== 'path') return null;
    const target = matches[0];
    if (target.props?.d !== command.sketch.path || target.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE]) return null;
    if (target.attrs?.[NODE_ID_ATTRIBUTE] !== command.previousNodeIdMarker) return null;

    const sketches = project.whiteboardSketches || [];
    if (sketches.some((item) => item.id === command.sketch.id)) return null;
    const attrs = {
      ...target.attrs,
      [NODE_ID_ATTRIBUTE]: command.nodeId,
      [SHARED_WHITEBOARD_SKETCH_ATTRIBUTE]: command.sketch.id,
      [LINK_ORIGINAL_NODE_ID_PRESENT_ATTRIBUTE]: command.previousNodeIdMarker === undefined ? 'false' : 'true',
    };
    if (command.previousNodeIdMarker === undefined) delete attrs[LINK_ORIGINAL_NODE_ID_ATTRIBUTE];
    else attrs[LINK_ORIGINAL_NODE_ID_ATTRIBUTE] = command.previousNodeIdMarker;
    target.attrs = attrs;

    const nextSketches = sketches.slice();
    nextSketches.splice(Math.max(0, Math.min(command.sketchIndex, nextSketches.length)), 0, {
      ...command.sketch,
      props: command.sketch.props ? { ...command.sketch.props } : undefined,
    });
    return { svgSource: serializeSvg(doc), whiteboardSketches: nextSketches };
  } catch {
    return null;
  }
}

/** Apply the forward delta, inserting only the command's node and sketch. */
export function applySharedWhiteboardPathCommand(
  project: Project,
  command: SharedWhiteboardPathCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  if (!project.svgSource) return null;
  try {
    const doc = parseSvg(project.svgSource);
    if (pathNodeExists(project.svgSource, command.nodeId)) return null;

    const sketches = project.whiteboardSketches || [];
    if (sketches.some((sketch) => sketch.id === command.sketch.id)) return null;

    const nodeIndex = Math.max(0, Math.min(command.nodeIndex, doc.nodes.length));
    doc.nodes.splice(nodeIndex, 0, cloneNode(command.node));

    const sketchIndex = Math.max(0, Math.min(command.sketchIndex, sketches.length));
    const nextSketches = sketches.slice();
    nextSketches.splice(sketchIndex, 0, {
      ...command.sketch,
      props: command.sketch.props ? { ...command.sketch.props } : undefined,
    });

    return {
      svgSource: serializeSvg(doc),
      whiteboardSketches: nextSketches,
    };
  } catch {
    return null;
  }
}

/** Apply the inverse delta, removing only the exact unambiguous node/sketch created by a command. */
export function undoSharedWhiteboardPathCommand(
  project: Project,
  command: SharedWhiteboardPathCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  if (!project.svgSource) return null;
  try {
    const doc = parseSvg(project.svgSource);
    const matches: Node[] = [];
    walkNodes(doc.nodes, (node) => {
      if (node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId) {
        matches.push(node);
      }
    });
    if (matches.length !== 1) return null;

    const target = matches[0];
    const sketches = project.whiteboardSketches || [];
    const matchingSketches = sketches.filter((sketch) => sketch.id === command.sketch.id);
    if (
      command.node.type !== 'path' ||
      target.type !== 'path' ||
      target.id !== command.node.id ||
      target.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
      !sameSerializableValue(target, command.node) ||
      matchingSketches.length !== 1 ||
      !sameSerializableValue(matchingSketches[0], command.sketch)
    ) return null;

    const removeInPlace = (nodes: Node[]): void => {
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (node === target) {
          nodes.splice(index, 1);
        } else if (node.children) {
          removeInPlace(node.children);
        }
      }
    };
    removeInPlace(doc.nodes);

    return {
      svgSource: serializeSvg(doc),
      whiteboardSketches: sketches.filter((sketch) => sketch.id !== command.sketch.id),
    };
  } catch {
    return null;
  }
}

/** Undo an existing-path link without deleting the SVG path itself. */
export function undoSharedWhiteboardLinkCommand(
  project: Project,
  command: SharedWhiteboardLinkCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  if (!project.svgSource) return null;
  try {
    const doc = parseSvg(project.svgSource);
    const matches: Node[] = [];
    walkNodes(doc.nodes, (node) => {
      if (node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId) matches.push(node);
    });
    if (matches.length !== 1) return null;
    const target = matches[0];
    if (
      target.type !== 'path' ||
      target.props?.d !== command.sketch.path ||
      target.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
      target.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE] !== command.sketch.id
    ) return null;

    const sketches = project.whiteboardSketches || [];
    const matchingSketches = sketches.filter((sketch) => sketch.id === command.sketch.id);
    if (matchingSketches.length !== 1 || !sameSerializableValue(matchingSketches[0], command.sketch)) return null;
    const previousMarkerState = target.attrs?.[LINK_ORIGINAL_NODE_ID_PRESENT_ATTRIBUTE];
    if (command.previousNodeIdMarker === undefined) {
      if (previousMarkerState !== 'false') return null;
    } else if (
      previousMarkerState !== 'true' ||
      target.attrs?.[LINK_ORIGINAL_NODE_ID_ATTRIBUTE] !== command.previousNodeIdMarker
    ) return null;

    const attrs = { ...target.attrs };
    delete attrs[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE];
    delete attrs[LINK_ORIGINAL_NODE_ID_PRESENT_ATTRIBUTE];
    delete attrs[LINK_ORIGINAL_NODE_ID_ATTRIBUTE];
    if (command.previousNodeIdMarker === undefined) delete attrs[NODE_ID_ATTRIBUTE];
    else attrs[NODE_ID_ATTRIBUTE] = command.previousNodeIdMarker;
    target.attrs = Object.keys(attrs).length > 0 ? attrs : undefined;

    return {
      svgSource: serializeSvg(doc),
      whiteboardSketches: sketches.filter((sketch) => sketch.id !== command.sketch.id),
    };
  } catch {
    return null;
  }
}

/** Build a reversible deletion only for one exact shared SVG path and its matching sketch. */
export function createSharedWhiteboardDeleteCommand(
  project: Project,
  nodeId: string,
  commandId: string = globalThis.crypto?.randomUUID?.() ?? `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
): SharedWhiteboardDeleteCommand | null {
  if (!project.svgSource?.trim() || !nodeId) return null;
  try {
    const doc = parseSvg(project.svgSource);
    const locations = locateNodes(
      doc.nodes,
      (node) => node.id === nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === nodeId,
    );
    if (locations.length !== 1) return null;
    const location = locations[0];
    if (location.node.type !== 'path' || location.node.attrs?.[NODE_ID_ATTRIBUTE] !== nodeId) return null;

    const sketchId = getSharedSketchIdForNode(location.node);
    if (!sketchId) return null;
    const sketches = project.whiteboardSketches || [];
    const matchingSketches = sketches
      .map((sketch, index) => ({ sketch, index }))
      .filter(({ sketch }) => sketch.id === sketchId);
    if (matchingSketches.length !== 1 || location.node.props?.d !== matchingSketches[0].sketch.path) return null;

    return {
      kind: 'delete-path',
      commandId,
      projectId: project.id,
      nodeId,
      node: cloneNode(location.node),
      sketch: {
        ...matchingSketches[0].sketch,
        props: matchingSketches[0].sketch.props ? { ...matchingSketches[0].sketch.props } : undefined,
      },
      parentPath: location.parentPath.map((step) => ({ ...step })),
      nodeIndex: location.nodeIndex,
      sketchIndex: matchingSketches[0].index,
    };
  } catch {
    return null;
  }
}

/** Apply the forward delta, removing only the exact shared node/sketch captured by the command. */
export function applySharedWhiteboardDeleteCommand(
  project: Project,
  command: SharedWhiteboardDeleteCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  if (project.id !== command.projectId || !project.svgSource) return null;
  try {
    const doc = parseSvg(project.svgSource);
    const locations = locateNodes(
      doc.nodes,
      (node) => node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId,
    );
    if (locations.length !== 1) return null;
    const location = locations[0];
    const container = resolveParentContainer(doc.nodes, command.parentPath);
    if (
      !container ||
      location.nodeIndex !== command.nodeIndex ||
      container[location.nodeIndex] !== location.node ||
      !sameSerializableValue(location.parentPath, command.parentPath) ||
      !sameSerializableValue(location.node, command.node) ||
      location.node.type !== 'path' ||
      location.node.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
      getSharedSketchIdForNode(location.node) !== command.sketch.id ||
      location.node.props?.d !== command.sketch.path
    ) return null;

    const sketches = project.whiteboardSketches || [];
    const matchingIndexes = sketches
      .map((sketch, index) => ({ sketch, index }))
      .filter(({ sketch }) => sketch.id === command.sketch.id);
    if (
      matchingIndexes.length !== 1 ||
      matchingIndexes[0].index !== command.sketchIndex ||
      !sameSerializableValue(matchingIndexes[0].sketch, command.sketch)
    ) return null;

    container.splice(location.nodeIndex, 1);
    const nextSketches = sketches.slice();
    nextSketches.splice(matchingIndexes[0].index, 1);
    return { svgSource: serializeSvg(doc), whiteboardSketches: nextSketches };
  } catch {
    return null;
  }
}

/** Apply the inverse delta at the original parent and index; stale context is a safe no-op. */
export function undoSharedWhiteboardDeleteCommand(
  project: Project,
  command: SharedWhiteboardDeleteCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  if (project.id !== command.projectId || !project.svgSource) return null;
  if (
    command.node.type !== 'path' ||
    command.node.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
    getSharedSketchIdForNode(command.node) !== command.sketch.id ||
    command.node.props?.d !== command.sketch.path
  ) return null;

  try {
    const doc = parseSvg(project.svgSource);
    const existingNodes = locateNodes(
      doc.nodes,
      (node) => node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId,
    );
    if (existingNodes.length > 0) return null;
    const container = resolveParentContainer(doc.nodes, command.parentPath);
    if (!container || command.nodeIndex > container.length) return null;

    const sketches = project.whiteboardSketches || [];
    if (sketches.some((sketch) => sketch.id === command.sketch.id) || command.sketchIndex > sketches.length) return null;

    container.splice(command.nodeIndex, 0, cloneNode(command.node));
    const nextSketches = sketches.slice();
    nextSketches.splice(command.sketchIndex, 0, {
      ...command.sketch,
      props: command.sketch.props ? { ...command.sketch.props } : undefined,
    });
    return { svgSource: serializeSvg(doc), whiteboardSketches: nextSketches };
  } catch {
    return null;
  }
}

/**
 * Coordinates delta application with the shared Zustand journal and the host's normal persistence
 * and collaboration callback. The history cursor advances only after the project update succeeds.
 */
export function createSharedVectorHistoryController(commit: SharedHistoryCommit) {
  const getActiveProject = (): Project | null => {
    const state = useAppStore.getState();
    if (!state.activeProjectId) return null;
    return state.projects.find((project) => project.id === state.activeProjectId) ?? null;
  };

  const restoreAppliedHistory = (project: Project): void => {
    const currentHistory = useAppStore.getState().sharedVectorHistoryByProject[project.id];
    if (currentHistory && currentHistory.commands.length > 0) return;
    reconstructAppliedSharedCommands(project).forEach((command) => {
      useAppStore.getState().recordSharedVectorCommand(project.id, command);
    });
  };

  const addWhiteboardPath = async (sketch: WhiteboardSketch): Promise<boolean> => {
    const project = getActiveProject();
    if (!project) return false;
    restoreAppliedHistory(project);
    const command = createSharedWhiteboardPathCommand(project, sketch);
    if (!command) return false;
    const updates = applySharedWhiteboardPathCommand(project, command);
    if (!updates) return false;

    await commit(updates, true, { recordLogoHistory: false });
    useAppStore.getState().recordSharedVectorCommand(project.id, command);
    return true;
  };

  const addExistingPathToWhiteboard = async (nodeId: string, sketch: WhiteboardSketch): Promise<boolean> => {
    const project = getActiveProject();
    if (!project) return false;
    restoreAppliedHistory(project);
    const command = createSharedWhiteboardLinkCommand(project, nodeId, sketch);
    if (!command) return false;
    const updates = applySharedWhiteboardLinkCommand(project, command);
    if (!updates) return false;

    await commit(updates, true, { recordLogoHistory: false });
    useAppStore.getState().recordSharedVectorCommand(project.id, command);
    return true;
  };

  const deleteSharedWhiteboardPath = async (nodeId: string): Promise<boolean> => {
    const project = getActiveProject();
    if (!project) return false;
    restoreAppliedHistory(project);
    const command = createSharedWhiteboardDeleteCommand(project, nodeId);
    if (!command) return false;
    const updates = applySharedWhiteboardDeleteCommand(project, command);
    if (!updates) return false;

    await commit(updates, true, { recordLogoHistory: false });
    useAppStore.getState().recordSharedVectorCommand(project.id, command);
    return true;
  };

  const undo = async (): Promise<boolean> => {
    const project = getActiveProject();
    if (!project) return false;
    restoreAppliedHistory(project);
    const state = useAppStore.getState();
    const command = state.getSharedVectorUndoCommand(project.id);
    if (!command) return false;
    const updates = command.kind === 'link-existing-path'
      ? undoSharedWhiteboardLinkCommand(project, command)
      : command.kind === 'delete-path'
        ? undoSharedWhiteboardDeleteCommand(project, command)
        : undoSharedWhiteboardPathCommand(project, command);
    if (!updates) {
      // Consume only this stale shared step; never fall through to legacy snapshot undo.
      useAppStore.getState().commitSharedVectorUndo(project.id, command.commandId);
      return true;
    }

    await commit(updates, true, { recordLogoHistory: false });
    useAppStore.getState().commitSharedVectorUndo(project.id, command.commandId);
    return true;
  };

  const redo = async (): Promise<boolean> => {
    const project = getActiveProject();
    if (!project) return false;
    const state = useAppStore.getState();
    const command = state.getSharedVectorRedoCommand(project.id);
    if (!command) return false;
    const updates = command.kind === 'link-existing-path'
      ? applySharedWhiteboardLinkCommand(project, command)
      : command.kind === 'delete-path'
        ? applySharedWhiteboardDeleteCommand(project, command)
        : applySharedWhiteboardPathCommand(project, command);
    if (!updates) {
      // A conflicting or missing target is a safe no-op, not permission to redo elsewhere.
      useAppStore.getState().commitSharedVectorRedo(project.id, command.commandId);
      return true;
    }

    await commit(updates, true, { recordLogoHistory: false });
    useAppStore.getState().commitSharedVectorRedo(project.id, command.commandId);
    return true;
  };

  const canUndo = (): boolean => {
    const project = getActiveProject();
    if (!project) return false;
    const state = useAppStore.getState();
    const currentHistory = state.sharedVectorHistoryByProject[project.id];
    if (currentHistory && currentHistory.commands.length > 0) return state.canUndoSharedVector(project.id);
    return reconstructAppliedSharedCommands(project).length > 0;
  };

  const canRedo = (): boolean => {
    const project = getActiveProject();
    return project ? useAppStore.getState().canRedoSharedVector(project.id) : false;
  };

  return {
    addWhiteboardPath,
    addExistingPathToWhiteboard,
    deleteSharedWhiteboardPath,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
