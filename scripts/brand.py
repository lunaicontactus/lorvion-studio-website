#!/usr/bin/env python3
"""Every brand file the site serves, derived from the three approved sources.

    python3 scripts/brand.py

Sources (the user's approved v02 set, delivered 2026-09-15/16, kept unmodified
in assets/brand-v02/):
  eungarage_logo_lockup_v02.png  transparent lockup: mark, wordmark, tagline
  eungarage_app_icon_v02.png     1254² app icon on a black rounded-corner canvas
  eungarage_og_v02.png           1672×941 share image

Nothing is redrawn. Two things are derived rather than scaled:
  * the nav logo is the lockup without its tagline — at nav height the tagline
    is five pixels tall, which is noise, not a line of text;
  * the light variants (for the dark sub-pages) recolour the wordmark and
    tagline only, to the off-white the user's own OG image uses for them on a
    night sky; the mark is left exactly as drawn, as it is in that image;
  * the icon's black corners are cut to transparency (favicon, PWA "any") or
    cropped away inside the rounded square (apple-touch, maskable — both are
    masked by the OS, and black corners would show through that mask).
"""
from __future__ import annotations

import os
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'assets/brand-v02')
IMG = os.path.join(HERE, 'public/assets/images')
BRAND = os.path.join(IMG, 'brand')

# Measured off the lockup: the wordmark occupies rows 291–426 right of the
# mark (which ends at column 662); the tagline is rows 472–503.
MARK_RIGHT = 700
TAGLINE_TOP = 440


def trim(im: Image.Image, pad: int = 0) -> Image.Image:
    a = np.asarray(im.getchannel('A'))
    ys, xs = np.nonzero(a > 8)
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                    min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad)))


def fit_h(im: Image.Image, h: int) -> Image.Image:
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


# The wordmark colour on the approved OG image's night sky, sampled.
LIGHT_INK = (238, 240, 245)


def light(im: Image.Image, mark_right: int) -> Image.Image:
    a = np.asarray(im).copy()
    a[:, mark_right:, 0] = LIGHT_INK[0]
    a[:, mark_right:, 1] = LIGHT_INK[1]
    a[:, mark_right:, 2] = LIGHT_INK[2]
    return Image.fromarray(a)


def corners_clear(icon: Image.Image) -> Image.Image:
    """Black outside the rounded square becomes transparent. Flood-filled from
    the four corners so black inside the art is never touched."""
    rgb = np.asarray(icon.convert('RGB')).astype(int)
    h, w, _ = rgb.shape
    dark = rgb.max(axis=2) < 14
    out = np.zeros((h, w), bool)
    q = deque([(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)])
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or out[y, x] or not dark[y, x]:
            continue
        out[y, x] = True
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    rgba = np.dstack([rgb, np.where(out, 0, 255)]).astype(np.uint8)
    return Image.fromarray(rgba)


def inset_square(icon: Image.Image) -> Image.Image:
    """The largest square inside the rounded corners, with no black in it."""
    rgb = np.asarray(icon.convert('RGB')).astype(int)
    n = rgb.shape[0]
    for k in range(0, n // 4):
        if all(rgb[k + d, k + d].max() >= 14 for d in range(3)) and \
           all(rgb[n - 1 - k - d, n - 1 - k - d].max() >= 14 for d in range(3)):
            return icon.crop((k + 2, k + 2, n - k - 2, n - k - 2))
    raise SystemExit('icon: could not find an inset square without black')


def main() -> int:
    os.makedirs(BRAND, exist_ok=True)
    lockup = trim(Image.open(os.path.join(SRC, 'eungarage_logo_lockup_v02.png')).convert('RGBA'), 6)
    lockup_full = fit_h(lockup, 360)
    lockup_full.save(os.path.join(BRAND, 'eungarage_logo_lockup.webp'), quality=92, method=6)
    lockup_full.save(os.path.join(BRAND, 'eungarage_logo_lockup.png'), optimize=True)

    raw_full = Image.open(os.path.join(SRC, 'eungarage_logo_lockup_v02.png')).convert('RGBA')
    fit_h(trim(light(raw_full, MARK_RIGHT), 6), 360).save(
        os.path.join(BRAND, 'eungarage_logo_lockup_light.webp'), quality=92, method=6)

    raw = Image.open(os.path.join(SRC, 'eungarage_logo_lockup_v02.png')).convert('RGBA')
    a = np.asarray(raw).copy()
    a[TAGLINE_TOP:, MARK_RIGHT:, 3] = 0
    nav = trim(Image.fromarray(a), 4)
    fit_h(nav, 128).save(os.path.join(BRAND, 'eungarage_logo_nav.webp'), quality=92, method=6)
    fit_h(trim(light(Image.fromarray(a), MARK_RIGHT), 4), 128).save(
        os.path.join(BRAND, 'eungarage_logo_nav_light.webp'), quality=92, method=6)

    icon = Image.open(os.path.join(SRC, 'eungarage_app_icon_v02.png')).convert('RGB')
    clear = corners_clear(icon)
    for size, name in ((512, 'favicon.png'), (192, 'icon-192.png'), (512, 'icon-512.png')):
        clear.resize((size, size), Image.LANCZOS).save(os.path.join(IMG, name), optimize=True)
    clear.resize((48, 48), Image.LANCZOS).save(os.path.join(IMG, 'favicon-48.png'), optimize=True)
    square = inset_square(icon)
    square.resize((180, 180), Image.LANCZOS).save(os.path.join(HERE, 'public/apple-touch-icon.png'), optimize=True)
    square.resize((512, 512), Image.LANCZOS).save(os.path.join(IMG, 'icon-maskable-512.png'), optimize=True)

    og = Image.open(os.path.join(SRC, 'eungarage_og_v02.png')).convert('RGB')
    og = og.resize((1200, round(og.height * 1200 / og.width)), Image.LANCZOS)  # 1200×675
    extra = og.height - 630
    top = extra // 4  # the logo is at the top; take most of the trim off the ground
    og.crop((0, top, 1200, top + 630)).save(os.path.join(IMG, 'og-image.jpg'), quality=88, optimize=True, progressive=True)

    print('brand files written')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
