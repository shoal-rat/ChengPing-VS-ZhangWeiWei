from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import requests
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parent
ASSETS_DIR = ROOT / "assets"
RAW_DIR = ASSETS_DIR / "raw"
PROCESSED_DIR = ASSETS_DIR / "processed"


RAW_SOURCES: dict[str, str] = {
    "chen_ping_profile.png": "https://cifu.fudan.edu.cn/_upload/article/images/f0/90/58835e6b4186aa4cbd33c422f2a9/139258ca-5391-41a2-897e-6554dd3b32a2.png",
    "chen_extra4.jpg": "https://cifu.fudan.edu.cn/_upload/article/images/61/a2/d38a743f4a8dac3161b7a1063cc0/e726e842-5304-4d58-8afd-5256b6fea864.jpg",
    "zhang_more1.png": "https://cifu.fudan.edu.cn/_upload/article/images/47/71/feb4374e465a9a71f94d16a34ec4/0182e4ac-d5ce-4fad-8fdc-e60237f5f850.png",
    "zhang_weiwei_speaker.jpg": "https://cifu.fudan.edu.cn/_upload/article/images/a6/a0/83f11656485cb17a80b392e5dba3/2b6b7026-9020-41f9-8862-371a11e1e469.jpg",
    "lao_a_sohu.png": "https://q2.itc.cn/images01/20260117/f31b293f7e0e4c6495ccb86a6ad982c2.png",
    "fengge_sohu.jpeg": "https://q7.itc.cn/q_70/images03/20250729/e4d30619ccee4f3b95f606d8c7655aa8.jpeg",
    "hu_chenfeng_wiki.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Portrait_photograph_of_content_creator_Hu_Chenfeng_%28%E6%88%B7%E6%99%A8%E9%A3%8E%29.jpg/500px-Portrait_photograph_of_content_creator_Hu_Chenfeng_%28%E6%88%B7%E6%99%A8%E9%A3%8E%29.jpg",
    "hu_xijin_wiki.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/%E8%83%A1%E9%94%A1%E8%BF%9B2021.jpg/500px-%E8%83%A1%E9%94%A1%E8%BF%9B2021.jpg",
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
    Variant("chen_ping_macro", "chen_ping_profile.png", (140, 20, 1050, 1010), (0.54, 0.34), (242, 116, 73), (250, 204, 90), "购买力版"),
    Variant("chen_ping_lecture", "chen_extra4.jpg", (0, 0, 320, 450), (0.38, 0.34), (224, 164, 74), (241, 228, 166), "讲堂版"),
    Variant("zhang_weiwei_civil", "zhang_more1.png", (230, 0, 499, 290), (0.60, 0.32), (88, 208, 230), (60, 113, 230), "文明版"),
    Variant("zhang_weiwei_studio", "zhang_weiwei_speaker.jpg", (110, 0, 470, 390), (0.54, 0.34), (64, 154, 240), (167, 226, 255), "演播室版"),
    Variant("lao_a_execute", "lao_a_prompt_poster.png", (0, 0, 720, 1280), (0.50, 0.56), (255, 93, 161), (255, 220, 241), "海报版"),
    Variant("lao_a_budget", "lao_a_sohu.png", (0, 0, 250, 250), (0.42, 0.38), (188, 95, 255), (255, 204, 123), "斩杀线版"),
    Variant("fengge_dongbei", "fengge_sohu.jpeg", (180, 580, 900, 1500), (0.50, 0.38), (194, 116, 84), (245, 206, 120), "东百版"),
    Variant("hu_chenfeng_reviewer", "hu_chenfeng_wiki.jpg", (40, 40, 460, 580), (0.52, 0.28), (116, 214, 146), (170, 242, 197), "评测版"),
    Variant("hu_xijin_editor", "hu_xijin_wiki.jpg", (20, 30, 470, 620), (0.54, 0.26), (224, 94, 76), (246, 214, 156), "社评版"),
)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    )
    for candidate in candidates:
        path = Path(candidate)
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def ensure_sources() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    for filename, url in RAW_SOURCES.items():
        path = RAW_DIR / filename
        if path.exists():
            continue
        response = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        response.raise_for_status()
        path.write_bytes(response.content)
    create_prompt_reference_poster()


def create_prompt_reference_poster() -> None:
    path = RAW_DIR / "lao_a_prompt_poster.png"
    if path.exists():
        return

    canvas = Image.new("RGBA", (720, 1280), (248, 246, 241, 255))
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(34, bold=True)
    body_font = load_font(24)
    body_bold = load_font(24, bold=True)
    tiny_font = load_font(20)

    draw.text((36, 30), "外协创业咖啡英语角7月29日活动信息  -  -  留学生主题专场", fill=(46, 46, 46), font=body_font)
    draw.text((70, 128), "FLEA 创业咖啡外语角 7月29日", fill=(209, 52, 39), font=title_font)
    draw.text((160, 176), "留学主题之夜", fill=(209, 52, 39), font=title_font)

    y = 256
    lines = (
        ("【活动时间】", "2015年7月29日周三18:00-20:00"),
        ("【Time】", "July 29th, 2015, 18:00-20:00"),
        ("【活动地点】", "开发区孵化大厦一楼创业咖啡（成人组）"),
        ("【Location】", "Fuhua Mansion. The adult group is in Adventure Coffee."),
    )
    for label, value in lines:
        draw.text((56, y), label, fill=(194, 155, 0), font=body_bold)
        draw.text((210, y), value, fill=(42, 42, 42), font=body_font)
        y += 48

    draw.text((56, 470), "【主讲人】 孔选仲，西雅图绿河学院在读学生（辅导教师 焦阳）", fill=(40, 40, 40), font=body_font)

    photo = Image.new("RGBA", (520, 650), (237, 231, 215, 255))
    pd = ImageDraw.Draw(photo)
    pd.rectangle((0, 0, 519, 649), outline=(210, 200, 186), width=8)
    pd.rectangle((18, 18, 160, 632), fill=(93, 143, 89))
    pd.rectangle((360, 90, 500, 540), fill=(218, 228, 230))
    for index in range(7):
        pd.rectangle((386, 116 + index * 54, 472, 144 + index * 54), outline=(160, 177, 183), width=3)
    pd.rectangle((122, 18, 188, 200), fill=(111, 82, 60))
    pd.rectangle((152, 18, 180, 310), fill=(92, 64, 42))
    pd.ellipse((204, 92, 312, 198), fill=(223, 187, 156))
    pd.rounded_rectangle((186, 190, 332, 438), radius=42, fill=(215, 68, 51))
    pd.rectangle((212, 428, 252, 610), fill=(116, 125, 145))
    pd.rectangle((266, 428, 306, 610), fill=(116, 125, 145))
    pd.rectangle((213, 608, 248, 628), fill=(56, 56, 62))
    pd.rectangle((268, 608, 304, 628), fill=(56, 56, 62))
    pd.rectangle((168, 228, 204, 402), fill=(223, 187, 156))
    pd.rectangle((314, 228, 350, 402), fill=(223, 187, 156))
    pd.rectangle((176, 98, 244, 116), fill=(35, 35, 35))
    pd.rectangle((274, 98, 342, 116), fill=(35, 35, 35))
    pd.line((244, 106, 274, 106), fill=(35, 35, 35), width=4)
    pd.arc((228, 126, 288, 168), 15, 165, fill=(80, 80, 80), width=4)
    pd.text((174, 16), "参考自用户提供的海报图", fill=(72, 72, 72), font=tiny_font)

    canvas.alpha_composite(photo, dest=(100, 560))
    canvas.save(path)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def toonize(image: Image.Image) -> Image.Image:
    rgb = image.convert("RGB")
    base = rgb.filter(ImageFilter.MedianFilter(size=3))
    base = ImageEnhance.Contrast(base).enhance(1.18)
    base = ImageEnhance.Color(base).enhance(1.28)
    poster = ImageOps.posterize(base, 4)
    edges = poster.filter(ImageFilter.FIND_EDGES).convert("L")
    edges = ImageOps.invert(edges)
    edges = ImageEnhance.Contrast(edges).enhance(2.2)
    edges = edges.point(lambda value: 255 if value > 132 else 0)
    outline = Image.new("RGBA", poster.size, (10, 14, 22, 255))
    poster_rgba = poster.convert("RGBA")
    poster_rgba = Image.composite(poster_rgba, outline, edges)
    return poster_rgba


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
            94,
        )
        draw.line((0, y, size[0], y), fill=color)
    return overlay


def prepare_portrait(source: Image.Image, crop: tuple[int, int, int, int], size: tuple[int, int], focus: tuple[float, float]) -> Image.Image:
    portrait = source.crop(crop).convert("RGBA")
    portrait = ImageOps.fit(portrait, size, method=Image.Resampling.LANCZOS, centering=focus)
    portrait = toonize(portrait)
    portrait = ImageEnhance.Brightness(portrait).enhance(1.03)
    return portrait


def build_card(portrait: Image.Image, variant: Variant) -> Image.Image:
    size = (360, 440)
    background = portrait.resize(size).filter(ImageFilter.GaussianBlur(radius=12))
    background = ImageEnhance.Brightness(background).enhance(0.38)
    frame = Image.new("RGBA", size, (18, 23, 37, 255))
    frame.alpha_composite(background)
    frame.alpha_composite(tint_overlay(size, variant.accent, variant.accent_secondary))

    portrait_mask = Image.new("L", size, 0)
    ImageDraw.Draw(portrait_mask).rounded_rectangle((20, 18, 340, 332), radius=28, fill=255)
    portrait_layer = Image.new("RGBA", size, (0, 0, 0, 0))
    portrait_layer.alpha_composite(portrait.resize((320, 340)), dest=(20, 8))
    frame = Image.composite(portrait_layer, frame, portrait_mask)

    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.rounded_rectangle((14, 14, 346, 346), radius=34, outline=(*variant.accent_secondary, 230), width=4)
    draw.rounded_rectangle((0, 0, 359, 439), radius=36, outline=(*variant.accent, 170), width=6)
    draw.rounded_rectangle((28, 348, 332, 406), radius=20, fill=(15, 17, 28, 212), outline=(*variant.accent_secondary, 190), width=2)
    for offset in range(12):
        draw.line((32 + offset * 24, 352, 12 + offset * 24, 404), fill=(*variant.accent, 34), width=3)
    frame.alpha_composite(glow)
    return Image.composite(frame, Image.new("RGBA", size, (0, 0, 0, 0)), rounded_mask(size, 38))


def build_token(portrait: Image.Image, variant: Variant) -> Image.Image:
    size = (132, 132)
    token = ImageOps.fit(portrait, size, method=Image.Resampling.LANCZOS, centering=variant.focus)
    token_mask = Image.new("L", size, 0)
    ImageDraw.Draw(token_mask).ellipse((4, 4, 128, 128), fill=255)
    ring = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(ring)
    draw.ellipse((2, 2, 130, 130), fill=(*variant.accent, 42), outline=(*variant.accent_secondary, 245), width=6)
    token_rgba = Image.new("RGBA", size, (0, 0, 0, 0))
    token_rgba.paste(token, (0, 0), token_mask)
    token_rgba.alpha_composite(ring)
    return token_rgba


def build_bust_layers(portrait: Image.Image, variant: Variant) -> tuple[Image.Image, Image.Image, Image.Image]:
    bust = ImageOps.fit(portrait, (220, 260), method=Image.Resampling.LANCZOS, centering=variant.focus)
    bust_mask = rounded_mask(bust.size, 28)
    bust_panel = Image.new("RGBA", bust.size, (0, 0, 0, 0))
    bust_panel.paste(bust, (0, 0), bust_mask)
    overlay = Image.new("RGBA", bust.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((2, 2, 217, 257), radius=28, outline=(*variant.accent_secondary, 210), width=5)
    draw.rectangle((0, 184, 220, 260), fill=(12, 15, 24, 112))
    bust_panel.alpha_composite(overlay)

    head = bust.crop((26, 8, 194, 138))
    torso = bust.crop((10, 88, 210, 258))
    head = ImageOps.fit(head, (170, 132), method=Image.Resampling.LANCZOS, centering=(0.5, 0.34))
    torso = ImageOps.fit(torso, (194, 176), method=Image.Resampling.LANCZOS, centering=(0.5, 0.58))
    return bust_panel, head, torso


def process_variants() -> None:
    ensure_sources()
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    for variant in VARIANTS:
        source = Image.open(RAW_DIR / variant.raw_name).convert("RGBA")
        portrait = prepare_portrait(source, variant.crop, (420, 420), variant.focus)
        card = build_card(portrait, variant)
        token = build_token(portrait, variant)
        bust, head, torso = build_bust_layers(portrait, variant)
        card.save(PROCESSED_DIR / f"{variant.key}_card.png")
        token.save(PROCESSED_DIR / f"{variant.key}_token.png")
        bust.save(PROCESSED_DIR / f"{variant.key}_bust.png")
        head.save(PROCESSED_DIR / f"{variant.key}_head.png")
        torso.save(PROCESSED_DIR / f"{variant.key}_torso.png")
        print(f"processed {variant.key}")


def main() -> None:
    process_variants()


if __name__ == "__main__":
    main()
