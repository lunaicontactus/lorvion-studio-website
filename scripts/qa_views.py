"""
Four views of a freshly generated master, for the likeness check.

Front, three-quarter, side and back — the three the generator was given plus
the one it was not, which is where a reconstruction that only works from the
input angles gives itself away.

    python3 scripts/qa_views.py <char> [--height 840]
"""
import sys, time
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from render_sprites import Rig, load_glb   # noqa: E402

SRC = Path('assets/models/dokkaebi/source')
VIEWS = (('front', 0), ('threequarter', 40), ('left', 90), ('back', 180))


def main(char, height=840):
    mesh = load_glb(SRC / f'{char}_meshy_raw.glb')
    rig = Rig(mesh, Image.open(SRC / f'{char}_meshy_raw_base_color.png'), height=height)
    print(f'{len(mesh["I"]):,} triangles  {len(mesh["V"]):,} vertices  '
          f'frame {rig.w}x{rig.h}  height {rig.model_height:.3f} units')
    out = Path(f'/tmp/qa_{char}')
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    tiles = []
    for name, az in VIEWS:
        img = rig.frame(az)
        img.save(out / f'{char}_{name}.png')
        tiles.append(img)
        print(f'  {name}  {time.time() - t0:.0f}s', flush=True)
    sheet = Image.new('RGB', (sum(t.width for t in tiles), height), (250, 246, 240))
    x = 0
    for t in tiles:
        sheet.paste(t, (x, 0), t)
        x += t.width
    sheet.save(out / f'{char}_sheet.png')
    print(out / f'{char}_sheet.png')
    return 0


if __name__ == '__main__':
    a = sys.argv[1:]
    h = int(a[a.index('--height') + 1]) if '--height' in a else 840
    raise SystemExit(main(a[0], h))
