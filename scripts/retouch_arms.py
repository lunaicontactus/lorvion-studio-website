"""An attempt to fix the arm silhouette on the sprite. It does not work.

Kept because the failure is worth knowing about before anyone tries it again.


The mesh has no rig and its arm root is a cylinder welded to the side of the
torso. Rotated down it reads as a fin; rotated further it reads as a part
bolted on; and absorbing the joint into the body starts melting the two
together. The shape wanted here — a soft toy with no shoulder, where the body
simply becomes the arm — is not in that topology, so it is not reachable by
moving its vertices.

The site ships 420-pixel sprites. This works on those.

The idea was to slide the material outside the torso inward, row by row, so
the arm would keep its width and only change position. It fails for a reason
that is obvious afterwards: the distance to slide differs from row to row, so
sliding each row by its own amount shears the arm instead of moving it. What
comes out is a flat smear with the shading in the wrong place — the inner
shadow, which was drawn against open air, ends up pressed against the body,
and the rounded edge that read as a limb is gone.

Sliding every row by one constant amount avoids the shear and does not close
the gap, which varies down the arm; that is the whole problem restated.

What this silhouette actually needs is the arm redrawn with its shading — a
paint job, not a transform. Moving pixels cannot invent the light on a surface
that has turned to face somewhere else.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter


def runs(row, gap=2):
    out, s = [], None
    for x, v in enumerate(row):
        if v and s is None:
            s = x
        elif not v and s is not None:
            if x - s > gap:
                out.append((s, x))
            s = None
    if s is not None and len(row) - s > gap:
        out.append((s, len(row)))
    return out


def torso_edges(solid, top, fh, cx):
    """The body's own outline, with the arms taken out of it.

    Read where the arms stand clear of it, then carried up through the rows
    where the two have merged — which is where the shoulder is, and the whole
    reason this is needed.
    """
    # Strictly below the jaw. The first version started at 0.44 of the
    # figure, which on this character is the ears, and the slide took bites
    # out of them. The arms separate from the body at 0.60 and the shoulder
    # they merge into runs from about 0.50; above that is head.
    lo, hi = int(top + fh * 0.50), int(top + fh * 0.92)
    known = {}
    for y in range(lo, hi):
        r = runs(solid[y])
        if len(r) == 3:
            known[y] = (r[1][0], r[1][1])
    if len(known) < 8:
        return None
    ys = sorted(known)
    # Above the first row where they separate, hold the body's width and let
    # it taper the way the neck does.
    left = {y: known[y][0] for y in ys}
    right = {y: known[y][1] for y in ys}
    first = ys[0]
    for y in range(lo, first):
        t = (first - y) / max(first - lo, 1)
        # Toward the neck the body narrows; follow the row it does have.
        left[y] = left[first] + t * (left[first] - cx) * -0.22
        right[y] = right[first] + t * (right[first] - cx) * -0.22
    return left, right


def _unused():
    return None


def retouch(src, dst, close_to=2, feather=0.7, report=True):
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im).astype(np.uint8).copy()
    al = a[..., 3]
    H, W = al.shape
    solid = al > 40
    ys, xs = np.nonzero(solid)
    top, bot = ys.min(), ys.max()
    fh = bot - top
    base = solid[int(top + fh * 0.88)]
    c = np.nonzero(base)[0]
    cx = int((c.min() + c.max()) / 2)

    edges = torso_edges(solid, top, fh, cx)
    if edges is None:
        if report:
            print(f'  {Path(src).name}: arms never separate; left alone')
        Image.fromarray(a).save(dst)
        return 0
    left_edge, right_edge = edges

    out = a.copy()
    moved_rows = 0
    for y in sorted(left_edge):
        row = solid[y]
        if not row.any():
            continue
        r = runs(row)
        for side in (-1, +1):
            if side < 0:
                strip_to = int(round(left_edge[y]))
                xs_out = [x for x in range(0, strip_to) if row[x]]
            else:
                strip_to = int(round(right_edge[y]))
                xs_out = [x for x in range(strip_to, W) if row[x]]
            if not xs_out:
                continue
            near = max(xs_out) if side < 0 else min(xs_out)
            gap = (strip_to - near) if side < 0 else (near - strip_to)
            shift = int(round(max(gap - close_to, 0)))
            if shift <= 0:
                continue
            lo_x, hi_x = min(xs_out), max(xs_out) + 1
            strip = a[y, lo_x:hi_x].copy()
            out[y, lo_x:hi_x] = 0
            nlo = lo_x + side * -shift if side < 0 else lo_x - shift
            nlo = max(0, min(W - (hi_x - lo_x), nlo + (shift if side < 0 else 0)))
            # Move the whole strip toward the body; the hand goes with it.
            target = lo_x + shift if side < 0 else lo_x - shift
            target = max(0, min(W - (hi_x - lo_x), target))
            keep = out[y, target:target + (hi_x - lo_x)]
            take = strip[..., 3] > keep[..., 3]
            keep[take] = strip[take]
            moved_rows += 1

    res = Image.fromarray(out)
    if feather:
        # Only the alpha, and only a little: the cut edges are hard.
        alpha = res.getchannel('A').filter(ImageFilter.GaussianBlur(feather))
        res.putalpha(alpha)
    res.save(dst)
    if report:
        print(f'  {Path(src).name}: {moved_rows} rows slid in')
    return moved_rows


if __name__ == '__main__':
    s, d = Path(sys.argv[1]), Path(sys.argv[2])
    d.mkdir(parents=True, exist_ok=True)
    for f in sorted(s.glob('*.webp')):
        retouch(f, d / f.name)
