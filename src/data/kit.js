// Helpers for special moves shared across characters.
import { Projectile } from "../sim/projectile.js";
import { sign } from "../sim/math.js";

// Hit a victim directly (command grabs, cinematic finishers). Ignores shields.
export function directHit(w, a, v, h, x, y, moveId) {
  const d = w.describe(a, v, h, 1, moveId);
  d.dir = h.back ? -a.facing : (h.rev ? (sign(v.x - a.x) || a.facing) : a.facing);
  const [cx, cy] = v.centre();
  w.landHit(a, v, d, x ?? cx, y ?? cy, moveId, h);
}

// Nearest opponent in front within a box (local coords relative to fighter facing).
export function findVictim(f, w, x0, x1, y0, y1, needGround = false) {
  let best = null, bd = 1e9;
  for (const v of w.fighters) {
    if (v === f || v.dead || v.intan > 0 || v.invinc > 0 || v.state === "respawn") continue;
    if (w.cfg.teams && v.team === f.team) continue;
    if (needGround && !v.grounded) continue;
    const lx = (v.x - f.x) * f.facing, ly = v.y - f.y;
    if (lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1) { const d = Math.abs(lx); if (d < bd) { bd = d; best = v; } }
  }
  return best;
}

export function nearestFoe(f, w, maxDist = 1e9) {
  let best = null, bd = maxDist;
  for (const v of w.fighters) {
    if (v === f || v.dead || v.state === "respawn") continue;
    if (w.cfg.teams && v.team === f.team) continue;
    const d = Math.hypot(v.x - f.x, v.y - f.y);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

// Floating-text projectile (胡编体 etc.)
export function textShot(f, w, o) {
  const [x, y] = f.bone(o.bone || "fh", o.ox || 0, o.oy || 0);
  return w.spawnProjectile(new Projectile({
    owner: f, kind: "text", x, y, vx: (o.dir ?? f.facing) * (o.speed || 9), vy: o.vy || 0, g: o.g || 0, r: o.r || 22, life: o.life || 70,
    hb: { eff: "text", ...o.hb }, data: { text: o.text, col: o.col || "#fff", size: o.size || 30 }, moveId: o.moveId, clank: 1, solid: !!o.solid,
    draw: drawTextShot,
  }));
}
function drawTextShot(ctx, p, font, t, H) {
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.sin(p.age * 0.3) * 0.08);
  H.memeText(ctx, p.data.text, 0, 0, p.data.size, p.data.col, H.OUTLINE, font);
}

export function isFoe(f, v, w) { return v !== f && !(w.cfg.teams && v.team === f.team); }
