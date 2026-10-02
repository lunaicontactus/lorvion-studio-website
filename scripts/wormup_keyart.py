"""
WORM UP! (Steam) key art, put together from the game's own pictures.

    python3 scripts/wormup_keyart.py

The Steam build has no poster yet. Its title screen is the studio's own
painting of the burrow village (`bg_u_burrow_village`, the user's picture #1)
with the game's logo over it; this does the same in portrait for the works
page and the garage wall: a slice of that painting at its own resolution
(nothing scaled up), the logo, and the worm as a child on the path. Nothing
is generated; every pixel is from WORM UP's assets.

Writes public/assets/images/wormup-steam-keyart.webp (529 x 941); then
`python3 scripts/artwork.py` makes the wall and full copies from it.
"""
import os
from PIL import Image

W = os.path.expanduser('~/Projects/worm-up/steam/assets')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'images', 'wormup-steam-keyart.webp')

bg = Image.open(f'{W}/bg/bg_u_burrow_village.webp').convert('RGBA')
logo = Image.open(f'{W}/ui/ui_u_title_logo.webp').convert('RGBA')
worm = Image.open(f'{W}/ch/ch_u_worm_child__look.webp').convert('RGBA')

# The cave with the bridge and the lantern, a 9:16 slice at the painting's height.
H = bg.height
Wd = round(H * 9 / 16)
X0 = 575
art = bg.crop((X0, 0, X0 + Wd, H))

# The logo across the top, as on the title screen.
lw = round(Wd * 0.9)
lg = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
art.alpha_composite(lg, ((Wd - lw) // 2, 34))

# The worm on the lower path, looking up the way it has to go.
ww = round(Wd * 0.34)
wm = worm.resize((ww, round(worm.height * ww / worm.width)), Image.LANCZOS)
FLOOR = 708  # the path's surface in the painting
art.alpha_composite(wm, (round(Wd * 0.18), FLOOR - wm.height + 6))

art.convert('RGB').save(OUT, 'WEBP', quality=90, method=6)
print(f'{os.path.relpath(OUT)}: {art.width} x {art.height}')
