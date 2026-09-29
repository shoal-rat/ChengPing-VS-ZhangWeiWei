// Smash-style camera: frames every living fighter, eases zoom, adds trauma shake and
// punch-in for kill hits.
import { clamp, lerp } from "../sim/math.js";

export class Camera {
  constructor() {
    this.x = 0; this.y = -200; this.zoom = 0.55;
    this.tx = 0; this.ty = -200; this.tz = 0.55;
    this.trauma = 0; this.shx = 0; this.shy = 0;
    this.dpr = 1; this.vw = 1280; this.vh = 720; this.pxW = 1280; this.pxH = 720;
    this.punch = null;
  }
  resize(pxW, pxH, dpr) {
    this.pxW = pxW; this.pxH = pxH; this.dpr = dpr;
    this.scale = pxW / 1280;          // virtual -> css px
    this.vw = 1280; this.vh = 1280 * pxH / pxW;
  }
  addTrauma(t) { this.trauma = Math.min(1, this.trauma + t); }
  punchIn(x, y, frames = 34, z = 1.6) { this.punch = { x, y, t: frames, T: frames, z }; }

  update(world, dt = 1) {
    const st = world.stage.def.cam || { left: -1500, right: 1500, top: -1100, bottom: 500 };
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
    for (const f of world.fighters) {
      if (f.dead) continue;
      const cx = clamp(f.x, world.stage.blast.left + 200, world.stage.blast.right - 200);
      const cy = clamp(f.y, world.stage.blast.top + 200, world.stage.blast.bottom - 100);
      const px = this.tight ? 90 : 140;
      x0 = Math.min(x0, cx - px); x1 = Math.max(x1, cx + px);
      y0 = Math.min(y0, cy - (this.tight ? 220 : 250)); y1 = Math.max(y1, cy + 90);
      n++;
    }
    if (!n) { x0 = -600; x1 = 600; y0 = -500; y1 = 100; }
    // always keep some of the main stage in view
    if (!this.tight) { x0 = Math.min(x0, st.focusL ?? -380); x1 = Math.max(x1, st.focusR ?? 380); }
    y1 = Math.max(y1, 120) + (this.hudTop ? 0 : 70);   // leave room for the HUD cards
    if (this.hudTop) y0 -= 90;
    const bw = x1 - x0, bh = y1 - y0;
    const zx = this.vw / (bw + (this.tight ? 80 : 160)), zy = this.vh / (bh + (this.tight ? 60 : 120));
    this.tz = clamp(Math.min(zx, zy), st.minZoom ?? 0.36, st.maxZoom ?? 1.05);
    this.tx = (x0 + x1) / 2; this.ty = (y0 + y1) / 2 - 20;
    // clamp so the view stays inside camera bounds
    const hw = this.vw / 2 / this.tz, hh = this.vh / 2 / this.tz;
    this.tx = clamp(this.tx, st.left + hw, Math.max(st.left + hw, st.right - hw));
    this.ty = clamp(this.ty, st.top + hh, Math.max(st.top + hh, st.bottom - hh));
    const k = 0.085 * dt;
    this.zoom = lerp(this.zoom, this.tz, k);
    this.x = lerp(this.x, this.tx, k * 1.2);
    this.y = lerp(this.y, this.ty, k * 1.2);
    // shake
    this.trauma = Math.max(0, this.trauma - 0.022 * dt);
    const s = this.trauma * this.trauma * 26;
    const t = performance.now() * 0.05;
    this.shx = s * (Math.sin(t * 1.7) + Math.sin(t * 3.1)) * 0.5;
    this.shy = s * (Math.cos(t * 1.3) + Math.sin(t * 2.3)) * 0.5;
    if (this.punch) { this.punch.t -= dt; if (this.punch.t <= 0) this.punch = null; }
  }

  // Effective view (includes punch-in)
  view() {
    let x = this.x, y = this.y, z = this.zoom;
    if (this.punch) {
      const p = this.punch, k = Math.sin(Math.min(1, p.t / p.T) * Math.PI) ** 0.6;
      x = lerp(x, p.x, k * 0.7); y = lerp(y, p.y, k * 0.7); z = z * lerp(1, p.z, k);
    }
    return { x: x + this.shx / z, y: y + this.shy / z, z };
  }

  apply(ctx) {
    const v = this.view();
    const s = this.scale * this.dpr * v.z;
    ctx.setTransform(s, 0, 0, s, this.pxW * this.dpr / 2 - v.x * s, this.pxH * this.dpr / 2 - v.y * s);
    this.cur = v;
    return v;
  }
  // world -> virtual screen coords
  toScreen(wx, wy) {
    const v = this.cur || this.view();
    return [(wx - v.x) * v.z + this.vw / 2, (wy - v.y) * v.z + this.vh / 2];
  }
}
