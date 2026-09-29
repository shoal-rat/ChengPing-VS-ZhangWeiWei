// 张维为 · 走访百国 — counter/caster. Kit: 《中国震撼》 (his book, so everything
// "震撼"), 「我走访过一百多个国家」, 「中国人,你要自信」, 《中国超越》 and the netizen joke
// that he "凭一己之力把中国变成了发达国家".
import { H } from "../common.js";
import { Projectile } from "../../sim/projectile.js";
import { directHit } from "../kit.js";

const STAMPS = ["签证", "已走访", "第100国", "第101国"];

export default {
  id: "zhang", name: "张维为", title: "震撼百国", en: "ZHANG WEIWEI",
  color: "#3f7fe0", color2: "#ffd46b",
  tagline: "凭一己之力把中国变成发达国家",
  stats: { weight: 100, walk: 4.2, walkAccel: 1.0, run: 10.2, dash: 11, dashFrames: 12, runAccel: 0.9, traction: 1.0,
    air: 6.0, airAccel: 0.4, gravity: 0.92, fall: 13.6, fastFall: 20, jumpV: 19.2, shortV: 12.8, djV: 18,
    jumps: 2, jumpsquat: 3, roll: 9.5, brake: 11 },
  body: { leg: [20, 20], torso: 39, torsoW: 42, arm: [19, 18], armW: [14, 13], legW: [17, 15], hand: 8.5, foot: [21, 10],
    neck: 4, shoulderDrop: 6, shoulderFwd: 3, shoulderBack: 5, hipW: 4, headR: 34, headH: 80, headDX: -2, headDY: 6,
    ecbW: 22, ecbH: 118, hang: 106, shieldR: 62, propLen: 34, holdDist: 56 },
  look: { head: "zhang", skin: "#f3c7a4", skinSh: "#dba586", sleeve: "#2c3d6b", sleeveSh: "#1d2a4d", cuff: "#f5f7fb",
    pants: "#26345c", pantsSh: "#1a2442", shoe: "#1f1f26", sole: "#0e0e12", shoeHi: true,
    torso: { type: "suit", jacket: "#2c3d6b", jacketSh: "#1d2a4d", shirt: "#f5f7fb", tie: "#c8262c", tieStripe: "#f0c040", belly: 3, hip: 0.95 },
    prop: "book" },
  stance: { lean: -3, hd: -4, fa: 30, fe: 105, pa: 0, ba: -10, be: 40, fl: 12, fk: 14, bl: -12, bk: 12, fh: "grip", bh: "open" },
  taunt: [[0, {}], [12, { ba: 150, be: 30, bh: "open", lean: -10, hd: -10, ex: 4 }], [45, { ba: 140, be: 40, lean: -8, ex: 4 }], [70, {}]],
  tauntLen: 70,
  tauntLines: ["我走访过一百多个国家。", "中国人,你要自信!", "一出国,就爱国。", "西方,又被震撼了。"],
  ai: { style: "caster", range: 300, aggro: 0.55, proj: ["nspec"], counter: "dspec", mid: ["sspec"], fs: "front", upReach: 330 },
  moves: {
    jab1: { dur: 16, iasa: 14, jab: 5,
      anim: [[0, { ba: 30, be: 60 }], [3, { ba: 92, be: 5, bh: "open", lean: 8, ex: 1 }, "snap"], [8, { ba: 88, be: 8, lean: 7 }], [16, {}]],
      hb: [H([3, 4], "bh", 12, 2.2, 80, 6, 25, { x: 6 })], sfx: { 2: "swingS" }, txt: { 3: "指点" } },
    jab2: { dur: 17, iasa: 15, jab: 5,
      anim: [[0, { fa: 40, fe: 90 }], [3, { fa: 95, fe: 0, pa: 0, lean: 10, ex: 1 }, "snap"], [8, { fa: 90, fe: 4, lean: 9 }], [17, {}]],
      hb: [H([3, 4], "pm", 13, 2, 75, 6, 25)], sfx: { 2: "swingS" } },
    jab3: { dur: 30, iasa: 28,
      anim: [[0, { fa: 170, fe: 30, lean: -8 }], [5, { fa: 80, fe: 0, lean: 18, ex: 1 }, "snap"], [12, { fa: 70, fe: 5, lean: 16 }], [30, {}]],
      hb: [H([5, 7], "pm", 17, 4.5, 40, 50, 80), H([5, 7], "fh", 12, 4, 40, 50, 80)], sfx: { 4: "swingM" }, txt: { 5: "江山!" } },
    ftilt: { dur: 30, iasa: 27,
      anim: [[0, { fl: 40, fk: 90, lean: -8 }], [7, { fl: 92, fk: 0, lean: -14, bl: -10, bk: 5, ex: 1 }, "snap"], [13, { fl: 88, fk: 4, lean: -12 }], [30, {}]],
      hb: [H([7, 9], "ff", 16, 9, 361, 10, 95), H([7, 9], "fk", 13, 8, 361, 10, 92)], sfx: { 6: "swingM" }, txt: { 7: "一出国" } },
    utilt: { dur: 30, iasa: 26,
      anim: [[0, { fa: 60, fe: 60 }], [6, { fa: 175, fe: 0, pa: 0, lean: -6, ex: 1 }, "snap"], [12, { fa: 190, fe: 5, lean: -8 }], [30, {}]],
      hb: [H([6, 11], "pm", 20, 7.5, 94, 30, 112), H([6, 11], "fh", 14, 7, 94, 30, 108)], sfx: { 5: "swingM" } },
    dtilt: { dur: 24, iasa: 22,
      anim: [[0, { py: 14, fl: 80, fk: 120, bl: -20, bk: 110, lean: 26 }], [6, { py: 16, fl: 85, fk: 125, bl: -15, bk: 115, lean: 34, fa: 70, fe: 0, pa: 0, ex: 1 }, "snap"], [12, { py: 16, fl: 85, fk: 125, lean: 30, fa: 60, fe: 0 }], [24, { py: 12, fl: 75, fk: 110 }]],
      hb: [H([6, 8], "pm", 16, 6.5, 30, 35, 60), H([6, 8], "fh", 12, 6, 30, 35, 60)], sfx: { 5: "swingS" } },
    dashAtk: { dur: 40, iasa: 38, slide: true, traction: 0.35, vel: [{ f: 2, vx: 12 }],
      anim: [[0, { lean: 20 }], [5, { lean: 10, fl: 80, fk: 0, bl: -40, bk: 20, py: 10, fa: 120, fe: 20, ba: 100, ex: 1 }, "snap"], [24, { lean: 8, fl: 80, fk: 0, bl: -40, py: 10 }], [40, {}]],
      hb: [H([5, 9], "ff", 18, 10, 55, 60, 60), H([10, 20], "ff", 14, 6, 55, 50, 50)], sfx: { 4: "dash" }, say: { 5: "高铁速度!" } },
    fsmash: { dur: 52, iasa: 50, charge: 10,
      anim: [[0, { fa: 200, fe: 30, lean: -18, px: -6 }], [10, { fa: 215, fe: 30, lean: -26, px: -10, ex: 1 }], [17, { fa: 75, fe: 0, pa: 0, lean: 30, px: 12, fl: 60, fk: 25, bl: -35, bk: 5, ex: 1 }, "snap"], [24, { fa: 60, fe: 0, lean: 26, px: 12, fl: 60, bl: -35 }], [52, {}]],
      hb: [H([17, 19], "pm", 24, 17.5, 361, 28, 100, { lag: 1.2 }), H([17, 19], "fh", 16, 15, 361, 26, 96)],
      sfx: { 16: "swingXL" }, say: { 17: "中国震撼!" } },
    usmash: { dur: 46, iasa: 44, charge: 6,
      anim: [[0, { py: 12, fk: 50, bk: 45, ba: 20, be: 90, lean: 12 }], [6, { py: 14, fk: 55, bk: 50, lean: 16 }], [12, { py: -4, ba: 178, be: 0, bh: "open", fa: 150, fe: 20, lean: -6, ex: 1, sy: 1.06 }, "snap"], [20, { ba: 176, fa: 150, lean: -6 }], [46, {}]],
      hb: [H([12, 16], "bh", 24, 15, 88, 32, 98, { y: -10 }), H([12, 16], "hc", 26, 13, 88, 30, 95, { y: -20 })],
      sfx: { 11: "swingL" }, txt: { 12: "超越!" }, fx: { 12: "zhangBurst" } },
    dsmash: { dur: 48, iasa: 46, charge: 4,
      anim: [[0, { py: 14, fk: 60, bk: 55, lean: 18 }], [9, { py: 16, rot: 0, fa: 90, fe: 0, pa: 0, ba: -90, be: 0, lean: 8, ex: 1 }, "snap"], [13, { py: 16, fa: 85, ba: -85 }], [18, { py: 16, fa: -85, fe: 0, ba: 90, lean: -4, ex: 1 }, "snap"], [24, { py: 14, fa: -80, ba: 80 }], [48, {}]],
      hb: [H([9, 11], "pm", 20, 13, 30, 25, 97), H([18, 20], "pm", 20, 13.5, 30, 26, 98, { back: true })],
      sfx: { 8: "swingM", 17: "swingM" } },
    nair: { dur: 38, iasa: 36, land: 8, ac: [[0, 3], [28, 99]],
      anim: [[0, { fa: 60, fe: 60, fl: 60, fk: 90 }], [4, { rot: -70, fa: 90, fe: 0, pa: 0, ba: -90, be: 0, fl: 60, fk: 80, ex: 1 }], [12, { rot: -270, fa: 90, fe: 0, ba: -90 }], [20, { rot: -360, fa: 90, ba: -90 }], [38, {}]],
      hb: [H([4, 10], "pm", 20, 9, 361, 12, 95, { rev: true }), H([4, 10], "ctr", 24, 8, 361, 12, 95, { rev: true }), H([11, 20], "pm", 16, 5, 361, 6, 90, { rev: true })],
      sfx: { 3: "spin" } },
    fair: { dur: 42, iasa: 40, land: 14, ac: [[0, 4], [34, 99]],
      anim: [[0, { fa: 180, fe: 30, lean: -10 }], [10, { fa: 205, fe: 20, lean: -16 }], [14, { fa: 60, fe: 0, pa: 0, lean: 24, ex: 1 }, "snap"], [22, { fa: 40, fe: 0, lean: 18 }], [42, {}]],
      hb: [H([14, 15], "pm", 22, 13, 275, 20, 88, { lag: 1.2 }), H([16, 19], "pm", 20, 10, 361, 20, 94)], sfx: { 13: "swingL" } },
    bair: { dur: 34, iasa: 32, land: 9, ac: [[0, 3], [26, 99]],
      anim: [[0, { bl: -20, bk: 90, fl: 50, fk: 90, lean: 20 }], [7, { bl: -95, bk: 0, fl: 60, fk: 90, lean: 30, ex: 1 }, "snap"], [14, { bl: -90, bk: 5, lean: 28 }], [34, {}]],
      hb: [H([7, 9], "bf", 18, 12.5, 361, 12, 100, { back: true }), H([10, 14], "bf", 14, 8, 361, 8, 95, { back: true })], sfx: { 6: "swingM" } },
    uair: { dur: 32, iasa: 30, land: 7, ac: [[0, 3], [24, 99]],
      anim: [[0, { fa: 90, fe: 40 }], [5, { fa: 160, fe: 0, pa: 0, lean: -8, ex: 1 }, "snap"], [10, { fa: 220, fe: 0, lean: -14 }], [32, {}]],
      hb: [H([5, 11], "pm", 20, 8, 82, 26, 112)], sfx: { 4: "swingM" } },
    dair: { dur: 46, iasa: 44, land: 16, ac: [[0, 3], [38, 99]],
      anim: [[0, { fl: 80, fk: 110, bl: 50, bk: 110 }], [13, { fl: 90, fk: 120, bl: 60, bk: 120 }], [16, { fl: 5, fk: 0, bl: -5, bk: 0, lean: -6, ex: 1, sy: 1.08 }, "snap"], [24, { fl: 5, fk: 0, bl: -5, bk: 5 }], [46, {}]],
      hb: [H([16, 17], "ff", 18, 13, 270, 25, 90, { lag: 1.2 }), H([18, 24], "ff", 15, 9, 60, 20, 80)], sfx: { 15: "swingL" } },
    grab: { dur: 32, grab: { f: [6, 8], x: 54, y: -52, w: 28, h: 26 },
      anim: [[0, { ba: 40 }], [6, { fa: 88, fe: 5, ba: 90, be: 10, lean: 14, bh: "open" }, "snap"], [12, { fa: 85, ba: 85, lean: 12 }], [32, {}]], sfx: { 5: "whiff" } },
    dashGrab: { dur: 40, grab: { f: [9, 11], x: 64, y: -52, w: 32, h: 26 }, slide: true, traction: 0.6,
      anim: [[0, { lean: 20 }], [9, { fa: 90, fe: 0, ba: 92, be: 5, lean: 26, bh: "open", fl: 50, bl: -40 }, "snap"], [16, { fa: 88, ba: 88, lean: 22 }], [40, {}]] },
    fthrow: { dur: 34, throw: { f: 12, dmg: 9, ang: 40, bkb: 70, kbg: 58 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 70, lean: -8 }], [12, { ba: 100, be: 0, bh: "open", lean: 24, ex: 1 }, "snap"], [34, {}]], say: { 12: "一出国——" }, sfx: { 11: "throw" } },
    bthrow: { dur: 42, throw: { f: 18, dmg: 11.5, ang: 42, bkb: 62, kbg: 72, back: true, oy: -10 },
      anim: [[0, { ba: 90 }], [10, { ba: 170, be: 10, lean: -20, ex: 1 }], [18, { ba: 250, be: 10, lean: -34, rot: -25 }, "snap"], [42, {}]], say: { 18: "——就爱国!" }, sfx: { 17: "throw" } },
    uthrow: { dur: 36, throw: { f: 14, dmg: 7.5, ang: 90, bkb: 72, kbg: 64 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 60, py: 10 }], [14, { ba: 180, be: 0, fa: 170, py: -4, ex: 1 }, "snap"], [36, {}]], sfx: { 13: "throw" } },
    dthrow: { dur: 40, throw: { f: 17, dmg: 6, ang: 75, bkb: 72, kbg: 34, hangY: 60 },
      anim: [[0, { ba: 90 }], [10, { fa: 170, fe: 20, lean: -8 }], [17, { fa: 30, fe: 0, pa: 0, lean: 32, py: 10, ex: 1 }, "snap"], [40, {}]], sfx: { 16: "slam" }, txt: { 17: "文明型!" } },

    // ---- specials
    nspec: { dur: 44, iasa: 40, driftMul: 0.5, gravMul: 0.7,
      anim: [[0, { fa: 170, fe: 20, lean: -10 }], [12, { fa: 190, fe: 10, lean: -14 }], [16, { fa: 40, fe: 0, pa: 0, lean: 26, ex: 1 }, "snap"], [26, { fa: 30, lean: 20 }], [44, {}]],
      script: (f, mf, w) => {
        if (mf !== 16) return;
        const [x] = f.bone("pt");
        const ground = f.grounded;
        w.spawnProjectile(new Projectile({
          owner: f, kind: "wave", x: x + f.facing * 10, y: ground ? f.y - 30 : f.y - 40, vx: f.facing * 8.5, vy: ground ? 0 : 5, r: 30, life: 80,
          hb: { dmg: 10, ang: 60, bkb: 40, kbg: 60, eff: "gold" }, clank: 2, moveId: "nspec",
          data: { ground },
          update: (p, W) => {
            if (!p.data.ground) {
              const land = W.stage.findLanding(p.x, p.y + 28, p.y + 28 + p.vy, false, null);
              if (land) { p.data.ground = true; p.vy = 0; p.y = land.y - 30; }
            } else {
              // ride the floor; die at the edge
              const on = W.stage.plats.some((pl) => p.x >= pl.x1 && p.x <= pl.x2 && Math.abs(pl.y - (p.y + 30)) < 6);
              if (!on) p.kill(W, "edge");
            }
          },
          draw: drawWave,
        }));
        w.emit({ t: "sfx", id: "beam", f });
      },
      say: { 16: "震撼!" } },
    sspec: { dur: 56, iasa: 54, noDrift: true, gravMul: 0.1, slide: true, traction: 0.2,
      canUse: (f) => f.grounded || !f.sideBUsed,
      onStart: (f) => { if (!f.grounded) f.sideBUsed = true; f.vy = Math.min(f.vy, 0); },
      vel: [{ f: 6, vx: 13 }, { f: 30, vx: 4 }],
      anim: [[0, { lean: 10, fa: 40 }], [6, { lean: 22, fa: 95, fe: 0, pa: 0, fl: 60, fk: 30, bl: -45, bk: 20, ex: 1 }, "snap"], [12, { lean: 20, fa: 60, fe: 40, fl: 30, bl: -20 }], [18, { lean: 22, fa: 95, fe: 0, fl: 60, bl: -45 }], [24, { lean: 20, fa: 60, fe: 40 }], [30, { lean: 26, fa: 100, fe: 0, ex: 1 }, "snap"], [56, {}]],
      hb: [H([6, 26], "pm", 22, 2, 30, 0, 100, { fkb: 30, rehit: 6, linkBone: "pt", lx: 30, eff: "text", noTumble: true, grp: 1 }),
        H([30, 33], "pm", 26, 7, 45, 55, 75, { eff: "gold", grp: 2 })],
      script: (f, mf, w) => { if (mf >= 6 && mf <= 30 && mf % 6 === 0) w.emit({ t: "movetext", text: STAMPS[Math.min(3, (mf - 6) / 6 | 0)], f }); },
      sfx: { 6: "stamp", 12: "stamp", 18: "stamp", 24: "stamp", 30: "stamp" }, say: { 30: "第一百零一个国家!" } },
    uspec: { dur: 50, end: "helpless", noDrift: true, gravMul: 0, ledgeGrab: 20,
      onStart: (f) => { f.upBUsed = true; f.vx *= 0.3; f.vy = 0; },
      anim: [[0, { py: 10, fk: 70, bk: 60, lean: 10, fa: 100, fe: 90, ex: 1 }], [14, { py: 12, fk: 75, bk: 65 }], [16, { lean: 0, fa: 175, fe: 0, pa: 0, ba: 160, fl: 5, fk: 5, bl: -5, bk: 10, ex: 1, sy: 1.1, sx: 0.9 }, "snap"], [38, { fa: 170, ba: 160 }], [50, { fa: 140, ba: 130, fl: 20, fk: 30 }]],
      script: (f, mf) => {
        if (mf < 14) { f.vx *= 0.8; f.vy = Math.min(f.vy, 1); }
        if (mf === 15) {
          let dx = f.pad.mx, dy = f.pad.my;
          if (Math.hypot(dx, dy) < 0.3) { dx = 0; dy = -1; }
          if (dy > 0.3) dy = 0.3;
          const m = Math.hypot(dx, dy); f.vars.ud = [dx / m, dy / m];
          if (Math.abs(dx) > 0.3) f.facing = Math.sign(dx);
        }
        if (mf >= 15 && mf < 38) { const [ux, uy] = f.vars.ud; f.vx = ux * 17; f.vy = uy * 17; if (f.grounded && uy < 0) { f.grounded = false; f.plat = null; } }
        if (mf === 38) { f.vx *= 0.3; f.vy *= 0.25; }
      },
      hb: [H([2, 13], "ctr", 30, 1, 90, 0, 100, { fkb: 30, rehit: 5, eff: "fire", grp: 1, noTumble: true }), H([15, 37], "ctr", 28, 11, 60, 45, 72, { eff: "fire", grp: 2 })],
      say: { 15: "中国超越!" }, sfx: { 1: "charge", 15: "fire" } },
    dspec: { dur: 44, iasa: 42, driftMul: 0.5, gravMul: 0.5,
      counter: { f: [6, 26], onCounter: (v, a, inc, w) => { v.vars.counterDmg = Math.max(8, inc * 1.3); v.startMove("dspecHit"); } },
      reflect: { f: [6, 26] },
      anim: [[0, { fa: 30, fe: 105, ba: 20, be: 60 }], [6, { fa: 60, fe: 90, ba: 110, be: 40, bh: "open", lean: -10, ex: 4 }, "snap"], [26, { fa: 60, fe: 90, ba: 108, be: 42, lean: -9, ex: 4 }], [44, {}]],
      say: { 6: "你要自信。" }, sfx: { 5: "counter" } },
    dspecHit: { dur: 40, iasa: 36, intan: [[0, 14]], driftMul: 0.3, gravMul: 0.4,
      anim: [[0, { ba: 120, be: 20, lean: -12, ex: 1 }], [8, { ba: 90, be: 0, bh: "open", lean: 26, px: 10, ex: 1 }, "snap"], [20, { ba: 88, lean: 22, px: 10 }], [40, {}]],
      hb: [H([8, 11], "bh", 42, 9, 38, 60, 88, { x: 20, eff: "gold", lag: 1.3, dynDmg: (f) => f.vars.counterDmg || 9 })],
      say: { 7: "中国人,你要自信!" }, sfx: { 8: "swingXL" } },
    final: { dur: 170, fs: true, intan: [[0, 170]], noDrift: true, gravMul: 0,
      onStart: (f, w) => { w.emit({ t: "fs", f, name: "这就是中国", line: "中国人,你要自信!" }); w.freeze = 60; f.vx = 0; f.vy = 0; },
      anim: [[0, { ba: 150, be: 20, bh: "open", lean: -8, ex: 1 }], [30, { ba: 95, be: 0, bh: "open", fa: 60, fe: 90, lean: 12, ex: 4 }, "snap"], [150, { ba: 95, be: 0, lean: 12, ex: 4 }], [170, {}]],
      script: (f, mf, w) => {
        if (mf !== 30) return;
        const dir = f.facing;
        const x0 = f.x + dir * 60;
        const box = dir > 0 ? [x0, f.y - 460, x0 + 900, f.y + 80] : [x0 - 900, f.y - 460, x0, f.y + 80];
        const p = new Projectile({
          owner: f, kind: "tvFrame", x: (box[0] + box[2]) / 2, y: (box[1] + box[3]) / 2, r: 300, life: 110, hits: 999, pierce: true, rehit: 8,
          hb: { dmg: 1.5, ang: 0, bkb: 0, kbg: 100, fkb: 2, eff: "gold", noTumble: true, stunMul: 3 }, reflectable: false, absorbable: false, clank: null,
          moveId: "final", data: { box },
          update: (pr, W) => {
            pr.rect = pr.data.box;
            if (pr.life === 10) { pr.hb = { dmg: 34, ang: 55, bkb: 90, kbg: 72, eff: "gold", lag: 1.4 }; pr.rehit = 0; pr.hitSet.clear(); W.emit({ t: "explode", x: pr.x, y: pr.y, big: true, silent: true }); }
          },
          draw: drawTV,
        });
        p.rect = box;
        w.spawnProjectile(p);
      } },
  },
  moveFx: {
    zhangBurst: (f, fx) => { const [x, y] = f.bone("hc"); fx.add({ k: "ring", x, y: y - 40, t: 0, T: 16, r0: 20, r1: 110, c: "#ffd46b", w: 6 }); },
  },
};

function drawWave(ctx, p, font, t, H) {
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir, 1);
  for (let i = 0; i < 3; i++) {
    const r = 18 + i * 12 + Math.sin(p.age * 0.4 + i) * 3;
    ctx.globalAlpha = 0.9 - i * 0.25;
    ctx.strokeStyle = i === 0 ? "#fff6c2" : "#ffc93a"; ctx.lineWidth = 7 - i * 2;
    ctx.beginPath(); ctx.arc(-i * 14, 0, r, -1.1, 1.1); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  H.memeText(ctx, "震撼", 0, -2, 22, "#fff", "#8a4b00", font);
}

function drawTV(ctx, p, font, t, H) {
  const [x0, y0, x1, y1] = p.data.box;
  const k = Math.min(1, p.age / 8);
  ctx.globalAlpha = k;
  ctx.strokeStyle = "#1c1426"; ctx.lineWidth = 22;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = "#ffd46b"; ctx.lineWidth = 10;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = "rgba(255,210,90,0.12)"; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // spotlight cones
  ctx.fillStyle = "rgba(255,245,200,0.18)";
  for (let i = 0; i < 3; i++) { const cx = x0 + (x1 - x0) * (0.2 + i * 0.3); ctx.beginPath(); ctx.moveTo(cx - 20, y0); ctx.lineTo(cx + 20, y0); ctx.lineTo(cx + 120, y1); ctx.lineTo(cx - 120, y1); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#c8262c"; ctx.fillRect(x0 + 20, y0 + 20, 150, 44);
  ctx.fillStyle = "#fff"; ctx.font = `900 28px ${font}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("这就是中国", x0 + 28, y0 + 43);
  if ((t >> 4) % 2) { ctx.fillStyle = "#ff3a3a"; ctx.beginPath(); ctx.arc(x1 - 40, y0 + 42, 10, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `900 22px ${font}`; ctx.fillText("REC", x1 - 110, y0 + 43); }
  if (p.life < 14) H.memeText(ctx, "震 撼", (x0 + x1) / 2, (y0 + y1) / 2, 120, "#fff", "#8a4b00", font);
  ctx.globalAlpha = 1;
}
