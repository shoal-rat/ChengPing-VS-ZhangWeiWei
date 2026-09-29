// Round-robin CPU balance run: node tools/balance.mjs [perPair] [level]
import { World } from "../src/sim/world.js";
import { CpuSource } from "../src/sim/ai.js";
import { CHARS, ROSTER } from "../src/data/chars/index.js";
import { STAGES, STAGE_ORDER } from "../src/data/stages.js";
import { RNG } from "../src/sim/math.js";

const PER = parseInt(process.argv[2] || "4"), LV = parseInt(process.argv[3] || "7");
const win = {}, games = {}, sd = {}, frames = [];
const vs = {};
let seed = 1;
const t0 = Date.now();
for (const a of ROSTER) for (const b of ROSTER) {
  if (a === b) continue;
  for (let k = 0; k < PER; k++) {
    seed++;
    const stage = STAGES[STAGE_ORDER[seed % STAGE_ORDER.length]];
    const w = new World({ stage, seed, rules: { stocks: 3, items: k % 2 === 0, hazards: true },
      players: [{ def: CHARS[a], source: new CpuSource(LV, new RNG(seed * 7)), cpu: LV }, { def: CHARS[b], source: new CpuSource(LV, new RNG(seed * 13)), cpu: LV }] });
    let f = 0;
    while (!w.over && f < 60 * 60 * 5) { w.step(); f++; while (w.freeze) w.step(); }
    frames.push(f);
    for (const x of w.fighters) { games[x.id] = (games[x.id] || 0) + 1; sd[x.id] = (sd[x.id] || 0) + x.stats.sds; }
    if (w.over && w.winner) {
      win[w.winner.id] = (win[w.winner.id] || 0) + 1;
      const l = w.fighters.find((x) => x !== w.winner).id;
      const key = [w.winner.id, l].join(">");
      vs[key] = (vs[key] || 0) + 1;
    }
  }
}
console.log("matches", frames.length, "avg", (frames.reduce((a, b) => a + b, 0) / frames.length / 60).toFixed(0), "s", "wall", ((Date.now() - t0) / 1000).toFixed(0), "s");
for (const c of ROSTER) console.log(c.padEnd(11), "win%", ((win[c] || 0) / games[c] * 100).toFixed(0).padStart(3), " sd/game", (sd[c] / games[c]).toFixed(2));
const line = (a) => ROSTER.map((b) => a === b ? "  - " : String(Math.round(((vs[a + ">" + b] || 0) / (2 * PER)) * 100)).padStart(4)).join("");
console.log("row beats col (%):", ROSTER.map((c) => c.slice(0, 4)).join(" "));
for (const a of ROSTER) console.log(a.slice(0, 10).padEnd(11), line(a));
