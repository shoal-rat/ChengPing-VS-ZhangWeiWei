// Projectiles, items and stage hazards.
import { OUTLINE, rrect, drawMelon } from "./fighterDraw.js";
import { memeText } from "./fx.js";

const TAU = Math.PI * 2;
const HELP = { rrect, memeText, OUTLINE, drawMelon, TAU };

export function drawProjectile(ctx, p, font, t) {
  ctx.save();
  switch (p.kind) {
    case "ineq": {
      const c = p.data.c || 0;
      ctx.translate(p.x, p.y);
      const s = 20 + 26 * c;
      if (c > 0.5) {
        // chalk banner: ¥2000 > $3000
        const w = 150 + 160 * (c - 0.5);
        ctx.rotate(Math.sin(t * 0.3) * 0.03);
        rrect(ctx, -w / 2, -s * 0.7, w, s * 1.4, 10, "#264d3a", OUTLINE);
        ctx.strokeStyle = "#e9f1ea"; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2 + 5, -s * 0.7 + 5, w - 10, s * 1.4 - 10);
        ctx.fillStyle = "#f3f6f0"; ctx.font = `900 ${s * 0.72}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("¥2000>$3000", 0, 2, w - 16);
      } else {
        ctx.scale(p.dir, 1);
        memeText(ctx, ">", 0, 0, s * 1.8, "#ffffff", "#264d3a", font);
      }
      // chalk dust trail
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#fff";
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.arc(-p.vx * i * 1.8 - p.dir * s * 0.4, Math.sin(t * 0.7 + i) * 6, 5 - i * 0.8, 0, TAU); ctx.fill(); }
      break;
    }
    case "boomer": {
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.lineWidth = 11; ctx.strokeStyle = OUTLINE; ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(16, 0); ctx.lineTo(-16, 18); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = "#ffe7a3"; ctx.stroke();
      break;
    }
    case "fsIneq": case "fsBeam": {
      const [x0, y0, x1, y1] = p.rect;
      const k = Math.min(1, p.life / 12);
      const h = (y1 - y0);
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, "rgba(255,240,150,0)"); g.addColorStop(0.3, "#ffe680"); g.addColorStop(0.5, "#ffffff"); g.addColorStop(0.7, "#ffe680"); g.addColorStop(1, "rgba(255,240,150,0)");
      ctx.globalAlpha = k;
      ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, h);
      if (p.kind === "fsIneq") {
        ctx.font = `900 ${h * 0.36}px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(200,60,20,0.85)";
        const dir = p.data.dir;
        for (let i = 0; i < 6; i++) {
          const x = (dir > 0 ? x0 : x1) + dir * (200 + i * 380 - (t * 18 % 380));
          if (x > x0 && x < x1) ctx.fillText(i % 2 ? "¥2000" : ">$3000", x, (y0 + y1) / 2);
        }
      }
      break;
    }
    case "cart": {
      ctx.translate(p.x, p.y); ctx.scale(p.dir, 1);
      rrect(ctx, -44, -34, 80, 44, 6, "#cfd8e2", OUTLINE);
      ctx.strokeStyle = "#8a96a3"; ctx.lineWidth = 2;
      for (let x = -38; x < 34; x += 10) { ctx.beginPath(); ctx.moveTo(x, -30); ctx.lineTo(x, 6); ctx.stroke(); }
      rrect(ctx, -40, -58, 22, 26, 3, "#e84a3c", OUTLINE); rrect(ctx, -14, -52, 26, 20, 3, "#ffd23c", OUTLINE); rrect(ctx, 14, -62, 18, 30, 3, "#3fa2ff", OUTLINE);
      ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(-30, 22, 9, 0, TAU); ctx.arc(26, 22, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-44, -34); ctx.lineTo(-60, -52); ctx.stroke();
      break;
    }
    case "boom": {
      const k = p.age / 7;
      ctx.globalAlpha = 1 - k * 0.6;
      ctx.fillStyle = "#ffcf4a"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.7), 0, TAU); ctx.fill();
      ctx.fillStyle = "#ff6a2a"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.35 + k * 0.5), 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.25 * (1 - k), 0, TAU); ctx.fill();
      break;
    }
    case "item:brick": ctx.translate(p.x, p.y); ctx.rotate(p.rot); drawBrick(ctx); break;
    case "item:melon": ctx.translate(p.x, p.y); ctx.rotate(p.rot); drawMelon(ctx, 0, 0, 18); break;
    case "item:keyboard": ctx.translate(p.x, p.y); ctx.rotate(p.rot); drawKeyboard(ctx); break;
    default: {
      if (p.draw) { p.draw(ctx, p, font, t, HELP); break; }
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawItem(ctx, it, font, t) {
  if (it.holder) return;
  ctx.save();
  const bob = it.grounded ? 0 : 0;
  ctx.translate(it.x, it.y + bob);
  // blink before despawn
  if (it.life < 180 && (t >> 3) % 2) ctx.globalAlpha = 0.5;
  switch (it.type) {
    case "brick": ctx.translate(0, -9); ctx.rotate(it.rot); drawBrick(ctx); break;
    case "melon": ctx.translate(0, -18); drawMelon(ctx, 0, 0, 18); if (it.fuse > 0) { ctx.fillStyle = "#ff3a2a"; ctx.globalAlpha = (t >> 2) % 2 ? 1 : 0.3; ctx.beginPath(); ctx.arc(0, -22, 5, 0, TAU); ctx.fill(); } break;
    case "keyboard": ctx.translate(0, -8); ctx.rotate(Math.PI / 2); drawKeyboard(ctx); break;
    case "dumpling": {
      ctx.translate(0, -12);
      rrect(ctx, -22, 4, 44, 10, 5, "#f2f2f2", OUTLINE);
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.ellipse(i * 13, 0, 9, 7, 0, Math.PI, 0); ctx.closePath();
        ctx.fillStyle = "#fffaf0"; ctx.fill(); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.stroke();
      }
      break;
    }
    case "crate": {
      ctx.translate(0, -24); ctx.rotate(it.rot * 0.2);
      rrect(ctx, -28, -24, 56, 48, 4, "#d9a86a", OUTLINE);
      ctx.fillStyle = "#b8864a"; ctx.fillRect(-28, -4, 56, 8);
      ctx.fillStyle = "#e84a3c"; ctx.font = `900 14px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("快递", 0, -14);
      ctx.fillStyle = "#fff"; ctx.fillRect(-14, 8, 28, 12); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.strokeRect(-14, 8, 28, 12);
      ctx.fillStyle = OUTLINE; for (let i = 0; i < 8; i++) ctx.fillRect(-12 + i * 3, 10, i % 3 ? 1 : 2, 8);
      break;
    }
    case "bao": {
      ctx.rotate(it.rot);
      const pulse = 1 + Math.sin(t * 0.25) * 0.06;
      ctx.scale(pulse, pulse);
      // rainbow glow
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
      g.addColorStop(0, "rgba(255,230,120,0.9)"); g.addColorStop(1, "rgba(255,80,60,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
      rrect(ctx, -30, -30, 60, 60, 14, "#ff2d2d", "#fff");
      ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; rrect(ctx, -34, -34, 68, 68, 16, null, OUTLINE);
      ctx.fillStyle = "#fff"; ctx.font = `900 42px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("爆", 0, 2);
      break;
    }
  }
  ctx.restore();
}

function drawBrick(ctx) {
  rrect(ctx, -16, -9, 32, 18, 2, "#c2553a", OUTLINE);
  ctx.strokeStyle = "rgba(60,20,10,0.5)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.moveTo(0, -9); ctx.lineTo(0, 0); ctx.moveTo(-8, 0); ctx.lineTo(-8, 9); ctx.moveTo(8, 0); ctx.lineTo(8, 9); ctx.stroke();
}
function drawKeyboard(ctx) {
  rrect(ctx, -30, -9, 60, 18, 3, "#2b2f3a", OUTLINE);
  ctx.fillStyle = "#cfd6e6";
  for (let x = -26; x < 24; x += 7) { ctx.fillRect(x, -6, 5, 5); ctx.fillRect(x, 1, 5, 5); }
}
