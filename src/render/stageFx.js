// Stage weather / hazards drawn over the world (front) or over the screen (overlay).
import { memeText } from "./fx.js";
import { FONT } from "../ui/theme.js";

const rain = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.8 }));
const snow = Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), p: Math.random() * 6 }));

export function drawStageFront(ctx, stage, world, t) {
  if (stage.id === "seattle") {
    // the kill line glowing below the stage
    const B = stage.blast;
    const y = B.bottom - 120;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 0.08);
    ctx.strokeStyle = "#ff2030"; ctx.lineWidth = 10; ctx.setLineDash([60, 24]);
    ctx.beginPath(); ctx.moveTo(B.left, y); ctx.lineTo(B.right, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    for (let x = -1500; x <= 1500; x += 750) memeText(ctx, "斩 杀 线", x, y - 44, 44, "#ff4050", "#2a0008", FONT);
    ctx.restore();
  }
}

export function drawStageOverlay(ctx, stage, world, vw, vh, t, cam) {
  const S = stage.state;
  if (stage.id === "seattle") {
    const heavy = S.ice > 0;
    ctx.strokeStyle = heavy ? "rgba(210,240,255,0.55)" : "rgba(180,210,240,0.35)"; ctx.lineWidth = heavy ? 2 : 1.4;
    ctx.beginPath();
    for (const r of rain) {
      const x = ((r.x * vw + t * 3 * r.s) % (vw + 40)) - 20, y = ((r.y * vh + t * 16 * r.s) % (vh + 40)) - 20;
      ctx.moveTo(x, y); ctx.lineTo(x - 5 * r.s, y + 18 * r.s);
    }
    ctx.stroke();
    if (heavy) { ctx.fillStyle = "rgba(160,210,255,0.08)"; ctx.fillRect(0, 0, vw, vh); }
  }
  if (stage.id === "texas") {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (const s of snow) {
      const x = ((s.x * vw + Math.sin(t * 0.02 + s.p) * 30 + t * 0.6) % vw), y = ((s.y * vh + t * 1.4 * s.s) % vh);
      ctx.beginPath(); ctx.arc(x, y, 2 * s.s, 0, 7); ctx.fill();
    }
    if (S.dark > 0) {
      const k = S.dark > 240 ? (260 - S.dark) / 20 : S.dark < 20 ? S.dark / 20 : 1;
      const flicker = S.dark > 230 && (t >> 1) % 2 ? 0.4 : 1;
      ctx.fillStyle = `rgba(3,4,12,${0.86 * k * flicker})`; ctx.fillRect(0, 0, vw, vh);
      // fighters' eyes glint in the dark
      for (const f of world.fighters) {
        if (f.dead) continue;
        const [hx, hy] = f.bone("hc");
        const [sx, sy] = cam.toScreen(hx + 8 * f.facing, hy - 4);
        ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`;
        ctx.beginPath(); ctx.arc(sx - 5, sy, 3, 0, 7); ctx.arc(sx + 6, sy, 3, 0, 7); ctx.fill();
      }
    }
  }
  if (stage.id === "sam" && S.warn > 0) {
    const x = S.dir > 0 ? 70 : vw - 70;
    if ((t >> 3) % 2) memeText(ctx, S.dir > 0 ? "→ 购物车!" : "购物车! ←", x + (S.dir > 0 ? 60 : -60), vh * 0.62, 30, "#ffe066", "#1c1426", FONT);
  }
}
