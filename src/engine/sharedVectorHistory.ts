import {
  IDENTITY_TRANSFORM,
  type Node,
  type SharedWhiteboardCommand,
  type SharedWhiteboardDeleteCommand,
  type SharedWhiteboardLinkCommand,
  type SharedWhiteboardPathCommand,
  type SharedWhiteboardUpdateCommand,
  type SvgDocument,
  type WhiteboardSketch,
} from '../types';
import { useAppStore, type Project } from '../store';
import { copySvgNodeIdSource, getSvgNodeIdSource, parseSvg, serializeSvg, walkNodes } from './svgIo';
import {
  WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE,
  WHITEBOARD_STABLE_NODE_ID_ATTRIBUTE,
  whiteboardNodeIdForSketch,
} from './whiteboardNodeAdapter';

export type SharedHistoryCommit = (
  updates: Partial<Project>,
  throttleCloud?: boolean,
  options?: { recordLogoHistory?: boolean; preserveSharedRedo?: boolean },
) => Promise<void>;

const NODE_ID_ATTRIBUTE = WHITEBOARD_STABLE_NODE_ID_ATTRIBUTE;
const SHARED_WHITEBOARD_SKETCH_ATTRIBUTE = WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE;
const LINK_ORIGINAL_NODE_ID_PRESENT_ATTRIBUTE = 'data-logoforge-shared-original-node-id-present';
const LINK_ORIGINAL_NODE_ID_ATTRIBUTE = 'data-logoforge-shared-original-node-id';
const ROOT_PRESENTATION_ATTRS = new Set(['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'color', 'visibility', 'display', 'mix-blend-mode', 'style', 'filter', 'mask', 'clip-path', 'vector-effect', 'paint-order', 'shape-rendering', 'class']);
const LINKED_PATH_PRESENTATION_ATTRS = new Set([...ROOT_PRESENTATION_ATTRS, 'fill-rule', 'clip-rule', 'stroke-miterlimit', 'marker-start', 'marker-mid', 'marker-end']);
export const SHARED_WHITEBOARD_SKETCH_PREFIX = 'shared-wb-';

const sharedMutationTails = new Map<string, Promise<void>>();

function isSharedWhiteboardSketchId(id: string): boolean {
  return id.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX) && id.slice(SHARED_WHITEBOARD_SKETCH_PREFIX.length).trim().length > 0;
}

function enqueueSharedMutation<T>(projectId: string, operation: () => Promise<T>): Promise<T> {
  const previous = sharedMutationTails.get(projectId) ?? Promise.resolve();
  const result = previous.then(operation, operation);
  const settled = result.then(() => undefined, () => undefined);
  sharedMutationTails.set(projectId, settled);
  void settled.then(() => {
    if (sharedMutationTails.get(projectId) === settled) sharedMutationTails.delete(projectId);
  });
  return result;
}

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
  const clone: Node = {
    ...node,
    transform: { ...node.transform },
    style: node.style ? { ...node.style } : undefined,
    props: node.props ? { ...node.props } : undefined,
    attrs: node.attrs ? { ...node.attrs } : undefined,
    children: node.children?.map(cloneNode),
  };
  copySvgNodeIdSource(node, clone);
  return clone;
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

function hasUnsupportedSharedLinkContext(doc: SvgDocument, target: Node): boolean {
  if (Object.keys(doc.rootAttrs).some((key) => ROOT_PRESENTATION_ATTRS.has(key)) || /<\s*style\b/i.test(doc.defs || '')) return true;
  const find = (siblings: Node[], ancestors: Node[]): Node[] | null => {
    for (const node of siblings) {
      if (node === target) return [...ancestors, node];
      if (node.children) {
        const nested = find(node.children, [...ancestors, node]);
        if (nested) return nested;
      }
    }
    return null;
  };
  const path = find(doc.nodes, []);
  if (!path) return true;
  return path.some((node) => {
    const transform = node.transform;
    const transformedOrHidden = !transform || transform.x !== 0 || transform.y !== 0 || transform.scaleX !== 1 ||
      transform.scaleY !== 1 || transform.rotate !== 0 || node.transformRaw !== undefined || node.visible === false;
    const inheritedGroupContext = node.type === 'group' && (node.style !== undefined || Object.keys(node.attrs || {}).length > 0);
    const targetPresentation = node === target && (
      node.style?.opacity !== undefined || node.style?.blendMode !== undefined ||
      Object.keys(node.attrs || {}).some((key) => LINKED_PATH_PRESENTATION_ATTRS.has(key))
    );
    return transformedOrHidden || inheritedGroupContext || targetPresentation;
  });
}

function sharedLinkMarkers(nodes: Node[], sketchId: string): Node[] {
  const matches: Node[] = [];
  walkNodes(nodes, (node) => {
    if (node.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE] === sketchId) matches.push(node);
  });
  return matches;
}

function sharedReservedIdentityNodes(nodes: Node[], sketchId: string): Node[] {
  const reservedId = whiteboardNodeIdForSketch(sketchId);
  const matches: Node[] = [];
  walkNodes(nodes, (node) => {
    if (node.id === reservedId || node.attrs?.[NODE_ID_ATTRIBUTE] === reservedId) matches.push(node);
  });
  return matches;
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

function resolveParentContainerByIdentity(
  docNodes: Node[],
  parentPath: SharedWhiteboardDeleteCommand['parentPath'],
): Node[] | null {
  let container = docNodes;
  for (const step of parentPath) {
    const matches = container
      .map((node, index) => ({ node, index }))
      .filter(({ node }) => node.id === step.nodeId && node.type === 'group' &&
        Boolean(node.children) && nodeContextSignature(node) === step.context);
    if (matches.length !== 1) return null;
    container = matches[0].node.children!;
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

function collectTransientPathIdMarkers(beforeNodes: Node[], candidateNodes: Node[]) {
  const beforeMarkers = new Set<Node>();
  const candidateMarkers = new Set<Node>();
  const visit = (before: Node[], candidate: Node[]) => {
    const count = Math.min(before.length, candidate.length);
    for (let index = 0; index < count; index += 1) {
      const beforeNode = before[index];
      const candidateNode = candidate[index];
      if (
        beforeNode.type === 'path' &&
        candidateNode.type === 'path' &&
        beforeNode.id === candidateNode.id &&
        beforeNode.attrs?.[NODE_ID_ATTRIBUTE] === undefined &&
        candidateNode.attrs?.[NODE_ID_ATTRIBUTE] === candidateNode.id
      ) {
        beforeMarkers.add(beforeNode);
        candidateMarkers.add(candidateNode);
      }
      if (beforeNode.children && candidateNode.children) visit(beforeNode.children, candidateNode.children);
    }
  };
  visit(beforeNodes, candidateNodes);
  return { beforeMarkers, candidateMarkers };
}

function normalizeSharedPathEditDocument(doc: ReturnType<typeof parseSvg>, target: Node, transientMarkers: Set<Node>) {
  const normalizeNodes = (nodes: Node[]): Node[] => nodes.map((node) => {
    const normalized = cloneNode(node);
    if (transientMarkers.has(node)) {
      const attrs = { ...normalized.attrs };
      delete attrs[NODE_ID_ATTRIBUTE];
      normalized.attrs = Object.keys(attrs).length > 0 ? attrs : undefined;
    }
    if (node === target) {
      const props = { ...(normalized.props || {}) };
      delete props.d;
      delete props.strokeWidth;
      normalized.props = Object.keys(props).length > 0 ? props : undefined;
      const style = { ...(normalized.style || {}) };
      delete style.stroke;
      delete style.fill;
      normalized.style = Object.keys(style).length > 0 ? style : undefined;
    }
    normalized.children = node.children ? normalizeNodes(node.children) : undefined;
    return normalized;
  });
  return { rootAttrs: doc.rootAttrs, defs: doc.defs, nodes: normalizeNodes(doc.nodes) };
}

type SharedPathEditFields = { d: boolean; stroke: boolean; fill: boolean; width: boolean };

function copyPathEditFields(target: Node, source: Node, fields: SharedPathEditFields): Node {
  const updated = cloneNode(target);
  const props = { ...(updated.props || {}) };
  if (fields.d) {
    if (source.props && Object.prototype.hasOwnProperty.call(source.props, 'd')) props.d = source.props.d;
    else delete props.d;
  }
  if (fields.width) {
    if (source.props && Object.prototype.hasOwnProperty.call(source.props, 'strokeWidth')) props.strokeWidth = source.props.strokeWidth;
    else delete props.strokeWidth;
  }
  updated.props = Object.keys(props).length > 0 ? props : undefined;

  const style = { ...(updated.style || {}) };
  if (fields.stroke) {
    if (source.style && Object.prototype.hasOwnProperty.call(source.style, 'stroke')) style.stroke = source.style.stroke;
    else delete style.stroke;
  }
  if (fields.fill) {
    if (source.style && Object.prototype.hasOwnProperty.call(source.style, 'fill')) style.fill = source.style.fill;
    else delete style.fill;
  }
  updated.style = Object.keys(style).length > 0 ? style : undefined;
  return updated;
}

function cloneSketch(sketch: WhiteboardSketch): WhiteboardSketch {
  return { ...sketch, props: sketch.props ? { ...sketch.props } : undefined };
}

function pathStrokeWidth(node: Node): number {
  const raw = node.props?.strokeWidth;
  const width = raw === undefined ? 2 : Number.parseFloat(String(raw));
  return Number.isFinite(width) ? width : Number.NaN;
}

type SharedPathEditIntent = {
  beforeNode: Node;
  afterNode: Node;
  parentPath: SharedWhiteboardDeleteCommand['parentPath'];
  nodeIndex: number;
  changed: SharedPathEditFields;
};

function sameParentPathIdentity(
  first: SharedWhiteboardDeleteCommand['parentPath'],
  second: SharedWhiteboardDeleteCommand['parentPath'],
): boolean {
  return first.length === second.length && first.every((step, index) =>
    step.nodeId === second[index].nodeId && step.context === second[index].context,
  );
}

function getSharedPathEditIntent(
  beforeSvg: string,
  candidateSvg: string,
  nodeId: string,
  allowUnrelatedDocumentEdits = false,
): SharedPathEditIntent | null {
  try {
    const beforeDoc = parseSvg(beforeSvg);
    const candidateDoc = parseSvg(candidateSvg);
    const findTarget = (nodes: Node[]) => locateNodes(
      nodes,
      (node) => node.id === nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === nodeId,
    );
    const beforeLocations = findTarget(beforeDoc.nodes);
    const candidateLocations = findTarget(candidateDoc.nodes);
    if (beforeLocations.length !== 1 || candidateLocations.length !== 1) return null;
    const beforeLocation = beforeLocations[0];
    const candidateLocation = candidateLocations[0];
    const beforeNode = beforeLocation.node;
    const candidateNode = candidateLocation.node;
    if (
      beforeNode.type !== 'path' ||
      candidateNode.type !== 'path' ||
      beforeNode.attrs?.[NODE_ID_ATTRIBUTE] !== nodeId ||
      candidateNode.attrs?.[NODE_ID_ATTRIBUTE] !== nodeId ||
      (!allowUnrelatedDocumentEdits && beforeLocation.nodeIndex !== candidateLocation.nodeIndex) ||
      !(allowUnrelatedDocumentEdits
        ? sameParentPathIdentity(beforeLocation.parentPath, candidateLocation.parentPath)
        : sameSerializableValue(beforeLocation.parentPath, candidateLocation.parentPath)) ||
      !getSharedSketchIdForNode(beforeNode) ||
      getSharedSketchIdForNode(beforeNode) !== getSharedSketchIdForNode(candidateNode)
    ) return null;

    if (allowUnrelatedDocumentEdits) {
      if (
        !sameSerializableValue(beforeDoc.rootAttrs, candidateDoc.rootAttrs) ||
        !sameSerializableValue(nodeWithoutSharedPathEditFields(beforeNode), nodeWithoutSharedPathEditFields(candidateNode))
      ) return null;
    } else {
      const transientMarkers = collectTransientPathIdMarkers(beforeDoc.nodes, candidateDoc.nodes);
      if (!sameSerializableValue(
        normalizeSharedPathEditDocument(beforeDoc, beforeNode, transientMarkers.beforeMarkers),
        normalizeSharedPathEditDocument(candidateDoc, candidateNode, transientMarkers.candidateMarkers),
      )) return null;
    }

    const changed: SharedPathEditFields = {
      d: !sameSerializableValue(beforeNode.props?.d, candidateNode.props?.d),
      stroke: !sameSerializableValue(beforeNode.style?.stroke, candidateNode.style?.stroke),
      fill: !sameSerializableValue(beforeNode.style?.fill, candidateNode.style?.fill),
      width: !sameSerializableValue(beforeNode.props?.strokeWidth, candidateNode.props?.strokeWidth),
    };
    if (typeof beforeNode.props?.d !== 'string' || typeof candidateNode.props?.d !== 'string') return null;
    if (
      (changed.stroke && candidateNode.style?.stroke !== undefined && typeof candidateNode.style.stroke !== 'string') ||
      (changed.fill && candidateNode.style?.fill !== undefined && typeof candidateNode.style.fill !== 'string')
    ) return null;
    const candidateWidth = pathStrokeWidth(candidateNode);
    if (changed.width && (!Number.isFinite(candidateWidth) || candidateWidth < 0)) return null;

    return {
      beforeNode: cloneNode(beforeNode),
      afterNode: copyPathEditFields(beforeNode, candidateNode, changed),
      parentPath: beforeLocation.parentPath.map((step) => ({ ...step })),
      nodeIndex: beforeLocation.nodeIndex,
      changed,
    };
  } catch {
    return null;
  }
}

function rebaseSharedPathUpdateCandidate(
  baseSvg: string,
  currentSvg: string,
  candidateSvg: string,
  nodeId: string,
): string | null {
  const requested = getSharedPathEditIntent(baseSvg, candidateSvg, nodeId);
  const currentFromBase = getSharedPathEditIntent(baseSvg, currentSvg, nodeId, true);
  if (
    !requested ||
    !currentFromBase ||
    !Object.values(requested.changed).some(Boolean)
  ) return null;

  try {
    const currentDoc = parseSvg(currentSvg);
    const locations = locateNodes(
      currentDoc.nodes,
      (node) => node.id === nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === nodeId,
    );
    if (locations.length !== 1) return null;
    const location = locations[0];
    const container = resolveParentContainer(currentDoc.nodes, location.parentPath);
    if (!container || container[location.nodeIndex] !== location.node) return null;
    container[location.nodeIndex] = copyPathEditFields(location.node, requested.afterNode, requested.changed);
    return serializeSvg(currentDoc);
  } catch {
    return null;
  }
}

function nodeWithoutSharedPathEditFields(node: Node): Node {
  const normalized = cloneNode(node);
  const props = { ...(normalized.props || {}) };
  delete props.d;
  delete props.strokeWidth;
  normalized.props = Object.keys(props).length > 0 ? props : undefined;
  const style = { ...(normalized.style || {}) };
  delete style.stroke;
  delete style.fill;
  normalized.style = Object.keys(style).length > 0 ? style : undefined;
  return normalized;
}

function isValidSharedWhiteboardUpdateCommand(command: SharedWhiteboardUpdateCommand): boolean {
  const { beforeNode, afterNode, beforeSketch, afterSketch } = command;
  if (
    !command.nodeId ||
    !command.sketchId.startsWith(SHARED_WHITEBOARD_SKETCH_PREFIX) ||
    beforeNode.type !== 'path' ||
    afterNode.type !== 'path' ||
    beforeNode.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
    afterNode.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
    getSharedSketchIdForNode(beforeNode) !== command.sketchId ||
    getSharedSketchIdForNode(afterNode) !== command.sketchId ||
    beforeSketch.id !== command.sketchId ||
    afterSketch.id !== command.sketchId ||
    typeof beforeNode.props?.d !== 'string' ||
    typeof afterNode.props?.d !== 'string' ||
    beforeSketch.path !== beforeNode.props.d ||
    afterSketch.path !== afterNode.props.d ||
    !sameSerializableValue(nodeWithoutSharedPathEditFields(beforeNode), nodeWithoutSharedPathEditFields(afterNode))
  ) return false;

  const changedD = beforeNode.props?.d !== afterNode.props?.d;
  const changedStroke = !sameSerializableValue(beforeNode.style?.stroke, afterNode.style?.stroke);
  const changedFill = !sameSerializableValue(beforeNode.style?.fill, afterNode.style?.fill);
  const changedWidth = !sameSerializableValue(beforeNode.props?.strokeWidth, afterNode.props?.strokeWidth);
  if (!changedD && !changedStroke && !changedFill && !changedWidth) return false;
  if (
    (changedStroke && afterNode.style?.stroke !== undefined && typeof afterNode.style.stroke !== 'string') ||
    (changedFill && afterNode.style?.fill !== undefined && typeof afterNode.style.fill !== 'string') ||
    (changedWidth && (!Number.isFinite(pathStrokeWidth(afterNode)) || pathStrokeWidth(afterNode) < 0))
  ) return false;

  const expectedSketch = cloneSketch(beforeSketch);
  if (changedD) expectedSketch.path = afterNode.props.d;
  if (changedStroke) expectedSketch.color = typeof afterNode.style?.stroke === 'string' ? afterNode.style.stroke : 'none';
  if (changedFill) expectedSketch.fillColor = typeof afterNode.style?.fill === 'string' ? afterNode.style.fill : 'none';
  if (changedWidth) expectedSketch.strokeWidth = pathStrokeWidth(afterNode);
  return sameSerializableValue(expectedSketch, afterSketch);
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
    idSource: getSvgNodeIdSource(node) ?? null,
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
    !isSharedWhiteboardSketchId(sketch.id) ||
    !sketch.path?.trim()
  ) return null;
  if (project.whiteboardSketches?.some((item) => item.id === sketch.id)) return null;

  try {
    const doc = parseSvg(project.svgSource);
    const nodeId = whiteboardNodeIdForSketch(sketch.id);
    if (pathNodeExists(project.svgSource, nodeId) || sharedLinkMarkers(doc.nodes, sketch.id).length > 0 ||
      sharedReservedIdentityNodes(doc.nodes, sketch.id).length > 0) return null;

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
  if (!project.svgSource?.trim() || !nodeId || !isSharedWhiteboardSketchId(sketch.id) ||
    !sketch.path?.trim() || (sketch.type !== undefined && sketch.type !== 'path')) return null;
  if (project.whiteboardSketches?.some((item) => item.id === sketch.id)) return null;

  try {
    const doc = parseSvg(project.svgSource);
    if (sharedLinkMarkers(doc.nodes, sketch.id).length > 0) return null;
    const matches: Node[] = [];
    walkNodes(doc.nodes, (node) => {
      if (node.id === nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === nodeId) matches.push(node);
    });
    if (matches.length !== 1 || matches[0].type !== 'path') return null;
    const target = matches[0];
    const reservedOwners = sharedReservedIdentityNodes(doc.nodes, sketch.id);
    if (reservedOwners.some((owner) => owner !== target) || reservedOwners.length > 1) return null;
    if (target.props?.d !== sketch.path || target.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE] !== undefined ||
      hasUnsupportedSharedLinkContext(doc, target)) return null;
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
  try {
    if (project.id !== command.projectId || !project.svgSource) return null;
    const doc = parseSvg(project.svgSource);
    if (!isSharedWhiteboardSketchId(command.sketch.id) || sharedLinkMarkers(doc.nodes, command.sketch.id).length > 0) return null;
    const matches: Node[] = [];
    walkNodes(doc.nodes, (node) => {
      if (node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId) matches.push(node);
    });
    if (matches.length !== 1 || matches[0].type !== 'path') return null;
    const target = matches[0];
    const reservedOwners = sharedReservedIdentityNodes(doc.nodes, command.sketch.id);
    if (reservedOwners.some((owner) => owner !== target) || reservedOwners.length > 1) return null;
    if (target.props?.d !== command.sketch.path || target.attrs?.[SHARED_WHITEBOARD_SKETCH_ATTRIBUTE] !== undefined ||
      (command.sketch.type !== undefined && command.sketch.type !== 'path') || hasUnsupportedSharedLinkContext(doc, target)) return null;
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
  try {
    if (project.id !== command.projectId || !project.svgSource || !isSharedWhiteboardSketchId(command.sketch.id)) return null;
    const expectedNodeId = whiteboardNodeIdForSketch(command.sketch.id);
    if (command.nodeId !== expectedNodeId || command.node.id !== expectedNodeId ||
      command.node.attrs?.[NODE_ID_ATTRIBUTE] !== expectedNodeId || command.node.type !== 'path') return null;
    const doc = parseSvg(project.svgSource);
    if (pathNodeExists(project.svgSource, command.nodeId) || sharedLinkMarkers(doc.nodes, command.sketch.id).length > 0 ||
      sharedReservedIdentityNodes(doc.nodes, command.sketch.id).length > 0) return null;

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
  try {
    if (project.id !== command.projectId || !project.svgSource) return null;
    const doc = parseSvg(project.svgSource);
    if (sharedLinkMarkers(doc.nodes, command.sketch.id).length > 0) return null;
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
  try {
    if (project.id !== command.projectId || !project.svgSource) return null;
    const doc = parseSvg(project.svgSource);
    const matches: Node[] = [];
    walkNodes(doc.nodes, (node) => {
      if (node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId) matches.push(node);
    });
    if (matches.length !== 1) return null;
    const target = matches[0];
    const markedNodes = sharedLinkMarkers(doc.nodes, command.sketch.id);
    const reservedOwners = sharedReservedIdentityNodes(doc.nodes, command.sketch.id);
    if (
      !isSharedWhiteboardSketchId(command.sketch.id) || markedNodes.length !== 1 || markedNodes[0] !== target ||
      reservedOwners.some((owner) => owner !== target) || reservedOwners.length > 1 ||
      target.type !== 'path' ||
      target.props?.d !== command.sketch.path ||
      (command.sketch.type !== undefined && command.sketch.type !== 'path') ||
      hasUnsupportedSharedLinkContext(doc, target) ||
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
  try {
    if (project.id !== command.projectId || !project.svgSource) return null;
    const doc = parseSvg(project.svgSource);
    const locations = locateNodes(
      doc.nodes,
      (node) => node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId,
    );
    if (locations.length !== 1) return null;
    const location = locations[0];
    const container = resolveParentContainer(doc.nodes, location.parentPath);
    if (
      !container ||
      container[location.nodeIndex] !== location.node ||
      !sameParentPathIdentity(location.parentPath, command.parentPath) ||
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
  try {
    if (project.id !== command.projectId || !project.svgSource) return null;
    if (
      command.node.type !== 'path' ||
      command.node.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
      getSharedSketchIdForNode(command.node) !== command.sketch.id ||
      command.node.props?.d !== command.sketch.path
    ) return null;

    const doc = parseSvg(project.svgSource);
    const existingNodes = locateNodes(
      doc.nodes,
      (node) => node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId,
    );
    if (existingNodes.length > 0) return null;
    const container = resolveParentContainerByIdentity(doc.nodes, command.parentPath);
    if (!container) return null;

    const sketches = project.whiteboardSketches || [];
    if (sketches.some((sketch) => sketch.id === command.sketch.id)) return null;

    const nodeIndex = Math.max(0, Math.min(command.nodeIndex, container.length));
    container.splice(nodeIndex, 0, cloneNode(command.node));
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

/** Create a shared update only when the candidate SVG changes one shared path's editable fields. */
export function createSharedWhiteboardUpdateCommand(
  project: Project,
  nodeId: string,
  candidateSvg: string,
  commandId: string = globalThis.crypto?.randomUUID?.() ?? `cmd-${Date.now()}-${Math.random().toString(36).slice(2)}`,
): SharedWhiteboardUpdateCommand | null {
  if (!project.svgSource?.trim() || !candidateSvg.trim() || !nodeId) return null;
  try {
    const intent = getSharedPathEditIntent(project.svgSource, candidateSvg, nodeId);
    if (!intent || !Object.values(intent.changed).some(Boolean)) return null;
    const { beforeNode, afterNode } = intent;
    const sketchId = getSharedSketchIdForNode(beforeNode);
    if (!sketchId) return null;
    const sketches = project.whiteboardSketches || [];
    const matchingSketches = sketches
      .map((sketch, index) => ({ sketch, index }))
      .filter(({ sketch }) => sketch.id === sketchId);
    if (matchingSketches.length !== 1 || beforeNode.props?.d !== matchingSketches[0].sketch.path) return null;

    const beforeSketch = cloneSketch(matchingSketches[0].sketch);
    const afterSketch = cloneSketch(beforeSketch);
    if (intent.changed.d) afterSketch.path = afterNode.props?.d;
    if (intent.changed.stroke) afterSketch.color = typeof afterNode.style?.stroke === 'string' ? afterNode.style.stroke : 'none';
    if (intent.changed.fill) afterSketch.fillColor = typeof afterNode.style?.fill === 'string' ? afterNode.style.fill : 'none';
    if (intent.changed.width) afterSketch.strokeWidth = pathStrokeWidth(afterNode);

    const command: SharedWhiteboardUpdateCommand = {
      kind: 'update-path',
      commandId,
      projectId: project.id,
      nodeId,
      sketchId,
      beforeNode: cloneNode(beforeNode),
      afterNode,
      beforeSketch,
      afterSketch,
      parentPath: intent.parentPath,
      nodeIndex: intent.nodeIndex,
      sketchIndex: matchingSketches[0].index,
    };
    return isValidSharedWhiteboardUpdateCommand(command) ? command : null;
  } catch {
    return null;
  }
}

function applySharedWhiteboardUpdateSnapshot(
  project: Project,
  command: SharedWhiteboardUpdateCommand,
  forward: boolean,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  try {
    if (
      project.id !== command.projectId ||
      !project.svgSource ||
      !isValidSharedWhiteboardUpdateCommand(command)
    ) return null;
    const fromNode = forward ? command.beforeNode : command.afterNode;
    const toNode = forward ? command.afterNode : command.beforeNode;
    const fromSketch = forward ? command.beforeSketch : command.afterSketch;
    const toSketch = forward ? command.afterSketch : command.beforeSketch;
    if (
      fromNode.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
      toNode.attrs?.[NODE_ID_ATTRIBUTE] !== command.nodeId ||
      getSharedSketchIdForNode(fromNode) !== command.sketchId ||
      getSharedSketchIdForNode(toNode) !== command.sketchId ||
      fromNode.props?.d !== fromSketch.path ||
      toNode.props?.d !== toSketch.path
    ) return null;

    const doc = parseSvg(project.svgSource);
    const locations = locateNodes(
      doc.nodes,
      (node) => node.id === command.nodeId || node.attrs?.[NODE_ID_ATTRIBUTE] === command.nodeId,
    );
    if (locations.length !== 1) return null;
    const location = locations[0];
    const container = resolveParentContainer(doc.nodes, location.parentPath);
    if (
      !container ||
      location.node.type !== 'path' ||
      container[location.nodeIndex] !== location.node ||
      !sameParentPathIdentity(location.parentPath, command.parentPath) ||
      !sameSerializableValue(location.node, fromNode) ||
      getSharedSketchIdForNode(location.node) !== command.sketchId
    ) return null;

    const sketches = project.whiteboardSketches || [];
    const matchingSketches = sketches
      .map((sketch, index) => ({ sketch, index }))
      .filter(({ sketch }) => sketch.id === command.sketchId);
    if (
      matchingSketches.length !== 1 ||
      !sameSerializableValue(matchingSketches[0].sketch, fromSketch)
    ) return null;

    container[location.nodeIndex] = cloneNode(toNode);
    const nextSketches = sketches.slice();
    nextSketches[matchingSketches[0].index] = cloneSketch(toSketch);
    return { svgSource: serializeSvg(doc), whiteboardSketches: nextSketches };
  } catch {
    return null;
  }
}

/** Apply the shared path geometry/style update. */
export function applySharedWhiteboardUpdateCommand(
  project: Project,
  command: SharedWhiteboardUpdateCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  return applySharedWhiteboardUpdateSnapshot(project, command, true);
}

/** Restore the exact previous node/sketch payload for a shared path update. */
export function undoSharedWhiteboardUpdateCommand(
  project: Project,
  command: SharedWhiteboardUpdateCommand,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  return applySharedWhiteboardUpdateSnapshot(project, command, false);
}

type PendingSharedHistoryEntry = { command: SharedWhiteboardCommand; forward: boolean };
const pendingSharedCommandsByProject = new Map<string, PendingSharedHistoryEntry[]>();

function applySharedHistoryCommand(
  project: Project,
  command: SharedWhiteboardCommand,
  forward: boolean,
): Pick<Project, 'svgSource' | 'whiteboardSketches'> | null {
  if (command.kind === 'link-existing-path') {
    return forward
      ? applySharedWhiteboardLinkCommand(project, command)
      : undoSharedWhiteboardLinkCommand(project, command);
  }
  if (command.kind === 'delete-path') {
    return forward
      ? applySharedWhiteboardDeleteCommand(project, command)
      : undoSharedWhiteboardDeleteCommand(project, command);
  }
  if (command.kind === 'update-path') {
    return forward
      ? applySharedWhiteboardUpdateCommand(project, command)
      : undoSharedWhiteboardUpdateCommand(project, command);
  }
  return forward
    ? applySharedWhiteboardPathCommand(project, command)
    : undoSharedWhiteboardPathCommand(project, command);
}

function mergeCommandIntoProject(
  project: Project,
  entry: PendingSharedHistoryEntry,
): Project {
  const updates = applySharedHistoryCommand(project, entry.command, entry.forward);
  if (!updates) return project;
  const nextProject = { ...project, ...updates, updatedAt: Date.now() };
  if (typeof updates.svgSource === 'string' && updates.svgSource !== project.svgSource) {
    nextProject.logoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(updates.svgSource)}`;
  }
  return nextProject;
}

/** Merge locally applied or in-flight shared path deltas onto a remote full-project snapshot. */
export function mergeLocalSharedHistoryIntoRemoteProject(remoteProject: Project): Project {
  const store = useAppStore.getState();
  const history = store.sharedVectorHistoryByProject[remoteProject.id];
  const localProject = store.projects.find((project) => project.id === remoteProject.id);
  const applied = history ? history.commands.slice(0, Math.max(0, history.index + 1)) : [];
  const recovered = history?.commands.length ? [] : localProject ? reconstructAppliedSharedCommands(localProject) : [];
  const pending = pendingSharedCommandsByProject.get(remoteProject.id) || [];
  let merged = remoteProject;

  for (const command of applied) merged = mergeCommandIntoProject(merged, { command, forward: true });
  for (const command of recovered) merged = mergeCommandIntoProject(merged, { command, forward: true });
  for (const entry of pending) merged = mergeCommandIntoProject(merged, entry);

  if (history) {
    const pendingForwardIds = new Set(pending.filter((entry) => entry.forward).map((entry) => entry.command.commandId));
    for (let index = history.commands.length - 1; index > history.index; index -= 1) {
      const command = history.commands[index];
      if (!command || pendingForwardIds.has(command.commandId)) continue;
      merged = mergeCommandIntoProject(merged, { command, forward: false });
    }
  }
  return merged;
}

async function commitSharedCommandWithPending(
  commit: SharedHistoryCommit,
  projectId: string,
  command: SharedWhiteboardCommand,
  forward: boolean,
  updates: Partial<Project>,
  afterCommit: () => void,
  throttleCloud = true,
): Promise<boolean> {
  const pending = pendingSharedCommandsByProject.get(projectId) || [];
  const entry = { command, forward };
  pending.push(entry);
  pendingSharedCommandsByProject.set(projectId, pending);
  try {
    await commit(updates, throttleCloud, { recordLogoHistory: false });
    const latestProject = useAppStore.getState().projects.find((project) => project.id === projectId);
    if (!latestProject || !applySharedHistoryCommand(latestProject, command, !forward)) return false;
    afterCommit();
    return true;
  } catch (error) {
    const latestProject = useAppStore.getState().projects.find((project) => project.id === projectId);
    const rollback = latestProject ? applySharedHistoryCommand(latestProject, command, !forward) : null;
    if (latestProject && rollback) {
      const rollbackUpdates = {
        ...rollback,
        ...(typeof rollback.svgSource === 'string'
          ? { logoUrl: `data:image/svg+xml;utf8,${encodeURIComponent(rollback.svgSource)}` }
          : {}),
      };
      try {
        await useAppStore.getState().updateProject(projectId, rollbackUpdates, 'skip');
      } catch {
        // updateProject updates Zustand before persisting; keep memory consistent if storage also rejects.
        const current = useAppStore.getState().projects.find((project) => project.id === projectId);
        if (current) {
          useAppStore.setState((state) => ({
            projects: state.projects.map((project) => project.id === projectId
              ? { ...project, ...rollbackUpdates, updatedAt: Date.now() }
              : project),
          }));
        }
      }
    }
    throw error;
  } finally {
    const remaining = (pendingSharedCommandsByProject.get(projectId) || [])
      .filter((candidate) => candidate !== entry);
    if (remaining.length > 0) pendingSharedCommandsByProject.set(projectId, remaining);
    else pendingSharedCommandsByProject.delete(projectId);
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

  const queueActiveProjectMutation = (operation: (project: Project) => Promise<boolean>): Promise<boolean> => {
    const requestedProjectId = useAppStore.getState().activeProjectId;
    if (!requestedProjectId) return Promise.resolve(false);
    return enqueueSharedMutation(requestedProjectId, async () => {
      const project = getActiveProject();
      if (!project || project.id !== requestedProjectId) return false;
      return operation(project);
    });
  };

  const addWhiteboardPath = (sketch: WhiteboardSketch): Promise<boolean> => queueActiveProjectMutation(async (project) => {
    restoreAppliedHistory(project);
    const command = createSharedWhiteboardPathCommand(project, sketch);
    if (!command) return false;
    const updates = applySharedWhiteboardPathCommand(project, command);
    if (!updates) return false;

    return commitSharedCommandWithPending(commit, project.id, command, true, updates, () => {
      useAppStore.getState().recordSharedVectorCommand(project.id, command);
    });
  });

  const addExistingPathToWhiteboard = (nodeId: string, sketch: WhiteboardSketch): Promise<boolean> => queueActiveProjectMutation(async (project) => {
    restoreAppliedHistory(project);
    const command = createSharedWhiteboardLinkCommand(project, nodeId, sketch);
    if (!command) return false;
    const updates = applySharedWhiteboardLinkCommand(project, command);
    if (!updates) return false;

    return commitSharedCommandWithPending(commit, project.id, command, true, updates, () => {
      useAppStore.getState().recordSharedVectorCommand(project.id, command);
    });
  });

  const deleteSharedWhiteboardPath = (nodeId: string): Promise<boolean> => queueActiveProjectMutation(async (project) => {
    restoreAppliedHistory(project);
    const command = createSharedWhiteboardDeleteCommand(project, nodeId);
    if (!command) return false;
    const updates = applySharedWhiteboardDeleteCommand(project, command);
    if (!updates) return false;

    return commitSharedCommandWithPending(commit, project.id, command, true, updates, () => {
      useAppStore.getState().recordSharedVectorCommand(project.id, command);
    });
  });

  const updateSharedWhiteboardPath = (
    nodeId: string,
    candidateSvg: string,
    baseSvg?: string,
    throttleCloud?: boolean,
  ): Promise<boolean> => queueActiveProjectMutation(async (project) => {
    if (!project.svgSource) return false;
    restoreAppliedHistory(project);
    const rebasedSvg = rebaseSharedPathUpdateCandidate(
      baseSvg ?? project.svgSource,
      project.svgSource,
      candidateSvg,
      nodeId,
    );
    if (!rebasedSvg) return false;
    const command = createSharedWhiteboardUpdateCommand(project, nodeId, rebasedSvg);
    if (!command) return false;
    const updates = applySharedWhiteboardUpdateCommand(project, command);
    if (!updates) return false;

    return commitSharedCommandWithPending(commit, project.id, command, true, updates, () => {
      useAppStore.getState().recordSharedVectorCommand(project.id, command);
    }, throttleCloud ?? true);
  });

  const undo = (): Promise<boolean> => queueActiveProjectMutation(async (project) => {
    restoreAppliedHistory(project);
    const state = useAppStore.getState();
    const command = state.getSharedVectorUndoCommand(project.id);
    if (!command) return false;
    const updates = command.kind === 'link-existing-path'
      ? undoSharedWhiteboardLinkCommand(project, command)
      : command.kind === 'delete-path'
        ? undoSharedWhiteboardDeleteCommand(project, command)
        : command.kind === 'update-path'
          ? undoSharedWhiteboardUpdateCommand(project, command)
          : undoSharedWhiteboardPathCommand(project, command);
    if (!updates) {
      // Consume only this stale shared step; never fall through to legacy snapshot undo.
      useAppStore.getState().commitSharedVectorUndo(project.id, command.commandId);
      return true;
    }

    const committed = await commitSharedCommandWithPending(commit, project.id, command, false, updates, () => {
      useAppStore.getState().commitSharedVectorUndo(project.id, command.commandId);
    });
    if (!committed) useAppStore.getState().commitSharedVectorUndo(project.id, command.commandId);
    return true;
  });

  const redo = (): Promise<boolean> => queueActiveProjectMutation(async (project) => {
    const state = useAppStore.getState();
    const command = state.getSharedVectorRedoCommand(project.id);
    if (!command) return false;
    const updates = command.kind === 'link-existing-path'
      ? applySharedWhiteboardLinkCommand(project, command)
      : command.kind === 'delete-path'
        ? applySharedWhiteboardDeleteCommand(project, command)
        : command.kind === 'update-path'
          ? applySharedWhiteboardUpdateCommand(project, command)
          : applySharedWhiteboardPathCommand(project, command);
    if (!updates) {
      // A conflicting or missing target is a safe no-op, not permission to redo elsewhere.
      useAppStore.getState().commitSharedVectorRedo(project.id, command.commandId);
      return true;
    }

    const committed = await commitSharedCommandWithPending(commit, project.id, command, true, updates, () => {
      useAppStore.getState().commitSharedVectorRedo(project.id, command.commandId);
    });
    if (!committed) useAppStore.getState().commitSharedVectorRedo(project.id, command.commandId);
    return true;
  });

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
    updateSharedWhiteboardPath,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
