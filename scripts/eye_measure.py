#!/usr/bin/env python3
"""Where POKO's eyes are, in each pose, as fractions of the frame.

The boss wears glasses for the whole of the mini-game, and a pair of glasses
that sits at one guessed spot is a pair of glasses that is on the forehead in
half the poses. So they are measured: the two dark clusters in the upper half
of the frame are the eyes, and what is written out is their centre and how far
apart they are, both as fractions of the frame's own size.

Measured off the frames themselves, so nothing is drawn and nothing is moved.

    python3 scripts/eye_measure.py
"""
from __future__ import annotations

import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'public/assets/images/dokkaebi-v2/poko')

# The poses the game shows, and the frame it measures (the first of each).
POSES = [('idle', 'front'), ('look', 'front'), ('work', 'front'),
         ('work', 'back'), ('sit', 'front'), ('walk', 'left'), ('walk', 'right')]


def eyes(path: str) -> tuple[float, float, float] | None:
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    alpha = a[..., 3]
    rgb = a[..., :3]
    h, w = alpha.shape
    # Dark, opaque, and in the top half: the eyes, and not much else on a
    # character this pale.
    dark = (rgb.max(axis=2) < 110) & (alpha > 200)
    dark[int(h * 0.62):, :] = False
    ys, xs = np.nonzero(dark)
    if len(xs) < 20:
        return None
    # Two clusters, split at the median x.
    mid = np.median(xs)
    left = xs[xs < mid]
    right = xs[xs >= mid]
    if len(left) < 5 or len(right) < 5:
        return None
    cx = (left.mean() + right.mean()) / 2
    cy = ys.mean()
    apart = right.mean() - left.mean()
    return cx / w, cy / h, apart / w


def main() -> int:
    for action, direction in POSES:
        first = os.path.join(ROOT, action, direction, f'poko_{action}_{direction}_01.webp')
        if not os.path.exists(first):
            print(f"{action}/{direction}: no frames")
            continue
        got = eyes(first)
        if got is None:
            print(f"{action}/{direction}: no eyes found")
            continue
        x, y, apart = got
        # The glasses are a little wider than the eyes are apart.
        print(f"  {action}_{direction}: [{x:.3f}, {y:.3f}, {apart * 1.55:.3f}],")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
