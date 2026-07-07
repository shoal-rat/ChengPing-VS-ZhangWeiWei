# 梗图格斗:陈平 VS 张维为 · MEME FIGHT ARCADE

A **KOF-style meme arena fighter** starring China's most meme-worthy internet commentators —
fully rebuilt from scratch: **all character art, portraits and stages are AI-generated**,
the engine is a dependency-free HTML5 canvas fighting game.

> 本作为梗图恶搞 (parody)。Public personas and meme culture turned into an arcade fighter.
> 全部立绘由 AI 生成。

## ▶ Play

Open `index.html` over any static server:

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Roster (6 fighters, distinct archetypes)

| Fighter | Archetype | Signature kit |
| --- | --- | --- |
| 陈平·购买力宗师 | 远程压制 Zoner | 水饺导弹 · 转进德州(「人在美国,刚下飞机!」) · 必杀「陈平不等式」¥2000>$3000 光束 |
| 张维为·自信护法 | 立回反制 Caster | 西方震撼波 · 「这就是一种自信」反弹结界 · 必杀「中国人,你要自信」弹幕天降 |
| 胡锡进·叼盘老编 | 中距压制 Pressure | 社评飞盘(回程「叼盘成功!」) · 「复杂化」减速场 · 必杀「3000点保卫战」绿色K线雨 |
| 峰哥·东百浪人 | 贴脸猛攻 Rushdown | 东百锐评音波 · 亡命天涯穿身 · 必杀「压抑爆发」乱舞 |
| 户晨风·评测判官 | 游走骚扰 Skirmisher | 手机测评(苹果快弹/安卓抛物) · 账号转世(封禁牌遁) · 必杀「人上人认证」 |
| 马保国·浑元掌门 | 接化发宗师 Grappler | 闪电鞭 · 偷袭(「来骗!来偷袭!」) · 极限招架自动「接!化!发!」 · 必杀「闪电五连鞭」 |

**Arcade final boss:** 金色传说·马保国 — 血量加成 + 半血触发一次金身霸体(「年轻人,不讲武德。」)。
无伤通关 BOSS 战解锁台词「训练有素,有备而来」。

## Controls

**P1:** `A/D` 移动(后方向=防御) · `W` 跳 · `S` 快落 · 双击方向 冲刺/后撤(后撤带无敌帧) ·
`J` 普攻(可三连) · `K` 重击(升龙/近身投技) · `U` 技能1 · `I` 技能2 · `O` 必杀(气满) · `T` 嘲讽

**P2 (双人对战,主菜单按 `V`):** 方向键移动 · `,` 普攻 · `.` 重击 · `;` 技能1 · `'` 技能2 · `/` 必杀 · 右`Shift` 嘲讽

`P`/`Esc` 暂停(再按 `Esc` 回主菜单) · 暂停中 `J` 出招表 · `[` `]` 音量 · `M` 静音 · 主菜单 `1/2/3` AI难度

## Fight systems

- 三局两胜 · 60 秒计时 · 时间到比血量
- 普攻三连(第三段扫堂) · 重击=通用升龙(对空/浮空起手) · 近身对防御目标重击=投技
- 防御:后方向格挡(削血 12%,防御槽会被打爆 → 破防硬直);**极限招架**(8帧内格挡)无削血,
  马保国的极限招架自动触发「接化发」摔投反击
- 气槽:命中/挨打积攒(挥空不给气) · 必杀开场定格演出,全程霸体、可防(削血加倍但打不死)
- 连击伤害递减(下限30%) · 浮空追击 · 14连自动脱出防无限
- 弹幕互相抵消(同级对碰),必杀级弹幕穿透一切;每人同屏至多2发
- 传送类技能(偷袭/账号转世)带预警音/台词 + 固定落点 + 硬直,可被读
- AI:3档难度 × 6种性格(zoner/caster/pressure/rushdown/skirmisher/grappler),延迟反应,不读指令

## Tech

- `index.html` + `js/` — self-contained canvas engine: fixed 60 Hz timestep, hitstop,
  trauma screenshake, particle system, dynamic camera, WebAudio synth SFX + BGM (zero audio files)
- `assets/game/` — baked PNG sprites + `manifest.json` (the engine only loads these)
- `assets/aiwork/` — raw AI-generated sheets (pose sheets, portraits, stages)
- `pipeline/gen_ai.py` — drives the **Codex CLI image generator**: per-character 2×4 pose sheets
  (idle/walk/jab/uppercut/guard/jump/hit/defeat + cast/smash/dash/sweep/win/taunt/channel/flykick),
  select-screen portraits, stages, props
- `pipeline/gen_pollinations.py` — free-API fallback generator (stages/props) for when the Codex quota is exhausted
- `pipeline/build_assets.py` — chroma-keys the green screens, slices sheets via connected components,
  computes feet anchors, packs `assets/game/` + manifest

Regenerate art: `python3 pipeline/gen_ai.py list|run <job…>`, then `python3 pipeline/build_assets.py`.

## Notes

- Parody project based on public personas and meme culture; affectionate mockery only.
- Image sources for the AI reference photos are documented in [assets/CREDITS.md](assets/CREDITS.md).
- The legacy pygame build was removed in the 3.0 rewrite (see git history if you miss it).
