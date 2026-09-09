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

Frames keep the master's fixed floor row after resizing, so the whole set
still shares one anchor once it is on the page.

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


def grade(img, height):
    a = np.asarray(img).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] * ROOM_LIGHT, 0, 255)
    out = Image.fromarray(a.astype(np.uint8))
    # Crop to the floor row so the anchor survives the resize, and trim the
    # empty sides that only exist to hold a turning character.
    box = out.split()[3].getbbox()
    out = out.crop((box[0], 0, box[2], FLOOR_ROW))
    s = height / FLOOR_ROW
    return out.resize((max(1, round(out.width * s)), round(out.height * s)), Image.LANCZOS)


def main():
    height = HEIGHT
    if '--height' in sys.argv:
        height = int(sys.argv[sys.argv.index('--height') + 1])
    n = total = 0
    for src in sorted(SRC.rglob('*.png')):
        rel = src.relative_to(SRC)
        dst = (DST / rel).with_suffix('.webp')
        dst.parent.mkdir(parents=True, exist_ok=True)
        grade(Image.open(src), height).save(dst, 'WEBP', quality=90, method=6)
        total += dst.stat().st_size
        n += 1
    print(f'{n} frames -> {DST}   {total / 1024:.0f}KB total, {total / 1024 / n:.0f}KB each')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
