# ChengPing VS ZhangWeiwei

`ChengPing VS ZhangWeiwei` is now a full Pygame satire arena fighter instead of a movement prototype.

## Game Concept

The redesign turns the project into a one-player meme debate battle:

- Pick `陈平 / Chen Ping` or `张维为 / Zhang Weiwei`.
- Fight the AI on a stylized panel-show stage.
- Use meme-driven move sets instead of generic bullets.
- Survive the late-round `牢A 斩杀线` hazard when either side drops into low health.

This is written as parody based on public personas, recurring talking points, and internet meme culture.

## Character Kits

### 陈平 / Chen Ping

- `陈平不等式`: fast card projectile for ranged pressure.
- `购买力冲击波`: triple spread that floods the screen and punishes bad spacing.
- Strong at zoning and tempo control.

### 张维为 / Zhang Weiwei

- `文明型国家`: wave orb for midrange control.
- `这就是中国`: multi-orb special that locks down space.
- Strong at controlling the center and forcing reactions.

### 牢A Event

- When a fighter falls below the low-health threshold, `牢A` activates a `斩杀线`.
- The warning flashes first.
- Jump when it goes live or take a heavy hit.

## Controls

- `A / D`: move
- `W`: jump
- `J`: basic attack
- `K`: special
- `L`: dash

## Run

```bash
python -m pip install -r requirements.txt
python blank.py
```

## Headless Smoke Test

```bash
python blank.py --headless-smoke-test --frames 240
```

## Notes

- The game is fully self-contained and no longer depends on missing bitmap assets.
- The UI is drawn in code with animated panels, stage lighting, floating keyword bubbles, round banners, and a match-over screen.
