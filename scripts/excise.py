"""Remove a lump by rebuilding the surface it interrupted.

Two earlier attempts failed for the same reason: both asked the lump about
its own neighbourhood. Relaxing toward neighbours moved the skin and not the
lump, because the lump carries more vertices than the skin does and its
vertices agree with each other. Pressing along the normal by the amount a
vertex stood proud of its three-ring neighbours under-measured for the same
reason, so the lump stayed and only gained a shadow.

This never asks the lump anything. It takes the ring of surface *outside* the
lump, fits a quadric to that ring alone, and moves everything inside onto the
fitted surface. A dense lump and a sparse one land in the same place, because
the place is decided by the skin around them.
"""
import sys
import numpy as np
import trimesh


def excise(src, dst, centre, r_in, r_out=None, falloff=0.25):
    r_out = r_out or r_in * 2.0
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V = np.asarray(g.vertices).copy().astype(np.float64)
    c = np.asarray(centre, float)
    d = np.linalg.norm(V - c, axis=1)
    ring = (d > r_in) & (d < r_out)
    inner = d <= r_in
    if ring.sum() < 12 or inner.sum() == 0:
        raise SystemExit(f'ring {ring.sum()} inner {inner.sum()} — nothing to do')

    R = V[ring]
    origin = R.mean(0)
    # Local frame from the ring alone: the smallest principal direction of the
    # ring is the surface normal there.
    _, _, vt = np.linalg.svd(R - origin, full_matrices=False)
    n = vt[2]
    e1, e2 = vt[0], vt[1]

    def local(P):
        q = P - origin
        return q @ e1, q @ e2, q @ n

    ru, rv, rw = local(R)
    A = np.stack([np.ones_like(ru), ru, rv, ru ** 2, ru * rv, rv ** 2], 1)
    coef, *_ = np.linalg.lstsq(A, rw, rcond=None)
    resid = float(np.abs(A @ coef - rw).mean())

    iu, iv, iw = local(V[inner])
    B = np.stack([np.ones_like(iu), iu, iv, iu ** 2, iu * iv, iv ** 2], 1)
    target_w = B @ coef
    # Full correction at the centre, tapering to none at the rim, so the
    # treated patch meets the untouched skin without a step.
    t = np.clip((d[inner] - r_in * (1 - falloff)) / (r_in * falloff), 0, 1)
    weight = 0.5 * (1 + np.cos(np.pi * (1 - t)))
    weight = 1 - weight
    moved = (target_w - iw) * weight
    V[inner] += moved[:, None] * n

    print(f'ring {ring.sum()} verts, quadric residual {resid * 1000:.2f}mm')
    print(f'inner {inner.sum()} verts moved, mean {np.abs(moved).mean() * 1000:.2f}mm,'
          f' max {np.abs(moved).max() * 1000:.2f}mm')
    g.vertices = V
    scene.export(dst)


if __name__ == '__main__':
    excise(sys.argv[1], sys.argv[2],
           centre=[float(x) for x in sys.argv[3].split(',')],
           r_in=float(sys.argv[4]),
           r_out=float(sys.argv[5]) if len(sys.argv) > 5 else None)
