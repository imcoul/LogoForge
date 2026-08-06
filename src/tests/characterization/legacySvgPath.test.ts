/**
 * CHARACTERIZATION TESTS — legacy regex SVG pipeline.
 *
 * These tests pin the CURRENT behaviour of `src/engine/legacySvgPath.ts`, including its
 * known bugs. They are not a specification of correct behaviour.
 *
 * Purpose: Phase 1 of the roadmap replaces this regex pipeline with a real DOMParser-based
 * engine. Tests marked `KNOWN BUG` document behaviour that the replacement is expected to
 * FIX — when they start failing during Phase 1, that is the signal the fix landed, and the
 * assertion should be updated to the correct value at that point.
 *
 * See plans/2026-08-05-000000--forgel-mobile-first-design-tool-roadmap.md section 1.4.
 */
import { describe, it, expect } from 'vitest';
import {
  getAttr,
  parseViewBoxWidth,
  parsePathTags,
  tokenizePathData,
  serializePathNodes,
  replacePathAtIndex,
} from '../../engine/legacySvgPath';

describe('getAttr', () => {
  it('reads a quoted attribute value', () => {
    expect(getAttr('d="M0 0 L10 10" fill="red"', 'fill', 'none')).toBe('red');
  });

  it('returns the fallback when the attribute is absent', () => {
    expect(getAttr('d="M0 0"', 'stroke', 'none')).toBe('none');
  });

  it('KNOWN BUG: matching is unanchored, so `d` also matches the tail of `id`', () => {
    // The regex is `d="([^"]*)"`, which finds `d="x"` inside `id="x"` first.
    // Correct behaviour would return 'M0 0'.
    expect(getAttr('id="x" d="M0 0"', 'd', '')).toBe('x');
  });

  it('reads the real value when no decoy attribute precedes it', () => {
    expect(getAttr('d="M0 0" id="x"', 'd', '')).toBe('M0 0');
  });
});

describe('parseViewBoxWidth', () => {
  it('extracts the width (third component) of a well-formed viewBox', () => {
    expect(parseViewBoxWidth('<svg viewBox="0 0 512 512"></svg>')).toBe(512);
  });

  it('tolerates irregular whitespace', () => {
    expect(parseViewBoxWidth('<svg viewBox="  0   0   256   128  "></svg>')).toBe(256);
  });

  it('returns null when there is no viewBox', () => {
    expect(parseViewBoxWidth('<svg width="100"></svg>')).toBeNull();
  });

  it('returns null when the viewBox does not have exactly four parts', () => {
    expect(parseViewBoxWidth('<svg viewBox="0 0 512"></svg>')).toBeNull();
  });

  it('returns null for a non-positive width', () => {
    expect(parseViewBoxWidth('<svg viewBox="0 0 0 512"></svg>')).toBeNull();
    expect(parseViewBoxWidth('<svg viewBox="0 0 -5 512"></svg>')).toBeNull();
  });

  it('KNOWN LIMITATION: comma-separated viewBox values are not supported', () => {
    // SVG permits `viewBox="0,0,512,512"`. The split is on whitespace only.
    expect(parseViewBoxWidth('<svg viewBox="0,0,512,512"></svg>')).toBeNull();
  });
});

describe('parsePathTags', () => {
  it('parses a single path with all presentation attributes', () => {
    const svg = '<svg><path d="M0 0 L10 10" stroke="#f00" fill="#00f" stroke-width="4" /></svg>';
    expect(parsePathTags(svg)).toEqual([
      {
        index: 0,
        raw: '<path d="M0 0 L10 10" stroke="#f00" fill="#00f" stroke-width="4" />',
        d: 'M0 0 L10 10',
        stroke: '#f00',
        fill: '#00f',
        strokeWidth: 4,
      },
    ]);
  });

  it('applies documented defaults when attributes are missing', () => {
    const parsed = parsePathTags('<svg><path d="M0 0" /></svg>');
    expect(parsed[0].stroke).toBe('none');
    expect(parsed[0].fill).toBe('none');
    expect(parsed[0].strokeWidth).toBe(2);
  });

  it('falls back to strokeWidth 2 when stroke-width is unparseable', () => {
    const parsed = parsePathTags('<svg><path d="M0 0" stroke-width="abc" /></svg>');
    expect(parsed[0].strokeWidth).toBe(2);
  });

  it('indexes multiple paths in document order', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /><path d="M2 2" /></svg>';
    const parsed = parsePathTags(svg);
    expect(parsed.map((p) => p.d)).toEqual(['M0 0', 'M1 1', 'M2 2']);
    expect(parsed.map((p) => p.index)).toEqual([0, 1, 2]);
  });

  it('returns an empty list for a document with no paths', () => {
    expect(parsePathTags('<svg></svg>')).toEqual([]);
  });

  it('KNOWN LIMITATION: non-path elements are invisible to the editor', () => {
    // A design made of rects/circles/text parses as an empty document.
    const svg = '<svg><rect width="10" height="10"/><circle r="5"/><text>hi</text></svg>';
    expect(parsePathTags(svg)).toEqual([]);
  });

  it('KNOWN LIMITATION: paths nested in groups lose their group transform context', () => {
    // The path is found, but the enclosing <g transform> is neither parsed nor preserved.
    const svg = '<svg><g transform="translate(10,10)"><path d="M0 0" /></g></svg>';
    const parsed = parsePathTags(svg);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].raw).not.toContain('translate');
  });

  it('KNOWN BUG: a `>` inside an attribute value truncates the tag match', () => {
    // `[^>]+` stops at the first `>`, even inside a quoted value.
    const svg = '<svg><path d="M0 0" aria-label="a > b" /></svg>';
    const parsed = parsePathTags(svg);
    expect(parsed[0].raw).toBe('<path d="M0 0" aria-label="a >');
  });

  it('KNOWN BUG: an `id` attribute before `d` hijacks the parsed path data', () => {
    // Consequence of the getAttr quirk above — the path renders as garbage.
    const parsed = parsePathTags('<svg><path id="logo" d="M0 0 L5 5" /></svg>');
    expect(parsed[0].d).toBe('logo');
  });
});

describe('tokenizePathData', () => {
  it('splits commands and their numeric values', () => {
    expect(tokenizePathData('M0 0 L10 10')).toEqual([
      { id: 0, type: 'M', values: [0, 0] },
      { id: 1, type: 'L', values: [10, 10] },
    ]);
  });

  it('handles cubic curves with six values', () => {
    const nodes = tokenizePathData('M0 0 C1 2 3 4 5 6');
    expect(nodes[1]).toEqual({ id: 1, type: 'C', values: [1, 2, 3, 4, 5, 6] });
  });

  it('parses negative and decimal values', () => {
    expect(tokenizePathData('M-1.5 -2.25')[0].values).toEqual([-1.5, -2.25]);
  });

  it('preserves lowercase (relative) command letters', () => {
    expect(tokenizePathData('m0 0 l5 5').map((n) => n.type)).toEqual(['m', 'l']);
  });

  it('returns an empty list for an empty path', () => {
    expect(tokenizePathData('')).toEqual([]);
  });

  it('KNOWN BUG: exponent notation is mis-tokenized', () => {
    // `e` is excluded from the command class AND from the number pattern, so `1e3`
    // becomes two separate values rather than the single number 1000.
    expect(tokenizePathData('M1e3 0')[0].values).toEqual([1, 3, 0]);
  });

  it('KNOWN LIMITATION: a trailing Z command is dropped', () => {
    // Z carries no values, so it never gets flushed into the node list and the
    // closed-subpath information is lost on the next serialize.
    const nodes = tokenizePathData('M0 0 L10 10 Z');
    expect(nodes.map((n) => n.type)).toEqual(['M', 'L']);
  });
});

describe('serializePathNodes', () => {
  it('joins values with commas and nodes with spaces', () => {
    expect(
      serializePathNodes([
        { id: 0, type: 'M', values: [0, 0] },
        { id: 1, type: 'L', values: [10, 10] },
      ]),
    ).toBe('M0,0 L10,10');
  });

  it('returns an empty string for no nodes', () => {
    expect(serializePathNodes([])).toBe('');
  });

  it('round-trips a simple absolute path through tokenize -> serialize', () => {
    const nodes = tokenizePathData('M0 0 L10 10 C1 2 3 4 5 6');
    expect(serializePathNodes(nodes)).toBe('M0,0 L10,10 C1,2,3,4,5,6');
  });

  it('is stable across a second round trip', () => {
    const once = serializePathNodes(tokenizePathData('M0 0 L10 10'));
    const twice = serializePathNodes(tokenizePathData(once));
    expect(twice).toBe(once);
  });
});

describe('replacePathAtIndex', () => {
  const parsed = (svg: string, i = 0) => parsePathTags(svg)[i];

  it('rewrites only the targeted path', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    const out = replacePathAtIndex(svg, 1, parsed(svg, 1), 'M9,9');
    expect(out).toContain('<path d="M0 0" />');
    expect(out).toContain('d="M9,9"');
  });

  it('emits fill="none" when the source had no fill', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    expect(replacePathAtIndex(svg, 0, parsed(svg), 'M1,1')).toContain('fill="none"');
  });

  it('omits stroke and stroke-width when stroke is none', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    const out = replacePathAtIndex(svg, 0, parsed(svg), 'M1,1');
    expect(out).not.toContain('stroke=');
    expect(out).not.toContain('stroke-width=');
  });

  it('preserves stroke and stroke-width when present', () => {
    const svg = '<svg><path d="M0 0" stroke="#f00" stroke-width="3" /></svg>';
    const out = replacePathAtIndex(svg, 0, parsed(svg), 'M1,1');
    expect(out).toContain('stroke="#f00"');
    expect(out).toContain('stroke-width="3"');
  });

  it('always appends round linecap and linejoin', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    const out = replacePathAtIndex(svg, 0, parsed(svg), 'M1,1');
    expect(out).toContain('stroke-linecap="round"');
    expect(out).toContain('stroke-linejoin="round"');
  });

  it('leaves the document untouched when the index is out of range', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    expect(replacePathAtIndex(svg, 99, parsed(svg), 'M1,1')).toBe(svg);
  });

  it('KNOWN BUG: every attribute except d/stroke/fill/stroke-width is destroyed', () => {
    // id, class, transform, opacity and anything else on the edited path are lost.
    const svg = '<svg><path d="M0 0" id="mark" class="a" transform="rotate(45)" opacity="0.5" /></svg>';
    const out = replacePathAtIndex(svg, 0, parsed(svg), 'M1,1');
    expect(out).not.toContain('id="mark"');
    expect(out).not.toContain('transform=');
    expect(out).not.toContain('opacity=');
    expect(out).not.toContain('class=');
  });

  it('documents the full edit pipeline output for a representative logo path', () => {
    // End-to-end snapshot of parse -> tokenize -> serialize -> replace.
    const svg = '<svg viewBox="0 0 100 100"><path d="M10 10 L90 90" stroke="#000" stroke-width="2" /></svg>';
    const p = parsed(svg);
    const nodes = tokenizePathData(p.d);
    const out = replacePathAtIndex(svg, 0, p, serializePathNodes(nodes));
    expect(out).toBe(
      '<svg viewBox="0 0 100 100"><path d="M10,10 L90,90" stroke="#000" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>',
    );
  });
});
