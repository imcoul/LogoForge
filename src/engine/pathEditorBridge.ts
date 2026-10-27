/**
 * Adapter between the SVG path editor and the shared SVG document engine.
 *
 * Path mutations are addressed by stable editor node IDs rather than document-order indexes.
 * Paths that lack an authored SVG `id` receive a durable `data-logoforge-node-id` marker on
 * their first edit. The marker is preserved as an unknown SVG attribute by `svgIo`, leaving
 * authored SVG IDs and every other unmodelled attribute untouched.
 */
import { parseSvg, serializeSvg, walkNodes } from './svgIo';
import { parsePathData, serializePathData } from './pathData';
import type { Node } from '../types';

const EDITOR_NODE_ID_ATTRIBUTE = 'data-logoforge-node-id';

/**
 * The editor's per-command record. `values` is empty for zero-argument commands such as `Z`,
 * which the UI already renders as "No coordinates" rather than as draggable handles.
 */
export interface EditorPathNode {
  id: number;
  type: string;
  values: number[];
}

/**
 * Converts a `d` string into the editor's command records.
 *
 * Unlike the old regex tokenizer, `Z` survives (as an entry with no values) and exponent
 * notation stays a single number.
 */
export function toEditorNodes(d: string): EditorPathNode[] {
  return parsePathData(d).map((cmd, id) => ({ id, type: cmd.command, values: cmd.args }));
}

/** Converts the editor's command records back into a `d` string. */
export function fromEditorNodes(nodes: EditorPathNode[]): string {
  return serializePathData(nodes.map((n) => ({ command: n.type, args: n.values })));
}

export interface EditablePath {
  /** Display/hit-test position only; never use this value to mutate a document node. */
  index: number;
  /** Stable editor identity, persisted in data-logoforge-node-id on first mutation. */
  nodeId: string;
  d: string;
  stroke: string;
  fill: string;
  strokeWidth: number;
}

/** Collects every path node in the document, depth-first, in document order. */
function collectPathNodes(nodes: Node[]): Node[] {
  const paths: Node[] = [];
  walkNodes(nodes, (node) => {
    if (node.type === 'path') paths.push(node);
  });
  return paths;
}

function getPathNodeBaseId(node: Node): string {
  const storedId = node.attrs?.[EDITOR_NODE_ID_ATTRIBUTE];
  return typeof storedId === 'string' && storedId.length > 0 ? storedId : node.id;
}

/**
 * Returns unique list keys for a path list. Existing metadata wins; otherwise the document
 * model's ID is used. Invalid SVGs can contain duplicate IDs, so the list gets temporary
 * position-qualified keys; mutators reject ambiguous bases rather than editing by position.
 */
function getPathNodeIds(paths: Node[]): string[] {
  const baseIds = paths.map(getPathNodeBaseId);
  const counts = new Map<string, number>();
  for (const id of baseIds) counts.set(id, (counts.get(id) ?? 0) + 1);

  const used = new Set<string>();
  return baseIds.map((baseId, index) => {
    let candidate = counts.get(baseId) === 1 ? baseId : `${baseId}::path-${index}`;
    let suffix = 1;
    while (used.has(candidate)) {
      candidate = `${baseId}::path-${index}-${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    return candidate;
  });
}

/** Persist identities for unambiguous paths before a mutation is serialized. */
function persistPathNodeIds(paths: Node[]): void {
  const baseIds = paths.map(getPathNodeBaseId);
  const counts = new Map<string, number>();
  for (const id of baseIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const ids = getPathNodeIds(paths);
  paths.forEach((node, index) => {
    // Do not create an identity for a duplicate or ambiguous source ID.
    if (counts.get(baseIds[index]) !== 1) return;
    const current = node.attrs?.[EDITOR_NODE_ID_ATTRIBUTE];
    if (current === ids[index]) return;
    node.attrs = { ...(node.attrs || {}), [EDITOR_NODE_ID_ATTRIBUTE]: ids[index] };
  });
}

function readStroke(node: Node): string {
  const stroke = node.style?.stroke;
  return typeof stroke === 'string' ? stroke : 'none';
}

function readFill(node: Node): string {
  const fill = node.style?.fill;
  return typeof fill === 'string' ? fill : 'none';
}

function readStrokeWidth(node: Node): number {
  const raw = node.props?.strokeWidth;
  const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw));
  return Number.isFinite(parsed) ? parsed : 2;
}

/** Lists editable paths, retaining ordinal position solely for display and hit-testing. */
export function listEditablePaths(svgSource: string | null | undefined): EditablePath[] {
  if (!svgSource) return [];

  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return [];
  }

  const paths = collectPathNodes(doc.nodes);
  const nodeIds = getPathNodeIds(paths);
  return paths.map((node, index) => ({
    index,
    nodeId: nodeIds[index],
    d: String(node.props?.d ?? ''),
    stroke: readStroke(node),
    fill: readFill(node),
    strokeWidth: readStrokeWidth(node),
  }));
}

/**
 * Finds one path by its stable editor ID. A missing ID is a no-op; callers never fall through
 * to an ordinal target.
 */
function mutatePathById(
  svgSource: string,
  targetNodeId: string,
  mutate: (target: Node, doc: ReturnType<typeof parseSvg>) => void,
): string {
  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return svgSource;
  }

  const paths = collectPathNodes(doc.nodes);
  const nodeIds = getPathNodeIds(paths);
  const targetIndex = nodeIds.indexOf(targetNodeId);
  if (targetIndex < 0) return svgSource;

  const targetBaseId = getPathNodeBaseId(paths[targetIndex]);
  if (paths.filter((node) => getPathNodeBaseId(node) === targetBaseId).length !== 1) {
    return svgSource;
  }

  const target = paths[targetIndex];
  persistPathNodeIds(paths);
  mutate(target, doc);
  return serializeSvg(doc);
}

/** Replaces the `d` attribute of the path identified by its stable editor node ID. */
export function replacePathDataById(
  svgSource: string,
  targetNodeId: string,
  newPathData: string,
): string {
  return mutatePathById(svgSource, targetNodeId, (target) => {
    target.props = { ...(target.props || {}), d: newPathData };
  });
}

/** Updates presentation attributes on the path identified by its stable editor node ID. */
export function updatePathStyleById(
  svgSource: string,
  targetNodeId: string,
  style: { stroke?: string; fill?: string; strokeWidth?: number },
): string {
  return mutatePathById(svgSource, targetNodeId, (target) => {
    if (style.stroke !== undefined) {
      target.style = { ...(target.style || {}), stroke: style.stroke };
    }
    if (style.fill !== undefined) {
      target.style = { ...(target.style || {}), fill: style.fill };
    }
    if (style.strokeWidth !== undefined) {
      target.props = { ...(target.props || {}), strokeWidth: style.strokeWidth };
    }
  });
}

/** Removes the path identified by its stable editor node ID, including nested paths. */
export function deletePathById(svgSource: string, targetNodeId: string): string {
  return mutatePathById(svgSource, targetNodeId, (_target, doc) => {
    const target = collectPathNodes(doc.nodes).find(
      (node) => node.attrs?.[EDITOR_NODE_ID_ATTRIBUTE] === targetNodeId,
    );
    if (!target) return;

    const prune = (nodes: Node[]): Node[] => {
      const remaining = nodes.filter((node) => node !== target);
      for (const node of remaining) {
        if (node.children) node.children = prune(node.children);
      }
      return remaining;
    };

    doc.nodes = prune(doc.nodes);
  });
}

/** Removes every path from the document, leaving other elements intact. */
export function removeAllPaths(svgSource: string): string {
  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return svgSource;
  }

  const strip = (nodes: Node[]): Node[] => {
    const remaining = nodes.filter((node) => node.type !== 'path');
    for (const node of remaining) {
      if (node.children) node.children = strip(node.children);
    }
    return remaining;
  };

  doc.nodes = strip(doc.nodes);
  return serializeSvg(doc);
}

/** Reads the viewBox width, used by the editor as its grid size. Null when absent. */
export function readViewBoxWidth(svgSource: string | null | undefined): number | null {
  if (!svgSource) return null;

  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return null;
  }

  const viewBox = doc.rootAttrs['viewBox'];
  if (!viewBox) return null;

  // Both whitespace and comma separators are legal in a viewBox.
  const parts = viewBox.trim().split(/[\s,]+/);
  if (parts.length !== 4) return null;

  const width = parseFloat(parts[2]);
  return Number.isFinite(width) && width > 0 ? width : null;
}
