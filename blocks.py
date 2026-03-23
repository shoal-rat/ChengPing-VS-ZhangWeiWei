from __future__ import annotations

import math
import random

import pygame

from setting import Settings


class ArenaBackdrop:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        rng = random.Random(7)
        self.bubbles = [
            {
                "x": rng.randint(120, settings.width - 120),
                "y": rng.randint(110, settings.floor_y - 140),
                "speed": rng.uniform(12.0, 28.0),
                "phase": rng.uniform(0.0, math.tau),
                "label": rng.choice(settings.stage_keywords),
                "width": rng.randint(126, 186),
            }
            for _ in range(9)
        ]

    def update(self, dt: float) -> None:
        for bubble in self.bubbles:
            bubble["phase"] += dt * bubble["speed"] * 0.12
            bubble["y"] += math.sin(bubble["phase"]) * dt * 12.0

    def draw(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font], pulse: float) -> None:
        self._draw_gradient(surface)
        self._draw_lights(surface, pulse)
        self._draw_grid(surface)
        self._draw_bubbles(surface, fonts)
        self._draw_stage(surface, fonts, pulse)

    def _draw_gradient(self, surface: pygame.Surface) -> None:
        width, height = surface.get_size()
        top = self.settings.background_top
        bottom = self.settings.background_bottom
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
            diameter = 320 + index * 90
            glow = pygame.Surface((diameter, diameter), pygame.SRCALPHA)
            alpha = 36 + int(abs(math.sin(pulse * 0.8 + index)) * 18)
            pygame.draw.circle(glow, (*color, alpha), (diameter // 2, diameter // 2), diameter // 2)
            x = 90 + index * 280
            y = 42 + (index % 2) * 28
            if x + diameter > width:
                x = width - diameter - 60
            surface.blit(glow, (x, y))

    def _draw_grid(self, surface: pygame.Surface) -> None:
        width, height = surface.get_size()
        for x in range(0, width, 64):
            pygame.draw.line(surface, (255, 255, 255, 18), (x, 0), (x, height), 1)
        for y in range(40, self.settings.floor_y, 50):
            pygame.draw.line(surface, (255, 255, 255, 14), (0, y), (width, y), 1)

    def _draw_bubbles(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font]) -> None:
        for bubble in self.bubbles:
            panel = pygame.Surface((bubble["width"], 36), pygame.SRCALPHA)
            pygame.draw.rect(panel, (245, 245, 255, 28), panel.get_rect(), border_radius=18)
            pygame.draw.rect(panel, (247, 223, 181, 70), panel.get_rect(), width=1, border_radius=18)
            surface.blit(panel, (bubble["x"], bubble["y"]))
            label = fonts["tiny"].render(bubble["label"], True, (247, 238, 219))
            label_rect = label.get_rect(center=(bubble["x"] + bubble["width"] // 2, bubble["y"] + 18))
            surface.blit(label, label_rect)

    def _draw_stage(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font], pulse: float) -> None:
        floor_top = self.settings.floor_y
        width, height = surface.get_size()
        floor = pygame.Rect(0, floor_top, width, height - floor_top)
        pygame.draw.rect(surface, self.settings.floor_color, floor)
        pygame.draw.rect(surface, (247, 226, 180), pygame.Rect(0, floor_top, width, 4))

        shine = pygame.Surface((width, 140), pygame.SRCALPHA)
        pygame.draw.ellipse(shine, (255, 227, 174, 28), pygame.Rect(160, 22, width - 320, 70))
        surface.blit(shine, (0, floor_top - 32))

        podium_width = 140
        for index, x in enumerate((190, width - 330)):
            podium = pygame.Rect(x, floor_top - 54, podium_width, 68)
            color = self.settings.accent_red if index == 0 else self.settings.accent_cyan
            pygame.draw.rect(surface, (24, 27, 43), podium, border_radius=22)
            pygame.draw.rect(surface, color, podium.inflate(-18, -26), border_radius=16)
            pygame.draw.rect(surface, (247, 238, 217), podium.inflate(-22, -30), width=2, border_radius=16)

        banner = pygame.Rect(width // 2 - 220, 76, 440, 66)
        panel = pygame.Surface((banner.width, banner.height), pygame.SRCALPHA)
        pygame.draw.rect(panel, (14, 18, 31, 185), panel.get_rect(), border_radius=28)
        pygame.draw.rect(panel, (247, 227, 177, 110), panel.get_rect(), width=2, border_radius=28)
        surface.blit(panel, banner.topleft)

        label = fonts["small"].render("Meme Debate Arena", True, (247, 241, 233))
        shadow = fonts["small"].render("Meme Debate Arena", True, (8, 12, 22))
        center_y = banner.centery - 4 + int(math.sin(pulse * 2.0) * 2)
        label_rect = label.get_rect(center=(banner.centerx, center_y))
        surface.blit(shadow, label_rect.move(2, 2))
        surface.blit(label, label_rect)
