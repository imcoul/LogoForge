/**
 * Tests for the SVG path editor bridge.
 *
 * These assert lossless path editing through stable editor IDs, including the historical cases
 * where the old regex pipeline corrupted path data or dropped unrelated SVG attributes.
 */
import { describe, it, expect } from 'vitest';
import {
  listEditablePaths,
  replacePathDataById,
  updatePathStyleById,
  deletePathById,
  removeAllPaths,
  readViewBoxWidth,
  toEditorNodes,
  fromEditorNodes,
} from '../../engine/pathEditorBridge';
import { parseSvg, serializeSvg } from '../../engine/svgIo';

describe('listEditablePaths', () => {
  it('lists paths in document order and exposes a display index', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    expect(listEditablePaths(svg).map((path) => path.d)).toEqual(['M0 0', 'M1 1']);
    expect(listEditablePaths(svg).map((path) => path.index)).toEqual([0, 1]);
  });

  it('reads presentation attributes with sensible defaults', () => {
    const [path] = listEditablePaths('<svg><path d="M0 0" /></svg>');
    expect(path.stroke).toBe('none');
    expect(path.fill).toBe('none');
    expect(path.strokeWidth).toBe(2);
  });

  it('reads explicit presentation attributes', () => {
    const [path] = listEditablePaths('<svg><path d="M0 0" stroke="#f00" fill="#00f" stroke-width="5" /></svg>');
    expect(path.stroke).toBe('#f00');
    expect(path.fill).toBe('#00f');
    expect(path.strokeWidth).toBe(5);
  });

  it('uses authored SVG IDs as editor IDs when present', () => {
    const [path] = listEditablePaths('<svg><path id="mark" d="M0 0" /></svg>');
    expect(path.nodeId).toBe('mark');
    expect(path.index).toBe(0);
  });

  it('assigns deterministic fallback IDs to paths without authored IDs', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    expect(listEditablePaths(svg).map((path) => path.nodeId)).toEqual(['n0', 'n1']);
  });

  it('returns an empty list for null or empty input', () => {
    expect(listEditablePaths(null)).toEqual([]);
    expect(listEditablePaths('')).toEqual([]);
  });

  it('returns an empty list for unparseable markup instead of throwing', () => {
    expect(listEditablePaths('<svg><path d="M0 0"</svg>')).toEqual([]);
  });

  it('does not let an id attribute hijack path data', () => {
    expect(listEditablePaths('<svg><path id="logo" d="M0 0 L5 5" /></svg>')[0].d).toBe('M0 0 L5 5');
  });

  it('finds paths nested inside groups', () => {
    const svg = '<svg><g transform="translate(10,10)"><path d="M0 0" /></g><path d="M1 1" /></svg>';
    expect(listEditablePaths(svg)).toHaveLength(2);
  });

  it('is not confused by a greater-than sign inside an attribute value', () => {
    const svg = '<svg><path d="M0 0" aria-label="a &gt; b" /></svg>';
    expect(listEditablePaths(svg)[0].d).toBe('M0 0');
  });

  it('provides distinct display keys for duplicate authored IDs', () => {
    const paths = listEditablePaths('<svg><path id="duplicate" d="M0 0" /><path id="duplicate" d="M1 1" /></svg>');
    expect(paths[0].nodeId).not.toBe(paths[1].nodeId);
  });
});

describe('replacePathDataById', () => {
  it('replaces only the path identified by its editor ID', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    const target = listEditablePaths(svg)[1];
    const out = replacePathDataById(svg, target.nodeId, 'M9,9');
    expect(listEditablePaths(out).map((path) => path.d)).toEqual(['M0 0', 'M9,9']);
  });

  it('persists generated IDs so a path remains addressable after sibling insertion/reordering', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    const originalTarget = listEditablePaths(svg)[1];
    const persisted = replacePathDataById(svg, originalTarget.nodeId, 'M2,2');
    const stableId = listEditablePaths(persisted).find((path) => path.d === 'M2,2')!.nodeId;
    expect(persisted).toContain('data-logoforge-node-id=');

    const doc = parseSvg(persisted);
    doc.nodes.unshift({
      id: 'inserted-path',
      type: 'path',
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 },
      props: { d: 'M99,99' },
    });
    const reordered = serializeSvg(doc);
    const out = replacePathDataById(reordered, stableId, 'M8,8');
    const paths = listEditablePaths(out);

    expect(paths.map((path) => path.d)).toEqual(['M99,99', 'M0 0', 'M8,8']);
    expect(paths.find((path) => path.nodeId === stableId)?.d).toBe('M8,8');
  });

  it('preserves authored IDs and every other attribute on the edited element', () => {
    const svg =
      '<svg><path id="mark" class="a" transform="rotate(45)" opacity="0.5" aria-label="brand" d="M0 0" /></svg>';
    const target = listEditablePaths(svg)[0];
    const out = replacePathDataById(svg, target.nodeId, 'M1,1');

    expect(out).toContain('id="mark"');
    expect(out).toContain('class="a"');
    expect(out).toContain('transform="rotate(45)"');
    expect(out).toContain('opacity="0.5"');
    expect(out).toContain('aria-label="brand"');
    expect(out).toContain('d="M1,1"');
  });

  it('preserves authored IDs that resemble synthesized node IDs', () => {
    const svg = '<svg><g id="n0"><path id="n1" d="M0 0" /></g></svg>';
    const target = listEditablePaths(svg)[0];
    const out = replacePathDataById(svg, target.nodeId, 'M1,1');
    expect(out).toContain('id="n0"');
    expect(out).toContain('id="n1"');
  });

  it('leaves sibling elements of other types untouched', () => {
    const svg = '<svg><rect x="0" y="0" width="1" height="1" /><path d="M0 0" /></svg>';
    const target = listEditablePaths(svg)[0];
    const out = replacePathDataById(svg, target.nodeId, 'M2,2');
    expect(out).toContain('<rect');
    expect(out).toContain('width="1"');
  });

  it('returns the source unchanged for a missing ID or unparseable markup', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    const broken = '<svg><path d="M0 0"</svg>';
    expect(replacePathDataById(svg, 'missing', 'M1,1')).toBe(svg);
    expect(replacePathDataById(broken, 'n0', 'M1,1')).toBe(broken);
  });
});

describe('updatePathStyleById', () => {
  it('updates stroke, fill and stroke width on the addressed path', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /></svg>';
    const target = listEditablePaths(svg)[1];
    const out = updatePathStyleById(svg, target.nodeId, {
      stroke: '#123456',
      fill: '#abcdef',
      strokeWidth: 7,
    });
    const path = listEditablePaths(out).find((candidate) => candidate.nodeId === target.nodeId)!;
    expect(path.stroke).toBe('#123456');
    expect(path.fill).toBe('#abcdef');
    expect(path.strokeWidth).toBe(7);
    expect(listEditablePaths(out)[0].stroke).toBe('none');
  });

  it('leaves geometry untouched and preserves unrelated attributes', () => {
    const svg = '<svg><path id="m" aria-label="kept" d="M0 0 L5 5" /></svg>';
    const target = listEditablePaths(svg)[0];
    const out = updatePathStyleById(svg, target.nodeId, { fill: '#fff' });
    expect(listEditablePaths(out)[0].d).toBe('M0 0 L5 5');
    expect(out).toContain('id="m"');
    expect(out).toContain('aria-label="kept"');
  });

  it('does not redirect a missing ID to another path', () => {
    const svg = '<svg><path d="M0 0" fill="#000" /></svg>';
    expect(updatePathStyleById(svg, 'missing', { fill: '#fff' })).toBe(svg);
  });

  it('leaves the source unchanged when duplicate authored IDs make the target ambiguous', () => {
    const svg = '<svg><path id="duplicate" d="M0 0" /><path id="duplicate" d="M1 1" /></svg>';
    const target = listEditablePaths(svg)[1];
    expect(updatePathStyleById(svg, target.nodeId, { stroke: '#f00' })).toBe(svg);
    expect(replacePathDataById(svg, target.nodeId, 'M2,2')).toBe(svg);
    expect(deletePathById(svg, target.nodeId)).toBe(svg);
  });
});

describe('deletePathById', () => {
  it('removes only the addressed path', () => {
    const svg = '<svg><path d="M0 0" /><path d="M1 1" /><path d="M2 2" /></svg>';
    const target = listEditablePaths(svg)[1];
    expect(listEditablePaths(deletePathById(svg, target.nodeId)).map((path) => path.d)).toEqual(['M0 0', 'M2 2']);
  });

  it('removes a nested path without removing its group or siblings', () => {
    const svg = '<svg><g><path d="M0 0" /><rect x="0" y="0" width="1" height="1" /></g></svg>';
    const target = listEditablePaths(svg)[0];
    const out = deletePathById(svg, target.nodeId);
    expect(listEditablePaths(out)).toHaveLength(0);
    expect(out).toContain('<g');
    expect(out).toContain('<rect');
  });

  it('preserves authored synthesized-looking ancestor IDs when pruning nested paths', () => {
    const svg = '<svg><g id="n0"><path id="mark" d="M0 0" /></g></svg>';
    const target = listEditablePaths(svg)[0];
    const out = deletePathById(svg, target.nodeId);
    expect(out).toContain('id="n0"');
    expect(out).toContain('<g');
  });

  it('returns the source unchanged for a missing ID', () => {
    const svg = '<svg><path d="M0 0" /></svg>';
    expect(deletePathById(svg, 'missing')).toBe(svg);
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

  it('supports comma-separated viewBox values', () => {
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
    expect(toEditorNodes('M0 0 Z')[1]).toEqual({ id: 1, type: 'Z', values: [] });
  });

  it('round-trips through the editor representation', () => {
    const d = 'M0,0 L10,10 Z';
    expect(fromEditorNodes(toEditorNodes(d))).toBe(d);
  });

  it('keeps a closing command when an anchor is edited', () => {
    const nodes = toEditorNodes('M0 0 L10 10 Z');
    nodes[1] = { ...nodes[1], values: [99, 99] };
    expect(fromEditorNodes(nodes)).toBe('M0,0 L99,99 Z');
  });
});

describe('end-to-end editor flow', () => {
  it('survives a parse -> edit -> serialize -> reparse cycle with attributes and node identity intact', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g id="brand" transform="translate(5,5)"><path id="mark" class="primary" d="M10 10 L90 90 Z" stroke="#000" stroke-width="2" /></g></svg>';

    const [path] = listEditablePaths(svg);
    const nodes = toEditorNodes(path.d);
    nodes[0] = { ...nodes[0], values: [20, 20] };

    const edited = replacePathDataById(svg, path.nodeId, fromEditorNodes(nodes));
    const [reparsed] = listEditablePaths(edited);

    expect(reparsed.nodeId).toBe(path.nodeId);
    expect(reparsed.d).toBe('M20,20 L90,90 Z');
    expect(reparsed.stroke).toBe('#000');
    expect(reparsed.strokeWidth).toBe(2);
    expect(edited).toContain('id="brand"');
    expect(edited).toContain('transform="translate(5,5)"');
    expect(edited).toContain('id="mark"');
    expect(edited).toContain('class="primary"');
    expect(readViewBoxWidth(edited)).toBe(100);
  });
});
