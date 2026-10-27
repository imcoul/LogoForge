import { IDENTITY_TRANSFORM } from '../types';
import type { Node, WhiteboardSketch } from '../types';

export const WHITEBOARD_NODE_ID_PREFIX = 'whiteboard-';
export const WHITEBOARD_NODE_MIGRATION_VERSION = 1 as const;

export type WhiteboardMigrationProvenance = {
  version: typeof WHITEBOARD_NODE_MIGRATION_VERSION;
  sourceSketch: WhiteboardSketch;
};

/**
 * A Node with a temporary, non-SVG sidecar containing the exact legacy record.
 * `serializeSvg` intentionally ignores this sidecar; project migration code can use it to
 * roll back or reconstruct the Whiteboard record without losing legacy-only fields.
 */
export type MigratedWhiteboardNode = Node & {
  legacyWhiteboardSource: WhiteboardMigrationProvenance;
};

export type WhiteboardMigrationFailureReason =
  | 'invalid-record'
  | 'missing-id'
  | 'missing-name'
  | 'unsupported-type'
  | 'invalid-geometry'
  | 'invalid-style';

export type WhiteboardNodeConversion =
  | { ok: true; node: MigratedWhiteboardNode }
  | { ok: false; reason: WhiteboardMigrationFailureReason };

export type WhiteboardNodeMigrationBatch = {
  nodes: MigratedWhiteboardNode[];
  skipped: Array<{ index: number; sketchId: string; nodeId: string }>;
  rejected: Array<{ index: number; sketchId?: string; reason: WhiteboardMigrationFailureReason | 'duplicate-id' }>;
};

type UnknownRecord = Record<string, unknown>;

type NormalizedSketch = {
  original: WhiteboardSketch;
  id: string;
  name: string;
  type: 'path' | 'rectangle' | 'circle' | 'line';
  path?: string;
  props?: UnknownRecord;
  color?: string;
  strokeWidth: number;
  fillColor: string;
  fillOpacity: number;
  strokeDashArray: string;
  locked?: boolean;
  maskId?: string;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(record: UnknownRecord | undefined, key: string): number | null {
  const value = record?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function cloneValue<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;

  const prior = seen.get(value);
  if (prior !== undefined) return prior as T;

  if (Array.isArray(value)) {
    const output: unknown[] = [];
    seen.set(value, output);
    for (const item of value) output.push(cloneValue(item, seen));
    return output as T;
  }

  const output: UnknownRecord = {};
  seen.set(value, output);
  for (const [key, child] of Object.entries(value)) output[key] = cloneValue(child, seen);
  return output as T;
}

function normalizeSketch(input: unknown): { ok: true; sketch: NormalizedSketch } | { ok: false; reason: WhiteboardMigrationFailureReason } {
  if (!isRecord(input)) return { ok: false, reason: 'invalid-record' };
  if (typeof input.id !== 'string' || input.id.trim() === '') return { ok: false, reason: 'missing-id' };
  if (typeof input.name !== 'string') return { ok: false, reason: 'missing-name' };
  if (input.props !== undefined && input.props !== null && !isRecord(input.props)) {
    return { ok: false, reason: 'invalid-geometry' };
  }

  const rawType = input.type;
  const type = rawType === undefined && typeof input.path === 'string'
    ? 'path'
    : rawType;
  if (type !== 'path' && type !== 'rectangle' && type !== 'circle' && type !== 'line') {
    return { ok: false, reason: 'unsupported-type' };
  }

  const props = isRecord(input.props) ? input.props : undefined;
  const path = typeof input.path === 'string' ? input.path : undefined;
  if (input.path !== undefined && typeof input.path !== 'string') {
    return { ok: false, reason: 'invalid-geometry' };
  }

  if (type === 'path' && !path?.trim()) return { ok: false, reason: 'invalid-geometry' };
  if (type === 'rectangle' && ['x', 'y', 'width', 'height'].some((key) => finiteNumber(props, key) === null)) {
    return { ok: false, reason: 'invalid-geometry' };
  }
  if (type === 'circle' && ['cx', 'cy', 'rx', 'ry'].some((key) => finiteNumber(props, key) === null)) {
    return { ok: false, reason: 'invalid-geometry' };
  }
  if (type === 'line') {
    const hasPath = Boolean(path?.trim());
    const hasEndpoints = ['x1', 'y1', 'x2', 'y2'].every((key) => finiteNumber(props, key) !== null);
    if (!hasPath && !hasEndpoints) return { ok: false, reason: 'invalid-geometry' };
  }

  if (input.color !== undefined && typeof input.color !== 'string') return { ok: false, reason: 'invalid-style' };
  if (input.fillColor !== undefined && typeof input.fillColor !== 'string') return { ok: false, reason: 'invalid-style' };
  if (input.strokeDashArray !== undefined && typeof input.strokeDashArray !== 'string') return { ok: false, reason: 'invalid-style' };
  if (input.strokeWidth !== undefined && (typeof input.strokeWidth !== 'number' || !Number.isFinite(input.strokeWidth) || input.strokeWidth < 0)) {
    return { ok: false, reason: 'invalid-style' };
  }
  if (input.fillOpacity !== undefined && (
    typeof input.fillOpacity !== 'number'
    || !Number.isFinite(input.fillOpacity)
    || input.fillOpacity < 0
    || input.fillOpacity > 1
  )) {
    return { ok: false, reason: 'invalid-style' };
  }
  if (input.locked !== undefined && typeof input.locked !== 'boolean') return { ok: false, reason: 'invalid-style' };
  if (input.maskId !== undefined && typeof input.maskId !== 'string') return { ok: false, reason: 'invalid-style' };
  if (input.maskType !== undefined && input.maskType !== 'hide' && input.maskType !== 'reveal') {
    return { ok: false, reason: 'invalid-style' };
  }

  const original = cloneValue(input) as unknown as WhiteboardSketch;
  return {
    ok: true,
    sketch: {
      original,
      id: input.id,
      name: input.name,
      type,
      path,
      props,
      color: typeof input.color === 'string' ? input.color : undefined,
      strokeWidth: (input.strokeWidth as number | undefined) ?? 2,
      fillColor: (input.fillColor as string | undefined) ?? 'none',
      fillOpacity: (input.fillOpacity as number | undefined) ?? 1,
      strokeDashArray: (input.strokeDashArray as string | undefined) ?? 'none',
      locked: input.locked as boolean | undefined,
      maskId: input.maskId as string | undefined,
    },
  };
}

export function whiteboardNodeIdForSketch(sketchId: string): string {
  return `${WHITEBOARD_NODE_ID_PREFIX}${sketchId}`;
}

function makeNode(sketch: NormalizedSketch): MigratedWhiteboardNode {
  const id = whiteboardNodeIdForSketch(sketch.id);
  const attrs: Record<string, string> = {
    'fill-opacity': String(sketch.fillOpacity),
    'stroke-dasharray': sketch.strokeDashArray,
  };
  if (sketch.maskId) attrs.mask = `url(#mask-${sketch.maskId})`;

  let type: Node['type'];
  let props: Record<string, unknown>;
  const fill = sketch.fillColor;

  if (sketch.type === 'rectangle') {
    const sourceProps = sketch.props!;
    const rx = finiteNumber(sourceProps, 'rx') ?? 0;
    type = 'rect';
    props = {
      x: finiteNumber(sourceProps, 'x'),
      y: finiteNumber(sourceProps, 'y'),
      width: finiteNumber(sourceProps, 'width'),
      height: finiteNumber(sourceProps, 'height'),
      rx,
      ry: rx,
      strokeWidth: sketch.strokeWidth,
    };
  } else if (sketch.type === 'circle') {
    const sourceProps = sketch.props!;
    type = 'ellipse';
    props = {
      cx: finiteNumber(sourceProps, 'cx'),
      cy: finiteNumber(sourceProps, 'cy'),
      rx: finiteNumber(sourceProps, 'rx'),
      ry: finiteNumber(sourceProps, 'ry'),
      strokeWidth: sketch.strokeWidth,
    };
  } else if (sketch.type === 'line' && !sketch.path) {
    const sourceProps = sketch.props!;
    type = 'line';
    props = {
      x1: finiteNumber(sourceProps, 'x1'),
      y1: finiteNumber(sourceProps, 'y1'),
      x2: finiteNumber(sourceProps, 'x2'),
      y2: finiteNumber(sourceProps, 'y2'),
      strokeWidth: sketch.strokeWidth,
    };
  } else {
    type = 'path';
    props = { d: sketch.path, strokeWidth: sketch.strokeWidth };
  }

  const node: Node = {
    id,
    type,
    name: sketch.name,
    transform: { ...IDENTITY_TRANSFORM },
    style: { fill, stroke: sketch.color ?? 'currentColor' },
    props,
    attrs,
  };
  if (sketch.locked !== undefined) node.locked = sketch.locked;

  return {
    ...node,
    legacyWhiteboardSource: {
      version: WHITEBOARD_NODE_MIGRATION_VERSION,
      sourceSketch: sketch.original,
    },
  };
}

/** Convert one supported legacy Whiteboard record without mutating the caller's object. */
export function whiteboardSketchToNode(input: unknown): WhiteboardNodeConversion {
  const normalized = normalizeSketch(input);
  if (normalized.ok === false) return { ok: false, reason: normalized.reason };
  return { ok: true, node: makeNode(normalized.sketch) };
}

/**
 * Convert a batch in source order. Existing scene-tree node IDs are skipped to prevent
 * duplicating a Whiteboard sketch whose SVG node is already present in the shared document.
 */
export function whiteboardSketchesToNodes(
  sketches: readonly unknown[],
  existingNodeIds: ReadonlySet<string> = new Set<string>(),
): WhiteboardNodeMigrationBatch {
  const result: WhiteboardNodeMigrationBatch = { nodes: [], skipped: [], rejected: [] };
  const acceptedIds = new Set<string>();

  sketches.forEach((sketch, index) => {
    const converted = whiteboardSketchToNode(sketch);
    if (converted.ok === false) {
      const sketchId = isRecord(sketch) && typeof sketch.id === 'string' ? sketch.id : undefined;
      result.rejected.push({ index, sketchId, reason: converted.reason });
      return;
    }

    const nodeId = converted.node.id;
    const sketchId = converted.node.legacyWhiteboardSource.sourceSketch.id;
    if (existingNodeIds.has(nodeId)) {
      result.skipped.push({ index, sketchId, nodeId });
      return;
    }
    if (acceptedIds.has(nodeId)) {
      result.rejected.push({ index, sketchId, reason: 'duplicate-id' });
      return;
    }

    acceptedIds.add(nodeId);
    result.nodes.push(converted.node);
  });

  return result;
}

function stringAttr(node: Node, name: string): string | undefined {
  const value = node.attrs?.[name];
  return typeof value === 'string' ? value : undefined;
}

function numberProp(node: Node, name: string): number | undefined {
  const value: unknown = node.props?.[name];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseMaskId(node: Node): string | undefined {
  const value = stringAttr(node, 'mask');
  const match = value?.match(/^url\(#mask-(.+)\)$/);
  return match?.[1];
}

function fallbackSketchFromNode(node: Node): WhiteboardSketch | null {
  if (node.visible !== undefined || node.transformRaw !== undefined || node.meta !== undefined || node.children !== undefined) return null;
  if (node.style?.opacity !== undefined || node.style?.blendMode !== undefined) return null;
  if (node.style?.fill !== undefined && typeof node.style.fill !== 'string') return null;
  if (node.style?.stroke !== undefined && typeof node.style.stroke !== 'string') return null;
  if (!node.transform || node.transform.x !== 0 || node.transform.y !== 0 || node.transform.scaleX !== 1 || node.transform.scaleY !== 1 || node.transform.rotate !== 0) return null;

  const allowedNodeFields = new Set([
    'id', 'type', 'name', 'locked', 'visible', 'transform', 'transformRaw', 'style', 'props',
    'attrs', 'children', 'meta', 'legacyWhiteboardSource',
  ]);
  const nodeFields = node as unknown as UnknownRecord;
  if (Object.keys(nodeFields).some((key) => !allowedNodeFields.has(key))) return null;
  const allowedAttrs = new Set(['fill-opacity', 'stroke-dasharray', 'mask']);
  if (Object.entries(node.attrs || {}).some(([key, value]) => !allowedAttrs.has(key) || typeof value !== 'string')) return null;
  if (node.props !== undefined && !isRecord(node.props)) return null;
  const allowedProps: Record<Node['type'], Set<string>> = {
    path: new Set(['d', 'pathData', 'strokeWidth']),
    rect: new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'strokeWidth']),
    circle: new Set(['cx', 'cy', 'r', 'strokeWidth']),
    ellipse: new Set(['cx', 'cy', 'rx', 'ry', 'strokeWidth']),
    line: new Set(['x1', 'y1', 'x2', 'y2', 'strokeWidth']),
    polygon: new Set(['points', 'strokeWidth']),
    polyline: new Set(['points', 'strokeWidth']),
    group: new Set(),
    text: new Set(['x', 'y', 'font-size', 'font-family', 'text-anchor']),
    image: new Set(['x', 'y', 'width', 'height', 'href']),
  };
  if (node.type === 'path' && node.props?.d !== undefined && node.props?.pathData !== undefined) return null;

  const color = typeof node.style?.stroke === 'string' ? node.style.stroke : undefined;
  const fillColor = typeof node.style?.fill === 'string' ? node.style.fill : undefined;
  const strokeWidth = numberProp(node, 'strokeWidth');
  if (node.props?.strokeWidth !== undefined && (strokeWidth === undefined || strokeWidth < 0)) return null;
  const fillOpacityText = stringAttr(node, 'fill-opacity');
  const fillOpacity = fillOpacityText === undefined
    ? undefined
    : fillOpacityText.trim() === '' ? NaN : Number(fillOpacityText);
  if (fillOpacity !== undefined && (!Number.isFinite(fillOpacity) || fillOpacity < 0 || fillOpacity > 1)) return null;
  if (stringAttr(node, 'mask') !== undefined && parseMaskId(node) === undefined) return null;

  const migratedId = node.id.startsWith(WHITEBOARD_NODE_ID_PREFIX)
    ? node.id.slice(WHITEBOARD_NODE_ID_PREFIX.length)
    : node.id;
  const source: WhiteboardSketch = {
    id: migratedId,
    name: typeof node.name === 'string' ? node.name : `Whiteboard ${node.id}`,
    color,
    strokeWidth,
    fillColor,
    fillOpacity,
    strokeDashArray: stringAttr(node, 'stroke-dasharray'),
    locked: node.locked,
    maskId: parseMaskId(node),
  };
  const extrasFor = (excluded: Set<string>) => Object.fromEntries(
    Object.entries(node.props || {}).filter(([key]) => !excluded.has(key)).map(([key, value]) => [key, cloneValue(value)]),
  );
  const withExtras = (geometry: Record<string, unknown>, excluded: Set<string>) => {
    const extras = extrasFor(excluded);
    return Object.keys(extras).length > 0 ? { ...geometry, ...extras } : geometry;
  };

  if (node.type === 'path') {
    const path = node.props?.d ?? node.props?.pathData;
    if (typeof path !== 'string') return null;
    source.type = 'path';
    source.path = path;
    const extras = extrasFor(allowedProps.path);
    if (Object.keys(extras).length > 0) source.props = extras;
    return source;
  }
  if (node.type === 'rect') {
    const x = numberProp(node, 'x');
    const y = numberProp(node, 'y');
    const width = numberProp(node, 'width');
    const height = numberProp(node, 'height');
    if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
    const rx = numberProp(node, 'rx');
    const ry = numberProp(node, 'ry');
    if (rx !== undefined && ry !== undefined && rx !== ry) return null;
    source.type = 'rectangle';
    source.props = withExtras({ x, y, width, height, rx: rx ?? ry ?? 0 }, allowedProps.rect);
    return source;
  }
  if (node.type === 'ellipse') {
    const cx = numberProp(node, 'cx');
    const cy = numberProp(node, 'cy');
    const rx = numberProp(node, 'rx');
    const ry = numberProp(node, 'ry');
    if (cx === undefined || cy === undefined || rx === undefined || ry === undefined) return null;
    source.type = 'circle';
    source.props = withExtras({ cx, cy, rx, ry }, allowedProps.ellipse);
    return source;
  }
  if (node.type === 'circle') {
    const cx = numberProp(node, 'cx');
    const cy = numberProp(node, 'cy');
    const radius = numberProp(node, 'r');
    if (cx === undefined || cy === undefined || radius === undefined) return null;
    source.type = 'circle';
    source.props = withExtras({ cx, cy, rx: radius, ry: radius }, allowedProps.circle);
    return source;
  }
  if (node.type === 'line') {
    const x1 = numberProp(node, 'x1');
    const y1 = numberProp(node, 'y1');
    const x2 = numberProp(node, 'x2');
    const y2 = numberProp(node, 'y2');
    if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null;
    source.type = 'line';
    source.path = `M ${x1},${y1} L ${x2},${y2}`;
    source.props = withExtras({ x1, y1, x2, y2 }, allowedProps.line);
    return source;
  }
  return null;
}

/**
 * Restore the exact legacy record when this is an adapter-produced node. For ordinary nodes,
 * return a best-effort projection only for SVG primitives that map to Whiteboard's four shapes.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  const result: UnknownRecord = {};
  for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
  return result;
}

function projectionFields(node: Node): UnknownRecord {
  const fields = { ...node } as unknown as UnknownRecord;
  delete fields.legacyWhiteboardSource;
  return fields;
}

function sameProjection(actual: Node, expected: Node): boolean {
  return JSON.stringify(canonicalize(projectionFields(actual)))
    === JSON.stringify(canonicalize(projectionFields(expected)));
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function assignOptional(target: UnknownRecord, key: string, value: unknown): void {
  if (value === undefined) delete target[key];
  else target[key] = cloneValue(value);
}

function mergeEditedProjection(
  source: WhiteboardSketch,
  expected: Node,
  projected: WhiteboardSketch,
  node: Node,
): WhiteboardSketch | null {
  if (node.type !== expected.type) return null;
  const merged = cloneValue(source) as unknown as UnknownRecord;
  if (!sameValue(node.id, expected.id)) merged.id = projected.id;
  if (!sameValue(node.name, expected.name)) merged.name = projected.name;
  if (!sameValue(node.locked, expected.locked)) assignOptional(merged, 'locked', projected.locked);

  if (!sameValue(node.style?.stroke, expected.style?.stroke)) assignOptional(merged, 'color', projected.color);
  if (!sameValue(node.style?.fill, expected.style?.fill)) assignOptional(merged, 'fillColor', projected.fillColor);
  if (!sameValue(node.props?.strokeWidth, expected.props?.strokeWidth)) {
    assignOptional(merged, 'strokeWidth', projected.strokeWidth);
  }
  if (!sameValue(stringAttr(node, 'fill-opacity'), stringAttr(expected, 'fill-opacity'))) {
    assignOptional(merged, 'fillOpacity', projected.fillOpacity);
  }
  if (!sameValue(stringAttr(node, 'stroke-dasharray'), stringAttr(expected, 'stroke-dasharray'))) {
    assignOptional(merged, 'strokeDashArray', projected.strokeDashArray);
  }
  if (!sameValue(stringAttr(node, 'mask'), stringAttr(expected, 'mask'))) {
    assignOptional(merged, 'maskId', projected.maskId);
    if (projected.maskId === undefined) delete merged.maskType;
  }

  const sourceProps = isRecord(merged.props) ? cloneValue(merged.props) : {};
  let propsChanged = false;
  const updateGeometry = (nodeKey: string, legacyKey = nodeKey) => {
    if (sameValue(node.props?.[nodeKey], expected.props?.[nodeKey])) return;
    const value = projected.props?.[legacyKey];
    if (value === undefined) delete sourceProps[legacyKey];
    else sourceProps[legacyKey] = cloneValue(value);
    propsChanged = true;
  };

  if (node.type === 'path') {
    const actualPath = node.props?.d ?? node.props?.pathData;
    const expectedPath = expected.props?.d ?? expected.props?.pathData;
    if (!sameValue(actualPath, expectedPath)) {
      if (projected.path === undefined) delete merged.path;
      else merged.path = projected.path;
    }
  } else if (node.type === 'rect') {
    for (const key of ['x', 'y', 'width', 'height']) updateGeometry(key);
    if (!sameValue(node.props?.rx, expected.props?.rx) || !sameValue(node.props?.ry, expected.props?.ry)) {
      assignOptional(sourceProps, 'rx', projected.props?.rx);
      propsChanged = true;
    }
  } else if (node.type === 'ellipse') {
    for (const key of ['cx', 'cy', 'rx', 'ry']) updateGeometry(key);
  } else if (node.type === 'circle') {
    for (const key of ['cx', 'cy']) updateGeometry(key);
    if (!sameValue(node.props?.r, expected.props?.r)) {
      const radius = projected.props?.rx;
      assignOptional(sourceProps, 'rx', radius);
      assignOptional(sourceProps, 'ry', radius);
      propsChanged = true;
    }
  } else if (node.type === 'line') {
    for (const key of ['x1', 'y1', 'x2', 'y2']) updateGeometry(key);
  }

  const geometryKeys: Record<Node['type'], Set<string>> = {
    path: new Set(['d', 'pathData', 'strokeWidth']),
    rect: new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'strokeWidth']),
    circle: new Set(['cx', 'cy', 'r', 'strokeWidth']),
    ellipse: new Set(['cx', 'cy', 'rx', 'ry', 'strokeWidth']),
    line: new Set(['x1', 'y1', 'x2', 'y2', 'strokeWidth']),
    polygon: new Set(['points', 'strokeWidth']),
    polyline: new Set(['points', 'strokeWidth']),
    group: new Set(),
    text: new Set(['x', 'y', 'font-size', 'font-family', 'text-anchor']),
    image: new Set(['x', 'y', 'width', 'height', 'href']),
  };
  const extraPropKeys = new Set([...Object.keys(expected.props || {}), ...Object.keys(node.props || {})]);
  for (const key of extraPropKeys) {
    if (geometryKeys[node.type].has(key) || sameValue(node.props?.[key], expected.props?.[key])) continue;
    if (node.props?.[key] === undefined) delete sourceProps[key];
    else sourceProps[key] = cloneValue(node.props[key]);
    propsChanged = true;
  }

  if (propsChanged) {
    if (Object.keys(sourceProps).length === 0) delete merged.props;
    else merged.props = sourceProps;
  }
  return merged as unknown as WhiteboardSketch;
}

export function whiteboardNodeToSketch(node: Node): WhiteboardSketch | null {
  const migrated = node as Partial<MigratedWhiteboardNode>;
  const provenance = migrated.legacyWhiteboardSource;
  if (provenance?.version === WHITEBOARD_NODE_MIGRATION_VERSION && provenance.sourceSketch) {
    const expected = whiteboardSketchToNode(provenance.sourceSketch);
    if (expected.ok === false) return null;
    if (sameProjection(node, expected.node)) {
      return cloneValue(provenance.sourceSketch);
    }
    const projected = fallbackSketchFromNode(node);
    return projected ? mergeEditedProjection(provenance.sourceSketch, expected.node, projected, node) : null;
  }
  return fallbackSketchFromNode(node);
}
