import type { Project } from '../store';
import type { Node, SvgDocument } from '../types';
import { copySvgNodeIdSource, isSvgNodeIdSourceProperty, parseSvg } from './svgIo';
import {
  WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE,
  WHITEBOARD_STABLE_NODE_ID_ATTRIBUTE,
  whiteboardNodeIdForSketch,
  whiteboardNodeToSketch,
  whiteboardSketchToNode,
  whiteboardSketchesToNodes,
  type WhiteboardNodeMigrationBatch,
} from './whiteboardNodeAdapter';

export type WhiteboardProjectMigrationInput = Pick<Project, 'id' | 'sceneGraph' | 'svgSource' | 'whiteboardSketches'>;

export type WhiteboardProjectMigrationBlockerCode =
  | 'invalid-project'
  | 'invalid-scene-graph'
  | 'invalid-svg-source'
  | 'unsupported-svg-markup'
  | 'document-source-conflict'
  | 'duplicate-node-id'
  | 'duplicate-stable-node-marker'
  | 'duplicate-sketch-id'
  | 'duplicate-shared-link-marker'
  | 'orphan-shared-link-marker'
  | 'invalid-shared-link-representation'
  | 'reserved-node-id-collision'
  | 'lossy-svg-attribute'
  | 'invalid-whiteboard-sketches'
  | 'unmigratable-sketch';

export type WhiteboardProjectMigrationBlocker = {
  code: WhiteboardProjectMigrationBlockerCode;
  message: string;
};

export type WhiteboardProjectMigrationPreview = {
  mode: 'dry-run';
  projectId: string;
  status: 'ready' | 'already-migrated' | 'blocked';
  documentSource: 'svgSource' | 'sceneGraph' | 'empty' | 'unavailable';
  currentNodeCount: number;
  whiteboardSketchCount: number;
  additions: WhiteboardNodeMigrationBatch['nodes'];
  skipped: WhiteboardNodeMigrationBatch['skipped'];
  rejected: WhiteboardNodeMigrationBatch['rejected'];
  blockers: WhiteboardProjectMigrationBlocker[];
  proposedDocument: SvgDocument | null;
  writesPerformed: false;
  persistenceReady: false;
};

type UnknownRecord = Record<string, unknown>;
type InspectedNodeTree = { nodes: Node[]; flat: Node[]; parentsById: Map<string, Node[]>; blockers: WhiteboardProjectMigrationBlocker[] };

const NODE_TYPES = new Set(['group', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'text', 'image']);
const SVG_NODE_TAGS = new Set(['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'text', 'image']);
const ALLOWED_NODE_FIELDS = new Set([
  'id', 'type', 'name', 'locked', 'visible', 'transform', 'transformRaw', 'style', 'props', 'attrs', 'children', 'meta',
  'legacyWhiteboardSource',
]);
const SERIALIZABLE_PROPS: Record<string, Set<string>> = {
  group: new Set(['strokeWidth']),
  path: new Set(['d', 'strokeWidth']),
  rect: new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'strokeWidth']),
  circle: new Set(['cx', 'cy', 'r', 'strokeWidth']),
  ellipse: new Set(['cx', 'cy', 'rx', 'ry', 'strokeWidth']),
  line: new Set(['x1', 'y1', 'x2', 'y2', 'strokeWidth']),
  polygon: new Set(['points', 'strokeWidth']),
  polyline: new Set(['points', 'strokeWidth']),
  text: new Set(['x', 'y', 'dx', 'dy', 'font-size', 'font-family', 'text-anchor', 'textContent', 'strokeWidth']),
  image: new Set(['x', 'y', 'width', 'height', 'href', 'strokeWidth']),
};
const STRING_PROPS = new Set(['d', 'points', 'font-family', 'text-anchor', 'textContent', 'href']);
const NUMERIC_PROP_KEYS = new Set(['x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy', 'font-size', 'strokeWidth']);
const ROOT_PRESENTATION_ATTRS = new Set(['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'color', 'visibility', 'display', 'mix-blend-mode', 'style', 'filter', 'mask', 'clip-path', 'vector-effect', 'paint-order', 'shape-rendering', 'class']);
const LINKED_PATH_PRESENTATION_ATTRS = new Set([...ROOT_PRESENTATION_ATTRS, 'fill-rule', 'clip-rule', 'stroke-miterlimit', 'marker-start', 'marker-mid', 'marker-end']);

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== 'object' || value === null) return false;
  try {
    if (Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function ownDataValue(record: UnknownRecord, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function hasSafeOwnDataProperties(value: unknown, allowSvgNodeIdSource = false): value is UnknownRecord {
  if (!isRecord(value)) return false;
  try {
    const keys = Reflect.ownKeys(value);
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key === 'symbol') {
        if (!allowSvgNodeIdSource || !isSvgNodeIdSourceProperty(key) || descriptor?.enumerable !== false ||
          !descriptor || !('value' in descriptor) || !['authored', 'generated'].includes(String(descriptor.value))) return false;
      } else if (!descriptor?.enumerable || !('value' in descriptor)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function hasCanonicalArrayShape(value: unknown): value is unknown[] {
  try {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return false;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string')) return false;
    const indexKeys = (keys as string[]).filter((key) => key !== 'length');
    if (indexKeys.length !== value.length) return false;
    for (const key of indexKeys) {
      const index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= value.length || String(index) !== key) return false;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !('value' in descriptor)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isJsonSafePlainData(value: unknown, active = new WeakSet<object>()): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (active.has(value)) return false;
  try {
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string')) return false;
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) return false;
      const indexKeys = keys.filter((key): key is string => key !== 'length');
      if (indexKeys.length !== value.length) return false;
      active.add(value);
      for (const key of indexKeys) {
        const index = Number(key);
        if (!Number.isSafeInteger(index) || index < 0 || index >= value.length || String(index) !== key) return false;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor?.enumerable || !('value' in descriptor) || !isJsonSafePlainData(descriptor.value, active)) return false;
      }
      active.delete(value);
      return true;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    if (keys.includes('__proto__')) return false;
    active.add(value);
    for (const key of keys as string[]) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !('value' in descriptor) || !isJsonSafePlainData(descriptor.value, active)) return false;
    }
    active.delete(value);
    return true;
  } catch {
    return false;
  }
}

function cloneValue<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;
  const prior = seen.get(value);
  if (prior !== undefined) return prior as T;
  if (Array.isArray(value)) {
    const output: unknown[] = [];
    seen.set(value, output);
    for (const entry of value) output.push(cloneValue(entry, seen));
    return output as T;
  }
  const output: UnknownRecord = {};
  seen.set(value, output);
  for (const [key, child] of Object.entries(value)) {
    Object.defineProperty(output, key, { value: cloneValue(child, seen), enumerable: true, writable: true, configurable: true });
  }
  return output as T;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  const sorted: UnknownRecord = {};
  for (const key of Object.keys(value).sort()) {
    Object.defineProperty(sorted, key, { value: canonicalize(value[key]), enumerable: true, writable: true, configurable: true });
  }
  return sorted;
}

function sameDocumentNodes(left: Node[], right: Node[]): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function inspectNodeArray(value: unknown, label: string): InspectedNodeTree {
  const blockers: WhiteboardProjectMigrationBlocker[] = [];
  if (!hasCanonicalArrayShape(value)) {
    return {
      nodes: [], flat: [], parentsById: new Map(),
      blockers: [{ code: 'invalid-scene-graph', message: `${label} must be a dense, ordinary array of Nodes with no extra or non-JSON properties.` }],
    };
  }

  const flat: Node[] = [];
  const parentsById = new Map<string, Node[]>();
  const active = new WeakSet<object>();
  const visited = new WeakSet<object>();
  const ids = new Set<string>();
  const duplicateIds = new Set<string>();

  const visit = (entry: unknown, path: string, parents: Node[]) => {
    if (!hasSafeOwnDataProperties(entry, true)) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] is not a plain Node object with enumerable data properties.` });
      return;
    }
    if (active.has(entry)) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] contains a cyclic node reference.` });
      return;
    }
    if (visited.has(entry)) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] reuses a Node object at multiple positions.` });
      return;
    }
    visited.add(entry);
    active.add(entry);

    if (Object.keys(entry).some((key) => !ALLOWED_NODE_FIELDS.has(key))) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has fields the SVG serializer does not preserve.` });
    }
    if (typeof entry.id !== 'string' || entry.id.trim() === '' || typeof entry.type !== 'string' || !NODE_TYPES.has(entry.type)) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has a missing ID or unsupported Node type.` });
    } else {
      if (ids.has(entry.id)) duplicateIds.add(entry.id);
      ids.add(entry.id);
      parentsById.set(entry.id, parents);
    }
    if (entry.name !== undefined && typeof entry.name !== 'string') {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an invalid name.` });
    }
    if (entry.locked !== undefined && typeof entry.locked !== 'boolean') {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an invalid locked flag.` });
    }
    if (entry.visible !== undefined && typeof entry.visible !== 'boolean') {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an invalid visibility flag.` });
    }
    if (entry.meta !== undefined) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has meta data that the SVG serializer drops.` });
    }
    if (entry.legacyWhiteboardSource !== undefined) {
      const provenance = entry.legacyWhiteboardSource;
      if (!hasSafeOwnDataProperties(provenance)) {
        blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has invalid migration provenance.` });
      } else {
        const sourceSketch = provenance.sourceSketch;
        const sourceIsSafe = hasSafeOwnDataProperties(sourceSketch) && isJsonSafePlainData(sourceSketch);
        const convertedSource = sourceIsSafe ? whiteboardSketchToNode(sourceSketch) : null;
        if (
          provenance.version !== 1 || Object.keys(provenance).some((key) => !['version', 'sourceSketch'].includes(key)) ||
          !sourceIsSafe || !convertedSource || convertedSource.ok === false
        ) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has invalid or non-serializable migration provenance.` });
        }
      }
    }
    if (!hasSafeOwnDataProperties(entry.transform) || !['x', 'y', 'scaleX', 'scaleY', 'rotate'].every((key) =>
      typeof entry.transform?.[key] === 'number' && Number.isFinite(entry.transform[key])) ||
      (hasSafeOwnDataProperties(entry.transform) && Object.keys(entry.transform).some((key) => !['x', 'y', 'scaleX', 'scaleY', 'rotate'].includes(key)))) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an invalid transform.` });
    }
    if (entry.transformRaw !== undefined && (typeof entry.transformRaw !== 'string' || entry.transformRaw === '')) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an empty or invalid raw transform.` });
    }
    if (entry.props !== undefined && !hasSafeOwnDataProperties(entry.props)) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has invalid props.` });
    } else if (hasSafeOwnDataProperties(entry.props) && typeof entry.type === 'string' && SERIALIZABLE_PROPS[entry.type]) {
      for (const [key, prop] of Object.entries(entry.props)) {
        if (!SERIALIZABLE_PROPS[entry.type].has(key)) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has prop "${key}" that the SVG serializer drops.` });
          continue;
        }
        if (prop === undefined || prop === null) continue;
        if (typeof prop === 'number' && !Number.isFinite(prop)) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has a non-finite "${key}" prop.` });
        } else if (typeof prop !== 'number' && typeof prop !== 'string') {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has a non-primitive "${key}" prop.` });
        } else if (STRING_PROPS.has(key) && typeof prop !== 'string') {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has a non-string "${key}" prop.` });
        } else if (key === 'strokeWidth' && (!String(prop).trim() || !Number.isFinite(Number(prop)) || Number(prop) < 0)) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an invalid stroke width.` });
        } else if (NUMERIC_PROP_KEYS.has(key) && typeof prop === 'string' && !prop.trim()) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an empty numeric "${key}" prop.` });
        }
      }
    }
    if (entry.style !== undefined) {
      if (!hasSafeOwnDataProperties(entry.style)) {
        blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has invalid style.` });
      } else {
        if (Object.keys(entry.style).some((key) => !['fill', 'stroke', 'opacity', 'blendMode'].includes(key))) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has style fields that the SVG serializer drops.` });
        }
        if (['fill', 'stroke'].some((key) => entry.style?.[key] !== undefined && typeof entry.style[key] !== 'string')) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has non-string fill/stroke that the SVG serializer cannot preserve.` });
        }
        if (entry.style.opacity !== undefined && (
          typeof entry.style.opacity !== 'number' || !Number.isFinite(entry.style.opacity) ||
          entry.style.opacity < 0 || entry.style.opacity > 1
        )) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has invalid opacity.` });
        }
        if (entry.style.blendMode !== undefined && (typeof entry.style.blendMode !== 'string' || !entry.style.blendMode.trim())) {
          blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has invalid blend mode.` });
        }
      }
    }
    if (entry.attrs !== undefined && (!hasSafeOwnDataProperties(entry.attrs) || Object.values(entry.attrs).some((attr) => typeof attr !== 'string'))) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has invalid passthrough attributes.` });
    } else if (hasSafeOwnDataProperties(entry.attrs)) {
      const geometryAttrs: Record<string, string[]> = {
        path: ['d'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'],
        ellipse: ['cx', 'cy', 'rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'], polygon: ['points'],
        polyline: ['points'], text: ['x', 'y', 'dx', 'dy', 'font-size', 'font-family', 'text-anchor'],
        image: ['x', 'y', 'width', 'height', 'href'], group: [],
      };
      const reservedAttrs = new Set([
        'id', 'transform', 'fill', 'stroke', 'stroke-width', 'opacity', 'mix-blend-mode', 'data-name', 'data-locked', 'data-visible',
        ...(geometryAttrs[String(entry.type)] || []),
      ]);
      if (Object.keys(entry.attrs).some((key) => reservedAttrs.has(key))) {
        blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has passthrough attributes that collide with serialized Node fields.` });
      }
      const linkMarker = entry.attrs[WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE];
      if (linkMarker !== undefined && (typeof linkMarker !== 'string' || !linkMarker.trim())) {
        blockers.push({ code: 'invalid-shared-link-representation', message: `${label}[${path}] has an empty shared-link marker.` });
      }
      const stableNodeMarker = entry.attrs[WHITEBOARD_STABLE_NODE_ID_ATTRIBUTE];
      if (stableNodeMarker !== undefined && (typeof stableNodeMarker !== 'string' || !stableNodeMarker.trim())) {
        blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has an empty stable-node marker.` });
      }
    }
    if (entry.children !== undefined && !hasCanonicalArrayShape(entry.children)) {
      blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has children that are not a dense ordinary array.` });
    } else if (hasCanonicalArrayShape(entry.children)) {
      if (entry.type !== 'group' && entry.children.length > 0) {
        blockers.push({ code: 'invalid-scene-graph', message: `${label}[${path}] has children but is not a group.` });
      }
      entry.children.forEach((child, index) => visit(child, `${path}.${index}`, [...parents, entry as unknown as Node]));
    }

    flat.push(entry as unknown as Node);
    active.delete(entry);
  };

  value.forEach((entry, index) => visit(entry, String(index), []));
  for (const id of duplicateIds) {
    blockers.push({ code: 'duplicate-node-id', message: `${label} contains more than one Node with ID "${id}".` });
  }
  return { nodes: value as Node[], flat, parentsById, blockers };
}

function inspectSvgMarkup(svgSource: string): Array<Pick<WhiteboardProjectMigrationBlocker, 'code' | 'message'>> {
  const findings: Array<Pick<WhiteboardProjectMigrationBlocker, 'code' | 'message'>> = [];
  const unsupported = (message: string) => findings.push({ code: 'unsupported-svg-markup', message });
  const lossyAttribute = (message: string) => findings.push({ code: 'lossy-svg-attribute', message });
  if (typeof DOMParser === 'undefined') {
    return [{ code: 'unsupported-svg-markup', message: 'DOMParser is unavailable for SVG loss inspection.' }];
  }
  const document = new DOMParser().parseFromString(svgSource, 'image/svg+xml');
  const parseError = document.querySelector('parsererror');
  if (parseError) return [{ code: 'unsupported-svg-markup', message: `SVG is malformed: ${parseError.textContent?.trim() || 'XML parse error'}` }];
  const root = document.documentElement;
  if (!root || root.tagName.toLowerCase() !== 'svg') return [{ code: 'unsupported-svg-markup', message: 'SVG root is not <svg>.' }];

  if (document.doctype) unsupported('DOCTYPE is not preserved by the project serializer.');
  for (const child of Array.from(document.childNodes)) {
    if (child.nodeType === 8 || child.nodeType === 7) unsupported('Document-level comments or processing instructions are not preserved.');
  }

  let rootDefsCount = 0;
  const visit = (parent: Element, inDefs: boolean) => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === 8 && !inDefs) unsupported('Comments outside <defs> are not preserved by the project serializer.');
      if (child.nodeType === 7 && !inDefs) unsupported('Processing instructions outside <defs> are not preserved.');
      if ((child.nodeType === 3 || child.nodeType === 4) && !inDefs) {
        const text = child.textContent?.trim() || '';
        if (text && parent.tagName.toLowerCase() !== 'text') unsupported('Non-whitespace text outside <text> nodes is not preserved.');
      }
      if (child.nodeType !== 1) continue;

      const element = child as Element;
      const tag = element.tagName.toLowerCase();
      if (tag === 'defs') {
        if (element.parentElement !== root) unsupported('Nested <defs> blocks are not preserved in place.');
        else rootDefsCount += 1;
        continue;
      }
      const childInDefs = inDefs;
      if (!childInDefs && SVG_NODE_TAGS.has(tag)) {
        if (element.getAttribute('id') === '') lossyAttribute(`<${tag}> has an empty id attribute that the parser replaces with a generated ID.`);
        if (element.hasAttribute('transform') && !element.getAttribute('transform')?.trim()) lossyAttribute(`<${tag}> has an empty transform attribute that the parser drops.`);
        if (element.hasAttribute('mix-blend-mode') && !element.getAttribute('mix-blend-mode')?.trim()) lossyAttribute(`<${tag}> has an empty mix-blend-mode attribute that the serializer drops.`);

        const opacity = element.getAttribute('opacity');
        if (opacity !== null) {
          const value = Number(opacity);
          if (!opacity.trim() || !Number.isFinite(value) || value < 0 || value > 1) {
            lossyAttribute(`<${tag}> has an opacity value the parser cannot preserve safely.`);
          }
        }
        const strokeWidth = element.getAttribute('stroke-width');
        if (strokeWidth !== null) {
          const value = Number(strokeWidth);
          if (!strokeWidth.trim() || !Number.isFinite(value) || value < 0) {
            lossyAttribute(`<${tag}> has a stroke-width value the parser cannot preserve safely.`);
          }
        }
        const locked = element.getAttribute('data-locked');
        if (locked !== null && locked !== 'true') lossyAttribute(`<${tag}> has a noncanonical data-locked value that the parser drops.`);
        const visible = element.getAttribute('data-visible');
        if (visible !== null && visible !== 'false') lossyAttribute(`<${tag}> has a noncanonical data-visible value that the parser drops.`);
      }
      if (!childInDefs && !SVG_NODE_TAGS.has(tag)) unsupported(`Unsupported SVG element <${tag}> would be dropped.`);
      if (!childInDefs && tag === 'text' && element.children.length > 0) {
        unsupported('Structured <text> children such as <tspan> are not represented losslessly.');
      }
      visit(element, childInDefs);
    }
  };
  visit(root, false);
  if (rootDefsCount > 1) unsupported('Multiple root <defs> blocks are not preserved independently.');
  const unique = new Map(findings.map((finding) => [`${finding.code}:${finding.message}`, finding]));
  return [...unique.values()];
}

function cloneNode(node: Node): Node {
  const copy = cloneValue(node);
  const copyMetadata = (source: Node, target: Node) => {
    copySvgNodeIdSource(source, target);
    source.children?.forEach((child, index) => {
      const clonedChild = target.children?.[index];
      if (clonedChild) copyMetadata(child, clonedChild);
    });
  };
  copyMetadata(node, copy);
  return copy;
}

function normalizedMigrationNode(node: Node): Node {
  const copy = cloneNode(node) as Node & { legacyWhiteboardSource?: unknown };
  delete copy.legacyWhiteboardSource;
  if (copy.locked === false) delete copy.locked;
  if (copy.visible === true) delete copy.visible;
  if (copy.attrs) {
    const attrs = { ...copy.attrs };
    delete attrs[WHITEBOARD_STABLE_NODE_ID_ATTRIBUTE];
    if (attrs['fill-opacity'] === '1') delete attrs['fill-opacity'];
    if (attrs['stroke-dasharray'] === 'none') delete attrs['stroke-dasharray'];
    copy.attrs = Object.keys(attrs).length ? attrs : undefined;
  }
  if (copy.children?.length === 0 && copy.type !== 'group') delete copy.children;
  if (copy.props) {
    const props = { ...copy.props };
    for (const [key, value] of Object.entries(props)) {
      if (NUMERIC_PROP_KEYS.has(key) && typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
        props[key] = Number(value);
      }
    }
    copy.props = props;
  }
  return copy;
}

function existingNodeRepresentsSketch(node: Node, source: unknown, stableMarkerAlias = false): boolean {
  if (!isRecord(source) || !isJsonSafePlainData(source)) return false;
  const expected = whiteboardSketchToNode(source);
  if (expected.ok === false) return false;
  const candidate = cloneNode(node) as Node & { legacyWhiteboardSource?: unknown };
  if (stableMarkerAlias) candidate.id = expected.node.id;
  const provenance = candidate.legacyWhiteboardSource;
  if (provenance !== undefined) {
    if (!isRecord(provenance) || provenance.version !== 1 || !isRecord(provenance.sourceSketch) ||
      !isJsonSafePlainData(provenance.sourceSketch) || JSON.stringify(canonicalize(provenance.sourceSketch)) !== JSON.stringify(canonicalize(source))) return false;
  } else {
    if (candidate.attrs) {
      const attrs = { ...candidate.attrs };
      delete attrs[WHITEBOARD_STABLE_NODE_ID_ATTRIBUTE];
      candidate.attrs = Object.keys(attrs).length ? attrs : undefined;
    }
    const projectedSketch = whiteboardNodeToSketch(candidate);
    if (!projectedSketch || JSON.stringify(canonicalize(projectedSketch)) !== JSON.stringify(canonicalize(source))) return false;
  }
  return JSON.stringify(canonicalize(normalizedMigrationNode(candidate))) ===
    JSON.stringify(canonicalize(normalizedMigrationNode(expected.node)));
}

function hasInheritedSvgPresentation(rootAttrs: Record<string, string>, defs?: string): boolean {
  return Object.keys(rootAttrs).some((key) => ROOT_PRESENTATION_ATTRS.has(key)) || /<\s*style\b/i.test(defs || '');
}

function hasUnrepresentedPathPresentation(node: Node): boolean {
  if (node.style?.opacity !== undefined || node.style?.blendMode !== undefined) return true;
  return Object.keys(node.attrs || {}).some((key) => LINKED_PATH_PRESENTATION_ATTRS.has(key));
}

function inspectSketchIdDuplicates(sketches: unknown[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const sketch of sketches) {
    if (!isRecord(sketch) || typeof sketch.id !== 'string' || sketch.id.trim() === '') continue;
    if (seen.has(sketch.id)) duplicates.add(sketch.id);
    seen.add(sketch.id);
  }
  return [...duplicates];
}

function makeBlockedPreview(
  projectId: string,
  documentSource: WhiteboardProjectMigrationPreview['documentSource'],
  whiteboardSketchCount: number,
  blockers: WhiteboardProjectMigrationBlocker[],
): WhiteboardProjectMigrationPreview {
  return {
    mode: 'dry-run',
    projectId,
    status: 'blocked',
    documentSource,
    currentNodeCount: 0,
    whiteboardSketchCount,
    additions: [],
    skipped: [],
    rejected: [],
    blockers,
    proposedDocument: null,
    writesPerformed: false,
    persistenceReady: false,
  };
}

/**
 * Preview folding a project's legacy Whiteboard sketches into its shared Node document.
 * This function is intentionally pure: it never updates Zustand, IndexedDB, cloud storage, or files.
 */
function previewWhiteboardProjectMigrationUnchecked(
  project: WhiteboardProjectMigrationInput,
): WhiteboardProjectMigrationPreview {
  if (!hasSafeOwnDataProperties(project)) {
    return makeBlockedPreview('', 'unavailable', 0, [{ code: 'invalid-project', message: 'Project input must be a plain object with enumerable data fields.' }]);
  }

  const projectIdValue = ownDataValue(project, 'id');
  const projectId = typeof projectIdValue === 'string' ? projectIdValue : '';
  const blockers: WhiteboardProjectMigrationBlocker[] = [];
  if (!projectId.trim()) blockers.push({ code: 'invalid-project', message: 'Project ID is missing.' });

  const sceneGraphValue = ownDataValue(project, 'sceneGraph');
  const rawSceneGraph = sceneGraphValue === undefined || sceneGraphValue === null ? [] : sceneGraphValue;
  const sceneInspection = inspectNodeArray(rawSceneGraph, 'sceneGraph');
  blockers.push(...sceneInspection.blockers);

  let whiteboardSketches: unknown[];
  const whiteboardSketchesValue = ownDataValue(project, 'whiteboardSketches');
  if (whiteboardSketchesValue === undefined || whiteboardSketchesValue === null) {
    whiteboardSketches = [];
  } else if (hasCanonicalArrayShape(whiteboardSketchesValue)) {
    whiteboardSketches = whiteboardSketchesValue;
  } else {
    blockers.push({ code: 'invalid-whiteboard-sketches', message: 'whiteboardSketches must be a dense ordinary array when present.' });
    return makeBlockedPreview(projectId, 'unavailable', 0, blockers);
  }
  if (!hasCanonicalArrayShape(whiteboardSketches) || whiteboardSketches.some((sketch) => !isJsonSafePlainData(sketch))) {
    blockers.push({ code: 'invalid-whiteboard-sketches', message: 'whiteboardSketches contains sparse, extra, or non-JSON data that cannot be persisted losslessly.' });
    return makeBlockedPreview(projectId, 'unavailable', whiteboardSketches.length, blockers);
  }
  const duplicateSketchIds = inspectSketchIdDuplicates(whiteboardSketches);
  for (const id of duplicateSketchIds) {
    blockers.push({ code: 'duplicate-sketch-id', message: `whiteboardSketches contains duplicate ID "${id}".` });
  }

  const svgValue = ownDataValue(project, 'svgSource');
  let parsedDocument: SvgDocument | null = null;
  const hasSvg = typeof svgValue === 'string' && svgValue.trim() !== '';
  if (svgValue !== undefined && svgValue !== null && typeof svgValue !== 'string') {
    blockers.push({ code: 'invalid-svg-source', message: 'svgSource must be a string or null.' });
  } else if (hasSvg) {
    const findings = inspectSvgMarkup(svgValue);
    blockers.push(...findings);
    try {
      parsedDocument = parseSvg(svgValue);
    } catch (error) {
      blockers.push({
        code: 'invalid-svg-source',
        message: error instanceof Error ? error.message : 'SVG could not be parsed.',
      });
    }
  }

  const hasSceneGraph = sceneInspection.nodes.length > 0 && sceneInspection.blockers.length === 0;
  if (parsedDocument && hasSceneGraph && !sceneInspection.blockers.length &&
    !sameDocumentNodes(sceneInspection.nodes, parsedDocument.nodes)) {
    blockers.push({
      code: 'document-source-conflict',
      message: 'sceneGraph and svgSource contain different Node trees; the dry-run will not choose one or discard either.',
    });
  }

  let documentSource: WhiteboardProjectMigrationPreview['documentSource'] = 'empty';
  let baseDocument: SvgDocument | null = null;
  if (hasSvg && parsedDocument) {
    documentSource = 'svgSource';
    baseDocument = parsedDocument;
  } else if (hasSvg && !parsedDocument) {
    documentSource = 'unavailable';
  } else if (hasSceneGraph) {
    documentSource = 'sceneGraph';
    baseDocument = { rootAttrs: {}, nodes: sceneInspection.nodes.map(cloneNode) };
  } else if (sceneInspection.blockers.length === 0) {
    baseDocument = { rootAttrs: {}, nodes: [] };
  }

  if (!baseDocument) {
    if (blockers.length === 0) blockers.push({ code: 'invalid-svg-source', message: 'No unambiguous base document is available.' });
    return makeBlockedPreview(projectId, documentSource, whiteboardSketches.length, blockers);
  }

  const baseInspection = inspectNodeArray(baseDocument.nodes, documentSource === 'svgSource' ? 'svgSource nodes' : 'sceneGraph');
  blockers.push(...baseInspection.blockers);
  const existingNodeIds = new Set<string>();
  const existingNodesById = new Map<string, Array<{ node: Node; stableMarkerAlias: boolean }>>();
  const addIdentity = (identity: string, node: Node, stableMarkerAlias: boolean) => {
    existingNodeIds.add(identity);
    const owners = existingNodesById.get(identity) ?? [];
    if (!owners.some((owner) => owner.node === node)) owners.push({ node, stableMarkerAlias });
    existingNodesById.set(identity, owners);
  };
  for (const node of baseInspection.flat) {
    addIdentity(node.id, node, false);
    const stableMarker = node.attrs?.[WHITEBOARD_STABLE_NODE_ID_ATTRIBUTE];
    if (typeof stableMarker === 'string' && stableMarker.trim()) addIdentity(stableMarker, node, true);
  }
  for (const [identity, owners] of existingNodesById) {
    if (owners.length > 1) {
      blockers.push({ code: 'duplicate-stable-node-marker', message: `More than one SVG node claims stable identity "${identity}".` });
    }
  }
  const representedSketchNodeIds = new Map<string, string>();
  const duplicateLinkIds = new Set<string>();
  for (const node of baseInspection.flat) {
    const sketchId = node.attrs?.[WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE];
    if (typeof sketchId !== 'string' || sketchId.trim() === '') continue;
    if (representedSketchNodeIds.has(sketchId)) duplicateLinkIds.add(sketchId);
    else representedSketchNodeIds.set(sketchId, node.id);
  }
  for (const id of duplicateLinkIds) {
    blockers.push({ code: 'duplicate-shared-link-marker', message: `More than one SVG node links to Whiteboard sketch "${id}".` });
  }
  const sourceSketchIds = new Set<string>();
  for (const sketch of whiteboardSketches) {
    if (isRecord(sketch) && typeof sketch.id === 'string') sourceSketchIds.add(sketch.id);
  }
  const sketchesById = new Map<string, UnknownRecord[]>();
  for (const sketch of whiteboardSketches) {
    if (!isRecord(sketch) || typeof sketch.id !== 'string') continue;
    const matches = sketchesById.get(sketch.id) ?? [];
    matches.push(sketch);
    sketchesById.set(sketch.id, matches);
  }
  for (const [id, nodeId] of representedSketchNodeIds) {
    const linkedSketches = sketchesById.get(id) ?? [];
    if (linkedSketches.length === 0) {
      blockers.push({ code: 'orphan-shared-link-marker', message: `SVG node links to missing Whiteboard sketch "${id}".` });
      continue;
    }
    if (linkedSketches.length !== 1) continue;
    const linkedNode = baseInspection.flat.find((node) => node.id === nodeId);
    const linkedSketch = linkedSketches[0];
    const reservedIdentity = whiteboardNodeIdForSketch(id);
    const reservedOwners = existingNodesById.get(reservedIdentity) ?? [];
    if (reservedOwners.some((owner) => owner.node !== linkedNode)) {
      blockers.push({
        code: 'reserved-node-id-collision',
        message: `Linked sketch "${id}" also has a separate Node claiming reserved identity "${reservedIdentity}".`,
      });
    }
    const hasNonIdentityTransform = [linkedNode, ...(baseInspection.parentsById.get(nodeId) || [])].some((contextNode) => {
      const contextTransform = contextNode?.transform;
      return !contextTransform || contextTransform.x !== 0 || contextTransform.y !== 0 ||
        contextTransform.scaleX !== 1 || contextTransform.scaleY !== 1 || contextTransform.rotate !== 0 ||
        contextNode?.transformRaw !== undefined || contextNode?.visible === false ||
        (contextNode?.type === 'group' && (
          contextNode.style?.fill !== undefined || contextNode.style?.stroke !== undefined ||
          contextNode.style?.opacity !== undefined || contextNode.style?.blendMode !== undefined ||
          Object.keys(contextNode.attrs || {}).length > 0
        ));
    });
    if (
      !linkedNode ||
      linkedNode.type !== 'path' ||
      (linkedSketch.type !== undefined && linkedSketch.type !== 'path') ||
      typeof linkedSketch.path !== 'string' ||
      !linkedSketch.path.trim() ||
      linkedNode.props?.d !== linkedSketch.path ||
      hasNonIdentityTransform ||
      hasInheritedSvgPresentation(baseDocument.rootAttrs, baseDocument.defs) ||
      Boolean(linkedNode && hasUnrepresentedPathPresentation(linkedNode))
    ) {
      blockers.push({
        code: 'invalid-shared-link-representation',
        message: `SVG node "${nodeId}" does not safely represent linked Whiteboard sketch "${id}".`,
      });
    }
  }

  for (const sketch of whiteboardSketches) {
    if (!isRecord(sketch) || typeof sketch.id !== 'string') continue;
    if (representedSketchNodeIds.has(sketch.id)) continue;
    const converted = whiteboardSketchToNode(sketch);
    if (converted.ok === false) continue;
    const reservedId = whiteboardNodeIdForSketch(sketch.id);
    const owners = existingNodesById.get(reservedId) ?? [];
    if (owners.length > 1 || (owners.length === 1 && !existingNodeRepresentsSketch(owners[0].node, sketch, owners[0].stableMarkerAlias))) {
      blockers.push({
        code: 'reserved-node-id-collision',
        message: `Existing Node identity "${reservedId}" does not safely represent Whiteboard sketch "${sketch.id}".`,
      });
    }
  }

  const batch = whiteboardSketchesToNodes(whiteboardSketches, existingNodeIds, representedSketchNodeIds);
  for (const rejected of batch.rejected) {
    blockers.push({
      code: 'unmigratable-sketch',
      message: `Whiteboard sketch at index ${rejected.index}${rejected.sketchId ? ` (ID "${rejected.sketchId}")` : ''} was rejected: ${rejected.reason}.`,
    });
  }

  const status: WhiteboardProjectMigrationPreview['status'] = blockers.length > 0
    ? 'blocked'
    : batch.nodes.length > 0 ? 'ready' : 'already-migrated';
  const proposedDocument = status === 'blocked'
    ? null
    : {
      ...baseDocument,
      rootAttrs: { ...baseDocument.rootAttrs },
      nodes: [...baseDocument.nodes.map(cloneNode), ...batch.nodes],
    };

  return {
    mode: 'dry-run',
    projectId,
    status,
    documentSource,
    currentNodeCount: baseInspection.flat.length,
    whiteboardSketchCount: whiteboardSketches.length,
    additions: batch.nodes,
    skipped: batch.skipped,
    rejected: batch.rejected,
    blockers,
    proposedDocument,
    writesPerformed: false,
    persistenceReady: false,
  };
}


/** Never let hostile property traps escape the dry-run boundary or trigger project writes. */
export function previewWhiteboardProjectMigration(
  project: WhiteboardProjectMigrationInput,
): WhiteboardProjectMigrationPreview {
  try {
    return previewWhiteboardProjectMigrationUnchecked(project);
  } catch {
    return makeBlockedPreview('', 'unavailable', 0, [{
      code: 'invalid-project',
      message: 'Project input could not be inspected safely; no migration proposal was produced.',
    }]);
  }
}
