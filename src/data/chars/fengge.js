// 峰哥亡命天涯 · 弗洛伊峰 — rushdown brawler. Kit: 「这是个好事儿啊」 (turns any bad thing
// good — and any good thing into 「恰恰相反,这并不是个好事儿」), the 性压抑 theory that earned
// him the nickname 弗洛伊德·峰 / 弗洛伊峰像, "3D人士", street interviews, and his
// self-styled adventurer/mountaineer persona (冲击珠峰). Climbs walls.
import { H } from "../common.js";
import { Projectile } from "../../sim/projectile.js";
import { directHit, findVictim } from "../kit.js";

export default {
  id: "fengge", name: "峰哥", title: "亡命天涯", en: "FENGGE",
  color: "#e2762c", color2: "#b8a6ff",
  tagline: "天下压抑共十斗",
  wallJump: true,
  stats: { weight: 97, walk: 4.6, walkAccel: 1.2, run: 12.2, dash: 12.5, dashFrames: 11, runAccel: 1.2, traction: 1.05,
    air: 6.9, airAccel: 0.46, gravity: 1.0, fall: 15.2, fastFall: 22, jumpV: 20.5, shortV: 13.6, djV: 19.0,
    jumps: 2, jumpsquat: 3, roll: 10.5, brake: 9 },
  body: { leg: [21, 21], torso: 38, torsoW: 38, arm: [20, 19], armW: [14, 13], legW: [17, 15], hand: 8.5, foot: [22, 11],
    neck: 4, shoulderDrop: 6, shoulderFwd: 2, shoulderBack: 4, hipW: 4, headR: 35, headH: 84, headDX: -4, headDY: 8,
    ecbW: 21, ecbH: 118, hang: 108, shieldR: 62, propLen: 40, holdDist: 54 },
  look: { head: "fengge", skin: "#e7b48c", skinSh: "#c9926c", sleeve: "#29292e", sleeveSh: "#18181c", cuff: null,
    pants: "#5c6848", pantsSh: "#434c33", shoe: "#5a3a24", sole: "#241810",
    torso: { type: "tee", shirt: "#29292e", shirtSh: "#18181c", pack: "#e2762c", strap: "#b85a1c", mat: "#4f7a54" },
    prop: "selfie", armSkin: true },
  stance: { lean: 8, hd: -2, fa: 50, fe: 95, pa: -30, ba: 40, be: 110, fl: 20, fk: 26, bl: -18, bk: 18, fh: "grip", bh: "fist" },
  taunt: [[0, {}], [10, { fa: 120, fe: 60, pa: 30, lean: -4, ex: 4, ba: 20, be: 100, hd: 6 }], [50, { fa: 115, fe: 65, ex: 4 }], [70, {}]],
  tauntLen: 70,
  tauntLines: ["这是个好事儿啊。", "恰恰相反,这并不是个好事儿。", "兄弟,你这是压抑了。", "为了冲击珠峰,我先退网了。"],
  ai: { style: "rushdown", range: 120, aggro: 0.8, proj: [], counter: "dspec", cgrab: "sspec", close: ["nspec"], fs: "global", upReach: 330 },
  moves: {
    jab1: { dur: 14, iasa: 12, jab: 4,
      anim: [[0, { ba: 60, be: 100 }], [2, { ba: 92, be: 0, lean: 12, ex: 1 }, "snap"], [6, { ba: 88, be: 8, lean: 10 }], [14, {}]],
      hb: [H([2, 3], "bh", 12, 2, 80, 5, 25)], sfx: { 1: "swingS" } },
    jab2: { dur: 15, iasa: 13, jab: 4, rapid: { from: "jab2", to: "jabR" },
      anim: [[0, { fa: 60, fe: 90 }], [2, { fa: 94, fe: 0, pa: -60, lean: 14, ex: 1 }, "snap"], [6, { fa: 90, fe: 6, lean: 12 }], [15, {}]],
      hb: [H([2, 3], "fh", 12, 2, 80, 5, 25)], sfx: { 1: "swingS" } },
    jab3: { dur: 34, iasa: 30,
      anim: [[0, { ba: 40, be: 110, lean: -6 }], [5, { ba: 95, be: 0, lean: 20, px: 6, fl: 50, bl: -30, ex: 1 }, "snap"], [12, { ba: 92, lean: 18, px: 6 }], [34, {}]],
      hb: [H([5, 7], "bh", 16, 4, 361, 45, 85)], sfx: { 4: "swingM" } },
    jabR: { dur: 36, iasa: 34, rapidLoop: 4,
      anim: [[0, { fa: 90, fe: 0, ba: 40, be: 100, lean: 14, ex: 1 }], [3, { fa: 40, fe: 100, ba: 94, be: 0, lean: 14, ex: 1 }], [6, { fa: 92, fe: 0, ba: 40, be: 100, lean: 14 }], [9, { fa: 40, fe: 100, ba: 94, be: 0 }], [12, { fa: 92, fe: 0, ba: 40 }], [36, {}]],
      hb: [H([2, 30], "fh", 18, 0.8, 361, 0, 100, { fkb: 8, rehit: 3, x: 6, grp: 1, noTumble: true })],
      script: (f, mf, w) => { if (mf === 30 && !f.pad.atk) { f.startMove("jabFin"); } else if (mf % 6 === 0) w.emit({ t: "sfx", id: "swingS", f }); },
      txt: { 3: "王八拳!" } },
    jabFin: { dur: 36, iasa: 32,
      anim: [[0, { ba: 30, be: 120, lean: -8 }], [5, { ba: 100, be: 0, lean: 24, px: 8, ex: 1 }, "snap"], [12, { ba: 96, lean: 20, px: 8 }], [36, {}]],
      hb: [H([5, 7], "bh", 18, 4, 40, 55, 110)], sfx: { 4: "swingM" } },
    ftilt: { dur: 30, iasa: 27,
      anim: [[0, { fa: 40, fe: 100, pa: -40, lean: -4 }], [7, { fa: 92, fe: 0, pa: 0, lean: 18, px: 6, fl: 45, bl: -30, ex: 1 }, "snap"], [13, { fa: 90, fe: 0, lean: 16, px: 6 }], [30, {}]],
      hb: [H([7, 9], "pt", 16, 9, 361, 10, 96), H([7, 9], "pm", 13, 8, 361, 10, 94)], sfx: { 6: "swingM" } },
    utilt: { dur: 28, iasa: 24,
      anim: [[0, { ba: 20, be: 120, py: 6 }], [5, { ba: 178, be: 0, lean: -6, py: -4, ex: 1 }, "snap"], [10, { ba: 175, lean: -6 }], [28, {}]],
      hb: [H([5, 9], "bh", 18, 7.5, 92, 32, 112), H([5, 9], "be", 14, 7, 92, 32, 110)], sfx: { 4: "swingM" } },
    dtilt: { dur: 22, iasa: 20,
      anim: [[0, { py: 16, fl: 85, fk: 130, bl: -15, bk: 120, lean: 28 }], [5, { py: 22, fl: 100, fk: 5, bl: -20, bk: 130, lean: 22, ex: 1 }, "snap"], [11, { py: 22, fl: 100, fk: 5, lean: 20 }], [22, { py: 14, fl: 80, fk: 110 }]],
      hb: [H([5, 8], "ff", 17, 6, 30, 38, 58), H([5, 8], "fk", 13, 5.5, 30, 38, 58)], sfx: { 4: "swingS" } },
    dashAtk: { dur: 42, iasa: 40, slide: true, traction: 0.3, vel: [{ f: 3, vx: 13 }, { f: 3, vy: -5 }], slideOff: true,
      anim: [[0, { lean: 20 }], [5, { rot: -30, lean: -10, fl: 95, fk: 0, bl: 85, bk: 0, fa: 150, ba: 140, py: -10, ex: 1 }, "snap"], [22, { rot: -30, fl: 92, bl: 82 }], [42, {}]],
      hb: [H([5, 10], "ff", 20, 11, 50, 60, 68), H([5, 10], "bf", 18, 11, 50, 60, 68), H([11, 20], "ff", 16, 7, 60, 50, 50)], sfx: { 4: "swingL" }, say: { 5: "亡命!" } },
    fsmash: { dur: 50, iasa: 48, charge: 9,
      anim: [[0, { ba: 10, be: 130, lean: -20, px: -8, fl: 30 }], [9, { ba: -20, be: 140, lean: -28, px: -12, ex: 1 }], [15, { ba: 96, be: 0, lean: 30, px: 14, fl: 60, fk: 25, bl: -40, bk: 5, ex: 1, sx: 1.06 }, "snap"], [22, { ba: 92, be: 2, lean: 26, px: 14 }], [50, {}]],
      hb: [H([15, 17], "bh", 21, 18, 361, 28, 100, { lag: 1.2, eff: "psy" }), H([15, 17], "be", 16, 15, 361, 26, 97)],
      sfx: { 14: "swingXL" }, say: { 15: "太压抑了!" } },
    usmash: { dur: 44, iasa: 42, charge: 6,
      anim: [[0, { py: 14, fk: 60, bk: 55, lean: 26, hd: 20 }], [6, { py: 16, fk: 65, bk: 60, lean: 30, hd: 24 }], [11, { py: -8, lean: -22, hd: -30, fa: 140, ba: 130, fl: 10, fk: 5, bl: -10, bk: 5, ex: 1, sy: 1.1 }, "snap"], [18, { py: -6, lean: -20, hd: -26 }], [44, {}]],
      hb: [H([11, 15], "hc", 32, 15, 90, 34, 97, { y: -10 })], sfx: { 10: "swingL" }, txt: { 11: "铁头!" } },
    dsmash: { dur: 46, iasa: 44, charge: 4,
      anim: [[0, { py: 24, fk: 110, bk: 100, lean: 40 }], [8, { py: 26, rot: 0, fl: 100, fk: 0, bl: -95, bk: 0, lean: 44, ex: 1 }, "snap"], [14, { py: 26, fl: -95, fk: 0, bl: 100, bk: 0, lean: 44, ex: 1 }, "snap"], [22, { py: 24, fl: 90, bl: -90 }], [46, {}]],
      hb: [H([8, 10], "ff", 18, 12.5, 28, 26, 97), H([8, 10], "bf", 18, 12.5, 28, 26, 97, { back: true }), H([14, 16], "ff", 18, 13, 30, 28, 98, { back: true }), H([14, 16], "bf", 18, 13, 30, 28, 98)],
      sfx: { 7: "swingM", 13: "swingM" }, txt: { 8: "东北大鼓!" } },
    nair: { dur: 34, iasa: 32, land: 7, ac: [[0, 3], [24, 99]],
      anim: [[0, { fl: 60, fk: 100 }], [3, { fl: 100, fk: 120, bl: -20, bk: 60, lean: -6, ex: 1 }, "snap"], [20, { fl: 98, fk: 118 }], [34, {}]],
      hb: [H([3, 6], "fk", 18, 10, 361, 10, 98), H([7, 20], "fk", 15, 6, 361, 5, 92)], sfx: { 2: "swingS" } },
    fair: { dur: 38, iasa: 36, land: 11, ac: [[0, 3], [30, 99]],
      anim: [[0, { fa: 60, fe: 100, ba: 50, be: 100 }], [8, { fa: 95, fe: 0, pa: -60, lean: 16, ex: 1 }, "snap"], [12, { fa: 40, fe: 100, ba: 96, be: 0, lean: 18 }, "snap"], [20, { ba: 94, lean: 16 }], [38, {}]],
      hb: [H([8, 9], "fh", 16, 5, 70, 20, 40, { grp: 1 }), H([12, 14], "bh", 18, 8, 40, 40, 98, { grp: 2 })], sfx: { 7: "swingS", 11: "swingM" } },
    bair: { dur: 34, iasa: 32, land: 9, ac: [[0, 3], [26, 99]],
      anim: [[0, { bl: -20, bk: 90, fl: 50, fk: 90, lean: 20 }], [7, { bl: -100, bk: 0, fl: 60, fk: 90, lean: 34, ex: 1 }, "snap"], [13, { bl: -95, bk: 5, lean: 30 }], [34, {}]],
      hb: [H([7, 9], "bf", 18, 13, 361, 12, 100, { back: true }), H([10, 14], "bf", 14, 8, 361, 8, 95, { back: true })], sfx: { 6: "swingM" } },
    uair: { dur: 34, iasa: 32, land: 8, ac: [[0, 3], [26, 99]],
      anim: [[0, { fl: 40, fk: 60 }], [5, { rot: -60, fl: 150, fk: 0, bl: 40, bk: 90, ex: 1 }, "snap"], [9, { rot: -140, fl: 170, fk: 0, bl: 120, bk: 30 }, "snap"], [16, { rot: -200, fl: 150 }], [34, {}]],
      hb: [H([5, 7], "ff", 17, 4, 100, 30, 40, { grp: 1 }), H([9, 12], "ff", 18, 8, 82, 30, 110, { grp: 2 })], sfx: { 4: "swingS", 8: "swingM" } },
    dair: { dur: 44, iasa: 42, land: 15, ac: [[0, 3], [36, 99]],
      anim: [[0, { fl: 80, fk: 110, bl: 50, bk: 110 }], [12, { fl: 90, fk: 120, bl: 60, bk: 120 }], [15, { fl: 3, fk: 0, bl: 40, bk: 90, lean: -6, ex: 1, sy: 1.08 }, "snap"], [22, { fl: 3, fk: 0 }], [44, {}]],
      hb: [H([15, 16], "ff", 17, 13, 270, 25, 88, { lag: 1.2 }), H([17, 22], "ff", 14, 9, 60, 20, 80)], sfx: { 14: "swingL" } },
    grab: { dur: 32, grab: { f: [6, 8], x: 52, y: -52, w: 28, h: 26 },
      anim: [[0, { ba: 40 }], [6, { fa: 88, fe: 5, ba: 90, be: 10, lean: 14, bh: "open" }, "snap"], [12, { fa: 85, ba: 85, lean: 12 }], [32, {}]], sfx: { 5: "whiff" } },
    dashGrab: { dur: 40, grab: { f: [9, 11], x: 64, y: -52, w: 32, h: 26 }, slide: true, traction: 0.6,
      anim: [[0, { lean: 20 }], [9, { fa: 90, fe: 0, ba: 92, be: 5, lean: 26, bh: "open", fl: 50, bl: -40 }, "snap"], [16, { fa: 88, ba: 88, lean: 22 }], [40, {}]] },
    fthrow: { dur: 34, throw: { f: 12, dmg: 9, ang: 42, bkb: 72, kbg: 56 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 70, lean: -8 }], [12, { ba: 100, be: 0, lean: 22, ex: 1 }, "snap"], [34, {}]], say: { 12: "兄弟你这是压抑了!" }, sfx: { 11: "throw" } },
    bthrow: { dur: 42, throw: { f: 18, dmg: 12, ang: 42, bkb: 62, kbg: 73, back: true, oy: -10 },
      anim: [[0, { ba: 90 }], [10, { ba: 170, be: 10, lean: -20, ex: 1 }], [18, { ba: 250, be: 10, lean: -34, rot: -25 }, "snap"], [42, {}]], sfx: { 17: "throw" }, txt: { 18: "亡命天涯!" } },
    uthrow: { dur: 36, throw: { f: 14, dmg: 8, ang: 90, bkb: 72, kbg: 64 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 60, py: 10 }], [14, { ba: 180, be: 0, fa: 170, py: -4, ex: 1 }, "snap"], [36, {}]], sfx: { 13: "throw" } },
    dthrow: { dur: 40, throw: { f: 17, dmg: 6, ang: 75, bkb: 72, kbg: 34, hangY: 60 },
      anim: [[0, { ba: 90 }], [10, { lean: -6 }], [17, { lean: 32, py: 12, ba: 20, be: 20, ex: 1 }, "snap"], [40, {}]], sfx: { 16: "slam" }, txt: { 17: "3D人士!" } },

    // ---- specials
    nspec: { dur: 44, iasa: 40, driftMul: 0.5, gravMul: 0.6,
      anim: [[0, { fa: 60, fe: 90, pa: -30 }], [12, { fa: 95, fe: 0, pa: 0, lean: 14, ex: 1 }, "snap"], [30, { fa: 92, fe: 0, lean: 12, ex: 1 }], [44, {}]],
      hb: [H([12, 24], "pt", 34, 1.5, 45, 0, 100, { x: 20, fkb: 20, rehit: 6, eff: "psy", grp: 1, noTumble: true, stunMul: 1.3,
        onHit: (a, v) => { if (!v.status.gloom) v.status.gloom = { t: 360 }; } })],
      say: { 12: "兄弟,你这是压抑了。" }, sfx: { 12: "elec" }, fx: { 12: "psyWave" } },
    sspec: { dur: 44, iasa: 42, noDrift: true, gravMul: 0.2, slide: true, traction: 0.25, slideOff: false,
      canUse: (f) => f.grounded || !f.sideBUsed,
      onStart: (f) => { if (!f.grounded) f.sideBUsed = true; f.vy = Math.min(0, f.vy); },
      vel: [{ f: 6, vx: 14 }],
      anim: [[0, { lean: 16 }], [6, { lean: 34, fa: 110, fe: 0, ba: 100, be: 0, fh: "open", bh: "open", fl: 60, fk: 40, bl: -50, bk: 30, ex: 1 }, "snap"], [24, { lean: 30, fa: 105, ba: 98 }], [44, {}]],
      script: (f, mf, w) => {
        if (mf < 6 || mf > 22 || f.vars.interview) return;
        const v = findVictim(f, w, 0, 80, -60, 40);
        if (!v) return;
        // command grab: the street interview
        f.vars.interview = v;
        f.startMove("interview");
      },
      onEnd: (f) => { f.vars.interview = null; },
      say: { 6: "哥们,采访一下!" }, sfx: { 6: "dash" } },
    interview: { dur: 70, iasa: 68, intan: [[0, 50]], noDrift: true, gravMul: 0,
      onStart: (f, w) => { f.vx = 0; f.vy = 0; const v = f.vars.interview; if (v) { v.endMoveFlags(); v.move = null; v.stun(60, "stun"); v.vx = 0; v.kbx = 0; v.kby = 0; } },
      anim: [[0, { fa: 100, fe: 30, pa: 40, lean: 4, ex: 0 }], [40, { fa: 100, fe: 30, pa: 40, lean: 4 }], [46, { ba: 100, be: 0, lean: 26, px: 8, ex: 1 }, "snap"], [70, {}]],
      script: (f, mf, w) => {
        const v = f.vars.interview;
        if (!v || v.dead) return;
        if (mf < 46) { v.x = f.x + f.facing * 58; v.y = f.y; v.facing = -f.facing; v.stunT = Math.max(v.stunT, v.sf + 10); }
        if (mf === 46) { directHit(w, f, v, { dmg: 12, ang: 40, bkb: 70, kbg: 70, eff: "psy" }, null, null, "sspec"); f.vars.interview = null; }
      },
      say: { 2: "一个月挣多少钱?", 26: "这是好事儿啊!" }, sfx: { 45: "swingL" } },
    uspec: { dur: 52, end: "helpless", noDrift: false, driftMul: 0.6, gravMul: 0.55, ledgeGrab: 8,
      onStart: (f) => { f.upBUsed = true; f.vy = Math.min(0, f.vy) * 0.2; },
      vel: [{ f: 7, vy: -17.5 }],
      anim: [[0, { fa: 20, fe: 60, pa: 0, lean: 10, py: 8 }], [7, { fa: 175, fe: 0, pa: 20, lean: -8, ex: 1, fl: 30, fk: 60 }, "snap"], [16, { fa: 190, fe: 10, pa: 30, lean: -12 }], [24, { fa: 110, fe: 40, pa: 60, lean: 6 }, "snap"], [52, { fa: 160, fe: 20, fl: 20, fk: 30 }]],
      script: (f, mf) => { if (mf === 7) f.vx = f.pad.mx * 4; },
      hb: [H([7, 12], "pt", 22, 5, 85, 40, 60, { grp: 1, eff: "ice" }), H([22, 26], "pt", 24, 7, 60, 50, 80, { grp: 2, eff: "ice" })],
      say: { 7: "冲击珠峰!" }, sfx: { 7: "swingL", 22: "swingM" }, propOverride: "iceaxe" },
    dspec: { dur: 46, iasa: 44, driftMul: 0.4, gravMul: 0.6,
      counter: { f: [5, 28], onCounter: (v, a, inc, w) => {
        v.percent = Math.max(0, v.percent - inc * 0.5);
        v.status.good = { t: 300 };
        w.emit({ t: "say", text: "这是个好事儿啊!", f: v });
        w.emit({ t: "heal", f: v, amt: Math.round(inc * 0.5), x: v.x, y: v.y - 100 });
        v.startMove("goodThing");
      } },
      onEnd: (f, w) => { if (f.mf >= 44 && !f.vars.countered) w.emit({ t: "say", text: "恰恰相反,这并不是个好事儿。", f }); f.vars.countered = false; },
      anim: [[0, { fa: 40, fe: 90 }], [5, { fa: 60, fe: 110, pa: 30, ba: 110, be: 60, bh: "open", lean: -10, ex: 4 }, "snap"], [28, { fa: 60, fe: 110, ba: 108, be: 62, lean: -9, ex: 4 }], [46, {}]],
      sfx: { 4: "counter" } },
    goodThing: { dur: 34, iasa: 30, intan: [[0, 16]], driftMul: 0.3, gravMul: 0.4,
      onStart: (f) => { f.vars.countered = true; },
      anim: [[0, { ba: 150, be: 30, bh: "open", lean: -10, ex: 4 }], [8, { ba: 95, be: 0, lean: 24, px: 8, ex: 1 }, "snap"], [34, {}]],
      hb: [H([8, 11], "bh", 32, 8, 45, 55, 80, { x: 12, eff: "psy" })], sfx: { 7: "swingL" } },
    final: { dur: 180, fs: true, intan: [[0, 180]], noDrift: true, gravMul: 0,
      onStart: (f, w) => { w.emit({ t: "fs", f, name: "弗洛伊峰像", line: "你们都是压抑了。" }); w.freeze = 60; f.vx = 0; f.vy = 0; },
      anim: [[0, { fa: 160, fe: 20, ba: 160, be: 20, lean: -10, ex: 1 }], [150, { fa: 160, ba: 160, ex: 1 }], [180, {}]],
      script: (f, mf, w) => {
        if (mf !== 20) return;
        for (const v of w.fighters) {
          if (v === f || v.dead) continue;
          const p = new Projectile({
            owner: f, kind: "psyColumn", x: v.x, y: v.y - 300, r: 70, life: 120, hits: 999, pierce: true, rehit: 9,
            hb: { dmg: 2, ang: 90, bkb: 0, kbg: 100, fkb: 6, eff: "psy", noTumble: true, stunMul: 2.5 }, reflectable: false, absorbable: false, clank: null, moveId: "final",
            data: { tgt: v },
            update: (pr, W) => {
              const tv = pr.data.tgt;
              if (tv && !tv.dead) pr.x += (tv.x - pr.x) * 0.15;
              pr.rect = [pr.x - 70, -2000, pr.x + 70, 400];
              if (pr.life === 10) { pr.hb = { dmg: 24, ang: 88, bkb: 88, kbg: 64, eff: "psy", lag: 1.4 }; pr.rehit = 0; pr.hitSet.clear(); }
            },
            draw: drawPsyColumn,
          });
          p.rect = [v.x - 70, -2000, v.x + 70, 400];
          w.spawnProjectile(p);
        }
      } },
  },
  moveFx: {
    psyWave: (f, fx) => { const [x, y] = f.bone("pt"); for (let i = 0; i < 3; i++) fx.add({ k: "ring", x: x + f.facing * i * 18, y, t: -i * 3, T: 18, r0: 8, r1: 60, c: "#b8a6ff", w: 5 }); },
  },
};

function drawPsyColumn(ctx, p, font, t, H) {
  const k = Math.min(1, p.age / 10) * Math.min(1, p.life / 8);
  const [x0, , x1] = p.rect;
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "rgba(150,110,255,0)"); g.addColorStop(0.5, "rgba(210,190,255,0.75)"); g.addColorStop(1, "rgba(150,110,255,0)");
  ctx.globalAlpha = k;
  ctx.fillStyle = g; ctx.fillRect(x0, -2000, x1 - x0, 2400);
  if (p.life > 10) for (let i = 0; i < 6; i++) { const y = ((t * 12 + i * 170) % 1100) - 900; H.memeText(ctx, "压抑", p.x, y, 26, "#fff", "#4a2a8a", font); }
  ctx.globalAlpha = 1;
}
