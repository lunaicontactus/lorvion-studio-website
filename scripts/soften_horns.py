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

HEAD = 0.30          # horns live in the top third of the figure and nowhere else
CORE = (2.8, 0.66)   # red/green, saturation — the horn and nothing but
GROW = (2.0, 0.45)   # what the horn is allowed to spread into


def horn_mask(rgb, alpha):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    solid = alpha > 40
    rg = r / np.maximum(g, 1)
    rb = r / np.maximum(b, 1)
    ys = np.nonzero(solid.any(1))[0]
    if len(ys) == 0:
        return np.zeros_like(solid)
    top, bot = ys.min(), ys.max()
    head = np.zeros_like(solid)
    head[top:int(top + (bot - top) * HEAD)] = True

    core = solid & head & (r > 90) & (rg > CORE[0]) & (rb > CORE[0]) & (sat > CORE[1])
    grow = solid & head & (rg > GROW[0]) & (rb > GROW[0]) & (sat > GROW[1])

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


def soften(path, out_path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3]
    m = horn_mask(rgb, alpha)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Coral: red eased down, green and blue lifted a long way, so a glossy
    # wound becomes a soft matte nub. Shading inside the horn is preserved
    # because the source channel still carries it.
    coral = np.stack([
        np.clip(r * 0.94 + 22, 0, 255),
        np.clip(g * 0.52 + 104, 0, 255),
        np.clip(b * 0.46 + 88, 0, 255)], axis=-1)
    w = m[..., None].astype(np.float32)
    a[..., :3] = rgb * (1 - w) + coral * w
    Image.fromarray(a.astype(np.uint8)).save(out_path)
    ys = np.nonzero(m.any(1))[0]
    where = 'none' if len(ys) == 0 else f'rows {ys.min()}-{ys.max()}'
    print(f'  {os.path.basename(out_path):18} {m.sum():6d} px   {where}')
    return m


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    for v in ['front', 'side', 'back']:
        for sfx in ['', '_alpha']:
            soften(f'{src}/{v}{sfx}.png', f'{dst}/{v}{sfx}.png')
