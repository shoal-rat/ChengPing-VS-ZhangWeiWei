from __future__ import annotations

import math

import pygame

from heroes import Fighter, FighterBlueprint
from setting import Settings


def build_fonts(settings: Settings) -> dict[str, pygame.font.Font]:
    def make_font(size: int, bold: bool = False) -> pygame.font.Font:
        for candidate in settings.font_candidates:
            if pygame.font.match_font(candidate):
                return pygame.font.SysFont(candidate, size, bold=bold)
        return pygame.font.SysFont(None, size, bold=bold)

    return {
        "hero": make_font(60, bold=True),
        "title": make_font(34, bold=True),
        "heading": make_font(26, bold=True),
        "body": make_font(20),
        "small": make_font(16, bold=True),
        "tiny": make_font(14),
    }


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def format_time(seconds: float) -> str:
    total = max(0, int(math.ceil(seconds)))
    return f"{total:02d}"


def draw_panel(
    surface: pygame.Surface,
    rect: pygame.Rect,
    fill: tuple[int, int, int, int],
    stroke: tuple[int, int, int],
    radius: int = 24,
) -> None:
    panel = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
    pygame.draw.rect(panel, fill, panel.get_rect(), border_radius=radius)
    pygame.draw.rect(panel, stroke, panel.get_rect(), width=2, border_radius=radius)
    surface.blit(panel, rect.topleft)


def draw_health_bar(
    surface: pygame.Surface,
    rect: pygame.Rect,
    ratio: float,
    color: tuple[int, int, int],
    back_color: tuple[int, int, int],
    label: str,
    health_text: str,
    fonts: dict[str, pygame.font.Font],
    align: str = "left",
) -> None:
    pygame.draw.rect(surface, back_color, rect, border_radius=18)
    inner_width = int((rect.width - 8) * clamp(ratio, 0.0, 1.0))
    if inner_width > 0:
        inner = pygame.Rect(rect.x + 4, rect.y + 4, inner_width, rect.height - 8)
        pygame.draw.rect(surface, color, inner, border_radius=14)
    pygame.draw.rect(surface, (248, 236, 212), rect, width=2, border_radius=18)

    label_surface = fonts["small"].render(label, True, (245, 242, 236))
    value_surface = fonts["small"].render(health_text, True, (245, 242, 236))
    if align == "left":
        surface.blit(label_surface, (rect.x, rect.y - 22))
        surface.blit(value_surface, value_surface.get_rect(topright=(rect.right, rect.y - 22)))
    else:
        surface.blit(label_surface, label_surface.get_rect(topright=(rect.right, rect.y - 22)))
        surface.blit(value_surface, (rect.x, rect.y - 22))


def draw_menu(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    blueprints: list[FighterBlueprint],
    selected_index: int,
    pulse: float,
) -> None:
    title = fonts["hero"].render("CHENGPING VS ZHANGWEIWEI", True, settings.text_color)
    shadow = fonts["hero"].render("CHENGPING VS ZHANGWEIWEI", True, (8, 11, 18))
    title_rect = title.get_rect(center=(settings.width // 2, 90))
    surface.blit(shadow, title_rect.move(3, 4))
    surface.blit(title, title_rect)

    subtitle = fonts["body"].render(
        "A satire arena fighter built from public personas, panel-show energy, and meme warfare.",
        True,
        settings.muted_text,
    )
    surface.blit(subtitle, subtitle.get_rect(center=(settings.width // 2, 140)))

    for index, blueprint in enumerate(blueprints):
        base_x = 110 + index * 565
        rect = pygame.Rect(base_x, 205, 470, 360)
        selected = index == selected_index
        fill = (20, 25, 39, 228) if selected else (16, 19, 30, 188)
        stroke = blueprint.accent if selected else (114, 123, 145)
        draw_panel(surface, rect, fill, stroke, radius=28)

        glow = pygame.Surface((rect.width + 18, rect.height + 18), pygame.SRCALPHA)
        glow_alpha = 42 + int(abs(math.sin(pulse * 2.2 + index)) * 40)
        pygame.draw.rect(glow, (*blueprint.accent_secondary, glow_alpha), glow.get_rect(), border_radius=34)
        surface.blit(glow, (rect.x - 9, rect.y - 9))
        draw_panel(surface, rect, fill, stroke, radius=28)

        name_surface = fonts["title"].render(blueprint.display_name, True, (247, 245, 237))
        title_surface = fonts["small"].render(blueprint.title, True, blueprint.accent_secondary)
        surface.blit(name_surface, (rect.x + 30, rect.y + 28))
        surface.blit(title_surface, (rect.x + 32, rect.y + 72))

        portrait = pygame.Rect(rect.x + rect.width - 160, rect.y + 28, 122, 154)
        portrait_panel = pygame.Surface((portrait.width, portrait.height), pygame.SRCALPHA)
        pygame.draw.rect(portrait_panel, (*blueprint.accent, 36), portrait_panel.get_rect(), border_radius=24)
        pygame.draw.rect(portrait_panel, (*blueprint.accent_secondary, 92), portrait_panel.get_rect(), width=2, border_radius=24)
        pygame.draw.circle(portrait_panel, blueprint.body, (portrait.width // 2, 44), 22)
        pygame.draw.rect(portrait_panel, blueprint.coat, pygame.Rect(22, 74, 78, 64), border_radius=22)
        pygame.draw.rect(portrait_panel, blueprint.accent, pygame.Rect(32, 90, 58, 16), border_radius=8)
        surface.blit(portrait_panel, portrait.topleft)

        move_y = rect.y + 122
        basic = fonts["small"].render(f"J  {blueprint.basic_name}", True, (245, 240, 232))
        special = fonts["small"].render(f"K  {blueprint.special_name}", True, (245, 240, 232))
        surface.blit(basic, (rect.x + 30, move_y))
        surface.blit(special, (rect.x + 30, move_y + 28))

        for line_index, line in enumerate(blueprint.blurb):
            blurb_surface = fonts["body"].render(line, True, settings.muted_text)
            surface.blit(blurb_surface, (rect.x + 30, rect.y + 188 + line_index * 34))

        footer = "Press Enter to start" if selected else "Press Left / Right to select"
        footer_color = blueprint.accent_secondary if selected else (145, 154, 178)
        footer_surface = fonts["small"].render(footer, True, footer_color)
        surface.blit(footer_surface, footer_surface.get_rect(bottomright=(rect.right - 28, rect.bottom - 24)))

    note_rect = pygame.Rect(110, 604, settings.width - 220, 110)
    draw_panel(surface, note_rect, (17, 22, 35, 200), (248, 224, 182), radius=26)
    note_text = fonts["body"].render(
        "牢A appears as a late-round '斩杀线' hazard. When the warning flashes, jump or get clipped.",
        True,
        settings.text_color,
    )
    note_tip = fonts["small"].render("Controls: A / D move, W jump, J basic, K special, L dash", True, settings.accent_gold)
    note_tag = fonts["small"].render("One player vs AI", True, settings.accent_pink)
    surface.blit(note_text, (note_rect.x + 24, note_rect.y + 24))
    surface.blit(note_tip, (note_rect.x + 24, note_rect.y + 58))
    surface.blit(note_tag, note_tag.get_rect(topright=(note_rect.right - 24, note_rect.y + 24)))


def draw_hud(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    player: Fighter,
    opponent: Fighter,
    player_rounds: int,
    opponent_rounds: int,
    round_time: float,
    ticker_text: str,
) -> None:
    left_panel = pygame.Rect(28, 22, 360, 122)
    right_panel = pygame.Rect(settings.width - 388, 22, 360, 122)
    center_panel = pygame.Rect(settings.width // 2 - 110, 22, 220, 108)
    draw_panel(surface, left_panel, (15, 19, 31, 208), (248, 227, 176), radius=24)
    draw_panel(surface, right_panel, (15, 19, 31, 208), (248, 227, 176), radius=24)
    draw_panel(surface, center_panel, (15, 19, 31, 208), (248, 227, 176), radius=24)

    draw_health_bar(
        surface,
        pygame.Rect(left_panel.x + 18, left_panel.y + 46, left_panel.width - 36, 28),
        player.health_ratio,
        player.blueprint.accent,
        (47, 54, 70),
        player.blueprint.display_name,
        f"{int(player.health):03d}",
        fonts,
        align="left",
    )
    draw_health_bar(
        surface,
        pygame.Rect(right_panel.x + 18, right_panel.y + 46, right_panel.width - 36, 28),
        opponent.health_ratio,
        opponent.blueprint.accent,
        (47, 54, 70),
        opponent.blueprint.display_name,
        f"{int(opponent.health):03d}",
        fonts,
        align="right",
    )

    for index in range(settings.rounds_to_win):
        left_color = player.blueprint.accent_secondary if index < player_rounds else (70, 77, 95)
        right_color = opponent.blueprint.accent_secondary if index < opponent_rounds else (70, 77, 95)
        pygame.draw.circle(surface, left_color, (left_panel.x + 30 + index * 22, left_panel.bottom - 24), 7)
        pygame.draw.circle(surface, right_color, (right_panel.right - 30 - index * 22, right_panel.bottom - 24), 7)

    timer = fonts["hero"].render(format_time(round_time), True, settings.text_color)
    timer_shadow = fonts["hero"].render(format_time(round_time), True, (8, 11, 18))
    timer_rect = timer.get_rect(center=(center_panel.centerx, center_panel.y + 50))
    surface.blit(timer_shadow, timer_rect.move(2, 3))
    surface.blit(timer, timer_rect)
    label = fonts["small"].render("Round Timer", True, settings.muted_text)
    surface.blit(label, label.get_rect(center=(center_panel.centerx, center_panel.bottom - 24)))

    cooldown_left = fonts["tiny"].render(
        f"J {player.attack_cd:.1f}s  K {player.special_cd:.1f}s  L {player.dash_cd:.1f}s",
        True,
        settings.muted_text,
    )
    cooldown_right = fonts["tiny"].render(
        f"J {opponent.attack_cd:.1f}s  K {opponent.special_cd:.1f}s  L {opponent.dash_cd:.1f}s",
        True,
        settings.muted_text,
    )
    surface.blit(cooldown_left, (left_panel.x + 18, left_panel.bottom - 24))
    surface.blit(cooldown_right, cooldown_right.get_rect(bottomright=(right_panel.right - 18, right_panel.bottom - 12)))

    ticker_rect = pygame.Rect(36, settings.height - 56, settings.width - 72, 32)
    draw_panel(surface, ticker_rect, (14, 17, 29, 182), (250, 221, 164), radius=16)
    ticker = fonts["small"].render(ticker_text, True, settings.text_color)
    surface.blit(ticker, ticker.get_rect(center=ticker_rect.center))


def draw_round_banner(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    heading: str,
    subheading: str,
    alpha: int,
) -> None:
    overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
    overlay.fill((5, 8, 14, alpha // 3))
    surface.blit(overlay, (0, 0))
    panel = pygame.Rect(settings.width // 2 - 250, settings.height // 2 - 88, 500, 176)
    draw_panel(surface, panel, (14, 18, 31, alpha), (248, 224, 180), radius=30)

    heading_surface = fonts["hero"].render(heading, True, settings.text_color)
    heading_shadow = fonts["hero"].render(heading, True, (10, 14, 22))
    heading_rect = heading_surface.get_rect(center=(panel.centerx, panel.y + 64))
    surface.blit(heading_shadow, heading_rect.move(2, 3))
    surface.blit(heading_surface, heading_rect)

    sub_surface = fonts["body"].render(subheading, True, settings.muted_text)
    sub_rect = sub_surface.get_rect(center=(panel.centerx, panel.bottom - 48))
    surface.blit(sub_surface, sub_rect)


def draw_match_over(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    winner: FighterBlueprint,
    player_rounds: int,
    opponent_rounds: int,
    pulse: float,
) -> None:
    overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
    overlay.fill((4, 6, 12, 176))
    surface.blit(overlay, (0, 0))

    card = pygame.Rect(settings.width // 2 - 290, 170, 580, 360)
    glow = pygame.Surface((card.width + 28, card.height + 28), pygame.SRCALPHA)
    pygame.draw.rect(
        glow,
        (*winner.accent_secondary, 48 + int(abs(math.sin(pulse * 2.0)) * 42)),
        glow.get_rect(),
        border_radius=38,
    )
    surface.blit(glow, (card.x - 14, card.y - 14))
    draw_panel(surface, card, (16, 20, 32, 236), (248, 223, 178), radius=30)

    title = fonts["hero"].render("MATCH POINT", True, settings.text_color)
    title_shadow = fonts["hero"].render("MATCH POINT", True, (8, 11, 18))
    title_rect = title.get_rect(center=(card.centerx, card.y + 72))
    surface.blit(title_shadow, title_rect.move(2, 3))
    surface.blit(title, title_rect)

    winner_surface = fonts["title"].render(winner.display_name, True, winner.accent_secondary)
    surface.blit(winner_surface, winner_surface.get_rect(center=(card.centerx, card.y + 142)))

    line = fonts["body"].render(winner.victory_line, True, settings.text_color)
    surface.blit(line, line.get_rect(center=(card.centerx, card.y + 188)))

    score = fonts["heading"].render(f"Final score: {player_rounds} - {opponent_rounds}", True, settings.muted_text)
    surface.blit(score, score.get_rect(center=(card.centerx, card.y + 236)))

    tip = fonts["small"].render("Press Enter to return to character select", True, winner.accent)
    surface.blit(tip, tip.get_rect(center=(card.centerx, card.bottom - 54)))
