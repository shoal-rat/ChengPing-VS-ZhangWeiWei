// Pause-menu move list for one character.
import { sticker, head, memeText, FONT, INK, HOT, GOLD } from "./ui.js";
import { LORE } from "../data/lore.js";
import { wrap } from "./select.js";

export class MovesOverlay {
  constructor(app, def, onClose) { this.app = app; this.def = def; this.onClose = onClose; this.t = 0; }
  update() { this.t++; for (const e of this.app.menu.poll()) if (e.ok || e.back || e.start) this.onClose(); }
  click() { this.onClose(); }
  draw(ctx) {
    const d = this.def, L = LORE[d.id];
    head(ctx, d.id, 220, 380, 260, 4);
    memeText(ctx, d.name + " 出招表", 220, 430, 40, "#fff", INK, FONT);
    const M = L.moves;
    const rows = [["L", "通常必杀", M.nspec], ["A/D + L", "侧必杀", M.sspec], ["W + L", "上必杀", M.uspec], ["S + L", "下必杀", M.dspec], ["打爆「爆」+ L", "终极技", M.final],
      ["J / 方向+J", "普攻 / 强攻", "近身压制"], ["I(按住)", "蓄力重击", "击飞主力"], ["U → 方向", "抓取与投掷", "破防"]];
    rows.forEach(([key, k, name], i) => {
      const y = 70 + i * 72;
      sticker(ctx, 440, y, 780, 60, { fill: "#241c38", skew: 12, shadow: 5, bw: 2 });
      ctx.fillStyle = "#8a83a0"; ctx.font = `800 16px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(key, 470, y + 30);
      ctx.fillStyle = "#cfc8e0"; ctx.font = `800 18px ${FONT}`; ctx.fillText(k, 640, y + 30);
      memeText(ctx, name, 800, y + 30, 28, i === 4 ? GOLD : "#fff", INK, FONT, "left");
    });
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = `700 15px ${FONT}`; ctx.textAlign = "center"; ctx.fillText("按任意键返回", 640, 700);
  }
}
