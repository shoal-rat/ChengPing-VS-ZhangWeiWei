// 牢A · 斩杀线 — anonymous Seattle student-streamer (斯奎奇大王), original design: face
// always mosaic'd. Kit: 美国斩杀线 (a game term he used for "one accident from the street"),
// 长生种/短生种, and the January 2026 escape: 「扔下筷子,直奔大使馆」 → 跑路回国. Netizens: 一人顶一个师.
// Every one of his smash attacks executes targets already past their 斩杀线.
import { H } from "../common.js";
import { Projectile } from "../../sim/projectile.js";

const EXEC = 170; // knockback floor vs targets past their kill line

export default {
  id: "laoa", name: "牢A", title: "斩杀线", en: "LAO A",
  color: "#ff2e3e", color2: "#8fd4ff",
  tagline: "一人顶一个师",
  stats: { weight: 88, walk: 4.5, walkAccel: 1.2, run: 11.0, dash: 11.6, dashFrames: 11, runAccel: 1.1, traction: 1.0,
    air: 6.4, airAccel: 0.42, gravity: 0.9, fall: 14, fastFall: 20.5, jumpV: 19.8, shortV: 13.2, djV: 18.6,
    jumps: 2, jumpsquat: 3, roll: 10, brake: 10 },
  body: { leg: [22, 22], torso: 37, torsoW: 36, arm: [20, 19], armW: [13, 12], legW: [16, 14], hand: 8, foot: [21, 10],
    neck: 4, shoulderDrop: 6, shoulderFwd: 2, shoulderBack: 4, hipW: 3, headR: 34, headH: 82, headDX: -3, headDY: 7,
    ecbW: 20, ecbH: 118, hang: 108, shieldR: 60, propLen: 38, holdDist: 54 },
  look: { head: "laoa", skin: "#f0c29e", skinSh: "#d6a07c", sleeve: "#f4f6f8", sleeveSh: "#d3d9e0", cuff: "#25252e", glove: "#5aa0e0",
    pants: "#3d5a80", pantsSh: "#2b4262", shoe: "#e8e8ea", sole: "#8a8f99", shoeHi: true,
    torso: { type: "labcoat", base: "#f4f6f8", coatSh: "#d3d9e0", hoodie: "#25252e", hip: 0.96 },
    prop: "chopsticks" },
  stance: { lean: 6, hd: -2, fa: 60, fe: 70, pa: -20, ba: 10, be: 100, fl: 16, fk: 20, bl: -14, bk: 14, fh: "grip", bh: "fist" },
  taunt: [[0, {}], [10, { fa: 100, fe: 40, pa: 60, lean: -6, ex: 4, ba: 60, be: 100 }], [50, { fa: 98, fe: 42, ex: 4 }], [70, {}]],
  tauntLen: 70,
  tauntLines: ["这就是斩杀线。", "长生种和短生种,懂?", "扔下筷子,润了。", "一人顶一个师。"],
  ai: { style: "finisher", range: 200, aggro: 0.6, proj: ["nspec"], stance: "dspec", fs: "global", upReach: 360 },
  moves: {
    jab1: { dur: 14, iasa: 12, jab: 4,
      anim: [[0, { fa: 60, fe: 60 }], [2, { fa: 90, fe: 2, pa: 0, lean: 10, ex: 1 }, "snap"], [6, { fa: 88, fe: 5, lean: 9 }], [14, {}]],
      hb: [H([2, 3], "pt", 11, 2, 80, 5, 25), H([2, 3], "pm", 10, 2, 80, 5, 25)], sfx: { 1: "swingS" } },
    jab2: { dur: 15, iasa: 13, jab: 4,
      anim: [[0, { fa: 70, fe: 40 }], [2, { fa: 96, fe: 0, pa: 0, lean: 13, ex: 1 }, "snap"], [7, { fa: 92, fe: 4, lean: 12 }], [15, {}]],
      hb: [H([2, 3], "pt", 11, 2, 75, 5, 25), H([2, 3], "pm", 10, 2, 75, 5, 25)], sfx: { 1: "swingS" } },
    jab3: { dur: 28, iasa: 26,
      anim: [[0, { fa: 150, fe: 20, lean: -6 }], [5, { fa: 70, fe: 0, pa: 0, lean: 18, ex: 1 }, "snap"], [12, { fa: 60, lean: 16 }], [28, {}]],
      hb: [H([5, 7], "pt", 14, 4, 40, 48, 82, { eff: "slash" }), H([5, 7], "pm", 12, 4, 40, 48, 82)], sfx: { 4: "slash" } },
    ftilt: { dur: 28, iasa: 25,
      anim: [[0, { fa: 40, fe: 80, lean: -4, px: -4 }], [6, { fa: 92, fe: 0, pa: 0, lean: 20, px: 8, fl: 50, fk: 20, bl: -30, bk: 5, ex: 1 }, "snap"], [12, { fa: 90, fe: 0, lean: 18, px: 8 }], [28, {}]],
      hb: [H([6, 8], "pt", 13, 9, 361, 10, 96), H([6, 8], "pm", 11, 8, 361, 10, 94)], sfx: { 5: "swingM" } },
    utilt: { dur: 28, iasa: 25,
      anim: [[0, { lean: 10 }], [6, { lean: -20, hd: -16, fa: 150, ba: 140, fl: 30, ex: 1 }, "snap"], [11, { lean: -18, hd: -14 }], [28, {}]],
      hb: [H([6, 10], "hc", 30, 7.5, 92, 30, 112, { y: -10 })], sfx: { 5: "swingM" } },
    dtilt: { dur: 22, iasa: 20, slide: true, traction: 0.5, vel: [{ f: 4, vx: 6 }],
      anim: [[0, { py: 16, fl: 85, fk: 130, bl: -15, bk: 120, lean: 28 }], [4, { py: 26, fl: 95, fk: 5, bl: -30, bk: 110, lean: 10, ex: 1 }, "snap"], [12, { py: 26, fl: 95, fk: 5 }], [22, { py: 14, fl: 80, fk: 110 }]],
      hb: [H([4, 9], "ff", 16, 7, 70, 40, 58)], sfx: { 3: "dash" } },
    dashAtk: { dur: 40, iasa: 38, slide: true, traction: 0.35, vel: [{ f: 2, vx: 12.5 }],
      anim: [[0, { lean: 20 }], [5, { lean: 34, fa: 100, fe: 0, pa: 0, ba: 110, be: 10, fl: 60, fk: 30, bl: -50, bk: 20, ex: 1 }, "snap"], [22, { lean: 30, fa: 98, ba: 105 }], [40, {}]],
      hb: [H([5, 10], "pt", 16, 10, 60, 58, 62), H([5, 10], "ctr", 22, 9, 60, 58, 60), H([11, 20], "pt", 12, 6, 65, 48, 50)], sfx: { 4: "dash" }, say: { 5: "跑路!" } },
    fsmash: { dur: 50, iasa: 48, charge: 9,
      anim: [[0, { fa: 175, fe: 20, pa: 0, lean: -16, px: -6 }], [9, { fa: 195, fe: 20, lean: -22, px: -10, ex: 1 }], [15, { fa: 50, fe: 0, pa: 0, lean: 28, px: 12, fl: 60, fk: 25, bl: -40, bk: 5, ex: 1 }, "snap"], [22, { fa: 35, fe: 0, lean: 24, px: 12 }], [50, {}]],
      hb: [H([15, 17], "pt", 22, 15, 361, 26, 97, { eff: "slash", execute: EXEC, lag: 1.15 }), H([15, 17], "pm", 16, 13, 361, 24, 94, { eff: "slash", execute: EXEC })],
      sfx: { 14: "slash" }, say: { 15: "斩!" }, fx: { 15: "slashArc" } },
    usmash: { dur: 44, iasa: 42, charge: 5,
      anim: [[0, { py: 12, fk: 50, bk: 45, fa: 20, lean: 14 }], [10, { py: -6, fa: 178, fe: 0, pa: 0, lean: -8, ex: 1, sy: 1.06 }, "snap"], [18, { fa: 200, lean: -10 }], [44, {}]],
      hb: [H([10, 15], "pt", 24, 14, 88, 32, 96, { eff: "slash" }), H([10, 15], "pm", 18, 12.5, 88, 30, 94, { eff: "slash" })], sfx: { 9: "slash" }, fx: { 10: "slashUp" } },
    dsmash: { dur: 46, iasa: 44, charge: 4,
      anim: [[0, { py: 16, fk: 70, bk: 60, lean: 24 }], [8, { py: 20, fa: 92, fe: 0, pa: 0, lean: 30, ex: 1 }, "snap"], [12, { py: 20, fa: 60, lean: 20 }], [16, { py: 20, fa: -92, fe: 0, pa: 0, lean: 10, ex: 1 }, "snap"], [24, { py: 18, fa: -80 }], [46, {}]],
      hb: [H([8, 10], "pt", 18, 12, 30, 26, 95, { eff: "slash" }), H([16, 18], "pt", 18, 12.5, 32, 28, 97, { eff: "slash", back: true })],
      sfx: { 7: "slash", 15: "slash" }, fx: { 8: "slashLow" } },
    nair: { dur: 34, iasa: 32, land: 7, ac: [[0, 3], [24, 99]],
      anim: [[0, { fl: 60, fk: 90 }], [3, { rot: 70, fa: 95, fe: 0, pa: 0, fl: 70, fk: 80, ex: 1 }], [11, { rot: 250, fa: 95 }], [18, { rot: 360 }], [34, {}]],
      hb: [H([3, 8], "pt", 15, 8.5, 361, 12, 95, { rev: true, eff: "slash" }), H([3, 8], "ctr", 22, 8, 361, 12, 95, { rev: true }), H([9, 18], "pt", 12, 5, 361, 5, 90, { rev: true })], sfx: { 2: "spin" } },
    fair: { dur: 38, iasa: 36, land: 11, ac: [[0, 3], [30, 99]],
      anim: [[0, { fa: 170, fe: 20 }], [8, { fa: 190, fe: 20, lean: -12 }], [11, { fa: 60, fe: 0, pa: 0, lean: 22, ex: 1 }, "snap"], [18, { fa: 40, lean: 18 }], [38, {}]],
      hb: [H([11, 13], "pt", 17, 11, 361, 20, 96, { eff: "slash" }), H([11, 13], "pm", 14, 9.5, 361, 18, 94)], sfx: { 10: "slash" } },
    bair: { dur: 34, iasa: 32, land: 9, ac: [[0, 3], [26, 99]],
      anim: [[0, { bl: -20, bk: 90, fl: 50, fk: 90, lean: 20 }], [7, { bl: -98, bk: 0, fl: 60, fk: 90, lean: 32, ex: 1 }, "snap"], [13, { bl: -94, bk: 5, lean: 28 }], [34, {}]],
      hb: [H([7, 9], "bf", 17, 12.5, 361, 12, 100, { back: true }), H([10, 14], "bf", 13, 8, 361, 8, 95, { back: true })], sfx: { 6: "swingM" } },
    uair: { dur: 32, iasa: 30, land: 7, ac: [[0, 3], [24, 99]],
      anim: [[0, { fa: 100 }], [5, { fa: 150, fe: 0, pa: 0, lean: -8, ex: 1 }, "snap"], [9, { fa: 220, fe: 0, lean: -14 }], [32, {}]],
      hb: [H([5, 11], "pt", 17, 8, 82, 25, 112, { eff: "slash" }), H([5, 11], "pm", 14, 7, 82, 25, 108)], sfx: { 4: "slash" } },
    dair: { dur: 44, iasa: 42, land: 15, ac: [[0, 3], [36, 99]],
      anim: [[0, { fa: 120, fe: 30 }], [12, { fa: 140, fe: 20, lean: -10 }], [15, { fa: 2, fe: 0, pa: 0, lean: 18, ex: 1 }, "snap"], [22, { fa: 5 }], [44, {}]],
      hb: [H([15, 16], "pt", 15, 13, 275, 22, 90, { eff: "slash", lag: 1.2 }), H([17, 22], "pt", 13, 9, 60, 20, 85)], sfx: { 14: "slash" } },
    grab: { dur: 32, grab: { f: [6, 8], x: 54, y: -52, w: 28, h: 26 },
      anim: [[0, { ba: 40 }], [6, { fa: 88, fe: 5, ba: 90, be: 10, lean: 14, bh: "open" }, "snap"], [12, { fa: 85, ba: 85, lean: 12 }], [32, {}]], sfx: { 5: "whiff" } },
    dashGrab: { dur: 40, grab: { f: [9, 11], x: 64, y: -52, w: 32, h: 26 }, slide: true, traction: 0.6,
      anim: [[0, { lean: 20 }], [9, { fa: 90, fe: 0, ba: 92, be: 5, lean: 26, bh: "open", fl: 50, bl: -40 }, "snap"], [16, { fa: 88, ba: 88, lean: 22 }], [40, {}]] },
    fthrow: { dur: 34, throw: { f: 12, dmg: 8, ang: 45, bkb: 70, kbg: 56 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 70, lean: -8 }], [12, { ba: 100, be: 0, lean: 22, ex: 1 }, "snap"], [34, {}]], sfx: { 11: "throw" }, txt: { 12: "短生种!" } },
    bthrow: { dur: 42, throw: { f: 18, dmg: 10.5, ang: 42, bkb: 60, kbg: 70, back: true, oy: -10 },
      anim: [[0, { ba: 90 }], [10, { ba: 170, be: 10, lean: -20, ex: 1 }], [18, { ba: 250, be: 10, lean: -34, rot: -25 }, "snap"], [42, {}]], say: { 18: "润回来!" }, sfx: { 17: "throw" } },
    uthrow: { dur: 36, throw: { f: 14, dmg: 8, ang: 90, bkb: 72, kbg: 64 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 60, py: 10 }], [14, { ba: 180, be: 0, fa: 170, py: -4, ex: 1 }, "snap"], [36, {}]], sfx: { 13: "throw" } },
    dthrow: { dur: 40, throw: { f: 17, dmg: 6, ang: 74, bkb: 72, kbg: 34, hangY: 60 },
      anim: [[0, { ba: 90 }], [10, { fa: 170, fe: 20, lean: -8 }], [17, { fa: 30, fe: 0, pa: 0, lean: 32, py: 10, ex: 1 }, "snap"], [40, {}]], sfx: { 16: "slam" }, txt: { 17: "长生种?" } },

    // ---- specials
    nspec: { dur: 50, iasa: 46, driftMul: 0.4, gravMul: 0.6,
      anim: [[0, { fa: 170, fe: 20, pa: 0, lean: -12 }], [18, { fa: 185, fe: 20, lean: -16, ex: 1 }], [22, { fa: 90, fe: 0, pa: 0, lean: 18, ex: 1 }, "snap"], [32, { fa: 88, lean: 14 }], [50, {}]],
      script: (f, mf, w) => {
        if (mf !== 22) return;
        const [x, y] = f.bone("fh");
        w.spawnProjectile(new Projectile({
          owner: f, kind: "killline", x: x + f.facing * 20, y: y - 10, vx: f.facing * 10, r: 26, life: 75, clank: 2, moveId: "nspec",
          hb: { dmg: 6, ang: 45, bkb: 34, kbg: 50, eff: "slash", execute: EXEC + 20 },
          onHit: (p, v, W) => { if (v.percent >= v.killLine) W.emit({ t: "say", text: "斩杀线,到了。", f }); },
          draw: drawKillLine,
        }));
      },
      say: { 22: "斩杀线!" }, sfx: { 18: "charge", 22: "slash" } },
    sspec: { dur: 42, iasa: 38, noDrift: true, gravMul: 0.15, slide: true, traction: 0.2, intan: [[4, 14]],
      canUse: (f) => f.grounded || !f.sideBUsed,
      onStart: (f, w) => {
        if (!f.grounded) f.sideBUsed = true;
        f.vy = Math.min(0, f.vy);
        const [x, y] = f.bone("fh");
        w.spawnProjectile(new Projectile({
          owner: f, kind: "chopsticks", x, y: f.grounded ? f.y - 8 : y, vx: 0, vy: f.grounded ? 0 : 2, g: f.grounded ? 0 : 0.3, r: 22, life: 90, clank: 1,
          hb: { dmg: 5, ang: 70, bkb: 40, kbg: 40, eff: "hit" }, moveId: "sspec", solid: !f.grounded, softStop: true,
          draw: drawChopsticks,
        }));
      },
      vel: [{ f: 3, vx: 16 }],
      anim: [[0, { lean: 10, fa: 20, fe: 20, pa: 60 }], [3, { lean: 36, fa: -40, fe: 60, ba: 60, be: 90, fl: 70, fk: 50, bl: -60, bk: 40, ex: 2, pv: 0 }, "snap"], [30, { lean: 30, fa: -30, ba: 55, pv: 0 }], [42, { pv: 1 }]],
      hb: [H([6, 20], "ctr", 22, 7, 55, 55, 50)],
      say: { 1: "扔下筷子——", 16: "就跑!" }, sfx: { 3: "dash" } },
    uspec: { dur: 60, end: "helpless", noDrift: true, gravMul: 0, ledgeGrab: 20,
      onStart: (f) => { f.upBUsed = true; f.vx *= 0.3; f.vy = 0; },
      anim: [[0, { py: 8, fk: 50, bk: 45, ex: 4 }], [8, { py: 20, fl: 80, fk: 90, bl: 60, bk: 90, fa: 100, fe: 60, ba: 90, be: 60, lean: 10, ex: 4 }], [50, { py: 20, fl: 80, fk: 90, bl: 60, bk: 90, ex: 4 }], [60, { fa: 150, ba: 140, fl: 20, fk: 30 }]],
      script: (f, mf) => {
        if (mf === 8) { let dx = f.pad.mx, dy = f.pad.my; if (dy > -0.3) dy = -0.6; if (Math.abs(dx) < 0.2) dx = f.facing * 0.25; const m = Math.hypot(dx, dy); f.vars.pd = [dx / m, dy / m]; if (Math.abs(dx) > 0.3) f.facing = Math.sign(dx); }
        if (mf >= 8 && mf < 50) { const k = Math.min(1, (mf - 8) / 10); f.vx = f.vars.pd[0] * 15 * k; f.vy = f.vars.pd[1] * 15 * k; if (f.grounded) { f.grounded = false; f.plat = null; } }
        if (mf === 50) { f.vx *= 0.3; f.vy = -3; }
      },
      hb: [H([8, 48], "ctr", 40, 9, 60, 50, 70, { y: 10, eff: "hit" })],
      say: { 8: "跑路回国!" }, sfx: { 8: "plane" }, riding: [8, 50] },
    dspec: { dur: 40, iasa: 36, driftMul: 0.5, gravMul: 0.6,
      anim: [[0, { fa: 60, fe: 70 }], [10, { fa: 160, fe: 30, ba: 150, be: 30, lean: -8, ex: 4 }, "snap"], [22, { fa: 150, ba: 140, ex: 4 }], [40, {}]],
      script: (f, mf, w) => {
        if (mf !== 12) return;
        const s = f.status.stance === "long" ? "short" : "long";
        f.status.stance = s;
        w.emit({ t: "say", text: s === "long" ? "长生种模式:稳住。" : "短生种模式:梭哈!", f });
        w.emit({ t: "movefx", id: "stance", f });
      },
      sfx: { 12: "counter" } },
    final: { dur: 170, fs: true, intan: [[0, 170]], noDrift: true, gravMul: 0,
      onStart: (f, w) => { w.emit({ t: "fs", f, name: "美国斩杀线", line: "一次意外,就是斩杀。" }); w.freeze = 60; f.vx = 0; f.vy = 0; },
      anim: [[0, { fa: 170, fe: 10, pa: 0, ex: 1 }], [30, { fa: 60, fe: 0, pa: 0, lean: 20, ex: 1 }, "snap"], [150, { fa: 60, lean: 20, ex: 1 }], [170, {}]],
      script: (f, mf, w) => {
        if (mf !== 30) return;
        const cam = w.stage.def.cam;
        const p = new Projectile({
          owner: f, kind: "fsKill", x: 0, y: w.stage.blast.top + 200, vy: 0, r: 40, life: 110, hits: 99, pierce: true,
          hb: { dmg: 20, ang: 80, bkb: 40, kbg: 80, eff: "slash", execute: 260, lag: 1.5 },
          reflectable: false, absorbable: false, clank: null, moveId: "final",
          data: { y0: cam.top, y1: 300 },
          update: (pr, W) => {
            const k = Math.min(1, pr.age / 80);
            pr.y = pr.data.y0 + (pr.data.y1 - pr.data.y0) * k * k;
            pr.rect = [W.stage.blast.left, pr.y - 26, W.stage.blast.right, pr.y + 26];
            for (const v of W.fighters) if (v !== pr.owner && !v.dead && Math.abs(v.y - 50 - pr.y) < 140) v.status.doomLine = { t: 2 };
          },
          draw: drawFsKillLine,
        });
        p.rect = [w.stage.blast.left, cam.top - 26, w.stage.blast.right, cam.top + 26];
        w.spawnProjectile(p);
      } },
  },
  drawUnder(ctx, f, t, Hh) {
    if (f.moveId === "uspec" && f.mf >= 8 && f.mf <= 50) drawPlane(ctx, f);
    if (f.status.stance) {
      const [cx, cy] = f.centre();
      ctx.save();
      ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 0.15);
      ctx.fillStyle = f.status.stance === "long" ? "#5ab8ff" : "#ff3a4a";
      ctx.beginPath(); ctx.ellipse(cx, cy - 10, 54, 84, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  },
  moveFx: {
    slashArc: (f, fx) => { const [x, y] = f.bone("pt"); fx.add({ k: "slash", x: f.x + f.facing * 60, y: y - 10, t: 0, T: 14, dir: f.facing, a: 0.2 }); },
    slashUp: (f, fx) => { fx.add({ k: "slash", x: f.x, y: f.y - 170, t: 0, T: 14, dir: f.facing, a: -1.4 }); },
    slashLow: (f, fx) => { fx.add({ k: "slash", x: f.x, y: f.y - 14, t: 0, T: 14, dir: f.facing, a: 0, wide: true }); },
    stance: (f, fx) => { const [x, y] = f.centre(); fx.add({ k: "ring", x, y, t: 0, T: 20, r0: 20, r1: 110, c: f.status.stance === "long" ? "#5ab8ff" : "#ff3a4a", w: 6 }); },
  },
};

function drawKillLine(ctx, p, font, t, H) {
  ctx.translate(p.x, p.y);
  const L = 110;
  ctx.fillStyle = "rgba(255,40,60,0.35)"; ctx.fillRect(-L / 2, -12, L, 24);
  ctx.fillStyle = "#fff"; ctx.fillRect(-L / 2, -4, L, 8);
  ctx.fillStyle = "#ff1a2e"; ctx.fillRect(-L / 2, -2, L, 4);
  ctx.scale(p.dir, 1);
  H.memeText(ctx, "KILL LINE", 0, -22, 14, "#ff5060", "#2a0008", font);
}
function drawChopsticks(ctx, p) {
  ctx.translate(p.x, p.y);
  ctx.rotate(0.3);
  ctx.strokeStyle = "#231a30"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-20, -4); ctx.lineTo(22, -2); ctx.moveTo(-20, 4); ctx.lineTo(22, 6); ctx.stroke();
  ctx.strokeStyle = "#e9c989"; ctx.lineWidth = 2.5; ctx.stroke();
}
function drawFsKillLine(ctx, p, font, t, H) {
  const [x0, y0, x1, y1] = p.rect;
  const y = (y0 + y1) / 2;
  ctx.fillStyle = "rgba(255,20,40,0.18)"; ctx.fillRect(x0, y - 120, x1 - x0, 240);
  ctx.fillStyle = "#ffffff"; ctx.fillRect(x0, y - 12, x1 - x0, 24);
  ctx.fillStyle = "#ff1a2e"; ctx.fillRect(x0, y - 7, x1 - x0, 14);
  for (let x = -1600; x <= 1600; x += 640) H.memeText(ctx, "美国斩杀线", x + ((t * 6) % 640), y - 60, 56, "#ff4050", "#2a0008", font);
}
function drawPlane(ctx, f) {
  ctx.save();
  ctx.translate(f.x, f.y + 4);
  const d = f.vars.pd || [f.facing, -1];
  ctx.rotate(Math.atan2(d[1], d[0]) * (f.facing > 0 ? 1 : 1) + (f.facing < 0 ? Math.PI : 0));
  ctx.scale(f.facing, 1);
  ctx.fillStyle = "#f4f6f9"; ctx.strokeStyle = "#231a30"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, 70, 16, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-30, 40); ctx.lineTo(0, 40); ctx.lineTo(20, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-55, -4); ctx.lineTo(-70, -34); ctx.lineTo(-52, -34); ctx.lineTo(-40, -6); ctx.closePath(); ctx.fillStyle = "#c8262c"; ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#2c3446"; for (let i = -30; i < 50; i += 16) ctx.fillRect(i, -6, 8, 6);
  ctx.fillStyle = "#c8262c"; ctx.font = "900 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("回国航班", 10, 12);
  ctx.restore();
}
