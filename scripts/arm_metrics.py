"""Read an arm pose off a picture, so two pictures can be compared as numbers.

Five things, each as a fraction of the figure's own height, so a reference at
1402 pixels and a render at 640 can be held against each other:

  shoulder   where the arms first push past the torso
  hand       where they stop
  reach      how far the outer edge gets from the middle
  torso      the body's own half-width beside them
  gap        the daylight between arm and body at the armpit

The angle nobody measures. It is what these five come out to.
"""
import sys
import numpy as np
from PIL import Image


def runs(mask, min_len=3):
    out, s = [], None
    for x, v in enumerate(mask):
        if v and s is None:
            s = x
        elif not v and s is not None:
            if x - s > min_len:
                out.append((s, x))
            s = None
    if s is not None and len(mask) - s > min_len:
        out.append((s, len(mask)))
    return out


def figure(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im)
    if a.shape[2] == 4 and a[..., 3].min() < 250:
        fig = a[..., 3] > 40
    else:
        rgb = a[..., :3].astype(float)
        bg = np.median(np.concatenate([rgb[:30, :30].reshape(-1, 3),
                                       rgb[:30, -30:].reshape(-1, 3)]), axis=0)
        fig = np.abs(rgb - bg).sum(-1) > 24
    return fig


def measure(path, label):
    fig = figure(path)
    ys, xs = np.nonzero(fig)
    top, bot = ys.min(), ys.max()
    h = bot - top
    # The middle, taken low where only the body is, never across the arms.
    low = fig[int(top + h * 0.88)]
    r = runs(low)
    cx = (r[0][0] + r[-1][1]) / 2 if r else (xs.min() + xs.max()) / 2

    gaps, torso_w, reach, arm_rows = [], [], [], []
    for i in range(int(h * 0.40), int(h * 0.95)):
        row = runs(fig[top + i])
        if len(row) == 3:
            arm_rows.append(i / h)
            gaps.append(min(row[1][0] - row[0][1], row[2][0] - row[1][1]) / h)
            torso_w.append((row[1][1] - row[1][0]) / 2 / h)
            reach.append(max(cx - row[0][0], row[2][1] - cx) / h)
    # Where the arms start and stop: the band that is wider than the body is.
    widths = np.array([(lambda rr: (rr[-1][1] - rr[0][0]) / h if rr else 0)(runs(fig[top + i]))
                       for i in range(h)])
    body = np.median(widths[int(h * 0.86):int(h * 0.95)])
    wide = np.nonzero(widths[int(h * 0.45):int(h * 0.85)] > body * 1.08)[0]
    sh = (wide.min() + int(h * 0.45)) / h if len(wide) else float('nan')
    hand = (wide.max() + int(h * 0.45)) / h if len(wide) else float('nan')

    print(f'{label:16} shoulder {sh:5.3f}  hand {hand:5.3f}  reach {np.max(reach) if reach else float("nan"):5.3f}'
          f'  torso {np.median(torso_w) if torso_w else float("nan"):5.3f}'
          f'  gap {np.median(gaps) if gaps else float("nan"):5.3f}'
          f'  (gap seen on {len(gaps)} rows)')
    return dict(sh=sh, hand=hand,
                reach=float(np.max(reach)) if reach else None,
                torso=float(np.median(torso_w)) if torso_w else None,
                gap=float(np.median(gaps)) if gaps else None)


if __name__ == '__main__':
    for p in sys.argv[1:]:
        measure(p, p.split('/')[-2] + '/' + p.split('/')[-1][:14])
