/**
 * Adapter between `SVGPathEditor`'s index-based UI and the real document engine.
 *
 * The editor addresses paths by their ordinal position ("the 3rd path in the document") and
 * edits them by replacing the `d` string. That interface is fine; what was wrong was the
 * regex implementation underneath it. This module keeps the interface and swaps the
 * implementation for `svgIo`, which means the editor immediately stops:
 *
 *   - reading `id="..."` as if it were path data,
 *   - destroying `id` / `class` / `transform` / `opacity` on every edit,
 *   - truncating tags at a `>` inside an attribute value,
 *   - and ignoring paths nested inside `<g>` elements.
 *
 * Replacing this shim entirely — so the editor addresses nodes by id against the shared
 * scene graph — is the remaining Phase 1 work.
 */
import { parseSvg, serializeSvg, walkNodes } from './svgIo';
import { parsePathData, serializePathData } from './pathData';
import type { Node } from '../types';

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
 * Unlike the regex tokenizer this replaces, `Z` survives (as an entry with no values) and
 * exponent notation stays a single number.
 */
export function toEditorNodes(d: string): EditorPathNode[] {
  return parsePathData(d).map((cmd, id) => ({ id, type: cmd.command, values: cmd.args }));
}

/** Converts the editor's command records back into a `d` string. */
export function fromEditorNodes(nodes: EditorPathNode[]): string {
  return serializePathData(nodes.map((n) => ({ command: n.type, args: n.values })));
}

export interface EditablePath {
  /** Ordinal position among path nodes, in document order (including nested ones). */
  index: number;
  /** Stable node id, for addressing this path once the editor moves off ordinals. */
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

/**
 * Lists the editable paths in a document.
 *
 * Returns an empty list for markup that cannot be parsed, rather than throwing — the editor
 * renders a "no paths" state, which is the correct outcome for an unopenable document.
 * Callers that need to distinguish "no paths" from "broken file" should use `parseSvg`.
 */
export function listEditablePaths(svgSource: string | null | undefined): EditablePath[] {
  if (!svgSource) return [];

  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return [];
  }

  return collectPathNodes(doc.nodes).map((node, index) => ({
    index,
    nodeId: node.id,
    d: String(node.props?.d ?? ''),
    stroke: readStroke(node),
    fill: readFill(node),
    strokeWidth: readStrokeWidth(node),
  }));
}

/**
 * Replaces the `d` of the path at `targetIndex` and returns the updated document.
 *
 * Unlike the regex implementation this replaces, every other attribute on the edited element
 * — and every other element in the document — is preserved untouched.
 */
export function replacePathData(
  svgSource: string,
  targetIndex: number,
  newPathData: string,
): string {
  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return svgSource;
  }

  const paths = collectPathNodes(doc.nodes);
  const target = paths[targetIndex];
  if (!target) return svgSource;

  target.props = { ...(target.props || {}), d: newPathData };
  return serializeSvg(doc);
}

/** Updates presentation attributes on the path at `targetIndex`. */
export function updatePathStyle(
  svgSource: string,
  targetIndex: number,
  style: { stroke?: string; fill?: string; strokeWidth?: number },
): string {
  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return svgSource;
  }

  const target = collectPathNodes(doc.nodes)[targetIndex];
  if (!target) return svgSource;

  if (style.stroke !== undefined) {
    target.style = { ...(target.style || {}), stroke: style.stroke };
  }
  if (style.fill !== undefined) {
    target.style = { ...(target.style || {}), fill: style.fill };
  }
  if (style.strokeWidth !== undefined) {
    target.props = { ...(target.props || {}), strokeWidth: style.strokeWidth };
  }

  return serializeSvg(doc);
}

/** Removes the path at `targetIndex`, leaving every other element untouched. */
export function deletePathAtIndex(svgSource: string, targetIndex: number): string {
  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return svgSource;
  }

  const target = collectPathNodes(doc.nodes)[targetIndex];
  if (!target) return svgSource;

  const prune = (nodes: Node[]): Node[] =>
    nodes
      .filter((n) => n !== target)
      .map((n) => (n.children ? { ...n, children: prune(n.children) } : n));

  doc.nodes = prune(doc.nodes);
  return serializeSvg(doc);
}

/** Removes every path from the document, leaving other elements intact. */
export function removeAllPaths(svgSource: string): string {
  let doc;
  try {
    doc = parseSvg(svgSource);
  } catch {
    return svgSource;
  }

  const strip = (nodes: Node[]): Node[] =>
    nodes
      .filter((n) => n.type !== 'path')
      .map((n) => (n.children ? { ...n, children: strip(n.children) } : n));

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
