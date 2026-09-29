#!/usr/bin/env python3
"""Drive the Codex CLI image generator for 梗王大乱斗 art.

  python3 tools/gen_art.py list
  python3 tools/gen_art.py run <job> [<job> ...]   # parallel, max 5

Raw generations land in art/<kind>/<job>.png. tools/build_art.py keys and packs them
into assets/.
"""
import os, subprocess, sys, shutil, tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "art", "ref")
ART = os.path.join(ROOT, "art")
CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex"

STYLE = (
    "Art style: cute Q-version (Q版) chibi caricature sticker style — thick uniform dark-plum outlines (#231a30), "
    "flat cel shading with exactly ONE shadow tone per colour, one small crisp white highlight, vivid clean saturated "
    "colours, simple readable shapes, slightly oversized rounded head shape, big expressive eyes and mouth, but the "
    "person's signature features (face shape, hairstyle, glasses or not) stay instantly recognisable — the spirit of "
    "Nintendo party-fighter sticker art. No gradients, no painterly texture, no realism."
)
GREEN = ("The ENTIRE background must be flat pure chroma-key green #00FF00 — no shadows, no text, no labels, "
         "no numbers, no borders, no frames.")

HEADS = {
    "chen": ("chen_ping_profile.png",
             "an elderly, wiry Chinese economics professor caricatured from the attached reference photo: long thin face, "
             "prominent cheekbones, black rectangular thick-rimmed glasses, swept-back black hair with grey at the temples, "
             "a thin skin-coloured headset microphone at his cheek. He wears glasses in all five heads."),
    "zhang": ("zhang_weiwei_speaker.jpg",
              "a genial 67-year-old Chinese political scientist caricatured from the attached reference photo: broad rounded "
              "face, full cheeks, silver-grey hair neatly combed back and parted, thin gold-rimmed rectangular glasses, "
              "confident knowing smile lines. He wears the same glasses in all five heads."),
    "huxijin": ("hu_xijin_wiki.jpg",
                "a 65-year-old Chinese newspaper editor caricatured from the attached reference photo: long oval face, thick "
                "black hair combed flat with a side part and a slightly messy fringe, heavy hooded eyelids, raised worried "
                "eyebrows, prominent nose, NO glasses in any head."),
    "fengge": ("fengge_sohu.jpeg",
               "a scruffy 40-something Chinese internet streamer caricatured from the attached reference photo: long messy "
               "shoulder-length black hair parted in the middle, full scruffy beard and moustache, heavy-lidded sleepy half-closed "
               "eyes, weary knowing expression, NO glasses in any head."),
    "huchenfeng": ("hu_chenfeng_wiki.jpg",
                   "a baby-faced young Chinese street-interview streamer caricatured from the attached reference photo: short neat "
                   "black hair, thin black rectangular glasses, small smug smirk, slim oval face. He wears the same glasses in all "
                   "five heads."),
    "mabaoguo": ("ma_baoguo_wude.jpg",
                 "a 69-year-old Chinese tai-chi 'grandmaster' caricatured from the attached reference photo: clearly an OLD man — "
                 "salt-and-pepper GREY hair (mostly grey with some black) brushed straight back from a high wrinkled forehead, "
                 "a wide SQUARE jaw and broad flat nose, very thick bushy dark-grey eyebrows, deep nasolabial folds and crow's feet, "
                 "small stubborn eyes, lips pressed in a proud frown; his right eye area slightly swollen and purple (the famous "
                 "bruise). NO glasses in any head. He must look distinctly older and squarer-faced than a typical middle-aged man."),
    "laoa": (None,
             "an anonymous young Chinese overseas student in his mid-twenties (original design, not a real likeness): short messy "
             "black hair with a cowlick, round youthful face, a black hoodie hood bunched at the back of the neck. His EYES ARE "
             "ALWAYS HIDDEN behind a chunky pixel-mosaic censor block (a rectangle of ~12 flat coloured squares in skin and "
             "grey tones, like a TV privacy mosaic) — the same mosaic block in all five heads — while his eyebrows and mouth stay "
             "fully visible and expressive."),
}

EXPR = ("(1) confident smirk, one eyebrow raised; (2) attacking: shouting fiercely, mouth wide open, eyebrows angled down; "
        "(3) getting hit: eyes squeezed shut, teeth gritted; (4) knocked out: dizzy spiral eyes, mouth hanging open, sweat drops; "
        "(5) smug victory grin, eyes closed happily.")


def head_prompt(key, look):
    return (
        "Use your image generation tool to create ONE image (wide landscape, about 2.4:1), then save it in the current "
        f"working directory as {key}.png and verify the file exists.\n\n"
        f"The image is a HEAD EXPRESSION SHEET for a cartoon 2D platform fighting game. {STYLE}\n\n"
        f"Subject: {look}\n\n"
        "Show FIVE heads of this same person in ONE horizontal row, evenly spaced with generous gaps, all exactly the same "
        "size and the same angle: a 3/4 view turned to the RIGHT (nose points toward the right edge of the image, the "
        "left ear visible). Heads only — cut cleanly just under the chin/jaw, no neck, no shoulders, no body.\n"
        f"{EXPR}\n\n{GREEN}"
    )


JOBS = {}
for k, (ref, look) in HEADS.items():
    JOBS[f"head_{k}"] = dict(kind="heads", out=f"{k}.png", refs=[os.path.join(RAW, ref)] if ref else [],
                             prompt=head_prompt(k, look))


BG_STYLE = (
    "Art style: bright, bold cel-shaded cartoon background painting for a 2D platform fighting game (in the spirit of "
    "Nintendo's Smash Bros stage backdrops, but 2D): clean dark outlines on big shapes, flat colour areas with one shade tone, "
    "vivid saturated palette, strong readable silhouettes, atmospheric depth through colour, NO characters, NO people, NO animals. "
    "Composition: wide 16:9 landscape; the lower-middle third must stay visually calm and slightly darker because a floating "
    "platform will be drawn over it in the game; no foreground floor or ground line in the bottom 30%, it fades into the scene "
    "or into sky/abyss."
)
STAGES = {
    "studio": "A futuristic TV talk-show studio for a political program: a colossal curved LED screen wall showing a glowing "
              "gold-and-red stylised world map with the big title text \"这就是中国\" in bold white Chinese characters, "
              "tiered audience seats fading into darkness, camera cranes, dozens of spotlights with light beams, deep navy and "
              "royal blue lighting with gold accents.",
    "arena": "A floating traditional Chinese martial-arts hall high above a sea of clouds at golden sunset: red pillars, curved "
             "tiled roof, a big black lacquered plaque with gold characters \"浑元形意太极门\", distant misty karst mountains, "
             "flying cranes silhouettes, warm orange-pink sky.",
    "stock": "A dramatic stock-exchange trading hall at night: gigantic wall screens full of red and green candlestick charts "
             "crashing downward, scrolling tickers with numbers, a huge glowing \"3000\" number on the central screen, rows of "
             "empty trading desks with monitors fading into darkness, cold navy lighting with red and green glows.",
    "seattle": "A gloomy rainy night skyline of Seattle seen from above: the Space Needle silhouette, wet dark towers with "
               "a few lit windows, heavy rain streaks, puddle reflections, cold blue and teal palette with a few red neon "
               "signs, low clouds; melancholic mood.",
    "texas": "A snowy Texas suburban night during a winter power blackout: a big two-storey American house with a porch "
             "(all windows dark), snow-covered lawn and pickup truck, sagging power lines with icicles, an oil pump jack "
             "silhouette in the distance, starry deep-blue sky, cold moonlight.",
    "sam": "The interior of a huge bright membership warehouse supermarket: towering steel shelves stacked with giant boxes "
           "and bulk goods, a big red-and-white sign reading \"会员店\", bright ceiling lights, shopping carts, glossy "
           "floor reflections fading out, clean blue-white palette with red accents.",
}
for k, desc in STAGES.items():
    JOBS[f"stage_{k}"] = dict(kind="stages", out=f"{k}.png", refs=[], prompt=(
        "Use your image generation tool to create ONE wide landscape image (16:9, as large as possible), then save it in the "
        f"current working directory as {k}.png and verify the file exists.\n\n{BG_STYLE}\n\nScene: {desc}"))


def run_job(name):
    job = JOBS[name]
    outdir = os.path.join(ART, job["kind"])
    os.makedirs(outdir, exist_ok=True)
    work = tempfile.mkdtemp(prefix=f"gen_{name}_")
    cmd = [CODEX, "exec", "--cd", work, "--sandbox", "workspace-write", "--skip-git-repo-check", "--ephemeral"]
    for r in job["refs"]:
        dst = os.path.join(work, os.path.basename(r))
        shutil.copy(r, dst)
        cmd += ["-i", dst]
    cmd += ["-"]
    p = subprocess.run(cmd, input=job["prompt"], capture_output=True, text=True, timeout=900)
    src = os.path.join(work, job["out"])
    if not os.path.exists(src):
        return name, False, (p.stdout[-600:] + p.stderr[-600:])
    dst = os.path.join(outdir, job["out"])
    if os.path.exists(dst):
        base, ext = os.path.splitext(dst)
        i = 1
        while os.path.exists(f"{base}.v{i}{ext}"):
            i += 1
        shutil.move(dst, f"{base}.v{i}{ext}")
    shutil.move(src, dst)
    return name, True, dst


def main():
    if len(sys.argv) < 2 or sys.argv[1] == "list":
        for n in JOBS:
            print(n)
        return
    names = sys.argv[2:]
    with ThreadPoolExecutor(max_workers=5) as ex:
        futs = [ex.submit(run_job, n) for n in names]
        for f in as_completed(futs):
            n, ok, info = f.result()
            print(("OK  " if ok else "FAIL"), n, info, flush=True)


if __name__ == "__main__":
    main()
