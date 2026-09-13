"""Push anything standing proud of the back into the back.

YOMI grew two things where no reference has any: a curled tail and, below it,
a thin flap along the same seam. Neither is a bump that `excise.py` can rebuild
a patch over — the tail is seventy millimetres tall, the flap is a sheet — and
both sit on the one surface in the model that is simple: the back of the hips,
which is a single smooth sheet with no features of its own.

So the back is measured rather than the growths. A polynomial surface is fitted
to the back, then refitted five more times with whatever sits behind it thrown
out, so the growths cannot vote on where the skin is. Whatever is still behind
the fitted skin by more than a threshold is moved onto it, along z, tapered by
how far out it stood: a flap's tip travels, its root does not, and the body
itself never moves at all.
"""
import sys
import numpy as np
import trimesh


def basis(x, y):
    return np.stack([np.ones_like(x), x, y, x ** 2, x * y, y ** 2,
                     x ** 3, x ** 2 * y, x * y ** 2, y ** 3, x ** 4], 1)


def skin(P, proud, rounds=6):
    """Least squares through the back, with what stands behind it removed."""
    keep = np.ones(len(P), bool)
    for _ in range(rounds):
        A = basis(P[keep, 0], P[keep, 1])
        coef, *_ = np.linalg.lstsq(A, P[keep, 2], rcond=None)
        resid = P[:, 2] - basis(P[:, 0], P[:, 1]) @ coef
        keep = resid > -proud
        if keep.sum() < 40:
            raise SystemExit('the back fit ran out of skin')
    return coef, float(np.abs(resid[keep]).mean()), int((~keep).sum())


def debulge(src, dst, y_lo, y_hi, x_band=0.06, proud=0.008, bury=0.002, taper=0.02):
    scene = trimesh.load(src, process=False)
    g = scene.geometry[list(scene.geometry)[0]]
    V = np.asarray(g.vertices).copy().astype(np.float64)

    back = (V[:, 1] > y_lo) & (V[:, 1] < y_hi) & (np.abs(V[:, 0]) < x_band) & (V[:, 2] < -0.03)
    coef, resid, dropped = skin(V[back], proud)

    idx = np.nonzero(back)[0]
    target = basis(V[idx, 0], V[idx, 1]) @ coef
    out = V[idx, 2] < target - proud
    hit = idx[out]
    depth = np.clip((target[out] - proud - V[hit, 2]) / taper, 0, 1)
    w = 0.5 - 0.5 * np.cos(np.pi * depth)
    moved = (target[out] + bury - V[hit, 2]) * w
    V[hit, 2] += moved

    print(f'{src.split("/")[-1]}: back {back.sum()} verts, skin residual {resid * 1000:.1f}mm,'
          f' {dropped} ignored as growth | {len(hit)} verts pushed in,'
          f' mean {moved.mean() * 1000:.1f}mm, max {moved.max() * 1000:.1f}mm')
    g.vertices = V
    scene.export(dst)


if __name__ == '__main__':
    debulge(sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]),
            proud=float(sys.argv[5]) if len(sys.argv) > 5 else 0.008)
