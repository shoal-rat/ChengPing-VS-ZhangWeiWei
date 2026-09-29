// Draws a rigged fighter: code-drawn cel-shaded body + AI-generated sticker head.
// Everything shares one look: thick plum outline, one flat shadow tone, one highlight.
import { IMG, DATA } from "../engine/assets.js";
import { DEG } from "../sim/math.js";

export const OUTLINE = "#231a30";
const OL = 2.6;

const buffers = new Map();

// Draw fighter f into the world-space context (camera transform already applied).
export function drawFighter(ctx, f, cam, opts = {}) {
  const k = (cam.cur ? cam.cur.z : cam.zoom) * cam.scale * cam.dpr;
  const W = 380, Hh = 330, OX = 190, OY = 250;
  let b = buffers.get(f);
  const bw = Math.ceil(W * k), bh = Math.ceil(Hh * k);
  if (!b || b.canvas.width < bw || b.canvas.height < bh || b.canvas.width > bw * 1.6) {
    const c = document.createElement("canvas");
    c.width = bw; c.height = bh;
    b = { canvas: c, ctx: c.getContext("2d") };
    buffers.set(f, b);
  }
  const g = b.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, b.canvas.width, b.canvas.height);
  g.setTransform(k, 0, 0, k, OX * k, OY * k);
  const turn = f.turnT > 0 ? Math.cos((f.turnT / 5) * Math.PI) : 1;   // flip through edge-on
  g.scale(f.facing * (Math.abs(turn) < 0.15 ? 0.15 * Math.sign(turn || 1) : turn), 1);
  drawBody(g, f.def, f.j, f.pose, f, opts);
  // tints
  g.setTransform(1, 0, 0, 1, 0, 0);
  const tint = opts.tint || fighterTint(f);
  if (tint) {
    g.globalCompositeOperation = "source-atop";
    g.fillStyle = tint;
    g.fillRect(0, 0, bw, bh);
    g.globalCompositeOperation = "source-over";
  }
  // composite into world
  let sx = 0;
  if (f.hitlag > 0 && f.shake) sx = ((f.world.frame % 2) ? 1 : -1) * Math.min(6, f.shake * 0.6);
  let alpha = 1;
  if (f.intan > 0 && (f.state === "airdodge" || f.state === "spotdodge" || f.state === "roll" || f.state === "tech")) alpha = 0.55;
  if (f.invinc > 0 && f.state !== "respawn" && (f.world.frame >> 2) % 2) alpha = Math.min(alpha, 0.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 22 * k; }
  ctx.drawImage(b.canvas, 0, 0, bw, bh, f.x - OX + sx, f.y - OY, W, Hh);
  ctx.restore();
}

function fighterTint(f) {
  if (f.flash > 0 && f.state === "hitstun") return `rgba(255,255,255,${Math.min(0.75, f.flash * 0.09)})`;
  if (f.state === "helpless") return "rgba(40,30,70,0.35)";
  if (f.stunKind === "ice" && f.state === "stun") return "rgba(150,210,255,0.45)";
  if (f.status && f.status.gloom) return "rgba(60,50,90,0.25)";
  if (f.flash > 0 && f.armor) return `rgba(255,220,120,${f.flash * 0.06})`;
  if (f.counter) return "rgba(120,200,255,0.25)";
  return null;
}

// Standalone draw into any context at local coords (used by menus / portraits).
export function drawBody(g, def, j, pose, f, opts = {}) {
  const L = def.look, B = def.body;
  g.lineJoin = "round"; g.lineCap = "round";
  // back arm
  arm(g, j.bs, j.be, j.bh, B, L, true, pose.bh, j.a.bf);
  // backpack / coat behind
  if (L.torso.type === "tee" && L.torso.pack) backpack(g, j, B, L);
  if (L.torso.type === "labcoat") coatBack(g, j, B, L);
  // back leg then front leg
  leg(g, j.bhip, j.bk, j.bf, j.a.bs, B, L, true);
  leg(g, j.fhip, j.fk, j.ff, j.a.fs, B, L, false);
  torso(g, j, B, L, pose);
  head(g, j, def, pose, f, opts);
  // front arm & prop
  const propBehind = L.propBehind;
  if (propBehind) prop(g, j, def, pose, f);
  arm(g, j.fs, j.fe, j.fh, B, L, false, pose.fh, j.a.ff, () => { if (!propBehind) prop(g, j, def, pose, f); });
}

// ------------------------------------------------------------------ parts
function seg(g, a, b, w, col) {
  g.strokeStyle = col; g.lineWidth = w;
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
}
function shadeSeg(g, a, b, w, col) {
  // offset toward lower-right (world light from upper-left)
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  let nx = -dy / d, ny = dx / d;
  if (nx + ny < 0) { nx = -nx; ny = -ny; }
  const o = w * 0.24;
  g.strokeStyle = col; g.lineWidth = w * 0.48;
  g.beginPath(); g.moveTo(a[0] + nx * o, a[1] + ny * o); g.lineTo(b[0] + nx * o, b[1] + ny * o); g.stroke();
}
function circle(g, x, y, r, fill, stroke = OUTLINE, lw = OL) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function darker(hex, k = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * k, gg = ((n >> 8) & 255) * k, b = (n & 255) * k;
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}

function arm(g, s, e, h, B, L, back, hand, foreAng, afterHandPre) {
  const [w1, w2] = B.armW;
  const sl = back ? darker(L.sleeve, 0.8) : L.sleeve, sh = back ? darker(L.sleeveSh, 0.8) : L.sleeveSh;
  // outline
  seg(g, s, e, w1 + OL * 2, OUTLINE); seg(g, e, h, w2 + OL * 2, OUTLINE);
  seg(g, s, e, w1, sl); seg(g, e, h, w2, sl);
  shadeSeg(g, s, e, w1, sh); shadeSeg(g, e, h, w2, sh);
  // cuff
  const dx = h[0] - e[0], dy = h[1] - e[1], d = Math.hypot(dx, dy) || 1;
  const cx = h[0] - dx / d * 3.5, cy = h[1] - dy / d * 3.5;
  if (L.cuff) { seg(g, [cx - dx / d * 2, cy - dy / d * 2], [cx, cy], w2 + 1.5, back ? darker(L.cuff, 0.8) : L.cuff); }
  if (afterHandPre) afterHandPre();
  handShape(g, h, B.hand, back ? darker(L.glove || L.skin, 0.85) : (L.glove || L.skin), hand, foreAng, L);
}

function handShape(g, h, r, col, kind, ang, L) {
  circle(g, h[0], h[1], r, col);
  if (kind === "open") {
    const a = (ang + 60) * DEG;
    circle(g, h[0] + Math.sin(a) * r * 0.9, h[1] + Math.cos(a) * r * 0.9, r * 0.42, col, OUTLINE, 1.8);
  }
  // highlight
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.beginPath(); g.arc(h[0] - r * 0.3, h[1] - r * 0.35, r * 0.28, 0, Math.PI * 2); g.fill();
}

function leg(g, hip, knee, foot, shinAng, B, L, back) {
  const [w1, w2] = B.legW;
  const pc = back ? darker(L.pants, 0.8) : L.pants, ps = back ? darker(L.pantsSh, 0.8) : L.pantsSh;
  seg(g, hip, knee, w1 + OL * 2, OUTLINE); seg(g, knee, foot, w2 + OL * 2, OUTLINE);
  seg(g, hip, knee, w1, pc); seg(g, knee, foot, w2, pc);
  shadeSeg(g, hip, knee, w1, ps); shadeSeg(g, knee, foot, w2, ps);
  // shoe: pointing forward, perpendicular to shin
  const a = (shinAng + 90) * DEG;
  const fx = Math.sin(a), fy = Math.cos(a);
  const [fl, fh] = B.foot;
  const cx = foot[0] + fx * fl * 0.28, cy = foot[1] + fy * fl * 0.28 + 2;
  g.save();
  g.translate(cx, cy);
  g.rotate(Math.atan2(fy, fx));
  g.beginPath();
  g.moveTo(-fl * 0.5, -fh * 0.7);
  g.quadraticCurveTo(fl * 0.25, -fh * 0.95, fl * 0.55, -fh * 0.1);
  g.quadraticCurveTo(fl * 0.62, fh * 0.55, fl * 0.3, fh * 0.55);
  g.lineTo(-fl * 0.5, fh * 0.55);
  g.closePath();
  g.fillStyle = back ? darker(L.shoe, 0.8) : L.shoe; g.fill();
  g.strokeStyle = OUTLINE; g.lineWidth = OL; g.stroke();
  // sole
  g.strokeStyle = L.sole || OUTLINE; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(-fl * 0.45, fh * 0.42); g.lineTo(fl * 0.35, fh * 0.42); g.stroke();
  if (L.shoeHi) { g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(fl * 0.1, -fh * 0.4, fl * 0.18, fh * 0.16, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
}

// Torso in a local frame: origin at neck, +y toward pelvis, +x toward chest (facing).
function torsoFrame(g, j) {
  const nx = j.neck[0], ny = j.neck[1], px = j.pel[0], py = j.pel[1];
  const ang = Math.atan2(px - nx, py - ny); // angle from +y
  g.translate(nx, ny);
  g.rotate(-ang);
  return Math.hypot(px - nx, py - ny);
}

function torsoPath(g, len, wT, wB, belly, flare = 0) {
  const t = wT / 2, b = wB / 2;
  g.beginPath();
  g.moveTo(-t + 3, -2);
  g.quadraticCurveTo(0, -5, t - 3, -2);
  g.quadraticCurveTo(t + 2, 2, t + 1 + belly * 0.3, len * 0.3);
  g.quadraticCurveTo(t + belly + 2, len * 0.62, b + flare + belly * 0.4, len + 3);
  g.lineTo(-b - flare, len + 3);
  g.quadraticCurveTo(-b - 3, len * 0.6, -t - 1, len * 0.3);
  g.quadraticCurveTo(-t - 2, 2, -t + 3, -2);
  g.closePath();
}

function torso(g, j, B, L, pose) {
  const T = L.torso;
  g.save();
  const len = torsoFrame(g, j);
  const wT = B.torsoW, wB = B.torsoW * (T.hip || 0.92), belly = T.belly || 0;
  const flare = T.type === "labcoat" ? 4 : 0;
  // base shape
  torsoPath(g, len, wT, wB, belly, flare);
  g.fillStyle = T.base || T.jacket || T.shirt; g.fill();
  g.save(); g.clip();
  switch (T.type) {
    case "jacket": {
      // inner sweater, jacket panels at back and front edge
      g.fillStyle = T.inner; g.fillRect(-wT, -6, wT * 2, len + 10);
      g.fillStyle = T.innerSh; g.fillRect(wT * 0.05, -6, wT, len + 10);
      g.fillStyle = T.jacket; g.fillRect(-wT, -6, wT * 0.78, len + 10);
      g.fillStyle = T.jacketSh; g.fillRect(-wT, len * 0.55, wT * 0.78, len);
      g.fillStyle = T.jacket; g.fillRect(wT * 0.36, -6, wT, len + 10);
      g.fillStyle = T.jacketSh; g.fillRect(wT * 0.46, -6, wT, len + 10);
      // collar
      g.fillStyle = T.collar;
      g.beginPath(); g.moveTo(-2, -3); g.lineTo(wT * 0.42, -3); g.lineTo(wT * 0.14, len * 0.3); g.closePath(); g.fill();
      g.strokeStyle = OUTLINE; g.lineWidth = 1.6; g.stroke();
      if (T.zip) { g.strokeStyle = "rgba(60,30,10,0.5)"; g.lineWidth = 1.4; g.beginPath(); g.moveTo(wT * 0.36, len * 0.2); g.lineTo(wT * 0.36, len); g.stroke(); }
      break;
    }
    case "suit": {
      g.fillStyle = T.jacketSh; g.fillRect(wT * 0.1, -6, wT, len + 10);
      // shirt V
      g.fillStyle = T.shirt;
      g.beginPath(); g.moveTo(wT * 0.02, -4); g.lineTo(wT * 0.5, -4); g.lineTo(wT * 0.28, len * 0.55); g.closePath(); g.fill();
      if (T.tie) {
        g.fillStyle = T.tie;
        g.beginPath(); g.moveTo(wT * 0.2, -1); g.lineTo(wT * 0.34, -1); g.lineTo(wT * 0.36, len * 0.45); g.lineTo(wT * 0.27, len * 0.56); g.lineTo(wT * 0.18, len * 0.45); g.closePath(); g.fill();
        if (T.tieStripe) { g.strokeStyle = T.tieStripe; g.lineWidth = 1.3; for (let y = 4; y < len * 0.5; y += 5) { g.beginPath(); g.moveTo(wT * 0.17, y); g.lineTo(wT * 0.37, y + 3); g.stroke(); } }
      }
      // lapels
      g.strokeStyle = OUTLINE; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(wT * 0.02, -4); g.lineTo(wT * 0.26, len * 0.56); g.lineTo(wT * 0.5, -4); g.stroke();
      g.fillStyle = T.button || "#111"; circle(g, wT * 0.3, len * 0.72, 1.8, T.button || "#1a1a1a", null);
      break;
    }
    case "tee": {
      g.fillStyle = T.shirtSh; g.fillRect(wT * 0.12, -6, wT, len + 10);
      if (T.print) { g.fillStyle = T.print; g.font = "bold 9px sans-serif"; g.textAlign = "center"; g.fillText(T.printText || "", wT * 0.2, len * 0.5); }
      g.strokeStyle = OUTLINE; g.lineWidth = 1.6;
      g.beginPath(); g.arc(wT * 0.12, -4, 7, 0.2, Math.PI - 0.2); g.stroke();
      if (T.pack) { g.strokeStyle = T.strap; g.lineWidth = 4.5; g.beginPath(); g.moveTo(-wT * 0.1, -2); g.quadraticCurveTo(wT * 0.2, len * 0.45, -wT * 0.2, len * 0.95); g.stroke(); }
      break;
    }
    case "sweater": {
      g.fillStyle = T.stripe;
      for (let y = len * 0.18; y < len + 4; y += 9) g.fillRect(-wT, y, wT * 2, 4);
      g.fillStyle = "rgba(0,0,30,0.22)"; g.fillRect(wT * 0.14, -6, wT, len + 10);
      // shirt collar tips
      g.fillStyle = T.collar;
      g.beginPath(); g.moveTo(0, -3); g.lineTo(wT * 0.36, -3); g.lineTo(wT * 0.24, 7); g.lineTo(wT * 0.1, 4); g.closePath(); g.fill();
      g.strokeStyle = OUTLINE; g.lineWidth = 1.4; g.stroke();
      break;
    }
    case "taichi": {
      g.fillStyle = T.shirtSh; g.fillRect(wT * 0.16, -6, wT, len + 10);
      // overlap flap + frog buttons
      g.strokeStyle = OUTLINE; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-wT * 0.05, -2); g.quadraticCurveTo(wT * 0.32, len * 0.2, wT * 0.34, len + 3); g.stroke();
      g.strokeStyle = T.knot; g.lineWidth = 2.4;
      for (let i = 0; i < 4; i++) { const y = len * 0.22 + i * len * 0.18; g.beginPath(); g.moveTo(wT * 0.2, y); g.lineTo(wT * 0.46, y); g.stroke(); circle(g, wT * 0.46, y, 1.6, T.knot, null); }
      g.fillStyle = T.trim; g.fillRect(-wT, -6, wT * 2, 5);
      break;
    }
    case "labcoat": {
      g.fillStyle = T.hoodie; g.fillRect(wT * 0.0, -6, wT * 0.5, len + 10);
      g.fillStyle = T.coatSh; g.fillRect(wT * 0.45, -6, wT, len + 10);
      g.fillStyle = T.coatSh; g.fillRect(-wT, len * 0.6, wT, len);
      g.strokeStyle = OUTLINE; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-wT * 0.02, -3); g.lineTo(wT * 0.02, len + 4); g.moveTo(wT * 0.46, -3); g.lineTo(wT * 0.42, len + 4); g.stroke();
      // pocket + pen
      g.strokeRect(-wT * 0.36, len * 0.35, 8, 7);
      g.fillStyle = "#d94a3c"; g.fillRect(-wT * 0.33, len * 0.3, 2, 7);
      // hoodie strings
      g.strokeStyle = "#dcdce4"; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(wT * 0.14, 0); g.lineTo(wT * 0.12, len * 0.35); g.moveTo(wT * 0.3, 0); g.lineTo(wT * 0.32, len * 0.32); g.stroke();
      break;
    }
  }
  // belt / hem line
  if (T.belt) { g.fillStyle = T.belt; g.fillRect(-wT, len - 4, wT * 2, 5); }
  // soft highlight on the chest (upper left)
  g.fillStyle = "rgba(255,255,255,0.13)";
  g.beginPath(); g.ellipse(-wT * 0.18, len * 0.22, wT * 0.2, len * 0.16, -0.3, 0, Math.PI * 2); g.fill();
  g.restore();
  torsoPath(g, len, wT, wB, belly, flare);
  g.strokeStyle = OUTLINE; g.lineWidth = OL; g.stroke();
  if (T.type === "labcoat") {
    // hood bunched behind the neck
    g.fillStyle = T.hoodie; g.beginPath(); g.ellipse(-wT * 0.28, -2, wT * 0.32, 7, -0.2, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  g.restore();
}

function coatBack(g, j, B, L) {
  // coat tails hanging behind the legs from the pelvis
  const T = L.torso;
  g.save();
  const len = torsoFrame(g, j);
  const w = B.torsoW;
  g.beginPath();
  g.moveTo(-w * 0.55, len - 6); g.lineTo(w * 0.55, len - 6);
  g.lineTo(w * 0.62, len + 30); g.quadraticCurveTo(0, len + 36, -w * 0.66, len + 30); g.closePath();
  g.fillStyle = T.coatSh; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = OL; g.stroke();
  g.restore();
}

function backpack(g, j, B, L) {
  const T = L.torso;
  g.save();
  const len = torsoFrame(g, j);
  const w = B.torsoW;
  g.beginPath();
  const x = -w * 0.5 - 14, y = 2;
  g.moveTo(x + 6, y); g.lineTo(x + 20, y); g.quadraticCurveTo(x + 24, y, x + 24, y + 6);
  g.lineTo(x + 24, y + len * 0.95); g.lineTo(x, y + len * 0.95); g.lineTo(x, y + 6); g.quadraticCurveTo(x, y, x + 6, y);
  g.fillStyle = T.pack; g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = OL; g.stroke();
  g.fillStyle = darker(T.pack, 0.8); g.fillRect(x + 3, y + len * 0.5, 18, len * 0.3); g.strokeRect(x + 3, y + len * 0.5, 18, len * 0.3);
  // rolled mat on top
  g.fillStyle = T.mat || "#5a7a4a"; g.beginPath(); g.ellipse(x + 12, y - 3, 14, 5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}

function head(g, j, def, pose, f, opts) {
  const B = def.body, L = def.look;
  // neck
  seg(g, j.neck, j.head, 11 + OL * 2, OUTLINE); seg(g, j.neck, j.head, 11, L.skinSh);
  const im = IMG["head_" + L.head];
  const man = DATA.heads && DATA.heads[L.head];
  const ex = Math.max(0, Math.min(4, Math.round(opts.ex ?? pose.ex ?? 0)));
  g.save();
  g.translate(j.head[0], j.head[1]);
  g.rotate((j.a.head || 0) * DEG);
  if (im && man) {
    const cell = man.cell;
    const s = B.headH / man.h;
    const ax = cell / 2 + (B.headAX ?? -0.06) * man.w, ay = man.bottom - (B.headAY ?? 0.07) * man.h;
    g.drawImage(im, ex * cell, 0, cell, cell, (-ax) * s + (B.headDX || 0), (-ay) * s + (B.headDY || 0), cell * s, cell * s);
  } else {
    circle(g, 0, -B.headR, B.headR, L.skin);
  }
  g.restore();
}

// ------------------------------------------------------------------ props
function prop(g, j, def, pose, f) {
  if (!pose.pv) return;
  const L = def.look, B = def.body;
  const item = f && f.item;
  const mv = f && f.state === "attack" && f.move;
  const kind = item ? "item_" + item.type : (mv && mv.propOverride) || L.prop;
  if (!kind) return;
  const h = j.fh, a = (j.a.prop || 0);
  g.save();
  g.translate(h[0], h[1]);
  g.rotate(-a * DEG); // limb convention -> canvas: +y along the prop
  const len = B.propLen || 40;
  if (mv && mv.weaponScale && !item) { const k = mv.weaponScale; g.scale(k, k); }
  switch (kind) {
    case "iceaxe": {
      g.strokeStyle = OUTLINE; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 44); g.stroke();
      g.strokeStyle = "#e2762c"; g.lineWidth = 3.4; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 44); g.stroke();
      g.fillStyle = "#c9d2dc"; g.strokeStyle = OUTLINE; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(-18, 40); g.quadraticCurveTo(0, 36, 20, 48); g.lineTo(4, 50); g.lineTo(-16, 46); g.closePath(); g.fill(); g.stroke();
      break;
    }
    case "pointer": {
      g.strokeStyle = OUTLINE; g.lineWidth = 6.5; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, len); g.stroke();
      g.strokeStyle = "#b07a3c"; g.lineWidth = 3.5; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, len); g.stroke();
      g.strokeStyle = "#e0453a"; g.lineWidth = 3.6; g.beginPath(); g.moveTo(0, len - 7); g.lineTo(0, len); g.stroke();
      break;
    }
    case "book": {
      g.rotate(Math.PI / 2);
      rrect(g, -6, -15, len * 0.62, 30, 3, "#c8262c", OUTLINE);
      g.fillStyle = "#8f171c"; g.fillRect(-6, -15, 5, 30);
      g.fillStyle = "#ffd46b"; g.font = "bold 7.5px sans-serif"; g.textAlign = "center";
      g.save(); g.translate(len * 0.26, 0); g.fillText("中国", 0, -3); g.fillText("震撼", 0, 6); g.restore();
      break;
    }
    case "paper": {
      rrect(g, -7, -6, 14, len + 6, 5, "#e9e4d6", OUTLINE);
      g.strokeStyle = "#9a948a"; g.lineWidth = 1.2;
      for (let y = 4; y < len - 4; y += 5) { g.beginPath(); g.moveTo(-5, y); g.lineTo(5, y); g.stroke(); }
      g.fillStyle = "#c8262c"; g.fillRect(-7, len * 0.35, 14, 7);
      break;
    }
    case "phone": {
      rrect(g, -9, 2, 18, len, 4, "#f4f4f6", OUTLINE);
      rrect(g, -6.5, 5, 13, len - 7, 2, "#2c3244", null);
      g.fillStyle = "#9fb6ff"; g.fillRect(-5, 8, 10, 3);
      circle(g, 4, len - 1, 1.6, "#888", null);
      break;
    }
    case "selfie": {
      g.strokeStyle = OUTLINE; g.lineWidth = 5.5; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, len - 8); g.stroke();
      g.strokeStyle = "#8a8f99"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, len - 8); g.stroke();
      rrect(g, -8, len - 10, 16, 12, 3, "#26282e", OUTLINE);
      circle(g, 0, len - 4, 3, "#6fd0ff", null);
      break;
    }
    case "chopsticks": {
      g.strokeStyle = OUTLINE; g.lineWidth = 4.8;
      g.beginPath(); g.moveTo(-2, -3); g.lineTo(-3, len); g.moveTo(2, -3); g.lineTo(4, len); g.stroke();
      g.strokeStyle = "#e9c989"; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(-2, -3); g.lineTo(-3, len); g.moveTo(2, -3); g.lineTo(4, len); g.stroke();
      g.strokeStyle = "#c8262c"; g.lineWidth = 2.6; g.beginPath(); g.moveTo(-2, -3); g.lineTo(-2.2, 5); g.moveTo(2, -3); g.lineTo(2.3, 5); g.stroke();
      break;
    }
    case "item_brick": rrect(g, -12, 0, 24, 16, 2, "#c2553a", OUTLINE); g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 1; g.strokeRect(-12, 5, 24, 0.1); break;
    case "item_melon": drawMelon(g, 0, 16, 18); break;
    case "item_keyboard": {
      rrect(g, -8, -4, 16, 62, 3, "#2b2f3a", OUTLINE);
      g.fillStyle = "#cfd6e6";
      for (let y = 0; y < 54; y += 7) for (let x = -5; x <= 3; x += 7) g.fillRect(x, y, 5, 5);
      break;
    }
  }
  g.restore();
}

export function rrect(g, x, y, w, h, r, fill, stroke) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = OL; g.stroke(); }
}

export function drawMelon(g, x, y, r) {
  g.save(); g.translate(x, y);
  circle(g, 0, 0, r, "#3f9b4a");
  g.strokeStyle = "#1f5c2a"; g.lineWidth = 2.4;
  for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(i * r * 0.28, 0, r * 0.12, r * 0.96, 0, 0, Math.PI * 2); g.stroke(); }
  circle(g, 0, 0, r, null);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.4, r * 0.25, r * 0.15, -0.5, 0, Math.PI * 2); g.fill();
  g.restore();
}
