"""Put a character's own hair colour back after a hair-texture pass.

Asking an image model for "chestnut-shaped hair" gets you the colour of a
chestnut as well as the shape, and the crew are told apart by colour. Asking
again costs credits and risks the face; this does not touch the face at all.

The hair is recoloured in HSV so the new short-pile shading survives: hue is
set to the character's own, saturation is scaled rather than replaced so the
light and dark fibres stay different from each other, and value is remapped to
the original hair's mean and spread. The horns are excluded — they are dyed
separately by soften_horns.py, which needs them still red to find them.
"""
import sys
import numpy as np
from PIL import Image

# Measured off each character's own original turnaround: hue in degrees,
# mean saturation, mean value, and the spread of value across the hair.
TARGET = {
    'momo': (15.8, 0.375, 0.940, 0.075),
    'nunu': (320.0, 0.220, 0.770, 0.075),
    'ruki': (44.0, 0.290, 0.680, 0.075),
    'yomi': (28.0, 0.580, 0.950, 0.075),
    'poko': (22.0, 0.450, 0.730, 0.075),
}


def to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    rm, gm, bm = (mx == r) & m, (mx == g) & m, (mx == b) & m
    h[rm] = ((g - b)[rm] / d[rm]) % 6
    h[gm] = (b - r)[gm] / d[gm] + 2
    h[bm] = (r - g)[bm] / d[bm] + 4
    return h * 60, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx


def to_rgb(h, s, v):
    h = (h % 360) / 60.0
    i = np.floor(h).astype(int) % 6
    f = h - np.floor(h)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    out = np.zeros(h.shape + (3,), np.float32)
    for k, (rr, gg, bb) in enumerate([(v, t, p), (q, v, p), (p, v, t),
                                      (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m] = np.stack([rr, gg, bb], -1)[m]
    return out


def hair_mask(rgb, alpha):
    """Hair is the saturated, non-cream material in the top of the figure —
    minus the horns, which are far redder than any hair here."""
    h, s, v = to_hsv(rgb / 255.0)
    solid = alpha > 40
    ys = np.nonzero(solid.any(1))[0]
    top, bot = ys.min(), ys.max()
    head = np.zeros_like(solid)
    head[top:int(top + (bot - top) * 0.46)] = True
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    horn = (r > 90) & (r > g * 2.4) & (r > b * 2.4) & (s > 0.6)
    return solid & head & (s > 0.40) & ~horn, (h, s, v)


def recolour(path, out_path, char):
    hue, sat, val, spread = TARGET[char]
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    m, (h, s, v) = hair_mask(rgb, alpha)
    if m.sum() == 0:
        raise SystemExit('no hair found')
    # Keep the fibre-to-fibre variation, move the average.
    s2 = np.clip(s * (sat / max(s[m].mean(), 1e-6)), 0, 1)
    vm, vs = v[m].mean(), max(v[m].std(), 1e-6)
    v2 = np.clip(val + (v - vm) * (spread / vs), 0, 1)
    h2 = np.full_like(h, hue) + (h - h[m].mean()) * 0.35
    new = to_rgb(h2, s2, v2) * 255.0
    w = m[..., None].astype(np.float32)
    a[..., :3] = rgb * (1 - w) + new * w
    Image.fromarray(a.astype(np.uint8)).save(out_path)
    print(f'{char}: {m.sum()} hair pixels recoloured'
          f' ({m.sum() / (alpha > 40).sum() * 100:.1f}% of figure)')


if __name__ == '__main__':
    recolour(sys.argv[1], sys.argv[2], sys.argv[3])
