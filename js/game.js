// ChengPing VS ZhangWeiwei — HTML5 arena fighter.
// Engine: fixed 60Hz timestep, dynamic camera, hit-stop, trauma shake,
// particle pool, WebAudio SFX. Gameplay ported from the Pygame build.
"use strict";

(() => {
  const D = window.GAME_DATA;
  const S = D.settings;
  const AU = window.GameAudio;
  const W = S.width, H = S.height, FLOOR = S.floorY;
  const TAU = Math.PI * 2;
  const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';

  // ---------- small helpers ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const font = (px, bold) => `${bold ? "bold " : ""}${px}px ${FONT}`;
  const rand = (a, b) => a + Math.random() * (b - a);

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function strokedText(ctx, text, x, y, fontStr, fill, strokeW = 4, stroke = "rgba(10,12,22,0.9)") {
    ctx.font = fontStr;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (strokeW > 0) {
      ctx.lineWidth = strokeW;
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  // ---------- particles ----------
  const MAX_PARTICLES = 320;
  const particles = [];
  function spawnParticle(p) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(p);
  }
  function sparkBurst(x, y, color, count, speed, life, heavy) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const sp = rand(speed * 0.4, speed);
      spawnParticle({
        kind: "shard", x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(0, 80),
        life: rand(life * 0.6, life), maxLife: life,
        size: heavy ? rand(3, 7) : rand(2, 4.5),
        color, grav: 600, add: true,
      });
    }
    spawnParticle({ kind: "flash", x, y, life: 0.09, maxLife: 0.09, size: heavy ? 46 : 28, color, add: true });
  }
  function dustPuff(x, y, dir, count = 5) {
    for (let i = 0; i < count; i++) {
      spawnParticle({
        kind: "dust", x: x + rand(-10, 10), y: y + rand(-4, 2),
        vx: -dir * rand(30, 130) + rand(-30, 30), vy: rand(-60, -10),
        life: rand(0.18, 0.34), maxLife: 0.34, size: rand(5, 11),
        color: [210, 205, 196], grav: -40, add: false,
      });
    }
  }
  function koExplosion(x, y, color) {
    for (let i = 0; i < 60; i++) {
      const a = rand(0, TAU);
      const sp = rand(120, 760);
      spawnParticle({
        kind: "shard", x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140,
        life: rand(0.3, 0.85), maxLife: 0.85, size: rand(2, 9),
        color: Math.random() < 0.5 ? color : [255, 246, 230], grav: 760, add: true,
      });
    }
    spawnParticle({ kind: "ring", x, y, life: 0.32, maxLife: 0.32, size: 220, color, add: true });
    spawnParticle({ kind: "flash", x, y, life: 0.12, maxLife: 0.12, size: 130, color: [255, 252, 244], add: true });
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      if (p.kind === "shard" || p.kind === "dust") {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt;
      }
    }
  }
  function drawParticles(ctx, additivePass) {
    for (const p of particles) {
      if (!!p.add !== additivePass) continue;
      const t = p.life / p.maxLife;
      if (p.kind === "shard") {
        ctx.fillStyle = rgb(p.color, t);
        const s = p.size * t;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.kind === "dust") {
        ctx.fillStyle = rgb(p.color, t * 0.42);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.4 - t * 0.4), 0, TAU);
        ctx.fill();
      } else if (p.kind === "flash") {
        ctx.fillStyle = rgb(p.color, t * 0.9);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.25 - t), 0, TAU);
        ctx.fill();
      } else if (p.kind === "ring") {
        ctx.strokeStyle = rgb(p.color, t);
        ctx.lineWidth = 8 * t + 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - t), 0, TAU);
        ctx.stroke();
      }
    }
  }

  // ---------- floating combat text ----------
  const floatTexts = [];
  function addFloatText(text, x, y, color, big = false) {
    floatTexts.push({ text, x, y, color, life: 0.95, maxLife: 0.95, big });
    if (floatTexts.length > 40) floatTexts.shift();
  }
  function updateFloatTexts(dt) {
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const t = floatTexts[i];
      t.life -= dt;
      t.y -= 52 * dt;
      if (t.life <= 0) floatTexts.splice(i, 1);
    }
  }
  function drawFloatTexts(ctx) {
    for (const t of floatTexts) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      const pop = 1 + Math.max(0, (a - 0.82)) * 2.4;
      ctx.globalAlpha = a;
      strokedText(ctx, t.text, t.x, t.y, font((t.big ? 30 : 22) * pop, true), rgb(t.color), 5);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- camera (trauma shake + smash-style zoom) ----------
  const camera = {
    x: W / 2, y: H / 2, zoom: 1, trauma: 0,
    focus: null, focusZoom: 1.32, focusTimer: 0,
    addTrauma(v) { this.trauma = clamp(this.trauma + v, 0, 1); },
    punchIn(target, time = 0.9) { this.focus = target; this.focusTimer = time; },
    update(dt, a, b) {
      this.trauma = Math.max(0, this.trauma - 1.25 * dt);
      let tx = W / 2, ty = H / 2, tz = 1;
      if (this.focusTimer > 0 && this.focus) {
        this.focusTimer -= dt;
        tx = this.focus.cx; ty = this.focus.cy - 30; tz = this.focusZoom;
      } else if (a && b) {
        const pad = 230;
        const minX = Math.min(a.cx, b.cx) - pad, maxX = Math.max(a.cx, b.cx) + pad;
        const minY = Math.min(a.cy, b.cy) - pad * 0.9, maxY = FLOOR + 60;
        tx = (minX + maxX) / 2;
        ty = (minY + maxY) / 2;
        tz = clamp(Math.min(W / (maxX - minX), H / (maxY - minY)), 1.0, 1.16);
      }
      const k = 1 - Math.pow(0.88, dt * 60);
      const kz = 1 - Math.pow(0.93, dt * 60);
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
      this.zoom += (tz - this.zoom) * kz;
      // keep view inside the arena
      const vw = W / this.zoom / 2, vh = H / this.zoom / 2;
      this.x = clamp(this.x, vw, W - vw);
      this.y = clamp(this.y, vh, H - vh);
    },
    apply(ctx) {
      const sh = this.trauma * this.trauma;
      const ox = sh * 22 * rand(-1, 1);
      const oy = sh * 16 * rand(-1, 1);
      const rot = sh * 0.022 * rand(-1, 1);
      ctx.translate(W / 2, H / 2);
      ctx.scale(this.zoom, this.zoom);
      ctx.rotate(rot);
      ctx.translate(-this.x + ox, -this.y + oy);
    },
  };

  // ---------- projectiles (port of bullet.py) ----------
  class Projectile {
    constructor(o) {
      Object.assign(this, {
        shape: "orb", behavior: "linear", width: 36, height: 20, radius: 18,
        life: 2.0, knockbackY: -210, waveAmp: 0, waveSpeed: 0, gravity: 0,
        rotationSpeed: 120, returnDelay: 0, returnSpeed: 440, anchorOwner: null,
        orbitRadius: 0, orbitSpeed: 0, orbitAngle: 0, floorLock: null,
        age: 0, returning: false, glow: o.color,
      }, o);
      this.baseY = this.y;
      this.trail = [];
    }
    get rect() {
      if (this.shape === "orb") {
        return { x: this.x - this.radius, y: this.y - this.radius, w: this.radius * 2, h: this.radius * 2 };
      }
      return { x: this.x - this.width / 2, y: this.y - this.height / 2, w: this.width, h: this.height };
    }
    update(dt, anchors) {
      this.age += dt;
      this.life -= dt;
      if (this.life <= 0) return false;
      if (this.behavior === "orbit") {
        const anchor = anchors[this.anchorOwner || this.owner];
        if (!anchor) return false;
        this.orbitAngle += this.orbitSpeed * dt;
        const a = (this.orbitAngle * Math.PI) / 180;
        this.x = anchor.x + Math.cos(a) * this.orbitRadius;
        this.y = anchor.y + Math.sin(a) * this.orbitRadius * 0.65;
      } else if (this.behavior === "boomerang") {
        const anchor = anchors[this.anchorOwner || this.owner];
        if (!this.returning && this.age >= this.returnDelay && anchor) this.returning = true;
        if (this.returning && anchor) {
          const dx = anchor.x - this.x, dy = anchor.y - this.y;
          const len = Math.hypot(dx, dy);
          if (len > 0.1) {
            this.vx = (dx / len) * this.returnSpeed;
            this.vy = (dy / len) * this.returnSpeed;
          }
        }
        this.x += this.vx * dt; this.y += this.vy * dt;
      } else if (this.behavior === "ground_wave") {
        this.x += this.vx * dt;
        const base = this.floorLock !== null ? this.floorLock : this.baseY;
        this.y = base + Math.sin(this.age * this.waveSpeed) * this.waveAmp;
      } else if (this.behavior === "wave") {
        this.x += this.vx * dt;
        this.baseY += this.vy * dt;
        this.y = this.baseY + Math.sin(this.age * this.waveSpeed) * this.waveAmp;
      } else {
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.gravity) this.vy += this.gravity * dt;
      }
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 6) this.trail.shift();
      return true;
    }
    draw(ctx) {
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        ctx.fillStyle = rgb(this.glow, (0.08 + i * 0.07));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5 + i * 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.shape === "orb") this.drawOrb(ctx);
      else if (this.shape === "beam") this.drawBeam(ctx);
      else if (this.shape === "mic") this.drawMic(ctx);
      else if (this.shape === "blade") this.drawBlade(ctx);
      else this.drawCard(ctx, this.shape === "receipt");
      ctx.restore();
    }
    drawOrb(ctx) {
      ctx.fillStyle = rgb(this.glow, 0.32);
      ctx.beginPath(); ctx.arc(0, 0, this.radius + 10, 0, TAU); ctx.fill();
      ctx.fillStyle = rgb(this.color);
      ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(252,250,244,0.95)";
      ctx.beginPath(); ctx.arc(-this.radius * 0.3, -this.radius * 0.25, Math.max(3, this.radius / 4), 0, TAU); ctx.fill();
    }
    drawBeam(ctx) {
      const w = this.width, h = this.height;
      ctx.fillStyle = rgb(this.glow, 0.33);
      roundRect(ctx, -w / 2 - 9, -h / 2 - 9, w + 18, h + 18, (h + 18) / 2); ctx.fill();
      ctx.fillStyle = rgb(this.color, 0.85);
      roundRect(ctx, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, (h + 6) / 2); ctx.fill();
      ctx.fillStyle = "rgba(255,246,232,0.96)";
      roundRect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fill();
    }
    drawCard(ctx, torn) {
      const w = this.width, h = this.height;
      ctx.rotate(Math.sin(this.age * (this.rotationSpeed * Math.PI / 180)) * 0.21);
      ctx.fillStyle = rgb(this.glow, 0.38);
      roundRect(ctx, -w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 10); ctx.fill();
      ctx.fillStyle = rgb(this.color);
      roundRect(ctx, -w / 2, -h / 2, w, h, 8); ctx.fill();
      ctx.fillStyle = "rgb(250,244,230)";
      roundRect(ctx, -w / 2 + 5, -h / 2 + 4, w - 10, h - 8, 6); ctx.fill();
      ctx.strokeStyle = rgb(this.color, 0.85);
      ctx.lineWidth = 2;
      if (torn) {
        for (let y = -h / 2 + 6; y < h / 2 - 3; y += 6) {
          ctx.beginPath(); ctx.moveTo(-w / 2 + 7, y); ctx.lineTo(w / 2 - 7, y); ctx.stroke();
        }
      } else {
        ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -h / 2 + 6); ctx.lineTo(w / 2 - 6, h / 2 - 6); ctx.stroke();
      }
    }
    drawMic(ctx) {
      ctx.rotate(Math.sin(this.age * 6) * 0.28);
      ctx.fillStyle = rgb(this.glow, 0.35);
      ctx.beginPath(); ctx.ellipse(0, 0, this.width * 0.6, this.height * 0.7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgb(this.color);
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(14, this.height * 0.55); ctx.stroke();
      ctx.fillStyle = rgb(this.color);
      ctx.beginPath(); ctx.arc(0, -this.height * 0.28, 12, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(245,245,245,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -this.height * 0.28, 9, 0, TAU); ctx.stroke();
    }
    drawBlade(ctx) {
      const ang = Math.atan2(this.vy, this.vx);
      ctx.rotate(ang);
      const w = this.width, h = this.height;
      ctx.fillStyle = rgb(this.glow, 0.3);
      ctx.beginPath();
      ctx.moveTo(-w / 2 - 8, 0); ctx.lineTo(0, -h / 2 - 8);
      ctx.lineTo(w / 2 + 8, 0); ctx.lineTo(0, h / 2 + 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgb(this.color);
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0); ctx.lineTo(0, -h / 2);
      ctx.lineTo(w / 2, 0); ctx.lineTo(0, h / 2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,246,234,0.92)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 10, 0); ctx.lineTo(w / 2 - 10, 0); ctx.stroke();
    }
  }

  // ---------- kill line (port of KillLineEvent) ----------
  class KillLine {
    constructor() { this.bandY = FLOOR - 82; this.thickness = 20; this.damage = 24; this.reset(); }
    reset() { this.phase = "idle"; this.timer = 0; this.used = false; this.hits = new Set(); }
    trigger() {
      if (this.used || this.phase !== "idle") return false;
      this.used = true; this.phase = "warning"; this.timer = 0.92; this.hits.clear();
      return true;
    }
    forceTrigger() { this.used = true; this.phase = "warning"; this.timer = 0.42; this.hits.clear(); }
    update(dt) {
      if (this.phase === "idle") return null;
      this.timer -= dt;
      if (this.phase === "warning" && this.timer <= 0) {
        this.phase = "active"; this.timer = 0.74;
        return "fire";
      }
      if (this.phase === "active" && this.timer <= 0) { this.phase = "cooldown"; this.timer = 0.38; }
      else if (this.phase === "cooldown" && this.timer <= 0) this.phase = "idle";
      return null;
    }
    get band() {
      const margin = 96;
      return { x: margin, y: this.bandY - this.thickness / 2, w: W - margin * 2, h: this.thickness };
    }
    canHit(key) { return this.phase === "active" && !this.hits.has(key); }
    draw(ctx, pulse) {
      if (this.phase === "idle") return;
      const b = this.band;
      if (this.phase === "warning") {
        const a = 0.34 + Math.abs(Math.sin(pulse * 7)) * 0.5;
        ctx.fillStyle = `rgba(255,100,150,${a})`;
        roundRect(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,90,155,0.36)";
        roundRect(ctx, b.x, b.y - 16, b.w, b.h + 32, 16); ctx.fill();
        ctx.fillStyle = "rgba(255,132,194,0.85)";
        roundRect(ctx, b.x, b.y - 6, b.w, b.h + 12, 14); ctx.fill();
        ctx.fillStyle = "rgba(255,239,245,0.98)";
        roundRect(ctx, b.x, b.y, b.w, b.h - 2, 10); ctx.fill();
      }
      strokedText(ctx, "牢A 斩杀线", W / 2, b.y - 26, font(22, true), "rgb(255,244,246)", 5);
    }
  }

  // ---------- fighter ----------
  const DIRS = ["neutral", "up", "down", "left", "right"];
  class Fighter {
    constructor(bp, headImg, startX, facing, isPlayer, uid) {
      this.bp = bp;
      this.uid = uid || (isPlayer ? "p1" : "p2");
      this.head = headImg;
      this.w = S.fighterW;
      this.h = S.fighterH;
      this.isPlayer = isPlayer;
      this.afterimages = [];
      this.reset(startX, facing);
    }
    reset(startX, facing) {
      this.x = startX;
      this.y = FLOOR - this.h;
      this.vx = 0; this.vy = 0;
      this.moveAxis = 0;
      this.facing = facing;
      this.health = S.maxHealth;
      this.displayedHealth = S.maxHealth; // ghost bar
      this.ghostHold = 0;
      this.meter = 0;
      this.meterWasFull = false;
      this.guardHeat = 0;
      this.guardRequested = false;
      this.guardActive = false;
      this.guardBreakTimer = 0;
      this.onGround = true;
      this.fastFall = false;
      this.jumpsUsed = 0;
      this.airDashesLeft = 1;
      this.basicCd = 0; this.skillCd = 0; this.dashCd = 0;
      this.hitstun = 0; this.invuln = 0; this.flash = 0;
      this.reflectTimer = 0;
      this.speedBuffTimer = 0; this.buffShots = 0;
      this.dashTimer = 0;
      this.pose = "idle"; this.poseDir = "neutral"; this.poseTimer = 0;
      this.anim = 0;
      this.squashX = 1; this.squashY = 1;
      this.coyote = 0;
      this.combo = 0; this.comboTimer = 0; this.comboPop = 0;
      this.afterimages.length = 0;
    }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    get hurtbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get healthRatio() { return Math.max(0, this.health / S.maxHealth); }
    get meterRatio() { return clamp(this.meter / S.maxMeter, 0, 1); }
    get guardRatio() { return clamp(1 - this.guardHeat / S.maxGuardHeat, 0, 1); }

    setMove(axis) {
      this.moveAxis = axis;
      if (Math.abs(axis) > 0.1 && this.hitstun <= 0 && this.dashTimer <= 0) {
        this.facing = axis > 0 ? 1 : -1;
      }
    }
    jump() {
      if (this.hitstun > 0 || this.dashTimer > 0) return false;
      if (this.onGround || this.coyote > 0) {
        this.vy = -S.jumpSpeed;
        this.onGround = false;
        this.coyote = 0;
        this.jumpsUsed = 1;
        this.pose = "jump";
        this.squashX = 0.82; this.squashY = 1.22;
        dustPuff(this.cx, this.y + this.h, 0, 4);
        AU.jump();
        return true;
      }
      if (this.jumpsUsed < 2) {
        this.vy = -S.jumpSpeed * 0.9;
        this.jumpsUsed += 1;
        this.pose = "jump";
        this.squashX = 0.85; this.squashY = 1.18;
        AU.jump();
        return true;
      }
      return false;
    }
    dash() {
      if (this.dashCd > 0 || this.hitstun > 0 || this.guardActive) return false;
      if (!this.onGround && this.airDashesLeft <= 0) return false;
      this.dashCd = 0.74;
      this.dashTimer = S.dashDuration;
      this.vy *= 0.26;
      if (!this.onGround) this.airDashesLeft -= 1;
      this.pose = "dash"; this.poseTimer = 0.12;
      dustPuff(this.cx - this.facing * 30, this.y + this.h - 6, this.facing, 6);
      AU.dash();
      return true;
    }
    gainMeter(v) {
      this.meter = clamp(this.meter + v, 0, S.maxMeter);
      if (this.meter >= S.maxMeter && !this.meterWasFull) {
        this.meterWasFull = true;
        AU.meterFull();
      }
      if (this.meter < S.maxMeter) this.meterWasFull = false;
    }
    takeDamage(damage, knockDir, launchY) {
      if (this.invuln > 0) return [false, false];
      const blocked = this.guardActive && this.guardBreakTimer <= 0;
      const original = damage;
      if (blocked) {
        damage = Math.max(1, Math.round(damage * 0.42));
        this.guardHeat = Math.min(S.maxGuardHeat, this.guardHeat + original * 7.5);
        this.vx = knockDir * 110;
        this.vy = launchY * 0.3;
        this.hitstun = 0.05; this.invuln = 0.08; this.flash = 0.08;
        if (this.guardHeat >= S.maxGuardHeat) {
          this.guardBreakTimer = 1.0;
          this.guardActive = false; this.guardRequested = false;
          AU.guardBreak();
        }
      } else {
        this.vx = knockDir * 300;
        this.vy = launchY;
        this.hitstun = 0.17; this.invuln = 0.12; this.flash = 0.14;
        this.pose = "hit"; this.poseTimer = 0.18;
      }
      this.health = Math.max(0, this.health - damage);
      this.ghostHold = 0.55;
      this.onGround = false;
      this.gainMeter(original * (blocked ? 0.55 : 0.78));
      return [true, blocked];
    }

    worldHoriz(dir) {
      if (dir === "left") return -1;
      if (dir === "right") return 1;
      return this.facing;
    }
    setPose(pose, dir, dur = 0.16) { this.pose = pose; this.poseDir = dir; this.poseTimer = dur; }
    buffProjectiles(list) {
      if (this.speedBuffTimer <= 0 || this.buffShots <= 0) return list;
      for (const p of list) { p.vx *= 1.16; p.vy *= 1.16; p.damage += 2; p.glow = this.bp.accent2; }
      this.buffShots -= 1;
      return list;
    }
    packet(label, dir, count, xSpeed, ySpeeds, damage, shape, opts = {}) {
      const dx = this.worldHoriz(dir);
      let ox = this.cx + dx * 44, oy = this.cy - 24;
      if (dir === "up") oy -= 18;
      else if (dir === "down") oy += 40;
      const out = [];
      const active = ySpeeds.slice(0, count);
      for (let i = 0; i < active.length; i++) {
        out.push(new Projectile({
          owner: this.uid, label,
          x: ox, y: oy + i * 10 - (active.length - 1) * 5,
          vx: dx * xSpeed, vy: active[i],
          damage, color: this.bp.accent, glow: this.bp.accent2, shape,
          behavior: opts.behavior || "linear",
          radius: opts.radius ?? 18, width: opts.width ?? 44, height: opts.height ?? 22,
          waveAmp: opts.waveAmp ?? 0, waveSpeed: opts.waveSpeed ?? 0,
          gravity: opts.gravity ?? 0, floorLock: opts.floorLock ?? null,
          returnDelay: opts.returnDelay ?? 0, anchorOwner: this.uid,
          life: opts.life ?? 1.8,
          knockbackY: dir !== "up" ? -225 : -290,
        }));
      }
      return this.buffProjectiles(out);
    }
    spawnOrbit(label, shape = "orb", count = 2, damage = 6, duration = 3.8) {
      const out = [];
      for (let i = 0; i < count; i++) {
        out.push(new Projectile({
          owner: this.uid, label, x: this.cx, y: this.cy, vx: 0, vy: 0,
          damage, color: this.bp.accent, glow: this.bp.accent2, shape,
          behavior: "orbit", radius: shape === "orb" ? 16 : 18, width: 46, height: 24,
          life: duration, anchorOwner: this.uid,
          orbitRadius: 80 + i * 20, orbitSpeed: i % 2 === 0 ? 220 : -220, orbitAngle: 90 * i,
          knockbackY: -180,
        }));
      }
      return this.buffProjectiles(out);
    }
    spawnRain(label, shape, xPoints, damage, colorSwap = false) {
      const out = [];
      for (let i = 0; i < xPoints.length; i++) {
        out.push(new Projectile({
          owner: this.uid, label,
          x: xPoints[i], y: -40 - i * 28, vx: 0, vy: 720 + i * 20,
          damage,
          color: colorSwap ? this.bp.accent2 : this.bp.accent,
          glow: colorSwap ? this.bp.accent : this.bp.accent2,
          shape, width: shape === "beam" ? 34 : 54, height: shape === "beam" ? 132 : 28,
          life: 1.9, knockbackY: -250,
        }));
      }
      return this.buffProjectiles(out);
    }
    buffSelf(shots = 2, duration = 1.5) {
      this.speedBuffTimer = Math.max(this.speedBuffTimer, duration);
      this.buffShots = Math.max(this.buffShots, shots);
    }
    upAntiAir(label, shape = "beam", damage = 10) {
      return this.buffProjectiles([new Projectile({
        owner: this.uid, label, x: this.cx, y: this.cy - 52, vx: 0, vy: -620,
        damage, color: this.bp.accent, glow: this.bp.accent2, shape,
        width: shape === "beam" ? 36 : 52, height: shape === "beam" ? 110 : 30,
        radius: 18, life: 1.2, knockbackY: -310,
      })]);
    }
    groundLine(label, dir, shape = "beam", damage = 9, xSpeed = 620) {
      const dx = this.worldHoriz(dir);
      return this.buffProjectiles([new Projectile({
        owner: this.uid, label, x: this.cx + dx * 48, y: this.cy + 58,
        vx: dx * xSpeed, vy: 0,
        damage, color: this.bp.accent, glow: this.bp.accent2, shape,
        behavior: "ground_wave",
        width: shape === "beam" ? 106 : 84, height: shape === "beam" ? 20 : 24,
        floorLock: FLOOR - 52, waveAmp: 8, waveSpeed: 10, life: 1.3, knockbackY: -240,
      })]);
    }

    useBasic(dir) {
      if (this.basicCd > 0 || this.hitstun > 0 || this.guardActive) return null;
      this.basicCd = 0.27;
      const label = this.bp.basics[dir];
      this.setPose("basic", dir);
      const h = this.worldHoriz(dir);
      let pr = [];
      const k = this.bp.key;
      if (k === "chen_ping_macro") {
        if (dir === "neutral") pr = this.packet(label, dir, 2, 860, [-30, 30], 8, "card", { width: 52, height: 24 });
        else if (dir === "up") pr = this.upAntiAir(label, "card", 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 8, 680);
        else if (dir === "left") { this.vx -= 180; pr = this.packet(label, dir, 1, 560, [0], 8, "receipt", { width: 54, height: 26, behavior: "boomerang", returnDelay: 0.55, life: 2.1 }); }
        else { this.vx += h * 140; pr = this.packet(label, dir, 1, 920, [0], 10, "beam", { width: 88, height: 16, life: 0.8 }); }
      } else if (k === "chen_ping_lecture") {
        if (dir === "neutral") pr = this.packet(label, dir, 3, 720, [-60, 0, 60], 6, "beam", { width: 62, height: 12, life: 1.25 });
        else if (dir === "up") pr = this.upAntiAir(label, "beam", 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 10, 620);
        else if (dir === "left") { this.vx -= 150; pr = this.packet(label, dir, 1, 480, [0], 8, "card", { width: 58, height: 28, behavior: "boomerang", returnDelay: 0.45, life: 1.8 }); }
        else { this.vx += h * 130; pr = this.packet(label, dir, 1, 760, [0], 9, "beam", { width: 94, height: 18, life: 0.85 }); }
      } else if (k === "zhang_weiwei_civil") {
        if (dir === "neutral") pr = this.packet(label, dir, 1, 650, [0], 8, "orb", { radius: 16, behavior: "wave", waveAmp: 18, waveSpeed: 8.8, life: 2.2 });
        else if (dir === "up") pr = this.upAntiAir(label, "orb", 9);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 8, 560);
        else if (dir === "left") { this.reflectTimer = 0.45; pr = this.packet(label, dir, 1, 500, [0], 7, "orb", { radius: 15, behavior: "boomerang", returnDelay: 0.55, life: 2.1 }); }
        else pr = this.packet(label, dir, 1, 760, [0], 10, "beam", { width: 84, height: 16, life: 0.9 });
      } else if (k === "zhang_weiwei_studio") {
        if (dir === "neutral") pr = this.packet(label, dir, 1, 560, [0], 9, "mic", { width: 58, height: 40, behavior: "boomerang", returnDelay: 0.44, life: 2.0 });
        else if (dir === "up") pr = this.upAntiAir(label, "beam", 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 8, 520);
        else if (dir === "left") { this.vx -= 120; pr = this.packet(label, dir, 1, 420, [0], 8, "mic", { width: 58, height: 40, behavior: "boomerang", returnDelay: 0.70, life: 2.4 }); }
        else { this.vx += h * 80; pr = this.packet(label, dir, 1, 720, [0], 9, "beam", { width: 80, height: 16, life: 0.9 }); }
      } else if (k === "lao_a_execute") {
        if (dir === "neutral") pr = this.packet(label, dir, 1, 820, [0], 9, "receipt", { width: 62, height: 28, life: 1.4 });
        else if (dir === "up") pr = this.upAntiAir(label, "blade", 11);
        else if (dir === "down") pr = this.groundLine(label, dir, "blade", 10, 700);
        else if (dir === "left") { this.vx -= 170; pr = this.packet(label, dir, 1, 480, [0], 8, "receipt", { width: 56, height: 26, behavior: "boomerang", returnDelay: 0.48, life: 1.8 }); }
        else { this.vx += h * 220; pr = this.packet(label, dir, 1, 940, [-40], 11, "blade", { width: 90, height: 26, gravity: 650, life: 1.0 }); }
      } else if (k === "lao_a_budget") {
        if (dir === "neutral") pr = this.packet(label, dir, 1, 600, [0], 8, "receipt", { width: 58, height: 28, behavior: "boomerang", returnDelay: 0.58, life: 2.2 });
        else if (dir === "up") pr = this.upAntiAir(label, "receipt", 9);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 8, 580);
        else if (dir === "left") pr = this.spawnOrbit(label, "receipt", 2, 5, 2.6);
        else { this.vx += h * 110; pr = this.packet(label, dir, 2, 700, [-40, 40], 8, "receipt", { width: 54, height: 26, life: 1.5 }); }
      } else if (k === "fengge_dongbei") {
        if (dir === "neutral") pr = this.packet(label, dir, 1, 760, [0], 10, "beam", { width: 96, height: 18, life: 0.9 });
        else if (dir === "up") pr = this.upAntiAir(label, "beam", 11);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 9, 680);
        else if (dir === "left") { this.vx -= 160; pr = this.packet(label, dir, 1, 520, [0], 8, "card", { width: 52, height: 24, behavior: "boomerang", returnDelay: 0.46, life: 1.9 }); }
        else { this.vx += h * 190; pr = this.packet(label, dir, 1, 900, [0], 11, "blade", { width: 88, height: 24, life: 0.85 }); }
      } else if (k === "hu_chenfeng_reviewer") {
        if (dir === "neutral") pr = this.packet(label, dir, 2, 720, [-30, 30], 8, "card", { width: 58, height: 30, life: 1.6 });
        else if (dir === "up") pr = this.upAntiAir(label, "card", 9);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 8, 560);
        else if (dir === "left") { this.vx -= 130; pr = this.packet(label, dir, 1, 520, [0], 8, "card", { width: 58, height: 30, behavior: "boomerang", returnDelay: 0.52, life: 2.0 }); }
        else pr = this.packet(label, dir, 1, 860, [0], 9, "beam", { width: 88, height: 16, life: 0.9 });
      } else {
        if (dir === "neutral") pr = this.packet(label, dir, 1, 700, [0], 9, "beam", { width: 90, height: 18, life: 1.0 });
        else if (dir === "up") pr = this.upAntiAir(label, "beam", 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 8, 560);
        else if (dir === "left") { this.vx -= 120; pr = this.packet(label, dir, 1, 520, [0], 7, "receipt", { width: 54, height: 26, behavior: "boomerang", returnDelay: 0.54, life: 2.0 }); }
        else { this.vx += h * 120; pr = this.packet(label, dir, 1, 820, [0], 10, "beam", { width: 88, height: 16, life: 0.9 }); }
      }
      AU.shoot();
      return { label, projectiles: pr, color: this.bp.accent2, forceKillLine: false };
    }

    useSkill(dir) {
      if (this.skillCd > 0 || this.hitstun > 0 || this.guardActive) return null;
      this.skillCd = 0.96;
      const label = this.bp.skills[dir];
      this.setPose("skill", dir, 0.22);
      const h = this.worldHoriz(dir);
      let pr = [];
      let forceKillLine = false;
      const k = this.bp.key;
      if (k === "chen_ping_macro") {
        if (dir === "neutral") pr = this.packet(label, dir, 4, 700, [-160, -50, 50, 160], 8, "receipt", { width: 56, height: 28, life: 1.7 });
        else if (dir === "up") pr = this.spawnRain(label, "beam", [320, 540, 760, 980, 1200], 9);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 12, 780);
        else if (dir === "left") { this.buffSelf(3, 1.8); this.vx -= 200; }
        else { this.vx += h * 240; pr = this.packet(label, dir, 2, 900, [-50, 50], 10, "card", { width: 60, height: 28, life: 1.1 }); }
      } else if (k === "chen_ping_lecture") {
        if (dir === "neutral") pr = this.packet(label, dir, 1, 680, [0], 14, "beam", { width: 122, height: 20, behavior: "ground_wave", floorLock: FLOOR - 62, waveAmp: 8, waveSpeed: 10, life: 1.35 });
        else if (dir === "up") pr = this.spawnRain(label, "beam", [260, 520, 780, 1040, 1300], 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 13, 820);
        else if (dir === "left") { this.reflectTimer = 1.1; this.guardHeat = Math.max(0, this.guardHeat - 30); AU.reflect(); }
        else { this.vx += h * 190; pr = this.packet(label, dir, 1, 780, [-120], 12, "blade", { width: 94, height: 26, gravity: 920, life: 1.2 }); }
      } else if (k === "zhang_weiwei_civil") {
        if (dir === "neutral") pr = this.packet(label, dir, 3, 560, [-80, 0, 80], 7, "orb", { radius: 18, behavior: "wave", waveAmp: 24, waveSpeed: 8.6, life: 2.3 });
        else if (dir === "up") pr = this.spawnRain(label, "orb", [320, 560, 800, 1040, 1280], 9, true);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 10, 600);
        else if (dir === "left") { this.reflectTimer = 1.0; this.guardHeat = Math.max(0, this.guardHeat - 20); AU.reflect(); }
        else pr = this.packet(label, dir, 2, 760, [-20, 20], 10, "orb", { radius: 20, behavior: "wave", waveAmp: 12, waveSpeed: 10, life: 1.9 });
      } else if (k === "zhang_weiwei_studio") {
        if (dir === "neutral") {
          pr = [-160, 0, 160].map(off => new Projectile({
            owner: this.uid, label, x: this.cx + off, y: 42, vx: 0, vy: 740,
            damage: 9, color: this.bp.accent, glow: this.bp.accent2,
            shape: "beam", width: 32, height: 128, life: 1.7, knockbackY: -240,
          }));
        }
        else if (dir === "up") pr = this.spawnRain(label, "beam", [260, 490, 720, 950, 1180], 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 11, 540);
        else if (dir === "left") pr = this.spawnOrbit(label, "mic", 2, 7, 3.5);
        else { this.vx += h * 150; pr = this.packet(label, dir, 2, 720, [-50, 50], 9, "mic", { width: 58, height: 40, life: 1.5 }); }
      } else if (k === "lao_a_execute") {
        if (dir === "neutral") pr = this.packet(label, dir, 3, 740, [0, 0, 0], 10, "blade", { width: 94, height: 24, behavior: "ground_wave", floorLock: FLOOR - 56, waveAmp: 10, waveSpeed: 10.5, life: 1.2 });
        else if (dir === "up") pr = this.spawnRain(label, "blade", [260, 500, 740, 980, 1220], 12);
        else if (dir === "down") { pr = this.groundLine(label, dir, "blade", 12, 780); forceKillLine = true; }
        else if (dir === "left") { this.buffSelf(3, 1.6); this.dashCd = 0; }
        else { this.vx += h * 260; pr = this.packet(label, dir, 1, 920, [-260], 13, "blade", { width: 92, height: 28, gravity: 1150, life: 1.15 }); }
      } else if (k === "lao_a_budget") {
        if (dir === "neutral") pr = this.packet(label, dir, 4, 640, [-180, -60, 60, 180], 7, "receipt", { width: 54, height: 26, life: 1.7 });
        else if (dir === "up") pr = this.spawnRain(label, "receipt", [300, 560, 820, 1080, 1340], 9, true);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 11, 620);
        else if (dir === "left") pr = this.spawnOrbit(label, "receipt", 3, 6, 3.8);
        else { this.vx += h * 160; pr = this.packet(label, dir, 2, 760, [-90, 90], 10, "receipt", { width: 58, height: 28, life: 1.4 }); }
      } else if (k === "fengge_dongbei") {
        if (dir === "neutral") pr = this.packet(label, dir, 2, 760, [-30, 30], 10, "beam", { width: 110, height: 18, life: 1.0 });
        else if (dir === "up") pr = this.spawnRain(label, "beam", [280, 500, 720, 940, 1160], 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 12, 720);
        else if (dir === "left") { this.buffSelf(2, 1.5); this.vx -= 180; }
        else { this.vx += h * 250; pr = this.packet(label, dir, 2, 880, [-40, 40], 11, "blade", { width: 92, height: 26, life: 1.05 }); }
      } else if (k === "hu_chenfeng_reviewer") {
        if (dir === "neutral") pr = this.packet(label, dir, 3, 700, [-80, 0, 80], 8, "card", { width: 60, height: 30, life: 1.8 });
        else if (dir === "up") pr = this.spawnRain(label, "card", [320, 580, 840, 1100], 9);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 10, 600);
        else if (dir === "left") { this.reflectTimer = 0.9; this.buffSelf(2, 1.3); AU.reflect(); }
        else { this.vx += h * 150; pr = this.packet(label, dir, 2, 820, [-40, 40], 10, "card", { width: 62, height: 32, life: 1.3 }); }
      } else {
        if (dir === "neutral") pr = this.packet(label, dir, 3, 690, [-60, 0, 60], 8, "receipt", { width: 56, height: 28, life: 1.8 });
        else if (dir === "up") pr = this.spawnRain(label, "beam", [320, 580, 840, 1100], 10);
        else if (dir === "down") pr = this.groundLine(label, dir, "beam", 10, 620);
        else if (dir === "left") { this.reflectTimer = 0.8; this.vx -= 120; AU.reflect(); }
        else { this.vx += h * 160; pr = this.packet(label, dir, 2, 800, [-40, 40], 10, "beam", { width: 88, height: 16, life: 1.2 }); }
      }
      AU.skill();
      return { label, projectiles: this.buffProjectiles(pr), color: this.bp.accent2, forceKillLine };
    }

    useUltimate() {
      if (this.hitstun > 0 || this.guardActive || this.meter < S.maxMeter) return null;
      this.meter = 0;
      const label = this.bp.ult;
      this.setPose("ultimate", "neutral", 0.4);
      let pr = [];
      let forceKillLine = false;
      const k = this.bp.key;
      if (k === "chen_ping_macro" || k === "chen_ping_lecture") {
        const shape = k === "chen_ping_macro" ? "receipt" : "beam";
        pr = this.spawnRain(label, shape, [220, 420, 620, 820, 1020, 1220], 12, k === "chen_ping_macro");
      } else if (k === "zhang_weiwei_civil" || k === "zhang_weiwei_studio") {
        const shape = k === "zhang_weiwei_civil" ? "orb" : "mic";
        pr = this.packet(label, "neutral", 6, 600, [-220, -120, -40, 40, 120, 220], 10, shape, {
          radius: 22, width: 60, height: 40,
          behavior: shape === "orb" ? "wave" : "linear", waveAmp: 26, waveSpeed: 10, life: 2.4,
        });
      } else if (k === "lao_a_execute") {
        pr = this.packet(label, "neutral", 4, 760, [0, 0, 0, 0], 13, "blade", { width: 96, height: 26, behavior: "ground_wave", floorLock: FLOOR - 54, waveAmp: 10, waveSpeed: 11, life: 1.5 });
        forceKillLine = true;
      } else if (k === "lao_a_budget") {
        pr = this.spawnOrbit(label, "receipt", 4, 7, 5.0);
      } else if (k === "fengge_dongbei") {
        pr = this.spawnRain(label, "beam", [240, 430, 620, 810, 1000, 1190], 11);
      } else if (k === "hu_chenfeng_reviewer") {
        pr = this.packet(label, "neutral", 6, 720, [-160, -96, -32, 32, 96, 160], 9, "card", { width: 62, height: 32, life: 2.0 });
      } else {
        pr = this.spawnRain(label, "beam", [260, 500, 740, 980, 1220], 11, true);
      }
      AU.ult();
      return { label, projectiles: pr, color: this.bp.accent2, forceKillLine, isUlt: true };
    }

    update(dt, arenaW) {
      this.anim += dt;
      this.basicCd = Math.max(0, this.basicCd - dt);
      this.skillCd = Math.max(0, this.skillCd - dt);
      this.dashCd = Math.max(0, this.dashCd - dt);
      this.hitstun = Math.max(0, this.hitstun - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      this.flash = Math.max(0, this.flash - dt);
      this.reflectTimer = Math.max(0, this.reflectTimer - dt);
      this.speedBuffTimer = Math.max(0, this.speedBuffTimer - dt);
      this.guardBreakTimer = Math.max(0, this.guardBreakTimer - dt);
      this.poseTimer = Math.max(0, this.poseTimer - dt);
      this.coyote = Math.max(0, this.coyote - dt);
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      this.comboPop = Math.max(0, this.comboPop - dt);
      if (this.comboTimer <= 0) this.combo = 0;

      // ghost health bar drain
      this.ghostHold = Math.max(0, this.ghostHold - dt);
      if (this.ghostHold <= 0 && this.displayedHealth > this.health) {
        this.displayedHealth = Math.max(this.health, this.displayedHealth - S.maxHealth * 1.4 * dt);
      }

      // squash & stretch ease back to 1
      this.squashX += (1 - this.squashX) * Math.min(1, dt * 14);
      this.squashY += (1 - this.squashY) * Math.min(1, dt * 14);

      this.guardActive = this.guardRequested && this.guardBreakTimer <= 0 &&
        this.hitstun <= 0 && this.dashTimer <= 0 && this.onGround;
      if (!this.guardActive) this.guardHeat = Math.max(0, this.guardHeat - S.guardCoolRate * dt);

      if (this.dashTimer > 0) {
        this.dashTimer = Math.max(0, this.dashTimer - dt);
        this.x += this.facing * S.dashSpeed * dt;
        this.afterimages.push({ x: this.x, y: this.y, facing: this.facing, life: 0.18 });
      } else {
        let speed = this.guardActive ? S.guardSpeed : (this.onGround ? S.moveSpeed : S.airSpeed);
        if (this.speedBuffTimer > 0) speed *= 1.14;
        const axis = this.hitstun > 0 ? 0 : this.moveAxis;
        this.x += axis * speed * dt;
      }

      this.x += this.vx * dt;
      this.vx *= Math.pow(0.84, dt * 60);
      if (Math.abs(this.vx) < 18) this.vx = 0;

      const grav = S.gravity * (this.fastFall && !this.onGround && this.vy > 0 ? 1.5 : 1);
      this.vy += grav * dt;
      this.y += this.vy * dt;

      const groundY = FLOOR - this.h;
      const wasAir = !this.onGround;
      if (this.y >= groundY) {
        this.y = groundY;
        this.vy = 0;
        if (wasAir) {
          this.airDashesLeft = 1;
          this.jumpsUsed = 0;
          this.squashX = 1.22; this.squashY = 0.78;
          dustPuff(this.cx, this.y + this.h, 0, 5);
          AU.land();
        }
        this.onGround = true;
      } else {
        if (this.onGround) this.coyote = 0.085;
        this.onGround = false;
      }

      this.x = clamp(this.x, S.stageMargin, arenaW - S.stageMargin - this.w);

      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].life -= dt;
        if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
      }
      if (this.afterimages.length > 8) this.afterimages.splice(0, this.afterimages.length - 8);

      if (this.poseTimer <= 0 && this.hitstun <= 0) {
        if (this.guardActive) this.pose = "guard";
        else if (!this.onGround) this.pose = "jump";
        else if (Math.abs(this.moveAxis) > 0.1) this.pose = "run";
        else this.pose = "idle";
      }
    }
    faceTarget(tx) {
      if (this.dashTimer <= 0) this.facing = tx >= this.cx ? 1 : -1;
    }

    // ---------- chibi rendering ----------
    drawBody(ctx, vib) {
      const bp = this.bp;
      const cx = this.cx, bottom = this.y + this.h;
      const bob = Math.sin(this.anim * (this.pose === "run" ? 11 : 3.2)) * (this.pose === "run" ? 4 : 2);
      let lean = 0;
      if (this.pose === "run") lean = this.moveAxis * 0.14;
      else if (this.pose === "dash") lean = this.facing * 0.3;
      else if (this.pose === "jump") lean = this.vx * 0.0003;
      else if (this.pose === "basic" || this.pose === "skill" || this.pose === "ultimate") {
        lean = ({ left: -0.18, right: 0.18, up: -0.1, down: 0.1 }[this.poseDir] ?? this.facing * 0.1);
      } else if (this.pose === "hit") lean = -this.facing * 0.16;

      const guardCrouch = this.guardActive ? 10 : 0;
      const headR = 39;
      const legLen = 34;
      const torsoH = this.h - headR * 2 - legLen + 6;

      ctx.save();
      ctx.translate(cx + vib.x, bottom + vib.y);
      ctx.scale(this.squashX, this.squashY);
      ctx.rotate(lean);
      ctx.translate(0, guardCrouch);

      const white = this.flash > 0;
      const mixW = (c) => white ? [c[0] + (255 - c[0]) * 0.55, c[1] + (255 - c[1]) * 0.55, c[2] + (255 - c[2]) * 0.55] : c;
      const coat = mixW(bp.coat);
      const accent = mixW(bp.accent);

      // legs: simple capsules with run swing
      const runPhase = Math.sin(this.anim * 13) * (this.pose === "run" ? 1 : 0);
      const jumpTuck = !this.onGround ? 10 : 0;
      ctx.lineCap = "round";
      ctx.strokeStyle = rgb([28, 30, 44]);
      ctx.lineWidth = 13;
      for (const side of [-1, 1]) {
        const swing = runPhase * 14 * side;
        ctx.beginPath();
        ctx.moveTo(side * 13, -legLen - 8);
        ctx.lineTo(side * 13 + swing + this.facing * jumpTuck * 0.4, -6 - jumpTuck * (side === this.facing ? 1 : 0.4));
        ctx.stroke();
      }

      // torso coat
      const tw = 62;
      ctx.fillStyle = rgb(coat);
      roundRect(ctx, -tw / 2, -legLen - torsoH - 2, tw, torsoH + 4, 20);
      ctx.fill();
      ctx.strokeStyle = "rgba(12,14,24,0.55)";
      ctx.lineWidth = 3;
      roundRect(ctx, -tw / 2, -legLen - torsoH - 2, tw, torsoH + 4, 20);
      ctx.stroke();
      // shirt V + tie
      ctx.fillStyle = "rgb(245,242,232)";
      ctx.beginPath();
      ctx.moveTo(-10, -legLen - torsoH + 2);
      ctx.lineTo(10, -legLen - torsoH + 2);
      ctx.lineTo(0, -legLen - torsoH + 26);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgb(accent);
      roundRect(ctx, -4, -legLen - torsoH + 6, 8, torsoH * 0.5, 4);
      ctx.fill();

      // arms: rear behind torso, front swings / punches
      const attacking = this.pose === "basic" || this.pose === "skill" || this.pose === "ultimate";
      const punchT = attacking ? clamp(this.poseTimer / 0.16, 0, 1) : 0;
      const punchLen = attacking ? 30 + (1 - punchT) * 8 : 0;
      const armY = -legLen - torsoH + 16;
      ctx.strokeStyle = rgb(coat);
      ctx.lineWidth = 11;
      // rear arm
      ctx.beginPath();
      ctx.moveTo(-this.facing * 18, armY);
      ctx.lineTo(-this.facing * (26 + runPhase * 8), armY + 22);
      ctx.stroke();
      // front arm
      ctx.beginPath();
      ctx.moveTo(this.facing * 14, armY);
      if (attacking) {
        const dirUp = this.poseDir === "up" ? -28 : this.poseDir === "down" ? 16 : 0;
        ctx.lineTo(this.facing * (30 + punchLen), armY + 8 + dirUp);
      } else if (this.guardActive) {
        ctx.lineTo(this.facing * 24, armY - 8);
      } else {
        ctx.lineTo(this.facing * (24 - runPhase * 8), armY + 22);
      }
      ctx.stroke();
      // fist
      if (attacking) {
        const dirUp = this.poseDir === "up" ? -28 : this.poseDir === "down" ? 16 : 0;
        ctx.fillStyle = "rgb(231,192,156)";
        ctx.beginPath();
        ctx.arc(this.facing * (30 + punchLen), armY + 8 + dirUp, 7, 0, TAU);
        ctx.fill();
      }

      // signature hand prop
      this.drawProp(ctx, armY, attacking, punchLen);

      // head sprite
      const headCY = -legLen - torsoH - headR + 6 + bob * 0.5;
      const img = this.head;
      ctx.save();
      ctx.translate(0, headCY);
      ctx.rotate(lean * 0.4);
      if (this.facing < 0) ctx.scale(-1, 1);
      if (img && img.complete) ctx.drawImage(img, -headR, -headR, headR * 2, headR * 2);
      else {
        ctx.fillStyle = rgb(bp.accent);
        ctx.beginPath(); ctx.arc(0, 0, headR, 0, TAU); ctx.fill();
      }
      if (white) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(0, 0, headR, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      ctx.restore();
    }
    drawProp(ctx, armY, attacking, punchLen) {
      const k = this.bp.key;
      const f = this.facing;
      const hx = attacking ? f * (30 + punchLen) : f * 24;
      const hy = attacking ? armY + 8 : armY + 22;
      ctx.lineCap = "round";
      if (k === "chen_ping_macro" || k === "chen_ping_lecture") {
        // chalk stick
        ctx.strokeStyle = "rgb(245,242,232)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(hx + f * 14, hy - 10);
        ctx.stroke();
      } else if (k === "zhang_weiwei_civil" || k === "zhang_weiwei_studio") {
        // panel mic
        ctx.strokeStyle = "rgb(30,32,46)";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + f * 10, hy - 14); ctx.stroke();
        ctx.fillStyle = rgb(this.bp.accent);
        ctx.beginPath(); ctx.arc(hx + f * 12, hy - 17, 5.5, 0, TAU); ctx.fill();
      } else if (k === "lao_a_budget") {
        // glowing execution sickle
        ctx.strokeStyle = "rgba(255,93,161,0.9)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(hx + f * 10, hy - 6, 16, f > 0 ? -1.4 : 2.4, f > 0 ? 0.9 : 4.6);
        ctx.stroke();
        ctx.strokeStyle = "rgb(80,60,96)";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(hx, hy + 8); ctx.lineTo(hx, hy - 8); ctx.stroke();
      } else if (k === "lao_a_execute") {
        // rolled-up poster
        ctx.strokeStyle = "rgb(235,225,210)";
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(hx - f * 4, hy + 4); ctx.lineTo(hx + f * 16, hy - 14); ctx.stroke();
        ctx.strokeStyle = "rgb(215,68,51)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hx + f * 2, hy - 2); ctx.lineTo(hx + f * 12, hy - 11); ctx.stroke();
      } else if (k === "fengge_dongbei") {
        // selfie stick + phone
        ctx.strokeStyle = "rgb(40,42,56)";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + f * 26, hy - 26); ctx.stroke();
        ctx.fillStyle = "rgb(20,22,34)";
        ctx.save();
        ctx.translate(hx + f * 30, hy - 32);
        ctx.rotate(f * 0.5);
        ctx.fillRect(-7, -12, 14, 24);
        ctx.fillStyle = "rgba(150,210,255,0.8)";
        ctx.fillRect(-5, -10, 10, 20);
        ctx.restore();
      } else if (k === "hu_chenfeng_reviewer") {
        // phone held out to scan
        ctx.fillStyle = "rgb(22,24,36)";
        ctx.save();
        ctx.translate(hx + f * 6, hy - 6);
        ctx.rotate(f * 0.18);
        ctx.fillRect(-8, -15, 16, 30);
        ctx.fillStyle = "rgb(120,230,160)";
        ctx.fillRect(-6, -13, 12, 26);
        ctx.restore();
      } else if (k === "hu_xijin_editor") {
        // rolled newspaper
        ctx.strokeStyle = "rgb(228,222,206)";
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(hx - f * 2, hy + 6); ctx.lineTo(hx + f * 16, hy - 10); ctx.stroke();
        ctx.strokeStyle = "rgb(140,134,120)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(hx + f * 2, hy); ctx.lineTo(hx + f * 13, hy - 8); ctx.stroke();
      }
    }
    draw(ctx, game) {
      // afterimages: slim speed-ghost silhouettes
      for (const a of this.afterimages) {
        const alpha = (a.life / 0.18) * 0.16;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = rgb(this.bp.accent2);
        const gx = a.x + this.w / 2;
        ctx.beginPath();
        ctx.arc(gx, a.y + 44, 26, 0, TAU);
        ctx.fill();
        roundRect(ctx, gx - 18, a.y + 74, 36, this.h - 92, 16);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // shadow
      const airH = clamp((FLOOR - (this.y + this.h)) / 240, 0, 1);
      ctx.fillStyle = `rgba(6,8,17,${0.5 - airH * 0.3})`;
      ctx.beginPath();
      ctx.ellipse(this.cx, FLOOR - 6, (this.w * 0.62) * (1 - airH * 0.3), 13 * (1 - airH * 0.3), 0, 0, TAU);
      ctx.fill();

      // hit vibration during hitstop
      const vib = { x: 0, y: 0 };
      if (game.hitstop > 0 && this.hitstun > 0) {
        if (this.onGround) vib.x = rand(-2.5, 2.5);
        else vib.y = rand(-2.5, 2.5);
      }
      this.drawBody(ctx, vib);

      // guard / reflect halos
      if (this.guardActive) {
        ctx.strokeStyle = rgb(this.bp.accent2, 0.5);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(this.cx, this.cy, this.w * 0.72, this.h * 0.6, 0, 0, TAU);
        ctx.stroke();
      }
      if (this.guardBreakTimer > 0) {
        strokedText(ctx, "破防!", this.cx, this.y - 36, font(20, true), "rgb(255,140,140)", 4);
      }
      if (this.reflectTimer > 0) {
        ctx.strokeStyle = rgb(this.bp.accent2, 0.66);
        ctx.lineWidth = 4 + Math.sin(this.anim * 18) * 2;
        ctx.beginPath();
        ctx.ellipse(this.cx, this.cy, this.w * 0.8, this.h * 0.66, 0, 0, TAU);
        ctx.stroke();
      }

      // name tag / ult ready
      const ready = this.meter >= S.maxMeter;
      const tag = ready ? "ULT READY" : this.bp.title;
      const pulse = ready ? 0.7 + Math.abs(Math.sin(this.anim * 6)) * 0.3 : 1;
      ctx.globalAlpha = pulse;
      strokedText(ctx, tag, this.cx, this.y - 14, font(13, true), ready ? rgb(this.bp.accent2) : "rgb(248,245,237)", 3);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- backdrop ----------
  class Backdrop {
    constructor() {
      this.canvas = document.createElement("canvas");
      this.canvas.width = W; this.canvas.height = H;
      this.theme = D.stages[0];
      this.bubbles = [];
      this.setTheme(this.theme);
    }
    setTheme(theme) {
      this.theme = theme;
      this.bubbles = [];
      for (let i = 0; i < 10; i++) {
        this.bubbles.push({
          x: rand(100, W - 280), y: rand(120, FLOOR - 220),
          speed: rand(12, 28), phase: rand(0, TAU),
          label: theme.keywords[i % theme.keywords.length],
          width: rand(150, 215),
        });
      }
      this.prerender();
    }
    prerender() {
      const ctx = this.canvas.getContext("2d");
      const t = this.theme;
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, rgb(t.top));
      grad.addColorStop(1, rgb(t.bottom));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 48; y < FLOOR; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // floor
      ctx.fillStyle = rgb(t.floor);
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.fillStyle = "rgb(247,226,180)";
      ctx.fillRect(0, FLOOR, W, 4);
      // podiums
      for (let i = 0; i < 2; i++) {
        const x = i === 0 ? 180 : W - 340;
        const color = i === 0 ? D.C.red : D.C.cyan;
        ctx.fillStyle = "rgb(24,27,43)";
        roundRect(ctx, x, FLOOR - 58, 148, 72, 20); ctx.fill();
        ctx.fillStyle = rgb(color);
        roundRect(ctx, x + 9, FLOOR - 44, 130, 44, 14); ctx.fill();
        ctx.strokeStyle = "rgba(247,238,217,0.9)";
        ctx.lineWidth = 2;
        roundRect(ctx, x + 11, FLOOR - 42, 126, 40, 14); ctx.stroke();
      }
      // audience silhouettes
      for (let i = 0; i < 22; i++) {
        const x = 18 + i * 66;
        const hh = 40 + (i % 4) * 10;
        ctx.fillStyle = i % 2 === 0 ? "rgba(8,12,20,0.6)" : "rgba(18,22,35,0.66)";
        ctx.beginPath(); ctx.arc(x, FLOOR + 92 - hh, 16 + (i % 3) * 2, 0, TAU); ctx.fill();
        roundRect(ctx, x - 15, FLOOR + 104 - hh, 30, 44, 12); ctx.fill();
      }
      // theme prop strip
      this.drawProp(ctx, t.prop);
    }
    drawProp(ctx, prop) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      if (prop === "blackboard") {
        ctx.fillStyle = "rgb(26,52,40)";
        roundRect(ctx, W / 2 - 290, 196, 580, 210, 14); ctx.fill();
        ctx.strokeStyle = "rgba(247,238,217,0.6)";
        ctx.lineWidth = 5;
        roundRect(ctx, W / 2 - 290, 196, 580, 210, 14); ctx.stroke();
        ctx.strokeStyle = "rgba(240,236,220,0.55)";
        ctx.lineWidth = 3;
        ctx.font = font(34, true);
        ctx.fillStyle = "rgba(240,236,220,0.65)";
        ctx.textAlign = "center";
        ctx.fillText("¥2000 > $3000", W / 2, 260);
        ctx.beginPath();
        ctx.moveTo(W / 2 - 240, 330);
        for (let i = 0; i <= 24; i++) {
          const x = W / 2 - 240 + i * 20;
          ctx.lineTo(x, 330 - Math.sin(i * 0.6) * 26 - i * 2);
        }
        ctx.stroke();
      } else if (prop === "studio") {
        for (let i = 0; i < 3; i++) {
          const x = W / 2 + (i - 1) * 330;
          ctx.fillStyle = "rgba(14,18,32,0.9)";
          roundRect(ctx, x - 60, 150, 120, 76, 10); ctx.fill();
          ctx.fillStyle = "rgba(88,160,255,0.32)";
          roundRect(ctx, x - 52, 158, 104, 60, 7); ctx.fill();
        }
      } else if (prop === "phones") {
        for (let i = 0; i < 5; i++) {
          const x = 260 + i * 240;
          ctx.fillStyle = "rgba(20,24,40,0.92)";
          roundRect(ctx, x, 200 + (i % 2) * 36, 64, 120, 12); ctx.fill();
          ctx.fillStyle = i % 2 ? "rgba(116,214,146,0.35)" : "rgba(170,200,255,0.3)";
          roundRect(ctx, x + 6, 208 + (i % 2) * 36, 52, 96, 8); ctx.fill();
        }
      } else if (prop === "ticker") {
        ctx.fillStyle = "rgba(34,18,23,0.85)";
        ctx.fillRect(0, 180, W, 44);
        ctx.fillRect(0, 250, W, 44);
        ctx.font = font(26, true);
        ctx.fillStyle = "rgba(246,214,156,0.5)";
        ctx.textAlign = "left";
        ctx.fillText("#热搜  #社评  #A股日记  #老胡锐评  #复杂的中国", 60, 209);
        ctx.fillText("#连夜发文  #口风微调  #不装了  #回旋余地", 240, 279);
      } else if (prop === "street") {
        for (let i = 0; i < 6; i++) {
          const x = 140 + i * 220;
          const hh = 140 + (i % 3) * 60;
          ctx.fillStyle = "rgba(18,16,26,0.9)";
          ctx.fillRect(x, 420 - hh, 130, hh + 120);
          ctx.fillStyle = "rgba(245,206,120,0.25)";
          for (let wy = 0; wy < 4; wy++) {
            for (let wx = 0; wx < 3; wx++) {
              if ((i + wx + wy) % 3 === 0) ctx.fillRect(x + 14 + wx * 38, 436 - hh + wy * 46, 22, 28);
            }
          }
        }
        // 东百往事 graffiti
        ctx.font = font(24, true);
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(245,206,120,0.5)";
        ctx.save();
        ctx.translate(200, 470); ctx.rotate(-0.05);
        ctx.fillText("指定没有你好果汁吃", 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(880, 500); ctx.rotate(0.04);
        ctx.fillStyle = "rgba(194,116,84,0.55)";
        ctx.fillText("你太baby辣", 0, 0);
        ctx.restore();
      } else if (prop === "gallows") {
        ctx.strokeStyle = "rgba(255,93,161,0.5)";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(W / 2 - 320, FLOOR - 20); ctx.lineTo(W / 2 - 320, 170);
        ctx.lineTo(W / 2 + 320, 170); ctx.lineTo(W / 2 + 320, FLOOR - 20);
        ctx.stroke();
        ctx.setLineDash([18, 14]);
        ctx.strokeStyle = "rgba(255,93,161,0.65)";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(W / 2 - 320, 280); ctx.lineTo(W / 2 + 320, 280); ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = font(30, true);
        ctx.fillStyle = "rgba(255,200,228,0.55)";
        ctx.textAlign = "center";
        ctx.fillText("月末账单已生成", W / 2, 250);
      }
      ctx.restore();
    }
    update(dt) {
      for (const b of this.bubbles) {
        b.phase += dt * b.speed * 0.12;
        b.y += Math.sin(b.phase) * dt * 10;
      }
    }
    draw(ctx, pulse, showBanner) {
      ctx.drawImage(this.canvas, 0, 0);
      // pulsing stage lights
      const lights = [D.C.red, D.C.cyan, D.C.gold, D.C.pink, D.C.purple];
      for (let i = 0; i < lights.length; i++) {
        const d = 140 + i * 45;
        const a = 0.1 + Math.abs(Math.sin(pulse * 0.7 + i)) * 0.08;
        let x = 130 + i * 260;
        ctx.fillStyle = rgb(lights[i], a);
        ctx.beginPath(); ctx.arc(Math.min(x, W - 160), 90 + (i % 2) * 26, d / 2, 0, TAU); ctx.fill();
      }
      // keyword bubbles
      for (const b of this.bubbles) {
        ctx.fillStyle = "rgba(245,245,255,0.1)";
        roundRect(ctx, b.x, b.y, b.width, 38, 19); ctx.fill();
        ctx.strokeStyle = "rgba(247,223,181,0.3)";
        ctx.lineWidth = 1;
        roundRect(ctx, b.x, b.y, b.width, 38, 19); ctx.stroke();
        strokedText(ctx, b.label, b.x + b.width / 2, b.y + 20, font(15), "rgba(247,238,219,0.85)", 0);
      }
      if (!showBanner) return;
      // stage banner (kept clear of the fight HUD)
      const bx = W / 2 - 264;
      ctx.fillStyle = "rgba(14,18,31,0.76)";
      roundRect(ctx, bx, 156, 528, 78, 26); ctx.fill();
      ctx.strokeStyle = "rgba(247,227,177,0.45)";
      ctx.lineWidth = 2;
      roundRect(ctx, bx, 156, 528, 78, 26); ctx.stroke();
      strokedText(ctx, this.theme.name, W / 2, 186 + Math.sin(pulse * 2) * 2, font(26, true), "rgb(247,241,233)", 4);
      strokedText(ctx, this.theme.subtitle, W / 2, 216, font(14), "rgb(177,188,210)", 0);
    }
  }

  // ---------- announcer ----------
  const announcer = { items: [] };
  function announce(text, { sub = "", dur = 1.1, size = 92, color = [247, 241, 233] } = {}) {
    announcer.items.push({ text, sub, age: 0, dur, size, color });
    AU.announce();
  }
  function updateAnnouncer(dt) {
    for (let i = announcer.items.length - 1; i >= 0; i--) {
      announcer.items[i].age += dt;
      if (announcer.items[i].age > announcer.items[i].dur) announcer.items.splice(i, 1);
    }
  }
  function drawAnnouncer(ctx) {
    for (const a of announcer.items) {
      const tIn = clamp(a.age / 0.16, 0, 1);
      const tOut = clamp((a.dur - a.age) / 0.25, 0, 1);
      const scale = lerp(1.55, 1.0, 1 - Math.pow(1 - tIn, 3));
      ctx.globalAlpha = Math.min(tIn, tOut);
      strokedText(ctx, a.text, W / 2, H / 2 - 60, font(a.size * scale, true), rgb(a.color), 10);
      if (a.sub) strokedText(ctx, a.sub, W / 2, H / 2 + 14, font(26, true), "rgb(220,226,240)", 5);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- game ----------
  class Game {
    constructor(headImages) {
      this.heads = headImages;
      this.backdrop = new Backdrop();
      this.killLine = new KillLine();
      this.state = "menu";
      this.selected = 0;
      this.difficulty = 1;
      this.elapsed = 0;
      this.hitstop = 0;
      this.slowmo = 1;
      this.slowmoTimer = 0;
      this.paused = false;
      this.banner = { timer: 0, text: "", sub: "" };
      this.matchIntroTimer = 0;
      this.freezeTimer = 0;
      this.roundTime = S.roundTime;
      this.playerRounds = 0;
      this.opponentRounds = 0;
      this.matchIndex = 0;
      this.arcadeClears = 0;
      this.campaignVictory = false;
      this.campaignWinner = null;
      this.stage = D.stages[0];
      this.projectiles = [];
      this.player = null;
      this.opponent = null;
      this.queue = [];
      this.aiState = {};
      this.playerAiState = {};
      this.keys = { left: false, right: false, up: false, down: false, guard: false };
      this.keys2 = { left: false, right: false, up: false, down: false, guard: false };
      this.pendingJump = 0;
      this.pendingJump2 = 0;
      this.attackBuffer = null; // {button, time}
      this.mode = "arcade"; // arcade | versus
      this.menuPhase = 0;   // versus: 0 = P1 picking, 1 = P2 picking
      this.selected2 = 2;
      this.ticker = { index: 0, timer: 4.5, hold: 0, text: D.ticker[0] };
      this.fightSignal = false;
      this.autoplay = false;
    }
    bp(i) { return D.fighters[i]; }
    bpByKey(key) { return D.fighters.find(f => f.key === key); }
    setTicker(text, hold = 2.2) {
      this.ticker.text = text; this.ticker.hold = hold; this.ticker.timer = 5;
    }
    cycleTicker(dt) {
      if (this.ticker.hold > 0) { this.ticker.hold = Math.max(0, this.ticker.hold - dt); return; }
      this.ticker.timer -= dt;
      if (this.ticker.timer <= 0) {
        this.ticker.index = (this.ticker.index + 1) % D.ticker.length;
        this.ticker.text = D.ticker[this.ticker.index];
        this.ticker.timer = 5.5;
      }
    }
    difficultyProfile() {
      return D.difficulties[Math.min(2, this.difficulty + this.matchIndex)];
    }
    chooseQueue(playerBp) {
      const remaining = D.fighters.filter(f => f.key !== playerBp.key);
      const finalKey = playerBp.key !== "lao_a_budget" ? "lao_a_budget" : "hu_xijin_editor";
      const boss = this.bpByKey(finalKey);
      const pool = remaining.filter(f => f.key !== finalKey);
      const early = [];
      while (early.length < S.arcadeMatches - 1 && pool.length) {
        early.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
      }
      return [...early, boss];
    }
    resetCampaign() {
      const pbp = this.bp(this.selected);
      this.queue = this.chooseQueue(pbp);
      this.matchIndex = 0;
      this.arcadeClears = 0;
      this.campaignWinner = null;
      this.campaignVictory = false;
      this.startMatch();
    }
    startMatch() {
      const pbp = this.bp(this.selected);
      const obp = this.queue[this.matchIndex];
      this.stage = D.stages[obp.stageTheme];
      this.backdrop.setTheme(this.stage);
      this.player = new Fighter(pbp, this.heads[pbp.key], 166, 1, true);
      this.opponent = new Fighter(obp, this.heads[obp.key], W - 298, -1, false);
      this.playerRounds = 0; this.opponentRounds = 0;
      this.projectiles.length = 0;
      floatTexts.length = 0;
      this.killLine.reset();
      const r = this.difficultyProfile().reaction;
      this.playerAiState = { decisionTimer: r, moveAxis: 0, guardTimer: 0 };
      this.aiState = { decisionTimer: r * 0.9, moveAxis: 0, guardTimer: 0 };
      this.state = "match_intro";
      this.matchIntroTimer = S.matchIntroTime;
      this.setTicker(`进入 ${this.stage.name}。`, 2.0);
    }
    startVersusMatch() {
      const pbp = this.bp(this.selected);
      const obp = this.bp(this.selected2);
      this.stage = D.stages[obp.stageTheme];
      this.backdrop.setTheme(this.stage);
      this.player = new Fighter(pbp, this.heads[pbp.key], 166, 1, true);
      this.opponent = new Fighter(obp, this.heads[obp.key], W - 298, -1, false);
      this.playerRounds = 0; this.opponentRounds = 0;
      this.projectiles.length = 0;
      floatTexts.length = 0;
      this.killLine.reset();
      this.matchIndex = 0;
      this.state = "match_intro";
      this.matchIntroTimer = S.matchIntroTime;
      this.setTicker(`双人对战:进入 ${this.stage.name}。`, 2.0);
    }
    startRound() {
      this.player.reset(166, 1);
      this.opponent.reset(W - 298, -1);
      this.projectiles.length = 0;
      floatTexts.length = 0;
      this.killLine.reset();
      this.pendingJump = 0;
      this.pendingJump2 = 0;
      this.roundTime = S.roundTime;
      this.state = "round_intro";
      this.banner.timer = S.introTime;
      const n = this.playerRounds + this.opponentRounds + 1;
      announce(`ROUND ${n}`, { dur: S.introTime, size: 88 });
      AU.roundBell();
      this.fightSignal = false;
      camera.x = W / 2; camera.y = H / 2; camera.zoom = 1;
    }
    attackDirection(keys) {
      const k = keys || this.keys;
      if (k.up) return "up";
      if (k.down) return "down";
      if (k.left && !k.right) return "left";
      if (k.right && !k.left) return "right";
      return "neutral";
    }
    applyMove(fighter, result) {
      if (!result) return false;
      if (result.projectiles && result.projectiles.length) this.projectiles.push(...result.projectiles);
      addFloatText(result.label, fighter.cx, fighter.cy - 110, result.color || fighter.bp.accent2, !!result.isUlt);
      if (result.isUlt) {
        camera.addTrauma(0.34);
        this.hitstop = Math.max(this.hitstop, 0.1);
        announce(result.label, { sub: fighter.bp.taunt, dur: 1.1, size: 56, color: fighter.bp.accent2 });
      }
      this.setTicker(`${fighter.bp.name} 使用了 ${result.label}。`, 1.5);
      if (result.forceKillLine) {
        this.killLine.forceTrigger();
        AU.killLineWarn();
      }
      return true;
    }
    playerAttack(button) {
      if (!this.player) return;
      const dir = this.attackDirection();
      if (dir === "up") this.pendingJump = 0;
      let res = null;
      if (button === "basic") res = this.player.useBasic(dir);
      else if (button === "skill") res = this.player.useSkill(dir);
      else res = this.player.useUltimate();
      if (!this.applyMove(this.player, res) && button !== "ult") {
        this.attackBuffer = { button, time: 0.12 }; // 7f buffer
      }
    }
    finishRound(winner, reason) {
      if (this.state === "round_over" || this.state === "campaign_over") return;
      if (winner === this.player) {
        this.playerRounds += 1;
        this.banner.sub = `${this.player.bp.name} 拿下本回合`;
      } else if (winner === this.opponent) {
        this.opponentRounds += 1;
        this.banner.sub = `${this.opponent.bp.name} 拿下本回合`;
      } else {
        this.banner.sub = "平局,双方都在硬发帖。";
      }
      this.banner.text = reason;
      this.state = "round_over";
      this.freezeTimer = S.roundFreezeTime;
      if (reason === "KO" || reason === "DOUBLE KO") {
        const loser = winner === this.player ? this.opponent : this.player;
        announce("K.O.", { dur: 1.3, size: 150, color: [255, 120, 120] });
        AU.ko();
        koExplosion(loser.cx, loser.cy, loser.bp.accent);
        camera.addTrauma(0.85);
        camera.punchIn(loser, 1.0);
        this.slowmo = 0.28; this.slowmoTimer = 0.9;
      } else {
        announce(reason === "TIME" ? "TIME UP" : reason, { dur: 1.2, size: 92 });
      }
    }
    resolveMatchEnd() {
      if (this.mode === "versus") {
        this.campaignVictory = true;
        this.campaignWinner = this.playerRounds >= S.roundsToWin ? this.player.bp : this.opponent.bp;
        this.state = "campaign_over";
        return;
      }
      if (this.playerRounds >= S.roundsToWin) {
        this.arcadeClears += 1;
        if (this.matchIndex + 1 >= this.queue.length) {
          this.campaignVictory = true;
          this.campaignWinner = this.player.bp;
          this.state = "campaign_over";
        } else {
          this.matchIndex += 1;
          this.startMatch();
        }
        return;
      }
      if (this.opponentRounds >= S.roundsToWin) {
        this.campaignVictory = false;
        this.campaignWinner = this.opponent.bp;
        this.state = "campaign_over";
      }
    }

    onProjectileHit(source, target, proj, blocked) {
      const heavy = proj.damage >= 10;
      source.gainMeter(proj.damage * (blocked ? 0.65 : 1.0));
      if (blocked) {
        this.hitstop = Math.max(this.hitstop, 0.05);
        camera.addTrauma(0.08);
        sparkBurst(proj.x, proj.y, [140, 190, 255], 5, 240, 0.16, false);
        addFloatText("BLOCK", target.cx, target.cy - 88, target.bp.accent2);
        AU.block();
      } else {
        this.hitstop = Math.max(this.hitstop, heavy ? 0.13 : 0.07);
        camera.addTrauma(heavy ? 0.36 : 0.2);
        sparkBurst(proj.x, proj.y, source.bp.accent2, heavy ? 14 : 8, heavy ? 480 : 330, 0.2, heavy);
        addFloatText(`-${proj.damage}`, target.cx, target.cy - 88, D.C.gold);
        if (heavy) AU.hitHeavy(); else AU.hitLight();
        // combo tracking
        if (source.comboTimer > 0) source.combo += 1;
        else source.combo = 1;
        source.comboTimer = 1.1;
        source.comboPop = 0.12;
      }
    }

    incomingProjectileNear(ownerKey, target, maxDist = 220) {
      for (const p of this.projectiles) {
        if (p.owner !== ownerKey) continue;
        if (Math.abs(p.x - target.cx) < maxDist && Math.abs(p.y - target.cy) < 120) return true;
      }
      return false;
    }
    updateAI(fighter, target, state, dt) {
      const prof = this.difficultyProfile();
      fighter.faceTarget(target.cx);
      state.decisionTimer -= dt;
      state.guardTimer = Math.max(0, state.guardTimer - dt);
      if (state.guardTimer > 0) fighter.guardRequested = true;
      else fighter.guardRequested = false;

      const incoming = this.incomingProjectileNear(target.uid, fighter);
      if (incoming && fighter.onGround && Math.random() < prof.guard) {
        state.guardTimer = prof.reaction * 1.1;
        fighter.guardRequested = true;
      }
      if (state.decisionTimer > 0) {
        fighter.setMove(state.moveAxis || 0);
        return;
      }
      state.decisionTimer = prof.reaction * rand(0.85, 1.2);
      const distance = target.cx - fighter.cx;
      const absD = Math.abs(distance);
      const targetAbove = target.cy < fighter.cy - 32;
      const toward = distance > 0 ? 1 : -1;
      const dir = distance > 0 ? "right" : "left";
      state.moveAxis = 0;

      if (this.killLine.phase === "warning" && fighter.onGround && Math.random() < 0.75) fighter.jump();

      if (fighter.meter >= S.maxMeter && (absD < 640 || Math.random() < prof.aggression)) {
        this.applyMove(fighter, fighter.useUltimate());
        return;
      }
      if (target.hitstun > 0 && absD < 220 && Math.random() < prof.combo) {
        this.applyMove(fighter, fighter.useSkill(dir));
        return;
      }
      if (targetAbove && Math.random() < prof.antiAir) {
        this.applyMove(fighter, fighter.useBasic("up"));
        return;
      }
      if (absD < 160) {
        const style = fighter.bp.aiStyle;
        if ((style === "rush" || style === "brawler") && Math.random() < prof.aggression) {
          this.applyMove(fighter, fighter.useSkill(dir));
        } else if (Math.random() < 0.55) {
          this.applyMove(fighter, fighter.useBasic("down"));
        } else {
          this.applyMove(fighter, fighter.useBasic(dir));
        }
        state.moveAxis = (style === "rush" || style === "brawler") ? toward : -toward;
        return;
      }
      if (absD > fighter.bp.range + 80) {
        state.moveAxis = toward;
        if (Math.random() < prof.aggression * 0.45) this.applyMove(fighter, fighter.useSkill(dir));
        return;
      }
      if (absD < fighter.bp.range - 100) {
        const style = fighter.bp.aiStyle;
        state.moveAxis = (style !== "rush" && style !== "brawler") ? -toward : toward;
        if (Math.random() < 0.42) this.applyMove(fighter, fighter.useBasic(toward > 0 ? "left" : "right"));
        return;
      }
      const roll = Math.random();
      if (roll < 0.22) this.applyMove(fighter, fighter.useBasic("neutral"));
      else if (roll < 0.42) this.applyMove(fighter, fighter.useSkill("neutral"));
      else if (roll < 0.56) this.applyMove(fighter, fighter.useBasic(dir));
      else if (roll < 0.68) this.applyMove(fighter, fighter.useSkill(dir));
      else if (roll < 0.78) this.applyMove(fighter, fighter.useBasic("down"));
      else if (roll < 0.86) this.applyMove(fighter, fighter.useSkill(toward > 0 ? "left" : "right"));
      else if (fighter.dashCd <= 0 && Math.random() < prof.aggression) fighter.dash();
      else state.moveAxis = 0;
      if (target.onGround && Math.random() < 0.09) fighter.jump();
    }

    updateProjectiles(dt) {
      if (!this.player || !this.opponent) return;
      const anchors = {
        [this.player.uid]: { x: this.player.cx, y: this.player.cy },
        [this.opponent.uid]: { x: this.opponent.cx, y: this.opponent.cy },
      };
      const kept = [];
      for (const p of this.projectiles) {
        if (!p.update(dt, anchors)) continue;
        if (p.x < -200 || p.x > W + 200 || p.y < -220 || p.y > H + 220) continue;
        const source = p.owner === this.player.uid ? this.player : this.opponent;
        const target = source === this.player ? this.opponent : this.player;
        const r = p.rect, hb = target.hurtbox;
        const overlap = r.x < hb.x + hb.w && r.x + r.w > hb.x && r.y < hb.y + hb.h && r.y + r.h > hb.y;
        if (target.reflectTimer > 0 && overlap) {
          p.owner = target.uid;
          p.anchorOwner = target.uid;
          p.vx *= -1;
          p.returning = false;
          addFloatText(target.bp.reflectLine || "REFLECT", target.cx, target.cy - 92, target.bp.accent2, !!target.bp.reflectLine);
          AU.reflect();
          this.setTicker(`${target.bp.name} 反弹了 ${p.label}。`, 1.4);
          kept.push(p);
          continue;
        }
        if (overlap) {
          const knockDir = target.cx >= source.cx ? 1 : -1;
          const [landed, blocked] = target.takeDamage(p.damage, knockDir, p.knockbackY);
          if (landed) this.onProjectileHit(source, target, p, blocked);
          continue;
        }
        kept.push(p);
      }
      this.projectiles = kept;
    }
    updateKillLine(dt) {
      if (!this.player || !this.opponent) return;
      if (!this.killLine.used &&
        (this.player.healthRatio <= S.lowHealthThreshold || this.opponent.healthRatio <= S.lowHealthThreshold)) {
        if (this.killLine.trigger()) {
          addFloatText("牢A incoming", W / 2, FLOOR - 118, D.C.pink, true);
          this.setTicker("检测到低血量,牢A 正在画斩杀线。", 2.0);
          AU.killLineWarn();
        }
      }
      const evt = this.killLine.update(dt);
      if (evt === "fire") {
        this.setTicker("牢A 到场,斩杀线生效。", 1.8);
        announce("斩杀线", { sub: "你已经踩进斩杀线了", dur: 0.9, size: 64, color: D.C.pink });
        AU.killLineFire();
        camera.addTrauma(0.4);
      }
      if (this.killLine.phase !== "active") return;
      const band = this.killLine.band;
      for (const f of [this.player, this.opponent]) {
        const hb = f.hurtbox;
        const overlap = band.x < hb.x + hb.w && band.x + band.w > hb.x && band.y < hb.y + hb.h && band.y + band.h > hb.y;
        if (this.killLine.canHit(f.uid) && overlap) {
          const dir = f === this.player ? -1 : 1;
          const [landed, blocked] = f.takeDamage(this.killLine.damage, dir, -540);
          if (landed) {
            this.killLine.hits.add(f.uid);
            addFloatText("斩杀线!", f.cx, f.cy - 104, D.C.pink, true);
            sparkBurst(f.cx, f.cy, D.C.pink, 16, 520, 0.24, true);
            this.hitstop = Math.max(this.hitstop, 0.12);
            camera.addTrauma(0.45);
            AU.hitHeavy();
            if (blocked) addFloatText("Guarded", f.cx, f.cy - 74, f.bp.accent2);
          }
        }
      }
    }

    update(dt) {
      this.elapsed += dt;
      this.backdrop.update(dt);
      this.cycleTicker(dt);
      updateAnnouncer(dt);
      updateParticles(dt);
      updateFloatTexts(dt);

      // slow-mo decay
      if (this.slowmoTimer > 0) {
        this.slowmoTimer -= dt;
        if (this.slowmoTimer <= 0) this.slowmo = 1;
      }

      if (this.state === "menu" || this.paused) return;

      camera.update(dt, this.player, this.opponent);

      if (this.state === "match_intro") {
        this.matchIntroTimer -= dt;
        if (this.matchIntroTimer <= 0) this.startRound();
        return;
      }
      if (this.state === "round_intro") {
        this.banner.timer -= dt;
        if (this.banner.timer <= 0) {
          this.state = "playing";
          announce("FIGHT!", { dur: 0.7, size: 110, color: [255, 210, 110] });
          camera.addTrauma(0.3);
          this.fightSignal = true;
        }
        return;
      }
      if (this.state === "round_over") {
        this.freezeTimer -= dt;
        if (this.freezeTimer <= 0) {
          if (this.playerRounds >= S.roundsToWin || this.opponentRounds >= S.roundsToWin) this.resolveMatchEnd();
          else this.startRound();
        }
        return;
      }
      if (this.state !== "playing" || !this.player || !this.opponent) return;

      // hit-stop gates fighters + projectiles, not FX
      if (this.hitstop > 0) {
        this.hitstop -= dt;
        return;
      }

      const gdt = dt * this.slowmo;

      if (!this.autoplay) {
        let axis = 0;
        if (this.keys.left && !this.keys.right) axis = -1;
        else if (this.keys.right && !this.keys.left) axis = 1;
        this.player.setMove(axis);
        this.player.fastFall = this.keys.down;
        this.player.guardRequested = this.keys.guard;

        if (this.pendingJump > 0) {
          this.pendingJump -= gdt;
          if (this.pendingJump <= 0 && this.keys.up) this.player.jump();
        }
        if (this.attackBuffer) {
          this.attackBuffer.time -= gdt;
          if (this.attackBuffer.time <= 0) this.attackBuffer = null;
          else {
            const dir = this.attackDirection();
            const res = this.attackBuffer.button === "basic" ? this.player.useBasic(dir) : this.player.useSkill(dir);
            if (this.applyMove(this.player, res)) this.attackBuffer = null;
          }
        }
      } else {
        this.updateAI(this.player, this.opponent, this.playerAiState, gdt);
      }
      if (this.mode === "versus" && !this.autoplay) {
        let axis2 = 0;
        if (this.keys2.left && !this.keys2.right) axis2 = -1;
        else if (this.keys2.right && !this.keys2.left) axis2 = 1;
        this.opponent.setMove(axis2);
        this.opponent.fastFall = this.keys2.down;
        this.opponent.guardRequested = this.keys2.guard;
        if (this.pendingJump2 > 0) {
          this.pendingJump2 -= gdt;
          if (this.pendingJump2 <= 0 && this.keys2.up) this.opponent.jump();
        }
      } else {
        this.updateAI(this.opponent, this.player, this.aiState, gdt);
      }
      this.player.faceTarget(this.opponent.cx);
      this.opponent.faceTarget(this.player.cx);
      this.player.update(gdt, W);
      this.opponent.update(gdt, W);
      this.updateProjectiles(gdt);
      this.updateKillLine(gdt);

      this.roundTime = Math.max(0, this.roundTime - gdt);
      if (this.player.health <= 0 && this.opponent.health <= 0) this.finishRound(null, "DOUBLE KO");
      else if (this.player.health <= 0) this.finishRound(this.opponent, "KO");
      else if (this.opponent.health <= 0) this.finishRound(this.player, "KO");
      else if (this.roundTime <= 0) {
        const ph = Math.floor(this.player.health), oh = Math.floor(this.opponent.health);
        if (ph > oh) this.finishRound(this.player, "TIME");
        else if (oh > ph) this.finishRound(this.opponent, "TIME");
        else this.finishRound(null, "TIME");
      }
    }

    // ---------- drawing ----------
    drawHud(ctx) {
      const p = this.player, o = this.opponent;
      if (!p || !o) return;
      this.drawHealthBlock(ctx, p, 22, false);
      this.drawHealthBlock(ctx, o, W - 440, true);

      // timer
      ctx.fillStyle = "rgba(15,19,31,0.84)";
      roundRect(ctx, W / 2 - 80, 16, 160, 96, 20); ctx.fill();
      ctx.strokeStyle = "rgba(248,227,176,0.7)";
      ctx.lineWidth = 2;
      roundRect(ctx, W / 2 - 80, 16, 160, 96, 20); ctx.stroke();
      const t = Math.max(0, Math.ceil(this.roundTime));
      strokedText(ctx, String(t).padStart(2, "0"), W / 2, 56, font(46, true), t <= 10 ? "rgb(255,130,120)" : "rgb(247,246,241)", 5);
      const modeLabel = this.mode === "versus"
        ? "双人对战 · BO3"
        : `Arcade ${this.matchIndex + 1}/${S.arcadeMatches} · ${this.difficultyProfile().name}`;
      strokedText(ctx, modeLabel, W / 2, 94, font(13, true), "rgb(177,188,210)", 0);

      // combo counters
      for (const [f, x, align] of [[p, 460, "left"], [o, W - 460, "right"]]) {
        if (f.combo >= 2) {
          const pop = 1 + f.comboPop * 4;
          const col = f.combo >= 8 ? [255, 110, 110] : f.combo >= 5 ? [255, 168, 90] : f.combo >= 3 ? [255, 220, 110] : [240, 240, 240];
          ctx.save();
          ctx.translate(x, 160);
          ctx.scale(pop, pop);
          strokedText(ctx, `${f.combo} HITS`, 0, 0, font(34, true), rgb(col), 6);
          ctx.restore();
        }
      }

      // ticker
      ctx.fillStyle = "rgba(14,17,29,0.74)";
      roundRect(ctx, 28, H - 50, W - 56, 32, 14); ctx.fill();
      strokedText(ctx, this.ticker.text, W / 2, H - 34, font(15, true), "rgb(247,246,241)", 0);
    }
    drawHealthBlock(ctx, f, x, flip) {
      ctx.fillStyle = "rgba(15,19,31,0.84)";
      roundRect(ctx, x, 16, 418, 128, 20); ctx.fill();
      ctx.strokeStyle = "rgba(248,227,176,0.7)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, 16, 418, 128, 20); ctx.stroke();

      // portrait token
      const img = f.head;
      const tx = flip ? x + 418 - 14 - 76 : x + 14;
      if (img && img.complete) ctx.drawImage(img, tx, 26, 76, 76);
      ctx.font = font(17, true);
      ctx.textAlign = flip ? "right" : "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgb(247,246,241)";
      ctx.fillText(f.bp.name, flip ? tx - 12 : x + 102, 38);

      const bx = flip ? x + 16 : x + 102;
      const bw = 296;
      // health with ghost
      const ghostRatio = clamp(f.displayedHealth / S.maxHealth, 0, 1);
      ctx.fillStyle = "rgb(46,52,68)";
      roundRect(ctx, bx, 54, bw, 22, 10); ctx.fill();
      ctx.fillStyle = "rgba(255,120,110,0.85)";
      if (ghostRatio > 0) { roundRect(ctx, bx + 2, 56, (bw - 4) * ghostRatio, 18, 8); ctx.fill(); }
      const belowLine = f.healthRatio <= S.lowHealthThreshold;
      ctx.fillStyle = belowLine
        ? `rgba(255,${93 + Math.abs(Math.sin(this.elapsed * 8)) * 80},161,1)`
        : rgb(f.bp.accent);
      if (f.healthRatio > 0) { roundRect(ctx, bx + 2, 56, (bw - 4) * f.healthRatio, 18, 8); ctx.fill(); }
      ctx.strokeStyle = "rgb(248,236,212)";
      ctx.lineWidth = 2;
      roundRect(ctx, bx, 54, bw, 22, 10); ctx.stroke();
      // 牢A execution threshold tick on the health bar
      const lineX = bx + 2 + (bw - 4) * S.lowHealthThreshold;
      ctx.strokeStyle = belowLine ? "rgb(255,93,161)" : "rgba(255,93,161,0.75)";
      ctx.lineWidth = belowLine ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(lineX, 50); ctx.lineTo(lineX, 80); ctx.stroke();
      if (belowLine) {
        strokedText(ctx, "斩杀线", lineX, 44, font(11, true), "rgb(255,150,195)", 3);
      }
      // guard
      ctx.fillStyle = "rgb(39,43,60)";
      roundRect(ctx, bx, 82, bw, 10, 5); ctx.fill();
      ctx.fillStyle = rgb(f.bp.accent2);
      if (f.guardRatio > 0) { roundRect(ctx, bx + 1, 83, (bw - 2) * f.guardRatio, 8, 4); ctx.fill(); }
      // meter
      const full = f.meter >= S.maxMeter;
      ctx.fillStyle = "rgb(32,24,42)";
      roundRect(ctx, bx, 98, bw, 14, 7); ctx.fill();
      const mw = (bw - 2) * f.meterRatio;
      if (mw > 0) {
        ctx.fillStyle = full ? `rgba(255,${160 + Math.sin(this.elapsed * 10) * 60},220,1)` : rgb(D.C.pink);
        roundRect(ctx, bx + 1, 99, mw, 12, 6); ctx.fill();
      }
      if (full) {
        strokedText(ctx, "U!", flip ? bx - 14 : bx + bw + 14, 105, font(15, true), rgb(D.C.pink), 3);
      }
      // round pips
      for (let i = 0; i < S.roundsToWin; i++) {
        const won = i < (f === this.player ? this.playerRounds : this.opponentRounds);
        const px = flip ? x + 418 - 30 - i * 24 : x + 30 + i * 24;
        ctx.fillStyle = won ? rgb(f.bp.accent2) : "rgb(70,77,95)";
        ctx.beginPath(); ctx.arc(px, 128, 8, 0, TAU); ctx.fill();
      }
      ctx.textAlign = "left";
    }
    drawMenu(ctx) {
      // headline rivals flanking the title
      const bob = Math.sin(this.elapsed * 2.4) * 5;
      const imgL = this.heads["chen_ping_macro"];
      const imgR = this.heads["zhang_weiwei_civil"];
      ctx.save();
      ctx.translate(W / 2 - 360, 62 + bob);
      ctx.rotate(-0.1);
      if (imgL && imgL.complete) ctx.drawImage(imgL, -52, -52, 104, 104);
      ctx.restore();
      ctx.save();
      ctx.translate(W / 2 + 360, 62 - bob);
      ctx.rotate(0.1);
      ctx.scale(-1, 1);
      if (imgR && imgR.complete) ctx.drawImage(imgR, -52, -52, 104, 104);
      ctx.restore();
      // VS bolts
      ctx.strokeStyle = rgb(D.C.gold, 0.55 + Math.abs(Math.sin(this.elapsed * 5)) * 0.3);
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + sgn * 300, 40);
        ctx.lineTo(W / 2 + sgn * 278, 58);
        ctx.lineTo(W / 2 + sgn * 292, 64);
        ctx.lineTo(W / 2 + sgn * 272, 84);
        ctx.stroke();
      }
      strokedText(ctx, "梗图格斗:陈平 VS 张维为", W / 2, 52, font(44, true), "rgb(247,246,241)", 8);
      strokedText(ctx, "选择人设形态 · 方向 + J/K 改变招式 · 通关三场街机阶梯", W / 2, 96, font(18), "rgb(177,188,210)", 0);

      const leftP = { x: 34, y: 130, w: 900, h: 680 };
      const rightP = { x: 960, y: 130, w: 486, h: 680 };
      for (const pn of [leftP, rightP]) {
        ctx.fillStyle = "rgba(15,20,33,0.82)";
        roundRect(ctx, pn.x, pn.y, pn.w, pn.h, 28); ctx.fill();
        ctx.strokeStyle = "rgba(248,223,178,0.8)";
        ctx.lineWidth = 2;
        roundRect(ctx, pn.x, pn.y, pn.w, pn.h, 28); ctx.stroke();
      }

      const cw = 280, chh = 206;
      for (let i = 0; i < D.fighters.length; i++) {
        const bp = D.fighters[i];
        const row = (i / 3) | 0, col = i % 3;
        const rx = leftP.x + 16 + col * (cw + 12);
        const ry = leftP.y + 16 + row * (chh + 14);
        const sel = i === this.selected;
        const sel2 = this.mode === "versus" && i === this.selected2;
        if (sel || sel2) {
          ctx.fillStyle = rgb(sel ? bp.accent2 : D.C.pink, 0.22 + Math.abs(Math.sin(this.elapsed * 2.2)) * 0.13);
          roundRect(ctx, rx - 6, ry - 6, cw + 12, chh + 12, 22); ctx.fill();
        }
        ctx.fillStyle = "rgba(18,24,38,0.85)";
        roundRect(ctx, rx, ry, cw, chh, 18); ctx.fill();
        ctx.strokeStyle = sel ? rgb(bp.accent) : sel2 ? rgb(D.C.pink) : "rgb(96,106,132)";
        ctx.lineWidth = sel || sel2 ? 3 : 2;
        roundRect(ctx, rx, ry, cw, chh, 18); ctx.stroke();
        if (sel) strokedText(ctx, "P1", rx + 24, ry + 18, font(14, true), rgb(bp.accent2), 3);
        if (sel2) strokedText(ctx, "P2", rx + cw - 24, ry + 18, font(14, true), rgb(D.C.pink), 3);

        const img = this.heads[bp.key];
        if (img && img.complete) ctx.drawImage(img, rx + 14, ry + 36, 118, 118);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = font(18, true);
        ctx.fillStyle = "rgb(247,246,241)";
        ctx.fillText(bp.name, rx + 142, ry + 42);
        ctx.font = font(13, true);
        ctx.fillStyle = rgb(bp.accent2);
        ctx.fillText(bp.title, rx + 142, ry + 68);
        ctx.font = font(13);
        ctx.fillStyle = "rgb(177,188,210)";
        ctx.fillText("J " + bp.basics.neutral, rx + 142, ry + 102);
        ctx.fillText("K " + bp.skills.neutral, rx + 142, ry + 124);
        ctx.fillText("U " + bp.ult, rx + 142, ry + 146);
        ctx.font = font(12);
        ctx.fillStyle = rgb(bp.accent, 0.9);
        ctx.fillText(bp.taunt, rx + 16, ry + 182);
      }

      // right detail panel
      const bp = this.bp(this.selected);
      const img = this.heads[bp.key];
      ctx.textAlign = "left";
      ctx.font = font(30, true);
      ctx.fillStyle = "rgb(247,246,241)";
      ctx.fillText(bp.name, rightP.x + 24, rightP.y + 40);
      ctx.font = font(16, true);
      ctx.fillStyle = rgb(bp.accent2);
      ctx.fillText(bp.title, rightP.x + 24, rightP.y + 72);
      if (img && img.complete) ctx.drawImage(img, rightP.x + rightP.w - 168, rightP.y + 20, 144, 144);
      ctx.font = font(15, true);
      ctx.fillStyle = rgb(bp.accent);
      if (this.mode === "versus") {
        const phase = this.menuPhase === 0 ? "P1 选人中(回车确认)" : "P2 选人中(回车开打)";
        ctx.fillText(`双人对战 · ${phase} · V 切回街机`, rightP.x + 24, rightP.y + 108);
      } else {
        ctx.fillText(`AI 难度: ${D.difficulties[this.difficulty].name} (按 1/2/3) · V 双人对战`, rightP.x + 24, rightP.y + 108);
      }
      ctx.font = font(15);
      ctx.fillStyle = "rgb(177,188,210)";
      ctx.fillText(bp.blurb, rightP.x + 24, rightP.y + 142);

      const listJ = { x: rightP.x + 16, y: rightP.y + 190 };
      const listK = { x: rightP.x + 16, y: rightP.y + 392 };
      for (const [list, names, header] of [[listJ, bp.basics, "方向 + J 普攻"], [listK, bp.skills, "方向 + K 技能"]]) {
        ctx.fillStyle = "rgba(11,15,27,0.78)";
        roundRect(ctx, list.x, list.y, rightP.w - 32, 186, 18); ctx.fill();
        ctx.font = font(15, true);
        ctx.fillStyle = rgb(bp.accent2);
        ctx.fillText(header, list.x + 16, list.y + 24);
        const labels = { neutral: "·", up: "W", down: "S", left: "A", right: "D" };
        let y = list.y + 54;
        for (const d of DIRS) {
          ctx.font = font(14, true);
          ctx.fillStyle = "rgb(220,226,240)";
          ctx.fillText(labels[d], list.x + 20, y);
          ctx.font = font(14);
          ctx.fillStyle = "rgb(247,246,241)";
          ctx.fillText(names[d], list.x + 52, y);
          y += 26;
        }
      }
      ctx.font = font(15, true);
      ctx.fillStyle = rgb(bp.accent);
      ctx.fillText(`U  ${bp.ult}`, rightP.x + 24, rightP.y + 612);
      ctx.font = font(13);
      ctx.fillStyle = "rgb(177,188,210)";
      ctx.fillText("P1: WASD 移动 · J/K 攻击 · U 必杀 · L 冲刺 · Space 防御 · M 静音", rightP.x + 24, rightP.y + 648);
      if (this.mode === "versus") {
        ctx.fillText("P2: 方向键移动 · , . 攻击 · / 必杀 · ' 冲刺 · 右Shift 防御", rightP.x + 24, rightP.y + 668);
      }
    }
    drawMatchIntro(ctx) {
      ctx.fillStyle = "rgba(6,8,16,0.6)";
      ctx.fillRect(0, 0, W, H);
      const cw2 = 760, chh2 = 380;
      const cx = W / 2 - cw2 / 2, cy = H / 2 - chh2 / 2;
      ctx.fillStyle = rgb(this.player.bp.accent2, 0.2 + Math.abs(Math.sin(this.elapsed * 2)) * 0.17);
      roundRect(ctx, cx - 12, cy - 12, cw2 + 24, chh2 + 24, 36); ctx.fill();
      ctx.fillStyle = "rgba(16,20,32,0.93)";
      roundRect(ctx, cx, cy, cw2, chh2, 28); ctx.fill();
      ctx.strokeStyle = "rgba(248,223,178,0.85)";
      ctx.lineWidth = 2;
      roundRect(ctx, cx, cy, cw2, chh2, 28); ctx.stroke();

      const introLabel = this.mode === "versus"
        ? `双人对战 · ${this.stage.name}`
        : `Arcade ${this.matchIndex + 1}/${S.arcadeMatches} · ${this.stage.name} · AI ${this.difficultyProfile().name}`;
      strokedText(ctx, introLabel, W / 2, cy + 34, font(16, true), rgb(D.C.gold), 0);

      // slam-in portraits
      const t = clamp((S.matchIntroTime - this.matchIntroTimer) / 0.3, 0, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const pimg = this.player.head, oimg = this.opponent.head;
      const slide = (1 - ease) * 320;
      if (pimg && pimg.complete) ctx.drawImage(pimg, cx + 56 - slide, cy + 80, 200, 200);
      if (oimg && oimg.complete) ctx.drawImage(oimg, cx + cw2 - 256 + slide, cy + 80, 200, 200);
      strokedText(ctx, "VS", W / 2, cy + 185, font(72 * (0.6 + ease * 0.4), true), "rgb(247,246,241)", 9);
      strokedText(ctx, this.player.bp.name, cx + 156, cy + 312, font(22, true), rgb(this.player.bp.accent2), 4);
      strokedText(ctx, this.opponent.bp.name, cx + cw2 - 156, cy + 312, font(22, true), rgb(this.opponent.bp.accent2), 4);
      strokedText(ctx, `"${this.opponent.bp.taunt}"`, W / 2, cy + 344, font(16), "rgb(220,226,240)", 0);
      strokedText(ctx, `快扫档案 → ${this.opponent.bp.scan}`, W / 2, cy + 368, font(13), "rgb(150,200,160)", 0);
    }
    drawRoundOver(ctx) {
      ctx.fillStyle = "rgba(5,8,14,0.32)";
      ctx.fillRect(0, 0, W, H);
      strokedText(ctx, this.banner.sub, W / 2, H / 2 + 56, font(24, true), "rgb(220,226,240)", 5);
    }
    drawCampaignOver(ctx) {
      ctx.fillStyle = "rgba(4,6,12,0.74)";
      ctx.fillRect(0, 0, W, H);
      const winner = this.campaignWinner;
      const cw2 = 660, chh2 = 420;
      const cx = W / 2 - cw2 / 2, cy = 160;
      ctx.fillStyle = rgb(winner.accent2, 0.2 + Math.abs(Math.sin(this.elapsed * 2)) * 0.16);
      roundRect(ctx, cx - 12, cy - 12, cw2 + 24, chh2 + 24, 34); ctx.fill();
      ctx.fillStyle = "rgba(16,20,32,0.94)";
      roundRect(ctx, cx, cy, cw2, chh2, 28); ctx.fill();
      ctx.strokeStyle = "rgba(248,223,178,0.85)";
      ctx.lineWidth = 2;
      roundRect(ctx, cx, cy, cw2, chh2, 28); ctx.stroke();

      const header = this.mode === "versus"
        ? (winner === this.player.bp ? "P1 获胜!" : "P2 获胜!")
        : (this.campaignVictory ? "街机通关!" : "挑战失败");
      strokedText(ctx, header, W / 2, cy + 64, font(52, true),
        this.campaignVictory ? "rgb(255,220,120)" : "rgb(247,246,241)", 8);
      const img = this.heads[winner.key];
      if (img && img.complete) ctx.drawImage(img, W / 2 - 70, cy + 100, 140, 140);
      strokedText(ctx, winner.name, W / 2, cy + 272, font(28, true), rgb(winner.accent2), 5);
      const line = this.campaignVictory ? winner.victory : "阶梯重置,再排一场反讽对决。";
      strokedText(ctx, `"${line}"`, W / 2, cy + 312, font(18), "rgb(220,226,240)", 0);
      strokedText(ctx, `清场数: ${this.arcadeClears}/${S.arcadeMatches}`, W / 2, cy + 350, font(18, true), "rgb(177,188,210)", 0);
      strokedText(ctx, "回车返回选人", W / 2, cy + 390, font(16, true), rgb(winner.accent), 0);
    }
    draw(ctx) {
      const showBanner = this.state === "match_intro" || this.state === "round_intro" || this.state === "round_over";
      this.backdrop.draw(ctx, this.elapsed, showBanner);

      if (this.state === "menu") {
        this.drawMenu(ctx);
        return;
      }

      // world under camera
      ctx.save();
      camera.apply(ctx);
      for (const p of this.projectiles) p.draw(ctx);
      if (this.player && this.opponent) {
        this.player.draw(ctx, this);
        this.opponent.draw(ctx, this);
        this.killLine.draw(ctx, this.elapsed);
      }
      drawParticles(ctx, false);
      ctx.globalCompositeOperation = "lighter";
      drawParticles(ctx, true);
      ctx.globalCompositeOperation = "source-over";
      drawFloatTexts(ctx);
      ctx.restore();

      if (this.player && this.opponent) this.drawHud(ctx);
      drawAnnouncer(ctx);

      if (this.state === "match_intro") this.drawMatchIntro(ctx);
      else if (this.state === "round_over") this.drawRoundOver(ctx);
      else if (this.state === "campaign_over" && this.campaignWinner) this.drawCampaignOver(ctx);

      if (this.paused) {
        ctx.fillStyle = "rgba(5,8,14,0.6)";
        ctx.fillRect(0, 0, W, H);
        strokedText(ctx, "PAUSED", W / 2, H / 2 - 20, font(72, true), "rgb(247,246,241)", 9);
        strokedText(ctx, "按 P 继续 · Esc 返回菜单", W / 2, H / 2 + 44, font(20), "rgb(177,188,210)", 0);
      }
    }

    // ---------- input ----------
    onKeyDown(e) {
      AU.unlock();
      AU.startMusic();
      const code = e.code;
      if (code === "KeyM") { AU.setMuted(!AU.muted); return; }
      if (this.state === "menu") {
        const p2Picking = this.mode === "versus" && this.menuPhase === 1;
        const moveSel = (delta) => {
          if (p2Picking) this.selected2 = (this.selected2 + delta + 9) % 9;
          else this.selected = (this.selected + delta + 9) % 9;
          AU.menuMove();
        };
        if (code === "KeyA" || code === "ArrowLeft") moveSel(-1);
        else if (code === "KeyD" || code === "ArrowRight") moveSel(1);
        else if (code === "KeyW" || code === "ArrowUp") moveSel(-3);
        else if (code === "KeyS" || code === "ArrowDown") moveSel(3);
        else if (code === "Digit1") this.difficulty = 0;
        else if (code === "Digit2") this.difficulty = 1;
        else if (code === "Digit3") this.difficulty = 2;
        else if (code === "KeyV") {
          this.mode = this.mode === "arcade" ? "versus" : "arcade";
          this.menuPhase = 0;
          AU.menuMove();
        }
        else if (code === "Enter" || code === "Space") {
          AU.menuSelect();
          if (this.mode === "versus") {
            if (this.menuPhase === 0) this.menuPhase = 1;
            else { this.menuPhase = 0; this.startVersusMatch(); }
          } else {
            this.resetCampaign();
          }
        }
        else if (code === "Escape" && p2Picking) this.menuPhase = 0;
        return;
      }
      if (code === "Escape") { this.state = "menu"; this.paused = false; return; }
      if (this.state === "campaign_over") {
        if (code === "Enter" || code === "Space") this.state = "menu";
        return;
      }
      if (code === "KeyP") { this.paused = !this.paused; return; }
      if (this.paused) return;

      if (code === "KeyA") this.keys.left = true;
      else if (code === "KeyD") this.keys.right = true;
      else if (code === "KeyS") this.keys.down = true;
      else if (code === "Space") { this.keys.guard = true; e.preventDefault(); }
      else if (code === "KeyW") {
        this.keys.up = true;
        if (this.state === "playing") this.pendingJump = 0.10;
      }
      const vs = this.mode === "versus";
      if (vs) {
        if (code === "ArrowLeft") this.keys2.left = true;
        else if (code === "ArrowRight") this.keys2.right = true;
        else if (code === "ArrowDown") this.keys2.down = true;
        else if (code === "ShiftRight") this.keys2.guard = true;
        else if (code === "ArrowUp") {
          this.keys2.up = true;
          if (this.state === "playing") this.pendingJump2 = 0.10;
        }
      }
      if (this.state !== "playing") return;
      if (code === "KeyJ") this.playerAttack("basic");
      else if (code === "KeyK") this.playerAttack("skill");
      else if (code === "KeyU") this.playerAttack("ult");
      else if (code === "KeyL" && this.player) {
        if (this.player.dash()) this.setTicker(`${this.player.bp.name} 闪过了这条暴论。`, 1.1);
      }
      if (vs && this.opponent) {
        if (code === "Comma") this.applyMove(this.opponent, this.opponent.useBasic(this.attackDirection(this.keys2)));
        else if (code === "Period") this.applyMove(this.opponent, this.opponent.useSkill(this.attackDirection(this.keys2)));
        else if (code === "Slash") this.applyMove(this.opponent, this.opponent.useUltimate());
        else if (code === "Quote") this.opponent.dash();
      }
    }
    onKeyUp(e) {
      const code = e.code;
      if (code === "KeyA") this.keys.left = false;
      else if (code === "KeyD") this.keys.right = false;
      else if (code === "KeyS") this.keys.down = false;
      else if (code === "Space") this.keys.guard = false;
      else if (code === "KeyW") {
        this.keys.up = false;
        if (this.pendingJump > 0 && this.state === "playing" && this.player && this.player.jump()) {
          this.pendingJump = 0;
        }
      }
      if (this.mode === "versus") {
        if (code === "ArrowLeft") this.keys2.left = false;
        else if (code === "ArrowRight") this.keys2.right = false;
        else if (code === "ArrowDown") this.keys2.down = false;
        else if (code === "ShiftRight") this.keys2.guard = false;
        else if (code === "ArrowUp") {
          this.keys2.up = false;
          if (this.pendingJump2 > 0 && this.state === "playing" && this.opponent && this.opponent.jump()) {
            this.pendingJump2 = 0;
          }
        }
      }
    }
  }

  // ---------- boot ----------
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    ctx.setTransform((scale * dpr), 0, 0, (scale * dpr), 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  const headImages = {};
  let loaded = 0;
  const total = D.fighters.length;
  for (const f of D.fighters) {
    const img = new Image();
    img.src = `assets/web/${f.key}_head.png`;
    img.onload = () => { loaded += 1; };
    img.onerror = () => { loaded += 1; };
    headImages[f.key] = img;
  }

  const game = new Game(headImages);
  window.__game = game; // playtest hook
  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Slash", "Quote"].includes(e.code)) e.preventDefault();
    game.onKeyDown(e);
  });
  window.addEventListener("keyup", (e) => game.onKeyUp(e));

  // fixed 60Hz timestep with accumulator
  const STEP = 1000 / 60;
  let acc = 0, last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(now - last, 250);
    last = now;
    while (acc >= STEP) {
      game.update(STEP / 1000);
      acc -= STEP;
    }
    if (acc > 1000) acc = 0;
    ctx.save();
    game.draw(ctx);
    ctx.restore();
    if (loaded < total) {
      ctx.fillStyle = "rgba(10,12,20,0.6)";
      ctx.fillRect(0, 0, W, H);
      strokedText(ctx, `加载头像 ${loaded}/${total}…`, W / 2, H / 2, font(28, true), "rgb(247,246,241)", 5);
    }
  }
  requestAnimationFrame(frame);
})();
