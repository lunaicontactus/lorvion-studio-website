"""
The archive's pictures (SITE UPGRADE PHASE G), from material already in this
repository. Nothing is generated; a picture is resized, and the first crew is
laid side by side from its own frames.

    python3 scripts/archive_images.py

Two rooms, two folders, never the same file in both (test/archive-g.test.ts):

  public/assets/images/public-archive/  the PUBLIC ARCHIVE page (/archive.html)
  public/assets/images/archive/secret/  SECRET STORAGE's polaroids

Two sizes each: `<name>-thumb.webp` (inside 600 x 450) and `<name>-full.webp`
(at most 1600 on the long side). Prints each picture's full size, for
src/data/publicArchive.ts and src/data/polaroids.ts.
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREW = f'{ROOT}/assets/crew-reboot'
EARLY = f'{ROOT}/assets/archive/early-prototype/wormup'
LEGACY = f'{ROOT}/assets/archive/legacy'
V1 = f'{ROOT}/public/assets/images/dokkaebi'
WIP = f'{ROOT}/public/assets/images/wip'

PUBLIC = {
    # CHARACTERS — the five turnarounds the crew is built from (the user's own sheets).
    'crew-momo': f'{CREW}/source/1. 모모 티자.png',
    'crew-nunu': f'{CREW}/source/2. 누누 티자.png',
    'crew-ruki': f'{CREW}/source/3. 루키 티자.png',
    'crew-yomi': f'{CREW}/source/4. 요미 티자 .png',
    'crew-poko': f'{CREW}/source/5. 포코 티자png.png',
    # OLD DESIGNS — WORM UP! as the mobile runner (taken off its page in PHASE C).
    'wormup-runner-keyart': f'{EARLY}/worm-up-keyart-runner.webp',
    'wormup-runner-icon': f'{EARLY}/icon-full.webp',
    'wormup-runner-couple': f'{EARLY}/couple-full.webp',
    'wormup-runner-kidnap': f'{EARLY}/kidnap-full.webp',
    'wormup-runner-climb': f'{EARLY}/climb-full.webp',
    'wormup-runner-crow': f'{EARLY}/crow-boss-full.webp',
    # OLD DESIGNS — the marks before the garage-door logo.
    'mark-symbol-v01': f'{LEGACY}/eungarage-symbol-v01.png',
    'mark-saturn': f'{LEGACY}/eungarage-mark-saturn.png',
}

SECRET = {
    # Given up: MOMO redrawn whole, which rewrote its fur and face (2026.09.12).
    'momo-redesign': f'{CREW}/redesigned/momo/_turnaround.png',
    # Tried: short pile hair, before the rule for all five (2026.09.13).
    'momo-shortpile': f'{CREW}/shortpile/momo/_turnaround.png',
    # Hidden working sheets from the neck and tail fixes (2026.09.13).
    'momo-ring-views': f'{CREW}/neck/momo_ring_four_views.png',
    'crew-scale-130': f'{CREW}/neck/ab_room_scale_130.png',
    'room-before-after': f'{CREW}/neck/live_before_after.png',
}


def save(im: Image.Image, out_dir: str, name: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    rgba = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    im = im.convert('RGBA' if rgba else 'RGB')
    full = im.copy()
    full.thumbnail((1600, 1600), Image.LANCZOS)
    full.save(f'{out_dir}/{name}-full.webp', 'WEBP', quality=86, method=6)
    # The card shows a picture whole inside a 4:3 frame about 300 px wide, so
    # the thumb fits 600 x 450 (twice that) whatever its shape.
    thumb = im.copy()
    thumb.thumbnail((600, 450), Image.LANCZOS)
    thumb.save(f'{out_dir}/{name}-thumb.webp', 'WEBP', quality=82, method=6)
    print(f'{name}: {full.width}x{full.height}')


def first_crew() -> Image.Image:
    """The first crew (2026.09.09), one idle frame each, side by side."""
    frames = [Image.open(f'{V1}/{n}/idle/front/{n}_idle_front_01.webp').convert('RGBA')
              for n in ('momo', 'nunu', 'ruki', 'yomi', 'poko')]
    h = max(f.height for f in frames)
    gap = 24
    w = sum(f.width for f in frames) + gap * (len(frames) + 1)
    sheet = Image.new('RGBA', (w, h + gap * 2), (0, 0, 0, 0))
    x = gap
    for f in frames:
        sheet.alpha_composite(f, (x, gap + h - f.height))
        x += f.width + gap
    return sheet


def main() -> None:
    out = f'{ROOT}/public/assets/images/public-archive'
    for name, src in PUBLIC.items():
        save(Image.open(src), out, name)
    save(first_crew(), out, 'crew-first-3d')
    # The workbench's sheets keep their one file as the full picture; the
    # archive's cards get a thumb of each.
    for f in sorted(os.listdir(WIP)):
        if f.endswith('.webp'):
            im = Image.open(f'{WIP}/{f}')
            im.thumbnail((600, 450), Image.LANCZOS)
            im.save(f'{out}/wip-{f[:-5].replace("_", "-")}-thumb.webp', 'WEBP', quality=82, method=6)
    out = f'{ROOT}/public/assets/images/archive/secret'
    for name, src in SECRET.items():
        save(Image.open(src), out, name)


if __name__ == '__main__':
    main()
