// Input: every device becomes a Source that yields one Pad snapshot per simulation frame.
// Keyboard events are latched between polls so a tap shorter than a frame still counts.

export const BTN = ["atk", "spc", "jmp", "shd", "grb", "smh", "tnt"];

export function emptyPad() {
  return { mx: 0, my: 0, cx: 0, cy: 0, cPress: false, dash: 0, dropTap: false, upTap: false,
    atk: false, spc: false, jmp: false, shd: false, grb: false, smh: false, tnt: false,
    p: { atk: false, spc: false, jmp: false, shd: false, grb: false, smh: false, tnt: false },
    flick: 99, pause: false };
}

// ---------------------------------------------------------------- keyboard
const keyDown = new Set();
const keyHit = new Set();   // pressed since last poll (latched)
let kbListeners = false;
const GAME_CODES = new Set();

export function initKeyboard(onAnyKey) {
  if (kbListeners) return;
  kbListeners = true;
  window.addEventListener("keydown", (e) => {
    if (e.repeat) { if (GAME_CODES.has(e.code)) e.preventDefault(); return; }
    keyDown.add(e.code);
    keyHit.add(e.code);
    if (GAME_CODES.has(e.code)) e.preventDefault();
    onAnyKey && onAnyKey(e);
  });
  window.addEventListener("keyup", (e) => { keyDown.delete(e.code); });
  window.addEventListener("blur", () => keyDown.clear());
}
export const kbHeld = (c) => keyDown.has(c);
export function kbTake(c) { const h = keyHit.has(c); keyHit.delete(c); return h; }
export function kbPeekHit(c) { return keyHit.has(c); }
export function kbClearHits() { keyHit.clear(); }

export const KEYMAPS = {
  // J attack · K jump · L special · I smash · U grab · Space shield/dodge · O taunt
  p1: { left: ["KeyA"], right: ["KeyD"], up: ["KeyW"], down: ["KeyS"],
    atk: ["KeyJ"], jmp: ["KeyK"], spc: ["KeyL"], smh: ["KeyI"], grb: ["KeyU"], shd: ["Space"], tnt: ["KeyO"],
    pause: ["Escape", "KeyP"] },
  p2: { left: ["ArrowLeft"], right: ["ArrowRight"], up: ["ArrowUp"], down: ["ArrowDown"],
    atk: ["Numpad1", "Comma"], jmp: ["Numpad2", "Period"], spc: ["Numpad3", "Slash"],
    grb: ["Numpad4", "Semicolon"], smh: ["Numpad5", "Quote"], shd: ["Numpad0", "ShiftRight"], tnt: ["Numpad6", "BracketRight"],
    pause: ["NumpadAdd", "Backspace"] },
};
for (const m of Object.values(KEYMAPS)) for (const arr of Object.values(m)) for (const c of arr) GAME_CODES.add(c);

export class KeyboardSource {
  constructor(map, opts = {}) {
    this.kind = "kb";
    this.map = map;
    this.tapJump = !!opts.tapJump;
    this.prev = emptyPad();
    this.lastTap = { l: -99, r: -99, d: -99 };
    this.t = 0;
    this.flick = 99;
  }
  any(list) { for (const c of list) if (keyDown.has(c)) return true; return false; }
  hit(list) { let h = false; for (const c of list) if (keyHit.has(c)) { h = true; keyHit.delete(c); } return h; }
  read() {
    const m = this.map, pad = emptyPad();
    this.t++;
    const lHit = this.hit(m.left), rHit = this.hit(m.right), dHit = this.hit(m.down), uHit = this.hit(m.up);
    const L = this.any(m.left) || lHit, R = this.any(m.right) || rHit;
    const U = this.any(m.up) || uHit, D = this.any(m.down) || dHit;
    pad.mx = (R ? 1 : 0) - (L ? 1 : 0);
    pad.my = (D ? 1 : 0) - (U ? 1 : 0);
    // double tap = dash / drop-through
    if (lHit) { if (this.t - this.lastTap.l <= 14) pad.dash = -1; this.lastTap.l = this.t; }
    if (rHit) { if (this.t - this.lastTap.r <= 14) pad.dash = 1; this.lastTap.r = this.t; }
    if (dHit) { if (this.t - this.lastTap.d <= 14) pad.dropTap = true; this.lastTap.d = this.t; }
    if (uHit && this.tapJump) pad.upTap = true;
    if (lHit || rHit || uHit || dHit) this.flick = 0; else this.flick++;
    pad.flick = this.flick;
    for (const b of BTN) {
      const hit = this.hit(m[b]);
      pad[b] = this.any(m[b]) || hit;
      pad.p[b] = hit || (pad[b] && !this.prev[b]);
    }
    if (pad.upTap) { pad.jmp = true; pad.p.jmp = true; }
    pad.pause = this.hit(m.pause);
    this.prev = pad;
    return pad;
  }
}

// ---------------------------------------------------------------- gamepad
export class GamepadSource {
  constructor(index) {
    this.kind = "pad";
    this.index = index;
    this.prev = emptyPad();
    this.hist = [];          // recent stick x/y for flick detection
    this.prevC = false;
    this.tapJump = true;
  }
  get connected() { const g = navigator.getGamepads?.()[this.index]; return !!(g && g.connected); }
  read() {
    const pad = emptyPad();
    const g = navigator.getGamepads?.()[this.index];
    if (!g) { this.prev = pad; return pad; }
    const b = (i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5));
    const dz = (v) => (Math.abs(v) < 0.22 ? 0 : v);
    let x = dz(g.axes[0] || 0), y = dz(g.axes[1] || 0);
    if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
    pad.mx = x; pad.my = y;
    this.hist.push([x, y]);
    if (this.hist.length > 5) this.hist.shift();
    const old = this.hist[0];
    if (Math.abs(x) > 0.8 && Math.abs(old[0]) < 0.35 && Math.sign(x) !== 0) pad.dash = Math.sign(x);
    if (y > 0.75 && old[1] < 0.3) pad.dropTap = true;
    if (y < -0.7 && old[1] > -0.3 && this.tapJump) pad.upTap = true;
    const strong = Math.hypot(x, y) > 0.8, oldWeak = Math.hypot(old[0], old[1]) < 0.35;
    pad.flick = strong && oldWeak ? 0 : (this.prev.flick + 1);
    const cx = dz(g.axes[2] || 0), cy = dz(g.axes[3] || 0);
    const cOn = Math.hypot(cx, cy) > 0.6;
    pad.cx = cOn ? cx : 0; pad.cy = cOn ? cy : 0;
    pad.cPress = cOn && !this.prevC;
    this.prevC = cOn;
    const held = { atk: b(0), spc: b(1), jmp: b(2) || b(3), shd: b(6) || b(7), grb: b(4) || b(5),
      smh: false, tnt: b(8) };
    for (const k of BTN) { pad[k] = held[k]; pad.p[k] = held[k] && !this.prev[k]; }
    if (pad.upTap) { pad.jmp = true; pad.p.jmp = true; }
    pad.pause = b(9) && !this.prev.pauseHeld;
    pad.pauseHeld = b(9);
    this.prev = pad;
    return pad;
  }
}

// ---------------------------------------------------------------- touch (virtual pad)
export class TouchSource {
  constructor() {
    this.kind = "touch";
    this.stick = { x: 0, y: 0 };
    this.held = { atk: false, spc: false, jmp: false, shd: false, grb: false, smh: false, tnt: false };
    this.hitQ = new Set();
    this.prev = emptyPad();
    this.hist = [];
    this.pauseQ = false;
  }
  press(b) { this.held[b] = true; this.hitQ.add(b); }
  release(b) { this.held[b] = false; }
  read() {
    const pad = emptyPad();
    pad.mx = Math.abs(this.stick.x) < 0.25 ? 0 : this.stick.x;
    pad.my = Math.abs(this.stick.y) < 0.35 ? 0 : this.stick.y;
    this.hist.push([pad.mx, pad.my]);
    if (this.hist.length > 5) this.hist.shift();
    const old = this.hist[0];
    if (Math.abs(pad.mx) > 0.85 && Math.abs(old[0]) < 0.4) pad.dash = Math.sign(pad.mx);
    if (pad.my > 0.8 && old[1] < 0.3) pad.dropTap = true;
    const strong = Math.hypot(pad.mx, pad.my) > 0.8, oldWeak = Math.hypot(old[0], old[1]) < 0.4;
    pad.flick = strong && oldWeak ? 0 : this.prev.flick + 1;
    for (const k of BTN) {
      const hit = this.hitQ.has(k);
      pad[k] = this.held[k] || hit;
      pad.p[k] = hit || (pad[k] && !this.prev[k]);
    }
    this.hitQ.clear();
    pad.pause = this.pauseQ; this.pauseQ = false;
    this.prev = pad;
    return pad;
  }
}

// ---------------------------------------------------------------- menu navigation
// Unified "menu intent" across keyboard / pads for UI screens.
export class MenuInput {
  constructor() { this.prevPads = {}; this.repeat = {}; }
  // Returns list of {src, dir:[dx,dy], ok, back, alt} events for this frame.
  poll() {
    const ev = [];
    const kbSets = [
      { id: "k1", l: ["KeyA"], r: ["KeyD"], u: ["KeyW"], d: ["KeyS"], ok: ["KeyJ", "Space"], back: ["KeyK", "Escape"], alt: ["KeyL"], x: ["KeyU"] },
      { id: "k2", l: ["ArrowLeft"], r: ["ArrowRight"], u: ["ArrowUp"], d: ["ArrowDown"], ok: ["Enter", "Numpad1", "Comma"], back: ["Backspace", "Numpad2", "Period"], alt: ["Numpad3", "Slash"], x: ["Numpad4", "Semicolon"] },
    ];
    for (const s of kbSets) {
      const take = (arr) => { let h = false; for (const c of arr) if (keyHit.has(c)) { keyHit.delete(c); h = true; } return h; };
      const e = { src: s.id, dir: [0, 0], ok: take(s.ok), back: take(s.back), alt: take(s.alt), x: take(s.x) };
      if (take(s.l)) e.dir[0] = -1; if (take(s.r)) e.dir[0] = 1;
      if (take(s.u)) e.dir[1] = -1; if (take(s.d)) e.dir[1] = 1;
      if (e.ok || e.back || e.alt || e.x || e.dir[0] || e.dir[1]) ev.push(e);
    }
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (let i = 0; i < pads.length; i++) {
      const g = pads[i];
      if (!g) continue;
      const id = "g" + i;
      const b = (k) => !!(g.buttons[k] && g.buttons[k].pressed);
      const now = { l: (g.axes[0] || 0) < -0.6 || b(14), r: (g.axes[0] || 0) > 0.6 || b(15),
        u: (g.axes[1] || 0) < -0.6 || b(12), d: (g.axes[1] || 0) > 0.6 || b(13),
        ok: b(0), back: b(1), alt: b(3), x: b(2), start: b(9) };
      const pv = this.prevPads[id] || {};
      const rp = this.repeat[id] || (this.repeat[id] = { t: 0 });
      const dirHeld = now.l || now.r || now.u || now.d;
      const dirNew = (now.l && !pv.l) || (now.r && !pv.r) || (now.u && !pv.u) || (now.d && !pv.d);
      let fire = dirNew;
      if (dirHeld) { rp.t++; if (rp.t > 18 && rp.t % 6 === 0) fire = true; } else rp.t = 0;
      const e = { src: id, dir: [0, 0], ok: now.ok && !pv.ok, back: now.back && !pv.back,
        alt: now.alt && !pv.alt, x: now.x && !pv.x, start: now.start && !pv.start };
      if (fire) { e.dir[0] = now.l ? -1 : now.r ? 1 : 0; e.dir[1] = now.u ? -1 : now.d ? 1 : 0; }
      if (e.ok || e.back || e.alt || e.x || e.start || e.dir[0] || e.dir[1]) ev.push(e);
      this.prevPads[id] = now;
    }
    return ev;
  }
}

export function kbAny() { const h = keyHit.size > 0; keyHit.clear(); return h; }
