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
    behavior: str = "linear"
    width: int = 36
    height: int = 20
    radius: int = 18
    life: float = 2.0
    knockback_y: float = -210.0
    wave_amplitude: float = 0.0
    wave_speed: float = 0.0
    gravity: float = 0.0
    rotation_speed: float = 120.0
    return_delay: float = 0.0
    return_speed: float = 440.0
    anchor_owner: str | None = None
    orbit_radius: float = 0.0
    orbit_speed: float = 0.0
    orbit_angle: float = 0.0
    floor_lock: float | None = None
    alpha: int = 220
    base_y: float = 0.0
    age: float = 0.0
    returning: bool = False
    trail: list[Vec2] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.base_y = self.pos.y

    @property
    def rect(self) -> pygame.Rect:
        if self.shape == "beam":
            return pygame.Rect(
                int(self.pos.x - self.width / 2),
                int(self.pos.y - self.height / 2),
                self.width,
                self.height,
            )
        if self.shape in {"card", "receipt", "mic", "blade"}:
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

    def update(self, dt: float, anchors: dict[str, Vec2]) -> bool:
        self.age += dt
        self.life -= dt
        if self.life <= 0.0:
            return False

        if self.behavior == "orbit":
            anchor = anchors.get(self.anchor_owner or self.owner)
            if anchor is None:
                return False
            self.orbit_angle += self.orbit_speed * dt
            angle = math.radians(self.orbit_angle)
            self.pos.x = anchor.x + math.cos(angle) * self.orbit_radius
            self.pos.y = anchor.y + math.sin(angle) * self.orbit_radius * 0.65
        elif self.behavior == "boomerang":
            anchor = anchors.get(self.anchor_owner or self.owner)
            if not self.returning and self.age >= self.return_delay and anchor is not None:
                self.returning = True
            if self.returning and anchor is not None:
                delta = anchor - self.pos
                if delta.length_squared() > 0.01:
                    self.velocity = delta.normalize() * self.return_speed
            self.pos += self.velocity * dt
        elif self.behavior == "ground_wave":
            self.pos.x += self.velocity.x * dt
            baseline = self.floor_lock if self.floor_lock is not None else self.base_y
            self.pos.y = baseline + math.sin(self.age * self.wave_speed) * self.wave_amplitude
        elif self.behavior == "wave":
            self.pos.x += self.velocity.x * dt
            self.base_y += self.velocity.y * dt
            self.pos.y = self.base_y + math.sin(self.age * self.wave_speed) * self.wave_amplitude
        else:
            self.pos += self.velocity * dt
            if self.gravity:
                self.velocity.y += self.gravity * dt

        self.trail.append(self.pos.copy())
        if len(self.trail) > 7:
            self.trail.pop(0)
        return True

    def draw(self, surface: pygame.Surface) -> None:
        for index, point in enumerate(self.trail):
            alpha = 18 + index * 20
            trail_radius = 3 + index * 2
            trail = pygame.Surface((trail_radius * 4, trail_radius * 4), pygame.SRCALPHA)
            pygame.draw.circle(
                trail,
                (*self.glow, min(alpha, 150)),
                (trail.get_width() // 2, trail.get_height() // 2),
                trail_radius,
            )
            surface.blit(trail, trail.get_rect(center=(point.x, point.y)))

        if self.shape == "card":
            self._draw_card(surface, torn=False)
            return
        if self.shape == "receipt":
            self._draw_card(surface, torn=True)
            return
        if self.shape == "mic":
            self._draw_mic(surface)
            return
        if self.shape == "blade":
            self._draw_blade(surface)
            return
        if self.shape == "beam":
            self._draw_beam(surface)
            return
        self._draw_orb(surface)

    def _draw_orb(self, surface: pygame.Surface) -> None:
        glow = pygame.Surface((self.radius * 4, self.radius * 4), pygame.SRCALPHA)
        center = glow.get_width() // 2, glow.get_height() // 2
        pygame.draw.circle(glow, (*self.glow, 84), center, self.radius + 12)
        pygame.draw.circle(glow, (*self.color, 180), center, self.radius + 4)
        surface.blit(glow, glow.get_rect(center=(self.pos.x, self.pos.y)))
        pygame.draw.circle(surface, self.color, (int(self.pos.x), int(self.pos.y)), self.radius)
        pygame.draw.circle(surface, (252, 250, 244), (int(self.pos.x - 5), int(self.pos.y - 4)), max(3, self.radius // 4))

    def _draw_card(self, surface: pygame.Surface, torn: bool) -> None:
        canvas = pygame.Surface((self.width + 18, self.height + 18), pygame.SRCALPHA)
        angle = math.sin(self.age * math.radians(self.rotation_speed)) * 12
        outer = pygame.Rect(2, 2, self.width + 14, self.height + 14)
        body = pygame.Rect(9, 9, self.width, self.height)
        pygame.draw.rect(canvas, (*self.glow, 96), outer, border_radius=12)
        pygame.draw.rect(canvas, self.color, body, border_radius=10)
        inner = body.inflate(-12, -8)
        pygame.draw.rect(canvas, (250, 244, 230), inner, border_radius=8)
        pygame.draw.line(canvas, self.color, (16, 14), (self.width + 4, self.height + 4), 3)
        if torn:
            zigzag = [(12, self.height + 6), (20, self.height + 2), (28, self.height + 8), (36, self.height + 2), (44, self.height + 8)]
            pygame.draw.lines(canvas, self.color, False, zigzag, 3)
            for y in range(8, self.height + 2, 6):
                pygame.draw.line(canvas, (*self.color, 160), (16, y), (self.width - 4, y), 1)
        rotated = pygame.transform.rotozoom(canvas, angle, 1.0)
        surface.blit(rotated, rotated.get_rect(center=(self.pos.x, self.pos.y)))

    def _draw_mic(self, surface: pygame.Surface) -> None:
        canvas = pygame.Surface((self.width + 18, self.height + 18), pygame.SRCALPHA)
        glow = pygame.Rect(0, 0, self.width + 18, self.height + 18)
        pygame.draw.ellipse(canvas, (*self.glow, 88), glow)
        head_center = (self.width // 2 + 6, 14)
        pygame.draw.circle(canvas, self.color, head_center, 12)
        pygame.draw.circle(canvas, (245, 245, 245), head_center, 10, width=2)
        pygame.draw.line(canvas, self.color, head_center, (head_center[0] + 18, self.height + 6), 8)
        pygame.draw.line(canvas, (234, 225, 200), (head_center[0] + 10, 30), (head_center[0] + 22, self.height + 2), 4)
        rotated = pygame.transform.rotozoom(canvas, math.sin(self.age * 6.0) * 16, 1.0)
        surface.blit(rotated, rotated.get_rect(center=(self.pos.x, self.pos.y)))

    def _draw_blade(self, surface: pygame.Surface) -> None:
        canvas = pygame.Surface((self.width + 28, self.height + 28), pygame.SRCALPHA)
        polygon = [
            (8, self.height // 2 + 10),
            (self.width // 2 + 6, 6),
            (self.width + 18, self.height // 2 + 10),
            (self.width // 2 + 6, self.height + 18),
        ]
        pygame.draw.polygon(canvas, (*self.glow, 72), polygon)
        inner = [
            (20, self.height // 2 + 10),
            (self.width // 2 + 6, 16),
            (self.width + 4, self.height // 2 + 10),
            (self.width // 2 + 6, self.height + 4),
        ]
        pygame.draw.polygon(canvas, self.color, inner)
        pygame.draw.line(canvas, (255, 246, 234), (self.width // 2 + 6, 14), (self.width // 2 + 6, self.height + 6), 2)
        rotated = pygame.transform.rotozoom(canvas, self.velocity.angle_to(Vec2(1, 0)), 1.0)
        surface.blit(rotated, rotated.get_rect(center=(self.pos.x, self.pos.y)))

    def _draw_beam(self, surface: pygame.Surface) -> None:
        beam = pygame.Surface((self.width + 24, self.height + 24), pygame.SRCALPHA)
        outer = pygame.Rect(0, 0, self.width + 24, self.height + 24)
        inner = pygame.Rect(8, 8, self.width + 8, self.height + 8)
        core = pygame.Rect(12, 12, self.width, self.height)
        pygame.draw.rect(beam, (*self.glow, 84), outer, border_radius=max(10, self.height // 2))
        pygame.draw.rect(beam, (*self.color, 200), inner, border_radius=max(8, self.height // 2))
        pygame.draw.rect(beam, (255, 246, 232), core, border_radius=max(6, self.height // 2))
        surface.blit(beam, beam.get_rect(center=(self.pos.x, self.pos.y)))


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
        surface.blit(shadow, rect.move(2, 2))
        surface.blit(rendered, rect)


class KillLineEvent:
    def __init__(self, floor_y: int) -> None:
        self.floor_y = floor_y
        self.damage = 24
        self.band_y = floor_y - 82
        self.thickness = 20
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
        self.timer = 0.92
        self.hit_registry.clear()
        return True

    def force_trigger(self) -> None:
        self.used = True
        self.phase = "warning"
        self.timer = 0.42
        self.hit_registry.clear()

    def update(self, dt: float) -> str | None:
        if self.phase == "idle":
            return None

        self.timer -= dt
        if self.phase == "warning" and self.timer <= 0:
            self.phase = "active"
            self.timer = 0.74
            return "牢A arrives. The execution line is live."
        if self.phase == "active" and self.timer <= 0:
            self.phase = "cooldown"
            self.timer = 0.38
        elif self.phase == "cooldown" and self.timer <= 0:
            self.phase = "idle"
        return None

    def band_rect(self, screen_width: int) -> pygame.Rect:
        margin = 96
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
            alpha = 90 + int(abs(math.sin(pulse * 7.0)) * 130)
            warning = pygame.Surface((band.width, band.height + 30), pygame.SRCALPHA)
            pygame.draw.rect(warning, (*warning_color, alpha), pygame.Rect(0, 15, band.width, band.height), border_radius=14)
            pygame.draw.rect(
                warning,
                (*warning_color, min(alpha + 40, 255)),
                pygame.Rect(0, 18, band.width, max(4, band.height - 6)),
                width=2,
                border_radius=14,
            )
            surface.blit(warning, (band.x, band.y - 15))
        else:
            beam = pygame.Surface((band.width, band.height + 42), pygame.SRCALPHA)
            pygame.draw.rect(beam, (255, 90, 155, 92), pygame.Rect(0, 0, band.width, band.height + 42), border_radius=16)
            pygame.draw.rect(beam, (255, 132, 194, 210), pygame.Rect(0, 14, band.width, band.height + 14), border_radius=16)
            pygame.draw.rect(beam, (255, 239, 245), pygame.Rect(0, 23, band.width, band.height - 4), border_radius=12)
            surface.blit(beam, (band.x, band.y - 21))

        label = "牢A 斩杀线"
        label_font = fonts["small"]
        text = label_font.render(label, True, (255, 244, 246))
        shadow = label_font.render(label, True, (20, 8, 15))
        rect = text.get_rect(midbottom=(screen_width // 2, band.y - 12))
        surface.blit(shadow, rect.move(2, 2))
        surface.blit(text, rect)
