// Results: the winner gloats, the losers get captioned, the crowd floods the chat.
import { sticker, badge, head, headSilhouette, ransom, p5bar, p5say, radial, halftone, jagPath, hash, memeText, Hits, FONT, INK, HOT, GOLD, RED, BLK, WHT } from "./ui.js";
import { PCOL, PNAME, CPUCOL } from "./theme.js";
import { Audio } from "../engine/audio.js";
import { LORE } from "../data/lore.js";
import { Danmaku } from "../render/danmaku.js";
import { SelectScene, wrap } from "./select.js";
import { MainMenu } from "./menu.js";
import { stamp } from "../render/hud.js";

export class ResultsScene {
  constructor(app, world, cfg) {
    this.app = app; this.w = world; this.cfg = cfg; this.t = 0; this.hits = new Hits(); this.sel = 0;
    this.rank = world.ranking || world.fighters;
    this.winner = this.rank[0];
    const L = LORE[this.winner.id];
    this.quote = L.win[app.rng.int(0, L.win.length - 1)];
    this.dm = new Danmaku(app.settings.danmaku !== false);
    this.dm.burst([`${this.winner.def.name}赢麻了`, "典", "哈哈哈哈哈", "这就是梗王", "666", "名场面", "下一把", "已截图", "绷不住了", `${this.winner.def.name}yyds`], 10);
  }
  enter() { Audio.music("results"); Audio.sfx("game"); setTimeout(() => Audio.say(this.winner.def.name + "胜。" + this.quote, this.winner.id), 400); }
  opts() { return [["again", "再来一局"], ["select", "换角色"], ["menu", "主菜单"]]; }
  update() {
    this.t++; this.dm.step();
    if (this.t % 40 === 0) this.dm.burst(["？？？", "这波我看懂了", "再来", "蚌埠住了", "急了"], 1);
    for (const e of this.app.menu.poll()) {
      if (e.dir[0]) { this.sel = (this.sel + e.dir[0] + 3) % 3; Audio.sfx("tick"); }
      if ((e.ok || e.start) && this.t > 40) this.act(this.opts()[this.sel][0]);
      if (e.back && this.t > 40) this.act("select");
    }
  }
  click(x, y) { const r = this.hits.at(x, y); if (r && this.t > 30) this.act(r.id); }
  act(id) {
    Audio.sfx("ok");
    const a = this.app, cfg = this.cfg;
    if (id === "again") {
      const S = cfg.sel;
      if (!S) { a.go(new MainMenu(a)); return; }
      const ps = cfg.players.map((p, i) => ({ def: p.def, source: S.players[i].type === "cpu" ? a.cpu(S.players[i].lv) : a.source(S.players[i].dev), cpu: p.cpu }));
      a.startFight({ ...cfg, players: ps, seed: a.rng.int(1, 1e9) });
    } else if (id === "select") a.go(new SelectScene(a, cfg.sel || null));
    else a.go(new MainMenu(a));
  }
  draw(ctx) {
    const t = this.t, W = this.winner;
    this.hits.begin();
    // winner: P5 all-out splash
    const k = Math.min(1, t / 16);
    ctx.save(); ctx.translate(-360 * (1 - k), 0);
    ctx.fillStyle = BLK; jagPath(ctx, 20, 70, 600, 600, 31, 14, 70); ctx.fill();
    ctx.save(); jagPath(ctx, 20, 70, 600, 600, 31, 14, 70); ctx.clip();
    radial(ctx, 300, 380, 800, 18, RED, t * 0.004, 0.45);
    halftone(ctx, 20, 440, 600, 240, "rgba(0,0,0,0.45)", 12, 5, "down");
    headSilhouette(ctx, W.id, 318, 596 + Math.sin(t * 0.05) * 4, 420, 4, BLK);
    head(ctx, W.id, 300, 580 + Math.sin(t * 0.05) * 4, 420, 4);
    ctx.restore();
    ctx.strokeStyle = WHT; ctx.lineWidth = 6; jagPath(ctx, 20, 70, 600, 600, 31, 14, 70); ctx.stroke();
    ctx.save(); ctx.translate(130, 150); ctx.rotate(-0.14); ransom(ctx, "胜", 0, 0, 90, { seed: 5, jitter: 1, t }); ctx.restore();
    ctx.save(); ctx.translate(300, 630); ctx.rotate(-0.04); ransom(ctx, W.def.name, 0, 0, 62, { seed: hash(W.id) }); ctx.restore();
    ctx.restore();
    // quote
    ctx.save(); ctx.globalAlpha = Math.min(1, Math.max(0, (t - 20) / 10));
    p5say(ctx, 520, 88, "「" + this.quote + "」", 26, { maxW: 600 });
    ctx.restore();
    // ranking
    this.rank.forEach((f, i) => {
      const y = 190 + i * 104, x = 640 + i * 10;
      const kk = Math.min(1, Math.max(0, (t - 30 - i * 8) / 12));
      ctx.save(); ctx.globalAlpha = kk; ctx.translate((1 - kk) * 200, 0);
      const col = f.cpu ? CPUCOL : PCOL[f.slot];
      sticker(ctx, x, y, 600, 88, { fill: i === 0 ? WHT : BLK, skew: 18, bw: 3, border: i === 0 ? BLK : WHT, band: col, bandH: 6, seed: 40 + i });
      ransom(ctx, String(i + 1), x + 42, y + 46, 46, { seed: 70 + i });
      head(ctx, f.id, x + 110, y + 86, 80, i === 0 ? 4 : 3);
      ctx.fillStyle = i === 0 ? BLK : WHT; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`${f.cpu ? "CPU" : PNAME[f.slot]} ${f.def.name}`, x + 160, y + 28);
      const s = f.stats;
      ctx.fillStyle = i === 0 ? "#444" : "#cfcfd6"; ctx.font = `700 15px ${FONT}`;
      ctx.fillText(`击落 ${s.kos}  ·  被击落 ${s.falls - s.sds}  ·  自杀 ${s.sds}  ·  输出 ${Math.round(s.dmgDealt)}%  ·  最大连击 ${s.maxCombo}`, x + 160, y + 56);
      if (i > 0) { ctx.fillStyle = "#ff9aa6"; ctx.font = `800 15px ${FONT}`; ctx.fillText(LORE[f.id].lose, x + 160, y + 78, 420); }
      ctx.restore();
    });
    // buttons
    this.opts().forEach(([id, label], i) => {
      const x = 660 + i * 200, y = 640, sel = i === this.sel;
      p5bar(ctx, x, y, 184, 56, label, sel, t, { size: 26, back: RED });
      this.hits.add(id, x, y, 184, 56);
    });
    this.dm.draw(ctx, 1280, FONT);
  }
}
