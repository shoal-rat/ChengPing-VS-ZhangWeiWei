// 操作说明 overlay: keyboard / gamepad / touch, plus the three rules that matter.
import { sticker, ransom, p5bar, memeText, keycap, Hits, FONT, INK, HOT, GOLD, RED, BLK, WHT } from "./ui.js";
import { Audio } from "../engine/audio.js";

export class HelpOverlay {
  constructor(app, onClose) { this.app = app; this.onClose = onClose; this.t = 0; this.hits = new Hits(); this.page = app.isTouch ? 2 : 0; }
  update() {
    this.t++;
    for (const e of this.app.menu.poll()) {
      if (e.dir[0]) { this.page = (this.page + e.dir[0] + 3) % 3; Audio.sfx("tick"); }
      if (e.ok || e.back || e.alt || e.start) { Audio.sfx("back"); this.onClose(); }
    }
  }
  click(x, y) { const r = this.hits.at(x, y); if (r && r.id.startsWith("tab")) { this.page = +r.id.slice(3); Audio.sfx("tick"); } else this.onClose(); }
  draw(ctx) {
    this.hits.begin();
    ransom(ctx, "操作说明", 640, 58, 50, { seed: 81 });
    ["键盘", "手柄", "触屏"].forEach((s, i) => {
      const x = 380 + i * 180, sel = i === this.page;
      p5bar(ctx, x, 100, 160, 44, s, sel, this.t, { size: 24, back: RED });
      this.hits.add("tab" + i, x, 100, 160, 44);
    });
    const rows = [
      [["A", "D"], ["←", "→"], "左摇杆", "移动(双击=冲刺)"],
      [["K"], ["小键盘2 / ."], "X / Y", "跳跃(轻按=小跳,空中可二段跳)"],
      [["J"], ["小键盘1 / ,"], "A", "攻击(W/S/A/D+J=上/下/前强攻,空中=空中攻击)"],
      [["L"], ["小键盘3 / /"], "B", "必杀(W+L 上必杀·复活 / S+L 下必杀 / A·D+L 侧必杀)"],
      [["I"], ["小键盘5 / '"], "右摇杆", "蓄力重击(按住蓄力,W/S+I=上/下蓄力)"],
      [["空格"], ["小键盘0 / 右Shift"], "RT / LT", "防御(+方向=翻滚/闪避,空中=空中闪避)"],
      [["U"], ["小键盘4 / ;"], "RB / LB", "抓取(抓住后按方向投掷)"],
      [["S"], ["↓"], "下", "下蹲 / 空中快落 / 双击下穿平台"],
      [["O"], ["小键盘6 / ]"], "Back", "嘲讽(纯属嘲讽)"],
      [["Esc"], ["Backspace"], "Start", "暂停"],
    ];
    if (this.page < 2) {
      rows.forEach((r, i) => {
        const y = 170 + i * 40;
        let x = 180;
        if (this.page === 0) { for (const k of r[0]) x += keycap(ctx, k, x, y, 30) + 6; ctx.fillStyle = "#8a83a0"; ctx.font = `700 14px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("2P: " + r[1].join(" "), 330, y + 15); }
        else keycap(ctx, r[2], x, y, 30);
        ctx.fillStyle = "#fff"; ctx.font = `800 20px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(r[3], 520, y + 15);
      });
    } else {
      const lines = ["左半屏:虚拟摇杆(推到底=跑/快落,快速一推=冲刺)", "右半屏:攻击 / 必杀 / 跳跃 / 防御 / 抓取 五个键", "快速推摇杆的同时按攻击 = 蓄力重击", "右上角 ❚❚ 暂停", "建议横屏 + 全屏游玩"];
      lines.forEach((s, i) => { ctx.fillStyle = "#fff"; ctx.font = `800 22px ${FONT}`; ctx.textAlign = "left"; ctx.fillText(s, 200, 200 + i * 50); });
    }
    sticker(ctx, 160, 585, 960, 100, { fill: BLK, skew: 16, bw: 3, seed: 83 });
    ctx.fillStyle = GOLD; ctx.font = `900 20px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("规则:伤害%越高飞得越远,飞出屏幕外就寄一条命。", 200, 615);
    ctx.fillStyle = "#fff"; ctx.font = `700 17px ${FONT}`;
    ctx.fillText("血条上的「斩杀线」= 这个%往上,被重击就会被斩杀。进了斩杀线就躲着点。", 200, 645);
    ctx.fillText("打爆飘着的「爆」字热搜 → 按必杀放终极技;打爆快递箱 → 开箱效果归你。", 200, 670);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = `700 15px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("按任意键 / 点击 关闭", 640, 708);
  }
}
