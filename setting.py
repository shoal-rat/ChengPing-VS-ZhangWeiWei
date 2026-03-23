from __future__ import annotations

from dataclasses import dataclass, field


Color = tuple[int, int, int]


@dataclass(slots=True)
class Settings:
    width: int = 1366
    height: int = 768
    fps: int = 60
    floor_y: int = 605
    gravity: float = 1900.0
    move_speed: float = 430.0
    air_speed: float = 360.0
    jump_speed: float = 820.0
    dash_speed: float = 980.0
    dash_duration: float = 0.16
    round_time: float = 70.0
    rounds_to_win: int = 2
    max_health: int = 140
    background_top: Color = (14, 22, 38)
    background_bottom: Color = (47, 22, 33)
    floor_color: Color = (23, 29, 49)
    glow_color: Color = (255, 206, 118)
    text_color: Color = (245, 245, 245)
    muted_text: Color = (175, 186, 207)
    accent_red: Color = (242, 116, 73)
    accent_gold: Color = (250, 204, 90)
    accent_cyan: Color = (88, 208, 230)
    accent_blue: Color = (60, 113, 230)
    accent_pink: Color = (255, 93, 161)
    panel_color: tuple[int, int, int, int] = (18, 24, 40, 220)
    outline_color: Color = (244, 228, 188)
    controls_text: tuple[str, ...] = (
        "A / D move",
        "W jump",
        "J basic attack",
        "K special",
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
    stage_keywords: tuple[str, ...] = (
        "文明型国家",
        "陈平不等式",
        "话语权",
        "购买力",
        "这就是中国",
        "斩杀线",
        "国运判断",
        "大国叙事",
    )
    ticker_messages: tuple[str, ...] = (
        "Debate heat rising: memes now affect public opinion and projectile speed.",
        "Warning: discourse power spike detected in the comment section.",
        "Meme forecast: 牢A may activate the execution line at low HP.",
        "Stage note: every move is parody built from public personas and internet jokes.",
    )
    low_health_threshold: float = 0.35
    round_freeze_time: float = 1.4
    intro_time: float = 1.35
    KO_flash_time: float = 1.2
    particle_limit: int = 40
    stage_margin: int = 72
    fighter_size: tuple[int, int] = (108, 156)
    body_alpha: int = 228
    shadow_color: tuple[int, int, int, int] = (6, 8, 17, 120)
    stage_lights: tuple[Color, ...] = field(
        default_factory=lambda: (
            (242, 116, 73),
            (88, 208, 230),
            (250, 204, 90),
            (255, 93, 161),
        )
    )

    @property
    def screen_size(self) -> tuple[int, int]:
        return self.width, self.height
