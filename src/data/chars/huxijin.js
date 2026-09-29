// 胡锡进 · 老胡 — heavyweight trapper. Kit: 胡编体 (「一方面……另一方面……总之」), 和稀泥,
// 叼盘 (the frisbee-catching nickname), and 老胡炒股: entered the market at 63, "陪大家站岗"
// below 3000 points, and became the internet's favourite 反向指标.
import { H } from "../common.js";
import { Projectile } from "../../sim/projectile.js";
import { textShot, nearestFoe } from "../kit.js";

const mudBall = (f, w) => {
  // one puddle per 老胡
  for (const e of w.fx) if (e.kind === "mud" && e.owner === f) e.dead = true;
  const [x, y] = f.bone("fh");
  w.spawnProjectile(new Projectile({
    owner: f, kind: "mudball", x, y, vx: f.facing * 7.5, vy: -7, g: 0.45, r: 16, life: 120, solid: true, softStop: true,
    hb: { dmg: 4, ang: 70, bkb: 30, kbg: 40, eff: "mud" }, moveId: "sspec", clank: 1,
    draw: (ctx, p) => { ctx.translate(p.x, p.y); ctx.fillStyle = "#7a5a32"; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.strokeStyle = "#231a30"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#a88a5a"; ctx.beginPath(); ctx.arc(-5, -5, 5, 0, 7); ctx.fill(); },
    onExpire: (p, W, why) => {
      if (why !== "ground") return;
      const plat = W.stage.plats.find((pl) => p.x >= pl.x1 && p.x <= pl.x2 && Math.abs(pl.y - (p.y + 8)) < 30);
      if (!plat) return;
      W.fx.push({ kind: "mud", owner: f, x: p.x, plat, off: p.x - plat.x1, life: 360, w: 70,
        step: (W2, e) => {
          e.x = e.plat.x1 + e.off;
          if (--e.life <= 0) e.dead = true;
          for (const v of W2.fighters) {
            if (v === e.owner || v.dead || !v.grounded || v.plat !== e.plat) continue;
            if (Math.abs(v.x - e.x) < e.w) {
              v.status.slow = { t: 10 };
              if ((v.state === "run" || v.state === "dash") && !v.status.mudTrip) { v.status.mudTrip = { t: 90 }; v.setState("down"); v.vx *= 0.3; W2.emit({ t: "movetext", text: "滑倒了!", f: v }); }
            }
          }
        },
        draw: (ctx, e, font, t) => {
          const y = e.plat.y + 1, a = Math.min(1, e.life / 40);
          ctx.globalAlpha = a;
          ctx.fillStyle = "#6b4d2a"; ctx.beginPath(); ctx.ellipse(e.x, y, e.w, 9, 0, 0, 7); ctx.fill();
          ctx.fillStyle = "#8a6a3e"; ctx.beginPath(); ctx.ellipse(e.x - 10, y - 1, e.w * 0.6, 5, 0, 0, 7); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.arc(e.x + 18 + Math.sin(t * 0.1) * 4, y - 3, 3, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        } });
      W.emit({ t: "movetext", text: "和稀泥", f });
    },
  }));
};

export default {
  id: "huxijin", name: "胡锡进", title: "叼盘老胡", en: "HU XIJIN",
  color: "#d9443a", color2: "#9dff9a",
  tagline: "一三五胡锡进,二四六胡锡退,周日和稀泥",
  stats: { weight: 114, walk: 4.0, walkAccel: 1.0, run: 10.2, dash: 11, dashFrames: 12, runAccel: 0.9, traction: 1.0,
    air: 6.0, airAccel: 0.4, gravity: 0.95, fall: 14.4, fastFall: 21, jumpV: 19.2, shortV: 12.8, djV: 17.8,
    jumps: 2, jumpsquat: 3, roll: 9.5, brake: 11 },
  body: { leg: [19, 19], torso: 40, torsoW: 44, arm: [19, 18], armW: [15, 14], legW: [18, 16], hand: 9, foot: [22, 10],
    neck: 3, shoulderDrop: 6, shoulderFwd: 3, shoulderBack: 5, hipW: 5, headR: 34, headH: 80, headDX: -2, headDY: 6,
    ecbW: 24, ecbH: 118, hang: 104, shieldR: 66, propLen: 44, holdDist: 60 },
  look: { head: "huxijin", skin: "#efc09a", skinSh: "#d49d7a", sleeve: "#2d3645", sleeveSh: "#1d2430", cuff: "#f3f5f8",
    pants: "#4a505c", pantsSh: "#353a44", shoe: "#1f1f26", sole: "#0e0e12", shoeHi: true,
    torso: { type: "suit", jacket: "#2d3645", jacketSh: "#1d2430", shirt: "#f3f5f8", tie: null, belly: 9, hip: 1.0 },
    prop: "paper" },
  stance: { lean: -5, hd: 2, fa: 35, fe: 70, pa: 0, ba: -15, be: 50, fl: 14, fk: 14, bl: -12, bk: 12, fh: "grip", bh: "fist" },
  loco: { djSpin: 0 },
  taunt: [[0, {}], [10, { fa: 160, fe: 30, pa: 0, lean: -12, ex: 4, ba: 60, be: 110 }], [50, { fa: 150, fe: 35, ex: 4 }], [70, {}]],
  tauntLen: 70,
  tauntLines: ["老胡认为,事情是复杂的。", "我陪大家站岗!", "老胡刚刚又加仓了。", "我劝这位同志冷静。"],
  ai: { style: "trapper", range: 330, aggro: 0.5, proj: ["nspec", "sspec"], absorb: "dspec", fs: "global", upReach: 320 },
  moves: {
    jab1: { dur: 17, iasa: 15, jab: 5,
      anim: [[0, { fa: 50, fe: 60 }], [3, { fa: 92, fe: 5, pa: 0, lean: 10, ex: 1 }, "snap"], [8, { fa: 88, fe: 8, lean: 9 }], [17, {}]],
      hb: [H([3, 4], "pt", 13, 2.3, 80, 6, 25), H([3, 4], "pm", 12, 2.3, 80, 6, 25)], sfx: { 2: "paper" }, txt: { 3: "一方面" } },
    jab2: { dur: 18, iasa: 16, jab: 5,
      anim: [[0, { fa: 120, fe: 30 }], [3, { fa: 70, fe: 5, pa: 0, lean: 12, ex: 1 }, "snap"], [8, { fa: 66, fe: 8, lean: 10 }], [18, {}]],
      hb: [H([3, 4], "pt", 13, 2.2, 75, 6, 25), H([3, 4], "pm", 12, 2.2, 75, 6, 25)], sfx: { 2: "paper" }, txt: { 3: "另一方面" } },
    jab3: { dur: 32, iasa: 30,
      anim: [[0, { fa: 175, fe: 30, lean: -10 }], [6, { fa: 60, fe: 0, pa: 0, lean: 20, ex: 1 }, "snap"], [13, { fa: 50, fe: 5, lean: 18 }], [32, {}]],
      hb: [H([6, 8], "pt", 17, 5, 38, 52, 82, { eff: "text" }), H([6, 8], "pm", 14, 5, 38, 52, 82)], sfx: { 5: "swingM" }, txt: { 6: "总之!" } },
    ftilt: { dur: 31, iasa: 28,
      anim: [[0, { fa: 30, fe: 90, lean: -6 }], [8, { fa: 92, fe: 0, pa: 0, lean: 18, px: 6, fl: 45, fk: 20, bl: -30, ex: 1 }, "snap"], [14, { fa: 90, fe: 0, lean: 16, px: 6 }], [31, {}]],
      hb: [H([8, 10], "pt", 15, 10, 361, 12, 94), H([8, 10], "pm", 13, 8.5, 361, 10, 92)], sfx: { 7: "swingM" }, txt: { 8: "老胡认为" } },
    utilt: { dur: 30, iasa: 27,
      anim: [[0, { fa: 50, fe: 60 }], [7, { fa: 170, fe: 5, pa: 0, lean: -6, ex: 1 }, "snap"], [12, { fa: 210, fe: 10, lean: -12 }], [30, {}]],
      hb: [H([7, 12], "pt", 17, 8, 95, 30, 110), H([7, 12], "pm", 14, 7, 95, 30, 106)], sfx: { 6: "swingM" } },
    dtilt: { dur: 26, iasa: 24, slide: true, traction: 0.5, vel: [{ f: 5, vx: 6 }],
      anim: [[0, { py: 16, fl: 80, fk: 120, bl: -15, bk: 110, lean: 30 }], [6, { py: 28, rot: 20, fl: 95, fk: 20, bl: -40, bk: 30, lean: 40, fa: 100, fe: 0, pa: 0, ex: 1 }, "snap"], [16, { py: 28, rot: 20, fl: 95, fk: 20, lean: 40 }], [26, { py: 12, fl: 75, fk: 100 }]],
      hb: [H([6, 12], "ctr", 22, 7, 72, 40, 58), H([6, 12], "pt", 14, 6, 72, 40, 58)], sfx: { 5: "dash" } },
    dashAtk: { dur: 42, iasa: 40, slide: true, traction: 0.4, vel: [{ f: 3, vx: 11.5 }],
      anim: [[0, { lean: 10 }], [6, { lean: -16, fa: -30, fe: 20, ba: -40, be: 20, fl: 40, bl: -30, ex: 1, sx: 1.08, sy: 0.95 }, "snap"], [22, { lean: -14, fa: -30, ba: -40 }], [42, {}]],
      hb: [H([6, 12], "chest", 32, 12, 55, 64, 66, { x: 12 }), H([13, 22], "chest", 26, 8, 60, 52, 52, { x: 10 })], sfx: { 5: "dash" }, say: { 6: "老胡来了!" } },
    fsmash: { dur: 52, iasa: 50, charge: 10,
      anim: [[0, { fa: 190, fe: 30, lean: -18, px: -6 }], [10, { fa: 210, fe: 30, lean: -24, px: -10, ex: 1 }], [17, { fa: 72, fe: 0, pa: 0, lean: 28, px: 10, fl: 55, fk: 25, bl: -35, bk: 5, ex: 1 }, "snap"], [24, { fa: 58, fe: 0, lean: 24, px: 10 }], [52, {}]],
      hb: [H([17, 19], "pt", 22, 19, 361, 30, 101, { lag: 1.2, eff: "text" }), H([17, 19], "pm", 18, 17, 361, 28, 98)],
      sfx: { 16: "swingXL" }, say: { 17: "社评!" } },
    usmash: { dur: 48, iasa: 46, charge: 6,
      anim: [[0, { py: 10, fk: 45, bk: 40, fa: 30, lean: 10 }], [13, { fa: 170, fe: 10, pa: 0, lean: -8, ex: 1 }, "snap"], [22, { fa: 175, lean: -8 }], [48, {}]],
      hb: [H([13, 18], "ctr", 30, 16, 88, 36, 97, { x: 36, y: -80, eff: "fire" }), H([13, 18], "ctr", 26, 13, 88, 34, 94, { x: 36, y: -20 })],
      sfx: { 12: "stamp" }, fx: { 13: "redCandle" }, txt: { 13: "涨停!" } },
    dsmash: { dur: 50, iasa: 48, charge: 5,
      anim: [[0, { py: 12, fk: 50, bk: 45, fa: 160, fe: 20, ba: 160, be: 20 }], [12, { py: 16, fa: 60, fe: 0, ba: 70, be: 0, lean: 20, ex: 1 }, "snap"], [22, { py: 16, fa: 50, ba: 60, lean: 18 }], [50, {}]],
      hb: [H([12, 15], "pel", 30, 15, 32, 28, 97, { x: 70, y: 10 }), H([12, 15], "pel", 30, 15, 32, 28, 97, { x: -70, y: 10, back: true })],
      sfx: { 11: "slam" }, fx: { 12: "greenCandles" }, txt: { 12: "跌停!" } },
    nair: { dur: 38, iasa: 36, land: 9, ac: [[0, 3], [28, 99]],
      anim: [[0, { fl: 60, fk: 90, bl: 40, bk: 90 }], [5, { rot: 90, fl: 70, fk: 60, bl: 20, bk: 60, fa: 120, ba: 60, ex: 1, sx: 1.08 }], [14, { rot: 270, fl: 70, fk: 60 }], [22, { rot: 360 }], [38, {}]],
      hb: [H([5, 12], "ctr", 32, 9.5, 361, 12, 95, { rev: true }), H([13, 22], "ctr", 26, 6, 361, 8, 90, { rev: true })], sfx: { 4: "spin" } },
    fair: { dur: 40, iasa: 38, land: 13, ac: [[0, 4], [32, 99]],
      anim: [[0, { fa: 190, fe: 30, lean: -10 }], [9, { fa: 210, fe: 20, lean: -16 }], [13, { fa: 60, fe: 0, pa: 0, lean: 22, ex: 1 }, "snap"], [22, { fa: 40, fe: 0, lean: 18 }], [40, {}]],
      hb: [H([13, 15], "pt", 18, 12.5, 361, 22, 97, { eff: "text" }), H([13, 15], "pm", 15, 11, 361, 20, 95)], sfx: { 12: "swingL" } },
    bair: { dur: 36, iasa: 34, land: 10, ac: [[0, 3], [28, 99]],
      anim: [[0, { lean: 10 }], [8, { lean: 34, px: -10, fl: 40, fk: 60, bl: -60, bk: 30, ex: 1, sx: 1.1 }, "snap"], [14, { lean: 30, px: -10 }], [36, {}]],
      hb: [H([8, 10], "pel", 32, 15, 361, 14, 100, { x: -22, back: true }), H([11, 16], "pel", 26, 10, 361, 10, 95, { x: -20, back: true })], sfx: { 7: "swingM" }, txt: { 8: "胡锡退!" } },
    uair: { dur: 32, iasa: 30, land: 8, ac: [[0, 3], [24, 99]],
      anim: [[0, { lean: 10 }], [6, { lean: -28, hd: -20, fa: 120, ba: 110, ex: 1 }, "snap"], [12, { lean: -26, hd: -16 }], [32, {}]],
      hb: [H([5, 11], "hc", 34, 10, 84, 30, 112)], sfx: { 4: "swingM" } },
    dair: { dur: 48, iasa: 46, land: 18, ac: [[0, 3], [40, 99]],
      anim: [[0, { lean: 0 }], [14, { rot: 40, lean: 20, fa: 140, ba: 130, fl: 80, fk: 90 }], [17, { rot: 85, lean: 20, fa: 160, ba: 160, fl: 40, fk: 20, bl: 30, ex: 1, sx: 1.1 }, "snap"], [30, { rot: 85, lean: 20 }], [48, {}]],
      hb: [H([17, 18], "ctr", 32, 14, 280, 25, 88, { lag: 1.2 }), H([19, 30], "ctr", 26, 9, 60, 25, 80)], sfx: { 16: "swingL" } },
    grab: { dur: 34, grab: { f: [7, 9], x: 58, y: -52, w: 28, h: 26 },
      anim: [[0, { ba: 40 }], [7, { fa: 88, fe: 5, ba: 90, be: 10, lean: 14, bh: "open" }, "snap"], [13, { fa: 85, ba: 85, lean: 12 }], [34, {}]], sfx: { 6: "whiff" } },
    dashGrab: { dur: 42, grab: { f: [10, 12], x: 66, y: -52, w: 32, h: 26 }, slide: true, traction: 0.6,
      anim: [[0, { lean: 20 }], [10, { fa: 90, fe: 0, ba: 92, be: 5, lean: 26, bh: "open", fl: 50, bl: -40 }, "snap"], [17, { fa: 88, ba: 88, lean: 22 }], [42, {}]] },
    fthrow: { dur: 34, throw: { f: 12, dmg: 9, ang: 45, bkb: 70, kbg: 56 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 70, lean: -8 }], [12, { ba: 100, be: 0, lean: 22, ex: 1 }, "snap"], [34, {}]], say: { 12: "老胡认为——" }, sfx: { 11: "throw" } },
    bthrow: { dur: 44, throw: { f: 20, dmg: 12, ang: 40, bkb: 64, kbg: 74, back: true, oy: -10 },
      anim: [[0, { ba: 90 }], [10, { ba: 170, be: 10, lean: -20, ex: 1 }], [20, { ba: 250, be: 10, lean: -36, rot: -25 }, "snap"], [44, {}]], say: { 20: "胡锡退!" }, sfx: { 19: "throw" } },
    uthrow: { dur: 38, throw: { f: 15, dmg: 8, ang: 90, bkb: 74, kbg: 66 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 60, py: 10 }], [15, { ba: 180, be: 0, fa: 170, py: -4, ex: 1 }, "snap"], [38, {}]], sfx: { 14: "throw" }, txt: { 15: "3000点!" } },
    dthrow: { dur: 42, throw: { f: 18, dmg: 6.5, ang: 78, bkb: 74, kbg: 32, hangY: 60 },
      anim: [[0, { ba: 90 }], [10, { lean: -6, py: -6 }], [18, { lean: 30, py: 14, rot: 20, ex: 1 }, "snap"], [42, {}]], sfx: { 17: "slam" }, txt: { 18: "和稀泥!" } },

    // ---- specials
    nspec: { dur: 46, iasa: 42, driftMul: 0.5, gravMul: 0.7,
      anim: [[0, { fa: 60, fe: 80, ba: 60, be: 80, lean: -6 }], [14, { fa: 95, fe: 0, pa: 0, ba: -90, be: 0, bh: "open", lean: 0, ex: 1 }, "snap"], [26, { fa: 92, ba: -88 }], [46, {}]],
      script: (f, mf, w) => {
        if (mf !== 14) return;
        textShot(f, w, { text: "一方面", speed: 10.5, r: 26, life: 64, hb: { dmg: 8.5, ang: 45, bkb: 40, kbg: 62 }, moveId: "nspec", col: "#ffffff" });
        textShot(f, w, { text: "另一方面", dir: -f.facing, bone: "bh", speed: 10.5, r: 26, life: 64, hb: { dmg: 8.5, ang: 45, bkb: 40, kbg: 62 }, moveId: "nspec", col: "#ffe066" });
        w.emit({ t: "sfx", id: "paper", f });
      },
      say: { 14: "一方面……另一方面……" } },
    sspec: { dur: 40, iasa: 36, driftMul: 0.5,
      anim: [[0, { ba: -60, be: 60, fa: 40 }], [12, { ba: 100, be: 20, bh: "open", lean: 16, ex: 1 }, "snap"], [22, { ba: 90, lean: 12 }], [40, {}]],
      script: (f, mf, w) => { if (mf === 12) mudBall(f, w); },
      sfx: { 11: "throw" } },
    uspec: { dur: 54, end: "helpless", noDrift: false, driftMul: 0.45, gravMul: 0.5, ledgeGrab: 22,
      onStart: (f) => { f.upBUsed = true; f.vy = Math.min(f.vy, 0) * 0.3; },
      vel: [{ f: 10, vy: -19 }],
      anim: [[0, { py: 10, fk: 60, bk: 55, fa: 30, ba: 30, lean: 8 }], [9, { py: 12, fk: 65, bk: 60 }], [12, { fa: 170, fe: 10, ba: 165, be: 10, pa: 0, fl: 10, fk: 10, bl: -8, bk: 12, ex: 4, sy: 1.06 }, "snap"], [34, { fa: 165, ba: 160, ex: 4 }], [54, { fa: 130, ba: 120, fl: 25, fk: 35 }]],
      script: (f, mf) => { if (mf === 10) f.vx = f.pad.mx * 3.5; },
      hb: [H([10, 30], "ff", 30, 1.5, 90, 0, 100, { y: 20, fkb: 50, rehit: 5, eff: "fire", grp: 1, noTumble: true }), H([30, 33], "hc", 34, 7, 80, 55, 70, { eff: "fire", grp: 2 })],
      say: { 11: "股神在此!" }, sfx: { 10: "fire" }, riding: [10, 36] },
    dspec: { dur: 46, iasa: 44, driftMul: 0.5, gravMul: 0.6,
      absorb: { f: [6, 36], heal: 1.6, onAbsorb: (v, p, w) => { w.emit({ t: "say", text: "叼盘成功!", f: v }); v.vars.caught = 60; } },
      anim: [[0, { fa: 60, fe: 60 }], [6, { fa: 110, fe: 40, ba: 100, be: 50, bh: "open", lean: 16, hd: 14, ex: 4 }, "snap"], [36, { fa: 108, ba: 98, lean: 15, ex: 4 }], [46, {}]],
      sfx: { 5: "absorb" }, txt: { 6: "叼!" } },
    final: { dur: 190, fs: true, intan: [[0, 190]], noDrift: true, gravMul: 0,
      onStart: (f, w) => { w.emit({ t: "fs", f, name: "反向指标", line: "老胡刚刚,又加仓了。" }); w.freeze = 60; f.vx = 0; f.vy = 0; },
      anim: [[0, { fa: 170, fe: 20, lean: -8, ex: 4 }], [40, { fa: 150, fe: 30, ba: 150, be: 30, lean: -10, ex: 4 }], [170, { fa: 150, ba: 150, ex: 2 }], [190, {}]],
      script: (f, mf, w) => {
        if (mf < 30 || mf > 150 || (mf - 30) % 13) return;
        const i = (mf - 30) / 13;
        const foes = w.fighters.filter((v) => v !== f && !v.dead);
        const tgt = foes[i % Math.max(1, foes.length)];
        const x = tgt && i % 3 !== 2 ? tgt.x + (w.rng.next() - 0.5) * 80 : f.x + (w.rng.next() - 0.5) * 1200;
        const p = new Projectile({
          owner: f, kind: "candleFall", x, y: -1300, vx: 0, vy: 24, r: 50, life: 90, hits: 99, pierce: true,
          hb: { dmg: 11, ang: 70, bkb: 70, kbg: 62, eff: "hit" }, reflectable: false, absorbable: false, clank: null, moveId: "final",
          update: (pr, W) => {
            pr.rect = [pr.x - 45, pr.y - 220, pr.x + 45, pr.y];
            const land = W.stage.findLanding(pr.x, pr.y - pr.vy, pr.y, false, null);
            if (land && pr.age > 3) { W.emit({ t: "movetext", text: "跌停!", f }); W.emit({ t: "stomp", x: pr.x, y: land.y }); pr.kill(W, "ground"); }
          },
          draw: drawFallingCandle,
        });
        p.rect = [x - 45, -1520, x + 45, -1300];
        w.spawnProjectile(p);
      } },
  },
  drawUnder(ctx, f, t, Hh) {
    const m = f.move;
    if (f.moveId === "uspec" && f.mf >= 10 && f.mf <= 36) {
      const k = Math.min(1, (f.mf - 10) / 5), h = 90 + (f.mf - 10) * 14;
      ctx.save(); ctx.globalAlpha = f.mf > 30 ? (36 - f.mf) / 6 : 1;
      ctx.fillStyle = "#ff4a4a"; ctx.strokeStyle = "#231a30"; ctx.lineWidth = 4;
      ctx.fillRect(f.x - 26, f.y, 52, h * k); ctx.strokeRect(f.x - 26, f.y, 52, h * k);
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 10); ctx.lineTo(f.x, f.y + h * k + 40); ctx.stroke();
      ctx.fillStyle = "#a82222"; ctx.fillRect(f.x + 6, f.y + 3, 17, h * k - 6);
      ctx.restore();
    }
  },
  moveFx: {
    redCandle: (f, fx) => { fx.add({ k: "candle", x: f.x + f.facing * 36, y: f.y, t: 0, T: 26, col: "#ff4a4a", up: true }); },
    greenCandles: (f, fx) => { fx.add({ k: "candle", x: f.x + 70, y: f.y, t: 0, T: 24, col: "#2fcf6a" }); fx.add({ k: "candle", x: f.x - 70, y: f.y, t: 0, T: 24, col: "#2fcf6a" }); },
  },
};

function drawFallingCandle(ctx, p) {
  const [x0, y0, x1, y1] = p.rect;
  ctx.fillStyle = "#2fcf6a"; ctx.strokeStyle = "#231a30"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(p.x, y0 - 60); ctx.lineTo(p.x, y1 + 40); ctx.stroke();
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.fillStyle = "#16803e"; ctx.fillRect(x0 + (x1 - x0) * 0.6, y0 + 4, (x1 - x0) * 0.36, y1 - y0 - 8);
  ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(x0 + 8, y0 + 8, 8, y1 - y0 - 16);
}
