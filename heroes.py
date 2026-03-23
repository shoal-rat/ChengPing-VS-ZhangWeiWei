from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

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
    coat: tuple[int, int, int]
    basic_name: str
    special_name: str
    utility_name: str
    ultimate_name: str
    blurb: tuple[str, ...]
    victory_line: str
    preferred_range: int


@dataclass(slots=True)
class CharacterArt:
    card: pygame.Surface
    token: pygame.Surface
    bust: pygame.Surface


@dataclass(slots=True)
class MoveResult:
    label: str
    projectiles: list[Projectile] = field(default_factory=list)
    text_color: tuple[int, int, int] | None = None
    force_kill_line: bool = False


def build_blueprints(settings: Settings) -> list[FighterBlueprint]:
    return [
        FighterBlueprint(
            key="chen_ping_macro",
            display_name="陈平·购买力版",
            title="Macro Card Zoner",
            accent=settings.accent_red,
            accent_secondary=settings.accent_gold,
            coat=(79, 46, 36),
            basic_name="陈平不等式",
            special_name="购买力冲击波",
            utility_name="美元加速",
            ultimate_name="小院别墅雨",
            blurb=(
                "Turns purchasing-power memes into fast zoning cards.",
                "Utility buffs speed, then the screen fills with receipt pressure.",
                "Strong at range and at forcing panic jumps.",
            ),
            victory_line="The spreadsheet closed before the debate did.",
            preferred_range=490,
        ),
        FighterBlueprint(
            key="chen_ping_lecture",
            display_name="陈平·讲堂版",
            title="Lecture Hall Control",
            accent=settings.accent_orange,
            accent_secondary=(244, 228, 176),
            coat=(76, 64, 39),
            basic_name="黑板公式",
            special_name="眉山论剑",
            utility_name="课堂护盾",
            ultimate_name="GDP 折线图",
            blurb=(
                "Built from lecture-hall clips, formulas, and debate-floor confidence.",
                "Beam chalk shots and a sword-wave special lock down the ground.",
                "Reflective utility punishes careless projectile spam.",
            ),
            victory_line="The chalkboard kept receipts for this entire match.",
            preferred_range=400,
        ),
        FighterBlueprint(
            key="zhang_weiwei_civil",
            display_name="张维为·文明版",
            title="Civilizational Caster",
            accent=settings.accent_cyan,
            accent_secondary=settings.accent_blue,
            coat=(25, 46, 72),
            basic_name="文明型国家",
            special_name="这就是中国",
            utility_name="话语权护盾",
            ultimate_name="东方升西方降",
            blurb=(
                "Built from 'civilizational state' discourse and TV-panel certainty.",
                "Wave orbs dominate midrange while the ultimate floods the lane.",
                "Very stable neutral, especially once the shield comes online.",
            ),
            victory_line="The stage accepted a new discourse center of gravity.",
            preferred_range=360,
        ),
        FighterBlueprint(
            key="zhang_weiwei_studio",
            display_name="张维为·演播室版",
            title="Studio Tempo Controller",
            accent=(64, 154, 240),
            accent_secondary=(167, 226, 255),
            coat=(32, 42, 86),
            basic_name="比较优势",
            special_name="演播室聚光灯",
            utility_name="圆桌连麦",
            ultimate_name="全场连麦",
            blurb=(
                "Pulls from studio-shot clips, panel-show pacing, and audience control.",
                "Boomerang microphones and orbiting signals force awkward spacing.",
                "The strongest screen-control kit in the roster.",
            ),
            victory_line="The studio schedule now reserves this slot permanently.",
            preferred_range=430,
        ),
        FighterBlueprint(
            key="lao_a_execute",
            display_name="牢A·斩杀线版",
            title="Execution-Line Rushdown",
            accent=settings.accent_pink,
            accent_secondary=(255, 220, 241),
            coat=(56, 24, 46),
            basic_name="斩杀线",
            special_name="袋子飞扑",
            utility_name="处刑预告",
            ultimate_name="牢A降临",
            blurb=(
                "A meme boss kit built around execution-line pressure and chaos tempo.",
                "Ground blades and air-dive specials explode on low-HP mistakes.",
                "The ultimate forces the whole match to respect the line.",
            ),
            victory_line="The kill line was visible from the opening bell.",
            preferred_range=250,
        ),
        FighterBlueprint(
            key="lao_a_budget",
            display_name="牢A·账单版",
            title="Bill Spiral Trickster",
            accent=settings.accent_purple,
            accent_secondary=settings.accent_gold,
            coat=(57, 33, 69),
            basic_name="账单飞轮",
            special_name="月末风暴",
            utility_name="生活压力盾",
            ultimate_name="Paycheck Spiral",
            blurb=(
                "Pushes the budget-line meme into boomerangs, orbitals, and receipt storms.",
                "Trickier than the rushdown version and harder to pin down.",
                "Controls tempo by making every lane annoying.",
            ),
            victory_line="Monthly pressure compounds faster than your cooldowns.",
            preferred_range=410,
        ),
    ]


def load_character_art(blueprints: list[FighterBlueprint]) -> dict[str, CharacterArt]:
    processed_dir = Path(__file__).resolve().parent / "assets" / "processed"
    art: dict[str, CharacterArt] = {}
    for blueprint in blueprints:
        art[blueprint.key] = CharacterArt(
            card=pygame.image.load(processed_dir / f"{blueprint.key}_card.png").convert_alpha(),
            token=pygame.image.load(processed_dir / f"{blueprint.key}_token.png").convert_alpha(),
            bust=pygame.image.load(processed_dir / f"{blueprint.key}_bust.png").convert_alpha(),
        )
    return art


class Fighter:
    def __init__(
        self,
        blueprint: FighterBlueprint,
        art: CharacterArt,
        settings: Settings,
        start_x: float,
        facing: int,
        is_player: bool,
    ) -> None:
        self.blueprint = blueprint
        self.art = art
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
        self.meter = 0.0
        self.guard_heat = 0.0
        self.guard_requested = False
        self.guard_active = False
        self.guard_break_timer = 0.0
        self.on_ground = True
        self.fast_fall = False
        self.jumps_used = 0
        self.air_dashes_left = 1
        self.attack_cd = 0.0
        self.special_cd = 0.0
        self.utility_cd = 0.0
        self.dash_cd = 0.0
        self.dash_timer = 0.0
        self.hitstun = 0.0
        self.invuln = 0.0
        self.flash_timer = 0.0
        self.reflect_timer = 0.0
        self.speed_buff_timer = 0.0
        self.buff_shots = 0
        self.ai_cooldown = 0.0
        self.afterimages.clear()

    @property
    def hurtbox(self) -> pygame.Rect:
        return pygame.Rect(int(self.pos.x), int(self.pos.y), self.width, self.height)

    @property
    def center(self) -> Vec2:
        return Vec2(self.pos.x + self.width / 2, self.pos.y + self.height / 2)

    @property
    def health_ratio(self) -> float:
        return max(0.0, self.health / self.settings.max_health)

    @property
    def meter_ratio(self) -> float:
        return max(0.0, min(1.0, self.meter / self.settings.max_meter))

    @property
    def guard_ratio(self) -> float:
        return max(0.0, min(1.0, 1.0 - self.guard_heat / self.settings.max_guard_heat))

    def set_move(self, axis: float) -> None:
        self.move_axis = axis
        if abs(axis) > 0.1 and self.hitstun <= 0.0 and self.dash_timer <= 0.0:
            self.facing = 1 if axis > 0 else -1

    def set_fast_fall(self, enabled: bool) -> None:
        self.fast_fall = enabled

    def start_guard(self) -> None:
        self.guard_requested = True

    def stop_guard(self) -> None:
        self.guard_requested = False
        self.guard_active = False

    def jump(self) -> bool:
        if self.hitstun > 0.0 or self.dash_timer > 0.0:
            return False
        if self.on_ground:
            self.vel.y = -self.settings.jump_speed
            self.on_ground = False
            self.jumps_used = 1
            return True
        if self.jumps_used < 2:
            self.vel.y = -self.settings.jump_speed * 0.92
            self.jumps_used += 1
            return True
        return False

    def dash(self) -> bool:
        if self.dash_cd > 0.0 or self.hitstun > 0.0 or self.guard_active:
            return False
        if not self.on_ground and self.air_dashes_left <= 0:
            return False
        self.dash_cd = 0.82
        self.dash_timer = self.settings.dash_duration
        self.vel.y *= 0.28
        if not self.on_ground:
            self.air_dashes_left -= 1
        return True

    def gain_meter(self, amount: float) -> None:
        self.meter = max(0.0, min(self.settings.max_meter, self.meter + amount))

    def take_damage(self, damage: int, knockback_direction: int, launch_y: float) -> tuple[bool, bool]:
        if self.invuln > 0.0:
            return False, False

        blocked = self.guard_active and self.guard_break_timer <= 0.0
        original_damage = damage
        if blocked:
            damage = max(1, int(round(damage * 0.38)))
            self.guard_heat = min(self.settings.max_guard_heat, self.guard_heat + original_damage * 7.0)
            self.vel.x = knockback_direction * 110.0
            self.vel.y = launch_y * 0.35
            self.hitstun = 0.05
            self.invuln = 0.08
            self.flash_timer = 0.08
            if self.guard_heat >= self.settings.max_guard_heat:
                self.guard_break_timer = 1.0
                self.guard_active = False
                self.guard_requested = False
        else:
            self.vel.x = knockback_direction * 280.0
            self.vel.y = launch_y
            self.hitstun = 0.18
            self.invuln = 0.14
            self.flash_timer = 0.16

        self.health = max(0.0, self.health - damage)
        self.on_ground = False
        self.gain_meter(original_damage * (0.55 if blocked else 0.75))
        return True, blocked

    def can_reflect(self) -> bool:
        return self.reflect_timer > 0.0

    def _buff_projectiles(self, projectiles: list[Projectile]) -> list[Projectile]:
        if self.speed_buff_timer <= 0.0 or self.buff_shots <= 0:
            return projectiles
        for projectile in projectiles:
            projectile.velocity *= 1.18
            projectile.damage += 2
            projectile.glow = self.blueprint.accent_secondary
        self.buff_shots -= 1
        return projectiles

    def _linear_packet(
        self,
        label: str,
        direction: int,
        count: int,
        speed: float,
        damage: int,
        shape: str,
        spread: tuple[float, ...] = (0.0,),
        y_offset: float = -24.0,
        radius: int = 18,
        width: int = 44,
        height: int = 22,
        behavior: str = "linear",
        wave_amplitude: float = 0.0,
        wave_speed: float = 0.0,
        gravity: float = 0.0,
        floor_lock: float | None = None,
        return_delay: float = 0.0,
        orbit_radius: float = 0.0,
        orbit_speed: float = 0.0,
        orbit_angle: float = 0.0,
        life: float = 2.0,
    ) -> list[Projectile]:
        origin = self.center + Vec2(direction * 46, y_offset)
        projectiles: list[Projectile] = []
        active_spread = spread[:count]
        for index, drift in enumerate(active_spread):
            projectiles.append(
                Projectile(
                    owner=self.blueprint.key,
                    label=label,
                    pos=origin + Vec2(0, index * 12 - (len(active_spread) - 1) * 6),
                    velocity=Vec2(direction * speed, drift),
                    damage=damage,
                    color=self.blueprint.accent,
                    glow=self.blueprint.accent_secondary,
                    shape=shape,
                    behavior=behavior,
                    radius=radius,
                    width=width,
                    height=height,
                    wave_amplitude=wave_amplitude,
                    wave_speed=wave_speed,
                    gravity=gravity,
                    floor_lock=floor_lock,
                    return_delay=return_delay,
                    anchor_owner=self.blueprint.key,
                    orbit_radius=orbit_radius,
                    orbit_speed=orbit_speed,
                    orbit_angle=orbit_angle,
                    life=life,
                )
            )
        return self._buff_projectiles(projectiles)

    def use_basic(self) -> MoveResult | None:
        if self.attack_cd > 0.0 or self.hitstun > 0.0 or self.guard_active:
            return None
        self.attack_cd = 0.40
        direction = 1 if self.facing >= 0 else -1

        if self.blueprint.key == "chen_ping_macro":
            shots = self._linear_packet(
                self.blueprint.basic_name,
                direction,
                count=2,
                speed=840.0,
                damage=8,
                shape="card",
                spread=(-24.0, 24.0),
                width=50,
                height=24,
                life=1.7,
            )
            return MoveResult(self.blueprint.basic_name, shots, self.blueprint.accent_secondary)

        if self.blueprint.key == "chen_ping_lecture":
            shots = self._linear_packet(
                self.blueprint.basic_name,
                direction,
                count=3,
                speed=700.0,
                damage=6,
                shape="beam",
                spread=(-60.0, 0.0, 60.0),
                width=58,
                height=12,
                life=1.3,
            )
            return MoveResult(self.blueprint.basic_name, shots, self.blueprint.accent_secondary)

        if self.blueprint.key == "zhang_weiwei_civil":
            shots = self._linear_packet(
                self.blueprint.basic_name,
                direction,
                count=1,
                speed=625.0,
                damage=8,
                shape="orb",
                spread=(0.0,),
                radius=16,
                behavior="wave",
                wave_amplitude=18.0,
                wave_speed=9.0,
                life=2.1,
            )
            return MoveResult(self.blueprint.basic_name, shots, self.blueprint.accent_secondary)

        if self.blueprint.key == "zhang_weiwei_studio":
            shots = self._linear_packet(
                self.blueprint.basic_name,
                direction,
                count=1,
                speed=540.0,
                damage=10,
                shape="mic",
                spread=(0.0,),
                width=56,
                height=40,
                behavior="boomerang",
                return_delay=0.46,
                life=2.2,
            )
            return MoveResult(self.blueprint.basic_name, shots, self.blueprint.accent_secondary)

        if self.blueprint.key == "lao_a_execute":
            shots = self._linear_packet(
                self.blueprint.basic_name,
                direction,
                count=1,
                speed=760.0,
                damage=9,
                shape="blade",
                spread=(0.0,),
                width=82,
                height=24,
                behavior="ground_wave",
                wave_amplitude=10.0,
                wave_speed=10.0,
                floor_lock=self.settings.floor_y - 56,
                life=1.25,
            )
            return MoveResult(self.blueprint.basic_name, shots, self.blueprint.accent_secondary)

        shots = self._linear_packet(
            self.blueprint.basic_name,
            direction,
            count=1,
            speed=560.0,
            damage=9,
            shape="receipt",
            spread=(0.0,),
            width=52,
            height=26,
            behavior="boomerang",
            return_delay=0.54,
            life=2.3,
        )
        return MoveResult(self.blueprint.basic_name, shots, self.blueprint.accent_secondary)

    def use_special(self) -> MoveResult | None:
        if self.special_cd > 0.0 or self.hitstun > 0.0 or self.guard_active:
            return None
        self.special_cd = 2.35
        direction = 1 if self.facing >= 0 else -1

        if self.blueprint.key == "chen_ping_macro":
            shots = self._linear_packet(
                self.blueprint.special_name,
                direction,
                count=3,
                speed=720.0,
                damage=8,
                shape="receipt",
                spread=(-145.0, 0.0, 145.0),
                width=56,
                height=28,
                life=1.8,
            )
            return MoveResult(self.blueprint.special_name, shots, self.blueprint.accent_secondary)

        if self.blueprint.key == "chen_ping_lecture":
            shots = self._linear_packet(
                self.blueprint.special_name,
                direction,
                count=1,
                speed=640.0,
                damage=14,
                shape="beam",
                spread=(0.0,),
                width=116,
                height=20,
                behavior="ground_wave",
                wave_amplitude=8.0,
                wave_speed=9.0,
                floor_lock=self.settings.floor_y - 64,
                life=1.35,
            )
            return MoveResult(self.blueprint.special_name, shots, self.blueprint.accent_secondary)

        if self.blueprint.key == "zhang_weiwei_civil":
            shots = self._linear_packet(
                self.blueprint.special_name,
                direction,
                count=3,
                speed=560.0,
                damage=7,
                shape="orb",
                spread=(-80.0, 0.0, 80.0),
                radius=18,
                behavior="wave",
                wave_amplitude=24.0,
                wave_speed=8.6,
                life=2.3,
            )
            return MoveResult(self.blueprint.special_name, shots, self.blueprint.accent_secondary)

        if self.blueprint.key == "zhang_weiwei_studio":
            positions = (-140.0, 0.0, 140.0)
            origin_x = self.center.x + direction * 220
            projectiles = [
                Projectile(
                    owner=self.blueprint.key,
                    label=self.blueprint.special_name,
                    pos=Vec2(origin_x + offset, 40),
                    velocity=Vec2(direction * 55.0, 720.0),
                    damage=9,
                    color=self.blueprint.accent,
                    glow=self.blueprint.accent_secondary,
                    shape="beam",
                    width=30,
                    height=126,
                    life=1.6,
                    knockback_y=-230.0,
                )
                for offset in positions
            ]
            return MoveResult(self.blueprint.special_name, self._buff_projectiles(projectiles), self.blueprint.accent_secondary)

        if self.blueprint.key == "lao_a_execute":
            shots = self._linear_packet(
                self.blueprint.special_name,
                direction,
                count=1,
                speed=470.0,
                damage=12,
                shape="blade",
                spread=(-360.0,),
                width=74,
                height=34,
                gravity=980.0,
                life=1.6,
            )
            return MoveResult(self.blueprint.special_name, shots, self.blueprint.accent_secondary)

        shots = self._linear_packet(
            self.blueprint.special_name,
            direction,
            count=4,
            speed=620.0,
            damage=7,
            shape="receipt",
            spread=(-180.0, -70.0, 70.0, 180.0),
            width=52,
            height=26,
            life=1.8,
        )
        return MoveResult(self.blueprint.special_name, shots, self.blueprint.accent_secondary)

    def use_utility(self) -> MoveResult | None:
        if self.utility_cd > 0.0 or self.hitstun > 0.0:
            return None
        self.utility_cd = 4.3

        if self.blueprint.key == "chen_ping_macro":
            self.speed_buff_timer = 1.8
            self.buff_shots = max(self.buff_shots, 2)
            return MoveResult(self.blueprint.utility_name, text_color=self.blueprint.accent_secondary)

        if self.blueprint.key in {"chen_ping_lecture", "zhang_weiwei_civil"}:
            self.reflect_timer = 1.15 if self.blueprint.key == "chen_ping_lecture" else 1.25
            self.guard_heat = max(0.0, self.guard_heat - 28.0)
            return MoveResult(self.blueprint.utility_name, text_color=self.blueprint.accent_secondary)

        if self.blueprint.key == "zhang_weiwei_studio":
            satellites = [
                Projectile(
                    owner=self.blueprint.key,
                    label=self.blueprint.utility_name,
                    pos=self.center.copy(),
                    velocity=Vec2(),
                    damage=7,
                    color=self.blueprint.accent,
                    glow=self.blueprint.accent_secondary,
                    shape="orb",
                    behavior="orbit",
                    radius=16,
                    life=4.1,
                    anchor_owner=self.blueprint.key,
                    orbit_radius=76.0 if index == 0 else 106.0,
                    orbit_speed=260.0 * (1 if index == 0 else -1),
                    orbit_angle=0.0 if index == 0 else 180.0,
                    knockback_y=-180.0,
                )
                for index in range(2)
            ]
            return MoveResult(self.blueprint.utility_name, satellites, self.blueprint.accent_secondary)

        if self.blueprint.key == "lao_a_execute":
            self.speed_buff_timer = 1.55
            self.buff_shots = max(self.buff_shots, 2)
            self.dash_cd = 0.0
            return MoveResult(self.blueprint.utility_name, text_color=self.blueprint.accent_secondary)

        satellites = [
            Projectile(
                owner=self.blueprint.key,
                label=self.blueprint.utility_name,
                pos=self.center.copy(),
                velocity=Vec2(),
                damage=6,
                color=self.blueprint.accent,
                glow=self.blueprint.accent_secondary,
                shape="receipt",
                behavior="orbit",
                width=46,
                height=24,
                life=4.2,
                anchor_owner=self.blueprint.key,
                orbit_radius=84.0 + index * 16.0,
                orbit_speed=220.0 if index % 2 == 0 else -220.0,
                orbit_angle=120.0 * index,
                knockback_y=-150.0,
            )
            for index in range(3)
        ]
        return MoveResult(self.blueprint.utility_name, satellites, self.blueprint.accent_secondary)

    def use_ultimate(self) -> MoveResult | None:
        if self.hitstun > 0.0 or self.guard_active or self.meter < self.settings.max_meter:
            return None
        self.meter = 0.0
        direction = 1 if self.facing >= 0 else -1

        if self.blueprint.key == "chen_ping_macro":
            x_points = (180, 350, 520, 700, 880, 1060, 1240)
            rain = [
                Projectile(
                    owner=self.blueprint.key,
                    label=self.blueprint.ultimate_name,
                    pos=Vec2(x, -40 - index * 24),
                    velocity=Vec2(direction * 40.0, 720.0 + index * 18),
                    damage=12,
                    color=self.blueprint.accent_secondary,
                    glow=self.blueprint.accent,
                    shape="receipt",
                    width=54,
                    height=28,
                    life=1.8,
                    knockback_y=-250.0,
                )
                for index, x in enumerate(x_points)
            ]
            return MoveResult(self.blueprint.ultimate_name, rain, self.blueprint.accent_secondary)

        if self.blueprint.key == "chen_ping_lecture":
            x_points = (220, 430, 640, 850, 1060, 1270)
            bars = [
                Projectile(
                    owner=self.blueprint.key,
                    label=self.blueprint.ultimate_name,
                    pos=Vec2(x, -80 - index * 20),
                    velocity=Vec2(0.0, 760.0),
                    damage=11,
                    color=self.blueprint.accent,
                    glow=self.blueprint.accent_secondary,
                    shape="beam",
                    width=34,
                    height=132,
                    life=1.7,
                    knockback_y=-260.0,
                )
                for index, x in enumerate(x_points)
            ]
            return MoveResult(self.blueprint.ultimate_name, bars, self.blueprint.accent_secondary)

        if self.blueprint.key == "zhang_weiwei_civil":
            orbs = self._linear_packet(
                self.blueprint.ultimate_name,
                direction,
                count=5,
                speed=520.0,
                damage=10,
                shape="orb",
                spread=(-110.0, -55.0, 0.0, 55.0, 110.0),
                radius=22,
                behavior="wave",
                wave_amplitude=30.0,
                wave_speed=9.0,
                life=2.5,
            )
            return MoveResult(self.blueprint.ultimate_name, orbs, self.blueprint.accent_secondary)

        if self.blueprint.key == "zhang_weiwei_studio":
            burst = self._linear_packet(
                self.blueprint.ultimate_name,
                direction,
                count=6,
                speed=600.0,
                damage=9,
                shape="mic",
                spread=(-220.0, -120.0, -40.0, 40.0, 120.0, 220.0),
                width=56,
                height=40,
                life=2.2,
            )
            return MoveResult(self.blueprint.ultimate_name, burst, self.blueprint.accent_secondary)

        if self.blueprint.key == "lao_a_execute":
            waves = [
                Projectile(
                    owner=self.blueprint.key,
                    label=self.blueprint.ultimate_name,
                    pos=self.center + Vec2(direction * (40 + index * 34), 48),
                    velocity=Vec2(direction * (720.0 + index * 55), 0.0),
                    damage=12,
                    color=self.blueprint.accent,
                    glow=self.blueprint.accent_secondary,
                    shape="blade",
                    behavior="ground_wave",
                    width=92,
                    height=24,
                    floor_lock=self.settings.floor_y - 56,
                    wave_amplitude=10.0,
                    wave_speed=10.5,
                    life=1.2 + index * 0.12,
                    knockback_y=-280.0,
                )
                for index in range(3)
            ]
            return MoveResult(self.blueprint.ultimate_name, waves, self.blueprint.accent_secondary, force_kill_line=True)

        spiral = [
            Projectile(
                owner=self.blueprint.key,
                label=self.blueprint.ultimate_name,
                pos=self.center + Vec2(direction * 40, -28),
                velocity=Vec2(direction * 440.0, 0.0),
                damage=16,
                color=self.blueprint.accent,
                glow=self.blueprint.accent_secondary,
                shape="orb",
                behavior="wave",
                radius=30,
                wave_amplitude=32.0,
                wave_speed=12.0,
                life=2.9,
                knockback_y=-290.0,
            )
        ]
        return MoveResult(self.blueprint.ultimate_name, spiral, self.blueprint.accent_secondary)

    def update(self, dt: float, arena_width: int) -> None:
        self.attack_cd = max(0.0, self.attack_cd - dt)
        self.special_cd = max(0.0, self.special_cd - dt)
        self.utility_cd = max(0.0, self.utility_cd - dt)
        self.dash_cd = max(0.0, self.dash_cd - dt)
        self.hitstun = max(0.0, self.hitstun - dt)
        self.invuln = max(0.0, self.invuln - dt)
        self.flash_timer = max(0.0, self.flash_timer - dt)
        self.reflect_timer = max(0.0, self.reflect_timer - dt)
        self.speed_buff_timer = max(0.0, self.speed_buff_timer - dt)
        self.guard_break_timer = max(0.0, self.guard_break_timer - dt)

        self.guard_active = (
            self.guard_requested
            and self.guard_break_timer <= 0.0
            and self.hitstun <= 0.0
            and self.dash_timer <= 0.0
            and self.on_ground
        )

        if not self.guard_active:
            self.guard_heat = max(0.0, self.guard_heat - self.settings.guard_cool_rate * dt)

        if self.dash_timer > 0.0:
            self.dash_timer = max(0.0, self.dash_timer - dt)
            self.pos.x += self.facing * self.settings.dash_speed * dt
            self.afterimages.append((self.hurtbox.copy(), 0.18))
        else:
            base_speed = self.settings.guard_speed if self.guard_active else (self.settings.move_speed if self.on_ground else self.settings.air_speed)
            if self.speed_buff_timer > 0.0:
                base_speed *= 1.16
            axis = 0.0 if self.hitstun > 0.0 else self.move_axis
            self.pos.x += axis * base_speed * dt

        self.pos.x += self.vel.x * dt
        self.vel.x *= 0.83
        if abs(self.vel.x) < 18.0:
            self.vel.x = 0.0

        gravity = self.settings.gravity * (1.5 if self.fast_fall and not self.on_ground and self.vel.y > 0 else 1.0)
        self.vel.y += gravity * dt
        self.pos.y += self.vel.y * dt

        ground_y = self.settings.floor_y - self.height
        if self.pos.y >= ground_y:
            self.pos.y = ground_y
            self.vel.y = 0.0
            if not self.on_ground:
                self.air_dashes_left = 1
                self.jumps_used = 0
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
        self.afterimages = updated_afterimages[-7:]

    def face_target(self, target_x: float) -> None:
        if self.dash_timer <= 0.0:
            self.facing = 1 if target_x >= self.center.x else -1

    def draw(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font]) -> None:
        for rect, life in self.afterimages:
            alpha = int((life / 0.18) * 90)
            trail = self.art.bust.copy()
            trail.set_alpha(alpha)
            surface.blit(trail, trail.get_rect(midbottom=(rect.centerx, rect.bottom + 4)))

        shadow_surface = pygame.Surface((138, 46), pygame.SRCALPHA)
        pygame.draw.ellipse(shadow_surface, self.settings.shadow_color, shadow_surface.get_rect())
        surface.blit(shadow_surface, (self.pos.x - 8, self.pos.y + self.height - 16))

        hurtbox = self.hurtbox
        body_surface = pygame.Surface((self.width + 36, self.height + 44), pygame.SRCALPHA)
        body_rect = pygame.Rect(18, 52, self.width, self.height - 28)
        coat_color = (255, 245, 240) if self.flash_timer > 0.0 else self.blueprint.coat
        pygame.draw.rect(body_surface, (*self.blueprint.accent_secondary, 76), pygame.Rect(10, 22, self.width + 16, self.height - 8), border_radius=36)
        pygame.draw.rect(body_surface, coat_color, body_rect, border_radius=30)
        pygame.draw.rect(body_surface, self.blueprint.accent, pygame.Rect(34, 86, self.width - 32, 24), border_radius=14)
        pygame.draw.rect(body_surface, (248, 245, 236), pygame.Rect(42, 90, self.width - 48, 10), border_radius=6)
        pygame.draw.rect(body_surface, (20, 23, 37), pygame.Rect(32, self.height + 2, self.width - 8, 18), border_radius=10)
        bust_rect = self.art.bust.get_rect(midbottom=(body_rect.centerx, body_rect.y + 56))
        body_surface.blit(self.art.bust, bust_rect)

        if self.guard_active:
            guard = pygame.Surface((self.width + 56, self.height + 56), pygame.SRCALPHA)
            pygame.draw.ellipse(guard, (*self.blueprint.accent_secondary, 62), guard.get_rect(), width=5)
            body_surface.blit(guard, (-10, 8))
        if self.reflect_timer > 0.0:
            halo = pygame.Surface((self.width + 64, self.height + 64), pygame.SRCALPHA)
            pygame.draw.ellipse(halo, (*self.blueprint.accent_secondary, 72), halo.get_rect(), width=8)
            body_surface.blit(halo, (-14, 4))

        surface.blit(body_surface, (hurtbox.x - 18, hurtbox.y - 40))

        if self.meter >= self.settings.max_meter:
            ready = fonts["tiny"].render("ULT READY", True, self.blueprint.accent_secondary)
            ready_shadow = fonts["tiny"].render("ULT READY", True, (11, 14, 23))
            ready_rect = ready.get_rect(midbottom=(hurtbox.centerx, hurtbox.y - 14))
            surface.blit(ready_shadow, ready_rect.move(1, 2))
            surface.blit(ready, ready_rect)
        else:
            tag = fonts["tiny"].render(self.blueprint.title, True, (248, 245, 237))
            tag_shadow = fonts["tiny"].render(self.blueprint.title, True, (12, 14, 24))
            tag_rect = tag.get_rect(midbottom=(hurtbox.centerx, hurtbox.y - 14))
            surface.blit(tag_shadow, tag_rect.move(1, 2))
            surface.blit(tag, tag_rect)
