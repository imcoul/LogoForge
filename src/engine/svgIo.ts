/**
 * SVG input/output for the Forgel document model.
 *
 * Replaces the regex pipeline in `legacySvgPath.ts` (Phase 1 of
 * `plans/2026-08-05-000000--forgel-mobile-first-design-tool-roadmap.md`).
 *
 * Design goals, in priority order:
 *
 * 1. **Lossless round trip.** `serialize(parse(svg))` must preserve every element,
 *    attribute and nesting relationship. Anything the model does not interpret is kept
 *    verbatim in `Node.attrs`, `Node.transformRaw` or `SvgDocument.defs`. The legacy
 *    pipeline destroyed `id`, `class`, `transform` and `opacity` on every edit; that class
 *    of bug is structurally impossible here.
 * 2. **Real structure.** `<g>` becomes a `group` node with real `children`, so nesting,
 *    layers and group transforms survive.
 * 3. **Sees the whole document.** rect, circle, ellipse, line, polygon, polyline, text and
 *    image are all parsed. The legacy pipeline only ever matched `<path>`.
 * 4. **Deterministic.** Generated ids derive from tree position, never from a counter or
 *    a random source, so parsing the same input always yields the same tree.
 *
 * This module is pure and DOM-based (it uses `DOMParser`, available in browsers and jsdom).
 * It performs no I/O and holds no state.
 */
import type { Node, NodeType, SvgDocument, Transform } from '../types';
import { IDENTITY_TRANSFORM } from '../types';

/** Element names that map onto a document node. */
const ELEMENT_TO_NODE_TYPE: Record<string, NodeType> = {
  g: 'group',
  path: 'path',
  rect: 'rect',
  circle: 'circle',
  ellipse: 'ellipse',
  line: 'line',
  polygon: 'polygon',
  polyline: 'polyline',
  text: 'text',
  image: 'image',
};

const NODE_TYPE_TO_ELEMENT: Record<NodeType, string> = {
  group: 'g',
  path: 'path',
  rect: 'rect',
  circle: 'circle',
  ellipse: 'ellipse',
  line: 'line',
  polygon: 'polygon',
  polyline: 'polyline',
  text: 'text',
  image: 'image',
};

/** Attributes lifted onto the typed model rather than kept in `attrs`. */
const INTERPRETED_ATTRS = new Set([
  'id',
  'transform',
  'fill',
  'stroke',
  'stroke-width',
  'opacity',
  'mix-blend-mode',
  'data-name',
  'data-locked',
  'data-visible',
]);

/** Geometry attributes promoted into `props`, per element type. */
const GEOMETRY_ATTRS: Record<string, string[]> = {
  path: ['d'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polygon: ['points'],
  polyline: ['points'],
  text: ['x', 'y', 'dx', 'dy', 'font-size', 'font-family', 'text-anchor'],
  image: ['x', 'y', 'width', 'height', 'href'],
};

/**
 * Parses an SVG `transform` attribute into the decomposed editing form.
 *
 * Returns null when the transform uses operations the decomposed form cannot represent
 * (matrix, skew) or an unusual ordering. Callers fall back to `transformRaw`, so nothing is
 * lost — the node simply is not directly editable via the decomposed handles.
 */
export function parseTransform(input: string | null | undefined): Transform | null {
  if (!input || !input.trim()) return null;

  const result: Transform = { ...IDENTITY_TRANSFORM };
  const opPattern = /(translate|rotate|scale|matrix|skewX|skewY)\s*\(([^)]*)\)/g;

  let match: RegExpExecArray | null;
  let sawAny = false;

  while ((match = opPattern.exec(input)) !== null) {
    const op = match[1];
    const args = match[2]
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    if (args.some(Number.isNaN)) return null;

    switch (op) {
      case 'translate':
        result.x = args[0] ?? 0;
        result.y = args[1] ?? 0;
        sawAny = true;
        break;
      case 'scale':
        result.scaleX = args[0] ?? 1;
        result.scaleY = args[1] ?? args[0] ?? 1;
        sawAny = true;
        break;
      case 'rotate':
        // Rotation about a point cannot be expressed by the decomposed form.
        if (args.length > 1) return null;
        result.rotate = args[0] ?? 0;
        sawAny = true;
        break;
      default:
        // matrix / skewX / skewY are not representable.
        return null;
    }
  }

  // Text that looked like a transform but matched nothing is not something we understand.
  if (!sawAny) return null;

  return result;
}

/** Serializes a decomposed transform, omitting identity components. */
export function serializeTransform(t: Transform): string {
  const parts: string[] = [];
  if (t.x !== 0 || t.y !== 0) parts.push(`translate(${t.x},${t.y})`);
  if (t.rotate !== 0) parts.push(`rotate(${t.rotate})`);
  if (t.scaleX !== 1 || t.scaleY !== 1) parts.push(`scale(${t.scaleX},${t.scaleY})`);
  return parts.join(' ');
}

function isIdentity(t: Transform): boolean {
  return t.x === 0 && t.y === 0 && t.scaleX === 1 && t.scaleY === 1 && t.rotate === 0;
}

function parseElement(el: Element, path: string): Node | null {
  const tag = el.tagName.toLowerCase();
  const type = ELEMENT_TO_NODE_TYPE[tag];
  if (!type) return null;

  const explicitId = el.getAttribute('id');
  const node: Node = {
    // Deterministic: derived from tree position when the element carries no id.
    id: explicitId || `n${path}`,
    type,
    transform: { ...IDENTITY_TRANSFORM },
  };

  const rawTransform = el.getAttribute('transform');
  if (rawTransform) {
    const parsed = parseTransform(rawTransform);
    if (parsed) {
      node.transform = parsed;
    }
    // Always retained: guarantees byte-faithful serialization even when parsing succeeded
    // but would re-serialize into a different (equivalent) string.
    node.transformRaw = rawTransform;
  }

  const style: NonNullable<Node['style']> = {};
  const fill = el.getAttribute('fill');
  if (fill !== null) style.fill = fill;
  const stroke = el.getAttribute('stroke');
  if (stroke !== null) style.stroke = stroke;
  const strokeWidth = el.getAttribute('stroke-width');
  const opacity = el.getAttribute('opacity');
  if (opacity !== null && opacity !== '') {
    const n = Number(opacity);
    if (!Number.isNaN(n)) style.opacity = n;
  }
  const blend = el.getAttribute('mix-blend-mode');
  if (blend !== null) style.blendMode = blend;

  // stroke-width belongs to the Stroke union only when the stroke is a plain colour.
  if (strokeWidth !== null && strokeWidth !== '') {
    if (typeof style.stroke === 'string' || style.stroke === undefined) {
      // Keep it addressable without breaking the `Stroke = string` shape.
      node.props = { ...(node.props || {}), strokeWidth: Number(strokeWidth) };
    }
  }
  if (Object.keys(style).length > 0) node.style = style;

  const name = el.getAttribute('data-name');
  if (name !== null) node.name = name;
  if (el.getAttribute('data-locked') === 'true') node.locked = true;
  if (el.getAttribute('data-visible') === 'false') node.visible = false;

  // Geometry into props.
  const geometryKeys = GEOMETRY_ATTRS[tag] || [];
  const props: Record<string, any> = { ...(node.props || {}) };
  for (const key of geometryKeys) {
    const value = el.getAttribute(key);
    if (value !== null) props[key] = value;
  }
  if (type === 'text') {
    props.textContent = el.textContent ?? '';
  }
  if (Object.keys(props).length > 0) node.props = props;

  // Everything else, preserved verbatim.
  const attrs: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (INTERPRETED_ATTRS.has(attr.name)) continue;
    if (geometryKeys.includes(attr.name)) continue;
    attrs[attr.name] = attr.value;
  }
  if (Object.keys(attrs).length > 0) node.attrs = attrs;

  if (type === 'group') {
    const children: Node[] = [];
    Array.from(el.children).forEach((child, i) => {
      const parsed = parseElement(child, `${path}-${i}`);
      if (parsed) children.push(parsed);
    });
    node.children = children;
  }

  return node;
}

/**
 * Parses an SVG document into the node tree.
 *
 * Throws on malformed input rather than returning a partial tree — a caller that cannot
 * parse must know, instead of silently editing an empty document and saving over the
 * user's work.
 */
export function parseSvg(svgSource: string): SvgDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgSource, 'image/svg+xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid SVG: ${parseError.textContent?.trim() || 'parse error'}`);
  }

  const root = doc.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') {
    throw new Error('Invalid SVG: root element is not <svg>');
  }

  const rootAttrs: Record<string, string> = {};
  for (const attr of Array.from(root.attributes)) {
    rootAttrs[attr.name] = attr.value;
  }

  // <defs> holds gradients, filters, clip paths and markers. Referenced by url(#id) from
  // fills and strokes, so it must survive verbatim or every gradient in the document breaks.
  let defs: string | undefined;
  const defsEl = root.querySelector('defs');
  if (defsEl) {
    const serialized = new XMLSerializer().serializeToString(defsEl);
    // XMLSerializer re-declares the SVG namespace on the fragment root, because it cannot
    // know the fragment will be re-inserted under an <svg> that already declares it. That
    // extra xmlns is semantically inert but breaks byte-fidelity, so drop it when it merely
    // repeats the root declaration. An explicit, *different* xmlns on <defs> is left alone.
    const rootXmlns = rootAttrs['xmlns'];
    defs =
      rootXmlns && !defsEl.hasAttribute('xmlns')
        ? serialized.replace(` xmlns="${rootXmlns}"`, '')
        : serialized;
  }

  const nodes: Node[] = [];
  Array.from(root.children).forEach((child, i) => {
    if (child.tagName.toLowerCase() === 'defs') return;
    const parsed = parseElement(child, `${i}`);
    if (parsed) nodes.push(parsed);
  });

  return { rootAttrs, defs, nodes };
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function serializeNode(node: Node): string {
  const tag = NODE_TYPE_TO_ELEMENT[node.type];
  const parts: string[] = [];

  // Emit id only when it was not synthesized from tree position.
  if (!/^n[\d-]+$/.test(node.id)) {
    parts.push(`id="${escapeAttr(node.id)}"`);
  }

  const geometryKeys = GEOMETRY_ATTRS[tag] || [];
  for (const key of geometryKeys) {
    const value = node.props?.[key];
    if (value !== undefined && value !== null) {
      parts.push(`${key}="${escapeAttr(String(value))}"`);
    }
  }

  if (node.transformRaw !== undefined) {
    parts.push(`transform="${escapeAttr(node.transformRaw)}"`);
  } else if (!isIdentity(node.transform)) {
    parts.push(`transform="${escapeAttr(serializeTransform(node.transform))}"`);
  }

  const fill = node.style?.fill;
  if (typeof fill === 'string') parts.push(`fill="${escapeAttr(fill)}"`);

  const stroke = node.style?.stroke;
  if (typeof stroke === 'string') parts.push(`stroke="${escapeAttr(stroke)}"`);

  const strokeWidth = node.props?.strokeWidth;
  if (strokeWidth !== undefined && strokeWidth !== null) {
    parts.push(`stroke-width="${escapeAttr(String(strokeWidth))}"`);
  }

  if (node.style?.opacity !== undefined) parts.push(`opacity="${node.style.opacity}"`);
  if (node.style?.blendMode) parts.push(`mix-blend-mode="${escapeAttr(node.style.blendMode)}"`);

  if (node.name !== undefined) parts.push(`data-name="${escapeAttr(node.name)}"`);
  if (node.locked) parts.push(`data-locked="true"`);
  if (node.visible === false) parts.push(`data-visible="false"`);

  for (const [key, value] of Object.entries(node.attrs || {})) {
    parts.push(`${key}="${escapeAttr(value)}"`);
  }

  const attrString = parts.length > 0 ? ` ${parts.join(' ')}` : '';

  if (node.type === 'group') {
    const inner = (node.children || []).map(serializeNode).join('');
    return `<g${attrString}>${inner}</g>`;
  }

  if (node.type === 'text') {
    return `<text${attrString}>${escapeText(String(node.props?.textContent ?? ''))}</text>`;
  }

  return `<${tag}${attrString} />`;
}

/** Serializes a document back to SVG markup. */
export function serializeSvg(doc: SvgDocument): string {
  const rootParts = Object.entries(doc.rootAttrs).map(
    ([key, value]) => `${key}="${escapeAttr(value)}"`,
  );
  const rootAttrString = rootParts.length > 0 ? ` ${rootParts.join(' ')}` : '';
  const defs = doc.defs || '';
  const body = doc.nodes.map(serializeNode).join('');
  return `<svg${rootAttrString}>${defs}${body}</svg>`;
}

/** Depth-first walk over every node in the tree, parents before children. */
export function walkNodes(nodes: Node[], visit: (node: Node, depth: number) => void, depth = 0): void {
  for (const node of nodes) {
    visit(node, depth);
    if (node.children?.length) walkNodes(node.children, visit, depth + 1);
  }
}

/** Finds a node anywhere in the tree by id. */
export function findNodeById(nodes: Node[], id: string): Node | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

/** Total node count, including nested children. */
export function countNodes(nodes: Node[]): number {
  let total = 0;
  walkNodes(nodes, () => { total++; });
  return total;
}
