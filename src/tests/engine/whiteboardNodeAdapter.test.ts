import { describe, expect, it } from 'vitest';
import type { Node, WhiteboardSketch } from '../../types';
import { parseSvg, serializeSvg } from '../../engine/svgIo';
import {
  whiteboardNodeIdForSketch,
  whiteboardNodeToSketch,
  whiteboardSketchesToNodes,
  whiteboardSketchToNode,
  translateWhiteboardSketch,
  updateWhiteboardSketchGeometry,
} from '../../engine/whiteboardNodeAdapter';

function sketch(overrides: Record<string, unknown> = {}): WhiteboardSketch {
  return {
    id: 'sketch-1',
    name: 'Sketch one',
    type: 'path',
    path: 'M 1,2 Q 5,8 9,10',
    color: '#123456',
    strokeWidth: 3,
    fillColor: '#abcdef',
    fillOpacity: 0.4,
    strokeDashArray: '5 2',
    ...overrides,
  } as WhiteboardSketch;
}

describe('whiteboardSketchToNode', () => {
  it('maps a path and keeps the exact legacy record for a lossless reverse projection', () => {
    const source = sketch({
      locked: true,
      maskId: 'mask-a',
      maskType: 'reveal',
      customLegacyField: { nested: ['kept', 7] },
    });
    const result = whiteboardSketchToNode(source);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.node.id).toBe(whiteboardNodeIdForSketch(source.id));
    expect(result.node.type).toBe('path');
    expect(result.node.name).toBe('Sketch one');
    expect(result.node.locked).toBe(true);
    expect(result.node.props?.d).toBe(source.path);
    expect(result.node.props?.strokeWidth).toBe(3);
    expect(result.node.style).toEqual({ fill: '#abcdef', stroke: '#123456' });
    expect(result.node.attrs).toMatchObject({
      'fill-opacity': '0.4',
      'stroke-dasharray': '5 2',
      mask: 'url(#mask-mask-a)',
    });
    expect(whiteboardNodeToSketch(result.node)).toEqual(source);
  });

  it('maps rectangles and ellipse-like circles to native Node primitives', () => {
    const rectangle = whiteboardSketchToNode(sketch({
      id: 'rect-1',
      type: 'rectangle',
      path: undefined,
      props: { x: 10, y: 20, width: 30, height: 40, rx: 6 },
    }));
    const ellipse = whiteboardSketchToNode(sketch({
      id: 'ellipse-1',
      type: 'circle',
      path: undefined,
      props: { cx: 25, cy: 35, rx: 12, ry: 8 },
    }));

    expect(rectangle.ok).toBe(true);
    expect(ellipse.ok).toBe(true);
    if (!rectangle.ok || !ellipse.ok) return;
    expect(rectangle.node.type).toBe('rect');
    expect(rectangle.node.props).toMatchObject({ x: 10, y: 20, width: 30, height: 40, rx: 6, ry: 6 });
    expect(ellipse.node.type).toBe('ellipse');
    expect(ellipse.node.props).toMatchObject({ cx: 25, cy: 35, rx: 12, ry: 8 });
    expect(whiteboardNodeToSketch(rectangle.node)).toEqual(expect.objectContaining({ type: 'rectangle' }));
    expect(whiteboardNodeToSketch(ellipse.node)).toEqual(expect.objectContaining({ type: 'circle' }));
  });

  it('keeps curved line path data and supports endpoint-only line records', () => {
    const curved = whiteboardSketchToNode(sketch({
      id: 'curved-line',
      type: 'line',
      path: 'M 1,2 Q 5,8 9,10',
      fillColor: '#fff',
    }));
    const straight = whiteboardSketchToNode(sketch({
      id: 'straight-line',
      type: 'line',
      path: undefined,
      props: { x1: 1, y1: 2, x2: 9, y2: 10 },
    }));

    expect(curved.ok).toBe(true);
    expect(straight.ok).toBe(true);
    if (!curved.ok || !straight.ok) return;
    expect(curved.node.type).toBe('path');
    expect(curved.node.props?.d).toBe('M 1,2 Q 5,8 9,10');
    expect(curved.node.style?.fill).toBe('#fff');
    expect(straight.node.type).toBe('line');
    expect(straight.node.props).toMatchObject({ x1: 1, y1: 2, x2: 9, y2: 10 });
    expect(whiteboardNodeToSketch(curved.node)).toEqual(expect.objectContaining({ type: 'line' }));
    expect(whiteboardNodeToSketch(straight.node)).toEqual(expect.objectContaining({ type: 'line' }));
  });

  it('infers legacy path records with no explicit type and returns deterministic, non-mutating results', () => {
    const source = sketch({ type: undefined, custom: { array: [1, { value: true }] } });
    const before = structuredClone(source);
    const first = whiteboardSketchToNode(source);
    const second = whiteboardSketchToNode(source);

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(source).toEqual(before);
    if (!first.ok) return;
    expect(first.node.legacyWhiteboardSource.sourceSketch).not.toBe(source);
    const sourceWithCustomField = first.node.legacyWhiteboardSource.sourceSketch as WhiteboardSketch & { custom?: unknown };
    expect(sourceWithCustomField.custom).toEqual({ array: [1, { value: true }] });
    expect(whiteboardNodeToSketch(first.node)).toEqual(before);
  });

  it('projects supported edits while preserving legacy-only metadata and line semantics', () => {
    const source = sketch({
      type: 'line',
      props: { lineStyle: 'curved', customProp: 'keep-me' },
      maskType: 'reveal',
      customLegacyField: { keep: true },
    });
    const result = whiteboardSketchToNode(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const edited = { ...result.node, props: { ...result.node.props, d: 'M 50,60 L 70,80' } };
    expect(whiteboardNodeToSketch(edited)).toEqual(expect.objectContaining({
      id: 'sketch-1',
      type: 'line',
      path: 'M 50,60 L 70,80',
      props: { lineStyle: 'curved', customProp: 'keep-me' },
      maskType: 'reveal',
      customLegacyField: { keep: true },
    }));
  });

  it('preserves exact source fields when Node object keys are reordered', () => {
    const source = sketch({ customLegacyField: { original: true } });
    const result = whiteboardSketchToNode(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reordered = structuredClone(result.node);
    reordered.transform = Object.fromEntries(Object.entries(reordered.transform).reverse()) as typeof reordered.transform;
    reordered.style = Object.fromEntries(Object.entries(reordered.style || {}).reverse()) as typeof reordered.style;
    reordered.props = Object.fromEntries(Object.entries(reordered.props || {}).reverse());
    reordered.attrs = Object.fromEntries(Object.entries(reordered.attrs || {}).reverse());
    expect(whiteboardNodeToSketch(reordered)).toEqual(source);
  });

  it('rebases endpoint edits and mask ID changes without losing line or mask metadata', () => {
    const endpointLine = {
      id: 'line-for-edit',
      name: 'Line for edit',
      type: 'line',
      props: { x1: 1, y1: 2, x2: 3, y2: 4, lineStyle: 'straight' },
      maskId: 'mask-before',
      maskType: 'reveal',
    } as WhiteboardSketch;
    const convertedLine = whiteboardSketchToNode(endpointLine);
    expect(convertedLine.ok).toBe(true);
    if (!convertedLine.ok) return;

    const editedLine = {
      ...convertedLine.node,
      props: { ...convertedLine.node.props, x2: 30 },
      attrs: { ...convertedLine.node.attrs, mask: 'url(#mask-after)' },
    };
    expect(whiteboardNodeToSketch(editedLine)).toEqual({
      ...endpointLine,
      props: { ...endpointLine.props, x2: 30 },
      maskId: 'after',
    });
  });

  it('does not materialize defaults or add path data to endpoint-only lines after unrelated edits', () => {
    const minimal: WhiteboardSketch = { id: 'minimal', name: 'Minimal', type: 'path', path: 'M 0,0' };
    const convertedMinimal = whiteboardSketchToNode(minimal);
    expect(convertedMinimal.ok).toBe(true);
    if (!convertedMinimal.ok) return;
    expect(convertedMinimal.node.style).toEqual({ fill: 'none', stroke: 'currentColor' });
    expect(convertedMinimal.node.props?.strokeWidth).toBe(2);
    expect(convertedMinimal.node.attrs).toMatchObject({ 'fill-opacity': '1', 'stroke-dasharray': 'none' });
    const editedMinimal = {
      ...convertedMinimal.node,
      props: { ...convertedMinimal.node.props, d: 'M 1,1' },
    };
    expect(whiteboardNodeToSketch(editedMinimal)).toEqual({ ...minimal, path: 'M 1,1' });

    const endpointLine = {
      id: 'endpoint-line',
      name: 'Endpoint line',
      type: 'line',
      props: { x1: 1, y1: 2, x2: 3, y2: 4 },
      color: '',
      strokeWidth: 0,
      fillColor: '',
      fillOpacity: 0,
      strokeDashArray: '',
    } as WhiteboardSketch;
    const convertedLine = whiteboardSketchToNode(endpointLine);
    expect(convertedLine.ok).toBe(true);
    if (!convertedLine.ok) return;
    expect(convertedLine.node.style).toMatchObject({ stroke: '', fill: '' });
    expect(convertedLine.node.props?.strokeWidth).toBe(0);
    expect(convertedLine.node.attrs?.['fill-opacity']).toBe('0');
    expect(convertedLine.node.attrs?.['stroke-dasharray']).toBe('');
    const recolored = {
      ...convertedLine.node,
      style: { ...convertedLine.node.style, stroke: '#ff0000' },
    };
    expect(whiteboardNodeToSketch(recolored)).toEqual({ ...endpointLine, color: '#ff0000' });
  });

  it('rejects edits to Node state that the legacy sketch model cannot represent', () => {
    const result = whiteboardSketchToNode(sketch());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(whiteboardNodeToSketch({ ...result.node, visible: false })).toBeNull();
    expect(whiteboardNodeToSketch({ ...result.node, transformRaw: 'skewX(10)' })).toBeNull();
    expect(whiteboardNodeToSketch({ ...result.node, meta: { createdBy: 'editor', timestamp: 'now' } })).toBeNull();
    expect(whiteboardNodeToSketch({ ...result.node, children: [] })).toBeNull();
    expect(whiteboardNodeToSketch({
      ...result.node,
      props: { ...result.node.props, pathData: 'M 9,9' },
    })).toBeNull();
    expect(whiteboardNodeToSketch({ ...result.node, attrs: { ...result.node.attrs, 'fill-opacity': 'invalid' } })).toBeNull();
    expect(whiteboardNodeToSketch({ ...result.node, attrs: { ...result.node.attrs, 'fill-opacity': '1.01' } })).toBeNull();
    expect(whiteboardNodeToSketch({ ...result.node, attrs: { ...result.node.attrs, mask: 'not-a-mask-url' } })).toBeNull();
    expect(whiteboardNodeToSketch({
      ...result.node,
      props: { ...result.node.props, strokeWidth: 'not-a-number' },
    })).toBeNull();

    const rect = whiteboardSketchToNode(sketch({
      type: 'rectangle',
      path: undefined,
      props: { x: 1, y: 2, width: 3, height: 4, rx: 2 },
    }));
    expect(rect.ok).toBe(true);
    if (rect.ok) {
      expect(whiteboardNodeToSketch({ ...rect.node, props: { ...rect.node.props, ry: 5 } })).toBeNull();
    }
  });

  it('rejects malformed and unsupported records explicitly', () => {
    expect(whiteboardSketchToNode(null)).toEqual({ ok: false, reason: 'invalid-record' });
    expect(whiteboardSketchToNode({ name: 'Missing ID', type: 'path', path: 'M0 0' }))
      .toEqual({ ok: false, reason: 'missing-id' });
    expect(whiteboardSketchToNode(sketch({ type: 'image' })))
      .toEqual({ ok: false, reason: 'unsupported-type' });
    expect(whiteboardSketchToNode(sketch({ type: 'rectangle', props: { x: 1, y: 2, width: NaN, height: 4 } })))
      .toEqual({ ok: false, reason: 'invalid-geometry' });
    expect(whiteboardSketchToNode(sketch({ strokeWidth: Number.NaN })))
      .toEqual({ ok: false, reason: 'invalid-style' });
    expect(whiteboardSketchToNode(sketch({ strokeWidth: -1 })))
      .toEqual({ ok: false, reason: 'invalid-style' });
    expect(whiteboardSketchToNode(sketch({ fillOpacity: -0.01 })))
      .toEqual({ ok: false, reason: 'invalid-style' });
    expect(whiteboardSketchToNode(sketch({ fillOpacity: 1.01 })))
      .toEqual({ ok: false, reason: 'invalid-style' });
  });
});

describe('whiteboardSketchesToNodes', () => {
  it('skips already represented IDs and rejects duplicate migration identities without losing order', () => {
    const first = sketch({ id: 'first' });
    const represented = sketch({ id: 'already-in-svg' });
    const duplicate = sketch({ id: 'first', name: 'Duplicate' });
    const unsupported = sketch({ id: 'unsupported', type: 'image' });
    const batch = whiteboardSketchesToNodes(
      [first, represented, duplicate, unsupported],
      new Set([whiteboardNodeIdForSketch('already-in-svg')]),
    );

    expect(batch.nodes.map((node) => node.legacyWhiteboardSource.sourceSketch.id)).toEqual(['first']);
    expect(batch.skipped).toEqual([{
      index: 1,
      sketchId: 'already-in-svg',
      nodeId: whiteboardNodeIdForSketch('already-in-svg'),
    }]);
    expect(batch.rejected).toEqual([
      { index: 2, sketchId: 'first', reason: 'duplicate-id' },
      { index: 3, sketchId: 'unsupported', reason: 'unsupported-type' },
    ]);
  });
});

describe('whiteboardNodeToSketch fallback', () => {
  it('parses numeric-string SVG geometry, stroke width, and opacity', () => {
    const ellipse = parseSvg('<svg><ellipse cx="12" cy="13" rx="8" ry="9" stroke-width="4" fill-opacity="0.25" /></svg>').nodes[0];
    expect(whiteboardNodeToSketch(ellipse)).toEqual(expect.objectContaining({
      type: 'circle',
      strokeWidth: 4,
      fillOpacity: 0.25,
      props: { cx: 12, cy: 13, rx: 8, ry: 9 },
    }));
  });

  it('projects ordinary SVG primitives when no legacy provenance is available', () => {
    const node: Node = {
      id: 'ellipse-node',
      type: 'ellipse',
      name: 'Oval',
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
      style: { fill: '#fff', stroke: '#000' },
      props: { cx: 12, cy: 13, rx: 8, ry: 9, strokeWidth: 4 },
      attrs: { 'fill-opacity': '0.25', 'stroke-dasharray': '2 3', mask: 'url(#mask-m1)' },
    };

    expect(whiteboardNodeToSketch(node)).toEqual({
      id: 'ellipse-node',
      name: 'Oval',
      type: 'circle',
      props: { cx: 12, cy: 13, rx: 8, ry: 9 },
      color: '#000',
      strokeWidth: 4,
      fillColor: '#fff',
      fillOpacity: 0.25,
      strokeDashArray: '2 3',
      maskId: 'm1',
      locked: undefined,
    });
  });

  it('returns null for primitives outside the four-shape Whiteboard vocabulary', () => {
    const node: Node = {
      id: 'text-node',
      type: 'text',
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
      props: { textContent: 'Not a Whiteboard sketch' },
    };
    expect(whiteboardNodeToSketch(node)).toBeNull();
  });
});

describe('translateWhiteboardSketch', () => {
  it('translates rectangle geometry through Nodes and preserves provenance fields', () => {
    const source = sketch({
      id: 'moved-rect',
      name: 'Move me',
      type: 'rectangle',
      path: undefined,
      props: { x: 10, y: 20, width: 30, height: 40, rx: 6, customProp: 'keep' },
      maskId: 'mask-1',
      maskType: 'reveal',
      customLegacyField: { nested: [1, 2] },
    });
    const original = structuredClone(source);

    expect(translateWhiteboardSketch(source, 7, -3)).toEqual({
      ok: true,
      sketch: { ...source, props: { ...source.props, x: 17, y: 17 } },
    });
    expect(source).toEqual(original);
  });

  it('translates ellipse centers and endpoint-only line coordinates without adding path data', () => {
    const ellipse = sketch({
      id: 'moved-ellipse',
      type: 'circle',
      path: undefined,
      props: { cx: 25, cy: 35, rx: 12, ry: 8 },
    });
    const line = sketch({
      id: 'moved-line',
      type: 'line',
      path: undefined,
      props: { x1: 1, y1: 2, x2: 9, y2: 10, lineStyle: 'straight', customProp: 'keep' },
    });

    expect(translateWhiteboardSketch(ellipse, -4, 9)).toEqual({
      ok: true,
      sketch: { ...ellipse, props: { ...ellipse.props, cx: 21, cy: 44 } },
    });
    expect(translateWhiteboardSketch(line, 5, -2)).toEqual({
      ok: true,
      sketch: { ...line, props: { ...line.props, x1: 6, y1: 0, x2: 14, y2: 8 } },
    });
  });

  it('translates path-backed line geometry without changing arc radii or flags', () => {
    const source = sketch({
      id: 'arc-line',
      type: 'line',
      path: 'M 50,100 a50,50 0 1,0 100,0 Z',
      props: { lineStyle: 'curved', customProp: 'keep' },
      customLegacyField: 'unchanged',
    });

    expect(translateWhiteboardSketch(source, 5, 5)).toEqual({
      ok: true,
      sketch: { ...source, path: 'M55,105 a50,50,0,1,0,100,0 Z' },
    });
  });

  it('rejects malformed path geometry and invalid offsets without mutating the source', () => {
    const malformed = sketch({ path: 'M0 0 L10' });
    const original = structuredClone(malformed);

    expect(translateWhiteboardSketch(malformed, 5, 5)).toEqual({ ok: false, reason: 'invalid-path-data' });
    expect(translateWhiteboardSketch(sketch(), Number.POSITIVE_INFINITY, 1))
      .toEqual({ ok: false, reason: 'invalid-offset' });
    expect(malformed).toEqual(original);
  });

  it('preserves numeric-string legacy geometry fields when applying a Node translation', () => {
    const source = sketch({
      type: 'rectangle',
      path: undefined,
      props: { x: '10', y: '20', width: '30', height: '40' },
    });
    const result = translateWhiteboardSketch(source, 2, 3);

    expect(result).toEqual({
      ok: true,
      sketch: { ...source, props: { x: '12', y: '23', width: '30', height: '40' } },
    });
  });
});

describe('updateWhiteboardSketchGeometry', () => {
  it('updates rectangle geometry through Nodes and preserves legacy metadata and numeric-string types', () => {
    const source = sketch({
      type: 'rectangle',
      path: undefined,
      props: { x: '10', y: '20', width: '30', height: '40', rx: 6, customProp: 'keep' },
      customLegacyField: { note: 'preserve' },
    });
    const original = structuredClone(source);

    expect(updateWhiteboardSketchGeometry(source, {
      kind: 'rect', x: 12, y: 23, width: 60, height: 70,
    })).toEqual({
      ok: true,
      sketch: {
        ...source,
        props: { x: '12', y: '23', width: '60', height: '70', rx: 6, customProp: 'keep' },
      },
    });
    expect(source).toEqual(original);
  });

  it('updates ellipse radius geometry through Nodes and preserves the untouched axis', () => {
    const source = sketch({
      type: 'circle',
      path: undefined,
      props: { cx: 25, cy: 35, rx: 12, ry: '8', customProp: 'keep' },
      maskId: 'mask-ellipse',
      maskType: 'reveal',
    });

    expect(updateWhiteboardSketchGeometry(source, {
      kind: 'ellipse', cx: 25, cy: 35, rx: 20, ry: 8,
    })).toEqual({
      ok: true,
      sketch: {
        ...source,
        props: { cx: 25, cy: 35, rx: 20, ry: '8', customProp: 'keep' },
      },
    });
  });

  it('rejects mismatched, extra-key, non-finite, and too-small geometry without mutation', () => {
    const source = sketch({
      type: 'rectangle',
      path: undefined,
      props: { x: 10, y: 20, width: 30, height: 40 },
    });
    const original = structuredClone(source);

    expect(updateWhiteboardSketchGeometry(source, {
      kind: 'ellipse', cx: 10, cy: 20, rx: 30, ry: 40,
    })).toEqual({ ok: false, reason: 'unsupported-node-type' });
    expect(updateWhiteboardSketchGeometry(source, {
      kind: 'rect', x: 10, y: 20, width: 4, height: 40,
    })).toEqual({ ok: false, reason: 'invalid-geometry' });
    expect(updateWhiteboardSketchGeometry(source, {
      kind: 'rect', x: 10, y: 20, width: Number.NaN, height: 40,
    })).toEqual({ ok: false, reason: 'invalid-geometry' });
    expect(updateWhiteboardSketchGeometry(source, {
      kind: 'rect', x: 10, y: 20, width: 30, height: 40, opacity: 0.5,
    })).toEqual({ ok: false, reason: 'invalid-geometry' });
    const inheritedUpdate = Object.create({
      kind: 'rect', x: 10, y: 20, width: 30, height: 40,
    }) as object;
    expect(updateWhiteboardSketchGeometry(source, inheritedUpdate))
      .toEqual({ ok: false, reason: 'invalid-geometry' });
    let accessorWasRead = false;
    const accessorUpdate = Object.defineProperties(
      { kind: 'rect', y: 20, width: 30, height: 40 },
      { x: { enumerable: true, get: () => { accessorWasRead = true; return 10; } } },
    );
    expect(updateWhiteboardSketchGeometry(source, accessorUpdate))
      .toEqual({ ok: false, reason: 'invalid-geometry' });
    expect(accessorWasRead).toBe(false);
    expect(source).toEqual(original);
  });
});

describe('SVG serialization boundary', () => {
  it('serializes mapped SVG presentation attributes without leaking migration provenance', () => {
    const result = whiteboardSketchToNode(sketch({ maskId: 'alpha' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const svg = serializeSvg({ rootAttrs: { xmlns: 'http://www.w3.org/2000/svg' }, nodes: [result.node] });
    expect(svg).toContain('fill-opacity="0.4"');
    expect(svg).toContain('stroke-dasharray="5 2"');
    expect(svg).toContain('mask="url(#mask-alpha)"');
    expect(svg).not.toContain('legacyWhiteboardSource');

    const parsed = parseSvg(svg);
    expect(parsed.nodes[0].attrs).toMatchObject({
      'fill-opacity': '0.4',
      'stroke-dasharray': '5 2',
      mask: 'url(#mask-alpha)',
    });
    expect(parsed.nodes[0].id).toBe(result.node.id);
    expect(whiteboardNodeToSketch(parsed.nodes[0])).toEqual(expect.objectContaining({
      type: 'path',
      path: 'M 1,2 Q 5,8 9,10',
    }));
  });

  it('reverse-projects serialized rectangles, ellipses, endpoint lines, and ordinary SVG circles', () => {
    const sources = [
      sketch({ id: 'rect', type: 'rectangle', path: undefined, props: { x: 1, y: 2, width: 3, height: 4, rx: 1 } }),
      sketch({ id: 'ellipse', type: 'circle', path: undefined, props: { cx: 5, cy: 6, rx: 7, ry: 8 } }),
      sketch({ id: 'line', type: 'line', path: undefined, props: { x1: 1, y1: 2, x2: 3, y2: 4 } }),
    ];
    for (const source of sources) {
      const converted = whiteboardSketchToNode(source);
      expect(converted.ok).toBe(true);
      if (!converted.ok) continue;
      const roundTripped = parseSvg(serializeSvg({ rootAttrs: {}, nodes: [converted.node] })).nodes[0];
      const projected = whiteboardNodeToSketch(roundTripped);
      expect(projected).toEqual(expect.objectContaining({ id: source.id, type: source.type }));
      if (source.type === 'rectangle') {
        expect(projected?.props).toMatchObject({ x: 1, y: 2, width: 3, height: 4, rx: 1 });
      } else if (source.type === 'circle') {
        expect(projected?.props).toMatchObject({ cx: 5, cy: 6, rx: 7, ry: 8 });
      } else {
        expect(projected?.path).toBe('M 1,2 L 3,4');
        expect(projected?.props).toMatchObject({ x1: 1, y1: 2, x2: 3, y2: 4 });
      }
    }

    const ordinaryCircle = parseSvg('<svg><circle cx="9" cy="10" r="11" /></svg>').nodes[0];
    expect(whiteboardNodeToSketch(ordinaryCircle)).toEqual(expect.objectContaining({
      type: 'circle',
      props: { cx: 9, cy: 10, rx: 11, ry: 11 },
    }));
  });
});
