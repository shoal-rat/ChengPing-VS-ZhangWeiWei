# ChengPing VS ZhangWeiwei

`ChengPing VS ZhangWeiwei` is now a nine-fighter Pygame anime-parody arena game built from public-persona memes, directional move kits, and image-processed portrait sprites.

## Current Build

- `9` playable meme fighters in a `3-match arcade ladder`
- `5` directional `J` attacks and `5` directional `K` skills for every fighter
- shared movement system with `double jump`, `fast fall`, `guard`, `dash`, and `ultimate`
- difficulty presets that change AI reaction speed, aggression, combo follow-up, and guarding
- layered portrait animation using processed `head` and `torso` cutouts
- stronger match flow with stage themes, round intros, ticker text, and campaign finish screens

## Roster

- `陈平·购买力版`
- `陈平·讲堂版`
- `张维为·文明版`
- `张维为·演播室版`
- `牢A·海报版`
- `牢A·斩杀线版`
- `峰哥·东百版`
- `户晨风·评测版`
- `胡锡进·社评版`

## Controls

- `A / D`: move
- `W`: jump or double jump
- `S`: fast fall
- `Space`: guard
- `J`: neutral attack
- `W / A / S / D + J`: directional attack
- `K`: neutral skill
- `W / A / S / D + K`: directional skill
- `U`: ultimate
- `L`: dash
- `1 / 2 / 3`: menu difficulty

## Run

```bash
python -m pip install -r requirements.txt
python blank.py
```

## Playtest Modes

Headless smoke test:

```bash
python blank.py --headless-smoke-test --frames 1800
```

Visible autoplay demo:

```bash
python blank.py --autoplay-playtest --frames 1800 --difficulty 3
```

## Portrait Pipeline

Internet-sourced portrait inputs are downloaded into `assets/raw`, then processed into stylized `card`, `token`, `bust`, `head`, and `torso` sprites in `assets/processed`.

```bash
python asset_pipeline.py
```

Source links are documented in [assets/CREDITS.md](assets/CREDITS.md).

## Notes

- The game is parody based on public personas, recurring arguments, and meme culture.
- Runtime only needs the committed `assets/processed` files.
- The raw-image pipeline is included so the roster art can be rebuilt or extended.
