"""YOMI's back: push the growths in, then re-clothe what was pushed."""
import numpy as np, trimesh, debulge, reclothe

SRC, DST = 'neckless/yomi.glb', 'work_yomi_g.glb'
PROUD = 0.004
BURY = 0.006

s0 = trimesh.load(SRC, process=False)
V0 = np.asarray(s0.geometry[list(s0.geometry)[0]].vertices).astype(np.float64).copy()
debulge.debulge(SRC, '/tmp/_d.glb', 0.10, 0.27, proud=PROUD, taper=0.012, bury=BURY)

s = trimesh.load('/tmp/_d.glb', process=False)
g = s.geometry[list(s.geometry)[0]]
V = np.asarray(g.vertices).astype(np.float64)
F = np.asarray(g.faces)
uv = np.asarray(g.visual.uv).astype(np.float64)
N = np.asarray(g.vertex_normals).astype(np.float64)

moved = np.nonzero(np.abs(V[:, 2] - V0[:, 2]) > 0.002)[0]
mset = np.zeros(len(V), bool); mset[moved] = True
cen = V[F].mean(axis=1)
skin = F[(~mset[F].any(axis=1)) & (cen[:, 1] > 0.05) & (cen[:, 1] < 0.34)
         & (np.abs(cen[:, 0]) < 0.14) & (cen[:, 2] < 0.03)]
V2, F2, U2, N2, n, dist = reclothe.patch(V, F, uv, N, moved, skin)
print(f'{len(moved)} verts pushed in | {n} flap vertices re-clothed, '
      f'landed {dist.mean() * 1000:.2f}mm from the skin (max {dist.max() * 1000:.2f})')

m = trimesh.Trimesh(vertices=V2, faces=F2, process=False,
                    visual=trimesh.visual.TextureVisuals(uv=U2, material=g.visual.material))
m.vertex_normals = N2
m.export(DST)

back = (V2[:, 1] > 0.10) & (V2[:, 1] < 0.27) & (np.abs(V2[:, 0]) < 0.06) & (V2[:, 2] < -0.03)
coef, resid, _ = debulge.skin(V2[back], 0.008)
r = V2[back][:, 2] - debulge.basis(V2[back][:, 0], V2[back][:, 1]) @ coef
print(f'after: skin residual {resid * 1000:.1f}mm, worst remaining {r.min() * 1000:.1f}mm, '
      f'{(r < -0.006).sum()} verts still proud')
