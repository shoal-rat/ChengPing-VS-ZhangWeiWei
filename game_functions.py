from __future__ import annotations

import math

import pygame

from heroes import CharacterArt, Fighter, FighterBlueprint
from setting import Settings


def build_fonts(settings: Settings) -> dict[str, pygame.font.Font]:
    def make_font(size: int, bold: bool = False) -> pygame.font.Font:
        for candidate in settings.font_candidates:
            if pygame.font.match_font(candidate):
                return pygame.font.SysFont(candidate, size, bold=bold)
        return pygame.font.SysFont(None, size, bold=bold)

    return {
        "hero": make_font(48, bold=True),
        "title": make_font(32, bold=True),
        "heading": make_font(24, bold=True),
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


def draw_bar(
    surface: pygame.Surface,
    rect: pygame.Rect,
    ratio: float,
    color: tuple[int, int, int],
    back_color: tuple[int, int, int],
    border: tuple[int, int, int],
) -> None:
    pygame.draw.rect(surface, back_color, rect, border_radius=12)
    fill = pygame.Rect(rect.x + 3, rect.y + 3, int((rect.width - 6) * clamp(ratio, 0.0, 1.0)), rect.height - 6)
    if fill.width > 0:
        pygame.draw.rect(surface, color, fill, border_radius=10)
    pygame.draw.rect(surface, border, rect, width=2, border_radius=12)


def draw_menu(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    blueprints: list[FighterBlueprint],
    art: dict[str, CharacterArt],
    selected_index: int,
    pulse: float,
) -> None:
    title = fonts["hero"].render("MEME DEBATE ARENA", True, settings.text_color)
    title_shadow = fonts["hero"].render("MEME DEBATE ARENA", True, (8, 11, 18))
    title_rect = title.get_rect(center=(settings.width // 2, 66))
    surface.blit(title_shadow, title_rect.move(3, 4))
    surface.blit(title, title_rect)

    subtitle = fonts["body"].render(
        "Pick a meme form, clear the arcade ladder, and survive the 牢A execution line.",
        True,
        settings.muted_text,
    )
    surface.blit(subtitle, subtitle.get_rect(center=(settings.width // 2, 108)))

    grid_panel = pygame.Rect(42, 148, 836, 632)
    detail_panel = pygame.Rect(904, 148, 494, 632)
    draw_panel(surface, grid_panel, (15, 20, 33, 205), (248, 223, 178), radius=30)
    draw_panel(surface, detail_panel, (15, 20, 33, 218), (248, 223, 178), radius=30)

    selected = blueprints[selected_index]
    card_w, card_h = 230, 266
    spacing_x, spacing_y = 20, 18
    for index, blueprint in enumerate(blueprints):
        row = index // 3
        col = index % 3
        rect = pygame.Rect(grid_panel.x + 26 + col * (card_w + spacing_x), grid_panel.y + 26 + row * (card_h + spacing_y), card_w, card_h)
        is_selected = index == selected_index
        pulse_scale = 1.0 + (0.02 if is_selected else 0.0) * abs(math.sin(pulse * 2.0))
        scaled = pygame.transform.smoothscale(art[blueprint.key].card, (int(card_w * pulse_scale), int((card_h - 42) * pulse_scale)))
        image_rect = scaled.get_rect(midtop=(rect.centerx, rect.y + 8))
        if is_selected:
            glow = pygame.Surface((rect.width + 16, rect.height + 12), pygame.SRCALPHA)
            alpha = 52 + int(abs(math.sin(pulse * 2.8)) * 36)
            pygame.draw.rect(glow, (*blueprint.accent_secondary, alpha), glow.get_rect(), border_radius=32)
            surface.blit(glow, (rect.x - 8, rect.y - 6))

        draw_panel(surface, rect, (18, 24, 38, 214), blueprint.accent if is_selected else (96, 106, 132), radius=24)
        surface.blit(scaled, image_rect)
        name = fonts["small"].render(blueprint.display_name, True, (247, 245, 237))
        title_surface = fonts["tiny"].render(blueprint.title, True, blueprint.accent_secondary)
        surface.blit(name, name.get_rect(center=(rect.centerx, rect.bottom - 42)))
        surface.blit(title_surface, title_surface.get_rect(center=(rect.centerx, rect.bottom - 20)))

    detail_title = fonts["title"].render(selected.display_name, True, settings.text_color)
    detail_sub = fonts["small"].render(selected.title, True, selected.accent_secondary)
    surface.blit(detail_title, (detail_panel.x + 24, detail_panel.y + 24))
    surface.blit(detail_sub, (detail_panel.x + 26, detail_panel.y + 66))

    portrait = pygame.transform.smoothscale(art[selected.key].card, (248, 304))
    portrait_rect = portrait.get_rect(topright=(detail_panel.right - 24, detail_panel.y + 22))
    surface.blit(portrait, portrait_rect)

    move_y = detail_panel.y + 118
    for label in (
        f"J  {selected.basic_name}",
        f"K  {selected.special_name}",
        f"I  {selected.utility_name}",
        f"U  {selected.ultimate_name}",
    ):
        rendered = fonts["body"].render(label, True, settings.text_color)
        surface.blit(rendered, (detail_panel.x + 26, move_y))
        move_y += 34

    blurb_y = detail_panel.y + 272
    for line in selected.blurb:
        rendered = fonts["body"].render(line, True, settings.muted_text)
        surface.blit(rendered, (detail_panel.x + 24, blurb_y))
        blurb_y += 34

    controls_panel = pygame.Rect(detail_panel.x + 20, detail_panel.bottom - 188, detail_panel.width - 40, 154)
    draw_panel(surface, controls_panel, (11, 15, 27, 200), (247, 226, 185), radius=22)
    controls_title = fonts["small"].render("Movement + System", True, selected.accent_secondary)
    surface.blit(controls_title, (controls_panel.x + 18, controls_panel.y + 14))

    for index, control in enumerate(settings.controls_text):
        row = index % 5
        column = index // 5
        rendered = fonts["tiny"].render(control, True, settings.text_color)
        surface.blit(rendered, (controls_panel.x + 18 + column * 190, controls_panel.y + 44 + row * 20))

    footer = fonts["small"].render("Arrows / WASD select, Enter start arcade mode", True, selected.accent)
    surface.blit(footer, footer.get_rect(center=(settings.width // 2, settings.height - 24)))


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
    match_index: int,
    total_matches: int,
) -> None:
    left = pygame.Rect(24, 18, 400, 154)
    right = pygame.Rect(settings.width - 424, 18, 400, 154)
    center = pygame.Rect(settings.width // 2 - 120, 18, 240, 126)
    draw_panel(surface, left, (15, 19, 31, 212), (248, 227, 176), radius=24)
    draw_panel(surface, right, (15, 19, 31, 212), (248, 227, 176), radius=24)
    draw_panel(surface, center, (15, 19, 31, 212), (248, 227, 176), radius=24)

    surface.blit(player.art.token, (left.x + 12, left.y + 12))
    surface.blit(opponent.art.token, (right.right - 144, right.y + 12))

    player_name = fonts["small"].render(player.blueprint.display_name, True, settings.text_color)
    opponent_name = fonts["small"].render(opponent.blueprint.display_name, True, settings.text_color)
    surface.blit(player_name, (left.x + 154, left.y + 14))
    surface.blit(opponent_name, opponent_name.get_rect(topright=(right.right - 154, right.y + 14)))

    draw_bar(surface, pygame.Rect(left.x + 152, left.y + 40, 228, 24), player.health_ratio, player.blueprint.accent, (46, 52, 68), (248, 236, 212))
    draw_bar(surface, pygame.Rect(right.x + 20, right.y + 40, 228, 24), opponent.health_ratio, opponent.blueprint.accent, (46, 52, 68), (248, 236, 212))
    draw_bar(surface, pygame.Rect(left.x + 152, left.y + 76, 228, 14), player.guard_ratio, player.blueprint.accent_secondary, (39, 43, 60), (194, 205, 228))
    draw_bar(surface, pygame.Rect(right.x + 20, right.y + 76, 228, 14), opponent.guard_ratio, opponent.blueprint.accent_secondary, (39, 43, 60), (194, 205, 228))
    draw_bar(surface, pygame.Rect(left.x + 152, left.y + 102, 228, 18), player.meter_ratio, settings.accent_pink, (32, 24, 42), (246, 222, 240))
    draw_bar(surface, pygame.Rect(right.x + 20, right.y + 102, 228, 18), opponent.meter_ratio, settings.accent_pink, (32, 24, 42), (246, 222, 240))

    surface.blit(fonts["tiny"].render(f"HP {int(player.health):03d}", True, settings.text_color), (left.x + 152, left.y + 126))
    surface.blit(fonts["tiny"].render(f"HP {int(opponent.health):03d}", True, settings.text_color), (right.x + 20, right.y + 126))

    timer = fonts["hero"].render(format_time(round_time), True, settings.text_color)
    timer_shadow = fonts["hero"].render(format_time(round_time), True, (8, 11, 18))
    timer_rect = timer.get_rect(center=(center.centerx, center.y + 48))
    surface.blit(timer_shadow, timer_rect.move(2, 3))
    surface.blit(timer, timer_rect)

    match_label = fonts["small"].render(f"Arcade Match {match_index}/{total_matches}", True, settings.muted_text)
    surface.blit(match_label, match_label.get_rect(center=(center.centerx, center.bottom - 24)))

    for index in range(settings.rounds_to_win):
        left_color = player.blueprint.accent_secondary if index < player_rounds else (70, 77, 95)
        right_color = opponent.blueprint.accent_secondary if index < opponent_rounds else (70, 77, 95)
        pygame.draw.circle(surface, left_color, (left.x + 36 + index * 24, left.bottom - 20), 8)
        pygame.draw.circle(surface, right_color, (right.right - 36 - index * 24, right.bottom - 20), 8)

    ticker_rect = pygame.Rect(32, settings.height - 52, settings.width - 64, 32)
    draw_panel(surface, ticker_rect, (14, 17, 29, 188), (250, 221, 164), radius=16)
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
    panel = pygame.Rect(settings.width // 2 - 270, settings.height // 2 - 96, 540, 192)
    draw_panel(surface, panel, (14, 18, 31, alpha), (248, 224, 180), radius=30)

    heading_surface = fonts["hero"].render(heading, True, settings.text_color)
    heading_shadow = fonts["hero"].render(heading, True, (10, 14, 22))
    heading_rect = heading_surface.get_rect(center=(panel.centerx, panel.y + 72))
    surface.blit(heading_shadow, heading_rect.move(2, 3))
    surface.blit(heading_surface, heading_rect)

    sub_surface = fonts["body"].render(subheading, True, settings.muted_text)
    surface.blit(sub_surface, sub_surface.get_rect(center=(panel.centerx, panel.bottom - 48)))


def draw_match_intro(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    player_bp: FighterBlueprint,
    opponent_bp: FighterBlueprint,
    player_art: CharacterArt,
    opponent_art: CharacterArt,
    stage_name: str,
    match_index: int,
    total_matches: int,
    pulse: float,
) -> None:
    overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
    overlay.fill((6, 8, 16, 156))
    surface.blit(overlay, (0, 0))

    card = pygame.Rect(settings.width // 2 - 350, settings.height // 2 - 170, 700, 340)
    glow = pygame.Surface((card.width + 30, card.height + 30), pygame.SRCALPHA)
    pygame.draw.rect(glow, (*player_bp.accent_secondary, 44 + int(abs(math.sin(pulse * 2.0)) * 44)), glow.get_rect(), border_radius=42)
    surface.blit(glow, (card.x - 15, card.y - 15))
    draw_panel(surface, card, (16, 20, 32, 236), (248, 223, 178), radius=30)

    stage = fonts["small"].render(f"Arcade Match {match_index}/{total_matches}  •  {stage_name}", True, settings.accent_gold)
    surface.blit(stage, stage.get_rect(center=(card.centerx, card.y + 28)))

    player_portrait = pygame.transform.smoothscale(player_art.card, (220, 268))
    opponent_portrait = pygame.transform.smoothscale(opponent_art.card, (220, 268))
    surface.blit(player_portrait, player_portrait.get_rect(midleft=(card.x + 42, card.centery + 18)))
    surface.blit(opponent_portrait, opponent_portrait.get_rect(midright=(card.right - 42, card.centery + 18)))

    versus = fonts["hero"].render("VS", True, settings.text_color)
    versus_shadow = fonts["hero"].render("VS", True, (8, 11, 18))
    versus_rect = versus.get_rect(center=(card.centerx, card.centery + 6))
    surface.blit(versus_shadow, versus_rect.move(2, 3))
    surface.blit(versus, versus_rect)

    left_name = fonts["heading"].render(player_bp.display_name, True, player_bp.accent_secondary)
    right_name = fonts["heading"].render(opponent_bp.display_name, True, opponent_bp.accent_secondary)
    surface.blit(left_name, left_name.get_rect(center=(card.x + 160, card.bottom - 34)))
    surface.blit(right_name, right_name.get_rect(center=(card.right - 160, card.bottom - 34)))


def draw_campaign_over(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    winner: FighterBlueprint,
    victory: bool,
    wins: int,
    pulse: float,
) -> None:
    overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
    overlay.fill((4, 6, 12, 186))
    surface.blit(overlay, (0, 0))

    card = pygame.Rect(settings.width // 2 - 320, 170, 640, 370)
    glow = pygame.Surface((card.width + 28, card.height + 28), pygame.SRCALPHA)
    pygame.draw.rect(glow, (*winner.accent_secondary, 48 + int(abs(math.sin(pulse * 2.0)) * 42)), glow.get_rect(), border_radius=38)
    surface.blit(glow, (card.x - 14, card.y - 14))
    draw_panel(surface, card, (16, 20, 32, 236), (248, 223, 178), radius=30)

    heading_text = "ARCADE CLEAR" if victory else "CAMPAIGN OVER"
    heading = fonts["hero"].render(heading_text, True, settings.text_color)
    heading_shadow = fonts["hero"].render(heading_text, True, (8, 11, 18))
    heading_rect = heading.get_rect(center=(card.centerx, card.y + 78))
    surface.blit(heading_shadow, heading_rect.move(2, 3))
    surface.blit(heading, heading_rect)

    winner_surface = fonts["title"].render(winner.display_name, True, winner.accent_secondary)
    surface.blit(winner_surface, winner_surface.get_rect(center=(card.centerx, card.y + 146)))

    line = fonts["body"].render(winner.victory_line if victory else "The ladder resets. Queue up another meme war.", True, settings.text_color)
    surface.blit(line, line.get_rect(center=(card.centerx, card.y + 196)))

    score = fonts["heading"].render(f"Matches cleared: {wins}/{settings.arcade_matches}", True, settings.muted_text)
    surface.blit(score, score.get_rect(center=(card.centerx, card.y + 246)))

    tip = fonts["small"].render("Press Enter to return to character select", True, winner.accent)
    surface.blit(tip, tip.get_rect(center=(card.centerx, card.bottom - 54)))
