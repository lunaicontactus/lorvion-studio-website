"""
Turnaround sheet -> the three clean plates Meshy takes as input.

Every crew turnaround is the same picture: three views of one dokkaebi on a
flat cream ground, front | side | back, left to right. The sheets are not all
the same size (1448x1086 for MOMO and NUNU, 1536x1024 for the rest), so the
cut is found rather than hard-coded.

The ground is sampled from the four corners, so the mask is "not the ground"
rather than a fixed colour. The two seams are the emptiest column in the
window where a seam has to be — the T-pose fingertips of neighbouring views
come within a few dozen pixels of each other, which is too narrow to find by
looking for a wide gap, but the emptiest column between two figures is still
unmistakably empty.

    python3 scripts/cut_views.py <sheet.png> <out_dir> <prefix>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

PAD = 0.18          # of the figure's own width, as MOMO's hand-cut plates had
SEAMS = ((0.26, 0.42), (0.58, 0.74))   # where a seam between views must fall
# Three of the five sheets carry FRONT / SIDE / BACK captions under the
# figures. They are part of the drawing and not part of the character, and a
# reconstructor handed them will happily model the lettering into the floor,
# so the bottom of the sheet is trimmed to the lowest foot.
FEET_BAND = 0.55    # captions never appear above this fraction of the height


def main(sheet, out_dir, prefix):
    im = Image.open(sheet).convert('RGB')
    a = np.asarray(im).astype(np.int16)
    h, w = a.shape[:2]
    ground = np.median(
        np.concatenate([a[:12, :12].reshape(-1, 3), a[:12, -12:].reshape(-1, 3),
                        a[-12:, :12].reshape(-1, 3), a[-12:, -12:].reshape(-1, 3)]),
        axis=0)
    mask = np.abs(a - ground).sum(axis=2) > 24

    # Three of the five sheets carry FRONT / SIDE / BACK captions under the
    # figures. They are part of the drawing, not part of the character, and a
    # reconstructor handed them will model the lettering into the floor.
    #
    # A caption is the last band of ink on the sheet, separated from the
    # figures by a blank strip and much shorter than they are. Cutting at the
    # blank strip rather than at a guessed fraction matters: the toes come
    # within a few pixels of the caption, and cutting high enough to be safe
    # from the lettering cuts the feet off.
    occupied = mask.any(axis=1)
    runs, start = [], None
    for i, on in enumerate(occupied):
        if on and start is None:
            start = i
        elif not on and start is not None:
            runs.append((start, i)); start = None
    if start is not None:
        runs.append((start, len(occupied)))
    if len(runs) >= 2 and (runs[-1][1] - runs[-1][0]) < 0.12 * h:
        cut = (runs[-2][1] + runs[-1][0]) // 2
        mask, a, im, h = mask[:cut], a[:cut], im.crop((0, 0, w, cut)), cut

    height = mask.sum(axis=0)

    cuts = [0]
    for lo, hi in SEAMS:
        lo, hi = int(w * lo), int(w * hi)
        cuts.append(lo + int(np.argmin(height[lo:hi])))
    cuts.append(w)

    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    for name, lo, hi in zip(('front', 'left', 'back'), cuts, cuts[1:]):
        band = mask[:, lo:hi]
        xs, ys = np.where(band.any(axis=0))[0], np.where(band.any(axis=1))[0]
        x0, x1 = lo + int(xs[0]), lo + int(xs[-1]) + 1
        y0, y1 = int(ys[0]), int(ys[-1]) + 1
        pad = int((x1 - x0) * PAD)
        box = (x0 - pad, max(0, y0 - pad), x1 + pad, min(h, y1 + pad))
        # The plate keeps its full padding even where that runs off the panel,
        # so the figure stays centred; anything outside the panel is ground.
        # Padding blindly would otherwise drag in the fingertips of the
        # neighbouring view, which the seam sits only a few pixels clear of.
        plate = Image.new('RGB', (box[2] - box[0], box[3] - box[1]),
                          tuple(int(c) for c in ground))
        keep = (max(box[0], lo), box[1], min(box[2], hi), box[3])
        plate.paste(im.crop(keep), (keep[0] - box[0], 0))
        p = out / f'{prefix}_{name}.png'
        plate.save(p)
        print(f'{p.name}  {plate.width}x{plate.height}   figure {x1-x0}x{y1-y0}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(*sys.argv[1:4]))
