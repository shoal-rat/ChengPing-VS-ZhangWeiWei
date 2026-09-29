// CPU player. Reads the world like a person would (with reaction delay), writes a Pad.
// Levels 1..9 scale reaction time, accuracy, defence and recovery skill.
import { emptyPad } from "../engine/input.js";
import { clamp, sign } from "./math.js";

const LV = (lv) => {
  const k = (lv - 1) / 8;          // 0..1
  return {
    react: Math.round(34 - 27 * k),          // frames of perception lag
    aggro: 0.35 + 0.5 * k,
    shield: 0.08 + 0.62 * k,
    tech: 0.1 + 0.75 * k,
    di: 0.2 + 0.8 * k,
    punish: 0.15 + 0.8 * k,
    recover: 0.45 + 0.55 * k,
    edge: 0.05 + 0.7 * k,
    mistake: 0.3 - 0.27 * k,
    think: Math.round(14 - 10 * k),           // frames between neutral decisions
    lv,
  };
};

export class CpuSource {
  constructor(level = 5, rng) {
    this.kind = "cpu";
    this.lv = clamp(level, 1, 9);
    this.P = LV(this.lv);
    this.rng = rng;
    this.hist = [];           // perceived world snapshots
    this.plan = null;
    this.hold = {};
    this.prev = emptyPad();
    this.cool = 0;
    this.ledgeWait = 0;
    this.mode = "neutral";
    this.jumpHold = 0;
    this.projCD = 0;
  }
  r() { return this.rng ? this.rng.next() : Math.random(); }

  read(me) {
    const w = me.world;
    const pad = emptyPad();
    this.snapshot(w);
    if (!w.countdown && !w.over && !me.dead) this.think(me, w, pad);
    // derive press edges
    for (const k of ["atk", "spc", "jmp", "shd", "grb", "smh", "tnt"]) pad.p[k] = pad[k] && !this.prev[k];
    if (pad.pressAgain) for (const k of pad.pressAgain) pad.p[k] = true;
    pad.flick = pad.flick ?? 99;
    this.prev = pad;
    return pad;
  }

  snapshot(w) {
    const s = w.fighters.map((f) => ({ f, x: f.x, y: f.y, vx: f.vx + f.kbx, vy: f.vy + f.kby, st: f.state, mv: f.moveId, mf: f.mf,
      grounded: f.grounded, dead: f.dead, pct: f.percent, shield: f.state === "shield", hit: f.state === "hitstun" }));
    this.hist.push(s);
    if (this.hist.length > 40) this.hist.shift();
  }
  seen(f) {
    const i = Math.max(0, this.hist.length - 1 - this.P.react);
    const snap = this.hist[i];
    return snap ? snap.find((s) => s.f === f) : null;
  }

  target(me, w) {
    let best = null, bd = 1e9;
    for (const f of w.fighters) {
      if (f === me || f.dead || (w.cfg.teams && f.team === me.team)) continue;
      const d = Math.abs(f.x - me.x) + Math.abs(f.y - me.y) * 0.7 - (f === me.lastHitBy ? 150 : 0);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  think(me, w, pad) {
    const P = this.P;
    const st = me.state;
    const T = this.target(me, w);
    const stg = w.stage;
    const main = stg.plats.find((p) => p.solid);
    // ---- grabbed: mash
    if (st === "grabbed" || st === "dizzy" || st === "stun") {
      if (w.frame % 3 === 0) { pad.atk = true; pad.mx = (w.frame % 6 === 0) ? 1 : -1; }
      return;
    }
    // ---- hit: DI + tech
    if (me.hitlag > 0 && me.pendingKB) {
      if (this.r() < P.di) this.di(me, w, pad);
      return;
    }
    if ((st === "hitstun" || st === "tumble") && !me.grounded) {
      if (this.r() < P.di * 0.3) this.di(me, w, pad);
      // tech when about to land
      const below = stg.findLanding(me.x, me.y, me.y + (me.vy + me.kby) * 5 + 40, false, null);
      if (below && this.r() < P.tech) { pad.shd = true; pad.mx = this.r() < 0.5 ? 0 : (this.r() < 0.5 ? 1 : -1); }
      if (st === "tumble") this.recoverOrAir(me, w, pad, T, main);
      return;
    }
    if (st === "down") { if (this.r() < 0.12) { const o = this.r(); if (o < 0.35) pad.jmp = true; else if (o < 0.6) pad.mx = this.r() < 0.5 ? -1 : 1; else if (o < 0.8) pad.atk = true; else pad.jmp = true; } return; }
    if (st === "ledge") { this.ledge(me, w, pad, T); return; }
    if (st === "respawn") { if (me.sf > 40 + this.r() * 60) pad.my = 1; return; }
    // offstage?
    const off = !me.grounded && main && (me.x < main.x1 - 10 || me.x > main.x2 + 10 || me.y > main.y + 20);
    if (off || st === "helpless") { this.recover(me, w, pad, main); return; }
    if (!T) return;
    // continue current plan
    if (this.plan && this.plan.t > 0) { this.runPlan(me, pad); return; }
    this.plan = null;
    if (st === "attack") {
      // hold charge a bit
      if (me.move && me.move.charge != null && me.mf === me.move.charge) {
        if (this.chargeT == null) this.chargeT = Math.floor(this.r() * 30 * (T.percent > T.killLine ? 1.5 : 0.4));
        if (this.chargeT-- > 0) { pad.smh = true; pad.atk = true; if (me.move.chargeKey) pad[me.move.chargeKey] = true; }
        else this.chargeT = null;
      }
      // mash jab if connecting
      if ((me.moveId === "jab1" || me.moveId === "jab2") && me.moveHit && this.r() < 0.8) { pad.atk = true; if (me.mf % 3 === 0) pad.pressAgain = ["atk"]; }
      if (!me.grounded) this.drift(me, T, pad);
      return;
    }
    this.chargeT = null;
    if (!me.grounded) { this.recoverOrAir(me, w, pad, T, main); return; }
    this.neutral(me, w, pad, T, main);
  }

  di(me, w, pad) {
    // survival DI: rotate launch toward the nearest safe direction (up and in)
    const B = w.stage.blast;
    const k = me.pendingKB || {};
    const lx = k.lx ?? 0, ly = k.ly ?? -1;
    // push perpendicular, toward stage centre-top
    const inx = -sign(me.x) || 1;
    if (Math.abs(lx) > Math.abs(ly)) { pad.mx = inx * 0.3; pad.my = -1; }
    else { pad.mx = inx; pad.my = 0; }
    if (k.kb < 60) { pad.mx = -sign(lx); pad.my = 0.6; } // combo DI: away & down
  }

  ledge(me, w, pad, T) {
    if (this.ledgeWait <= 0) this.ledgeWait = 8 + Math.floor(this.r() * (60 - this.P.lv * 5));
    if (--this.ledgeWait > 0) return;
    const o = this.r();
    const toward = -me.ledge.side;
    if (o < 0.3) pad.jmp = true;
    else if (o < 0.55) pad.mx = toward;
    else if (o < 0.78) pad.shd = true;
    else pad.atk = true;
    this.ledgeWait = 0;
  }

  recover(me, w, pad, main) {
    if (!main) return;
    const P = this.P;
    const side = me.x < (main.x1 + main.x2) / 2 ? -1 : 1;
    const lx = side < 0 ? main.x1 : main.x2, ly = main.y;
    const dx = lx - me.x, dy = me.y - ly;           // dy > 0: below ledge
    const onStageSide = side < 0 ? me.x > main.x1 + 10 : me.x < main.x2 - 10;
    pad.mx = onStageSide ? 0 : (sign(dx) || -side);
    if (me.state === "attack" && me.moveId === "uspec") {
      // directional recoveries read the stick mid-move: aim up and in toward the ledge
      const up = dy > -80;
      pad.mx = (sign(dx) || -side) * (up ? 0.55 : 1); pad.my = up ? -1 : -0.2;
      return;
    }
    if (me.state === "helpless" || me.state === "airdodge" || me.state === "attack") return;
    const vy = me.vy + me.kby;
    const falling = vy > -2;
    const upR = me.def.ai?.upReach || 300;
    // double jump: once falling and either below the ledge or too far to glide back
    if (me.jumps > 0 && falling && (dy > -60 || Math.abs(dx) > 320)) { pad.jmp = true; return; }
    // up special when close enough to reach the ledge
    if (me.jumps === 0 && falling && !me.upBUsed && dy > -40 && dy < upR && Math.abs(dx) < upR * 0.75) {
      pad.spc = true; pad.my = -1; pad.mx = sign(dx) * 0.7;
      return;
    }
    // last resort
    if (me.jumps === 0 && !me.upBUsed && dy > upR * 0.8) { pad.spc = true; pad.my = -1; pad.mx = sign(dx) * 0.7; return; }
    if (!me.airdodged && dy < -20 && dy > -200 && Math.abs(dx) < 220 && falling && me.jumps === 0 && me.upBUsed && this.r() < 0.3) { pad.shd = true; pad.mx = sign(dx); pad.my = 0.3; }
  }

  recoverOrAir(me, w, pad, T, main) {
    const off = main && (me.x < main.x1 - 10 || me.x > main.x2 + 10);
    if (off && me.y > main.y - 150) { this.recover(me, w, pad, main); return; }
    if (!T) return;
    this.drift(me, T, pad);
    // aerial when target in reach
    const id = this.pickAerial(me, T);
    if (id && this.r() < 0.35 + this.P.aggro * 0.4) this.doAerial(me, id, pad);
    // fast fall to land aerial / pressure
    if (me.vy > 0 && this.r() < 0.08 * this.P.lv && Math.abs(T.x - me.x) < 200) pad.my = 1;
  }

  drift(me, T, pad) {
    const dx = T.x - me.x;
    pad.mx = Math.abs(dx) > 40 ? sign(dx) : 0;
  }

  pickAerial(me, T) {
    const R = me.def.reach;
    const f = me.facing;
    const rx = (T.x - me.x) * f, ry = (T.y - 50) - me.y;
    const cand = [];
    for (const id of ["nair", "fair", "bair", "uair", "dair"]) {
      const r = R[id]; if (!r) continue;
      const t = r.first;
      const px = rx + ((T.vx + T.kbx) - me.vx) * f * t, py = ry + ((T.vy + T.kby) - me.vy) * t;
      if (px + 24 > r.x0 && px - 24 < r.x1 && py + 55 > r.y0 && py - 55 < r.y1) cand.push([id, r.dmg + (T.percent > T.killLine ? r.kb * 0.1 : 0)]);
    }
    if (!cand.length) return null;
    cand.sort((a, b) => b[1] - a[1]);
    return cand[0][0];
  }
  doAerial(me, id, pad) {
    const f = me.facing;
    pad.atk = true;
    if (id === "fair") pad.mx = f; else if (id === "bair") pad.mx = -f; else if (id === "uair") pad.my = -1; else if (id === "dair") pad.my = 1; else { pad.mx = 0; pad.my = 0; }
  }

  neutral(me, w, pad, T, main) {
    const P = this.P;
    const seenT = this.seen(T) || { x: T.x, y: T.y, st: T.state, mv: T.moveId, mf: T.mf, shield: false };
    const dx = T.x - me.x, adx = Math.abs(dx), dy = T.y - me.y;
    const f = sign(dx) || me.facing;
    const R = me.def.reach;
    const ai = me.def.ai || {};
    // --- counters / absorbs (reaction-limited)
    if (ai.counter && seenT.st === "attack" && seenT.mv && T.def.reach[seenT.mv] && T.def.reach[seenT.mv].first > 6) {
      const r = T.def.reach[seenT.mv];
      if (adx < r.x1 + 40 && seenT.mf < r.first && this.r() < P.shield * 0.35) { this.special(me, "d", f); this.runPlan(me, pad); return; }
    }
    if (ai.absorb) {
      for (const pr of w.projectiles) {
        if (pr.owner === me || pr.dead || pr.absorbable === false) continue;
        const pdx = me.x - pr.x, pdy = (me.y - 50) - pr.y;
        if (Math.abs(pdy) < 90 && Math.abs(pdx) < 170 && sign(pr.vx) === sign(pdx) && this.r() < P.shield * 0.8) { this.special(me, "d", f); this.runPlan(me, pad); return; }
      }
    }
    if (this.tactics(me, w, pad, T, main)) return;
    // --- defence: perceived incoming attack
    if (seenT.st === "attack" && seenT.mv && T.def.reach[seenT.mv]) {
      const r = T.def.reach[seenT.mv];
      const reachFwd = r.x1 + 30;
      const facingMe = sign(me.x - T.x) === T.facing || !me.x;
      if (facingMe && adx < reachFwd + 20 && seenT.mf < r.first + 3 && this.r() < P.shield) {
        const o = this.r();
        if (o < 0.6) this.setPlan({ t: 10 + Math.floor(this.r() * 8), hold: { shd: true } });
        else if (o < 0.8) this.setPlan({ t: 1, press: { shd: true }, stick: [0, 1] });
        else this.setPlan({ t: 1, press: { shd: true }, stick: [-f, 0] });
        this.runPlan(me, pad);
        return;
      }
    }
    // projectiles incoming
    for (const p of w.projectiles) {
      if (p.owner === me || p.dead) continue;
      const pdx = me.x - p.x, pdy = (me.y - 50) - p.y;
      if (Math.abs(pdy) < 90 && Math.abs(pdx) < 150 && sign(p.vx) === sign(pdx) && this.r() < P.shield) {
        if (this.r() < 0.5) this.setPlan({ t: 12, hold: { shd: true } });
        else this.setPlan({ t: 1, press: { jmp: true }, stick: [f, 0] });
        this.runPlan(me, pad); return;
      }
    }
    // --- punish: target in end lag nearby
    if (seenT.st === "attack" && T.move && T.mf > (T.def.reach[T.moveId]?.first || 0) + 6 && adx < 170 && this.r() < P.punish) {
      if (this.tryMove(me, T, pad, true)) return;
    }
    if ((seenT.st === "land" || seenT.st === "shielddrop") && adx < 120 && this.r() < P.punish) { this.face(me, f, pad); pad.grb = true; return; }
    // --- target shielding: grab
    if (seenT.shield && adx < 95 && this.r() < 0.35 + P.aggro * 0.4) { pad.grb = true; pad.mx = 0; return; }
    // --- attack if something reaches
    if (this.cool-- <= 0) {
      this.cool = P.think + Math.floor(this.r() * 8);
      if (this.r() < P.aggro && this.tryMove(me, T, pad, false)) return;
      // zoning
      const ai = me.def.ai || {};
      if (ai.proj && adx > 220 && adx < 800 && this.projCD <= 0 && Math.abs(dy) < 140 && this.r() < 0.5) {
        this.projCD = 50 + Math.floor(this.r() * 60);
        this.face(me, f, pad);
        const id = ai.proj[Math.floor(this.r() * ai.proj.length)];
        pad.spc = true; if (id === "sspec") pad.mx = f;
        if (id === "nspec") this.setPlan({ t: 4 + Math.floor(this.r() * 40), hold: { spc: true }, stick: [0, 0] });
        return;
      }
      // jump-in aerial
      if (adx < 300 && adx > 110 && this.r() < 0.25 + P.aggro * 0.2) {
        this.setPlan({ t: 3, press: { jmp: true }, stick: [f, 0], shortHop: this.r() < 0.6 });
        this.runPlan(me, pad); return;
      }
      // target above: jump + uair
      if (dy < -120 && adx < 120 && this.r() < 0.5) { this.setPlan({ t: 3, press: { jmp: true } }); this.runPlan(me, pad); return; }
    }
    this.projCD--;
    // --- movement: rotate intents (approach / hold range / bait)
    if (!this.intentT || this.intentT-- <= 0) {
      const o = this.r();
      const ag = P.aggro + (me.def.ai?.aggro || 0.5) * 0.3 - 0.15;
      this.intent = o < ag ? "approach" : o < ag + 0.3 ? "hold" : "bait";
      this.intentT = 40 + Math.floor(this.r() * 90);
    }
    const pref = (me.def.ai && me.def.ai.range) || 160;
    let want = 0;
    if (this.intent === "approach") want = adx > 70 ? f : 0;
    else if (this.intent === "hold") want = adx > pref + 60 ? f : adx < pref - 80 ? -f : 0;
    else want = adx < pref ? -f : (this.r() < 0.5 ? f : 0);
    if (want) {
      pad.mx = want;
      if (adx > 360 && want === f && me.state !== "run" && me.state !== "dash" && this.r() < 0.12) pad.dash = want;
    }
    // don't walk off the stage
    if (main && ((me.x < main.x1 + 60 && pad.mx < 0) || (me.x > main.x2 - 60 && pad.mx > 0))) { pad.mx = 0; pad.dash = 0; }
    // edgeguard: target offstage below/side -> stay near ledge
    const tOff = main && (T.x < main.x1 - 20 || T.x > main.x2 + 20);
    if (tOff && this.r() < P.edge) {
      const lx = T.x < 0 ? main.x1 + 60 : main.x2 - 60;
      pad.mx = Math.abs(lx - me.x) > 30 ? sign(lx - me.x) : 0;
      if (Math.abs(lx - me.x) < 60 && Math.abs(T.x - lx) < 140 && T.y < main.y + 40 && T.y > main.y - 140) { this.face(me, sign(T.x - me.x), pad); pad.smh = true; pad.mx = sign(T.x - me.x); }
    }
  }

  face(me, dir, pad) { if (me.facing !== dir) pad.mx = dir; }

  // Fire a special in a direction ("n" | "s" | "u" | "d"), turning first if needed.
  special(me, kind, dir, holdFrames = 0) {
    const stick = kind === "s" ? [dir, 0] : kind === "u" ? [0, -1] : kind === "d" ? [0, 1] : [0, 0];
    const steps = [];
    if (kind !== "s" && kind !== "u" && me.facing !== dir && me.grounded) steps.push({ stick: [dir, 0], t: 1 }, { stick: [0, 0], t: 1 });
    steps.push({ stick, press: { spc: true }, hold: holdFrames ? { spc: true } : null, t: Math.max(1, holdFrames) });
    this.seq(steps);
  }

  // Item + final-smash + character-special logic. Returns true if it committed to something.
  tactics(me, w, pad, T, main) {
    const P = this.P, ai = me.def.ai || {};
    const dx = T.x - me.x, adx = Math.abs(dx), dy = T.y - me.y, f = sign(dx) || me.facing;
    // --- final smash
    if (me.fsReady && me.grounded) {
      let ok = false;
      if (ai.fs === "global") ok = true;
      else if (ai.fs === "beam") ok = Math.abs(dy) < 100;
      else if (ai.fs === "front") ok = adx < 800 && dy > -400 && dy < 60;
      else if (ai.fs === "close") ok = adx < 240 && Math.abs(dy) < 90;
      if (ok && this.r() < 0.15 + P.lv * 0.03) { this.special(me, "n", f); this.runPlan(me, pad); return true; }
    }
    // --- items
    const items = w.items.list;
    // commit to an item goal for a while instead of re-deciding every frame
    if (this.goal && (w.frame > this.goal.until || this.goal.it.dead || !items.includes(this.goal.it))) this.goal = null;
    if (!this.goal && w.frame % 20 === 0) {
      const orb = items.find((i) => i.type === "bao" && !i.holder);
      if (orb && !w.fighters.some((x) => x.fsReady) && this.r() < 0.3 + P.lv * 0.07) this.goal = { it: orb, until: w.frame + 150 + P.lv * 20 };
      else {
        const crate = items.find((i) => i.type === "crate" && Math.hypot(i.x - me.x, i.y - me.y) < 520);
        if (crate && adx > 200 && this.r() < 0.3 + P.lv * 0.05) this.goal = { it: crate, until: w.frame + 150 };
      }
    }
    if (this.goal && !(adx < 110 && Math.abs(dy) < 80 && T.state === "attack")) {
      const it = this.goal.it;
      if (this.goHit(me, it.x, it.type === "bao" ? it.y : it.y - it.r, pad, main)) return true;
    }
    if (me.item) {
      const it = me.item;
      if (it.type === "keyboard") { if (adx < 130 && Math.abs(dy) < 90) { this.face(me, f, pad); pad.atk = true; return true; } }
      else if (Math.abs(dy) < 110 && adx < 700 && adx > 60 && this.r() < 0.3) { this.seq([{ stick: [f, 0], t: 1 }, { stick: [f, 0], press: { grb: true }, t: 1 }]); this.runPlan(me, pad); return true; }
    } else {
      const loose = items.find((i) => !i.holder && i.grounded && (i.type === "brick" || i.type === "melon" || i.type === "keyboard") && Math.abs(i.x - me.x) < 260 && Math.abs(i.y - me.y) < 30);
      if (loose && me.grounded && adx > 180) {
        if (Math.abs(loose.x - me.x) > 40) { pad.mx = sign(loose.x - me.x); return true; }
        pad.atk = true; return true;
      }

    }
    // --- character specials
    if (this.cool > 0) return false;
    const seenT = this.seen(T);
    if (ai.stance) {
      const st = me.status.stance;
      const want = me.percent > T.percent + 40 || me.percent > 110 ? "long" : "short";
      if (st !== want && this.r() < 0.06) { this.special(me, "d", f); this.runPlan(me, pad); return true; }
    }
    if (ai.cgrab && adx < 170 && Math.abs(dy) < 50 && me.grounded && this.r() < 0.12 + (T.state === "shield" ? 0.4 : 0)) { this.special(me, "s", f); this.runPlan(me, pad); return true; }
    if (ai.close && adx < 140 && Math.abs(dy) < 70 && this.r() < 0.1) {
      const k = ai.close[Math.floor(this.r() * ai.close.length)];
      if (k === "nspec" && me.id === "huchenfeng" && !T.status.label && this.r() < 0.5) {}
      this.special(me, k[0], f); this.runPlan(me, pad); return true;
    }
    if (me.id === "huchenfeng" && T.status.label && adx < 120 && Math.abs(dy) < 60 && this.r() < 0.3) { this.special(me, "n", f); this.runPlan(me, pad); return true; }
    if (ai.mid && adx > 170 && adx < 380 && Math.abs(dy) < 90 && this.r() < 0.07) {
      const k = ai.mid[Math.floor(this.r() * ai.mid.length)];
      this.special(me, k[0], f); this.runPlan(me, pad); return true;
    }
    return false;
  }

  // Walk/jump to a point and attack it (items).
  goHit(me, x, y, pad, main) {
    const ddx = x - me.x, ddy = y - (me.y - 60);
    if (main && (x < main.x1 - 60 || x > main.x2 + 60) && y > main.y - 100) return false; // not worth dying for
    const f = sign(ddx) || me.facing;
    if (Math.abs(ddx) < 95 && Math.abs(ddy) < 85) {
      if (me.facing !== f) { pad.mx = f; return true; }
      pad.atk = true; pad.mx = 0; pad.my = ddy < -40 ? -1 : 0;
      return true;
    }
    if (me.grounded) {
      if (ddy < -110 && Math.abs(ddx) < 260) { this.seq([{ press: { jmp: true }, hold: { jmp: true }, stick: [f, 0], t: 6 }]); this.runPlan(me, pad); return true; }
      pad.mx = f;
      if (Math.abs(ddx) > 360 && me.state !== "run" && me.state !== "dash" && this.r() < 0.15) pad.dash = f;
    } else {
      pad.mx = Math.abs(ddx) > 30 ? f : 0;
      if (ddy < -60 && me.jumps > 0 && me.vy > -2 && this.r() < 0.2) pad.jmp = true;
    }
    return true;
  }

  tryMove(me, T, pad, punish) {
    const R = me.def.reach;
    const f = sign(T.x - me.x) || me.facing;
    const rx = Math.abs(T.x - me.x), ry = (T.y - 50) - me.y;
    const kill = T.percent >= T.killLine * (0.85 + this.r() * 0.3);
    const list = me.grounded ? ["jab1", "ftilt", "utilt", "dtilt", "fsmash", "usmash", "dsmash", "grab", "nspec", "sspec", "dspec", "uspec"] : [];
    let best = null, bs = -1;
    for (const id of list) {
      const r = R[id]; const mv = me.def.moves[id];
      if (!mv) continue;
      if (id === "grab") {
        if (rx < 90 && Math.abs(ry + 50) < 60) { const s = 8 + (T.state === "shield" ? 20 : 0); if (s > bs) { bs = s; best = id; } }
        continue;
      }
      if (!r) continue;
      const t = r.first;
      const px = rx + (T.vx + T.kbx) * f * t, py = ry + (T.vy + T.kby) * t;
      if (px + 24 > r.x0 && px - 24 < r.x1 && py + 55 > r.y0 && py - 55 < r.y1) {
        let s = r.dmg * 1.2 - r.first * 0.6 - r.dur * 0.08;
        if (kill) s += r.kb * 0.12;
        if (punish) s += 10 - r.first;
        if (id.endsWith("spec") && id !== "sspec") s -= 4;
        s += this.r() * 6;
        if (this.r() < this.P.mistake) s -= 10;
        if (s > bs) { bs = s; best = id; }
      }
    }
    if (!best) return false;
    this.face(me, f, pad);
    const m = me.def.moves[best];
    const smash = best.endsWith("smash");
    if (smash) {
      pad.smh = true; pad.mx = best === "fsmash" ? f : 0; pad.my = best === "usmash" ? -1 : best === "dsmash" ? 1 : 0;
    } else if (best === "grab") pad.grb = true;
    else if (best.endsWith("spec")) { pad.spc = true; pad.mx = best === "sspec" ? f : 0; pad.my = best === "uspec" ? -1 : best === "dspec" ? 1 : 0; }
    else { pad.atk = true; pad.mx = best === "ftilt" ? f * 0.7 : 0; pad.my = best === "utilt" ? -0.7 : best === "dtilt" ? 0.7 : 0; }
    return true;
  }

  setPlan(p) { this.plan = { ...p }; this.planStep = 0; }
  // steps: [{t, stick:[x,y], press:{k:true}, hold:{k:true}}]
  seq(steps) { this.plan = { seq: steps.map((x) => ({ t: 1, ...x })), i: 0, t: 999 }; this.planStep = 0; }
  runPlan(me, pad) {
    const p = this.plan;
    if (!p) return;
    if (p.seq) {
      const st = p.seq[p.i];
      if (!st) { this.plan = null; return; }
      if (st.stick) { pad.mx = st.stick[0]; pad.my = st.stick[1]; }
      if (st.hold) for (const k in st.hold) pad[k] = true;
      if (st.press && this.planStep === 0) for (const k in st.press) pad[k] = true;
      this.planStep++;
      if (--st.t <= 0) { p.i++; this.planStep = 0; if (p.i >= p.seq.length) this.plan = null; }
      return;
    }
    if (p.stick) { pad.mx = p.stick[0]; pad.my = p.stick[1]; }
    if (p.hold) for (const k in p.hold) pad[k] = true;
    if (p.press && this.planStep === 0) for (const k in p.press) pad[k] = true;
    if (p.press && p.press.jmp && !p.shortHop && this.planStep < 6) pad.jmp = true;
    this.planStep++;
    p.t--;
    if (p.t <= 0) this.plan = null;
  }
}

// Training dummy: stands / crouches / jumps / shields / plays as a CPU.
export class DummySource {
  constructor(rng) { this.kind = "cpu"; this.mode = 0; this.cpu = new CpuSource(4, rng); this.t = 0; }
  static MODES = ["站立", "蹲下", "跳跃", "防御", "电脑 Lv4", "电脑 Lv8"];
  read(me) {
    this.t++;
    const m = this.mode;
    if (m >= 4) { this.cpu.P = LV(m === 4 ? 4 : 8); this.cpu.lv = m === 4 ? 4 : 8; return this.cpu.read(me); }
    const pad = emptyPad();
    if (me.state === "ledge" || (!me.grounded && me.state !== "hitstun" && me.state !== "tumble")) {
      // recover automatically
      this.cpu.snapshot(me.world);
      this.cpu.recover(me, me.world, pad, me.world.stage.plats.find((p) => p.solid));
      if (me.state === "ledge" && this.t % 30 === 0) pad.mx = -me.ledge.side;
    }
    if (me.state === "grabbed" && this.t % 4 === 0) pad.atk = true;
    if (m === 1) pad.my = 1;
    if (m === 2 && me.grounded && this.t % 50 === 0) pad.jmp = true;
    if (m === 3 && me.grounded && me.state !== "hitstun") pad.shd = true;
    for (const k of ["atk", "spc", "jmp", "shd", "grb", "smh", "tnt"]) pad.p[k] = pad[k] && !(this.prev && this.prev[k]);
    this.prev = pad;
    return pad;
  }
}
