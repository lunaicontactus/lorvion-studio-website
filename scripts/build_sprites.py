"""
Build one dokkaebi's idle and walk from its master mesh and borrowed skeleton.

    python3 scripts/build_sprites.py <char>

Two behaviours, because two is what the rig honestly supports:

  idle   the walk cycle's own double-support pose — the one phase where both
         feet are under the body and the arms hang — held, with a small
         breath. The rigged model's own clip is a static T-pose, so this is
         where a standing pose comes from.
  walk   the free walking clip from rigging, sampled evenly round the loop.

Right-facing frames are the left-facing ones mirrored. The character is
symmetric, and a mirrored walk is the same walk half a cycle out of phase,
which is what a right-facing walk is.

Every frame goes through the one fixed camera in render_sprites.Rig, and each
deformed frame is planted: lowest point on the floor, horizontal centre on
the axis. A library walk carries root motion, and on a sprite that reads as
the character sliding out of its own frame while the room stands still.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from crew import CREW                       # noqa: E402
from pose import Rigged, Skinner            # noqa: E402
from render_sprites import Rig, load_glb    # noqa: E402

SRC = Path('assets/models/dokkaebi/source')
HEIGHT = 640
FACING = [('front', 0), ('back', 180), ('left', 90)]   # right is left, mirrored


def breath(n, swell):
    """A breath over n frames: the body swells about the floor, so the feet
    never leave it. Peak a little past the middle, because a breath in is
    quicker than a breath out."""
    return [1.0 + swell * (0.5 - 0.5 * np.cos(2 * np.pi * (i / n) ** 0.85))
            for i in range(n)]


def double_support(sk, walk, samples=24):
    """The phase where the feet are closest together: a standing pose."""
    best, best_t = None, 0.0
    for i in range(samples):
        t = walk.duration * i / samples
        V = sk.deform(t)
        feet = V[V[:, 1] < V[:, 1].min() + 0.06]
        spread = float(feet[:, 2].max() - feet[:, 2].min())
        if best is None or spread < best:
            best, best_t = spread, t
    return best_t, best


def main(char):
    st = CREW[char]
    OUT = Path('assets/sprites') / char
    mesh = load_glb(SRC / f'{char}_meshy_raw.glb')
    rig = Rig(mesh, Image.open(SRC / f'{char}_meshy_raw_base_color.png'), height=HEIGHT)
    walk = Rigged(SRC / f'{char}_anim_walk.glb')
    sk = Skinner(mesh['V'].astype(np.float64), walk)
    print(f'frame {rig.w}x{rig.h}   walk {walk.duration:.2f}s')

    t_idle, spread = double_support(sk, walk)
    print(f'idle pose from walk t={t_idle:.3f}s (foot spread {spread:.3f})')
    V_idle = sk.deform(t_idle)

    def write(V, action, facing, i, swell=1.0):
        d = OUT / action / facing
        d.mkdir(parents=True, exist_ok=True)
        az = dict(FACING)[facing]
        img = rig.frame(azimuth=az, verts=V, swell=swell)
        img.save(d / f'{char}_{action}_{facing}_{i:02d}.png')
        if facing == 'left':
            m = OUT / action / 'right'
            m.mkdir(parents=True, exist_ok=True)
            img.transpose(Image.FLIP_LEFT_RIGHT).save(
                m / f'{char}_{action}_right_{i:02d}.png')

    swells = breath(st.idle_frames, st.swell)
    for facing, _ in FACING:
        for i, sw in enumerate(swells):
            write(V_idle, 'idle', facing, i + 1, swell=sw)
        print('  idle', facing)

    for i in range(st.walk_frames):
        V = sk.deform(walk.duration * i / st.walk_frames)
        for facing, _ in FACING:
            write(V, 'walk', facing, i + 1)
        print(f'  walk frame {i + 1}/{st.walk_frames}', flush=True)
    print(f'base_t {t_idle:.3f}   walk {walk.duration:.3f}s')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1]))
