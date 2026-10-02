"""
The works pages' pictures, copied from each project's own repository.

    python3 scripts/works_images.py

Every picture below is a file the project itself uses or produced (a build
capture, an in-app screen, the game's own art); the source path is kept here
so each one can be traced. Two sizes each, in public/assets/images/works/<id>/:
`<name>-thumb.webp` (at most 640 wide, for the gallery strip) and
`<name>-full.webp` (at most 1600 on the long side, opened on request).
Prints each picture's full size, for src/data/projects.ts.
"""
import os
import sys
from PIL import Image

HOME = os.path.expanduser('~')
LUNAI = f'{HOME}/Desktop/lunai'
LUNAI_QA = f'{HOME}/Desktop/lunai-qa/web-preview-1.1.0'
LIMINAL = f'{HOME}/Desktop/리미널_게임기획/game'
WORM = f'{HOME}/Projects/worm-up'
WORM_RUN = f'{WORM}/steam/.qa/run_plain'
WORM_CH = f'{WORM}/steam/assets/ch'
LUMIORA = f'{HOME}/Desktop/LUMIORA_GAME/docs/aquarium_build_shots'
LUMIORA_CONCEPT = f'{HOME}/Desktop/lumiora/new photo'
RUBATO = f'{HOME}/Desktop/RUBATO/RUBATO'

PICTURES = {
    'lunai': [
        ('icon', f'{LUNAI}/assets/images/icon.png'),
        ('album', f'{LUNAI_QA}/album_390x844.png'),
        ('room-chat', f'{LUNAI_QA}/characters_390x844.png'),
        ('room-dal-tokki', f'{LUNAI}/assets/images/rooms/base-v02/lunai_room_base_dal_tokki_v02.png'),
        ('room-winter', f'{LUNAI}/assets/images/rooms/character-seasonal/lunai_room_bg_moon_rabbit_winter_v01.png'),
        ('cover-village', f'{LUNAI}/assets/images/default-cover-village.png'),
    ],
    'liminal': [
        ('bureau', f'{LIMINAL}/public/assets/backgrounds/boundary_bureau/liminal_bg_boundary_bureau_exterior_v02.png'),
        ('crossroads', f'{LIMINAL}/public/assets/backgrounds/boundary_city/liminal_bg_boundary_crossroads_v02.png'),
        ('approach', f'{LIMINAL}/public/assets/backgrounds/boundary_bureau/liminal_bg_bureau_approach_night_v02.png'),
        ('hub-backyard', f'{LIMINAL}/qa/memory_unlock/02_backyard_balsoe.png'),
        ('case04-3d-landing', f'{LIMINAL}/qa/3d/c04/prod_c/01_r1_landing.png'),
        ('case04-3d-window', f'{LIMINAL}/qa/3d/c04/prod_c/14_r4_window.png'),
    ],
    # The Steam narrative game (SITE UPGRADE PHASE C): frames of the build
    # played start to finish on 2026-10-03, and the characters' own cut-outs.
    # The mobile runner's pictures are kept apart, for the archive's Early
    # Prototype (assets/archive/early-prototype/wormup/).
    'wormup': [
        ('c01-why-worm', f'{WORM_RUN}/0010_v6_c01_C01-S01.png'),
        ('c05b-nobody-came', f'{WORM_RUN}/0088_v6_c05b_C05B-S01.png'),
        ('c05c-music-room', f'{WORM_RUN}/0102_v6_c05c_C05C-S01.png'),
        ('c05n-dawn', f'{WORM_RUN}/0180_v6_c05n_C05N-S01.png'),
        ('c05o-univ', f'{WORM_RUN}/0194_v6_c05o_C05O-S01.png'),
        ('c14-same-road', f'{WORM_RUN}/0270_v6_c14_C14-S00.png'),
        ('c17-bridge', f'{WORM_RUN}/0308_v6_c17_C17-S01.png'),
        ('c26-student', f'{WORM_RUN}/0362_v6_c26_C26-S01.png'),
        ('char-worm-child', f'{WORM_CH}/ch_u_worm_child__idle.webp'),
        ('char-worm-teen', f'{WORM_CH}/ch_u_worm_teen__idle.webp'),
        ('char-worm-office', f'{WORM_CH}/ch_u_worm_office__idle.webp'),
        ('char-mom', f'{WORM_CH}/ch_u_mom__idle.webp'),
    ],
    'lumiora': [
        ('aquarium-concept', f'{LUMIORA_CONCEPT}/ChatGPT Image 2026년 9월 16일 오전 09_20_40 (1).png'),
        ('flow-garden', f'{LUMIORA}/aq_02_garden.png'),
        ('glass-weave', f'{LUMIORA}/aq_03_glass_mid.png'),
        ('echo-grotto', f'{LUMIORA}/aq_04_grotto.png'),
        ('pitch-cathedral', f'{LUMIORA}/aq_05_cathedral.png'),
        ('restoration', f'{LUMIORA}/aq_07_restoration.png'),
    ],
    'rubato': [
        ('title', f'{RUBATO}/.qa-shots/01_title.png'),
        ('cafe-scene', f'{RUBATO}/.qa-shots/STAGE_01_d02_1920.png'),
        ('opera', f'{RUBATO}/game/assets/bg/bg_court_opera_auditorium.jpg'),
        ('stage', f'{RUBATO}/game/assets/bg/bg_court_opera_stage.jpg'),
        ('street', f'{RUBATO}/game/assets/bg/bg_vienna_1800_street.jpg'),
        ('xiii', f'{RUBATO}/game/assets/bg/bg_automaton_xiii_gallery.jpg'),
    ],
}


def fit(im: Image.Image, w: int, h: int) -> Image.Image:
    s = min(w / im.width, h / im.height, 1)
    return im if s == 1 else im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def main() -> None:
    # `python3 scripts/works_images.py wormup` makes one work's pictures only,
    # so the others are not remade from sources that may have moved on.
    only = set(sys.argv[1:])
    root = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'images', 'works')
    for pid, pics in PICTURES.items():
        if only and pid not in only:
            continue
        out = os.path.join(root, pid)
        os.makedirs(out, exist_ok=True)
        for name, src in pics:
            # A character is a cut-out: it keeps its transparency.
            im = Image.open(src).convert('RGBA' if name.startswith('char-') else 'RGB')
            full = fit(im, 1600, 1600)
            full.save(f'{out}/{name}-full.webp', 'WEBP', quality=82, method=6)
            fit(im, 640, 800).save(f'{out}/{name}-thumb.webp', 'WEBP', quality=78, method=6)
            print(pid, name, full.width, full.height)


if __name__ == '__main__':
    main()
