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
    # The torso, read below the arms. A percentile rather than the maximum:
    # on YOMI one row of that band is wider than the rest and the maximum
    # read a torso of 0.189 against a real 0.13, which then selected almost
    # none of the arm.
    body = wide[(ys >= 0.28) & (ys <= 0.38)]
    torso = float(np.percentile(body, 80))
    # The arm band: rows that reach well past that, and never above the neck.
    # The neck is the narrowest row between body and head, and it is a feature
    # of the mesh rather than a fraction chosen in advance — without it POKO's
    # band ran to 0.57 of the figure, which is the middle of its hair.
    neck_zone = (ys >= 0.46) & (ys <= 0.66)
    neck = float(ys[np.nonzero(neck_zone)[0][np.argmin(wide[neck_zone])]]) if neck_zone.any() else 0.55
    arm_rows = ys[(wide > torso * 1.18) & (ys < neck)]
    if len(arm_rows) == 0:
        raise SystemExit('no arm band found')
    lo, hi = float(arm_rows.min()), float(arm_rows.max() + 0.01)
    return h, torso, lo, hi, float(wide[(ys >= lo) & (ys <= hi)].max())


def pose(src, dst, degrees=70.0, blend=0.26, forward=5.0,
         shoulder_in=0.075, shoulder_down=0.022, report=True):
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

    n_sh = absorb_shoulder(V, h, torso, lo, hi, inward=shoulder_in, drop=shoulder_down)
    if report:
        print(f'  shoulder cap: {n_sh} vertices drawn in by {shoulder_in:.3f}'
              f' and down {shoulder_down:.3f}')
        print(f'{src.split("/")[-1]}: torso {torso:.4f}  shoulder y {py:.4f}'
              f'  band {lo:.2f}-{hi:.2f}h  -> {int(arm.sum())} vertices'
              f'  down {degrees:.0f}deg, forward {forward:.0f}deg, blend {blend:.2f}')
    g.vertices = V
    scene.export(dst)


def absorb_shoulder(V, h, torso, lo, hi, inward=0.050, drop=0.016, core=0.62):
    """Take the shoulder out of the silhouette.

    Rotating a T-pose arm down leaves the stub it grew from still pointing
    sideways, and that stub is the shoulder you can see. Measured against the
    reference and normalised to figure height, MOMO is 0.249 wide where the
    reference is 0.193 — wider at the shoulder and narrower at the hip, so the
    outline reads as a column with an arm bolted on rather than a bell.

    So the cap is drawn into the body instead of being rotated again. How much
    a vertex moves depends on two things and neither of them is the arm: how
    high it is, full at the top of the arm band and nothing by the middle of
    the arm, and how far out it already sits, so the body's core stays where
    it is and only what stands proud of it comes in. The arm below the joint,
    its length, its thickness and the hand are not in the selection at all.
    """
    # A band, not a threshold. The first version used a rising step, which is
    # one everywhere above the shoulder — so it drew the head in as well and
    # flattened the hair into a block. It has to come back to nothing above
    # the joint, because everything up there is head.
    y_lo = h * (lo - (hi - lo) * 0.55)     # below mid-arm: nothing moves under here
    y_peak = h * (hi - 0.01)               # the top of the arm band: full
    y_hi = h * (hi + 0.045)                # the neck: back to nothing
    core_x = torso * core
    ax = np.abs(V[:, 0])
    y = V[:, 1]
    rise = smoothstep((y - y_lo) / max(y_peak - y_lo, 1e-6))
    fall = 1.0 - smoothstep((y - y_peak) / max(y_hi - y_peak, 1e-6))
    u = np.minimum(rise, fall)
    t = smoothstep((ax - core_x) / max(torso - core_x, 1e-6))
    w = u * t
    moved = w > 0.01
    V[moved, 0] -= np.sign(V[moved, 0]) * (w[moved] * inward)
    V[moved, 1] -= w[moved] * drop
    return int(moved.sum())


if __name__ == '__main__':
    pose(sys.argv[1], sys.argv[2],
         degrees=float(sys.argv[3]) if len(sys.argv) > 3 else 68.0,
         blend=float(sys.argv[4]) if len(sys.argv) > 4 else 0.26,
         forward=float(sys.argv[5]) if len(sys.argv) > 5 else 5.0,
         shoulder_in=float(sys.argv[6]) if len(sys.argv) > 6 else 0.075,
         shoulder_down=float(sys.argv[7]) if len(sys.argv) > 7 else 0.022)
