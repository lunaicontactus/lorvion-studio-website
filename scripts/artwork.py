#!/usr/bin/env python3
"""Put the studio's real work on the studio's wall.

Every image here was made for the game it belongs to — a key visual, a
marketing poster, an in-game background. Nothing is generated for the website
and nothing is a placeholder, which is why the sources are written out one by
one rather than globbed: a glob would quietly pick up a draft.

Two sizes come out of each source, because the wall and the viewer want
different things:

  <id>-wall.webp   long edge 560 — the print hanging in the room, which is at
                   most ~200 world units across and never fills a screen
  <id>-full.webp   long edge 1600 — what opens when the visitor clicks it

Neither is cropped. The aspect ratio written into the manifest is the source's
own, and everything downstream sizes its frame from that number rather than
deciding on a shape first and squeezing the picture into it.

    python3 scripts/artwork.py            # write assets and print the manifest
"""
from __future__ import annotations

import os
import sys
from PIL import Image

HOME = os.path.expanduser('~/Desktop')
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'public/assets/images/artwork')

WALL_EDGE = 560
FULL_EDGE = 1600

# id, project id, source, what it is.
# `repo:` sources already live here; the rest are read out of the project that
# made them, on this machine, and are not committed anywhere but here.
PIECES = [
    ('lunai-keyart', 'lunai', 'repo:public/assets/images/lunai-keyart.webp', 'keyart'),
    ('liminal-keyart', 'liminal', 'repo:public/assets/images/liminal-keyart.webp', 'keyart'),
    ('wormup-keyart', 'wormup', 'repo:public/assets/images/worm-up-keyart.webp', 'keyart'),
    ('rubato-opera', 'rubato',
     'RUBATO/RUBATO/game/assets/bg/bg_court_opera_auditorium.jpg', 'still'),
    ('lumiora-splash', 'lumiora',
     'lumiora/lumiora-app/assets/branding/lumiora_splash_world.webp', 'keyart'),
]


def resolve(src: str) -> str:
    return os.path.join(REPO, src[5:]) if src.startswith('repo:') else os.path.join(HOME, src)


def orientation(w: int, h: int) -> str:
    if h > w * 1.05:
        return 'portrait'
    if w > h * 1.05:
        return 'landscape'
    return 'square'


def write(im: Image.Image, path: str, edge: int, quality: int) -> tuple[int, int]:
    out = im.copy()
    # Only ever down. An image smaller than the target is left alone rather
    # than blown up into a softer copy of itself.
    if max(out.size) > edge:
        out.thumbnail((edge, edge), Image.LANCZOS)
    out.save(path, 'WEBP', quality=quality, method=6)
    return out.size


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    rows = []
    missing = []
    for pid, project, src, kind in PIECES:
        path = resolve(src)
        if not os.path.exists(path):
            missing.append((pid, path))
            continue
        im = Image.open(path).convert('RGB')
        w, h = im.size
        ww, wh = write(im, os.path.join(OUT, f'{pid}-wall.webp'), WALL_EDGE, 84)
        fw, fh = write(im, os.path.join(OUT, f'{pid}-full.webp'), FULL_EDGE, 82)
        wall_kb = os.path.getsize(os.path.join(OUT, f'{pid}-wall.webp')) // 1024
        full_kb = os.path.getsize(os.path.join(OUT, f'{pid}-full.webp')) // 1024
        rows.append((pid, project, kind, w, h, ww, wh, fw, fh, wall_kb, full_kb))
        print(f'{pid:16s} {project:8s} {kind:7s} src {w}x{h} '
              f'({orientation(w, h)}, {w / h:.3f})  wall {ww}x{wh} {wall_kb}KB  '
              f'full {fw}x{fh} {full_kb}KB')

    if missing:
        print('\nMISSING — nothing was written for these:', file=sys.stderr)
        for pid, path in missing:
            print(f'  {pid}: {path}', file=sys.stderr)
        return 1

    print('\n--- for src/data/artwork.ts ---')
    for pid, project, kind, w, h, *_ in rows:
        print(f"  {{ id: '{pid}', projectId: '{project}', kind: '{kind}', "
              f"width: {w}, height: {h} }},  // {orientation(w, h)} {w / h:.3f}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
