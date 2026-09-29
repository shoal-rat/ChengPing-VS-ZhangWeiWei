// Particles, hit sparks, speech bubbles, KO blasts. World-space unless noted.
import { OUTLINE, rrect } from "./fighterDraw.js";

const TAU = Math.PI * 2;
const EFF_COL = {
  hit: ["#fff7c2", "#ffd23c"], chalk: ["#ffffff", "#dfe8f0"], elec: ["#e8f6ff", "#57b8ff"], fire: ["#fff1a8", "#ff7a2a"],
  water: ["#e6fbff", "#3fb7ff"], ice: ["#f0fdff", "#8fe3ff"], money: ["#fff3e0", "#e8403a"], keys: ["#ffffff", "#9aa6c4"],
  beam: ["#ffffff", "#ffe066"], boom: ["#fff4c4", "#ff6a2a"], text: ["#ffffff", "#ffcf3a"], slash: ["#ffe2e2", "#ff2a3a"],
  gold: ["#fffbe0", "#ffc83a"], mud: ["#f3e2c2", "#8a6a3a"], psy: ["#f2e8ff", "#9a6aff"],
};

export class FX {
  constructor() { this.p = []; this.bubbles = new Map(); this.blasts = []; this.flash = 0; this.flashCol = "#fff"; }

  add(o) { this.p.push(o); return o; }

  spark(x, y, eff, size, dir = 1) {
    const [c1, c2] = EFF_COL[eff] || EFF_COL.hit;
    const n = 7 + Math.min(8, size | 0);
    const s = 18 + size * 3.2;
    this.add({ k: "burst", x, y, t: 0, T: 10 + Math.min(8, size * 0.5), s, c1, c2, n, rot: Math.random() * TAU });
    this.add({ k: "ring", x, y, t: 0, T: 14, r0: s * 0.3, r1: s * 1.5, c: c2, w: 5 });
    if (size > 10) this.add({ k: "ring", x, y, t: 0, T: 20, r0: s * 0.5, r1: s * 2.4, c: c1, w: 3 });
    // element debris
    const cnt = Math.min(14, 3 + size * 0.7) | 0;
    for (let i = 0; i < cnt; i++) {
      const a = Math.random() * TAU, sp = 3 + Math.random() * (4 + size * 0.4);
      this.add({ k: "bit", eff, x, y, vx: Math.cos(a) * sp + dir * 2, vy: Math.sin(a) * sp - 2, g: eff === "fire" ? -0.05 : 0.25,
        t: 0, T: 22 + Math.random() * 18, s: 3 + Math.random() * 4, c: Math.random() < 0.5 ? c1 : c2, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.4 });
    }
    if (eff === "elec") for (let i = 0; i < 3; i++) this.add({ k: "bolt", x, y, t: 0, T: 10, len: s * 1.6, a: Math.random() * TAU, c: c2 });
  }

  dust(x, y, n = 5, dir = 0, col = "#e8e2d8") {
    for (let i = 0; i < n; i++) {
      this.add({ k: "puff", x: x + (Math.random() - 0.5) * 20, y: y - 4, vx: dir * (1 + Math.random() * 2.5) + (Math.random() - 0.5) * 2, vy: -Math.random() * 1.5,
        t: 0, T: 24 + Math.random() * 14, r: 6 + Math.random() * 8, c: col });
    }
  }
  landRing(x, y, big) {
    this.add({ k: "flat", x, y, t: 0, T: 16, r0: 12, r1: big ? 90 : 55, c: "rgba(255,255,255,0.8)" });
    this.dust(x - 16, y, big ? 5 : 3, -1); this.dust(x + 16, y, big ? 5 : 3, 1);
  }
  trail(x, y, col) {
    this.add({ k: "puff", x, y, vx: 0, vy: 0, t: 0, T: 30, r: 12, c: col || "rgba(230,230,240,0.9)", grow: 1.6 });
  }
  streak(x, y, vx, vy, col) {
    this.add({ k: "streak", x, y, vx, vy, t: 0, T: 14, c: col });
  }
  text(x, y, str, o = {}) {
    this.add({ k: "text", x, y, str, t: 0, T: o.T || 60, size: o.size || 34, c: o.c || "#fff", c2: o.c2 || OUTLINE, vy: o.vy ?? -1.2, rot: o.rot ?? (Math.random() - 0.5) * 0.25, pop: o.pop ?? 1 });
  }
  say(f, text) {
    this.bubbles.set(f, { text, t: 0, T: 80 + text.length * 3 });
  }
  koBlast(x, y, side, col, stage) {
    this.blasts.push({ x, y, side, col, t: 0, T: 50 });
    this.flash = 6; this.flashCol = col;
  }

  step() {
    for (const q of this.p) {
      q.t++;
      if (q.vx != null) { q.x += q.vx; q.y += q.vy; }
      if (q.g) q.vy += q.g;
      if (q.k === "bit") { q.vx *= 0.97; q.rot += q.vr; }
      if (q.k === "puff") { q.vx *= 0.93; q.vy *= 0.93; }
      if (q.k === "text") q.y += q.vy * (1 - q.t / q.T);
    }
    this.p = this.p.filter((q) => q.t < q.T);
    for (const [f, b] of this.bubbles) { b.t++; if (b.t > b.T || f.dead) this.bubbles.delete(f); }
    for (const b of this.blasts) b.t++;
    this.blasts = this.blasts.filter((b) => b.t < b.T);
    if (this.flash > 0) this.flash--;
  }

  // ---------------------------------------------------------------- drawing
  draw(ctx, font) {
    for (const q of this.p) {
      if (q.t < 0) continue;
      const k = q.t / q.T;
      switch (q.k) {
        case "burst": {
          const a = 1 - k, s = q.s * (0.6 + k * 0.8);
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillStyle = q.c2; ctx.globalAlpha = a;
          star(ctx, q.n, s * 1.15, s * 0.28);
          ctx.fillStyle = q.c1;
          star(ctx, q.n, s * 0.8, s * 0.2);
          ctx.restore();
          break;
        }
        case "ring": {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = q.c; ctx.lineWidth = q.w * (1 - k) + 1;
          ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.1, q.r0 + (q.r1 - q.r0) * easeOut(k)), 0, TAU); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case "flat": {
          ctx.globalAlpha = (1 - k) * 0.8;
          ctx.strokeStyle = q.c; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r0 + (q.r1 - q.r0) * easeOut(k), 8 * (1 - k) + 2, 0, 0, TAU); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case "bit": drawBit(ctx, q, k); break;
        case "puff": {
          const r = q.r * (1 + k * (q.grow || 0.8));
          ctx.globalAlpha = (1 - k) * 0.85;
          ctx.fillStyle = q.c;
          ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
        case "streak": {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = q.c; ctx.lineWidth = 6 * (1 - k) + 1;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 4, q.y - q.vy * 4); ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case "bolt": {
          ctx.globalAlpha = 1 - k; ctx.strokeStyle = q.c; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(q.x, q.y);
          let x = q.x, y = q.y;
          for (let i = 1; i <= 5; i++) { x += Math.cos(q.a) * q.len / 5 + (Math.random() - 0.5) * 14; y += Math.sin(q.a) * q.len / 5 + (Math.random() - 0.5) * 14; ctx.lineTo(x, y); }
          ctx.stroke(); ctx.globalAlpha = 1;
          break;
        }
        case "candle": {
          const up = Math.sin(Math.min(1, k * 1.6) * Math.PI);
          const h = 150 * up;
          ctx.fillStyle = q.col; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 4;
          ctx.fillRect(q.x - 22, q.y - h, 44, h); ctx.strokeRect(q.x - 22, q.y - h, 44, h);
          ctx.beginPath(); ctx.moveTo(q.x, q.y - h - 30 * up); ctx.lineTo(q.x, q.y); ctx.stroke();
          break;
        }
        case "slash": {
          const a = 1 - k;
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a * q.dir); ctx.scale(q.dir, 1);
          const L = (q.wide ? 260 : 170) * Math.min(1, k * 3);
          ctx.globalAlpha = a;
          ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.quadraticCurveTo(0, -16, L / 2, 0); ctx.quadraticCurveTo(0, 8, -L / 2, 0); ctx.fill();
          ctx.fillStyle = "#ff1a2e"; ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.quadraticCurveTo(0, -8, L / 2, 0); ctx.quadraticCurveTo(0, 3, -L / 2, 0); ctx.fill();
          ctx.restore();
          break;
        }
        case "card": {
          const a = q.t > q.T - 10 ? (q.T - q.t) / 10 : 1;
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(-0.05); ctx.globalAlpha = a;
          rrect(ctx, -110, -36, 220, 72, 10, "#f4f5f8", OUTLINE);
          ctx.fillStyle = "#8a8f99"; ctx.font = `900 22px ${font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("该账号已被封禁", 0, -8);
          ctx.font = `700 13px ${font}`; ctx.fillText("因违反社区规定", 0, 18);
          ctx.restore();
          break;
        }
        case "text": {
          const pop = q.pop ? Math.min(1, q.t / 5) : 1;
          const sc = q.pop ? (q.t < 5 ? 1.5 - 0.5 * pop : 1) : 1;
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(sc, sc);
          ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
          memeText(ctx, q.str, 0, 0, q.size, q.c, q.c2, font);
          ctx.restore();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  drawBubbles(ctx, font) {
    for (const [f, b] of this.bubbles) {
      const [hx, hy] = f.bone("hc");
      const x = hx, y = hy - f.body.headR - 30;
      const k = Math.min(1, b.t / 5);
      const out = b.t > b.T - 8 ? (b.T - b.t) / 8 : 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.04 * f.facing);
      ctx.scale(k * out, k * out);
      ctx.font = `900 24px ${font}`;
      const w = Math.min(460, ctx.measureText(b.text).width) + 30, h = 42;
      // P5 speech box: black shard, white box, spike
      ctx.fillStyle = "#e8141c"; jag(ctx, -w / 2 + 6, -h + 6, w, h, b.text.length);
      ctx.fillStyle = "#ffffff"; jag(ctx, -w / 2, -h, w, h, b.text.length + 3);
      ctx.beginPath(); ctx.moveTo(-10, -3); ctx.lineTo(10, -3); ctx.lineTo(-4 * f.facing, 14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#0c0b0e"; ctx.lineWidth = 3; jag(ctx, -w / 2, -h, w, h, b.text.length + 3, true);
      ctx.fillStyle = "#0c0b0e"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.text, 0, -h / 2 + 1, 440);
      ctx.restore();
    }
  }

  // screen space (virtual coords)
  drawBlasts(ctx, cam, vw, vh) {
    for (const b of this.blasts) {
      const k = b.t / b.T;
      const [sx, sy] = cam.toScreen(b.x, b.y);
      const x = Math.max(0, Math.min(vw, sx)), y = Math.max(0, Math.min(vh, sy));
      let ang = 0;
      if (b.side === "left") ang = 0; else if (b.side === "right") ang = Math.PI; else if (b.side === "bottom") ang = -Math.PI / 2; else ang = Math.PI / 2;
      // aim roughly at screen centre
      ang = Math.atan2(vh / 2 - y, vw / 2 - x) * 0.6 + ang * 0.4;
      const len = 900 * easeOut(Math.min(1, k * 2.5));
      const wid = 150 * (1 - k) + 10;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      const gr = ctx.createLinearGradient(0, 0, len, 0);
      gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.25, b.col); gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 1 - k * 0.8;
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(0, -wid / 2); ctx.lineTo(len, -wid * 0.1); ctx.lineTo(len, wid * 0.1); ctx.lineTo(0, wid / 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(0, -wid / 5); ctx.lineTo(len * 0.8, 0); ctx.lineTo(0, wid / 5); ctx.closePath(); ctx.fill();
      // shards
      for (let i = 0; i < 8; i++) {
        const a = (i / 8 - 0.5) * 1.6, r = len * (0.3 + 0.1 * (i % 3));
        ctx.fillStyle = i % 2 ? b.col : "#fff";
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 10 * (1 - k), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash / 12;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }
  }
}

function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function jag(ctx, x, y, w, h, seed, stroke) {
  const r = (i) => (((seed * 9301 + i * 49297) % 233280) / 233280 - 0.5) * 6;
  ctx.beginPath();
  ctx.moveTo(x + 10 + r(1), y + r(2)); ctx.lineTo(x + w + r(3), y + r(4)); ctx.lineTo(x + w - 10 + r(5), y + h + r(6)); ctx.lineTo(x + r(7), y + h + r(8)); ctx.closePath();
  stroke ? ctx.stroke() : ctx.fill();
}

function star(ctx, n, R, r) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TAU, rr = i % 2 ? r : R * (0.75 + 0.25 * ((i * 7) % 3) / 2);
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath(); ctx.fill();
}

function drawBit(ctx, q, k) {
  ctx.globalAlpha = 1 - k * k;
  ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
  const s = q.s;
  switch (q.eff) {
    case "money":
      ctx.fillStyle = "#e8403a"; ctx.fillRect(-s * 1.6, -s * 0.8, s * 3.2, s * 1.6);
      ctx.fillStyle = "#ffd6c8"; ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
      break;
    case "keys":
      ctx.fillStyle = "#f4f6fb"; ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.strokeRect(-s, -s, s * 2, s * 2);
      break;
    case "ice":
      ctx.fillStyle = q.c; ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s * 0.7, 0); ctx.lineTo(0, s * 1.6); ctx.lineTo(-s * 0.7, 0); ctx.closePath(); ctx.fill();
      break;
    case "water":
      ctx.fillStyle = q.c; ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, TAU); ctx.fill();
      break;
    case "fire":
      ctx.fillStyle = k < 0.4 ? "#fff1a8" : q.c; ctx.beginPath(); ctx.arc(0, 0, s * (1.2 - k), 0, TAU); ctx.fill();
      break;
    case "chalk":
      ctx.fillStyle = "#fff"; ctx.fillRect(-s * 0.8, -s * 0.5, s * 1.6, s);
      break;
    default:
      ctx.fillStyle = q.c; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.35, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.35, 0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Meme-caption text: fat white fill, thick dark stroke, hard drop shadow.
export function memeText(ctx, str, x, y, size, fill = "#fff", stroke = OUTLINE, font = "sans-serif", align = "center") {
  ctx.font = `900 ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = stroke;
  ctx.fillText(str, x + size * 0.06, y + size * 0.1);
  ctx.strokeText(str, x + size * 0.06, y + size * 0.1);
  ctx.strokeText(str, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}
