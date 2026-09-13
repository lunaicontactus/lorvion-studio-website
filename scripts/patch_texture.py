"""Paint out what the mesh fix could not reach.

Flattening the lump leaves its colour behind: the reconstruction painted a
cream disc onto the briefs and the UV island carrying it is still mapped to
the now-flat patch.

Diffusing from the surrounding texels was the first attempt and it is wrong in
an atlas. Texels that touch in the atlas belong to unrelated parts of the
model, so the fill reached into the eyes and dragged black across the briefs.
Neighbours have to be found in 3D, not in texture space: the faces in a shell
around the lump are rasterised too, and their texels are what the patch is
filled from.
"""
import sys
import numpy as np
import trimesh
from PIL import Image, ImageFilter


def rasterise(faces, uv, W, H, mask):
    px = np.stack([uv[:, 0] * (W - 1), (1 - uv[:, 1]) * (H - 1)], 1)
    for tri in faces:
        p = px[tri]
        x0, x1 = int(np.floor(p[:, 0].min())), int(np.ceil(p[:, 0].max()))
        y0, y1 = int(np.floor(p[:, 1].min())), int(np.ceil(p[:, 1].max()))
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, W - 1), min(y1, H - 1)
        if x1 <= x0 or y1 <= y0:
            continue
        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
        v0, v1, v2 = p
        den = (v1[1] - v2[1]) * (v0[0] - v2[0]) + (v2[0] - v1[0]) * (v0[1] - v2[1])
        if abs(den) < 1e-9:
            continue
        a = ((v1[1] - v2[1]) * (xx - v2[0]) + (v2[0] - v1[0]) * (yy - v2[1])) / den
        b = ((v2[1] - v0[1]) * (xx - v2[0]) + (v0[0] - v2[0]) * (yy - v2[1])) / den
        c = 1 - a - b
        hit = (a >= -0.02) & (b >= -0.02) & (c >= -0.02)
        mask[yy[hit], xx[hit]] = True


def patch(src, dst, centre, radius, ring_outer=None, grow=2):
    ring_outer = ring_outer or radius * 2.2
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V, F = np.asarray(g.vertices), np.asarray(g.faces)
    uv = np.asarray(g.visual.uv)
    img = g.visual.material.baseColorTexture.convert('RGB')
    W, H = img.size
    tex = np.asarray(img).astype(np.float32)

    d = np.linalg.norm(V - np.asarray(centre, float), axis=1)
    # Every vertex inside, not merely one: a face with a single vertex in the
    # sphere can stretch a long way out of it, and its texels belong to skin
    # the patch has no business repainting.
    inner_faces = F[(d[F] <= radius).all(1)]
    ring_faces = F[((d[F] > radius) & (d[F] <= ring_outer)).all(1)]

    inner = np.zeros((H, W), bool)
    ring = np.zeros((H, W), bool)
    rasterise(inner_faces, uv, W, H, inner)
    rasterise(ring_faces, uv, W, H, ring)
    for _ in range(grow):
        m = inner.copy()
        m[1:] |= inner[:-1]; m[:-1] |= inner[1:]
        m[:, 1:] |= inner[:, :-1]; m[:, :-1] |= inner[:, 1:]
        inner = m
    ring &= ~inner
    print(f'patch {inner.sum()} texels, reference ring {ring.sum()} texels'
          f' from {len(ring_faces)} faces around the lump')
    if ring.sum() < 200:
        raise SystemExit('ring too small to sample from')

    fill = np.median(tex[ring], axis=0)
    print(f'fill colour {tuple(int(v) for v in fill)}')
    out = tex.copy()
    out[inner] = fill
    # Soften the join so the patch does not read as a decal.
    blurred = np.asarray(Image.fromarray(out.astype(np.uint8))
                         .filter(ImageFilter.GaussianBlur(3))).astype(np.float32)
    edge = inner.copy()
    for _ in range(4):
        m = edge.copy()
        m[1:] |= edge[:-1]; m[:-1] |= edge[1:]
        m[:, 1:] |= edge[:, :-1]; m[:, :-1] |= edge[:, 1:]
        edge = m
    band = edge & ~inner
    out[band] = blurred[band]
    g.visual.material.baseColorTexture = Image.fromarray(out.astype(np.uint8))
    scene.export(dst)
    print('texture patched')


if __name__ == '__main__':
    patch(sys.argv[1], sys.argv[2],
          centre=[float(x) for x in sys.argv[3].split(',')],
          radius=float(sys.argv[4]))
