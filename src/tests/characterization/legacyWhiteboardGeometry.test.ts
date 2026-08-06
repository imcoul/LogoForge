/**
 * CHARACTERIZATION TESTS — legacy whiteboard geometry.
 *
 * Pins the CURRENT behaviour of `src/engine/legacyWhiteboardGeometry.ts`, including its
 * known bugs. Not a specification of correct behaviour.
 *
 * Phase 1 folds the whiteboard's ad-hoc shape records into the unified scene graph. Tests
 * marked `KNOWN BUG` document behaviour the rewrite is expected to FIX — when they start
 * failing, that is the signal, and the assertion should be updated at that point.
 */
import { describe, it, expect } from 'vitest';
import {
  getSqSegDist,
  snapCoords,
  translatePath,
  convertShapeToPath,
  isPointInsideShape,
} from '../../engine/legacyWhiteboardGeometry';

describe('getSqSegDist', () => {
  it('measures perpendicular distance to the middle of a segment', () => {
    // Point (0,3) against the segment (0,0)-(10,0): distance 3, squared 9.
    expect(getSqSegDist([0, 3], [0, 0], [10, 0])).toBe(9);
  });

  it('clamps to the start point when the projection falls before the segment', () => {
    expect(getSqSegDist([-3, 0], [0, 0], [10, 0])).toBe(9);
  });

  it('clamps to the end point when the projection falls past the segment', () => {
    expect(getSqSegDist([13, 0], [0, 0], [10, 0])).toBe(9);
  });

  it('returns 0 for a point lying on the segment', () => {
    expect(getSqSegDist([5, 0], [0, 0], [10, 0])).toBe(0);
  });

  it('treats a degenerate segment as a single point', () => {
    expect(getSqSegDist([3, 4], [0, 0], [0, 0])).toBe(25);
  });
});

describe('snapCoords', () => {
  it('returns the point untouched when snapping is disabled', () => {
    expect(snapCoords({ x: 13, y: 27 }, false)).toEqual({ x: 13, y: 27 });
  });

  it('snaps to the nearest 10px intersection', () => {
    expect(snapCoords({ x: 13, y: 27 }, true)).toEqual({ x: 10, y: 30 });
  });

  it('rounds halfway values upward', () => {
    expect(snapCoords({ x: 15, y: 25 }, true)).toEqual({ x: 20, y: 30 });
  });

  it('handles negative coordinates', () => {
    expect(snapCoords({ x: -13, y: -27 }, true)).toEqual({ x: -10, y: -30 });
  });

  it('KNOWN LIMITATION: the 10px grid is hard-coded and cannot be configured', () => {
    // The UI exposes a grid toggle but no grid size; every snap is to 10px.
    expect(snapCoords({ x: 4, y: 4 }, true)).toEqual({ x: 0, y: 0 });
    expect(snapCoords({ x: 6, y: 6 }, true)).toEqual({ x: 10, y: 10 });
  });
});

describe('translatePath', () => {
  it('offsets comma-separated coordinate pairs', () => {
    expect(translatePath('M 10,20 L 30,40', 5, 5)).toBe('M 15,25 L 35,45');
  });

  it('handles negative offsets', () => {
    expect(translatePath('M 10,20', -10, -20)).toBe('M 0,0');
  });

  it('returns an empty string for undefined input', () => {
    expect(translatePath(undefined, 5, 5)).toBe('');
  });

  it('KNOWN LIMITATION: space-separated coordinates are not translated', () => {
    // Valid SVG, but the pattern requires a comma, so the path does not move at all.
    expect(translatePath('M 10 20 L 30 40', 5, 5)).toBe('M 10 20 L 30 40');
  });

  it('KNOWN BUG: arc flags are mistaken for coordinates and corrupted', () => {
    // In `a rx,ry rot large-arc,sweep dx,dy` the `1,0` flag pair matches the coordinate
    // pattern and gets offset, producing `6,5` — no longer valid arc flags.
    // This corrupts every circle, since convertShapeToPath emits circles as arcs.
    const circle = 'M 50,100 a 50,50 0 1,0 100,0 Z';
    const moved = translatePath(circle, 5, 5);

    expect(moved).toContain('55,105'); // the start point moved correctly
    expect(moved).toContain('55,55'); // the radii were also offset — wrong
    expect(moved).toContain('6,5'); // the arc flags 1,0 became 6,5 — invalid
  });
});

describe('convertShapeToPath', () => {
  it('returns an existing path unchanged', () => {
    expect(convertShapeToPath({ type: 'path', path: 'M 0,0 L 1,1' })).toBe('M 0,0 L 1,1');
  });

  it('emits a closed rectangle path', () => {
    expect(
      convertShapeToPath({ type: 'rectangle', props: { x: 10, y: 20, width: 30, height: 40 } }),
    ).toBe('M 10,20 L 40,20 L 40,60 L 10,60 Z');
  });

  it('applies rectangle defaults when dimensions are missing', () => {
    expect(convertShapeToPath({ type: 'rectangle', props: {} })).toBe(
      'M 0,0 L 100,0 L 100,100 L 0,100 Z',
    );
  });

  it('emits a circle as two elliptical arcs', () => {
    expect(
      convertShapeToPath({ type: 'circle', props: { cx: 100, cy: 100, rx: 50, ry: 50 } }),
    ).toBe('M 50,100 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0 Z');
  });

  it('emits a line as a two-point path', () => {
    expect(
      convertShapeToPath({ type: 'line', props: { x1: 0, y1: 0, x2: 50, y2: 60 } }),
    ).toBe('M 0,0 L 50,60');
  });

  it('applies line endpoint defaults of 100,100', () => {
    expect(convertShapeToPath({ type: 'line', props: {} })).toBe('M 0,0 L 100,100');
  });

  it('falls back to an empty string for an unrecognised shape', () => {
    expect(convertShapeToPath({ type: undefined })).toBe('');
  });

  it('KNOWN LIMITATION: a shape with no props yields an empty path, silently losing it', () => {
    // `type` is set but `props` is absent, so none of the branches match.
    expect(convertShapeToPath({ type: 'rectangle' })).toBe('');
  });
});

describe('isPointInsideShape', () => {
  const rect = { type: 'rectangle' as const, props: { x: 0, y: 0, width: 100, height: 50 } };
  const circle = { type: 'circle' as const, props: { cx: 100, cy: 100, rx: 50, ry: 25 } };
  const line = { type: 'line' as const, props: { x1: 0, y1: 0, x2: 100, y2: 0 } };

  it('detects a point inside a rectangle', () => {
    expect(isPointInsideShape({ x: 50, y: 25 }, rect)).toBe(true);
  });

  it('treats rectangle edges as inside', () => {
    expect(isPointInsideShape({ x: 0, y: 0 }, rect)).toBe(true);
    expect(isPointInsideShape({ x: 100, y: 50 }, rect)).toBe(true);
  });

  it('rejects a point outside a rectangle', () => {
    expect(isPointInsideShape({ x: 101, y: 25 }, rect)).toBe(false);
  });

  it('detects a point inside an ellipse using the true ellipse equation', () => {
    expect(isPointInsideShape({ x: 100, y: 100 }, circle)).toBe(true);
    expect(isPointInsideShape({ x: 149, y: 100 }, circle)).toBe(true);
    // Outside on the short axis even though it is within the bounding box.
    expect(isPointInsideShape({ x: 140, y: 120 }, circle)).toBe(false);
  });

  it('rejects a degenerate ellipse with no radius', () => {
    expect(
      isPointInsideShape({ x: 0, y: 0 }, { type: 'circle', props: { cx: 0, cy: 0, rx: 0, ry: 0 } }),
    ).toBe(false);
  });

  it('hit-tests a line within a 15px tolerance', () => {
    expect(isPointInsideShape({ x: 50, y: 10 }, line)).toBe(true);
    expect(isPointInsideShape({ x: 50, y: 20 }, line)).toBe(false);
  });

  it('KNOWN LIMITATION: freehand paths are hit-tested by bounding box, not outline', () => {
    // A U shape: the gap between the arms is empty, but the bounding box says otherwise.
    const uShape = { path: 'M 0,0 L 0,100 L 100,100 L 100,0' };
    expect(isPointInsideShape({ x: 50, y: 10 }, uShape)).toBe(true);
  });

  it('KNOWN BUG: arc parameters are counted as coordinates, corrupting the bounding box', () => {
    // Path is a circle centred at (100,100) with r=50, so x spans 50..150.
    // The arc radii/rotation/flags are treated as alternating x/y values, which drags the
    // computed box origin down to 0 and makes a point far outside report as inside.
    const arcPath = { path: 'M 50,100 a 50,50 0 1,0 100,0 a 50,50 0 1,0 -100,0 Z' };
    expect(isPointInsideShape({ x: 2, y: 2 }, arcPath)).toBe(true);
  });

  it('returns false for a shape with neither type nor path', () => {
    expect(isPointInsideShape({ x: 0, y: 0 }, {})).toBe(false);
  });
});
