# 梗图格斗 2.0 — Total Redev Design

## Diagnosis of the old build
- Photo heads were 256px blurry circle cutouts glued on ~90px procedurally-drawn stick bodies → unreadable, ugly.
- Projectiles were literal text pills ("安卓", "税单") floating on a dark empty screen.
- 9 fighters, most of them redundant "版本" splits of the same person, each shallow.
- Systems bloat (guard heat, execution lines, scan lines) without core feel: no weight, no impact.

## New direction

### Art: full AI generation, KOF style (v3 — supersedes the sticker plan)
- Every fighter is drawn by an AI image generator in **KOF XIII hand-drawn arcade style**,
  full body, from the reference photos: two 2×4 green-screen pose sheets per character
  (idle/walk/jab/uppercut/guard/jump/hit/defeat + cast/smash/dash/sweep/win/taunt/channel/flykick),
  plus a dramatic select-screen bust portrait.
- Stages (演播室 / 讲堂 / 东百夜市), props and the logo are AI-generated too
  (Codex CLI image tool primary, Pollinations fallback).
- `pipeline/build_assets.py` chroma-keys, slices by connected components, computes feet anchors,
  and packs `assets/game/` + `manifest.json` — the engine only ever loads baked PNGs.
- Animation life comes from the engine: squash & stretch, lean, hitstop, afterimages, particles.

### Roster (6 fighters, all distinct archetypes)

| # | Fighter | Archetype | Kit |
|---|---------|-----------|-----|
| 1 | 陈平 | Zoner | L 麦克风戳 · H 宏观上勾拳 · S1 水饺导弹(arc) · S2 跑步进入小康(dash) · ULT 陈平不等式 ¥2000>$3000 巨型光束 |
| 2 | 张维为 | Counter/caster | L 指点江山掌 · H 精装书砸(《这就是中国》) · S1 西方震撼波 · S2 「这就是一种自信」反弹结界 · ULT 中国人你要自信(金色聚光灯+弹幕) |
| 3 | 胡锡进 | Mid-range pressure | L 键盘连打 · H 保温杯抡 · S1 社评飞盘(boomerang, 回程"叼盘成功") · S2 「复杂化」减速场 · ULT A股天谴(绿色K线雨) |
| 4 | 峰哥 | Rushdown | L 王八拳 · H 大耳瓜子 · S1 东百锐评(音波锥) · S2 亡命天涯(穿身位移) · ULT 压抑爆发(狂暴buff) |
| 5 | 户晨风 | Skirmisher | L 自拍杆抽 · H 三脚架砸 · S1 手机测评(iPhone直线快弹/安卓抛物慢弹交替) · S2 账号转世(封禁牌遮身+背后重现) · ULT 优质人类认证(苹果审判光柱) |
| 6 | 马保国 | Grappler/parry boss | L 五连鞭段 · H 接化发(command counter) · S1 闪电鞭(whip projectile) · S2 偷袭(不讲武德 teleport behind) · ULT 闪电五连鞭(全屏五段) · 受击台词「大意了没有闪」 |

Arcade final boss: **金色传说·马保国** (gold palette + aura, +30% stats).

### Core mechanics (fewer, deeper, tuned for feel)
- 1280×720 canvas, fixed 60Hz timestep, interpolated render.
- Movement: walk, dash (fwd)/backdash (i-frames), jump w/ air control, fast-fall.
- Offense: Light (chain ×3) → Heavy (launcher/knockdown) cancel; 2 specials on cooldown; ULT on full meter.
- Defense: hold-back guard w/ chip + guard gauge; **just-guard** (8f) refunds meter; 张维为/胡锡进/马保国 get kit reflects/counters.
- Meter: build on hit/whiff/being-hit; ULT = cinematic freeze + banner quote.
- Juice: hitstop (2–8f by damage), trauma screenshake, impact particles + dust, damage popups,
  combo counter with meme ranks (3+ 有点东西 / 5+ 整活成功 / 8+ 赢麻了 / 12+ 遥遥领先!), KO slow-mo punch-in, PERFECT = 「毫发无损」.
- AI: 3 difficulties; per-character personality (zoner/turtle/rushdown/grappler); reaction-delay based, no input reading.
- Modes: Arcade (3 matches + 马保国 boss, score + grade), Versus local 2P, best-of-3 rounds.
- Audio: WebAudio synth (punchy noise-burst hits, sub thump, per-stage pentatonic BGM loop) — zero audio files.

### Meme quote pools (intro / hit / win / lose per character)
陈平: 「美国人民生活在水深火热之中」「¥2000比$3000过得好」…
张维为: 「我走过一百多个国家」「西方,震撼!」「我觉得这就是一种自信」…
胡锡进: 「事情是复杂的」「老胡认为要冷静」「2800点以下遍地黄金」…
峰哥: 「兄弟你这是压抑了」「东百往事」…
户晨风: 「用什么手机?说」「祝你早日用上苹果」「唉,安卓」…
马保国: 「年轻人不讲武德」「耗子尾汁」「大意了啊,没有闪」「接!化!发!」…
