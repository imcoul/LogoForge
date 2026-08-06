/**
 * Legacy whiteboard geometry helpers.
 *
 * Behavioural extraction of the pure geometry that previously lived inline inside
 * `src/components/WhiteboardCanvas.tsx`. Extracted so the current behaviour can be pinned by
 * characterization tests before Phase 1 replaces the whiteboard's ad-hoc shape model with the
 * unified scene graph.
 *
 * IMPORTANT: This module preserves existing quirks and bugs on purpose. It is not a correct
 * geometry implementation and must not be extended. See
 * `plans/2026-08-05-000000--forgel-mobile-first-design-tool-roadmap.md`.
 */

export interface Point {
  x: number;
  y: number;
}

/** The loose shape record the whiteboard stores in `project.whiteboardSketches`. */
export interface WhiteboardShape {
  type?: 'path' | 'rectangle' | 'circle' | 'line';
  path?: string;
  props?: Record<string, number | undefined>;
  [key: string]: unknown;
}

/** Squared distance from point `p` to the segment `p1`-`p2`. */
export function getSqSegDist(
  p: [number, number],
  p1: [number, number],
  p2: [number, number],
): number {
  let x = p1[0];
  let y = p1[1];
  let dx = p2[0] - x;
  let dy = p2[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2[0];
      y = p2[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/** Snaps a point to the fixed 10px whiteboard grid. Grid size is not configurable. */
export function snapCoords(point: Point, snapToGrid: boolean): Point {
  if (!snapToGrid) return point;
  return {
    x: Math.round(point.x / 10) * 10,
    y: Math.round(point.y / 10) * 10,
  };
}

/**
 * Offsets every comma-separated coordinate pair in a path string.
 *
 * QUIRK: the pattern matches `number,number` pairs only. Space-separated coordinates
 * (`M 10 20`) are left untranslated.
 *
 * KNOWN BUG: the pattern cannot distinguish coordinates from arc flags. In an elliptical
 * arc (`a rx,ry rot large-arc,sweep dx,dy`) the `large-arc,sweep` flag pair matches the
 * pattern and gets offset too, producing invalid flags and corrupting the arc.
 */
export function translatePath(pathStr: string | undefined, dx: number, dy: number): string {
  if (!pathStr) return '';
  return pathStr.replace(/(-?[0-9.]+),(-?[0-9.]+)/g, (_match, x, y) => {
    const nx = parseFloat(x) + dx;
    const ny = parseFloat(y) + dy;
    return `${nx},${ny}`;
  });
}

/** Converts any whiteboard shape into an SVG path string. */
export function convertShapeToPath(s: WhiteboardShape): string {
  if (s.type === 'path' && s.path) {
    return s.path;
  }
  if (s.type === 'rectangle' && s.props) {
    const x = s.props.x ?? 0;
    const y = s.props.y ?? 0;
    const width = s.props.width ?? 100;
    const height = s.props.height ?? 100;
    return `M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z`;
  }
  if (s.type === 'circle' && s.props) {
    const cx = s.props.cx ?? 100;
    const cy = s.props.cy ?? 100;
    const rx = s.props.rx ?? 50;
    const ry = s.props.ry ?? 50;
    return `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${rx * 2},0 a ${rx},${ry} 0 1,0 ${-rx * 2},0 Z`;
  }
  if (s.type === 'line' && s.props) {
    const x1 = s.props.x1 ?? 0;
    const y1 = s.props.y1 ?? 0;
    const x2 = s.props.x2 ?? 100;
    const y2 = s.props.y2 ?? 100;
    return `M ${x1},${y1} L ${x2},${y2}`;
  }
  return s.path || '';
}

/**
 * Hit-tests a point against a shape.
 *
 * KNOWN LIMITATION: freehand paths are tested against their AXIS-ALIGNED BOUNDING BOX, not
 * the path outline, so a point in the concave gap of a U-shaped stroke reports as inside.
 *
 * KNOWN BUG: the bounding box is derived by treating every number in the path string as an
 * alternating x/y coordinate. Arc parameters (radii, rotation, flags) are counted as
 * coordinates, so any path containing an arc gets a wrong bounding box.
 */
export function isPointInsideShape(p: Point, shape: WhiteboardShape): boolean {
  if (shape.type === 'rectangle' && shape.props) {
    const x = shape.props.x ?? 0;
    const y = shape.props.y ?? 0;
    const width = shape.props.width ?? 0;
    const height = shape.props.height ?? 0;
    return p.x >= x && p.x <= x + width && p.y >= y && p.y <= y + height;
  }
  if (shape.type === 'circle' && shape.props) {
    const cx = shape.props.cx ?? 0;
    const cy = shape.props.cy ?? 0;
    const rx = shape.props.rx ?? 0;
    const ry = shape.props.ry ?? 0;
    const dx = p.x - cx;
    const dy = p.y - cy;
    if (rx <= 0 || ry <= 0) return false;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }
  if (shape.type === 'line' && shape.props) {
    const x1 = shape.props.x1 ?? 0;
    const y1 = shape.props.y1 ?? 0;
    const x2 = shape.props.x2 ?? 0;
    const y2 = shape.props.y2 ?? 0;
    const distSq = getSqSegDist([p.x, p.y], [x1, y1], [x2, y2]);
    return distSq < 15 * 15;
  }
  if (shape.path) {
    const coords = shape.path.match(/-?[0-9.]+/g);
    if (coords && coords.length >= 2) {
      const px = coords.filter((_, idx) => idx % 2 === 0).map(Number);
      const py = coords.filter((_, idx) => idx % 2 === 1).map(Number);
      const minX = Math.min(...px);
      const maxX = Math.max(...px);
      const minY = Math.min(...py);
      const maxY = Math.max(...py);
      return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
    }
  }
  return false;
}
