// Headless AI-vs-AI matches: catches runtime errors and prints balance stats.
//   node tools/sim_test.mjs [matches] [lv] [chars...]
import { World } from "../src/sim/world.js";
import { CpuSource } from "../src/sim/ai.js";
import { CHARS, ROSTER } from "../src/data/chars/index.js";
import { STAGES, STAGE_ORDER } from "../src/data/stages.js";
import { RNG } from "../src/sim/math.js";

const N = parseInt(process.argv[2] || "6");
const LV = parseInt(process.argv[3] || "7");
const pool = process.argv.slice(4).length ? process.argv.slice(4) : ROSTER;
const wins = {}, games = {}, kos = {}, sds = {};
let totalFrames = 0, errors = 0;
const states = {};
const evc = {};
for (let m = 0; m < N; m++) {
  const rng = new RNG(1000 + m);
  const a = pool[m % pool.length], b = pool[(m * 3 + 1) % pool.length];
  const stage = STAGES[STAGE_ORDER[m % STAGE_ORDER.length]];
  const w = new World({ stage, seed: 77 + m, rules: { stocks: 3, items: m % 2 === 0, hazards: true },
    players: [{ def: CHARS[a], source: new CpuSource(LV, rng), cpu: LV }, { def: CHARS[b], source: new CpuSource(LV, new RNG(5000 + m)), cpu: LV }] });
  let f = 0;
  try {
    while (!w.over && f < 60 * 60 * 6) {
      w.step(); f++;
      for (const e of w.events) if (["fs", "fsready", "unbox", "throwitem", "pickup", "counter", "absorb", "reflect", "grab", "parry", "tech", "shieldbreak", "itemspawn", "move"].includes(e.t)) { const k = e.t === "move" ? "mv:" + e.id : e.t; evc[k] = (evc[k] || 0) + 1; }
      for (const x of w.fighters) states[x.state] = (states[x.state] || 0) + 1;
      if (w.freeze) { while (w.freeze) w.step(); }
    }
  } catch (e) { errors++; console.error(`match ${m} (${a} vs ${b} @ ${stage.id}) frame ${f}:`, e.stack); continue; }
  totalFrames += f;
  const win = w.winner;
  games[a] = (games[a] || 0) + 1; games[b] = (games[b] || 0) + 1;
  if (win && w.over) wins[win.id] = (wins[win.id] || 0) + 1;
  for (const x of w.fighters) { kos[x.id] = (kos[x.id] || 0) + x.stats.kos; sds[x.id] = (sds[x.id] || 0) + x.stats.sds; }
  console.log(`#${m} ${a} vs ${b} @${stage.id}: ${w.over ? "winner " + (win && win.id) : "TIMEOUT"} in ${(f / 60).toFixed(0)}s  ` +
    w.fighters.map((x) => `${x.id}[st${x.stocks} ko${x.stats.kos} sd${x.stats.sds} dmg${x.stats.dmgDealt.toFixed(0)} kl${x.killLine}]`).join(" "));
}
console.log("\nerrors", errors, "avg match", (totalFrames / N / 60).toFixed(1), "s");
console.log("wins", wins, "games", games, "\nkos", kos, "sds", sds);
const tot = Object.values(states).reduce((a, b) => a + b, 0);
console.log("events", Object.fromEntries(Object.entries(evc).sort((a, b) => b[1] - a[1])));
console.log("state share", Object.fromEntries(Object.entries(states).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, (v / tot * 100).toFixed(1) + "%"])));
