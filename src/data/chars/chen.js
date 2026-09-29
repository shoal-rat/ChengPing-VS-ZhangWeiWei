// 陈平 · 不等式教授 — zoner. Kit built on 陈平不等式 (¥2000 > $3000), the Texas
// blackout of 2021 that revealed where the "anti-US fighter" actually lives, and the
// 2025 小红书 bill-comparing episode that turned the inequality into a 回旋镖.
import { H } from "../common.js";
import { Projectile } from "../../sim/projectile.js";
import { finalBeam } from "../fs.js";

const ineqShot = (f, w) => {
  const c = Math.min(1, f.charge / 60);
  const [x, y] = f.bone("pt");
  w.spawnProjectile(new Projectile({
    owner: f, kind: "ineq", x, y: y - 4, vx: f.facing * (8.5 + 4 * c), vy: 0, r: 14 + 20 * c, life: 70 + 30 * c,
    hb: { dmg: 4 + 14 * c, ang: 40, bkb: 22 + 28 * c, kbg: 45 + 45 * c, eff: "chalk" },
    data: { c }, clank: c > 0.8 ? 2 : 1, moveId: "nspec", solid: true,
  }));
};

export default {
  id: "chen", name: "陈平", title: "不等式教授", en: "CHEN PING",
  color: "#e0873a", color2: "#ffd27a",
  tagline: "反美是工作,赴美是生活",
  stats: { weight: 88, walk: 4.4, walkAccel: 1.1, run: 10.8, dash: 11.5, dashFrames: 12, runAccel: 1.0, traction: 0.95,
    air: 6.4, airAccel: 0.42, gravity: 0.88, fall: 13.2, fastFall: 19.5, jumpV: 19.6, shortV: 13.2, djV: 18.4,
    jumps: 2, jumpsquat: 3, roll: 10, brake: 10 },
  body: { leg: [21, 21], torso: 38, torsoW: 36, arm: [20, 19], armW: [13, 12], legW: [16, 14], hand: 8, foot: [21, 10],
    neck: 5, shoulderDrop: 6, shoulderFwd: 2, shoulderBack: 4, hipW: 3, headR: 33, headH: 78, headDX: -2, headDY: 6,
    ecbW: 20, ecbH: 118, hang: 108, shieldR: 60, propLen: 50, holdDist: 54 },
  look: { head: "chen", skin: "#f2c09a", skinSh: "#d99c78", sleeve: "#cf8740", sleeveSh: "#a2622a", cuff: "#b8d3ee",
    pants: "#4d3528", pantsSh: "#34241b", shoe: "#71452a", sole: "#2c1a12",
    torso: { type: "jacket", jacket: "#cf8740", jacketSh: "#a2622a", inner: "#efe2c2", innerSh: "#d4c29c", collar: "#b8d3ee", zip: true },
    prop: "pointer" },
  stance: { lean: 4, hd: -2, fa: 42, fe: 48, pa: -8, ba: -18, be: 70, fl: 14, fk: 18, bl: -12, bk: 12, fh: "grip", bh: "fist" },
  loco: { runLean: 4 },
  taunt: [[0, {}], [10, { fa: 150, fe: 10, pa: 0, lean: -6, ex: 4, ba: 30, be: 110 }], [50, { fa: 140, fe: 20, ex: 4, lean: -4 }], [70, {}]],
  tauntLen: 70,
  tauntLines: ["美国人民生活在水深火热之中!", "在中国拿两千块,比美国三千美元舒服!", "德州今天停电了,我先下线。"],
  ai: { style: "zoner", range: 430, aggro: 0.45, proj: ["nspec", "sspec"], close: ["dspec"], fs: "beam" },
  moves: {
    jab1: { dur: 16, iasa: 14, jab: 5,
      anim: [[0, { fa: 60, fe: 40 }], [3, { fa: 88, fe: 4, pa: 0, lean: 10, ex: 1 }, "snap"], [7, { fa: 86, fe: 6, lean: 9 }], [16, {}]],
      hb: [H([3, 4], "pt", 11, 2, 80, 6, 25), H([3, 4], "pm", 10, 2, 80, 6, 25)], sfx: { 2: "swingS" } },
    jab2: { dur: 17, iasa: 15, jab: 5,
      anim: [[0, { fa: 70, fe: 30 }], [3, { fa: 96, fe: 0, pa: 0, lean: 13, ex: 1 }, "snap"], [8, { fa: 92, fe: 4, lean: 12 }], [17, {}]],
      hb: [H([3, 4], "pt", 11, 2, 75, 6, 25), H([3, 4], "pm", 10, 2, 75, 6, 25)], sfx: { 2: "swingS" } },
    jab3: { dur: 30, iasa: 28,
      anim: [[0, { fa: 160, fe: 20, lean: -6 }], [5, { fa: 70, fe: 0, pa: 0, lean: 18, ex: 1 }, "snap"], [12, { fa: 60, fe: 5, lean: 16 }], [30, {}]],
      hb: [H([5, 7], "pt", 14, 4, 40, 48, 80, { eff: "chalk" }), H([5, 7], "pm", 12, 4, 40, 48, 80)], sfx: { 4: "swingM" } },
    ftilt: { dur: 30, iasa: 28,
      anim: [[0, { fa: 40, fe: 80, lean: -4, px: -4 }], [7, { fa: 92, fe: 0, pa: 0, lean: 20, px: 8, fl: 50, fk: 20, bl: -30, bk: 5, ex: 1 }, "snap"], [14, { fa: 90, fe: 0, lean: 18, px: 8, fl: 50, bl: -30 }], [30, {}]],
      hb: [H([7, 9], "pt", 13, 9.5, 361, 12, 95, { eff: "chalk" }), H([7, 9], "pm", 11, 7.5, 361, 10, 90)], sfx: { 6: "swingM" } },
    utilt: { dur: 30, iasa: 27,
      anim: [[0, { fa: 70, fe: 20, lean: 6 }], [6, { fa: 160, fe: 10, pa: 0, lean: -4, ex: 1 }, "snap"], [10, { fa: 210, fe: 10, lean: -10 }], [30, {}]],
      hb: [H([6, 10], "pt", 15, 7, 96, 30, 112), H([6, 10], "pm", 13, 6, 96, 30, 108)], sfx: { 5: "swingM" } },
    dtilt: { dur: 22, iasa: 20,
      anim: [[0, { py: 16, fl: 85, fk: 130, bl: -15, bk: 120, lean: 28, fa: 40, fe: 40 }], [5, { py: 16, fl: 85, fk: 130, bl: -15, bk: 120, lean: 32, fa: 75, fe: 0, pa: 5, ex: 1 }, "snap"], [12, { py: 16, fl: 85, fk: 130, bl: -15, bk: 120, lean: 30, fa: 60, fe: 0 }], [22, { py: 14, fl: 80, fk: 120, bl: -15, bk: 110, lean: 25 }]],
      hb: [H([5, 7], "pt", 12, 6, 78, 42, 55), H([5, 7], "pm", 11, 5, 78, 42, 55)], sfx: { 4: "swingS" } },
    dashAtk: { dur: 38, iasa: 36, slide: true, traction: 0.5, vel: [{ f: 1, vx: 11 }],
      anim: [[0, { lean: 20, fa: 30, fe: 80 }], [6, { lean: 34, fa: 110, fe: 10, pa: 0, fl: 60, fk: 30, bl: -50, bk: 20, ex: 1 }, "snap"], [20, { lean: 30, fa: 100, fe: 10, fl: 50, bl: -40 }], [38, {}]],
      hb: [H([6, 10], "pt", 15, 9, 62, 60, 62), H([6, 10], "ctr", 22, 8, 62, 60, 60), H([11, 18], "pt", 12, 6, 70, 50, 50)], sfx: { 5: "swingM" }, say: { 6: "赶飞机!" } },
    fsmash: { dur: 50, iasa: 48, charge: 9,
      anim: [[0, { fa: 170, fe: 40, lean: -14, px: -6, pa: 0 }], [9, { fa: 200, fe: 30, lean: -22, px: -10, ex: 1 }], [16, { fa: 70, fe: 0, lean: 26, px: 10, fl: 60, fk: 25, bl: -35, bk: 5, ex: 1 }, "snap"], [22, { fa: 55, fe: 0, lean: 24, px: 10, fl: 60, bl: -35 }], [50, {}]],
      hb: [H([16, 18], "pt", 17, 17, 361, 28, 100, { eff: "chalk", lag: 1.15 }), H([16, 18], "pm", 14, 15, 361, 26, 98)],
      sfx: { 15: "swingL" }, say: { 16: "敲黑板!" } },
    usmash: { dur: 44, iasa: 42, charge: 5,
      anim: [[0, { py: 12, fk: 50, bk: 40, fa: 20, fe: 60, ba: 20, be: 60, lean: 16 }], [5, { py: 14, fk: 55, bk: 45, fa: 10, ba: 10, lean: 20 }], [11, { py: -6, fa: 175, fe: 0, ba: 170, be: 10, pa: 0, lean: -6, ex: 1, sy: 1.06 }, "snap"], [18, { fa: 180, ba: 175, lean: -8 }], [44, {}]],
      hb: [H([11, 14], "pt", 22, 14, 88, 34, 98, { eff: "chalk" }), H([11, 14], "fh", 18, 13, 88, 34, 95), H([15, 20], "pt", 18, 9, 85, 30, 90)],
      sfx: { 10: "swingL" }, fx: { 11: "chalkUp" } },
    dsmash: { dur: 46, iasa: 44, charge: 4,
      anim: [[0, { py: 14, fk: 60, bk: 50, lean: 20, fa: 60, fe: 40 }], [8, { py: 16, fl: 70, fk: 100, lean: 30, fa: 88, fe: 0, pa: 8, ex: 1 }, "snap"], [12, { py: 16, fl: 70, fk: 100, lean: 20, fa: 30, fe: 10 }], [16, { py: 16, fl: 70, fk: 100, lean: 10, fa: -80, fe: 0, pa: 8, ex: 1 }, "snap"], [22, { py: 14, fa: -70, lean: 8 }], [46, {}]],
      hb: [H([8, 10], "pt", 15, 12, 30, 26, 96), H([8, 10], "pm", 13, 11, 30, 26, 94), H([16, 18], "pt", 15, 13, 32, 28, 98, { back: true }), H([16, 18], "pm", 13, 12, 32, 28, 96, { back: true })],
      sfx: { 7: "swingM", 15: "swingM" } },
    nair: { dur: 36, iasa: 34, land: 8, ac: [[0, 3], [26, 99]],
      anim: [[0, { fa: 60, fe: 40, fl: 60, fk: 90 }], [4, { rot: 60, fa: 95, fe: 0, pa: 0, ba: -80, fl: 70, fk: 80, ex: 1 }], [12, { rot: 250, fa: 95, fe: 0, ba: -80, fl: 70, fk: 80 }], [18, { rot: 360, fa: 95, fe: 0, fl: 70, fk: 80 }], [36, {}]],
      hb: [H([4, 9], "pt", 15, 8.5, 361, 12, 96, { rev: true }), H([4, 9], "ctr", 22, 8, 361, 12, 95, { rev: true }), H([10, 18], "pt", 13, 5, 361, 5, 90, { rev: true })],
      sfx: { 3: "spin" } },
    fair: { dur: 40, iasa: 38, land: 13, ac: [[0, 4], [32, 99]],
      anim: [[0, { fa: 180, fe: 20, lean: -10 }], [9, { fa: 200, fe: 20, lean: -14 }], [13, { fa: 60, fe: 0, pa: 0, lean: 22, ex: 1 }, "snap"], [20, { fa: 40, fe: 0, lean: 18 }], [40, {}]],
      hb: [H([13, 15], "pt", 16, 12, 361, 22, 96, { eff: "chalk" }), H([13, 15], "pm", 13, 10, 361, 20, 94)], sfx: { 12: "swingL" } },
    bair: { dur: 34, iasa: 32, land: 9, ac: [[0, 3], [26, 99]],
      anim: [[0, { bl: -20, bk: 90, fl: 50, fk: 90, lean: 20 }], [7, { bl: -95, bk: 0, fl: 60, fk: 90, lean: 30, hd: 20, ex: 1 }, "snap"], [14, { bl: -90, bk: 5, lean: 28 }], [34, {}]],
      hb: [H([7, 9], "bf", 16, 12.5, 361, 12, 100, { back: true }), H([10, 14], "bf", 13, 8, 361, 8, 95, { back: true })], sfx: { 6: "swingM" } },
    uair: { dur: 32, iasa: 30, land: 7, ac: [[0, 3], [24, 99]],
      anim: [[0, { fa: 100, fe: 20 }], [5, { fa: 150, fe: 0, pa: 0, lean: -6, ex: 1 }, "snap"], [9, { fa: 210, fe: 0, lean: -12 }], [13, { fa: 250, fe: 10 }], [32, {}]],
      hb: [H([5, 12], "pt", 16, 8, 80, 25, 112), H([5, 12], "pm", 13, 7, 80, 25, 108)], sfx: { 4: "swingM" } },
    dair: { dur: 44, iasa: 42, land: 16, ac: [[0, 3], [36, 99]],
      anim: [[0, { fa: 120, fe: 30, fl: 60, fk: 100, bl: 30, bk: 100 }], [12, { fa: 140, fe: 20, lean: -10 }], [15, { fa: 2, fe: 0, pa: 0, lean: 18, ex: 1, fl: 30, fk: 40 }, "snap"], [22, { fa: 5, fe: 0, lean: 14 }], [44, {}]],
      hb: [H([15, 16], "pt", 15, 13, 275, 20, 92, { eff: "chalk", lag: 1.2 }), H([17, 22], "pt", 13, 9, 60, 20, 85)], sfx: { 14: "swingL" } },
    grab: { dur: 32, grab: { f: [6, 8], x: 58, y: -52, w: 30, h: 26 },
      anim: [[0, { fa: 50, fe: 60 }], [6, { fa: 90, fe: 0, ba: 85, be: 10, lean: 14, fh: "open", bh: "open" }, "snap"], [12, { fa: 88, fe: 5, ba: 85, lean: 12 }], [32, {}]], sfx: { 5: "whiff" } },
    dashGrab: { dur: 40, grab: { f: [9, 11], x: 66, y: -52, w: 34, h: 26 }, slide: true, traction: 0.6,
      anim: [[0, { lean: 20 }], [9, { fa: 92, fe: 0, ba: 88, be: 10, lean: 26, fh: "open", bh: "open", fl: 50, bl: -40 }, "snap"], [16, { fa: 90, ba: 85, lean: 22 }], [40, {}]] },
    fthrow: { dur: 34, throw: { f: 12, dmg: 8, ang: 45, bkb: 72, kbg: 55 },
      anim: [[0, { fa: 90, fe: 10 }], [8, { fa: 60, fe: 70, lean: -8 }], [12, { fa: 100, fe: 0, lean: 22, ex: 1 }, "snap"], [34, {}]], say: { 12: "上课!" }, sfx: { 11: "throw" } },
    bthrow: { dur: 40, throw: { f: 18, dmg: 11, ang: 45, bkb: 62, kbg: 72, back: true, bone: "fh", oy: -10 },
      anim: [[0, { fa: 90, fe: 10 }], [10, { fa: 170, fe: 10, lean: -18, ex: 1 }], [18, { fa: 240, fe: 10, lean: -30, rot: -20 }, "snap"], [40, {}]], say: { 18: "润!" }, sfx: { 17: "throw" } },
    uthrow: { dur: 36, throw: { f: 14, dmg: 7, ang: 90, bkb: 72, kbg: 62 },
      anim: [[0, { fa: 90, fe: 10 }], [8, { fa: 60, fe: 60, py: 10 }], [14, { fa: 180, fe: 0, ba: 175, be: 0, py: -4, ex: 1 }, "snap"], [36, {}]], sfx: { 13: "throw" } },
    dthrow: { dur: 38, throw: { f: 16, dmg: 6, ang: 72, bkb: 70, kbg: 34, hangY: 60 },
      anim: [[0, { fa: 90, fe: 10 }], [10, { fa: 150, fe: 20, lean: -6 }], [16, { fa: 20, fe: 0, lean: 30, py: 10, ex: 1 }, "snap"], [38, {}]], say: { 16: "学点经济学。" }, sfx: { 15: "slam" } },

    // ---- specials
    nspec: { dur: 38, iasa: 36, charge: 8, chargeKey: "spc", noDrift: false, driftMul: 0.4, gravMul: 0.6,
      anim: [[0, { fa: 100, fe: 50, lean: -4 }], [8, { fa: 150, fe: 40, ba: 60, be: 90, lean: -10, ex: 1 }], [11, { fa: 92, fe: 0, pa: 0, lean: 16, ex: 1 }, "snap"], [20, { fa: 90, fe: 0, lean: 12 }], [38, {}]],
      script: (f, mf, w) => { if (mf === 11) { ineqShot(f, w); w.emit({ t: "sfx", id: "chalkShot", f }); } },
      say: { 11: "¥2000 > $3000!" } },
    sspec: { dur: 40, iasa: 38, driftMul: 0.5,
      canUse: (f, w) => !w.projectiles.some((p) => p.owner === f && p.kind === "boomer"),
      anim: [[0, { fa: -40, fe: 60, lean: -10, ba: 40 }], [10, { fa: -60, fe: 80, lean: -16 }], [13, { fa: 100, fe: 0, pa: 0, lean: 20, ex: 1 }, "snap"], [22, { fa: 80, fe: 10, lean: 12 }], [40, {}]],
      script: (f, mf, w) => {
        if (mf !== 13) return;
        const [x, y] = f.bone("fh");
        w.spawnProjectile(new Projectile({
          owner: f, kind: "boomer", x, y, vx: f.facing * 13, vy: 0, r: 20, life: 150, spin: 0.45 * f.facing, clank: 1,
          hb: { dmg: 7, ang: 45, bkb: 30, kbg: 55, eff: "chalk" }, moveId: "sspec", reflectable: true,
          update: (p, W) => {
            if (p.age < 24) { p.vx *= 0.93; }
            else {
              if (!p.data.back) { p.data.back = true; p.hitSet.clear(); p.hb = { dmg: 4.5, ang: 30, bkb: 30, kbg: 45, eff: "chalk" }; }
              const o = p.owner; if (!o || o.dead) { p.kill(W, "expire"); return; }
              const [ox, oy] = o.centre();
              const dx = ox - p.x, dy = oy - p.y, d = Math.hypot(dx, dy) || 1;
              p.vx += dx / d * 1.1; p.vy += dy / d * 1.1;
              const sp = Math.hypot(p.vx, p.vy); if (sp > 14) { p.vx *= 14 / sp; p.vy *= 14 / sp; }
              p.dir = Math.sign(p.vx) || 1;
              if (d < 30) p.kill(W, "caught");
            }
          },
        }));
        w.emit({ t: "sfx", id: "boomer", f });
      },
      say: { 13: "回旋镖!" } },
    uspec: { dur: 42, end: "helpless", noDrift: false, driftMul: 0.55, gravMul: 0.45, ledgeGrab: 20,
      onStart: (f) => { f.upBUsed = true; f.vars.uspecDir = f.pad.mx; },
      vel: [{ f: 8, vy: -18.5 }],
      anim: [[0, { py: 12, fk: 60, bk: 50, fa: 30, ba: 30, lean: 10 }], [7, { py: 14, fk: 70, bk: 60, lean: 14 }], [10, { py: -4, fa: 175, fe: 0, ba: 168, be: 0, fl: 5, fk: 5, bl: -5, bk: 10, pa: 0, ex: 1, sy: 1.1, sx: 0.92 }, "snap"], [26, { fa: 170, ba: 160, sy: 1.0, sx: 1 }], [30, { fa: 120, fe: 60, ba: 100, lean: -10, fl: 40, fk: 60 }], [42, { fa: 150, ba: 140, fl: 20, fk: 30 }]],
      script: (f, mf) => { if (mf === 8) f.vx = f.vars.uspecDir * 4.5; },
      hb: [H([8, 18], "ff", 26, 1.5, 88, 0, 100, { fkb: 55, rehit: 4, eff: "water", grp: 1, noTumble: true }),
        H([26, 29], "hc", 42, 8, 80, 60, 72, { eff: "fire", grp: 2 })],
      fx: { 8: "geyser", 26: "fireBurst" }, say: { 9: "水深——", 26: "火热!" }, sfx: { 8: "water", 26: "fire" } },
    dspec: { dur: 50, iasa: 46, driftMul: 0.5, gravMul: 0.7,
      anim: [[0, { fa: 60, fe: 90, ba: 70, be: 80, lean: -6 }], [12, { fa: 95, fe: 10, ba: 90, be: 10, lean: 14, fh: "open", bh: "open", ex: 1 }, "snap"], [34, { fa: 95, fe: 10, ba: 88, be: 12, lean: 14 }], [50, {}]],
      hb: [H([12, 28], "fh", 46, 1.2, 60, 0, 100, { fkb: 18, x: 34, rehit: 6, eff: "ice", grp: 1, stunMul: 0.8 }),
        H([30, 32], "fh", 50, 4, 45, 30, 40, { x: 38, eff: "ice", grp: 2,
          onHit: (a, v) => { if (v.status.iceImmune) return; v.pendingKB = null; v.stun(Math.round(46 + v.percent * 0.35), "ice"); v.status.iceImmune = { t: 300 }; } })],
      fx: { 12: "blizzard" }, say: { 12: "德州大停电!" }, sfx: { 12: "wind" } },
    final: { dur: 150, fs: true, intan: [[0, 150]], noDrift: true, gravMul: 0,
      onStart: (f, w) => { w.emit({ t: "fs", f, name: "陈平不等式", line: "在中国拿两千块钱,比在美国拿三千美元舒服得多!" }); w.freeze = 60; f.vx = 0; f.vy = 0; },
      anim: [[0, { fa: 160, fe: 10, ba: 150, be: 20, lean: -8, ex: 1 }], [30, { fa: 92, fe: 0, pa: 0, ba: 80, be: 20, lean: 14, ex: 1 }, "snap"], [130, { fa: 92, fe: 0, lean: 14, ex: 1 }], [150, {}]],
      script: (f, mf, w) => { if (mf === 30) finalBeam(f, w, { kind: "fsIneq", len: 2400, h: 190, life: 100, tick: 6, dmg: 2.2, final: { dmg: 22, ang: 38, bkb: 95, kbg: 62 } }); } },
  },
};
