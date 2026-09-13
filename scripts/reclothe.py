"""Give flattened geometry the texture of the skin it landed on.

Pushing a growth into the body fixes the silhouette and leaves its texture
behind: the tail's own beige and the red of its tip are still painted on the
faces, now lying flat across the briefs. Earlier attempts to paint that out in
the atlas failed, because finding the island by hand pulled in a neighbour's
black or missed the disc entirely.

The island does not have to be found. The faces that were moved are known, and
so is the skin they came to rest on, so each moved vertex can simply be given
the texture coordinate of the point on that skin it now sits on — barycentric,
from the nearest untouched triangle. The growth is not painted over; it is
re-clothed in the surface it is now part of.
"""
import numpy as np
from scipy.spatial import cKDTree


def closest_on_triangles(P, tri):
    """Closest point on each triangle to each point, pairwise (N, K, 3)."""
    a, b, c = tri[..., 0, :], tri[..., 1, :], tri[..., 2, :]
    ab, ac, ap = b - a, c - a, P[:, None, :] - a
    d1 = (ab * ap).sum(-1)
    d2 = (ac * ap).sum(-1)
    bp = P[:, None, :] - b
    d3 = (ab * bp).sum(-1)
    d4 = (ac * bp).sum(-1)
    cp = P[:, None, :] - c
    d5 = (ab * cp).sum(-1)
    d6 = (ac * cp).sum(-1)
    va = d3 * d6 - d5 * d4
    vb = d5 * d2 - d1 * d6
    vc = d1 * d4 - d3 * d2
    denom = np.where(np.abs(va + vb + vc) < 1e-20, 1e-20, va + vb + vc)
    v = np.clip(vb / denom, 0, 1)
    w = np.clip(vc / denom, 0, 1)
    s = np.clip(v + w, 1e-12, None)
    v, w = np.where(s > 1, v / s, v), np.where(s > 1, w / s, w)
    return a + ab * v[..., None] + ac * w[..., None], v, w


def reclothe(V, F, uv, moved, skin_faces, k=24):
    """Copy texture coordinates onto `moved` vertices from `skin_faces`."""
    tri = V[skin_faces]
    tree = cKDTree(tri.mean(axis=1))
    P = V[moved]
    _, idx = tree.query(P, k=min(k, len(skin_faces)))
    Q, v, w = closest_on_triangles(P, tri[idx])
    d = np.linalg.norm(Q - P[:, None, :], axis=-1)
    best = np.argmin(d, axis=1)
    rows = np.arange(len(P))
    f = skin_faces[idx[rows, best]]
    vv, ww = v[rows, best], w[rows, best]
    new = uv[f[:, 0]] * (1 - vv - ww)[:, None] + uv[f[:, 1]] * vv[:, None] + uv[f[:, 2]] * ww[:, None]
    out = uv.copy()
    out[moved] = new
    return out, d[rows, best]


def patch(V, F, uv, normals, moved, skin_faces):
    """Re-clothe every face that touches moved geometry, without disturbing
    the body: the faces get their own copies of the vertices they share with
    it, so only they see the new texture coordinates."""
    mset = np.zeros(len(V), bool)
    mset[moved] = True
    flap = mset[F].any(axis=1)
    verts = np.unique(F[flap])
    new_uv, dist = reclothe(V, F, uv, verts, skin_faces)
    add = np.arange(len(verts)) + len(V)
    remap = dict(zip(verts.tolist(), add.tolist()))
    F2 = F.copy()
    sub = F2[flap]
    F2[flap] = np.vectorize(lambda i: remap.get(i, i))(sub)
    V2 = np.vstack([V, V[verts]])
    U2 = np.vstack([uv, new_uv[verts]])
    N2 = np.vstack([normals, normals[verts]]) if normals is not None else None
    return V2, F2, U2, N2, len(verts), dist
