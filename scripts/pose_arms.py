"""Bring the arms down out of the T, from the shoulder.

The first version failed twice over and the render showed it: the arms ended
up spread like fins with a dent where each shoulder should be.

Both faults were the same mistake — the pivot was not the joint. It was taken
from the torso's half-width at belly height, which on these bodies is 0.134
against a shoulder of 0.112, so the hinge sat outside the shoulder. Everything
between the real joint and that line was left behind while the rest swung, and
that gap is the dent. Fifty degrees was the other half of it: a T-pose arm is
horizontal, so fifty leaves it forty degrees off vertical, which is a fin.

So the joint is measured instead of assumed. The arms are the only thing that
reaches past the torso at that height, which finds the band; the torso's own
width just below it gives the hinge; and the rotation is most of a right angle,
applied rigidly to all of the arm with the blend confined to the shoulder.
"""
import sys
import numpy as np
import trimesh


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def measure(V):
    """Where the arms are, and where the shoulder they hang from is."""
    h = V[:, 1].max()
    rows = []
    for lo in np.arange(0.26, 0.56, 0.01):
        m = (V[:, 1] >= h * lo) & (V[:, 1] < h * (lo + 0.01))
        if m.sum() < 5:
            continue
        rows.append((lo, np.abs(V[m][:, 0]).max()))
    ys = np.array([r[0] for r in rows])
    wide = np.array([r[1] for r in rows])
    # The torso, read below the arms: the widest the body gets without them.
    body = wide[(ys >= 0.30) & (ys <= 0.38)]
    torso = float(body.max())
    # The arm band: rows that reach well past that.
    arm_rows = ys[wide > torso * 1.25]
    if len(arm_rows) == 0:
        raise SystemExit('no arm band found')
    lo, hi = float(arm_rows.min()), float(arm_rows.max() + 0.01)
    return h, torso, lo, hi, float(wide.max())


def pose(src, dst, degrees=68.0, blend=0.26, forward=5.0, report=True):
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V = np.asarray(g.vertices).copy().astype(np.float64)
    h, torso, lo, hi, tip = measure(V)

    # The hinge: on the torso's surface, at the middle of the arm band.
    px = torso
    py = h * (lo + hi) / 2
    band = (V[:, 1] > h * lo - 0.004) & (V[:, 1] < h * hi + 0.004)
    arm = band & (np.abs(V[:, 0]) > px * 0.98)
    if arm.sum() < 50:
        raise SystemExit(f'only {arm.sum()} arm vertices')

    for s in (+1, -1):
        side = arm & (np.sign(V[:, 0]) == s)
        if side.sum() == 0:
            continue
        # Full rotation over all of the arm; the blend is the shoulder alone.
        span = max((tip - px) * blend, 1e-6)
        w = smoothstep((np.abs(V[:, 0]) - px * 0.98) / span)[side]
        dx = V[side, 0] - s * px
        dy = V[side, 1] - py
        ang = np.radians(degrees) * w * (-s)
        ca, sa = np.cos(ang), np.sin(ang)
        V[side, 0] = s * px + dx * ca - dy * sa
        V[side, 1] = py + dx * sa + dy * ca

        # And a few degrees forward, about the same joint. Seen from the side
        # an arm hanging dead flat against the ribs reads as a plate stuck on
        # rather than an arm; a little in front of the hip is how a soft toy
        # stands. Small on purpose — far enough and the hands meet in front.
        if forward:
            fa = np.radians(-forward) * w
            cf, sf = np.cos(fa), np.sin(fa)
            dy2 = V[side, 1] - py
            dz2 = V[side, 2]
            V[side, 1] = py + dy2 * cf - dz2 * sf
            V[side, 2] = dy2 * sf + dz2 * cf

    if report:
        print(f'{src.split("/")[-1]}: torso {torso:.4f}  shoulder y {py:.4f}'
              f'  band {lo:.2f}-{hi:.2f}h  -> {int(arm.sum())} vertices'
              f'  down {degrees:.0f}deg, forward {forward:.0f}deg, blend {blend:.2f}')
    g.vertices = V
    scene.export(dst)


if __name__ == '__main__':
    pose(sys.argv[1], sys.argv[2],
         degrees=float(sys.argv[3]) if len(sys.argv) > 3 else 68.0,
         blend=float(sys.argv[4]) if len(sys.argv) > 4 else 0.26,
         forward=float(sys.argv[5]) if len(sys.argv) > 5 else 5.0)
