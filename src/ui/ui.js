// UI kit, Persona-5 flavoured: red/black/white, ransom-note lettering, jagged panels,
// radial bursts, halftone, angular shard transitions. Shapes are seeded so they stay
// put frame to frame; a small tick-based jitter keeps selected things alive.
import { IMG, DATA } from "../engine/assets.js";
import { memeText } from "../render/fx.js";
import { FONT, F_HY, F_XW, F_BR, INK, PAPER, HOT, HOT2, GOLD, CYAN, RED, RED2, BLK, WHT } from "./theme.js";

export { memeText, FONT, F_HY, F_XW, F_BR, INK, PAPER, HOT, HOT2, GOLD, CYAN, RED, RED2, BLK, WHT };

export function hash(s) {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rnd(seed) {
  let a = seed >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ------------------------------------------------------------------ shapes
// Jagged quad around a (skewed) rect: each corner nudged, plus extra points on long edges.
export function jagPath(ctx, x, y, w, h, seed = 1, amp = 6, skew = 12) {
  const r = rnd(seed);
  const j = () => (r() - 0.5) * 2 * amp;
  const pts = [];
  pts.push([x + skew + j(), y + j()]);
  const nTop = Math.max(1, Math.floor(w / 160));
  for (let i = 1; i <= nTop; i++) pts.push([x + skew + (w - skew) * i / (nTop + 1) + j(), y + j() * 0.6]);
  pts.push([x + w + j(), y + j()]);
  pts.push([x + w - skew + j(), y + h + j()]);
  for (let i = nTop; i >= 1; i--) pts.push([x + (w - skew) * i / (nTop + 1) + j(), y + h + j() * 0.6]);
  pts.push([x + j(), y + h + j()]);
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
}

// Layered P5 panel: red offset shard behind, black body, white outline.
export function sticker(ctx, x, y, w, h, o = {}) {
  const seed = o.seed ?? hash(`${x | 0},${y | 0},${w | 0}`);
  const sk = o.skew ?? 14, amp = o.amp ?? Math.min(7, h * 0.08);
  const back = o.back === undefined ? RED : o.back;
  const off = o.off ?? [9, 7];
  if (back && o.shadow !== 0) { ctx.save(); ctx.translate(off[0], off[1]); jagPath(ctx, x, y, w, h, seed + 7, amp * 1.4, sk); ctx.fillStyle = back; ctx.fill(); ctx.restore(); }
  jagPath(ctx, x, y, w, h, seed, amp, sk);
  ctx.fillStyle = mapFill(o.fill);
  ctx.fill();
  if (o.stripe) { ctx.save(); jagPath(ctx, x, y, w, h, seed, amp, sk); ctx.clip(); halftone(ctx, x, y, w, h, o.stripe, 10, 3.2, "diag"); ctx.restore(); }
  if (o.band) { ctx.save(); jagPath(ctx, x, y, w, h, seed, amp, sk); ctx.clip(); ctx.fillStyle = o.band; ctx.fillRect(x, y, w, o.bandH || 8); ctx.restore(); }
  const border = o.border === undefined ? WHT : o.border;
  if (border) { jagPath(ctx, x, y, w, h, seed, amp, sk); ctx.lineWidth = o.bw || 4; ctx.strokeStyle = border; ctx.lineJoin = "miter"; ctx.stroke(); }
}
function mapFill(f) {
  if (!f) return BLK;
  if (f === "#2a2140" || f === "#241c38" || f === "rgba(40,32,60,0.6)") return BLK;
  if (f === HOT) return RED;
  return f;
}

// Radial burst wedges (the P5 background staple).
export function radial(ctx, cx, cy, r, n, col, rot = 0, width = 0.5) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2, a1 = a0 + (Math.PI * 2 / n) * width;
    ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); ctx.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r); ctx.closePath();
  }
  ctx.fill();
}

// Halftone dots; size grows along a direction.
export function halftone(ctx, x, y, w, h, col, gap = 12, maxR = 4, dir = "right") {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let yy = y; yy < y + h + gap; yy += gap) {
    const odd = Math.round((yy - y) / gap) % 2;
    for (let xx = x + (odd ? gap / 2 : 0); xx < x + w + gap; xx += gap) {
      let k;
      if (dir === "right") k = (xx - x) / w; else if (dir === "left") k = 1 - (xx - x) / w;
      else if (dir === "down") k = (yy - y) / h; else if (dir === "up") k = 1 - (yy - y) / h;
      else k = ((xx - x) / w + (yy - y) / h) / 2;
      const rr = maxR * Math.max(0.12, Math.min(1, k));
      ctx.moveTo(xx + rr, yy); ctx.arc(xx, yy, rr, 0, Math.PI * 2);
    }
  }
  ctx.fill();
}

// ------------------------------------------------------------------ ransom-note lettering
const RSTYLES = [
  { bg: WHT, fg: BLK, font: FONT }, { bg: BLK, fg: WHT, font: F_HY }, { bg: RED, fg: WHT, font: FONT },
  { bg: WHT, fg: RED, font: F_XW }, { bg: BLK, fg: RED, font: F_BR }, { bg: null, fg: WHT, font: F_HY },
  { bg: WHT, fg: BLK, font: F_BR }, { bg: RED, fg: BLK, font: F_HY },
];
// Draw text as cut-out letters. Returns width. opts: seed, align, jitter (0..1), styles, t
export function ransom(ctx, text, x, y, size, o = {}) {
  const r = rnd(o.seed ?? hash(text));
  const chars = [...text];
  const boxes = chars.map((ch) => {
    const st = o.styles ? o.styles[Math.floor(r() * o.styles.length)] : RSTYLES[Math.floor(r() * RSTYLES.length)];
    const sc = ch === " " ? 0.4 : 0.86 + r() * 0.3;
    const s = size * sc;
    ctx.font = `900 ${s}px ${st.font}`;
    const cw = ch === " " ? size * 0.35 : Math.max(s * 0.62, ctx.measureText(ch).width) + s * 0.24;
    return { ch, st, s, w: cw, h: s * 1.18, rot: (r() - 0.5) * (o.rot ?? 0.26), dy: (r() - 0.5) * size * 0.16, seed: Math.floor(r() * 1e9) };
  });
  const gap = size * 0.02;
  const total = boxes.reduce((a, b) => a + b.w + gap, -gap);
  let cx = o.align === "left" ? x : o.align === "right" ? x - total : x - total / 2;
  const jt = o.jitter ? Math.floor((o.t || 0) / 5) : 0;
  for (const b of boxes) {
    if (b.ch === " ") { cx += b.w + gap; continue; }
    const jr = o.jitter ? rnd(b.seed + jt) : null;
    const jx = jr ? (jr() - 0.5) * size * 0.08 * o.jitter : 0, jy = jr ? (jr() - 0.5) * size * 0.08 * o.jitter : 0;
    ctx.save();
    ctx.translate(cx + b.w / 2 + jx, y + b.dy + jy);
    ctx.rotate(b.rot + (jr ? (jr() - 0.5) * 0.08 * o.jitter : 0));
    if (b.st.bg) {
      if (o.shadow !== false) { ctx.fillStyle = b.st.bg === BLK ? RED : BLK; jagPath(ctx, -b.w / 2 + 3, -b.h / 2 + 4, b.w, b.h, b.seed + 1, b.s * 0.06, b.s * 0.06); ctx.fill(); }
      ctx.fillStyle = b.st.bg; jagPath(ctx, -b.w / 2, -b.h / 2, b.w, b.h, b.seed, b.s * 0.07, b.s * 0.08); ctx.fill();
    }
    ctx.font = `900 ${b.s}px ${b.st.font}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (!b.st.bg) { ctx.lineWidth = b.s * 0.22; ctx.strokeStyle = BLK; ctx.lineJoin = "round"; ctx.strokeText(b.ch, 0, b.s * 0.04); }
    ctx.fillStyle = b.st.fg; ctx.fillText(b.ch, 0, b.s * 0.04);
    ctx.restore();
    cx += b.w + gap;
  }
  return total;
}

// P5 menu bar: black slab, white italic label; selected = inverted with a red shard burst.
export function p5bar(ctx, x, y, w, h, label, sel, t, o = {}) {
  const seed = hash(label + (o.seedExtra || ""));
  const jt = Math.floor(t / 4);
  ctx.save();
  const tilt = ((seed % 7) - 3) * 0.006 + (sel ? -0.035 : 0);
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(tilt); ctx.translate(-(x + w / 2), -(y + h / 2));
  if (sel) {
    // red spiky shard behind
    const r = rnd(seed + jt);
    ctx.fillStyle = RED;
    ctx.beginPath();
    const cx = x + w * 0.5, cy = y + h * 0.5;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rx = (w * 0.56 + (i % 2 ? -w * 0.08 : w * 0.06) + (r() - 0.5) * 18), ry = (h * 0.9 + (i % 2 ? -h * 0.35 : h * 0.1) + (r() - 0.5) * 8);
      const px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    sticker(ctx, x, y, w, h, { fill: WHT, border: BLK, bw: 5, back: BLK, off: [7, 6], seed, skew: h * 0.35, amp: 4 });
  } else {
    sticker(ctx, x, y, w, h, { fill: BLK, border: WHT, bw: 3, back: o.back === undefined ? null : o.back, seed, skew: h * 0.35, amp: 3 });
  }
  ctx.font = `900 ${o.size || h * 0.56}px ${FONT}`;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const tx = x + h * 0.55, ty = y + h * 0.53;
  if (sel) { ctx.fillStyle = RED; ctx.fillText(label, tx + 4, ty + 3); ctx.fillStyle = BLK; ctx.fillText(label, tx, ty); }
  else { ctx.fillStyle = WHT; ctx.fillText(label, tx, ty); }
  if (o.sub) {
    ctx.font = `800 ${Math.round(h * 0.2)}px ${FONT}`;
    ctx.fillStyle = sel ? "#444" : "#b8b8c0"; ctx.textAlign = "right";
    ctx.fillText(o.sub, x + w - h * 0.5, y + h * 0.78);
  }
  ctx.restore();
}

// Weibo-style hot search tag: 爆 / 热 / 新 / 荐 / 沸
const BADGE_COL = { 爆: RED, 热: "#ff8a1f", 新: "#ff4f8a", 荐: "#2e9bff", 沸: "#b11dff" };
export function badge(ctx, ch, x, y, s = 22) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-0.08);
  ctx.fillStyle = BLK; jagPath(ctx, -s / 2 + 3, -s / 2 + 3, s, s, hash(ch) + 3, s * 0.06, s * 0.1); ctx.fill();
  ctx.fillStyle = BADGE_COL[ch] || RED; jagPath(ctx, -s / 2, -s / 2, s, s, hash(ch), s * 0.06, s * 0.1); ctx.fill();
  ctx.fillStyle = WHT; ctx.font = `900 ${s * 0.72}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(ch, 0, 1);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// Head portrait from the expression sheet. Anchored at the chin (x, y), height h.
export function head(ctx, id, x, y, h, ex = 0, flip = false) {
  const im = IMG["head_" + id], man = DATA.heads && DATA.heads[id];
  if (!im || !man) return;
  const s = h / man.h;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, ex * man.cell, 0, man.cell, man.cell, -man.cell / 2 * s, -man.bottom * s, man.cell * s, man.cell * s);
  ctx.restore();
}

// Head as a red/black silhouette (P5 all-out-attack look).
const silCache = new Map();
export function headSilhouette(ctx, id, x, y, h, ex, col, flip) {
  const im = IMG["head_" + id], man = DATA.heads && DATA.heads[id];
  if (!im || !man) return;
  const key = id + ex + col;
  let c = silCache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = man.cell; c.height = man.cell;
    const g = c.getContext("2d");
    g.drawImage(im, ex * man.cell, 0, man.cell, man.cell, 0, 0, man.cell, man.cell);
    g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, man.cell, man.cell);
    silCache.set(key, c);
  }
  const s = h / man.h;
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(c, -man.cell / 2 * s, -man.bottom * s, man.cell * s, man.cell * s);
  ctx.restore();
}

// Eye strip crop for cut-ins: horizontal band through the eyes.
export function eyeStrip(ctx, id, x, y, w, h, ex = 1, flip = false) {
  const im = IMG["head_" + id], man = DATA.heads && DATA.heads[id];
  if (!im || !man) return;
  const cell = man.cell;
  const eyeY = man.bottom - man.h * 0.6;       // eyes ~60% up from the chin
  const bandH = man.h * 0.2, bandW = bandH * (w / h);
  const sx = ex * cell + cell / 2 - bandW / 2 + man.w * 0.08, sy = eyeY - bandH / 2;
  ctx.save();
  ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(im, sx, sy, bandW, bandH, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// Screen backdrop: red field, rotating black wedges, halftone corners, faint watermark.
export function backdrop(ctx, vw, vh, t, tint) {
  const dark = tint === "dark";
  ctx.fillStyle = dark ? BLK : RED; ctx.fillRect(0, 0, vw, vh);
  radial(ctx, vw * 0.72, vh * 0.42, vw * 1.3, 18, dark ? "rgba(232,20,28,0.22)" : "rgba(0,0,0,0.16)", t * 0.0016, 0.5);
  halftone(ctx, 0, vh * 0.55, vw * 0.5, vh * 0.45, dark ? "rgba(232,20,28,0.35)" : "rgba(0,0,0,0.28)", 14, 5, "left");
  halftone(ctx, vw * 0.6, 0, vw * 0.4, vh * 0.4, dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.12)", 16, 4.5, "right");
  // torn black band
  ctx.save();
  ctx.fillStyle = dark ? RED2 : BLK;
  ctx.beginPath();
  ctx.moveTo(-20, vh * 0.78); ctx.lineTo(vw * 0.35, vh * 0.66); ctx.lineTo(vw * 0.62, vh * 0.72); ctx.lineTo(vw + 20, vh * 0.58);
  ctx.lineTo(vw + 20, vh * 0.66); ctx.lineTo(vw * 0.62, vh * 0.8); ctx.lineTo(vw * 0.35, vh * 0.74); ctx.lineTo(-20, vh * 0.88); ctx.closePath();
  ctx.globalAlpha = 0.55; ctx.fill();
  ctx.restore();
}

// Pointer (mouse/touch) hit regions, rebuilt each frame by the scene.
export class Hits {
  constructor() { this.list = []; this.hover = null; this.mx = -1; this.my = -1; }
  begin() { this.list.length = 0; }
  add(id, x, y, w, h, data) { this.list.push({ id, x, y, w, h, data }); if (this.mx >= x && this.mx <= x + w && this.my >= y && this.my <= y + h) this.hover = id; }
  at(x, y) { for (let i = this.list.length - 1; i >= 0; i--) { const r = this.list[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r; } return null; }
}

// Angular shard wipe (black / red / white slabs sweep across), scene swaps under cover.
export class Wipe {
  constructor() { this.t = -1; this.cb = null; }
  start(cb) { this.t = 0; this.cb = cb; this.seed = (Math.random() * 1e9) | 0; }
  get active() { return this.t >= 0; }
  step() {
    if (this.t < 0) return;
    this.t++;
    if (this.t === 16 && this.cb) { const cb = this.cb; this.cb = null; cb(); }
    if (this.t > 34) this.t = -1;
  }
  draw(ctx, vw, vh) {
    if (this.t < 0) return;
    const t = this.t;
    const inK = Math.min(1, t / 14), outK = t > 18 ? Math.min(1, (t - 18) / 14) : 0;
    const ease = (k) => 1 - Math.pow(1 - k, 3);
    const layers = [[RED, 0], [BLK, 0.1], [WHT, 0.16], [BLK, 0.22]];
    for (const [col, d] of layers) {
      const a = ease(Math.max(0, Math.min(1, inK * 1.25 - d)));
      const b = ease(Math.max(0, Math.min(1, outK * 1.25 - d)));
      const x0 = -vw * 0.4 + (vw * 1.8) * b, x1 = -vw * 0.4 + (vw * 1.8) * a;
      if (x1 <= x0) continue;
      ctx.fillStyle = col;
      ctx.beginPath();
      const sk = vh * 0.45;
      ctx.moveTo(x0 + sk, 0); ctx.lineTo(x1 + sk, 0); ctx.lineTo(x1 - sk * 0.2, vh); ctx.lineTo(x0 - sk * 0.2, vh); ctx.closePath();
      ctx.fill();
    }
    if (t > 8 && t < 26) {
      ctx.save(); ctx.globalAlpha = Math.min(1, (t - 8) / 4) * Math.min(1, (26 - t) / 4);
      ransom(ctx, "梗王大乱斗", vw / 2, vh / 2, 64, { seed: 7 });
      ctx.restore();
    }
  }
}

export function keycap(ctx, label, x, y, h = 26) {
  ctx.save();
  ctx.font = `900 ${h * 0.6}px ${FONT}`;
  const w = Math.max(h, ctx.measureText(label).width + h * 0.5);
  ctx.fillStyle = WHT; jagPath(ctx, x, y, w, h, hash(label), 1.5, 3); ctx.fill();
  ctx.fillStyle = BLK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  return w;
}

// Speech box, P5 style: white jagged box with black border and a spike.
export function p5say(ctx, x, y, text, size = 22, o = {}) {
  ctx.save();
  ctx.font = `900 ${size}px ${FONT}`;
  const w = Math.min(o.maxW || 560, ctx.measureText(text).width) + size * 1.4, h = size * 2;
  ctx.fillStyle = BLK; jagPath(ctx, x + 6, y + 6, w, h, hash(text) + 1, 4, 10); ctx.fill();
  ctx.fillStyle = WHT; jagPath(ctx, x, y, w, h, hash(text), 4, 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 24, y + h - 2); ctx.lineTo(x + 50, y + h - 2); ctx.lineTo(x + 18, y + h + 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = BLK; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x + size * 0.7, y + h / 2 + 1, o.maxW || 560);
  ctx.restore();
}
