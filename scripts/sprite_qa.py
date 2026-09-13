"""Check every shipped frame's edges.

Fur is mostly edge, so the alpha border is where a sprite goes wrong: a pale
rim from compositing against white, a dark rim from compositing against black,
or an ear clipped off because the crop window was too tight. None of that is
visible at the size the room draws these, which is exactly why it needs
measuring rather than looking.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image


def check(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    h, w = alpha.shape
    solid = alpha > 250
    edge = (alpha > 8) & (alpha <= 250)
    out = []
    if solid.sum() == 0:
        return ['empty frame']

    # A rim is a rim only against the body it sits on.
    if edge.sum() > 20:
        body = rgb[solid].mean()
        rim = rgb[edge].mean()
        if rim > body + 26:
            out.append(f'pale rim (+{rim - body:.0f})')
        if rim < body - 26:
            out.append(f'dark rim (-{body - rim:.0f})')

    # Anything solid touching the canvas edge has been cut off — except the
    # bottom, which is the floor the frame is cropped to and where the feet
    # are supposed to be. The room anchors the frame's bottom edge at the
    # standing point, so feet that stop short of it are the fault worth
    # catching, not feet that reach it.
    if solid[0].any():
        out.append('clipped at top')
    if solid[:, 0].any():
        out.append('clipped at left')
    if solid[:, -1].any():
        out.append('clipped at right')

    # Headroom: the crop must not shave the horns or the hair.
    ys = np.nonzero((alpha > 8).any(1))[0]
    if ys.min() < 2:
        out.append(f'no headroom (top at {ys.min()})')
    gap = (h - 1) - ys.max()
    if gap > 4:
        out.append(f'feet {gap}px above the floor line')
    return out


def main(root):
    bad = 0
    n = 0
    for p in sorted(Path(root).rglob('*.webp')):
        n += 1
        problems = check(p)
        if problems:
            bad += 1
            print(f'  {p.relative_to(root)}: {", ".join(problems)}')
    print(f'{n} frames checked, {bad} with findings')
    return 1 if bad else 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1]))
