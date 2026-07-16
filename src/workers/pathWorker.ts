// src/workers/pathWorker.ts

// Ramer-Douglas-Peucker (RDP) algorithm for path simplification
// This is CPU intensive, so offloading it to a Web Worker prevents main thread jank.

export interface Point {
  x: number;
  y: number;
}

function getSqDist(p1: Point, p2: Point) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
}

function getSqSegDist(p: Point, p1: Point, p2: Point) {
  let x = p1.x;
  let y = p1.y;
  let dx = p2.x - x;
  let dy = p2.y - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = p2.x;
      y = p2.y;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = p.x - x;
  dy = p.y - y;

  return dx * dx + dy * dy;
}

function simplifyDPStep(points: Point[], first: number, last: number, sqTolerance: number, simplified: Point[]) {
  let maxSqDist = sqTolerance;
  let index = -1;

  for (let i = first + 1; i < last; i++) {
    const sqDist = getSqSegDist(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }

  if (maxSqDist > sqTolerance) {
    if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
}

function simplifyDouglasPeucker(points: Point[], sqTolerance: number) {
  const last = points.length - 1;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);
  return simplified;
}

function simplifyRadialDist(points: Point[], sqTolerance: number) {
  let prevPoint = points[0];
  const newPoints = [prevPoint];
  let point;

  for (let i = 1, len = points.length; i < len; i++) {
    point = points[i];
    if (getSqDist(point, prevPoint) > sqTolerance) {
      newPoints.push(point);
      prevPoint = point;
    }
  }
  if (prevPoint !== point) newPoints.push(point!);
  return newPoints;
}

self.onmessage = (e: MessageEvent) => {
  const { id, points, tolerance, highestQuality } = e.data;
  
  try {
    if (!points || points.length <= 2) {
      self.postMessage({ id, points });
      return;
    }

    const sqTolerance = tolerance !== undefined ? tolerance * tolerance : 1;
    let simplified = points;

    if (!highestQuality) {
      simplified = simplifyRadialDist(simplified, sqTolerance);
    }
    
    simplified = simplifyDouglasPeucker(simplified, sqTolerance);
    
    self.postMessage({ id, points: simplified });
  } catch (error: any) {
    self.postMessage({ id, error: error.message });
  }
};
