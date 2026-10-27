import { describe, expect, it } from 'vitest';
import type { Node, WhiteboardSketch } from '../../types';
import { parseSvg, serializeSvg } from '../../engine/svgIo';
import {
  WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE,
  whiteboardSketchToNode,
} from '../../engine/whiteboardNodeAdapter';
import {
  type WhiteboardProjectMigrationInput,
  previewWhiteboardProjectMigration,
} from '../../engine/whiteboardProjectMigration';

const identity = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 };

function pathNode(id: string, d = 'M 0,0'): Node {
  return { id, type: 'path', name: id, transform: { ...identity }, props: { d } };
}

function sketch(id: string): WhiteboardSketch {
  return { id, name: `Sketch ${id}`, type: 'path', path: 'M 1,1 L 2,2' };
}

function project(overrides: Partial<WhiteboardProjectMigrationInput> = {}): WhiteboardProjectMigrationInput {
  return {
    id: 'project-1',
    sceneGraph: [],
    svgSource: null,
    whiteboardSketches: [],
    ...overrides,
  };
}

function hasBlocker(report: ReturnType<typeof previewWhiteboardProjectMigration>, code: string): boolean {
  return report.blockers.some((blocker) => blocker.code === code);
}

describe('previewWhiteboardProjectMigration', () => {
  it('creates a read-only proposal from svgSource while preserving root attributes and defs', () => {
    const input = project({
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><clipPath id="clip"><rect x="0" y="0" width="5" height="5" /></clipPath></defs><path id="logo" d="M 0,0" /></svg>',
      whiteboardSketches: [sketch('one')],
    });
    const before = structuredClone(input);

    const report = previewWhiteboardProjectMigration(input);

    expect(report.status).toBe('ready');
    expect(report.documentSource).toBe('svgSource');
    expect(report.currentNodeCount).toBe(1);
    expect(report.additions.map((node) => node.id)).toEqual(['whiteboard-one']);
    expect(report.proposedDocument?.rootAttrs.viewBox).toBe('0 0 10 10');
    expect(report.proposedDocument?.defs).toContain('clipPath');
    expect(report.proposedDocument?.nodes.map((node) => node.id)).toEqual(['logo', 'whiteboard-one']);
    expect(report.writesPerformed).toBe(false);
    expect(report.persistenceReady).toBe(false);
    expect(input).toEqual(before);
  });

  it('preserves authored generated-looking IDs in cloned proposals', () => {
    const report = previewWhiteboardProjectMigration(project({
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg"><path id="n0" d="M 0,0" /></svg>',
      whiteboardSketches: [sketch('new')],
    }));
    expect(report.status).toBe('ready');
    expect(serializeSvg(report.proposedDocument!)).toContain('id="n0"');
  });

  it('preserves generated-looking IDs conservatively in sceneGraph-only projects', () => {
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [pathNode('n0')],
      whiteboardSketches: [sketch('new')],
    }));
    expect(report.status).toBe('ready');
    expect(serializeSvg(report.proposedDocument!)).toContain('id="n0"');
  });

  it('preserves the valid XML attribute name __proto__ in root and node maps', () => {
    const report = previewWhiteboardProjectMigration(project({
      svgSource: '<svg xmlns="http://www.w3.org/2000/svg" __proto__="root-value"><path id="p" d="M 0,0" __proto__="node-value" /></svg>',
      whiteboardSketches: [sketch('new')],
    }));
    expect(report.status).toBe('ready');
    expect(Object.getOwnPropertyDescriptor(report.proposedDocument!.rootAttrs, '__proto__')?.value).toBe('root-value');
    expect(Object.getOwnPropertyDescriptor(report.proposedDocument!.nodes[0].attrs!, '__proto__')?.value).toBe('node-value');
    expect(serializeSvg(report.proposedDocument!)).toContain('__proto__="root-value"');
    expect(serializeSvg(report.proposedDocument!)).toContain('__proto__="node-value"');
  });

  it('fails closed on top-level project accessors and revoked proxy inputs', () => {
    let getterRan = false;
    for (const key of ['id', 'sceneGraph', 'whiteboardSketches', 'svgSource'] as const) {
      const input = project() as Record<string, unknown>;
      Object.defineProperty(input, key, { get: () => { getterRan = true; throw new Error('must not run'); }, enumerable: true });
      const report = previewWhiteboardProjectMigration(input as unknown as WhiteboardProjectMigrationInput);
      expect(report.status).toBe('blocked');
      expect(hasBlocker(report, 'invalid-project')).toBe(true);
    }
    const trappedProject = new Proxy(project(), {
      getOwnPropertyDescriptor: (target, key) => key === 'id'
        ? (() => { throw new Error('must be contained'); })()
        : Reflect.getOwnPropertyDescriptor(target, key),
    });
    expect(previewWhiteboardProjectMigration(trappedProject).status).toBe('blocked');

    const revokedProject = Proxy.revocable({}, {});
    revokedProject.revoke();
    const revokedSceneGraph = Proxy.revocable([], {});
    revokedSceneGraph.revoke();
    const revokedSketches = Proxy.revocable([], {});
    revokedSketches.revoke();
    expect(previewWhiteboardProjectMigration(revokedProject.proxy as unknown as WhiteboardProjectMigrationInput).status).toBe('blocked');
    expect(previewWhiteboardProjectMigration(project({ sceneGraph: revokedSceneGraph.proxy as unknown as Node[] })).status).toBe('blocked');
    expect(previewWhiteboardProjectMigration(project({ whiteboardSketches: revokedSketches.proxy as unknown as WhiteboardSketch[] })).status).toBe('blocked');
    expect(getterRan).toBe(false);
  });

  it('uses sceneGraph as the base when svgSource is absent', () => {
    const input = project({ sceneGraph: [pathNode('existing')], whiteboardSketches: [sketch('new')] });
    const report = previewWhiteboardProjectMigration(input);

    expect(report.status).toBe('ready');
    expect(report.documentSource).toBe('sceneGraph');
    expect(report.proposedDocument?.nodes.map((node) => node.id)).toEqual(['existing', 'whiteboard-new']);
  });

  it('accepts equivalent populated sceneGraph and svgSource documents', () => {
    const svgSource = '<svg viewBox="0 0 10 10"><path id="same" d="M 0,0" /></svg>';
    const parsed = parseSvg(svgSource);
    const report = previewWhiteboardProjectMigration(project({
      svgSource,
      sceneGraph: structuredClone(parsed.nodes),
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('ready');
    expect(report.documentSource).toBe('svgSource');
    expect(hasBlocker(report, 'document-source-conflict')).toBe(false);
  });

  it('blocks divergent document sources rather than preferring or discarding one', () => {
    const report = previewWhiteboardProjectMigration(project({
      svgSource: '<svg><path id="svg-path" d="M 0,0" /></svg>',
      sceneGraph: [pathNode('different-path')],
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'document-source-conflict')).toBe(true);
  });

  it('blocks malformed sceneGraph fields that the SVG serializer ignores or changes', () => {
    const malformedNodes = [
      { ...pathNode('bad-props'), props: { d: { unexpected: true } } },
      { ...pathNode('bad-lock'), locked: 'false' },
      { ...pathNode('bad-visibility'), visible: 'false' },
      { ...pathNode('bad-meta'), meta: { createdBy: 'legacy', timestamp: 'now' } },
      { ...pathNode('bad-blend'), style: { blendMode: '' } },
      { ...pathNode('bad-opacity'), style: { opacity: 1.5 } },
      { ...pathNode('bad-extra'), extraField: { payload: true } },
    ] as unknown as Node[];

    for (const node of malformedNodes) {
      const report = previewWhiteboardProjectMigration(project({ sceneGraph: [node], whiteboardSketches: [sketch('new')] }));
      expect(report.status, node.id).toBe('blocked');
      expect(report.proposedDocument, node.id).toBeNull();
      expect(hasBlocker(report, 'invalid-scene-graph'), node.id).toBe(true);
    }
  });

  it('requires provenance when legacy fields cannot be reconstructed exactly', () => {
    const sources: unknown[] = [
      { ...sketch('null-props'), props: null },
      { ...sketch('empty-props'), props: {} },
      { ...sketch('empty-mask'), maskId: '' },
      { id: 'endpoint-line', name: 'Endpoint line', type: 'line', props: { x1: 0, y1: 0, x2: 1, y2: 1 } },
    ];
    for (const source of sources) {
      const conversion = whiteboardSketchToNode(source);
      if (conversion.ok === false || typeof source !== 'object' || source === null || !('id' in source)) throw new Error('Test fixture must convert');
      const node = structuredClone(conversion.node) as Node & { legacyWhiteboardSource?: unknown };
      delete node.legacyWhiteboardSource;
      const report = previewWhiteboardProjectMigration(project({ sceneGraph: [node], whiteboardSketches: [source as WhiteboardSketch] }));
      expect(report.status, String(source.id)).toBe('blocked');
      expect(hasBlocker(report, 'reserved-node-id-collision'), String(source.id)).toBe(true);
    }
  });

  it('blocks noncanonical array properties that JSON persistence would discard', () => {
    const metadata = [] as unknown as unknown[] & Record<string, unknown>;
    metadata['01'] = 'lost';
    const source = { ...sketch('array-extra'), metadata } as unknown as WhiteboardSketch;
    const input = project({ whiteboardSketches: [source] });
    const report = previewWhiteboardProjectMigration(input);
    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-whiteboard-sketches')).toBe(true);
  });

  it('blocks sparse or extra-key Whiteboard, sceneGraph, and child collections', () => {
    const sketchesWithExtra = [sketch('one')] as unknown as WhiteboardSketch[] & Record<string, unknown>;
    sketchesWithExtra['01'] = sketch('discarded');
    const sketchExtraReport = previewWhiteboardProjectMigration(project({ whiteboardSketches: sketchesWithExtra }));

    const sparseSketches = [sketch('one')];
    sparseSketches.length = 2;
    const sparseSketchReport = previewWhiteboardProjectMigration(project({ whiteboardSketches: sparseSketches }));

    const nodesWithExtra = [pathNode('existing')] as unknown as Node[] & Record<string, unknown>;
    nodesWithExtra['01'] = pathNode('discarded');
    const sceneGraphReport = previewWhiteboardProjectMigration(project({ sceneGraph: nodesWithExtra, whiteboardSketches: [sketch('new')] }));

    const sparseChildren = [pathNode('child')];
    sparseChildren.length = 2;
    const extraKeyChildren = [pathNode('child-extra')];
    Object.defineProperty(extraKeyChildren, '01', { value: pathNode('discarded'), enumerable: true });
    const symbolChildren = [pathNode('child-symbol')];
    Object.defineProperty(symbolChildren, Symbol('discarded'), { value: pathNode('discarded'), enumerable: false });
    let childGetterRan = false;
    const accessorChildren: Node[] = [];
    Object.defineProperty(accessorChildren, '0', {
      get: () => { childGetterRan = true; return pathNode('getter-child'); }, enumerable: true, configurable: true,
    });
    const childReports = [sparseChildren, extraKeyChildren, symbolChildren, accessorChildren].map((children) =>
      previewWhiteboardProjectMigration(project({
        sceneGraph: [{ id: 'parent', type: 'group', transform: { ...identity }, children }],
        whiteboardSketches: [sketch('new')],
      })),
    );

    for (const report of [sketchExtraReport, sparseSketchReport]) {
      expect(report.status).toBe('blocked');
      expect(report.proposedDocument).toBeNull();
      expect(hasBlocker(report, 'invalid-whiteboard-sketches')).toBe(true);
    }
    for (const report of [sceneGraphReport, ...childReports]) {
      expect(report.status).toBe('blocked');
      expect(report.proposedDocument).toBeNull();
      expect(hasBlocker(report, 'invalid-scene-graph')).toBe(true);
    }
    expect(childGetterRan).toBe(false);
  });

  it('blocks cyclic and non-JSON migration provenance before comparison or proposal', () => {
    const source = sketch('bad-provenance');
    const conversion = whiteboardSketchToNode(source);
    if (conversion.ok === false) throw new Error('Test fixture must convert');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const malformed = structuredClone(conversion.node) as Node & { legacyWhiteboardSource?: unknown };
    malformed.legacyWhiteboardSource = { version: 1, sourceSketch: { ...source, metadata: circular } };
    const report = previewWhiteboardProjectMigration(project({ sceneGraph: [malformed], whiteboardSketches: [source] }));
    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-scene-graph')).toBe(true);
  });

  it('blocks duplicate existing node IDs', () => {
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [pathNode('duplicate'), pathNode('duplicate', 'M 2,2')],
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'duplicate-node-id')).toBe(true);
  });

  it('skips an already-migrated sketch only when the reserved node actually matches it', () => {
    const source = sketch('existing');
    const conversion = whiteboardSketchToNode(source);
    if (conversion.ok === false) throw new Error('Test fixture must convert');
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [conversion.node],
      whiteboardSketches: [source],
    }));

    expect(report.status).toBe('already-migrated');
    expect(report.additions).toHaveLength(0);
    expect(report.skipped).toEqual([{ index: 0, sketchId: 'existing', nodeId: 'whiteboard-existing' }]);
  });

  it('blocks an unrelated or mismatched node that collides with a reserved Whiteboard ID', () => {
    const mismatch = previewWhiteboardProjectMigration(project({
      sceneGraph: [pathNode('whiteboard-existing', 'M 99,99')],
      whiteboardSketches: [sketch('existing')],
    }));
    const groupCollision: Node = {
      id: 'whiteboard-existing', type: 'group', transform: { ...identity }, children: [],
    };
    const wrongType = previewWhiteboardProjectMigration(project({
      sceneGraph: [groupCollision],
      whiteboardSketches: [sketch('existing')],
    }));

    for (const report of [mismatch, wrongType]) {
      expect(report.status).toBe('blocked');
      expect(report.proposedDocument).toBeNull();
      expect(hasBlocker(report, 'reserved-node-id-collision')).toBe(true);
    }
  });

  it('resolves reserved sketch identities through stable-node markers and blocks marker collisions', () => {
    const source = sketch('stable-alias');
    const conversion = whiteboardSketchToNode(source);
    if (conversion.ok === false) throw new Error('Test fixture must convert');
    const aliasedNode = {
      ...conversion.node,
      id: 'authored-svg-id',
      attrs: { ...conversion.node.attrs, 'data-logoforge-node-id': 'whiteboard-stable-alias' },
    };
    const accepted = previewWhiteboardProjectMigration(project({ sceneGraph: [aliasedNode], whiteboardSketches: [source] }));
    expect(accepted.status).toBe('already-migrated');
    expect(accepted.skipped).toEqual([{ index: 0, sketchId: 'stable-alias', nodeId: 'whiteboard-stable-alias' }]);

    const collision = previewWhiteboardProjectMigration(project({
      sceneGraph: [{ ...pathNode('authored-svg-id', 'M 99,99'), attrs: { 'data-logoforge-node-id': 'whiteboard-stable-alias' } }],
      whiteboardSketches: [source],
    }));
    expect(collision.status).toBe('blocked');
    expect(hasBlocker(collision, 'reserved-node-id-collision')).toBe(true);
  });

  it('blocks duplicate stable-node marker identities', () => {
    const stableMarker = 'whiteboard-collision';
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [
        { ...pathNode('first'), attrs: { 'data-logoforge-node-id': stableMarker } },
        { ...pathNode('second'), attrs: { 'data-logoforge-node-id': stableMarker } },
      ],
      whiteboardSketches: [sketch('collision')],
    }));
    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'duplicate-stable-node-marker')).toBe(true);
  });

  it('blocks a linked sketch when a separate Node also claims its reserved identity', () => {
    const linkedNode = { ...pathNode('authored-linked-path', 'M 1,1 L 2,2'), attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-1' } };
    const collisions = [
      pathNode('whiteboard-shared-wb-1', 'M 9,9'),
      { ...pathNode('authored-reserved-alias', 'M 9,9'), attrs: { 'data-logoforge-node-id': 'whiteboard-shared-wb-1' } },
    ];
    for (const collision of collisions) {
      const report = previewWhiteboardProjectMigration(project({
        sceneGraph: [linkedNode, collision],
        whiteboardSketches: [sketch('shared-wb-1')],
      }));
      expect(report.status).toBe('blocked');
      expect(report.proposedDocument).toBeNull();
      expect(hasBlocker(report, 'reserved-node-id-collision')).toBe(true);
    }

    const sameNode = previewWhiteboardProjectMigration(project({
      sceneGraph: [{ ...linkedNode, id: 'whiteboard-shared-wb-1' }],
      whiteboardSketches: [sketch('shared-wb-1')],
    }));
    expect(sameNode.status).toBe('already-migrated');
  });

  it('skips a sketch already linked to an existing SVG node by the shared marker', () => {
    const linkedNode = { ...pathNode('original-svg-path', 'M 1,1 L 2,2'), attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-1' } };
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [linkedNode],
      whiteboardSketches: [sketch('shared-wb-1')],
    }));

    expect(report.status).toBe('already-migrated');
    expect(report.additions).toHaveLength(0);
    expect(report.skipped).toEqual([{ index: 0, sketchId: 'shared-wb-1', nodeId: 'original-svg-path' }]);
  });

  it('blocks duplicate sketch IDs even if a matching node already exists', () => {
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [pathNode('whiteboard-duplicate')],
      whiteboardSketches: [sketch('duplicate'), sketch('duplicate')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'duplicate-sketch-id')).toBe(true);
  });

  it('blocks the whole proposal when any sketch is unsupported', () => {
    const report = previewWhiteboardProjectMigration(project({
      whiteboardSketches: [sketch('supported'), { ...sketch('unsupported'), type: 'image' } as unknown as WhiteboardSketch],
    }));

    expect(report.status).toBe('blocked');
    expect(report.additions).toHaveLength(1);
    expect(report.rejected).toEqual([{ index: 1, sketchId: 'unsupported', reason: 'unsupported-type' }]);
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'unmigratable-sketch')).toBe(true);
  });

  it('blocks SVG markup that the node parser would otherwise drop', () => {
    const report = previewWhiteboardProjectMigration(project({
      svgSource: '<svg><foreignObject><div>embedded content</div></foreignObject></svg>',
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'unsupported-svg-markup')).toBe(true);
  });

  it('blocks malformed interpreted SVG attribute values that the parser drops or corrupts', () => {
    const malformedAttributes = [
      'opacity="bogus"',
      'data-locked="false"',
      'data-visible="true"',
      'stroke-width="bogus"',
      'transform=""',
      'id=""',
      'mix-blend-mode=""',
    ];

    for (const attribute of malformedAttributes) {
      const report = previewWhiteboardProjectMigration(project({
        svgSource: `<svg><path ${attribute} d="M 0,0" /></svg>`,
        whiteboardSketches: [sketch('new')],
      }));
      expect(report.status, attribute).toBe('blocked');
      expect(report.proposedDocument, attribute).toBeNull();
      expect(hasBlocker(report, 'lossy-svg-attribute'), attribute).toBe(true);
    }
  });

  it('blocks comments outside defs rather than losing them during a future serialization', () => {
    const report = previewWhiteboardProjectMigration(project({
      svgSource: '<svg><!-- authored note --><path d="M 0,0" /></svg>',
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('blocked');
    expect(hasBlocker(report, 'unsupported-svg-markup')).toBe(true);
  });

  it('reports malformed SVG without falling back to a different populated sceneGraph', () => {
    const report = previewWhiteboardProjectMigration(project({
      svgSource: '<svg><path></svg>',
      sceneGraph: [pathNode('existing')],
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.documentSource).toBe('unavailable');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-svg-source')).toBe(true);
  });

  it('blocks existing non-string fill data that the SVG serializer cannot preserve', () => {
    const gradientNode = { ...pathNode('gradient'), style: { fill: { type: 'linearGradient' } } } as unknown as Node;
    const report = previewWhiteboardProjectMigration(project({ sceneGraph: [gradientNode], whiteboardSketches: [sketch('new')] }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-scene-graph')).toBe(true);
  });

  it('blocks non-plain Nodes, symbols, accessors, and unsafe provenance without invoking getters', () => {
    let getterRan = false;
    const accessorNode = pathNode('getter-node');
    Object.defineProperty(accessorNode, 'name', { get: () => { getterRan = true; throw new Error('must not run'); }, enumerable: true });

    const accessorProps: Record<string, unknown> = {};
    Object.defineProperty(accessorProps, 'd', { get: () => { getterRan = true; throw new Error('must not run'); }, enumerable: true });
    const propsNode = { ...pathNode('getter-props'), props: accessorProps } as unknown as Node;

    const symbolNode = pathNode('symbol-node');
    Object.defineProperty(symbolNode, Symbol('unserialized'), { value: 'lost', enumerable: false });

    class CustomNode {
      id = 'class-node';
      type = 'path' as const;
      transform = { ...identity };
      props = { d: 'M 0,0' };
    }

    const provenanceGetter: Record<string, unknown> = {};
    Object.defineProperty(provenanceGetter, 'sourceSketch', {
      get: () => { getterRan = true; throw new Error('must not run'); }, enumerable: true,
    });
    const provenanceNode = { ...pathNode('getter-provenance'), legacyWhiteboardSource: provenanceGetter } as unknown as Node;

    const nestedMetadata: unknown[] = [];
    Object.defineProperty(nestedMetadata, '0', { get: () => { getterRan = true; throw new Error('must not run'); }, enumerable: true, configurable: true });
    const nestedSource = { ...sketch('nested-getter'), metadata: nestedMetadata };
    const nestedProvenanceNode = {
      ...pathNode('nested-provenance'),
      legacyWhiteboardSource: { version: 1, sourceSketch: nestedSource },
    } as unknown as Node;

    const invalidNodes: unknown[] = [
      accessorNode, propsNode, symbolNode, new CustomNode(),
      { id: 'custom-parent', type: 'group', transform: { ...identity }, children: [new CustomNode()] },
      provenanceNode, nestedProvenanceNode,
    ];
    for (const node of invalidNodes) {
      const report = previewWhiteboardProjectMigration(project({ sceneGraph: [node as Node], whiteboardSketches: [sketch('new')] }));
      expect(report.status).toBe('blocked');
      expect(report.proposedDocument).toBeNull();
      expect(hasBlocker(report, 'invalid-scene-graph')).toBe(true);
    }
    expect(getterRan).toBe(false);
  });

  it('blocks a sceneGraph that is not an array of valid Nodes', () => {
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [{ id: 'broken', type: 'path', transform: null } as unknown as Node],
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-scene-graph')).toBe(true);
  });

  it('is deterministic and does not mutate project input across repeated previews', () => {
    const input = project({
      sceneGraph: [pathNode('existing')],
      whiteboardSketches: [sketch('new')],
    });
    const before = structuredClone(input);

    const first = previewWhiteboardProjectMigration(input);
    const second = previewWhiteboardProjectMigration(input);

    expect(second).toEqual(first);
    expect(input).toEqual(before);
    expect(first.writesPerformed).toBe(false);
    expect(first.persistenceReady).toBe(false);
  });

  it('blocks linked paths with root-inherited or path-local presentation contexts', () => {
    const marker = `data-logoforge-shared-whiteboard-id="shared-wb-1"`;
    const cases = [
      `<svg xmlns="http://www.w3.org/2000/svg" fill="red"><path id="linked" d="M 1,1 L 2,2" ${marker} /></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><path id="linked" d="M 1,1 L 2,2" opacity="0" ${marker} /></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><path id="linked" d="M 1,1 L 2,2" display="none" ${marker} /></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><path id="linked" d="M 1,1 L 2,2" visibility="hidden" ${marker} /></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><path id="linked" d="M 1,1 L 2,2" style="opacity:0" ${marker} /></svg>`,
      `<svg xmlns="http://www.w3.org/2000/svg"><defs><style>path { opacity: 0 }</style></defs><path id="linked" d="M 1,1 L 2,2" ${marker} /></svg>`,
    ];
    for (const svgSource of cases) {
      const report = previewWhiteboardProjectMigration(project({ svgSource, whiteboardSketches: [sketch('shared-wb-1')] }));
      expect(report.status).toBe('blocked');
      expect(report.proposedDocument).toBeNull();
      expect(hasBlocker(report, 'invalid-shared-link-representation')).toBe(true);
    }
  });

  it('blocks a matching shared path under a transformed ancestor group', () => {
    const markedPath = { ...pathNode('nested-link', 'M 1,1 L 2,2'), attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-1' } };
    const group: Node = {
      id: 'translated-parent', type: 'group', transform: { ...identity, x: 5 }, children: [markedPath],
    };
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [group],
      whiteboardSketches: [sketch('shared-wb-1')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-shared-link-representation')).toBe(true);
  });

  it('blocks a shared-link marker attached to a non-path node', () => {
    const markedGroup: Node = {
      id: 'marked-group', type: 'group', transform: { ...identity },
      attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-1' }, children: [pathNode('child', 'M 1,1 L 2,2')],
    };
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [markedGroup],
      whiteboardSketches: [sketch('shared-wb-1')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-shared-link-representation')).toBe(true);
  });

  it('blocks a marked path whose geometry differs from its Whiteboard sketch', () => {
    const markedPath = { ...pathNode('linked-path', 'M 9,9 L 10,10'), attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-1' } };
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [markedPath],
      whiteboardSketches: [sketch('shared-wb-1')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-shared-link-representation')).toBe(true);
  });

  it('blocks a shared-link marker whose legacy sketch is missing', () => {
    const orphan = { ...pathNode('orphaned-link'), attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-missing' } };
    const report = previewWhiteboardProjectMigration(project({ sceneGraph: [orphan] }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'orphan-shared-link-marker')).toBe(true);
  });

  it('blocks duplicate shared-link markers for the same legacy sketch', () => {
    const first = { ...pathNode('linked-a'), attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-dup' } };
    const second = { ...pathNode('linked-b'), attrs: { [WHITEBOARD_SHARED_SKETCH_LINK_ATTRIBUTE]: 'shared-wb-dup' } };
    const report = previewWhiteboardProjectMigration(project({
      sceneGraph: [first, second],
      whiteboardSketches: [sketch('shared-wb-dup')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'duplicate-shared-link-marker')).toBe(true);
  });

  it('blocks a malformed top-level Whiteboard collection', () => {
    const report = previewWhiteboardProjectMigration(project({
      whiteboardSketches: 'not-an-array' as unknown as WhiteboardSketch[],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'invalid-whiteboard-sketches')).toBe(true);
  });

  it('blocks multiple root defs blocks because the SVG parser retains only one', () => {
    const report = previewWhiteboardProjectMigration(project({
      svgSource: '<svg><defs><clipPath id="a" /></defs><defs><mask id="b" /></defs></svg>',
      whiteboardSketches: [sketch('new')],
    }));

    expect(report.status).toBe('blocked');
    expect(report.proposedDocument).toBeNull();
    expect(hasBlocker(report, 'unsupported-svg-markup')).toBe(true);
  });

  it('returns an empty no-op preview when there is no legacy or shared artwork', () => {
    const report = previewWhiteboardProjectMigration(project());

    expect(report.status).toBe('already-migrated');
    expect(report.documentSource).toBe('empty');
    expect(report.proposedDocument?.nodes).toEqual([]);
    expect(report.writesPerformed).toBe(false);
  });
});
