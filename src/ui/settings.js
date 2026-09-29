// Settings: volumes, voice, danmaku, shake, tap-jump, hitboxes.
import { sticker, ransom, p5bar, jagPath, memeText, Hits, FONT, INK, HOT, GOLD, RED, BLK, WHT } from "./ui.js";
import { smallBtn } from "./select.js";
import { Audio } from "../engine/audio.js";
import { MainMenu } from "./menu.js";
import { HelpOverlay } from "./help.js";

export class SettingsScene {
  constructor(app) { this.app = app; this.t = 0; this.sel = 0; this.hits = new Hits(); }
  rows() {
    const S = this.app.settings;
    return [
      ["music", "音乐音量", Math.round(S.music * 10), "slider"],
      ["sfx", "音效音量", Math.round(S.sfx * 10), "slider"],
      ["voice", "语音播报(浏览器朗读)", S.voice ? "开" : "关", "toggle"],
      ["danmaku", "弹幕", S.danmaku ? "开" : "关", "toggle"],
      ["dmDensity", "弹幕密度", ["", "低", "中", "高"][S.dmDensity ?? 2], "cycle"],
      ["shake", "屏幕震动", S.shake ? "开" : "关", "toggle"],
      ["tapJump", "键盘 W / ↑ 也能跳", S.tapJump ? "开" : "关", "toggle"],
      ["hitboxes", "训练场显示判定框", S.hitboxes ? "开" : "关", "toggle"],
      ["help", "操作说明", "查看", "action"],
      ["fullscreen", "全屏", "切换", "action"],
    ];
  }
  update() {
    this.t++;
    const rows = this.rows();
    for (const e of this.app.menu.poll()) {
      if (e.dir[1]) { this.sel = (this.sel + e.dir[1] + rows.length) % rows.length; Audio.sfx("tick"); }
      if (e.dir[0]) this.change(rows[this.sel], e.dir[0]);
      if (e.ok) this.change(rows[this.sel], 1);
      if (e.back) { Audio.sfx("back"); this.app.go(new MainMenu(this.app)); }
    }
  }
  change(row, d) {
    const S = this.app.settings, [id, , , kind] = row;
    if (kind === "slider") { S[id] = Math.max(0, Math.min(1, Math.round((S[id] + d * 0.1) * 10) / 10)); Audio.setVolume(id, S[id]); }
    else if (kind === "toggle") { S[id] = !S[id]; if (id === "voice") Audio.settings.voice = S[id]; }
    else if (kind === "cycle") { S[id] = (((S[id] ?? 2) - 1 + d + 3) % 3) + 1; }
    else if (id === "help") { this.app.overlay = new HelpOverlay(this.app, () => { this.app.overlay = null; }); }
    else if (id === "fullscreen") { try { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); } catch (e) {} }
    this.app.saveSettings();
    Audio.sfx("tick");
  }
  click(x, y) {
    const r = this.hits.at(x, y);
    if (!r) return;
    if (r.id === "back") { this.app.go(new MainMenu(this.app)); return; }
    const [i, d] = r.id.split(":").map(Number);
    this.sel = i; this.change(this.rows()[i], d);
  }
  draw(ctx) {
    this.hits.begin();
    ctx.save(); ctx.translate(30, 46); ctx.rotate(-0.05); ransom(ctx, "设置", 0, 0, 40, { seed: 71, align: "left" }); ctx.restore();
    smallBtn(ctx, 1150, 14, "返回");
    this.hits.add("back", 1150, 14, 110, 44);
    this.rows().forEach(([id, label, val, kind], i) => {
      const x = 240, y = 100 + i * 64, sel = i === this.sel;
      p5bar(ctx, x + i * 6, y, 800, 52, label, sel, this.t, { size: 24, back: RED });
      if (kind === "slider") {
        for (let k = 0; k < 10; k++) { ctx.fillStyle = k < val ? RED : sel ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"; ctx.fillRect(x + 470 + k * 26 + i * 6, y + 14, 20, 24); }
        this.hits.add(`${i}:-1`, x + 400, y, 60, 52); this.hits.add(`${i}:1`, x + 740, y, 60, 52);
        memeText(ctx, "◀", x + 440, y + 26, 22, "#fff", INK, FONT); memeText(ctx, "▶", x + 755, y + 26, 22, "#fff", INK, FONT);
      } else {
        ransom(ctx, val, x + 700 + i * 6, y + 27, 26, { seed: val.length * 13 + i });
        this.hits.add(`${i}:1`, x, y, 800, 52);
      }
    });
  }
}
