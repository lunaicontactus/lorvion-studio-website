"""
Pull one rigging task's walk clip into the source folder.

The MCP download tool saves the rigged character but not the free walk that
comes with it, and the walk is the only part this pipeline uses: the master
mesh supplies every pixel, and the rig supplies only a skeleton and one clip.

    python3 scripts/fetch_walk.py <char> <walking_glb_url>
"""
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pose import Posed, weight_check     # noqa: E402

SRC = Path('assets/models/dokkaebi/source')


def main(char, url):
    out = SRC / f'{char}_anim_walk.glb'
    with urllib.request.urlopen(url) as r, out.open('wb') as f:
        f.write(r.read())
    print(f'{out}  {out.stat().st_size / 1e6:.1f} MB')
    owned, bad = weight_check(Posed(out))
    hands = {k: v for k, v in owned.items() if k and 'Hand' in k}
    print(f'   hands {hands}')
    if bad:
        # Meshy's rigger is not deterministic and gets this wrong about half
        # the time: it hands one wrist a slab of the head, which then swings
        # with the arm. Re-rig; do not try to repair it (see GENERATION_LOG).
        print(f'   ! REJECT — {"; ".join(bad)}')
        return 1
    print('   weights look sane')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1], sys.argv[2]))
