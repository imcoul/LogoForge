/**
 * Coverage for the engine's exported helpers and edge-case branches.
 */
import { describe, it, expect } from 'vitest';
import { serializeTransform, walkNodes, findNodeById, countNodes, parseSvg, serializeSvg } from '../../engine/svgIo';
import { parsePathData } from '../../engine/pathData';
import { IDENTITY_TRANSFORM, type Node } from '../../types';

const t = (partial: Partial<typeof IDENTITY_TRANSFORM>) => ({ ...IDENTITY_TRANSFORM, ...partial });

describe('serializeTransform', () => {
  it('returns an empty string for the identity transform', () => {
    expect(serializeTransform(IDENTITY_TRANSFORM)).toBe('');
  });

  it('emits only the non-identity components', () => {
    expect(serializeTransform(t({ x: 5, y: 10 }))).toBe('translate(5,10)');
    expect(serializeTransform(t({ rotate: 45 }))).toBe('rotate(45)');
    expect(serializeTransform(t({ scaleX: 2, scaleY: 3 }))).toBe('scale(2,3)');
  });

  it('orders translate, rotate then scale', () => {
    expect(serializeTransform(t({ x: 1, y: 2, rotate: 30, scaleX: 2, scaleY: 2 }))).toBe(
      'translate(1,2) rotate(30) scale(2,2)',
    );
  });

  it('treats a translate of only y as non-identity', () => {
    expect(serializeTransform(t({ y: 3 }))).toBe('translate(0,3)');
  });

  it('treats a non-uniform scale on one axis as non-identity', () => {
    expect(serializeTransform(t({ scaleY: 4 }))).toBe('scale(1,4)');
  });
});

describe('tree helpers', () => {
  const tree: Node[] = [
    { id: 'a', type: 'group', transform: { ...IDENTITY_TRANSFORM }, children: [
      { id: 'b', type: 'path', transform: { ...IDENTITY_TRANSFORM } },
      { id: 'c', type: 'group', transform: { ...IDENTITY_TRANSFORM }, children: [
        { id: 'd', type: 'rect', transform: { ...IDENTITY_TRANSFORM } },
      ] },
    ] },
    { id: 'e', type: 'text', transform: { ...IDENTITY_TRANSFORM } },
  ];

  it('walks depth-first, parents before children, reporting depth', () => {
    const seen: Array<[string, number]> = [];
    walkNodes(tree, (n, depth) => seen.push([n.id, depth]));
    expect(seen).toEqual([['a', 0], ['b', 1], ['c', 1], ['d', 2], ['e', 0]]);
  });

  it('walks an empty list without calling the visitor', () => {
    const seen: string[] = [];
    walkNodes([], (n) => seen.push(n.id));
    expect(seen).toEqual([]);
  });

  it('finds nodes at any depth and returns null otherwise', () => {
    expect(findNodeById(tree, 'd')?.type).toBe('rect');
    expect(findNodeById(tree, 'a')?.type).toBe('group');
    expect(findNodeById(tree, 'zz')).toBeNull();
    expect(findNodeById([], 'a')).toBeNull();
  });

  it('counts every node including nested children', () => {
    expect(countNodes(tree)).toBe(5);
    expect(countNodes([])).toBe(0);
  });
});

describe('serialization edge cases', () => {
  it('emits no attributes for a bare element', () => {
    const doc = parseSvg('<svg><path/></svg>');
    expect(serializeSvg(doc)).toBe('<svg><path /></svg>');
  });

  it('preserves an explicit xmlns on defs rather than stripping it', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><defs xmlns="http://www.w3.org/2000/svg"><linearGradient id="g"/></defs></svg>';
    expect(serializeSvg(parseSvg(svg))).toContain('<defs xmlns=');
  });

  it('round-trips a document with no root attributes', () => {
    const once = serializeSvg(parseSvg('<svg><rect/></svg>'));
    expect(serializeSvg(parseSvg(once))).toBe(once);
  });
});

describe('path data edge cases', () => {
  it('ignores junk that appears before any command', () => {
    expect(parsePathData('12 34 M0 0')).toEqual([]);
  });

  it('ignores an unrecognised command letter', () => {
    expect(parsePathData('M0 0')).toHaveLength(1);
  });

  it('rejects a non-binary arc flag', () => {
    // Flags must be exactly 0 or 1; a 2 makes the arc malformed and it is dropped.
    expect(parsePathData('M0 0 a50,50 0 2,0 100,0')).toHaveLength(1);
  });
});
