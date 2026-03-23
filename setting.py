from __future__ import annotations

from dataclasses import dataclass, field


Color = tuple[int, int, int]


@dataclass(slots=True)
class Settings:
    width: int = 1480
    height: int = 860
    fps: int = 60
    floor_y: int = 684
    gravity: float = 2180.0
    move_speed: float = 480.0
    guard_speed: float = 190.0
    air_speed: float = 406.0
    jump_speed: float = 872.0
    dash_speed: float = 1080.0
    dash_duration: float = 0.14
    round_time: float = 76.0
    rounds_to_win: int = 2
    arcade_matches: int = 3
    max_health: int = 220
    max_meter: float = 100.0
    max_guard_heat: float = 100.0
    guard_cool_rate: float = 30.0
    low_health_threshold: float = 0.3
    intro_time: float = 1.2
    round_freeze_time: float = 1.2
    match_intro_time: float = 1.4
    stage_margin: int = 72
    fighter_size: tuple[int, int] = (132, 186)
    background_top: Color = (10, 18, 34)
    background_bottom: Color = (38, 18, 32)
    floor_color: Color = (18, 22, 40)
    text_color: Color = (247, 246, 241)
    muted_text: Color = (177, 188, 210)
    accent_red: Color = (242, 116, 73)
    accent_gold: Color = (250, 204, 90)
    accent_cyan: Color = (88, 208, 230)
    accent_blue: Color = (60, 113, 230)
    accent_pink: Color = (255, 93, 161)
    accent_orange: Color = (243, 166, 73)
    accent_purple: Color = (189, 106, 255)
    accent_green: Color = (116, 214, 146)
    accent_white: Color = (246, 241, 233)
    shadow_color: tuple[int, int, int, int] = (6, 8, 17, 130)
    outline_color: Color = (244, 228, 188)
    panel_color: tuple[int, int, int, int] = (16, 20, 34, 220)
    ticker_messages: tuple[str, ...] = (
        "Absolute-input mode enabled: W/A/S/D + J or K now changes the move itself.",
        "This build is parody. Public personas and meme edits are turned into anime-fighter kits.",
        "Low-health rounds still trigger 牢A's execution line, but some kits can force it early.",
        "AI difficulty climbs through the arcade ladder and reacts on delay instead of reading frames.",
    )
    controls_text: tuple[str, ...] = (
        "A / D move",
        "W jump",
        "S fast fall",
        "Space guard",
        "J directional normals",
        "K directional skills",
        "U ultimate",
        "L dash",
        "1 / 2 / 3 difficulty",
    )
    font_candidates: tuple[str, ...] = (
        "Microsoft YaHei UI",
        "Microsoft YaHei",
        "SimHei",
        "PingFang SC",
        "Noto Sans CJK SC",
        "Arial",
    )
    stage_lights: tuple[Color, ...] = field(
        default_factory=lambda: (
            (242, 116, 73),
            (88, 208, 230),
            (250, 204, 90),
            (255, 93, 161),
            (189, 106, 255),
        )
    )
    stage_themes: tuple[dict[str, object], ...] = field(
        default_factory=lambda: (
            {
                "name": "这就是中国演播室",
                "subtitle": "Studio lights, debate heat, and a live audience.",
                "top": (10, 18, 36),
                "bottom": (47, 20, 30),
                "floor": (20, 23, 44),
                "keywords": ("话语权", "文明型国家", "这就是中国", "东方升西方降"),
            },
            {
                "name": "眉山讲堂",
                "subtitle": "Blackboard formulas and purchasing-power confidence.",
                "top": (18, 25, 34),
                "bottom": (43, 23, 20),
                "floor": (24, 29, 45),
                "keywords": ("陈平不等式", "购买力", "讲堂", "宏观判断"),
            },
            {
                "name": "评测区擂台",
                "subtitle": "Phones, tax slips, and delivery-speed tech hot takes.",
                "top": (13, 20, 31),
                "bottom": (23, 17, 39),
                "floor": (18, 23, 41),
                "keywords": ("安卓", "苹果", "税单", "横评"),
            },
            {
                "name": "热搜评论场",
                "subtitle": "The old-guard opinion machine never sleeps.",
                "top": (18, 18, 30),
                "bottom": (34, 18, 23),
                "floor": (20, 21, 37),
                "keywords": ("社评", "热搜", "A股", "老胡锐评"),
            },
            {
                "name": "东百锐评间",
                "subtitle": "Downward-looking glare, upward-reaching confidence.",
                "top": (16, 16, 26),
                "bottom": (43, 21, 20),
                "floor": (22, 20, 34),
                "keywords": ("东百锐评", "凑大专", "指点江山", "性压抑"),
            },
            {
                "name": "牢A 处刑台",
                "subtitle": "The line glows brighter when the monthly pressure hits.",
                "top": (18, 12, 24),
                "bottom": (50, 18, 33),
                "floor": (25, 18, 34),
                "keywords": ("斩杀线", "账单", "Paycheck", "处刑"),
            },
        )
    )
    difficulty_profiles: tuple[dict[str, object], ...] = field(
        default_factory=lambda: (
            {"name": "Casual", "reaction": 0.34, "aggression": 0.46, "combo": 0.25, "guard": 0.40, "anti_air": 0.30},
            {"name": "Panelist", "reaction": 0.24, "aggression": 0.58, "combo": 0.42, "guard": 0.55, "anti_air": 0.45},
            {"name": "War Room", "reaction": 0.16, "aggression": 0.72, "combo": 0.62, "guard": 0.72, "anti_air": 0.64},
        )
    )

    @property
    def screen_size(self) -> tuple[int, int]:
        return self.width, self.height
