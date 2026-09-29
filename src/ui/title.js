// Title: ransom-note logo on a black slash, the cast with P5 silhouettes, today's hot list.
import { sticker, badge, head, headSilhouette, ransom, radial, halftone, jagPath, hash, memeText, FONT, F_HY, BLK, WHT, RED, GOLD } from "./ui.js";
import { Audio } from "../engine/audio.js";
import { kbAny } from "../engine/input.js";
import { MainMenu } from "./menu.js";
import { Danmaku } from "../render/danmaku.js";

const HOTLIST = [
  ["陈平不等式成立了", "爆"], ["美国斩杀线", "爆"], ["年轻人不讲武德", "沸"], ["你用什么手机", "热"],
  ["老胡又加仓了", "新"], ["这是个好事儿啊", "热"], ["中国人你要自信", "荐"],
];

export class TitleScene {
  constructor(app) { this.app = app; this.t = 0; this.dm = new Danmaku(true); this.started = false; }
  enter() { Audio.music("title"); }
  update() {
    this.t++;
    if (this.t % 45 === 1) this.dm.push([["前排", "梗王来了", "好家伙", "这阵容", "已三连", "爷青回", "今天谁是梗王", "我赌马保国被秒", "典", "来了来了"][(this.t / 45 | 0) % 10]]);
    this.dm.step();
    const ev = this.app.menu.poll();
    if (this.t > 30 && ev.some((e) => e.ok || e.start || e.back || e.alt || e.x)) this.start();
    if (kbAny() && this.t > 30) this.start();
  }
  click() { if (this.t > 20) this.start(); }
  start() {
    if (this.started) return;
    this.started = true;
    Audio.unlock(); Audio.sfx("ok"); Audio.say("梗王大乱斗");
    this.app.go(new MainMenu(this.app));
  }
  draw(ctx, W, H) {
    const t = this.t;
    this.dm.draw(ctx, W, FONT);
    // cast (silhouette offset behind each head)
    const order = ["huxijin", "fengge", "mabaoguo", "laoa", "huchenfeng"];
    order.forEach((id, i) => {
      const x = 330 + i * 150, y = 480 + Math.abs(i - 2) * 26 + Math.sin(t * 0.05 + i) * 5;
      const ex = (t / 90 | 0) % 7 === i ? 4 : 0;
      headSilhouette(ctx, id, x + 10, y + 8, 150, ex, BLK, x > 640);
      head(ctx, id, x, y, 150, ex, x > 640);
    });
    const bob = Math.sin(t * 0.06) * 6;
    headSilhouette(ctx, "chen", 208, 652 + bob, 300, 1, BLK, false);
    head(ctx, "chen", 190, 640 + bob, 300, 1, false);
    headSilhouette(ctx, "zhang", 1072, 652 - bob, 300, 1, BLK, true);
    head(ctx, "zhang", 1090, 640 - bob, 300, 1, true);
    // VS
    ctx.save(); ctx.translate(640, 610); ctx.rotate(-0.12);
    ransom(ctx, "VS", 0, 0, 84, { seed: 3, jitter: 1, t });
    ctx.restore();
    // black slash + ransom logo
    const pop = Math.min(1, t / 16);
    ctx.save();
    ctx.translate(640, 220); ctx.rotate(-0.06);
    ctx.fillStyle = RED; jagPath(ctx, -560 * pop + 16, -100 + 16, 1120 * pop, 210, 11, 10, 60); ctx.fill();
    ctx.fillStyle = BLK; jagPath(ctx, -560 * pop, -100, 1120 * pop, 210, 12, 10, 60); ctx.fill();
    ctx.strokeStyle = WHT; ctx.lineWidth = 5; ctx.stroke();
    if (t > 6) ransom(ctx, "梗王大乱斗", 0, -6, 128, { seed: 20, jitter: 0.6, t });
    ctx.save(); ctx.translate(0, 128);
    ctx.fillStyle = WHT; jagPath(ctx, -300, -22, 600, 44, 5, 3, 16); ctx.fill();
    ctx.fillStyle = BLK; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("MEME KINGS SMASH · 陈平 VS 张维为 · 重制", 0, 1);
    ctx.restore();
    ctx.restore();
    // hot list as a calling card
    ctx.save(); ctx.translate(1000, 34); ctx.rotate(0.03);
    ctx.globalAlpha = Math.min(1, Math.max(0, (t - 16) / 16));
    ctx.fillStyle = BLK; jagPath(ctx, 10, 10, 262, 268, 41, 5, 10); ctx.fill();
    ctx.fillStyle = WHT; jagPath(ctx, 0, 0, 262, 268, 42, 5, 10); ctx.fill();
    ctx.fillStyle = RED; jagPath(ctx, 8, 8, 246, 40, 43, 3, 8); ctx.fill();
    ransom(ctx, "今日热搜", 131, 29, 24, { seed: 9, rot: 0.18 });
    HOTLIST.forEach(([txt, b], i) => {
      const y = 70 + i * 29, k = Math.min(1, Math.max(0, (t - 26 - i * 4) / 8));
      ctx.globalAlpha = k;
      ctx.fillStyle = i < 3 ? RED : "#666"; ctx.font = `900 19px ${F_HY}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(String(i + 1), 18, y);
      ctx.fillStyle = BLK; ctx.font = `800 17px ${FONT}`; ctx.fillText(txt, 42, y);
      badge(ctx, b, 238, y, 20);
    });
    ctx.restore();
    // press start
    if ((t >> 5) % 2 === 0 || t < 40) {
      ctx.save(); ctx.translate(640, 690); ctx.rotate(-0.02);
      ctx.fillStyle = BLK; jagPath(ctx, -170, -24, 340, 48, 77, 4, 14); ctx.fill();
      ctx.fillStyle = WHT; ctx.font = `900 28px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.app.isTouch ? "点击屏幕开始" : "按任意键开始", 0, 1);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.font = `700 13px ${FONT}`; ctx.textAlign = "left";
    ctx.fillText("纯属恶搞 · 同人作品 · 人物均为公众人物的网络梗形象", 16, 712);
  }
}
