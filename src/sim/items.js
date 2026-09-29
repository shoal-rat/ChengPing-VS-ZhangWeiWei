// Items: 快递 crates drop from the sky; inside are 板砖 / 大瓜 / 键盘 / 饺子. The 爆 badge
// (热搜) is this game's Smash Ball: break it to arm your final smash.
import { Projectile } from "./projectile.js";
import { clamp, sign } from "./math.js";

export const ITEM_TYPES = {
  brick: { name: "板砖", r: 16, throwable: true,
    hb: { dmg: 12, ang: 40, bkb: 38, kbg: 72 }, speed: 17, g: 0.42 },
  melon: { name: "大瓜", r: 18, throwable: true, speed: 12.5, g: 0.5,
    boom: { dmg: 17, ang: 60, bkb: 62, kbg: 84, eff: "boom" }, fuse: 300 },
  keyboard: { name: "键盘", r: 22, weapon: true, uses: 10,
    hb: { dmg: 9, ang: 45, bkb: 30, kbg: 70 }, speed: 15, g: 0.4 },
  dumpling: { name: "饺子", r: 16, heal: 15 },
  crate: { name: "快递", r: 28, hp: 2 },
  bao: { name: "爆", r: 32, hp: 3 },
};
const LOOT = ["brick", "brick", "melon", "keyboard", "dumpling", "melon", "keyboard", "dumpling"];
// 快递 box contents: whoever breaks it gets the effect immediately.
export const BOX_LOOT = [
  { id: "dumpling", name: "一盘饺子", w: 18 },
  { id: "star", name: "一键三连·无敌", w: 10 },
  { id: "boost", name: "流量加持", w: 16 },
  { id: "giant", name: "大V认证·变大", w: 12 },
  { id: "tiny", name: "被限流·变小", w: 9 },
  { id: "brick", name: "板砖", w: 12 },
  { id: "melon", name: "大瓜", w: 12 },
  { id: "keyboard", name: "键盘", w: 11 },
];

let NEXT = 1;

export class Items {
  constructor(world) {
    this.w = world;
    this.list = [];
    this.timer = 360;
    this.baoTimer = 1200;
  }

  get on() { return !!this.w.rules.items; }

  spawn(type, x, y, extra = {}) {
    const T = ITEM_TYPES[type];
    const it = { id: NEXT++, type, x, y, vx: 0, vy: 0, r: T.r, grounded: false, plat: null, holder: null,
      life: type === "bao" ? 1500 : 1200, hp: T.hp || 0, uses: T.uses || 0, age: 0, lastHit: null, fuse: 0, rot: 0, ...extra };
    this.list.push(it);
    this.w.emit({ t: "itemspawn", it });
    return it;
  }

  randomSpot() {
    const plats = this.w.stage.plats;
    const p = plats[this.w.rng.int(0, plats.length - 1)];
    return { x: this.w.rng.range(p.x1 + 40, p.x2 - 40), y: p.y - 700 };
  }

  step() {
    const w = this.w;
    if (this.on && !w.over) {
      if (--this.timer <= 0) {
        this.timer = w.rng.int(420, 720);
        if (this.list.filter((i) => i.type !== "bao").length < 4) {
          const s = this.randomSpot();
          this.spawn(w.rng.chance(0.8) ? "crate" : w.rng.pick(LOOT), s.x, s.y);
        }
      }
      if (--this.baoTimer <= 0) {
        this.baoTimer = w.rng.int(1800, 2600);
        const anyReady = w.fighters.some((f) => f.fsReady);
        if (!anyReady && !this.list.some((i) => i.type === "bao")) this.spawn("bao", w.rng.range(-300, 300), -420);
      }
    }
    for (const it of this.list) {
      it.age++;
      if (it.holder) {
        const h = it.holder;
        if (h.dead || h.item !== it) { it.holder = null; }
        else { const [x, y] = h.bone("fh"); it.x = x; it.y = y; continue; }
      }
      if (it.type === "bao") { this.stepBao(it); continue; }
      if (!it.grounded) {
        it.vy = Math.min(it.vy + 0.55, 14);
        const ny = it.y + it.vy;
        const land = w.stage.findLanding(it.x + it.vx, it.y, ny, false, null);
        it.x += it.vx; it.y = ny; it.rot += it.vx * 0.05;
        if (land) { it.y = land.y; it.grounded = true; it.plat = land; it.vy = 0; it.vx = 0; w.emit({ t: "itemland", it }); }
      } else if (it.plat) {
        it.x += it.plat.dx; it.y = it.plat.y;
        if (it.x < it.plat.x1 || it.x > it.plat.x2) { it.grounded = false; it.plat = null; }
      }
      if (it.type === "melon" && it.fuse > 0 && --it.fuse === 0) { this.explode(it.x, it.y - 18, null); it.dead = true; }
      if (it.type === "dumpling") {
        for (const f of w.fighters) {
          if (f.dead) continue;
          if (Math.abs(f.x - it.x) < 40 && Math.abs(f.y - 40 - it.y) < 70) {
            f.percent = Math.max(0, f.percent - ITEM_TYPES.dumpling.heal);
            it.dead = true;
            w.emit({ t: "heal", f, amt: ITEM_TYPES.dumpling.heal, x: it.x, y: it.y });
            break;
          }
        }
      }
      if (--it.life <= 0 || it.y > w.stage.blast.bottom) it.dead = true;
    }
    this.list = this.list.filter((i) => !i.dead);
  }

  stepBao(it) {
    const w = this.w;
    const t = it.age;
    it.life--;
    if (it.life <= 0) { it.vy -= 0.4; it.y += it.vy; if (it.y < w.stage.blast.top) it.dead = true; return; }
    // wander in a lissajous around the stage, nudged by hits
    const tx = Math.sin(t * 0.008) * 380 + Math.sin(t * 0.021) * 100;
    const ty = -250 + Math.sin(t * 0.015) * 110;
    it.vx += (tx - it.x) * 0.0014; it.vy += (ty - it.y) * 0.0014;
    it.vx *= 0.975; it.vy *= 0.975;
    it.x += it.vx; it.y += it.vy;
    it.rot = Math.sin(t * 0.05) * 0.2;
  }

  // Melee hitboxes against crates / orbs / melons
  hitByAttack(a, hbs) {
    for (const it of this.list) {
      if (it.holder || it.dead) continue;
      if (!(it.type === "crate" || it.type === "bao" || it.type === "melon")) continue;
      if (it.lastHit === a.moveSerial + ":" + a.slot) continue;
      for (const hb of hbs) {
        const dx = hb.x - it.x, dy = hb.y - (it.type === "bao" ? it.y : it.y - it.r);
        const R = hb.r + it.r;
        if (dx * dx + dy * dy > R * R) continue;
        it.lastHit = a.moveSerial + ":" + a.slot;
        a.hitlag = Math.max(a.hitlag, 4);
        if (it.type === "melon") { this.explode(it.x, it.y - 18, a); it.dead = true; break; }
        it.hp -= Math.max(1, Math.round(hb.h.dmg / 7));
        const dir = sign(it.x - a.x) || a.facing;
        it.vx += dir * 5; it.vy -= 4; if (it.type === "crate") { it.grounded = false; it.plat = null; }
        this.w.emit({ t: "itemhit", it, a, x: it.x, y: it.y });
        if (it.hp <= 0) {
          it.dead = true;
          if (it.type === "crate") {
            this.unbox(a, it);
            this.w.emit({ t: "cratebreak", x: it.x, y: it.y - 20 });
          } else {
            a.fsReady = true;
            this.w.emit({ t: "fsready", f: a, x: it.x, y: it.y });
          }
        }
        break;
      }
    }
  }

  unbox(f, it) {
    const w = this.w;
    let r = w.rng.next() * BOX_LOOT.reduce((a, b) => a + b.w, 0);
    let L = BOX_LOOT[0];
    for (const x of BOX_LOOT) { if ((r -= x.w) <= 0) { L = x; break; } }
    const st = f.status;
    switch (L.id) {
      case "dumpling": f.percent = Math.max(0, f.percent - 15); w.emit({ t: "heal", f, amt: 15, x: f.x, y: f.y - 100 }); break;
      case "star": f.invinc = Math.max(f.invinc, 480); st.star = { t: 480 }; break;
      case "boost": st.boost = { t: 600 }; break;
      case "giant": delete st.tiny; st.giant = { t: 600 }; break;
      case "tiny": delete st.giant; st.tiny = { t: 480 }; break;
      default: {
        if (f.item) this.dropHeld(f, true);
        const held = this.spawn(L.id, f.x, f.y - 60);
        held.holder = f; f.item = held;
      }
    }
    w.emit({ t: "unbox", f, name: L.name, id: L.id, x: it.x, y: it.y - 40 });
  }

  tryPickup(f) {
    if (f.item || !f.grounded) return false;
    let best = null, bd = 1e9;
    for (const it of this.list) {
      if (it.holder || !it.grounded) continue;
      const T = ITEM_TYPES[it.type];
      if (!T.throwable && !T.weapon) continue;
      const d = Math.abs(it.x - f.x);
      if (d < 62 && Math.abs(it.y - f.y) < 30 && d < bd) { bd = d; best = it; }
    }
    if (!best) return false;
    best.holder = f; best.grounded = false; best.plat = null;
    f.item = best;
    f.landLag = 6; f.setState("land");
    this.w.emit({ t: "pickup", f, it: best });
    return true;
  }

  fighterAttack(f, moving) {
    const it = f.item;
    if (!it) return false;
    const T = ITEM_TYPES[it.type];
    if (T.weapon) {
      const p = f.pad;
      const smash = f.buf.smh <= 1 || (p.flick <= 3 && Math.abs(p.mx) > 0.8);
      if (!f.grounded) f.startMove("itemAir");
      else f.startMove(smash ? "itemSmash" : moving ? "itemDash" : "itemSwing");
      return true;
    }
    this.throwHeld(f);
    return true;
  }

  // Called by weapon moves when they connect
  useWeapon(f) {
    const it = f.item;
    if (!it) return;
    if (--it.uses <= 0) { f.item = null; it.dead = true; this.w.emit({ t: "itembreak", it, x: it.x, y: it.y }); }
  }

  throwHeld(f) {
    const it = f.item;
    if (!it) return;
    const T = ITEM_TYPES[it.type];
    const p = f.pad;
    let dx = f.facing, dy = 0;
    if (p.my < -0.5 && Math.abs(p.mx) < 0.6) { dx = 0; dy = -1; }
    else if (p.my > 0.5 && Math.abs(p.mx) < 0.6) { dx = 0; dy = 1; }
    else if (Math.abs(p.mx) > 0.3) dx = sign(p.mx);
    const strong = (p.flick <= 4 && Math.hypot(p.mx, p.my) > 0.8) || f.buf.smh <= 1 ? 1.35 : 1;
    f.item = null; it.holder = null; it.dead = true;
    const [x, y] = f.bone("fh");
    const spd = (T.speed || 12) * strong;
    const vx = dx * spd + (dy ? 0 : f.vx * 0.3), vy = dy ? dy * spd : -3.5;
    const w = this.w;
    const hb = T.hb ? { ...T.hb, dmg: T.hb.dmg * (strong > 1 ? 1.25 : 1) } : { dmg: 6, ang: 45, bkb: 20, kbg: 50 };
    w.spawnProjectile(new Projectile({
      owner: f, kind: "item:" + it.type, x, y, vx, vy, g: T.g || 0.45, r: T.r + 4, life: 120, hb,
      spin: 0.25 * (dx || 1), clank: 1, solid: true, moveId: "throw_" + it.type,
      onExpire: (pr, W, why) => {
        if (it.type === "melon") this.explode(pr.x, pr.y, f);
        else if (it.type === "brick") W.emit({ t: "itembreak", it, x: pr.x, y: pr.y });
        else if (it.type === "keyboard") { if (why === "ground") { const k = this.spawn("keyboard", pr.x, pr.y - 10, { uses: it.uses }); } else W.emit({ t: "itembreak", it, x: pr.x, y: pr.y }); }
      },
    }));
    if (f.grounded && f.state !== "attack") { f.landLag = 12; f.setState("land"); }
    w.emit({ t: "throwitem", f, it });
  }

  dropHeld(f, destroy) {
    const it = f.item;
    if (!it) return;
    f.item = null; it.holder = null;
    if (destroy) { it.dead = true; return; }
    it.grounded = false; it.vy = -2;
  }

  explode(x, y, owner) {
    const w = this.w;
    const T = ITEM_TYPES.melon;
    w.spawnProjectile(new Projectile({
      owner, kind: "boom", x, y, r: 92, life: 7, hits: 99, pierce: true, hitsOwner: true,
      hb: { ...T.boom, rev: true }, reflectable: false, absorbable: false, clank: null, moveId: "melon",
    }));
    w.emit({ t: "explode", x, y, big: true });
  }
}
