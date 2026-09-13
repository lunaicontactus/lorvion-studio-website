"""Knock the spikes off the surface without smoothing the character.

The reconstruction left the hair covered in small hard scales — it read as a
pine cone rather than fur — and a bump on the back of the briefs. Smoothing
the whole mesh would fix both and cost the thing being protected: the fur
silhouette and the soft fabric edges.

So only the outliers move. For every vertex, how far it stands proud of the
average of its neighbours, measured along its own normal; anything past the
threshold is eased back toward that average, a few times over, recomputing
each round so a spike that flattens stops being touched. Measured on MOMO the
median vertex stands 0.10mm proud and the worst 8.5mm, so a threshold near
1.1mm leaves 95 percent of the body exactly where it was.

Positions only. Topology, UVs, texture and materials are untouched.
"""
import sys
import numpy as np
import trimesh
import scipy.sparse as sp


def despike(src, dst, threshold_mm=1.1, alpha=0.55, rounds=8):
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V, F = np.asarray(g.vertices).copy(), np.asarray(g.faces)
    uniq, inv = np.unique(np.round(V, 6), axis=0, return_inverse=True)
    Fw = inv[F]
    n = len(uniq)
    e = np.vstack([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]])
    e = np.vstack([e, e[:, ::-1]])
    A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
    A.data[:] = 1.0
    deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
    P = uniq.astype(np.float64)
    t = threshold_mm / 1000.0
    moved_total = np.zeros(n, bool)
    for r in range(rounds):
        nb = (A @ P) / deg[:, None]
        disp = nb - P
        tri = P[Fw]
        fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        VN = np.zeros_like(P)
        for k in range(3):
            np.add.at(VN, Fw[:, k], fn)
        VN /= np.maximum(np.linalg.norm(VN, axis=1, keepdims=True), 1e-12)
        protr = -(disp * VN).sum(1)
        hit = protr > t
        if not hit.any():
            break
        P[hit] += alpha * disp[hit]
        moved_total |= hit
        print(f'  round {r + 1}: {hit.sum():5d} vertices eased'
              f'  (max protrusion {protr.max() * 1000:.2f}mm)')
    shift = np.linalg.norm(P - uniq, axis=1)
    print(f'moved {moved_total.sum()} of {n} vertices'
          f' ({moved_total.sum() / n * 100:.1f}%),'
          f' mean shift {shift[moved_total].mean() * 1000:.2f}mm,'
          f' max {shift.max() * 1000:.2f}mm')
    g.vertices = P[inv]
    scene.export(dst)


if __name__ == '__main__':
    despike(sys.argv[1], sys.argv[2],
            threshold_mm=float(sys.argv[3]) if len(sys.argv) > 3 else 1.1)
