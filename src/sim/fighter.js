// Fighter: platform-fighter state machine. Deterministic; reads one Pad per frame.
import { clamp, approach, sign, DEG } from "./math.js";
import { PHYS, SHIELD, TIMING, STALE, FRESH_BONUS, knockback, hitlagFrames } from "./const.js";
import { solveRig, newJoints, hurtCapsules, bonePoint, neutralPose } from "./rig.js";
import { samplePose, copyPose } from "./anim.js";
import { emptyPad } from "../engine/input.js";

const BIG = 999;
const GROUND_STATES = new Set(["idle", "walk", "dash", "run", "runbrake", "runturn", "crouch", "jumpsquat",
  "land", "shield", "shieldstun", "shielddrop", "spotdodge", "roll", "grab", "grabbing", "taunt",
  "down", "getup", "tech", "dizzy", "stun", "respawn"]);
const ACTIONABLE_GROUND = new Set(["idle", "walk", "crouch"]);

export class Fighter {
  constructor(world, def, slot, source, opts = {}) {
    this.world = world;
    this.def = def;
    this.id = def.id;
    this.slot = slot;
    this.source = source;
    this.cpu = opts.cpu || 0;
    this.team = opts.team ?? slot;
    this.color = opts.color || 0;
    const s = def.stats;
    this.s = s;
    this.body = def.body;
    this.ecbW = def.body.ecbW || 20;
    this.ecbH = def.body.ecbH || 118;
    this.stocks = opts.stocks ?? 3;
    this.percent = 0;
    this.pad = emptyPad();
    this.prevPad = emptyPad();
    this.buf = { atk: BIG, spc: BIG, jmp: BIG, shd: BIG, grb: BIG, smh: BIG, tnt: BIG };
    this.pose = neutralPose();
    this.j = newJoints();
    this.hurt = [];
    this.hbPrev = new Map();     // hitbox id -> previous world pos (for sweeping)
    this.staleQ = [];
    this.stats = { dmgDealt: 0, dmgTaken: 0, kos: 0, falls: 0, sds: 0, maxCombo: 0, hits: 0 };
    this.combo = 0; this.comboTimer = 0;
    this.lastHitBy = null; this.lastHitFrame = -999;
    this.fsReady = false;
    this.status = {};            // timed statuses: label, gloom, frozen, stance...
    this.item = null;
    this.reset(0, 0, 1);
  }

  reset(x, y, facing) {
    this.x = x; this.y = y; this.prevX = x; this.prevY = y;
    this.vx = 0; this.vy = 0; this.kbx = 0; this.kby = 0;
    this.facing = facing;
    this.grounded = false; this.plat = null;
    this.state = "air"; this.sf = 0;
    this.move = null; this.mf = 0; this.moveId = null; this.hitSet = new Set(); this.charge = 0;
    this.jumps = this.s.jumps; this.airdodged = false; this.upBUsed = false;
    this.fastfall = false;
    this.hitlag = 0; this.hitstun = 0; this.tumble = false; this.pendingKB = null;
    this.intan = 0; this.invinc = 0;
    this.shieldHP = SHIELD.max; this.shieldOn = 0;
    this.ledge = null; this.ledgeCD = 0; this.ledgeInvUsed = false;
    this.grabbed = null; this.grabber = null; this.grabTimer = 0;
    this.techLock = 0; this.lastShieldPress = BIG;
    this.dropPlat = null; this.dropTimer = 0;
    this.dodgeStale = 0; this.dodgeStaleT = 0;
    this.dead = false; this.deadTimer = 0;
    this.jabStage = 0; this.jabWindow = 0;
    this.landLag = 0;
    this.shake = 0;
    this.flash = 0;
    this.armor = null; this.counter = null; this.reflect = null; this.absorb = null;
    this.vars = {};
    this.item = null;
  }

  get airborne() { return !this.grounded; }
  get alive() { return !this.dead && this.stocks > 0; }

  // ------------------------------------------------------------------ input
  readInput() {
    this.prevPad = this.pad;
    this.pad = this.source ? this.source.read(this) : emptyPad();
    const p = this.pad.p;
    for (const k in this.buf) this.buf[k] = p[k] ? 0 : Math.min(BIG, this.buf[k] + 1);
    if (this.pad.cPress) { this.buf.smh = 0; this.cDir = [this.pad.cx, this.pad.cy]; }
    else if (p.smh) this.cDir = null;
    if (p.shd) this.lastShieldPress = 0; else this.lastShieldPress++;
    // stick edge detection
    const pm = this.prevPad;
    this.edgeX = (Math.abs(this.pad.mx) > 0.6 && Math.abs(pm.mx) <= 0.6) ? sign(this.pad.mx) : 0;
    this.edgeY = (Math.abs(this.pad.my) > 0.6 && Math.abs(pm.my) <= 0.6) ? sign(this.pad.my) : 0;
  }
  buffered(k) { return this.buf[k] <= TIMING.buffer; }
  consume(k) { this.buf[k] = BIG; }

  // ------------------------------------------------------------------ state
  setState(st) {
    if (this.state === "attack" && st !== "attack") this.endMoveFlags();
    this.state = st; this.sf = 0;
  }
  endMoveFlags() {
    this.armor = null; this.counter = null; this.reflect = null; this.absorb = null;
    if (this.move && this.move.onEnd) this.move.onEnd(this, this.world);
  }

  startMove(id, variant) {
    const m = this.def.moves[id];
    if (!m) return false;
    if (m.canUse && !m.canUse(this, this.world)) return false;
    if (this.state === "attack") this.endMoveFlags();
    this.move = m; this.moveId = id; this.mf = 0; this.charge = 0; this.chargeHeld = true;
    this.moveSerial = (this.moveSerial || 0) + 1;
    this.hitSet.clear(); this.hbPrev.clear();
    this.state = "attack"; this.sf = 0;
    this.vars.variant = variant;
    this.moveHit = false;
    this.world.emit({ t: "move", f: this, id });
    if (m.air === false && !this.grounded) {}
    if (m.onStart) m.onStart(this, this.world);
    return true;
  }

  // ------------------------------------------------------------------ main step
  step() {
    const w = this.world;
    if (this.dead) { this.stepDead(); return; }
    this.readInput();
    if (this.intan > 0) this.intan--;
    if (this.invinc > 0) this.invinc--;
    if (this.flash > 0) this.flash--;
    if (this.ledgeCD > 0) this.ledgeCD--;
    if (this.dropTimer > 0 && --this.dropTimer === 0) this.dropPlat = null;
    if (this.techLock > 0) this.techLock--;
    if (this.dodgeStaleT > 0 && --this.dodgeStaleT === 0) this.dodgeStale = 0;
    if (this.comboTimer > 0 && --this.comboTimer === 0) this.combo = 0;
    if (this.jabWindow > 0 && this.state !== "attack") this.jabWindow--;
    for (const k in this.status) {
      const st = this.status[k];
      if (st.t > 0 && --st.t <= 0) { delete this.status[k]; }
    }
    if (this.state !== "shield" && this.state !== "shieldstun") this.shieldHP = Math.min(SHIELD.max, this.shieldHP + SHIELD.regen);

    if (this.hitlag > 0) {
      this.hitlag--;
      this.stepHitlag();
      this.animate();
      return;
    }
    if (this.pendingKB) this.applyPendingKB();

    this.prevX = this.x; this.prevY = this.y;
    this.sf++;
    this.runState();
    if (this.dead) return;
    this.integrate();
    this.animate();
  }

  stepDead() {
    this.deadTimer++;
    if (this.stocks > 0 && this.deadTimer >= TIMING.respawnWait) this.respawnNow();
  }

  respawnNow() {
    const r = this.world.stage.respawn;
    const off = (this.slot - 1.5) * 90;
    this.reset(r.x + off, r.y, this.x > 0 ? -1 : 1);
    this.percent = 0;
    this.state = "respawn"; this.sf = 0;
    this.grounded = false;
    this.invinc = 0; this.intan = 0;
    this.world.emit({ t: "respawn", f: this });
  }

  stepHitlag() {
    // SDI: each fresh direction shifts the victim a little (only when being hit)
    if (this.pendingKB && (this.edgeX || this.edgeY)) {
      const m = this.pendingKB.sdi ?? 1;
      this.x += this.edgeX * PHYS.sdiPx * m;
      if (!this.grounded) this.y += this.edgeY * PHYS.sdiPx * m * 0.6;
    }
  }

  // ------------------------------------------------------------------ states
  runState() {
    const st = this.state;
    switch (st) {
      case "idle": case "walk": case "crouch": this.stGround(); break;
      case "dash": this.stDash(); break;
      case "run": this.stRun(); break;
      case "runbrake": this.stRunBrake(); break;
      case "runturn": this.stRunTurn(); break;
      case "jumpsquat": this.stJumpsquat(); break;
      case "land": this.stLand(); break;
      case "air": this.stAir(); break;
      case "attack": this.stAttack(); break;
      case "shield": this.stShield(); break;
      case "shieldstun": this.stShieldstun(); break;
      case "shielddrop": if (this.sf >= SHIELD.dropLag) this.toIdle(); else this.groundActOOS(false); break;
      case "spotdodge": case "roll": this.stDodge(); break;
      case "airdodge": this.stAirdodge(); break;
      case "helpless": this.stHelpless(); break;
      case "hitstun": this.stHitstun(); break;
      case "tumble": this.stTumble(); break;
      case "down": this.stDown(); break;
      case "getup": this.stGetup(); break;
      case "tech": this.stTech(); break;
      case "ledge": this.stLedge(); break;
      case "ledgeact": this.stLedgeAct(); break;
      case "grabbing": this.stGrabbing(); break;
      case "grabbed": this.stGrabbed(); break;
      case "thrown": break;   // driven by thrower
      case "dizzy": this.stDizzy(); break;
      case "stun": this.stStun(); break;
      case "respawn": this.stRespawn(); break;
      case "taunt": if (this.sf >= (this.def.tauntLen || 70)) this.toIdle(); break;
      case "fsCine": break;   // controlled by the final-smash script
      default: this.setState(this.grounded ? "idle" : "air");
    }
  }

  toIdle() { this.setState("idle"); this.move = null; }
  toAir() { this.setState("air"); this.move = null; }

  // --- grounded neutral / walk / crouch
  stGround() {
    const p = this.pad, s = this.s;
    if (this.tryGroundActions()) return;
    const mx = p.mx;
    if (p.my > 0.6 && Math.abs(mx) < 0.7) {
      if (this.state !== "crouch") this.setState("crouch");
      this.vx = approach(this.vx, 0, s.traction * 1.5);
      if (p.dropTap && this.plat && !this.plat.solid) this.dropThrough();
      return;
    }
    if (this.state === "crouch") this.setState("idle");
    if (p.dash) { this.startDash(p.dash); return; }
    if (Math.abs(mx) > 0.2) {
      if (sign(mx) !== this.facing) { this.facing = sign(mx); }
      if (this.state !== "walk") this.setState("walk");
      const target = mx * s.walk * this.spdMul();
      this.vx = approach(this.vx, target, s.walkAccel || 1.2);
    } else {
      if (this.state !== "idle") this.setState("idle");
      this.vx = approach(this.vx, 0, s.traction);
    }
  }

  startDash(dir) {
    this.facing = dir;
    this.setState("dash");
    this.vx = dir * this.s.dash;
    this.world.emit({ t: "dust", x: this.x, y: this.y, dir: -dir, f: this });
  }

  stDash() {
    const p = this.pad, s = this.s;
    if (this.tryGroundActions(true)) return;
    if (p.dash === -this.facing) { this.startDash(-this.facing); return; }   // dash dance
    this.vx = approach(this.vx, this.facing * s.dash, 2);
    if (this.sf >= s.dashFrames) {
      if (p.mx * this.facing > 0.3) this.setState("run");
      else { this.setState("runbrake"); }
    }
  }

  stRun() {
    const p = this.pad, s = this.s;
    if (this.tryGroundActions(true)) return;
    if (p.my > 0.7) { this.setState("crouch"); return; }
    if (p.mx * this.facing < -0.3) { this.setState("runturn"); return; }
    if (Math.abs(p.mx) < 0.3) { this.setState("runbrake"); return; }
    this.vx = approach(this.vx, this.facing * s.run * this.spdMul(), s.runAccel || 1.0);
  }

  stRunBrake() {
    const s = this.s;
    if (this.buffered("jmp") || this.pad.upTap) { this.consume("jmp"); this.startJumpsquat(); return; }
    if (this.buffered("shd")) { this.startShield(); return; }
    if (this.buffered("atk") && this.sf < 5) { this.consume("atk"); this.startMove("dashAtk"); return; }
    this.vx = approach(this.vx, 0, s.traction * 1.4);
    if (this.sf >= (s.brake || 10)) this.toIdle();
  }

  stRunTurn() {
    const s = this.s;
    if (this.buffered("jmp")) { this.consume("jmp"); this.facing = -this.facing; this.startJumpsquat(); return; }
    this.vx = approach(this.vx, 0, s.traction * 2);
    if (this.sf >= 10) { this.facing = -this.facing; if (Math.abs(this.pad.mx) > 0.3) this.setState("run"); else this.toIdle(); }
  }

  // Common grounded actions (idle/walk/crouch/dash/run)
  tryGroundActions(moving) {
    const p = this.pad;
    if (p.p.tnt && !moving) { this.setState("taunt"); this.vx = 0; this.world.emit({ t: "taunt", f: this }); return true; }
    if (this.buffered("jmp") || p.upTap) { this.consume("jmp"); this.startJumpsquat(); return true; }
    if (this.buffered("shd")) {
      if (this.item && moving) {}
      this.startShield(); return true;
    }
    if (this.buffered("grb")) { this.consume("grb"); this.doGrab(moving); return true; }
    if (this.buffered("spc")) { this.consume("spc"); this.doSpecial(); return true; }
    if (this.buffered("smh")) { this.consume("smh"); this.doSmash(this.cDir); return true; }
    if (this.buffered("atk")) {
      this.consume("atk");
      if (this.item && this.itemAttack(moving)) return true;
      if (this.pickUpItem()) return true;
      if (moving) {
        if (p.flick <= 3 && p.my < -0.6) { this.doSmash(); return true; }
        this.startMove("dashAtk"); return true;
      }
      this.doGroundAttack(); return true;
    }
    return false;
  }

  doGroundAttack() {
    const p = this.pad;
    const strong = Math.hypot(p.mx, p.my) > 0.8;
    if (p.flick <= 3 && strong && this.source && this.source.kind !== "kb") { this.doSmash(); return; }
    if (p.my < -0.5 && Math.abs(p.mx) < 0.8) { this.startMove("utilt"); return; }
    if (p.my > 0.5 && Math.abs(p.mx) < 0.8) { this.startMove("dtilt"); return; }
    if (Math.abs(p.mx) > 0.5) { this.facing = sign(p.mx); this.startMove("ftilt"); return; }
    this.startJab();
  }

  startJab() {
    const d = this.def.moves;
    if (this.jabWindow > 0 && this.jabStage === 1 && d.jab2) { this.startMove("jab2"); this.jabStage = 2; return; }
    if (this.jabWindow > 0 && this.jabStage === 2 && d.jab3) { this.startMove("jab3"); this.jabStage = 3; return; }
    this.startMove("jab1"); this.jabStage = 1;
  }

  doSmash(dir) {
    const p = this.pad;
    const dx = dir ? dir[0] : p.mx, dy = dir ? dir[1] : p.my;
    if (!this.grounded) { this.doAerial(dx, dy); return; }
    if (dy < -0.5 && Math.abs(dx) < 0.8) this.startMove("usmash");
    else if (dy > 0.5 && Math.abs(dx) < 0.8) this.startMove("dsmash");
    else { if (Math.abs(dx) > 0.3) this.facing = sign(dx); this.startMove("fsmash"); }
  }

  doSpecial() {
    const p = this.pad;
    if (this.fsReady && this.def.moves.final) { this.fsReady = false; this.startMove("final"); return; }
    if (p.my < -0.5 && Math.abs(p.mx) < 0.9) { this.startMove("uspec"); return; }
    if (p.my > 0.5 && Math.abs(p.mx) < 0.9) { this.startMove("dspec"); return; }
    if (Math.abs(p.mx) > 0.5) { this.facing = sign(p.mx); this.startMove("sspec"); return; }
    this.startMove("nspec");
  }

  doGrab(moving) {
    if (this.item) { this.throwItem(); return; }
    this.startMove(moving ? "dashGrab" : "grab");
  }

  // --- jump
  startJumpsquat() {
    this.setState("jumpsquat");
    this.jumpHeld = true;
    this.squatVx = this.vx;
  }
  stJumpsquat() {
    const p = this.pad;
    if (!p.jmp && !p.upTap) this.jumpHeld = false;
    // jump-cancelled up-smash / up-special
    if (this.buffered("spc") && p.my < -0.5) { this.consume("spc"); this.startMove("uspec"); return; }
    if ((this.buffered("smh") && (this.cDir ? this.cDir[1] : p.my) < -0.5)) { this.consume("smh"); this.startMove("usmash"); return; }
    if (this.buffered("grb")) { this.consume("grb"); this.startMove("grab"); return; }
    if (this.sf >= (this.s.jumpsquat || TIMING.jumpsquatDefault)) {
      const short = !this.jumpHeld || this.buf.atk <= 3;
      this.grounded = false; this.plat = null;
      this.vy = -(short ? this.s.shortV : this.s.jumpV);
      const air = this.s.air;
      this.vx = clamp(this.squatVx * 0.85 + p.mx * air * 0.35, -air * 1.15, air * 1.15);
      this.fastfall = false;
      this.setState("air");
      this.world.emit({ t: "jump", f: this, ground: true });
    }
  }

  stLand() {
    this.vx = approach(this.vx, 0, this.s.traction);
    if (this.sf >= this.landLag) {
      this.toIdle();
      this.stGround();
    }
  }

  // --- air
  stAir() {
    const p = this.pad;
    if (this.tryAirActions()) return;
    this.airDrift();
  }

  tryAirActions() {
    const p = this.pad;
    if ((this.buffered("jmp") || p.upTap) && this.def.wallJump && this.tryWallJump()) { this.consume("jmp"); return true; }
    if ((this.buffered("jmp") || p.upTap) && this.jumps > 0 && this.canDoubleJump()) {
      this.consume("jmp"); this.doubleJump(); return true;
    }
    if (this.buffered("shd") && !this.airdodged) { this.consume("shd"); this.startAirdodge(); return true; }
    if (this.buffered("spc")) { this.consume("spc"); this.doSpecial(); return true; }
    if (this.buffered("smh")) { this.consume("smh"); const d = this.cDir || [p.mx, p.my]; this.doAerial(d[0], d[1]); return true; }
    if (this.buffered("atk")) {
      this.consume("atk");
      if (this.item && this.itemAttack(false)) return true;
      this.doAerial(p.mx, p.my); return true;
    }
    if (this.buffered("grb") && this.item) { this.consume("grb"); this.throwItem(); return true; }
    return false;
  }

  canDoubleJump() { return this.vars.noDJ !== true; }

  spdMul() {
    let m = 1;
    if (this.status.slow) m *= 0.6;
    if (this.status.boost) m *= 1.15;
    if (this.status.tiny) m *= 1.1;
    if (this.status.giant) m *= 0.95;
    if (this.status.stance === "long") m *= 0.9;
    else if (this.status.stance === "short") m *= 1.12;
    return m;
  }

  // 登山运动员: jump off walls
  tryWallJump() {
    if (!this.def.wallJump || this.grounded) return false;
    for (const p of this.world.stage.plats) {
      if (!p.solid) continue;
      if (this.y < p.y + 8 || this.y - this.ecbH > p.y + p.depth + 40) continue;
      let side = 0;
      if (Math.abs(this.x - (p.x1 - this.ecbW)) < 8) side = -1;
      else if (Math.abs(this.x - (p.x2 + this.ecbW)) < 8) side = 1;
      if (!side) continue;
      if ((this.wallJumps || 0) >= 3) return false;
      this.wallJumps = (this.wallJumps || 0) + 1;
      this.vx = side * 7; this.vy = -this.s.djV * 0.9; this.facing = side;
      this.kbx = 0; this.kby = 0; this.fastfall = false;
      if (this.state !== "air") this.setState("air");
      this.world.emit({ t: "jump", f: this, ground: false, wall: true });
      return true;
    }
    return false;
  }

  doubleJump() {
    const p = this.pad;
    this.jumps--;
    this.djFrame = this.world.frame;
    this.vy = -this.s.djV;
    this.vx = p.mx * this.s.air;
    if (Math.abs(p.mx) > 0.3 && this.def.djTurn !== false) {}
    this.fastfall = false;
    this.kbx = 0; this.kby = 0;
    if (this.state !== "air") this.setState("air");
    this.world.emit({ t: "jump", f: this, ground: false });
  }

  doAerial(dx, dy) {
    const f = this.facing;
    let id = "nair";
    if (dy < -0.5 && Math.abs(dx) < 0.8) id = "uair";
    else if (dy > 0.5 && Math.abs(dx) < 0.8) id = "dair";
    else if (dx * f > 0.5) id = "fair";
    else if (dx * f < -0.5) id = "bair";
    this.startMove(id);
  }

  airDrift(mul = 1) {
    const p = this.pad, s = this.s;
    const target = p.mx * s.air * mul * this.spdMul();
    if (Math.abs(p.mx) > 0.2) this.vx = approach(this.vx, target, s.airAccel * mul);
    else this.vx = approach(this.vx, 0, PHYS.airFriction);
    // fast fall
    if (!this.fastfall && this.vy > -1.5 && this.edgeY > 0 && this.pad.my > 0.6) {
      this.fastfall = true; this.vy = s.fastFall;
      this.world.emit({ t: "fastfall", f: this });
    }
  }

  // --- attacks
  stAttack() {
    const m = this.move;
    if (!m) { this.setState(this.grounded ? "idle" : "air"); return; }
    const p = this.pad;
    // smash charge hold
    if (m.charge != null && this.mf === m.charge && this.chargeHeld) {
      const holding = this.chargeHolding();
      if (holding && this.charge < 60) {
        this.charge++;
        if (this.grounded) this.vx = approach(this.vx, 0, this.s.traction);
        if (this.charge % 8 === 1) this.world.emit({ t: "charge", f: this });
        this.moveScript();
        return;
      }
      this.chargeHeld = false;
    }
    this.mf++;
    this.moveScript();
    if (this.state !== "attack" || this.move !== m) return;
    // windows
    this.armor = null; this.counter = null; this.reflect = null; this.absorb = null;
    if (m.armor) for (const a of m.armor) if (this.mf >= a.f[0] && this.mf <= a.f[1]) this.armor = a;
    if (m.counter && this.mf >= m.counter.f[0] && this.mf <= m.counter.f[1]) this.counter = m.counter;
    if (m.reflect && this.mf >= m.reflect.f[0] && this.mf <= m.reflect.f[1]) this.reflect = m.reflect;
    if (m.absorb && this.mf >= m.absorb.f[0] && this.mf <= m.absorb.f[1]) this.absorb = m.absorb;
    if (m.intan) for (const it of m.intan) if (this.mf >= it[0] && this.mf <= it[1]) this.intan = Math.max(this.intan, 1);
    // movement
    if (m.vel) for (const v of m.vel) if (v.f === this.mf) {
      if (v.vx != null) this.vx = v.vx * this.facing;
      if (v.vy != null) { this.vy = v.vy; if (v.vy < 0) { this.grounded = false; this.plat = null; } }
      if (v.ax != null) this.vx += v.ax * this.facing;
    }
    if (this.grounded) {
      if (!m.slide) this.vx = approach(this.vx, 0, this.s.traction * (m.traction || 1));
    } else if (!m.noDrift) {
      this.airDrift(m.driftMul ?? 1);
    }
    // grab box
    if (m.grab && this.mf >= m.grab.f[0] && this.mf <= m.grab.f[1]) this.world.tryGrab(this, m.grab);
    // jab chaining
    if (m.jab && this.mf >= m.jab && this.buffered("atk")) {
      const d = this.def.moves;
      if (this.moveId === "jab1" && d.jab2) { this.consume("atk"); this.startMove("jab2"); this.jabStage = 2; return; }
      if (this.moveId === "jab2" && d.jab3) { this.consume("atk"); this.startMove("jab3"); this.jabStage = 3; return; }
      if (m.rapid && this.moveId === m.rapid.from) { this.consume("atk"); this.startMove(m.rapid.to); return; }
    }
    if (m.rapidLoop && this.mf >= m.dur - 2 && (this.pad.atk)) { this.mf = m.rapidLoop; this.hitSet.clear(); }
    // interrupt
    const iasa = m.iasa ?? m.dur;
    if (this.mf >= iasa && this.mf < m.dur) {
      if (this.grounded ? this.tryGroundActions(false) : this.tryAirActions()) return;
    }
    if (this.mf >= m.dur) this.finishMove();
  }

  chargeHolding() {
    const p = this.pad;
    if (this.move.chargeKey) return !!p[this.move.chargeKey];
    if (this.cDir) return Math.hypot(p.cx, p.cy) > 0.5 || p.smh || p.atk;
    return p.smh || p.atk;
  }

  moveScript() {
    const m = this.move;
    if (m.script) m.script(this, this.mf, this.world);
    if (m.sfx && m.sfx[this.mf]) this.world.emit({ t: "sfx", id: m.sfx[this.mf], f: this });
    if (m.say && m.say[this.mf]) this.world.emit({ t: "say", text: m.say[this.mf], f: this });
    if (m.fx && m.fx[this.mf]) this.world.emit({ t: "movefx", id: m.fx[this.mf], f: this });
    if (m.txt && m.txt[this.mf]) this.world.emit({ t: "movetext", text: m.txt[this.mf], f: this });
  }

  finishMove() {
    const m = this.move;
    if (m && (this.moveId === "jab1" || this.moveId === "jab2")) this.jabWindow = 14;
    this.endMoveFlags();
    this.move = null;
    const end = m && (typeof m.end === "function" ? m.end(this) : m.end);
    if (end === "helpless" && !this.grounded) { this.setState("helpless"); return; }
    if (this.grounded) { this.setState("idle"); }
    else this.setState("air");
  }

  // --- shield & dodges
  startShield() {
    this.consume("shd");
    this.setState("shield");
    this.shieldOn = 0;
    this.vx *= 0.5;
  }
  stShield() {
    const p = this.pad;
    this.shieldOn++;
    this.shieldHP -= SHIELD.drain;
    this.vx = approach(this.vx, 0, this.s.traction);
    if (this.shieldHP <= 0) { this.shieldBreak(); return; }
    if (this.groundActOOS(true)) return;
    if (!p.shd) { this.setState("shielddrop"); return; }
  }
  // Out-of-shield options. `inShield` allows dodges.
  groundActOOS(inShield) {
    const p = this.pad;
    if (this.buffered("jmp") || p.upTap) { this.consume("jmp"); this.startJumpsquat(); return true; }
    if (this.buffered("spc") && p.my < -0.5) { this.consume("spc"); this.startMove("uspec"); return true; }
    if (this.buffered("smh") && (this.cDir ? this.cDir[1] : p.my) < -0.5) { this.consume("smh"); this.startMove("usmash"); return true; }
    if (this.buffered("grb") || (inShield && this.buffered("atk"))) { this.consume("grb"); this.consume("atk"); this.startMove("grab"); return true; }
    if (inShield) {
      if (this.edgeX || p.dash) { this.startDodge("roll", this.edgeX || p.dash); return true; }
      if (this.edgeY > 0 || p.dropTap) {
        if (this.plat && !this.plat.solid && p.dropTap) { this.dropThrough(); return true; }
        this.startDodge("spotdodge", 0); return true;
      }
    }
    return false;
  }
  stShieldstun() {
    this.vx = approach(this.vx, 0, this.s.traction);
    if (this.sf >= this.shieldStun) {
      if (this.pad.shd) { this.state = "shield"; this.sf = 0; }
      else this.setState("shielddrop");
    }
  }
  shieldBreak() {
    this.world.emit({ t: "shieldbreak", f: this });
    this.shieldHP = SHIELD.max * 0.375;
    this.grounded = false; this.plat = null;
    this.vy = SHIELD.breakVy; this.vx = 0;
    this.setState("dizzy");
    this.dizzyT = Math.round(clamp(SHIELD.breakStunMax - this.percent, SHIELD.breakStunMin, SHIELD.breakStunMax));
  }
  stDizzy() {
    if (!this.grounded) { return; }
    this.vx = approach(this.vx, 0, this.s.traction);
    // mashing shortens the stun
    if (this.pad.p.atk || this.pad.p.spc || this.pad.p.jmp || this.edgeX) this.dizzyT -= 3;
    if (this.sf >= this.dizzyT) this.toIdle();
  }
  stStun() {
    this.vx = approach(this.vx, 0, this.s.traction);
    if (this.pad.p.atk || this.pad.p.spc || this.pad.p.jmp || this.edgeX) this.stunT -= 2;
    if (this.sf >= this.stunT) this.setState(this.grounded ? "idle" : "air");
  }
  stun(frames, kind) {
    this.setState("stun"); this.stunT = frames; this.stunKind = kind || "stun";
    this.vx = 0; this.kbx = 0; this.kby = 0;
  }

  startDodge(kind, dir) {
    this.consume("shd");
    const stale = this.dodgeStale * TIMING.dodgeStale;
    this.dodgeStale = Math.min(this.dodgeStale + 1, 5); this.dodgeStaleT = 120;
    this.setState(kind);
    if (kind === "roll") {
      this.dodgeDir = dir;
      this.facing = -dir; // roll away, end facing back the way you came
      this.dodgeLen = 30 + stale; this.dodgeI = [4, 16];
    } else { this.dodgeLen = 26 + stale; this.dodgeI = [3, 17]; }
    this.world.emit({ t: "dodge", f: this });
  }
  stDodge() {
    const [i0, i1] = this.dodgeI;
    if (this.sf >= i0 && this.sf <= i1) this.intan = Math.max(this.intan, 1);
    if (this.state === "roll") {
      const t = this.sf / 22;
      this.vx = this.sf < 22 ? this.dodgeDir * this.s.roll * Math.sin(Math.min(1, t) * Math.PI) * 1.2 : 0;
    } else this.vx = 0;
    if (this.sf >= this.dodgeLen) this.toIdle();
  }

  startAirdodge() {
    const p = this.pad;
    this.airdodged = true;
    this.setState("airdodge");
    const mag = Math.hypot(p.mx, p.my);
    this.fastfall = false;
    if (mag > 0.5) {
      const nx = p.mx / mag, ny = p.my / mag;
      this.adDir = [nx, ny];
      this.vx = nx * 11; this.vy = ny * 11;
      this.adLen = 34; this.adI = [3, 17];
    } else { this.adDir = null; this.adLen = 44 + this.dodgeStale * 3; this.adI = [3, 27]; this.vx *= 0.3; this.vy = Math.min(this.vy, 1); }
    this.kbx = 0; this.kby = 0;
    this.world.emit({ t: "dodge", f: this });
  }
  stAirdodge() {
    const [i0, i1] = this.adI;
    if (this.sf >= i0 && this.sf <= i1) this.intan = Math.max(this.intan, 1);
    if (this.adDir) {
      if (this.sf < 18) { const k = 1 - this.sf / 18; this.vx = this.adDir[0] * 11 * k; this.vy = this.adDir[1] * 11 * k; }
    }
    if (this.sf >= this.adLen) { this.setState("air"); }
  }

  stHelpless() {
    this.airDrift(0.75);
  }

  // --- getting hit
  stHitstun() {
    if (this.hitstun > 0) this.hitstun--;
    if (this.hitstun <= 0) {
      this.setState(this.grounded ? "idle" : (this.tumble ? "tumble" : "air"));
      return;
    }
    if (this.grounded) this.vx = approach(this.vx, 0, this.s.traction);
    else if (this.hitstun < 6) this.airDrift(0.5);
  }
  stTumble() {
    if (this.tryAirActions()) { this.tumble = false; return; }
    this.airDrift(0.8);
  }
  stDown() {
    this.vx = approach(this.vx, 0, this.s.traction * 2);
    const p = this.pad;
    if (this.sf > 8) {
      if (this.buffered("atk")) { this.consume("atk"); this.startMove("getupAtk"); return; }
      if (this.edgeX || p.dash) { this.startTech("roll", this.edgeX || p.dash, true); return; }
      if (this.edgeY < 0 || this.buffered("jmp") || this.buffered("shd")) { this.consume("jmp"); this.consume("shd"); this.setState("getup"); return; }
    }
    if (this.sf > 90) this.setState("getup");
  }
  stGetup() {
    if (this.sf < 22) this.intan = Math.max(this.intan, 1);
    if (this.sf >= 28) this.toIdle();
  }
  startTech(kind, dir, fromDown) {
    this.setState("tech");
    this.techKind = kind; this.techDir = dir || 0;
    this.techLen = kind === "roll" ? 40 : 26;
    this.vx = 0; this.vy = 0; this.kbx = 0; this.kby = 0;
    if (!fromDown) this.world.emit({ t: "tech", f: this });
  }
  stTech() {
    if (this.sf <= 20) this.intan = Math.max(this.intan, 1);
    if (this.techKind === "roll" && this.sf < 26) this.vx = this.techDir * this.s.roll * 0.95;
    else this.vx = 0;
    if (this.sf >= this.techLen) this.toIdle();
  }

  // --- ledge
  stLedge() {
    const p = this.pad, L = this.ledge;
    if (!L) { this.toAir(); return; }
    this.vx = 0; this.vy = 0;
    this.x = L.x + L.side * (this.ecbW - 4) + (L.plat.dx || 0);
    this.y = L.y + this.body.hang;
    this.facing = -L.side;
    if (this.sf > TIMING.ledgeHangMax) { this.leaveLedge(); this.toAir(); return; }
    if (this.sf < 8) return;
    const toward = -L.side;
    if (this.buffered("jmp") || p.upTap) { this.consume("jmp"); this.ledgeAction("jump"); return; }
    if (this.buffered("atk") || this.buffered("spc") && false) { this.consume("atk"); this.ledgeAction("attack"); return; }
    if (this.buffered("shd")) { this.consume("shd"); this.ledgeAction("roll"); return; }
    if (this.edgeY < 0 || this.edgeX === toward) { this.ledgeAction("getup"); return; }
    if (this.edgeY > 0 || this.edgeX === -toward) { this.leaveLedge(); this.facing = -L.side; this.toAir(); this.fastfall = false; return; }
  }
  leaveLedge() {
    if (this.ledge) this.world.stage.ledgeOwner.delete(this.ledge.key);
    this.ledgeCD = 36;
    this.ledge = null;
  }
  ledgeAction(kind) {
    const L = this.ledge;
    if (kind === "jump") {
      this.leaveLedge();
      this.grounded = false;
      this.x = L.x + L.side * 8; this.y = L.y - 4;
      this.vy = -this.s.jumpV * 0.95; this.vx = -L.side * 2.5;
      this.setState("air");
      this.intan = 3;
      this.world.emit({ t: "jump", f: this, ground: false });
      return;
    }
    if (kind === "attack") {
      this.leaveLedge();
      this.ledgeSide = L.side;
      this.snapOntoStage(L);
      this.startMove("ledgeAtk");
      return;
    }
    this.ledgeKind = kind; this.ledgeRef = L;
    this.setState("ledgeact");
  }
  snapOntoStage(L) {
    this.x = L.x - L.side * (this.ecbW + 6);
    this.y = L.y; this.grounded = true; this.plat = L.plat; this.vx = 0; this.vy = 0;
    this.facing = -L.side;
  }
  stLedgeAct() {
    const L = this.ledgeRef;
    const len = this.ledgeKind === "roll" ? 38 : 30;
    if (this.sf < (this.ledgeKind === "roll" ? 26 : 22)) this.intan = Math.max(this.intan, 1);
    const t = Math.min(1, this.sf / 14);
    if (this.sf === 1) { this.leaveLedgeKeep = L; this.world.stage.ledgeOwner.delete(L.key); this.ledge = null; this.ledgeCD = 30; }
    if (this.sf <= 14) {
      // climb: interpolate from hang to stage top
      const hx = L.x + L.side * (this.ecbW - 4), hy = L.y + this.body.hang;
      const tx = L.x - L.side * (this.ecbW + 8), ty = L.y;
      this.x = hx + (tx - hx) * t; this.y = hy + (ty - hy) * Math.min(1, t * 1.4);
      this.vx = 0; this.vy = 0;
      if (this.sf === 14) { this.grounded = true; this.plat = L.plat; this.y = ty; }
    } else if (this.ledgeKind === "roll") {
      this.vx = -L.side * this.s.roll * (this.sf < 30 ? 1 : 0.2);
    } else this.vx = 0;
    if (this.sf >= len) { this.grounded = true; this.plat = L.plat; this.toIdle(); }
  }

  // --- grab
  stGrabbing() {
    const v = this.grabbed, p = this.pad;
    if (!v || v.grabber !== this) { this.grabbed = null; this.toIdle(); return; }
    this.vx = 0;
    this.grabTimer--;
    this.world.holdVictim(this, v);
    if (this.grabTimer <= 0) { this.world.grabRelease(this, v); return; }
    if (this.sf < 6) return;
    if (this.buffered("atk") && !this.pummelT) { this.consume("atk"); this.pummelT = 1; }
    if (this.pummelT) {
      this.pummelT++;
      if (this.pummelT === 5) this.world.pummel(this, v);
      if (this.pummelT >= 16) this.pummelT = 0;
      return;
    }
    let dir = null;
    const mx = p.mx * this.facing;
    if (this.cDir) { const c = this.cDir; this.cDir = null; dir = [c[0] * this.facing, c[1]]; }
    if (!dir && (this.edgeX || this.edgeY || this.sf > 14)) {
      if (p.my < -0.6) dir = [0, -1]; else if (p.my > 0.6) dir = [0, 1];
      else if (mx > 0.6) dir = [1, 0]; else if (mx < -0.6) dir = [-1, 0];
    }
    if (this.buffered("grb") || this.buffered("smh")) { this.consume("grb"); this.consume("smh"); dir = dir || [1, 0]; }
    if (dir) {
      let id = "fthrow";
      if (dir[1] < -0.5) id = "uthrow"; else if (dir[1] > 0.5) id = "dthrow"; else if (dir[0] < 0) id = "bthrow";
      this.pummelT = 0;
      this.startMove(id);
      this.throwVictim = v;
    }
  }
  stGrabbed() {
    const g = this.grabber;
    if (!g || g.grabbed !== this || g.dead) { this.grabber = null; this.setState(this.grounded ? "idle" : "air"); return; }
    const p = this.pad;
    if (p.p.atk || p.p.spc || p.p.jmp || p.p.shd || this.edgeX || this.edgeY) g.grabTimer -= TIMING.grabMash;
  }

  stRespawn() {
    this.vx = 0; this.vy = 0;
    this.invinc = Math.max(this.invinc, 2);
    const p = this.pad;
    const acted = Math.abs(p.mx) > 0.3 || p.my > 0.3 || p.p.jmp || p.p.atk || p.p.spc || p.p.shd;
    if (this.sf > 30 && acted || this.sf > 300) {
      this.invinc = TIMING.respawnInvuln;
      this.setState("air");
      this.jumps = this.s.jumps;
    }
  }

  dropThrough() {
    this.dropPlat = this.plat; this.dropTimer = 14;
    this.grounded = false; this.plat = null;
    this.vy = 2;
    this.setState("air");
  }

  // ------------------------------------------------------------------ physics
  integrate() {
    const w = this.world, stg = w.stage, s = this.s;
    if (this.state === "ledge" || this.state === "ledgeact" || this.state === "grabbed" || this.state === "thrown" || this.state === "respawn" || this.state === "fsCine") {
      return;
    }
    // knockback decay
    if (this.kbx || this.kby) {
      const m = Math.hypot(this.kbx, this.kby);
      const nm = Math.max(0, m - PHYS.kbDecay);
      if (nm === 0) { this.kbx = 0; this.kby = 0; }
      else { this.kbx *= nm / m; this.kby *= nm / m; }
    }
    if (this.grounded) {
      const pl = this.plat;
      if (pl) { this.x += pl.dx; this.y = pl.y; }
      const slip = pl && pl.ice > 0 ? 0.25 : 1;
      if (slip < 1) this.vx = this.vx; // ice keeps momentum
      this.x += this.vx + this.kbx;
      this.kby = 0;
      // walked off?
      if (pl && !stg.groundAt(this.x, pl)) {
        const holdEdge = this.state === "attack" && !(this.move && this.move.slideOff) ||
          this.state === "shield" || this.state === "shieldstun" || this.state === "spotdodge" || this.state === "land" ||
          this.state === "jumpsquat" || this.state === "down" || this.state === "getup" || this.state === "taunt" ||
          this.state === "grab" || this.state === "grabbing" || this.state === "dizzy" || this.state === "stun" ||
          (this.state === "tech") || (this.state === "roll" && false);
        const walkOffAllowed = !holdEdge && !(this.state === "idle" || this.state === "crouch");
        if (holdEdge || (!walkOffAllowed && Math.abs(this.kbx) < 1)) {
          this.x = clamp(this.x, pl.x1, pl.x2);
          if (this.state === "idle") this.teeter = true;
        } else {
          this.grounded = false; this.plat = null;
          this.vy = 0; this.fastfall = false;
          if (this.state === "attack") {} // keep attacking in the air
          else if (this.state === "hitstun") {}
          else if (this.state === "roll" || this.state === "tech") this.setState("air");
          else this.setState(this.state === "run" || this.state === "dash" || this.state === "walk" || this.state === "runbrake" ? "air" : this.state);
          this.jumpsOffEdge();
        }
      }
    } else {
      // gravity
      const gm = (this.move && this.move.gravMul != null && this.state === "attack") ? this.move.gravMul :
        (this.state === "airdodge" && this.adDir && this.sf < 18) ? 0 : 1;
      const maxFall = this.fastfall ? s.fastFall : s.fall;
      if (gm > 0) this.vy = Math.min(this.vy + s.gravity * gm, Math.max(this.vy, maxFall));
      const nx = this.x + this.vx + this.kbx, ny = this.y + this.vy + this.kby;
      const vyTot = this.vy + this.kby;
      // landing
      let landed = null;
      if (vyTot >= 0 && this.state !== "respawn") {
        const ignoreSoft = this.pad.my > 0.6 && (this.state === "air" || this.state === "helpless") && this.fastfall ||
          this.state === "hitstun" && this.kby < -3;
        landed = stg.findLanding(nx, this.y, ny, ignoreSoft, this.dropPlat);
      }
      this.x = nx; this.y = ny;
      if (landed) {
        this.y = landed.y;
        this.land(landed, vyTot);
      }
    }
    const hit = stg.collideWalls(this, this.prevX);
    if (hit) this.onWall(hit);
    // fighters never sink into solid tops while grounded
    this.checkLedgeGrab();
  }

  jumpsOffEdge() {
    // walking off keeps the double jump; first jump is lost (like Smash)
    this.jumps = Math.min(this.jumps, this.s.jumps - 1);
  }

  onWall(hit) {
    if (hit.ceil) {
      if (this.state === "hitstun" && Math.abs(this.kby) > 8) { this.kby = -this.kby * 0.6; this.world.emit({ t: "wallhit", f: this }); }
      else { this.vy = Math.max(this.vy, 0); this.kby = Math.max(this.kby, 0); }
      return;
    }
    if ((this.state === "hitstun" || this.state === "tumble") && Math.abs(this.kbx) > 6) {
      if (this.lastShieldPress <= TIMING.techWindow && this.techLock === 0) {
        this.kbx = 0; this.kby = 0; this.vx = 0; this.vy = -6; this.hitstun = 0;
        this.setState("air"); this.intan = 16;
        this.world.emit({ t: "tech", f: this, wall: true });
      } else {
        this.kbx = -this.kbx * 0.7;
        this.world.emit({ t: "wallhit", f: this });
      }
    } else {
      this.vx = 0; if (Math.sign(this.kbx) === -hit.wall) this.kbx = 0;
    }
  }

  land(plat, vyTot) {
    const prevState = this.state;
    this.grounded = true; this.plat = plat;
    this.jumps = this.s.jumps; this.airdodged = false; this.upBUsed = false;
    this.fastfall = false; this.wallJumps = 0; this.sideBUsed = false;
    this.vy = 0;
    this.ledgeInvUsed = false;
    const kbSpeed = Math.hypot(this.kbx, this.kby);
    if (prevState === "hitstun" || prevState === "tumble") {
      const wantTech = this.lastShieldPress <= TIMING.techWindow && this.techLock === 0;
      if (prevState === "hitstun" && !this.tumble && kbSpeed < 10) {
        this.kby = 0;
        return;  // light flinch landing keeps hitstun
      }
      if (wantTech) {
        const d = this.pad.mx;
        this.startTech(Math.abs(d) > 0.5 ? "roll" : "inplace", sign(d));
        return;
      }
      if (kbSpeed > 16 && this.state === "hitstun") {
        // ground bounce
        this.grounded = false; this.plat = null;
        this.kby = -Math.abs(this.kby) * 0.55; this.y -= 2;
        this.world.emit({ t: "bounce", f: this });
        return;
      }
      this.kbx *= 0.3; this.kby = 0;
      this.hitstun = 0; this.tumble = false;
      this.setState("down");
      this.world.emit({ t: "knockdown", f: this });
      return;
    }
    this.kbx *= 0.5; this.kby = 0;
    if (prevState === "attack" && this.move) {
      const m = this.move;
      if (m.landCancel) { m.landCancel(this, this.world); return; }
      if (m.aerial) {
        const ac = m.ac && m.ac.some(([a, b]) => this.mf >= a && this.mf <= b);
        const lag = ac ? TIMING.landLag : (m.land || 10);
        this.endMoveFlags(); this.move = null;
        this.landLag = lag; this.setState("land");
        this.world.emit({ t: "land", f: this, hard: !ac });
        return;
      }
      if (m.airOnly) { this.endMoveFlags(); this.move = null; this.landLag = m.land || 12; this.setState("land"); return; }
      return; // grounded-capable move keeps going
    }
    if (prevState === "helpless") { this.landLag = this.vars.helplessLand || TIMING.helplessLand; this.setState("land"); this.world.emit({ t: "land", f: this, hard: true }); return; }
    if (prevState === "airdodge") { this.landLag = this.adDir ? 12 : 4; this.setState("land"); this.world.emit({ t: "land", f: this }); return; }
    if (prevState === "dizzy") { return; }
    if (prevState === "stun") { return; }
    if (prevState === "air" || prevState === "jumpsquat") {
      this.landLag = TIMING.landLag; this.setState("land");
      this.world.emit({ t: "land", f: this });
      return;
    }
  }

  checkLedgeGrab() {
    if (this.grounded || this.ledgeCD > 0) return;
    const st = this.state;
    const okState = st === "air" || st === "helpless" || st === "tumble" ||
      (st === "attack" && this.move && this.move.ledgeGrab && this.mf >= (this.move.ledgeGrab || 0));
    if (!okState) return;
    if (this.vy + this.kby < 0 && st !== "attack") return;
    if (this.pad.my > 0.6) return;
    const stg = this.world.stage;
    for (const L of stg.ledgePoints()) {
      const hangX = L.x + L.side * this.ecbW;
      const dx = (this.x - hangX) * L.side;          // + means further off-stage
      const dy = this.y - L.y;                        // feet below ledge top
      if (dx > -18 && dx < 46 && dy > 20 && dy < this.body.hang + 58) {
        // must not be above the stage surface side
        const owner = stg.ledgeOwner.get(L.key);
        if (owner && owner !== this) {
          // trump: pop the current owner off
          if (owner.state === "ledge") { owner.leaveLedge(); owner.setState("air"); owner.vx = L.side * 3; owner.vy = -3; owner.intan = 0; }
          else continue;
        }
        this.grabLedge(L);
        return;
      }
    }
  }

  grabLedge(L) {
    const stg = this.world.stage;
    stg.ledgeOwner.set(L.key, this);
    this.ledge = L;
    if (this.state === "attack") this.endMoveFlags();
    this.move = null;
    this.setState("ledge");
    this.vx = 0; this.vy = 0; this.kbx = 0; this.kby = 0; this.fastfall = false;
    this.jumps = this.s.jumps; this.airdodged = false; this.upBUsed = false; this.tumble = false; this.sideBUsed = false; this.wallJumps = 0;
    if (!this.ledgeInvUsed) { this.intan = TIMING.ledgeInvuln; this.ledgeInvUsed = true; }
    this.world.emit({ t: "ledge", f: this });
  }

  // ------------------------------------------------------------------ being hit
  // Called by the world when a hitbox connects. Returns nothing; sets hitlag + pending KB.
  takeHit(h) {
    const w = this.world;
    const wasGrabbed = this.state === "grabbed";
    if (wasGrabbed && this.grabber && !h.throw) { const g = this.grabber; g.grabbed = null; g.toIdle(); this.grabber = null; }
    if (this.ledge) this.leaveLedge();
    this.percent = Math.min(999, this.percent + h.dmg);
    this.stats.dmgTaken += h.dmg;
    let kb = h.kb;
    if (this.state === "crouch") kb *= 0.85;
    if (this.status.stance === "long") kb *= 0.85;
    if (this.status.stance === "short") kb *= 1.1;
    if (this.status.label && h.owner && h.owner.id === "huchenfeng") kb *= 1.2;
    if (this.status.giant) kb *= 0.72;
    if (this.status.tiny) kb *= 1.3;
    // armour
    if (this.armor && (this.armor.type === "super" || kb < (this.armor.kb || 0))) {
      this.hitlag = h.lag;
      this.flash = 8;
      w.emit({ t: "armor", f: this });
      return;
    }
    if (this.state === "attack") this.endMoveFlags();
    this.move = null; this.moveId = null;
    this.hitlag = h.lag;
    this.shake = h.lag;
    this.flash = 10;
    // resolve angle
    let ang = h.ang;
    const grounded = this.grounded;
    if (ang === 361) ang = grounded ? (kb < 60 ? 0 : kb < 88 ? (kb - 60) / 28 * 40 : 40) : 45;
    let lx = Math.cos(ang * DEG) * h.dir, ly = -Math.sin(ang * DEG);
    if (h.link) { // autolink: pull toward a point
      const dx = h.link[0] - this.x, dy = h.link[1] - (this.y - 50);
      const d = Math.hypot(dx, dy) || 1;
      lx = dx / d; ly = dy / d;
    }
    this.pendingKB = { kb, lx, ly, sdi: h.sdi ?? 1, noTumble: !!h.noTumble, fromThrow: !!h.throw };
    this.lastHitBy = h.owner; this.lastHitFrame = w.frame;
    this.grounded = grounded && kb < PHYS.tumbleKB && ly >= -0.35 ? grounded : false;
    if (!this.grounded) this.plat = null;
    this.setState("hitstun");
    this.hitstun = Math.floor(kb * PHYS.hitstunMul * (h.stunMul || 1));
    this.tumble = kb >= PHYS.tumbleKB && !h.noTumble;
    this.vx = 0; this.vy = 0; this.kbx = 0; this.kby = 0;
    this.fastfall = false;
  }

  applyPendingKB() {
    const k = this.pendingKB;
    this.pendingKB = null;
    let { lx, ly } = k;
    // DI
    const mx = this.pad.mx, my = this.pad.my;
    const mm = Math.hypot(mx, my);
    if (mm > 0.3 && k.kb > 20) {
      const aL = Math.atan2(ly, lx), aS = Math.atan2(my, mx);
      let d = aS - aL; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const na = aL + PHYS.diMaxDeg * DEG * Math.sin(d) * Math.min(1, mm);
      lx = Math.cos(na); ly = Math.sin(na);
    }
    // meteor on the ground bounces up
    if (this.grounded && ly > 0.2) { ly = -ly * 0.8; this.grounded = false; this.plat = null; }
    const spd = k.kb * PHYS.kbScale;
    this.kbx = lx * spd; this.kby = ly * spd;
    if (!this.grounded || ly < -0.25) {
      if (this.grounded && ly < 0) { this.grounded = false; this.plat = null; this.y -= 1; }
    } else {
      this.kby = 0;
    }
    this.launchSpeed = spd;
    this.world.emit({ t: "launch", f: this, spd, kb: k.kb });
  }

  // ------------------------------------------------------------------ items (implemented in items.js hooks)
  itemAttack(moving) { return this.world.items ? this.world.items.fighterAttack(this, moving) : false; }
  throwItem() { if (this.world.items) this.world.items.throwHeld(this); }
  pickUpItem() { return this.world.items ? this.world.items.tryPickup(this) : false; }

  // ------------------------------------------------------------------ animation
  animate() {
    const T = this.poseT || (this.poseT = neutralPose());
    const P = this.pose;
    const st = this.state;
    let rate = 0.38;
    if (st === "attack" && this.move) {
      const m = this.move;
      const f = m.charge != null && this.mf === m.charge ? m.charge : this.mf;
      samplePose(m._anim, f, T);
      if (m.charge != null && this.charge > 0 && this.mf === m.charge) {
        T.px += Math.sin(this.charge * 1.7) * 1.5; // charging tremble
      }
      // attacks track their keys tightly; the first frame eases in from wherever we were
      rate = this.mf <= 1 ? 0.55 : 0.85;
    } else {
      this.def.locomotion(this, T);
      if (st === "hitstun" && this.sf <= 1) rate = 1;
      else if (st === "land" || st === "jumpsquat") rate = 0.6;
      else if (st === "run" || st === "dash") rate = 0.45;
      else if (st === "ledge" || st === "ledgeact" || st === "down" || st === "getup" || st === "tech" || st === "roll" || st === "respawn" || st === "grabbed" || st === "thrown") rate = 1;
    }
    // stretch when rising/falling fast (air only)
    if (!this.grounded && st !== "attack" && st !== "ledge") {
      const vy = this.vy + this.kby;
      const k = Math.max(-0.1, Math.min(0.12, -vy * 0.006));
      T.sy *= 1 + Math.abs(k); T.sx *= 1 - Math.abs(k) * 0.6;
    }
    // item statuses
    if (this.status.giant) { T.sx *= 1.32; T.sy *= 1.32; }
    else if (this.status.tiny) { T.sx *= 0.68; T.sy *= 0.68; }
    if (this.firstAnim === undefined) { this.firstAnim = true; rate = 1; }
    blendInto(P, T, rate);
    solveRig(this.body, P, this.grounded, this.j);
    hurtCapsules(this.body, this.j, this.hurt);
    // turn tween (visual only)
    if (this.lastFacing !== this.facing) { this.turnT = this.lastFacing === undefined ? 0 : 5; this.lastFacing = this.facing; }
    else if (this.turnT > 0) this.turnT--;
  }

  // World-space helpers
  wx(lx) { return this.x + lx * this.facing; }
  bone(name, ox = 0, oy = 0) {
    const b = bonePoint(this.j, name);
    return [this.x + (b[0] + ox) * this.facing, this.y + b[1] + oy];
  }
  centre() { return [this.x + this.j.ctr[0] * this.facing, this.y + this.j.ctr[1]]; }

  staleMul(id) {
    let m = 1, found = false;
    for (let i = 0; i < this.staleQ.length; i++) if (this.staleQ[i] === id) { m -= STALE[i]; found = true; }
    return found ? m : FRESH_BONUS;
  }
  pushStale(id) {
    this.staleQ.unshift(id);
    if (this.staleQ.length > 9) this.staleQ.pop();
  }
}

const NUMK = ["lean", "hd", "fa", "fe", "ba", "be", "fl", "fk", "bl", "bk", "px", "py", "sx", "sy", "pa"];
function blendInto(P, T, r) {
  if (r >= 1) { copyPose(T, P); return; }
  for (const k of NUMK) P[k] += (T[k] - P[k]) * r;
  // whole-body spins must not unwind backwards through 360
  const d = T.rot - P.rot;
  if (Math.abs(d) > 150) P.rot = T.rot; else P.rot += d * Math.max(r, 0.6);
  P.fh = T.fh; P.bh = T.bh; P.ex = T.ex; P.pv = T.pv;
}

export { GROUND_STATES, ACTIONABLE_GROUND, knockback, hitlagFrames };
