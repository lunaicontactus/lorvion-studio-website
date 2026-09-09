"""
Master frames -> the frames the site ships.

Masters are rendered under a neutral light and stay that way: they are the
archive, and a grade baked into them could never be taken back out. The room
is lit warm, so the shipped frames are graded to it here.

The measured ratio between the existing crew art and a neutral render is
(1.082, 1.081, 0.956), but applying it whole turns MOMO yellow: POKO is a tan
character and MOMO is a pink one, so that ratio carries POKO's albedo as well
as the room's light. Normalising it to hold luminance leaves the warmth and
drops the borrowed hue, which is the grade below.

MOMO still reads paler than the hand-drawn crew beside her. That is not the
light: her own artwork is paler. Matching them would mean repainting the
character, which is a different decision from lighting her.

Frames keep the master's fixed floor row after resizing, and every frame is
cropped to ONE horizontal window shared by the whole character rather than to
its own bounding box. Per-frame cropping moves the body axis by up to 10px
between frames of a walk, and a sprite anchored at 50% of its own width then
twitches sideways on every step.

    python3 scripts/export_sprites.py [--height 420]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('assets/sprites/momo')
DST = Path('public/assets/images/dokkaebi/momo')
# Measured ratio, normalised to hold luminance: warmth without the hue.
ROOM_LIGHT = np.array([1.040, 1.000, 0.940], np.float32)
FLOOR_ROW = 604          # every master puts the feet here
HEIGHT = 420             # 2x the 210px the room draws


def window(paths):
    """The horizontal span every frame of this character is cropped to: the
    union of them all, centred on the axis they were rendered about."""
    lo, hi = None, None
    for p in paths:
        b = Image.open(p).split()[3].getbbox()
        lo = b[0] if lo is None else min(lo, b[0])
        hi = b[2] if hi is None else max(hi, b[2])
    centre = Image.open(paths[0]).width / 2
    half = int(max(centre - lo, hi - centre)) + 2
    return int(centre - half), int(centre + half)


def grade(img, height, x0, x1):
    a = np.asarray(img).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] * ROOM_LIGHT, 0, 255)
    out = Image.fromarray(a.astype(np.uint8)).crop((x0, 0, x1, FLOOR_ROW))
    s = height / FLOOR_ROW
    return out.resize((max(1, round(out.width * s)), round(out.height * s)), Image.LANCZOS)


def main():
    height = HEIGHT
    if '--height' in sys.argv:
        height = int(sys.argv[sys.argv.index('--height') + 1])
    srcs = sorted(SRC.rglob('*.png'))
    x0, x1 = window(srcs)
    print(f'shared window x {x0}-{x1} ({x1 - x0}px of a {Image.open(srcs[0]).width}px frame)')
    n = total = 0
    for src in srcs:
        rel = src.relative_to(SRC)
        dst = (DST / rel).with_suffix('.webp')
        dst.parent.mkdir(parents=True, exist_ok=True)
        grade(Image.open(src), height, x0, x1).save(dst, 'WEBP', quality=90, method=6)
        total += dst.stat().st_size
        n += 1
    print(f'{n} frames -> {DST}   {total / 1024:.0f}KB total, {total / 1024 / n:.0f}KB each')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
