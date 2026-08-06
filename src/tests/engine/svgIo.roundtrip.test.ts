/**
 * ROUND-TRIP PROPERTY TESTS — the Phase 1 acceptance gate.
 *
 * The roadmap names this "the single most important test in the codebase". For a corpus of
 * documents covering nested groups, transforms, text, gradients and every supported element,
 * it asserts that `parse -> serialize -> parse` is stable and loses nothing.
 *
 * Each case also stands as a regression test against a specific defect in the legacy regex
 * pipeline that this engine replaces.
 */
import { describe, it, expect } from 'vitest';
import { parseSvg, serializeSvg, countNodes, findNodeById, parseTransform } from '../../engine/svgIo';

/** Corpus: every entry must survive a round trip unchanged. */
const CORPUS: Record<string, string> = {
  // --- primitives ---
  emptyDoc: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  singlePath: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10" /></svg>',
  singleRect: '<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="3" height="4" /></svg>',
  singleCircle: '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" /></svg>',
  singleEllipse: '<svg xmlns="http://www.w3.org/2000/svg"><ellipse cx="5" cy="5" rx="4" ry="2" /></svg>',
  singleLine: '<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="9" y2="9" /></svg>',
  singlePolygon: '<svg xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 5,10 10,0" /></svg>',
  singlePolyline: '<svg xmlns="http://www.w3.org/2000/svg"><polyline points="0,0 5,10" /></svg>',
  singleText: '<svg xmlns="http://www.w3.org/2000/svg"><text x="1" y="2">Forgel</text></svg>',
  singleImage: '<svg xmlns="http://www.w3.org/2000/svg"><image x="0" y="0" width="10" height="10" href="a.png" /></svg>',

  // --- viewBox and root attributes ---
  withViewBox: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M0 0" /></svg>',
  withWidthHeight:
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"><rect x="0" y="0" width="100" height="50" /></svg>',

  // --- styling ---
  fillAndStroke:
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" fill="#ff0000" stroke="#00ff00" stroke-width="3" /></svg>',
  fillNone: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" fill="none" /></svg>',
  withOpacity: '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="1" height="1" opacity="0.5" /></svg>',
  withBlendMode:
    '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="1" height="1" mix-blend-mode="multiply" /></svg>',

  // --- groups and nesting (impossible in the legacy model) ---
  simpleGroup: '<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0" /></g></svg>',
  groupWithTransform:
    '<svg xmlns="http://www.w3.org/2000/svg"><g transform="translate(10,20)"><path d="M0 0" /></g></svg>',
  nestedGroups:
    '<svg xmlns="http://www.w3.org/2000/svg"><g><g><g><path d="M0 0" /></g></g></g></svg>',
  groupWithSiblings:
    '<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0" /><rect x="1" y="1" width="2" height="2" /><circle cx="3" cy="3" r="1" /></g></svg>',
  deeplyMixed:
    '<svg xmlns="http://www.w3.org/2000/svg"><g id="outer"><path d="M0 0" /><g id="inner"><text x="0" y="0">hi</text><polygon points="0,0 1,1" /></g></g><rect x="9" y="9" width="1" height="1" /></svg>',

  // --- transforms ---
  translateOnly: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" transform="translate(5,10)" /></svg>',
  scaleOnly: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" transform="scale(2,3)" /></svg>',
  rotateOnly: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" transform="rotate(45)" /></svg>',
  combinedTransform:
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" transform="translate(5,10) rotate(45) scale(2,2)" /></svg>',
  matrixTransform:
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" transform="matrix(1,0,0,1,10,20)" /></svg>',
  skewTransform: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" transform="skewX(30)" /></svg>',
  rotateAboutPoint:
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" transform="rotate(45,50,50)" /></svg>',

  // --- gradients and defs ---
  linearGradient:
    '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient></defs><rect x="0" y="0" width="10" height="10" fill="url(#g1)" /></svg>',
  radialGradient:
    '<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g2"><stop offset="0" stop-color="#f00"/></radialGradient></defs><circle cx="5" cy="5" r="5" fill="url(#g2)" /></svg>',

  // --- attributes the legacy pipeline destroyed ---
  withId: '<svg xmlns="http://www.w3.org/2000/svg"><path id="logo-mark" d="M0 0 L5 5" /></svg>',
  idBeforeD: '<svg xmlns="http://www.w3.org/2000/svg"><path id="decoy" d="M10 10 L20 20" /></svg>',
  withClass: '<svg xmlns="http://www.w3.org/2000/svg"><path class="brand primary" d="M0 0" /></svg>',
  withDataAttrs: '<svg xmlns="http://www.w3.org/2000/svg"><path data-role="mark" data-index="3" d="M0 0" /></svg>',
  withAriaLabel: '<svg xmlns="http://www.w3.org/2000/svg"><path aria-label="brand mark" d="M0 0" /></svg>',
  withStrokeLinecap:
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" stroke-linecap="round" stroke-linejoin="bevel" /></svg>',
  withClipPath: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" clip-path="url(#c1)" /></svg>',

  // --- path data edge cases the legacy tokenizer mangled ---
  pathWithZ: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10 Z" /></svg>',
  pathWithExponent: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M1e3 0 L2e3 1e3" /></svg>',
  pathWithArc: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M50 100 a50,50 0 1,0 100,0 Z" /></svg>',
  pathWithCubic: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 C1 2 3 4 5 6" /></svg>',
  pathWithRelative: '<svg xmlns="http://www.w3.org/2000/svg"><path d="m0 0 l5 5 z" /></svg>',
  pathWithDecimals: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M-1.5 -2.25 L3.125 4.5" /></svg>',
  pathWithCommas: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L10,10" /></svg>',

  // --- structural edge cases ---
  multipleSiblings:
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /><path d="M1 1" /><path d="M2 2" /></svg>',
  mixedElementTypes:
    '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="1" height="1" /><circle cx="1" cy="1" r="1" /><text x="0" y="0">t</text><line x1="0" y1="0" x2="1" y2="1" /></svg>',
  emptyGroup: '<svg xmlns="http://www.w3.org/2000/svg"><g></g></svg>',
  textWithEntities: '<svg xmlns="http://www.w3.org/2000/svg"><text x="0" y="0">A &amp; B</text></svg>',
  attrWithGreaterThan: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" aria-label="a &gt; b" /></svg>',
  roundedRect: '<svg xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="10" height="10" rx="2" ry="2" /></svg>',
};

const CORPUS_ENTRIES = Object.entries(CORPUS);

describe('SVG round-trip corpus', () => {
  it('covers at least 50 documents', () => {
    expect(CORPUS_ENTRIES.length).toBeGreaterThanOrEqual(50);
  });

  it.each(CORPUS_ENTRIES)('parse -> serialize -> parse is stable: %s', (_name, svg) => {
    const once = serializeSvg(parseSvg(svg));
    const twice = serializeSvg(parseSvg(once));
    expect(twice).toBe(once);
  });

  it.each(CORPUS_ENTRIES)('node count is preserved: %s', (_name, svg) => {
    const first = parseSvg(svg);
    const second = parseSvg(serializeSvg(first));
    expect(countNodes(second.nodes)).toBe(countNodes(first.nodes));
  });

  it.each(CORPUS_ENTRIES)('root attributes are preserved: %s', (_name, svg) => {
    const first = parseSvg(svg);
    const second = parseSvg(serializeSvg(first));
    expect(second.rootAttrs).toEqual(first.rootAttrs);
  });

  /**
   * Stability alone is a weak property: an attribute dropped *consistently* would still
   * round-trip "stably". These two assertions compare against the ORIGINAL markup via an
   * independent DOM parse, which is what actually proves nothing is lost.
   */
  it.each(CORPUS_ENTRIES)('no element is lost versus the original: %s', (_name, svg) => {
    const elementsOf = (source: string) => {
      const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      return Array.from(doc.documentElement.querySelectorAll('*'))
        .map((el) => el.tagName.toLowerCase())
        .sort();
    };

    expect(elementsOf(serializeSvg(parseSvg(svg)))).toEqual(elementsOf(svg));
  });

  it.each(CORPUS_ENTRIES)('no attribute is lost versus the original: %s', (_name, svg) => {
    // Collects "tag@attr=value" for every element, so a dropped or altered attribute on any
    // element in the tree fails the comparison.
    const attrsOf = (source: string) => {
      const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      const out: string[] = [];
      for (const el of Array.from(doc.documentElement.querySelectorAll('*'))) {
        const tag = el.tagName.toLowerCase();
        for (const attr of Array.from(el.attributes)) {
          out.push(`${tag}@${attr.name}=${attr.value}`);
        }
      }
      return out.sort();
    };

    expect(attrsOf(serializeSvg(parseSvg(svg)))).toEqual(attrsOf(svg));
  });

  it.each(CORPUS_ENTRIES)('text content is preserved verbatim: %s', (_name, svg) => {
    const textOf = (source: string) =>
      new DOMParser().parseFromString(source, 'image/svg+xml').documentElement.textContent;

    expect(textOf(serializeSvg(parseSvg(svg)))).toBe(textOf(svg));
  });
});

describe('regressions against the legacy regex pipeline', () => {
  it('preserves id instead of letting it hijack the path data', () => {
    // Legacy: getAttr(tag, 'd') matched the tail of id="decoy" and returned "decoy".
    const doc = parseSvg(CORPUS.idBeforeD);
    expect(doc.nodes[0].props?.d).toBe('M10 10 L20 20');
    expect(doc.nodes[0].id).toBe('decoy');
  });

  it('preserves id, class, transform and opacity through an edit', () => {
    // Legacy: rebuilding the tag dropped every attribute except d/stroke/fill/stroke-width.
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><path id="mark" class="a" transform="rotate(45)" opacity="0.5" d="M0 0" /></svg>';
    const doc = parseSvg(svg);

    // Simulate an edit to the geometry, exactly what the editor does on a node drag.
    doc.nodes[0].props!.d = 'M1 1';

    const out = serializeSvg(doc);
    expect(out).toContain('id="mark"');
    expect(out).toContain('class="a"');
    expect(out).toContain('transform="rotate(45)"');
    expect(out).toContain('opacity="0.5"');
    expect(out).toContain('d="M1 1"');
  });

  it('sees non-path elements, which the legacy pipeline treated as an empty document', () => {
    const doc = parseSvg(CORPUS.mixedElementTypes);
    expect(doc.nodes.map((n) => n.type)).toEqual(['rect', 'circle', 'text', 'line']);
  });

  it('represents groups as real containers with children', () => {
    const doc = parseSvg(CORPUS.nestedGroups);
    expect(doc.nodes[0].type).toBe('group');
    expect(doc.nodes[0].children?.[0].children?.[0].children?.[0].type).toBe('path');
    expect(countNodes(doc.nodes)).toBe(4);
  });

  it('preserves a group transform, which the legacy parser discarded', () => {
    const doc = parseSvg(CORPUS.groupWithTransform);
    expect(doc.nodes[0].transform).toMatchObject({ x: 10, y: 20 });
    expect(serializeSvg(doc)).toContain('transform="translate(10,20)"');
  });

  it('does not corrupt an attribute value containing a greater-than sign', () => {
    // Legacy: `[^>]+` truncated the tag mid-attribute.
    const doc = parseSvg(CORPUS.attrWithGreaterThan);
    expect(doc.nodes[0].attrs?.['aria-label']).toBe('a > b');
  });

  it('keeps exponent notation and trailing Z intact in path data', () => {
    // Legacy: `1e3` tokenized to [1, 3] and a trailing Z was dropped entirely.
    expect(parseSvg(CORPUS.pathWithExponent).nodes[0].props?.d).toBe('M1e3 0 L2e3 1e3');
    expect(parseSvg(CORPUS.pathWithZ).nodes[0].props?.d).toBe('M0 0 L10 10 Z');
  });

  it('preserves defs so gradient references keep resolving', () => {
    const out = serializeSvg(parseSvg(CORPUS.linearGradient));
    expect(out).toContain('linearGradient');
    expect(out).toContain('id="g1"');
    expect(out).toContain('fill="url(#g1)"');
  });
});

describe('parseTransform', () => {
  it('decomposes translate', () => {
    expect(parseTransform('translate(10,20)')).toMatchObject({ x: 10, y: 20 });
  });

  it('decomposes uniform scale from a single argument', () => {
    expect(parseTransform('scale(2)')).toMatchObject({ scaleX: 2, scaleY: 2 });
  });

  it('decomposes a combined transform', () => {
    expect(parseTransform('translate(5,10) rotate(45) scale(2,3)')).toEqual({
      x: 5,
      y: 10,
      rotate: 45,
      scaleX: 2,
      scaleY: 3,
    });
  });

  it('returns null for transforms the decomposed form cannot express', () => {
    // The raw string is retained on the node, so these still round-trip losslessly.
    expect(parseTransform('matrix(1,0,0,1,10,20)')).toBeNull();
    expect(parseTransform('skewX(30)')).toBeNull();
    expect(parseTransform('rotate(45,50,50)')).toBeNull();
  });

  it('returns null for empty or absent input', () => {
    expect(parseTransform('')).toBeNull();
    expect(parseTransform(null)).toBeNull();
    expect(parseTransform(undefined)).toBeNull();
  });
});

describe('parseSvg error handling', () => {
  it('throws on malformed markup rather than returning an empty document', () => {
    // Silently returning {nodes: []} would let the editor save an empty doc over real work.
    expect(() => parseSvg('<svg><path d="M0 0"</svg>')).toThrow();
  });

  it('throws when the root element is not <svg>', () => {
    expect(() => parseSvg('<div></div>')).toThrow(/root element is not/);
  });
});

describe('tree helpers', () => {
  const doc = parseSvg(CORPUS.deeplyMixed);

  it('finds a node nested inside groups', () => {
    expect(findNodeById(doc.nodes, 'inner')?.type).toBe('group');
  });

  it('returns null for an unknown id', () => {
    expect(findNodeById(doc.nodes, 'nope')).toBeNull();
  });

  it('counts every node including nested children', () => {
    // outer(g) + path + inner(g) + text + polygon + rect
    expect(countNodes(doc.nodes)).toBe(6);
  });
});
