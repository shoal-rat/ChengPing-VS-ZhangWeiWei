#!/usr/bin/env python3
"""Slice + pack the AI-generated art (assets/aiwork) into game assets (assets/game).

- Chroma-keys the #00FF00 backgrounds (with despill + feather)
- Splits pose sheets / prop sheets into individual sprites via connected components
- Computes per-pose anchors (feet baseline center)
- Emits assets/game/manifest.json for the engine

Run: .venv/bin/python pipeline/build_assets.py [--only chars,props,fx,stages,logo]
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKD = os.path.join(ROOT, "assets", "aiwork")
OUT = os.path.join(ROOT, "assets", "game")
L = Image.Resampling.LANCZOS

CHARS = ["chen", "zhang", "huxijin", "fengge", "huchenfeng", "mabaoguo"]
SHEET_A = ["idle", "walk", "jab", "uppercut", "guard", "jump", "hit", "defeat"]
SHEET_B = ["cast", "smash", "dash", "sweep", "win", "taunt", "channel", "flykick"]
PROPS = ["dumpling", "rmb", "dollar", "book", "frisbee",
         "thermos", "iphone", "android", "bolt", "kline",
         "fan", "selfiestick", "mic", "trophy", "panda"]
FXN = ["spark0", "spark1", "spark2", "spark3",
       "guardhex", "puff", "dustcurl", "twinkle",
       "speedline", "ring", "anger", "aura"]


def ensure_dirs():
    for sub in ("chars", "props", "fx", "stages", "portraits"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)


# ---------------------------------------------------------------- chroma key
def chroma_key(img):
    """#00FF00 green screen -> RGBA with despill."""
    arr = np.asarray(img.convert("RGB")).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    greenness = g - np.maximum(r, b)
    # solid green -> alpha 0; graded band for anti-aliased edges
    alpha = np.clip(255 - (greenness - 28) * 6, 0, 255).astype(np.uint8)
    alpha[greenness > 90] = 0
    # despill: clamp green to max(r,b) where green dominates on kept pixels
    spill = (greenness > 8) & (alpha > 0)
    g2 = g.copy()
    g2[spill] = np.maximum(r, b)[spill]
    out = np.dstack([r, g2, b]).astype(np.uint8)
    rgba = np.dstack([out, alpha])
    im = Image.fromarray(rgba, "RGBA")
    # feather alpha slightly to kill jaggies
    a = im.getchannel("A").filter(ImageFilter.GaussianBlur(0.7))
    im.putalpha(a)
    return im


def smart_key(img):
    """Background removal for images that may NOT be on a green screen.

    If the borders are chroma green, use chroma_key. Otherwise flood-fill the
    background from the image borders with a color-distance tolerance.
    """
    rgb = img.convert("RGB")
    arr = np.asarray(rgb).astype(np.int16)
    h, w = arr.shape[:2]
    border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    r, g, b = border[:, 0].mean(), border[:, 1].mean(), border[:, 2].mean()
    if g - max(r, b) > 40:
        return chroma_key(img)
    from collections import deque
    tol = 42
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x)); q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0)); q.append((y, w - 1))
    seedcol = np.array([r, g, b])
    while q:
        y, x = q.popleft()
        if visited[y, x]:
            continue
        px = arr[y, x]
        # distance to the local neighbour that enqueued us approximated by border mean
        if np.abs(px - seedcol).sum() > tol * 3 and not visited[y, x]:
            # allow gradient backgrounds: compare to any visited neighbour
            ok = False
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and visited[ny, nx]:
                    if np.abs(px - arr[ny, nx]).sum() < 30:
                        ok = True
                        break
            if not ok:
                continue
        visited[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                q.append((ny, nx))
    alpha = np.where(visited, 0, 255).astype(np.uint8)
    out = np.dstack([np.asarray(rgb), alpha])
    im = Image.fromarray(out, "RGBA")
    a = im.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(a)
    return im


# ------------------------------------------------------- component detection
def components(im, min_area_frac=0.002):
    """Connected components on downsampled alpha; returns full-res bboxes."""
    ds = 4
    a = np.asarray(im.getchannel("A").resize((im.width // ds, im.height // ds)))
    mask = a > 40
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    cur = 0
    from collections import deque
    for yy in range(h):
        for xx in range(w):
            if mask[yy, xx] and labels[yy, xx] == 0:
                cur += 1
                q = deque([(yy, xx)])
                labels[yy, xx] = cur
                while q:
                    y0, x0 = q.popleft()
                    y1a, y1b = max(0, y0 - 1), min(h, y0 + 2)
                    x1a, x1b = max(0, x0 - 1), min(w, x0 + 2)
                    for ny in range(y1a, y1b):
                        for nx in range(x1a, x1b):
                            if mask[ny, nx] and labels[ny, nx] == 0:
                                labels[ny, nx] = cur
                                q.append((ny, nx))
    boxes = []
    min_area = h * w * min_area_frac
    for i in range(1, cur + 1):
        ys, xs = np.where(labels == i)
        if len(ys) < min_area:
            continue
        boxes.append([xs.min() * ds, ys.min() * ds, (xs.max() + 1) * ds, (ys.max() + 1) * ds, len(ys)])
    # merge overlapping / near boxes (poses can fragment: a hat, a fist)
    merged = True
    while merged:
        merged = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a_, b_ = boxes[i], boxes[j]
                pad = 14
                if not (a_[2] + pad < b_[0] or b_[2] + pad < a_[0] or
                        a_[3] + pad < b_[1] or b_[3] + pad < a_[1]):
                    boxes[i] = [min(a_[0], b_[0]), min(a_[1], b_[1]),
                                max(a_[2], b_[2]), max(a_[3], b_[3]), a_[4] + b_[4]]
                    boxes.pop(j)
                    merged = True
                    break
            if merged:
                break
    return boxes


def grid_sort(boxes, rows, cols):
    """Sort component boxes into row-major grid order by centroid."""
    if len(boxes) != rows * cols:
        return None
    cys = sorted((b[1] + b[3]) / 2 for b in boxes)
    # split rows by largest gaps
    gaps = sorted(range(len(cys) - 1), key=lambda i: cys[i + 1] - cys[i], reverse=True)[:rows - 1]
    cuts = sorted(cys[i] + (cys[i + 1] - cys[i]) / 2 for i in gaps)
    rowsets = [[] for _ in range(rows)]
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        ri = sum(cy > c for c in cuts)
        rowsets[ri].append(b)
    out = []
    for rs in rowsets:
        if len(rs) != cols:
            return None
        out.extend(sorted(rs, key=lambda b: (b[0] + b[2]) / 2))
    return out


def fixed_grid(im, rows, cols):
    """Fallback: fixed cells, autocropped."""
    cw, ch = im.width // cols, im.height // rows
    boxes = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            bbox = cell.getbbox()
            if bbox is None:
                boxes.append([c * cw, r * ch, (c + 1) * cw, (r + 1) * ch, 0])
            else:
                boxes.append([c * cw + bbox[0], r * ch + bbox[1], c * cw + bbox[2], r * ch + bbox[3], 0])
    return boxes


def slice_sheet(path, rows, cols):
    im = chroma_key(Image.open(path))
    boxes = grid_sort(components(im), rows, cols)
    if boxes is None:
        boxes = fixed_grid(im, rows, cols)
    sprites = []
    for b in boxes:
        crop = im.crop((b[0], b[1], b[2], b[3]))
        sprites.append(crop)
    return sprites


def feet_anchor(im):
    """Anchor: bottom of sprite; x = center of mass of lowest 12% rows."""
    a = np.asarray(im.getchannel("A"))
    ys, xs = np.where(a > 40)
    if len(ys) == 0:
        return im.width // 2, im.height
    ymax = ys.max()
    band = ys > ymax - max(6, int(im.height * 0.12))
    ax = int(xs[band].mean())
    return ax, int(ymax)


# ------------------------------------------------------------------- chars
def build_chars(manifest):
    chars = {}
    for ck in CHARS:
        poses = {}
        heights = {}
        for sheet, names in (("A", SHEET_A), ("B", SHEET_B)):
            p = os.path.join(WORKD, f"{ck}_sheet{sheet}.png")
            if not os.path.exists(p):
                print(f"!! missing {p}")
                continue
            sprites = slice_sheet(p, 2, 4)
            for name, spr in zip(names, sprites):
                poses[name] = spr
                heights[name] = spr.height
        # normalize sheet B scale to sheet A using standing-pose medians
        a_std = [heights[n] for n in ("idle", "walk", "jab", "uppercut") if n in heights]
        b_std = [heights[n] for n in ("cast", "smash", "win", "taunt", "channel") if n in heights]
        if a_std and b_std:
            ratio = (sum(a_std) / len(a_std)) / (sum(b_std) / len(b_std))
            if 0.7 < ratio < 1.4 and abs(ratio - 1) > 0.04:
                for n in SHEET_B:
                    if n in poses:
                        s = poses[n]
                        poses[n] = s.resize((max(1, int(s.width * ratio)), max(1, int(s.height * ratio))), L)
        entry = {"poses": {}}
        for name, spr in poses.items():
            ax, ay = feet_anchor(spr)
            fn = f"chars/{ck}_{name}.png"
            spr.save(os.path.join(OUT, fn))
            entry["poses"][name] = {"f": fn, "w": spr.width, "h": spr.height, "ax": ax, "ay": ay}
        # portrait
        pp = os.path.join(WORKD, f"{ck}_portrait.png")
        if os.path.exists(pp):
            por = chroma_key(Image.open(pp))
            bbox = por.getbbox()
            if bbox:
                por = por.crop(bbox)
            por.thumbnail((520, 520), L)
            fn = f"portraits/{ck}.png"
            por.save(os.path.join(OUT, fn))
            entry["portrait"] = fn
        chars[ck] = entry
        print(f"char {ck}: {len(entry['poses'])} poses")
    manifest["chars"] = chars


# ------------------------------------------------------------------- props/fx
def build_sheet_items(manifest, key, src, names, rows, cols, outdir):
    p = os.path.join(WORKD, src)
    if not os.path.exists(p):
        print(f"!! missing {p}")
        return
    sprites = slice_sheet(p, rows, cols)
    entry = {}
    for name, spr in zip(names, sprites):
        bbox = spr.getbbox()
        if bbox:
            spr = spr.crop(bbox)
        spr.thumbnail((220, 220), L)
        fn = f"{outdir}/{name}.png"
        spr.save(os.path.join(OUT, fn))
        entry[name] = {"f": fn, "w": spr.width, "h": spr.height}
    manifest[key] = entry
    print(f"{key}: {len(entry)} items")


# ------------------------------------------------------------------- stages
def _cjk(size, songti_font=False):
    from PIL import ImageFont
    if songti_font:
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Songti.ttc", size, index=0)
    return ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", size, index=2)


def _neon(im, text, cx, cy, size, color, rot=0):
    """Neon sign text: colored glow + bright core."""
    from PIL import ImageDraw
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((cx, cy), text, font=_cjk(size), fill=color + (255,), anchor="mm")
    if rot:
        layer = layer.rotate(rot, center=(cx, cy), resample=Image.Resampling.BICUBIC)
    glow = layer.filter(ImageFilter.GaussianBlur(size / 5))
    im.alpha_composite(glow)
    im.alpha_composite(glow)
    im.alpha_composite(layer)
    core = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(core)
    mix = tuple(min(255, c + 150) for c in color)
    d.text((cx, cy), text, font=_cjk(size), fill=mix + (230,), anchor="mm")
    if rot:
        core = core.rotate(rot, center=(cx, cy), resample=Image.Resampling.BICUBIC)
    im.alpha_composite(core)


def _chalk(im, text, cx, cy, size, rot=0):
    from PIL import ImageDraw
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text((cx + 2, cy + 2), text, font=_cjk(size, songti_font=True), fill=(255, 252, 240, 90), anchor="mm")
    d.text((cx, cy), text, font=_cjk(size, songti_font=True), fill=(250, 248, 238, 215), anchor="mm")
    layer = layer.filter(ImageFilter.GaussianBlur(0.6))
    if rot:
        layer = layer.rotate(rot, center=(cx, cy), resample=Image.Resampling.BICUBIC)
    im.alpha_composite(layer)


# text bakes are tuned to the CURRENT stage art in assets/aiwork — retune if regenerated
def stage_overlay(name, im):
    if name == "lecture":
        _chalk(im, "陈平不等式:", 470, 240, 60, rot=-0.6)
        _chalk(im, "￥2000 > $3000", 800, 312, 72, rot=-0.6)
        _chalk(im, "美国人民生活在水深火热之中", 940, 224, 28, rot=-0.4)
    elif name == "street":
        _neon(im, "东百往事", 215, 192, 62, (255, 90, 150), rot=-3)
        _neon(im, "烧烤", 1534, 240, 74, (90, 230, 255), rot=3)
        _neon(im, "铁锅炖大鹅", 870, 444, 26, (90, 230, 255))
        _neon(im, "修脚", 537, 412, 24, (90, 230, 255))
    elif name == "studio":
        _neon(im, "这就是中国", 840, 205, 46, (120, 210, 255))
    return im


def build_stages(manifest):
    stages = {}
    for name in ("studio", "lecture", "street"):
        p = os.path.join(WORKD, f"stage_{name}.png")
        if not os.path.exists(p):
            print(f"!! missing {p}")
            continue
        im = Image.open(p).convert("RGBA")
        # gentle wide-screen squash: engine pans a 1680x860 canvas
        im = im.resize((1680, 860), L)
        im = stage_overlay(name, im)
        fn = f"stages/{name}.jpg"
        im.convert("RGB").save(os.path.join(OUT, fn), quality=88)
        stages[name] = fn
        print("stage", name, "ok")
    manifest["stages"] = stages


def build_logo(manifest):
    p = os.path.join(WORKD, "logo.png")
    if os.path.exists(p):
        im = chroma_key(Image.open(p))
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        im.thumbnail((900, 500), L)
        im.save(os.path.join(OUT, "logo.png"))
        manifest["logo"] = "logo.png"
        print("logo ok (AI)")
        return
    # typographic fallback: metallic arcade logo baked with system CJK font
    from PIL import ImageDraw, ImageFont
    SS = 2
    W_, H_ = 1100 * SS, 430 * SS
    im = Image.new("RGBA", (W_, H_), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    big = ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", 250 * SS, index=2)
    sub = ImageFont.truetype("/System/Library/Fonts/Hiragino Sans GB.ttc", 46 * SS, index=2)
    text = "梗图格斗"
    # shadow, outline, then vertical gold->red gradient fill via mask
    tx, ty = W_ // 2, 150 * SS
    d.text((tx + 10 * SS, ty + 14 * SS), text, font=big, fill=(20, 8, 12, 220), anchor="mm")
    for ox in range(-8 * SS, 9 * SS, 4 * SS):
        for oy in range(-8 * SS, 9 * SS, 4 * SS):
            d.text((tx + ox, ty + oy), text, font=big, fill=(38, 16, 20, 255), anchor="mm")
    mask = Image.new("L", (W_, H_), 0)
    ImageDraw.Draw(mask).text((tx, ty), text, font=big, fill=255, anchor="mm")
    grad = Image.new("RGBA", (W_, H_))
    gd = ImageDraw.Draw(grad)
    for y in range(H_):
        t = max(0.0, min(1.0, (y - 30 * SS) / (250 * SS)))
        col = (int(255 - 20 * t), int(243 - 130 * t), int(196 - 140 * t), 255)
        gd.line([(0, y), (W_, y)], fill=col)
    im.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(im)
    st = "M E M E   F I G H T   A R C A D E"
    d.text((W_ // 2 + 3 * SS, 330 * SS + 3 * SS), st, font=sub, fill=(30, 12, 16, 255), anchor="mm")
    d.text((W_ // 2, 330 * SS), st, font=sub, fill=(255, 215, 106, 255), anchor="mm")
    im = im.resize((W_ // SS, H_ // SS), L)
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im.save(os.path.join(OUT, "logo.png"))
    manifest["logo"] = "logo.png"
    print("logo ok (typographic)")


def contact_sheet(ck):
    """Debug helper: tile a character's sliced poses."""
    files = sorted(f for f in os.listdir(os.path.join(OUT, "chars")) if f.startswith(ck + "_"))
    if not files:
        return
    cell = 170
    cols = 8
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (54, 57, 63, 255))
    for i, fn in enumerate(files):
        im = Image.open(os.path.join(OUT, "chars", fn))
        im.thumbnail((cell - 10, cell - 10), L)
        x, y = (i % cols) * cell, (i // cols) * cell
        sheet.paste(im, (x + 5, y + 5), im)
    sheet.save(os.path.join(OUT, f"_{ck}_poses.png"))


if __name__ == "__main__":
    ensure_dirs()
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1].split(",")
    mpath = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    manifest.pop("heads", None)  # legacy
    if not only or "chars" in only:
        build_chars(manifest)
        for ck in CHARS:
            contact_sheet(ck)
    if not only or "props" in only:
        build_sheet_items(manifest, "props", "props.png", PROPS, 3, 5, "props")
    if not only or "fx" in only:
        build_sheet_items(manifest, "fx", "fx.png", FXN, 3, 4, "fx")
    if not only or "stages" in only:
        build_stages(manifest)
    if not only or "logo" in only:
        build_logo(manifest)
    import time
    manifest["v"] = int(time.time())   # cache-buster for image URLs
    json.dump(manifest, open(mpath, "w"), indent=1, ensure_ascii=False)
    print("manifest written:", mpath)
