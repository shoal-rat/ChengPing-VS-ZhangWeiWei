// Trailer capture (dev only, ?trailer=1&fixed=1280x720): a directed 30-second four-way
// brawl rendered frame by frame, with the audio rendered offline to match.
import { CHARS } from "../data/chars/index.js";
import { STAGES } from "../data/stages.js";
import { FightScene } from "./fight.js";
import { CpuSource } from "../sim/ai.js";
import { RNG } from "../sim/math.js";
import { Audio, renderOffline, wavDataURL } from "../engine/audio.js";
import { ransom, radial, halftone, jagPath, head, headSilhouette, hash, FONT, RED, BLK, WHT, GOLD } from "./ui.js";

const TITLE = "胡锡退大战苹果人大战马保国大战张维维";
const INTRO = 120, END = 100, FIGHT = 1580;          // 60 Hz frames -> 30 s total
const CAST = [["huxijin", "胡锡退"], ["huchenfeng", "苹果人"], ["mabaoguo", "马保国"], ["zhang", "张维维"]];

export class Trailer {
  constructor(app) {
    this.app = app; this.t = 0; this.fullscreen = true;
    this.caps = [];
    Audio.music("title");
  }
  resize(w, h, dpr) { if (this.fight) this.fight.resize(w, h, dpr); }

  startFight() {
    const a = this.app;
    const seed = this.seed ?? 10;
    const players = CAST.map(([id, nick], i) => ({ def: { ...CHARS[id], name: nick }, source: new CpuSource(8, new RNG(seed * 1000 + i * 17 + 1)), cpu: 8 }));
    this.cfg = { stage: STAGES.studio, players, rules: { stocks: 3, items: true, hazards: true }, seed: 20260929, countdown: 2 };
    this.fight = new FightScene(a, this.cfg);
    this.fight.app = Object.create(a, { toResults: { value: () => {} } });   // never leave mid-trailer
    this.fight.resize(a.cssW, a.cssH, a.dpr);
    this.fight.cam.tight = true;
    const [H, C, M, Z] = this.fight.world.fighters;
    this.F = { H, C, M, Z };
    H.percent = 45; C.percent = 38; M.percent = 60; Z.percent = 30;
  }

  update() {
    this.t++;
    if (this.t === INTRO) this.startFight();
    if (this.fight && this.t < INTRO + FIGHT) {
      this.fight.update();
      // events the director emits (forced finals, lines) happen outside world.step:
      // hand them to the scene now, or the next step would clear them unseen
      const w = this.fight.world, n0 = w.events.length;
      this.direct(this.t - INTRO);
      const extra = w.events.slice(n0);
      if (extra.length) this.fight.handleEvents(extra);
    }
    for (const c of this.caps) c.age++;
    this.caps = this.caps.filter((c) => c.age < c.life);
  }

  cap(text, life = 110) { this.caps.push({ text, age: 0, life }); }

  // put fighter `v` on the main stage in front of `a`
  front(a, v, dist) {
    if (!a || !v || a.dead || v.dead) return false;
    const main = this.fight.world.stage.plats[0];
    let x = a.x + a.facing * dist;
    if (x < main.x1 + 40 || x > main.x2 - 40) { a.facing = -a.facing; x = a.x + a.facing * dist; }
    x = Math.max(main.x1 + 40, Math.min(main.x2 - 40, x));
    for (const f of [a, v]) { if (f.state === "attack") f.endMoveFlags(); f.move = null; f.setState("idle"); f.vx = f.vy = f.kbx = f.kby = 0; f.hitlag = 0; f.pendingKB = null; f.invinc = 0; f.intan = 0; if (f.grabbed || f.grabber) { f.grabbed = null; f.grabber = null; } }
    a.y = main.y; a.grounded = true; a.plat = main;
    a.x = Math.max(main.x1 + 40, Math.min(main.x2 - 40, a.x));
    v.x = x; v.y = main.y; v.grounded = true; v.plat = main; v.facing = -a.facing;
    return true;
  }
  force(f, move) { if (!f || f.dead) return; if (f.state === "attack") f.endMoveFlags(); f.hitlag = 0; f.pendingKB = null; f.startMove(move); }

  // Beats fire once, at the first frame inside their window where the cast is available.
  direct(T) {
    const { H, C, M, Z } = this.F, w = this.fight.world;
    const up = (...fs) => fs.every((f) => f && !f.dead && f.stocks > 0);
    const beat = (id, t0, t1, ok, run) => {
      this.fired = this.fired || {};
      if (this.fired[id] || T < t0) return;
      if (ok() || T >= t1) { this.fired[id] = true; if (ok()) run(); }
    };
    beat("taunt", 40, 90, () => up(M), () => { M.setState("taunt"); w.emit({ t: "say", f: M, text: "年轻人,耗子尾汁。" }); this.cap("马保国:来,骗!来,偷袭!"); });
    beat("label", 150, 220, () => up(C, Z), () => { this.front(C, Z, 95); this.force(C, "nspec"); this.cap("苹果人:你用什么手机?"); });
    beat("ma", 330, 400, () => up(M) && (up(Z) || up(H)), () => { if (!this.front(M, up(Z) ? Z : H, 85)) return; this.force(M, "final"); this.cap("年轻人不讲武德!闪电五连鞭!", 150); });
    beat("hu", 610, 680, () => up(H), () => { this.force(H, "final"); this.cap("老胡刚刚加仓了 → 全场跌停", 150); });
    beat("apple", 860, 930, () => up(C), () => { this.force(C, "final"); this.cap("苹果人:穷!愤怒!没见识!", 150); });
    if (T === 1000 && up(Z)) Z.percent = Math.min(Z.percent, 40);   // keep the headliner alive for his finale
    beat("zhang", 1120, 1200, () => up(Z, H, C, M), () => {
      for (const f of [H, C, M]) f.percent = Math.max(f.percent, 135);
      const main = w.stage.plats[0];
      Z.x = main.x1 + 120; Z.facing = 1;
      this.front(Z, C, 230); this.front(Z, H, 420); this.front(Z, M, 640); C.x = Z.x + 230; H.x = Z.x + 420;
      this.force(Z, "final");
      this.cap("张维维:这就是中国(西方震撼了)", 170);
    });
    beat("kill", 1450, 1500, () => up(M, H) && !M.dead && !H.dead, () => {
      M.percent = Math.max(M.percent, 185);
      if (this.front(H, M, 70)) this.force(H, "fsmash");
      this.cap("马保国:我大意了啊,没有闪", 130);
    });
  }

  draw(ctx, vw, vh) {
    const S = this.app.cssW / 1280 * this.app.dpr;
    if (this.t < INTRO || !this.fight) { ctx.setTransform(S, 0, 0, S, 0, 0); this.drawIntro(ctx, vw, vh, this.t); return; }
    const T = this.t - INTRO;
    if (T < FIGHT) {
      this.fight.draw(ctx, vw, vh);
      ctx.setTransform(S, 0, 0, S, 0, 0);
      this.drawOverlay(ctx, vw, vh, T);
    } else { ctx.setTransform(S, 0, 0, S, 0, 0); this.drawEnd(ctx, vw, vh, T - FIGHT); }
  }

  drawIntro(ctx, vw, vh, t) {
    ctx.fillStyle = RED; ctx.fillRect(0, 0, vw, vh);
    radial(ctx, vw / 2, vh * 0.55, vw * 1.2, 20, "rgba(0,0,0,0.2)", t * 0.01);
    halftone(ctx, 0, vh * 0.6, vw, vh * 0.4, "rgba(0,0,0,0.3)", 14, 5, "down");
    // four heads slam in
    CAST.forEach(([id, nick], i) => {
      const k = Math.max(0, Math.min(1, (t - 8 - i * 7) / 10));
      const x = 190 + i * 300, y = vh - 40 + (1 - k) * 300;
      headSilhouette(ctx, id, x + 12, y + 10, 270, 1, BLK, i >= 2);
      head(ctx, id, x, y, 270, 1, i >= 2);
      if (k >= 1) { ctx.save(); ctx.translate(x, vh - 36); ctx.rotate(-0.06); ransom(ctx, nick, 0, 0, 34, { seed: hash(nick) }); ctx.restore(); }
    });
    // title band
    const k = Math.min(1, t / 12);
    ctx.save(); ctx.translate(vw / 2, 190); ctx.rotate(-0.06);
    ctx.fillStyle = WHT; jagPath(ctx, -vw * 0.62 * k - 10, -118, vw * 1.24 * k + 20, 236, 3, 10, 60); ctx.fill();
    ctx.fillStyle = BLK; jagPath(ctx, -vw * 0.62 * k, -110, vw * 1.24 * k, 220, 4, 10, 60); ctx.fill();
    if (t > 10) {
      ransom(ctx, "胡锡退大战苹果人", 0, -48, 72, { seed: 11, jitter: 1, t });
      ransom(ctx, "大战马保国大战张维维", 0, 50, 64, { seed: 12, jitter: 1, t });
    }
    ctx.restore();
    ctx.save(); ctx.translate(90, 44); ctx.rotate(-0.05); ransom(ctx, "梗王大乱斗", 0, 0, 30, { seed: 20, align: "left" }); ctx.restore();
  }

  drawOverlay(ctx, vw, vh, T) {
    // persistent title tag
    ctx.save(); ctx.translate(20, 26); ctx.rotate(-0.03);
    ctx.globalAlpha = 0.92;
    ransom(ctx, TITLE, 0, 0, 20, { seed: 99, align: "left", shadow: false });
    ctx.restore();
    // variety-show captions
    for (const c of this.caps) {
      const pop = Math.min(1, c.age / 6), out = c.age > c.life - 10 ? (c.life - c.age) / 10 : 1;
      ctx.save();
      ctx.globalAlpha = out;
      ctx.translate(vw / 2, vh - 190); ctx.rotate(-0.04); ctx.scale(1.4 - 0.4 * pop, 1.4 - 0.4 * pop);
      ctx.font = `900 34px ${FONT}`;
      const w = ctx.measureText(c.text).width + 70;
      ctx.fillStyle = RED; jagPath(ctx, -w / 2 + 10, -30 + 8, w, 60, hash(c.text) + 1, 5, 18); ctx.fill();
      ctx.fillStyle = BLK; jagPath(ctx, -w / 2, -30, w, 60, hash(c.text), 5, 18); ctx.fill();
      ctx.strokeStyle = WHT; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = WHT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(c.text, 0, 2);
      ctx.restore();
    }
  }

  drawEnd(ctx, vw, vh, t) {
    ctx.fillStyle = BLK; ctx.fillRect(0, 0, vw, vh);
    radial(ctx, vw / 2, vh / 2, vw, 20, "rgba(232,20,28,0.35)", t * 0.01);
    const ids = ["chen", "zhang", "huxijin", "fengge", "huchenfeng", "mabaoguo", "laoa"];
    ids.forEach((id, i) => { const k = Math.max(0, Math.min(1, (t - i * 3) / 8)); head(ctx, id, 130 + i * 170, vh - 30 + (1 - k) * 200, 170, 4); });
    ctx.save(); ctx.translate(vw / 2, 200); ctx.rotate(-0.05);
    ransom(ctx, "梗王大乱斗", 0, 0, 110, { seed: 20, jitter: 1, t });
    ctx.restore();
    ctx.save(); ctx.translate(vw / 2, 330);
    ctx.font = `900 34px ${FONT}`; const url = "weikezhang.cn/ChengPing-VS-ZhangWeiWei";
    const w = ctx.measureText(url).width + 60;
    ctx.fillStyle = RED; jagPath(ctx, -w / 2 + 8, -28 + 7, w, 56, 5, 4, 14); ctx.fill();
    ctx.fillStyle = WHT; jagPath(ctx, -w / 2, -28, w, 56, 6, 4, 14); ctx.fill();
    ctx.fillStyle = BLK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(url, 0, 2);
    ctx.fillStyle = WHT; ctx.font = `800 24px ${FONT}`; ctx.fillText("浏览器直接玩 · 手机横屏也行 · 纯属恶搞", 0, 64);
    ctx.restore();
  }
}

// Frame-by-frame capture: posts JPEG frames + a WAV to tools/devserver.py (/__save).
export async function recordTrailer(app, fps = 30) {
  app.hold = true;
  const scene = new Trailer(app);
  app.setScene(scene);
  const log = [], music = [];
  let now = 0;
  const saved = { sfx: Audio.sfx, hit: Audio.hit, music: Audio.music, say: Audio.say };
  Audio.sfx = (id) => log.push({ t: now, k: "sfx", a: [id] });
  Audio.hit = (...a) => log.push({ t: now, k: "hit", a });
  Audio.music = (id) => music.push({ t: now, id });
  Audio.say = () => {};
  Audio.music("title");
  const total = INTRO + FIGHT + END, per = 60 / fps;
  const post = (name, body) => fetch("/__save?name=" + encodeURIComponent(name), { method: "POST", body });
  let n = 0;
  for (let i = 0; i < total; i++) {
    now = i / 60;
    scene.update();
    app.wipe.t = -1;
    if (i % per === 0) {
      app.render();
      await post(`trailer/f${String(n++).padStart(4, "0")}.jpg`, app.canvas.toDataURL("image/jpeg", 0.9));
    }
  }
  Object.assign(Audio, saved);
  const buf = await renderOffline(total / 60, log, music);
  await post("trailer/audio.wav", wavDataURL(buf));
  app.hold = false;
  return { frames: n, events: log.length, music };
}
