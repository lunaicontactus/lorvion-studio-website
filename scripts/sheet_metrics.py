"""
Measure a character's exported frames, so src/data/sprites.ts can be told
rather than guessed.

Reports the three proportions the room needs — how much of the frame the
standing character fills, how wide a frame is, and how much of that width is
body — plus the one number that decides whether the render is sound: the gap
under the lowest pixel, which has to be the same on every frame of every
action or the character bobs as it changes what it is doing.

    python3 scripts/sheet_metrics.py <char>
"""
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from PIL import Image

DST = Path('public/assets/images/dokkaebi')


def main(char):
    files = sorted((DST / char).rglob('*.webp'))
    if not files:
        print(f'no frames for {char}')
        return 1
    size = Image.open(files[0]).size
    gaps, per_action = [], defaultdict(set)
    idle_top, idle_gap, idle_width = [], [], []
    for f in files:
        im = Image.open(f)
        a = np.asarray(im.convert('RGBA'))[..., 3]
        rows = np.where(a.max(1) > 8)[0]
        cols = np.where(a.max(0) > 8)[0]
        action, direction = f.parts[-3], f.parts[-2]
        # Count one direction's worth: the others are the same length, and
        # some actions were rendered in fewer directions than others.
        if direction == 'front':
            per_action[action].add(f.name)
        gaps.append(im.height - 1 - int(rows[-1]))
        if action == 'idle':
            idle_top.append(int(rows[0]))
            idle_gap.append(im.height - 1 - int(rows[-1]))
            idle_width.append(int(cols[-1]) - int(cols[0]) + 1)
    w, h = size
    figure = h - min(idle_top) - min(idle_gap)
    print(f'{char}: {len(files)} frames, all {w}x{h}')
    print('   frames: { '
          + ', '.join(f'{k}: {len(v)}' for k, v in sorted(per_action.items())) + ' }')
    print(f'   foot gap {min(gaps)}-{max(gaps)}px'
          + ('   ANCHOR OK' if max(gaps) - min(gaps) <= 1 else '   ! ANCHOR DRIFTS'))
    print(f'   figureRatio: {figure / h:.4f}')
    print(f'   aspect: {w} / {h}')
    print(f'   bodyWidth: {max(idle_width) / w:.3f}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1]))
