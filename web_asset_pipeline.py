"""Build clean, transparent chibi-head sprites for the HTML5 build.

Outputs assets/web/<key>_head.png  (256x256 RGBA, transparent background)

Photo-based fighters get a tight face crop -> toon shading -> feathered oval
alpha -> accent rim ring.  The two LaoA forms have no usable photo source, so
they get original vector cartoon heads drawn in code.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "assets" / "raw"
WEB_DIR = ROOT / "assets" / "web"

SIZE = 256
PAD = 14  # transparent margin around the oval


@dataclass(frozen=True)
class FaceSpec:
    key: str
    raw_name: str
    face_box: tuple[int, int, int, int]  # tight box around the face in raw coords
    accent: tuple[int, int, int]
    accent2: tuple[int, int, int]


PHOTO_SPECS: tuple[FaceSpec, ...] = (
    FaceSpec("chen_ping_macro", "chen_ping_profile.png", (470, 70, 770, 430), (242, 116, 73), (250, 204, 90)),
    FaceSpec("chen_ping_lecture", "chen_extra4.jpg", (175, 35, 285, 175), (224, 164, 74), (241, 228, 166)),
    FaceSpec("zhang_weiwei_civil", "zhang_more1.png", (320, 50, 445, 200), (88, 208, 230), (60, 113, 230)),
    FaceSpec("zhang_weiwei_studio", "zhang_weiwei_speaker.jpg", (250, 20, 410, 210), (64, 154, 240), (167, 226, 255)),
    FaceSpec("fengge_dongbei", "fengge_sohu.jpeg", (60, 560, 740, 1360), (194, 116, 84), (245, 206, 120)),
    FaceSpec("hu_chenfeng_reviewer", "hu_chenfeng_wiki.jpg", (170, 60, 295, 225), (116, 214, 146), (170, 242, 197)),
    FaceSpec("hu_xijin_editor", "hu_xijin_wiki.jpg", (100, 50, 400, 430), (224, 94, 76), (246, 214, 156)),
)


def toonize(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    base = rgb.filter(ImageFilter.MedianFilter(size=3))
    base = base.filter(ImageFilter.SMOOTH_MORE)
    base = ImageEnhance.Contrast(base).enhance(1.12)
    base = ImageEnhance.Color(base).enhance(1.42)
    base = ImageEnhance.Brightness(base).enhance(1.08)
    poster = ImageOps.posterize(base, 6)
    poster = poster.filter(ImageFilter.UnsharpMask(radius=3, percent=80, threshold=4))
    return poster.convert("RGBA")


def oval_alpha(size: int, pad: int, feather: int = 6) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((pad, pad, size - pad, size - pad), fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def build_photo_head(spec: FaceSpec) -> Image.Image:
    source = Image.open(RAW_DIR / spec.raw_name).convert("RGB")
    x0, y0, x1, y1 = spec.face_box
    # widen the box slightly and keep it square-ish so faces are not distorted
    w, h = x1 - x0, y1 - y0
    cx, cy = x0 + w / 2, y0 + h / 2
    side = max(w, h) * 1.12
    box = (
        int(max(0, cx - side / 2)),
        int(max(0, cy - side / 2)),
        int(min(source.width, cx + side / 2)),
        int(min(source.height, cy + side / 2)),
    )
    face = source.crop(box)
    face = ImageOps.fit(face, (SIZE, SIZE), method=Image.Resampling.LANCZOS, centering=(0.5, 0.46))
    face = toonize(face)

    head = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    head.paste(face, (0, 0), oval_alpha(SIZE, PAD))

    ring = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((PAD - 4, PAD - 4, SIZE - PAD + 4, SIZE - PAD + 4), outline=(15, 18, 30, 235), width=7)
    rd.ellipse((PAD - 1, PAD - 1, SIZE - PAD + 1, SIZE - PAD + 1), outline=(*spec.accent, 255), width=4)
    rd.arc((PAD + 6, PAD + 6, SIZE - PAD - 6, SIZE - PAD - 6), 205, 330, fill=(*spec.accent2, 170), width=3)
    head.alpha_composite(ring)
    return head


def build_lao_a_poster_head() -> Image.Image:
    """海报版: flat poster-doll head (red-shirt guy from the FLEA poster)."""
    head = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(head)
    skin = (231, 192, 156)
    hair = (38, 34, 36)
    # face
    d.ellipse((38, 52, 218, 226), fill=skin, outline=(15, 18, 30, 235), width=7)
    # flat-top hair slab
    d.rounded_rectangle((30, 26, 226, 102), radius=34, fill=hair)
    d.ellipse((52, 84, 100, 116), fill=hair)
    d.ellipse((156, 84, 204, 116), fill=hair)
    # sideburns
    d.rectangle((38, 96, 58, 150), fill=hair)
    d.rectangle((198, 96, 218, 150), fill=hair)
    # poster-style rectangle glasses
    d.rectangle((62, 124, 116, 152), outline=(20, 20, 24), width=7)
    d.rectangle((140, 124, 194, 152), outline=(20, 20, 24), width=7)
    d.line((116, 136, 140, 136), fill=(20, 20, 24), width=6)
    # eyes behind glasses: deadpan dashes
    d.line((76, 140, 102, 140), fill=(28, 28, 32), width=5)
    d.line((154, 140, 180, 140), fill=(28, 28, 32), width=5)
    # flat ironic mouth
    d.arc((96, 158, 168, 206), 200, 340, fill=(96, 56, 46), width=7)
    # blush of permanent embarrassment
    d.ellipse((52, 168, 84, 188), fill=(244, 150, 130, 110))
    d.ellipse((172, 168, 204, 188), fill=(244, 150, 130, 110))
    # red poster collar at the bottom
    d.rounded_rectangle((74, 208, 182, 246), radius=18, fill=(215, 68, 51))
    ring = ImageDraw.Draw(head)
    ring.ellipse((6, 6, 250, 250), outline=(255, 93, 161, 220), width=4)
    return head


def build_lao_a_execute_head() -> Image.Image:
    """斩杀线版: hooded executioner chibi with glowing kill-line visor."""
    head = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(head)
    hood = (57, 33, 69)
    hood_dark = (38, 20, 48)
    # hood silhouette
    d.ellipse((26, 30, 230, 238), fill=hood, outline=(15, 18, 30, 235), width=7)
    d.polygon([(128, 6), (196, 70), (60, 70)], fill=hood)
    # hood inner shadow
    d.ellipse((56, 74, 200, 218), fill=hood_dark)
    # glowing kill-line visor
    d.rounded_rectangle((62, 128, 194, 156), radius=14, fill=(255, 93, 161))
    d.rounded_rectangle((70, 134, 186, 150), radius=10, fill=(255, 220, 241))
    # drips of the execution line
    d.polygon([(88, 156), (96, 156), (92, 184)], fill=(255, 93, 161))
    d.polygon([(150, 156), (160, 156), (155, 196)], fill=(255, 93, 161))
    # hood seam stitches
    for i in range(5):
        x = 78 + i * 26
        d.line((x, 52, x + 12, 64), fill=(120, 80, 140), width=4)
    # purple meter glyph on the forehead
    d.polygon([(128, 84), (142, 112), (114, 112)], fill=(189, 106, 255))
    ring = ImageDraw.Draw(head)
    ring.ellipse((6, 6, 250, 250), outline=(189, 106, 255, 220), width=4)
    return head


def main() -> None:
    WEB_DIR.mkdir(parents=True, exist_ok=True)
    for spec in PHOTO_SPECS:
        build_photo_head(spec).save(WEB_DIR / f"{spec.key}_head.png")
        print("built", spec.key)
    build_lao_a_poster_head().save(WEB_DIR / "lao_a_execute_head.png")
    print("built lao_a_execute (poster doll)")
    build_lao_a_execute_head().save(WEB_DIR / "lao_a_budget_head.png")
    print("built lao_a_budget (executioner)")


if __name__ == "__main__":
    main()
