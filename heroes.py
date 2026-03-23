from __future__ import annotations

from dataclasses import dataclass, field
import math
from pathlib import Path

import pygame

from bullet import Projectile
from setting import Settings


Vec2 = pygame.Vector2
DIR_ORDER = ("neutral", "up", "down", "left", "right")


@dataclass(frozen=True, slots=True)
class FighterBlueprint:
    key: str
    display_name: str
    title: str
    accent: tuple[int, int, int]
    accent_secondary: tuple[int, int, int]
    coat: tuple[int, int, int]
    basic_names: dict[str, str]
    skill_names: dict[str, str]
    ultimate_name: str
    blurb: tuple[str, ...]
    victory_line: str
    preferred_range: int
    stage_theme: int
    ai_style: str


@dataclass(slots=True)
class CharacterArt:
    card: pygame.Surface
    token: pygame.Surface
    bust: pygame.Surface
    head: pygame.Surface
    torso: pygame.Surface


@dataclass(slots=True)
class MoveResult:
    label: str
    projectiles: list[Projectile] = field(default_factory=list)
    text_color: tuple[int, int, int] | None = None
    force_kill_line: bool = False


def make_dir_map(neutral: str, up: str, down: str, left: str, right: str) -> dict[str, str]:
    return {"neutral": neutral, "up": up, "down": down, "left": left, "right": right}


def build_blueprints(settings: Settings) -> list[FighterBlueprint]:
    return [
        FighterBlueprint(
            key="chen_ping_macro",
            display_name="陈平·购买力版",
            title="Macro Card Zoner",
            accent=settings.accent_red,
            accent_secondary=settings.accent_gold,
            coat=(79, 46, 36),
            basic_names=make_dir_map("陈平不等式", "眉山抛物线", "汇率压底", "美元回旋", "购买力直拳"),
            skill_names=make_dir_map("小院别墅雨", "宏观上冲", "黑板封线", "外逃缓冲", "大棋推进"),
            ultimate_name="购买力总攻",
            blurb=(
                "Uses pricing discourse and lecture math as zoning tools.",
                "Best when the screen is busy and the opponent panics first.",
                "Strong long-range buttons, weak patience against rushdown.",
            ),
            victory_line="The spreadsheet closed before the debate did.",
            preferred_range=500,
            stage_theme=1,
            ai_style="zone",
        ),
        FighterBlueprint(
            key="chen_ping_lecture",
            display_name="陈平·讲堂版",
            title="Lecture Hall Control",
            accent=settings.accent_orange,
            accent_secondary=(244, 228, 176),
            coat=(76, 64, 39),
            basic_names=make_dir_map("黑板公式", "讲台粉笔", "GDP地平线", "讲义翻页", "课堂点名"),
            skill_names=make_dir_map("眉山论剑", "函数升空", "数据砸盘", "课堂护盾", "台前冲锋"),
            ultimate_name="折线图瀑布",
            blurb=(
                "The more lecture-hall the match feels, the stronger this form gets.",
                "Ground control, beam walls, and anti-projectile moments.",
                "Plays slower, but hits harder when reads are right.",
            ),
            victory_line="The chalkboard kept receipts for the entire set.",
            preferred_range=400,
            stage_theme=1,
            ai_style="control",
        ),
        FighterBlueprint(
            key="zhang_weiwei_civil",
            display_name="张维为·文明版",
            title="Civilizational Caster",
            accent=settings.accent_cyan,
            accent_secondary=settings.accent_blue,
            coat=(25, 46, 72),
            basic_names=make_dir_map("文明型国家", "话语升空", "叙事压制", "比较镜像", "模式前推"),
            skill_names=make_dir_map("这就是中国", "国运天幕", "东方落点", "话语权护盾", "文明冲波"),
            ultimate_name="东方升西方降",
            blurb=(
                "Controls space with discourse waves and polished panel-show timing.",
                "Midrange king, with hard reads against jump-ins and panic dashes.",
                "Feels strongest when piloted with calm, boring confidence.",
            ),
            victory_line="The stage accepted a new discourse center of gravity.",
            preferred_range=360,
            stage_theme=0,
            ai_style="caster",
        ),
        FighterBlueprint(
            key="zhang_weiwei_studio",
            display_name="张维为·演播室版",
            title="Studio Tempo Controller",
            accent=(64, 154, 240),
            accent_secondary=(167, 226, 255),
            coat=(32, 42, 86),
            basic_names=make_dir_map("比较优势", "演播灯塔", "圆桌卡点", "退一步再评", "连麦点题"),
            skill_names=make_dir_map("演播室聚光灯", "全场提问", "圆桌封路", "场外连线", "主持推进"),
            ultimate_name="全场连麦",
            blurb=(
                "Mic boomerangs and studio lights make every lane awkward.",
                "Harder to approach than the civil form, but less stable up close.",
                "Most ironic when it wins by pure stage management.",
            ),
            victory_line="The studio schedule now reserves this slot permanently.",
            preferred_range=430,
            stage_theme=0,
            ai_style="studio",
        ),
        FighterBlueprint(
            key="lao_a_execute",
            display_name="牢A·海报版",
            title="Poster Irony Trickster",
            accent=settings.accent_pink,
            accent_secondary=(255, 220, 241),
            coat=(56, 24, 46),
            basic_names=make_dir_map("外协海报", "创业咖啡", "留学主题", "福华大厦", "成人组直冲"),
            skill_names=make_dir_map("FLEA报名表", "角落麦序", "海报糊脸", "文案回车", "留学生夜袭"),
            ultimate_name="海报真身",
            blurb=(
                "Built directly from the prompt's poster image and early-event irony.",
                "Less lethal than kill-line LaoA, but much more annoying.",
                "Wins by making the arena feel like an overdesigned notice board.",
            ),
            victory_line="The poster had more initiative than the opponent.",
            preferred_range=350,
            stage_theme=5,
            ai_style="trickster",
        ),
        FighterBlueprint(
            key="lao_a_budget",
            display_name="牢A·斩杀线版",
            title="Execution-Line Rushdown",
            accent=settings.accent_purple,
            accent_secondary=settings.accent_gold,
            coat=(57, 33, 69),
            basic_names=make_dir_map("斩杀线", "飞袋上挑", "月末封底", "账单回旋", "处刑飞扑"),
            skill_names=make_dir_map("牢A降临", "Paycheck坠落", "生存压力", "处刑预告", "红温追击"),
            ultimate_name="一线清屏",
            blurb=(
                "This form exists to force mistakes and disrespect stable neutral.",
                "The kill line is both a mechanic and a mood.",
                "Rushes hardest when you think the round is already under control.",
            ),
            victory_line="The line was visible from the opening bell.",
            preferred_range=260,
            stage_theme=5,
            ai_style="rush",
        ),
        FighterBlueprint(
            key="fengge_dongbei",
            display_name="峰哥·东百版",
            title="Rant Brawler",
            accent=(194, 116, 84),
            accent_secondary=(245, 206, 120),
            coat=(85, 52, 34),
            basic_names=make_dir_map("东百锐评", "指点江山", "凑大专", "性压抑回身", "下沉重拳"),
            skill_names=make_dir_map("东百连喷", "高处俯冲", "地面锐评", "老铁回旋", "江山直推"),
            ultimate_name="直播间开闸",
            blurb=(
                "Built from 锐评 energy, downward-looking clips, and raw live-room posture.",
                "A bruiser with weird angles and very mean close-range pressure.",
                "The funniest wins are the ones that look deeply unnecessary.",
            ),
            victory_line="The live room agreed, loudly and without restraint.",
            preferred_range=300,
            stage_theme=4,
            ai_style="brawler",
        ),
        FighterBlueprint(
            key="hu_chenfeng_reviewer",
            display_name="户晨风·评测版",
            title="Tech Review Skirmisher",
            accent=settings.accent_green,
            accent_secondary=(170, 242, 197),
            coat=(34, 74, 58),
            basic_names=make_dir_map("苹果安卓相对论", "配置升空", "税单落地", "反向横评", "物流直送"),
            skill_names=make_dir_map("评测结论", "新机开箱", "价格腰斩", "返场复盘", "拍摄推进"),
            ultimate_name="全平台对轰",
            blurb=(
                "Smartphone discourse, tax-slip flexing, and review cadence become a kit.",
                "Flexible midrange fighter with solid retreat and reset tools.",
                "Most dangerous when the opponent is already tilted by comparison talk.",
            ),
            victory_line="The side-by-side comparison was not close.",
            preferred_range=390,
            stage_theme=2,
            ai_style="reviewer",
        ),
        FighterBlueprint(
            key="hu_xijin_editor",
            display_name="胡锡进·社评版",
            title="Editorial Pressure",
            accent=(224, 94, 76),
            accent_secondary=(246, 214, 156),
            coat=(76, 36, 38),
            basic_names=make_dir_map("老胡锐评", "连夜发文", "社评压底", "回旋余地", "指点江山"),
            skill_names=make_dir_map("环球社论", "热搜起飞", "A股日记", "口风微调", "话题推进"),
            ultimate_name="老胡不装了",
            blurb=(
                "Commentary cadence, stock chatter, and heat-management define this form.",
                "Balanced pressure kit with strong retreat options and constant chip threats.",
                "Wins like a headline that refuses to leave the timeline.",
            ),
            victory_line="The follow-up commentary cycle is already drafted.",
            preferred_range=420,
            stage_theme=3,
            ai_style="editor",
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
            head=pygame.image.load(processed_dir / f"{blueprint.key}_head.png").convert_alpha(),
            torso=pygame.image.load(processed_dir / f"{blueprint.key}_torso.png").convert_alpha(),
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
        self.basic_cd = 0.0
        self.skill_cd = 0.0
        self.dash_cd = 0.0
        self.hitstun = 0.0
        self.invuln = 0.0
        self.flash_timer = 0.0
        self.reflect_timer = 0.0
        self.speed_buff_timer = 0.0
        self.buff_shots = 0
        self.dash_timer = 0.0
        self.pose = "idle"
        self.pose_direction = "neutral"
        self.pose_timer = 0.0
        self.anim_clock = 0.0
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
            self.pose = "jump"
            return True
        if self.jumps_used < 2:
            self.vel.y = -self.settings.jump_speed * 0.9
            self.jumps_used += 1
            self.pose = "jump"
            return True
        return False

    def dash(self) -> bool:
        if self.dash_cd > 0.0 or self.hitstun > 0.0 or self.guard_active:
            return False
        if not self.on_ground and self.air_dashes_left <= 0:
            return False
        self.dash_cd = 0.74
        self.dash_timer = self.settings.dash_duration
        self.vel.y *= 0.26
        if not self.on_ground:
            self.air_dashes_left -= 1
        self.pose = "dash"
        self.pose_timer = 0.12
        return True

    def gain_meter(self, amount: float) -> None:
        self.meter = max(0.0, min(self.settings.max_meter, self.meter + amount))

    def take_damage(self, damage: int, knockback_direction: int, launch_y: float) -> tuple[bool, bool]:
        if self.invuln > 0.0:
            return False, False

        blocked = self.guard_active and self.guard_break_timer <= 0.0
        original_damage = damage
        if blocked:
            damage = max(1, int(round(damage * 0.42)))
            self.guard_heat = min(self.settings.max_guard_heat, self.guard_heat + original_damage * 7.5)
            self.vel.x = knockback_direction * 110.0
            self.vel.y = launch_y * 0.30
            self.hitstun = 0.05
            self.invuln = 0.08
            self.flash_timer = 0.08
            if self.guard_heat >= self.settings.max_guard_heat:
                self.guard_break_timer = 1.0
                self.guard_active = False
                self.guard_requested = False
        else:
            self.vel.x = knockback_direction * 300.0
            self.vel.y = launch_y
            self.hitstun = 0.17
            self.invuln = 0.12
            self.flash_timer = 0.14
            self.pose = "hit"
            self.pose_timer = 0.18

        self.health = max(0.0, self.health - damage)
        self.on_ground = False
        self.gain_meter(original_damage * (0.55 if blocked else 0.78))
        return True, blocked

    def can_reflect(self) -> bool:
        return self.reflect_timer > 0.0

    def _world_horizontal(self, direction: str) -> int:
        if direction == "left":
            return -1
        if direction == "right":
            return 1
        return self.facing

    def _set_pose(self, pose: str, direction: str, duration: float = 0.16) -> None:
        self.pose = pose
        self.pose_direction = direction
        self.pose_timer = duration

    def _buff_projectiles(self, projectiles: list[Projectile]) -> list[Projectile]:
        if self.speed_buff_timer <= 0.0 or self.buff_shots <= 0:
            return projectiles
        for projectile in projectiles:
            projectile.velocity *= 1.16
            projectile.damage += 2
            projectile.glow = self.blueprint.accent_secondary
        self.buff_shots -= 1
        return projectiles

    def _packet(
        self,
        label: str,
        direction: str,
        count: int,
        x_speed: float,
        y_speeds: tuple[float, ...],
        damage: int,
        shape: str,
        *,
        radius: int = 18,
        width: int = 44,
        height: int = 22,
        behavior: str = "linear",
        wave_amplitude: float = 0.0,
        wave_speed: float = 0.0,
        gravity: float = 0.0,
        floor_lock: float | None = None,
        return_delay: float = 0.0,
        life: float = 1.8,
    ) -> list[Projectile]:
        direction_x = self._world_horizontal(direction)
        origin = self.center + Vec2(direction_x * 44, -24)
        if direction == "up":
            origin += Vec2(0, -18)
        elif direction == "down":
            origin += Vec2(0, 40)
        projectiles: list[Projectile] = []
        active = y_speeds[:count]
        for index, drift in enumerate(active):
            projectiles.append(
                Projectile(
                    owner=self.blueprint.key,
                    label=label,
                    pos=origin + Vec2(0, index * 10 - (len(active) - 1) * 5),
                    velocity=Vec2(direction_x * x_speed, drift),
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
                    life=life,
                    knockback_y=-225.0 if direction != "up" else -290.0,
                )
            )
        return self._buff_projectiles(projectiles)

    def _spawn_orbit(self, label: str, shape: str = "orb", count: int = 2, damage: int = 6, duration: float = 3.8) -> list[Projectile]:
        projectiles = [
            Projectile(
                owner=self.blueprint.key,
                label=label,
                pos=self.center.copy(),
                velocity=Vec2(),
                damage=damage,
                color=self.blueprint.accent,
                glow=self.blueprint.accent_secondary,
                shape=shape,
                behavior="orbit",
                radius=16 if shape == "orb" else 18,
                width=46,
                height=24,
                life=duration,
                anchor_owner=self.blueprint.key,
                orbit_radius=80.0 + index * 20.0,
                orbit_speed=220.0 if index % 2 == 0 else -220.0,
                orbit_angle=90.0 * index,
                knockback_y=-180.0,
            )
            for index in range(count)
        ]
        return self._buff_projectiles(projectiles)

    def _spawn_rain(self, label: str, shape: str, x_points: tuple[int, ...], damage: int, color_swap: bool = False) -> list[Projectile]:
        projectiles = []
        for index, x in enumerate(x_points):
            projectiles.append(
                Projectile(
                    owner=self.blueprint.key,
                    label=label,
                    pos=Vec2(x, -40 - index * 28),
                    velocity=Vec2(0.0, 720.0 + index * 20),
                    damage=damage,
                    color=self.blueprint.accent_secondary if color_swap else self.blueprint.accent,
                    glow=self.blueprint.accent if color_swap else self.blueprint.accent_secondary,
                    shape=shape,
                    width=34 if shape == "beam" else 54,
                    height=132 if shape == "beam" else 28,
                    life=1.9,
                    knockback_y=-250.0,
                )
            )
        return self._buff_projectiles(projectiles)

    def _buff_self(self, shots: int = 2, duration: float = 1.5) -> None:
        self.speed_buff_timer = max(self.speed_buff_timer, duration)
        self.buff_shots = max(self.buff_shots, shots)

    def _up_anti_air(self, label: str, shape: str = "beam", damage: int = 10) -> list[Projectile]:
        projectiles = [
            Projectile(
                owner=self.blueprint.key,
                label=label,
                pos=self.center + Vec2(0, -52),
                velocity=Vec2(0.0, -620.0),
                damage=damage,
                color=self.blueprint.accent,
                glow=self.blueprint.accent_secondary,
                shape=shape,
                width=36 if shape == "beam" else 52,
                height=110 if shape == "beam" else 30,
                radius=18,
                life=1.2,
                knockback_y=-310.0,
            )
        ]
        return self._buff_projectiles(projectiles)

    def _ground_line(self, label: str, direction: str, shape: str = "beam", damage: int = 9, x_speed: float = 620.0) -> list[Projectile]:
        direction_x = self._world_horizontal(direction)
        projectiles = [
            Projectile(
                owner=self.blueprint.key,
                label=label,
                pos=self.center + Vec2(direction_x * 48, 58),
                velocity=Vec2(direction_x * x_speed, 0.0),
                damage=damage,
                color=self.blueprint.accent,
                glow=self.blueprint.accent_secondary,
                shape=shape,
                behavior="ground_wave",
                width=106 if shape == "beam" else 84,
                height=20 if shape == "beam" else 24,
                floor_lock=self.settings.floor_y - 52,
                wave_amplitude=8.0,
                wave_speed=10.0,
                life=1.3,
                knockback_y=-240.0,
            )
        ]
        return self._buff_projectiles(projectiles)

    def attack(self, button: str, direction: str) -> MoveResult | None:
        if button == "basic":
            return self._use_basic(direction)
        if button == "skill":
            return self._use_skill(direction)
        return None

    def _use_basic(self, direction: str) -> MoveResult | None:
        if self.basic_cd > 0.0 or self.hitstun > 0.0 or self.guard_active:
            return None
        self.basic_cd = 0.27
        label = self.blueprint.basic_names[direction]
        self._set_pose("basic", direction)
        horiz = self._world_horizontal(direction)
        projectiles: list[Projectile] = []

        if self.blueprint.key == "chen_ping_macro":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 2, 860.0, (-30.0, 30.0), 8, "card", width=52, height=24)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "card", 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 8, 680.0)
            elif direction == "left":
                self.vel.x -= 180.0
                projectiles = self._packet(label, direction, 1, 560.0, (0.0,), 8, "receipt", width=54, height=26, behavior="boomerang", return_delay=0.55, life=2.1)
            else:
                self.vel.x += horiz * 140.0
                projectiles = self._packet(label, direction, 1, 920.0, (0.0,), 10, "beam", width=88, height=16, life=0.8)

        elif self.blueprint.key == "chen_ping_lecture":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 3, 720.0, (-60.0, 0.0, 60.0), 6, "beam", width=62, height=12, life=1.25)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "beam", 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 10, 620.0)
            elif direction == "left":
                self.vel.x -= 150.0
                projectiles = self._packet(label, direction, 1, 480.0, (0.0,), 8, "card", width=58, height=28, behavior="boomerang", return_delay=0.45, life=1.8)
            else:
                self.vel.x += horiz * 130.0
                projectiles = self._packet(label, direction, 1, 760.0, (0.0,), 9, "beam", width=94, height=18, life=0.85)

        elif self.blueprint.key == "zhang_weiwei_civil":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 1, 650.0, (0.0,), 8, "orb", radius=16, behavior="wave", wave_amplitude=18.0, wave_speed=8.8, life=2.2)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "orb", 9)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 8, 560.0)
            elif direction == "left":
                self.reflect_timer = 0.45
                projectiles = self._packet(label, direction, 1, 500.0, (0.0,), 7, "orb", radius=15, behavior="boomerang", return_delay=0.55, life=2.1)
            else:
                projectiles = self._packet(label, direction, 1, 760.0, (0.0,), 10, "beam", width=84, height=16, life=0.9)

        elif self.blueprint.key == "zhang_weiwei_studio":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 1, 560.0, (0.0,), 9, "mic", width=58, height=40, behavior="boomerang", return_delay=0.44, life=2.0)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "beam", 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 8, 520.0)
            elif direction == "left":
                self.vel.x -= 120.0
                projectiles = self._packet(label, direction, 1, 420.0, (0.0,), 8, "mic", width=58, height=40, behavior="boomerang", return_delay=0.70, life=2.4)
            else:
                self.vel.x += horiz * 80.0
                projectiles = self._packet(label, direction, 1, 720.0, (0.0,), 9, "beam", width=80, height=16, life=0.9)

        elif self.blueprint.key == "lao_a_execute":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 1, 820.0, (0.0,), 9, "receipt", width=62, height=28, life=1.4)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "blade", 11)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "blade", 10, 700.0)
            elif direction == "left":
                self.vel.x -= 170.0
                projectiles = self._packet(label, direction, 1, 480.0, (0.0,), 8, "receipt", width=56, height=26, behavior="boomerang", return_delay=0.48, life=1.8)
            else:
                self.vel.x += horiz * 220.0
                projectiles = self._packet(label, direction, 1, 940.0, (-40.0,), 11, "blade", width=90, height=26, gravity=650.0, life=1.0)

        elif self.blueprint.key == "lao_a_budget":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 1, 600.0, (0.0,), 8, "receipt", width=58, height=28, behavior="boomerang", return_delay=0.58, life=2.2)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "receipt", 9)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 8, 580.0)
            elif direction == "left":
                projectiles = self._spawn_orbit(label, "receipt", count=2, damage=5, duration=2.6)
            else:
                self.vel.x += horiz * 110.0
                projectiles = self._packet(label, direction, 2, 700.0, (-40.0, 40.0), 8, "receipt", width=54, height=26, life=1.5)

        elif self.blueprint.key == "fengge_dongbei":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 1, 760.0, (0.0,), 10, "beam", width=96, height=18, life=0.9)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "beam", 11)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 9, 680.0)
            elif direction == "left":
                self.vel.x -= 160.0
                projectiles = self._packet(label, direction, 1, 520.0, (0.0,), 8, "card", width=52, height=24, behavior="boomerang", return_delay=0.46, life=1.9)
            else:
                self.vel.x += horiz * 190.0
                projectiles = self._packet(label, direction, 1, 900.0, (0.0,), 11, "blade", width=88, height=24, life=0.85)

        elif self.blueprint.key == "hu_chenfeng_reviewer":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 2, 720.0, (-30.0, 30.0), 8, "card", width=58, height=30, life=1.6)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "card", 9)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 8, 560.0)
            elif direction == "left":
                self.vel.x -= 130.0
                projectiles = self._packet(label, direction, 1, 520.0, (0.0,), 8, "card", width=58, height=30, behavior="boomerang", return_delay=0.52, life=2.0)
            else:
                projectiles = self._packet(label, direction, 1, 860.0, (0.0,), 9, "beam", width=88, height=16, life=0.9)

        else:
            if direction == "neutral":
                projectiles = self._packet(label, direction, 1, 700.0, (0.0,), 9, "beam", width=90, height=18, life=1.0)
            elif direction == "up":
                projectiles = self._up_anti_air(label, "beam", 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 8, 560.0)
            elif direction == "left":
                self.vel.x -= 120.0
                projectiles = self._packet(label, direction, 1, 520.0, (0.0,), 7, "receipt", width=54, height=26, behavior="boomerang", return_delay=0.54, life=2.0)
            else:
                self.vel.x += horiz * 120.0
                projectiles = self._packet(label, direction, 1, 820.0, (0.0,), 10, "beam", width=88, height=16, life=0.9)

        return MoveResult(label, projectiles, self.blueprint.accent_secondary)

    def _use_skill(self, direction: str) -> MoveResult | None:
        if self.skill_cd > 0.0 or self.hitstun > 0.0 or self.guard_active:
            return None
        self.skill_cd = 0.96
        label = self.blueprint.skill_names[direction]
        self._set_pose("skill", direction, 0.22)
        horiz = self._world_horizontal(direction)
        projectiles: list[Projectile] = []
        force_kill_line = False

        if self.blueprint.key == "chen_ping_macro":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 4, 700.0, (-160.0, -50.0, 50.0, 160.0), 8, "receipt", width=56, height=28, life=1.7)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "beam", (320, 540, 760, 980, 1200), 9)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 12, 780.0)
            elif direction == "left":
                self._buff_self(3, 1.8)
                self.vel.x -= 200.0
            else:
                self.vel.x += horiz * 240.0
                projectiles = self._packet(label, direction, 2, 900.0, (-50.0, 50.0), 10, "card", width=60, height=28, life=1.1)

        elif self.blueprint.key == "chen_ping_lecture":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 1, 680.0, (0.0,), 14, "beam", width=122, height=20, behavior="ground_wave", floor_lock=self.settings.floor_y - 62, wave_amplitude=8.0, wave_speed=10.0, life=1.35)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "beam", (260, 520, 780, 1040, 1300), 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 13, 820.0)
            elif direction == "left":
                self.reflect_timer = 1.1
                self.guard_heat = max(0.0, self.guard_heat - 30.0)
            else:
                self.vel.x += horiz * 190.0
                projectiles = self._packet(label, direction, 1, 780.0, (-120.0,), 12, "blade", width=94, height=26, gravity=920.0, life=1.2)

        elif self.blueprint.key == "zhang_weiwei_civil":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 3, 560.0, (-80.0, 0.0, 80.0), 7, "orb", radius=18, behavior="wave", wave_amplitude=24.0, wave_speed=8.6, life=2.3)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "orb", (320, 560, 800, 1040, 1280), 9, color_swap=True)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 10, 600.0)
            elif direction == "left":
                self.reflect_timer = 1.0
                self.guard_heat = max(0.0, self.guard_heat - 20.0)
            else:
                projectiles = self._packet(label, direction, 2, 760.0, (-20.0, 20.0), 10, "orb", radius=20, behavior="wave", wave_amplitude=12.0, wave_speed=10.0, life=1.9)

        elif self.blueprint.key == "zhang_weiwei_studio":
            if direction == "neutral":
                positions = (-160.0, 0.0, 160.0)
                projectiles = [
                    Projectile(
                        owner=self.blueprint.key,
                        label=label,
                        pos=Vec2(self.center.x + offset, 42),
                        velocity=Vec2(0.0, 740.0),
                        damage=9,
                        color=self.blueprint.accent,
                        glow=self.blueprint.accent_secondary,
                        shape="beam",
                        width=32,
                        height=128,
                        life=1.7,
                        knockback_y=-240.0,
                    )
                    for offset in positions
                ]
            elif direction == "up":
                projectiles = self._spawn_rain(label, "beam", (260, 490, 720, 950, 1180), 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 11, 540.0)
            elif direction == "left":
                projectiles = self._spawn_orbit(label, "mic", count=2, damage=7, duration=3.5)
            else:
                self.vel.x += horiz * 150.0
                projectiles = self._packet(label, direction, 2, 720.0, (-50.0, 50.0), 9, "mic", width=58, height=40, life=1.5)

        elif self.blueprint.key == "lao_a_execute":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 3, 740.0, (0.0, 0.0, 0.0), 10, "blade", width=94, height=24, behavior="ground_wave", floor_lock=self.settings.floor_y - 56, wave_amplitude=10.0, wave_speed=10.5, life=1.2)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "blade", (260, 500, 740, 980, 1220), 12)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "blade", 12, 780.0)
                force_kill_line = True
            elif direction == "left":
                self._buff_self(3, 1.6)
                self.dash_cd = 0.0
            else:
                self.vel.x += horiz * 260.0
                projectiles = self._packet(label, direction, 1, 920.0, (-260.0,), 13, "blade", width=92, height=28, gravity=1150.0, life=1.15)

        elif self.blueprint.key == "lao_a_budget":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 4, 640.0, (-180.0, -60.0, 60.0, 180.0), 7, "receipt", width=54, height=26, life=1.7)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "receipt", (300, 560, 820, 1080, 1340), 9, color_swap=True)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 11, 620.0)
            elif direction == "left":
                projectiles = self._spawn_orbit(label, "receipt", count=3, damage=6, duration=3.8)
            else:
                self.vel.x += horiz * 160.0
                projectiles = self._packet(label, direction, 2, 760.0, (-90.0, 90.0), 10, "receipt", width=58, height=28, life=1.4)

        elif self.blueprint.key == "fengge_dongbei":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 2, 760.0, (-30.0, 30.0), 10, "beam", width=110, height=18, life=1.0)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "beam", (280, 500, 720, 940, 1160), 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 12, 720.0)
            elif direction == "left":
                self._buff_self(2, 1.5)
                self.vel.x -= 180.0
            else:
                self.vel.x += horiz * 250.0
                projectiles = self._packet(label, direction, 2, 880.0, (-40.0, 40.0), 11, "blade", width=92, height=26, life=1.05)

        elif self.blueprint.key == "hu_chenfeng_reviewer":
            if direction == "neutral":
                projectiles = self._packet(label, direction, 3, 700.0, (-80.0, 0.0, 80.0), 8, "card", width=60, height=30, life=1.8)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "card", (320, 580, 840, 1100), 9)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 10, 600.0)
            elif direction == "left":
                self.reflect_timer = 0.9
                self._buff_self(2, 1.3)
            else:
                self.vel.x += horiz * 150.0
                projectiles = self._packet(label, direction, 2, 820.0, (-40.0, 40.0), 10, "card", width=62, height=32, life=1.3)

        else:
            if direction == "neutral":
                projectiles = self._packet(label, direction, 3, 690.0, (-60.0, 0.0, 60.0), 8, "receipt", width=56, height=28, life=1.8)
            elif direction == "up":
                projectiles = self._spawn_rain(label, "beam", (320, 580, 840, 1100), 10)
            elif direction == "down":
                projectiles = self._ground_line(label, direction, "beam", 10, 620.0)
            elif direction == "left":
                self.reflect_timer = 0.8
                self.vel.x -= 120.0
            else:
                self.vel.x += horiz * 160.0
                projectiles = self._packet(label, direction, 2, 800.0, (-40.0, 40.0), 10, "beam", width=88, height=16, life=1.2)

        return MoveResult(label, self._buff_projectiles(projectiles), self.blueprint.accent_secondary, force_kill_line)

    def use_ultimate(self) -> MoveResult | None:
        if self.hitstun > 0.0 or self.guard_active or self.meter < self.settings.max_meter:
            return None
        self.meter = 0.0
        label = self.blueprint.ultimate_name
        self._set_pose("ultimate", "neutral", 0.4)
        force_kill_line = False

        if self.blueprint.key in {"chen_ping_macro", "chen_ping_lecture"}:
            shape = "receipt" if self.blueprint.key == "chen_ping_macro" else "beam"
            x_points = (220, 420, 620, 820, 1020, 1220)
            projectiles = self._spawn_rain(label, shape, x_points, 12, color_swap=self.blueprint.key == "chen_ping_macro")
        elif self.blueprint.key in {"zhang_weiwei_civil", "zhang_weiwei_studio"}:
            shape = "orb" if self.blueprint.key == "zhang_weiwei_civil" else "mic"
            spread = (-220.0, -120.0, -40.0, 40.0, 120.0, 220.0)
            projectiles = self._packet(label, "neutral", 6, 600.0, spread, 10, shape, radius=22, width=60, height=40, behavior="wave" if shape == "orb" else "linear", wave_amplitude=26.0, wave_speed=10.0, life=2.4)
        elif self.blueprint.key == "lao_a_execute":
            projectiles = self._packet(label, "neutral", 4, 760.0, (0.0, 0.0, 0.0, 0.0), 13, "blade", width=96, height=26, behavior="ground_wave", floor_lock=self.settings.floor_y - 54, wave_amplitude=10.0, wave_speed=11.0, life=1.5)
            force_kill_line = True
        elif self.blueprint.key == "lao_a_budget":
            projectiles = self._spawn_orbit(label, "receipt", count=4, damage=7, duration=5.0)
        elif self.blueprint.key == "fengge_dongbei":
            projectiles = self._spawn_rain(label, "beam", (240, 430, 620, 810, 1000, 1190), 11)
        elif self.blueprint.key == "hu_chenfeng_reviewer":
            projectiles = self._packet(label, "neutral", 6, 720.0, (-160.0, -96.0, -32.0, 32.0, 96.0, 160.0), 9, "card", width=62, height=32, life=2.0)
        else:
            projectiles = self._spawn_rain(label, "beam", (260, 500, 740, 980, 1220), 11, color_swap=True)

        return MoveResult(label, projectiles, self.blueprint.accent_secondary, force_kill_line)

    def update(self, dt: float, arena_width: int) -> None:
        self.anim_clock += dt
        self.basic_cd = max(0.0, self.basic_cd - dt)
        self.skill_cd = max(0.0, self.skill_cd - dt)
        self.dash_cd = max(0.0, self.dash_cd - dt)
        self.hitstun = max(0.0, self.hitstun - dt)
        self.invuln = max(0.0, self.invuln - dt)
        self.flash_timer = max(0.0, self.flash_timer - dt)
        self.reflect_timer = max(0.0, self.reflect_timer - dt)
        self.speed_buff_timer = max(0.0, self.speed_buff_timer - dt)
        self.guard_break_timer = max(0.0, self.guard_break_timer - dt)
        self.pose_timer = max(0.0, self.pose_timer - dt)

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
                base_speed *= 1.14
            axis = 0.0 if self.hitstun > 0.0 else self.move_axis
            self.pos.x += axis * base_speed * dt

        self.pos.x += self.vel.x * dt
        self.vel.x *= 0.84
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
        self.afterimages = updated_afterimages[-8:]

        if self.pose_timer <= 0.0 and self.hitstun <= 0.0:
            if self.guard_active:
                self.pose = "guard"
            elif not self.on_ground:
                self.pose = "jump"
            elif abs(self.move_axis) > 0.1:
                self.pose = "run"
            else:
                self.pose = "idle"

    def face_target(self, target_x: float) -> None:
        if self.dash_timer <= 0.0:
            self.facing = 1 if target_x >= self.center.x else -1

    def draw(self, surface: pygame.Surface, fonts: dict[str, pygame.font.Font]) -> None:
        for rect, life in self.afterimages:
            alpha = int((life / 0.18) * 92)
            trail = self.art.bust.copy()
            trail.set_alpha(alpha)
            surface.blit(trail, trail.get_rect(midbottom=(rect.centerx, rect.bottom + 12)))

        shadow_surface = pygame.Surface((154, 48), pygame.SRCALPHA)
        pygame.draw.ellipse(shadow_surface, self.settings.shadow_color, shadow_surface.get_rect())
        surface.blit(shadow_surface, (self.pos.x - 10, self.pos.y + self.height - 16))

        hurtbox = self.hurtbox
        bob = math.sin(self.anim_clock * (6.0 if self.pose == "run" else 3.2)) * (4 if self.pose == "run" else 2)
        lean = 0.0
        if self.pose in {"run", "dash"}:
            lean = self.move_axis * 8.0 if self.pose == "run" else self.facing * 14.0
        elif self.pose == "jump":
            lean = self.vel.x * 0.015
        elif self.pose in {"basic", "skill", "ultimate"}:
            lean = {"left": -10.0, "right": 10.0, "up": -6.0, "down": 6.0}.get(self.pose_direction, self.facing * 5.0)
        elif self.pose == "hit":
            lean = -self.facing * 8.0

        body_surface = pygame.Surface((self.width + 90, self.height + 120), pygame.SRCALPHA)
        torso = pygame.transform.rotozoom(self.art.torso, -lean * 0.9, 1.0 + (0.03 if self.pose == "ultimate" else 0.0))
        head = pygame.transform.rotozoom(self.art.head, -lean * 0.55, 1.0)

        coat_color = (255, 245, 240) if self.flash_timer > 0.0 else self.blueprint.coat
        coat_rect = pygame.Rect(34, 86, self.width, self.height - 20)
        pygame.draw.rect(body_surface, (*self.blueprint.accent_secondary, 70), pygame.Rect(20, 54, self.width + 28, self.height - 2), border_radius=42)
        pygame.draw.rect(body_surface, coat_color, coat_rect, border_radius=34)
        pygame.draw.rect(body_surface, self.blueprint.accent, pygame.Rect(52, 122, self.width - 28, 26), border_radius=16)
        pygame.draw.rect(body_surface, (248, 245, 236), pygame.Rect(62, 128, self.width - 48, 10), border_radius=6)

        torso_rect = torso.get_rect(midtop=(coat_rect.centerx, 58 + int(bob)))
        head_rect = head.get_rect(midbottom=(coat_rect.centerx + int(lean * 0.2), torso_rect.top + 78))
        body_surface.blit(torso, torso_rect)
        body_surface.blit(head, head_rect)

        if self.guard_active:
            guard = pygame.Surface((self.width + 74, self.height + 72), pygame.SRCALPHA)
            pygame.draw.ellipse(guard, (*self.blueprint.accent_secondary, 64), guard.get_rect(), width=5)
            body_surface.blit(guard, (12, 36))
        if self.reflect_timer > 0.0:
            halo = pygame.Surface((self.width + 82, self.height + 86), pygame.SRCALPHA)
            pygame.draw.ellipse(halo, (*self.blueprint.accent_secondary, 76), halo.get_rect(), width=7)
            body_surface.blit(halo, (8, 30))

        if self.pose in {"basic", "skill", "ultimate"}:
            slash = pygame.Surface((120, 52), pygame.SRCALPHA)
            pygame.draw.ellipse(slash, (*self.blueprint.accent_secondary, 48), slash.get_rect())
            offset_x = 96 if self._world_horizontal(self.pose_direction) > 0 else -18
            body_surface.blit(slash, (offset_x, 100))

        surface.blit(body_surface, (hurtbox.x - 32, hurtbox.y - 70))

        tag_text = "ULT READY" if self.meter >= self.settings.max_meter else self.blueprint.title
        tag_color = self.blueprint.accent_secondary if self.meter >= self.settings.max_meter else (248, 245, 237)
        tag = fonts["tiny"].render(tag_text, True, tag_color)
        tag_shadow = fonts["tiny"].render(tag_text, True, (12, 14, 24))
        tag_rect = tag.get_rect(midbottom=(hurtbox.centerx, hurtbox.y - 16))
        surface.blit(tag_shadow, tag_rect.move(1, 2))
        surface.blit(tag, tag_rect)
