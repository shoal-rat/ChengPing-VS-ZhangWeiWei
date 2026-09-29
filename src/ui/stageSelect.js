// Stage select: painted thumbnails, owner head, hazard note.
import { sticker, badge, head, headSilhouette, ransom, jagPath, halftone, hash, memeText, Hits, FONT, INK, HOT, GOLD, RED, BLK, WHT } from "./ui.js";
import { smallBtn } from "./select.js";
import { IMG } from "../engine/assets.js";
import { Audio } from "../engine/audio.js";
import { STAGES, STAGE_ORDER } from "../data/stages.js";
import { CHARS } from "../data/chars/index.js";
import { SelectScene } from "./select.js";
import { DummySource } from "../sim/ai.js";
import { RNG } from "../sim/math.js";

const TILES = [...STAGE_ORDER, "random"];

export class StageSelect {
  constructor(app, sel) { this.app = app; this.sel = sel; this.t = 0; this.cur = 0; this.hits = new Hits(); }
  enter() {}
  update() {
    this.t++;
    for (const e of this.app.menu.poll()) {
      if (e.dir[0]) { this.cur = (this.cur + e.dir[0] + TILES.length) % TILES.length; Audio.sfx("tick"); }
      if (e.dir[1]) { this.cur = (this.cur + e.dir[1] * 4 + TILES.length * 4) % TILES.length; Audio.sfx("tick"); }
      if (e.ok || e.start) this.pick(this.cur);
      if (e.back) { Audio.sfx("back"); this.app.go(new SelectScene(this.app, this.sel)); }
    }
  }
  click(x, y) {
    const r = this.hits.at(x, y);
    if (!r) return;
    if (r.id === "back") { this.app.go(new SelectScene(this.app, this.sel)); return; }
    const i = +r.id.slice(1);
    if (this.cur === i || this.app.isTouch) this.pick(i); else { this.cur = i; Audio.sfx("tick"); }
  }
  hover(x, y) { const r = this.hits.at(x, y); if (r && r.id[0] === "s" && this.cur !== +r.id.slice(1)) { this.cur = +r.id.slice(1); Audio.sfx("tick"); } }
  pick(i) {
    let id = TILES[i];
    if (id === "random") id = STAGE_ORDER[this.app.rng.int(0, STAGE_ORDER.length - 1)];
    Audio.sfx("ok");
    const a = this.app;
    const training = this.sel.mode === "training";
    const players = this.sel.players.map((p) => ({ def: CHARS[p.char], source: p.type === "cpu" ? (training ? new DummySource(new RNG(a.rng.int(1, 1e9))) : a.cpu(p.lv)) : a.source(p.dev), cpu: p.type === "cpu" ? p.lv : 0 }));
    const rules = training ? { stocks: 0, time: 0, items: false, hazards: false } : { ...this.sel.rules };
    a.startFight({ stage: STAGES[id], players, rules, seed: a.rng.int(1, 1e9), training, sel: this.sel });
  }
  draw(ctx) {
    const t = this.t;
    this.hits.begin();
    ctx.save(); ctx.translate(30, 42); ctx.rotate(-0.05); ransom(ctx, "选择舞台", 0, 0, 38, { seed: 61, align: "left" }); ctx.restore();
    smallBtn(ctx, 1150, 14, "返回");
    this.hits.add("back", 1150, 14, 110, 44);
    const tw = 280, th = 168;
    TILES.forEach((id, i) => {
      const c = i % 4, r = Math.floor(i / 4);
      const x = 70 + c * (tw + 16) + r * 30, y = 90 + r * (th + 70);
      const sel = i === this.cur;
      const st = STAGES[id];
      ctx.save();
      if (sel) { ctx.translate(x + tw / 2, y + th / 2); ctx.scale(1.04, 1.04); ctx.rotate(Math.sin(t * 0.1) * 0.01); ctx.translate(-(x + tw / 2), -(y + th / 2)); }
      if (sel) { ctx.fillStyle = RED; ctx.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2 + t * 0.01, rr = k % 2 ? 150 : 185; ctx.lineTo(x + tw / 2 + Math.cos(a) * rr * 1.1, y + th / 2 + Math.sin(a) * rr * 0.7); } ctx.closePath(); ctx.fill(); }
      sticker(ctx, x, y, tw, th, { fill: BLK, skew: 20, bw: sel ? 6 : 3, border: sel ? WHT : "rgba(255,255,255,0.7)", back: BLK, off: [8, 7], seed: 700 + i });
      ctx.save(); jagPath(ctx, x, y, tw, th, 700 + i, 4, 20); ctx.clip();
      const im = st && IMG["stage_" + id];
      if (im) ctx.drawImage(im, x - 10, y - 10, tw + 20, (tw + 20) * im.height / im.width);
      else { ctx.fillStyle = "#3a2f58"; ctx.fillRect(x, y, tw, th); memeText(ctx, "?", x + tw / 2, y + th / 2, 90, "#fff", INK, FONT); }
      if (st) drawMini(ctx, st, x, y, tw, th);
      ctx.restore();
      if (st && st.owner) head(ctx, st.owner, x + tw - 34, y + th + 6, 74, sel ? 4 : 0);
      ctx.restore();
      ctx.save(); ctx.translate(x + 10, y + th + 4); ctx.rotate(-0.03);
      ctx.font = `900 19px ${FONT}`; const nw = ctx.measureText(st ? st.name : "随机舞台").width + 26;
      ctx.fillStyle = sel ? WHT : BLK; jagPath(ctx, 0, 0, nw, 30, 800 + i, 2, 8); ctx.fill();
      ctx.fillStyle = sel ? BLK : WHT; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(st ? st.name : "随机舞台", 13, 16);
      ctx.restore();
      this.hits.add("s" + i, x, y, tw, th + 30);
    });
    const st = STAGES[TILES[this.cur]];
    sticker(ctx, 150, 620, 980, 70, { fill: BLK, skew: 16, bw: 3, seed: 901 });
    ctx.fillStyle = "#fff"; ctx.font = `800 19px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(st ? st.desc : "交给命运。", 190, 655, 900);
  }
}

// schematic of the platforms over the thumbnail
function drawMini(ctx, st, x, y, w, h) {
  const s = w / 2400;
  ctx.save(); ctx.translate(x + w / 2, y + h * 0.72); ctx.scale(s, s);
  for (const p of st.plats) {
    ctx.fillStyle = p.solid ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.7)";
    ctx.fillRect(p.x1, p.y, p.x2 - p.x1, p.solid ? 40 : 18);
  }
  ctx.restore();
}
