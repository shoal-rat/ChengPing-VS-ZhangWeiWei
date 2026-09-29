// WebAudio synthesiser: every sound effect and every note of music is generated at
// runtime (no audio files). Voice lines use the browser's Chinese TTS when available.
import { TRACKS } from "../data/music.js";

let ctx = null, master, sfxBus, musBus, comp, noiseBuf;
const settings = { sfx: 0.8, music: 0.55, voice: true };
let seq = null;
let pendingMusic = null, currentMusic = null;
let tOff = 0;          // offline rendering: absolute schedule time added to every sound

function buildGraph() {
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
  master = ctx.createGain(); master.gain.value = 0.9;
  sfxBus = ctx.createGain(); sfxBus.gain.value = settings.sfx;
  musBus = ctx.createGain(); musBus.gain.value = settings.music * 0.5;
  sfxBus.connect(comp); musBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  buildGraph();
  return true;
}

function env(g, t, a, peak, dcy, sus = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + dcy);
}
function tone(f0, dur, type = "sine", vol = 0.3, f1 = null, when = 0, bus = sfxBus) {
  const t = ctx.currentTime + tOff + when;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, 0.004, vol, dur);
  o.connect(g); g.connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, freq = 1200, q = 1, vol = 0.3, type = "bandpass", when = 0, f1 = null, bus = sfxBus) {
  const t = ctx.currentTime + tOff + when;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain(); env(g, t, 0.003, vol, dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const SFX = {
  swingS: () => noise(0.09, 2600, 1.2, 0.18, "bandpass", 0, 5200),
  swingM: () => noise(0.13, 1500, 1.1, 0.24, "bandpass", 0, 4200),
  swingL: () => { noise(0.2, 900, 1.0, 0.3, "bandpass", 0, 3600); tone(180, 0.15, "triangle", 0.08, 90); },
  swingXL: () => { noise(0.28, 600, 0.9, 0.36, "bandpass", 0, 3000); tone(140, 0.25, "sawtooth", 0.06, 60); },
  spin: () => { noise(0.25, 1200, 2, 0.2, "bandpass", 0, 2800); },
  whiff: () => noise(0.08, 2000, 1, 0.12),
  jump: () => { tone(260, 0.1, "square", 0.06, 520); noise(0.06, 3000, 1, 0.06); },
  djump: () => { tone(420, 0.12, "square", 0.06, 900); },
  land: () => { noise(0.08, 400, 1, 0.14, "lowpass"); tone(110, 0.08, "sine", 0.12, 60); },
  dash: () => noise(0.12, 800, 1, 0.14, "bandpass", 0, 300),
  dodge: () => { noise(0.14, 3000, 3, 0.1, "bandpass", 0, 6000); tone(900, 0.1, "sine", 0.04, 1400); },
  shieldHit: () => { tone(620, 0.12, "triangle", 0.14, 540); noise(0.06, 4000, 2, 0.1); },
  shieldBreak: () => { tone(900, 0.4, "square", 0.12, 120); noise(0.5, 3000, 0.7, 0.3, "bandpass", 0, 200); },
  parry: () => { tone(1320, 0.3, "triangle", 0.18); tone(1980, 0.25, "sine", 0.12, null, 0.02); noise(0.05, 6000, 2, 0.12); },
  counter: () => { tone(880, 0.2, "square", 0.1, 1760); tone(1320, 0.3, "triangle", 0.12, null, 0.05); },
  reflect: () => { tone(1500, 0.18, "square", 0.08, 700); },
  absorb: () => { tone(300, 0.25, "sine", 0.15, 800); },
  clash: () => { tone(1800, 0.12, "square", 0.08, 1200); noise(0.05, 5000, 2, 0.1); },
  grab: () => { noise(0.07, 700, 1, 0.16); tone(160, 0.08, "square", 0.06, 120); },
  throw: () => { noise(0.18, 900, 1, 0.22, "bandpass", 0, 2600); },
  slam: () => { tone(90, 0.25, "sine", 0.3, 40); noise(0.2, 300, 1, 0.3, "lowpass"); },
  ledge: () => { tone(220, 0.06, "square", 0.05); noise(0.05, 1500, 2, 0.08); },
  tech: () => { tone(700, 0.08, "square", 0.07, 1100); },
  thud: () => { tone(80, 0.18, "sine", 0.28, 40); noise(0.12, 250, 1, 0.2, "lowpass"); },
  charge: () => { tone(300, 0.6, "sawtooth", 0.04, 900); },
  ko: () => { tone(90, 0.8, "sawtooth", 0.25, 30); noise(1.0, 2000, 0.6, 0.45, "lowpass", 0, 100); tone(1600, 0.5, "sine", 0.08, 400, 0.02); },
  killhit: () => { tone(60, 0.5, "sine", 0.45, 30); noise(0.4, 1000, 0.8, 0.4, "lowpass", 0, 80); tone(2400, 0.3, "square", 0.05, 200); },
  launch: () => noise(0.4, 1800, 1, 0.14, "bandpass", 0, 400),
  respawn: () => { tone(523, 0.1, "triangle", 0.08); tone(784, 0.14, "triangle", 0.08, null, 0.08); },
  count: () => { tone(660, 0.18, "square", 0.1); },
  go: () => { tone(880, 0.12, "square", 0.12); tone(1320, 0.3, "square", 0.12, null, 0.1); },
  game: () => { tone(523, 0.2, "square", 0.12); tone(659, 0.2, "square", 0.12, null, 0.12); tone(784, 0.5, "square", 0.12, null, 0.24); },
  pause: () => tone(440, 0.08, "square", 0.08),
  tick: () => tone(1200, 0.03, "square", 0.05),
  ok: () => { tone(880, 0.06, "square", 0.07); tone(1320, 0.1, "square", 0.07, null, 0.05); },
  back: () => { tone(500, 0.08, "square", 0.07, 300); },
  fs: () => { tone(110, 1.2, "sawtooth", 0.18, 55); noise(1.0, 400, 0.7, 0.3, "bandpass", 0, 4000); tone(880, 0.6, "square", 0.06, 1760, 0.2); },
  fsready: () => { [0, 0.07, 0.14, 0.21].forEach((w, i) => tone(660 * Math.pow(1.26, i), 0.2, "square", 0.08, null, w)); },
  bao: () => { tone(988, 0.1, "triangle", 0.08); tone(1318, 0.12, "triangle", 0.08, null, 0.1); },
  crate: () => { noise(0.2, 900, 1, 0.3); tone(200, 0.1, "square", 0.08, 90); },
  boom: () => { tone(70, 0.9, "sine", 0.45, 25); noise(0.9, 1500, 0.5, 0.5, "lowpass", 0, 60); },
  heal: () => { [0, 0.06, 0.12].forEach((w, i) => tone(784 * Math.pow(1.19, i), 0.14, "sine", 0.1, null, w)); },
  pickup: () => tone(700, 0.07, "square", 0.07, 1000),
  alarm: () => { tone(880, 0.15, "square", 0.08); tone(660, 0.15, "square", 0.08, null, 0.16); },
  armor: () => { tone(200, 0.12, "square", 0.12, 180); noise(0.05, 3000, 2, 0.1); },
  chalkShot: () => { noise(0.15, 3000, 2, 0.2, "bandpass", 0, 6000); tone(500, 0.1, "triangle", 0.06, 900); },
  boomer: () => { noise(0.3, 1400, 3, 0.18, "bandpass", 0, 2400); },
  water: () => { noise(0.5, 900, 0.7, 0.35, "lowpass", 0, 2400); },
  fire: () => { noise(0.4, 1400, 0.6, 0.35, "bandpass", 0, 300); tone(120, 0.3, "sawtooth", 0.1, 60); },
  wind: () => { noise(0.9, 700, 2, 0.25, "bandpass", 0, 1600); },
  beam: () => { tone(220, 1.4, "sawtooth", 0.12, 440); noise(1.4, 1200, 0.5, 0.2, "bandpass", 0, 3000); },
  elec: () => { for (let i = 0; i < 4; i++) noise(0.04, 5000, 4, 0.2, "bandpass", i * 0.05); tone(1200, 0.2, "square", 0.05, 300); },
  stamp: () => { tone(90, 0.2, "sine", 0.35, 50); noise(0.1, 600, 1, 0.3); },
  money: () => { for (let i = 0; i < 5; i++) noise(0.03, 5000, 3, 0.12, "highpass", i * 0.03); },
  paper: () => { noise(0.15, 2500, 1, 0.2, "bandpass", 0, 1200); },
  car: () => { tone(90, 0.8, "sawtooth", 0.12, 140); noise(0.6, 500, 1, 0.2, "lowpass"); },
  plane: () => { noise(1.2, 600, 1, 0.3, "bandpass", 0, 2400); tone(160, 1.0, "sawtooth", 0.06, 320); },
  slash: () => { noise(0.2, 4000, 2, 0.3, "bandpass", 0, 900); tone(1800, 0.15, "sawtooth", 0.06, 300); },
  hitS: () => { noise(0.05, 1800, 1, 0.25); tone(220, 0.05, "square", 0.06, 150); },
};

function hitSound(dmg, eff, kb) {
  const k = Math.min(1, dmg / 20);
  const t = 0;
  // body: noise crack + sub thump, heavier = lower & longer
  noise(0.06 + k * 0.14, 2400 - k * 1500, 0.8, 0.28 + k * 0.25, "bandpass", t);
  tone(160 - k * 90, 0.08 + k * 0.2, "sine", 0.3 + k * 0.25, 40);
  if (dmg > 10) noise(0.25 + k * 0.2, 600, 0.6, 0.25, "lowpass", 0.01, 120);
  if (kb > 120) tone(2200, 0.18, "square", 0.05, 500);
  if (eff === "elec") SFX.elec();
  else if (eff === "fire") noise(0.3, 1200, 0.6, 0.2, "bandpass", 0, 300);
  else if (eff === "water") noise(0.25, 900, 0.7, 0.2, "lowpass", 0, 2000);
  else if (eff === "ice") tone(1800, 0.2, "triangle", 0.08, 2600);
  else if (eff === "money") SFX.money();
  else if (eff === "chalk") noise(0.12, 4200, 2, 0.15, "highpass");
  else if (eff === "slash") SFX.slash();
  else if (eff === "text") tone(520, 0.12, "square", 0.06, 780);
}

// ------------------------------------------------------------------ TTS
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices().filter((v) => /zh|cmn/i.test(v.lang)); } catch (e) { voices = []; } }
if (typeof speechSynthesis !== "undefined") { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
const VOICE_PITCH = { chen: 0.85, zhang: 0.95, huxijin: 0.8, fengge: 0.7, huchenfeng: 1.15, mabaoguo: 0.75, laoa: 1.05 };
let lastSay = 0;

export const Audio = {
  settings,
  unlock() {
    if (!ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
    if (pendingMusic && !seq) { const id = pendingMusic; pendingMusic = null; this.music(id); }
  },
  sfx(id) { if (!ctx || !SFX[id]) return; try { SFX[id](); } catch (e) {} },
  hit(dmg, eff, kb) { if (!ctx) return; try { hitSound(dmg, eff, kb); } catch (e) {} },
  say(text, who) {
    if (!settings.voice || typeof speechSynthesis === "undefined" || !text) return;
    const now = performance.now();
    if (now - lastSay < 350) return;
    lastSay = now;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[「」!?!?。…]/g, " "));
      u.lang = "zh-CN";
      const v = voices.find((x) => /zh-CN|cmn-Hans/i.test(x.lang)) || voices[0];
      if (v) u.voice = v;
      u.rate = 1.12; u.pitch = VOICE_PITCH[who] ?? 1; u.volume = Math.min(1, settings.sfx + 0.1);
      speechSynthesis.speak(u);
    } catch (e) {}
  },
  music(id) {
    if (id && id === currentMusic && seq) return;
    if (seq) { seq.stop(); seq = null; }
    currentMusic = id;
    if (!ctx) { pendingMusic = id; return; }
    if (!id || !TRACKS[id]) return;
    seq = new Sequencer(TRACKS[id]);
    seq.start();
  },
  setVolume(kind, v) {
    settings[kind] = v;
    if (!ctx) return;
    if (kind === "sfx") sfxBus.gain.value = v;
    if (kind === "music") musBus.gain.value = v * 0.5;
  },
  get ctx() { return ctx; },
};

// ------------------------------------------------------------------ music sequencer
// Tracks are data (src/data/music.js): tempo, scale, patterns of instrument events.
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(n) {
  // "C4", "F#3", "Bb2"
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return 60;
  return 12 * (parseInt(m[3]) + 1) + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

class Sequencer {
  constructor(track) { this.tr = track; this.step = 0; this.timer = null; this.next = 0; }
  start() {
    const spb = this.tr.stepSec || 60 / this.tr.bpm / 4; // 16th notes (or custom step)
    this.spb = spb;
    this.next = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.pump(), 25);
  }
  stop() { clearInterval(this.timer); }
  pump() {
    while (this.next < ctx.currentTime + 0.12) {
      this.play(this.step, this.next);
      this.step++;
      this.next += this.spb * (this.tr.swing && this.step % 2 ? 1 + this.tr.swing : this.tr.swing && !(this.step % 2) ? 1 - this.tr.swing : 1);
    }
  }
  play(step, t) {
    const tr = this.tr;
    const S = tr.steps || 16;
    const bar = Math.floor(step / S) % tr.form.length;
    const sect = tr.sections[tr.form[bar]];
    const s = step % S;
    for (const [inst, pat] of Object.entries(sect)) {
      const ev = pat[s];
      if (ev == null || ev === "." || ev === "-") continue;
      voice(inst, ev, t, this.spb, tr);
    }
  }
}

function voice(inst, ev, t, spb, tr) {
  const I = tr.inst[inst] || { type: inst };
  const g = ctx.createGain();
  g.connect(musBus);
  if (I.type === "kick") { const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); env(g, t, 0.002, I.vol || 0.9, 0.2); o.connect(g); o.start(t); o.stop(t + 0.25); return; }
  if (I.type === "snare" || I.type === "hat" || I.type === "clap") {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = I.type === "hat" ? "highpass" : "bandpass"; f.frequency.value = I.type === "hat" ? 7000 : I.type === "clap" ? 1500 : 1800; f.Q.value = 0.8;
    env(g, t, 0.001, I.vol || (I.type === "hat" ? 0.18 : 0.5), I.type === "hat" ? (ev === "O" ? 0.2 : 0.04) : 0.14);
    s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + 0.3);
    if (I.type === "snare") { const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08); const g2 = ctx.createGain(); env(g2, t, 0.001, 0.25, 0.08); o.connect(g2); g2.connect(musBus); o.start(t); o.stop(t + 0.12); }
    return;
  }
  if (I.type === "gong") { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(hz(midi(ev)), t); o.frequency.linearRampToValueAtTime(hz(midi(ev)) * 0.97, t + 1.5); env(g, t, 0.005, I.vol || 0.3, 1.8); o.connect(g); o.start(t); o.stop(t + 2); const o2 = ctx.createOscillator(); o2.frequency.value = hz(midi(ev)) * 2.76; const g3 = ctx.createGain(); env(g3, t, 0.005, 0.08, 0.8); o2.connect(g3); g3.connect(musBus); o2.start(t); o2.stop(t + 1); return; }
  if (I.type === "wood") { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(ev === "H" ? 1400 : 900, t); env(g, t, 0.001, I.vol || 0.25, 0.05); o.connect(g); o.start(t); o.stop(t + 0.08); return; }
  // pitched: ev may be "C4" or "C4:4" (length in 16ths) or chord "C4+E4+G4:8"
  const [notes, len] = ev.split(":");
  const L = (parseInt(len) || I.len || 1) * spb;
  for (const n of notes.split("+")) {
    const f = hz(midi(n) + (I.oct || 0) * 12);
    const o = ctx.createOscillator();
    o.type = I.wave || "square";
    o.frequency.setValueAtTime(f, t);
    if (I.slide) o.frequency.setValueAtTime(f * 0.94, t), o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    if (I.vib) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = f * 0.012; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + 0.08); lfo.stop(t + L + 0.1); }
    let node = o;
    if (I.cut) { const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(I.cut, t); if (I.pluck) fl.frequency.exponentialRampToValueAtTime(Math.max(200, I.cut * 0.2), t + L); o.connect(fl); node = fl; }
    const gg = ctx.createGain();
    const vol = (I.vol || 0.12) / Math.sqrt(notes.split("+").length);
    if (I.pluck) env(gg, t, 0.003, vol, Math.max(0.05, L * 0.9));
    else { gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(vol, t + 0.01); gg.gain.setValueAtTime(vol, t + Math.max(0.02, L - 0.03)); gg.gain.exponentialRampToValueAtTime(0.0001, t + L + 0.04); }
    node.connect(gg); gg.connect(g);
    g.gain.value = 1;
    o.start(t); o.stop(t + L + 0.1);
  }
}


// ------------------------------------------------------------------ offline rendering (trailer capture)
// events: [{t (seconds), k: "sfx"|"hit", a: args}]; music: [{t, id}] (id null = stop)
export async function renderOffline(duration, events, music) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const saved = { ctx, master, sfxBus, musBus, comp, noiseBuf };
  const rate = 44100;
  ctx = new OAC(2, Math.ceil(duration * rate), rate);
  buildGraph();
  for (const e of events) {
    tOff = e.t;
    try { if (e.k === "sfx" && SFX[e.a[0]]) SFX[e.a[0]](); else if (e.k === "hit") hitSound(...e.a); } catch (err) {}
  }
  tOff = 0;
  // music segments
  const segs = [...music].sort((a, b) => a.t - b.t);
  for (let i = 0; i < segs.length; i++) {
    const m = segs[i], end = i + 1 < segs.length ? segs[i + 1].t : duration;
    const tr = m.id && TRACKS[m.id];
    if (!tr) continue;
    const spb = tr.stepSec || 60 / tr.bpm / 4, S = tr.steps || 16;
    let t = m.t + 0.05, step = 0;
    while (t < end) {
      const bar = Math.floor(step / S) % tr.form.length, sect = tr.sections[tr.form[bar]], st = step % S;
      for (const [inst, pat] of Object.entries(sect)) { const ev = pat[st]; if (ev != null) voice(inst, ev, t, spb, tr); }
      step++;
      t += spb * (tr.swing && step % 2 ? 1 + tr.swing : tr.swing && !(step % 2) ? 1 - tr.swing : 1);
    }
  }
  const buf = await ctx.startRendering();
  ({ ctx, master, sfxBus, musBus, comp, noiseBuf } = saved);
  return buf;
}

export function wavDataURL(buf) {
  const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); out.setUint32(4, 36 + len * ch * 2, true); w(8, "WAVE"); w(12, "fmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, rate, true);
  out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, len * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  const bytes = new Uint8Array(out.buffer);
  let bin = ""; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return "data:audio/wav;base64," + btoa(bin);
}
