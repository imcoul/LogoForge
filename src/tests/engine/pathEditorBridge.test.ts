/**
 * Tests for the editor bridge.
 *
 * These assert the CORRECT behaviour for the exact cases the legacy regex pipeline got
 * wrong. Each `it` here has a counterpart that was previously pinned as `KNOWN BUG` in the
 * characterization suite; the bug is now fixed, so the assertion states the right answer.
 */
import { describe, it, expect } from 'vitest';
import {
  listEditablePaths,
  replacePathData,
  updatePathStyle,
  deletePathAtIndex,
  removeAllPaths,
  readViewBoxWidth,
  toEditorNodes,
  fromEditorNodes,
} from '../../engine/pathEditorBridge';

describe('listEditablePaths', () => {
  it('lists paths in document order', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    expect(listEditablePaths(svg).map((p) => p.d)).toEqual(['M0 0', 'M1 1']);
  });

  it('reads presentation attributes with sensible defaults', () => {
    const [p] = listEditablePaths('<svg><path d="M0 0" /></svg>');
    expect(p.stroke).toBe('none');
    expect(p.fill).toBe('none');
    expect(p.strokeWidth).toBe(2);
  });

  it('reads explicit presentation attributes', () => {
    const [p] = listEditablePaths('<svg><path d="M0 0" stroke="#f00" fill="#00f" stroke-width="5" /></svg>');
    expect(p.stroke).toBe('#f00');
    expect(p.fill).toBe('#00f');
    expect(p.strokeWidth).toBe(5);
  });

  it('exposes a stable node id alongside the ordinal index', () => {
    const [p] = listEditablePaths('<svg><path id="mark" d="M0 0" /></svg>');
    expect(p.nodeId).toBe('mark');
    expect(p.index).toBe(0);
  });

  it('returns an empty list for null or empty input', () => {
    expect(listEditablePaths(null)).toEqual([]);
    expect(listEditablePaths('')).toEqual([]);
  });

  it('returns an empty list for unparseable markup instead of throwing', () => {
    expect(listEditablePaths('<svg><path d="M0 0"</svg>')).toEqual([]);
  });

  // --- regressions ---

  it('does not let an id attribute hijack the path data', () => {
    // Legacy returned "logo" as the path data.
    expect(listEditablePaths('<svg><path id="logo" d="M0 0 L5 5" /></svg>')[0].d).toBe('M0 0 L5 5');
  });

  it('finds paths nested inside groups, which the legacy parser saw but decontextualized', () => {
    const svg = '<svg><g transform="translate(10,10)"><path d="M0 0" /></g><path d="M1 1" /></svg>';
    expect(listEditablePaths(svg)).toHaveLength(2);
  });

  it('is not confused by a greater-than sign inside an attribute value', () => {
    // Legacy truncated the tag at the first `>`, mid-attribute.
    const svg = '<svg><path d="M0 0" aria-label="a &gt; b" /></svg>';
    expect(listEditablePaths(svg)[0].d).toBe('M0 0');
  });
});

describe('replacePathData', () => {
  it('replaces the targeted path only', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    const out = replacePathData(svg, 1, 'M9,9');
    expect(listEditablePaths(out).map((p) => p.d)).toEqual(['M0 0', 'M9,9']);
  });

  it('preserves every other attribute on the edited element', () => {
    // This is the headline fix: legacy rebuilt the tag and destroyed all of these.
    const svg =
      '<svg><path id="mark" class="a" transform="rotate(45)" opacity="0.5" aria-label="brand" d="M0 0" /></svg>';
    const out = replacePathData(svg, 0, 'M1,1');

    expect(out).toContain('id="mark"');
    expect(out).toContain('class="a"');
    expect(out).toContain('transform="rotate(45)"');
    expect(out).toContain('opacity="0.5"');
    expect(out).toContain('aria-label="brand"');
    expect(out).toContain('d="M1,1"');
  });

  it('leaves sibling elements of other types untouched', () => {
    const svg = '<svg><rect x="0" y="0" width="1" height="1" /><path d="M0 0" /></svg>';
    const out = replacePathData(svg, 0, 'M2,2');
    expect(out).toContain('<rect');
    expect(out).toContain('width="1"');
  });

  it('returns the source unchanged for an out-of-range index', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    expect(replacePathData(svg, 99, 'M1,1')).toBe(svg);
  });

  it('returns the source unchanged for unparseable markup', () => {
    const broken = '<svg><path d="M0 0"</svg>';
    expect(replacePathData(broken, 0, 'M1,1')).toBe(broken);
  });
});

describe('updatePathStyle', () => {
  it('updates stroke, fill and stroke width', () => {
    const out = updatePathStyle('<svg><path d="M0 0" /></svg>', 0, {
      stroke: '#123456',
      fill: '#abcdef',
      strokeWidth: 7,
    });
    const [p] = listEditablePaths(out);
    expect(p.stroke).toBe('#123456');
    expect(p.fill).toBe('#abcdef');
    expect(p.strokeWidth).toBe(7);
  });

  it('leaves the geometry untouched', () => {
    const out = updatePathStyle('<svg><path d="M0 0 L5 5" /></svg>', 0, { fill: '#fff' });
    expect(listEditablePaths(out)[0].d).toBe('M0 0 L5 5');
  });

  it('preserves unrelated attributes', () => {
    const out = updatePathStyle('<svg><path id="m" d="M0 0" /></svg>', 0, { fill: '#fff' });
    expect(out).toContain('id="m"');
  });
});

describe('deletePathAtIndex', () => {
  it('removes only the targeted path', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /><path d="M2 2" /></svg>';
    expect(listEditablePaths(deletePathAtIndex(svg, 1)).map((p) => p.d)).toEqual(['M0 0', 'M2 2']);
  });

  it('removes a path nested inside a group without removing the group', () => {
    const svg = '<svg><g><path d="M0 0" /><rect x="0" y="0" width="1" height="1" /></g></svg>';
    const out = deletePathAtIndex(svg, 0);
    expect(listEditablePaths(out)).toHaveLength(0);
    expect(out).toContain('<g');
    expect(out).toContain('<rect');
  });

  it('returns the source unchanged for an out-of-range index', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    expect(deletePathAtIndex(svg, 5)).toBe(svg);
  });
});

describe('removeAllPaths', () => {
  it('removes every path but keeps other elements', () => {
    const svg = '<svg><path d="M0 0" /><rect x="0" y="0" width="1" height="1" /><path d="M1 1" /></svg>';
    const out = removeAllPaths(svg);
    expect(listEditablePaths(out)).toHaveLength(0);
    expect(out).toContain('<rect');
  });

  it('removes paths nested in groups', () => {
    const out = removeAllPaths('<svg><g><path d="M0 0" /></g></svg>');
    expect(listEditablePaths(out)).toHaveLength(0);
    expect(out).toContain('<g');
  });
});

describe('readViewBoxWidth', () => {
  it('reads the width component', () => {
    expect(readViewBoxWidth('<svg viewBox="0 0 512 512"></svg>')).toBe(512);
  });

  it('supports comma-separated viewBox values, which the legacy parser rejected', () => {
    expect(readViewBoxWidth('<svg viewBox="0,0,256,128"></svg>')).toBe(256);
  });

  it('returns null when absent, malformed or non-positive', () => {
    expect(readViewBoxWidth('<svg></svg>')).toBeNull();
    expect(readViewBoxWidth('<svg viewBox="0 0 512"></svg>')).toBeNull();
    expect(readViewBoxWidth('<svg viewBox="0 0 -5 10"></svg>')).toBeNull();
    expect(readViewBoxWidth(null)).toBeNull();
  });
});

describe('editor node adapters', () => {
  it('converts path data into editor command records', () => {
    expect(toEditorNodes('M0 0 L10 10')).toEqual([
      { id: 0, type: 'M', values: [0, 0] },
      { id: 1, type: 'L', values: [10, 10] },
    ]);
  });

  it('represents a closing command as a record with no values', () => {
    // The editor UI already renders zero-value records as "No coordinates".
    expect(toEditorNodes('M0 0 Z')[1]).toEqual({ id: 1, type: 'Z', values: [] });
  });

  it('round-trips through the editor representation', () => {
    const d = 'M0,0 L10,10 Z';
    expect(fromEditorNodes(toEditorNodes(d))).toBe(d);
  });

  it('keeps the closing command when an anchor is edited', () => {
    const nodes = toEditorNodes('M0 0 L10 10 Z');
    nodes[1] = { ...nodes[1], values: [99, 99] };
    expect(fromEditorNodes(nodes)).toBe('M0,0 L99,99 Z');
  });
});

describe('end-to-end editor flow', () => {
  it('survives a parse -> edit -> serialize -> reparse cycle with everything intact', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g id="brand" transform="translate(5,5)"><path id="mark" class="primary" d="M10 10 L90 90 Z" stroke="#000" stroke-width="2" /></g></svg>';

    const [path] = listEditablePaths(svg);
    const nodes = toEditorNodes(path.d);
    nodes[0] = { ...nodes[0], values: [20, 20] };

    const edited = replacePathData(svg, 0, fromEditorNodes(nodes));
    const [reparsed] = listEditablePaths(edited);

    expect(reparsed.d).toBe('M20,20 L90,90 Z');
    expect(reparsed.stroke).toBe('#000');
    expect(reparsed.strokeWidth).toBe(2);
    expect(edited).toContain('id="brand"');
    expect(edited).toContain('transform="translate(5,5)"');
    expect(edited).toContain('class="primary"');
    expect(readViewBoxWidth(edited)).toBe(100);
  });
});
