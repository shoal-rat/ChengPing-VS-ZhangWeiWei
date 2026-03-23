# ChengPing VS ZhangWeiwei

`ChengPing VS ZhangWeiwei` is now a six-character Pygame arcade fighter built around meme forms, public-persona parody, and internet-born move kits.

## What Changed

- The old one-match prototype is now an `arcade ladder` with three sequential AI fights.
- The roster expanded from `2` to `6` meme fighters.
- Every fighter now has `basic`, `special`, `utility`, and `ultimate` skills.
- Movement now includes `double jump`, `fast fall`, `guard`, and `dash`.
- Low-health rounds still trigger the `牢A 斩杀线`, and `牢A` can now also force it with an ultimate.
- The character select screen, HUD, stage themes, and match intro flow were fully redesigned.

## Playable Roster

- `陈平·购买力版`
- `陈平·讲堂版`
- `张维为·文明版`
- `张维为·演播室版`
- `牢A·斩杀线版`
- `牢A·账单版`

Each form is built from recurring meme material around Chen Ping, Zhang Weiwei, and 牢A rather than generic projectile templates.

## Controls

- `A / D`: move
- `W`: jump / double jump
- `S`: fast fall
- `Space`: guard
- `J`: basic
- `K`: special
- `I`: utility
- `U`: ultimate
- `L`: dash

## Run

```bash
python -m pip install -r requirements.txt
python blank.py
```

## Headless Smoke Test

```bash
python blank.py --headless-smoke-test --frames 1800
```

## Image Pipeline

Internet-sourced portrait inputs are stored in `assets/raw`, then processed into in-game cards/tokens/busts in `assets/processed`.

```bash
python asset_pipeline.py
```

Source links are documented in [assets/CREDITS.md](assets/CREDITS.md).

## Notes

- The game is written as parody based on public personas, recurring arguments, show clips, and meme culture.
- Runtime only needs the processed assets committed in the repo, but the pipeline is included so portraits can be rebuilt.
