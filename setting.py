from __future__ import annotations

from dataclasses import dataclass, field


Color = tuple[int, int, int]


@dataclass(slots=True)
class Settings:
    width: int = 1440
    height: int = 840
    fps: int = 60
    floor_y: int = 664
    gravity: float = 2150.0
    move_speed: float = 470.0
    guard_speed: float = 205.0
    air_speed: float = 398.0
    jump_speed: float = 860.0
    dash_speed: float = 1060.0
    dash_duration: float = 0.15
    round_time: float = 72.0
    rounds_to_win: int = 2
    arcade_matches: int = 3
    max_health: int = 180
    max_meter: float = 100.0
    max_guard_heat: float = 100.0
    guard_cool_rate: float = 32.0
    low_health_threshold: float = 0.32
    intro_time: float = 1.25
    round_freeze_time: float = 1.35
    match_intro_time: float = 1.6
    stage_margin: int = 74
    fighter_size: tuple[int, int] = (124, 176)
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
    shadow_color: tuple[int, int, int, int] = (6, 8, 17, 130)
    panel_color: tuple[int, int, int, int] = (16, 20, 34, 220)
    outline_color: Color = (244, 228, 188)
    ticker_messages: tuple[str, ...] = (
        "Arcade mode now cycles through a meme roster instead of one exhibition match.",
        "Guard with Space, spend hype with U, and expect 牢A to punish low-HP panic.",
        "Every kit is built from public personas, recurring talking points, and internet meme edits.",
        "Comment section activity is now considered a gameplay resource.",
    )
    controls_text: tuple[str, ...] = (
        "A / D move",
        "W double jump",
        "S fast fall",
        "Space guard",
        "J basic",
        "K special",
        "I utility",
        "U ultimate",
        "L dash",
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
                "subtitle": "Studio lights, hot takes, and a live audience.",
                "top": (10, 18, 36),
                "bottom": (47, 20, 30),
                "floor": (20, 23, 44),
                "keywords": ("话语权", "文明型国家", "这就是中国", "东方升西方降"),
            },
            {
                "name": "眉山讲堂",
                "subtitle": "Blackboard math meets purchase-power confidence.",
                "top": (18, 25, 34),
                "bottom": (43, 23, 20),
                "floor": (24, 29, 45),
                "keywords": ("陈平不等式", "购买力", "讲堂", "宏观判断"),
            },
            {
                "name": "评论区地狱",
                "subtitle": "Memes fly faster when the replies get weird.",
                "top": (15, 17, 32),
                "bottom": (28, 12, 29),
                "floor": (18, 21, 37),
                "keywords": ("弹幕", "热搜", "合订本", "评论区"),
            },
            {
                "name": "牢A 处刑台",
                "subtitle": "The execution line glows brighter near the end.",
                "top": (18, 12, 24),
                "bottom": (50, 18, 33),
                "floor": (25, 18, 34),
                "keywords": ("斩杀线", "账单", "Paycheck", "处刑"),
            },
        )
    )

    @property
    def screen_size(self) -> tuple[int, int]:
        return self.width, self.height
