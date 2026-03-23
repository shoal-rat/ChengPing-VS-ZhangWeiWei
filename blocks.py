from __future__ import annotations

import math
import random

import pygame

from setting import Settings


class ArenaBackdrop:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.theme = settings.stage_themes[0]
        self.rng = random.Random(7)
        self.bubbles = []
        self.set_theme(self.theme)

    def set_theme(self, theme: dict[str, object]) -> None:
        self.theme = theme
        keywords = theme["keywords"]
        self.bubbles = [
            {
                "x": self.rng.randint(100, self.settings.width - 180),
                "y": self.rng.randint(120, self.settings.floor_y - 180),
                "speed": self.rng.uniform(12.0, 28.0),
                "phase": self.rng.uniform(0.0, math.tau),
                "label": keywords[index % len(keywords)],
                "width": self.rng.randint(144, 216),
            }
            for index in range(10)
        ]

    def update(self, dt: float) -> None:
        for bubble in self.bubbles:
            bubble["phase"] += dt * bubble["speed"] * 0.12
            bubble["y"] += math.sin(bubble["phase"]) * dt * 10.0

    def draw(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font], pulse: float) -> None:
        self._draw_gradient(surface)
        self._draw_lights(surface, pulse)
        self._draw_grid(surface)
        self._draw_bubbles(surface, fonts)
        self._draw_stage(surface, fonts, pulse)

    def _draw_gradient(self, surface: pygame.Surface) -> None:
        width, height = surface.get_size()
        top = self.theme["top"]
        bottom = self.theme["bottom"]
        for y in range(height):
            ratio = y / max(1, height - 1)
            color = (
                int(top[0] + (bottom[0] - top[0]) * ratio),
                int(top[1] + (bottom[1] - top[1]) * ratio),
                int(top[2] + (bottom[2] - top[2]) * ratio),
            )
            pygame.draw.line(surface, color, (0, y), (width, y))

    def _draw_lights(self, surface: pygame.Surface, pulse: float) -> None:
        width, _ = surface.get_size()
        for index, color in enumerate(self.settings.stage_lights):
            diameter = 280 + index * 90
            glow = pygame.Surface((diameter, diameter), pygame.SRCALPHA)
            alpha = 30 + int(abs(math.sin(pulse * 0.7 + index)) * 20)
            pygame.draw.circle(glow, (*color, alpha), (diameter // 2, diameter // 2), diameter // 2)
            x = 60 + index * 250
            y = 44 + (index % 2) * 22
            if x + diameter > width:
                x = width - diameter - 40
            surface.blit(glow, (x, y))

    def _draw_grid(self, surface: pygame.Surface) -> None:
        width, height = surface.get_size()
        for x in range(0, width, 64):
            pygame.draw.line(surface, (255, 255, 255, 18), (x, 0), (x, height), 1)
        for y in range(48, self.settings.floor_y, 52):
            pygame.draw.line(surface, (255, 255, 255, 14), (0, y), (width, y), 1)

    def _draw_bubbles(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font]) -> None:
        for bubble in self.bubbles:
            panel = pygame.Surface((bubble["width"], 38), pygame.SRCALPHA)
            pygame.draw.rect(panel, (245, 245, 255, 28), panel.get_rect(), border_radius=19)
            pygame.draw.rect(panel, (247, 223, 181, 74), panel.get_rect(), width=1, border_radius=19)
            surface.blit(panel, (bubble["x"], bubble["y"]))
            label = fonts["tiny"].render(str(bubble["label"]), True, (247, 238, 219))
            label_rect = label.get_rect(center=(bubble["x"] + bubble["width"] // 2, bubble["y"] + 19))
            surface.blit(label, label_rect)

    def _draw_stage(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font], pulse: float) -> None:
        floor_top = self.settings.floor_y
        width, height = surface.get_size()
        floor = pygame.Rect(0, floor_top, width, height - floor_top)
        pygame.draw.rect(surface, self.theme["floor"], floor)
        pygame.draw.rect(surface, (247, 226, 180), pygame.Rect(0, floor_top, width, 4))

        shine = pygame.Surface((width, 150), pygame.SRCALPHA)
        pygame.draw.ellipse(shine, (255, 227, 174, 34), pygame.Rect(160, 20, width - 320, 72))
        surface.blit(shine, (0, floor_top - 34))

        for index, x in enumerate((180, width - 340)):
            podium = pygame.Rect(x, floor_top - 58, 148, 72)
            color = self.settings.accent_red if index == 0 else self.settings.accent_cyan
            pygame.draw.rect(surface, (24, 27, 43), podium, border_radius=22)
            pygame.draw.rect(surface, color, podium.inflate(-18, -28), border_radius=16)
            pygame.draw.rect(surface, (247, 238, 217), podium.inflate(-22, -32), width=2, border_radius=16)

        audience = pygame.Surface((width, 108), pygame.SRCALPHA)
        for index in range(22):
            x = 18 + index * 66
            h = 40 + (index % 4) * 10
            color = (8, 12, 20, 150) if index % 2 == 0 else (18, 22, 35, 170)
            pygame.draw.circle(audience, color, (x, 86 - h), 16 + (index % 3) * 2)
            pygame.draw.rect(audience, color, pygame.Rect(x - 15, 86 - h + 12, 30, 44), border_radius=12)
        surface.blit(audience, (0, floor_top + 6))

        banner = pygame.Rect(width // 2 - 264, 64, 528, 90)
        panel = pygame.Surface((banner.width, banner.height), pygame.SRCALPHA)
        pygame.draw.rect(panel, (14, 18, 31, 195), panel.get_rect(), border_radius=30)
        pygame.draw.rect(panel, (247, 227, 177, 112), panel.get_rect(), width=2, border_radius=30)
        surface.blit(panel, banner.topleft)

        title = fonts["heading"].render(str(self.theme["name"]), True, (247, 241, 233))
        title_shadow = fonts["heading"].render(str(self.theme["name"]), True, (8, 12, 22))
        subtitle = fonts["small"].render(str(self.theme["subtitle"]), True, self.settings.muted_text)
        title_rect = title.get_rect(center=(banner.centerx, banner.y + 34 + int(math.sin(pulse * 2.0) * 2)))
        subtitle_rect = subtitle.get_rect(center=(banner.centerx, banner.bottom - 24))
        surface.blit(title_shadow, title_rect.move(2, 2))
        surface.blit(title, title_rect)
        surface.blit(subtitle, subtitle_rect)
