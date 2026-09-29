// Soundtrack: original acid-jazz / funk chiptune arrangements, synthesised at runtime.
// Notation per bar: space-separated tokens, one per step. "C4" note, "C4:4" note held
// for 4 steps, "C4+E4+G4:8" chord, "." rest. Drum bars are strings: x hit, o open, . rest.

const bars = (s) => s.trim().split("|").map((b) => b.trim().split(/\s+/).map((t) => (t === "." || t === "-" ? null : t)));
const D = (s) => s.split("").map((c) => (c === "." ? null : c));
function section(parts) {
  const multi = (p) => Array.isArray(p) && Array.isArray(p[0]);
  const n = Math.max(...Object.values(parts).map((p) => (multi(p) ? p.length : 1)));
  const out = [];
  for (let i = 0; i < n; i++) {
    const bar = {};
    for (const [k, v] of Object.entries(parts)) { const arr = multi(v) ? v : [v]; bar[k] = arr[i % arr.length]; }
    out.push(bar);
  }
  return out;
}
function track(bpm, inst, order, secs, o = {}) {
  const sections = {}, form = [];
  let id = 0;
  for (const name of order) for (const bar of secs[name]) { const key = "b" + id++; sections[key] = bar; form.push(key); }
  return { bpm, swing: o.swing || 0, steps: o.steps || 16, stepSec: o.stepSec, inst, sections, form };
}
const KIT = {
  kick: { type: "kick", vol: 0.9 }, snare: { type: "snare", vol: 0.45 }, hat: { type: "hat", vol: 0.14 }, clap: { type: "clap", vol: 0.35 },
  wood: { type: "wood", vol: 0.25 }, gong: { type: "gong", vol: 0.28 },
};
const R16 = ". . . . . . . . . . . . . . . .";

// ================================================================ TITLE — D minor funk, 132
const title = (() => {
  const inst = { ...KIT,
    bass: { wave: "square", vol: 0.16, cut: 900, pluck: true, len: 1 },
    pad: { wave: "sawtooth", vol: 0.07, cut: 1600, len: 8 },
    lead: { wave: "square", vol: 0.1, vib: true, cut: 3000, len: 2 },
    brass: { wave: "sawtooth", vol: 0.1, cut: 2400, slide: true, len: 2 },
  };
  const drums = { kick: D("x.....x...x....."), snare: D("....x.......x..x"), hat: D("x.x.x.xox.x.x.xo") };
  const A = section({
    ...drums,
    bass: bars(`D2 . D3 . . D2 F2 . G2 . . G3 A2 . C3 . | Bb1 . Bb2 . . Bb1 D2 . F2 . . F2 A2 . Bb2 . | G1 . G2 . . G1 Bb1 . D2 . . D2 F2 . G2 . | A1 . A2 . . A1 C#2 . E2 . . E2 G2 . A2 .`),
    pad: bars(`F3+A3+C4+E4:16 ${R16.slice(2)} | D3+F3+A3+C4:16 ${R16.slice(2)} | Bb2+D3+F3+A3:16 ${R16.slice(2)} | C#3+G3+Bb3+E4:16 ${R16.slice(2)}`),
    brass: bars(`A4:3 . . A4 B4:2 . E4:8 . . . . . . . D4 E4 | F4:3 . . F4 C4:2 . E4:8 . . . . . . . . . | A4:3 . . C5:3 . . B4:2 . D5:2 . C5:2 . A4:2 . . . | F4:2 . D4 C4:2 . E4:6 . . . . . . G4 F4 E4 D4`),
  });
  const B = section({
    ...drums, clap: D("....x.......x..."),
    bass: bars(`G2 . G3 . Bb2 . C3 . D3 . . C3 Bb2 . G2 . | C2 . C3 . E2 . G2 . Bb2 . . G2 E2 . C2 . | F2 . F3 . A2 . C3 . E3 . . C3 A2 . F2 . | E2 . E3 . G#2 . B2 . A2 . . E2 C#2 . A1 .`),
    pad: bars(`Bb3+D4+F4+A4:16 ${R16.slice(2)} | Bb3+E4+G4+D5:16 ${R16.slice(2)} | A3+C4+E4+G4:16 ${R16.slice(2)} | G#3+D4+F4+C5:8 . . . . . . . C#4+G4+Bb4+E5:8 . . . . . . .`),
    lead: bars(`. . D5 F5 G5:2 . A5 . G5 F5 D5:2 . C5 D5 . . | E5:4 . . . G5 . E5 . C5:4 . . . Bb4 C5 . . | A4 C5 E5 G5 A5:3 . . G5 E5 C5 A4:3 . . G4 . . | A4:8 . . . . . . . . . . . . . . .`),
  });
  return track(132, inst, ["A", "A", "B", "A"], { A, B });
})();

// ================================================================ SELECT — lounge groove, 108
const select = (() => {
  const inst = { ...KIT,
    bass: { wave: "triangle", vol: 0.22, len: 2 },
    ep: { wave: "triangle", vol: 0.06, cut: 2200, len: 4, pluck: true },
    lead: { wave: "square", vol: 0.06, vib: true, cut: 2600, len: 2 },
  };
  const A = section({
    kick: D("x......x..x....."), snare: D("....x.......x..."), hat: D("x.xxx.xxx.xxx.xo"),
    bass: bars(`E2:3 . . E2 . . G2:2 . A2:3 . . B2 . D3:2 . . | A2:3 . . A2 . . C3:2 . D3:3 . . E3 . G3:2 . . | F2:3 . . F2 . . A2:2 . C3:3 . . D3 . E3:2 . . | B1:3 . . B1 . . D#2:2 . F#2:3 . . A2 . B2:2 . .`),
    ep: bars(`. . G3+B3+D4+F#4:4 . . . . . . . G3+B3+D4+F#4:2 . . . . . | . . G3+C4+E4+G4:4 . . . . . . . G3+C4+E4+G4:2 . . . . . | . . E3+A3+C4+E4:4 . . . . . . . E3+A3+C4+E4:2 . . . . . | . . D#3+A3+C#4+F#4:4 . . . . . . . D#3+A3+C#4+F#4:2 . . . . .`),
    lead: bars(`. . . . . . . . E5 G5 A5:2 . G5 E5 . . | D5:6 . . . . . . . . . . . . . . . | . . . . . . . . C5 E5 G5:2 . E5 C5 . . | B4:8 . . . . . . . . . . . . . . .`),
  });
  return track(108, inst, ["A"], { A }, { swing: 0.12 });
})();

// ================================================================ STUDIO — C minor march-funk, 128
const studio = (() => {
  const inst = { ...KIT,
    bass: { wave: "square", vol: 0.15, cut: 800, pluck: true },
    brass: { wave: "sawtooth", vol: 0.11, cut: 2800, len: 2 },
    pad: { wave: "sawtooth", vol: 0.06, cut: 1400, len: 8 },
    arp: { wave: "square", vol: 0.045, cut: 3500, pluck: true },
  };
  const drums = { kick: D("x...x...x...x..."), snare: D("....x..x....x.xx"), hat: D("xxxxxxxxxxxxxxxx") };
  const A = section({
    ...drums,
    bass: bars(`C2 . C3 . G2 . C3 . Bb1 . Bb2 . F2 . Bb2 . | C2 . C3 . G2 . C3 . Ab1 . Ab2 . Eb2 . Ab2 . | F1 . F2 . C2 . F2 . Bb1 . Bb2 . F2 . Bb2 . | Eb2 . Eb3 . Bb2 . Eb3 . G1 . G2 . D2 . G2 . | Ab1 . Ab2 . Eb2 . Ab2 . Ab1 . Ab2 . Eb2 . Ab2 . | G1 . G2 . D2 . G2 . G1 . G2 . B1 . D2 . | F1 . F2 . C2 . F2 . G1 . G2 . D2 . G2 . | C2 . C3 . G2 . C3 . C2 . Bb1 . G1 . G1 .`),
    pad: bars(`C3+Eb3+G3+Bb3:16 ${R16.slice(2)} | C3+Eb3+G3+Bb3:8 . . . . . . . Ab2+C3+Eb3+G3:8 . . . . . . . | F2+Ab2+C3+Eb3:8 . . . . . . . Bb2+D3+F3+Ab3:8 . . . . . . . | Eb3+G3+Bb3+D4:16 ${R16.slice(2)} | Ab2+C3+Eb3+G3:16 ${R16.slice(2)} | G2+B2+D3+F3:16 ${R16.slice(2)} | F2+Ab2+C3+Eb3:8 . . . . . . . G2+B2+D3+F3:8 . . . . . . . | C3+Eb3+G3+D4:16 ${R16.slice(2)}`),
    brass: bars(`. . . . . . . . . . . . G3:3 . . G3 | C4:4 . . . G3:4 . . . Eb4:4 . . . C4:4 . . . | G4:6 . . . . . Bb4:2 . G4:4 . . . G4:3 . . G4 | C5:4 . . . C5:4 . . . Bb4:3 . . G4 F4:2 . Ab4:2 . | G4:8 . . . . . . . . . . . G3:3 . . G3 | Ab4:4 . . . Ab4:4 . . . D5:4 . . . D5:3 . . D5 | G4:6 . . . . . F4:2 . Eb4:4 . . . G3:3 . . G3 | G4:4 . . . G4:2 . Ab4:2 . G4:2 . F4:2 . Eb4:2 . D4:2 .`),
  });
  const B = section({
    ...drums, clap: D("....x.......x..."),
    bass: bars(`Ab1 . Ab2 . Eb2 . Ab2 . Bb1 . Bb2 . F2 . Bb2 . | G1 . G2 . D2 . G2 . C2 . C3 . G2 . C3 . | Ab1 . Ab2 . Eb2 . Ab2 . Bb1 . Bb2 . F2 . Bb2 . | G1 . G2 . D2 . G2 . G1 . F1 . Eb1 . D1 .`),
    pad: bars(`Ab2+C3+Eb3+G3:8 . . . . . . . Bb2+D3+F3+Ab3:8 . . . . . . . | G2+Bb2+D3+F3:8 . . . . . . . C3+Eb3+G3+Bb3:8 . . . . . . . | Ab2+C3+Eb3+G3:8 . . . . . . . Bb2+D3+F3+Ab3:8 . . . . . . . | G2+B2+D3+F3:16 ${R16.slice(2)}`),
    arp: bars(`C5 Eb5 G5 C6 C5 Eb5 G5 C6 D5 F5 Ab5 D6 D5 F5 Ab5 D6 | Bb4 D5 F5 Bb5 Bb4 D5 F5 Bb5 C5 Eb5 G5 C6 C5 Eb5 G5 C6 | C5 Eb5 G5 C6 C5 Eb5 G5 C6 D5 F5 Ab5 D6 D5 F5 Ab5 D6 | B4 D5 F5 G5 B4 D5 F5 G5 B4 D5 F5 G5 B4 D5 G5 B5`),
    brass: bars(`${R16} | ${R16} | Eb5:2 . C5 . Ab4:2 . C5 . D5:6 . . . . . . . | B4:8 . . . . . . . G4:8 . . . . . . .`),
  });
  return track(128, inst, ["A", "B", "A"], { A, B });
})();

// ================================================================ ARENA — kung-fu funk, 120
const arena = (() => {
  const inst = { ...KIT,
    bass: { wave: "square", vol: 0.16, cut: 700, pluck: true },
    flute: { wave: "triangle", vol: 0.12, vib: true, len: 2 },
    pluck: { wave: "square", vol: 0.06, cut: 2600, pluck: true },
  };
  const A = section({
    kick: D("x..x..x...x..x.."), snare: D("....x.......x..."), hat: D("x.x.x.x.x.x.x.x."), wood: D("..x...x...x.x..."),
    gong: [["A3", ...Array(15).fill(null)], D("................"), D("................"), D("................")],
    bass: bars(`A1 . A2 . C2 . A1 . D2 . E2 . G2 . E2 . | A1 . A2 . C2 . A1 . G1 . G2 . E2 . D2 . | A1 . A2 . C2 . A1 . D2 . E2 . G2 . E2 . | E1 . E2 . G1 . A1 . B1 . D2 . E2 . E1 .`),
    flute: bars(`G4:3 . . G4 A4 C5 A4 G4 E4:2 . G4:6 . . . . . | E4:2 . C5 D5 E5 D5 E5 C5 A4:2 . G4 A4:4 . . . . | A4:3 . . A4 C5 D5 C5 A4 G4:2 . E4:2 . D4 E4 G4 . | E4:4 . . . D4 E4 G4 A4 G4:8 . . . . . . .`),
    pluck: bars(`A3 . E4 . A3 . E4 . D4 . A4 . D4 . A4 . | A3 . E4 . A3 . E4 . G3 . D4 . G3 . D4 . | A3 . E4 . A3 . E4 . D4 . A4 . D4 . A4 . | E3 . B3 . E3 . B3 . E3 . B3 . E3 . G#3 .`),
  });
  const B = section({
    kick: D("x.x...x.x.x....."), snare: D("....x.......x.xx"), hat: D("xxxxxxxxxxxxxxxx"), wood: D("x.x.x.x.x.x.x.x."),
    bass: bars(`D2 . D3 . F2 . G2 . A2 . G2 . F2 . D2 . | C2 . C3 . E2 . G2 . A2 . G2 . E2 . C2 .`),
    flute: bars(`D5 E5 G5 A5 C6:4 . . . A5 G5 E5 D5 E5:4 . . . | C5 D5 E5 G5 A5:4 . . . G5 E5 D5 C5 A4:4 . . .`),
    pluck: bars(`D4 . A4 . D4 . A4 . C4 . G4 . C4 . G4 . | C4 . G4 . C4 . G4 . E4 . A4 . E4 . A4 .`),
  });
  return track(120, inst, ["A", "B", "A"], { A, B });
})();

// ================================================================ STOCK — tense electro, 140
const stock = (() => {
  const inst = { ...KIT,
    bass: { wave: "sawtooth", vol: 0.12, cut: 600, pluck: true },
    lead: { wave: "square", vol: 0.08, cut: 2200, slide: true, len: 2 },
    stab: { wave: "sawtooth", vol: 0.06, cut: 1800, pluck: true, len: 1 },
  };
  const A = section({
    kick: D("x...x...x...x..."), clap: D("....x.......x..."), hat: D(".x.x.x.x.x.x.xox"),
    bass: bars(`E1 E1 E2 E1 . E1 E2 . E1 E1 E2 E1 G1 . A1 . | Eb1 Eb1 Eb2 Eb1 . Eb1 Eb2 . Eb1 Eb1 Eb2 Eb1 Gb1 . Ab1 . | D1 D1 D2 D1 . D1 D2 . D1 D1 D2 D1 F1 . G1 . | C#1 C#1 C#2 C#1 . C1 C2 . B0 B0 B1 B0 A#0 . A0 .`),
    stab: bars(`. . E3+G3+B3 . . . E3+G3+B3 . . . E3+G3+B3 . . E3+G3+B3 . . | . . Eb3+Gb3+Bb3 . . . Eb3+Gb3+Bb3 . . . Eb3+Gb3+Bb3 . . Eb3+Gb3+Bb3 . . | . . D3+F3+A3 . . . D3+F3+A3 . . . D3+F3+A3 . . D3+F3+A3 . . | . . C#3+E3+G#3 . . . C3+Eb3+G3 . . . B2+D3+F#3 . . A#2+C#3+F3 . .`),
    lead: bars(`B4:3 . . B4 C5:2 . E4:6 . . . . . . . . . | Bb4:3 . . Bb4 B4:2 . Eb4:6 . . . . . . . . . | A4:3 . . A4 Bb4:2 . D4:6 . . . . . . . . . | G#4 G4 F#4 F4 E4 D#4 D4 C#4 C4:8 . . . . . . .`),
  });
  const B = section({
    kick: D("x.x.x...x.x.x..."), clap: D("....x.......x.xx"), hat: D("xxxxxxxxxxxxxxxx"),
    bass: bars(`A0 A0 A1 A0 . A0 A1 . A0 A0 A1 A0 C1 . D1 . | E1 E1 E2 E1 . E1 E2 . E1 . D#1 . D1 . C#1 .`),
    lead: bars(`E5 D5 B4 A4 G4 E4 D4 B3 E5 D5 B4 A4 G4 E4 D4 B3 | E4:16 ${R16.slice(2)}`),
  });
  return track(140, inst, ["A", "A", "B"], { A, B });
})();

// ================================================================ SEATTLE — rainy trip-hop, 86
const seattle = (() => {
  const inst = { ...KIT,
    bass: { wave: "triangle", vol: 0.24, len: 3 },
    rhodes: { wave: "triangle", vol: 0.06, cut: 1800, len: 8 },
    lead: { wave: "square", vol: 0.065, vib: true, cut: 1800, len: 2 },
    bell: { wave: "sine", vol: 0.06, pluck: true, len: 6 },
  };
  const A = section({
    kick: D("x......x..x....."), snare: D("....x.......x..."), hat: D("x.x.x.x.x.x.x.xx"),
    bass: bars(`C2:4 . . . . . . C2 Eb2:4 . . . G1:4 . . . | Ab1:4 . . . . . . Ab1 Bb1:4 . . . G1:4 . . . | F1:4 . . . . . . F1 G1:4 . . . Ab1:4 . . . | G1:4 . . . . . . G1 B1:4 . . . D2:4 . . .`),
    rhodes: bars(`Eb3+G3+Bb3+D4:16 ${R16.slice(2)} | Ab2+C3+Eb3+G3:8 . . . . . . . G2+B2+D3+F3:8 . . . . . . . | F2+Ab2+C3+Eb3:8 . . . . . . . Ab2+C3+Eb3+G3:8 . . . . . . . | G2+B2+D3+F3:16 ${R16.slice(2)}`),
    lead: bars(`Eb5:4 . . . . Eb5 Ab5:2 . G5:4 . . . . G5 Eb5 . | D5:3 . . C5 Eb5:2 . D5:2 . C5:6 . . . . . Ab4:2 . | D4:4 . . . D4:2 . G4:2 . D4:4 . . . D4:2 . Bb4:2 . | Ab4:3 . . G4 Bb4:2 . Ab4:2 . G4:8 . . . . . . .`),
  });
  const B = section({
    kick: D("x......x..x..x.."), snare: D("....x.......x..."), hat: D("x.x.x.x.x.x.x.x."),
    bass: bars(`Ab1:4 . . . . . . Ab1 C2:4 . . . Eb2:4 . . . | G1:4 . . . . . . G1 D2:4 . . . G2:4 . . .`),
    rhodes: bars(`Ab2+C3+Eb3+G3:16 ${R16.slice(2)} | G2+Bb2+D3+F3:16 ${R16.slice(2)}`),
    bell: bars(`. . . . G5 . . . . . Eb5 . . . C5 . | . . . . D5 . . . . . B4 . . . G4 .`),
    lead: bars(`${R16} | C5:2 . Bb4:2 . Ab4:2 . G4:10 . . . . . . . . .`),
  });
  return track(86, inst, ["A", "B"], { A, B }, { swing: 0.08 });
})();

// ================================================================ TEXAS — minor jazz waltz (6/8, 12 steps a bar)
const texas = (() => {
  const inst = { ...KIT,
    bass: { wave: "triangle", vol: 0.22, len: 4 },
    comp: { wave: "triangle", vol: 0.055, cut: 2000, pluck: true, len: 2 },
    lead: { wave: "square", vol: 0.075, vib: true, cut: 2600, len: 2 },
    bell: { wave: "sine", vol: 0.08, pluck: true, len: 6 },
  };
  const R12 = ". . . . . . . . . . . .";
  const A = section({
    kick: D("x.....x....."), snare: D("......x....."), hat: D("x.xx.xx.xx.x"),
    bass: bars(`A2:6 . . . . . E2:6 . . . . . | E2:6 . . . . . B1:6 . . . . . | A2:6 . . . . . C3:6 . . . . . | E2:6 . . . . . G#2:6 . . . . . | D2:6 . . . . . F2:6 . . . . . | E2:6 . . . . . B1:6 . . . . . | A1:6 . . . . . E2:6 . . . . . | A2:6 . . . . . E2:6 . . . . .`),
    comp: bars(`. . C4+E4+A4 . C4+E4+A4 . . . C4+E4+A4 . C4+E4+A4 . | . . D4+G#4+B4 . D4+G#4+B4 . . . D4+G#4+B4 . D4+G#4+B4 . | . . C4+E4+A4 . C4+E4+A4 . . . C4+E4+A4 . C4+E4+A4 . | . . D4+G#4+B4 . D4+G#4+B4 . . . D4+G#4+B4 . D4+G#4+B4 . | . . D4+F4+A4 . D4+F4+A4 . . . D4+F4+A4 . D4+F4+A4 . | . . D4+G#4+B4 . D4+G#4+B4 . . . D4+G#4+B4 . D4+G#4+B4 . | . . C4+E4+A4 . C4+E4+A4 . . . D4+G#4+B4 . D4+G#4+B4 . | . . C4+E4+A4 . C4+E4+A4 . . . C4+E4+A4 . . .`),
    lead: bars(`G4:2 . A4:2 . G4:2 . F4:2 . E4:2 . D4:2 . | E4:6 . . . . . A3:6 . . . . . | A3:2 . C4:2 . A4:2 . G#4:2 . A4:3 . . E4 | E4:12 . . . . . . . . . . . | F4:2 . G4:2 . F4:2 . E4:2 . D4:2 . C4:2 . | B3:6 . . . . . E3:6 . . . . . | G#3:2 . A3:2 . B3:2 . E4:2 . C4:3 . . B3 | A3:12 . . . . . . . . . . .`),
  });
  const B = section({
    kick: D("x.....x....."), snare: D("......x....."), hat: D("x.xx.xx.xx.x"),
    bass: bars(`F2:6 . . . . . C3:6 . . . . . | G2:6 . . . . . D3:6 . . . . . | E2:6 . . . . . B2:6 . . . . . | A2:6 . . . . . E2:6 . . . . .`),
    comp: bars(`. . A3+C4+E4 . A3+C4+E4 . . . A3+C4+E4 . A3+C4+E4 . | . . B3+D4+F4 . B3+D4+F4 . . . B3+D4+F4 . B3+D4+F4 . | . . G#3+B3+D4 . G#3+B3+D4 . . . G#3+B3+D4 . G#3+B3+D4 . | . . A3+C4+E4 . A3+C4+E4 . . . A3+C4+E4 . . .`),
    lead: bars(`C5:3 . . A4 . . F4:6 . . . . . | D5:3 . . B4 . . G4:6 . . . . . | E5:3 . . D5 C5 B4 G#4:6 . . . . . | A4:12 . . . . . . . . . . .`),
    bell: bars(`. . . . . . . . . . E6 . | . . . . . . . . . . F6 . | . . . . . . . . . . E6 . | ${R12}`),
  });
  return track(70, inst, ["A", "B", "A"], { A, B }, { steps: 12, stepSec: 60 / (70 * 6), swing: 0.08 });
})();

// ================================================================ SAM — city pop, 118
const sam = (() => {
  const inst = { ...KIT,
    bass: { wave: "square", vol: 0.14, cut: 900, pluck: true },
    ep: { wave: "triangle", vol: 0.06, cut: 2600, pluck: true, len: 2 },
    lead: { wave: "square", vol: 0.08, vib: true, cut: 3000, len: 2 },
  };
  const A = section({
    kick: D("x...x...x...x..."), snare: D("....x.......x..."), hat: D("x.xox.xox.xox.xo"), clap: D("....x.......x..."),
    bass: bars(`F2 . F2 F3 . F2 . A2 Bb2 . Bb2 Bb3 . Bb2 . C3 | G2 . G2 G3 . G2 . Bb2 C3 . C3 C4 . C3 . E3`),
    ep: bars(`. . E4+A4+C5 . . E4+A4+C5 . . . . D4+F4+A4 . . D4+F4+A4 . . | . . F4+A4+D5 . . F4+A4+D5 . . . . E4+G4+Bb4 . . E4+G4+C5 . .`),
    lead: bars(`A5 G5 F5 . E5:2 . C5 D5:2 . F5 . E5:2 . . . . | D5 E5 F5 . G5:2 . A5 Bb5:2 . A5 G5 E5:2 . . . . | A5 G5 F5 . E5:2 . C5 D5:2 . F5 . A5:2 . . . . | G5:8 . . . . . . . . . . . . . . .`),
  });
  return track(118, inst, ["A"], { A });
})();

// ================================================================ RESULTS — short triumphant jazz loop
const results = (() => {
  const inst = { ...KIT,
    bass: { wave: "triangle", vol: 0.22, len: 2 },
    brass: { wave: "sawtooth", vol: 0.09, cut: 2600, len: 2 },
    pad: { wave: "sawtooth", vol: 0.06, cut: 1600, len: 8 },
  };
  const A = section({
    kick: D("x.....x...x....."), snare: D("....x.......x..."), hat: D("x.x.x.x.x.x.x.x."),
    bass: bars(`D2 . A2 . D3 . A2 . G2 . D3 . G3 . D3 . | C2 . G2 . C3 . G2 . A1 . E2 . A2 . C#3 .`),
    pad: bars(`F3+A3+C4+E4:8 . . . . . . . F3+B3+D4+G4:8 . . . . . . . | E3+G3+C4+E4:8 . . . . . . . E3+G3+C#4+A4:8 . . . . . . .`),
    brass: bars(`A4:2 . D5:2 . F5:4 . . . E5 D5 C5:2 . D5 . . . | E5:4 . . . C5:2 . A4:2 . C#5:6 . . . . . . .`),
  });
  return track(112, inst, ["A"], { A }, { swing: 0.1 });
})();

export const TRACKS = { title, select, studio, arena, stock, seattle, texas, sam, results };
