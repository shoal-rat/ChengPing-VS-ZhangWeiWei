// Small math kit shared by the simulation and the renderer. No DOM in here.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const approach = (v, target, step) =>
  v < target ? Math.min(v + step, target) : Math.max(v - step, target);
export const DEG = Math.PI / 180;
export const hypot = Math.hypot;

// Angle convention for limbs: 0 = pointing down, +90 = pointing forward (+x), 180 = up.
export const dirX = (deg) => Math.sin(deg * DEG);
export const dirY = (deg) => Math.cos(deg * DEG);

export function rotate(x, y, deg) {
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  return [x * c - y * s, x * s + y * c];
}

// Easing
export const ease = {
  lin: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  io: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  snap: (t) => 1 - Math.pow(1 - t, 4),   // fast strike
  back: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  hold: () => 0,
};

// Distance from point to segment, squared.
export function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  let t = L > 0 ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + dx * t - px, qy = ay + dy * t - py;
  return qx * qx + qy * qy;
}

// Circle (hitbox, possibly swept from previous position) vs capsule (hurtbox).
// Swept circles are capsules too, so this is capsule vs capsule, approximated by
// sampling the shorter capsule.
export function capsuleHit(a0x, a0y, a1x, a1y, ar, b0x, b0y, b1x, b1y, br) {
  const R = ar + br, R2 = R * R;
  if (segDist2(a0x, a0y, b0x, b0y, b1x, b1y) <= R2) return true;
  if (segDist2(a1x, a1y, b0x, b0y, b1x, b1y) <= R2) return true;
  if (segDist2(b0x, b0y, a0x, a0y, a1x, a1y) <= R2) return true;
  if (segDist2(b1x, b1y, a0x, a0y, a1x, a1y) <= R2) return true;
  // proper segment intersection
  const d = (a1x - a0x) * (b1y - b0y) - (a1y - a0y) * (b1x - b0x);
  if (d === 0) return false;
  const u = ((b0x - a0x) * (b1y - b0y) - (b0y - a0y) * (b1x - b0x)) / d;
  const v = ((b0x - a0x) * (a1y - a0y) - (b0y - a0y) * (a1x - a0x)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}

// Deterministic RNG (mulberry32) so matches and headless tests replay exactly.
export class RNG {
  constructor(seed = 1) { this.s = seed >>> 0 || 1; }
  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
}
