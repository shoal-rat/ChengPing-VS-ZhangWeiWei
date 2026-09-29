// 斩杀线: the percent at which a fighter dies to a standard strong hit (a fully fresh
// forward smash: 16%, 40°, bkb 30, kbg 102) landed two thirds of the way to the ledge.
// Shown on the HUD; crossing it arms "斩杀" finishers and the kill-screen effect.
import { PHYS, knockback } from "./const.js";
import { DEG } from "./math.js";

export function killLine(f, stage) {
  const B = stage.blast;
  const main = stage.plats.filter((p) => p.solid).sort((a, b) => (b.x2 - b.x1) - (a.x2 - a.x1))[0];
  const x0 = main ? main.x1 + (main.x2 - main.x1) * 0.83 : 300;
  const y0 = main ? main.y : 0;
  const w = f.s.weight, g = f.s.gravity, fall = f.s.fall;
  const dies = (pct) => {
    const d = 16;
    const kb = knockback(pct + d, d, w, 102, 30);
    const spd = kb * PHYS.kbScale;
    let kx = Math.cos(40 * DEG) * spd, ky = -Math.sin(40 * DEG) * spd, x = x0, y = y0 - 50, vy = 0;
    // DI away (up-in-toward survival): rotate 15° up
    const a = Math.atan2(ky, kx) - 15 * DEG * 0.6;
    kx = Math.cos(a) * spd; ky = Math.sin(a) * spd;
    for (let t = 0; t < 260; t++) {
      const m = Math.hypot(kx, ky);
      if (m < 0.01 && t > 12) break;
      const nm = Math.max(0, m - PHYS.kbDecay);
      if (m > 0) { kx *= nm / m; ky *= nm / m; }
      vy = Math.min(vy + g, fall);
      x += kx; y += ky + vy;
      if (x > B.right || y < B.top) return true;
    }
    return false;
  };
  let lo = 0, hi = 400;
  if (!dies(hi)) return 400;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (dies(mid)) hi = mid; else lo = mid; }
  return hi;
}
