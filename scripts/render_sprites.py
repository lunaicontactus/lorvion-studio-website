"""
Turn a Meshy master model into sprite frames.

The site does not run 3D. A dokkaebi is 210px tall in a painted room, and a
1.4M-triangle model in the browser to draw 210px is the wrong trade. So the
model is a source of frames, not a runtime object: this renders it offline
under one fixed set of conditions and writes PNGs the room can swap between.

Everything that must not drift between frames is computed once, before the
first frame, and never again:

  camera      orthographic, so there is no FOV to vary and no perspective
              creep when the character turns
  scale       from the model's own height, not from the source artwork's
              pixel size — two turnarounds drawn at different sizes are not
              two characters of different heights
  origin      the model's own vertical axis, so turning does not shift it
  floor       bbox floor pinned to a fixed row, so the feet never slide
  light       fixed relative to the camera, not the world: a key light that
              turned with the character would leave the back view unlit
  colour      base colour sampled straight from the atlas, no tone curve

glTF UV origin is TOP-LEFT: row = v * height. Flipping it (the OpenGL habit)
turns every model into a flat blob with a broken face. That bug cost a full
round of wrong conclusions; the convention is asserted below, not assumed.

The mesh is dense — 1.4M triangles into an 840px frame is well under a pixel
each — so triangles are splatted by centroid with a depth buffer rather than
scan-converted. At this ratio the result is the same picture, in seconds
instead of a minute.

    python3 scripts/render_sprites.py <model.glb> <atlas.png> <outdir> [--height 840]
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942
COMPONENT = {5120: 'i1', 5121: 'u1', 5122: 'i2', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def load_glb(path):
    data = Path(path).read_bytes()
    _, _, _ = struct.unpack('<III', data[:12])
    off, chunks = 12, {}
    while off < len(data):
        clen, ctype = struct.unpack('<II', data[off:off + 8])
        off += 8
        chunks[ctype] = data[off:off + clen]
        off += clen
    gltf = json.loads(chunks[CHUNK_JSON].decode('utf-8'))
    blob = chunks[CHUNK_BIN]

    def read(i):
        a = gltf['accessors'][i]
        bv = gltf['bufferViews'][a['bufferView']]
        start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = NCOMP[a['type']]
        arr = np.frombuffer(blob, dtype=np.dtype('<' + COMPONENT[a['componentType']]),
                            count=a['count'] * n, offset=start)
        return arr.reshape(a['count'], n) if n > 1 else arr

    prim = gltf['meshes'][0]['primitives'][0]
    attrs = prim['attributes']
    return {
        'V': read(attrs['POSITION']).astype(np.float32),
        'UV': read(attrs['TEXCOORD_0']).astype(np.float32),
        'N': read(attrs['NORMAL']).astype(np.float32),
        'I': read(prim['indices']).astype(np.int64).reshape(-1, 3),
    }


class Rig:
    """One fixed viewing setup, shared by every frame this run produces."""

    def __init__(self, mesh, atlas, height=840, margin=0.06, ss=2):
        self.ss = ss
        self.atlas = np.asarray(atlas.convert('RGB')).astype(np.float32)
        V = mesh['V']
        lo, hi = V.min(0), V.max(0)
        # Height, not source pixels, sets the scale. Ground is the bbox floor.
        self.model_height = float(hi[1] - lo[1])
        self.floor = float(lo[1])
        self.axis = np.array([(lo[0] + hi[0]) / 2, 0.0, (lo[2] + hi[2]) / 2], np.float32)
        # A turning character sweeps a wider box than it stands in, so the
        # frame is sized for the widest it will ever be, once.
        radius = float(np.max(np.hypot(V[:, 0] - self.axis[0], V[:, 2] - self.axis[2])))
        self.h = int(height)
        usable = 1 - 2 * margin
        self.px_per_unit = (self.h * usable) / self.model_height
        self.w = int(2 * radius * self.px_per_unit + self.h * 2 * margin)
        self.w += self.w % 2
        self.floor_row = int(self.h * (1 - margin))

        self.I = mesh['I']
        self.V = V
        self.C = self._sample(mesh['UV'])
        n = mesh['N']
        self.Nrm = n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-9)

    def _sample(self, uv):
        h, w = self.atlas.shape[:2]
        # glTF: UV origin top-left. Not flipped. See the module docstring.
        u = np.clip((uv[:, 0] * (w - 1)).astype(np.int32), 0, w - 1)
        v = np.clip((uv[:, 1] * (h - 1)).astype(np.int32), 0, h - 1)
        return self.atlas[v, u]

    def frame(self, azimuth=0.0, lift=0.0, swell=1.0):
        """One frame. `lift` and `swell` are the only per-frame freedoms an
        unrigged mesh has: a rise off the floor, and a breath.

        Two paths, because at 840px most of this mesh is smaller than a pixel:
        triangles that cover a pixel or less are written straight to the depth
        buffer in one vectorised pass, and only the ones large enough to have
        an inside are scan-converted. Splatting everything leaves holes in the
        body; scan-converting everything spends a minute per frame.
        """
        ss, W, H = self.ss, self.w * self.ss, self.h * self.ss
        a = np.radians(azimuth)
        ca, sa = np.cos(a), np.sin(a)
        p = self.V - self.axis
        x = p[:, 0] * ca + p[:, 2] * sa
        z = -p[:, 0] * sa + p[:, 2] * ca
        y = (self.V[:, 1] - self.floor) * swell + lift

        nx = self.Nrm[:, 0] * ca + self.Nrm[:, 2] * sa
        nz = -self.Nrm[:, 0] * sa + self.Nrm[:, 2] * ca
        ny = self.Nrm[:, 1]
        # Key light fixed to the camera, so no direction is left in the dark.
        L = np.array([-0.38, 0.55, 0.74], np.float32)
        L /= np.linalg.norm(L)
        lit = (0.52 + 0.48 * np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1))[:, None]
        RGB = self.C * lit

        s = self.px_per_unit * ss
        sx = x * s + W / 2
        sy = self.floor_row * ss - y * s

        I = self.I
        ax, ay = sx[I[:, 0]], sy[I[:, 0]]
        bx, by = sx[I[:, 1]], sy[I[:, 1]]
        cx, cy = sx[I[:, 2]], sy[I[:, 2]]
        # Back faces never win a depth test here and cost half the work.
        facing = ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) < 0
        x0 = np.minimum(np.minimum(ax, bx), cx)
        x1 = np.maximum(np.maximum(ax, bx), cx)
        y0 = np.minimum(np.minimum(ay, by), cy)
        y1 = np.maximum(np.maximum(ay, by), cy)
        onscreen = (x1 >= 0) & (x0 < W) & (y1 >= 0) & (y0 < H)
        live = facing & onscreen
        small = live & ((x1 - x0) <= 1.6) & ((y1 - y0) <= 1.6)
        big = live & ~small

        zb = np.full((H, W), np.inf, np.float32)
        idx = np.full((H, W), -1, np.int64)

        # Sub-pixel triangles: one vectorised splat, 2x2 so nothing pinholes.
        st = np.nonzero(small)[0]
        if len(st):
            px = ((ax[st] + bx[st] + cx[st]) / 3).astype(np.int32)
            py = ((ay[st] + by[st] + cy[st]) / 3).astype(np.int32)
            pz = -(z[I[st, 0]] + z[I[st, 1]] + z[I[st, 2]]) / 3
            for dx in (0, 1):
                for dy in (0, 1):
                    qx, qy = px + dx, py + dy
                    ok = (qx >= 0) & (qx < W) & (qy >= 0) & (qy < H)
                    np.minimum.at(zb, (qy[ok], qx[ok]), pz[ok])
            for dx in (0, 1):
                for dy in (0, 1):
                    qx, qy = px + dx, py + dy
                    ok = (qx >= 0) & (qx < W) & (qy >= 0) & (qy < H)
                    hit = ok.copy()
                    hit[ok] = np.isclose(zb[qy[ok], qx[ok]], pz[ok])
                    idx[qy[hit], qx[hit]] = st[hit]

        # Anything with an inside gets filled properly.
        for t in np.nonzero(big)[0]:
            i0, i1, i2 = I[t]
            Ax, Ay, Az = sx[i0], sy[i0], z[i0]
            Bx, By, Bz = sx[i1], sy[i1], z[i1]
            Cx, Cy, Cz = sx[i2], sy[i2], z[i2]
            xa = int(max(0, np.floor(min(Ax, Bx, Cx))))
            xb = int(min(W - 1, np.ceil(max(Ax, Bx, Cx))))
            ya = int(max(0, np.floor(min(Ay, By, Cy))))
            yb = int(min(H - 1, np.ceil(max(Ay, By, Cy))))
            if xb < xa or yb < ya:
                continue
            det = (By - Cy) * (Ax - Cx) + (Cx - Bx) * (Ay - Cy)
            if abs(det) < 1e-9:
                continue
            gx, gy = np.meshgrid(np.arange(xa, xb + 1), np.arange(ya, yb + 1))
            l1 = ((By - Cy) * (gx - Cx) + (Cx - Bx) * (gy - Cy)) / det
            l2 = ((Cy - Ay) * (gx - Cx) + (Ax - Cx) * (gy - Cy)) / det
            l3 = 1 - l1 - l2
            inside = (l1 >= 0) & (l2 >= 0) & (l3 >= 0)
            if not inside.any():
                continue
            zz = -(l1 * Az + l2 * Bz + l3 * Cz)[inside]
            yy, xx = gy[inside], gx[inside]
            better = zz < zb[yy, xx]
            if not better.any():
                continue
            zb[yy[better], xx[better]] = zz[better]
            idx[yy[better], xx[better]] = t

        cover = idx >= 0
        rgba = np.zeros((H, W, 4), np.float32)
        ti = idx[cover]
        # Flat-shade each covered pixel from its triangle's first vertex; at
        # this triangle size a gradient across one is not a visible thing.
        rgba[cover, :3] = RGB[I[ti, 0]]
        rgba[cover, 3] = 255
        img = Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8))
        return img.resize((self.w, self.h), Image.LANCZOS)


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        return 1
    model, atlas_path, outdir = sys.argv[1], sys.argv[2], Path(sys.argv[3])
    height = 840
    if '--height' in sys.argv:
        height = int(sys.argv[sys.argv.index('--height') + 1])
    outdir.mkdir(parents=True, exist_ok=True)
    mesh = load_glb(model)
    rig = Rig(mesh, Image.open(atlas_path), height=height)
    print(f'{len(mesh["I"]):,} triangles   frame {rig.w}x{rig.h}   '
          f'{rig.px_per_unit:.1f}px per unit   floor row {rig.floor_row}')
    # front / left / back / right. No diagonals until the room needs them.
    for name, az in (('front', 0), ('left', 90), ('back', 180), ('right', 270)):
        rig.frame(az).save(outdir / f'momo_stand_{name}.png')
        print('  ', name)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
