from __future__ import annotations

import argparse
import random
import sys

import pygame

from blocks import ArenaBackdrop
from bullet import FloatingText, KillLineEvent, Projectile
from game_functions import (
    build_fonts,
    draw_hud,
    draw_match_over,
    draw_menu,
    draw_round_banner,
)
from heroes import Fighter, FighterBlueprint, build_blueprints
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
        self.backdrop = ArenaBackdrop(self.settings)
        self.kill_line = KillLineEvent(self.settings.floor_y)
        self.random = random.Random(42)
        self.headless = headless

        self.selected_index = 0
        self.state = "menu"
        self.elapsed = 0.0
        self.banner_timer = 0.0
        self.freeze_timer = 0.0
        self.round_time = self.settings.round_time
        self.player_rounds = 0
        self.opponent_rounds = 0
        self.match_winner: FighterBlueprint | None = None
        self.round_message = ""
        self.round_submessage = ""

        self.projectiles: list[Projectile] = []
        self.floating_texts: list[FloatingText] = []
        self.player: Fighter | None = None
        self.opponent: Fighter | None = None

        self.left_down = False
        self.right_down = False
        self.ticker_index = 0
        self.ticker_timer = 4.5
        self.ticker_hold = 0.0
        self.ticker_text = self.settings.ticker_messages[0]

    def reset_match(self) -> None:
        player_blueprint = self.blueprints[self.selected_index]
        opponent_blueprint = self.blueprints[1 - self.selected_index]
        self.player = Fighter(player_blueprint, self.settings, 172, 1, is_player=True)
        self.opponent = Fighter(opponent_blueprint, self.settings, self.settings.width - 280, -1, is_player=False)
        self.player_rounds = 0
        self.opponent_rounds = 0
        self.match_winner = None
        self.start_round()

    def start_round(self) -> None:
        if not self.player or not self.opponent:
            return
        self.player.reset(172, 1)
        self.opponent.reset(self.settings.width - 280, -1)
        self.projectiles.clear()
        self.floating_texts.clear()
        self.kill_line.reset()
        self.round_time = self.settings.round_time
        self.state = "round_intro"
        self.banner_timer = self.settings.intro_time
        round_number = self.player_rounds + self.opponent_rounds + 1
        self.round_message = f"ROUND {round_number}"
        self.round_submessage = "Debate positions locked. Launching meme ordinance."
        self.set_ticker(self.settings.ticker_messages[(round_number - 1) % len(self.settings.ticker_messages)], hold=2.6)

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

    def fire_for(self, fighter: Fighter, special: bool) -> None:
        projectiles = fighter.spawn_special() if special else fighter.spawn_basic()
        if not projectiles:
            return
        self.projectiles.extend(projectiles)
        label = projectiles[0].label
        self.floating_texts.append(FloatingText(label, fighter.center + Vec2(0, -108), fighter.blueprint.accent_secondary))
        self.set_ticker(f"{fighter.blueprint.display_name} used {label}.")

    def finish_round(self, winner: Fighter | None, reason: str) -> None:
        if self.state in {"round_over", "match_over"}:
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
            self.round_submessage = "Round drawn. Both sides flooded the discourse equally."
            self.set_ticker("Round draw. Resetting the stage.", hold=3.0)

        self.round_message = reason
        self.state = "round_over"
        self.freeze_timer = self.settings.round_freeze_time

        if self.player_rounds >= self.settings.rounds_to_win:
            self.match_winner = self.player.blueprint
        elif self.opponent_rounds >= self.settings.rounds_to_win:
            self.match_winner = self.opponent.blueprint

    def handle_event(self, event: pygame.event.Event) -> bool:
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                return False

            if self.state == "menu":
                if event.key in (pygame.K_LEFT, pygame.K_a):
                    self.selected_index = (self.selected_index - 1) % len(self.blueprints)
                elif event.key in (pygame.K_RIGHT, pygame.K_d):
                    self.selected_index = (self.selected_index + 1) % len(self.blueprints)
                elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                    self.reset_match()
                return True

            if self.state == "match_over":
                if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                    self.state = "menu"
                return True

            if event.key == pygame.K_a:
                self.left_down = True
            elif event.key == pygame.K_d:
                self.right_down = True

            if self.state != "playing" or not self.player:
                return True

            if event.key == pygame.K_w:
                self.player.jump()
            elif event.key == pygame.K_j:
                self.fire_for(self.player, special=False)
            elif event.key == pygame.K_k:
                self.fire_for(self.player, special=True)
            elif event.key == pygame.K_l:
                if self.player.dash():
                    self.set_ticker(f"{self.player.blueprint.display_name} dashed through the hot take.")
            return True

        if event.type == pygame.KEYUP:
            if event.key == pygame.K_a:
                self.left_down = False
            elif event.key == pygame.K_d:
                self.right_down = False
        return True

    def update_ai(self, dt: float) -> None:
        if self.state != "playing" or not self.player or not self.opponent:
            return

        bot = self.opponent
        target = self.player
        bot.ai_cooldown = max(0.0, bot.ai_cooldown - dt)
        bot.face_target(target.center.x)

        distance = target.center.x - bot.center.x
        abs_distance = abs(distance)

        axis = 0.0
        if self.kill_line.phase == "warning" and bot.on_ground:
            bot.jump()
            bot.ai_cooldown = 0.2
        elif abs_distance > bot.blueprint.preferred_range + 40:
            axis = 1.0 if distance > 0 else -1.0
        elif abs_distance < 150:
            axis = -1.0 if distance > 0 else 1.0
        bot.set_move(axis)

        if bot.ai_cooldown > 0.0:
            return

        if abs_distance < 520 and bot.special_cd <= 0.0 and self.random.random() < 0.58:
            self.fire_for(bot, special=True)
            bot.ai_cooldown = 0.55
        elif abs_distance < 740 and bot.attack_cd <= 0.0:
            self.fire_for(bot, special=False)
            bot.ai_cooldown = 0.38
        elif abs_distance < 210 and bot.dash_cd <= 0.0 and self.random.random() < 0.4:
            if bot.dash():
                self.set_ticker(f"{bot.blueprint.display_name} changed the debate angle with a dash.")
            bot.ai_cooldown = 0.3
        elif target.on_ground and self.random.random() < 0.12:
            bot.jump()
            bot.ai_cooldown = 0.22

    def update_projectiles(self, dt: float) -> None:
        if not self.player or not self.opponent:
            return

        updated: list[Projectile] = []
        for projectile in self.projectiles:
            alive = projectile.update(dt)
            if not alive:
                continue
            if projectile.pos.x < -120 or projectile.pos.x > self.settings.width + 120:
                continue
            if projectile.pos.y < -120 or projectile.pos.y > self.settings.height + 120:
                continue

            target = self.opponent if projectile.owner == self.player.blueprint.key else self.player
            if projectile.rect.colliderect(target.hurtbox):
                direction = 1 if projectile.velocity.x >= 0 else -1
                if target.take_damage(projectile.damage, direction, projectile.knockback_y):
                    damage_text = f"-{projectile.damage}"
                    text_color = self.settings.accent_gold if projectile.owner == self.player.blueprint.key else self.settings.accent_pink
                    self.floating_texts.append(FloatingText(damage_text, target.center + Vec2(0, -88), text_color))
                    self.set_ticker(f"{projectile.label} connects on {target.blueprint.display_name}.", hold=1.8)
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
                    FloatingText("牢A incoming", Vec2(self.settings.width / 2, self.settings.floor_y - 112), self.settings.accent_pink)
                )
                self.set_ticker("Low HP detected. 牢A is drawing the execution line.", hold=2.4)

        message = self.kill_line.update(dt)
        if message:
            self.set_ticker(message, hold=2.0)

        if self.kill_line.phase != "active":
            return

        band = self.kill_line.band_rect(self.settings.width)
        for fighter in (self.player, self.opponent):
            if self.kill_line.can_hit(fighter.blueprint.key) and band.colliderect(fighter.hurtbox):
                direction = -1 if fighter is self.player else 1
                if fighter.take_damage(self.kill_line.damage, direction, -540.0):
                    self.kill_line.register_hit(fighter.blueprint.key)
                    self.floating_texts.append(FloatingText("斩杀线!", fighter.center + Vec2(0, -106), self.settings.accent_pink))
                    self.set_ticker(f"牢A clipped {fighter.blueprint.display_name} at the kill line.", hold=2.3)

    def update_floating_texts(self, dt: float) -> None:
        self.floating_texts = [text for text in self.floating_texts if text.update(dt)][-self.settings.particle_limit :]

    def update_round_state(self, dt: float) -> None:
        if not self.player or not self.opponent:
            return

        if self.state == "round_intro":
            self.banner_timer -= dt
            if self.banner_timer <= 0.0:
                self.state = "playing"
            return

        if self.state == "round_over":
            self.freeze_timer -= dt
            if self.freeze_timer <= 0.0:
                if self.match_winner:
                    self.state = "match_over"
                else:
                    self.start_round()
            return

        if self.state != "playing":
            return

        axis = 0.0
        if self.left_down and not self.right_down:
            axis = -1.0
        elif self.right_down and not self.left_down:
            axis = 1.0
        self.player.set_move(axis)

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
            draw_menu(self.screen, self.settings, self.fonts, self.blueprints, self.selected_index, pulse)
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
                )
            for text in self.floating_texts:
                text.draw(self.screen, self.fonts["heading"])

            if self.state == "round_intro":
                alpha = max(0, min(230, int(225 * (self.banner_timer / self.settings.intro_time))))
                draw_round_banner(self.screen, self.settings, self.fonts, self.round_message, self.round_submessage, alpha)
            elif self.state == "round_over":
                alpha = 220
                draw_round_banner(self.screen, self.settings, self.fonts, self.round_message, self.round_submessage, alpha)
            elif self.state == "match_over" and self.match_winner:
                draw_match_over(
                    self.screen,
                    self.settings,
                    self.fonts,
                    self.match_winner,
                    self.player_rounds,
                    self.opponent_rounds,
                    pulse,
                )

        pygame.display.flip()

    def run(self, max_frames: int | None = None) -> int:
        if self.headless and self.state == "menu":
            self.reset_match()

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
        help="Run a short automated match loop without opening a visible window.",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=180,
        help="Frame count for --headless-smoke-test.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    game = DebateArenaGame(headless=args.headless_smoke_test)
    return game.run(max_frames=args.frames if args.headless_smoke_test else None)


if __name__ == "__main__":
    raise SystemExit(main())
