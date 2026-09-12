"""Remove the litter the reconstruction left behind, and nothing else.

Welding by position first matters: with the UV seams left split the mesh
looks like 1,307 pieces, which is a fact about texture coordinates and not
about geometry. Welded, MOMO is one body of 26,220 vertices and 68 crumbs of
twenty to eighty vertices each, two to twelve millimetres across, floating in
the hair. Those crumbs are the flecks that made the head read like a pine
cone instead of fur.

This does not smooth, decimate or reshape anything. It deletes faces that
belong to a component other than the body.
"""
import sys
import collections
import numpy as np
import trimesh
import scipy.sparse as sp
from scipy.sparse.csgraph import connected_components


def clean(src, dst):
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V, F = np.asarray(g.vertices), np.asarray(g.faces)
    _, inv = np.unique(np.round(V, 6), axis=0, return_inverse=True)
    Fw = inv[F]
    n = inv.max() + 1
    e = np.vstack([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]])
    A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n))
    _, lab = connected_components(A, directed=False)
    body = collections.Counter(lab).most_common(1)[0][0]
    keep = lab[Fw[:, 0]] == body
    dropped = (~keep).sum()
    g.update_faces(keep)
    g.remove_unreferenced_vertices()
    print(f'kept {keep.sum()} faces, dropped {dropped}'
          f' ({dropped / len(keep) * 100:.2f}%) in {len(set(lab)) - 1} fragments')
    print(f'now {len(g.vertices)} verts / {len(g.faces)} faces')
    scene.export(dst)
    return g


if __name__ == '__main__':
    clean(sys.argv[1], sys.argv[2])
