// 户晨风 · 苹果判官 — light, fast setup character. Kit: 「你用什么手机?」 and the
// 苹果人/安卓人 caste system (with 浓度: 安卓中的安卓), 购买力测试 (hands strangers cash),
// 特斯拉 = 苹果车, 「没有山姆的城市,年轻人不要待」, 「典型的安卓逻辑——穷、愤怒、没见识」,
// and a career of banned accounts that keep coming back (账号转世).
import { H } from "../common.js";
import { Projectile } from "../../sim/projectile.js";
import { directHit, findVictim, nearestFoe } from "../kit.js";

const cash = (f, w, i) => {
  const [x, y] = f.bone("fh");
  w.spawnProjectile(new Projectile({
    owner: f, kind: "cash", x, y: y - 6, vx: f.facing * (9 + i * 0.6), vy: -3.5 + i * 2.2, g: 0.12, drag: 0.012, r: 16, life: 70, spin: 0.3 * f.facing,
    hb: { dmg: 4, ang: 50, bkb: 18, kbg: 40, eff: "money" }, moveId: "sspec", clank: 0,
    onHit: (p, v) => { if (v.grounded && !v.status.cashImmune && v.state === "hitstun") { v.pendingKB = null; v.stun(34, "money"); v.status.cashImmune = { t: 240 }; } },
    draw: (ctx, p, font) => {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = "#e8403a"; ctx.strokeStyle = "#231a30"; ctx.lineWidth = 2.5;
      ctx.fillRect(-18, -9, 36, 18); ctx.strokeRect(-18, -9, 36, 18);
      ctx.fillStyle = "#ffd6c8"; ctx.beginPath(); ctx.arc(6, 0, 5, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `900 9px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("100", -7, 0);
    },
  }));
};

export default {
  id: "huchenfeng", name: "户晨风", title: "苹果判官", en: "HU CHENFENG",
  color: "#2fb56a", color2: "#d8f6ff",
  tagline: "没有山姆的城市,年轻人不要待",
  stats: { weight: 80, walk: 4.8, walkAccel: 1.3, run: 12.2, dash: 12.6, dashFrames: 11, runAccel: 1.3, traction: 1.1,
    air: 7.2, airAccel: 0.5, gravity: 0.94, fall: 14.2, fastFall: 21, jumpV: 20.2, shortV: 13.4, djV: 19.2,
    jumps: 2, jumpsquat: 3, roll: 11, brake: 9 },
  body: { leg: [21, 21], torso: 36, torsoW: 34, arm: [19, 18], armW: [12, 11], legW: [15, 13], hand: 7.5, foot: [21, 10],
    neck: 5, shoulderDrop: 6, shoulderFwd: 2, shoulderBack: 4, hipW: 3, headR: 33, headH: 80, headDX: -2, headDY: 6,
    ecbW: 19, ecbH: 116, hang: 106, shieldR: 58, propLen: 30, holdDist: 52 },
  look: { head: "huchenfeng", skin: "#f3c9a6", skinSh: "#dba886", sleeve: "#1f2d4f", sleeveSh: "#141e36", cuff: "#f3f5f9",
    pants: "#d8c7a3", pantsSh: "#bba982", shoe: "#f4f4f4", sole: "#9aa0aa", shoeHi: true,
    torso: { type: "sweater", base: "#1f2d4f", stripe: "#e9edf3", collar: "#f5f7fb", hip: 0.9 },
    prop: "phone" },
  stance: { lean: 2, hd: -2, fa: 55, fe: 70, pa: 180, ba: -20, be: 60, fl: 14, fk: 16, bl: -12, bk: 12, fh: "grip", bh: "fist" },
  taunt: [[0, {}], [10, { fa: 110, fe: 60, pa: 200, lean: -6, ex: 4, ba: -30, be: 90 }], [50, { fa: 105, fe: 65, ex: 4 }], [70, {}]],
  tauntLen: 70,
  tauntLines: ["你用什么手机?", "苹果中的苹果。", "典型的安卓逻辑。", "没有山姆的城市,年轻人不要待。"],
  ai: { style: "skirmisher", range: 260, aggro: 0.6, proj: ["sspec"], close: ["nspec"], mid: ["dspec"], fs: "global", upReach: 260 },
  moves: {
    jab1: { dur: 14, iasa: 12, jab: 4,
      anim: [[0, { fa: 60, fe: 60 }], [2, { fa: 90, fe: 4, pa: 180, lean: 10, ex: 1 }, "snap"], [6, { fa: 88, fe: 6, lean: 9 }], [14, {}]],
      hb: [H([2, 3], "fh", 13, 2, 80, 5, 25, { x: 6 })], sfx: { 1: "swingS" } },
    jab2: { dur: 15, iasa: 13, jab: 4,
      anim: [[0, { ba: 40, be: 90 }], [2, { ba: 92, be: 0, lean: 12, ex: 1 }, "snap"], [6, { ba: 88, lean: 10 }], [15, {}]],
      hb: [H([2, 3], "bh", 12, 2, 80, 5, 25)], sfx: { 1: "swingS" } },
    jab3: { dur: 28, iasa: 26,
      anim: [[0, { fa: 160, fe: 30, lean: -8 }], [5, { fa: 75, fe: 0, pa: 180, lean: 18, ex: 1 }, "snap"], [11, { fa: 70, lean: 16 }], [28, {}]],
      hb: [H([5, 7], "fh", 17, 4, 40, 48, 82, { x: 10 })], sfx: { 4: "swingM" }, txt: { 5: "滴!" } },
    ftilt: { dur: 28, iasa: 25,
      anim: [[0, { fa: 20, fe: 90, lean: -6 }], [6, { fa: 92, fe: 0, pa: 180, lean: 18, px: 6, fl: 45, bl: -30, ex: 1 }, "snap"], [12, { fa: 90, lean: 16, px: 6 }], [28, {}]],
      hb: [H([6, 8], "fh", 16, 8.5, 361, 10, 95, { x: 16 }), H([6, 8], "fe", 12, 7, 361, 10, 92)], sfx: { 5: "swingM" } },
    utilt: { dur: 26, iasa: 23,
      anim: [[0, { fa: 60 }], [5, { fa: 172, fe: 0, pa: 180, lean: -8, ex: 4 }, "snap"], [10, { fa: 175, lean: -8, ex: 4 }], [26, {}]],
      hb: [H([5, 9], "fh", 22, 7, 92, 32, 112, { y: -10, eff: "hit" })], sfx: { 4: "swingS" }, txt: { 5: "咔嚓!" }, fx: { 5: "flash" } },
    dtilt: { dur: 20, iasa: 18,
      anim: [[0, { py: 16, fl: 85, fk: 130, bl: -15, bk: 120, lean: 28 }], [4, { py: 22, fl: 100, fk: 5, bl: -20, bk: 130, lean: 22, ex: 1 }, "snap"], [10, { py: 22, fl: 100, fk: 5 }], [20, { py: 14, fl: 80, fk: 110 }]],
      hb: [H([4, 7], "ff", 16, 5.5, 72, 36, 60)], sfx: { 3: "swingS" } },
    dashAtk: { dur: 38, iasa: 36, slide: true, traction: 0.3, vel: [{ f: 2, vx: 13 }],
      anim: [[0, { lean: 20 }], [5, { lean: -6, py: 14, fl: 70, fk: 0, bl: -60, bk: 60, fa: 130, fe: 20, ba: 150, ex: 1 }, "snap"], [20, { lean: -6, py: 14, fl: 70, fk: 0 }], [38, {}]],
      hb: [H([5, 10], "ff", 18, 9, 70, 55, 60), H([11, 20], "ff", 14, 6, 70, 45, 50)], sfx: { 4: "dash" }, say: { 5: "特斯拉漂移!" } },
    fsmash: { dur: 48, iasa: 46, charge: 9,
      anim: [[0, { fa: 190, fe: 20, pa: 180, lean: -18, px: -6 }], [9, { fa: 205, fe: 20, lean: -24, px: -10, ex: 1 }], [15, { fa: 78, fe: 0, pa: 180, lean: 28, px: 10, fl: 60, fk: 25, bl: -35, bk: 5, ex: 1 }, "snap"], [22, { fa: 60, fe: 0, lean: 24, px: 10 }], [48, {}]],
      hb: [H([15, 17], "fh", 24, 15, 361, 28, 98, { x: 18, lag: 1.15 }), H([15, 17], "fe", 14, 12.5, 361, 26, 95)],
      sfx: { 14: "swingL" }, say: { 15: "苹果中的苹果!" }, weaponScale: 2.2 },
    usmash: { dur: 42, iasa: 40, charge: 5,
      anim: [[0, { py: 12, fk: 50, bk: 45, fa: 30, lean: 12 }], [10, { py: -4, fa: 178, fe: 0, pa: 180, ba: 170, lean: -6, ex: 4, sy: 1.06 }, "snap"], [18, { fa: 176, ba: 168, lean: -6, ex: 4 }], [42, {}]],
      hb: [H([10, 15], "fh", 30, 14, 90, 34, 98, { y: -10, eff: "hit" })], sfx: { 9: "swingL" }, fx: { 10: "flash" }, txt: { 10: "闪光灯!" } },
    dsmash: { dur: 44, iasa: 42, charge: 4,
      anim: [[0, { py: 14, fk: 60, bk: 55, lean: 18, fa: 60, ba: 40 }], [8, { py: 16, fa: 92, fe: 0, pa: 180, ba: -90, be: 0, bh: "open", lean: 6, ex: 1 }, "snap"], [20, { py: 16, fa: 90, ba: -88 }], [44, {}]],
      hb: [H([8, 11], "fh", 18, 12, 30, 25, 97, { x: 10 }), H([8, 11], "bh", 18, 12, 30, 25, 97, { back: true })],
      sfx: { 7: "swingM" }, txt: { 8: "苹果|安卓" } },
    nair: { dur: 34, iasa: 32, land: 7, ac: [[0, 3], [24, 99]],
      anim: [[0, { fl: 60, fk: 90 }], [3, { fl: 95, fk: 10, bl: -95, bk: 10, fa: 100, ba: -100, lean: 0, ex: 1 }, "snap"], [18, { fl: 92, bl: -92 }], [34, {}]],
      hb: [H([3, 6], "ff", 16, 9, 361, 10, 96), H([3, 6], "bf", 16, 9, 361, 10, 96, { back: true }), H([7, 18], "ff", 13, 5, 361, 5, 90)], sfx: { 2: "swingS" } },
    fair: { dur: 36, iasa: 34, land: 10, ac: [[0, 3], [28, 99]],
      anim: [[0, { fa: 160, fe: 30 }], [8, { fa: 190, fe: 20, lean: -10 }], [11, { fa: 70, fe: 0, pa: 180, lean: 20, ex: 1 }, "snap"], [18, { fa: 55, lean: 16 }], [36, {}]],
      hb: [H([11, 13], "fh", 18, 10, 361, 18, 96, { x: 10 })], sfx: { 10: "swingM" } },
    bair: { dur: 32, iasa: 30, land: 8, ac: [[0, 3], [24, 99]],
      anim: [[0, { bl: -20, bk: 90, fl: 50, fk: 90, lean: 20 }], [6, { bl: -100, bk: 0, fl: 60, fk: 90, lean: 32, ex: 1 }, "snap"], [12, { bl: -95, bk: 5, lean: 28 }], [32, {}]],
      hb: [H([6, 8], "bf", 16, 11.5, 361, 12, 100, { back: true }), H([9, 13], "bf", 13, 7, 361, 8, 95, { back: true })], sfx: { 5: "swingM" } },
    uair: { dur: 30, iasa: 28, land: 7, ac: [[0, 3], [22, 99]],
      anim: [[0, { fa: 100 }], [4, { fa: 150, fe: 0, pa: 180, lean: -8, ex: 1 }, "snap"], [8, { fa: 210, fe: 0, lean: -14 }], [30, {}]],
      hb: [H([4, 10], "fh", 18, 7, 82, 26, 112)], sfx: { 3: "swingS" } },
    dair: { dur: 42, iasa: 40, land: 14, ac: [[0, 3], [34, 99]],
      anim: [[0, { fl: 80, fk: 110, bl: 50, bk: 110 }], [11, { fl: 90, fk: 120 }], [14, { fl: 3, fk: 0, bl: 3, bk: 0, lean: -6, ex: 1, sy: 1.08 }, "snap"], [22, { fl: 3, bl: 3 }], [42, {}]],
      hb: [H([14, 15], "ff", 16, 12, 270, 22, 88, { lag: 1.2 }), H([16, 22], "ff", 13, 8, 60, 20, 80)], sfx: { 13: "swingL" } },
    grab: { dur: 30, grab: { f: [6, 8], x: 50, y: -52, w: 26, h: 26 },
      anim: [[0, { ba: 40 }], [6, { fa: 88, fe: 5, ba: 90, be: 10, lean: 14, bh: "open" }, "snap"], [12, { fa: 85, ba: 85, lean: 12 }], [30, {}]], sfx: { 5: "whiff" } },
    dashGrab: { dur: 38, grab: { f: [8, 10], x: 62, y: -52, w: 30, h: 26 }, slide: true, traction: 0.6,
      anim: [[0, { lean: 20 }], [8, { fa: 90, fe: 0, ba: 92, be: 5, lean: 26, bh: "open", fl: 50, bl: -40 }, "snap"], [15, { fa: 88, ba: 88, lean: 22 }], [38, {}]] },
    fthrow: { dur: 32, throw: { f: 12, dmg: 8, ang: 45, bkb: 70, kbg: 55 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 70, lean: -8 }], [12, { ba: 100, be: 0, lean: 22, ex: 1 }, "snap"], [32, {}]], say: { 12: "你用什么手机?" }, sfx: { 11: "throw" } },
    bthrow: { dur: 40, throw: { f: 17, dmg: 11, ang: 42, bkb: 60, kbg: 72, back: true, oy: -10 },
      anim: [[0, { ba: 90 }], [10, { ba: 170, be: 10, lean: -20, ex: 1 }], [17, { ba: 250, be: 10, lean: -34, rot: -25 }, "snap"], [40, {}]], say: { 17: "典型的安卓逻辑!" }, sfx: { 16: "throw" } },
    uthrow: { dur: 34, throw: { f: 13, dmg: 7, ang: 90, bkb: 70, kbg: 62 },
      anim: [[0, { ba: 90 }], [8, { ba: 60, be: 60, py: 10 }], [13, { ba: 180, be: 0, fa: 170, py: -4, ex: 1 }, "snap"], [34, {}]], sfx: { 12: "throw" }, txt: { 13: "购买力!" } },
    dthrow: { dur: 38, throw: { f: 16, dmg: 6, ang: 74, bkb: 70, kbg: 34, hangY: 60 },
      anim: [[0, { ba: 90 }], [10, { fa: 170, fe: 20, lean: -8 }], [16, { fa: 30, fe: 0, lean: 32, py: 10, ex: 1 }, "snap"], [38, {}]], sfx: { 15: "slam" }, txt: { 16: "月入五千?" } },

    // ---- specials
    nspec: { dur: 42, iasa: 38, driftMul: 0.5, gravMul: 0.6,
      anim: [[0, { fa: 60, fe: 70, pa: 180 }], [10, { fa: 20, fe: 100, ba: 90, be: 0, bh: "open", lean: 14, ex: 1 }, "snap"], [20, { ba: 88, lean: 12 }], [42, {}]],
      script: (f, mf, w) => {
        if (mf !== 10) return;
        const v = findVictim(f, w, 0, 110, -80, 40);
        if (!v) { w.emit({ t: "say", text: "你用什么手机?", f }); return; }
        if (v.status.label) {
          w.emit({ t: "say", text: "安卓中的安卓!", f });
          v.status.label = { t: 1, deep: true };
          directHit(w, f, v, { dmg: 12, ang: 40, bkb: 55, kbg: 95, eff: "text", lag: 1.3 }, null, null, "nspec");
        } else {
          w.emit({ t: "say", text: "你用什么手机?……安卓。", f });
          v.status.label = { t: 600 };
          directHit(w, f, v, { dmg: 4, ang: 80, bkb: 30, kbg: 20, eff: "text", noTumble: true }, null, null, "nspec");
          w.emit({ t: "movetext", text: "安卓人", f: v });
        }
      },
      sfx: { 10: "stamp" } },
    sspec: { dur: 40, iasa: 36, driftMul: 0.5, gravMul: 0.7,
      anim: [[0, { ba: -40, be: 80, fa: 50 }], [11, { ba: 100, be: 10, bh: "open", lean: 16, ex: 4 }, "snap"], [22, { ba: 95, lean: 12, ex: 4 }], [40, {}]],
      script: (f, mf, w) => { if (mf === 11) { for (let i = -1; i <= 1; i++) cash(f, w, i); } },
      say: { 11: "购买力测试!" }, sfx: { 11: "money" } },
    uspec: { dur: 44, end: "helpless", noDrift: true, gravMul: 0, ledgeGrab: 30, intan: [[6, 30]],
      onStart: (f) => { f.upBUsed = true; f.vx *= 0.2; f.vy = 0; },
      anim: [[0, { fa: 100, fe: 60, pa: 180, ex: 2 }], [6, { sx: 0.3, sy: 1.4 }], [26, { sx: 0.3, sy: 1.4 }], [30, { sx: 1.2, sy: 0.85, ex: 4 }, "snap"], [44, { fa: 150, ba: 140 }]],
      script: (f, mf, w) => {
        if (mf === 6) {
          f.vars.tpFrom = [f.x, f.y];
          let dx = f.pad.mx, dy = f.pad.my;
          if (Math.hypot(dx, dy) < 0.3) { dx = 0; dy = -1; }
          const m = Math.hypot(dx, dy);
          f.vars.tp = [dx / m * 260, dy / m * 260];
          w.emit({ t: "banCard", x: f.x, y: f.y - 60 });
        }
        if (mf > 6 && mf <= 26) { f.vx = f.vars.tp[0] / 20; f.vy = f.vars.tp[1] / 20; if (f.vy < 0 && f.grounded) { f.grounded = false; f.plat = null; } }
        if (mf === 27) { f.vx = 0; f.vy = 0; }
      },
      hb: [H([27, 30], "ctr", 36, 6, 70, 50, 60, { eff: "gold" })],
      say: { 6: "该账号已被封禁", 28: "转世成功!" }, sfx: { 6: "dodge", 27: "respawn" }, hidden: [7, 26] },
    dspec: { dur: 48, iasa: 44, slide: true, traction: 0.1, gravMul: 1.2, noDrift: true,
      onStart: (f) => { f.vars.carAir = !f.grounded; },
      vel: [{ f: 8, vx: 12 }],
      anim: [[0, { py: 8, fk: 50, bk: 50 }], [8, { py: 12, fl: 70, fk: 90, bl: 60, bk: 90, lean: 10, fa: 80, fe: 40, ba: 70, be: 40, ex: 4 }, "snap"], [40, { py: 12, fl: 70, fk: 90 }], [48, {}]],
      script: (f, mf) => { if (f.vars.carAir && mf >= 8) { f.vy = Math.max(f.vy, 8); f.vx = f.facing * 9; } if (mf >= 8 && mf < 40 && f.grounded) f.vx = f.facing * 12; },
      landCancel: (f, w) => { if (f.vars.carAir) { f.vars.carAir = false; f.mf = Math.max(f.mf, 30); w.emit({ t: "stomp", x: f.x, y: f.y }); } },
      hb: [H([8, 38], "ctr", 38, 12, 42, 55, 72, { x: 40, y: 20, eff: "hit" })],
      say: { 8: "苹果车!" }, sfx: { 8: "car" }, riding: [8, 40] },
    final: { dur: 170, fs: true, intan: [[0, 170]], noDrift: true, gravMul: 0,
      onStart: (f, w) => { w.emit({ t: "fs", f, name: "安卓逻辑", line: "穷、愤怒、没见识!" }); w.freeze = 60; f.vx = 0; f.vy = 0; },
      anim: [[0, { fa: 150, fe: 30, pa: 180, ex: 1 }], [150, { fa: 150, ex: 1 }], [170, {}]],
      script: (f, mf, w) => {
        const beats = { 24: ["穷!", 12], 64: ["愤怒!", 12], 104: ["没见识!", 26] };
        const b = beats[mf];
        if (!b) return;
        const foes = w.fighters.filter((v) => v !== f && !v.dead);
        for (const v of foes.length ? foes : [null]) {
          const x = v ? v.x : f.x + f.facing * 300;
          const last = mf === 104;
          const p = new Projectile({
            owner: f, kind: "stamp", x, y: -1100, vy: 34, r: 90, life: 60, hits: 99, pierce: true,
            hb: last ? { dmg: b[1], ang: 70, bkb: 90, kbg: 70, eff: "text", lag: 1.3 } : { dmg: b[1], ang: 80, bkb: 40, kbg: 20, eff: "text", noTumble: true, stunMul: 2.2 },
            reflectable: false, absorbable: false, clank: null, moveId: "final", data: { text: b[0] },
            update: (pr, W) => {
              pr.rect = [pr.x - 110, pr.y - 90, pr.x + 110, pr.y + 20];
              const land = W.stage.findLanding(pr.x, pr.y - pr.vy + 20, pr.y + 20, false, null);
              if (land && !pr.data.landed) { pr.data.landed = true; pr.vy = 0; pr.y = land.y - 20; pr.life = 16; W.emit({ t: "stomp", x: pr.x, y: land.y, big: true }); }
            },
            draw: drawStamp,
          });
          p.rect = [x - 110, -1190, x + 110, -1080];
          w.spawnProjectile(p);
        }
      } },
  },
  drawUnder(ctx, f, t, Hh) {
    if (f.moveId === "dspec" && f.mf >= 8 && f.mf <= 40) drawCar(ctx, f, Hh);
  },
  moveFx: {
    flash: (f, fx) => { const [x, y] = f.bone("fh"); fx.add({ k: "burst", x, y: y - 10, t: 0, T: 10, s: 60, c1: "#ffffff", c2: "#dff6ff", n: 12, rot: 0 }); },
  },
};

function drawCar(ctx, f, H) {
  ctx.save();
  ctx.translate(f.x, f.y + 6); ctx.scale(f.facing, 1);
  ctx.fillStyle = "#f4f6f9"; ctx.strokeStyle = "#231a30"; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-70, 0); ctx.lineTo(-66, -26); ctx.quadraticCurveTo(-40, -30, -26, -48); ctx.lineTo(26, -48); ctx.quadraticCurveTo(52, -30, 78, -24); ctx.lineTo(82, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#2c3446"; ctx.beginPath(); ctx.moveTo(-20, -44); ctx.lineTo(24, -44); ctx.lineTo(44, -28); ctx.lineTo(-34, -28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#231a30"; ctx.beginPath(); ctx.arc(-44, 2, 13, 0, 7); ctx.arc(52, 2, 13, 0, 7); ctx.fill();
  ctx.fillStyle = "#c7ccd4"; ctx.beginPath(); ctx.arc(-44, 2, 6, 0, 7); ctx.arc(52, 2, 6, 0, 7); ctx.fill();
  ctx.fillStyle = "#e8403a"; ctx.font = "900 13px sans-serif"; ctx.textAlign = "center"; ctx.fillText("苹果车", 4, -10);
  ctx.fillStyle = "#fff6a8"; ctx.fillRect(74, -20, 8, 6);
  ctx.restore();
}

function drawStamp(ctx, p, font, t, H) {
  const [x0, y0, x1, y1] = p.rect;
  ctx.save();
  ctx.translate((x0 + x1) / 2, (y0 + y1) / 2);
  ctx.rotate(-0.06);
  ctx.fillStyle = "rgba(255,248,240,0.95)"; ctx.strokeStyle = "#e8403a"; ctx.lineWidth = 12;
  ctx.fillRect(-110, -55, 220, 110); ctx.strokeRect(-104, -49, 208, 98);
  ctx.fillStyle = "#e8403a"; ctx.font = `900 ${p.data.text.length > 3 ? 44 : 64}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(p.data.text, 0, 4);
  ctx.restore();
}
