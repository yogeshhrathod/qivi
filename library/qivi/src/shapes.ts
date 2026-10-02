/**
 * Morph silhouettes. Each shape is a polygon; we precompute its boundary radius along N rays from the
 * origin. The particle shader rescales every particle radially by that table, so a morph is a smooth
 * per-angle stretch: the face region never moves and identity is preserved.
 */
export const SHAPES = ["heart", "shield", "hex", "star"] as const;
export type QiviShape = "blob" | (typeof SHAPES)[number];
export const SHAPE_SAMPLES = 128;

type P = [number, number];

function heart(): P[] {
  const pts: P[] = [];
  for (let i = 0; i < 200; i++) {
    const t = (i / 200) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([x * 0.074, (y + 1.5) * 0.074]);
  }
  return pts;
}

function shield(): P[] {
  const pts: P[] = [];
  const W = 0.98;
  for (let i = 0; i <= 20; i++) {
    const x = -W + (2 * W * i) / 20;
    pts.push([x, 0.86 + 0.06 * Math.cos((x / W) * Math.PI) - 0.04]);
  }
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    pts.push([W * (1 - t ** 1.7), 0.1 - 1.28 * t]);
  }
  for (let i = 30; i >= 0; i--) {
    const t = i / 30;
    pts.push([-W * (1 - t ** 1.7), 0.1 - 1.28 * t]);
  }
  return pts.reverse();
}

function hex(): P[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return [Math.cos(a) * 1.1, Math.sin(a) * 1.0] as P;
  });
}

function star(): P[] {
  const pts: P[] = [];
  const n = 5;
  for (let i = 0; i < n * 16; i++) {
    const a = (i / (n * 16)) * Math.PI * 2 + Math.PI / 2;
    const k = Math.pow(0.5 + 0.5 * Math.cos(a * n - (Math.PI / 2) * n), 2.2);
    const r = 0.86 + 0.42 * k;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

function rayRadius(poly: P[], angle: number) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const ex = bx - ax;
    const ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (ax * ey - ay * ex) / den;
    const u = (ax * dy - ay * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
  }
  return best || 1;
}

/** vec4 per angle: (heart, shield, hex, star) boundary radii. Angle index = (atan2/2π + 0.5) * N. */
export function buildShapeTable(): Float32Array {
  const polys = [heart(), shield(), hex(), star()];
  const out = new Float32Array(SHAPE_SAMPLES * 4);
  for (let i = 0; i < SHAPE_SAMPLES; i++) {
    const angle = (i / SHAPE_SAMPLES - 0.5) * Math.PI * 2;
    polys.forEach((poly, s) => (out[i * 4 + s] = rayRadius(poly, angle)));
  }
  return out;
}

/** Create a custom star-convex silhouette without changing shaders or registering global presets. */
export function createRadialShape(radius: (angle: number) => number, samples = SHAPE_SAMPLES): readonly number[] {
  if (!Number.isInteger(samples) || samples < 3 || samples > 4096) throw new RangeError("Shape samples must be an integer from 3 to 4096");
  return Object.freeze(Array.from({ length: samples }, (_, i) => {
    const value = radius((i / samples - 0.5) * Math.PI * 2);
    if (!Number.isFinite(value) || value < 0.1 || value > 2) throw new RangeError("Shape radii must be finite and between 0.1 and 2");
    return value;
  }));
}
