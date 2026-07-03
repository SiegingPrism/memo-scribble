import type { Point, ShapeStroke } from "./types";

// Basic shape recognizer: detects circle, rectangle, triangle, straight line
// from a freehand stroke. Returns null if no confident match.
export function recognizeShape(
  points: Point[],
  color: string,
  size: number,
): Omit<ShapeStroke, "id"> | null {
  if (points.length < 8) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 20 && h < 20) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const closed =
    Math.hypot(first.x - last.x, first.y - last.y) <
    0.3 * Math.max(w, h);

  // Line
  if (!closed) {
    const len = Math.hypot(last.x - first.x, last.y - first.y);
    let maxDev = 0;
    for (const p of points) {
      const t =
        ((p.x - first.x) * (last.x - first.x) +
          (p.y - first.y) * (last.y - first.y)) /
        (len * len || 1);
      const cx = first.x + t * (last.x - first.x);
      const cy = first.y + t * (last.y - first.y);
      maxDev = Math.max(maxDev, Math.hypot(p.x - cx, p.y - cy));
    }
    if (len > 40 && maxDev / len < 0.05) {
      return {
        kind: "shape",
        shape: "line",
        color,
        size,
        x: first.x,
        y: first.y,
        w: last.x - first.x,
        h: last.y - first.y,
      };
    }
    return null;
  }

  // Circle-like: check radial deviation
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const r = (w + h) / 4;
  const aspect = w / h;
  if (aspect > 0.75 && aspect < 1.35) {
    let dev = 0;
    for (const p of points) {
      const d = Math.hypot(p.x - cx, p.y - cy);
      dev += Math.abs(d - r);
    }
    dev /= points.length;
    if (dev / r < 0.2) {
      return {
        kind: "shape",
        shape: "circle",
        color,
        size,
        x: minX,
        y: minY,
        w,
        h,
      };
    }
  }

  // Corner counting via direction changes
  const corners = countCorners(points);
  if (corners === 3) {
    return {
      kind: "shape",
      shape: "triangle",
      color,
      size,
      x: minX,
      y: minY,
      w,
      h,
    };
  }
  if (corners === 4) {
    return {
      kind: "shape",
      shape: "rect",
      color,
      size,
      x: minX,
      y: minY,
      w,
      h,
    };
  }
  return null;
}

function countCorners(points: Point[]) {
  const step = Math.max(1, Math.floor(points.length / 40));
  let corners = 0;
  let lastAngle: number | null = null;
  for (let i = step; i < points.length - step; i += step) {
    const a = points[i - step];
    const b = points[i];
    const c = points[i + step];
    const ang = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x);
    const norm = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang)));
    if (lastAngle !== null && norm > 0.9 && Math.abs(norm - lastAngle) > 0.4) {
      corners++;
    }
    lastAngle = norm;
  }
  return corners;
}
