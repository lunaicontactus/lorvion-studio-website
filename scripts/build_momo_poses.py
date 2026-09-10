"""
Render MOMO's authored poses.

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
from pose import Posed, Skinner          # noqa: E402
from poses import BASE_T, frames_for     # noqa: E402
from render_sprites import Rig, load_glb  # noqa: E402

SRC = Path('assets/models/dokkaebi/source')
OUT = Path('assets/sprites/momo')
HEIGHT = 640
# action -> the directions worth rendering; 'left' also writes a mirrored right.
PLAN = {'work': ['back', 'front'], 'sit': ['front', 'left'],
        'wave': ['front'], 'look': ['front']}
AZ = {'front': 0, 'back': 180, 'left': 90, 'right': 270}


def main():
    mesh = load_glb(SRC / 'momo_meshy_raw.glb')
    rig = Rig(mesh, Image.open(SRC / 'momo_meshy_raw_base_color.png'), height=HEIGHT)
    r = Posed(SRC / 'momo_anim_walk.glb')
    sk = Skinner(mesh['V'].astype(np.float64), r)
    t0 = time.time()
    for action, facings in PLAN.items():
        frames = frames_for(r, action)
        for i, angles in enumerate(frames, 1):
            V = sk.deform_pose(angles, BASE_T)
            for f in facings:
                img = rig.frame(azimuth=AZ[f], verts=V)
                d = OUT / action / f
                d.mkdir(parents=True, exist_ok=True)
                img.save(d / f'momo_{action}_{f}_{i:02d}.png')
                if f == 'left':
                    m = OUT / action / 'right'
                    m.mkdir(parents=True, exist_ok=True)
                    img.transpose(Image.FLIP_LEFT_RIGHT).save(
                        m / f'momo_{action}_right_{i:02d}.png')
            print(f'  {action} {i}/{len(frames)}  {time.time() - t0:.0f}s', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
