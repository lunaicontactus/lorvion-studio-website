"""Sink the head onto the body until the neck stops being a thing you see.

Measured on MOMO: between the shoulders and the jaw there is a column about
six percent of the figure tall and 0.083 wide, against a body of 0.098 below
it and a head of 0.150 above. At the size the room draws these characters that
column is what turns a soft toy into a small person with a neck.

Two moves, and neither touches the head's own shape. The band the neck
occupies is squashed vertically, and everything above it — the whole head,
rigidly — comes down by exactly what the band lost, so the jaw arrives at the
shoulders. Then what remains of the neck is thickened, so that if any of it
is still visible in the outline it reads as the body continuing rather than as
a stalk holding a head up.

The face, the ears, the horns and the hair are moved but never reshaped: they
travel together, by one number.
"""
import sys
import numpy as np
import trimesh


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def find_neck(V, h):
    """The thinnest slice between the shoulders and the head."""
    rows = []
    for lo in np.arange(0.36, 0.62, 0.01):
        m = (V[:, 1] >= h * lo) & (V[:, 1] < h * (lo + 0.01))
        if m.sum() < 5:
            continue
        rows.append((lo, float(np.abs(V[m][:, 0]).max())))
    ys = np.array([r[0] for r in rows])
    w = np.array([r[1] for r in rows])
    zone = (ys >= 0.42) & (ys <= 0.58)
    i = int(np.nonzero(zone)[0][np.argmin(w[zone])])
    narrow = w[i]
    # The band is every slice that is still nearly as thin as the thinnest.
    thin = np.nonzero(w <= narrow * 1.22)[0]
    keep = [j for j in thin if abs(j - i) <= 6]
    lo = float(ys[min(keep)])
    hi = float(ys[max(keep)] + 0.01)
    return lo, hi, narrow


def hide(src, dst, squash=0.25, widen=1.30, report=True):
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V = np.asarray(g.vertices).copy().astype(np.float64)
    h = V[:, 1].max()
    lo, hi, narrow = find_neck(V, h)
    b0, b1 = h * lo, h * hi
    band = b1 - b0
    lost = band * (1 - squash)

    y = V[:, 1].copy()
    inside = (y >= b0) & (y <= b1)
    above = y > b1
    # Squash the band; carry everything above it down by what the band lost,
    # so the head keeps its shape and only its height changes.
    V[inside, 1] = b0 + (y[inside] - b0) * squash
    V[above, 1] = y[above] - lost

    # Thicken what is left of it, most at the middle, nothing at either end.
    if widen and widen != 1.0:
        yy = V[:, 1]
        t = np.clip((yy - b0) / max(b1 * squash + (b0 - b0) - b0, 1e-6), 0, 1) \
            if False else np.clip((yy - b0) / max(band * squash, 1e-6), 0, 1)
        w = np.sin(np.pi * np.clip(t, 0, 1)) * ((yy >= b0) & (yy <= b0 + band * squash))
        f = 1.0 + (widen - 1.0) * w
        V[:, 0] *= f
        V[:, 2] *= f

    if report:
        print(f'{src.split("/")[-1]}: neck {lo:.2f}-{hi:.2f}h (half-width {narrow:.4f})'
              f' squashed to {squash:.0%}, head lowered {lost * 1000:.1f}mm,'
              f' neck widened x{widen:.2f}')
    g.vertices = V
    scene.export(dst)


if __name__ == '__main__':
    hide(sys.argv[1], sys.argv[2],
         squash=float(sys.argv[3]) if len(sys.argv) > 3 else 0.25,
         widen=float(sys.argv[4]) if len(sys.argv) > 4 else 1.30)
