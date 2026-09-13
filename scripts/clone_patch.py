"""Clone clean fabric over where the tail was.

Filling with one colour leaves a bald disc in the middle of a leopard print,
and diffusing from the atlas reaches into whatever happens to sit next to the
island — which on this model is the eyes. Neighbours have to be found on the
surface.

So every texel of the patch is taken back to the 3D point it paints, shifted
sideways along the body onto clean briefs, and the colour at that new point is
looked up through the same UVs. The print comes with it, and nothing outside
the patch is touched.
"""
import sys
import numpy as np
import trimesh
from PIL import Image


def barycentric_grid(p, W, H):
    x0, x1 = int(np.floor(p[:, 0].min())), int(np.ceil(p[:, 0].max()))
    y0, y1 = int(np.floor(p[:, 1].min())), int(np.ceil(p[:, 1].max()))
    x0, y0 = max(x0, 0), max(y0, 0)
    x1, y1 = min(x1, W - 1), min(y1, H - 1)
    if x1 <= x0 or y1 <= y0:
        return None
    yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
    v0, v1, v2 = p
    den = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1])
    if abs(den) < 1e-9:
        return None
    a = ((v1[1] - v2[1]) * (xx - v2[0]) + (v2[0] - v1[0]) * (yy - v2[1])) / den
    b = ((v2[1] - v0[1]) * (xx - v2[0]) + (v0[0] - v2[0]) * (yy - v2[1])) / den
    c = 1 - a - b
    hit = (a >= -0.02) & (b >= -0.02) & (c >= -0.02)
    return yy[hit], xx[hit], a[hit], b[hit], c[hit]


def clone(src, dst, centre, radius, shift):
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V, F = np.asarray(g.vertices), np.asarray(g.faces)
    uv = np.asarray(g.visual.uv)
    img = g.visual.material.baseColorTexture.convert('RGB')
    W, H = img.size
    tex = np.asarray(img).astype(np.float32)
    # glTF puts the UV origin at the top left, but this exporter's atlas reads
    # the other way round; FLIP is set from which one actually moves the pixels
    # the render shows.
    FLIP = __import__('os').environ.get('UVFLIP', '1') == '1'
    vv = (1 - uv[:, 1]) if FLIP else uv[:, 1]
    px = np.stack([uv[:, 0] * (W - 1), vv * (H - 1)], 1)

    d = np.linalg.norm(V - np.asarray(centre, float), axis=1)
    faces = F[(d[F] <= radius).all(1)]
    print(f'{len(faces)} faces over the patch')

    rows, cols, pts = [], [], []
    for tri in faces:
        r = barycentric_grid(px[tri], W, H)
        if r is None:
            continue
        yy, xx, a, b, c = r
        rows.append(yy); cols.append(xx)
        pts.append(a[:, None] * V[tri[0]] + b[:, None] * V[tri[1]] + c[:, None] * V[tri[2]])
    if not rows:
        raise SystemExit('nothing rasterised')
    rows = np.concatenate(rows); cols = np.concatenate(cols); pts = np.vstack(pts)
    print(f'{len(rows)} texels to repaint')

    # Take each point sideways onto clean fabric and read the colour there.
    # Nearest vertex rather than nearest surface point: an exact closest-point
    # query wants an R-tree that is not installed here, and on a mesh this
    # dense the nearest vertex is under a millimetre away.
    src_pts = pts + np.asarray(shift, float)
    from scipy.spatial import cKDTree
    tree = cKDTree(V)
    dist, vid = tree.query(src_pts)
    print(f'clone source: nearest vertex {dist.mean() * 1000:.2f}mm away on average')
    suv = uv[vid]
    sx = np.clip((suv[:, 0] * (W - 1)).astype(int), 0, W - 1)
    svv = (1 - suv[:, 1]) if FLIP else suv[:, 1]
    sy = np.clip((svv * (H - 1)).astype(int), 0, H - 1)

    out = tex.copy()
    out[rows, cols] = tex[sy, sx]
    g.visual.material.baseColorTexture = Image.fromarray(out.astype(np.uint8))
    scene.export(dst)
    print('cloned')


if __name__ == '__main__':
    clone(sys.argv[1], sys.argv[2],
          centre=[float(x) for x in sys.argv[3].split(',')],
          radius=float(sys.argv[4]),
          shift=[float(x) for x in sys.argv[5].split(',')])
