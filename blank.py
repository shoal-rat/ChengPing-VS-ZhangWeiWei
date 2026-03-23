from __future__ import annotations

import argparse
import random
import sys

import pygame

from blocks import ArenaBackdrop
from bullet import FloatingText, KillLineEvent, Projectile
from game_functions import (
    build_fonts,
    draw_campaign_over,
    draw_hud,
    draw_match_intro,
    draw_menu,
    draw_round_banner,
)
from heroes import Fighter, FighterBlueprint, MoveResult, build_blueprints, load_character_art
from setting import Settings


Vec2 = pygame.Vector2


class DebateArenaGame:
    def __init__(self, headless: bool = False, autoplay_playtest: bool = False, difficulty_index: int = 1) -> None:
        pygame.init()
        self.settings = Settings()
        flags = pygame.HIDDEN if headless else 0
        self.screen = pygame.display.set_mode(self.settings.screen_size, flags)
        pygame.display.set_caption("ChengPing VS ZhangWeiwei: Ironic Anime Meme Arena")
        self.clock = pygame.time.Clock()
        self.fonts = build_fonts(self.settings)
        self.blueprints = build_blueprints(self.settings)
        self.art = load_character_art(self.blueprints)
        self.backdrop = ArenaBackdrop(self.settings)
        self.kill_line = KillLineEvent(self.settings.floor_y)
        self.random = random.Random(42)
        self.headless = headless
        self.autoplay_playtest = autoplay_playtest

        self.selected_index = 0
        self.difficulty_index = max(0, min(2, difficulty_index))
        self.state = "menu"
        self.elapsed = 0.0
        self.banner_timer = 0.0
        self.freeze_timer = 0.0
        self.match_intro_timer = 0.0
        self.round_time = self.settings.round_time
        self.player_rounds = 0
        self.opponent_rounds = 0
        self.round_message = ""
        self.round_submessage = ""
        self.arcade_clears = 0
        self.match_index = 0
        self.total_matches = self.settings.arcade_matches
        self.current_stage = self.settings.stage_themes[0]
        self.campaign_victory = False
        self.campaign_winner: FighterBlueprint | None = None

        self.projectiles: list[Projectile] = []
        self.floating_texts: list[FloatingText] = []
        self.player: Fighter | None = None
        self.opponent: Fighter | None = None
        self.opponent_queue: list[FighterBlueprint] = []
        self.player_ai_state: dict[str, float | str] = {}
        self.opponent_ai_state: dict[str, float | str] = {}

        self.left_down = False
        self.right_down = False
        self.up_down = False
        self.down_down = False
        self.guard_down = False
        self.pending_jump_timer = 0.0

        self.ticker_index = 0
        self.ticker_timer = 4.5
        self.ticker_hold = 0.0
        self.ticker_text = self.settings.ticker_messages[0]

    def current_difficulty_profile(self) -> dict[str, object]:
        effective = min(2, self.difficulty_index + self.match_index)
        return self.settings.difficulty_profiles[effective]

    def set_ticker(self, text: str, hold: float = 2.2) -> None:
        self.ticker_text = text
        self.ticker_hold = hold
        self.ticker_timer = 5.0

    def cycle_ticker(self, dt: float) -> None:
        if self.ticker_hold > 0.0:
            self.ticker_hold = max(0.0, self.ticker_hold - dt)
            return
        self.ticker_timer -= dt
        if self.ticker_timer <= 0.0:
            self.ticker_index = (self.ticker_index + 1) % len(self.settings.ticker_messages)
            self.ticker_text = self.settings.ticker_messages[self.ticker_index]
            self.ticker_timer = 5.5

    def blueprint_by_key(self, key: str) -> FighterBlueprint:
        for blueprint in self.blueprints:
            if blueprint.key == key:
                return blueprint
        raise KeyError(key)

    def choose_arcade_queue(self, player_bp: FighterBlueprint) -> list[FighterBlueprint]:
        remaining = [bp for bp in self.blueprints if bp.key != player_bp.key]
        final_key = "lao_a_budget" if player_bp.key != "lao_a_budget" else "hu_xijin_editor"
        final_boss = self.blueprint_by_key(final_key)
        early_pool = [bp for bp in remaining if bp.key != final_boss.key]
        early = self.random.sample(early_pool, self.settings.arcade_matches - 1)
        return early + [final_boss]

    def reset_ai_state(self) -> None:
        profile = self.current_difficulty_profile()
        reaction = float(profile["reaction"])
        self.player_ai_state = {"decision_timer": reaction, "move_axis": 0.0, "guard_timer": 0.0}
        self.opponent_ai_state = {"decision_timer": reaction * 0.9, "move_axis": 0.0, "guard_timer": 0.0}

    def reset_campaign(self) -> None:
        player_bp = self.blueprints[self.selected_index]
        self.opponent_queue = self.choose_arcade_queue(player_bp)
        self.match_index = 0
        self.arcade_clears = 0
        self.campaign_winner = None
        self.campaign_victory = False
        self.start_match()

    def start_match(self) -> None:
        player_bp = self.blueprints[self.selected_index]
        opponent_bp = self.opponent_queue[self.match_index]
        self.current_stage = self.settings.stage_themes[opponent_bp.stage_theme]
        self.backdrop.set_theme(self.current_stage)
        self.player = Fighter(player_bp, self.art[player_bp.key], self.settings, 166, 1, is_player=True)
        self.opponent = Fighter(opponent_bp, self.art[opponent_bp.key], self.settings, self.settings.width - 298, -1, is_player=False)
        self.player_rounds = 0
        self.opponent_rounds = 0
        self.projectiles.clear()
        self.floating_texts.clear()
        self.kill_line.reset()
        self.reset_ai_state()
        self.state = "match_intro"
        self.match_intro_timer = self.settings.match_intro_time
        self.set_ticker(f"Entering {self.current_stage['name']}.", hold=2.0)

    def start_round(self) -> None:
        if not self.player or not self.opponent:
            return
        self.player.reset(166, 1)
        self.opponent.reset(self.settings.width - 298, -1)
        self.projectiles.clear()
        self.floating_texts.clear()
        self.kill_line.reset()
        self.pending_jump_timer = 0.0
        self.round_time = self.settings.round_time
        self.state = "round_intro"
        self.banner_timer = self.settings.intro_time
        self.round_message = f"ROUND {self.player_rounds + self.opponent_rounds + 1}"
        self.round_submessage = "Directional inputs live. Guard late and lose the pace."
        self.set_ticker(self.settings.ticker_messages[(self.match_index + self.player_rounds + self.opponent_rounds) % len(self.settings.ticker_messages)], hold=2.2)

    def current_attack_direction(self) -> str:
        if self.up_down:
            return "up"
        if self.down_down:
            return "down"
        if self.left_down and not self.right_down:
            return "left"
        if self.right_down and not self.left_down:
            return "right"
        return "neutral"

    def apply_move_result(self, fighter: Fighter, result: MoveResult | None) -> None:
        if result is None:
            return
        if result.projectiles:
            self.projectiles.extend(result.projectiles)
        self.floating_texts.append(FloatingText(result.label, fighter.center + Vec2(0, -110), result.text_color or fighter.blueprint.accent_secondary))
        self.set_ticker(f"{fighter.blueprint.display_name} used {result.label}.", hold=1.5)
        if result.force_kill_line:
            self.kill_line.force_trigger()

    def perform_player_attack(self, button: str) -> None:
        if not self.player:
            return
        direction = self.current_attack_direction()
        if direction == "up" and self.pending_jump_timer > 0.0:
            self.pending_jump_timer = 0.0
        if button == "basic":
            self.apply_move_result(self.player, self.player.attack("basic", direction))
        elif button == "skill":
            self.apply_move_result(self.player, self.player.attack("skill", direction))
        else:
            self.apply_move_result(self.player, self.player.use_ultimate())

    def finish_round(self, winner: Fighter | None, reason: str) -> None:
        if self.state in {"round_over", "campaign_over"}:
            return
        if winner is self.player:
            self.player_rounds += 1
            self.round_submessage = f"{self.player.blueprint.display_name} took the round."
            self.set_ticker(f"{self.player.blueprint.display_name} wins the round.", hold=2.4)
        elif winner is self.opponent:
            self.opponent_rounds += 1
            self.round_submessage = f"{self.opponent.blueprint.display_name} took the round."
            self.set_ticker(f"{self.opponent.blueprint.display_name} wins the round.", hold=2.4)
        else:
            self.round_submessage = "Round drawn. Both sides posted harder than they fought."
            self.set_ticker("Round draw. Resetting the discourse.", hold=2.2)
        self.round_message = reason
        self.state = "round_over"
        self.freeze_timer = self.settings.round_freeze_time

    def resolve_match_end(self) -> None:
        if self.player_rounds >= self.settings.rounds_to_win:
            self.arcade_clears += 1
            if self.match_index + 1 >= len(self.opponent_queue):
                self.campaign_victory = True
                self.campaign_winner = self.player.blueprint
                self.state = "campaign_over"
            else:
                self.match_index += 1
                self.start_match()
            return
        if self.opponent_rounds >= self.settings.rounds_to_win:
            self.campaign_victory = False
            self.campaign_winner = self.opponent.blueprint
            self.state = "campaign_over"

    def handle_menu_navigation(self, event: pygame.event.Event) -> None:
        if event.key in (pygame.K_LEFT, pygame.K_a):
            self.selected_index = (self.selected_index - 1) % len(self.blueprints)
        elif event.key in (pygame.K_RIGHT, pygame.K_d):
            self.selected_index = (self.selected_index + 1) % len(self.blueprints)
        elif event.key in (pygame.K_UP, pygame.K_w):
            self.selected_index = (self.selected_index - 3) % len(self.blueprints)
        elif event.key in (pygame.K_DOWN, pygame.K_s):
            self.selected_index = (self.selected_index + 3) % len(self.blueprints)
        elif event.key == pygame.K_1:
            self.difficulty_index = 0
        elif event.key == pygame.K_2:
            self.difficulty_index = 1
        elif event.key == pygame.K_3:
            self.difficulty_index = 2
        elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
            self.reset_campaign()

    def handle_event(self, event: pygame.event.Event) -> bool:
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                return False

            if self.state == "menu":
                self.handle_menu_navigation(event)
                return True

            if self.state == "campaign_over":
                if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                    self.state = "menu"
                return True

            if self.autoplay_playtest:
                return True

            if event.key == pygame.K_a:
                self.left_down = True
            elif event.key == pygame.K_d:
                self.right_down = True
            elif event.key == pygame.K_s:
                self.down_down = True
            elif event.key == pygame.K_SPACE:
                self.guard_down = True
                if self.player:
                    self.player.start_guard()
            elif event.key == pygame.K_w:
                self.up_down = True
                if self.state == "playing":
                    self.pending_jump_timer = 0.10

            if self.state != "playing":
                return True

            if event.key == pygame.K_j:
                self.perform_player_attack("basic")
            elif event.key == pygame.K_k:
                self.perform_player_attack("skill")
            elif event.key == pygame.K_u and self.player:
                self.apply_move_result(self.player, self.player.use_ultimate())
            elif event.key == pygame.K_l and self.player:
                if self.player.dash():
                    self.set_ticker(f"{self.player.blueprint.display_name} dashed through the take.", hold=1.1)
            return True

        if event.type == pygame.KEYUP and not self.autoplay_playtest:
            if event.key == pygame.K_a:
                self.left_down = False
            elif event.key == pygame.K_d:
                self.right_down = False
            elif event.key == pygame.K_s:
                self.down_down = False
            elif event.key == pygame.K_SPACE:
                self.guard_down = False
                if self.player:
                    self.player.stop_guard()
            elif event.key == pygame.K_w:
                self.up_down = False
                if self.pending_jump_timer > 0.0 and self.state == "playing" and self.player and self.player.jump():
                    self.pending_jump_timer = 0.0
            return True
        return True

    def incoming_projectile_near(self, owner_key: str, target: Fighter, max_distance: float = 220.0) -> bool:
        for projectile in self.projectiles:
            if projectile.owner != owner_key:
                continue
            if abs(projectile.pos.x - target.center.x) < max_distance and abs(projectile.pos.y - target.center.y) < 120:
                return True
        return False

    def update_ai_actor(self, fighter: Fighter, target: Fighter, state: dict[str, float | str], dt: float) -> None:
        profile = self.current_difficulty_profile()
        reaction = float(profile["reaction"])
        aggression = float(profile["aggression"])
        combo = float(profile["combo"])
        guard_skill = float(profile["guard"])
        anti_air = float(profile["anti_air"])

        fighter.face_target(target.center.x)
        state["decision_timer"] = float(state.get("decision_timer", reaction)) - dt
        state["guard_timer"] = max(0.0, float(state.get("guard_timer", 0.0)) - dt)
        if float(state["guard_timer"]) > 0.0:
            fighter.start_guard()
        else:
            fighter.stop_guard()

        incoming = self.incoming_projectile_near(target.blueprint.key, fighter)
        if incoming and fighter.on_ground and self.random.random() < guard_skill:
            state["guard_timer"] = reaction * 1.1
            fighter.start_guard()

        if float(state["decision_timer"]) > 0.0:
            fighter.set_move(float(state.get("move_axis", 0.0)))
            return

        state["decision_timer"] = reaction * self.random.uniform(0.85, 1.2)
        distance = target.center.x - fighter.center.x
        abs_distance = abs(distance)
        target_above = target.center.y < fighter.center.y - 32
        toward = 1.0 if distance > 0 else -1.0
        direction = "right" if distance > 0 else "left"
        state["move_axis"] = 0.0

        if self.kill_line.phase == "warning" and fighter.on_ground and self.random.random() < 0.75:
            fighter.jump()

        if fighter.meter >= self.settings.max_meter and (abs_distance < 640 or self.random.random() < aggression):
            self.apply_move_result(fighter, fighter.use_ultimate())
            return

        if target.hitstun > 0.0 and abs_distance < 220 and self.random.random() < combo:
            self.apply_move_result(fighter, fighter.attack("skill", direction))
            return

        if target_above and self.random.random() < anti_air:
            self.apply_move_result(fighter, fighter.attack("basic", "up"))
            return

        if abs_distance < 160:
            if fighter.blueprint.ai_style in {"rush", "brawler"} and self.random.random() < aggression:
                self.apply_move_result(fighter, fighter.attack("skill", direction))
            elif self.random.random() < 0.55:
                self.apply_move_result(fighter, fighter.attack("basic", "down"))
            else:
                self.apply_move_result(fighter, fighter.attack("basic", direction))
            state["move_axis"] = toward if fighter.blueprint.ai_style in {"rush", "brawler"} else -toward
            return

        if abs_distance > fighter.blueprint.preferred_range + 80:
            state["move_axis"] = toward
            if self.random.random() < aggression * 0.45:
                self.apply_move_result(fighter, fighter.attack("skill", direction))
            return

        if abs_distance < fighter.blueprint.preferred_range - 100:
            state["move_axis"] = -toward if fighter.blueprint.ai_style not in {"rush", "brawler"} else toward
            if self.random.random() < 0.42:
                self.apply_move_result(fighter, fighter.attack("basic", "left" if toward > 0 else "right"))
            return

        roll = self.random.random()
        if roll < 0.22:
            self.apply_move_result(fighter, fighter.attack("basic", "neutral"))
        elif roll < 0.42:
            self.apply_move_result(fighter, fighter.attack("skill", "neutral"))
        elif roll < 0.56:
            self.apply_move_result(fighter, fighter.attack("basic", direction))
        elif roll < 0.68:
            self.apply_move_result(fighter, fighter.attack("skill", direction))
        elif roll < 0.78:
            self.apply_move_result(fighter, fighter.attack("basic", "down"))
        elif roll < 0.86:
            self.apply_move_result(fighter, fighter.attack("skill", "left" if toward > 0 else "right"))
        elif fighter.dash_cd <= 0.0 and self.random.random() < aggression:
            fighter.dash()
        else:
            state["move_axis"] = 0.0

        if target.on_ground and self.random.random() < 0.09:
            fighter.jump()

    def update_projectiles(self, dt: float) -> None:
        if not self.player or not self.opponent:
            return
        anchors = {self.player.blueprint.key: self.player.center, self.opponent.blueprint.key: self.opponent.center}
        updated: list[Projectile] = []
        for projectile in self.projectiles:
            alive = projectile.update(dt, anchors)
            if not alive:
                continue
            if projectile.pos.x < -200 or projectile.pos.x > self.settings.width + 200:
                continue
            if projectile.pos.y < -220 or projectile.pos.y > self.settings.height + 220:
                continue

            source = self.player if projectile.owner == self.player.blueprint.key else self.opponent
            target = self.opponent if source is self.player else self.player

            if target.can_reflect() and projectile.rect.colliderect(target.hurtbox):
                projectile.owner = target.blueprint.key
                projectile.anchor_owner = target.blueprint.key
                projectile.velocity.x *= -1
                projectile.returning = False
                self.floating_texts.append(FloatingText("Reflect", target.center + Vec2(0, -92), target.blueprint.accent_secondary))
                self.set_ticker(f"{target.blueprint.display_name} reflected {projectile.label}.", hold=1.4)
                updated.append(projectile)
                continue

            if projectile.rect.colliderect(target.hurtbox):
                knock_dir = 1 if target.center.x >= source.center.x else -1
                landed, blocked = target.take_damage(projectile.damage, knock_dir, projectile.knockback_y)
                if landed:
                    source.gain_meter(projectile.damage * (0.65 if blocked else 1.0))
                    text = "BLOCK" if blocked else f"-{projectile.damage}"
                    color = target.blueprint.accent_secondary if blocked else self.settings.accent_gold
                    self.floating_texts.append(FloatingText(text, target.center + Vec2(0, -88), color))
                continue
            updated.append(projectile)
        self.projectiles = updated

    def update_kill_line(self, dt: float) -> None:
        if not self.player or not self.opponent:
            return
        if not self.kill_line.used and (
            self.player.health_ratio <= self.settings.low_health_threshold or self.opponent.health_ratio <= self.settings.low_health_threshold
        ):
            if self.kill_line.trigger():
                self.floating_texts.append(FloatingText("牢A incoming", Vec2(self.settings.width / 2, self.settings.floor_y - 118), self.settings.accent_pink))
                self.set_ticker("Low HP detected. 牢A is drawing the execution line.", hold=2.0)

        message = self.kill_line.update(dt)
        if message:
            self.set_ticker(message, hold=1.8)

        if self.kill_line.phase != "active":
            return
        band = self.kill_line.band_rect(self.settings.width)
        for fighter in (self.player, self.opponent):
            if self.kill_line.can_hit(fighter.blueprint.key) and band.colliderect(fighter.hurtbox):
                direction = -1 if fighter is self.player else 1
                landed, blocked = fighter.take_damage(self.kill_line.damage, direction, -540.0)
                if landed:
                    self.kill_line.register_hit(fighter.blueprint.key)
                    self.floating_texts.append(FloatingText("斩杀线!", fighter.center + Vec2(0, -104), self.settings.accent_pink))
                    if blocked:
                        self.floating_texts.append(FloatingText("Guarded", fighter.center + Vec2(0, -74), fighter.blueprint.accent_secondary))

    def update_floating_texts(self, dt: float) -> None:
        self.floating_texts = [text for text in self.floating_texts if text.update(dt)][-60:]

    def update_round_state(self, dt: float) -> None:
        if self.state == "match_intro":
            self.match_intro_timer -= dt
            if self.match_intro_timer <= 0.0:
                self.start_round()
            return

        if self.state == "round_intro":
            self.banner_timer -= dt
            if self.banner_timer <= 0.0:
                self.state = "playing"
            return

        if self.state == "round_over":
            self.freeze_timer -= dt
            if self.freeze_timer <= 0.0:
                if self.player_rounds >= self.settings.rounds_to_win or self.opponent_rounds >= self.settings.rounds_to_win:
                    self.resolve_match_end()
                else:
                    self.start_round()
            return

        if self.state != "playing" or not self.player or not self.opponent:
            return

        if not self.autoplay_playtest:
            axis = 0.0
            if self.left_down and not self.right_down:
                axis = -1.0
            elif self.right_down and not self.left_down:
                axis = 1.0
            self.player.set_move(axis)
            self.player.set_fast_fall(self.down_down)
            if self.guard_down:
                self.player.start_guard()
            else:
                self.player.stop_guard()

            if self.pending_jump_timer > 0.0:
                self.pending_jump_timer -= dt
                if self.pending_jump_timer <= 0.0 and self.up_down:
                    self.player.jump()
        else:
            self.update_ai_actor(self.player, self.opponent, self.player_ai_state, dt)

        self.update_ai_actor(self.opponent, self.player, self.opponent_ai_state, dt)
        self.player.face_target(self.opponent.center.x)
        self.opponent.face_target(self.player.center.x)
        self.player.update(dt, self.settings.width)
        self.opponent.update(dt, self.settings.width)
        self.update_projectiles(dt)
        self.update_kill_line(dt)
        self.update_floating_texts(dt)

        self.round_time = max(0.0, self.round_time - dt)
        if self.player.health <= 0.0 and self.opponent.health <= 0.0:
            self.finish_round(None, "DOUBLE KO")
        elif self.player.health <= 0.0:
            self.finish_round(self.opponent, "KO")
        elif self.opponent.health <= 0.0:
            self.finish_round(self.player, "KO")
        elif self.round_time <= 0.0:
            if int(self.player.health) > int(self.opponent.health):
                self.finish_round(self.player, "TIME")
            elif int(self.opponent.health) > int(self.player.health):
                self.finish_round(self.opponent, "TIME")
            else:
                self.finish_round(None, "TIME")

    def draw(self) -> None:
        pulse = self.elapsed
        self.backdrop.draw(self.screen, self.fonts, pulse)

        if self.state == "menu":
            draw_menu(self.screen, self.settings, self.fonts, self.blueprints, self.art, self.selected_index, self.difficulty_index, pulse)
        else:
            for projectile in self.projectiles:
                projectile.draw(self.screen)
            if self.player and self.opponent:
                self.player.draw(self.screen, self.fonts)
                self.opponent.draw(self.screen, self.fonts)
                self.kill_line.draw(self.screen, self.fonts, self.settings.width, pulse)
                draw_hud(
                    self.screen,
                    self.settings,
                    self.fonts,
                    self.player,
                    self.opponent,
                    self.player_rounds,
                    self.opponent_rounds,
                    self.round_time,
                    self.ticker_text,
                    self.match_index + 1,
                    self.total_matches,
                    str(self.current_difficulty_profile()["name"]),
                )
            for text in self.floating_texts:
                text.draw(self.screen, self.fonts["heading"])

            if self.state == "match_intro" and self.player and self.opponent:
                draw_match_intro(
                    self.screen,
                    self.settings,
                    self.fonts,
                    self.player.blueprint,
                    self.opponent.blueprint,
                    self.player.art,
                    self.opponent.art,
                    str(self.current_stage["name"]),
                    self.match_index + 1,
                    self.total_matches,
                    str(self.current_difficulty_profile()["name"]),
                    pulse,
                )
            elif self.state == "round_intro":
                alpha = max(0, min(230, int(230 * (self.banner_timer / self.settings.intro_time))))
                draw_round_banner(self.screen, self.settings, self.fonts, self.round_message, self.round_submessage, alpha)
            elif self.state == "round_over":
                draw_round_banner(self.screen, self.settings, self.fonts, self.round_message, self.round_submessage, 220)
            elif self.state == "campaign_over" and self.campaign_winner:
                draw_campaign_over(self.screen, self.settings, self.fonts, self.campaign_winner, self.campaign_victory, self.arcade_clears, pulse)

        pygame.display.flip()

    def run(self, max_frames: int | None = None) -> int:
        if (self.headless or self.autoplay_playtest) and self.state == "menu":
            self.selected_index = 0
            self.reset_campaign()

        frame_count = 0
        running = True
        while running:
            dt = self.clock.tick(self.settings.fps) / 1000.0
            self.elapsed += dt
            self.backdrop.update(dt)
            self.cycle_ticker(dt)

            for event in pygame.event.get():
                if not self.handle_event(event):
                    running = False
                    break
            if not running:
                break

            self.update_round_state(dt)
            self.draw()
            frame_count += 1
            if max_frames is not None and frame_count >= max_frames:
                break

        pygame.quit()
        return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Play ChengPing VS ZhangWeiwei.")
    parser.add_argument("--headless-smoke-test", action="store_true", help="Run the game without a visible window.")
    parser.add_argument("--autoplay-playtest", action="store_true", help="Let AI control both sides for a playtest run.")
    parser.add_argument("--frames", type=int, default=720, help="Frame count for headless or autoplay tests.")
    parser.add_argument("--difficulty", type=int, default=2, help="Initial difficulty: 1, 2, or 3.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    difficulty_index = max(0, min(2, args.difficulty - 1))
    game = DebateArenaGame(
        headless=args.headless_smoke_test,
        autoplay_playtest=args.autoplay_playtest,
        difficulty_index=difficulty_index,
    )
    max_frames = args.frames if (args.headless_smoke_test or args.autoplay_playtest) else None
    return game.run(max_frames=max_frames)


if __name__ == "__main__":
    raise SystemExit(main())
