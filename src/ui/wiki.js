// 梗百科: character pages with meme explanations and the move list.
import { sticker, badge, head, headSilhouette, ransom, p5bar, radial, halftone, jagPath, hash, memeText, Hits, FONT, INK, HOT, GOLD, RED, BLK, WHT } from "./ui.js";
import { smallBtn } from "./select.js";
import { Audio } from "../engine/audio.js";
import { ROSTER, CHARS } from "../data/chars/index.js";
import { LORE } from "../data/lore.js";
import { MainMenu } from "./menu.js";
import { wrap } from "./select.js";

export class WikiScene {
  constructor(app, id) { this.app = app; this.t = 0; this.i = Math.max(0, ROSTER.indexOf(id)); this.hits = new Hits(); this.tab = 0; }
  update() {
    this.t++;
    for (const e of this.app.menu.poll()) {
      if (e.dir[0]) { this.i = (this.i + e.dir[0] + ROSTER.length) % ROSTER.length; this.t = 0; Audio.sfx("tick"); }
      if (e.dir[1] || e.ok) { this.tab = 1 - this.tab; Audio.sfx("tick"); }
      if (e.back) { Audio.sfx("back"); this.app.go(new MainMenu(this.app)); }
    }
  }
  click(x, y) {
    const r = this.hits.at(x, y);
    if (!r) return;
    if (r.id === "back") this.app.go(new MainMenu(this.app));
    else if (r.id.startsWith("c")) { this.i = +r.id.slice(1); this.t = 0; Audio.sfx("tick"); }
    else if (r.id.startsWith("tab")) { this.tab = +r.id.slice(3); Audio.sfx("tick"); }
  }
  draw(ctx) {
    this.hits.begin();
    const id = ROSTER[this.i], d = CHARS[id], L = LORE[id];
    ctx.save(); ctx.translate(26, 46); ctx.rotate(-0.05); ransom(ctx, "梗百科", 0, 0, 38, { seed: 51, align: "left" }); ctx.restore();
    smallBtn(ctx, 1150, 14, "返回");
    this.hits.add("back", 1150, 14, 110, 44);
    // roster strip
    ROSTER.forEach((c, i) => {
      const x = 200 + i * 104, y = 14, sel = i === this.i;
      sticker(ctx, x, y, 92, 66, { fill: sel ? CHARS[c].color : BLK, skew: 10, bw: sel ? 4 : 2, back: sel ? RED : null, seed: 60 + i });
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, 92, 66); ctx.clip(); head(ctx, c, x + 46, y + 74, 70, sel ? 4 : 0); ctx.restore();
      this.hits.add("c" + i, x, y, 92, 66);
    });
    // portrait card
    sticker(ctx, 40, 100, 400, 590, { fill: BLK, skew: 30, bw: 5, seed: 81 });
    ctx.save(); jagPath(ctx, 40, 100, 400, 590, 81, 7, 30); ctx.clip(); radial(ctx, 240, 330, 600, 16, d.color, this.t * 0.004, 0.45); halftone(ctx, 40, 400, 400, 200, "rgba(0,0,0,0.5)", 11, 4.5, "down"); ctx.restore();
    headSilhouette(ctx, id, 254, 484, 300, (this.t / 60 | 0) % 5 === 4 ? 1 : 0, BLK);
    head(ctx, id, 240, 470, 300, (this.t / 60 | 0) % 5 === 4 ? 1 : 0);
    ctx.save(); ctx.translate(240, 528); ctx.rotate(-0.04); ransom(ctx, d.name, 0, 0, 58, { seed: hash(id) }); ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "center"; ctx.fillText(d.title + " · " + d.en, 240, 572);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = `700 15px ${FONT}`; ctx.textAlign = "left";
    wrap(ctx, L.bio, 70, 610, 340, 20);
    // tabs
    ["梗档案", "出招表"].forEach((s, i) => {
      const x = 480 + i * 170, sel = i === this.tab;
      p5bar(ctx, x, 100, 150, 44, s, sel, this.t, { size: 24, back: RED });
      this.hits.add("tab" + i, x, 100, 150, 44);
    });
    if (this.tab === 0) {
      let y = 170;
      L.memes.forEach(([title, text], i) => {
        const k = Math.min(1, Math.max(0, (this.t - i * 6) / 10));
        ctx.save(); ctx.globalAlpha = k;
        ctx.font = `700 17px ${FONT}`;
        const lines = Math.ceil(ctx.measureText(text).width / 640) + 1;
        const h = 46 + lines * 22;
        sticker(ctx, 480, y, 760, h, { fill: BLK, skew: 12, bw: 2, seed: 90 + i, back: i % 2 ? RED : WHT, off: [6, 5] });
        badge(ctx, ["爆", "热", "新", "沸", "荐"][i % 5], 510, y + 24, 24);
        ctx.fillStyle = GOLD; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(title, 532, y + 24);
        ctx.fillStyle = "#fff"; ctx.font = `700 17px ${FONT}`; ctx.textBaseline = "alphabetic";
        wrap(ctx, text, 510, y + 58, 700, 22);
        ctx.restore();
        y += h + 12;
      });
    } else {
      const M = L.moves;
      const rows = [["通常必杀", "L", M.nspec], ["侧必杀", "A / D + L", M.sspec], ["上必杀(复活)", "W + L", M.uspec], ["下必杀", "S + L", M.dspec], ["终极技", "打爆「爆」后按 L", M.final]];
      rows.forEach(([k, key, name], i) => {
        const y = 170 + i * 74;
        sticker(ctx, 480, y, 760, 62, { fill: BLK, skew: 12, bw: 2, seed: 95 + i });
        ctx.fillStyle = "#cfc8e0"; ctx.font = `800 17px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(k, 510, y + 20);
        ctx.fillStyle = "#8a83a0"; ctx.font = `700 15px ${FONT}`; ctx.fillText(key, 510, y + 44);
        memeText(ctx, name, 720, y + 31, 30, i === 4 ? GOLD : "#fff", INK, FONT, "left");
      });
      ctx.fillStyle = "#cfc8e0"; ctx.font = `700 16px ${FONT}`; ctx.textAlign = "left";
      wrap(ctx, "攻击 J · 强攻 W/S/A/D+J · 跳 K · 蓄力重击 I(按住)· 空中攻击 空中+方向+J · 抓取 U 后按方向投掷 · 防御 空格。所有角色都能二段跳、翻滚、空中闪避、抓边、受身(落地/撞墙瞬间按空格)。", 490, 570, 720, 22);
    }
  }
}
