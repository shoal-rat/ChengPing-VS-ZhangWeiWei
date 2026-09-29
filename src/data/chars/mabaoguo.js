// 马保国 · 浑元掌门 — counter/grappler. Kit: 「年轻人不讲武德,来骗!来偷袭!我69岁的老同志」,
// 接化发, 闪电五连鞭 / 松活弹抖闪电鞭, 左正蹬·右鞭腿·左刺拳, 「我大意了,没有闪」,
// 「耗子尾汁」, and the 30-second triple knockdown that made the legend.
import { H } from "../common.js";
import { Projectile } from "../../sim/projectile.js";
import { directHit, findVictim, nearestFoe } from "../kit.js";

const FS_ANIM = (() => {
  const a = [[0, { lean: 20, fa: 150, fe: 30, ex: 1 }], [4, { lean: 30, fa: 95, fe: 0, fh: "open", fl: 60, bl: -40, ex: 1 }], [34, { lean: 30, fa: 95 }], [42, { lean: 6, fa: 40, fe: 90, ex: 1 }]];
  [60, 80, 100, 120, 140].forEach((w, i) => {
    const front = i % 2 === 0;
    a.push([w - 7, front ? { fa: -40, fe: 90, ba: 60, lean: -10, ex: 1 } : { ba: -40, be: 90, fa: 60, lean: -10, ex: 1 }]);
    a.push([w, front ? { fa: 96, fe: 0, fh: "open", ba: 30, lean: 22, px: 8, ex: 1 } : { ba: 96, be: 0, bh: "open", fa: 30, lean: 22, px: 8, ex: 1 }, "snap"]);
  });
  a.push([158, { fa: -60, fe: 100, lean: -20, px: -8, ex: 1 }], [165, { fa: 100, fe: 0, fh: "open", lean: 30, px: 14, fl: 60, bl: -40, ex: 1 }, "snap"], [185, { fa: 95, lean: 26 }], [200, {}]);
  return a;
})();

export default {
  id: "mabaoguo", name: "马保国", title: "浑元掌门", en: "MA BAOGUO",
  color: "#d8b24a", color2: "#9fd8ff",
  tagline: "年轻人不讲武德",
  stats: { weight: 104, walk: 4.0, walkAccel: 1.0, run: 10.4, dash: 11, dashFrames: 12, runAccel: 0.95, traction: 1.05,
    air: 6.1, airAccel: 0.42, gravity: 0.92, fall: 14, fastFall: 20.5, jumpV: 19.4, shortV: 12.8, djV: 18.2,
    jumps: 2, jumpsquat: 3, roll: 9.5, brake: 10 },
  body: { leg: [20, 20], torso: 38, torsoW: 40, arm: [19, 18], armW: [15, 13], legW: [18, 16], hand: 8.5, foot: [20, 10],
    neck: 4, shoulderDrop: 6, shoulderFwd: 3, shoulderBack: 5, hipW: 4, headR: 34, headH: 80, headDX: -2, headDY: 6,
    ecbW: 22, ecbH: 118, hang: 104, shieldR: 62, propLen: 0, holdDist: 56 },
  look: { head: "mabaoguo", skin: "#e9b58e", skinSh: "#cb946c", sleeve: "#f1efe8", sleeveSh: "#d2ccbd", cuff: "#d8b24a",
    pants: "#f1efe8", pantsSh: "#d2ccbd", shoe: "#1f1f24", sole: "#f1efe8",
    torso: { type: "taichi", shirt: "#f1efe8", shirtSh: "#d2ccbd", knot: "#1f1f24", trim: "#d8b24a", hip: 0.96 },
    prop: null },
  stance: { lean: 4, hd: -4, fa: 80, fe: 50, ba: 40, be: 90, fl: 30, fk: 36, bl: -26, bk: 24, py: 4, fh: "open", bh: "open" },
  taunt: [[0, {}], [10, { fa: 150, fe: 40, ba: 20, be: 120, lean: -8, ex: 4, fl: 60, fk: 90 }], [45, { fa: 145, fe: 45, ex: 4, fl: 60, fk: 90 }], [70, {}]],
  tauntLen: 70,
  tauntLines: ["耗子尾汁。", "年轻人,不讲武德。", "传统功夫,讲究点到为止。", "我是浑元形意太极门掌门人。"],
  ai: { style: "grappler", range: 150, aggro: 0.65, proj: ["nspec"], counter: "dspec", mid: ["sspec"], fs: "close", upReach: 290 },
  hurtLines: ["我大意了啊,没有闪!", "来骗!来偷袭!", "这好吗?这不好。"],
  moves: {
    jab1: { dur: 15, iasa: 13, jab: 4,
      anim: [[0, { fa: 70, fe: 60 }], [2, { fa: 92, fe: 0, fh: "fist", lean: 12, ex: 1 }, "snap"], [6, { fa: 90, fe: 4, lean: 10 }], [15, {}]],
      hb: [H([2, 3], "fh", 12, 2.3, 80, 6, 25)], sfx: { 1: "swingS" }, txt: { 2: "左刺拳" } },
    jab2: { dur: 16, iasa: 14, jab: 4,
      anim: [[0, { ba: 40, be: 100 }], [2, { ba: 94, be: 0, bh: "fist", lean: 14, ex: 1 }, "snap"], [6, { ba: 90, lean: 12 }], [16, {}]],
      hb: [H([2, 3], "bh", 12, 2.2, 80, 6, 25)], sfx: { 1: "swingS" } },
    jab3: { dur: 30, iasa: 28,
      anim: [[0, { fl: 60, fk: 100, lean: -6 }], [5, { fl: 94, fk: 0, lean: -14, ex: 1 }, "snap"], [11, { fl: 90, fk: 4, lean: -12 }], [30, {}]],
      hb: [H([5, 7], "ff", 16, 5, 40, 50, 84)], sfx: { 4: "swingM" }, txt: { 5: "左正蹬!" } },
    ftilt: { dur: 30, iasa: 27,
      anim: [[0, { bl: -40, bk: 60, lean: 8 }], [7, { rot: -10, bl: 100, bk: 0, fl: 10, fk: 20, lean: -24, ex: 1 }, "snap"], [13, { rot: -10, bl: 96, bk: 4, lean: -20 }], [30, {}]],
      hb: [H([7, 9], "bf", 18, 10, 361, 12, 96), H([7, 9], "bk", 14, 8.5, 361, 10, 93)], sfx: { 6: "swingM" }, txt: { 7: "右鞭腿!" } },
    utilt: { dur: 28, iasa: 25,
      anim: [[0, { fa: 20, fe: 90, ba: 10, be: 90 }], [6, { fa: 175, fe: 5, ba: 160, be: 10, lean: -6, ex: 1 }, "snap"], [11, { fa: 172, ba: 158, lean: -6 }], [28, {}]],
      hb: [H([6, 10], "fh", 20, 8, 95, 30, 110), H([6, 10], "bh", 18, 7, 95, 30, 108)], sfx: { 5: "swingM" } },
    dtilt: { dur: 22, iasa: 20,
      anim: [[0, { py: 20, fl: 85, fk: 130, bl: -15, bk: 120, lean: 28 }], [5, { py: 26, fl: 100, fk: 0, bl: -20, bk: 140, lean: 18, ex: 1 }, "snap"], [11, { py: 26, fl: 98, fk: 2 }], [22, { py: 16, fl: 80, fk: 110 }]],
      hb: [H([5, 8], "ff", 17, 7, 25, 40, 55)], sfx: { 4: "swingS" } },
    dashAtk: { dur: 40, iasa: 38, slide: true, traction: 0.3, vel: [{ f: 2, vx: 12 }],
      anim: [[0, { lean: 20 }], [5, { lean: -10, py: 16, fl: 85, fk: 0, bl: -60, bk: 60, fa: 130, ba: 150, ex: 1 }, "snap"], [22, { lean: -10, py: 16, fl: 85, fk: 0 }], [40, {}]],
      hb: [H([5, 10], "ff", 18, 10, 65, 58, 62), H([11, 22], "ff", 14, 6, 65, 45, 50)], sfx: { 4: "dash" }, say: { 5: "来偷袭!" } },
    fsmash: { dur: 52, iasa: 50, charge: 10,
      anim: [[0, { fa: -20, fe: 100, ba: 90, be: 20, lean: -18, px: -8, fl: 40 }], [10, { fa: -40, fe: 110, ba: 100, lean: -24, px: -12, ex: 1 }], [16, { fa: 94, fe: 0, fh: "open", ba: -30, be: 40, lean: 28, px: 14, fl: 60, fk: 25, bl: -40, bk: 5, ex: 1 }, "snap"], [24, { fa: 92, lean: 24, px: 14 }], [52, {}]],
      hb: [H([16, 18], "fh", 22, 18, 361, 28, 100, { eff: "elec", x: 6 }), H([16, 18], "fe", 16, 15, 361, 26, 97, { eff: "elec" })],
      sfx: { 15: "elec" }, say: { 16: "松活弹抖!" } },
    usmash: { dur: 46, iasa: 44, charge: 6,
      anim: [[0, { py: 16, fk: 70, bk: 60, fa: 30, fe: 90, ba: 30, be: 90, lean: 14 }], [12, { py: -4, fa: 176, fe: 0, ba: 170, be: 0, lean: -6, ex: 1, sy: 1.06 }, "snap"], [20, { fa: 174, ba: 168 }], [46, {}]],
      hb: [H([12, 16], "fh", 24, 15.5, 88, 34, 98), H([12, 16], "bh", 22, 14, 88, 32, 96)], sfx: { 11: "swingL" }, txt: { 12: "浑元!" } },
    dsmash: { dur: 48, iasa: 46, charge: 4,
      anim: [[0, { py: 14, fk: 60, bk: 55, lean: 14 }], [9, { py: 34, fl: 100, fk: 0, bl: -100, bk: 0, lean: 6, fa: 150, ba: 150, ex: 1 }, "snap"], [20, { py: 34, fl: 98, bl: -98 }], [48, {}]],
      hb: [H([9, 12], "ff", 18, 13.5, 28, 26, 98), H([9, 12], "bf", 18, 13.5, 28, 26, 98, { back: true })], sfx: { 8: "swingL" }, txt: { 9: "一字马!" } },
    nair: { dur: 38, iasa: 36, land: 8, ac: [[0, 3], [28, 99]],
      anim: [[0, { fa: 60, fe: 60 }], [4, { rot: 80, fa: 95, fe: 0, ba: -95, be: 0, fl: 60, fk: 70, ex: 1 }], [12, { rot: 250, fa: 95, ba: -95 }], [20, { rot: 360 }], [38, {}]],
      hb: [H([4, 10], "fh", 18, 9, 361, 12, 95, { rev: true }), H([4, 10], "bh", 18, 9, 361, 12, 95, { rev: true }), H([11, 20], "ctr", 24, 5, 361, 6, 90, { rev: true })],
      sfx: { 3: "spin" }, txt: { 4: "太极!" } },
    fair: { dur: 40, iasa: 38, land: 12, ac: [[0, 4], [32, 99]],
      anim: [[0, { fl: 40, fk: 90 }], [10, { fl: 20, fk: 110, lean: 10 }], [13, { rot: -20, fl: 100, fk: 0, lean: -20, ex: 1 }, "snap"], [20, { rot: -20, fl: 95, fk: 5 }], [40, {}]],
      hb: [H([13, 15], "ff", 18, 12, 361, 22, 96), H([13, 15], "fk", 14, 10, 361, 20, 93)], sfx: { 12: "swingL" }, txt: { 13: "鞭腿!" } },
    bair: { dur: 34, iasa: 32, land: 9, ac: [[0, 3], [26, 99]],
      anim: [[0, { bl: -20, bk: 90, fl: 50, fk: 90, lean: 20 }], [7, { bl: -100, bk: 0, fl: 60, fk: 90, lean: 34, ex: 1 }, "snap"], [13, { bl: -95, bk: 5, lean: 30 }], [34, {}]],
      hb: [H([7, 9], "bf", 18, 13.5, 361, 12, 100, { back: true }), H([10, 14], "bf", 14, 8, 361, 8, 95, { back: true })], sfx: { 6: "swingM" } },
    uair: { dur: 32, iasa: 30, land: 8, ac: [[0, 3], [24, 99]],
      anim: [[0, { fa: 100, ba: 90 }], [5, { fa: 178, fe: 0, ba: 176, be: 0, lean: -8, ex: 1 }, "snap"], [11, { fa: 175, ba: 172 }], [32, {}]],
      hb: [H([5, 10], "fh", 20, 9, 84, 28, 110), H([5, 10], "bh", 18, 8, 84, 28, 108)], sfx: { 4: "swingM" } },
    dair: { dur: 46, iasa: 44, land: 16, ac: [[0, 3], [38, 99]],
      anim: [[0, { fl: 80, fk: 110, bl: 50, bk: 110 }], [13, { fl: 90, fk: 120, bl: 60, bk: 120 }], [16, { fl: 3, fk: 0, bl: 3, bk: 0, lean: -6, ex: 1, sy: 1.08 }, "snap"], [24, { fl: 3, bl: 3 }], [46, {}]],
      hb: [H([16, 17], "ff", 18, 13.5, 270, 25, 90, { lag: 1.2 }), H([18, 24], "ff", 15, 9, 60, 20, 80)], sfx: { 15: "swingL" } },
    grab: { dur: 32, grab: { f: [6, 8], x: 54, y: -52, w: 28, h: 26 },
      anim: [[0, { ba: 40 }], [6, { fa: 88, fe: 5, ba: 90, be: 10, lean: 14 }, "snap"], [12, { fa: 85, ba: 85, lean: 12 }], [32, {}]], sfx: { 5: "whiff" } },
    dashGrab: { dur: 40, grab: { f: [9, 11], x: 64, y: -52, w: 32, h: 26 }, slide: true, traction: 0.6,
      anim: [[0, { lean: 20 }], [9, { fa: 90, fe: 0, ba: 92, be: 5, lean: 26, fl: 50, bl: -40 }, "snap"], [16, { fa: 88, ba: 88, lean: 22 }], [40, {}]] },
    fthrow: { dur: 36, throw: { f: 13, dmg: 9, ang: 40, bkb: 70, kbg: 58 },
      anim: [[0, { ba: 90 }], [7, { rot: 20, ba: 60, be: 70, lean: -8 }], [13, { ba: 100, be: 0, lean: 24, ex: 1 }, "snap"], [36, {}]], sfx: { 12: "throw" }, txt: { 7: "化!" } },
    bthrow: { dur: 44, throw: { f: 20, dmg: 12.5, ang: 40, bkb: 62, kbg: 74, back: true, oy: -10 },
      anim: [[0, { ba: 90 }], [10, { ba: 170, be: 10, lean: -20, ex: 1 }], [20, { ba: 250, be: 10, lean: -36, rot: -25 }, "snap"], [44, {}]], sfx: { 19: "throw" }, say: { 20: "发!" } },
    uthrow: { dur: 36, throw: { f: 14, dmg: 8, ang: 90, bkb: 72, kbg: 64 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 60, py: 10 }], [14, { ba: 180, be: 0, fa: 170, py: -4, ex: 1 }, "snap"], [36, {}]], sfx: { 13: "throw" } },
    dthrow: { dur: 40, throw: { f: 17, dmg: 6, ang: 76, bkb: 72, kbg: 34, hangY: 60 },
      anim: [[0, { ba: 90 }], [10, { fa: 170, fe: 20, lean: -8 }], [17, { fa: 30, fe: 0, lean: 32, py: 10, ex: 1 }, "snap"], [40, {}]], sfx: { 16: "slam" }, txt: { 17: "点到为止。" } },

    // ---- specials
    nspec: { dur: 46, iasa: 42, charge: 9, chargeKey: "spc", driftMul: 0.5, gravMul: 0.6,
      anim: [[0, { fa: -40, fe: 60, lean: -10 }], [9, { fa: -60, fe: 80, lean: -16, ex: 1 }], [14, { fa: 95, fe: 0, fh: "open", lean: 20, ex: 1 }, "snap"], [24, { fa: 92, lean: 16 }], [46, {}]],
      hb: [H([14, 17], "fh", 20, 10, 40, 35, 72, { x: 40, eff: "elec", dynDmg: (f) => 10 + 6 * Math.min(1, (f.vars.whipCharge || 0) / 60) }),
        H([14, 17], "fh", 16, 8, 40, 30, 68, { x: 10, eff: "elec" }), H([14, 17], "fh", 16, 9, 40, 34, 72, { x: 72, eff: "elec" })],
      onStart: (f) => { f.vars.whipCharge = 0; },
      script: (f, mf) => { if (mf === 9) f.vars.whipCharge = f.charge; },
      sfx: { 13: "elec" }, say: { 14: "闪电鞭!" }, fx: { 14: "whip" } },
    sspec: { dur: 50, iasa: 46, noDrift: true, gravMul: 0.4,
      canUse: (f) => f.grounded || !f.sideBUsed,
      onStart: (f) => { if (!f.grounded) f.sideBUsed = true; f.vx *= 0.3; f.vy = Math.min(0, f.vy); },
      anim: [[0, { lean: -10, fa: 150, fe: 30, ex: 4 }], [16, { lean: -12, fa: 155, ex: 4, sx: 0.4, sy: 1.3 }], [20, { sx: 1, sy: 1, lean: 26, fa: 92, fe: 0, fh: "open", ex: 1 }, "snap"], [30, { lean: 22, fa: 90 }], [50, {}]],
      script: (f, mf, w) => {
        if (mf === 17) {
          const v = nearestFoe(f, w, 340);
          if (v) { f.x = v.x - v.facing * 64; f.facing = v.facing; f.y = v.grounded ? v.y : f.y; w.emit({ t: "movetext", text: "不讲武德!", f }); }
          else { f.x += f.facing * 120; }
          const B = w.stage.blast; f.x = Math.max(B.left + 100, Math.min(B.right - 100, f.x));
        }
      },
      hidden: [16, 18], intan: [[10, 19]],
      hb: [H([20, 23], "fh", 26, 12, 40, 55, 72, { x: 8, eff: "elec", onHit: (a, v, w) => { if (v.facing === a.facing) w.emit({ t: "movetext", text: "背后偷袭!", f: a }); } })],
      say: { 1: "来骗!来偷袭!" }, sfx: { 16: "dodge", 20: "swingL" } },
    uspec: { dur: 50, end: "helpless", noDrift: false, driftMul: 0.5, gravMul: 0.5, ledgeGrab: 18,
      onStart: (f) => { f.upBUsed = true; f.vy = Math.min(0, f.vy) * 0.2; },
      vel: [{ f: 5, vy: -14 }, { f: 16, vy: -13 }],
      anim: [[0, { py: 10, fk: 60, bk: 55 }], [5, { rot: -30, fl: 160, fk: 0, bl: -10, bk: 30, lean: -10, ex: 1 }, "snap"], [12, { rot: -40, fl: 150, bl: 0 }], [16, { rot: 30, bl: 165, bk: 0, fl: 10, fk: 60, lean: 10, ex: 1 }, "snap"], [26, { rot: 20, bl: 150 }], [50, { fa: 150, ba: 140, fl: 20, fk: 30, bl: -10 }]],
      script: (f, mf) => { if (mf === 5) f.vx = f.pad.mx * 4; },
      hb: [H([5, 9], "ff", 20, 6, 85, 50, 40, { grp: 1 }), H([16, 20], "bf", 22, 8, 70, 55, 72, { grp: 2 })],
      txt: { 5: "左正蹬!", 16: "右鞭腿!" }, sfx: { 5: "swingM", 16: "swingL" } },
    dspec: { dur: 48, iasa: 46, driftMul: 0.4, gravMul: 0.5,
      counter: { f: [6, 24], onCounter: (v, a, inc, w) => { v.vars.counterDmg = Math.max(10, inc * 1.4); v.vars.counterFoe = a; v.startMove("jhf"); } },
      reflect: { f: [6, 24] },
      anim: [[0, { fa: 80, fe: 50 }], [6, { fa: 110, fe: 60, ba: 60, be: 100, lean: -8, py: 8, fk: 50, ex: 4 }, "snap"], [24, { fa: 108, ba: 62, lean: -8, py: 8, ex: 4 }], [48, {}]],
      say: { 6: "接——" }, sfx: { 5: "counter" } },
    jhf: { dur: 52, iasa: 48, intan: [[0, 30]], driftMul: 0.3, gravMul: 0.3,
      anim: [[0, { fa: 120, fe: 30, ba: 110, be: 40, lean: -10, ex: 1 }], [12, { rot: 180, fa: 90, ba: -90, ex: 1 }], [22, { rot: 360, fa: 60, ba: 60 }], [28, { fa: 95, fe: 0, ba: 95, be: 0, lean: 28, px: 14, ex: 1 }, "snap"], [52, {}]],
      hb: [H([28, 31], "fh", 36, 10, 40, 65, 90, { x: 18, eff: "elec", lag: 1.4, dynDmg: (f) => f.vars.counterDmg || 10 })],
      txt: { 1: "接!", 12: "化!", 28: "发!" }, sfx: { 12: "spin", 28: "elec" } },
    final: { dur: 200, fs: true, intan: [[0, 200]], noDrift: true, gravMul: 0.4,
      onStart: (f, w) => { w.emit({ t: "fs", f, name: "闪电五连鞭", line: "看我,闪电五连鞭!" }); w.freeze = 60; f.vx = 0; f.vars.fsFoe = null; },
      vel: [{ f: 4, vx: 15 }],
      anim: FS_ANIM,
      script: (f, mf, w) => {
        if (mf >= 4 && mf <= 30 && !f.vars.fsFoe) {
          const v = findVictim(f, w, -20, 110, -120, 60);
          if (v) { f.vars.fsFoe = v; f.vx = 0; f.mf = 40; v.endMoveFlags(); v.move = null; v.stun(160, "stun"); }
        }
        if (mf === 34 && !f.vars.fsFoe) { f.mf = 188; }
        const v = f.vars.fsFoe;
        if (!v || v.dead) return;
        if (mf > 40 && mf < 170) { v.x = f.x + f.facing * 70; v.y = f.y; v.stunT = v.sf + 20; v.kbx = v.kby = 0; v.vx = v.vy = 0; }
        const whips = [60, 80, 100, 120, 140];
        const n = whips.indexOf(mf);
        if (n >= 0) {
          directHit(w, f, v, { dmg: 5, ang: 0, bkb: 0, kbg: 100, fkb: 4, eff: "elec", noTumble: true }, null, null, "final");
          v.pendingKB = null; v.setState("stun"); v.stunT = 60; v.stunKind = "stun";
          w.emit({ t: "movetext", text: ["一!", "二!", "三!", "四!", "五!"][n], f });
          w.emit({ t: "sfx", id: "elec", f });
        }
        if (mf === 165) { directHit(w, f, v, { dmg: 18, ang: 38, bkb: 95, kbg: 70, eff: "elec", lag: 1.5 }, null, null, "final"); f.vars.fsFoe = null; }
      },
      fsAnim: (f, P) => {},
    },
  },
  moveFx: {
    whip: (f, fx) => {
      const [x, y] = f.bone("fh");
      for (let i = 0; i < 5; i++) fx.add({ k: "bolt", x, y, t: -i, T: 12, len: 120, a: f.facing > 0 ? (Math.random() - 0.5) * 0.4 : Math.PI + (Math.random() - 0.5) * 0.4, c: "#9fd8ff" });
    },
  },
};
