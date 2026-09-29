// Final-smash helpers shared by several characters.
import { Projectile } from "../sim/projectile.js";

// A screen-crossing rectangular beam from the fighter's hand: many small linking hits,
// then one big launcher on the last tick.
export function finalBeam(f, w, o) {
  const [hx, hy] = f.bone(o.bone || "fh");
  const dir = f.facing;
  const len = o.len || 2200, h = o.h || 160;
  const p = new Projectile({
    owner: f, kind: o.kind || "fsBeam", x: hx, y: hy, vx: 0, vy: 0, r: h / 2, life: o.life || 90,
    hits: 999, pierce: true, rehit: o.tick || 6, reflectable: false, absorbable: false, clank: null,
    hb: { dmg: o.dmg || 2, ang: 0, bkb: 0, kbg: 100, fkb: 12, eff: o.eff || "beam", lag: 0.6, noTumble: true, stunMul: 1.6 },
    data: { dir, len, h, x0: hx, y0: hy },
    moveId: "final",
    update: (pr) => {
      const grow = Math.min(1, pr.age / 10);
      const L = len * grow;
      pr.rect = dir > 0 ? [pr.data.x0, pr.data.y0 - h / 2, pr.data.x0 + L, pr.data.y0 + h / 2]
        : [pr.data.x0 - L, pr.data.y0 - h / 2, pr.data.x0, pr.data.y0 + h / 2];
      if (pr.life === 8) { pr.hb = { ...o.final, eff: o.eff || "beam" }; pr.rehit = 0; pr.hitSet.clear(); }
      if (pr.life > 8) pr.hb.link = null;
    },
  });
  p.rect = [hx, hy - h / 2, hx, hy + h / 2];
  w.spawnProjectile(p);
  w.emit({ t: "sfx", id: "beam", f });
  return p;
}
