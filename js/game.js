// 梗图格斗 2.0 — KOF-style meme arena fighter.
// Fixed 60Hz timestep · AI-generated sprite sheets · data-driven combat.
"use strict";

(() => {
  const D = window.GAME_DATA, S = D.settings, AU = window.GAME_AUDIO;
  const W = S.width, H = S.height, FLOOR = S.floorY;
  const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  const TAU = Math.PI * 2;

  // ---------- helpers ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const font = (px, bold = true) => `${bold ? "900 " : ""}${px}px ${FONT}`;

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------- assets ----------
  const ASSETS = { manifest: null, img: {} };
  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => rej(new Error("missing " + src));
      const v = ASSETS.manifest && ASSETS.manifest.v ? "?v=" + ASSETS.manifest.v : "";
      im.src = "assets/game/" + src + v;
    });
  }
  async function loadAssets(onProgress) {
    const mf = await (await fetch("assets/game/manifest.json", { cache: "no-store" })).json();
    ASSETS.manifest = mf;
    const files = new Set();
    for (const ck of Object.keys(mf.chars)) {
      for (const p of Object.values(mf.chars[ck].poses)) files.add(p.f);
      if (mf.chars[ck].portrait) files.add(mf.chars[ck].portrait);
    }
    for (const st of Object.values(mf.stages || {})) files.add(st);
    for (const pr of Object.values(mf.props || {})) files.add(pr.f);
    for (const fx of Object.values(mf.fx || {})) files.add(fx.f);
    if (mf.logo) files.add(mf.logo);
    const list = [...files];
    let done = 0;
    await Promise.all(list.map(f => loadImage(f).then(im => {
      ASSETS.img[f] = im;
      onProgress(++done / list.length);
    })));
  }
  const poseData = (ck, pose) => {
    const c = ASSETS.manifest.chars[ck];
    return c.poses[pose] || c.poses.idle;
  };
  const propImg = key => {
    const p = (ASSETS.manifest.props || {})[key];
    return p ? { img: ASSETS.img[p.f], p } : null;
  };
  const fxImg = key => {
    const p = (ASSETS.manifest.fx || {})[key];
    return p ? { img: ASSETS.img[p.f], p } : null;
  };

  // ---------- input ----------
  const KEYMAPS = [
    { left: "KeyA", right: "KeyD", up: "KeyW", down: "KeyS",
      light: "KeyJ", heavy: "KeyK", s1: "KeyU", s2: "KeyI", ult: "KeyO", taunt: "KeyT" },
    { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp", down: "ArrowDown",
      light: "Comma", heavy: "Period", s1: "Semicolon", s2: "Quote", ult: "Slash", taunt: "ShiftRight" },
  ];
  const keys = {};
  const pressBuf = [];       // {code, t}
  let frameNow = 0;
  window.addEventListener("keydown", e => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressBuf.push({ code: e.code, t: frameNow, used: false, usedDT: false });
    if (pressBuf.length > 40) pressBuf.shift();
    AU.unlock();
    Game.onKey(e.code, e);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Slash", "Quote"].includes(e.code)) e.preventDefault();
  });
  window.addEventListener("keyup", e => { keys[e.code] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; pressBuf.length = 0; });

  class Pad {
    constructor(map) { this.map = map; }
    down(name) { return !!keys[this.map[name]]; }
    // buffered edge-trigger: consume presses from the last 3 frames
    press(name) {
      const code = this.map[name];
      for (let i = pressBuf.length - 1; i >= 0; i--) {
        const p = pressBuf[i];
        if (p.code === code && !p.used && frameNow - p.t <= 3) { p.used = true; return true; }
      }
      return false;
    }
    doubleTap(name) {
      const code = this.map[name];
      const taps = pressBuf.filter(p => p.code === code && frameNow - p.t <= S.doubleTapWindow);
      const fresh = taps.find(p => !p.usedDT && frameNow - p.t <= 3);
      if (fresh && taps.length >= 2) { fresh.usedDT = true; return true; }
      return false;
    }
  }

  // Virtual pad for AI — same interface.
  class AIPad {
    constructor() { this.state = {}; this.pulse = {}; }
    down(name) { return !!this.state[name]; }
    press(name) { const v = this.pulse[name]; this.pulse[name] = false; return !!v; }
    doubleTap(name) { const v = this.pulse["dt_" + name]; this.pulse["dt_" + name] = false; return !!v; }
    tap(name) { this.pulse[name] = true; }
    dtap(name) { this.pulse["dt_" + name] = true; }
  }

  // ---------- particles ----------
  const particles = [];
  function emit(opts) {
    particles.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 30, age: 0, size: 6,
      color: "#fff", type: "dot", rot: 0, vr: 0, alpha: 1, text: null, sprite: null,
      fade: true, shrink: false, drag: 1,
    }, opts));
  }
  function burst(x, y, n, fn) { for (let i = 0; i < n; i++) emit(fn(i)); }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age++;
      p.vy += p.g * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr;
      if (p.age >= p.life) particles.splice(i, 1);
    }
  }

  // emitter presets
  const FX = {
    hitSpark(x, y, big) {
      const f = fxImg("spark2");
      emit({ x, y, life: big ? 14 : 9, type: "fxanim", frames: ["spark0", "spark1", "spark2", "spark3"], size: big ? 130 : 84 });
      burst(x, y, big ? 14 : 8, () => ({
        x, y, vx: rand(-460, 460), vy: rand(-520, 160), g: 1300, life: rand(12, 26) | 0,
        size: rand(3, big ? 8 : 5), color: pick(["#ffd76a", "#ffab3d", "#fff7d1"]), type: "dot",
      }));
    },
    guardSpark(x, y, just) {
      emit({ x, y, life: 12, type: "fx", sprite: "guardhex", size: just ? 120 : 88, alpha: 0.9 });
      if (just) burst(x, y, 10, () => ({
        x, y, vx: rand(-300, 300), vy: rand(-380, 60), g: 900, life: 22,
        size: rand(2, 5), color: "#9fe8ff", type: "dot",
      }));
    },
    dust(x, y) {
      burst(x, y, 5, () => ({
        x: x + rand(-16, 16), y: y + rand(-6, 2), vx: rand(-120, 120), vy: rand(-90, -20),
        life: rand(16, 30) | 0, size: rand(8, 18), color: "rgba(210,195,170,0.5)", type: "puff", shrink: false,
      }));
    },
    confetti(x, y) {
      burst(x, y, 40, () => ({
        x: x + rand(-60, 60), y: y + rand(-40, 0), vx: rand(-260, 260), vy: rand(-680, -220),
        g: 1500, life: rand(40, 90) | 0, size: rand(5, 10), vr: rand(-0.4, 0.4),
        color: pick(["#ff5d7e", "#ffd76a", "#6ce4ff", "#9dff8a", "#d29bff"]), type: "rect",
      }));
    },
    afterimage(f) {
      emit({ x: f.x, y: f.y, life: 14, type: "ghost", char: f.charKey, pose: f.pose(),
             facing: f.facing, scale: f.spriteScale(), alpha: 0.45 });
    },
    aura(x, y, color) {
      burst(x, y, 3, () => ({
        x: x + rand(-40, 40), y: y + rand(-10, 10), vx: rand(-30, 30), vy: rand(-420, -240),
        life: rand(18, 34) | 0, size: rand(4, 9), color, type: "dot",
      }));
    },
  };

  // ---------- floating text / quotes / banners ----------
  const floats = [];   // damage numbers, tags
  function floatText(x, y, text, color, size = 30) {
    floats.push({ x, y, text, color, size, age: 0, life: 46, vy: -110 });
  }
  const bubbles = [];  // speech bubbles {fighter, text, age, life}
  function say(f, text) {
    if (!text) return;
    for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].f === f) bubbles.splice(i, 1);
    bubbles.push({ f, text, age: 0, life: 95 });
    AU.sfx("quote");
  }
  let banner = null;   // {text, sub, age, life, size}
  function showBanner(text, sub, life = 70, size = 110) {
    banner = { text, sub, age: 0, life, size };
  }

  // ---------- camera ----------
  const cam = { x: S.stageW / 2, zoom: 1, trauma: 0, tx: S.stageW / 2, tzoom: 1, punchX: 0, punchY: 0 };
  function updateCamera(f1, f2, dt) {
    const mid = (f1.x + f2.x) / 2;
    const span = Math.abs(f1.x - f2.x) + 560;
    cam.tzoom = clamp(W / span, 0.82, 1.06);
    cam.tx = clamp(mid, W / (2 * cam.tzoom), S.stageW - W / (2 * cam.tzoom));
    cam.x = lerp(cam.x, cam.tx, 0.12);
    cam.zoom = lerp(cam.zoom, cam.tzoom, 0.09);
    cam.trauma = Math.max(0, cam.trauma - 2.4 * dt);
    const sh = cam.trauma * cam.trauma;
    cam.punchX = rand(-1, 1) * 34 * sh;
    cam.punchY = rand(-1, 1) * 22 * sh;
  }
  const shake = amt => { cam.trauma = Math.min(1, cam.trauma + amt); };
  const w2sx = x => (x - cam.x) * cam.zoom + W / 2 + cam.punchX;
  const w2sy = y => (y - FLOOR) * cam.zoom + FLOOR - 40 * (1 - cam.zoom) + cam.punchY;

  // ---------- hitstop ----------
  let hitstop = 0;
  let timeScale = 1, slowFrames = 0;

  // ---------- projectiles ----------
  const projectiles = [];
  class Projectile {
    constructor(owner, spec, x, y, dir) {
      Object.assign(this, spec);
      this.owner = owner; this.x = x; this.y = y;
      this.vx = spec.vx * dir; this.dir = dir;
      this.vy = spec.vy || 0;
      this.startX = x; this.age = 0; this.dead = false;
      this.phase = "out"; this.rotation = 0;
      this.tier = spec.tier || 1;
    }
    update(dt) {
      this.age++;
      if (this.boomerang) {
        if (this.phase === "out") {
          this.x += this.vx * dt;
          if (Math.abs(this.x - this.startX) > this.boomerang) this.phase = "back";
        } else {
          const tx = this.owner.x, dir = Math.sign(tx - this.x) || 1;
          this.x += Math.abs(this.vx) * 1.15 * dir * dt;
          if (Math.abs(this.x - tx) < 40 && !this.owner.ko) {
            this.dead = true;                          // 叼盘成功
            this.owner.meter = clamp(this.owner.meter + 6, 0, S.maxMeter);
            floatText(this.owner.x, this.owner.y - this.owner.h - 30, "叼盘成功!", "#f6d69c", 26);
          }
        }
      } else {
        this.vy += (this.g || 0) * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
      }
      this.rotation += (this.spin || 0) * dt;
      if (this.maxDist && Math.abs(this.x - this.startX) > this.maxDist) this.dead = true;
      if (this.y > FLOOR + 10 || this.x < -100 || this.x > S.stageW + 100 || this.age > 400) this.dead = true;
    }
    rect() { return { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }; }
  }
  function spawnProj(owner, spec, xoff, yoff) {
    const own = projectiles.filter(p => p.owner === owner && !p.dead).length;
    if (own >= S.projCap) return null;
    const p = new Projectile(owner, spec, owner.x + (xoff || 70) * owner.facing, owner.y - owner.h * (yoff || 0.55), owner.facing);
    projectiles.push(p);
    AU.sfx("shoot");
    return p;
  }

  // ---------- slow fields ----------
  const fields = [];

  // ---------- Fighter ----------
  const POSE_FLOW = {  // state -> pose
    idle: "idle", walk: "walk", dash: "dash", backdash: "dash", jump: "jump",
    guard: "guard", guardstun: "guard", hitstun: "hit", launched: "hit",
    crumple: "hit", knockdown: "defeat", ko: "defeat", win: "win", taunt: "taunt",
    intro: "taunt", throwing: "smash", grabbed: "hit", ranbu_victim: "hit",
  };

  class Fighter {
    constructor(charKey, side, pad, isAI) {
      this.charKey = charKey;
      this.data = D.fighters[charKey];
      this.side = side;                  // 0 left, 1 right
      this.pad = pad; this.isAI = isAI;
      this.gold = false;
      const idle = poseData(charKey, "idle");
      this.scale = S.charH / idle.h;
      this.reset(side === 0 ? S.stageW / 2 - 260 : S.stageW / 2 + 260, side === 0 ? 1 : -1);
      this.maxHp = this.data.hp || S.maxHealth;
      this.hp = this.maxHp;
      this.meter = 0;
      this.rounds = 0;
    }
    reset(x, facing) {
      this.x = x; this.y = FLOOR; this.vx = 0; this.vy = 0;
      this.facing = facing;
      this.state = "idle"; this.stateT = 0;
      this.move = null; this.moveFrame = 0; this.chain = 0; this.moveHit = false;
      this.airborne = false; this.jumps = 0;
      this.guardGauge = S.maxGuard;
      this.guardHeld = 0;
      this.hitstun = 0; this.blockstun = 0;
      this.invuln = 0;
      this.cds = { s1: 0, s2: 0, counter: 0, throw: 0, dash: 0, backdash: 0 };
      this.combo = { hits: 0, dmg: 0, timer: 0 };
      this.victimCombo = 0;
      this.juggleLift = 1;
      this.slowT = 0; this.slowMul = 1;
      this.ko = false;
      this.reflectT = 0;
      this.armorT = 0; this.armorUsed = false;
      this.ranbuScript = null;
      this.ultScript = null; this.ultPose = null;
      this.hidden = false; this.banCard = false;
      this.w = 78;                                  // pushbox half-ish width
      this.h = S.charH * 0.92;
      this.lastLand = 0;
      this.introDone = false;
      this.tauntT = 0;
      this.aiMem = { lastP1Buttons: [], plan: null, planT: 0, reactT: 0 };
    }
    get opp() { return this === Game.f1 ? Game.f2 : Game.f1; }
    get slowNow() { return this.slowT > 0 ? this.slowMul : 1; }
    pose() {
      if (this.state === "attack" && this.move) return this.move.pose;
      if (this.state === "special" && this.move) return this.move.pose || "cast";
      if (this.state === "ult") return this.ultPose || "channel";
      if (this.state === "jump") return this.move ? this.move.pose : "jump";
      return POSE_FLOW[this.state] || "idle";
    }
    spriteScale() { return this.scale; }
    rect() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }
    hurtRect() {
      const r = this.rect();
      if (this.state === "launched" || this.airborne) { r.y += 20; r.h -= 20; }
      return r;
    }

    // ---- state helpers ----
    setState(st, t = 0) { this.state = st; this.stateT = t; }
    busy() {
      return ["attack", "special", "ult", "hitstun", "guardstun", "launched", "crumple",
              "knockdown", "throwing", "grabbed", "dash", "backdash", "ko", "win", "intro",
              "ranbu_victim", "taunt"].includes(this.state);
    }
    canAct() { return !this.busy() || (this.state === "jump"); }

    // ---- per-frame update ----
    update(dt) {
      this.stateT++;
      frameCooldowns(this.cds);
      if (this.invuln > 0) this.invuln--;
      if (this.slowT > 0) this.slowT--;
      if (this.reflectT > 0) this.reflectT--;
      if (this.armorT > 0) this.armorT--;
      if (this.combo.timer > 0 && --this.combo.timer === 0) this.endCombo();
      if (this.tauntT > 0) this.tauntT--;
      this.backHeld = this.holdingGuard() ? (this.backHeld || 0) + 1 : 0;

      // gold boss: once per round, a telegraphed burst of golden armor
      if (this.gold && !this.armorUsed && this.hp < this.maxHp * 0.5 && Game.phase === "fight") {
        this.armorUsed = true;
        this.armorT = 180;
        say(this, "年轻人,不讲武德。");
        AU.sfx("counter");
        shake(0.4);
      }
      if (this.armorT > 0 && frameNow % 4 === 0) FX.aura(this.x, this.y - this.h * 0.5, "#ffe9a8");
      if (this.gold && frameNow % 2 === 0) FX.aura(this.x, this.y - this.h * 0.4, "#ffe9a8");

      // guard gauge regen
      if (this.state !== "guard" && this.state !== "guardstun" && this.guardGauge < S.maxGuard)
        this.guardGauge = clamp(this.guardGauge + S.guardRegen * dt, 0, S.maxGuard);

      const mv = this.slowNow;

      switch (this.state) {
        case "idle": case "walk": {
          if (Game.phase !== "fight") { this.vx = 0; break; }
          this.handleNeutral(dt, mv);
          break;
        }
        case "jump": {
          if (this.move) this.updateMove(dt);
          else this.handleAir(dt, mv);
          break;
        }
        case "dash": {
          this.vx = S.dashSpeed * this.facing * mv;
          if (this.stateT % 3 === 0) FX.afterimage(this);
          if (this.stateT >= S.dashFrames) { this.setState("idle"); this.vx = 0; this.cds.dash = S.dashCd; }
          break;
        }
        case "backdash": {
          this.vx = -S.backdashSpeed * this.facing * mv;
          if (this.stateT <= S.backdashIframes) this.invuln = 2;
          if (this.stateT % 3 === 0) FX.afterimage(this);
          if (this.stateT >= S.backdashFrames) { this.setState("idle"); this.vx = 0; }
          break;
        }
        case "attack": case "special": this.updateMove(dt); break;
        case "ult": this.updateUlt(dt); break;
        case "guard": {
          this.vx = 0;
          this.guardHeld++;
          if (!this.holdingGuard()) this.setState("idle");
          break;
        }
        case "guardstun": {
          this.vx *= 0.86;
          if (--this.blockstun <= 0) this.setState(this.holdingGuard() ? "guard" : "idle");
          break;
        }
        case "hitstun": {
          this.vx *= 0.9;
          if (--this.hitstun <= 0) this.setState("idle");
          break;
        }
        case "launched": {
          this.vy += S.gravity * dt;
          this.x += this.vx * dt; this.y += this.vy * dt;
          if (this.y >= FLOOR && this.vy > 0) {
            this.y = FLOOR;
            if (this.hp <= 0) { this.enterKO(); break; }
            this.vy = 0; this.vx = 0;
            this.setState("knockdown"); this.invuln = 40;
            FX.dust(this.x, FLOOR);
            AU.sfx("land");
          }
          return;                                    // custom integration
        }
        case "knockdown": {
          if (this.stateT >= 34) { this.setState("idle"); this.juggleLift = 1; }
          break;
        }
        case "crumple": {
          this.vx = 0;
          if (this.stateT >= S.crumpleFrames) this.setState("idle");
          break;
        }
        case "throwing": this.updateThrow(dt); break;
        case "grabbed": {
          this.vx = 0;
          // safety: release if the grabber was interrupted
          const g = this.opp;
          if (g.state !== "throwing" && !(g.state === "special" && g.move)) this.setState("idle");
          break;
        }
        case "ranbu_victim": this.vx = 0; break;
        case "taunt": {
          if (this.stateT >= 55) this.setState("idle");
          break;
        }
        case "ko": case "win": case "intro": this.vx *= 0.85; break;
      }

      // gravity & integration for grounded/air states
      if (this.state === "jump") {
        const ff = this.pad.down("down") ? S.fastFallMul : 1;
        this.vy += S.gravity * ff * dt;
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.y >= FLOOR && this.vy > 0) {
          this.y = FLOOR; this.vy = 0; this.airborne = false;
          this.setState("idle");
          FX.dust(this.x, FLOOR);
          AU.sfx("land");
          this.lastLand = frameNow;
        }
      } else if (this.state !== "launched" && !(this.move && this.move.selfMove)) {
        this.x += this.vx * dt;
        if (this.y < FLOOR && !["jump"].includes(this.state)) {
          this.vy += S.gravity * dt; this.y = Math.min(FLOOR, this.y + this.vy * dt);
          if (this.y >= FLOOR) { this.y = FLOOR; this.vy = 0; }
        }
      }

      this.x = clamp(this.x, S.wallPad + this.w / 2, S.stageW - S.wallPad - this.w / 2);

      // face opponent when free
      if (["idle", "walk"].includes(this.state) && Game.phase === "fight")
        this.facing = this.x <= this.opp.x ? 1 : -1;
    }

    holdingGuard() {
      // hold back relative to opponent while grounded
      const backName = this.facing === 1 ? "left" : "right";
      return this.pad.down(backName) && !this.airborne && this.y >= FLOOR - 1;
    }

    handleNeutral(dt, mv) {
      const p = this.pad;
      const fwdName = this.facing === 1 ? "right" : "left";
      const backName = this.facing === 1 ? "left" : "right";

      // double-tap dash
      if (this.cds.dash <= 0 && p.doubleTap(fwdName)) { this.setState("dash"); AU.sfx("dash"); return; }
      if (this.cds.backdash <= 0 && p.doubleTap(backName)) {
        this.setState("backdash"); this.cds.backdash = S.backdashCd; AU.sfx("dash"); return;
      }

      // walk
      let dir = 0;
      if (p.down("left")) dir -= 1;
      if (p.down("right")) dir += 1;
      const backing = dir !== 0 && dir !== this.facing;
      this.vx = dir * (backing ? S.backSpeed : S.walkSpeed) * mv;
      this.setState(dir !== 0 ? "walk" : "idle");

      // jump
      if (p.press("up")) {
        this.vy = S.jumpVy; this.airborne = true;
        this.setState("jump"); AU.sfx("jump");
        FX.dust(this.x, FLOOR);
        return;
      }

      // attacks
      if (p.press("light")) return this.startLight();
      if (p.press("heavy")) return this.startHeavy();
      if (p.press("s1")) return this.startSpecial("s1");
      if (p.press("s2")) return this.startSpecial("s2");
      if (p.press("ult")) return this.startUlt();
      if (p.press("taunt") && this.tauntT <= 0) {
        this.setState("taunt"); this.tauntT = 120;
        say(this, pick(this.data.quotes.taunt || ["……"]));
      }
    }

    handleAir(dt, mv) {
      const p = this.pad;
      let dir = 0;
      if (p.down("left")) dir -= 1;
      if (p.down("right")) dir += 1;
      this.vx = clamp(this.vx + dir * 1400 * dt, -S.airDrift - 140, S.airDrift + 140) * 1;
      if (p.press("light")) return this.startAirMove("airLight", "flykick");
      if (p.press("heavy")) return this.startAirMove("airHeavy", "smash");
    }

    // ---- moves ----
    startLight() {
      const fd = D.frames.light;
      const chain = this.chainOK ? this.chain : 0;
      const last = chain >= 2;
      const f = last ? D.frames.light3 : fd;
      this.move = {
        kind: "light", pose: last ? "sweep" : "jab",
        startup: f.startup, active: f.active, recovery: f.recovery,
        dmg: f.dmg, chainWindow: fd.chainWindow,
        knockback: last ? 340 : 150, launch: last ? -300 : 0,
        range: last ? 165 : 150, chainIdx: chain,
      };
      this.chain = chain + 1;
      this.chainOK = false;
      this.moveFrame = 0; this.moveHit = false;
      this.setState("attack");
    }
    startHeavy() {
      // point-blank vs grounded guarding/neutral opponent -> throw
      const o = this.opp;
      const dist = Math.abs(this.x - o.x);
      if (this.cds.throw <= 0 && dist < S.throwRange + this.w &&
          !o.airborne && ["guard", "guardstun", "idle", "walk"].includes(o.state)) {
        this.startThrow(); return;
      }
      const f = D.frames.heavy;
      this.move = {
        kind: "heavy", pose: "uppercut",
        startup: f.startup, active: f.active, recovery: f.recovery,
        dmg: f.dmg, knockback: 250, launch: -760, range: 175, antiAir: true,
      };
      this.chain = 0; this.moveFrame = 0; this.moveHit = false;
      this.setState("attack");
    }
    startAirMove(key, pose) {
      if (this.move) return;
      const f = D.frames[key];
      this.move = {
        kind: key, pose,
        startup: f.startup, active: f.active, recovery: f.recovery,
        dmg: f.dmg, knockback: 220, launch: key === "airHeavy" ? 500 : -200,
        range: 150, air: true, spike: key === "airHeavy",
      };
      this.moveFrame = 0; this.moveHit = false;
    }
    startThrow() {
      this.cds.throw = S.throwCd;
      this.move = { kind: "throw", pose: "smash", startup: S.throwStartup, active: 2, recovery: 20, dmg: S.throwDmg };
      this.moveFrame = 0; this.moveHit = false;
      this.setState("throwing");
    }
    startSpecial(slot) {
      const spec = this.data.kit[slot];
      if (!spec || this.cds[slot] > 0) return;
      this.cds[slot] = spec.cd;
      SPECIALS[spec.id](this, spec);
    }
    startUlt() {
      if (this.meter < S.maxMeter) return;
      this.meter = 0;
      const u = this.data.kit.ult;
      Game.startUltCinematic(this, u);
    }

    updateMove(dt) {
      if (!this.move) { this.setState("idle"); return; }
      this.moveFrame++;
      const m = this.move;
      // special-driven scripts
      if (m.script) { m.script(this, this.moveFrame, dt); }
      const total = m.startup + m.active + m.recovery;
      const inActive = this.moveFrame > m.startup && this.moveFrame <= m.startup + m.active;
      if (inActive && !this.moveHit && m.kind !== "none") this.tryHit(m);
      // light chain
      if (m.kind === "light" && this.chainOK && this.pad.press("light") &&
          this.moveFrame > m.startup + m.active) {
        this.startLight(); return;
      }
      if (this.moveFrame >= total) {
        this.move = null; this.chain = 0; this.chainOK = false;
        this.setState(this.airborne ? "jump" : "idle");
      }
      if (!m.air && !m.selfMove) this.vx *= 0.8;
    }

    updateThrow(dt) {
      this.moveFrame++;
      const m = this.move, o = this.opp;
      if (this.moveFrame === m.startup) {
        const dist = Math.abs(this.x - o.x);
        if (dist < S.throwRange + this.w && !o.airborne && !o.invuln && !o.ko) {
          m.connected = true;
          o.setState("grabbed");
          o.facing = -this.facing;
          AU.sfx("throwgrab");
          hitstop = 8;
        }
      }
      if (m.connected && this.moveFrame === m.startup + 16) {
        const o2 = this.opp;
        o2.x = this.x + 60 * this.facing;
        applyHit(this, o2, { dmg: m.dmg, knockback: 420, launch: -520, isThrow: true });
        shake(0.45);
      }
      if (this.moveFrame >= m.startup + m.active + m.recovery + 14) {
        this.move = null;
        this.setState("idle");
      }
    }

    tryHit(m) {
      const o = this.opp;
      if (o.invuln > 0 || o.ko || o.hidden) return;
      const reach = m.range * (S.charH / 335);
      const box = {
        x: this.facing === 1 ? this.x : this.x - reach - 30,
        y: this.y - this.h * (m.antiAir ? 1.35 : 0.85),
        w: reach + 30,
        h: this.h * (m.antiAir ? 1.25 : 0.75),
      };
      if (m.air) { box.y = this.y - this.h * 0.6; box.h = this.h * 0.7; }
      if (overlap(box, o.hurtRect())) {
        this.moveHit = true;
        resolveHit(this, o, m);
      } else if (this.moveFrame === m.startup + m.active) {
        AU.sfx("whiff");
      }
    }

    updateUlt(dt) {
      const u = this.ultScript;
      if (!u) { this.setState("idle"); return; }
      u.t++;
      u.tick(this, u.t, dt);
      if (u.t >= u.dur) { this.ultScript = null; this.setState("idle"); }
    }

    // ---- damage intake ----
    enterKO() {
      if (this.ko) return;
      this.ko = true;
      this.ultScript = null; this.hidden = false; this.banCard = false;
      this.setState("ko");
      this.vx = 0; this.vy = 0; this.y = FLOOR;
      Game.onKO(this);
    }

    endCombo() {
      const c = this.combo;
      if (c.hits >= 3) {
        // combo rank banner on the attacker's side
      }
      c.hits = 0; c.dmg = 0;
      this.opp.victimCombo = 0;
      this.opp.juggleLift = 1;
    }
  }

  function frameCooldowns(cds) { for (const k of Object.keys(cds)) if (cds[k] > 0) cds[k]--; }

  // ---------- combat resolution ----------
  function resolveHit(atk, def, m) {
    // guarding?
    const defGuarding = (def.state === "guard" || def.state === "guardstun" ||
                         ((def.state === "idle" || def.state === "walk") && def.holdingGuard())) &&
                        !m.isThrow && !def.airborne;
    if (defGuarding) {
      const just = def.backHeld > 0 && def.backHeld <= S.justGuardWindow;
      if (just) {
        AU.sfx("just_guard");
        FX.guardSpark(def.x + 40 * def.facing * -1, def.y - def.h * 0.55, true);
        floatText(def.x, def.y - def.h - 26, "极限招架!", "#9fe8ff", 26);
        // 马保国 trait: 接化发 counter
        const ct = def.data.kit.counter;
        if (ct && def.cds.counter <= 0 && !atk.airborne && !m.proj) {
          def.cds.counter = ct.cd;
          doJieHuaFa(def, atk, ct);
          return;
        }
        def.setState("guardstun"); def.blockstun = 6;
        return;
      }
      const chip = m.dmg * (m.ult ? S.ultChipRatio : S.chipRatio);
      def.hp = Math.max(m.ult ? 1 : 1, def.hp - chip); // chip never KOs
      def.guardGauge -= m.dmg * S.guardGaugeRatio;
      def.setState("guardstun"); def.blockstun = 10 + (m.kind === "heavy" ? 8 : 0);
      def.vx = (m.knockback || 200) * 0.6 * atk.facing;
      atk.meter = clamp(atk.meter + m.dmg * S.meterOnBlockDealt, 0, S.maxMeter);
      if (m.kind === "light") atk.chainOK = true;
      AU.sfx("guard");
      FX.guardSpark(def.x - 30 * def.facing, def.y - def.h * 0.55, false);
      hitstop = Math.max(hitstop, 3);
      if (def.guardGauge <= 0) {
        def.guardGauge = 0;
        def.setState("crumple");
        floatText(def.x, def.y - def.h - 30, "破防!", "#ff8484", 34);
        AU.sfx("guard_break");
        shake(0.5);
      }
      return;
    }
    applyHit(atk, def, m);
  }

  function applyHit(atk, def, m) {
    // hyper-armor during ult cinematics / boss golden armor: damage lands, no interruption
    if (def.state === "ult" || def.armorT > 0) {
      const armDmg = Math.max(1, Math.round(m.dmg * 0.6));
      def.hp -= armDmg;
      floatText(def.x, def.y - def.h - 24, String(armDmg), "#bbb", 24);
      FX.hitSpark(def.x, def.y - def.h * 0.6, false);
      AU.sfx("guard");
      if (def.hp <= 0) def.enterKO();
      return;
    }
    def.victimCombo++;
    if (m.kind === "light") atk.chainOK = true;
    const scale = Math.max(S.comboScaleFloor, 1 - S.comboScaleStep * (def.victimCombo - 1));
    const dmg = Math.max(1, Math.round(m.dmg * scale));
    def.hp -= dmg;
    atk.meter = clamp(atk.meter + dmg * S.meterOnHit, 0, S.maxMeter);
    def.meter = clamp(def.meter + dmg * S.meterOnTaken, 0, S.maxMeter);

    // combo bookkeeping (attacker side)
    atk.combo.hits++; atk.combo.dmg += dmg; atk.combo.timer = 60;
    const rank = D.RANKS.find(r => atk.combo.hits >= r[0]);
    if (rank && atk.combo.hits === rank[0]) {
      floatText(atk.x, atk.y - atk.h - 66, rank[1], atk.data.accent2 || "#ffd76a", 36);
    }

    // knock physics
    const big = m.kind === "heavy" || m.ult || m.isThrow;
    const kb = (m.knockback || 180) * (0.8 + 0.05 * def.victimCombo);
    if ((m.launch && m.launch < -250) || def.airborne || m.isThrow || m.spike) {
      def.airborne = true;
      def.vy = (m.launch || -420) * def.juggleLift * (m.spike && def.airborne ? -1 : 1);
      if (m.spike) def.vy = Math.abs(m.launch || 500);
      def.vx = kb * atk.facing;
      def.juggleLift *= S.juggleLift;
      def.setState("launched");
    } else {
      def.vx = kb * atk.facing;
      def.setState("hitstun");
      def.hitstun = 16 + (big ? 8 : 0);
      // lights pull the attacker forward so chains stay in range
      if (m.kind === "light" && !m.air && !m.proj && !atk.airborne) atk.x += 26 * atk.facing;
    }

    // cap: burst out of very long combos
    if (def.victimCombo >= S.maxComboHits) {
      def.invuln = 40;
      def.victimCombo = 0;
      def.juggleLift = 1;
    }

    // juice
    hitstop = Math.max(hitstop, big ? 8 : 4);
    shake(big ? 0.5 : 0.22);
    const hx = (atk.x + def.x) / 2 + rand(-14, 14), hy = def.y - def.h * rand(0.45, 0.72);
    FX.hitSpark(hx, hy, big);
    floatText(def.x + rand(-20, 20), def.y - def.h - 24, String(dmg), big ? "#ffd76a" : "#fff", big ? 36 : 27);
    AU.sfx(m.ult ? "hit_heavy" : big ? (m.launch < -400 ? "hit_launch" : "hit_heavy") : "hit_light");
    if (m.tag) floatText(def.x, def.y - def.h - 60, m.tag, "#c4f2d6", 26);
    if (Math.random() < 0.25) say(def, pick(def.data.quotes.hurt || []));

    if (def.hp <= 0 && !def.airborne) def.enterKO();
    else if (def.hp <= 0 && def.airborne) { /* KO on land in launched handler */ }
  }

  function doJieHuaFa(def, atk, ct) {
    say(def, ct.lines[0]);
    AU.sfx("counter");
    hitstop = 16;
    shake(0.6);
    // scripted slam
    atk.setState("grabbed");
    def.move = {
      kind: "none", pose: "cast", startup: 6, active: 2, recovery: 26,
      script(f, fr) {
        if (fr === 8) {
          atk.x = f.x + 70 * f.facing;
          applyHit(f, atk, { dmg: ct.dmg, knockback: 520, launch: -560, isThrow: true });
          say(f, ct.lines[1]);
        }
      },
    };
    def.moveFrame = 0; def.moveHit = false;
    def.setState("special");
  }

  // ---------- specials ----------
  const SPECIALS = {
    dumpling(f, spec) {
      f.move = {
        kind: "none", pose: "cast", startup: 12, active: 2, recovery: 16,
        script(ff, fr) { if (fr === 12) spawnProj(ff, spec.proj, 80, 0.62); },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    texas_hop(f, spec) {
      say(f, spec.castLine);
      f.move = {
        kind: "none", pose: "jump", startup: 4, active: 2, recovery: 34, selfMove: true,
        script(ff, fr, dt) {
          if (fr === 4) { ff.vy = -640; ff.vx = -420 * ff.facing; ff.y -= 2; }
          if (fr > 4 && fr < 34) {
            ff.vy += S.gravity * dt; ff.x += ff.vx * dt; ff.y += ff.vy * dt;
            if (fr === 16) spawnProj(ff, D.fighters.chen.kit.s1.proj, 40, 0.5);
            if (ff.y >= FLOOR) { ff.y = FLOOR; ff.vy = 0; ff.vx = 0; }
          }
          if (fr === 34) { ff.y = FLOOR; ff.vy = 0; ff.vx = 0; FX.dust(ff.x, FLOOR); }
        },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    shockwave(f, spec) {
      f.move = {
        kind: "none", pose: "cast", startup: 14, active: 2, recovery: 18,
        script(ff, fr) { if (fr === 14) { const p = spawnProj(ff, spec.proj, 90, 0.55); if (p) p.wave = true; } },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    confidence(f, spec) {
      f.reflectT = spec.startup + spec.active;
      f.move = {
        kind: "none", pose: "channel", startup: spec.startup, active: spec.active, recovery: spec.recovery,
        script() {},
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
      FX.aura(f.x, f.y - f.h * 0.5, "#a9d7ff");
    },
    frisbee(f, spec) {
      if (fields.some(fl => fl.owner === f)) { f.cds.s1 = 20; return; }   // locked by S2
      f.move = {
        kind: "none", pose: "cast", startup: 12, active: 2, recovery: 16,
        script(ff, fr) { if (fr === 12) spawnProj(ff, spec.proj, 80, 0.6); },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    complexity(f, spec) {
      if (projectiles.some(p => p.owner === f && p.boomerang && !p.dead)) { f.cds.s2 = 20; return; }
      say(f, spec.castLine);
      f.move = {
        kind: "none", pose: "channel", startup: 16, active: 2, recovery: 18,
        script(ff, fr) {
          if (fr === 16) {
            fields.push({ owner: ff, x: ff.opp.x, w: 260, t: spec.slowSecs * 60,
                          mul: spec.slowMul, color: "#f6d69c" });
            AU.sfx("slow_field");
          }
        },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    rant_cone(f, spec) {
      let hits = 0;
      f.move = {
        kind: "none", pose: "cast", startup: 8, active: 2, recovery: 18,
        script(ff, fr) {
          if (fr >= 8 && fr <= 26 && fr % 7 === 1 && hits < spec.hits) {
            hits++;
            const o = ff.opp;
            const inRange = Math.abs(o.x - ff.x) < spec.range && Math.sign(o.x - ff.x || 1) === ff.facing;
            burst(ff.x + 90 * ff.facing, ff.y - ff.h * 0.6, 4, () => ({
              x: ff.x + rand(60, 150) * ff.facing, y: ff.y - ff.h * rand(0.4, 0.8),
              vx: 320 * ff.facing, vy: rand(-60, 60), life: 14, size: rand(6, 14),
              color: "rgba(255,140,90,0.7)", type: "ring",
            }));
            if (inRange && !o.invuln && !o.ko)
              resolveHit(ff, o, { dmg: spec.dmg, kind: hits === 3 ? "heavy" : "light",
                                  knockback: hits === 3 ? 380 : 60, launch: hits === 3 ? -320 : 0, range: spec.range });
          }
        },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    outlaw_dash(f) {
      AU.sfx("dash");
      f.move = {
        kind: "none", pose: "dash", startup: 2, active: 2, recovery: 12,
        script(ff, fr, dt) {
          if (fr >= 2 && fr <= 18) {
            ff.x += 980 * ff.facing * dt;
            ff.invuln = 2;
            if (fr % 2 === 0) FX.afterimage(ff);
          }
        },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    phone_review(f, spec) {
      if (projectiles.some(p => p.owner === f && (p.sprite === "iphone" || p.sprite === "android") && !p.dead)) {
        f.cds.s1 = 15; return;
      }
      f.phoneAlt = !f.phoneAlt;
      const proj = f.phoneAlt ? spec.iphone : spec.android;
      f.move = {
        kind: "none", pose: "cast", startup: 11, active: 2, recovery: spec.recovery,
        script(ff, fr) { if (fr === 11) { const p = spawnProj(ff, proj, 80, 0.6); if (p) p.tag = proj.tag; } },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
    reincarnate(f, spec) { doTeleport(f, spec, spec.cardLine, spec.doneLine, true); },
    sneak_attack(f, spec) { doTeleport(f, spec, spec.cueLine, null, false); },
    lightning_whip(f, spec) {
      f.move = {
        kind: "none", pose: "cast", startup: 10, active: 2, recovery: 14,
        script(ff, fr) {
          if (fr === 10) {
            const p = spawnProj(ff, spec.proj, 90, 0.6);
            if (p) p.bolt = true;
          }
        },
      };
      f.moveFrame = 0; f.moveHit = false; f.setState("special");
    },
  };

  function doTeleport(f, spec, cueLine, doneLine, banCard) {
    say(f, cueLine);
    AU.sfx("teleport");
    f.move = {
      kind: "none", pose: "channel", startup: 8, active: 2, recovery: 25,
      script(ff, fr) {
        if (fr === 8) { ff.hidden = true; ff.invuln = 18; ff.banCard = banCard; }
        if (fr === 23) {
          const o = ff.opp;
          // reappear behind the opponent (the side their back faces)
          ff.x = clamp(o.x - 185 * o.facing, S.wallPad + 60, S.stageW - S.wallPad - 60);
          ff.hidden = false; ff.banCard = false;
          ff.facing = ff.x <= o.x ? 1 : -1;
          FX.afterimage(ff);
          if (doneLine) floatText(ff.x, ff.y - ff.h - 40, doneLine, "#c4f2d6", 26);
        }
      },
    };
    f.moveFrame = 0; f.moveHit = false; f.setState("special");
  }

  // ---------- ults ----------
  const ULTS = {
    inequality_beam: {
      dur: 62,
      tick(f, t) {
        const o = f.opp;
        if (t === 1) f.ultPose = "channel";
        if (t === 10) f.ultPose = "cast";
        if (t >= 12 && t <= 50 && t % 7 === 0) {
          Game.ultBeam = { x: f.x, dir: f.facing, y: f.y - f.h * 0.55, t: 0, owner: f, text: "¥2000 > $3000" };
          const reach = 950;
          const inBeam = Math.sign(o.x - f.x || 1) === f.facing && Math.abs(o.x - f.x) < reach &&
                         o.y > f.y - f.h * 1.2;
          if (inBeam && o.invuln <= 0 && !o.ko)
            resolveHit(f, o, { dmg: Math.round(f.ultScript.base / 6), kind: "light", ult: true, knockback: 120, launch: t > 40 ? -560 : 0, range: reach });
        }
        if (t === 52) Game.ultBeam = null;
      },
    },
    danmaku_rain: {
      dur: 95,
      tick(f, t) {
        if (t === 1) f.ultPose = "channel";
        const texts = ["自信", "文明型国家", "震撼", "东升西降", "你要自信", "百国走访"];
        if (t > 10 && t < 80 && t % 5 === 0) {
          const o = f.opp;
          const x = clamp(o.x + rand(-260, 260), 100, S.stageW - 100);
          emit({ x, y: -40 + rand(-60, 0), vx: rand(-20, 20), vy: rand(560, 720), life: 90,
                 type: "text", text: pick(texts), color: "#ffd76a", size: rand(26, 40) });
          if (Math.abs(x - o.x) < 70 && o.y >= FLOOR - 40 && t % 10 === 0 && !o.invuln && !o.ko)
            resolveHit(f, o, { dmg: Math.round(f.ultScript.base / 6), kind: "light", ult: true, knockback: 100, launch: t > 60 ? -520 : 0, range: 90 });
        }
        if (t < 80 && t % 6 === 0) FX.aura(f.x, f.y - f.h * 0.3, "#ffd76a");
      },
    },
    kline_rain: {
      dur: 90,
      tick(f, t) {
        if (t === 1) f.ultPose = "cast";
        if (t > 8 && t < 72 && t % 6 === 0) {
          const o = f.opp;
          const x = clamp(o.x + rand(-220, 220), 100, S.stageW - 100);
          emit({ x, y: -60, vx: 0, vy: rand(620, 820), life: 80, type: "kline",
                 color: "#37c26a", size: rand(30, 54), vr: 0 });
          if (Math.abs(x - o.x) < 60 && t % 12 === 2 && !o.invuln && !o.ko)
            resolveHit(f, o, { dmg: Math.round(f.ultScript.base / 5), kind: "light", ult: true, knockback: 140, launch: t > 56 ? -540 : 0, range: 90 });
        }
      },
    },
    ranbu: {
      dur: 120,
      tick(f, t, dt) {
        const o = f.opp;
        if (t === 1) { f.ultPose = "dash"; f.ranbuHit = false; }
        if (t < 26 && !f.ranbuHit) {
          f.x += 1050 * f.facing * dt;
          if (t % 2 === 0) FX.afterimage(f);
          if (Math.abs(o.x - f.x) < 130 && !o.invuln && !o.ko) {
            f.ranbuHit = true; f.ranbuT0 = t;
            o.setState("ranbu_victim");
            hitstop = 10;
          }
          if (t === 25 && !f.ranbuHit) { f.ultPose = "taunt"; }   // whiffed
        }
        if (f.ranbuHit) {
          const rt = t - f.ranbuT0;
          if (rt > 0 && rt < 64 && rt % 8 === 0) {
            f.ultPose = pick(["jab", "sweep", "smash", "cast"]);
            o.x = clamp(f.x + 110 * f.facing, S.wallPad + 60, S.stageW - S.wallPad - 60);
            applyHit(f, o, { dmg: Math.round(f.ultScript.base * 6 / 54), kind: "light", ult: true, knockback: 30, launch: 0, range: 200 });
            o.setState("ranbu_victim");
          }
          if (rt === 70) {
            f.ultPose = "uppercut";
            applyHit(f, o, { dmg: Math.round(f.ultScript.base * 12 / 54), kind: "heavy", ult: true, knockback: 420, launch: -820, range: 220 });
            shake(0.7);
          }
        }
      },
    },
    judgement_pillar: {
      dur: 92,
      tick(f, t) {
        if (t === 1) { f.ultPose = "channel"; f.pillarX = f.opp.x; }
        if (t === 20) {
          Game.pillar = { x: f.pillarX, t: 0, owner: f };
          AU.sfx("ult_flash");
        }
        if (t > 20 && t < 70) {
          const o = f.opp;
          if (Math.abs(o.x - f.pillarX) < 110 && t % 9 === 3 && !o.invuln && !o.ko)
            resolveHit(f, o, { dmg: Math.round(f.ultScript.base / 6), kind: "light", ult: true, knockback: 60, launch: t > 55 ? -600 : 0, range: 130 });
        }
        if (t === 78) Game.pillar = null;
      },
    },
    five_whips: {
      dur: 110,
      tick(f, t, dt) {
        const o = f.opp;
        if (t === 1) f.whipN = 0;
        const steps = [14, 30, 46, 62, 82];
        const idx = steps.indexOf(t);
        if (idx >= 0) {
          f.whipN = idx + 1;
          f.ultPose = idx % 2 === 0 ? "cast" : "jab";
          f.x += 85 * f.facing;
          floatText(f.x + 60 * f.facing, f.y - f.h - 30, "鞭!", "#ffe9a8", 30 + idx * 3);
          const reach = 260;
          burst(f.x + 130 * f.facing, f.y - f.h * 0.6, 6, () => ({
            x: f.x + rand(60, reach) * f.facing, y: f.y - f.h * rand(0.3, 0.9),
            vx: rand(-60, 60), vy: rand(-60, 60), life: 12, size: rand(4, 10),
            color: "#ffe9a8", type: "dot",
          }));
          if (Math.abs(o.x - f.x) < reach && Math.sign(o.x - f.x || 1) === f.facing && !o.invuln && !o.ko)
            resolveHit(f, o, { dmg: Math.round(f.ultScript.base * (idx === 4 ? 14 : 8) / 46), kind: idx === 4 ? "heavy" : "light", ult: true,
                               knockback: idx === 4 ? 460 : 120, launch: idx === 4 ? -760 : 0, range: reach });
          AU.sfx(idx === 4 ? "hit_heavy" : "shoot");
        }
      },
    },
  };

  // ---------- AI ----------
  function aiThink(f, dt) {
    const pad = f.pad, o = f.opp, cfg = f.data.ai, diff = Game.difficultyCfg();
    pad.state = {};
    if (Game.phase !== "fight" || f.busy() && f.state !== "jump") return;
    const mem = f.aiMem;
    mem.planT--;
    const dist = Math.abs(o.x - f.x);
    const fwd = o.x > f.x ? "right" : "left";
    const back = o.x > f.x ? "left" : "right";
    const mistake = Math.random() < diff.mistake * 0.02;
    if (mistake) return;

    // react to incoming projectiles
    const threat = projectiles.find(p => p.owner === o && !p.dead &&
      Math.sign(f.x - p.x) === Math.sign(p.vx || (o.x - f.x)) && Math.abs(p.x - f.x) < 320);
    if (threat && Math.random() < diff.blockProb * 0.15) {
      if (f.data.kit.s2 && f.data.kit.s2.id === "confidence" && f.cds.s2 <= 0 &&
          Math.random() < (cfg.reflectProb || 0) * diff.reflectMul) { pad.tap("s2"); return; }
      pad.state[back] = true;    // block/back off
      f.guardIntent = true;
      return;
    }

    // anti-air
    if (o.airborne && dist < 260 && o.vy > -200) {
      if (!mem.aaTimer) mem.aaTimer = diff.antiAirMs / (1000 / 60);
      mem.aaTimer--;
      if (mem.aaTimer <= 0) { pad.tap("heavy"); mem.aaTimer = 0; return; }
    } else mem.aaTimer = 0;

    // opponent attacking in range: block sometimes
    if (o.state === "attack" && dist < 260 && Math.random() < diff.blockProb * 0.3) {
      pad.state[back] = true; f.guardIntent = true; return;
    }

    // ult when ready
    if (f.meter >= S.maxMeter && (dist < 300 || cfg.style === "zoner") && Math.random() < 0.03) {
      pad.tap("ult"); return;
    }

    // boss counter gating: only counter-bait if player repeats buttons (handled via just-guard naturally)

    // spacing plan
    const want = cfg.prefRange;
    const aggro = cfg.aggression * diff.aggression * 2;
    if (mem.planT <= 0) {
      mem.plan = Math.random() < aggro ? "engage" : (dist < want - 60 ? "retreat" : dist > want + 80 ? "approach" : "poke");
      mem.planT = rand(18, 42) | 0;
    }
    if (mem.plan === "approach" || (mem.plan === "engage" && dist > 200)) {
      pad.state[fwd] = true;
      if (dist > 460 && Math.random() < 0.02 && f.cds.dash <= 0) pad.dtap(fwd);
      if (cfg.style === "rushdown" && dist > 350 && f.cds.s2 <= 0 && Math.random() < 0.03) pad.tap("s2");
    } else if (mem.plan === "retreat") {
      pad.state[back] = true; f.guardIntent = false;
    }

    // projectile play
    if (f.cds.s1 <= 0 && Math.random() < cfg.projFreq * 0.035 &&
        (dist > 320 || cfg.style === "grappler" && dist > 220)) {
      pad.tap("s1"); return;
    }
    // teleport when kept out
    if ((cfg.style === "grappler" || cfg.style === "skirmisher") && f.cds.s2 <= 0 &&
        dist > 480 && Math.random() < 0.02) { pad.tap("s2"); return; }
    // slow field for pressure ai
    if (cfg.style === "pressure" && f.cds.s2 <= 0 && dist < 500 && Math.random() < 0.015) { pad.tap("s2"); return; }
    if (cfg.style === "zoner" && f.cds.s2 <= 0 && dist < 240 && Math.random() < 0.05) { pad.tap("s2"); return; }

    // melee
    if (dist < 190) {
      const r = Math.random();
      if (o.state === "guard" && r < 0.25) pad.tap("heavy");        // throw via proximity
      else if (r < 0.55) pad.tap("light");
      else if (r < 0.72) pad.tap("heavy");
      else if (cfg.style === "grappler" && r < 0.8) pad.tap("heavy");
    } else if (dist < 300 && Math.random() < 0.04) {
      pad.state[fwd] = true;
      if (Math.random() < 0.4) pad.tap("light");
    }

    // occasional jump-in
    if (dist > 240 && dist < 480 && Math.random() < (cfg.style === "rushdown" ? 0.02 : 0.008)) {
      pad.state[fwd] = true; pad.tap("up");
      mem.jumpAtk = 14 + Math.random() * 10;
    }
    if (f.airborne && mem.jumpAtk != null && --mem.jumpAtk <= 0) { pad.tap("light"); mem.jumpAtk = null; }
  }

  // ---------- game orchestration ----------
  const Game = {
    scene: "boot",       // boot, title, select, vs, fight, results
    phase: "intro",      // intro, fight, ko, roundend
    mode: "arcade",      // arcade | versus
    f1: null, f2: null,
    stageKey: "studio",
    round: 1, timer: S.roundTime, timerAcc: 0,
    arcadeIdx: 0, arcadeOrder: [], perfectPending: false,
    difficulty: +(localStorage.getItem("mf_diff") || 1),
    selIdx: [0, 1], selDone: [false, false],
    paused: false, showMoves: false,
    ultBeam: null, pillar: null,
    winner: null, matchWinner: null,
    resultT: 0, vsT: 0, koTag: "",
    loadProgress: 0, loadError: null,

    difficultyCfg() { return D.difficulties[clamp(this.difficulty, 0, 2)]; },

    // ---- scene: fight setup ----
    startMatch(c1, c2, opts = {}) {
      particles.length = 0; projectiles.length = 0; fields.length = 0;
      floats.length = 0; bubbles.length = 0; banner = null;
      this.ultBeam = null; this.pillar = null;
      this.f1 = new Fighter(c1, 0, new Pad(KEYMAPS[0]), false);
      this.f2 = new Fighter(c2, 1, this.mode === "versus" ? new Pad(KEYMAPS[1]) : new AIPad(), this.mode !== "versus");
      if (opts.gold) {
        this.f2.gold = true;
        this.f2.maxHp = Math.round(this.f2.maxHp * D.arcade.boss.hpMul);
        this.f2.hp = this.f2.maxHp;
      }
      this.stageKey = opts.stage || D.fighters[c2].stage || "studio";
      this.round = 1;
      this.scene = "fight";
      this.startRound();
      const keyShift = { studio: 0, lecture: 3, street: -2 }[this.stageKey] || 0;
      AU.bgmStart(keyShift, 132, false);
    },

    startRound() {
      const f1 = this.f1, f2 = this.f2;
      projectiles.length = 0; fields.length = 0; bubbles.length = 0; floats.length = 0;
      this.ultBeam = null; this.pillar = null; this.ultFlash = null;
      const m1 = f1.meter, m2 = f2.meter, r1 = f1.rounds, r2 = f2.rounds;
      f1.reset(S.stageW / 2 - 260, 1); f2.reset(S.stageW / 2 + 260, -1);
      f1.meter = m1; f2.meter = m2; f1.rounds = r1; f2.rounds = r2;
      f1.hp = f1.maxHp; f2.hp = f2.maxHp;
      f1.meter = clamp(f1.meter, 0, S.maxMeter); // meter persists across rounds
      this.phase = "intro"; this.phaseT = 0;
      this.timer = S.roundTime; this.timerAcc = 0;
      this.winner = null;
      timeScale = 1; slowFrames = 0; hitstop = 0;
      f1.setState("intro"); f2.setState("intro");
      say(f1, pick(f1.data.quotes.intro));
      if (this.f2.gold && this.round === 1) say(f2, D.arcade.boss.introLine);
      else say(f2, pick(f2.data.quotes.intro));
      showBanner(D.banners.round(this.round), null, 80);
    },

    startUltCinematic(f, u) {
      AU.sfx("ult_flash");
      hitstop = S.ultFreeze;
      this.ultFlash = { f, t: S.ultFreeze, label: u.label };
      say(f, u.line);
      f.ultScript = Object.assign({ t: 0, base: u.dmg || 50 }, ULTS[u.id]);
      f.ultPose = "channel";
      f.vx = 0; f.vy = 0;
      f.setState("ult");
      shake(0.4);
    },

    onKO(loser) {
      if (this.phase === "ko" || this.phase === "roundend") {
        // double KO: the fighter we just crowned also died -> revoke, draw round
        if (this.winner && this.winner === loser) {
          this.winner.rounds--;
          this.winner = null;
          this.perfectPending = false;
          this.koTag = "";
          showBanner(D.banners.ko, D.banners.draw, 100, 150);
        }
        return;
      }
      const winner = loser === this.f1 ? this.f2 : this.f1;
      this.phase = "ko"; this.phaseT = 0;
      this.winner = winner;
      winner.rounds++;
      this.koTag = pick(D.KO_TAGS);
      this.perfectPending = winner.hp >= winner.maxHp;
      timeScale = S.koSlowmo; slowFrames = S.koSlowFrames;
      AU.sfx("ko");
      shake(1);
      const sub = this.perfectPending
        ? (loser.gold ? D.arcade.boss.perfectTag : D.banners.perfect)
        : this.koTag;
      showBanner(D.banners.ko, sub, 100, 150);
      FX.confetti(winner.x, winner.y - winner.h);
    },

    endRoundByTimeout() {
      const f1 = this.f1, f2 = this.f2;
      const p1 = f1.hp / f1.maxHp, p2 = f2.hp / f2.maxHp;
      const winner = p1 === p2 ? null : (p1 > p2 ? f1 : f2);
      this.phase = "ko"; this.phaseT = 0;
      this.winner = winner;
      if (winner) winner.rounds++;
      this.koTag = "";
      timeScale = 0.6; slowFrames = 40;
      showBanner(D.banners.timeout, winner ? null : D.banners.draw, 90, 110);
    },

    afterKO() {
      const f1 = this.f1, f2 = this.f2;
      if (this.winner && this.winner.rounds >= S.roundsToWin) {
        this.matchWinner = this.winner;
        this.scene = "results"; this.resultT = 0;
        AU.bgmStop();
        const q = this.winner === f1 || this.mode === "versus"
          ? pick(this.winner.data.quotes.win)
          : pick(this.winner.data.quotes.win);
        this.resultQuote = q;
        this.resultLoseQuote = pick((this.winner === f1 ? f2 : f1).data.quotes.lose);
      } else {
        this.round++;
        this.startRound();
        if (Math.max(f1.rounds, f2.rounds) === S.roundsToWin - 1) AU.bgmSetIntense(true);
      }
    },

    // ---- arcade flow ----
    beginArcade(chosen) {
      this.mode = "arcade";
      const pool = D.ROSTER.filter(k => k !== chosen && k !== D.arcade.boss.char);
      // shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      this.arcadeOrder = pool.slice(0, D.arcade.matches);
      this.arcadeOrder.push(D.arcade.boss.char);
      this.arcadeIdx = 0;
      this.playerChar = chosen;
      this.nextArcadeMatch();
    },
    nextArcadeMatch() {
      const oppKey = this.arcadeOrder[this.arcadeIdx];
      const isBoss = this.arcadeIdx === this.arcadeOrder.length - 1;
      this.vsData = { p1: this.playerChar, p2: oppKey, gold: isBoss };
      this.scene = "vs"; this.vsT = 0;
      AU.sfx("confirm");
    },

    // ---- input routing for UI scenes ----
    onKey(code, e) {
      if (this.scene === "fight") {
        if (code === "KeyP" || code === "Escape") {
          if (this.paused && code === "Escape") { this.quitToTitle(); return; }
          this.paused = !this.paused; this.showMoves = false;
          return;
        }
        if (this.paused) {
          if (code === "KeyJ") this.showMoves = !this.showMoves;
          if (code === "BracketLeft") AU.setVolume(AU.volume - 0.1);
          if (code === "BracketRight") AU.setVolume(AU.volume + 0.1);
          if (code === "KeyM") AU.setMuted(!AU.muted);
          return;
        }
        return;
      }
      if (this.scene === "title") {
        if (code === "KeyV") { this.mode = "versus"; this.scene = "select"; this.selDone = [false, false]; AU.sfx("confirm"); }
        else if (code === "Digit1" || code === "Digit2" || code === "Digit3") {
          this.difficulty = +code.slice(-1) - 1;
          localStorage.setItem("mf_diff", this.difficulty);
          AU.sfx("select");
        } else { this.mode = "arcade"; this.scene = "select"; this.selDone = [false, false]; AU.sfx("confirm"); }
        return;
      }
      if (this.scene === "select") { this.selectKey(code); return; }
      if (this.scene === "vs") {
        if (this.vsT > 30) this.launchVsMatch();
        return;
      }
      if (this.scene === "results") {
        if (this.resultT > 40) this.afterResults();
        return;
      }
      if (this.scene === "ending") {
        if (code === "Escape") this.quitToTitle();
        return;
      }
    },

    selectKey(code) {
      const cols = 3;
      const move = (idx, d) => {
        this.selIdx[idx] = (this.selIdx[idx] + d + D.ROSTER.length) % D.ROSTER.length;
        AU.sfx("select");
      };
      // P1
      if (!this.selDone[0]) {
        if (code === "KeyA") move(0, -1);
        if (code === "KeyD") move(0, 1);
        if (code === "KeyW") move(0, -cols);
        if (code === "KeyS") move(0, cols);
        if (code === "KeyJ" || code === "Enter") {
          this.selDone[0] = true; AU.sfx("confirm");
          if (this.mode === "arcade") { this.beginArcade(D.ROSTER[this.selIdx[0]]); return; }
        }
      }
      if (this.mode === "versus" && !this.selDone[1]) {
        if (code === "ArrowLeft") move(1, -1);
        if (code === "ArrowRight") move(1, 1);
        if (code === "ArrowUp") move(1, -cols);
        if (code === "ArrowDown") move(1, cols);
        if (code === "Comma" || code === "Enter" && this.selDone[0]) {
          if (code === "Comma") { this.selDone[1] = true; AU.sfx("confirm"); }
        }
      }
      if (code === "Escape") { this.scene = "title"; return; }
      if (this.mode === "versus" && this.selDone[0] && this.selDone[1]) {
        this.vsData = { p1: D.ROSTER[this.selIdx[0]], p2: D.ROSTER[this.selIdx[1]], gold: false };
        this.scene = "vs"; this.vsT = 0;
      }
    },

    launchVsMatch() {
      const v = this.vsData;
      this.startMatch(v.p1, v.p2, { gold: v.gold });
    },

    afterResults() {
      if (this.mode === "arcade") {
        if (this.matchWinner === this.f1) {
          this.arcadeIdx++;
          if (this.arcadeIdx >= this.arcadeOrder.length) { this.scene = "ending"; this.resultT = 0; return; }
          this.nextArcadeMatch();
        } else {
          this.quitToTitle();
        }
      } else {
        this.scene = "select"; this.selDone = [false, false];
      }
    },

    quitToTitle() {
      this.scene = "title"; this.paused = false;
      AU.bgmStop();
    },
  };
  window.Game = Game;
  // debug/test handle (console playtesting)
  Game._debug = { projectiles, particles, fields, get keys() { return keys; } };

  // ---------- fixed-step update ----------
  function fightUpdate(dt) {
    const f1 = Game.f1, f2 = Game.f2;
    frameNow++;

    if (Game.paused) return;

    if (hitstop > 0) {
      hitstop--;
      if (Game.ultFlash && --Game.ultFlash.t <= 0) Game.ultFlash = null;
      updateParticles(dt * 0.3);
      return;
    }
    if (Game.ultFlash) Game.ultFlash = null;   // freeze ended by any path

    let sdt = dt;
    if (slowFrames > 0) { slowFrames--; sdt = dt * timeScale; if (slowFrames === 0) timeScale = 1; }

    // AI thinks at its own cadence
    if (f2.isAI) aiThink(f2, sdt);

    switch (Game.phase) {
      case "intro": {
        Game.phaseT++;
        if (Game.phaseT === Math.round(S.introTime * 60 * 0.7)) showBanner(D.banners.fight, null, 40, 130);
        if (Game.phaseT >= S.introTime * 60) {
          Game.phase = "fight";
          f1.setState("idle"); f2.setState("idle");
          AU.sfx("round_go");
        }
        break;
      }
      case "fight": {
        Game.timerAcc += sdt;
        if (Game.timerAcc >= 1) {
          Game.timerAcc -= 1; Game.timer--;
          if (Game.timer <= 10 && Game.timer > 0) AU.sfx("timer");
          if (Game.timer <= 0) Game.endRoundByTimeout();
        }
        break;
      }
      case "ko": {
        Game.phaseT++;
        if (Game.phaseT >= 110) { Game.phase = "roundend"; Game.phaseT = 0; }
        break;
      }
      case "roundend": {
        Game.phaseT++;
        if (Game.phaseT >= 50) Game.afterKO();
        break;
      }
    }

    f1.update(sdt); f2.update(sdt);

    // pushboxes
    if (!f1.hidden && !f2.hidden && Math.abs(f1.x - f2.x) < (f1.w + f2.w) / 2 &&
        Math.abs(f1.y - f2.y) < f1.h * 0.8) {
      const push = ((f1.w + f2.w) / 2 - Math.abs(f1.x - f2.x)) / 2;
      const dir = f1.x <= f2.x ? -1 : 1;
      f1.x += push * dir; f2.x -= push * dir;
    }

    // projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.update(sdt);
      const target = p.owner === f1 ? f2 : f1;
      // reflect
      if (target.reflectT > 0 && p.tier === 1 && overlap(p.rect(), { x: target.x - 90, y: target.y - target.h, w: 180, h: target.h })) {
        p.owner = target;
        p.vx = -p.vx * 1.25;
        p.startX = p.x; if (p.maxDist) p.maxDist = 600;
        p.boomerang = null;
        AU.sfx("reflect");
        say(target, target.data.kit.s2.reflectLine);
        continue;
      }
      if (!p.dead && !target.hidden && target.invuln <= 0 && !target.ko &&
          overlap(p.rect(), target.hurtRect())) {
        const retHit = p.boomerang && p.phase === "back";
        const dmgMul = retHit ? (p.returnDmgMul || 1) : 1;
        resolveHit(p.owner, target, {
          dmg: p.dmg * dmgMul, kind: "light", proj: true,
          knockback: retHit ? 120 : 220, launch: 0, range: 60, tag: p.tag,
        });
        p.dead = true;
      }
      if (p.dead) projectiles.splice(i, 1);
    }
    // projectile clash
    for (const a of projectiles) {
      for (const b of projectiles) {
        if (a === b || a.dead || b.dead || a.owner === b.owner) continue;
        if (overlap(a.rect(), b.rect())) {
          if (a.tier === b.tier) { a.dead = b.dead = true; FX.hitSpark((a.x + b.x) / 2, (a.y + b.y) / 2, false); AU.sfx("clash"); }
          else if (a.tier > b.tier) b.dead = true;
          else a.dead = true;
        }
      }
    }
    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].dead) projectiles.splice(i, 1);

    // slow fields
    for (let i = fields.length - 1; i >= 0; i--) {
      const fl = fields[i];
      fl.t--;
      const victim = fl.owner === f1 ? f2 : f1;
      if (Math.abs(victim.x - fl.x) < fl.w / 2) { victim.slowT = 8; victim.slowMul = fl.mul; }
      if (fl.t <= 0) fields.splice(i, 1);
    }

    // camera, fx
    updateCamera(f1, f2, dt);
    updateParticles(sdt);
    for (let i = floats.length - 1; i >= 0; i--) {
      const t = floats[i]; t.age++; t.y += t.vy * dt; t.vy *= 0.92;
      if (t.age > t.life) floats.splice(i, 1);
    }
    for (let i = bubbles.length - 1; i >= 0; i--) if (++bubbles[i].age > bubbles[i].life) bubbles.splice(i, 1);
    if (banner && ++banner.age > banner.life) banner = null;
    if (Game.ultBeam && ++Game.ultBeam.t > 60) Game.ultBeam = null;
    if (Game.pillar) Game.pillar.t++;
  }

  // ---------- rendering ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  function drawPose(f) {
    if (f.hidden && !f.banCard) return;
    const pd = poseData(f.charKey, f.pose());
    const img = ASSETS.img[pd.f];
    const sc = f.scale * cam.zoom;
    const sx = w2sx(f.x), sy = w2sy(f.y);

    ctx.save();
    // shadow
    if (!f.hidden) {
      const shw = 120 * cam.zoom * (f.y < FLOOR ? Math.max(0.4, 1 - (FLOOR - f.y) / 500) : 1);
      ctx.fillStyle = "rgba(0,0,0,0.33)";
      ctx.beginPath();
      ctx.ellipse(sx, w2sy(FLOOR) + 12 * cam.zoom, shw, 18 * cam.zoom, 0, 0, TAU);
      ctx.fill();
    }

    ctx.translate(sx, sy);
    // squash & lean juice
    let squashX = 1, squashY = 1, rot = 0, dy = 0;
    if (f.state === "walk") { dy = Math.sin(f.stateT * 0.32) * 3; }
    if (f.state === "idle") { squashY = 1 + Math.sin(f.stateT * 0.08) * 0.012; }
    if (f.state === "dash") rot = 0.06 * f.facing;
    if (f.state === "backdash") rot = -0.05 * f.facing;
    if (f.state === "hitstun") rot = -0.05 * f.facing;
    if (f.state === "launched") rot = clamp(-f.vy / 2400, -0.6, 0.6) * -f.facing;
    if (f.state === "ko") rot = -Math.PI / 2 * f.facing * Math.min(1, f.stateT / 20);
    if (frameNow - f.lastLand < 8) { squashY = 0.94; squashX = 1.05; }
    if (f.state === "jump" && f.vy < -300) { squashY = 1.06; squashX = 0.96; }

    ctx.rotate(rot);
    ctx.scale(f.facing * squashX, squashY);

    if (f.gold) ctx.filter = "sepia(0.9) saturate(2.6) hue-rotate(-12deg) brightness(1.12)";
    if (f.state === "hitstun" || f.state === "launched" || f.state === "ranbu_victim") {
      if ((f.stateT / 2 | 0) % 2 === 0) ctx.filter = (ctx.filter === "none" ? "" : ctx.filter + " ") + "brightness(1.6) saturate(1.6)";
    }
    const dw = pd.w * sc, dh = pd.h * sc;
    ctx.drawImage(img, -pd.ax * sc, -dh + (pd.h - pd.ay) * sc + dy, dw, dh);
    ctx.filter = "none";
    ctx.restore();

    // ban card overlay (户晨风 teleport)
    if (f.banCard) {
      const bw = 240 * cam.zoom, bh = 110 * cam.zoom;
      ctx.save();
      ctx.translate(sx, sy - f.h * 0.6 * cam.zoom);
      ctx.fillStyle = "rgba(20,22,30,0.92)";
      roundRect(ctx, -bw / 2, -bh / 2, bw, bh, 12);
      ctx.fill();
      ctx.strokeStyle = "#e5534b"; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = "#e5534b";
      ctx.font = font(26 * cam.zoom);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("该账号已被封禁", 0, 0);
      ctx.restore();
    }

    // reflect shield
    if (f.reflectT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#a9d7ff"; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(sx, sy - f.h * 0.5 * cam.zoom, 120 * cam.zoom, -1.2, 1.2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawStage() {
    const st = (ASSETS.manifest.stages || {})[Game.stageKey];
    const img = st && ASSETS.img[st];
    if (!img) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#141420");
      g.addColorStop(0.85, "#2a2233");
      g.addColorStop(1, "#191420");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#100d16";
      ctx.fillRect(0, w2sy(FLOOR), W, H - w2sy(FLOOR));
      return;
    }
    // parallax: stage image wider than screen
    const iw = img.width, ih = img.height;
    const scale = (H / ih) * 1.02;
    const drawW = iw * scale;
    const worldSpan = S.stageW;
    const t = (cam.x - W / 2 / cam.zoom) / (worldSpan - W / cam.zoom);
    const maxOff = drawW - W;
    const off = clamp(t, 0, 1) * maxOff * 0.9;
    ctx.drawImage(img, -off - maxOff * 0.05, 0, drawW, H);
    // floor tint to anchor fighters
    const g = ctx.createLinearGradient(0, w2sy(FLOOR) - 10, 0, H);
    g.addColorStop(0, "rgba(8,8,14,0)");
    g.addColorStop(1, "rgba(8,8,14,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, w2sy(FLOOR) - 10, W, H - w2sy(FLOOR) + 10);
  }

  function drawProjectiles() {
    for (const p of projectiles) {
      const pr = propImg(p.sprite);
      const sx = w2sx(p.x), sy = w2sy(p.y);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation);
      if (p.sprite === "wave") {
        // 西方震撼波: expanding rings + 「震」
        const r0 = p.r * cam.zoom;
        for (let k = 0; k < 3; k++) {
          const rr = r0 * (0.8 + k * 0.45 + (p.age % 12) / 24);
          ctx.strokeStyle = `rgba(169,215,255,${0.85 - k * 0.28})`;
          ctx.lineWidth = 6 - k * 1.5;
          ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
        }
        ctx.font = font(30 * cam.zoom);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(12,20,40,0.9)"; ctx.lineWidth = 5;
        ctx.strokeText("震", 0, 0);
        ctx.fillStyle = "#dff0ff";
        ctx.fillText("震", 0, 0);
      } else if (pr) {
        const s = (p.r * 2.6 * cam.zoom) / Math.max(pr.p.w, pr.p.h);
        ctx.drawImage(pr.img, -pr.p.w * s / 2, -pr.p.h * s / 2, pr.p.w * s, pr.p.h * s);
      } else {
        ctx.fillStyle = "#ffd76a";
        ctx.beginPath(); ctx.arc(0, 0, p.r * cam.zoom, 0, TAU); ctx.fill();
      }
      ctx.restore();
      if (p.wave) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#a9d7ff"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(sx, sy, p.r * 1.7 * cam.zoom + Math.sin(p.age * 0.4) * 6, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawFields() {
    for (const fl of fields) {
      const sx = w2sx(fl.x);
      ctx.save();
      ctx.globalAlpha = 0.16 + Math.sin(fl.t * 0.2) * 0.05;
      ctx.fillStyle = fl.color;
      const wpx = fl.w * cam.zoom;
      ctx.fillRect(sx - wpx / 2, w2sy(FLOOR) - 300 * cam.zoom, wpx, 300 * cam.zoom);
      ctx.globalAlpha = 0.7;
      ctx.font = font(22 * cam.zoom);
      ctx.fillStyle = "#f6d69c";
      ctx.textAlign = "center";
      ctx.fillText("复杂话术场", sx, w2sy(FLOOR) - 300 * cam.zoom + 26);
      ctx.restore();
    }
  }

  function drawUltOverlays() {
    if (Game.ultBeam) {
      const b = Game.ultBeam;
      const sy = w2sy(b.y), sx = w2sx(b.x);
      const len = 980 * cam.zoom, hgt = 120 * cam.zoom;
      ctx.save();
      ctx.globalAlpha = 0.85;
      const g = ctx.createLinearGradient(sx, 0, sx + len * b.dir, 0);
      g.addColorStop(0, "rgba(255,215,106,0.95)");
      g.addColorStop(1, "rgba(240,129,60,0.1)");
      ctx.fillStyle = g;
      ctx.fillRect(b.dir === 1 ? sx : sx - len, sy - hgt / 2, len, hgt);
      ctx.fillStyle = "#7a2d00";
      ctx.font = font(54 * cam.zoom);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.text, sx + len / 2 * b.dir, sy);
      ctx.restore();
    }
    if (Game.pillar) {
      const p = Game.pillar;
      const sx = w2sx(p.x);
      ctx.save();
      ctx.globalAlpha = 0.75;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(1, "rgba(196,242,214,0.15)");
      ctx.fillStyle = g;
      const wpx = 200 * cam.zoom;
      ctx.fillRect(sx - wpx / 2, 0, wpx, w2sy(FLOOR) + 16);
      const ip = propImg("iphone");
      if (ip) {
        const s = (120 * cam.zoom) / Math.max(ip.p.w, ip.p.h);
        const py = 60 + Math.min(1, p.t / 40) * (w2sy(FLOOR) - 300);
        ctx.drawImage(ip.img, sx - ip.p.w * s / 2, py, ip.p.w * s, ip.p.h * s);
      }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const sx = w2sx(p.x), sy = w2sy(p.y);
      const lifeT = p.age / p.life;
      let a = p.alpha * (p.fade ? 1 - lifeT : 1);
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      if (p.type === "dot") {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(sx, sy, p.size * cam.zoom * (p.shrink ? 1 - lifeT : 1), 0, TAU); ctx.fill();
      } else if (p.type === "rect") {
        ctx.translate(sx, sy); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.type === "puff") {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(sx, sy, p.size * cam.zoom * (0.6 + lifeT), 0, TAU); ctx.fill();
      } else if (p.type === "ring") {
        ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, p.size * (0.5 + lifeT * 1.6) * cam.zoom, 0, TAU); ctx.stroke();
      } else if (p.type === "text") {
        ctx.font = font(p.size * cam.zoom);
        ctx.fillStyle = p.color;
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 4;
        ctx.strokeText(p.text, sx, sy);
        ctx.fillText(p.text, sx, sy);
      } else if (p.type === "kline") {
        ctx.fillStyle = p.color;
        const w = p.size * 0.35 * cam.zoom, h = p.size * cam.zoom;
        ctx.fillRect(sx - w / 2, sy - h / 2, w, h);
        ctx.fillRect(sx - 1.5, sy - h * 0.85, 3, h * 1.7);
      } else if (p.type === "ghost") {
        const pd = poseData(p.char, p.pose);
        const img = ASSETS.img[pd.f];
        const sc = p.scale * cam.zoom;
        ctx.globalAlpha = a * 0.4;
        ctx.translate(sx, sy);
        ctx.scale(p.facing, 1);
        ctx.drawImage(img, -pd.ax * sc, -(pd.h * sc) + (pd.h - pd.ay) * sc, pd.w * sc, pd.h * sc);
      } else if (p.type === "fxanim") {
        const idx = clamp((lifeT * p.frames.length) | 0, 0, p.frames.length - 1);
        const fx = fxImg(p.frames[idx]);
        if (fx) {
          const s = (p.size * cam.zoom) / Math.max(fx.p.w, fx.p.h);
          ctx.drawImage(fx.img, sx - fx.p.w * s / 2, sy - fx.p.h * s / 2, fx.p.w * s, fx.p.h * s);
        } else {
          // procedural starburst fallback
          const r0 = p.size * cam.zoom * (0.3 + lifeT * 0.7) / 2;
          ctx.translate(sx, sy);
          ctx.fillStyle = idx < 2 ? "#fff7d1" : "#ffab3d";
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const ang = k * Math.PI / 4 + lifeT;
            const rr = k % 2 === 0 ? r0 : r0 * 0.4;
            ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
          }
          ctx.closePath(); ctx.fill();
        }
      } else if (p.type === "fx") {
        const fx = fxImg(p.sprite);
        if (fx) {
          const s = (p.size * cam.zoom) / Math.max(fx.p.w, fx.p.h);
          ctx.drawImage(fx.img, sx - fx.p.w * s / 2, sy - fx.p.h * s / 2, fx.p.w * s, fx.p.h * s);
        } else {
          // procedural hex-flash fallback
          const r0 = p.size * cam.zoom * 0.5;
          ctx.translate(sx, sy);
          ctx.strokeStyle = "#9fe8ff"; ctx.lineWidth = 5;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = k * Math.PI / 3;
            ctx.lineTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  function drawFloats() {
    for (const t of floats) {
      const sx = w2sx(t.x), sy = w2sy(t.y);
      const a = 1 - Math.max(0, (t.age / t.life) * 1.2 - 0.2);
      ctx.save();
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = font(t.size);
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(10,8,10,0.85)"; ctx.lineWidth = 6;
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
      ctx.restore();
    }
  }

  function drawBubbles() {
    for (const b of bubbles) {
      const f = b.f;
      if (f.hidden) continue;
      const sx = w2sx(f.x), sy = w2sy(f.y - f.h) - 46;
      ctx.save();
      const a = b.age < 8 ? b.age / 8 : b.age > b.life - 12 ? (b.life - b.age) / 12 : 1;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.font = font(21);
      const tw = ctx.measureText(b.text).width;
      const bw = tw + 34, bh = 42;
      let bx = clamp(sx - bw / 2, 8, W - bw - 8);
      ctx.fillStyle = "rgba(252,250,244,0.96)";
      roundRect(ctx, bx, sy - bh, bw, bh, 12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy - 2); ctx.lineTo(sx + 8, sy - 2); ctx.lineTo(sx, sy + 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#20242e";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(b.text, bx + bw / 2, sy - bh / 2 + 1);
      ctx.restore();
    }
  }

  function drawHUD() {
    const f1 = Game.f1, f2 = Game.f2;
    const bw = 470, bh = 26, y = 30;
    for (const [f, right] of [[f1, false], [f2, true]]) {
      const x = right ? W - 40 - bw : 40;
      ctx.save();
      // frame
      ctx.fillStyle = "rgba(12,12,18,0.72)";
      roundRect(ctx, x - 6, y - 6, bw + 12, bh + 30, 8); ctx.fill();
      // health
      const pct = clamp(f.hp / f.maxHp, 0, 1);
      ctx.fillStyle = "#2b2530";
      ctx.fillRect(x, y, bw, bh);
      const grad = ctx.createLinearGradient(x, 0, x + bw, 0);
      grad.addColorStop(0, pct > 0.35 ? "#ffd76a" : "#ff6a6a");
      grad.addColorStop(1, pct > 0.35 ? "#ff9d3c" : "#ff3c5c");
      ctx.fillStyle = grad;
      const wpx = bw * pct;
      if (right) ctx.fillRect(x + bw - wpx, y, wpx, bh);
      else ctx.fillRect(x, y, wpx, bh);
      // guard gauge
      const gbx = right ? x + bw * 0.4 : x;
      ctx.fillStyle = "#20303c";
      ctx.fillRect(gbx, y + bh + 4, bw * 0.6, 7);
      ctx.fillStyle = f.guardGauge > 30 ? "#6ec4e8" : "#ff8484";
      const gw = bw * 0.6 * (f.guardGauge / S.maxGuard);
      if (right) ctx.fillRect(x + bw - gw, y + bh + 4, gw, 7);
      else ctx.fillRect(x, y + bh + 4, gw, 7);
      // name
      ctx.font = font(19);
      ctx.textAlign = right ? "right" : "left";
      ctx.fillStyle = "#fff";
      const label = (f.gold ? D.arcade.boss.name : `${f.data.name}·${f.data.epithet}`);
      ctx.fillText(label, right ? x + bw : x, y + bh + 28);
      ctx.restore();

      // meter
      const my = H - 46, mw = 380;
      const mx = right ? W - 40 - mw : 40;
      ctx.save();
      ctx.fillStyle = "rgba(12,12,18,0.72)";
      roundRect(ctx, mx - 4, my - 4, mw + 8, 26, 6); ctx.fill();
      const mpct = f.meter / S.maxMeter;
      ctx.fillStyle = "#262233";
      ctx.fillRect(mx, my, mw, 18);
      const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0);
      mg.addColorStop(0, f.data.accent);
      mg.addColorStop(1, f.data.accent2);
      ctx.fillStyle = mg;
      const mwpx = mw * mpct;
      if (right) ctx.fillRect(mx + mw - mwpx, my, mwpx, 18);
      else ctx.fillRect(mx, my, mwpx, 18);
      if (mpct >= 1) {
        ctx.font = font(17);
        ctx.fillStyle = (frameNow / 8 | 0) % 2 ? "#fff" : f.data.accent2;
        ctx.textAlign = right ? "right" : "left";
        const hint = f.isAI ? "必杀 READY" : `必杀 READY (${right ? "/" : "O"})`;
        ctx.fillText(hint, right ? mx + mw : mx, my - 10);
      }
      ctx.restore();

      // combo counter
      if (f.combo.hits >= 2) {
        ctx.save();
        const cx = right ? W - 140 : 140;
        ctx.font = font(52);
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(10,8,10,0.9)"; ctx.lineWidth = 8;
        ctx.strokeText(f.combo.hits + " 连", cx, 170);
        ctx.fillStyle = f.data.accent2;
        ctx.fillText(f.combo.hits + " 连", cx, 170);
        ctx.restore();
      }

      // round pips
      ctx.save();
      for (let i = 0; i < S.roundsToWin; i++) {
        const px = right ? W - 52 - i * 26 : 52 + i * 26;
        ctx.beginPath();
        ctx.arc(px, y + bh + 44, 9, 0, TAU);
        ctx.fillStyle = i < f.rounds ? f.data.accent : "rgba(255,255,255,0.15)";
        ctx.fill();
      }
      ctx.restore();
    }

    // timer
    ctx.save();
    ctx.font = font(56);
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(10,8,10,0.9)"; ctx.lineWidth = 8;
    const tt = String(Math.max(0, Game.timer));
    ctx.strokeText(tt, W / 2, 72);
    ctx.fillStyle = Game.timer <= 10 ? "#ff6a6a" : "#fff";
    ctx.fillText(tt, W / 2, 72);
    ctx.restore();
  }

  function drawBanner() {
    if (!banner) return;
    const b = banner;
    const t = b.age / b.life;
    const scaleIn = b.age < 8 ? 1.8 - 0.8 * (b.age / 8) : 1;
    const a = b.age > b.life - 16 ? (b.life - b.age) / 16 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(W / 2, H / 2 - 60);
    ctx.scale(scaleIn, scaleIn);
    ctx.font = font(b.size);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(10,8,10,0.95)"; ctx.lineWidth = 14;
    ctx.strokeText(b.text, 0, 0);
    const g = ctx.createLinearGradient(0, -b.size / 2, 0, b.size / 2);
    g.addColorStop(0, "#fff3c4");
    g.addColorStop(1, "#ff9d3c");
    ctx.fillStyle = g;
    ctx.fillText(b.text, 0, 0);
    if (b.sub) {
      ctx.font = font(34);
      ctx.strokeStyle = "rgba(10,8,10,0.9)"; ctx.lineWidth = 8;
      ctx.strokeText(b.sub, 0, b.size * 0.72);
      ctx.fillStyle = "#fff";
      ctx.fillText(b.sub, 0, b.size * 0.72);
    }
    ctx.restore();
  }

  function drawUltFlash() {
    if (!Game.ultFlash) return;
    const uf = Game.ultFlash;
    ctx.save();
    ctx.fillStyle = "rgba(6,4,10,0.72)";
    ctx.fillRect(0, 0, W, H);
    // dramatic character zoom
    const f = uf.f;
    const pd = poseData(f.charKey, "channel");
    const img = ASSETS.img[pd.f];
    const s = (H * 0.86) / pd.h;
    const cx = f.side === 0 ? W * 0.32 : W * 0.68;
    ctx.save();
    ctx.translate(cx, H * 0.95);
    ctx.scale(f.facing, 1);
    if (f.gold) ctx.filter = "sepia(0.9) saturate(2.6) hue-rotate(-12deg) brightness(1.12)";
    ctx.drawImage(img, -pd.ax * s, -pd.h * s, pd.w * s, pd.h * s);
    ctx.restore();
    // speed lines
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const ang = rand(0, TAU);
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(ang) * 200, H / 2 + Math.sin(ang) * 120);
      ctx.lineTo(W / 2 + Math.cos(ang) * 900, H / 2 + Math.sin(ang) * 560);
      ctx.stroke();
    }
    ctx.font = font(74);
    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(10,8,10,1)"; ctx.lineWidth = 12;
    ctx.strokeText(uf.label, W / 2, H * 0.24);
    ctx.fillStyle = "#ffd76a";
    ctx.fillText(uf.label, W / 2, H * 0.24);
    ctx.restore();
  }

  function drawPause() {
    ctx.save();
    ctx.fillStyle = "rgba(6,6,10,0.78)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.font = font(64);
    ctx.fillStyle = "#fff";
    ctx.fillText("暂停", W / 2, 150);
    ctx.font = font(24, false);
    ctx.fillStyle = "#cfcfe0";
    const lines = Game.showMoves ? movesLines() : [
      "P / Esc — 继续 · Esc(暂停中) — 回主菜单",
      "J — 出招表",
      "[ ] — 音量 · M — 静音",
      "",
      `AI 难度:${D.difficulties[Game.difficulty].name} (主菜单按 1/2/3 调整)`,
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 230 + i * 40));
    ctx.restore();
  }
  function movesLines() {
    const f = Game.f1;
    const k = f.data.kit;
    return [
      `${f.data.name} 出招表`,
      "J — 普攻(可三连) · K — 重击(升龙/投技近身) · 空中J/K — 空袭",
      `U — ${k.s1.label} · I — ${k.s2.label}`,
      `O — 必杀「${k.ult.label}」(气满)`,
      "双击方向 — 冲刺/后撤(无敌帧) · W — 跳 · 后方向 — 防御",
      "T — 嘲讽(纯整活)",
    ];
  }

  // ---------- scene renders ----------
  function drawLoading() {
    ctx.fillStyle = "#0c0c14";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.font = font(40);
    ctx.fillStyle = "#fff";
    ctx.fillText(Game.loadError ? "资源加载失败" : "加载中……", W / 2, H / 2 - 40);
    if (Game.loadError) {
      ctx.font = font(20, false);
      ctx.fillStyle = "#ff8484";
      ctx.fillText(String(Game.loadError), W / 2, H / 2 + 10);
    } else {
      ctx.fillStyle = "#2b2530";
      ctx.fillRect(W / 2 - 250, H / 2, 500, 16);
      ctx.fillStyle = "#ffd76a";
      ctx.fillRect(W / 2 - 250, H / 2, 500 * Game.loadProgress, 16);
    }
  }

  let titleT = 0;
  function drawTitle() {
    titleT += logicSteps;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, W, H);
    // faint stage
    const st = ASSETS.img[(ASSETS.manifest.stages || {}).studio];
    if (st) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(st, 0, 0, W, H);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(8,6,14,0.5)";
    ctx.fillRect(0, 0, W, H);

    // the two stars
    for (const [ck, x, flip] of [["chen", W * 0.16, 1], ["zhang", W * 0.84, -1]]) {
      const pd = poseData(ck, "idle");
      const img = ASSETS.img[pd.f];
      const s = (H * 0.62) / pd.h;
      ctx.save();
      ctx.translate(x, H * 0.98 + Math.sin(titleT * 0.03) * 6);
      ctx.scale(flip, 1);
      ctx.drawImage(img, -pd.ax * s, -pd.h * s, pd.w * s, pd.h * s);
      ctx.restore();
    }

    // logo
    const lg = ASSETS.manifest.logo ? ASSETS.img[ASSETS.manifest.logo] : null;
    if (lg) {
      const lw = Math.min(600, W * 0.47);
      const lh = lw * lg.height / lg.width;
      ctx.drawImage(lg, W / 2 - lw / 2, 48 + Math.sin(titleT * 0.02) * 4, lw, lh);
    } else {
      ctx.font = font(110);
      ctx.textAlign = "center";
      ctx.strokeStyle = "#1a1418"; ctx.lineWidth = 16;
      ctx.strokeText("梗图格斗", W / 2, 190);
      ctx.fillStyle = "#ffd76a";
      ctx.fillText("梗图格斗", W / 2, 190);
    }
    ctx.textAlign = "center";
    ctx.font = font(30);
    ctx.strokeStyle = "rgba(10,8,10,0.8)"; ctx.lineWidth = 7;
    ctx.strokeText("陈平 VS 张维为 · KOF 梗图版", W / 2, H * 0.5);
    ctx.fillStyle = "#fff";
    ctx.fillText("陈平 VS 张维为 · KOF 梗图版", W / 2, H * 0.5);

    if ((titleT / 40 | 0) % 2 === 0) {
      ctx.font = font(32);
      ctx.fillStyle = "#ffd76a";
      ctx.fillText("按任意键 — 街机模式 · 按 V — 双人对战", W / 2, H * 0.72);
    }
    ctx.font = font(20, false);
    ctx.fillStyle = "#9a9ab0";
    ctx.fillText(`1/2/3 选 AI 难度(当前:${D.difficulties[Game.difficulty].name}) · 本作为梗图恶搞 Parody`, W / 2, H * 0.8);
    ctx.fillText("P1: WASD+JKUIO · P2: 方向键+,./;'", W / 2, H * 0.86);
  }

  function drawSelect() {
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, W, H);
    ctx.font = font(44);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(Game.mode === "arcade" ? "选择你的辩手" : "双人对战 · 各自选人", W / 2, 66);

    const cols = 3, cw = 240, chh = 250, gx = W / 2 - (cols * cw) / 2, gy = 110;
    D.ROSTER.forEach((ck, i) => {
      const col = i % cols, row = (i / cols) | 0;
      const x = gx + col * cw, y = gy + row * chh;
      const c = D.fighters[ck];
      const mfc = ASSETS.manifest.chars[ck];
      ctx.save();
      // card bg
      const sel0 = Game.selIdx[0] === i, sel1 = Game.mode === "versus" && Game.selIdx[1] === i;
      ctx.fillStyle = sel0 || sel1 ? "rgba(40,36,52,0.95)" : "rgba(22,20,30,0.9)";
      roundRect(ctx, x + 8, y + 8, cw - 16, chh - 16, 14);
      ctx.fill();
      if (sel0) { ctx.strokeStyle = "#ffd76a"; ctx.lineWidth = 4; ctx.stroke(); }
      if (sel1) { ctx.strokeStyle = "#6ce4ff"; ctx.lineWidth = 4; roundRect(ctx, x + 12, y + 12, cw - 24, chh - 24, 12); ctx.stroke(); }
      // portrait
      const pf = mfc.portrait ? ASSETS.img[mfc.portrait] : null;
      if (pf) {
        const ps = (chh - 110) / pf.height;
        ctx.drawImage(pf, x + cw / 2 - pf.width * ps / 2, y + 20, pf.width * ps, pf.height * ps);
      }
      ctx.font = font(26);
      ctx.fillStyle = "#fff";
      ctx.fillText(`${c.name}·${c.epithet}`, x + cw / 2, y + chh - 58);
      ctx.font = font(17, false);
      ctx.fillStyle = c.accent2;
      ctx.fillText(c.archetype, x + cw / 2, y + chh - 32);
      ctx.restore();
    });

    ctx.font = font(20, false);
    ctx.fillStyle = "#9a9ab0";
    const p1c = D.fighters[D.ROSTER[Game.selIdx[0]]];
    ctx.fillText(
      Game.mode === "arcade"
        ? "WASD 移动 · J 确认 · Esc 返回"
        : `P1: WASD+J ${Game.selDone[0] ? "✓" : ""} · P2: 方向键+, ${Game.selDone[1] ? "✓" : ""} · Esc 返回`,
      W / 2, H - 30);
  }

  function drawVs() {
    Game.vsT += logicSteps;
    const v = Game.vsData;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, W, H);
    const t = Math.min(1, Game.vsT / 30);
    for (const [ck, side] of [[v.p1, 0], [v.p2, 1]]) {
      const mfc = ASSETS.manifest.chars[ck];
      const pf = mfc.portrait ? ASSETS.img[mfc.portrait] : null;
      const targetX = side === 0 ? W * 0.27 : W * 0.73;
      const x = lerp(side === 0 ? -300 : W + 300, targetX, 1 - Math.pow(1 - t, 3));
      if (pf) {
        const s = (H * 0.66) / pf.height;
        ctx.save();
        if (side === 1) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
        if (side === 1 && v.gold) ctx.filter = "sepia(0.9) saturate(2.6) hue-rotate(-12deg) brightness(1.12)";
        ctx.drawImage(pf, x - pf.width * s / 2, H * 0.2, pf.width * s, pf.height * s);
        ctx.restore();
      }
      const c = D.fighters[ck];
      ctx.font = font(40);
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.fillText(side === 1 && v.gold ? D.arcade.boss.name : `${c.name}·${c.epithet}`, targetX, H * 0.16);
    }
    ctx.font = font(150);
    ctx.textAlign = "center";
    ctx.strokeStyle = "#1a1418"; ctx.lineWidth = 18;
    ctx.strokeText("VS", W / 2, H * 0.58);
    ctx.fillStyle = "#ff5d7e";
    ctx.fillText("VS", W / 2, H * 0.58);
    if (Game.mode === "arcade") {
      ctx.font = font(26);
      ctx.fillStyle = "#9a9ab0";
      const idx = Game.arcadeIdx + 1, total = Game.arcadeOrder.length;
      ctx.fillText(v.gold ? "最终BOSS" : `街机阶梯 ${idx}/${total}`, W / 2, H * 0.72);
    }
    if (Game.vsT > 40 && (Game.vsT / 30 | 0) % 2 === 0) {
      ctx.font = font(24);
      ctx.fillStyle = "#ffd76a";
      ctx.fillText("按任意键开始", W / 2, H * 0.85);
    }
    if (Game.vsT > 150) Game.launchVsMatch();
  }

  function drawResults() {
    Game.resultT += logicSteps;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, W, H);
    const wnr = Game.matchWinner;
    const mfc = ASSETS.manifest.chars[wnr.charKey];
    const pf = mfc.portrait ? ASSETS.img[mfc.portrait] : null;
    if (pf) {
      const s = (H * 0.72) / pf.height;
      ctx.save();
      if (wnr.gold) ctx.filter = "sepia(0.9) saturate(2.6) hue-rotate(-12deg) brightness(1.12)";
      ctx.drawImage(pf, W * 0.5 - pf.width * s / 2, H * 0.16, pf.width * s, pf.height * s);
      ctx.restore();
    }
    ctx.font = font(56);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd76a";
    const nm = wnr.gold ? D.arcade.boss.name : `${wnr.data.name}·${wnr.data.epithet}`;
    ctx.fillText(`${nm} 获胜`, W / 2, 100);
    if (Game.perfectWholeMatch) { /* reserved */ }
    ctx.font = font(30);
    ctx.fillStyle = "#fff";
    ctx.fillText(`「${Game.resultQuote}」`, W / 2, H * 0.82);
    ctx.font = font(22, false);
    ctx.fillStyle = "#9a9ab0";
    ctx.fillText(`败者:「${Game.resultLoseQuote}」`, W / 2, H * 0.88);
    if (Game.resultT > 60) {
      ctx.font = font(24);
      ctx.fillStyle = "#ffd76a";
      ctx.fillText("按任意键继续", W / 2, H * 0.95);
    }
  }

  function drawEnding() {
    Game.resultT += logicSteps;
    ctx.fillStyle = "#0a0a12";
    ctx.fillRect(0, 0, W, H);
    if (logicSteps > 0 && Game.resultT % 6 < logicSteps) FX.confetti(rand(100, S.stageW - 100), rand(0, 200));
    updateParticles(logicSteps * STEP);
    drawParticles();
    ctx.font = font(72);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd76a";
    ctx.fillText("通关!", W / 2, H * 0.3);
    ctx.font = font(34);
    ctx.fillStyle = "#fff";
    ctx.fillText("互联网嘴仗之王已加冕", W / 2, H * 0.42);
    const pc = Game.playerChar ? D.fighters[Game.playerChar] : null;
    if (pc) {
      ctx.font = font(28);
      ctx.fillStyle = pc.accent2;
      ctx.fillText(`「${pick(pc.quotes.win)}」`, W / 2, H * 0.55);
    }
    ctx.font = font(22, false);
    ctx.fillStyle = "#9a9ab0";
    ctx.fillText("按 Esc 回到主菜单 · 本作为梗图恶搞,致敬所有活跃的互联网嘴替", W / 2, H * 0.8);
  }

  // ---------- main loop ----------
  let acc = 0, lastTs = 0;
  const STEP = 1 / 60;

  let logicSteps = 0;   // fixed steps granted this rAF — flow timers advance by this
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    let el = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;

    // fixed-step accumulator drives ALL scene timers (frame-rate independent)
    acc += el;
    logicSteps = 0;
    while (acc >= STEP && logicSteps < 4) {
      if (Game.scene === "fight") fightUpdate(STEP);
      acc -= STEP; logicSteps++;
    }
    if (acc >= STEP) acc = 0;   // drop backlog when the step cap was hit

    if (Game.scene === "boot") { drawLoading(); return; }
    if (Game.scene === "title") { drawTitle(); return; }
    if (Game.scene === "select") { drawSelect(); return; }
    if (Game.scene === "vs") { drawVs(); return; }
    if (Game.scene === "results") { drawResults(); return; }
    if (Game.scene === "ending") { drawEnding(); return; }

    // render
    ctx.clearRect(0, 0, W, H);
    drawStage();
    drawFields();
    drawUltOverlays();
    const order = [Game.f1, Game.f2].sort((a, b) =>
      (a.state === "attack" || a.state === "ult" ? 1 : 0) - (b.state === "attack" || b.state === "ult" ? 1 : 0));
    drawPose(order[0]); drawPose(order[1]);
    drawProjectiles();
    drawParticles();
    drawFloats();
    drawBubbles();
    drawHUD();
    drawBanner();
    drawUltFlash();
    if (Game.paused) drawPause();
  }

  // ---------- boot ----------
  loadAssets(p => { Game.loadProgress = p; })
    .then(() => { Game.scene = "title"; })
    .catch(err => { Game.loadError = err.message; });
  requestAnimationFrame(frame);
})();
