"""
MOMO's poses, written as directions rather than angles.

The rig arrives with a T-pose and one walk. Everything else the room needs is
authored here, on top of the stance the walk already shows (BASE_T, the phase
where the feet are together) so a pose does not snap the arms back out to the
sides on the way in.

Poses are written as "point this limb THERE", not as euler angles. Which axis
swings a bone depends on where the rigger's solver left it, differs per joint,
and cannot be guessed — several rounds of guessing produced poses that looked
almost right and were not. A direction is unambiguous and is also what a pose
actually means: "arm up and out", not "Z minus a hundred and twenty".

World axes here: +X is the character's left, +Y up, +Z toward the camera.
Amplitudes are chosen to read at 210px, which is how big a dokkaebi is on the
site. A wrist that turns eleven degrees is invisible there.
"""
import numpy as np

# The walk phase with the feet together; every pose is written on top of it.
BASE_T = 0.844

# limb: (joint, child) — the bone whose direction a pose names.
LIMBS = {
    'l_arm': ('LeftArm', 'LeftForeArm'),
    'l_fore': ('LeftForeArm', 'LeftHand'),
    'r_arm': ('RightArm', 'RightForeArm'),
    'r_fore': ('RightForeArm', 'RightHand'),
    'l_thigh': ('LeftUpLeg', 'LeftLeg'),
    'l_shin': ('LeftLeg', 'LeftFoot'),
    'r_thigh': ('RightUpLeg', 'RightLeg'),
    'r_shin': ('RightLeg', 'RightFoot'),
}


def build(rig, aims, angles=None):
    """One pose: limb directions, plus optional plain angles for the spine."""
    out = dict(angles or {})
    for limb, direction in aims.items():
        joint, child = LIMBS[limb]
        out[joint] = rig.aim(joint, child, direction, BASE_T)
    return out


def _mix(a, b, u):
    return tuple(a[i] + (b[i] - a[i]) * u for i in range(3))


def _cycle(keys, frames):
    """Sample a list of keyframes round a loop. Keys are (aims, angles)."""
    out = []
    span = 1 / (len(keys) - 1)
    for i in range(frames):
        u = i / frames
        seg = min(int(u / span), len(keys) - 2)
        t = (u - seg * span) / span
        a0, g0 = keys[seg]
        a1, g1 = keys[seg + 1]
        aims = {k: _mix(a0.get(k, a1[k]), a1.get(k, a0[k]), t) for k in set(a0) | set(a1)}
        angles = {k: _mix(g0.get(k, (0, 0, 0)), g1.get(k, (0, 0, 0)), t)
                  for k in set(g0) | set(g1)}
        out.append((aims, angles))
    return out


# ── work ───────────────────────────────────────────────────────────────────
# Bent over the bench, both hands out in front, the near arm doing the work.
_W_A = ({'l_arm': (0.62, -0.42, 0.66), 'l_fore': (0.20, -0.30, 0.93),
         'r_arm': (-0.62, -0.42, 0.66), 'r_fore': (-0.20, -0.30, 0.93)},
        {'Spine': (-16, 0, 0), 'Spine01': (-7, 0, 0), 'Head': (-10, 0, 0)})
_W_B = ({'l_arm': (0.55, -0.05, 0.83), 'l_fore': (0.16, -0.70, 0.70),
         'r_arm': (-0.62, -0.42, 0.66), 'r_fore': (-0.20, -0.30, 0.93)},
        {'Spine': (-21, 0, 0), 'Spine01': (-9, 0, 0), 'Head': (-13, 0, 0)})
# Every so often it stops and looks at what it has done.
_W_C = ({'l_arm': (0.60, -0.30, 0.74), 'l_fore': (0.18, -0.45, 0.87),
         'r_arm': (-0.60, -0.35, 0.72), 'r_fore': (-0.18, -0.35, 0.92)},
        {'Spine': (-6, 0, 0), 'Head': (8, 0, 0)})
WORK = _cycle([_W_A, _W_B, _W_A, _W_C, _W_A], 6)

# ── sit ────────────────────────────────────────────────────────────────────
# On the floor, legs forward, hands back. The renderer plants the lowest
# point, so folding the legs out in front sets it down without moving the hips.
_S_A = ({'l_thigh': (0.30, -0.24, 0.92), 'l_shin': (0.16, -0.90, 0.40),
         'r_thigh': (-0.30, -0.24, 0.92), 'r_shin': (-0.16, -0.90, 0.40),
         'l_arm': (0.72, -0.60, -0.34), 'r_arm': (-0.72, -0.60, -0.34)},
        {'Spine': (9, 0, 0), 'Spine01': (4, 0, 0)})
_S_B = (_S_A[0], {'Spine': (12, 0, 0), 'Spine01': (5, 0, 0), 'Head': (-4, 0, 0)})
SIT = _cycle([_S_A, _S_B, _S_A], 4)

# ── wave ───────────────────────────────────────────────────────────────────
# One arm up, forearm swinging across. Big, because it has to read at 210px.
_V_A = ({'l_arm': (0.52, 0.84, 0.14), 'l_fore': (0.20, 0.94, 0.28),
         'r_arm': (-0.40, -0.86, 0.32)},
        {'Head': (0, -14, 0), 'Spine': (0, -8, 0)})
_V_B = ({'l_arm': (0.52, 0.84, 0.14), 'l_fore': (0.70, 0.66, 0.28),
         'r_arm': (-0.40, -0.86, 0.32)},
        {'Head': (0, -14, 0), 'Spine': (0, -8, 0)})
WAVE = _cycle([_V_A, _V_B, _V_A, _V_B, _V_A], 5)

# ── look ───────────────────────────────────────────────────────────────────
# A glance across the room and back. The neck leads and the shoulders follow,
# because a head that turns alone reads as a doll.
_L = ({}, {'Head': (0, -55, 0), 'neck': (0, -20, 0), 'Spine': (0, -12, 0)})
_C = ({}, {})
_R = ({}, {'Head': (0, 55, 0), 'neck': (0, 20, 0), 'Spine': (0, 12, 0)})
LOOK = _cycle([_C, _L, _C, _R, _C], 6)

POSE_KEYS = {'work': WORK, 'sit': SIT, 'wave': WAVE, 'look': LOOK}


def frames_for(rig, name):
    """Concrete override dicts for one action, ready to skin."""
    return [build(rig, aims, angles) for aims, angles in POSE_KEYS[name]]
