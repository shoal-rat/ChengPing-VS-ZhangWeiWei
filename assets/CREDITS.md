# Art & Image Credits

## AI-generated game art

All in-game art (character pose sheets, select-screen portraits, stages, props, title logo fallback)
is **AI-generated**:

- Character sheets & portraits: OpenAI image generation driven headlessly through the Codex CLI
  (`pipeline/gen_ai.py`), using the reference photos below for likeness.
- Stages & props: Codex when quota allows, otherwise the free Pollinations API
  (`pipeline/gen_pollinations.py`).
- Post-processing (chroma key, slicing, anchors, packing): `pipeline/build_assets.py`.

## Reference photos (assets/raw)

### 陈平 Chen Ping
- <https://cifu.fudan.edu.cn/94/36/c521a103478/page.htm>
- <https://cifu.fudan.edu.cn/97/b3/c412a104371/page.htm>

### 张维为 Zhang Weiwei
- <https://cifu.fudan.edu.cn/8e/6d/c522a167533/page.htm>
- <https://cifu.fudan.edu.cn/7d/9d/c412a753053/page.htm>

### 胡锡进 Hu Xijin
- <https://zh.wikipedia.org/wiki/%E8%83%A1%E9%94%A1%E8%BF%9B> (Wikimedia Commons portrait, 2021)

### 峰哥 Fengge
- <https://m.sohu.com/a/918643180_100114195>

### 户晨风 Hu Chenfeng
- <https://zh.wikipedia.org/wiki/%E6%88%B7%E6%99%A8%E9%A3%8E> (Wikimedia Commons portrait)

### 马保国 Ma Baoguo
- 「年轻人不讲武德」video frame via <https://www.sohu.com/a/434473461_120625586>
- 熊猫头表情包 via <https://www.sohu.com/a/432700077_616321>

All referenced figures are public personas; this is a non-commercial parody project (梗图恶搞).
