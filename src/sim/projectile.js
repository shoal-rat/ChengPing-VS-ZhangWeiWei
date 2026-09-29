// Projectiles: anything that flies and hits on its own (chalk, shockwaves, thrown items...).
import { sign } from "./math.js";

let NEXT_ID = 1;

export class Projectile {
  constructor(o) {
    this.id = NEXT_ID++;
    this.owner = null;
    this.kind = "orb";
    this.x = 0; this.y = 0; this.px = 0; this.py = 0;
    this.vx = 0; this.vy = 0; this.g = 0; this.drag = 0;
    this.r = 16;
    this.life = 90; this.age = 0;
    this.hits = 1;
    this.pierce = false;
    this.active = true;
    this.hb = { dmg: 5, ang: 45, bkb: 20, kbg: 60 };
    this.clank = 1;               // clash tier; null = never clashes
    this.reflectable = true; this.absorbable = true;
    this.solid = false;           // dies on stage contact
    this.bounce = 0;              // bounce factor on floor instead of dying
    this.dmgMul = 1;
    this.rot = 0; this.spin = 0;
    this.scale = 1;
    this.data = {};
    Object.assign(this, o);
    this.hitSet = new Set();
    this.lastHit = {};
    this.px = this.x; this.py = this.y;
    this.dir = this.dir || sign(this.vx) || (this.owner ? this.owner.facing : 1);
  }

  step(w) {
    if (this.dead) return;
    this.age++;
    this.px = this.x; this.py = this.y;
    if (this.update) this.update(this, w);
    if (this.dead) return;
    this.vy += this.g;
    if (this.drag) { this.vx *= 1 - this.drag; this.vy *= 1 - this.drag; }
    this.x += this.vx; this.y += this.vy;
    this.rot += this.spin;
    if (this.solid || this.bounce) {
      const st = w.stage;
      for (const p of st.plats) {
        if (this.x < p.x1 || this.x > p.x2) continue;
        if (this.py <= p.y && this.y + this.r * 0.5 >= p.y && this.vy >= 0 && (p.solid || this.softStop)) {
          if (this.bounce && Math.abs(this.vy) > 2) { this.y = p.y - this.r * 0.5; this.vy = -this.vy * this.bounce; this.vx *= 0.85; if (this.onBounce) this.onBounce(this, w); }
          else if (this.solid) { this.kill(w, "ground"); return; }
          else { this.y = p.y - this.r * 0.5; this.vy = 0; this.vx *= 0.8; }
        }
        if (p.solid && this.y > p.y + 4 && this.y < p.y + p.depth && this.solid) { this.kill(w, "wall"); return; }
      }
    }
    const B = w.stage.blast;
    if (--this.life <= 0 || this.x < B.left - 200 || this.x > B.right + 200 || this.y > B.bottom + 200 || this.y < B.top - 400) {
      this.kill(w, "expire");
    }
  }

  reflect(by, w) {
    this.owner = by;
    this.vx = -this.vx * 1.15; this.vy = -Math.abs(this.vy) * 0.3;
    if (Math.abs(this.vx) < 4) this.vx = by.facing * 8;
    this.dir = sign(this.vx);
    this.dmgMul *= 1.25;
    this.life = Math.max(this.life, 60);
    this.hitSet.clear();
    this.g = 0;
    this.data.reflected = true;
    w.emit({ t: "reflect", v: by, x: this.x, y: this.y });
  }

  kill(w, why) {
    if (this.dead) return;
    this.dead = true;
    if (this.onExpire) this.onExpire(this, w, why);
    w.emit({ t: "projdie", p: this, why, x: this.x, y: this.y });
  }
}
