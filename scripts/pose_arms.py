"""Bring the arms down out of the T.

The models have no skeleton, so there is nothing to pose; but a T-pose in the
room is the thing that made the first crew read as dolls, and the arms are the
one part of this shape that is cleanly separable without one. They are the only
geometry that reaches past the body sideways at shoulder height, which is a
rule rather than a guess, and it can be written down.

Each arm turns about its own shoulder, and the turn fades in across the joint
so the shoulder stretches instead of tearing. Nothing else in the mesh moves.
"""
import sys
import numpy as np
import trimesh


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def pose(src, dst, degrees=52.0, report=True):
    scene = trimesh.load(src, process=False)
    key = list(scene.geometry.keys())[0]
    g = scene.geometry[key]
    V = np.asarray(g.vertices).copy().astype(np.float64)
    h = V[:, 1].max()

    # The torso, measured below the arms: the half-width the body actually has.
    belly = V[(V[:, 1] > 0.22 * h) & (V[:, 1] < 0.34 * h)]
    torso = float(np.percentile(np.abs(belly[:, 0]), 92))

    # The arms: the band that reaches past that, at shoulder height.
    band = (V[:, 1] > 0.34 * h) & (V[:, 1] < 0.56 * h)
    reach = np.abs(V[:, 0]) > torso * 1.02
    arm = band & reach
    if arm.sum() < 50:
        raise SystemExit(f'found only {arm.sum()} arm vertices — check the bands')
    shoulder_y = float(V[arm][:, 1].mean())
    tip = float(np.abs(V[arm][:, 0]).max())

    moved = 0
    for s in (+1, -1):
        side = arm & (np.sign(V[:, 0]) == s)
        if side.sum() == 0:
            continue
        # The blend belongs at the shoulder, not along the whole arm. Spread
        # over the full length and the arm rotates a little more at every step
        # out, which is a banana rather than a limb; confined to the first
        # quarter, the joint stretches and the rest of the arm stays straight.
        blend = max((tip - torso) * 0.28, 1e-6)
        t = (np.abs(V[:, 0]) - torso) / blend
        w = smoothstep(t)[side]
        px, py = s * torso, shoulder_y
        dx = V[side, 0] - px
        dy = V[side, 1] - py
        ang = np.radians(degrees) * w * (-s)     # both arms swing downward
        ca, sa = np.cos(ang), np.sin(ang)
        V[side, 0] = px + dx * ca - dy * sa
        V[side, 1] = py + dx * sa + dy * ca
        moved += int(side.sum())

    if report:
        print(f'{src.split("/")[-1]}: torso half-width {torso:.4f}, shoulder y {shoulder_y:.4f},'
              f' reach {tip:.4f} — {moved} arm vertices turned {degrees:.0f}deg')
    g.vertices = V
    scene.export(dst)


if __name__ == '__main__':
    pose(sys.argv[1], sys.argv[2],
         degrees=float(sys.argv[3]) if len(sys.argv) > 3 else 52.0)
