// Synthesized SFX via WebAudio — no audio files needed.
"use strict";

window.GameAudio = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let volume = 0.5;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = volume;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 6;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function noiseBuffer(seconds) {
    const rate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.max(1, (seconds * rate) | 0), rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  // One-shot oscillator with pitch + gain envelopes.
  function blip({ type = "sine", from = 440, to = 220, dur = 0.12, vol = 0.4, delay = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function burst({ dur = 0.1, vol = 0.4, low = 200, high = 4500, delay = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(high, t0);
    band.frequency.exponentialRampToValueAtTime(low, t0 + dur);
    band.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(band); band.connect(gain); gain.connect(master);
    src.start(t0);
  }

  // ---- tiny synth BGM loop (no audio files) ----
  let musicTimer = null;
  let musicStep = 0;
  const BPM = 102;
  // A natural-minor arcade loop: bass + arp + hat, 2 bars of 16 steps
  const BASS = [45, 0, 45, 0, 48, 0, 43, 0, 45, 0, 45, 0, 41, 0, 43, 0,
                45, 0, 45, 0, 48, 0, 50, 0, 52, 0, 48, 0, 43, 0, 43, 0];
  const ARP = [69, 72, 76, 72, 71, 74, 79, 74, 69, 72, 76, 81, 71, 74, 79, 76,
               69, 72, 76, 72, 74, 77, 81, 77, 76, 79, 84, 79, 74, 77, 79, 74];
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function scheduleMusicStep(t, step) {
    const s = step % 32;
    const bass = BASS[s];
    if (bass) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = mtof(bass);
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.3);
    }
    if (s % 2 === 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = mtof(ARP[s]);
      g.gain.setValueAtTime(0.028, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + 0.16);
    }
    if (s % 4 === 2) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.03);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      src.connect(hp); hp.connect(g); g.connect(master);
      src.start(t);
    }
  }

  const api = {
    unlock() { ensure(); },
    setMuted(m) { muted = m; },
    get muted() { return muted; },
    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = volume;
    },
    get volume() { return volume; },

    startMusic() {
      if (!ensure() || musicTimer) return;
      const stepDur = 60 / BPM / 4;
      let nextTime = ctx.currentTime + 0.05;
      musicStep = 0;
      musicTimer = setInterval(() => {
        if (muted) { nextTime = Math.max(nextTime, ctx.currentTime + 0.05); return; }
        // background-tab catch-up guard: never schedule missed steps in the past
        if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
        while (nextTime < ctx.currentTime + 0.18) {
          scheduleMusicStep(nextTime, musicStep);
          musicStep += 1;
          nextTime += stepDur;
        }
      }, 60);
    },
    stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },

    hitLight() {
      burst({ dur: 0.07, vol: 0.5, low: 500, high: 3800 });
      blip({ type: "square", from: 320, to: 90, dur: 0.08, vol: 0.28 });
    },
    hitHeavy() {
      burst({ dur: 0.14, vol: 0.62, low: 160, high: 2600 });
      blip({ type: "square", from: 220, to: 50, dur: 0.16, vol: 0.4 });
      blip({ type: "sine", from: 90, to: 38, dur: 0.2, vol: 0.5 });
    },
    block() {
      burst({ dur: 0.05, vol: 0.3, low: 1500, high: 6000 });
      blip({ type: "triangle", from: 900, to: 600, dur: 0.06, vol: 0.2 });
    },
    guardBreak() {
      burst({ dur: 0.3, vol: 0.55, low: 120, high: 1800 });
      blip({ type: "sawtooth", from: 700, to: 120, dur: 0.34, vol: 0.34 });
    },
    shoot() { blip({ type: "triangle", from: 700, to: 320, dur: 0.07, vol: 0.16 }); },
    skill() {
      blip({ type: "sawtooth", from: 380, to: 660, dur: 0.1, vol: 0.18 });
      blip({ type: "triangle", from: 900, to: 500, dur: 0.12, vol: 0.12, delay: 0.03 });
    },
    jump() { blip({ type: "sine", from: 240, to: 480, dur: 0.1, vol: 0.16 }); },
    dash() { burst({ dur: 0.12, vol: 0.22, low: 900, high: 2600 }); },
    land() { burst({ dur: 0.06, vol: 0.18, low: 150, high: 700 }); },
    reflect() { blip({ type: "sine", from: 500, to: 1400, dur: 0.14, vol: 0.3 }); },
    ult() {
      blip({ type: "sawtooth", from: 130, to: 520, dur: 0.4, vol: 0.4 });
      blip({ type: "square", from: 65, to: 260, dur: 0.4, vol: 0.3, delay: 0.06 });
      burst({ dur: 0.5, vol: 0.3, low: 300, high: 5200, delay: 0.1 });
    },
    killLineWarn() {
      blip({ type: "square", from: 880, to: 880, dur: 0.09, vol: 0.22 });
      blip({ type: "square", from: 880, to: 880, dur: 0.09, vol: 0.22, delay: 0.16 });
      blip({ type: "square", from: 1175, to: 1175, dur: 0.12, vol: 0.26, delay: 0.32 });
    },
    killLineFire() {
      burst({ dur: 0.4, vol: 0.6, low: 100, high: 3000 });
      blip({ type: "sawtooth", from: 1400, to: 90, dur: 0.45, vol: 0.4 });
    },
    ko() {
      burst({ dur: 0.5, vol: 0.7, low: 60, high: 2000 });
      blip({ type: "sine", from: 160, to: 30, dur: 0.7, vol: 0.6 });
      blip({ type: "square", from: 320, to: 45, dur: 0.5, vol: 0.3, delay: 0.04 });
    },
    roundBell() {
      blip({ type: "sine", from: 660, to: 660, dur: 0.5, vol: 0.34 });
      blip({ type: "sine", from: 1320, to: 1320, dur: 0.4, vol: 0.14 });
    },
    announce() { blip({ type: "triangle", from: 520, to: 780, dur: 0.16, vol: 0.24 }); },
    menuMove() { blip({ type: "triangle", from: 520, to: 640, dur: 0.05, vol: 0.14 }); },
    menuSelect() {
      blip({ type: "triangle", from: 520, to: 1040, dur: 0.16, vol: 0.26 });
      blip({ type: "sine", from: 780, to: 1560, dur: 0.2, vol: 0.18, delay: 0.05 });
    },
    meterFull() { blip({ type: "sine", from: 700, to: 1400, dur: 0.22, vol: 0.2 }); },
  };
  return api;
})();
