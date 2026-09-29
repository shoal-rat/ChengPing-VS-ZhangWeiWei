// Stage rendering: painted backdrop (parallax) + code-drawn floating island & platforms
// so collision always matches what you see.
import { IMG } from "../engine/assets.js";
import { OUTLINE, rrect } from "./fighterDraw.js";

const PAL = {
  studio: { top: "#3a4a8c", top2: "#6d86d8", side: "#1d2450", edge: "#9fd0ff", plat: "#2c3563", platTop: "#7fb2ff", sky: ["#0d1030", "#28235a"] },
  arena: { top: "#b2342c", top2: "#e0574a", side: "#5a1a18", edge: "#ffd36b", plat: "#6a2320", platTop: "#ffcf6b", sky: ["#f6b36a", "#8ab8e8"] },
  stock: { top: "#243044", top2: "#3b4c6a", side: "#121a28", edge: "#ff4c4c", plat: "#2a3446", platTop: "#ff5a4a", sky: ["#070b16", "#141e36"] },
  seattle: { top: "#3d4a57", top2: "#5c6d7d", side: "#1b232b", edge: "#9ad6ff", plat: "#39434e", platTop: "#a8c7dd", sky: ["#0b1220", "#26344a"] },
  texas: { top: "#6d5a4a", top2: "#e8eef5", side: "#2e241c", edge: "#ffffff", plat: "#4a3a2e", platTop: "#f4f7fb", sky: ["#0a0d1e", "#232a4a"] },
  sam: { top: "#2f6fb0", top2: "#5aa0e0", side: "#163a60", edge: "#ffe36b", plat: "#6b7784", platTop: "#dfe7ee", sky: ["#dde9f5", "#f5f8fb"] },
};

export function stagePalette(id) { return PAL[id] || PAL.studio; }

export function drawBackdrop(ctx, stage, cam, vw, vh, t) {
  const P = stagePalette(stage.id);
  const img = IMG["stage_" + stage.id];
  const v = cam.cur;
  if (img) {
    // cover the screen, with gentle parallax against the camera
    const base = Math.max(vw / img.width, vh / img.height) * 1.18;
    const s = base * (0.94 + v.z * 0.12);
    const iw = img.width * s, ih = img.height * s;
    const px = -v.x * 0.05 * v.z, py = -(v.y + 250) * 0.05 * v.z;
    const cx = vw / 2 + Math.max(-(iw - vw) / 2, Math.min((iw - vw) / 2, px));
    const cy = vh / 2 + Math.max(-(ih - vh) / 2, Math.min((ih - vh) / 2, py));
    ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
  }
}

export function drawStage(ctx, stage, world, t) {
  const P = stagePalette(stage.id);
  for (const p of stage.plats) {
    if (p.solid) island(ctx, p, P, stage, t);
    else platform(ctx, p, P, stage, t);
  }
}

function island(ctx, p, P, stage, t) {
  const x1 = p.x1, x2 = p.x2, y = p.y, d = p.depth;
  const w = x2 - x1;
  // underside: tapered floating island
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.lineTo(x2, y + d * 0.35);
  ctx.quadraticCurveTo(x2 - w * 0.05, y + d * 0.9, x2 - w * 0.22, y + d * 1.25);
  ctx.quadraticCurveTo(x1 + w * 0.5, y + d * 2.4, x1 + w * 0.22, y + d * 1.25);
  ctx.quadraticCurveTo(x1 + w * 0.05, y + d * 0.9, x1, y + d * 0.35);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + d * 2.2);
  g.addColorStop(0, P.side); g.addColorStop(1, "rgba(0,0,0,0.0)");
  ctx.fillStyle = P.side; ctx.fill();
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // stage-specific band
  ctx.save(); ctx.clip();
  if (stage.id === "studio") {
    for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 2 ? "rgba(120,170,255,0.18)" : "rgba(255,255,255,0.05)"; ctx.fillRect(x1 + i * w / 18, y + 30, w / 36, d); }
    ctx.fillStyle = "rgba(80,190,255,0.7)"; ctx.fillRect(x1, y + 36, w, 4);
  } else if (stage.id === "arena") {
    ctx.fillStyle = "#7a1e1a"; ctx.fillRect(x1, y + 26, w, 18);
    ctx.fillStyle = "#ffd36b"; for (let x = x1 + 30; x < x2; x += 90) { ctx.beginPath(); ctx.arc(x, y + 35, 5, 0, 7); ctx.fill(); }
  } else if (stage.id === "stock") {
    ctx.fillStyle = "#0b1220"; ctx.fillRect(x1, y + 24, w, 36);
    ctx.font = "bold 22px monospace"; ctx.fillStyle = "#ff4c4c";
    const S = stage.state;
    const txt = `上证指数 ${S.index || 3000}  ▲▼  老胡持仓  ${S.index && S.index < 3000 ? "被套" : "盈利"}   `;
    const off = (t * 2) % 600;
    for (let x = x1 - off; x < x2; x += 600) ctx.fillText(txt, x, y + 50);
  } else if (stage.id === "sam") {
    ctx.fillStyle = "#e84a3c"; ctx.fillRect(x1, y + 26, w, 14);
    ctx.fillStyle = "#fff"; ctx.font = "900 13px sans-serif";
    for (let x = x1 + 40; x < x2; x += 220) ctx.fillText("MEMBER'S MARK", x, y + 37);
  } else if (stage.id === "texas") {
    ctx.fillStyle = "rgba(255,255,255,0.18)"; for (let x = x1; x < x2; x += 60) ctx.fillRect(x, y + 20, 30, 6);
  }
  ctx.restore();
  // walkable top surface
  ctx.beginPath();
  rrectPath(ctx, x1 - 6, y - 4, w + 12, 30, 10);
  const tg = ctx.createLinearGradient(0, y - 4, 0, y + 26);
  tg.addColorStop(0, P.top2); tg.addColorStop(1, P.top);
  ctx.fillStyle = tg; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = OUTLINE; ctx.stroke();
  // edge highlight
  ctx.strokeStyle = P.edge; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x1 + 6, y + 1); ctx.lineTo(x2 - 6, y + 1); ctx.stroke();
  if (p.ice) {
    ctx.fillStyle = "rgba(190,235,255,0.55)"; ctx.fillRect(x1, y - 3, w, 10);
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 2;
    for (let x = x1 + 20; x < x2; x += 70) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 25, y + 5); ctx.stroke(); }
  }
  if (stage.id === "texas") {
    // snow cap
    ctx.fillStyle = "#f6f9ff";
    ctx.beginPath(); ctx.moveTo(x1 - 6, y + 2);
    for (let x = x1 - 6; x <= x2 + 6; x += 40) ctx.quadraticCurveTo(x + 20, y - 12, x + 40, y + 2);
    ctx.lineTo(x2 + 6, y + 8); ctx.lineTo(x1 - 6, y + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; ctx.stroke();
  }
}

function platform(ctx, p, P, stage, t) {
  const x1 = p.x1, x2 = p.x2, y = p.y, w = x2 - x1;
  if (p.kind === "candle") {
    const col = p.green ? "#2fcf6a" : "#ff4a4a", dark = p.green ? "#16803e" : "#a82222";
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo((x1 + x2) / 2, y - 40); ctx.lineTo((x1 + x2) / 2, y + 260); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    rrect(ctx, x1, y, w, 150, 6, col, OUTLINE);
    ctx.fillStyle = dark; ctx.fillRect(x1 + w * 0.6, y + 3, w * 0.38, 145);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(x1 + 8, y + 6, w - 16, 5);
    return;
  }
  if (p.kind === "shelf") {
    rrect(ctx, x1, y, w, 18, 4, P.platTop, OUTLINE);
    ctx.fillStyle = "#6b7784"; ctx.fillRect(x1 + 10, y + 18, 8, 190); ctx.fillRect(x2 - 18, y + 18, 8, 190);
    const goods = ["#e84a3c", "#ffd23c", "#3fa2ff", "#4ac06a", "#ff8a3c"];
    for (let x = x1 + 24, i = 0; x < x2 - 30; x += 34, i++) rrect(ctx, x, y - 30, 26, 30, 4, goods[i % 5], OUTLINE);
    return;
  }
  if (p.kind === "roof") {
    ctx.fillStyle = "#5a3e32";
    ctx.beginPath(); ctx.moveTo(x1 - 20, y + 16); ctx.lineTo((x1 + x2) / 2, y - 30); ctx.lineTo(x2 + 20, y + 16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4; ctx.stroke();
    rrect(ctx, x1, y - 4, w, 14, 5, "#f4f7fb", OUTLINE);
    return;
  }
  // default floating slab
  ctx.beginPath(); rrectPath(ctx, x1, y - 4, w, 20, 8);
  ctx.fillStyle = P.plat; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = OUTLINE; ctx.stroke();
  ctx.fillStyle = P.platTop; ctx.fillRect(x1 + 6, y - 2, w - 12, 5);
}

function rrectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
