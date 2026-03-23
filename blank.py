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
    def __init__(self, headless: bool = False) -> None:
        pygame.init()
        self.settings = Settings()
        flags = pygame.HIDDEN if headless else 0
        self.screen = pygame.display.set_mode(self.settings.screen_size, flags)
        pygame.display.set_caption("ChengPing VS ZhangWeiwei: Meme Debate Arena")
        self.clock = pygame.time.Clock()
        self.fonts = build_fonts(self.settings)
        self.blueprints = build_blueprints(self.settings)
        self.art = load_character_art(self.blueprints)
        self.backdrop = ArenaBackdrop(self.settings)
        self.kill_line = KillLineEvent(self.settings.floor_y)
        self.random = random.Random(42)
        self.headless = headless

        self.selected_index = 0
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

        self.left_down = False
        self.right_down = False
        self.down_down = False
        self.guard_down = False
        self.ticker_index = 0
        self.ticker_timer = 4.5
        self.ticker_hold = 0.0
        self.ticker_text = self.settings.ticker_messages[0]

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
            self.ticker_timer = 5.6

    def blueprint_by_key(self, key: str) -> FighterBlueprint:
        for blueprint in self.blueprints:
            if blueprint.key == key:
                return blueprint
        raise KeyError(key)

    def choose_arcade_queue(self, player_bp: FighterBlueprint) -> list[FighterBlueprint]:
        remaining = [bp for bp in self.blueprints if bp.key != player_bp.key]
        boss_key = "lao_a_execute" if player_bp.key != "lao_a_execute" else "zhang_weiwei_civil"
        boss = self.blueprint_by_key(boss_key)
        early_pool = [bp for bp in remaining if bp.key != boss.key]
        early = self.random.sample(early_pool, self.settings.arcade_matches - 1)
        return early + [boss]

    def stage_for_opponent(self, opponent_bp: FighterBlueprint) -> dict[str, object]:
        if opponent_bp.key.startswith("chen_ping"):
            return self.settings.stage_themes[1]
        if opponent_bp.key.startswith("zhang_weiwei"):
            return self.settings.stage_themes[0]
        return self.settings.stage_themes[3]

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
        self.current_stage = self.stage_for_opponent(opponent_bp)
        self.backdrop.set_theme(self.current_stage)
        self.player = Fighter(player_bp, self.art[player_bp.key], self.settings, 166, 1, is_player=True)
        self.opponent = Fighter(opponent_bp, self.art[opponent_bp.key], self.settings, self.settings.width - 290, -1, is_player=False)
        self.player_rounds = 0
        self.opponent_rounds = 0
        self.projectiles.clear()
        self.floating_texts.clear()
        self.kill_line.reset()
        self.state = "match_intro"
        self.match_intro_timer = self.settings.match_intro_time
        self.set_ticker(f"Entering {self.current_stage['name']}.", hold=2.2)

    def start_round(self) -> None:
        if not self.player or not self.opponent:
            return
        self.player.reset(166, 1)
        self.opponent.reset(self.settings.width - 290, -1)
        self.projectiles.clear()
        self.floating_texts.clear()
        self.kill_line.reset()
        self.round_time = self.settings.round_time
        self.state = "round_intro"
        self.banner_timer = self.settings.intro_time
        round_number = self.player_rounds + self.opponent_rounds + 1
        self.round_message = f"ROUND {round_number}"
        self.round_submessage = "Memes loaded. Guard up."
        self.set_ticker(self.settings.ticker_messages[(self.match_index + round_number - 1) % len(self.settings.ticker_messages)], hold=2.4)

    def apply_move_result(self, fighter: Fighter, result: MoveResult | None) -> None:
        if result is None:
            return
        if result.projectiles:
            self.projectiles.extend(result.projectiles)
        color = result.text_color or fighter.blueprint.accent_secondary
        self.floating_texts.append(FloatingText(result.label, fighter.center + Vec2(0, -112), color))
        self.set_ticker(f"{fighter.blueprint.display_name} used {result.label}.", hold=1.7)
        if result.force_kill_line:
            self.kill_line.force_trigger()

    def finish_round(self, winner: Fighter | None, reason: str) -> None:
        if self.state in {"round_over", "campaign_over"}:
            return

        if winner is self.player:
            self.player_rounds += 1
            self.round_submessage = f"{self.player.blueprint.display_name} took the round."
            self.set_ticker(f"{self.player.blueprint.display_name} wins the round.", hold=3.0)
        elif winner is self.opponent:
            self.opponent_rounds += 1
            self.round_submessage = f"{self.opponent.blueprint.display_name} took the round."
            self.set_ticker(f"{self.opponent.blueprint.display_name} wins the round.", hold=3.0)
        else:
            self.round_submessage = "Round drawn. Both sides flooded the timeline."
            self.set_ticker("Round draw. Resetting the stage.", hold=3.0)

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

            if self.state != "playing" or not self.player:
                return True

            if event.key == pygame.K_w:
                if self.player.jump():
                    self.set_ticker(f"{self.player.blueprint.display_name} jumped the timeline.")
            elif event.key == pygame.K_j:
                self.apply_move_result(self.player, self.player.use_basic())
            elif event.key == pygame.K_k:
                self.apply_move_result(self.player, self.player.use_special())
            elif event.key == pygame.K_i:
                self.apply_move_result(self.player, self.player.use_utility())
            elif event.key == pygame.K_u:
                self.apply_move_result(self.player, self.player.use_ultimate())
            elif event.key == pygame.K_l:
                if self.player.dash():
                    self.set_ticker(f"{self.player.blueprint.display_name} dashed through the hot take.")
            return True

        if event.type == pygame.KEYUP:
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
        return True

    def incoming_projectile_near(self, owner_key: str, target: Fighter, max_distance: float = 220.0) -> bool:
        for projectile in self.projectiles:
            if projectile.owner != owner_key:
                continue
            if abs(projectile.pos.x - target.center.x) < max_distance and abs(projectile.pos.y - target.center.y) < 120:
                return True
        return False

    def update_ai(self, dt: float) -> None:
        if self.state != "playing" or not self.player or not self.opponent:
            return

        bot = self.opponent
        target = self.player
        bot.ai_cooldown = max(0.0, bot.ai_cooldown - dt)
        bot.face_target(target.center.x)

        distance = target.center.x - bot.center.x
        abs_distance = abs(distance)

        if self.kill_line.phase == "warning" and bot.on_ground:
            bot.jump()
            bot.ai_cooldown = 0.2

        incoming = self.incoming_projectile_near(self.player.blueprint.key, bot)
        if incoming and bot.guard_break_timer <= 0.0 and bot.on_ground:
            bot.start_guard()
        else:
            bot.stop_guard()

        axis = 0.0
        rush = bot.blueprint.key.startswith("lao_a_execute")
        if abs_distance > bot.blueprint.preferred_range + 50:
            axis = 1.0 if distance > 0 else -1.0
        elif abs_distance < (160 if rush else 210):
            axis = 1.0 if (rush and distance > 0) else (-1.0 if distance > 0 else 1.0)
            if rush:
                axis = 1.0 if distance > 0 else -1.0
        bot.set_move(axis)
        bot.set_fast_fall(False)

        if bot.ai_cooldown > 0.0:
            return

        if bot.meter >= self.settings.max_meter and (abs_distance < 620 or rush):
            self.apply_move_result(bot, bot.use_ultimate())
            bot.ai_cooldown = 0.85
            return

        if bot.utility_cd <= 0.0 and self.random.random() < 0.22:
            self.apply_move_result(bot, bot.use_utility())
            bot.ai_cooldown = 0.45
            return

        if abs_distance < 560 and bot.special_cd <= 0.0 and self.random.random() < 0.56:
            self.apply_move_result(bot, bot.use_special())
            bot.ai_cooldown = 0.55
            return

        if abs_distance < 760 and bot.attack_cd <= 0.0:
            self.apply_move_result(bot, bot.use_basic())
            bot.ai_cooldown = 0.32
            return

        if abs_distance < 220 and bot.dash_cd <= 0.0 and self.random.random() < 0.35:
            if bot.dash():
                self.set_ticker(f"{bot.blueprint.display_name} changed the angle with a dash.")
            bot.ai_cooldown = 0.25
            return

        if target.on_ground and self.random.random() < 0.10:
            bot.jump()
            bot.ai_cooldown = 0.18

    def update_projectiles(self, dt: float) -> None:
        if not self.player or not self.opponent:
            return

        anchors = {
            self.player.blueprint.key: self.player.center,
            self.opponent.blueprint.key: self.opponent.center,
        }

        updated: list[Projectile] = []
        for projectile in self.projectiles:
            alive = projectile.update(dt, anchors)
            if not alive:
                continue
            if projectile.pos.x < -180 or projectile.pos.x > self.settings.width + 180:
                continue
            if projectile.pos.y < -200 or projectile.pos.y > self.settings.height + 200:
                continue

            source = self.player if projectile.owner == self.player.blueprint.key else self.opponent
            target = self.opponent if source is self.player else self.player

            if target.can_reflect():
                if projectile.rect.colliderect(target.hurtbox):
                    projectile.owner = target.blueprint.key
                    projectile.anchor_owner = target.blueprint.key
                    projectile.velocity.x *= -1
                    projectile.returning = False
                    self.floating_texts.append(FloatingText("Reflect", target.center + Vec2(0, -92), target.blueprint.accent_secondary))
                    self.set_ticker(f"{target.blueprint.display_name} reflected {projectile.label}.", hold=1.6)
                    updated.append(projectile)
                    continue

            if projectile.rect.colliderect(target.hurtbox):
                knock_dir = 1 if target.center.x >= source.center.x else -1
                landed, blocked = target.take_damage(projectile.damage, knock_dir, projectile.knockback_y)
                if landed:
                    source.gain_meter(projectile.damage * (0.65 if blocked else 1.05))
                    text = "BLOCK" if blocked else f"-{projectile.damage}"
                    color = target.blueprint.accent_secondary if blocked else self.settings.accent_gold
                    self.floating_texts.append(FloatingText(text, target.center + Vec2(0, -88), color))
                    self.set_ticker(f"{projectile.label} hits {target.blueprint.display_name}.", hold=1.4)
                continue
            updated.append(projectile)
        self.projectiles = updated

    def update_kill_line(self, dt: float) -> None:
        if not self.player or not self.opponent:
            return

        if not self.kill_line.used and (
            self.player.health_ratio <= self.settings.low_health_threshold
            or self.opponent.health_ratio <= self.settings.low_health_threshold
        ):
            if self.kill_line.trigger():
                self.floating_texts.append(
                    FloatingText("牢A incoming", Vec2(self.settings.width / 2, self.settings.floor_y - 118), self.settings.accent_pink)
                )
                self.set_ticker("Low HP detected. 牢A is drawing the execution line.", hold=2.3)

        message = self.kill_line.update(dt)
        if message:
            self.set_ticker(message, hold=1.9)

        if self.kill_line.phase != "active":
            return

        band = self.kill_line.band_rect(self.settings.width)
        for fighter in (self.player, self.opponent):
            if self.kill_line.can_hit(fighter.blueprint.key) and band.colliderect(fighter.hurtbox):
                direction = -1 if fighter is self.player else 1
                hit, blocked = fighter.take_damage(self.kill_line.damage, direction, -540.0)
                if hit:
                    self.kill_line.register_hit(fighter.blueprint.key)
                    self.floating_texts.append(FloatingText("斩杀线!", fighter.center + Vec2(0, -106), self.settings.accent_pink))
                    if blocked:
                        self.floating_texts.append(FloatingText("Guarded", fighter.center + Vec2(0, -76), fighter.blueprint.accent_secondary))
                    self.set_ticker(f"牢A clipped {fighter.blueprint.display_name} at the kill line.", hold=2.0)

    def update_floating_texts(self, dt: float) -> None:
        self.floating_texts = [text for text in self.floating_texts if text.update(dt)][-52:]

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

        self.update_ai(dt)
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
            draw_menu(self.screen, self.settings, self.fonts, self.blueprints, self.art, self.selected_index, pulse)
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
                    pulse,
                )
            elif self.state == "round_intro":
                alpha = max(0, min(230, int(230 * (self.banner_timer / self.settings.intro_time))))
                draw_round_banner(self.screen, self.settings, self.fonts, self.round_message, self.round_submessage, alpha)
            elif self.state == "round_over":
                draw_round_banner(self.screen, self.settings, self.fonts, self.round_message, self.round_submessage, 220)
            elif self.state == "campaign_over" and self.campaign_winner:
                draw_campaign_over(
                    self.screen,
                    self.settings,
                    self.fonts,
                    self.campaign_winner,
                    self.campaign_victory,
                    self.arcade_clears,
                    pulse,
                )

        pygame.display.flip()

    def run(self, max_frames: int | None = None) -> int:
        if self.headless and self.state == "menu":
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
    parser.add_argument(
        "--headless-smoke-test",
        action="store_true",
        help="Run a short automated arcade loop without opening a visible window.",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=420,
        help="Frame count for --headless-smoke-test.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    game = DebateArenaGame(headless=args.headless_smoke_test)
    return game.run(max_frames=args.frames if args.headless_smoke_test else None)


if __name__ == "__main__":
    raise SystemExit(main())
