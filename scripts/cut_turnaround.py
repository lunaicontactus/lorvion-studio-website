"""Cut a three-view turn-around sheet into clean front/side/back references.

Same treatment as the originals: the background is keyed by a flood fill that
grows only from the border, so cream-coloured skin in the middle of the figure
is never mistaken for empty air; the contact shadow goes; one scale per
character taken from the front view, so the three views still agree; every
sheet lands on the same floor line.
"""
import sys, os
import numpy as np
from collections import deque
from PIL import Image

CANVAS, TARGET, BASE = 1024, 860, 0.94
VIEWS = ['front', 'side', 'back']


def panels(fig, w):
    """The three figures, as column spans.

    Empty columns are the obvious separator and they are not always there:
    on a sheet where the front view's fingertips nearly touch the side view's
    hair the gap is three pixels of *thin*, not of *nothing*. So a run that is
    plainly two figures wide is split at its own quietest column instead.
    """
    cols = fig.sum(0)
    runs, start = [], None
    for x in range(w):
        if cols[x] > 4 and start is None:
            start = x
        elif cols[x] <= 4 and start is not None:
            if x - start > w * 0.05:
                runs.append((start, x))
            start = None
    if start is not None and w - start > w * 0.05:
        runs.append((start, w))
    while len(runs) > 0 and len(runs) < 3:
        i = max(range(len(runs)), key=lambda k: runs[k][1] - runs[k][0])
        x0, x1 = runs[i]
        m = int((x1 - x0) * 0.22)
        inner = cols[x0 + m:x1 - m]
        if len(inner) == 0:
            break
        cut = x0 + m + int(np.argmin(inner))
        runs[i:i + 1] = [(x0, cut), (cut, x1)]
    return sorted(runs)


def largest_blob(alpha):
    """Keep only the figure.

    Splitting a sheet between two figures that nearly touch leaves a sliver of
    the neighbour's hair at the edge of the crop. It is a few hundred pixels of
    the right colour in the wrong place, which is exactly the sort of thing an
    image-to-3D model will dutifully build a lump for.
    """
    solid = alpha > 0.3
    h, w = solid.shape
    seen = np.zeros_like(solid, np.int32)
    best, best_n = 0, 0
    label = 0
    for sy in range(h):
        for sx in range(w):
            if not solid[sy, sx] or seen[sy, sx]:
                continue
            label += 1
            n = 0
            q = deque([(sy, sx)])
            seen[sy, sx] = label
            while q:
                y, x = q.popleft()
                n += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = label
                        q.append((ny, nx))
            if n > best_n:
                best, best_n = label, n
    out = alpha.copy()
    out[(seen != best)] = 0.0
    return out


def matte(sub, bg):
    d = np.abs(sub.astype(np.float32) - bg).sum(-1)
    near = d < 34
    h, w = near.shape
    seen = np.zeros_like(near, bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x]:
                q.append((y, x)); seen[y, x] = True
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x]:
                q.append((y, x)); seen[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and near[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    alpha = np.clip((d - 14) / 22.0, 0, 1)
    alpha[seen] = 0.0
    return alpha


def main(src, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    im = Image.open(src).convert('RGB')
    a = np.asarray(im); h, w, _ = a.shape
    bg = np.median(np.concatenate([a[:40, :40].reshape(-1, 3), a[:40, -40:].reshape(-1, 3)]), axis=0)
    fig = np.abs(a.astype(np.float32) - bg).sum(-1) > 26
    runs = panels(fig, w)
    if len(runs) != 3:
        raise SystemExit(f'expected 3 panels, found {len(runs)}: {runs}')
    cuts = []
    for x0, x1 in runs:
        pad = 14
        sub = a[:, max(0, x0 - pad):min(w, x1 + pad)]
        al = matte(sub, bg)
        al = largest_blob(al)
        img = Image.fromarray(np.dstack([sub, (al * 255).astype(np.uint8)]))
        bb = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        cuts.append(img.crop(bb))
    s = TARGET / cuts[0].height
    for v, img in zip(VIEWS, cuts):
        r = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
        for bgc, sfx in (((255, 255, 255, 255), ''), ((0, 0, 0, 0), '_alpha')):
            c = Image.new('RGBA', (CANVAS, CANVAS), bgc)
            c.alpha_composite(r, ((CANVAS - r.width) // 2, max(0, int(CANVAS * BASE) - r.height)))
            (c.convert('RGB') if sfx == '' else c).save(f'{out_dir}/{v}{sfx}.png')
        print(v, r.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
