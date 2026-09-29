// 流量之路: climb the hot-search list from #7 to #1. Six rounds, the last one a 1v3 brawl.
import { sticker, badge, head, headSilhouette, ransom, p5bar, radial, halftone, jagPath, hash, memeText, Hits, FONT, INK, HOT, GOLD, RED, BLK, WHT } from "./ui.js";
import { Audio } from "../engine/audio.js";
import { ROSTER, CHARS } from "../data/chars/index.js";
import { STAGES, STAGE_ORDER } from "../data/stages.js";
import { LORE } from "../data/lore.js";
import { Danmaku } from "../render/danmaku.js";
import { MainMenu } from "./menu.js";
import { wrap } from "./select.js";

const HEAD = {
  chen: ["陈平", "发文", "德州"], zhang: ["张维为", "点评", "一百多个国家"], huxijin: ["胡锡进", "回应", "A股"],
  fengge: ["峰哥", "锐评", "压抑"], huchenfeng: ["户晨风", "追问", "手机"], mabaoguo: ["马保国", "喊话", "武德"], laoa: ["牢A", "揭秘", "斩杀线"],
};
const TEMPLATES = [
  (a, b) => `#${a[0]}${a[1]}${b[0]}:${b[2]}的问题很复杂#`,
  (a, b) => `#${b[0]}被${a[0]}打进斩杀线#`,
  (a, b) => `#${a[0]}和${b[0]}到底谁更懂${a[2]}#`,
  (a, b) => `#${b[0]}回应与${a[0]}的恩怨:这是好事#`,
  (a, b) => `#${a[0]}${b[0]}世纪大战 全网围观#`,
];
const ENDINGS = {
  chen: "陈平登顶热搜第一。发表完“美国人民水深火热”的获奖感言,他连夜飞回了德州。",
  zhang: "张维为登顶热搜第一。他表示这是他走访过的第一百零一个热搜,西方再一次被震撼了。",
  huxijin: "老胡登顶热搜第一。他宣布满仓加注,第二天A股跌破3000点。一方面这很遗憾,另一方面,老胡认为这是复杂的。",
  fengge: "峰哥登顶热搜第一。他表示“这是个好事儿啊”,随后宣布为了冲击珠峰,无限期退出互联网——第二天又开播了。",
  huchenfeng: "户晨风登顶热搜第一。他环顾全场:“都是安卓。”随后账号第N次被封,又第N+1次转世。",
  mabaoguo: "马保国登顶热搜第一。他说:“我大意了,没有闪——哦,这次闪了。”年轻人,耗子尾汁。",
  laoa: "牢A登顶热搜第一。庆功宴吃到一半,他扔下筷子——这次不是跑路,是去领奖。一人顶一个师。",
};

export class Classic {
  constructor(app, charId, level) {
    this.app = app; this.char = charId; this.level = level;
    const others = ROSTER.filter((c) => c !== charId);
    for (let i = others.length - 1; i > 0; i--) { const j = app.rng.int(0, i); [others[i], others[j]] = [others[j], others[i]]; }
    this.rounds = others.slice(0, 5).map((c, i) => ({ foes: [c], lv: Math.min(9, Math.max(1, level - 2 + i)) }));
    this.rounds.push({ foes: others.slice(0, 3), lv: Math.min(9, level + 1), brawl: true });
    this.i = 0; this.retries = 0; this.score = 0;
  }
  next() { this.app.go(new LadderScene(this.app, this)); }
  startRound() {
    const a = this.app, R = this.rounds[this.i];
    const home = STAGE_ORDER.find((s) => STAGES[s].owner === R.foes[0]) || STAGE_ORDER[this.i % STAGE_ORDER.length];
    const players = [{ def: CHARS[this.char], source: a.source(a.isTouch ? "touch" : "k1"), cpu: 0 }];
    // a connected gamepad drives P1 if the keyboard isn't in use
    const g = navigator.getGamepads ? [...navigator.getGamepads()].findIndex((x) => x && x.connected) : -1;
    if (g >= 0 && !a.isTouch) players[0].source = mergeSources(a.source("k1"), a.source("g" + g));
    for (const f of R.foes) players.push({ def: CHARS[f], source: a.cpu(R.lv), cpu: R.lv });
    a.startFight({ stage: STAGES[R.brawl ? "studio" : home], players, rules: { stocks: R.brawl ? 2 : 2, time: 0, items: true, hazards: true }, seed: a.rng.int(1, 1e9), classic: true });
  }
  afterMatch(world) {
    const me = world.fighters[0];
    const won = world.winner === me;
    if (won) { this.score += 1000 + me.stocks * 500 - Math.round(me.stats.dmgTaken) + me.stats.kos * 200; this.i++; }
    else this.retries++;
    if (won && this.i >= this.rounds.length) this.app.go(new EndingScene(this.app, this));
    else this.app.go(new LadderScene(this.app, this, won ? null : "lost"));
  }
}

function mergeSources(a, b) {
  return {
    kind: "kb",
    read(me) {
      const p = a.read(me), q = b.read(me);
      if (Math.abs(q.mx) > Math.abs(p.mx)) p.mx = q.mx;
      if (Math.abs(q.my) > Math.abs(p.my)) p.my = q.my;
      p.dash = p.dash || q.dash; p.dropTap = p.dropTap || q.dropTap; p.upTap = p.upTap || q.upTap;
      p.cx = q.cx; p.cy = q.cy; p.cPress = q.cPress;
      p.flick = Math.min(p.flick, q.flick);
      for (const k in p.p) { p[k] = p[k] || q[k]; p.p[k] = p.p[k] || q.p[k]; }
      p.pause = p.pause || q.pause;
      return p;
    },
  };
}

class LadderScene {
  constructor(app, run, state) { this.app = app; this.run = run; this.state = state; this.t = 0; this.hits = new Hits(); this.dm = new Danmaku(app.settings.danmaku !== false); this.sel = 0; }
  enter() { Audio.music("select"); if (this.state === "lost") Audio.say("上不了热搜了"); }
  update() {
    this.t++; this.dm.step();
    if (this.t === 20) this.dm.burst(this.state === "lost" ? ["就这?", "下饭", "再来", "寄"] : ["冲!", "热搜预定", "上啊", "有点东西"], 4);
    for (const e of this.app.menu.poll()) {
      if (e.dir[0] && this.state === "lost") { this.sel = 1 - this.sel; Audio.sfx("tick"); }
      if ((e.ok || e.start) && this.t > 30) this.go();
      if (e.back) { Audio.sfx("back"); this.app.go(new MainMenu(this.app)); }
    }
  }
  click(x, y) { const r = this.hits.at(x, y); if (!r || this.t < 20) return; if (r.id === "quit") this.app.go(new MainMenu(this.app)); else this.go(); }
  go() { Audio.sfx("ok"); if (this.state === "lost" && this.sel === 1) { this.app.go(new MainMenu(this.app)); return; } this.run.startRound(); }
  draw(ctx) {
    const t = this.t, run = this.run, R = run.rounds[run.i];
    this.hits.begin();
    ctx.save(); ctx.translate(30, 44); ctx.rotate(-0.05); ransom(ctx, "流量之路", 0, 0, 38, { seed: 91, align: "left" }); ctx.restore();
    // ladder: rank 7 (bottom) to 1 (top)
    for (let r = 1; r <= 7; r++) {
      const y = 90 + (r - 1) * 76, x = 60 + (7 - r) * 10;
      const myRank = 7 - run.i;
      const here = r === myRank;
      sticker(ctx, x, y, 470, 62, { fill: here ? WHT : BLK, border: here ? BLK : WHT, skew: 14, bw: here ? 5 : 2, back: here ? RED : null, seed: 110 + r });
      ransom(ctx, String(r), x + 40, y + 32, 34, { seed: 120 + r });
      ctx.fillStyle = here ? BLK : WHT; ctx.font = `800 19px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      const label = r === 1 ? "梗王(最终战:1打3)" : r === myRank ? "你在这里" : r < myRank ? "????" : "已登顶";
      ctx.fillText(label, x + 80, y + 32);
      if (here) head(ctx, run.char, x + 420, y + 66, 80, this.state === "lost" ? 3 : 4);
      if (r === 1) badge(ctx, "爆", x + 440, y + 30, 30);
    }
    // next match card
    const a = HEAD[run.char], b = HEAD[R.foes[0]];
    const headline = TEMPLATES[(run.i + run.char.length) % TEMPLATES.length](a, b);
    sticker(ctx, 600, 100, 640, 440, { fill: BLK, skew: 24, bw: 4, seed: 131 });
    ctx.save(); jagPath(ctx, 600, 100, 640, 440, 131, 7, 24); ctx.clip(); radial(ctx, 920, 360, 700, 16, "rgba(232,20,28,0.4)", t * 0.004); ctx.restore();
    ransom(ctx, this.state === "lost" ? "上不了热搜了" : R.brawl ? "热搜争夺战" : `第${run.i + 1}战`, 920, 152, 42, { seed: 140 + run.i, jitter: 0.6, t });
    head(ctx, run.char, 760, 440, 220, 1);
    R.foes.forEach((f, i) => head(ctx, f, 1080 + (i - (R.foes.length - 1) / 2) * 90, 440 - i * 6, R.foes.length > 1 ? 150 : 220, 1, true));
    ctx.save(); ctx.translate(920, 330); ctx.rotate(-0.1); ransom(ctx, "VS", 0, 0, 70, { seed: 3, jitter: 1, t }); ctx.restore();
    ctx.fillStyle = "#fff"; ctx.font = `800 20px ${FONT}`; ctx.textAlign = "center"; ctx.fillText(headline, 920, 500, 600);
    ctx.fillStyle = "#cfc8e0"; ctx.font = `700 16px ${FONT}`; ctx.fillText(`对手 Lv${R.lv} · 各 2 条命 · 当前得分 ${run.score}`, 920, 528);
    const btns = this.state === "lost" ? [["go", "再冲一次"], ["quit", "放弃"]] : [["go", "开打!"]];
    btns.forEach(([id, label], i) => {
      const x = 760 + i * 220 + (btns.length === 1 ? 110 : 0), y = 580, sel = i === this.sel;
      p5bar(ctx, x, y, 200, 60, label, sel, t, { size: 28, back: RED });
      this.hits.add(id, x, y, 200, 60);
    });
    this.dm.draw(ctx, 1280, FONT);
  }
}

class EndingScene {
  constructor(app, run) { this.app = app; this.run = run; this.t = 0; this.dm = new Danmaku(true); this.hits = new Hits(); }
  enter() { Audio.music("results"); Audio.say(CHARS[this.run.char].name + ",热搜第一!", this.run.char); }
  update() {
    this.t++; this.dm.step();
    if (this.t % 16 === 0) this.dm.burst(["梗王!!!", "热搜第一", "赢麻了", "遥遥领先", "名场面", "爷青结", "这就是顶流", "666666"], 2);
    for (const e of this.app.menu.poll()) if ((e.ok || e.back || e.start) && this.t > 90) this.app.go(new MainMenu(this.app));
  }
  click() { if (this.t > 60) this.app.go(new MainMenu(this.app)); }
  draw(ctx) {
    const t = this.t, id = this.run.char, d = CHARS[id];
    const k = Math.min(1, t / 30);
    sticker(ctx, 90, 70, 1100, 580, { fill: BLK, skew: 60, bw: 7, seed: 151 });
    ctx.save(); jagPath(ctx, 90, 70, 1100, 580, 151, 12, 60); ctx.clip(); radial(ctx, 380, 360, 900, 20, RED, t * 0.005, 0.45); ctx.restore();
    head(ctx, id, 380, 560, 380 * k, 4);
    // crown
    ctx.save(); ctx.translate(380, 170 + Math.sin(t * 0.1) * 6); ctx.rotate(-0.1);
    ctx.fillStyle = GOLD; ctx.strokeStyle = INK; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-90, 40); ctx.lineTo(-100, -30); ctx.lineTo(-45, 10); ctx.lineTo(0, -50); ctx.lineTo(45, 10); ctx.lineTo(100, -30); ctx.lineTo(90, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ransom(ctx, "热搜第一", 850, 150, 60, { seed: 161, jitter: 1, t });
    ctx.fillStyle = "#fff"; ctx.font = `800 24px ${FONT}`; ctx.textAlign = "left";
    wrap(ctx, ENDINGS[id], 620, 240, 520, 36);
    memeText(ctx, `总分 ${this.run.score}  ·  续关 ${this.run.retries} 次`, 850, 560, 30, GOLD, INK, FONT);
    this.dm.draw(ctx, 1280, FONT);
  }
}
