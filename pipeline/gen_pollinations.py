#!/usr/bin/env python3
"""Fallback AI art via the free Pollinations API (used when Codex image quota is exhausted).

- stages: saved to assets/aiwork/stage_*.png (then packed by build_assets.py --only stages)
- props: 15 individual sprites, chroma-keyed and written straight into assets/game/props/
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_assets import OUT, WORKD, chroma_key, smart_key  # noqa: E402

from PIL import Image  # noqa: E402

STYLE = "2D fighting game asset, King of Fighters hand-drawn arcade anime style, thick dark outline, cel shading"

STAGES = {
    "stage_lecture": "2D fighting game stage background, King of Fighters hand-drawn arcade style, warm university lecture hall interior, golden afternoon light through tall windows, very wide blank dark-green chalkboard across the back wall with no writing, wooden podium on the far left, rows of empty wooden lecture desks in mid-distance, wide flat empty wooden floor across the bottom quarter, no people, no text",
    "stage_street": "2D fighting game stage background, King of Fighters hand-drawn arcade style, northeastern China street food night market in light snowfall, dark teal night sky, strings of warm glowing bulbs overhead, smoking barbecue stalls and steaming food carts on both sides, glowing blank neon signboards with no characters, low brick buildings, wide flat empty asphalt across the bottom quarter, no people, no text",
}

PROPS = {
    "dumpling": "one single plump white Chinese dumpling jiaozi",
    "rmb": "one single red Chinese 100 yuan banknote curved mid-air",
    "dollar": "one single green US dollar banknote mid-air",
    "book": "one single thick hardcover book with plain red cover",
    "frisbee": "one single folded newspaper spinning like a frisbee",
    "thermos": "one single red thermos flask with steam wisps",
    "iphone": "one single black premium smartphone with glowing white screen",
    "android": "one single green cheap smartphone with cracked screen",
    "bolt": "one single thick yellow cartoon comic lightning bolt",
    "kline": "one single green stock market candlestick chart with arrow crashing down",
    "fan": "one single golden glowing Chinese folding fan spread open",
    "selfiestick": "one single selfie stick with small phone attached",
    "mic": "one single black handheld microphone",
    "trophy": "one single shiny golden trophy cup",
    "panda": "one single panda head meme sticker with confused human expression, black and white biaoqingbao",
}


def fetch(prompt, w, h, seed, out_path):
    url = ("https://image.pollinations.ai/prompt/" + urllib.parse.quote(prompt) +
           f"?width={w}&height={h}&nologo=true&seed={seed}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if len(data) > 15000:
                with open(out_path, "wb") as f:
                    f.write(data)
                return True
        except Exception as e:
            print("  retry", attempt + 1, e)
            time.sleep(8)
    return False


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    mpath = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}

    if which in ("all", "stages"):
        for name, prompt in STAGES.items():
            out = os.path.join(WORKD, name + ".png")
            if os.path.exists(out):
                print(name, "already exists, skipping")
                continue
            ok = fetch(prompt, 1536, 1024, 7, out)
            print(name, "ok" if ok else "FAILED")
            time.sleep(6)

    if which in ("all", "props"):
        os.makedirs(os.path.join(OUT, "props"), exist_ok=True)
        entry = manifest.get("props", {})
        for i, (name, desc) in enumerate(PROPS.items()):
            fn = f"props/{name}.png"
            if name in entry and os.path.exists(os.path.join(OUT, fn)):
                print(name, "already in manifest, skipping")
                continue
            tmp = os.path.join(WORKD, f"prop_{name}.png")
            prompt = (f"{desc}, {STYLE}, single object centered with margin, "
                      "flat pure chroma key green background solid #00FF00, no shadow, no text")
            ok = fetch(prompt, 512, 512, 11 + i, tmp)
            if not ok:
                print(name, "FAILED")
                continue
            im = smart_key(Image.open(tmp))
            bbox = im.getbbox()
            if bbox:
                im = im.crop(bbox)
            im.thumbnail((220, 220), Image.Resampling.LANCZOS)
            im.save(os.path.join(OUT, fn))
            entry[name] = {"f": fn, "w": im.width, "h": im.height}
            print(name, "ok", im.size)
            time.sleep(6)
        manifest["props"] = entry

    json.dump(manifest, open(mpath, "w"), indent=1, ensure_ascii=False)
    print("manifest updated")


if __name__ == "__main__":
    main()
