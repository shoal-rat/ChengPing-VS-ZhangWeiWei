// Boot + app shell: canvas, fixed-step loop, scene switching with the 打码 wipe,
// pointer mapping, device registry.
import { initKeyboard, KeyboardSource, GamepadSource, TouchSource, MenuInput, KEYMAPS, kbClearHits } from "./engine/input.js";
import { loadAll, IMG, DATA } from "./engine/assets.js";
import { Audio } from "./engine/audio.js";
import { CHARS, ROSTER } from "./data/chars/index.js";
import { STAGES, STAGE_ORDER } from "./data/stages.js";
import { CpuSource } from "./sim/ai.js";
import { RNG } from "./sim/math.js";
import { FightScene } from "./ui/fight.js";
import { World } from "./sim/world.js";
import { TitleScene } from "./ui/title.js";
import { MainMenu } from "./ui/menu.js";
import { SelectScene } from "./ui/select.js";
import { StageSelect } from "./ui/stageSelect.js";
import { ResultsScene } from "./ui/results.js";
import { WikiScene } from "./ui/wiki.js";
import { SettingsScene } from "./ui/settings.js";
import { MovesOverlay } from "./ui/moves.js";
import { TouchPad } from "./ui/touch.js";
import { Classic } from "./ui/classic.js";
import { Wipe, backdrop } from "./ui/ui.js";
import { FONT } from "./ui/theme.js";

const DEFAULTS = { danmaku: true, dmDensity: 2, voice: true, sfx: 0.8, music: 0.55, shake: 1, hitboxes: false, tapJump: false, stocks: 3, time: 0, items: true, hazards: true, seenHelp: false };

class App {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.menu = new MenuInput();
    this.settings = this.loadSettings();
    this.wipe = new Wipe();
    this.scene = null; this.overlay = null;
    this.last = performance.now(); this.acc = 0;
    this.touch = null;
    this.isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    this.rng = new RNG(Date.now() & 0xffffff);
    this.lastSelect = null;
    window.addEventListener("resize", () => this.resize());
    this.resize();
    initKeyboard(() => Audio.unlock());
    const pd = (e) => { Audio.unlock(); this.pointer("down", e); };
    canvas.addEventListener("pointerdown", pd);
    canvas.addEventListener("pointermove", (e) => this.pointer("move", e));
    canvas.addEventListener("pointerup", (e) => this.pointer("up", e));
    canvas.addEventListener("pointercancel", (e) => this.pointer("up", e));
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    Audio.setVolume("sfx", this.settings.sfx); Audio.setVolume("music", this.settings.music);
    Audio.settings.voice = this.settings.voice;
    window.addEventListener("gamepadconnected", () => { Audio.unlock(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && this.scene && this.scene.world && !this.scene.paused && !this.scene.world.over) this.scene.paused = true; });
  }
  loadSettings() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("mks_settings") || "{}") }; } catch (e) { return { ...DEFAULTS }; }
  }
  saveSettings() { try { localStorage.setItem("mks_settings", JSON.stringify(this.settings)); } catch (e) {} }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + "px"; this.canvas.style.height = h + "px";
    this.dpr = dpr; this.cssW = w; this.cssH = h;
    this.vw = 1280; this.vh = 1280 * h / w;
    // UI safe box: 1280x720 fitted
    this.uiS = Math.min(w / 1280, h / 720);
    this.uiX = (w - 1280 * this.uiS) / 2; this.uiY = (h - 720 * this.uiS) / 2;
    this.portrait = h > w * 1.05;
    if (this.scene && this.scene.resize) this.scene.resize(w, h, dpr);
  }
  // pointer in UI coords (1280x720 box) and in full-virtual coords
  pointer(type, e) {
    const ux = (e.clientX - this.uiX) / this.uiS, uy = (e.clientY - this.uiY) / this.uiS;
    const fx = e.clientX / this.cssW * 1280, fy = e.clientY / this.cssH * this.vh;
    if (this.touch && this.touch.active && this.scene instanceof FightScene && !this.scene.paused) {
      if (this.touch.pointer(type, e, fx, fy)) return;
    }
    const target = this.overlay || this.scene;
    if (!target) return;
    if (target.hits) { target.hits.mx = ux; target.hits.my = uy; }
    if (type === "down" && target.click && !this.wipe.active) target.click(ux, uy, fx, fy);
    if (type === "move" && target.hover) target.hover(ux, uy);
  }
  headImg(id) { return IMG["head_" + id]; }
  headMan(id) { return DATA.heads && DATA.heads[id]; }

  go(scene) {
    if (this.wipe.active) return;
    this.wipe.start(() => { this.overlay = null; this.setScene(scene); kbClearHits(); });
  }
  setScene(s) { this.scene = s; if (s.resize) s.resize(this.cssW, this.cssH, this.dpr); if (s.enter) s.enter(); }

  // ---- navigation helpers used by scenes
  toTitle() { this.go(new TitleScene(this)); }
  toMenu(name) {
    if (name === "select") this.go(new SelectScene(this, this.lastSelect));
    else this.go(new MainMenu(this));
  }
  toSelect(mode) { this.go(new SelectScene(this, { ...(this.lastSelect || {}), mode: mode || "versus" })); }
  toStageSelect(sel) { this.lastSelect = sel; this.go(new StageSelect(this, sel)); }
  toWiki(id) { this.go(new WikiScene(this, id)); }
  toSettings() { this.go(new SettingsScene(this)); }
  startFight(cfg) {
    this.go(new FightScene(this, cfg));
  }
  toResults(world, cfg) {
    if (cfg.classic) { this.classic.afterMatch(world); return; }
    this.go(new ResultsScene(this, world, cfg));
  }
  startClassic(charId, level) { this.classic = new Classic(this, charId, level); this.classic.next(); }
  showMoves(f, onClose) { this.overlay = new MovesOverlay(this, f.def || f, () => { this.overlay = null; onClose && onClose(); }); }

  // Build a Source for a device id
  source(dev) {
    if (dev === "k1") return new KeyboardSource(KEYMAPS.p1, { tapJump: this.settings.tapJump });
    if (dev === "k2") return new KeyboardSource(KEYMAPS.p2, { tapJump: this.settings.tapJump });
    if (dev && dev.startsWith("g")) return new GamepadSource(parseInt(dev.slice(1)));
    if (dev === "touch") { if (!this.touch) this.touch = new TouchPad(this); return this.touch.source; }
    return null;
  }
  cpu(level) { return new CpuSource(level, new RNG(this.rng.int(1, 1e9))); }

  loop(now) {
    const dt = Math.min(100, now - this.last); this.last = now;
    this.acc += dt;
    const step = 1000 / 60;
    let n = 0;
    while (this.acc >= step && n < 4) {
      if (this.overlay) this.overlay.update(); else if (this.scene && !this.wipe.active) this.scene.update();
      else if (this.scene && this.scene.idle) this.scene.idle();
      this.wipe.step();
      this.acc -= step; n++;
    }
    if (n === 4) this.acc = 0;
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  render() {
    const ctx = this.ctx, dpr = this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1c1426"; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const s = this.scene;
    if (s) {
      if (s.fullscreen) s.draw(ctx, this.vw, this.vh);
      else {
        ctx.setTransform(dpr * this.cssW / 1280, 0, 0, dpr * this.cssW / 1280, 0, 0);
        backdrop(ctx, 1280, this.vh, s.t || 0, s.tint);
        ctx.setTransform(dpr * this.uiS, 0, 0, dpr * this.uiS, dpr * this.uiX, dpr * this.uiY);
        s.draw(ctx, 1280, 720);
      }
    }
    if (this.touch && s instanceof FightScene) {
      ctx.setTransform(dpr * this.cssW / 1280, 0, 0, dpr * this.cssW / 1280, 0, 0);
      this.touch.draw(ctx, 1280, this.vh);
    }
    if (this.overlay) {
      ctx.setTransform(dpr * this.cssW / 1280, 0, 0, dpr * this.cssW / 1280, 0, 0);
      ctx.fillStyle = "rgba(12,8,20,0.82)"; ctx.fillRect(0, 0, 1280, this.vh);
      ctx.setTransform(dpr * this.uiS, 0, 0, dpr * this.uiS, dpr * this.uiX, dpr * this.uiY);
      this.overlay.draw(ctx, 1280, 720);
    }
    ctx.setTransform(dpr * this.cssW / 1280, 0, 0, dpr * this.cssW / 1280, 0, 0);
    this.wipe.draw(ctx, 1280, this.vh);
    if (this.portrait && this.isTouch) this.drawRotate(ctx);
  }

  drawRotate(ctx) {
    const vw = 1280, vh = this.vh;
    ctx.fillStyle = "rgba(12,8,20,0.94)"; ctx.fillRect(0, 0, vw, vh);
    ctx.save(); ctx.translate(vw / 2, vh / 2 - 40);
    ctx.rotate(Math.sin(performance.now() / 400) * 0.3 - 0.3);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 10; ctx.strokeRect(-70, -120, 140, 240);
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = `900 64px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("请横屏游玩", vw / 2, vh / 2 + 180);
    ctx.font = `700 36px ${FONT}`; ctx.fillStyle = "#ffd23c"; ctx.fillText("手机横过来,大乱斗才打得开", vw / 2, vh / 2 + 240);
  }
}

async function boot() {
  const canvas = document.getElementById("game");
  const app = new App(canvas);
  window.__app = app;
  const loading = { p: 0 };
  let raf = 0;
  const drawLoading = () => {
    const ctx = app.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1c1426"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(app.dpr * app.uiS, 0, 0, app.dpr * app.uiS, app.dpr * app.uiX, app.dpr * app.uiY);
    ctx.fillStyle = "#fff"; ctx.font = `900 42px ${FONT}`; ctx.textAlign = "center";
    ctx.fillText("梗王大乱斗", 640, 330);
    ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(440, 370, 400, 12);
    ctx.fillStyle = "#ff2d3a"; ctx.fillRect(440, 370, 400 * loading.p, 12);
    ctx.font = `700 18px ${FONT}`; ctx.fillStyle = "#aaa"; ctx.fillText("正在加载热搜……", 640, 420);
    raf = requestAnimationFrame(drawLoading);
  };
  drawLoading();
  const list = [["json", "heads", "assets/heads/heads.json"]];
  for (const id of ROSTER) list.push(["img", "head_" + id, `assets/heads/${id}.webp`]);
  for (const id of STAGE_ORDER) list.push(["img", "stage_" + id, `assets/stages/${id}.webp`]);
  await loadAll(list, (p) => { loading.p = p; });
  try { await Promise.race([document.fonts.load(`900 40px "Smiley Sans"`), new Promise((r) => setTimeout(r, 2500))]); } catch (e) {}
  cancelAnimationFrame(raf);
  const q = new URLSearchParams(location.search);
  if (q.get("quick")) {
    const quick = q.get("quick").split(",");
    const lv = parseInt(q.get("lv") || "5");
    const players = quick.map((id, i) => ({
      def: CHARS[id] || CHARS.chen,
      source: i === 0 && !q.get("cpu0") ? app.source("k1") : app.cpu(lv),
      cpu: i === 0 && !q.get("cpu0") ? 0 : lv,
    }));
    app.setScene(new FightScene(app, { stage: STAGES[q.get("stage") || "studio"], players, rules: { stocks: parseInt(q.get("stocks") || "3"), items: q.get("items") !== "0", hazards: true }, seed: Date.now() & 0xffff, training: q.get("training") === "1" }));
  } else if (q.get("scene")) {
    const map = {
      results: () => {
        const players = [{ def: CHARS.mabaoguo, source: app.cpu(7), cpu: 7 }, { def: CHARS.laoa, source: app.cpu(7), cpu: 7 }];
        const cfg = { stage: STAGES.studio, players, rules: { stocks: 1 }, seed: 3 };
        const w = new World(cfg); let n = 0; while (!w.over && n++ < 60 * 300) w.step();
        return new ResultsScene(app, w, cfg);
      },
      menu: () => new MainMenu(app), select: () => new SelectScene(app, null), stage: () => new StageSelect(app, { players: [{ char: "chen", type: "p", dev: "k1" }, { char: "zhang", type: "cpu", lv: 5 }], mode: "versus" }), wiki: () => new WikiScene(app, q.get("id") || "chen"), settings: () => new SettingsScene(app) };
    app.setScene((map[q.get("scene")] || map.menu)());
  } else app.setScene(new TitleScene(app));
  requestAnimationFrame((t) => app.loop(t));
}
boot();
