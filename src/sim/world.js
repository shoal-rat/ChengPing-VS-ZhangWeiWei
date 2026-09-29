// World: one match. Owns fighters, stage, projectiles, items; resolves hits; applies rules.
import { RNG, capsuleHit, clamp, sign, DEG } from "./math.js";
import { PHYS, SHIELD, TIMING, knockback, hitlagFrames } from "./const.js";
import { Fighter } from "./fighter.js";
import { Stage } from "./stage.js";
import { Items } from "./items.js";
import { killLine } from "./killline.js";

export class World {
  constructor(cfg) {
    // cfg: { stage: stageDef, players: [{def, source, cpu, color}], rules: {stocks, time, items, hazards, fsMeter}, seed }
    this.cfg = cfg;
    this.rng = new RNG(cfg.seed || 12345);
    this.rules = { stocks: 3, time: 0, items: true, hazards: true, teamAttack: false, ...cfg.rules };
    this.stage = new Stage(cfg.stage, this.rng);
    this.frame = 0;
    this.events = [];
    this.projectiles = [];
    this.fx = [];              // sim-affecting timed effects (fields, traps)
    this.fighters = cfg.players.map((p, i) => new Fighter(this, p.def, i, p.source, {
      cpu: p.cpu, color: p.color, stocks: this.rules.stocks || 99, team: p.team ?? i,
    }));
    this.items = new Items(this);
    const sp = this.stage.spawns;
    this.fighters.forEach((f, i) => {
      const s = sp[i % sp.length];
      f.reset(s.x, s.y, s.x > 0 ? -1 : 1);
      f.grounded = false;
    });
    this.over = false; this.winner = null; this.endFrame = 0;
    this.freeze = 0;           // global freeze (final smash cut-ins)
    this.slowmo = 0;
    this.timeLeft = this.rules.time ? this.rules.time * 60 : 0;
    this.countdown = cfg.countdown ?? 150;   // 3-2-1-GO frames
    for (const f of this.fighters) f.killLine = killLine(f, this.stage);
    this.cine = null;
  }

  emit(e) { e.frame = this.frame; this.events.push(e); }

  living() { return this.fighters.filter((f) => f.stocks > 0 || !f.dead); }

  step() {
    this.events.length = 0;
    if (this.countdown > 0) {
      this.countdown--;
      for (const f of this.fighters) { f.readInput(); f.prevX = f.x; f.prevY = f.y; f.integrate(); f.animate(); }
      if (this.countdown === 0) this.emit({ t: "go" });
      return;
    }
    if (this.over) { this.endFrame++; for (const f of this.fighters) if (!f.dead) { f.animate(); } return; }
    if (this.freeze > 0) { this.freeze--; if (this.cine && this.cine.step) this.cine.step(this); return; }
    this.frame++;
    if (this.timeLeft > 0) { this.timeLeft--; if (this.timeLeft === 0) this.timeUp(); }
    this.stage.step(this);
    for (const f of this.fighters) f.step();
    this.stepThrows();
    this.pushApart();
    for (const p of this.projectiles) p.step(this);
    this.items.step();
    for (const e of this.fx) e.step && e.step(this, e);
    this.fx = this.fx.filter((e) => !e.dead);
    this.resolveHits();
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.checkBlast();
    this.checkEnd();
  }

  // ------------------------------------------------------------------ hitboxes
  fighterHitboxes(f) {
    const out = [];
    if (f.dead || f.state !== "attack" || !f.move || !f.move.hb || f.hitlag > 0 && !f.move.hitDuringLag) return out;
    const m = f.move;
    if (m.charge != null && f.mf === m.charge && f.charge > 0 && f.chargeHeld) return out;
    const hbs = m.hb;
    for (let i = 0; i < hbs.length; i++) {
      const h = hbs[i];
      if (f.mf < h.f[0] || f.mf > h.f[1]) continue;
      if (h.cond && !h.cond(f)) continue;
      const [bx, by] = f.bone(h.bone || "ctr", h.x || 0, h.y || 0);
      const key = i;
      const prev = f.hbPrev.get(key);
      const sweep = prev && prev.mf === f.mf - 1 ? prev : null;
      f.hbPrev.set(key, { x: bx, y: by, mf: f.mf });
      out.push({ h, i, x: bx, y: by, px: sweep ? sweep.x : bx, py: sweep ? sweep.y : by, r: h.r, owner: f, move: m, moveId: f.moveId });
    }
    return out;
  }

  resolveHits() {
    const hits = [];
    const fs = this.fighters;
    for (const a of fs) {
      const hbs = this.fighterHitboxes(a);
      if (!hbs.length) continue;
      for (const v of fs) {
        if (v === a || !this.canHit(a, v)) continue;
        for (const hb of hbs) {
          const grp = hb.h.grp || 0;
          const key = v.slot * 16 + grp;
          if (hb.h.rehit) {
            const last = a.hitSet.has(key) ? a.vars["rh" + key] : -999;
            if (a.mf - last < hb.h.rehit) continue;
          } else if (a.hitSet.has(key)) continue;
          if (this.overlapFighter(hb, v)) {
            hits.push({ a, v, hb, key });
            break; // lowest index wins for this victim
          }
        }
      }
      // items hit by attacks
      this.items.hitByAttack(a, hbs);
    }
    // projectiles
    for (const p of this.projectiles) {
      if (p.dead || !p.active) continue;
      for (const v of fs) {
        if (!this.canHitProj(p, v)) continue;
        if (this.overlapProj(p, v)) { hits.push({ proj: p, v }); if (!p.pierce) break; }
      }
    }
    this.projClash();
    for (const h of hits) {
      if (h.proj) this.applyProjHit(h.proj, h.v);
      else this.applyHit(h.a, h.v, h.hb, h.key);
    }
  }

  canHit(a, v) {
    if (v.dead || v.intan > 0 || v.invinc > 0) return false;
    if (v.state === "respawn" || v.state === "ledgeact" && v.sf < 20) return false;
    if (!this.rules.teamAttack && a.team === v.team && a !== v && this.cfg.teams) return false;
    if (v.state === "grabbed" && v.grabber === a) return false;
    if (v.state === "thrown") return false;
    return true;
  }
  canHitProj(p, v) {
    if (p.owner === v && !p.hitsOwner) return false;
    if (p.rehit) { const l = p.lastHit[v.slot]; if (l != null && p.age - l < p.rehit) return false; }
    else if (p.hitSet.has(v.slot)) return false;
    if (v.dead || v.intan > 0 || v.invinc > 0 || v.state === "respawn" || v.state === "thrown") return false;
    if (this.cfg.teams && p.owner && p.owner.team === v.team && p.owner !== v) return false;
    return true;
  }

  overlapProj(p, v) {
    if (!p.rect) return this.overlapCircleFighter(p.x, p.y, p.px, p.py, p.r, v);
    const [x0, y0, x1, y1] = p.rect;
    const f = v.facing;
    for (const c of v.hurt) {
      const ax = v.x + c[0] * f, ay = v.y + c[1], bx = v.x + c[2] * f, by = v.y + c[3], r = c[4];
      for (const t of [0, 0.5, 1]) {
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        if (x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r) return true;
      }
    }
    return false;
  }
  overlapFighter(hb, v) {
    return this.overlapCircleFighter(hb.x, hb.y, hb.px, hb.py, hb.r, v);
  }
  overlapCircleFighter(x, y, px, py, r, v) {
    // shield bubble counts as the body when shielding
    if (v.state === "shield" || v.state === "shieldstun") {
      const [cx, cy] = v.centre();
      const sr = this.shieldRadius(v);
      if (capsuleHit(px, py, x, y, r, cx, cy, cx, cy, sr)) return true;
    }
    const f = v.facing;
    for (const c of v.hurt) {
      const ax = v.x + c[0] * f, ay = v.y + c[1], bx = v.x + c[2] * f, by = v.y + c[3];
      if (capsuleHit(px, py, x, y, r, ax, ay, bx, by, c[4])) return true;
    }
    return false;
  }
  shieldRadius(v) { return (v.body.shieldR || 58) * (0.35 + 0.65 * v.shieldHP / SHIELD.max); }

  // Build the hit description for a melee hitbox
  describe(a, v, h, extraMul = 1, moveId) {
    let dmg = (h.dynDmg && a ? h.dynDmg(a) : h.dmg) * extraMul;
    if (a) {
      if (moveId && !h.noStale) dmg *= a.staleMul(moveId);
      if (a.move && a.move.charge != null && a.charge) dmg *= 1 + 0.4 * (a.charge / 60);
      if (a.status.good) dmg *= 1.3;
      if (a.status.boost) dmg *= 1.3;
      if (a.status.giant) dmg *= 1.2;
      if (a.status.tiny) dmg *= 0.7;
      if (a.status.stance === "short") dmg *= 1.1;
      if (a.status.gloom) dmg *= 0.85;
    }
    dmg = Math.round(dmg * 10) / 10;
    const w = v.s.weight;
    const kbg = h.kbg ?? 100, bkb = h.bkb ?? 20;
    let kb = knockback(v.percent + dmg, dmg, w, kbg, bkb, h.fkb);
    if (h.execute && v.percent + dmg >= v.killLine) { kb = Math.max(kb, h.execute); }
    const lagMul = (h.lag || 1) * (h.eff === "elec" ? 1.5 : 1);
    return { dmg, kb, ang: h.ang ?? 361, lag: hitlagFrames(dmg, lagMul), eff: h.eff || "hit", sdi: h.sdi,
      stunMul: h.stunMul, noTumble: h.noTumble, link: null, owner: a };
  }

  applyHit(a, v, hb, key) {
    const h = hb.h;
    a.hitSet.add(key);
    a.vars["rh" + key] = a.mf;
    // counters
    if (v.counter && !h.grab) { this.triggerCounter(v, a, h.dmg, hb.x, hb.y); return; }
    const d = this.describe(a, v, h, 1, hb.moveId);
    d.dir = h.rev ? (sign(v.x - a.x) || a.facing) : (h.back ? -a.facing : a.facing);
    if (h.link) d.link = [a.x + a.facing * h.link[0], a.y + h.link[1]];
    if (h.linkBone) { const p = a.bone(h.linkBone, h.lx || 0, h.ly || 0); d.link = p; }
    // shield
    if ((v.state === "shield" || v.state === "shieldstun") && !h.unblockable) {
      this.shieldHit(v, a, d, hb);
      return;
    }
    this.landHit(a, v, d, hb.x, hb.y, hb.moveId, h);
    if (a.move && a.move.onHit) a.move.onHit(a, v, h, this);
    if (h.onHit) h.onHit(a, v, this);
  }

  // Common part of any successful hit (melee, projectile, item, hazard)
  landHit(a, v, d, x, y, moveId, h = {}) {
    const wasComboing = v.state === "hitstun" && v.lastHitBy === a;
    v.takeHit(d);
    if (a) {
      a.hitlag = d.lag;
      a.moveHit = true;
      a.stats.dmgDealt += d.dmg; a.stats.hits++;
      if (moveId) a.pushStale(moveId);
      a.combo = wasComboing ? a.combo + 1 : 1;
      a.comboTimer = 60;
      a.stats.maxCombo = Math.max(a.stats.maxCombo, a.combo);
      if (this.rules.fsMeter) a.fsMeter = Math.min(100, (a.fsMeter || 0) + d.dmg * 0.9);
    }
    const kill = d.kb > 70 && this.predictKO(v, d);
    this.emit({ t: "hit", a, v, x, y, dmg: d.dmg, kb: d.kb, eff: d.eff, kill, combo: a ? a.combo : 0,
      overLine: v.percent >= v.killLine, heavy: d.kb > 110, moveId });
    if (kill) { v.doomed = true; this.slowmo = 30; }
  }

  shieldHit(v, a, d, hb) {
    const perfect = v.state === "shield" && v.shieldOn <= SHIELD.parryWindow;
    if (perfect) {
      if (a) { a.hitlag = d.lag + SHIELD.parryFreeze; }
      v.hitlag = 0;
      v.state = "shield"; v.sf = 0; v.shieldOn = 99;
      this.emit({ t: "parry", v, a, x: hb.x, y: hb.y });
      return;
    }
    v.shieldHP -= d.dmg * SHIELD.dmgMul + (hb.h && hb.h.shieldDmg || 0);
    const stun = Math.floor(d.dmg * SHIELD.stunMul + SHIELD.stunAdd);
    v.hitlag = Math.max(2, Math.floor(d.lag * 0.7));
    if (a && !hb.proj) a.hitlag = Math.max(2, Math.floor(d.lag * 0.7));
    v.setState("shieldstun"); v.shieldStun = stun;
    const dir = a ? sign(v.x - a.x) || -v.facing : sign(hb.vx || 1);
    v.vx = dir * Math.min(12, d.dmg * SHIELD.pushMul * 10);
    if (a && a.grounded && !hb.proj) a.vx = -dir * Math.min(6, d.dmg * 0.25);
    this.emit({ t: "shieldhit", v, a, x: hb.x, y: hb.y, dmg: d.dmg });
    if (v.shieldHP <= 0) v.shieldBreak();
  }

  triggerCounter(v, a, incoming, x, y) {
    const c = v.counter;
    v.counter = null;
    if (a) { a.hitlag = 22; }
    v.intan = 20;
    this.emit({ t: "counter", v, a, x, y });
    if (c.onCounter) c.onCounter(v, a, incoming, this);
  }

  // ------------------------------------------------------------------ projectiles
  applyProjHit(p, v) {
    // reflect / absorb / counter
    if (v.reflect && p.reflectable !== false && p.owner !== v) {
      p.reflect(v, this); return;
    }
    if (v.absorb && p.absorbable !== false && p.owner !== v) {
      v.percent = Math.max(0, v.percent - p.hb.dmg * (v.absorb.heal || 1.5));
      p.dead = true;
      this.emit({ t: "absorb", v, x: p.x, y: p.y, p });
      if (v.absorb.onAbsorb) v.absorb.onAbsorb(v, p, this);
      return;
    }
    if (v.counter && p.owner !== v) { p.dead = true; this.triggerCounter(v, null, p.hb.dmg, p.x, p.y); return; }
    p.hitSet.add(v.slot); p.lastHit[v.slot] = p.age;
    const d = this.describe(null, v, p.hb, p.dmgMul || 1);
    d.owner = p.owner;
    d.dir = p.hb.rev ? sign(v.x - p.x) || 1 : (p.dir || sign(p.vx) || 1);
    if (p.hb.lag == null) d.lag = Math.max(2, Math.floor(d.lag * 0.9));
    if ((v.state === "shield" || v.state === "shieldstun") && !p.hb.unblockable) {
      this.shieldHit(v, null, d, { x: p.x, y: p.y, proj: true, vx: p.vx, h: p.hb });
    } else {
      this.landHit(p.owner, v, d, p.x, p.y, p.moveId, p.hb);
      if (p.owner) p.owner.hitlag = 0;
      if (p.onHit) p.onHit(p, v, this);
    }
    p.hits--;
    if (p.hits <= 0) p.kill(this, "hit");
  }

  projClash() {
    const ps = this.projectiles;
    for (let i = 0; i < ps.length; i++) {
      const a = ps[i];
      if (a.dead || !a.active || a.clank == null) continue;
      for (let j = i + 1; j < ps.length; j++) {
        const b = ps[j];
        if (b.dead || !b.active || b.clank == null || a.owner === b.owner) continue;
        const dx = a.x - b.x, dy = a.y - b.y, r = a.r + b.r;
        if (dx * dx + dy * dy > r * r) continue;
        if (a.clank > b.clank) { b.kill(this, "clash"); }
        else if (b.clank > a.clank) { a.kill(this, "clash"); }
        else { a.kill(this, "clash"); b.kill(this, "clash"); }
        this.emit({ t: "clash", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
    }
  }

  spawnProjectile(p) { this.projectiles.push(p); return p; }

  // ------------------------------------------------------------------ grabs
  tryGrab(a, g) {
    if (a.grabbed) return;
    let best = null, bd = 1e9;
    const gx = a.x + a.facing * g.x, gy = a.y + g.y;
    for (const v of this.fighters) {
      if (v === a || v.dead || v.intan > 0 || v.invinc > 0) continue;
      if (v.state === "grabbed" || v.state === "thrown" || v.state === "ledge" || v.state === "ledgeact" || v.state === "respawn") continue;
      if (!v.grounded && !g.air) continue;
      if (this.cfg.teams && v.team === a.team) continue;
      const vx = v.x, vy = v.y - 50;
      if (Math.abs(vx - gx) < g.w + v.ecbW && Math.abs(vy - gy) < g.h + 50) {
        const d = Math.abs(vx - a.x);
        if (d < bd) { bd = d; best = v; }
      }
    }
    if (!best) return;
    if (best.state === "grabbing" && best.grabbed) { this.grabRelease(best, best.grabbed); }
    if (best.counter && g.counterable) { this.triggerCounter(best, a, 5, best.x, best.y - 50); return; }
    const v = best;
    if (v.state === "attack") v.endMoveFlags();
    if (v.ledge) v.leaveLedge();
    a.endMoveFlags(); a.move = null;
    a.setState("grabbing"); a.grabbed = v; a.pummelT = 0;
    a.grabTimer = Math.floor(TIMING.grabBase + v.percent * TIMING.grabPerPct);
    v.setState("grabbed"); v.grabber = a; v.move = null; v.vx = 0; v.vy = 0; v.kbx = 0; v.kby = 0;
    v.facing = -a.facing;
    this.emit({ t: "grab", a, v });
    if (g.onGrab) g.onGrab(a, v, this);
  }
  holdVictim(a, v) {
    const dist = (a.body.holdDist || 52) + v.ecbW * 0.4;
    v.x = a.x + a.facing * dist; v.y = a.y;
    v.grounded = a.grounded; v.plat = a.plat;
    v.facing = -a.facing;
  }
  pummel(a, v) {
    const dmg = a.def.pummelDmg || 1.4;
    v.percent += dmg; a.stats.dmgDealt += dmg; v.stats.dmgTaken += dmg;
    a.hitlag = 4; v.hitlag = 4; v.shake = 4; v.flash = 6;
    const [x, y] = v.centre();
    this.emit({ t: "hit", a, v, x, y, dmg, kb: 0, eff: "hit", pummel: true });
  }
  grabRelease(a, v) {
    a.grabbed = null; v.grabber = null;
    a.setState("idle"); a.vx = -a.facing * 6;
    v.setState(v.grounded ? "idle" : "air"); v.vx = a.facing * 8;
    v.hitlag = 0; a.hitlag = 0;
    v.intan = 4;
    a.landLag = 10; a.setState("land");
    v.landLag = 16; if (v.grounded) v.setState("land");
    this.emit({ t: "grabrelease", a, v });
  }
  stepThrows() {
    for (const a of this.fighters) {
      if (a.state !== "attack" || !a.move || !a.move.throw || !a.throwVictim) continue;
      const v = a.throwVictim, m = a.move, T = m.throw;
      if (v.dead) { a.throwVictim = null; continue; }
      if (a.mf < T.f) {
        v.state = "thrown";
        const [bx, by] = a.bone(T.bone || "fh", T.ox || 0, T.oy || 0);
        v.x = bx; v.y = by + (T.hangY ?? 50);
        v.facing = -a.facing;
        v.vx = v.vy = v.kbx = v.kby = 0;
        v.grounded = false;
        v.animate();
      } else if (a.mf === T.f) {
        a.throwVictim = null; a.grabbed = null; v.grabber = null;
        v.state = "air"; v.grounded = false; v.plat = null;
        const d = this.describe(a, v, T, 1, a.moveId);
        d.dir = T.back ? -a.facing : a.facing;
        d.throw = true;
        const [x, y] = v.centre();
        this.landHit(a, v, d, x, y, a.moveId, T);
        a.hitlag = Math.floor(d.lag * 0.5);
        if (T.onThrow) T.onThrow(a, v, this);
      }
    }
  }

  pushApart() {
    const fs = this.fighters;
    for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
      const a = fs[i], b = fs[j];
      if (a.dead || b.dead || !a.grounded || !b.grounded || a.plat !== b.plat) continue;
      if (a.state === "grabbing" || b.state === "grabbing" || a.state === "grabbed" || b.state === "grabbed") continue;
      if (a.intan > 0 && a.state === "roll" || b.intan > 0 && b.state === "roll") continue;
      const dx = b.x - a.x, min = a.ecbW + b.ecbW - 6;
      if (Math.abs(dx) < min) {
        const push = Math.min(2.2, (min - Math.abs(dx)) * 0.25);
        const s = dx === 0 ? (a.slot < b.slot ? 1 : -1) : sign(dx);
        a.x -= s * push; b.x += s * push;
        if (a.plat) { a.x = clamp(a.x, a.plat.x1, a.plat.x2); b.x = clamp(b.x, b.plat.x1, b.plat.x2); }
      }
    }
  }

  // ------------------------------------------------------------------ KO / rules
  predictKO(v, d) {
    const B = this.stage.blast;
    let ang = d.ang;
    if (ang === 361) ang = v.grounded ? 40 : 45;
    let lx = Math.cos(ang * DEG) * d.dir, ly = -Math.sin(ang * DEG);
    if (d.link) return false;
    const spd = d.kb * PHYS.kbScale;
    let kx = lx * spd, ky = ly * spd, x = v.x, y = v.y - 50, vy = 0;
    const g = v.s.gravity, fall = v.s.fall;
    for (let t = 0; t < 240; t++) {
      const m = Math.hypot(kx, ky);
      if (m <= 0.01 && t > 10) break;
      const nm = Math.max(0, m - PHYS.kbDecay);
      if (m > 0) { kx *= nm / m; ky *= nm / m; }
      vy = Math.min(vy + g, fall);
      x += kx; y += ky + vy;
      if (x < B.left || x > B.right || y < B.top || y > B.bottom) return true;
    }
    return false;
  }

  checkBlast() {
    const B = this.stage.blast;
    for (const f of this.fighters) {
      if (f.dead) continue;
      const cy = f.y - 50;
      let side = null;
      if (f.x < B.left) side = "left"; else if (f.x > B.right) side = "right";
      else if (cy > B.bottom) side = "bottom";
      else if (cy < B.top && (f.state === "hitstun" || f.state === "tumble")) side = "top";
      if (side) this.ko(f, side);
    }
  }

  ko(f, side) {
    const killer = f.lastHitBy && this.frame - f.lastHitFrame < 480 && f.lastHitBy !== f ? f.lastHitBy : null;
    if (f.grabbed) { const v = f.grabbed; v.grabber = null; v.setState("air"); f.grabbed = null; }
    if (f.grabber) { f.grabber.grabbed = null; f.grabber.toIdle(); f.grabber = null; }
    if (f.ledge) f.leaveLedge();
    if (f.item) this.items.dropHeld(f, true);
    f.dead = true; f.deadTimer = 0; f.doomed = false;
    f.stocks = this.rules.stocks ? f.stocks - 1 : f.stocks;
    f.stats.falls++;
    if (killer) killer.stats.kos++; else f.stats.sds++;
    f.fsReady = false;
    this.emit({ t: "ko", f, side, killer, x: clamp(f.x, this.stage.blast.left, this.stage.blast.right),
      y: clamp(f.y - 50, this.stage.blast.top, this.stage.blast.bottom), overLine: f.percent >= f.killLine });
    f.percent = 0;
    if (f.stocks <= 0) { f.outFrame = this.frame; }
  }

  timeUp() {
    this.emit({ t: "timeup" });
    this.finish(true);
  }

  checkEnd() {
    if (this.over) return;
    if (!this.rules.stocks) return;
    const alive = this.fighters.filter((f) => f.stocks > 0);
    const teams = new Set(alive.map((f) => (this.cfg.teams ? f.team : f.slot)));
    if (teams.size <= 1 && this.fighters.length > 1) this.finish(false);
  }

  finish(timeout) {
    this.over = true; this.endFrame = 0;
    const score = (f) => this.rules.stocks ? f.stocks * 1000 - f.percent + (f.outFrame || 99999) * 0.001 : f.stats.kos - f.stats.falls - f.stats.sds;
    const ranked = [...this.fighters].sort((a, b) => score(b) - score(a));
    this.ranking = ranked;
    this.winner = ranked[0];
    this.emit({ t: "game", winner: this.winner, timeout });
  }
}
