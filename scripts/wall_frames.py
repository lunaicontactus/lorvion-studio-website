"""
The poster wall's felt frames, cut out of the studio's own reference painting.

    python3 scripts/wall_frames.py <reference-wall.png> <out-dir>

The reference (1586 x 992, delivered 2026-09-19) is the garage wall with each
work hung in its own stitched felt frame and a name plate under it. The
posters painted inside it are redrawn copies, with the lettering mangled, so
only the frames are taken: each frame is cut along its silhouette (body,
ornament, plate), its window is punched out, and the real key art is hung
behind it by the site. Every measurement below is in the reference's pixels,
read off 2x crops with a 10 px ruler.

Writes <id>.webp (the frame, window transparent) and frames.json (each
frame's size and its window, body and plate as fractions of it).
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

FRAMES = {
    # body: the felt frame's outer box, below the ornament; orn: the ornament on top (x0, x1, top);
    # win: the window the picture shows through; plate: the name plate.
    'lunai':   {'body': (220, 170, 481.5, 557), 'orn': (310, 405, 147.5), 'win': (240, 202.5, 462.5, 535), 'plate': (267.5, 553, 440, 602.5)},
    'liminal': {'body': (495, 168, 754, 563), 'orn': (580, 670, 139), 'win': (516, 200.5, 734, 540.5), 'plate': (532.5, 557, 717.5, 605.5)},
    'wormup':  {'body': (769, 168, 1034, 565.5), 'orn': (845, 955, 140.5), 'win': (789, 198, 1015, 543), 'plate': (805, 560.5, 995, 610.5)},
    'lumiora': {'body': (1047.5, 168, 1320, 570.5), 'orn': (1135, 1232.5, 138), 'win': (1070, 200.5, 1296, 548), 'plate': (1087.5, 565.5, 1281, 615.5)},
}
S = 4  # supersampling for the silhouette's edge


def main(src: str, out: str) -> None:
    ref = Image.open(src).convert('RGBA')
    meta = {}
    for fid, f in FRAMES.items():
        bx0, by0, bx1, by1 = f['body']
        ox0, ox1, otop = f['orn']
        wx0, wy0, wx1, wy1 = f['win']
        px0, py0, px1, py1 = f['plate']
        x0, y0 = min(bx0, px0) - 2, otop - 2
        x1, y1 = max(bx1, px1) + 2, py1 + 2
        W, H = round(x1 - x0), round(y1 - y0)
        m = Image.new('L', (W * S, H * S), 0)
        d = ImageDraw.Draw(m)
        s = lambda v, o: (v - o) * S
        # The frame body, its corners rounded like cut felt.
        d.rounded_rectangle([s(bx0, x0), s(by0, y0), s(bx1, x0), s(by1, y0)], radius=13 * S, fill=255)
        # The ornament: a tab rising out of the top edge, narrowing to a
        # rounded top about half as wide as its base.
        inset = (ox1 - ox0) * 0.23
        rise = by0 - otop
        pts = [(ox0, by0 + 2), (ox0 + inset * 0.45, otop + rise * 0.45), (ox0 + inset * 0.8, otop + rise * 0.12),
               (ox0 + inset, otop + 1), (ox1 - inset, otop + 1), (ox1 - inset * 0.8, otop + rise * 0.12),
               (ox1 - inset * 0.45, otop + rise * 0.45), (ox1, by0 + 2)]
        d.polygon([(s(px, x0), s(py, y0)) for px, py in pts], fill=255)
        # The plate, hanging over the bottom edge.
        d.rounded_rectangle([s(px0, x0), s(py0, y0), s(px1, x0), s(py1, y0)], radius=9 * S, fill=255)
        # The window.
        d.rectangle([s(wx0, x0), s(wy0, y0), s(wx1, x0), s(wy1, y0)], fill=0)
        # Back to size, and pulled in by half a pixel so no wall rides the edge.
        m = m.resize((W, H), Image.LANCZOS).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.35))
        piece = ref.crop((round(x0), round(y0), round(x0) + W, round(y0) + H))
        piece.putalpha(m)
        piece.save(f'{out}/{fid}.webp', 'WEBP', quality=90, method=6)
        frac = lambda r: {'x': round((r[0] - x0) / W, 4), 'y': round((r[1] - y0) / H, 4),
                          'w': round((r[2] - r[0]) / W, 4), 'h': round((r[3] - r[1]) / H, 4)}
        # The felt the window is cut from, for the mat round a picture that is
        # narrower than its window.
        ring = np.asarray(ref.crop((round(wx0) - 10, round(wy0) + 40, round(wx0) - 4, round(wy1) - 40)).convert('RGB')).reshape(-1, 3)
        mat = '#%02x%02x%02x' % tuple(int(v) for v in np.median(ring, axis=0) * 0.72)
        meta[fid] = {'w': W, 'h': H, 'ref': [round(x0, 1), round(y0, 1)], 'win': frac((wx0, wy0, wx1, wy1)),
                     'body': frac((bx0, by0, bx1, by1)), 'plate': frac((px0, py0, px1, py1)), 'mat': mat}
    with open(f'{out}/frames.json', 'w') as fh:
        json.dump(meta, fh, indent=1)
    print(json.dumps(meta, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
