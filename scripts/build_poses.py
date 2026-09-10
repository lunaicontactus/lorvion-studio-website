"""
Render one dokkaebi's authored poses.

    python3 scripts/build_poses.py <char>

Only the directions the room actually uses. Work happens at the bench with the
dokkaebi's back to us, so `work` is rendered back and front and nothing else;
waving and looking are addressed to the visitor, who is the camera, so they are
front only. The registry falls back to the front frames for any direction a
pose does not have, so a missing direction is a slightly wrong angle rather
than a missing image.
"""
import sys, time
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from crew import CREW                    # noqa: E402
from pose import Posed, Skinner          # noqa: E402
from poses import frames_for             # noqa: E402
from render_sprites import Rig, load_glb  # noqa: E402
from build_sprites import double_support  # noqa: E402

SRC = Path('assets/models/dokkaebi/source')
HEIGHT = 640
AZ = {'front': 0, 'back': 180, 'left': 90, 'right': 270}


def main(char):
    st = CREW[char]
    OUT = Path('assets/sprites') / char
    mesh = load_glb(SRC / f'{char}_meshy_raw.glb')
    rig = Rig(mesh, Image.open(SRC / f'{char}_meshy_raw_base_color.png'), height=HEIGHT)
    r = Posed(SRC / f'{st.rig}_anim_walk.glb')
    sk = Skinner(mesh['V'].astype(np.float64), r)
    # The base stance is this rig's own feet-together phase, not a shared
    # constant: two walk clips do not reach it at the same moment.
    base_t, _ = double_support(sk, r)
    print(f'base_t {base_t:.3f}  amp {st.amp}  tempo {st.tempo}')
    t0 = time.time()
    for action, facings in st.plan.items():
        frames = frames_for(r, action, st.amp, st.tempo, base_t)
        for i, angles in enumerate(frames, 1):
            V = sk.deform_pose(angles, base_t)
            for f in facings:
                img = rig.frame(azimuth=AZ[f], verts=V)
                d = OUT / action / f
                d.mkdir(parents=True, exist_ok=True)
                img.save(d / f'{char}_{action}_{f}_{i:02d}.png')
                if f == 'left':
                    m = OUT / action / 'right'
                    m.mkdir(parents=True, exist_ok=True)
                    img.transpose(Image.FLIP_LEFT_RIGHT).save(
                        m / f'{char}_{action}_right_{i:02d}.png')
            print(f'  {action} {i}/{len(frames)}  {time.time() - t0:.0f}s', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1]))
