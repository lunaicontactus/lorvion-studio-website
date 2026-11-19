"""Large front pictures of the mochi crew, for cards and pages (EUNGARAGE 2.0).

From the cut-outs (scripts/mochi_cutout.py), scaled down only — never up:
640 px tall at most, WebP with alpha. 임레븐's only art so far is the small
figure on the six-crew sheet, so its picture stays its own size until an
original arrives.

    python3 scripts/mochi_portraits.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CUT = ROOT / 'assets/crew-mochi/cut'
OUT = ROOT / 'public/assets/images/crew-mochi'
MAX_H = 640

for cid in ('momo', 'nunu', 'ruki', 'poko', 'yomi', 'reven'):
    im = Image.open(CUT / f'{cid}_portrait.png').convert('RGBA')
    if im.height > MAX_H:
        im = im.resize((round(im.width * MAX_H / im.height), MAX_H), Image.LANCZOS)
    path = OUT / cid / f'{cid}_portrait.webp'
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=88, method=6)
    print(path.relative_to(ROOT), im.size, path.stat().st_size // 1024, 'KB')
