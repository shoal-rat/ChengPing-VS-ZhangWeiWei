// Shared character machinery: procedural locomotion, default moves, and the builder
// that resolves keyframes against each character's stance.
import { neutralPose, solveRig, newJoints, bonePoint } from "../sim/rig.js";
import { resolveAnim, samplePose, copyPose } from "../sim/anim.js";

// ------------------------------------------------------------------ hitbox helper
// H(frames, bone, r, dmg, ang, bkb, kbg, extra)
export function H(f, bone, r, dmg, ang, bkb, kbg, extra = {}) {
  return { f: Array.isArray(f) ? f : [f, f], bone, r, dmg, ang, bkb, kbg, ...extra };
}

// ------------------------------------------------------------------ locomotion
const S = Math.sin, C = Math.cos;
export function locomotion(f, P, def) {
  const B = def.base;
  copyPose(B, P);
  const st = f.state, t = f.sf, T = f.world.frame + f.slot * 17;
  const L = def.loco || {};
  switch (st) {
    case "idle": case "respawn": case "shielddrop": case "land": case "jumpsquat": case "runbrake": case "runturn": {
      const b = S(T * 0.075);
      P.py += b * 1.4; P.fa += b * 4; P.ba -= b * 3; P.lean += b * 1.2; P.hd -= b * 1.5;
      if (st === "land" || st === "jumpsquat") {
        const k = st === "land" ? Math.max(0, 1 - t / Math.max(3, f.landLag)) : 1;
        P.py += 10 * k; P.fk += 35 * k; P.bk += 30 * k; P.fl += 18 * k; P.lean += 10 * k;
        P.sy = 1 - 0.1 * k; P.sx = 1 + 0.08 * k;
      }
      if (st === "runbrake") { P.lean = -14; P.fl = 55; P.fk = 12; P.bl = -32; P.bk = 45; P.fa = 120; P.fe = 30; P.ba = 60; P.py += 6; }
      if (st === "runturn") { P.lean = -20; P.fl = 60; P.fk = 10; P.bl = -30; P.bk = 50; P.fa = 140; P.ba = 100; P.py += 8; }
      if (f.teeter && st === "idle") {
        P.lean = 18 + S(T * 0.4) * 10; P.fa = 150 + S(T * 0.5) * 40; P.ba = 130 + C(T * 0.5) * 40; P.fe = 10; P.be = 10; P.ex = 2;
      }
      f.teeter = false;
      break;
    }
    case "walk": {
      f.walkPh = (f.walkPh || 0) + Math.abs(f.vx) * 0.085;
      const ph = f.walkPh, s1 = S(ph), c1 = C(ph);
      P.fl = 4 + 30 * s1; P.bl = 4 - 30 * s1;
      P.fk = 12 + 34 * Math.max(0, c1); P.bk = 12 + 34 * Math.max(0, -c1);
      P.fa = (B.fa * 0.4) - 26 * s1; P.ba = (B.ba * 0.4) + 26 * s1;
      P.fe = B.fe * 0.6; P.be = B.be * 0.6;
      P.py += -2.2 * Math.abs(C(ph)); P.lean += 4;
      break;
    }
    case "dash": case "run": {
      f.walkPh = (f.walkPh || 0) + Math.abs(f.vx) * 0.06;
      const ph = f.walkPh, s1 = S(ph), c1 = C(ph);
      const k = st === "dash" && t < 4 ? t / 4 : 1;
      P.lean = 20 * k + (L.runLean || 0); P.hd = -8;
      P.fl = 8 + 50 * s1; P.bl = 8 - 50 * s1;
      P.fk = 20 + 70 * Math.max(0, c1); P.bk = 20 + 70 * Math.max(0, -c1);
      P.fa = 30 - 55 * s1; P.ba = 30 + 55 * s1; P.fe = 95; P.be = 95;
      P.py += -4 * Math.abs(c1) + 2;
      break;
    }
    case "crouch": {
      P.py += 18; P.fl = 85; P.fk = 135; P.bl = -15; P.bk = 125; P.lean = 26; P.hd = -10;
      P.fa = 70; P.fe = 70; P.ba = 50; P.be = 90;
      break;
    }
    case "air": case "tumble": case "helpless": case "airdodge": {
      if (st === "tumble") {
        P.rot = t * 13; P.ex = 3;
        P.fa = 150; P.fe = 40; P.ba = 200; P.be = 30; P.fl = 60; P.fk = 30; P.bl = -40; P.bk = 50;
        break;
      }
      const vy = f.vy + f.kby;
      const since = f.world.frame - (f.djFrame || -99);
      if (vy < -2) {
        P.fl = 55; P.fk = 95; P.bl = 15; P.bk = 85; P.fa = 125; P.fe = 40; P.ba = 95; P.be = 50; P.lean = 4;
      } else {
        const k = Math.min(1, (vy + 2) / 10);
        P.fl = 25 - 10 * k; P.fk = 40 - 15 * k; P.bl = -8; P.bk = 45; P.fa = 130 + 25 * k; P.fe = 35; P.ba = 115 + 25 * k; P.be = 35;
        if (f.fastfall) { P.fa = 172; P.ba = 165; P.fe = 5; P.be = 5; P.fl = 8; P.fk = 6; P.bl = -6; P.bk = 8; P.sy = 1.06; P.sx = 0.95; }
      }
      if (since < 24 && st === "air") {
        const k = since / 24;
        P.rot = k * 360 * (L.djSpin ?? 1);
        P.fl = 90; P.fk = 120; P.bl = 60; P.bk = 120; P.fa = 100; P.fe = 110; P.ba = 90; P.be = 110;
      }
      if (st === "helpless") {
        P.fa = 170 + S(T * 0.3) * 10; P.fe = 10; P.ba = 160; P.be = 15; P.fl = 15; P.fk = 25; P.bl = -10; P.bk = 30;
        P.lean = -10; P.ex = 2;
      }
      if (st === "airdodge") {
        P.fl = 80; P.fk = 110; P.bl = 50; P.bk = 110; P.fa = 60; P.fe = 110; P.ba = 50; P.be = 110; P.lean = 15;
        if (f.adDir) P.rot = (t / f.adLen) * 360 * (f.adDir[0] >= 0 ? 1 : -1) * f.facing * 0.5;
      }
      break;
    }
    case "shield": case "shieldstun": {
      P.py += 8; P.fk += 30; P.bk += 25; P.fl += 15; P.lean = 12; P.hd = -6;
      P.fa = 75; P.fe = 105; P.ba = 85; P.be = 95;
      if (st === "shieldstun") P.px -= 3;
      break;
    }
    case "spotdodge": {
      const k = S(Math.min(1, t / f.dodgeLen) * Math.PI);
      P.px = -12 * k; P.lean = -18 * k; P.fa = 30; P.ba = -20; P.fe = 60; P.be = 60; P.py += 6 * k;
      break;
    }
    case "roll": case "tech": {
      const len = st === "roll" ? 22 : (f.techKind === "roll" ? 26 : 16);
      const k = Math.min(1, t / len);
      const dir = st === "roll" ? -1 : (f.techKind === "roll" ? (f.techDir === f.facing ? 1 : -1) : 1);
      if (t < len) {
        P.rot = k * 360 * dir; P.py += 18;
        P.fl = 110; P.fk = 150; P.bl = 90; P.bk = 150; P.fa = 120; P.fe = 130; P.ba = 110; P.be = 130; P.lean = 30;
      }
      break;
    }
    case "hitstun": {
      P.ex = 2; P.lean = -26; P.hd = -22;
      P.fa = 150 + S(t * 0.9) * 20; P.fe = 40; P.ba = 125; P.be = 30;
      P.fl = 40; P.fk = 55; P.bl = -30; P.bk = 50;
      if (f.grounded) { P.fl = 15; P.bl = -25; P.fk = 25; P.bk = 30; P.lean = -20; }
      else if (f.tumble && f.hitstun < 30) { P.rot = -(t * 8); }
      break;
    }
    case "down": {
      P.rot = -90; P.py = 42; P.ex = 3;
      P.fa = 170; P.fe = 20; P.ba = 150; P.be = 30; P.fl = 20; P.fk = 30; P.bl = 5; P.bk = 20; P.lean = 0; P.hd = 0;
      break;
    }
    case "getup": {
      const k = Math.min(1, t / 18);
      P.rot = -90 * (1 - k); P.py = 42 * (1 - k); P.lean = 20 * (1 - k);
      P.fl = 60; P.fk = 90 * (1 - k) + B.fk * k;
      break;
    }
    case "ledge": {
      P.fa = 168; P.fe = 6; P.ba = 160; P.be = 12; P.lean = 0; P.hd = 10;
      P.fl = 10 + S(T * 0.06) * 6; P.fk = 30; P.bl = -6; P.bk = 40; P.py = 0; P.px = -6;
      break;
    }
    case "ledgeact": {
      const k = Math.min(1, t / 14);
      P.fa = 168 * (1 - k) + B.fa * k; P.ba = 160 * (1 - k) + B.ba * k;
      P.fl = 80 * (1 - k) + B.fl * k; P.fk = 100 * (1 - k) + B.fk * k; P.lean = 30 * (1 - k);
      if (f.ledgeKind === "roll" && t < 30 && t > 12) { P.rot = -((t - 12) / 18) * 360; P.py += 16; P.fl = 110; P.fk = 150; }
      break;
    }
    case "grabbing": {
      P.fa = 88; P.fe = 18; P.ba = 80; P.be = 30; P.lean = 8; P.fh = "open"; P.bh = "open";
      if (f.pummelT) { const k = S(Math.min(1, f.pummelT / 8) * Math.PI); P.ba = 80 + 30 * k; P.be = 10; P.lean = 8 + 10 * k; P.ex = 1; }
      break;
    }
    case "grabbed": case "thrown": {
      P.ex = 2; P.fa = 160 + S(T * 0.6) * 15; P.fe = 30; P.ba = 150 + C(T * 0.6) * 15; P.be = 30;
      P.fl = 20 + S(T * 0.5) * 20; P.fk = 40; P.bl = -10 - S(T * 0.5) * 20; P.bk = 40; P.lean = -12;
      if (st === "thrown") P.rot = -t * 10;
      break;
    }
    case "dizzy": case "stun": {
      const sw = S(T * 0.09);
      P.ex = st === "dizzy" ? 3 : 2; P.lean = sw * 14; P.hd = -sw * 10;
      P.fa = 8; P.fe = 12; P.ba = -6; P.be = 12; P.fh = "open"; P.bh = "open"; P.py += 4;
      if (f.stunKind === "money") { P.fa = 70; P.fe = 60; P.ba = 65; P.be = 70; P.lean = 22; P.hd = 15; P.ex = 4; }
      if (f.stunKind === "ice") { copyPose(B, P); P.ex = 2; }
      if (!f.grounded) { P.rot = S(T * 0.2) * 20; }
      break;
    }
    case "taunt": {
      if (def._taunt) samplePose(def._taunt, t, P);
      break;
    }
    case "fsCine": {
      if (f.cinePose) f.cinePose(f, P);
      break;
    }
  }
}

// ------------------------------------------------------------------ default moves
export function defaultMoves() {
  return {
    getupAtk: {
      dur: 40, iasa: 38, intan: [[0, 18]],
      anim: [[0, { rot: -70, py: 36 }], [10, { rot: -20, py: 10, fl: 90, fk: 0, bl: -80, bk: 0, lean: 20 }],
        [18, { fl: -80, fk: 0, bl: 90, bk: 0, lean: 20 }], [40, {}]],
      hb: [H([12, 14], "ff", 20, 7, 30, 60, 50, { rev: true }), H([18, 20], "bf", 20, 7, 30, 60, 50, { rev: true })],
      sfx: { 11: "swingM" },
    },
    ledgeAtk: {
      dur: 50, iasa: 48, intan: [[0, 22]],
      anim: [[0, { py: 20, lean: 30, fl: 80, fk: 100 }], [16, { py: 0, lean: 10 }], [22, { fl: 100, fk: 0, lean: 28, ex: 1 }], [30, { fl: 80, fk: 20 }], [50, {}]],
      hb: [H([22, 25], "ff", 22, 9, 45, 70, 30)],
      sfx: { 21: "swingM" },
    },
    // held keyboard (键盘) swings
    itemSwing: {
      dur: 30, iasa: 28, weapon: true,
      anim: [[0, { fa: 170, fe: 20, lean: -8 }], [7, { fa: 60, fe: 0, lean: 18, ex: 1 }, "snap"], [14, { fa: 30, fe: 10, lean: 12 }], [30, {}]],
      hb: [H([7, 10], "fh", 30, 9, 50, 35, 75, { x: 18, eff: "keys", onHit: (a, v, w) => w.items.useWeapon(a) })],
      sfx: { 6: "swingL" }, say: { 7: "键盘侠!" },
    },
    itemDash: {
      dur: 34, iasa: 32, weapon: true, slide: true, vel: [{ f: 1, vx: 9 }],
      anim: [[0, { fa: 150, fe: 20, lean: 10 }], [8, { fa: 70, fe: 0, lean: 25, ex: 1 }, "snap"], [34, {}]],
      hb: [H([8, 12], "fh", 30, 10, 45, 50, 70, { x: 16, eff: "keys", onHit: (a, v, w) => w.items.useWeapon(a) })],
      sfx: { 7: "swingL" },
    },
    itemSmash: {
      dur: 52, iasa: 50, weapon: true, charge: 10,
      anim: [[0, { fa: 200, fe: 30, lean: -20, px: -6 }], [10, { fa: 215, fe: 40, lean: -26, px: -8 }], [16, { fa: 75, fe: 0, lean: 26, px: 8, ex: 1 }, "snap"], [26, { fa: 40, fe: 0, lean: 18 }], [52, {}]],
      hb: [H([16, 19], "fh", 34, 22, 40, 50, 102, { x: 20, eff: "keys", lag: 1.2, onHit: (a, v, w) => w.items.useWeapon(a) })],
      sfx: { 15: "swingXL" }, say: { 16: "键盘侠,全力一击!" },
    },
    itemAir: {
      dur: 30, iasa: 28, aerial: true, land: 10, weapon: true,
      anim: [[0, { fa: 170, fe: 20 }], [7, { fa: 60, fe: 0, ex: 1 }, "snap"], [30, {}]],
      hb: [H([7, 10], "fh", 30, 9, 45, 35, 75, { x: 18, eff: "keys", onHit: (a, v, w) => w.items.useWeapon(a) })],
      sfx: { 6: "swingL" },
    },
  };
}

// ------------------------------------------------------------------ builder
const AERIALS = new Set(["nair", "fair", "bair", "uair", "dair"]);

export function buildChar(def) {
  const base = { ...neutralPose(), ...def.stance };
  def.base = base;
  def.moves = { ...defaultMoves(), ...def.moves };
  for (const [id, m] of Object.entries(def.moves)) {
    m.id = id;
    if (AERIALS.has(id)) { m.aerial = true; if (m.airOnly == null) m.airOnly = true; }
    m._anim = resolveAnim(base, m.anim);
  }
  if (def.taunt) def._taunt = resolveAnim(base, def.taunt);
  def.locomotion = (f, P) => locomotion(f, P, def);
  def.reach = computeReach(def);
  return def;
}

// AI support: for each move, the box its hitboxes sweep (fighter-local, facing right),
// the first active frame and the total duration.
function computeReach(def) {
  const out = {};
  const j = newJoints();
  const P = { ...def.base };
  for (const [id, m] of Object.entries(def.moves)) {
    if (!m.hb || !m.hb.length) { out[id] = null; continue; }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, first = 1e9, dmg = 0, kb = 0;
    for (const h of m.hb) {
      first = Math.min(first, h.f[0]);
      dmg = Math.max(dmg, h.dmg);
      kb = Math.max(kb, (h.bkb || 0) + (h.kbg || 0));
      for (let f = h.f[0]; f <= h.f[1]; f++) {
        samplePose(m._anim, f, P);
        solveRig(def.body, P, !m.aerial, j);
        const b = bonePoint(j, h.bone || "ctr");
        const x = b[0] + (h.x || 0), y = b[1] + (h.y || 0);
        x0 = Math.min(x0, x - h.r); x1 = Math.max(x1, x + h.r); y0 = Math.min(y0, y - h.r); y1 = Math.max(y1, y + h.r);
      }
    }
    if (m.reachX) x1 = Math.max(x1, m.reachX);
    out[id] = { x0, x1, y0, y1, first, dur: m.dur, dmg, kb, charge: m.charge };
  }
  return out;
}
