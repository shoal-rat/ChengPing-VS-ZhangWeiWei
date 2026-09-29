// Main menu: P5 slabs on the left, a live preview on the right.
import { sticker, badge, head, headSilhouette, ransom, p5bar, p5say, radial, halftone, jagPath, keycap, Hits, memeText, FONT, BLK, WHT, RED, GOLD } from "./ui.js";
import { Audio } from "../engine/audio.js";
import { ROSTER, CHARS } from "../data/chars/index.js";

const ITEMS = [
  { id: "versus", label: "大乱斗", sub: "本地多人 · 电脑对战", tag: "爆" },
  { id: "classic", label: "流量之路", sub: "单人闯关 · 冲上热搜第一", tag: "热" },
  { id: "training", label: "训练有素", sub: "练连段 · 看判定 · 查帧数", tag: "荐" },
  { id: "wiki", label: "梗百科", sub: "这些梗到底什么来头", tag: "新" },
  { id: "settings", label: "设置", sub: "音量 · 弹幕 · 操作", tag: null },
];

export class MainMenu {
  constructor(app) { this.app = app; this.t = 0; this.sel = 0; this.hits = new Hits(); this.selT = 0; }
  enter() { Audio.music("title"); }
  update() {
    this.t++; this.selT++;
    for (const e of this.app.menu.poll()) {
      if (e.dir[1]) { this.sel = (this.sel + e.dir[1] + ITEMS.length) % ITEMS.length; this.selT = 0; Audio.sfx("tick"); }
      if (e.ok) this.pick(ITEMS[this.sel].id);
      if (e.back) { Audio.sfx("back"); this.app.toTitle(); }
    }
  }
  click(x, y) {
    const r = this.hits.at(x, y);
    if (!r) return;
    if (r.id.startsWith("item")) { const i = r.data; if (this.sel === i || this.app.isTouch) this.pick(ITEMS[i].id); else { this.sel = i; this.selT = 0; Audio.sfx("tick"); } }
  }
  hover(x, y) { const r = this.hits.at(x, y); if (r && r.id.startsWith("item") && this.sel !== r.data) { this.sel = r.data; this.selT = 0; Audio.sfx("tick"); } }
  pick(id) {
    Audio.sfx("ok");
    const a = this.app;
    if (id === "versus") a.toSelect("versus");
    else if (id === "classic") a.toSelect("classic");
    else if (id === "training") a.toSelect("training");
    else if (id === "wiki") a.toWiki("chen");
    else if (id === "settings") a.toSettings();
  }
  draw(ctx, W, H) {
    const t = this.t;
    this.hits.begin();
    // preview first (behind menu)
    this.preview(ctx, ITEMS[this.sel].id, t);
    ctx.save(); ctx.translate(40, 58); ctx.rotate(-0.05);
    ransom(ctx, "梗王大乱斗", 0, 0, 40, { seed: 20, align: "left" });
    ctx.restore();
    ITEMS.forEach((it, i) => {
      const sel = i === this.sel;
      const k = Math.min(1, Math.max(0, (t - i * 3) / 10));
      const pop = sel ? Math.min(1, this.selT / 6) : 0;
      const x = 50 - (1 - k) * 400 + i * 16 + pop * 26, y = 118 + i * 104, w = 500 + (sel ? 30 : 0), h = 84;
      p5bar(ctx, x, y, w, h, it.label, sel, t, { sub: it.sub, size: 44, back: RED });
      if (it.tag) badge(ctx, it.tag, x + w - 30, y + 10, 30);
      this.hits.add("item" + i, x, y, w, h, i);
    });
    // footer
    let x = 60; const y = 690;
    ctx.save(); ctx.fillStyle = BLK; jagPath(ctx, 40, 670, 620, 40, 91, 3, 10); ctx.fill(); ctx.restore();
    ctx.fillStyle = WHT; ctx.font = `800 16px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    x += keycap(ctx, "W", x, y - 13) + 4; x += keycap(ctx, "S", x, y - 13) + 8; ctx.fillText("选择", x, y); x += 50;
    x += keycap(ctx, "J", x, y - 13) + 8; ctx.fillText("确定", x, y); x += 50;
    x += keycap(ctx, "K", x, y - 13) + 8; ctx.fillText("返回", x, y); x += 60;
    ctx.fillText("手柄 / 鼠标 / 触屏 都能用", x, y);
  }
  preview(ctx, id, t) {
    const cx = 930, cy = 400;
    ctx.save();
    ctx.fillStyle = BLK; jagPath(ctx, 640, 90, 620, 560, hash2(id), 12, 60); ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); jagPath(ctx, 640, 90, 620, 560, hash2(id), 12, 60); ctx.clip();
    radial(ctx, cx, cy, 700, 16, "rgba(232,20,28,0.35)", t * 0.004);
    halftone(ctx, 640, 420, 620, 240, "rgba(232,20,28,0.5)", 14, 5, "down");
    ctx.restore();
    if (id === "versus") {
      headSilhouette(ctx, "chen", cx - 110, cy + 132, 240, 1, RED); head(ctx, "chen", cx - 120, cy + 120, 240, 1);
      headSilhouette(ctx, "laoa", cx + 140, cy + 132, 240, 1, RED, true); head(ctx, "laoa", cx + 130, cy + 120, 240, 1, true);
      ctx.save(); ctx.translate(cx, cy + 10); ctx.rotate(-0.12); ransom(ctx, "VS", 0, 0, 90, { seed: 3, jitter: 1, t }); ctx.restore();
      p5say(ctx, cx - 240, cy - 190, "¥2000 > $3000!", 24);
      p5say(ctx, cx + 10, cy - 130, "那斩杀线呢?", 24);
      ransom(ctx, "最多4人同屏", cx, cy + 200, 26, { seed: 5 });
    } else if (id === "classic") {
      const list = ["第7 路人甲", "第6 小有名气", "第5 同城热搜", "第4 冲上热搜", "第3 热搜前三", "第2 全网热议", "第1 梗王"];
      list.forEach((s, i) => {
        const y = cy - 200 + i * 56, top = i === 6;
        sticker(ctx, cx - 200 + i * 10, y, 390, 46, { fill: top ? RED : BLK, skew: 14, bw: 3, back: top ? BLK : RED, off: [5, 4] });
        ctx.fillStyle = WHT; ctx.font = `900 21px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(s, cx - 166 + i * 10, y + 24);
        if (top) badge(ctx, "爆", cx + 160 + i * 10, y + 22, 28);
      });
    } else if (id === "training") {
      headSilhouette(ctx, "mabaoguo", cx + 12, cy + 102, 270, 4, RED); head(ctx, "mabaoguo", cx, cy + 90, 270, 4);
      p5say(ctx, cx - 190, cy - 190, "训练有素,有备而来。", 26);
      ransom(ctx, "木桩 判定框 帧数据", cx, cy + 180, 26, { seed: 8 });
    } else if (id === "wiki") {
      ROSTER.forEach((c, i) => { const x = cx - 240 + (i % 4) * 160, y = cy - 30 + Math.floor(i / 4) * 190; headSilhouette(ctx, c, x + 8, y + 8, 150, 0, RED); head(ctx, c, x, y, 150, (t / 40 | 0) % 7 === i ? 4 : 0); });
    } else {
      ctx.translate(cx, cy); ctx.rotate(t * 0.01);
      ctx.fillStyle = RED; ctx.strokeStyle = WHT; ctx.lineWidth = 6;
      ctx.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 110 : 150; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = BLK; ctx.beginPath(); ctx.arc(0, 0, 54, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}
function hash2(s) { let h = 7; for (const c of s) h = h * 31 + c.charCodeAt(0); return h >>> 0; }

export function bubble(ctx, x, y, text) { p5say(ctx, x, y, text, 22); }
