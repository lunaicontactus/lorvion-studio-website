"""Small copies of the EUNGARAGE lockup, for where it is shown 44 px tall.

PHASE K. The footer (every page) and the press kit's previews showed the
1871x360 lockup (85-89 KB) at 44 px; 132 px tall is that size three times
over, sharp on any phone. The full-size files stay, for download.

    python3 scripts/logo_small.py
"""
from pathlib import Path

from PIL import Image

B = Path(__file__).resolve().parent.parent / 'public/assets/images/brand'
H = 132

for name in ('eungarage_logo_lockup', 'eungarage_logo_lockup_light'):
    src = B / (f'{name}.png' if name == 'eungarage_logo_lockup' else f'{name}.webp')
    im = Image.open(src).convert('RGBA')
    w = round(im.width * H / im.height)
    out = B / f'{name}_sm.webp'
    im.resize((w, H), Image.LANCZOS).save(out, 'WEBP', quality=92, method=6)
    print(out.name, (w, H), out.stat().st_size)
