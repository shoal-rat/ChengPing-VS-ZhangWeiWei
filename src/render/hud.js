// In-match HUD, Persona style: jagged black cards with a red shard, portrait window,
// big white italic damage %, stocks, 斩杀线 tag and the 爆 badge.
import { IMG, DATA } from "../engine/assets.js";
import { OUTLINE } from "./fighterDraw.js";
import { memeText } from "./fx.js";
import { FONT, F_HY, INK, HOT, GOLD, PCOL, PNAME, CPUCOL, RED, BLK, WHT, pctColor } from "../ui/theme.js";
import { jagPath, ransom, hash, halftone, headSilhouette } from "../ui/ui.js";

export class HUD {
  constructor() { this.shake = new Map(); }
  onHit(f, dmg) { this.shake.set(f, Math.min(14, 4 + dmg * 0.6)); }

  draw(ctx, world, vw, vh, t) {
    const fs = world.fighters;
    const n = fs.length;
    const cw = 272, gap = 22;
    const total = n * cw + (n - 1) * gap;
    let x = (vw - total) / 2;
    const y = vh - 122;
    for (const f of fs) { this.card(ctx, f, x, y, cw, t, world); x += cw + gap; }
    if (world.rules.time) this.timer(ctx, world, vw);
  }

  card(ctx, f, x, y, w, t, world) {
    const col = f.cpu ? CPUCOL : PCOL[f.slot];
    const out = f.stocks <= 0;
    let sh = this.shake.get(f) || 0;
    if (sh > 0) this.shake.set(f, sh * 0.85 - 0.1);
    const jx = sh > 0.5 ? (Math.random() - 0.5) * sh : 0, jy = sh > 0.5 ? (Math.random() - 0.5) * sh : 0;
    const over = f.percent >= f.killLine && !f.dead;
    const seed = 500 + f.slot;
    ctx.save();
    ctx.translate(x, y);
    if (out) ctx.globalAlpha = 0.5;
    // red shard + black body
    ctx.fillStyle = over ? WHT : RED; jagPath(ctx, 8, 26, w, 90, seed + 1, 6, 18); ctx.fill();
    ctx.fillStyle = BLK; jagPath(ctx, 0, 20, w, 90, seed, 5, 18); ctx.fill();
    ctx.save(); jagPath(ctx, 0, 20, w, 90, seed, 5, 18); ctx.clip();
    ctx.fillStyle = col; ctx.fillRect(0, 20, w, 7);
    if (over) { ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.3); halftone(ctx, 0, 20, w, 90, RED, 9, 4, "right"); ctx.globalAlpha = out ? 0.5 : 1; }
    ctx.restore();
    ctx.strokeStyle = WHT; ctx.lineWidth = 3; jagPath(ctx, 0, 20, w, 90, seed, 5, 18); ctx.stroke();
    // portrait window
    const im = IMG["head_" + f.def.look.head], man = DATA.heads && DATA.heads[f.def.look.head];
    ctx.save();
    ctx.beginPath(); ctx.moveTo(14, -6); ctx.lineTo(108, -14); ctx.lineTo(100, 104); ctx.lineTo(4, 110); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = WHT; ctx.stroke(); ctx.clip();
    halftone(ctx, 0, -20, 120, 140, "rgba(0,0,0,0.25)", 8, 3, "down");
    if (im && man) {
      const ex = out ? 3 : f.state === "hitstun" || f.state === "tumble" ? 2 : over ? 2 : f.fsReady ? 1 : 0;
      const s = 96 / man.h;
      ctx.drawImage(im, ex * man.cell, 0, man.cell, man.cell, 58 - man.cell / 2 * s, 106 - man.bottom * s, man.cell * s, man.cell * s);
    }
    ctx.restore();
    // name
    ctx.fillStyle = WHT; ctx.font = `900 15px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillStyle = col; ctx.fillRect(116, 32, 38, 18);
    ctx.fillStyle = BLK; ctx.textAlign = "center"; ctx.fillText(f.cpu ? "CPU" : PNAME[f.slot], 135, 42);
    ctx.fillStyle = WHT; ctx.textAlign = "left"; ctx.font = `900 17px ${FONT}`; ctx.fillText(f.def.name, 160, 42);
    if (!out) {
      const shown = f.dead ? 0 : f.percent;
      const str = Math.floor(shown).toString();
      ctx.save();
      ctx.translate(236 + jx, 80 + jy);
      ctx.transform(1, 0, -0.2, 1, 0, 0);
      bigNum(ctx, str, 0, 0, 52, pctColor(shown));
      bigNum(ctx, "%", 8, 10, 24, pctColor(shown), "left");
      ctx.restore();
      if (world.rules.stocks) {
        const st = f.stocks;
        if (st <= 5) for (let i = 0; i < st; i++) this.stockIcon(ctx, f, 124 + i * 21, 98);
        else { this.stockIcon(ctx, f, 124, 98); ctx.font = `900 16px ${FONT}`; ctx.fillStyle = WHT; ctx.fillText("×" + st, 138, 98); }
      }
      // kill line meter
      const k = Math.min(1, f.percent / f.killLine);
      ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(118, 60, 64, 6);
      ctx.fillStyle = over ? RED : k > 0.8 ? "#ff9a3c" : WHT; ctx.fillRect(118, 60, 64 * k, 6);
      ctx.font = `800 11px ${FONT}`; ctx.fillStyle = over ? "#ffb0b0" : "#bbb"; ctx.textAlign = "left";
      ctx.fillText(over ? "斩杀线内!" : `斩杀线 ${f.killLine}%`, 118, 76);
      if (over) { ctx.save(); ctx.translate(w - 40, 16); ctx.rotate(0.12 + Math.sin(t * 0.25) * 0.04); ransom(ctx, "斩杀线", 0, 0, 17, { seed: 12, styles: [{ bg: RED, fg: WHT, font: FONT }, { bg: WHT, fg: RED, font: F_HY }, { bg: BLK, fg: WHT, font: FONT }] }); ctx.restore(); }
      if (f.fsReady) {
        ctx.save(); ctx.translate(-4, 6); ctx.rotate(-0.25);
        const p = 1 + Math.sin(t * 0.3) * 0.1; ctx.scale(p, p);
        ctx.fillStyle = BLK; jagPath(ctx, -15, -15, 34, 34, 9, 3, 6); ctx.fill();
        ctx.fillStyle = RED; jagPath(ctx, -18, -18, 34, 34, 8, 3, 6); ctx.fill();
        ctx.fillStyle = WHT; ctx.font = `900 22px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("爆", -1, 0);
        ctx.restore();
      }
    } else {
      ctx.save(); ctx.translate(200, 70); ctx.rotate(-0.1);
      ransom(ctx, "已寄", 0, 0, 34, { seed: 44 });
      ctx.restore();
    }
    ctx.restore();
  }

  stockIcon(ctx, f, x, y) {
    const im = IMG["head_" + f.def.look.head], man = DATA.heads && DATA.heads[f.def.look.head];
    if (!im || !man) { ctx.fillStyle = WHT; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); return; }
    const s = 19 / man.h;
    ctx.drawImage(im, 0, 0, man.cell, man.cell, x - man.cell / 2 * s, y + 9 - man.bottom * s, man.cell * s, man.cell * s);
  }

  timer(ctx, world, vw) {
    const s = Math.ceil(world.timeLeft / 60);
    const m = Math.floor(s / 60), r = s % 60;
    const str = `${m}:${r.toString().padStart(2, "0")}`;
    ctx.save(); ctx.translate(vw / 2, 44);
    ctx.fillStyle = BLK; jagPath(ctx, -70, -26, 140, 52, 3, 4, 14); ctx.fill();
    bigNum(ctx, str, 0, 2, 38, s <= 10 ? RED : WHT, "center");
    ctx.restore();
  }
}

// P5-style number: white italic, black outline, red drop.
export function bigNum(ctx, str, x, y, size, fill = WHT, align = "right") {
  ctx.font = `900 ${size}px ${F_HY}`;
  ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.fillStyle = RED; ctx.fillText(str, x + size * 0.08, y + size * 0.08);
  ctx.lineWidth = size * 0.2; ctx.strokeStyle = BLK; ctx.strokeText(str, x, y);
  ctx.fillStyle = fill; ctx.fillText(str, x, y);
}

export function stamp(ctx, text, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ransom(ctx, text, 0, 0, size, { seed: hash(text), styles: [{ bg: RED, fg: WHT, font: FONT }, { bg: WHT, fg: RED, font: F_HY }, { bg: BLK, fg: WHT, font: FONT }] });
  ctx.restore();
}
