// Character select. Each human has a cursor on the roster grid; row -1 is the rules bar.
// Keyboard P1 (WASD/J/K) · keyboard P2 joins with Enter · gamepads join with A · mouse/touch click.
import { sticker, badge, head, headSilhouette, ransom, p5say, radial, halftone, jagPath, hash, memeText, keycap, roundRect, Hits, FONT, F_HY, INK, HOT, GOLD, CYAN, RED, BLK, WHT } from "./ui.js";
import { PCOL, PNAME, CPUCOL } from "./theme.js";
import { Audio } from "../engine/audio.js";
import { ROSTER, CHARS } from "../data/chars/index.js";
import { LORE } from "../data/lore.js";
import { MainMenu, bubble } from "./menu.js";
import { HelpOverlay } from "./help.js";

const COLS = 4;
const TILES = [...ROSTER, "random"];
const STOCKS = [1, 2, 3, 4, 5];
const TIMES = [0, 2, 3, 5, 8];
const ARCH = { chen: "远程压制", zhang: "反击型", huxijin: "重量级陷阱", fengge: "贴身猛攻", huchenfeng: "轻量游击", mabaoguo: "反击投技", laoa: "终结斩杀" };

export class SelectScene {
  constructor(app, prev) {
    this.app = app; this.t = 0;
    this.mode = (prev && prev.mode) || "versus";
    this.hits = new Hits();
    const S = app.settings;
    this.rules = { stocks: S.stocks || 3, time: S.time || 0, items: S.items !== false, hazards: S.hazards !== false };
    const p1dev = app.isTouch ? "touch" : "k1";
    this.slots = [0, 1, 2, 3].map((i) => ({ type: "off", dev: null, char: null, lv: 5, cur: 0, row: 0, ready: false, bub: null }));
    if (prev && prev.players && prev.mode === this.mode) {
      prev.players.forEach((p, i) => { Object.assign(this.slots[i], { type: p.type, dev: p.dev, char: p.char, lv: p.lv || 5 }); });
      for (const s of this.slots) if (s.type === "p") s.cur = Math.max(0, TILES.indexOf(s.char));
    } else {
      Object.assign(this.slots[0], { type: "p", dev: p1dev, cur: 0 });
      if (this.mode !== "classic") Object.assign(this.slots[1], { type: "cpu", char: null, lv: this.mode === "training" ? 1 : 5 });
    }
    this.focus = 0;         // slot that mouse/touch clicks assign to
    this.clevel = app.settings.classicLv || 4;
    if (!app.settings.seenHelp && this.mode === "versus") { app.settings.seenHelp = true; app.saveSettings(); this.help = true; }
  }
  enter() { Audio.music("select"); if (this.help) { this.help = false; this.app.overlay = new HelpOverlay(this.app, () => { this.app.overlay = null; }); } }

  humans() { return this.slots.filter((s) => s.type === "p"); }
  slotOfDev(dev) { return this.slots.findIndex((s) => s.type === "p" && s.dev === dev); }
  maxSlots() { return this.mode === "versus" ? 4 : this.mode === "training" ? 2 : 1; }

  update() {
    this.t++;
    const evs = this.app.menu.poll();
    for (const e of evs) this.input(e);
    for (const s of this.slots) if (s.bub && --s.bub.t <= 0) s.bub = null;
  }

  input(e) {
    const dev = e.src === "k1" ? (this.app.isTouch && this.slots[0].dev === "touch" ? "k1" : "k1") : e.src;
    let si = this.slotOfDev(dev);
    if (si < 0 && dev === "k1" && this.slots[0].dev === "touch") { this.slots[0].dev = "k1"; si = 0; }
    if (si < 0) {
      // join: keyboard 2 with Enter, gamepad with A/start
      if ((e.ok || e.start) && this.mode === "versus") this.join(dev);
      else if (e.back && dev === "k2") {}
      return;
    }
    const s = this.slots[si];
    if (e.dir[0] || e.dir[1]) this.move(s, e.dir[0], e.dir[1]);
    if (e.ok || e.start) {
      if (this.allReady() && (s.ready || e.start)) { this.proceed(); return; }
      if (s.row < 0) this.toggleRule(s.cur);
      else this.pick(si, TILES[s.cur]);
    }
    if (e.back) {
      if (s.ready) { s.ready = false; s.char = null; Audio.sfx("back"); }
      else if (si === 0) { Audio.sfx("back"); this.app.go(new MainMenu(this.app)); }
      else { s.type = "off"; s.dev = null; Audio.sfx("back"); }
    }
    if (e.x && this.mode === "versus") this.cycleCpu();
    if (e.alt) { this.app.overlay = new HelpOverlay(this.app, () => { this.app.overlay = null; }); }
  }

  join(dev) {
    let i = this.slots.findIndex((s, k) => k < this.maxSlots() && s.type === "off");
    if (i < 0) i = this.slots.findIndex((s, k) => k < this.maxSlots() && s.type === "cpu");
    if (i < 0) return;
    Object.assign(this.slots[i], { type: "p", dev, char: null, ready: false, cur: 0, row: 0 });
    Audio.sfx("ok");
  }

  move(s, dx, dy) {
    if (s.row < 0) {
      if (dx) s.cur = (s.cur + dx + 4) % 4;
      if (dy > 0) { s.row = 0; s.cur = 0; }
    } else {
      let c = s.cur % COLS, r = Math.floor(s.cur / COLS);
      c = (c + dx + COLS) % COLS;
      r += dy;
      if (r < 0 && this.mode !== "classic") { s.row = -1; s.cur = 0; Audio.sfx("tick"); return; }
      r = Math.max(0, Math.min(Math.ceil(TILES.length / COLS) - 1, r));
      s.cur = Math.min(TILES.length - 1, r * COLS + c);
    }
    Audio.sfx("tick");
  }

  pick(si, id) {
    const s = this.slots[si];
    // human already locked: extra picks configure the next CPU (single-keyboard convenience)
    if (s.ready && this.mode !== "classic") {
      const cpu = this.slots.find((x) => x.type === "cpu" && (!x.char || x === this.lastCpu)) || this.slots.find((x) => x.type === "cpu");
      if (cpu) { cpu.char = this.resolve(id); cpu.ready = true; this.lastCpu = cpu; this.announce(cpu, cpu.char); }
      return;
    }
    s.char = this.resolve(id);
    s.ready = true;
    this.announce(s, s.char);
    // auto-focus next unset CPU for clicks
    const nx = this.slots.findIndex((x) => x.type === "cpu" && !x.char);
    if (nx >= 0) this.focus = nx;
  }
  resolve(id) { return id === "random" ? ROSTER[this.app.rng.int(0, ROSTER.length - 1)] : id; }
  announce(s, id) {
    Audio.sfx("ok");
    const d = CHARS[id];
    const line = d.tauntLines[this.app.rng.int(0, d.tauntLines.length - 1)];
    s.bub = { text: line, t: 110 };
    Audio.say(d.name + "!", id);
  }

  toggleRule(i) {
    const r = this.rules;
    if (i === 0) r.stocks = STOCKS[(STOCKS.indexOf(r.stocks) + 1) % STOCKS.length];
    if (i === 1) r.time = TIMES[(TIMES.indexOf(r.time) + 1) % TIMES.length];
    if (i === 2) r.items = !r.items;
    if (i === 3) r.hazards = !r.hazards;
    Object.assign(this.app.settings, r); this.app.saveSettings();
    Audio.sfx("tick");
  }

  cycleCpu() {
    // add a CPU into the next free slot, or remove the last CPU
    const free = this.slots.findIndex((s, k) => k < this.maxSlots() && s.type === "off");
    if (free >= 0) { Object.assign(this.slots[free], { type: "cpu", char: null, lv: 5, ready: false }); this.focus = free; }
    else { for (let k = 3; k >= 0; k--) if (this.slots[k].type === "cpu") { this.slots[k].type = "off"; this.slots[k].char = null; break; } }
    Audio.sfx("tick");
  }

  allReady() {
    const act = this.slots.filter((s) => s.type !== "off");
    if (this.mode === "classic") return act.length >= 1 && act[0].char;
    if (act.length < 2) return false;
    return act.every((s) => s.type === "cpu" || s.char);
  }

  proceed() {
    Audio.sfx("ok");
    const act = this.slots.filter((s) => s.type !== "off").map((s) => ({ type: s.type, dev: s.dev, char: s.char || this.resolve("random"), lv: s.lv }));
    const sel = { mode: this.mode, players: act, rules: { ...this.rules } };
    if (this.mode === "classic") { this.app.settings.classicLv = this.clevel; this.app.saveSettings(); this.app.startClassic(act[0].char, this.clevel); return; }
    this.app.toStageSelect(sel);
  }

  // ------------------------------------------------ pointer
  click(x, y) {
    const r = this.hits.at(x, y);
    if (!r) return;
    const [kind, a, b] = r.id.split(":");
    if (kind === "tile") {
      const id = TILES[+a];
      const s = this.slots[this.focus];
      if (!s || s.type === "off") { this.focus = 0; }
      const tgt = this.slots[this.focus];
      if (tgt.type === "p") { tgt.cur = +a; tgt.char = this.resolve(id); tgt.ready = true; this.announce(tgt, tgt.char); }
      else if (tgt.type === "cpu") { tgt.char = this.resolve(id); tgt.ready = true; this.announce(tgt, tgt.char); }
      const nx = this.slots.findIndex((x) => x.type === "cpu" && !x.char);
      if (nx >= 0) this.focus = nx;
    } else if (kind === "slot") { this.focus = +a; Audio.sfx("tick"); }
    else if (kind === "type") {
      const s = this.slots[+a];
      if (+a === 0) return;
      s.type = s.type === "cpu" ? "off" : "cpu"; s.char = null; s.ready = false; s.dev = null; this.focus = +a;
      Audio.sfx("tick");
    } else if (kind === "lv") { const s = this.slots[+a]; s.lv = Math.max(1, Math.min(9, s.lv + (+b))); Audio.sfx("tick"); }
    else if (kind === "rule") this.toggleRule(+a);
    else if (kind === "go") this.proceed();
    else if (kind === "back") { Audio.sfx("back"); this.app.go(new MainMenu(this.app)); }
    else if (kind === "help") this.app.overlay = new HelpOverlay(this.app, () => { this.app.overlay = null; });
    else if (kind === "clv") { this.clevel = Math.max(1, Math.min(9, this.clevel + (+a))); Audio.sfx("tick"); }
  }

  // ------------------------------------------------ drawing
  draw(ctx, W, H) {
    const t = this.t;
    this.hits.begin();
    const title = { versus: "选择梗王", classic: "流量之路", training: "训练有素" }[this.mode];
    ctx.save(); ctx.translate(30, 42); ctx.rotate(-0.05); ransom(ctx, title, 0, 0, 38, { seed: hash(title), align: "left" }); ctx.restore();
    smallBtn(ctx, 1150, 14, "返回"); this.hits.add("back:0", 1150, 14, 110, 50);
    smallBtn(ctx, 1030, 14, "操作"); this.hits.add("help:0", 1030, 14, 110, 50);
    if (this.mode !== "classic") this.drawRules(ctx);
    else this.drawClassicLv(ctx);
    // grid
    const tw = 180, th = 150, gx = 640 - (COLS * tw + (COLS - 1) * 14) / 2, gy = 118;
    TILES.forEach((id, i) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      const x = gx + c * (tw + 14) + r * 18, y = gy + r * (th + 12);
      const d = CHARS[id];
      const hot = this.slots.some((s) => s.type === "p" && s.row >= 0 && s.cur === i);
      const taken = this.slots.some((s) => s.char === id && s.ready);
      ctx.save();
      if (hot) {
        const r = Math.floor(t / 4);
        ctx.fillStyle = RED;
        ctx.beginPath();
        for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + r * 0.05, rr = k % 2 ? 95 : 125 + ((k * 37 + r) % 9); ctx.lineTo(x + tw / 2 + Math.cos(a) * rr * 1.2, y + th / 2 + Math.sin(a) * rr * 0.85); }
        ctx.closePath(); ctx.fill();
      }
      sticker(ctx, x, y, tw, th, { fill: d ? d.color : "#2b2230", skew: 18, bw: hot ? 6 : 3, border: hot ? WHT : "rgba(255,255,255,0.8)", back: BLK, off: [7, 7], seed: 100 + i, stripe: "rgba(0,0,0,0.22)" });
      ctx.save(); jagPath(ctx, x, y, tw, th, 100 + i, 4, 18); ctx.clip();
      if (d) { headSilhouette(ctx, id, x + tw / 2 + 14, y + th + 12, 150, hot ? 1 : 0, "rgba(0,0,0,0.55)"); head(ctx, id, x + tw / 2 + 6, y + th + 6, 150, hot ? 1 : 0); }
      else { const rid = ROSTER[(t / 12 | 0) % ROSTER.length]; headSilhouette(ctx, rid, x + tw / 2, y + th + 6, 140, 0, "rgba(0,0,0,0.6)"); ransom(ctx, "?", x + tw / 2, y + 64, 70, { seed: 4, jitter: 1, t }); }
      ctx.restore();
      ctx.save(); ctx.translate(x + 14, y + th - 26); ctx.rotate(-0.03);
      ctx.fillStyle = hot ? WHT : BLK; jagPath(ctx, 0, 0, tw - 36, 32, 200 + i, 2, 8); ctx.fill();
      ctx.fillStyle = hot ? BLK : WHT; ctx.font = `900 21px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(d ? d.name : "随机", (tw - 36) / 2, 17);
      ctx.restore();
      if (taken && d) { ctx.save(); ctx.translate(x + tw - 30, y + 18); ctx.rotate(0.2); badge(ctx, "选", 0, 0, 26); ctx.restore(); }
      ctx.restore();
      this.hits.add("tile:" + i, x, y, tw, th);
    });
    // cursors
    this.slots.forEach((s, si) => {
      if (s.type !== "p") return;
      let x, y;
      if (s.row < 0) { x = 250 + s.cur * 200 + 150; y = 96; }
      else { const c = s.cur % COLS, r = Math.floor(s.cur / COLS); x = gx + c * (tw + 14) + r * 18 + 30 + si * 34; y = gy + r * (th + 12) + 30; }
      cursor(ctx, x, y + Math.sin(t * 0.2 + si) * 3, PCOL[si], PNAME[si]);
    });
    // slots
    const n = this.maxSlots();
    const sw = n === 1 ? 420 : 290, gap = 16, tot = n * sw + (n - 1) * gap;
    for (let i = 0; i < n; i++) this.drawSlot(ctx, i, 640 - tot / 2 + i * (sw + gap), 448, sw, 222);
    if (this.allReady()) {
      const k = Math.sin(t * 0.15) * 0.03;
      ctx.save(); ctx.translate(640, 686); ctx.rotate(-0.03 + k);
      sticker(ctx, -340, -36, 680, 68, { fill: BLK, skew: 30, bw: 5, back: RED, off: [10, 8], seed: 77 });
      ransom(ctx, "准备就绪", -170, -2, 40, { seed: 31, jitter: 1, t });
      ctx.fillStyle = WHT; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(this.app.isTouch ? "点这里开打!" : "再按 J / Enter 开打!", -40, 0);
      ctx.restore();
      this.hits.add("go:0", 300, 650, 680, 70);
    }
  }

  drawRules(ctx) {
    const r = this.rules;
    const items = [["命数", r.stocks + " 条"], ["限时", r.time ? r.time + " 分钟" : "不限"], ["道具", r.items ? "开" : "关"], ["机关", r.hazards ? "开" : "关"]];
    items.forEach(([k, v], i) => {
      const x = 250 + i * 200, y = 70;
      const hot = this.slots.some((s) => s.type === "p" && s.row < 0 && s.cur === i);
      sticker(ctx, x, y, 186, 38, { fill: hot ? HOT : "#2a2140", skew: 10, shadow: 4, bw: hot ? 4 : 2, border: hot ? "#fff" : "rgba(255,255,255,0.5)" });
      ctx.fillStyle = "#cfc8e0"; ctx.font = `800 17px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(k, x + 20, y + 20);
      ctx.fillStyle = "#fff"; ctx.font = `900 20px ${FONT}`; ctx.textAlign = "right"; ctx.fillText(v, x + 166, y + 20);
      this.hits.add("rule:" + i, x, y, 186, 38);
    });
  }
  drawClassicLv(ctx) {
    const x = 460, y = 70;
    sticker(ctx, x, y, 360, 38, { fill: "#2a2140", skew: 10, shadow: 4, bw: 2 });
    ctx.fillStyle = "#cfc8e0"; ctx.font = `800 17px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("难度", x + 24, y + 20);
    ctx.fillStyle = "#fff"; ctx.font = `900 20px ${FONT}`; ctx.textAlign = "center"; ctx.fillText(["", "路人", "网友", "水军", "键盘侠", "大V", "营销号", "顶流", "热搜常客", "梗王"][this.clevel] + " Lv" + this.clevel, x + 200, y + 20);
    memeText(ctx, "◀", x + 110, y + 19, 22, "#fff", INK, FONT); memeText(ctx, "▶", x + 300, y + 19, 22, "#fff", INK, FONT);
    this.hits.add("clv:-1", x + 80, y, 60, 38); this.hits.add("clv:1", x + 270, y, 60, 38);
  }

  drawSlot(ctx, i, x, y, w, h) {
    const s = this.slots[i];
    const col = s.type === "p" ? PCOL[i] : s.type === "cpu" ? CPUCOL : "#3a3350";
    const focus = this.focus === i && s.type !== "off";
    sticker(ctx, x, y, w, h, { fill: s.type === "off" ? "rgba(12,11,14,0.55)" : BLK, skew: 16, bw: focus ? 5 : 3, border: focus ? WHT : "rgba(255,255,255,0.6)", band: col, bandH: 40, seed: 300 + i, back: s.type === "off" ? null : RED });
    this.hits.add("slot:" + i, x, y, w, h);
    const label = s.type === "p" ? `${PNAME[i]} ${devName(s.dev)}` : s.type === "cpu" ? "电脑" : "空位";
    ctx.fillStyle = "#fff"; ctx.font = `900 20px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(label, x + 30, y + 21);
    if (i > 0 && this.mode === "versus") {
      ctx.save(); ctx.translate(x + w - 96, y + 6);
      sticker(ctx, 0, 0, 78, 28, { fill: INK, border: "#fff", bw: 2, shadow: 0, skew: 6 });
      ctx.fillStyle = "#fff"; ctx.font = `800 15px ${FONT}`; ctx.textAlign = "center"; ctx.fillText(s.type === "cpu" ? "移除" : s.type === "off" ? "+电脑" : "玩家", 39, 15);
      ctx.restore();
      if (s.type !== "p") this.hits.add("type:" + i, x + w - 96, y + 4, 80, 32);
    }
    if (s.type === "off") {
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = `800 17px ${FONT}`; ctx.textAlign = "center";
      ctx.fillText(this.mode === "versus" ? "手柄按A / 键盘2按Enter 加入" : "", x + w / 2, y + h / 2 + 10);
      if (this.mode === "versus") ctx.fillText("或点右上角 +电脑", x + w / 2, y + h / 2 + 36);
      return;
    }
    const id = s.char || (s.type === "p" ? TILES[s.cur] : null);
    const d = id && CHARS[id];
    ctx.save();
    jagPath(ctx, x, y + 40, w, h - 40, 300 + i, 3, 16); ctx.clip();
    if (d) {
      halftone(ctx, x, y + 40, w, h - 40, "rgba(232,20,28,0.35)", 12, 4, "left");
      headSilhouette(ctx, id, x + 102, y + h + 16, 170, s.ready ? 4 : 0, RED);
      head(ctx, id, x + 90, y + h + 8, 170, s.ready ? 4 : 0);
    } else if (s.type === "cpu") { ransom(ctx, "?", x + 90, y + 140, 70, { seed: 5 }); }
    ctx.restore();
    if (d) {
      ransom(ctx, d.name, x + w - 20, y + 74, d.name.length > 2 ? 30 : 36, { seed: hash(id), align: "right" });
      ctx.save(); ctx.translate(x + w - 18, y + 108); ctx.rotate(-0.04);
      ctx.font = `900 16px ${FONT}`; const tw2 = ctx.measureText(d.title + " · " + ARCH[id]).width + 22;
      ctx.fillStyle = RED; jagPath(ctx, -tw2, -13, tw2, 26, hash(id) + 9, 2, 8); ctx.fill();
      ctx.fillStyle = WHT; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(d.title + " · " + ARCH[id], -10, 1);
      ctx.restore();
      ctx.fillStyle = "#ddd"; ctx.font = `800 14px ${FONT}`; ctx.textAlign = "right";
      ctx.fillText("「" + d.tagline + "」", x + w - 18, y + 142, w * 0.58);
      if (s.ready) { ctx.save(); ctx.translate(x + w - 40, y + h - 30); ctx.rotate(-0.15); badge(ctx, "爆", 0, 0, 34); ctx.restore(); }
    } else if (s.type === "cpu") {
      ctx.fillStyle = "#ddd"; ctx.font = `800 15px ${FONT}`; ctx.textAlign = "right"; ctx.fillText("点角色格指定 · 不选则随机", x + w - 18, y + 100);
    }
    if (s.type === "cpu") {
      const lx = x + w - 150, ly = y + h - 44;
      ctx.fillStyle = "#fff"; ctx.font = `900 18px ${FONT}`; ctx.textAlign = "left"; ctx.fillText("Lv " + s.lv, lx + 34, ly + 14);
      memeText(ctx, "◀", lx + 12, ly + 13, 20, "#fff", INK, FONT); memeText(ctx, "▶", lx + 110, ly + 13, 20, "#fff", INK, FONT);
      this.hits.add(`lv:${i}:-1`, lx - 6, ly - 4, 40, 36); this.hits.add(`lv:${i}:1`, lx + 92, ly - 4, 40, 36);
    }
    if (s.bub) { ctx.save(); ctx.globalAlpha = Math.min(1, s.bub.t / 10); bubbleSmall(ctx, x + 20, y - 26, s.bub.text); ctx.restore(); }
  }
}

function devName(dev) {
  if (dev === "k1") return "键盘";
  if (dev === "k2") return "键盘2";
  if (dev === "touch") return "触屏";
  if (dev && dev.startsWith("g")) return "手柄" + (+dev.slice(1) + 1);
  return "";
}
function cursor(ctx, x, y, col, label) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3);
  ctx.fillStyle = "#0c0b0e"; ctx.beginPath(); ctx.moveTo(4, 5); ctx.lineTo(44, 18); ctx.lineTo(24, 24); ctx.lineTo(18, 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = col; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(40, 13); ctx.lineTo(20, 20); ctx.lineTo(13, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.rotate(0.3);
  ctx.fillStyle = "#0c0b0e"; ctx.fillRect(18, 30, 34, 20);
  ctx.fillStyle = "#fff"; ctx.font = `900 16px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, 35, 41);
  ctx.restore();
}
function smallBtn(ctx, x, y, label) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "#e8141c"; jagPath(ctx, 5, 5, 110, 44, hash(label) + 1, 3, 12); ctx.fill();
  ctx.fillStyle = "#0c0b0e"; jagPath(ctx, 0, 0, 110, 44, hash(label), 3, 12); ctx.fill();
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, 55, 23);
  ctx.restore();
}
export { smallBtn };
function bubbleSmall(ctx, x, y, text) {
  ctx.font = `900 17px ${FONT}`;
  const w = Math.min(420, ctx.measureText(text).width + 24);
  ctx.fillStyle = "#fffdf6"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, 34, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x + 12, y + 18, 400);
}
export function wrap(ctx, text, x, y, maxW, lh) {
  let line = "", yy = y;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
  return yy;
}
