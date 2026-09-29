#!/usr/bin/env python3
"""Subset the display fonts to exactly the characters the game uses.

  .venv/bin/python tools/subset_fonts.py
Scans src/**/*.js and index.html; writes assets/fonts/<name>.woff2 (a few hundred KB total).
"""
import glob, os
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = {
    "smiley": "SmileySans-Oblique.ttf",
    "huangyou": "ZCOOLQingKeHuangYou-Regular.ttf",
    "xiaowei": "ZCOOLXiaoWei-Regular.ttf",
    "brush": "MaShanZheng-Regular.ttf",
}

chars = set()
for f in glob.glob(os.path.join(ROOT, "src", "**", "*.js"), recursive=True) + [os.path.join(ROOT, "index.html")]:
    chars |= set(open(f, encoding="utf-8").read())
chars |= set("0123456789%:.,!?¥$<>+-×/()[]「」『』《》“”…—·ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ")
text = "".join(sorted(c for c in chars if c.isprintable()))
print(len(text), "unique characters")
out = os.path.join(ROOT, "assets", "fonts")
os.makedirs(out, exist_ok=True)
for name, fn in FONTS.items():
    src = os.path.join(ROOT, "art", "fonts", fn)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    dst = os.path.join(out, name + ".woff2")
    subset.save_font(font, dst, opts)
    print(name, os.path.getsize(dst) // 1024, "KB")
