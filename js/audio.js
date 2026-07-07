// 梗图格斗 2.0 — WebAudio synth: SFX presets + pentatonic BGM sequencer. Zero audio files.
"use strict";

window.GAME_AUDIO = (() => {
  let ctx = null, master = null, sfxBus = null, bgmBus = null, comp = null;
  let muted = false, volume = 0.8;
  let bgmTimer = null, bgmStep = 0, bgmKey = 0, bgmTempo = 132, bgmIntense = false;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return false; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.12;
    master = ctx.createGain(); master.gain.value = volume;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1.0;
    bgmBus = ctx.createGain(); bgmBus.gain.value = 0.30;
    sfxBus.connect(comp); bgmBus.connect(comp);
    comp.connect(master); master.connect(ctx.destination);
    return true;
  }

  function unlock() { if (ensure() && ctx.state === "suspended") ctx.resume(); }

  // --- primitives ---------------------------------------------------------
  function osc(type, freq, t0, dur, gain, bus, slideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, gain, freq, type, bus) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type || "lowpass"; f.frequency.value = freq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    src.connect(f); f.connect(g); g.connect(bus || sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  function thump(t0, freq, dur, gain) {
    osc("sine", freq, t0, dur, gain, sfxBus, freq * 0.4);
  }

  // --- SFX presets ---------------------------------------------------------
  const SFX = {
    hit_light(t) { noise(t, 0.09, 0.5, 2600, "bandpass"); thump(t, 170, 0.12, 0.55); },
    hit_heavy(t) { noise(t, 0.16, 0.7, 1600, "bandpass"); thump(t, 120, 0.22, 0.9); osc("square", 90, t, 0.12, 0.25, sfxBus, 45); },
    hit_launch(t) { noise(t, 0.18, 0.6, 1900, "bandpass"); thump(t, 140, 0.2, 0.8); osc("sawtooth", 320, t, 0.22, 0.18, sfxBus, 720); },
    whiff(t) { noise(t, 0.09, 0.22, 900, "highpass"); },
    guard(t) { noise(t, 0.07, 0.4, 4200, "bandpass"); osc("triangle", 640, t, 0.08, 0.28, sfxBus, 500); },
    just_guard(t) { osc("triangle", 880, t, 0.12, 0.4, sfxBus, 1320); osc("sine", 1760, t, 0.1, 0.2, sfxBus); },
    guard_break(t) { noise(t, 0.3, 0.8, 900, "lowpass"); osc("sawtooth", 200, t, 0.35, 0.5, sfxBus, 60); },
    throwgrab(t) { noise(t, 0.1, 0.4, 1400, "bandpass"); thump(t + 0.1, 100, 0.25, 1.0); },
    dash(t) { noise(t, 0.12, 0.3, 2400, "highpass"); },
    jump(t) { osc("sine", 240, t, 0.12, 0.3, sfxBus, 430); },
    land(t) { thump(t, 150, 0.1, 0.4); noise(t, 0.06, 0.2, 800); },
    shoot(t) { osc("square", 520, t, 0.1, 0.25, sfxBus, 260); noise(t, 0.06, 0.2, 3000, "highpass"); },
    clash(t) { noise(t, 0.12, 0.6, 3200, "bandpass"); osc("triangle", 990, t, 0.14, 0.3, sfxBus, 660); },
    reflect(t) { osc("sine", 660, t, 0.18, 0.4, sfxBus, 1320); osc("sine", 1320, t + 0.05, 0.16, 0.25, sfxBus, 1980); },
    counter(t) { osc("square", 220, t, 0.1, 0.4, sfxBus, 110); osc("sine", 880, t + 0.06, 0.2, 0.35, sfxBus, 1760); },
    teleport(t) { noise(t, 0.2, 0.35, 2600, "highpass"); osc("sine", 900, t, 0.2, 0.2, sfxBus, 160); },
    slow_field(t) { osc("sine", 320, t, 0.5, 0.25, sfxBus, 110); },
    ult_flash(t) { osc("sawtooth", 80, t, 0.7, 0.5, sfxBus, 320); noise(t, 0.5, 0.5, 700, "lowpass"); osc("sine", 1200, t + 0.1, 0.4, 0.3, sfxBus, 2400); },
    ko(t) { thump(t, 90, 0.6, 1.2); noise(t, 0.5, 0.9, 800, "lowpass"); osc("sawtooth", 160, t, 0.6, 0.4, sfxBus, 40); },
    round_go(t) { osc("square", 440, t, 0.12, 0.4, sfxBus); osc("square", 660, t + 0.13, 0.2, 0.4, sfxBus); },
    select(t) { osc("square", 660, t, 0.06, 0.3, sfxBus); },
    confirm(t) { osc("square", 550, t, 0.07, 0.3, sfxBus); osc("square", 880, t + 0.08, 0.12, 0.3, sfxBus); },
    quote(t) { osc("triangle", 1180, t, 0.05, 0.22, sfxBus); },
    timer(t) { osc("square", 990, t, 0.06, 0.3, sfxBus); },
  };

  function sfx(name) {
    if (muted || !ensure() || ctx.state === "suspended") return;
    const fn = SFX[name];
    if (fn) fn(ctx.currentTime + 0.001);
  }

  // --- BGM: 16-step pentatonic sequencer -----------------------------------
  const RIFF = [0, 2, 4, 2, 0, 4, 7, 4, 9, 7, 4, 2, 0, 2, 4, 9];
  const BASS = [0, 0, 7, 7, 5, 5, 7, 7];

  function bgmTick() {
    if (!ctx || muted) return;
    const t = ctx.currentTime + 0.02;
    const root = 220 * Math.pow(2, bgmKey / 12);
    const i = bgmStep % 16;
    if (i % 2 === 0) {
      const b = root / 2 * Math.pow(2, BASS[(i / 2) | 0] / 12);
      osc("triangle", b, t, 0.22, 0.5, bgmBus);
    }
    const m = RIFF[i];
    const f = root * Math.pow(2, (m + 12) / 12);
    osc(bgmIntense ? "square" : "triangle", f, t, 0.16, bgmIntense ? 0.20 : 0.16, bgmBus);
    noise(t, 0.03, i % 4 === 2 ? 0.12 : 0.06, 8000, "highpass", bgmBus);
    if (bgmIntense && i % 8 === 4) thump(t, 95, 0.15, 0.5);
    bgmStep++;
  }

  function bgmStart(key, tempo, intense) {
    if (!ensure()) return;
    bgmKey = key || 0; bgmTempo = tempo || 132; bgmIntense = !!intense;
    bgmStop();
    bgmTimer = setInterval(bgmTick, (60 / bgmTempo / 2) * 1000);
  }
  function bgmStop() { if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; } }
  function bgmSetIntense(v) { bgmIntense = !!v; }

  function setMuted(v) { muted = v; if (muted) bgmStop(); }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master) master.gain.value = volume; }

  return { unlock, sfx, bgmStart, bgmStop, bgmSetIntense, setMuted, setVolume,
           get muted() { return muted; }, get volume() { return volume; } };
})();
