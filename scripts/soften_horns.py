"""Take the lacquer out of the horns and touch nothing else.

The first attempt handed the whole figure to an image model to change one
colour, and the model rewrote the fur, the face and the fabric on the way
past. So this changes the colour arithmetically instead.

Finding the horn is the whole problem, because the leopard print on the
briefs is also red. Measured on MOMO, the horn runs red/green 3.20 at
saturation .68 and the print runs 2.07 at .56 — far apart at the core and
overlapping at the edges, where the horn softens into the hair. So the mask
is grown rather than thresholded: a strict rule finds the horn cores in the
top of the figure, and the region spreads from there through merely-reddish
neighbours. The print never touches a core, so the spread never reaches it.
"""
import sys, os
from collections import deque
import numpy as np
from PIL import Image

HEAD = 0.28          # horns live in the top quarter; the eyes start below it
CORE = (2.5, 0.50)   # red/green, saturation — the horn and nothing but
DARK = 0.72          # and darker than the hair, which is the other red thing
GROW = (2.0, 0.45)   # what the horn is allowed to spread into


def horn_mask(rgb, alpha):
    """The horns, and not the hair or the eyes.

    Three things on this figure are red: the horns, the hair and the shadowed
    side of the eyes. The hair is the brightest of them, so value separates it;
    the eyes sit below the top quarter of the figure, so height separates them.
    What is left is grown outward through merely-reddish neighbours to catch
    the soft edge where a horn meets the fringe.
    """
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    val = mx / 255.0
    solid = alpha > 40
    rg = r / np.maximum(g, 1)
    rb = r / np.maximum(b, 1)
    ys = np.nonzero(solid.any(1))[0]
    if len(ys) == 0:
        return np.zeros_like(solid)
    top, bot = ys.min(), ys.max()
    head = np.zeros_like(solid)
    head[top:int(top + (bot - top) * HEAD)] = True

    core = solid & head & (r > 90) & (rg > CORE[0]) & (rb > CORE[0]) \
        & (sat > CORE[1]) & (val < DARK)
    grow = solid & head & (rg > GROW[0]) & (rb > GROW[0]) & (sat > GROW[1]) \
        & (val < DARK + 0.08)

    out = core.copy()
    q = deque(zip(*np.nonzero(core)))
    h, w = out.shape
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not out[ny, nx] and grow[ny, nx]:
                out[ny, nx] = True
                q.append((ny, nx))
    return out


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
        mk = i == k
        out[mk] = np.stack([rr, gg, bb], -1)[mk]
    return out


def soften(path, out_path, hue=10.0, sat=0.62, lift=0.45):
    """Dye the horn coral in HSV, not by mixing channels.

    Mixing channels was the first attempt and it works on a bright horn and
    ruins a dark one: the constants added to green and blue swamp a shadowed
    red pixel and it comes out olive. Setting hue and easing saturation
    leaves every pixel as red as its own shading says it should be, and
    lifting value keeps the shadowed side of the horn from going muddy.
    """
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    m = horn_mask(rgb, alpha)
    h, s, v = to_hsv(rgb / 255.0)
    h2 = np.full_like(h, hue)
    s2 = np.clip(s * sat, 0, 0.55)
    v2 = np.clip(lift + v * (1 - lift), 0, 1)
    new = to_rgb(h2, s2, v2) * 255.0
    w = m[..., None].astype(np.float32)
    a[..., :3] = rgb * (1 - w) + new * w
    Image.fromarray(a.astype(np.uint8)).save(out_path)
    ys = np.nonzero(m.any(1))[0]
    where = 'none' if len(ys) == 0 else f'rows {ys.min()}-{ys.max()}'
    if m.sum():
        print(f'  {os.path.basename(out_path):18} {m.sum():6d} px   {where}'
              f'   -> rgb {tuple(int(q) for q in a[..., :3][m].mean(0))}')
    return m


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for v in ['front', 'side', 'back']:
        for sfx in ['', '_alpha']:
            soften(f'{src}/{v}{sfx}.png', f'{dst}/{v}{sfx}.png')
