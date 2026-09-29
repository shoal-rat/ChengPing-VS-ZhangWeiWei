// Global tuning. Per-character stats live in src/data/chars/*.js.
export const FPS = 60;

export const PHYS = {
  kbScale: 0.25,         // launch speed (px/frame) per point of knockback
  kbDecay: 0.60,         // px/frame^2 launch-speed decay
  hitstunMul: 0.40,      // hitstun frames per point of knockback
  tumbleKB: 80,          // knockback at/above which the victim tumbles
  diMaxDeg: 15,
  sdiPx: 5,
  groundFriction: 0.9,   // px/frame^2 base, * character traction
  airFriction: 0.08,
  maxCombo: 999,
};

export const SHIELD = {
  max: 50, regen: 0.07, drain: 0.13, dmgMul: 1.19, stunMul: 0.8, stunAdd: 2,
  breakVy: -15, breakStunMin: 150, breakStunMax: 300,
  parryWindow: 5, parryFreeze: 14, dropLag: 11, pushMul: 0.09,
};

export const TIMING = {
  buffer: 8,             // input buffer frames
  jumpsquatDefault: 3,
  landLag: 3,
  helplessLand: 24,
  techWindow: 20,
  techLockout: 40,
  ledgeHangMax: 300,
  ledgeInvuln: 30,
  respawnInvuln: 120,
  respawnWait: 70,
  grabBase: 90, grabPerPct: 1.0, grabMash: 7,
  dodgeStale: 5,         // extra frames per recent dodge
};

export const STALE = [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01];
export const FRESH_BONUS = 1.05;

// Knockback formula (Smash-style).
// p: percent AFTER the hit, d: damage, w: weight, kbg: growth, bkb: base
export function knockback(p, d, w, kbg, bkb, fkb) {
  if (fkb) return ((((10 + fkb / 10 + (fkb * d) / 20) * 200) / (w + 100)) * 1.4 + 18) * kbg / 100 + bkb;
  return (((p / 10 + (p * d) / 20) * 200 / (w + 100) * 1.4 + 18) * kbg / 100) + bkb;
}

export function hitlagFrames(d, mul = 1) {
  return Math.min(22, Math.floor((d * 0.42 + 4) * mul));
}
