"""
How far one walk cycle carries a dokkaebi, and therefore how fast to play it.

This is the number the room's walking speed has to agree with. Get it wrong
and the character moonwalks: the feet go through the motions at one rate and
the floor goes past at another, and the eye reads it instantly even though
neither half is wrong on its own.

Measured per character, never copied from MOMO. Two reasons it can differ:
the skeleton is fitted to that character's own proportions, so a shorter leg
covers less ground per step; and the room draws each of them at its own
height, so the same step in model units is a different step in world units.

What is measured is the ankle's fore-and-aft travel relative to the hips. The
clip walks on the spot — the hips return exactly where they started, so there
is no root translation to read — and on the spot the planted foot slides back
by exactly the distance the character would have covered. One step. A cycle is
two of them.

Calibrated against MOMO, whose 89 units per cycle was measured off her
rendered frames and verified in the browser against the floor going past. So
this reports MOMO as 89 by construction, and everyone else relative to her.

    python3 scripts/measure_gait.py <char>
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from crew import CREW                      # noqa: E402
from pose import Posed                     # noqa: E402
from render_sprites import load_glb        # noqa: E402

SRC = Path('assets/models/dokkaebi/source')
SAMPLES = 48
# MOMO's cycle, in world units, measured off her rendered frames and checked
# in the browser against the floor moving past. Everyone else is relative.
MOMO_CYCLE = 89.0


def step_length(char):
    """One step, in world units: the planted foot's travel relative to the hips."""
    st = CREW[char]
    r = Posed(SRC / f'{st.rig}_anim_walk.glb')
    rig_h = float(r.V[:, 1].max() - r.V[:, 1].min())
    W = [r._world_matrices(r.duration * i / SAMPLES) for i in range(SAMPLES)]
    hips = r.by_name['Hips']
    steps = []
    for foot in ('LeftFoot', 'RightFoot'):
        k = r.by_name[foot]
        rel = np.array([W[i][k][:3, 3] - W[i][hips][:3, 3] for i in range(SAMPLES)])
        span = rel.max(0) - rel.min(0)
        # Whichever of the two horizontal axes it travels along.
        axis = 0 if span[0] > span[2] else 2
        steps.append(float(span[axis]))
    # Both feet, because an auto-rig is never quite symmetric and the eye
    # averages the two anyway.
    return float(np.mean(steps)) / rig_h * st.world_height, r.duration


def main(char):
    st = CREW[char]
    mV = load_glb(SRC / f'{char}_meshy_raw.glb')['V'].astype(np.float64)
    model_h = float(mV[:, 1].max() - mV[:, 1].min())
    step, clip = step_length(char)
    momo_step, _ = step_length('momo')
    cycle = MOMO_CYCLE * step / momo_step

    speed = 100.0                 # NavGraph.speed, world units a second
    ground = speed * st.pace
    fps = ground * st.walk_frames / cycle
    print(f'{char}: clip {clip:.3f}s   model {model_h:.3f} -> {st.world_height} world units')
    print(f'   step {step:.1f}   cycle {cycle:.1f} world units '
          f'({cycle / MOMO_CYCLE * 100:.0f}% of MOMO)')
    print(f'   walks at {speed:.0f} x {st.pace} = {ground:.0f} world units/s')
    print(f'   -> {st.walk_frames} frames must play at {fps:.2f} fps '
          f'({st.walk_frames / fps:.3f}s per cycle)')
    return cycle


if __name__ == '__main__':
    raise SystemExit(0 if main(sys.argv[1]) else 0)
