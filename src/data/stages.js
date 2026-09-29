// Stage layouts + hazards. Visual dressing lives in src/render/stageDraw.js.
import { Projectile } from "../sim/projectile.js";

const BF_BLAST = { left: -1900, right: 1900, top: -1500, bottom: 980 };

export const STAGES = {
  studio: {
    id: "studio", name: "这就是中国·演播室", owner: "zhang", music: "studio",
    desc: "标准三平台。灯光、机位、LED大屏,一切为了“震撼”。",
    plats: [
      { x1: -620, x2: 620, y: 0, solid: true, depth: 150 },
      { x1: -440, x2: -175, y: -195 }, { x1: 175, x2: 440, y: -195 }, { x1: -130, x2: 130, y: -380 },
    ],
    blast: BF_BLAST, spawns: [{ x: -400, y: -40 }, { x: 400, y: -40 }, { x: -300, y: -240 }, { x: 300, y: -240 }],
    respawn: { x: 0, y: -560 }, cam: { left: -1700, right: 1700, top: -1250, bottom: 520 },
  },
  arena: {
    id: "arena", name: "浑元擂台", owner: "mabaoguo", music: "arena",
    desc: "没有平台,没有退路。点到为止?不存在的。",
    plats: [{ x1: -700, x2: 700, y: 0, solid: true, depth: 170 }],
    blast: { left: -2000, right: 2000, top: -1500, bottom: 980 },
    spawns: [{ x: -420, y: -40 }, { x: 420, y: -40 }, { x: -160, y: -40 }, { x: 160, y: -40 }],
    respawn: { x: 0, y: -520 }, cam: { left: -1800, right: 1800, top: -1250, bottom: 520 },
  },
  stock: {
    id: "stock", name: "A股交易大厅", owner: "huxijin", music: "stock",
    desc: "三根K线就是平台,跟着大盘上蹿下跳。每隔一阵“熔断”一次。",
    plats: [
      { x1: -560, x2: 560, y: 0, solid: true, depth: 150 },
      { x1: -440, x2: -220, y: -200, kind: "candle", path: candlePath(0) },
      { x1: -110, x2: 110, y: -260, kind: "candle", path: candlePath(1) },
      { x1: 220, x2: 440, y: -200, kind: "candle", path: candlePath(2) },
    ],
    blast: BF_BLAST, spawns: [{ x: -380, y: -40 }, { x: 380, y: -40 }, { x: -150, y: -40 }, { x: 150, y: -40 }],
    respawn: { x: 0, y: -600 }, cam: { left: -1700, right: 1700, top: -1250, bottom: 520 },
    hazards: stockHazard,
  },
  seattle: {
    id: "seattle", name: "西雅图冰雨夜", owner: "laoa", music: "seattle",
    desc: "阴雨连绵的西雅图。冻雨一来,地面结冰打滑。舞台底下那条红线,就是斩杀线。",
    plats: [
      { x1: -600, x2: 600, y: 0, solid: true, depth: 150 },
      { x1: -470, x2: -210, y: -175 }, { x1: 210, x2: 470, y: -175 },
    ],
    blast: BF_BLAST, spawns: [{ x: -380, y: -40 }, { x: 380, y: -40 }, { x: -340, y: -220 }, { x: 340, y: -220 }],
    respawn: { x: 0, y: -520 }, cam: { left: -1700, right: 1700, top: -1250, bottom: 540 },
    hazards: rainHazard,
  },
  texas: {
    id: "texas", name: "德州·美国新家", owner: "chen", music: "texas",
    desc: "2021年德州大停电。雪夜里时不时拉闸,眼睛放亮点。",
    plats: [
      { x1: -580, x2: 580, y: 0, solid: true, depth: 150 },
      { x1: -480, x2: -250, y: -160 }, { x1: 250, x2: 480, y: -160 }, { x1: -150, x2: 150, y: -300, kind: "roof" },
    ],
    blast: BF_BLAST, spawns: [{ x: -380, y: -40 }, { x: 380, y: -40 }, { x: -360, y: -200 }, { x: 360, y: -200 }],
    respawn: { x: 0, y: -540 }, cam: { left: -1700, right: 1700, top: -1250, bottom: 520 },
    hazards: blackoutHazard,
  },
  sam: {
    id: "sam", name: "山姆会员店", owner: "huchenfeng", music: "sam",
    desc: "“没有山姆的城市,年轻人不要待。”购物车会从货架间冲出来。",
    plats: [
      { x1: -660, x2: 660, y: 0, solid: true, depth: 150 },
      { x1: -520, x2: -270, y: -205, kind: "shelf" }, { x1: 270, x2: 520, y: -205, kind: "shelf" },
    ],
    blast: { left: -2000, right: 2000, top: -1500, bottom: 980 },
    spawns: [{ x: -420, y: -40 }, { x: 420, y: -40 }, { x: -390, y: -250 }, { x: 390, y: -250 }],
    respawn: { x: 0, y: -520 }, cam: { left: -1800, right: 1800, top: -1250, bottom: 520 },
    hazards: cartHazard,
  },
};
export const STAGE_ORDER = ["studio", "arena", "stock", "seattle", "texas", "sam"];

// ------------------------------------------------------------------ A股: index random walk
function candlePath(i) {
  return (frame, p, st) => {
    const S = st.state;
    if (!S.idx) { S.idx = [0, 0, 0]; S.v = [0, 0, 0]; S.crash = 0; S.series = []; S.index = 3000; }
    return { x: 0, y: S.idx[i] };
  };
}
function stockHazard(st, w) {
  const S = st.state;
  if (!S.idx) return;
  const on = w.rules.hazards;
  if (on && !S.crash && st.frame % 60 === 0 && st.frame > 600 && w.rng.chance(0.04)) {
    S.crash = 200; w.emit({ t: "stageEvent", id: "crash", text: "熔断!" });
  }
  for (let i = 0; i < 3; i++) {
    if (S.crash > 0) {
      const target = S.crash > 120 ? 230 : 0;
      S.idx[i] += (target - S.idx[i]) * 0.08;
    } else {
      S.v[i] += (w.rng.next() - 0.5) * 0.35 - S.idx[i] * 0.0009;
      S.v[i] *= 0.97;
      S.idx[i] = Math.max(-170, Math.min(120, S.idx[i] + S.v[i]));
    }
  }
  if (S.crash > 0) S.crash--;
  // ticker: pseudo index follows the middle candle
  S.index = Math.round(3000 - S.idx[1] * 2.4);
  if (st.frame % 20 === 0) { S.series.push(S.index); if (S.series.length > 90) S.series.shift(); }
  for (let i = 1; i <= 3; i++) st.plats[i].green = S.v[i - 1] > 0 || S.crash > 0;
}

// ------------------------------------------------------------------ 西雅图: freezing rain
function rainHazard(st, w) {
  const S = st.state;
  S.t = (S.t || 0) + 1;
  if (!S.next) S.next = 1500;
  if (!S.ice && S.t >= S.next) { S.ice = 540; w.emit({ t: "stageEvent", id: "ice", text: "冻雨来了,地面结冰!" }); }
  if (S.ice > 0) { S.ice--; if (S.ice === 0) { S.t = 0; S.next = 1500 + w.rng.int(0, 600); } }
  st.plats[0].ice = S.ice > 0 ? 1 : 0;
}

// ------------------------------------------------------------------ 德州: blackout
function blackoutHazard(st, w) {
  const S = st.state;
  S.t = (S.t || 0) + 1;
  if (!S.next) S.next = 1300;
  if (!S.dark && S.t >= S.next) { S.dark = 260; w.emit({ t: "stageEvent", id: "dark", text: "德州电网:拉闸限电!" }); }
  if (S.dark > 0) { S.dark--; if (S.dark === 0) { S.t = 0; S.next = 1400 + w.rng.int(0, 700); } }
}

// ------------------------------------------------------------------ 山姆: carts
function cartHazard(st, w) {
  const S = st.state;
  S.t = (S.t || 0) + 1;
  if (!S.next) S.next = 1100;
  if (S.t === S.next - 90) { S.warn = 90; S.dir = w.rng.chance(0.5) ? 1 : -1; w.emit({ t: "stageEvent", id: "cartWarn", text: "购物车来了!" }); }
  if (S.warn > 0) S.warn--;
  if (S.t >= S.next) {
    S.t = 0; S.next = 1000 + w.rng.int(0, 600);
    const dir = S.dir;
    w.spawnProjectile(new Projectile({
      owner: null, kind: "cart", x: -dir * 900, y: -34, vx: dir * 15, vy: 0, r: 34, life: 160, hits: 99, pierce: true,
      hb: { dmg: 13, ang: 40, bkb: 55, kbg: 70, eff: "hit" }, reflectable: false, absorbable: false, clank: null, dir,
      moveId: "cart",
    }));
  }
}
