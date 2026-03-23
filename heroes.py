from __future__ import annotations

from dataclasses import dataclass, field

import pygame

from bullet import Projectile
from setting import Settings


Vec2 = pygame.Vector2


@dataclass(frozen=True, slots=True)
class FighterBlueprint:
    key: str
    display_name: str
    title: str
    accent: tuple[int, int, int]
    accent_secondary: tuple[int, int, int]
    body: tuple[int, int, int]
    coat: tuple[int, int, int]
    basic_name: str
    special_name: str
    blurb: tuple[str, ...]
    victory_line: str
    preferred_range: int


def build_blueprints(settings: Settings) -> list[FighterBlueprint]:
    return [
        FighterBlueprint(
            key="chen_ping",
            display_name="陈平 / Chen Ping",
            title="Macro Meme Zoner",
            accent=settings.accent_red,
            accent_secondary=settings.accent_gold,
            body=(244, 224, 196),
            coat=(78, 44, 38),
            basic_name="陈平不等式",
            special_name="购买力冲击波",
            blurb=(
                "Built from the '陈平不等式' meme and purchasing-power discourse.",
                "Fast card projectiles keep the screen busy and force jumps.",
                "Best at pressuring from range, then dashing through panic.",
            ),
            victory_line="The spreadsheet says the debate has already been settled.",
            preferred_range=410,
        ),
        FighterBlueprint(
            key="zhang_weiwei",
            display_name="张维为 / Zhang Weiwei",
            title="Civilizational-State Caster",
            accent=settings.accent_cyan,
            accent_secondary=settings.accent_blue,
            body=(236, 221, 192),
            coat=(26, 48, 74),
            basic_name="文明型国家",
            special_name="这就是中国",
            blurb=(
                "Built from the 'civilizational state', 'discourse power', and TV-panel persona.",
                "Wave orbs dominate midrange while the special floods space with pressure.",
                "Best when controlling tempo and punishing over-commits.",
            ),
            victory_line="This arena now counts as a successful discourse experiment.",
            preferred_range=330,
        ),
    ]


class Fighter:
    def __init__(
        self,
        blueprint: FighterBlueprint,
        settings: Settings,
        start_x: float,
        facing: int,
        is_player: bool,
    ) -> None:
        self.blueprint = blueprint
        self.settings = settings
        self.width, self.height = settings.fighter_size
        self.is_player = is_player
        self.ai_cooldown = 0.0
        self.afterimages: list[tuple[pygame.Rect, float]] = []
        self.reset(start_x, facing)

    def reset(self, start_x: float, facing: int) -> None:
        ground_y = self.settings.floor_y - self.height
        self.pos = Vec2(start_x, ground_y)
        self.vel = Vec2()
        self.move_axis = 0.0
        self.facing = facing
        self.health = float(self.settings.max_health)
        self.on_ground = True
        self.attack_cd = 0.0
        self.special_cd = 0.0
        self.dash_cd = 0.0
        self.dash_timer = 0.0
        self.hitstun = 0.0
        self.invuln = 0.0
        self.flash_timer = 0.0
        self.jump_buffer = 0.0
        self.ai_cooldown = 0.0
        self.afterimages.clear()

    @property
    def hurtbox(self) -> pygame.Rect:
        return pygame.Rect(int(self.pos.x), int(self.pos.y), self.width, self.height)

    @property
    def center(self) -> Vec2:
        return Vec2(self.pos.x + self.width / 2, self.pos.y + self.height / 2)

    @property
    def feet(self) -> tuple[int, int]:
        return int(self.pos.x + self.width / 2), int(self.pos.y + self.height)

    @property
    def health_ratio(self) -> float:
        return max(0.0, self.health / self.settings.max_health)

    def set_move(self, axis: float) -> None:
        self.move_axis = axis
        if abs(axis) > 0.1:
            self.facing = 1 if axis > 0 else -1

    def jump(self) -> None:
        if self.on_ground and self.hitstun <= 0.0:
            self.vel.y = -self.settings.jump_speed
            self.on_ground = False

    def dash(self) -> bool:
        if self.dash_cd > 0.0 or self.hitstun > 0.0:
            return False
        self.dash_cd = 1.55
        self.dash_timer = self.settings.dash_duration
        return True

    def take_damage(self, damage: int, knockback_direction: int, launch_y: float) -> bool:
        if self.invuln > 0.0:
            return False
        self.health = max(0.0, self.health - damage)
        self.invuln = 0.18
        self.flash_timer = 0.18
        self.hitstun = 0.16
        self.vel.x = knockback_direction * 260.0
        self.vel.y = launch_y
        self.on_ground = False
        return True

    def spawn_basic(self) -> list[Projectile]:
        if self.attack_cd > 0.0 or self.hitstun > 0.0:
            return []
        self.attack_cd = 0.48
        direction = 1 if self.facing >= 0 else -1
        origin = self.center + Vec2(direction * 42, -18)

        if self.blueprint.key == "chen_ping":
            return [
                Projectile(
                    owner=self.blueprint.key,
                    label=self.blueprint.basic_name,
                    pos=origin,
                    velocity=Vec2(direction * 780.0, -12.0),
                    damage=10,
                    color=self.blueprint.accent,
                    glow=self.blueprint.accent_secondary,
                    shape="card",
                    width=42,
                    height=22,
                    life=1.8,
                    knockback_x=270.0,
                    knockback_y=-180.0,
                    rotation_speed=155.0,
                )
            ]

        return [
            Projectile(
                owner=self.blueprint.key,
                label=self.blueprint.basic_name,
                pos=origin,
                velocity=Vec2(direction * 610.0, 0.0),
                damage=9,
                color=self.blueprint.accent,
                glow=self.blueprint.accent_secondary,
                shape="orb",
                radius=16,
                life=2.1,
                knockback_x=235.0,
                knockback_y=-170.0,
                wave_amplitude=18.0,
                wave_speed=8.6,
            )
        ]

    def spawn_special(self) -> list[Projectile]:
        if self.special_cd > 0.0 or self.hitstun > 0.0:
            return []
        self.special_cd = 3.7
        direction = 1 if self.facing >= 0 else -1
        origin = self.center + Vec2(direction * 40, -28)

        if self.blueprint.key == "chen_ping":
            spread = (-120.0, 0.0, 120.0)
            return [
                Projectile(
                    owner=self.blueprint.key,
                    label=self.blueprint.special_name,
                    pos=origin + Vec2(0, drift / 8),
                    velocity=Vec2(direction * 705.0, drift),
                    damage=8,
                    color=self.blueprint.accent_secondary,
                    glow=self.blueprint.accent,
                    shape="card",
                    width=48,
                    height=24,
                    life=1.7,
                    knockback_x=290.0,
                    knockback_y=-210.0,
                    rotation_speed=225.0,
                )
                for drift in spread
            ]

        burst_offsets = (-54.0, 0.0, 54.0)
        return [
            Projectile(
                owner=self.blueprint.key,
                label=self.blueprint.special_name,
                pos=origin + Vec2(0, offset),
                velocity=Vec2(direction * 540.0, offset * 0.12),
                damage=7,
                color=self.blueprint.accent_secondary if offset == 0 else self.blueprint.accent,
                glow=self.blueprint.accent,
                shape="orb",
                radius=18 if offset == 0 else 15,
                life=2.3,
                knockback_x=250.0,
                knockback_y=-190.0,
                wave_amplitude=24.0 + abs(offset) * 0.1,
                wave_speed=8.8,
            )
            for offset in burst_offsets
        ]

    def update(self, dt: float, arena_width: int) -> None:
        self.attack_cd = max(0.0, self.attack_cd - dt)
        self.special_cd = max(0.0, self.special_cd - dt)
        self.dash_cd = max(0.0, self.dash_cd - dt)
        self.hitstun = max(0.0, self.hitstun - dt)
        self.invuln = max(0.0, self.invuln - dt)
        self.flash_timer = max(0.0, self.flash_timer - dt)

        if self.dash_timer > 0.0:
            self.dash_timer = max(0.0, self.dash_timer - dt)
            self.pos.x += self.facing * self.settings.dash_speed * dt
            self.afterimages.append((self.hurtbox.copy(), 0.18))
        else:
            move_speed = self.settings.move_speed if self.on_ground else self.settings.air_speed
            axis = 0.0 if self.hitstun > 0.0 else self.move_axis
            self.pos.x += axis * move_speed * dt

        self.pos.x += self.vel.x * dt
        self.vel.x *= 0.84
        if abs(self.vel.x) < 18.0:
            self.vel.x = 0.0

        self.vel.y += self.settings.gravity * dt
        self.pos.y += self.vel.y * dt

        ground_y = self.settings.floor_y - self.height
        if self.pos.y >= ground_y:
            self.pos.y = ground_y
            self.vel.y = 0.0
            self.on_ground = True
        else:
            self.on_ground = False

        left_limit = self.settings.stage_margin
        right_limit = arena_width - self.settings.stage_margin - self.width
        self.pos.x = max(left_limit, min(right_limit, self.pos.x))

        updated_afterimages: list[tuple[pygame.Rect, float]] = []
        for rect, life in self.afterimages:
            if life - dt > 0.0:
                updated_afterimages.append((rect, life - dt))
        self.afterimages = updated_afterimages[-6:]

    def face_target(self, target_x: float) -> None:
        self.facing = 1 if target_x >= self.center.x else -1

    def draw(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font]) -> None:
        for rect, life in self.afterimages:
            alpha = int((life / 0.18) * 90)
            trail_surface = pygame.Surface((rect.width + 12, rect.height + 12), pygame.SRCALPHA)
            pygame.draw.rect(
                trail_surface,
                (*self.blueprint.accent, alpha),
                pygame.Rect(0, 6, rect.width + 12, rect.height),
                border_radius=28,
            )
            surface.blit(trail_surface, (rect.x - 6, rect.y - 6))

        shadow_surface = pygame.Surface((120, 40), pygame.SRCALPHA)
        pygame.draw.ellipse(shadow_surface, self.settings.shadow_color, shadow_surface.get_rect())
        surface.blit(shadow_surface, (self.pos.x - 6, self.pos.y + self.height - 18))

        hurtbox = self.hurtbox
        body_surface = pygame.Surface((self.width + 18, self.height + 18), pygame.SRCALPHA)
        flash = self.flash_timer > 0.0
        glow_rect = pygame.Rect(3, 18, self.width + 12, self.height - 20)
        body_rect = pygame.Rect(12, 28, self.width - 6, self.height - 40)
        head_center = (self.width // 2 + 10, 32)
        glow_color = (*self.blueprint.accent_secondary, 72 if not flash else 132)
        pygame.draw.rect(body_surface, glow_color, glow_rect, border_radius=34)
        pygame.draw.rect(
            body_surface,
            (255, 246, 236) if flash else self.blueprint.coat,
            body_rect,
            border_radius=28,
        )
        pygame.draw.circle(body_surface, self.blueprint.body, head_center, 24)
        pygame.draw.circle(body_surface, (28, 30, 42), (head_center[0], head_center[1] - 6), 18, width=5)
        accent_rect = pygame.Rect(28, 46, self.width - 40, 26)
        pygame.draw.rect(body_surface, self.blueprint.accent, accent_rect, border_radius=14)
        pygame.draw.rect(body_surface, (250, 248, 244), accent_rect.inflate(-18, -10), border_radius=10)
        if self.blueprint.key == "chen_ping":
            pygame.draw.line(body_surface, self.blueprint.accent_secondary, (38, 90), (self.width - 14, self.height - 4), 8)
            pygame.draw.rect(
                body_surface,
                self.blueprint.accent,
                pygame.Rect(self.width - 36, 74, 18, 52),
                border_radius=8,
            )
        else:
            pygame.draw.arc(
                body_surface,
                self.blueprint.accent_secondary,
                pygame.Rect(18, 8, self.width - 18, 58),
                3.1,
                6.15,
                6,
            )
            pygame.draw.circle(body_surface, self.blueprint.accent, (self.width - 20, 88), 10)

        surface.blit(body_surface, (hurtbox.x - 8, hurtbox.y - 18))

        tag = fonts["tiny"].render(self.blueprint.title, True, (248, 245, 237))
        tag_shadow = fonts["tiny"].render(self.blueprint.title, True, (12, 14, 24))
        tag_rect = tag.get_rect(midbottom=(hurtbox.centerx, hurtbox.y - 10))
        surface.blit(tag_shadow, tag_rect.move(1, 2))
        surface.blit(tag, tag_rect)
