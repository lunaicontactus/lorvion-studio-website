"""The garage behind the works, archive and info pages, out of focus.

PHASE K. Those pages blur the room 16 px and turn it down to 30 % (src/styles/
works.css), so a small copy of the painting reads the same as the 3,600-px
original: rendered and compared, the mean difference is under 1/255 at
1440x900 and 2560x1440 (landscape, 480 px) and at 390x844 @3x (portrait,
120 px). Made by resizing; nothing drawn.

    python3 scripts/backdrops.py
"""
from pathlib import Path

from PIL import Image

G = Path(__file__).resolve().parent.parent / 'public/assets/images/garage'
SIZES = {'room_landscape': (480, 160), 'room_portrait': (120, 286)}

for name, size in SIZES.items():
    out = G / f'{name}_backdrop.webp'
    Image.open(G / f'{name}.webp').convert('RGB').resize(size, Image.LANCZOS).save(out, 'WEBP', quality=70, method=6)
    print(out.name, size, out.stat().st_size)
