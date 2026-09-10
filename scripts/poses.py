"""
The crew's poses, written as directions rather than angles.

Every rig arrives with a T-pose and one walk. Everything else the room needs
is authored here, on top of the stance that rig's own walk already shows (the
phase where the feet are together) so a pose does not snap the arms back out
to the sides on the way in. That phase is found per character, not shared:
two walk clips of the same length do not put the feet together at the same
moment.

One set of poses serves all five. What varies per character is how far the
swing goes and how many frames it takes — see `crew.Style`. Writing five sets
of poses by hand would give five characters that move differently and also
five chances to get a bone axis wrong.

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

# MOMO's walk phase with the feet together, kept as the default so the
# existing MOMO build reproduces exactly. Other characters pass their own.
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


def build(rig, aims, angles=None, amp=1.0, base_t=BASE_T):
    """One pose: limb directions, plus optional plain angles for the spine.

    `amp` scales the whole pose toward the stance it starts from — the limb
    directions by lerping from where the bone already points, the spine angles
    by plain multiplication. Scaling a direction any other way (shortening the
    vector, say) does nothing at all, because only its direction is read.
    """
    out = {k: tuple(c * amp for c in v) for k, v in (angles or {}).items()}
    for limb, direction in aims.items():
        joint, child = LIMBS[limb]
        want = np.array(direction, np.float64)
        want /= np.linalg.norm(want) + 1e-9
        if amp != 1.0:
            here = rig.bone_direction(joint, child, base_t)
            want = here + (want - here) * amp
        out[joint] = rig.aim(joint, child, want, base_t)
    return out


def _mix(a, b, u):
    return tuple(a[i] + (b[i] - a[i]) * u for i in range(3))


def _cycle(keys, frames):
    """Sample a list of keyframes round a loop. Keys are (aims, angles)."""
    frames = max(2, int(round(frames)))
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
_WORK_KEYS = [_W_A, _W_B, _W_A, _W_C, _W_A]

# ── sit ────────────────────────────────────────────────────────────────────
# On the floor, legs forward, hands back. The renderer plants the lowest
# point, so folding the legs out in front sets it down without moving the hips.
_S_A = ({'l_thigh': (0.30, -0.24, 0.92), 'l_shin': (0.16, -0.90, 0.40),
         'r_thigh': (-0.30, -0.24, 0.92), 'r_shin': (-0.16, -0.90, 0.40),
         'l_arm': (0.72, -0.60, -0.34), 'r_arm': (-0.72, -0.60, -0.34)},
        {'Spine': (9, 0, 0), 'Spine01': (4, 0, 0)})
_S_B = (_S_A[0], {'Spine': (12, 0, 0), 'Spine01': (5, 0, 0), 'Head': (-4, 0, 0)})
_SIT_KEYS = [_S_A, _S_B, _S_A]

# ── wave ───────────────────────────────────────────────────────────────────
# One arm up, forearm swinging across. Big, because it has to read at 210px.
_V_A = ({'l_arm': (0.52, 0.84, 0.14), 'l_fore': (0.20, 0.94, 0.28),
         'r_arm': (-0.40, -0.86, 0.32)},
        {'Head': (0, -14, 0), 'Spine': (0, -8, 0)})
_V_B = ({'l_arm': (0.52, 0.84, 0.14), 'l_fore': (0.70, 0.66, 0.28),
         'r_arm': (-0.40, -0.86, 0.32)},
        {'Head': (0, -14, 0), 'Spine': (0, -8, 0)})
_WAVE_KEYS = [_V_A, _V_B, _V_A, _V_B, _V_A]

# ── look ───────────────────────────────────────────────────────────────────
# A glance across the room and back. The neck leads and the shoulders follow,
# because a head that turns alone reads as a doll.
_L = ({}, {'Head': (0, -55, 0), 'neck': (0, -20, 0), 'Spine': (0, -12, 0)})
_C = ({}, {})
_R = ({}, {'Head': (0, 55, 0), 'neck': (0, 20, 0), 'Spine': (0, 12, 0)})
_LOOK_KEYS = [_C, _L, _C, _R, _C]

# action -> (keyframes, MOMO's frame count). Tempo scales the count: more
# frames is the same movement taking longer at the same playback rate.
POSE_KEYS = {'work': (_WORK_KEYS, 6), 'sit': (_SIT_KEYS, 4),
             'wave': (_WAVE_KEYS, 5), 'look': (_LOOK_KEYS, 6)}


def frames_for(rig, name, amp=1.0, tempo=1.0, base_t=BASE_T):
    """Concrete override dicts for one action, ready to skin."""
    keys, n = POSE_KEYS[name]
    return [build(rig, aims, angles, amp, base_t)
            for aims, angles in _cycle(keys, n * tempo)]
