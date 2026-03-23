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
        "hero": make_font(44, bold=True),
        "title": make_font(30, bold=True),
        "heading": make_font(24, bold=True),
        "body": make_font(19),
        "small": make_font(16, bold=True),
        "tiny": make_font(14),
    }


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def format_time(seconds: float) -> str:
    total = max(0, int(math.ceil(seconds)))
    return f"{total:02d}"


def draw_panel(surface: pygame.Surface, rect: pygame.Rect, fill: tuple[int, int, int, int], stroke: tuple[int, int, int], radius: int = 24) -> None:
    panel = pygame.Surface((rect.width, rect.height), pygame.SRCALPHA)
    pygame.draw.rect(panel, fill, panel.get_rect(), border_radius=radius)
    pygame.draw.rect(panel, stroke, panel.get_rect(), width=2, border_radius=radius)
    surface.blit(panel, rect.topleft)


def draw_bar(surface: pygame.Surface, rect: pygame.Rect, ratio: float, color: tuple[int, int, int], back_color: tuple[int, int, int], border: tuple[int, int, int]) -> None:
    pygame.draw.rect(surface, back_color, rect, border_radius=12)
    fill = pygame.Rect(rect.x + 3, rect.y + 3, int((rect.width - 6) * clamp(ratio, 0.0, 1.0)), rect.height - 6)
    if fill.width > 0:
        pygame.draw.rect(surface, color, fill, border_radius=10)
    pygame.draw.rect(surface, border, rect, width=2, border_radius=12)


def direction_label(direction: str) -> str:
    return {
        "neutral": "J",
        "up": "W+J",
        "down": "S+J",
        "left": "A+J",
        "right": "D+J",
        "skill_neutral": "K",
        "skill_up": "W+K",
        "skill_down": "S+K",
        "skill_left": "A+K",
        "skill_right": "D+K",
    }[direction]


def draw_menu(
    surface: pygame.Surface,
    settings: Settings,
    fonts: dict[str, pygame.font.Font],
    blueprints: list[FighterBlueprint],
    art: dict[str, CharacterArt],
    selected_index: int,
    difficulty_index: int,
    pulse: float,
) -> None:
    title = fonts["hero"].render("IRONIC ANIME MEME FIGHTER", True, settings.text_color)
    title_shadow = fonts["hero"].render("IRONIC ANIME MEME FIGHTER", True, (8, 11, 18))
    title_rect = title.get_rect(center=(settings.width // 2, 58))
    surface.blit(title_shadow, title_rect.move(3, 4))
    surface.blit(title, title_rect)

    subtitle = fonts["body"].render(
        "Select a persona form, map your directional J/K attacks, and clear the arcade ladder.",
        True,
        settings.muted_text,
    )
    surface.blit(subtitle, subtitle.get_rect(center=(settings.width // 2, 98)))

    left_panel = pygame.Rect(34, 134, 900, 676)
    right_panel = pygame.Rect(960, 134, 486, 676)
    draw_panel(surface, left_panel, (15, 20, 33, 206), (248, 223, 178), radius=30)
    draw_panel(surface, right_panel, (15, 20, 33, 220), (248, 223, 178), radius=30)

    card_w, card_h = 268, 194
    spacing_x, spacing_y = 14, 16
    for index, blueprint in enumerate(blueprints):
        row = index // 3
        col = index % 3
        rect = pygame.Rect(left_panel.x + 18 + col * (card_w + spacing_x), left_panel.y + 18 + row * (card_h + spacing_y), card_w, card_h)
        selected = index == selected_index
        glow_alpha = 56 + int(abs(math.sin(pulse * 2.2 + index)) * 34) if selected else 0
        if selected:
            glow = pygame.Surface((rect.width + 14, rect.height + 14), pygame.SRCALPHA)
            pygame.draw.rect(glow, (*blueprint.accent_secondary, glow_alpha), glow.get_rect(), border_radius=24)
            surface.blit(glow, (rect.x - 7, rect.y - 7))
        draw_panel(surface, rect, (18, 24, 38, 214), blueprint.accent if selected else (96, 106, 132), radius=22)

        card = pygame.transform.smoothscale(art[blueprint.key].card, (148, 182))
        surface.blit(card, card.get_rect(midleft=(rect.x + 86, rect.centery)))
        name = fonts["small"].render(blueprint.display_name, True, settings.text_color)
        title_surface = fonts["tiny"].render(blueprint.title, True, blueprint.accent_secondary)
        surface.blit(name, (rect.x + 154, rect.y + 34))
        surface.blit(title_surface, (rect.x + 156, rect.y + 62))
        snippet = fonts["tiny"].render(blueprint.basic_names["neutral"], True, settings.muted_text)
        snippet2 = fonts["tiny"].render(blueprint.skill_names["neutral"], True, settings.muted_text)
        surface.blit(snippet, (rect.x + 156, rect.y + 102))
        surface.blit(snippet2, (rect.x + 156, rect.y + 124))

    selected_bp = blueprints[selected_index]
    difficulty = settings.difficulty_profiles[difficulty_index]
    name_surface = fonts["title"].render(selected_bp.display_name, True, settings.text_color)
    role_surface = fonts["small"].render(selected_bp.title, True, selected_bp.accent_secondary)
    surface.blit(name_surface, (right_panel.x + 20, right_panel.y + 18))
    surface.blit(role_surface, (right_panel.x + 22, right_panel.y + 56))

    portrait = pygame.transform.smoothscale(art[selected_bp.key].card, (184, 224))
    surface.blit(portrait, portrait.get_rect(topright=(right_panel.right - 18, right_panel.y + 18)))

    diff_label = fonts["small"].render(f"AI Difficulty: {difficulty['name']}  |  press 1 / 2 / 3", True, selected_bp.accent)
    surface.blit(diff_label, (right_panel.x + 20, right_panel.y + 92))

    blurb_y = right_panel.y + 132
    for line in selected_bp.blurb:
        rendered = fonts["body"].render(line, True, settings.muted_text)
        surface.blit(rendered, (right_panel.x + 20, blurb_y))
        blurb_y += 30

    moves_j = pygame.Rect(right_panel.x + 16, right_panel.y + 236, right_panel.width - 32, 182)
    moves_k = pygame.Rect(right_panel.x + 16, right_panel.y + 430, right_panel.width - 32, 182)
    draw_panel(surface, moves_j, (11, 15, 27, 196), (247, 226, 185), radius=22)
    draw_panel(surface, moves_k, (11, 15, 27, 196), (247, 226, 185), radius=22)

    j_title = fonts["small"].render("Directional J Attacks", True, selected_bp.accent_secondary)
    k_title = fonts["small"].render("Directional K Skills", True, selected_bp.accent_secondary)
    surface.blit(j_title, (moves_j.x + 16, moves_j.y + 12))
    surface.blit(k_title, (moves_k.x + 16, moves_k.y + 12))

    for index, direction in enumerate(DIR_ORDER := ("neutral", "up", "down", "left", "right")):
        left_text = fonts["tiny"].render(f"{direction_label(direction):<4}  {selected_bp.basic_names[direction]}", True, settings.text_color)
        right_text = fonts["tiny"].render(f"{direction_label('skill_' + direction):<4}  {selected_bp.skill_names[direction]}", True, settings.text_color)
        surface.blit(left_text, (moves_j.x + 18, moves_j.y + 46 + index * 25))
        surface.blit(right_text, (moves_k.x + 18, moves_k.y + 46 + index * 25))

    ult_text = fonts["small"].render(f"U  {selected_bp.ultimate_name}", True, selected_bp.accent)
    surface.blit(ult_text, (right_panel.x + 20, right_panel.bottom - 72))

    controls = fonts["tiny"].render("Move: WASD  Guard: Space  Dash: L  Start: Enter", True, settings.muted_text)
    surface.blit(controls, (right_panel.x + 20, right_panel.bottom - 40))


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
    difficulty_name: str,
) -> None:
    left = pygame.Rect(22, 16, 418, 162)
    right = pygame.Rect(settings.width - 440, 16, 418, 162)
    center = pygame.Rect(settings.width // 2 - 150, 16, 300, 126)
    draw_panel(surface, left, (15, 19, 31, 212), (248, 227, 176), radius=24)
    draw_panel(surface, right, (15, 19, 31, 212), (248, 227, 176), radius=24)
    draw_panel(surface, center, (15, 19, 31, 212), (248, 227, 176), radius=24)

    surface.blit(player.art.token, (left.x + 12, left.y + 14))
    surface.blit(opponent.art.token, (right.right - 144, right.y + 14))
    surface.blit(fonts["small"].render(player.blueprint.display_name, True, settings.text_color), (left.x + 154, left.y + 16))
    surface.blit(fonts["small"].render(opponent.blueprint.display_name, True, settings.text_color), (right.x + 18, right.y + 16))

    draw_bar(surface, pygame.Rect(left.x + 152, left.y + 42, 246, 24), player.health_ratio, player.blueprint.accent, (46, 52, 68), (248, 236, 212))
    draw_bar(surface, pygame.Rect(right.x + 18, right.y + 42, 246, 24), opponent.health_ratio, opponent.blueprint.accent, (46, 52, 68), (248, 236, 212))
    draw_bar(surface, pygame.Rect(left.x + 152, left.y + 76, 246, 14), player.guard_ratio, player.blueprint.accent_secondary, (39, 43, 60), (194, 205, 228))
    draw_bar(surface, pygame.Rect(right.x + 18, right.y + 76, 246, 14), opponent.guard_ratio, opponent.blueprint.accent_secondary, (39, 43, 60), (194, 205, 228))
    draw_bar(surface, pygame.Rect(left.x + 152, left.y + 102, 246, 18), player.meter_ratio, settings.accent_pink, (32, 24, 42), (246, 222, 240))
    draw_bar(surface, pygame.Rect(right.x + 18, right.y + 102, 246, 18), opponent.meter_ratio, settings.accent_pink, (32, 24, 42), (246, 222, 240))

    surface.blit(fonts["tiny"].render(f"J {player.basic_cd:.1f}s  K {player.skill_cd:.1f}s  U {100 - player.meter:.0f}", True, settings.muted_text), (left.x + 152, left.y + 130))
    surface.blit(fonts["tiny"].render(f"J {opponent.basic_cd:.1f}s  K {opponent.skill_cd:.1f}s  U {100 - opponent.meter:.0f}", True, settings.muted_text), (right.x + 18, right.y + 130))

    timer = fonts["hero"].render(format_time(round_time), True, settings.text_color)
    timer_shadow = fonts["hero"].render(format_time(round_time), True, (8, 11, 18))
    timer_rect = timer.get_rect(center=(center.centerx, center.y + 48))
    surface.blit(timer_shadow, timer_rect.move(2, 3))
    surface.blit(timer, timer_rect)
    line = fonts["small"].render(f"Arcade {match_index}/{total_matches}  •  AI {difficulty_name}", True, settings.muted_text)
    surface.blit(line, line.get_rect(center=(center.centerx, center.bottom - 24)))

    for index in range(settings.rounds_to_win):
        left_color = player.blueprint.accent_secondary if index < player_rounds else (70, 77, 95)
        right_color = opponent.blueprint.accent_secondary if index < opponent_rounds else (70, 77, 95)
        pygame.draw.circle(surface, left_color, (left.x + 36 + index * 24, left.bottom - 20), 8)
        pygame.draw.circle(surface, right_color, (right.right - 36 - index * 24, right.bottom - 20), 8)

    ticker_rect = pygame.Rect(28, settings.height - 50, settings.width - 56, 30)
    draw_panel(surface, ticker_rect, (14, 17, 29, 188), (250, 221, 164), radius=16)
    ticker = fonts["small"].render(ticker_text, True, settings.text_color)
    surface.blit(ticker, ticker.get_rect(center=ticker_rect.center))


def draw_round_banner(surface: pygame.Surface, settings: Settings, fonts: dict[str, pygame.font.Font], heading: str, subheading: str, alpha: int) -> None:
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
    difficulty_name: str,
    pulse: float,
) -> None:
    overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
    overlay.fill((6, 8, 16, 156))
    surface.blit(overlay, (0, 0))
    card = pygame.Rect(settings.width // 2 - 360, settings.height // 2 - 176, 720, 352)
    glow = pygame.Surface((card.width + 30, card.height + 30), pygame.SRCALPHA)
    pygame.draw.rect(glow, (*player_bp.accent_secondary, 44 + int(abs(math.sin(pulse * 2.0)) * 44)), glow.get_rect(), border_radius=42)
    surface.blit(glow, (card.x - 15, card.y - 15))
    draw_panel(surface, card, (16, 20, 32, 236), (248, 223, 178), radius=30)

    line = fonts["small"].render(f"Arcade Match {match_index}/{total_matches}  •  {stage_name}  •  AI {difficulty_name}", True, settings.accent_gold)
    surface.blit(line, line.get_rect(center=(card.centerx, card.y + 26)))
    player_portrait = pygame.transform.smoothscale(player_art.card, (220, 268))
    opponent_portrait = pygame.transform.smoothscale(opponent_art.card, (220, 268))
    surface.blit(player_portrait, player_portrait.get_rect(midleft=(card.x + 44, card.centery + 18)))
    surface.blit(opponent_portrait, opponent_portrait.get_rect(midright=(card.right - 44, card.centery + 18)))

    versus = fonts["hero"].render("VS", True, settings.text_color)
    versus_shadow = fonts["hero"].render("VS", True, (8, 11, 18))
    versus_rect = versus.get_rect(center=(card.centerx, card.centery + 10))
    surface.blit(versus_shadow, versus_rect.move(2, 3))
    surface.blit(versus, versus_rect)
    surface.blit(fonts["heading"].render(player_bp.display_name, True, player_bp.accent_secondary), (card.x + 46, card.bottom - 48))
    name = fonts["heading"].render(opponent_bp.display_name, True, opponent_bp.accent_secondary)
    surface.blit(name, name.get_rect(topright=(card.right - 46, card.bottom - 48)))


def draw_campaign_over(surface: pygame.Surface, settings: Settings, fonts: dict[str, pygame.font.Font], winner: FighterBlueprint, victory: bool, wins: int, pulse: float) -> None:
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
    line = winner.victory_line if victory else "The ladder resets. Queue up another ironic duel."
    surface.blit(fonts["body"].render(line, True, settings.text_color), fonts["body"].render(line, True, settings.text_color).get_rect(center=(card.centerx, card.y + 196)))
    score = fonts["heading"].render(f"Matches cleared: {wins}/{settings.arcade_matches}", True, settings.muted_text)
    surface.blit(score, score.get_rect(center=(card.centerx, card.y + 246)))
    tip = fonts["small"].render("Press Enter to return to character select", True, winner.accent)
    surface.blit(tip, tip.get_rect(center=(card.centerx, card.bottom - 54)))
