"""Press a lump back into the surface it grew out of.

Relaxing the neighbourhood does not work here. The lump carries more vertices
than the skin around it, so each of its vertices agrees with the ones next to
it and barely moves, while the sparse surface around it gets pulled inward —
which turns a bump into a bump in a crater.

So measure instead. How far each vertex stands proud of its three-ring
neighbourhood, along its own normal, is a number; subtracting that number
moves the lump back to where the surface would have been, and leaves a flat
surface flat because there the number is nearly zero. A cosine falloff over
the sphere keeps the treatment from ending in a crease.
"""
import sys
import numpy as np
import trimesh
import scipy.sparse as sp


def press(src, dst, centre, radius, rounds=6, rings=3):
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V, F = np.asarray(g.vertices).copy(), np.asarray(g.faces)
    uniq, inv = np.unique(np.round(V, 6), axis=0, return_inverse=True)
    Fw = inv[F]
    n = len(uniq)
    P = uniq.astype(np.float64)
    e = np.vstack([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]])
    e = np.vstack([e, e[:, ::-1]])
    A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
    A = (A > 0).astype(float)
    R = A.copy()
    for _ in range(rings - 1):
        R = ((R @ A) > 0).astype(float)
    R.setdiag(0)
    R.eliminate_zeros()
    degR = np.maximum(np.asarray(R.sum(1)).ravel(), 1)
    c = np.asarray(centre, float)
    d = np.linalg.norm(P - c, axis=1)
    w = np.clip(0.5 * (1 + np.cos(np.pi * np.clip(d / radius, 0, 1))), 0, 1)
    before = P.copy()
    for _ in range(rounds):
        tri = P[Fw]
        fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        VN = np.zeros_like(P)
        for k in range(3):
            np.add.at(VN, Fw[:, k], fn)
        VN /= np.maximum(np.linalg.norm(VN, axis=1, keepdims=True), 1e-12)
        bump = ((P - (R @ P) / degR[:, None]) * VN).sum(1)
        # Only push outward bumps in; never pull a dent further in.
        push = np.clip(bump, 0, None) * w * 0.7
        P -= push[:, None] * VN
    shift = np.linalg.norm(P - before, axis=1)
    print(f'{(shift > 1e-6).sum()} vertices pressed, max {shift.max() * 1000:.2f}mm')
    g.vertices = P[inv]
    scene.export(dst)


if __name__ == '__main__':
    press(sys.argv[1], sys.argv[2],
          centre=[float(x) for x in sys.argv[3].split(',')],
          radius=float(sys.argv[4]))
