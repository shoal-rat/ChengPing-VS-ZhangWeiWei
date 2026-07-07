// 梗图格斗 2.0 — data tables. All tuning lives here; engine code reads, never invents.
"use strict";

window.GAME_DATA = (() => {
  const settings = {
    width: 1280, height: 720,
    floorY: 640,
    stageW: 1780,          // world width, camera scrolls
    wallPad: 70,
    gravity: 3200,
    walkSpeed: 265, backSpeed: 205, airDrift: 200,
    jumpVy: -1120, fastFallMul: 1.65,
    dashSpeed: 720, dashFrames: 14, dashCd: 18,
    backdashSpeed: 560, backdashFrames: 22, backdashIframes: 8, backdashCd: 60,
    doubleTapWindow: 14,   // frames for double-tap dash
    charH: 335,            // display height of idle pose
    maxHealth: 200, maxMeter: 100, maxGuard: 100,
    guardRegen: 34,        // per second, only while not blocking
    chipRatio: 0.12, ultChipRatio: 0.24,
    justGuardWindow: 8,    // frames
    guardGaugeRatio: 0.85, // gauge damage = dmg * this
    crumpleFrames: 70,
    throwRange: 78, throwDmg: 20, throwStartup: 5, throwCd: 45,
    roundTime: 60, roundsToWin: 2,
    comboScaleStep: 0.10, comboScaleFloor: 0.30,
    juggleLift: 0.86,      // each relaunch keeps this much lift
    maxComboHits: 14,
    meterOnHit: 0.55, meterOnBlockDealt: 0.25, meterOnTaken: 0.38,
    projCap: 2,
    ultFreeze: 52,         // cinematic freeze frames
    introTime: 2.1, koSlowmo: 0.25, koSlowFrames: 90,
    aiTickMs: 50,
  };

  // Baseline frame data (60fps). Per-move overrides in kits.
  const frames = {
    light: { startup: 6, active: 3, recovery: 9, dmg: 5, chainWindow: 14 },
    light3: { startup: 7, active: 4, recovery: 14, dmg: 7 },          // sweep ender
    heavy: { startup: 14, active: 4, recovery: 24, dmg: 13 },          // universal launcher / anti-air
    airLight: { startup: 7, active: 5, recovery: 10, dmg: 7 },
    airHeavy: { startup: 12, active: 5, recovery: 14, dmg: 11 },
  };

  const RANKS = [
    [12, "遥遥领先!!"], [8, "赢麻了!"], [5, "整活成功"], [3, "有点东西"],
  ];
  const KO_TAGS = ["麻了", "典!", "绷不住了", "拿捏了", "寄!"];

  const fighters = {
    chen: {
      name: "陈平", epithet: "购买力宗师", archetype: "远程压制 · Zoner",
      accent: "#f0813c", accent2: "#ffd27a",
      stage: "lecture",
      hp: 195,
      kit: {
        s1: { id: "dumpling", label: "水饺导弹", cd: 100,
              proj: { dmg: 9, vx: 520, vy: -430, g: 1450, r: 26, sprite: "dumpling", spin: 9, tier: 1 } },
        s2: { id: "texas_hop", label: "转进德州", cd: 300, castLine: "人在美国,刚下飞机!" },
        ult: { id: "inequality_beam", label: "陈平不等式", dmg: 52,
               line: "在中国花2000块,比在美国花3000美元过得舒服得多!" },
      },
      quotes: {
        intro: ["美国人民生活在水深火热之中!", "这个问题,我三十年前就讲过了。"],
        win: ["陈平不等式,成立!", "在中国花2000块钱,比在美国花3000美元过得舒服得多!"],
        lose: ["德州的冬天,是有点冷。"],
        hurt: ["哎呀!", "这不符合宏观规律!"],
        taunt: ["你们要学一点经济学。"],
      },
      ai: { style: "zoner", prefRange: 520, aggression: 0.42, projFreq: 0.85 },
    },

    zhang: {
      name: "张维为", epithet: "自信护法", archetype: "立回反制 · Caster",
      accent: "#3f8ce8", accent2: "#a9d7ff",
      stage: "studio",
      hp: 205,
      kit: {
        s1: { id: "shockwave", label: "西方震撼波", cd: 160,
              proj: { dmg: 11, vx: 390, vy: 0, g: 0, r: 34, sprite: "wave", spin: 0, tier: 1 } },
        s2: { id: "confidence", label: "这就是一种自信", cd: 420,
              startup: 4, active: 20, recovery: 24, reflectLine: "这就是一种自信!" },
        ult: { id: "danmaku_rain", label: "中国人,你要自信", dmg: 50, line: "中国人,你要自信!" },
      },
      quotes: {
        intro: ["我走访过一百多个国家。", "一出国,就爱国。"],
        win: ["西方,又一次被震撼了。", "我觉得这就是一种自信。"],
        lose: ["这个问题,我们要辩证地看。"],
        hurt: ["西方陷入了沉思……", "不够自信!"],
        taunt: ["你要自信一点。"],
      },
      ai: { style: "caster", prefRange: 380, aggression: 0.5, projFreq: 0.6, reflectProb: 0.4 },
    },

    huxijin: {
      name: "胡锡进", epithet: "叼盘老编", archetype: "中距压制 · Pressure",
      accent: "#e05e4c", accent2: "#f6d69c",
      stage: "studio",
      hp: 205,
      kit: {
        s1: { id: "frisbee", label: "社评飞盘", cd: 150,
              proj: { dmg: 11, vx: 560, vy: 0, g: 0, r: 30, sprite: "frisbee", spin: 14, tier: 1,
                      boomerang: 460, returnDmgMul: 0.5 } },
        s2: { id: "complexity", label: "复杂化", cd: 380, castLine: "但同时,我们也要看到……",
              slowMul: 0.6, slowSecs: 2.0 },
        ult: { id: "kline_rain", label: "3000点保卫战", dmg: 50, line: "3000点保卫战,打响了!" },
      },
      quotes: {
        intro: ["事情是复杂的。"],
        win: ["老胡还是那句话:要冷静。"],
        lose: ["老胡今天又亏了,但我不割肉。"],
        hurt: ["这很复杂!", "老胡要发个微博。"],
        taunt: ["我劝这位同志冷静。"],
      },
      ai: { style: "pressure", prefRange: 420, aggression: 0.55, projFreq: 0.7 },
    },

    fengge: {
      name: "峰哥", epithet: "东百浪人", archetype: "贴脸猛攻 · Rushdown",
      accent: "#c27454", accent2: "#f5ce78",
      stage: "street",
      hp: 210,
      kit: {
        s1: { id: "rant_cone", label: "东百锐评", cd: 130, hits: 3, dmg: 4, range: 210 },
        s2: { id: "outlaw_dash", label: "亡命天涯", cd: 260 },
        ult: { id: "ranbu", label: "压抑爆发", dmg: 54, line: "太压抑了!都压抑!" },
      },
      quotes: {
        intro: ["哥们,做个采访呗——一个月挣多少钱?"],
        win: ["这就是东百往事。"],
        lose: ["兄弟们,咱们下期再见。"],
        hurt: ["多少是有点压抑了。"],
        taunt: ["兄弟,你压抑吗?"],
      },
      ai: { style: "rushdown", prefRange: 150, aggression: 0.8, projFreq: 0.25 },
    },

    huchenfeng: {
      name: "户晨风", epithet: "评测判官", archetype: "游走骚扰 · Skirmisher",
      accent: "#58c98a", accent2: "#c4f2d6",
      stage: "street",
      hp: 195,
      kit: {
        s1: { id: "phone_review", label: "手机测评", cd: 90, recovery: 30,
              iphone: { dmg: 10, vx: 700, vy: 0, g: 0, r: 24, sprite: "iphone", spin: 6, tier: 1, tag: "高端!" },
              android: { dmg: 7, vx: 430, vy: -350, g: 1300, r: 24, sprite: "android", spin: 6, tier: 1, tag: "唉,安卓。" } },
        s2: { id: "reincarnate", label: "账号转世", cd: 330, cardLine: "该账号已被封禁",
              doneLine: "转世成功!" },
        ult: { id: "judgement_pillar", label: "人上人认证", dmg: 50, line: "恭喜你,人上人了。" },
      },
      quotes: {
        intro: ["你好朋友,用的什么手机?"],
        win: ["祝你早日用上苹果。"],
        lose: ["安卓。……唉。"],
        hurt: ["这个价位,不该挨这一下。"],
        taunt: ["说,用的什么手机?"],
      },
      ai: { style: "skirmisher", prefRange: 460, aggression: 0.5, projFreq: 0.75 },
    },

    mabaoguo: {
      name: "马保国", epithet: "浑元掌门", archetype: "接化发宗师 · Grappler",
      accent: "#c9a54a", accent2: "#ffe9a8",
      stage: "street",
      hp: 220,
      kit: {
        s1: { id: "lightning_whip", label: "闪电鞭", cd: 120,
              proj: { dmg: 10, vx: 640, vy: 0, g: 0, r: 28, sprite: "bolt", spin: 0, tier: 1, maxDist: 330 } },
        s2: { id: "sneak_attack", label: "偷袭", cd: 330, cueLine: "来骗!来偷袭!" },
        ult: { id: "five_whips", label: "闪电五连鞭", dmg: 56, line: "看我,闪电五连鞭!" },
        counter: { id: "jiehuafa", label: "接化发", cd: 240, dmg: 18,
                   lines: ["接!化!发!", "传统功夫,点到为止。"] },
      },
      quotes: {
        intro: ["我是浑元形意太极门掌门人,马保国。"],
        win: ["耗子尾汁。"],
        lose: ["年轻人不讲武德。"],
        hurt: ["大意了啊,没有闪!"],
        taunt: ["我劝你耗子尾汁。"],
      },
      ai: { style: "grappler", prefRange: 190, aggression: 0.65, projFreq: 0.35,
            counterProb: 0.35 },
    },
  };

  const ROSTER = ["chen", "zhang", "huxijin", "fengge", "huchenfeng", "mabaoguo"];

  const stages = {
    lecture: { name: "眉山讲堂", img: "stages/lecture.png",
               chalk: "¥2000 > $3000", chalk2: "陈平不等式" },
    studio:  { name: "《这就是中国》演播室", img: "stages/studio.png",
               screenText: "这就是中国" },
    street:  { name: "东百夜市", img: "stages/street.png",
               neon: ["东百往事", "烧烤", "大保剑"] },
  };

  // Arcade: 3 ladder matches + gold Ma Baoguo boss.
  const arcade = {
    matches: 3,
    boss: { char: "mabaoguo", gold: true, hpMul: 1.12,
            name: "金色传说·马保国",
            introLine: "年轻人,不讲武德。",
            perfectTag: "训练有素,有备而来" },
  };

  const difficulties = [
    { name: "观众", reaction: 0.40, aggression: 0.40, mistake: 0.35, antiAirMs: 450, blockProb: 0.35, reflectMul: 0.4 },
    { name: "评论员", reaction: 0.26, aggression: 0.60, mistake: 0.18, antiAirMs: 350, blockProb: 0.55, reflectMul: 0.7 },
    { name: "键盘侠", reaction: 0.16, aggression: 0.78, mistake: 0.08, antiAirMs: 250, blockProb: 0.72, reflectMul: 1.0 },
  ];

  const banners = {
    round: n => `第 ${["一", "二", "三", "四", "五"][n - 1] || n} 回合`,
    fight: "开吵!",
    ko: "K.O.",
    timeout: "时间到",
    perfect: "无伤!整挺好!",
    draw: "双双蚌埠住了",
    win: "胜",
  };

  return { settings, frames, fighters, ROSTER, stages, arcade, difficulties, RANKS, KO_TAGS, banners };
})();
