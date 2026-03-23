from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import requests
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent
RAW_DIR = ROOT / "assets" / "raw"
PROCESSED_DIR = ROOT / "assets" / "processed"


RAW_SOURCES: dict[str, str] = {
    "chen_ping_profile.png": "https://cifu.fudan.edu.cn/_upload/article/images/f0/90/58835e6b4186aa4cbd33c422f2a9/139258ca-5391-41a2-897e-6554dd3b32a2.png",
    "chen_extra4.jpg": "https://cifu.fudan.edu.cn/_upload/article/images/61/a2/d38a743f4a8dac3161b7a1063cc0/e726e842-5304-4d58-8afd-5256b6fea864.jpg",
    "zhang_more1.png": "https://cifu.fudan.edu.cn/_upload/article/images/47/71/feb4374e465a9a71f94d16a34ec4/0182e4ac-d5ce-4fad-8fdc-e60237f5f850.png",
    "zhang_weiwei_speaker.jpg": "https://cifu.fudan.edu.cn/_upload/article/images/a6/a0/83f11656485cb17a80b392e5dba3/2b6b7026-9020-41f9-8862-371a11e1e469.jpg",
    "lao_a_sohu.png": "https://q2.itc.cn/images01/20260117/f31b293f7e0e4c6495ccb86a6ad982c2.png",
}


@dataclass(frozen=True, slots=True)
class Variant:
    key: str
    raw_name: str
    crop: tuple[int, int, int, int]
    focus: tuple[float, float]
    accent: tuple[int, int, int]
    accent_secondary: tuple[int, int, int]
    title: str


VARIANTS: tuple[Variant, ...] = (
    Variant(
        key="chen_ping_macro",
        raw_name="chen_ping_profile.png",
        crop=(140, 20, 1050, 1010),
        focus=(0.54, 0.34),
        accent=(242, 116, 73),
        accent_secondary=(250, 204, 90),
        title="购买力版",
    ),
    Variant(
        key="chen_ping_lecture",
        raw_name="chen_extra4.jpg",
        crop=(0, 0, 320, 450),
        focus=(0.38, 0.34),
        accent=(224, 164, 74),
        accent_secondary=(241, 228, 166),
        title="讲堂版",
    ),
    Variant(
        key="zhang_weiwei_civil",
        raw_name="zhang_more1.png",
        crop=(230, 0, 499, 290),
        focus=(0.60, 0.32),
        accent=(88, 208, 230),
        accent_secondary=(60, 113, 230),
        title="文明版",
    ),
    Variant(
        key="zhang_weiwei_studio",
        raw_name="zhang_weiwei_speaker.jpg",
        crop=(110, 0, 470, 390),
        focus=(0.54, 0.34),
        accent=(64, 154, 240),
        accent_secondary=(167, 226, 255),
        title="演播室版",
    ),
    Variant(
        key="lao_a_execute",
        raw_name="lao_a_sohu.png",
        crop=(0, 0, 250, 250),
        focus=(0.42, 0.38),
        accent=(255, 93, 161),
        accent_secondary=(255, 220, 241),
        title="斩杀线版",
    ),
    Variant(
        key="lao_a_budget",
        raw_name="lao_a_sohu.png",
        crop=(20, 0, 290, 260),
        focus=(0.44, 0.36),
        accent=(188, 95, 255),
        accent_secondary=(255, 204, 123),
        title="账单版",
    ),
)


def ensure_sources() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for filename, url in RAW_SOURCES.items():
        path = RAW_DIR / filename
        if path.exists():
            continue
        response = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        path.write_bytes(response.content)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def tint_overlay(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    height = size[1]
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = (
            int(top[0] + (bottom[0] - top[0]) * ratio),
            int(top[1] + (bottom[1] - top[1]) * ratio),
            int(top[2] + (bottom[2] - top[2]) * ratio),
            110,
        )
        draw.line((0, y, size[0], y), fill=color)
    return overlay


def prepare_portrait(source: Image.Image, crop: tuple[int, int, int, int], size: tuple[int, int], focus: tuple[float, float]) -> Image.Image:
    portrait = source.crop(crop).convert("RGBA")
    portrait = ImageOps.fit(portrait, size, method=Image.Resampling.LANCZOS, centering=focus)
    portrait = ImageEnhance.Contrast(portrait).enhance(1.08)
    portrait = ImageEnhance.Color(portrait).enhance(1.14)
    portrait = portrait.filter(ImageFilter.UnsharpMask(radius=1.6, percent=125, threshold=2))
    return portrait


def build_card(portrait: Image.Image, variant: Variant) -> Image.Image:
    size = (360, 440)
    background = portrait.resize(size).filter(ImageFilter.GaussianBlur(radius=12))
    background = ImageEnhance.Brightness(background).enhance(0.46)
    frame = Image.new("RGBA", size, (18, 23, 37, 255))
    frame.alpha_composite(background, dest=(0, 0))
    frame.alpha_composite(tint_overlay(size, variant.accent, variant.accent_secondary))

    portrait_mask = Image.new("L", size, 0)
    ImageDraw.Draw(portrait_mask).rounded_rectangle((20, 18, 340, 332), radius=28, fill=255)
    portrait_layer = Image.new("RGBA", size, (0, 0, 0, 0))
    portrait_layer.alpha_composite(portrait.resize((320, 340)), dest=(20, 8))
    frame = Image.composite(portrait_layer, frame, portrait_mask)

    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.rounded_rectangle((14, 14, 346, 346), radius=34, outline=(*variant.accent_secondary, 220), width=4)
    glow_draw.rounded_rectangle((0, 0, 359, 439), radius=36, outline=(*variant.accent, 160), width=6)
    frame.alpha_composite(glow)

    label_strip = Image.new("RGBA", size, (0, 0, 0, 0))
    strip_draw = ImageDraw.Draw(label_strip)
    strip_draw.rounded_rectangle((28, 346, 332, 408), radius=20, fill=(15, 17, 28, 212), outline=(*variant.accent_secondary, 190), width=2)
    for offset in range(12):
        strip_draw.line((30 + offset * 24, 352, 10 + offset * 24, 406), fill=(*variant.accent, 34), width=3)
    frame.alpha_composite(label_strip)

    final = Image.new("RGBA", size, (0, 0, 0, 0))
    final.paste(frame, (0, 0), rounded_mask(size, 38))
    return final


def build_token(portrait: Image.Image, variant: Variant) -> Image.Image:
    size = (132, 132)
    token = ImageOps.fit(portrait, size, method=Image.Resampling.LANCZOS, centering=variant.focus)
    token_mask = Image.new("L", size, 0)
    ImageDraw.Draw(token_mask).ellipse((4, 4, 128, 128), fill=255)
    ring = Image.new("RGBA", size, (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring)
    ring_draw.ellipse((2, 2, 130, 130), fill=(*variant.accent, 42), outline=(*variant.accent_secondary, 245), width=6)
    token_rgba = Image.new("RGBA", size, (0, 0, 0, 0))
    token_rgba.paste(token, (0, 0), token_mask)
    token_rgba.alpha_composite(ring)
    return token_rgba


def build_bust(portrait: Image.Image, variant: Variant) -> Image.Image:
    size = (156, 176)
    bust = ImageOps.fit(portrait, size, method=Image.Resampling.LANCZOS, centering=variant.focus)
    bust = ImageEnhance.Brightness(bust).enhance(1.04)
    panel = Image.new("RGBA", size, (0, 0, 0, 0))
    mask = rounded_mask(size, 24)
    panel.paste(bust, (0, 0), mask)
    sheen = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(sheen)
    draw.rounded_rectangle((0, 0, 155, 175), radius=24, outline=(*variant.accent_secondary, 210), width=4)
    draw.line((18, 14, 136, 164), fill=(*variant.accent, 90), width=12)
    draw.rectangle((0, 116, 156, 176), fill=(12, 15, 24, 106))
    panel.alpha_composite(sheen)
    return panel


def process_variants() -> None:
    ensure_sources()
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    for variant in VARIANTS:
        source = Image.open(RAW_DIR / variant.raw_name).convert("RGBA")
        portrait = prepare_portrait(source, variant.crop, (360, 360), variant.focus)
        card = build_card(portrait, variant)
        token = build_token(portrait, variant)
        bust = build_bust(portrait, variant)
        card.save(PROCESSED_DIR / f"{variant.key}_card.png")
        token.save(PROCESSED_DIR / f"{variant.key}_token.png")
        bust.save(PROCESSED_DIR / f"{variant.key}_bust.png")
        print(f"processed {variant.key}")


def main() -> None:
    process_variants()


if __name__ == "__main__":
    main()
