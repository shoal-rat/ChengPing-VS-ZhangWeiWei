// The match scene: fixed-step simulation + all match rendering and juice.
import { World } from "../sim/world.js";
import { Camera } from "../render/camera.js";
import { drawFighter } from "../render/fighterDraw.js";
import { FX, memeText } from "../render/fx.js";
import { drawBackdrop, drawStage } from "../render/stageDraw.js";
import { drawProjectile, drawItem } from "../render/entities.js";
import { HUD, stamp } from "../render/hud.js";
import { Danmaku } from "../render/danmaku.js";
import { drawStageFront, drawStageOverlay } from "../render/stageFx.js";
import { FONT, INK, HOT, GOLD, PCOL, PNAME, CPUCOL } from "./theme.js";
import { Audio } from "../engine/audio.js";
import { MEME } from "../data/memes.js";
import { kbTake } from "../engine/input.js";
import { DummySource } from "../sim/ai.js";
import { sticker, ransom, jagPath, halftone, radial, eyeStrip, headSilhouette, head as drawHead, p5bar, hash } from "./ui.js";
import { RED, BLK, WHT, F_HY } from "./theme.js";

export class FightScene {
  constructor(app, cfg) {
    this.app = app;
    this.cfg = cfg;
    this.fullscreen = true;
    this.world = new World(cfg);
    this.cam = new Camera();
    this.fx = new FX();
    this.hud = new HUD();
    this.dm = new Danmaku(app.settings.danmaku !== false, app.settings.dmDensity ?? 2);
    this.cast = [...new Set(cfg.players.map((p) => p.def.id))];
    this.paused = false;
    this.pauseSel = 0;
    this.t = 0;
    this.acc = 0;
    this.slowAcc = 0;
    this.banner = null;
    this.killFx = null;
    this.fsCut = null;
    this.endTimer = 0;
    this.showHitboxes = !!cfg.training && app.settings.hitboxes;
    this.cam.x = 0; this.cam.y = -250; this.cam.zoom = 0.5;
    Audio.music(cfg.stage.music || "studio");
    this.banner = { text: "3", t: 0 };
    this.dm.push(MEME.danmakuStart);
  }

  resize(w, h, dpr) { this.cam.resize(w, h, dpr); }

  update() {
    const w = this.world;
    this.t++;
    for (const f of w.fighters) if (f.source && f.source.poll) f.source.poll();
    // pause
    const pausePressed = w.fighters.some((f) => f.source && f.source.kind !== "cpu" && f.pad && f.pad.pause) || kbTake("Escape") || this.app.touchPause;
    this.app.touchPause = false;
    if (this.paused) { this.updatePause(pausePressed); return; }
    if (pausePressed && !w.over && w.countdown <= 0) { this.paused = true; this.pauseSel = 0; Audio.sfx("pause"); return; }
    if (this.cfg.training) this.trainingInput();
    // slow-motion on kill hits
    let steps = 1;
    if (this.cfg.training && this.speed < 1) { this.slowT = (this.slowT || 0) + this.speed; steps = 0; while (this.slowT >= 1) { this.slowT--; steps++; } }
    if (w.slowmo > 0) { w.slowmo--; this.slowAcc += 0.34; steps = 0; while (this.slowAcc >= 1) { this.slowAcc--; steps++; } }
    for (let i = 0; i < steps; i++) {
      w.step();
      this.handleEvents(w.events);
      this.fx.step();
      this.updateTrails();
    }
    if (steps === 0) this.fx.step();
    this.cam.hudTop = !!this.app.touch;
    this.cam.update(w, 1);
    this.dm.step();
    // ambient chatter: generic lines mixed with memes about whoever is on screen
    const every = [9999, 110, 60, 34][this.dm.density] || 60;
    if (w.countdown <= 0 && !w.over && this.t % every === 0 && !this.paused) {
      const pool = Math.random() < 0.55 ? MEME.char[this.cast[Math.floor(Math.random() * this.cast.length)]] : MEME.generic;
      this.dm.push([pool[Math.floor(Math.random() * pool.length)]]);
    }
    // countdown banner
    if (w.countdown > 0) {
      const n = Math.ceil(w.countdown / 50);
      const txt = n >= 3 ? "3" : n === 2 ? "2" : "1";
      if (!this.banner || this.banner.text !== txt) { this.banner = { text: txt, t: 0 }; Audio.sfx("count"); Audio.say(txt === "3" ? "三" : txt === "2" ? "二" : "一"); }
    }
    if (this.banner) { this.banner.t++; if (this.banner.t > 70) this.banner = null; }
    if (w.over) {
      this.endTimer++;
      if (this.endTimer === 1) { this.koText = null; this.banner = { text: "GAME!", t: 0, big: true }; Audio.sfx("game"); Audio.say("比赛结束"); Audio.music(null); }
      if (this.endTimer > 150) this.app.toResults(w, this.cfg);
    }
    // trail smoke for launched fighters
    for (const f of w.fighters) {
      if (f.dead) continue;
      const sp = Math.hypot(f.kbx, f.kby);
      if (f.state === "hitstun" && sp > 9 && this.t % 2 === 0) {
        const [cx, cy] = f.centre();
        this.fx.trail(cx, cy, sp > 22 ? "rgba(255,255,255,0.95)" : "rgba(220,220,230,0.8)");
        if (sp > 24) this.fx.streak(cx, cy, f.kbx, f.kby, f.doomed ? "#ff3040" : (f.cpu ? CPUCOL : PCOL[f.slot]));
      }
    }
  }

  trainingInput() {
    const w = this.world, me = w.fighters[0], dummy = w.fighters[1];
    if (this.speed == null) { this.speed = 1; this.tr = { combo: 0, dmg: 0, move: null }; }
    const key = (d) => kbTake("Digit" + d) || kbTake("Numpad" + d) || this.trClick === d;
    const dsrc = dummy && dummy.source instanceof DummySource ? dummy.source : null;
    if (key(1) && dsrc) { dsrc.mode = (dsrc.mode + 1) % DummySource.MODES.length; Audio.sfx("tick"); }
    if (key(2)) { this.showHitboxes = !this.showHitboxes; Audio.sfx("tick"); }
    if (key(3)) { for (const f of w.fighters) { const sp = w.stage.spawns[f.slot]; f.reset(sp.x, sp.y, sp.x > 0 ? -1 : 1); f.percent = 0; } Audio.sfx("respawn"); }
    if (key(4) && dummy) { dummy.percent = Math.min(300, dummy.percent + 10); Audio.sfx("tick"); }
    if (key(5)) { this.speed = this.speed === 1 ? 0.5 : this.speed === 0.5 ? 0.25 : 1; Audio.sfx("tick"); }
    if (key(6)) { for (const f of w.fighters) f.fsReady = true; Audio.sfx("fsready"); }
    this.trClick = 0;
    if (me && me.state !== "attack" && me.state !== "grabbing" && dummy && dummy.state !== "hitstun" && dummy.state !== "tumble" && this.tr.combo && w.frame - (this.tr.last || 0) > 40) this.tr.combo = 0;
  }
  drawTraining(ctx, vw) {
    const w = this.world, dummy = w.fighters[1];
    const dsrc = dummy && dummy.source instanceof DummySource ? dummy.source : null;
    const x = 20, y = 20;
    sticker(ctx, x, y, 430, 196, { fill: "rgba(20,14,32,0.82)", skew: 12, shadow: 5, bw: 3 });
    memeText(ctx, "训练有素", x + 30, y + 26, 26, GOLD, INK, FONT, "left");
    ctx.font = `800 15px ${FONT}`; ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const rows = [["1", "木桩: " + (dsrc ? DummySource.MODES[dsrc.mode] : "-")], ["2", "判定框: " + (this.showHitboxes ? "显示" : "隐藏")], ["3", "复位"], ["4", "木桩 +10%"], ["5", "速度 ×" + this.speed], ["6", "给满「爆」"]];
    this.trHits = [];
    rows.forEach(([k, s], i) => {
      const bx = x + 26 + (i % 2) * 200, by = y + 58 + Math.floor(i / 2) * 32;
      ctx.fillStyle = "#fff6e5"; ctx.fillRect(bx, by - 11, 22, 22); ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.fillText(k, bx + 11, by + 1);
      ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(s, bx + 30, by + 1);
      this.trHits.push([bx, by - 14, 190, 28, +k]);
    });
    const tr = this.tr || {};
    ctx.fillStyle = "#cfc8e0"; ctx.font = `700 14px ${FONT}`;
    ctx.fillText(`连击 ${tr.combo || 0} · 连段伤害 ${(tr.dmg || 0).toFixed(1)}% · 木桩斩杀线 ${dummy ? dummy.killLine : "-"}%`, x + 26, y + 160);
    if (tr.move) ctx.fillText(`上一招 ${tr.move.name}:第 ${tr.move.first} 帧出判定 · 全长 ${tr.move.dur} 帧`, x + 26, y + 182);
  }

  updateTrails() {
    const INNER = { pt: "fh", pm: "fh", ff: "fk", bf: "bk", fh: "fe", bh: "be", hc: "neck", fk: "fhip", bk: "bhip", ctr: "pel", chest: "pel" };
    this.trails = this.trails || new Map();
    for (const f of this.world.fighters) {
      let tr = this.trails.get(f);
      if (!tr) { tr = []; this.trails.set(f, tr); }
      for (const q of tr) q.age++;
      while (tr.length && tr[0].age > 7) tr.shift();
      if (f.dead || f.state !== "attack" || !f.move || !f.move.hb || f.hitlag > 0) continue;
      let best = null;
      for (const h of f.move.hb) if (f.mf >= h.f[0] - 2 && f.mf <= h.f[1] + 1 && (!best || h.r > best.r)) best = h;
      if (!best || best.r < 11) continue;
      const bone = best.bone || "ctr";
      const o = f.bone(bone, best.x || 0, best.y || 0);
      const i = f.bone(INNER[bone] || "ctr");
      // pull the inner edge toward the tip so the ribbon hugs the weapon
      const ix = o[0] + (i[0] - o[0]) * 0.55, iy = o[1] + (i[1] - o[1]) * 0.55;
      tr.push({ ox: o[0], oy: o[1], ix, iy, age: 0, col: f.def.color2 || "#fff", eff: best.eff });
    }
  }
  drawTrails(ctx) {
    if (!this.trails) return;
    for (const [f, tr] of this.trails) {
      if (tr.length < 2) continue;
      for (let k = 1; k < tr.length; k++) {
        const a = tr[k - 1], b = tr[k];
        if (Math.hypot(b.ox - a.ox, b.oy - a.oy) > 160) continue;
        const al = Math.max(0, 1 - b.age / 7) * (k / tr.length);
        ctx.globalAlpha = al * 0.85;
        ctx.fillStyle = b.eff === "slash" ? "#ff2a3a" : b.eff === "elec" ? "#9fd8ff" : b.eff === "fire" ? "#ffb04a" : "#ffffff";
        ctx.beginPath(); ctx.moveTo(a.ox, a.oy); ctx.lineTo(b.ox, b.oy); ctx.lineTo(b.ix, b.iy); ctx.lineTo(a.ix, a.iy); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = al * 0.6;
        ctx.strokeStyle = b.col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(a.ox, a.oy); ctx.lineTo(b.ox, b.oy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  updatePause(pausePressed) {
    const opts = this.pauseOpts();
    for (const e of this.app.menu.poll()) {
      if (e.dir[1]) { this.pauseSel = (this.pauseSel + e.dir[1] + opts.length) % opts.length; Audio.sfx("tick"); }
      if (e.ok) this.pauseAction(opts[this.pauseSel].id);
      if (e.back) this.paused = false;
    }
    if (pausePressed) this.paused = false;
  }
  pauseOpts() {
    return [{ id: "resume", label: "继续" }, { id: "moves", label: "出招表" }, { id: "restart", label: "重新开始" }, { id: "quit", label: "退出对战" }];
  }
  pauseAction(id) {
    Audio.sfx("ok");
    if (id === "resume") this.paused = false;
    else if (id === "moves") this.app.showMoves(this.world.fighters.find((f) => !f.cpu) || this.world.fighters[0], () => {});
    else if (id === "restart") this.app.startFight(this.cfg);
    else if (id === "quit") this.app.toMenu(this.cfg.training ? "main" : "select");
  }
  click(x, y, fx, fy) {
    if (!this.paused && this.cfg.training && this.trHits) {
      for (const [bx, by, bw, bh, k] of this.trHits) if (fx >= bx && fx <= bx + bw && fy >= by && fy <= by + bh) { this.trClick = k; return true; }
    }
    if (!this.paused) return false;
    x = fx; y = fy;
    const opts = this.pauseOpts();
    for (let i = 0; i < opts.length; i++) {
      const bx = this.app.vw / 2 - 150, by = 260 + i * 70;
      if (x > bx && x < bx + 300 && y > by - 28 && y < by + 28) { this.pauseSel = i; this.pauseAction(opts[i].id); return true; }
    }
    return false;
  }

  handleEvents(evs) {
    const fx = this.fx, cam = this.cam, w = this.world;
    for (const e of evs) {
      if (window.__autoShot && (e.t === "ko" || e.t === "fs" || (e.t === "hit" && e.kill) || e.t === "unbox" || e.t === "shieldbreak")) {
        const n = (this.shotN = (this.shotN || 0) + 1);
        setTimeout(() => window.__shot && window.__shot(`ev${n}_${e.t}`), e.t === "fs" ? 250 : 120);
      }
      switch (e.t) {
        case "hit": {
          if (this.cfg.training && this.tr && e.a === w.fighters[0]) { if (w.frame - (this.tr.last || 0) > 60 && e.v.state !== "hitstun") this.tr.combo = 0; this.tr.combo = (e.combo || 1); this.tr.dmg = e.combo > 1 ? this.tr.dmg + e.dmg : e.dmg; this.tr.last = w.frame; }
          if (e.pummel) { fx.spark(e.x, e.y, "hit", 3); Audio.sfx("hitS"); this.hud.onHit(e.v, e.dmg); break; }
          const size = e.dmg;
          fx.spark(e.x, e.y, e.eff, size, e.a ? e.a.facing : 1);
          cam.addTrauma(Math.min(0.7, e.kb / 260 + 0.05));
          this.hud.onHit(e.v, e.dmg);
          Audio.hit(e.dmg, e.eff, e.kb);
          if (e.v.def.hurtLines && e.kb > 105 && !e.v.dead) { const s = e.v.def.hurtLines[(this.t >> 2) % e.v.def.hurtLines.length]; fx.say(e.v, s); }
          if (e.a && e.dmg >= 9 && Math.random() < 0.3) this.dm.push([pick(MEME.char[e.a.id])]);
          if (e.kill) {
            this.killFx = { t: 0, v: e.v, x: e.x, y: e.y, line: e.overLine };
            cam.punchIn(e.x, e.y, 40, 1.55);
            Audio.sfx("killhit");
            this.dm.burst(MEME.danmakuKillHit, 7);
          } else if (e.kb > 110) {
            fx.text(e.x, e.y - 60, pick(MEME.heavyHit), { size: 30, c: GOLD });
          }
          if (e.combo >= 4 && e.a) {
            const tag = MEME.comboTag(e.combo);
            if (tag) fx.text(e.a.x, e.a.y - 210, `${e.combo}连 ${tag}`, { size: 26, c: "#ffffff", T: 50 });
            if (e.combo === 5 || e.combo === 9) this.dm.burst(MEME.danmakuCombo, 4);
          }
          break;
        }
        case "shieldhit": fx.spark(e.x, e.y, "ice", e.dmg * 0.5); Audio.sfx("shieldHit"); break;
        case "parry": fx.spark(e.x, e.y, "gold", 14); fx.text(e.x, e.y - 50, "格挡!", { size: 34, c: GOLD }); Audio.sfx("parry"); cam.addTrauma(0.2); this.dm.burst(MEME.danmakuParry, 2); break;
        case "shieldbreak": { const [x, y] = e.f.centre(); fx.spark(x, y, "ice", 20); fx.text(x, y - 80, "破防了", { size: 44, c: "#9fe3ff", T: 80 }); Audio.sfx("shieldBreak"); this.dm.burst(MEME.danmakuBreak, 4); cam.addTrauma(0.5); break; }
        case "counter": fx.spark(e.x, e.y, "gold", 16); Audio.sfx("counter"); break;
        case "reflect": fx.spark(e.x, e.y, "gold", 10); fx.text(e.x, e.y - 40, "反弹!", { size: 28, c: GOLD }); Audio.sfx("reflect"); break;
        case "absorb": fx.spark(e.x, e.y, "water", 8); fx.text(e.x, e.y - 40, "叼住了!", { size: 30, c: "#bfffd0" }); Audio.sfx("absorb"); break;
        case "clash": fx.spark(e.x, e.y, "hit", 8); Audio.sfx("clash"); break;
        case "ko": {
          const col = e.f.cpu ? CPUCOL : PCOL[e.f.slot];
          fx.koBlast(e.x, e.y, e.side, col);
          cam.addTrauma(0.9);
          Audio.sfx("ko");
          const line = e.overLine ? "斩杀!" : pick(MEME.koTags);
          if (!(e.f.stocks <= 0 && w.fighters.filter((x) => x.stocks > 0).length <= 1)) this.koText = { text: line, t: 0, col };
          if (e.killer) this.dm.burst([...MEME.danmakuKO, ...MEME.char[e.killer.id], `${e.killer.def.name}赢麻了`, `${e.f.def.name}寄了`, `${e.f.def.name}飞了`], 10);
          else this.dm.burst(MEME.danmakuSD, 7);
          break;
        }
        case "respawn": Audio.sfx("respawn"); break;
        case "move": if (this.cfg.training && this.tr && e.f === w.fighters[0]) { const r = e.f.def.reach[e.id]; const mv = e.f.def.moves[e.id]; this.tr.move = { name: e.id, first: r ? r.first : "-", dur: mv ? mv.dur : "-" }; } break;
        case "banCard": fx.add({ k: "card", x: e.x, y: e.y, t: 0, T: 50 }); break;
        case "stomp": fx.landRing(e.x, e.y, true); cam.addTrauma(e.big ? 0.5 : 0.3); Audio.sfx("slam"); break;
        case "jump": { if (e.ground) fx.dust(e.f.x, e.f.y, 3, 0); else { fx.add({ k: "ring", x: e.f.x, y: e.f.y - 20, t: 0, T: 12, r0: 10, r1: 40, c: "rgba(255,255,255,0.7)", w: 3 }); } Audio.sfx(e.ground ? "jump" : "djump"); break; }
        case "land": fx.landRing(e.f.x, e.f.y, e.hard); Audio.sfx("land"); break;
        case "dust": fx.dust(e.x, e.y, 4, e.dir); Audio.sfx("dash"); break;
        case "tech": { fx.spark(e.f.x, e.f.y - 20, "hit", 4); fx.text(e.f.x, e.f.y - 150, "受身!", { size: 24, c: "#bfe6ff", T: 40 }); Audio.sfx("tech"); break; }
        case "knockdown": fx.dust(e.f.x, e.f.y, 6, 0); Audio.sfx("thud"); break;
        case "bounce": fx.dust(e.f.x, e.f.y, 6, 0); Audio.sfx("thud"); break;
        case "wallhit": fx.spark(e.f.x, e.f.y - 50, "hit", 6); Audio.sfx("thud"); break;
        case "ledge": Audio.sfx("ledge"); break;
        case "dodge": Audio.sfx("dodge"); break;
        case "grab": Audio.sfx("grab"); break;
        case "charge": { const [x, y] = e.f.bone("fh"); fx.add({ k: "ring", x, y, t: 0, T: 14, r0: 40, r1: 6, c: "#ffe066", w: 3 }); if (e.f.charge < 3) Audio.sfx("charge"); break; }
        case "say": fx.say(e.f, e.text); break;
        case "taunt": { const lines = e.f.def.tauntLines || ["..."]; const s = lines[(this.t + e.f.slot) % lines.length]; fx.say(e.f, s); Audio.say(s, e.f.def.id); break; }
        case "sfx": Audio.sfx(e.id); break;
        case "movefx": this.moveFx(e); break;
        case "fs": {
          this.fsCut = { f: e.f, name: e.name, line: e.line, t: 0 };
          Audio.sfx("fs"); Audio.say(e.line, e.f.def.id);
          this.dm.burst([...MEME.danmakuFS, ...MEME.char[e.f.id]], 12);
          break;
        }
        case "fsready": fx.text(e.x, e.y - 40, "上热搜了!", { size: 40, c: "#ff4a4a", T: 70 }); fx.spark(e.x, e.y, "gold", 22); Audio.sfx("fsready"); this.dm.burst(MEME.danmakuFsReady, 5); break;
        case "itemspawn": if (e.it.type === "bao") { this.dm.push(["热搜来了!抢!"]); Audio.sfx("bao"); } break;
        case "cratebreak": fx.spark(e.x, e.y, "hit", 8); fx.dust(e.x, e.y, 6, 0, "#d9a86a"); Audio.sfx("crate"); break;
        case "unbox": { fx.text(e.x, e.y - 30, "开箱:" + e.name, { size: 30, c: e.id === "tiny" ? "#9aa0aa" : GOLD, T: 80 }); Audio.sfx(e.id === "tiny" ? "back" : "fsready"); this.dm.burst(UNBOX_DM[e.id] || ["开箱了", "欧皇", "非酋"], 3); break; }
        case "explode": fx.spark(e.x, e.y, "boom", 24); cam.addTrauma(0.6); Audio.sfx("boom"); if (!e.silent) { fx.text(e.x, e.y - 70, "爆大瓜!", { size: 38, c: "#8dff7a" }); this.dm.burst(["吃瓜", "大瓜!", "瓜熟了"], 2); } break;
        case "movetext": { const [x, y] = e.f.bone("fh"); fx.text(x, y - 30, e.text, { size: 24, c: e.f.def.color2 || "#fff", T: 36, vy: -1.6 }); break; }
        case "heal": fx.text(e.x, e.y - 30, `-${e.amt}%`, { size: 28, c: "#8dff9a" }); Audio.sfx("heal"); break;
        case "pickup": Audio.sfx("pickup"); break;
        case "itembreak": fx.spark(e.x, e.y, "hit", 6); break;
        case "stageEvent": this.stageBanner = { text: e.text, t: 0 }; Audio.sfx("alarm"); this.dm.push([e.text]); break;
        case "projdie": if (e.why === "hit" || e.why === "clash") {} else if (e.p.kind === "ineq" || e.p.kind === "boomer") fx.dust(e.x, e.y, 3, 0, "#ffffff"); break;
        case "go": this.banner = { text: "开打!", t: 0, big: true }; Audio.sfx("go"); Audio.say("开打"); break;
        case "timeup": this.banner = { text: "时间到!", t: 0, big: true }; break;
        case "launch": if (e.kb > 100) Audio.sfx("launch"); break;
        case "armor": Audio.sfx("armor"); break;
      }
    }
  }

  moveFx(e) {
    const f = e.f, fx = this.fx;
    const [x, y] = f.centre();
    switch (e.id) {
      case "geyser": for (let i = 0; i < 16; i++) fx.add({ k: "bit", eff: "water", x: f.x + (Math.random() - 0.5) * 30, y: f.y, vx: (Math.random() - 0.5) * 3, vy: -8 - Math.random() * 10, g: 0.35, t: 0, T: 40, s: 4 + Math.random() * 4, c: "#58c8ff", rot: 0, vr: 0 }); break;
      case "fireBurst": fx.spark(x, y - 40, "fire", 18); break;
      case "blizzard": for (let i = 0; i < 20; i++) fx.add({ k: "bit", eff: "ice", x: f.x + f.facing * (40 + Math.random() * 70), y: y + (Math.random() - 0.5) * 70, vx: f.facing * (2 + Math.random() * 3), vy: (Math.random() - 0.5) * 2, g: 0.02, t: 0, T: 40, s: 4 + Math.random() * 3, c: "#bff0ff", rot: Math.random() * 6, vr: 0.2 }); break;
      case "chalkUp": for (let i = 0; i < 12; i++) fx.add({ k: "puff", x: x + (Math.random() - 0.5) * 50, y: y - 80 - Math.random() * 40, vx: (Math.random() - 0.5) * 2, vy: -1.5, t: 0, T: 30, r: 10, c: "rgba(255,255,255,0.85)" }); break;
      default: if (f.def.moveFx && f.def.moveFx[e.id]) f.def.moveFx[e.id](f, fx, this);
    }
  }

  // ---------------------------------------------------------------- drawing
  draw(ctx, vw, vh) {
    const w = this.world, cam = this.cam, t = this.t;
    const dpr = cam.dpr, S = cam.scale * dpr;
    // backdrop (screen space)
    ctx.setTransform(S, 0, 0, S, 0, 0);
    cam.cur = cam.view();
    drawBackdrop(ctx, w.stage, cam, vw, vh, t);
    // world
    cam.apply(ctx);
    drawStage(ctx, w.stage, w, t);
    for (const e of w.fx) if (e.draw) e.draw(ctx, e, FONT, t);
    for (const it of w.items.list) drawItem(ctx, it, FONT, t);
    // fighters: dead/under first, the one with latest hit on top
    const order = [...w.fighters].sort((a, b) => (a.state === "attack") - (b.state === "attack"));
    for (const f of order) {
      if (f.dead) continue;
      this.drawShadow(ctx, f);
      if (f.state === "respawn") this.drawRespawnPlat(ctx, f);
      const glow = f.fsReady || f.status.star ? `hsl(${(t * 6) % 360},100%,60%)` : f.status.boost ? "#ff4a2a" : null;
      if (f.def.drawUnder) f.def.drawUnder(ctx, f, t, null);
      const hid = f.move && f.move.hidden && f.state === "attack" && f.mf >= f.move.hidden[0] && f.mf <= f.move.hidden[1];
      if (!hid) drawFighter(ctx, f, cam, { glow });
      if (f.state === "shield" || f.state === "shieldstun") this.drawShield(ctx, f);
      this.drawTag(ctx, f);
      if (f.status.label) this.drawLabel(ctx, f);
    }
    this.drawTrails(ctx);
    for (const p of w.projectiles) drawProjectile(ctx, p, FONT, t);
    drawStageFront(ctx, w.stage, w, t);
    this.fx.draw(ctx, FONT);
    this.fx.drawBubbles(ctx, FONT);
    if (this.showHitboxes) this.drawDebug(ctx);
    // screen space
    ctx.setTransform(S, 0, 0, S, 0, 0);
    drawStageOverlay(ctx, w.stage, w, vw, vh, t, cam);
    this.drawOffscreen(ctx, vw, vh);
    this.fx.drawBlasts(ctx, cam, vw, vh);
    this.drawKillFx(ctx, vw, vh);
    this.dm.top = this.app.touch ? 150 : 64;
    this.dm.draw(ctx, vw, FONT);
    this.hud.draw(ctx, w, vw, vh, t, !!this.app.touch);
    if (this.cfg.training) this.drawTraining(ctx, vw);
    this.drawBanners(ctx, vw, vh);
    this.drawFsCut(ctx, vw, vh);
    if (this.paused) this.drawPause(ctx, vw, vh);
  }

  drawShadow(ctx, f) {
    // shadow on the ground below
    const st = this.world.stage;
    let gy = null;
    for (const p of st.plats) if (f.x >= p.x1 && f.x <= p.x2 && p.y >= f.y - 2 && (gy === null || p.y < gy)) gy = p.y;
    if (gy === null) return;
    const d = gy - f.y, k = Math.max(0.2, 1 - d / 500);
    ctx.fillStyle = `rgba(10,5,20,${0.35 * k})`;
    ctx.beginPath(); ctx.ellipse(f.x, gy + 2, 30 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawRespawnPlat(ctx, f) {
    const col = f.cpu ? CPUCOL : PCOL[f.slot];
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(f.x, f.y + 6, 60, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.ellipse(f.x, f.y + 3, 44, 6, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawShield(ctx, f) {
    const [cx, cy] = f.centre();
    const r = this.world.shieldRadius(f);
    const col = f.cpu ? CPUCOL : PCOL[f.slot];
    const hp = f.shieldHP / 50;
    ctx.save();
    ctx.globalAlpha = 0.28 + 0.2 * (1 - hp);
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.25, r * 0.14, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  drawTag(ctx, f) {
    if (f.world.fighters.length < 2) return;
    const [hx, hy] = f.bone("hc");
    const y = hy - f.body.headR - 22;
    const col = f.cpu ? CPUCOL : PCOL[f.slot];
    const z = this.cam.cur.z;
    const s = Math.max(1, 0.75 / z);
    ctx.save(); ctx.translate(f.x, y); ctx.scale(s, s);
    ctx.fillStyle = col; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-17, -24); ctx.lineTo(17, -24); ctx.lineTo(17, -6); ctx.lineTo(6, -6); ctx.lineTo(0, 2); ctx.lineTo(-6, -6); ctx.lineTo(-17, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `900 14px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(f.cpu ? "CP" : PNAME[f.slot], 0, -15);
    ctx.restore();
  }
  drawLabel(ctx, f) {
    const [hx, hy] = f.bone("hc");
    ctx.save(); ctx.translate(hx + 30 * f.facing, hy - 20); ctx.rotate(0.2);
    stamp(ctx, f.status.label.deep ? "安卓中的安卓" : "安卓人", 0, 0, 13);
    ctx.restore();
  }
  drawOffscreen(ctx, vw, vh) {
    for (const f of this.world.fighters) {
      if (f.dead) continue;
      const [sx, sy] = this.cam.toScreen(f.x, f.y - 60);
      if (sx > -10 && sx < vw + 10 && sy > -10 && sy < vh + 10) continue;
      const x = Math.max(60, Math.min(vw - 60, sx)), y = Math.max(60, Math.min(vh - 150, sy));
      const col = f.cpu ? CPUCOL : PCOL[f.slot];
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = "rgba(20,14,30,0.8)"; ctx.strokeStyle = col; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const im = this.app.headImg(f.def.look.head), man = this.app.headMan(f.def.look.head);
      if (im && man) { const sc = 70 / man.h; ctx.drawImage(im, (f.state === "hitstun" ? 2 : 0) * man.cell, 0, man.cell, man.cell, -man.cell / 2 * sc, 34 - man.bottom * sc, man.cell * sc, man.cell * sc); }
      ctx.restore();
      const a = Math.atan2(sy - y, sx - x);
      ctx.save(); ctx.translate(x + Math.cos(a) * 52, y + Math.sin(a) * 52); ctx.rotate(a);
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -9); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  drawKillFx(ctx, vw, vh) {
    const k = this.killFx;
    if (!k) return;
    k.t++;
    if (k.t > 46) { this.killFx = null; return; }
    const a = k.t < 5 ? k.t / 5 : Math.max(0, 1 - (k.t - 30) / 16);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a) * 0.28; ctx.fillStyle = RED; ctx.fillRect(0, 0, vw, vh);
    ctx.globalAlpha = Math.min(1, a);
    // P5 "critical" band: red slab with the victim's eye strip, black halftone, 斩杀 lettering
    const cy = vh * 0.38;
    ctx.translate(vw / 2, cy); ctx.rotate(-0.12);
    const slide = Math.min(1, k.t / 7);
    const bw = vw * 1.5;
    ctx.fillStyle = BLK; ctx.fillRect(-bw / 2, -86, bw * slide, 172);
    ctx.fillStyle = RED; ctx.fillRect(-bw / 2, -74, bw * slide, 148);
    ctx.save(); ctx.beginPath(); ctx.rect(-bw / 2, -74, bw * slide, 148); ctx.clip();
    halftone(ctx, -bw / 2, -74, bw, 148, "rgba(0,0,0,0.35)", 10, 4, "right");
    eyeStrip(ctx, k.v.def.look.head, -vw * 0.18 + (1 - slide) * 400, 0, 620, 150, 2, k.v.facing < 0);
    ctx.restore();
    ctx.fillStyle = WHT; ctx.fillRect(-bw / 2, -90, bw * slide, 6); ctx.fillRect(-bw / 2, 84, bw * slide, 6);
    if (k.t > 5) ransom(ctx, "斩 杀", vw * 0.22, 4, 92, { seed: 66, jitter: 1, t: k.t });
    ctx.restore();
  }
  drawBanners(ctx, vw, vh) {
    const b = this.banner;
    if (b) {
      const k = Math.min(1, b.t / 7), out = b.t > 55 ? 1 - (b.t - 55) / 15 : 1;
      const s = 1.5 - 0.5 * k;
      ctx.save(); ctx.globalAlpha = out; ctx.translate(vw / 2, vh * 0.42); ctx.rotate(-0.07); ctx.scale(s, s);
      if (b.big) {
        ctx.fillStyle = RED; jagPath(ctx, -vw * 0.6 + 14, -90 + 14, vw * 1.2, 180, 91, 8, 60); ctx.fill();
        ctx.fillStyle = BLK; jagPath(ctx, -vw * 0.6, -90, vw * 1.2, 180, 92, 8, 60); ctx.fill();
        ransom(ctx, b.text, 0, 0, 118, { seed: hash(b.text), jitter: 1, t: b.t });
      } else {
        ransom(ctx, b.text, 0, 0, 170, { seed: hash(b.text) + 3, rot: 0.2 });
      }
      ctx.restore();
    }
    if (this.koText) {
      const q = this.koText; q.t++;
      if (q.t > 70) this.koText = null;
      else {
        const k = Math.min(1, q.t / 6), out = q.t > 55 ? 1 - (q.t - 55) / 15 : 1;
        ctx.save(); ctx.globalAlpha = out; ctx.translate(vw / 2, vh * 0.28); ctx.rotate(0.05); ctx.scale(1.5 - 0.5 * k, 1.5 - 0.5 * k);
        ransom(ctx, q.text, 0, 0, 76, { seed: hash(q.text) + 1, jitter: 0.6, t: q.t });
        ctx.restore();
      }
    }
    if (this.stageBanner) {
      const q = this.stageBanner; q.t++;
      if (q.t > 120) this.stageBanner = null;
      else {
        ctx.save(); ctx.globalAlpha = q.t > 100 ? (120 - q.t) / 20 : 1; ctx.translate(vw / 2, 112); ctx.rotate(-0.03);
        ctx.font = `900 28px ${FONT}`; const w = ctx.measureText(q.text).width + 70;
        ctx.fillStyle = RED; jagPath(ctx, -w / 2 + 8, -26 + 7, w, 52, 71, 4, 16); ctx.fill();
        ctx.fillStyle = BLK; jagPath(ctx, -w / 2, -26, w, 52, 72, 4, 16); ctx.fill();
        ctx.fillStyle = WHT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(q.text, 0, 1);
        ctx.restore();
      }
    }
  }
  drawFsCut(ctx, vw, vh) {
    const c = this.fsCut;
    if (!c) return;
    c.t++;
    if (c.t > 62) { this.fsCut = null; return; }
    const k = Math.min(1, c.t / 8), out = c.t > 52 ? (62 - c.t) / 10 : 1;
    const id = c.f.def.look.head;
    ctx.save();
    ctx.globalAlpha = out;
    ctx.fillStyle = "rgba(12,11,14,0.6)"; ctx.fillRect(0, 0, vw, vh);
    ctx.translate(vw / 2, vh / 2); ctx.rotate(-0.1);
    radial(ctx, 0, 0, vw, 20, "rgba(232,20,28,0.35)", c.t * 0.01);
    // top band: eye strip
    const bw = vw * 1.6 * k;
    ctx.fillStyle = WHT; ctx.fillRect(-bw / 2, -210, bw, 176);
    ctx.fillStyle = BLK; ctx.fillRect(-bw / 2, -200, bw, 156);
    ctx.save(); ctx.beginPath(); ctx.rect(-bw / 2, -200, bw, 156); ctx.clip();
    eyeStrip(ctx, id, (1 - k) * -600 + Math.sin(c.t * 0.05) * 10, -122, 900, 190, 1, false);
    ctx.restore();
    // lower band: red with name
    ctx.fillStyle = RED; ctx.fillRect(-bw / 2, -30, bw, 150);
    ctx.save(); ctx.beginPath(); ctx.rect(-bw / 2, -30, bw, 150); ctx.clip(); halftone(ctx, -bw / 2, -30, bw, 150, "rgba(0,0,0,0.3)", 11, 4.5, "left"); ctx.restore();
    headSilhouette(ctx, id, -vw * 0.36 + (1 - k) * -300, 150, 250, 1, BLK);
    drawHead(ctx, id, -vw * 0.36 - 12 + (1 - k) * -300, 140, 250, 1);
    if (c.t > 6) ransom(ctx, c.name, vw * 0.06, 30, 70, { seed: hash(c.name), jitter: 0.8, t: c.t });
    ctx.fillStyle = WHT; ctx.font = `900 24px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("「" + c.line + "」", vw * 0.06, 92);
    ctx.restore();
  }
  drawPause(ctx, vw, vh) {
    ctx.fillStyle = "rgba(12,11,14,0.78)"; ctx.fillRect(0, 0, vw, vh);
    radial(ctx, vw * 0.8, vh * 0.3, vw, 16, "rgba(232,20,28,0.25)", this.t * 0.002);
    ctx.save(); ctx.translate(vw / 2 - 260, 150); ctx.rotate(-0.06); ransom(ctx, "暂停", 0, 0, 80, { seed: 13, align: "left" }); ctx.restore();
    this.pauseOpts().forEach((o, i) => {
      p5bar(ctx, vw / 2 - 150 + i * 12, 236 + i * 70, 300, 56, o.label, i === this.pauseSel, this.t, { size: 30, back: RED });
    });
  }
  drawDebug(ctx) {
    ctx.save();
    for (const f of this.world.fighters) {
      if (f.dead) continue;
      ctx.strokeStyle = "rgba(255,230,0,0.8)"; ctx.lineWidth = 2;
      for (const c of f.hurt) {
        ctx.beginPath();
        const ax = f.x + c[0] * f.facing, ay = f.y + c[1], bx = f.x + c[2] * f.facing, by = f.y + c[3];
        ctx.lineWidth = c[4] * 2; ctx.globalAlpha = 0.25; ctx.strokeStyle = f.intan > 0 ? "#6cf" : "#ff0";
        ctx.lineCap = "round"; ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      for (const hb of this.world.fighterHitboxes(f)) { ctx.fillStyle = "#f22"; ctx.beginPath(); ctx.arc(hb.x, hb.y, hb.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    for (const p of this.world.projectiles) {
      ctx.strokeStyle = "#f22"; ctx.lineWidth = 2;
      if (p.rect) ctx.strokeRect(p.rect[0], p.rect[1], p.rect[2] - p.rect[0], p.rect[3] - p.rect[1]);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke(); }
    }
    ctx.restore();
  }
}

function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
const UNBOX_DM = {
  dumpling: ["饺子!", "回血了", "过年了属于是"], star: ["一键三连!!", "无敌了", "开挂了", "三连了三连了"], boost: ["流量加持", "起飞", "上热门了"],
  giant: ["大V认证", "变大了哈哈哈", "巨人", "这谁顶得住"], tiny: ["被限流了哈哈哈", "缩了", "小丑竟是我自己", "非酋"],
  brick: ["拍砖!", "板砖警告"], melon: ["大瓜!", "吃瓜", "瓜来了"], keyboard: ["键盘侠上线", "键盘到手"],
};
