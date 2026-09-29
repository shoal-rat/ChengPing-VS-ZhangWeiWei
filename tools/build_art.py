#!/usr/bin/env python3
"""Key + slice + pack generated art into assets/.

  .venv/bin/python tools/build_art.py heads     # art/heads/<id>.png -> assets/heads/<id>.webp + manifest
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "art")
OUT = os.path.join(ROOT, "assets")
CELL = 320


def key_green(im):
    a = np.asarray(im.convert("RGB")).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.maximum(r, b)
    spill = g - m
    alpha = np.clip(255 - (spill - 28) * 255 / 70, 0, 255)
    alpha[spill < 28] = 255
    # despill: clamp green to the max of the other two where it dominates
    g2 = np.where(spill > 0, m + np.clip(spill, 0, 10), g)
    out = np.dstack([r, g2, b, alpha]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def components(mask):
    """Label connected components (4-neigh) with a simple union-find over runs."""
    from collections import deque
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    sizes = {}
    for y in range(0, h):
        row = mask[y]
        xs = np.nonzero(row & (lab[y] == 0))[0]
        for x in xs:
            if lab[y, x]:
                continue
            n += 1
            q = deque([(y, x)])
            lab[y, x] = n
            cnt = 0
            while q:
                cy, cx = q.popleft()
                cnt += 1
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        q.append((ny, nx))
            sizes[n] = cnt
    return lab, sizes


def slice_row(im, count=5):
    """Cut at the emptiest column near each evenly spaced boundary (heads may touch)."""
    a = np.asarray(im)[..., 3] > 40
    cols = a.sum(axis=0).astype(float)
    occ = np.nonzero(cols > 0)[0]
    xs, xe = occ.min(), occ.max() + 1
    span = (xe - xs) / count
    cuts = [xs]
    for i in range(1, count):
        c = xs + span * i
        lo, hi = int(c - span * 0.3), int(c + span * 0.3)
        win = cols[lo:hi]
        # prefer the centre among equally empty columns
        best = lo + int(np.argmin(win + np.abs(np.arange(lo, hi) - c) * 0.02))
        cuts.append(best)
    cuts.append(xe)
    return [[cuts[i], cuts[i + 1]] for i in range(count)]


def build_heads():
    src = os.path.join(ART, "heads")
    dst = os.path.join(OUT, "heads")
    os.makedirs(dst, exist_ok=True)
    man = {}
    for fn in sorted(os.listdir(src)):
        if not fn.endswith(".png") or ".v" in fn or fn.startswith("_"):
            continue
        cid = fn[:-4]
        im = key_green(Image.open(os.path.join(src, fn)))
        segs = slice_row(im)
        if len(segs) != 5:
            print("WARN", cid, "segments", len(segs))
        A = np.asarray(im)
        cells = []
        boxes = []
        for (x0, x1) in segs:
            sub = A[:, x0:x1]
            mask = sub[..., 3] > 40
            # small downsample for component analysis speed
            ds = 4
            small = mask[::ds, ::ds]
            lab, sizes = components(small)
            big = max(sizes, key=sizes.get)
            ys, xs = np.nonzero(lab == big)
            bx0, bx1 = xs.min() * ds, (xs.max() + 1) * ds
            by0, by1 = ys.min() * ds, (ys.max() + 1) * ds
            ay, ax = np.nonzero(mask)
            cells.append((x0, sub, (bx0, by0, bx1, by1), (ax.min(), ay.min(), ax.max() + 1, ay.max() + 1)))
            boxes.append((bx1 - bx0, by1 - by0))
        mh = float(np.median([b[1] for b in boxes]))
        mw = float(np.median([b[0] for b in boxes]))
        scale = (CELL * 0.80) / max(mh, mw)
        sheet = Image.new("RGBA", (CELL * 5, CELL), (0, 0, 0, 0))
        anchors = []
        for i, (x0, sub, (bx0, by0, bx1, by1), (fx0, fy0, fx1, fy1)) in enumerate(cells):
            crop = Image.fromarray(sub[fy0:fy1, fx0:fx1], "RGBA")
            cw, ch = crop.size
            crop = crop.resize((max(1, int(cw * scale)), max(1, int(ch * scale))), Image.LANCZOS)
            # align the main head blob: its centre-x to cell centre, its bottom to 90% height
            hcx = ((bx0 + bx1) / 2 - fx0) * scale
            hby = (by1 - fy0) * scale
            px = int(CELL / 2 - hcx)
            py = int(CELL * 0.90 - hby)
            sheet.alpha_composite(crop, (i * CELL + max(0, px), max(0, py)) if px >= 0 and py >= 0 else (i * CELL, 0))
            if px < 0 or py < 0:
                # rare: content wider than cell; paste with clipping
                tmp = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
                tmp.alpha_composite(crop, (0, 0), (max(0, -px), max(0, -py)))
                sheet.paste(tmp, (i * CELL + max(0, px), max(0, py)), tmp)
        # head blob size in the normalised cell
        hw, hh = mw * scale, mh * scale
        sheet.save(os.path.join(dst, cid + ".webp"), "WEBP", quality=90, method=6)
        sheet.save(os.path.join(ART, "heads", "_" + cid + "_sheet.png"))
        man[cid] = {"cell": CELL, "w": round(hw, 1), "h": round(hh, 1),
                    "cx": CELL / 2, "bottom": round(CELL * 0.90, 1)}
        print(cid, "scale", round(scale, 3), "head", round(hw), "x", round(hh))
    with open(os.path.join(dst, "heads.json"), "w") as f:
        json.dump(man, f, indent=1)


def build_stages():
    src = os.path.join(ART, "stages")
    dst = os.path.join(OUT, "stages")
    os.makedirs(dst, exist_ok=True)
    for fn in sorted(os.listdir(src)):
        if not fn.endswith(".png") or ".v" in fn:
            continue
        im = Image.open(os.path.join(src, fn)).convert("RGB")
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        im.save(os.path.join(dst, fn[:-4] + ".webp"), "WEBP", quality=82, method=6)
        print(fn, im.size)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "heads"
    if what == "heads":
        build_heads()
    if what == "stages":
        build_stages()
