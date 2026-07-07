#!/usr/bin/env python3
"""Drive the Codex CLI image generator to produce all game art.

Usage:
  python3 pipeline/gen_ai.py list
  python3 pipeline/gen_ai.py run <job> [<job> ...]     # runs jobs in parallel (max 3)
  python3 pipeline/gen_ai.py missing                    # list jobs whose output is absent

Outputs land in assets/aiwork/<job>.png. Slicing/packing into game assets is
done separately by pipeline/build_assets.py.
"""
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
WORK = os.path.join(ROOT, "assets", "aiwork")
CODEX = "/Applications/Codex.app/Contents/Resources/codex"

STYLE = (
    "classic 'The King of Fighters' (KOF XIII) hand-drawn 2D arcade fighting game style: "
    "clean thick dark lineart, rich cel shading with 2-3 shade tones, slightly exaggerated "
    "heroic proportions, crisp silhouette"
)
GREEN = ("The ENTIRE background must be flat pure chroma-key green (#00FF00) everywhere — "
         "no gradients, no floor, no shadows on the ground, no text, no labels, no watermark, no border lines.")

# Character look bibles — repeated verbatim in every sheet so outfits stay consistent.
CHARS = {
    "chen": dict(
        ref="chen_ping_profile.png",
        look=("an elderly, wiry Chinese economics professor closely modeled on the attached reference photo: "
              "thin angular face, black rectangular glasses, short black hair receding at temples, "
              "wearing an orange-tan leather jacket over a cream sweater vest and light-blue shirt, "
              "dark brown trousers, brown leather shoes, thin headset microphone on his cheek"),
    ),
    "zhang": dict(
        ref="zhang_weiwei_speaker.jpg",
        look=("a dignified 60-year-old Chinese professor closely modeled on the attached reference photo: "
              "round friendly face with a confident subtle smile, rimless glasses, neatly combed black hair "
              "greying at the sides, wearing a navy-blue tailored suit, white shirt, light-blue striped tie, "
              "black leather shoes"),
    ),
    "huxijin": dict(
        ref="hu_xijin_wiki.jpg",
        look=("a 60-year-old Chinese newspaper editor closely modeled on the attached reference photo: "
              "round face, thick black hair combed flat, heavy eyelids, wearing a charcoal-grey suit over "
              "a white open-collar shirt with no tie, black shoes, carrying a red thermos flask clipped nowhere"),
    ),
    "fengge": dict(
        ref="fengge_sohu.jpeg",
        look=("a lanky 30-something Chinese internet streamer closely modeled on the attached reference photo: "
              "long messy shoulder-length black hair, scruffy beard and moustache, heavy-lidded sleepy eyes, "
              "wearing a plain dark-grey crew-neck t-shirt, baggy black track pants, cheap white sneakers"),
    ),
    "huchenfeng": dict(
        ref="hu_chenfeng_wiki.jpg",
        look=("a baby-faced young Chinese tech reviewer closely modeled on the attached reference photo: "
              "very short black buzzcut hair, thin rectangular glasses, slight smirk, wearing a navy sweater "
              "with white horizontal stripes over a white collared shirt, beige chino trousers, white sneakers"),
    ),
    "mabaoguo": dict(
        ref="ma_baoguo_wude.jpg",
        look=("a stocky 69-year-old Chinese tai-chi 'master' closely modeled on the attached reference photo: "
              "weathered square face, bushy eyebrows, grey-flecked short hair swept back, a subtle purple bruise "
              "around his RIGHT eye, wearing a traditional black kung-fu jacket with white frog-button knots "
              "and red trim, loose black kung-fu trousers, black cloth shoes"),
    ),
}

SHEET_A_POSES = (
    "TOP ROW, left to right: "
    "(1) relaxed fighting-game idle stance, hands half-raised; "
    "(2) mid-stride walking forward; "
    "(3) sharp straight jab punch with lead hand fully extended; "
    "(4) heavy rising uppercut, body twisted, other arm tucked. "
    "BOTTOM ROW, left to right: "
    "(5) defensive guard: arms crossed in front of face, braced; "
    "(6) leaping in mid-air, knees tucked; "
    "(7) flinching backwards from being hit, head snapped back, arms flailing; "
    "(8) exhausted defeat: slumped on knees, head down."
)
SHEET_B_POSES = (
    "TOP ROW, left to right: "
    "(1) casting a projectile: both palms thrust forward together, energy pose; "
    "(2) big overhead two-handed smash mid-swing; "
    "(3) dashing forward at full lean, motion-ready; "
    "(4) crouching low sweep kick. "
    "BOTTOM ROW, left to right: "
    "(5) triumphant victory pose, one fist raised high, laughing; "
    "(6) taunting pose, beckoning with one hand; "
    "(7) channeling super move: arms spread wide, head tilted up, power stance; "
    "(8) mid-air flying kick, one leg extended."
)


def sheet_prompt(look, poses, extra=""):
    return (
        f"Use your image generation tool to create ONE image in landscape orientation, then save it "
        f"in the current working directory with the EXACT filename given at the end. "
        f"The image is a 2D fighting-game CHARACTER POSE SHEET in {STYLE}. "
        f"It shows THE SAME character eight times: {look}. {extra} "
        f"The eight poses are arranged in a strict grid of 2 rows x 4 columns, evenly spaced, "
        f"all drawn at the same scale, each pose fully inside its own grid cell with clear green gaps "
        f"between poses, no poses touching or overlapping, every pose facing RIGHT (character's left side "
        f"toward viewer where natural). Full body visible in every pose, consistent outfit and face in all "
        f"eight poses. {poses} {GREEN}"
    )


JOBS = {}

for key, c in CHARS.items():
    JOBS[f"{key}_sheetA"] = dict(
        refs=[os.path.join(RAW, c["ref"])],
        prompt=sheet_prompt(c["look"], SHEET_A_POSES) + f" Save as {key}_sheetA.png.",
        out=f"{key}_sheetA.png",
    )
    # sheet B additionally references sheet A for consistency (added at runtime if it exists)
    JOBS[f"{key}_sheetB"] = dict(
        refs=[os.path.join(RAW, c["ref"]), os.path.join(WORK, f"{key}_sheetA.png")],
        prompt=sheet_prompt(
            c["look"], SHEET_B_POSES,
            extra=("The second attached image is the already-approved pose sheet A of this exact character — "
                   "match its art style, proportions, palette and outfit EXACTLY."),
        ) + f" Save as {key}_sheetB.png.",
        out=f"{key}_sheetB.png",
    )
    JOBS[f"{key}_portrait"] = dict(
        refs=[os.path.join(RAW, c["ref"])],
        prompt=(
            f"Use your image generation tool to create ONE square image, then save it in the current "
            f"working directory with the EXACT filename given at the end. A dramatic character-select "
            f"bust portrait in {STYLE}, chest-up, three-quarter angle, intense expression, "
            f"dynamic rim lighting, of: {c['look']}. Plain flat pure chroma-key green (#00FF00) background, "
            f"no text, no watermark, no frame. Save as {key}_portrait.png."
        ),
        out=f"{key}_portrait.png",
    )

JOBS["stage_studio"] = dict(
    refs=[os.path.join(RAW, "zhang_more1.png")],
    prompt=(
        f"Use your image generation tool to create ONE image in landscape orientation, then save it in the "
        f"current working directory as stage_studio.png. A 2D fighting-game STAGE BACKGROUND in {STYLE}, "
        f"painted like a KOF stage: a glossy Chinese TV debate studio at night inspired by the attached photo — "
        f"deep blue and purple palette, circular stage floor front and center (empty, this is where fighters stand), "
        f"warm spotlights from above, seated audience silhouettes on both sides in the mid-distance, a huge curved "
        f"LED screen wall at the back glowing cyan-blue (the screen shows only abstract glowing world-map graphics, "
        f"NO text anywhere), camera cranes and studio lights at the edges. Wide flat floor across the entire bottom "
        f"quarter. No people in the foreground. No text, no logos, no watermark. Save as stage_studio.png."
    ),
    out="stage_studio.png",
)
JOBS["stage_lecture"] = dict(
    refs=[os.path.join(RAW, "chen_extra1.jpg")],
    prompt=(
        f"Use your image generation tool to create ONE image in landscape orientation, then save it in the "
        f"current working directory as stage_lecture.png. A 2D fighting-game STAGE BACKGROUND in {STYLE}: "
        f"a warm university lecture hall inspired by the attached photo — golden afternoon light through tall "
        f"windows on the right, a very wide dark-green chalkboard spanning the back wall (completely BLANK, "
        f"no writing), a wooden podium pushed to the far left, rows of empty wooden lecture desks receding in "
        f"the mid-distance behind the fighting area, ceiling fans. Wide flat empty wooden floor across the entire "
        f"bottom quarter where fighters stand. No people. No text anywhere, no watermark. Save as stage_lecture.png."
    ),
    out="stage_lecture.png",
)
JOBS["stage_street"] = dict(
    refs=[],
    prompt=(
        f"Use your image generation tool to create ONE image in landscape orientation, then save it in the "
        f"current working directory as stage_street.png. A 2D fighting-game STAGE BACKGROUND in {STYLE}: "
        f"a northeastern-China street food night market in light snowfall — dark teal night sky, strings of warm "
        f"bulb lights overhead, smoking barbecue stalls and steaming food carts on both sides, glowing BLANK neon "
        f"sign boards (empty rectangles of pink/cyan neon, NO characters on them), parked bicycles, low brick "
        f"buildings, distant smokestacks. Wide flat empty asphalt across the entire bottom quarter where fighters "
        f"stand. No people in the foreground. No text anywhere, no watermark. Save as stage_street.png."
    ),
    out="stage_street.png",
)

JOBS["props"] = dict(
    refs=[],
    prompt=(
        f"Use your image generation tool to create ONE image in landscape orientation, then save it in the "
        f"current working directory as props.png. A 2D fighting-game ITEM SPRITE SHEET in {STYLE}, "
        f"15 separate objects arranged in a strict grid of 3 rows x 5 columns, evenly spaced, each object fully "
        f"inside its own cell with wide green gaps, nothing touching. "
        f"ROW 1: (1) a plump white Chinese dumpling (jiaozi) with tiny motion lines; (2) a red Chinese 100-yuan "
        f"banknote slightly curved mid-air; (3) a green US dollar banknote mid-air; (4) a thick hardcover book "
        f"with a plain red cover; (5) a folded newspaper spinning like a frisbee. "
        f"ROW 2: (6) a red thermos flask with steam; (7) a black modern smartphone, screen glowing white apple-like "
        f"logo shape; (8) a green budget smartphone with cracked screen; (9) a yellow cartoon lightning bolt, thick "
        f"comic style; (10) a green stock-market candlestick chart arrow crashing downward. "
        f"ROW 3: (11) a golden glowing Chinese fan spread open; (12) a selfie stick with tiny phone; (13) a black "
        f"microphone; (14) a shiny golden trophy cup; (15) a cartoon panda head sticker with a confused human-like "
        f"expression, black and white. {GREEN} Save as props.png."
    ),
    out="props.png",
)

JOBS["fx"] = dict(
    refs=[],
    prompt=(
        f"Use your image generation tool to create ONE image in landscape orientation, then save it in the "
        f"current working directory as fx.png. A 2D fighting-game VFX SPRITE SHEET, anime arcade style, "
        f"12 separate effects arranged in a strict grid of 3 rows x 4 columns, evenly spaced, each fully inside "
        f"its own cell with wide green gaps, nothing touching. "
        f"ROW 1: four frames of an impact hit-spark evolving: small yellow-white flash burst -> jagged orange "
        f"starburst -> big radial spark star -> fading thin spark ring. "
        f"ROW 2: (5) blue-white shield/guard hexagon flash; (6) round beige dust puff cloud; (7) wispy small dust "
        f"trail curl; (8) yellow four-point twinkle star. "
        f"ROW 3: (9) horizontal white speed-line smear arc; (10) purple-pink shockwave ring; (11) small red anime "
        f"anger cross symbol; (12) golden upward energy aura column with sparks. {GREEN} Save as fx.png."
    ),
    out="fx.png",
)

JOBS["logo"] = dict(
    refs=[],
    prompt=(
        "Use your image generation tool to create ONE image in landscape orientation, then save it in the "
        "current working directory as logo.png. An arcade fighting-game TITLE LOGO in classic KOF style: "
        "the four large Chinese characters 「梗图格斗」 written EXACTLY and correctly, bold brush-metal red and "
        "gold letters with dark outline, slight perspective tilt, small clean English subtitle 'MEME FIGHT ARCADE' "
        "underneath, a few spark accents. The characters must be perfectly legible standard simplified Chinese. "
        "Flat pure chroma-key green (#00FF00) background everywhere else, no watermark. Save as logo.png."
    ),
    out="logo.png",
)


def run_job(name):
    job = JOBS[name]
    out_path = os.path.join(WORK, job["out"])
    refs = [r for r in job.get("refs", []) if os.path.exists(r)]
    cmd = [CODEX, "exec", "--cd", WORK, "--sandbox", "workspace-write",
           "--skip-git-repo-check", "--color", "never", "--ephemeral"]
    for r in refs:
        cmd += ["-i", r]
    cmd.append("-")
    try:
        res = subprocess.run(cmd, input=job["prompt"], capture_output=True, text=True, timeout=900)
    except subprocess.TimeoutExpired:
        return name, False, "timeout"
    ok = os.path.exists(out_path) and os.path.getsize(out_path) > 30000
    tail = (res.stdout or "").strip().splitlines()[-3:]
    return name, ok, " | ".join(tail)


def main():
    os.makedirs(WORK, exist_ok=True)
    if len(sys.argv) < 2 or sys.argv[1] == "list":
        for k in JOBS:
            print(("done " if os.path.exists(os.path.join(WORK, JOBS[k]["out"])) else "todo ") + k)
        return
    if sys.argv[1] == "missing":
        for k in JOBS:
            if not os.path.exists(os.path.join(WORK, JOBS[k]["out"])):
                print(k)
        return
    if sys.argv[1] == "run":
        names = sys.argv[2:]
        bad = [n for n in names if n not in JOBS]
        if bad:
            print("unknown jobs:", bad)
            sys.exit(1)
        with ThreadPoolExecutor(max_workers=3) as ex:
            futs = {ex.submit(run_job, n): n for n in names}
            for f in as_completed(futs):
                name, ok, msg = f.result()
                print(("OK   " if ok else "FAIL ") + name + "  " + msg[-160:])
        return
    print("unknown command")


if __name__ == "__main__":
    main()
