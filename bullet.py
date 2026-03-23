from __future__ import annotations

from dataclasses import dataclass, field
import math

import pygame


Vec2 = pygame.Vector2


@dataclass(slots=True)
class Projectile:
    owner: str
    label: str
    pos: Vec2
    velocity: Vec2
    damage: int
    color: tuple[int, int, int]
    glow: tuple[int, int, int]
    shape: str = "orb"
    width: int = 36
    height: int = 20
    radius: int = 18
    life: float = 2.0
    knockback_x: float = 240.0
    knockback_y: float = -210.0
    wave_amplitude: float = 0.0
    wave_speed: float = 0.0
    gravity: float = 0.0
    rotation_speed: float = 120.0
    trail: list[Vec2] = field(default_factory=list)
    age: float = 0.0
    base_y: float = 0.0

    def __post_init__(self) -> None:
        self.base_y = self.pos.y

    @property
    def rect(self) -> pygame.Rect:
        if self.shape == "card":
            return pygame.Rect(
                int(self.pos.x - self.width / 2),
                int(self.pos.y - self.height / 2),
                self.width,
                self.height,
            )
        return pygame.Rect(
            int(self.pos.x - self.radius),
            int(self.pos.y - self.radius),
            self.radius * 2,
            self.radius * 2,
        )

    def update(self, dt: float) -> bool:
        self.age += dt
        self.life -= dt
        self.pos.x += self.velocity.x * dt
        self.base_y += self.velocity.y * dt
        if self.wave_amplitude:
            self.pos.y = self.base_y + math.sin(self.age * self.wave_speed) * self.wave_amplitude
        else:
            self.pos.y = self.base_y
        if self.gravity:
            self.velocity.y += self.gravity * dt

        self.trail.append(self.pos.copy())
        if len(self.trail) > 6:
            self.trail.pop(0)
        return self.life > 0.0

    def draw(self, surface: pygame.Surface) -> None:
        for index, point in enumerate(self.trail):
            alpha = 28 + index * 20
            trail_radius = 4 + index * 2
            trail_surface = pygame.Surface((trail_radius * 4, trail_radius * 4), pygame.SRCALPHA)
            pygame.draw.circle(
                trail_surface,
                (*self.glow, min(alpha, 140)),
                (trail_surface.get_width() // 2, trail_surface.get_height() // 2),
                trail_radius,
            )
            surface.blit(
                trail_surface,
                (point.x - trail_surface.get_width() / 2, point.y - trail_surface.get_height() / 2),
            )

        if self.shape == "card":
            card = pygame.Surface((self.width + 12, self.height + 12), pygame.SRCALPHA)
            angle = math.sin(self.age * math.radians(self.rotation_speed)) * 10
            glow_rect = pygame.Rect(1, 1, self.width + 10, self.height + 10)
            body_rect = pygame.Rect(6, 6, self.width, self.height)
            pygame.draw.rect(card, (*self.glow, 90), glow_rect, border_radius=12)
            pygame.draw.rect(card, self.color, body_rect, border_radius=10)
            pygame.draw.rect(card, (250, 244, 230), body_rect.inflate(-12, -8), border_radius=8)
            pygame.draw.line(card, self.color, (12, 10), (self.width - 2, self.height + 1), 3)
            rotated = pygame.transform.rotozoom(card, angle, 1.0)
            surface.blit(rotated, rotated.get_rect(center=(self.pos.x, self.pos.y)))
            return

        glow_surface = pygame.Surface((self.radius * 4, self.radius * 4), pygame.SRCALPHA)
        center = glow_surface.get_width() // 2, glow_surface.get_height() // 2
        pygame.draw.circle(glow_surface, (*self.glow, 80), center, self.radius + 12)
        pygame.draw.circle(glow_surface, (*self.color, 170), center, self.radius + 3)
        surface.blit(glow_surface, glow_surface.get_rect(center=(self.pos.x, self.pos.y)))
        pygame.draw.circle(surface, self.color, (int(self.pos.x), int(self.pos.y)), self.radius)
        pygame.draw.circle(surface, (248, 248, 248), (int(self.pos.x - 5), int(self.pos.y - 4)), max(4, self.radius // 4))


@dataclass(slots=True)
class FloatingText:
    text: str
    pos: Vec2
    color: tuple[int, int, int]
    life: float = 0.95
    rise_speed: float = 52.0
    age: float = 0.0

    def update(self, dt: float) -> bool:
        self.age += dt
        self.life -= dt
        self.pos.y -= self.rise_speed * dt
        return self.life > 0.0

    def draw(self, surface: pygame.Surface, font: pygame.font.Font) -> None:
        alpha = max(0, min(255, int((self.life / 0.95) * 255)))
        rendered = font.render(self.text, True, self.color)
        rendered.set_alpha(alpha)
        shadow = font.render(self.text, True, (12, 14, 24))
        shadow.set_alpha(alpha)
        rect = rendered.get_rect(center=(self.pos.x, self.pos.y))
        shadow_rect = rect.move(2, 2)
        surface.blit(shadow, shadow_rect)
        surface.blit(rendered, rect)


class KillLineEvent:
    def __init__(self, floor_y: int) -> None:
        self.floor_y = floor_y
        self.damage = 18
        self.band_y = floor_y - 72
        self.thickness = 18
        self.reset()

    def reset(self) -> None:
        self.phase = "idle"
        self.timer = 0.0
        self.used = False
        self.hit_registry: set[str] = set()

    def trigger(self) -> bool:
        if self.used or self.phase != "idle":
            return False
        self.used = True
        self.phase = "warning"
        self.timer = 1.05
        self.hit_registry.clear()
        return True

    def update(self, dt: float) -> str | None:
        if self.phase == "idle":
            return None

        self.timer -= dt
        if self.phase == "warning" and self.timer <= 0:
            self.phase = "active"
            self.timer = 0.72
            return "牢A arrives. The execution line is live."
        if self.phase == "active" and self.timer <= 0:
            self.phase = "cooldown"
            self.timer = 0.42
        elif self.phase == "cooldown" and self.timer <= 0:
            self.phase = "idle"
        return None

    def band_rect(self, screen_width: int) -> pygame.Rect:
        margin = 94
        return pygame.Rect(margin, int(self.band_y - self.thickness / 2), screen_width - margin * 2, self.thickness)

    def register_hit(self, fighter_key: str) -> None:
        self.hit_registry.add(fighter_key)

    def can_hit(self, fighter_key: str) -> bool:
        return self.phase == "active" and fighter_key not in self.hit_registry

    def draw(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font], screen_width: int, pulse: float) -> None:
        if self.phase == "idle":
            return

        band = self.band_rect(screen_width)
        warning_color = (255, 100, 150)
        if self.phase == "warning":
            alpha = 80 + int(abs(math.sin(pulse * 7.0)) * 120)
            warning = pygame.Surface((band.width, band.height + 28), pygame.SRCALPHA)
            pygame.draw.rect(
                warning,
                (*warning_color, alpha),
                pygame.Rect(0, 14, band.width, band.height),
                border_radius=14,
            )
            pygame.draw.rect(
                warning,
                (*warning_color, min(alpha + 40, 255)),
                pygame.Rect(0, 16, band.width, max(4, band.height - 4)),
                width=2,
                border_radius=14,
            )
            surface.blit(warning, (band.x, band.y - 14))
        else:
            beam = pygame.Surface((band.width, band.height + 36), pygame.SRCALPHA)
            pygame.draw.rect(beam, (255, 90, 155, 90), pygame.Rect(0, 0, band.width, band.height + 36), border_radius=16)
            pygame.draw.rect(beam, (255, 132, 194, 220), pygame.Rect(0, 12, band.width, band.height + 12), border_radius=16)
            pygame.draw.rect(beam, (255, 239, 245), pygame.Rect(0, 20, band.width, band.height - 4), border_radius=12)
            surface.blit(beam, (band.x, band.y - 18))

        label_font = fonts["small"]
        text = label_font.render("牢A 斩杀线", True, (255, 244, 246))
        shadow = label_font.render("牢A 斩杀线", True, (20, 8, 15))
        label_rect = text.get_rect(midbottom=(screen_width // 2, band.y - 12))
        surface.blit(shadow, label_rect.move(2, 2))
        surface.blit(text, label_rect)
