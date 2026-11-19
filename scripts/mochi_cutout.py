"""Cut the mochi crew out of the user's art (EUNGARAGE 2.0).

Nothing is drawn or regenerated. The art arrives on a near-white page; this
script only decides which pixels are page and which are character:

* page = the near-white pixels connected to the edge of the crop (a white
  highlight inside the outline is enclosed by the outline and stays);
* the band where page meets outline gets a soft alpha from the distance to
  white, and the white mixed into those edge pixels is taken back out
  (un-premultiplied), so the outline does not carry a pale fringe onto the
  night garage.

Sources (assets/crew-mochi/source/, see SHA256SUMS):
  <id>_portrait.png   the single front illustration (large, ~1250 px)
  <id>_sheet.png      the character sheet; its 3-view panel gives side/back
  crew_overview_sheet.png   the six-crew sheet; the only art of 임레븐 so far

Output: assets/crew-mochi/cut/<id>_<view>.png — RGBA, trimmed, the lowest
opaque row is the floor (feet).

    python3 scripts/mochi_cutout.py            # every character
    python3 scripts/mochi_cutout.py momo       # one
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/crew-mochi/source'
OUT = ROOT / 'assets/crew-mochi/cut'

# The 3-view panel of each sheet: the strip that holds the front, side and
# back figures and nothing else (labels sit below it). Read off the sheets.
VIEW_STRIPS: dict[str, tuple[int, int, int, int]] = {
    'momo': (668, 118, 1400, 358),
    'nunu': (430, 28, 1400, 336),
    'ruki': (690, 78, 1370, 296),
    'poko': (742, 88, 1405, 312),
    'yomi': (716, 88, 1410, 338),
}

# 임레븐 exists only on the six-crew sheet: its card is the bottom-right one.
# (front, side, back) boxes on that sheet, plus the big pose at the card top.
REVEN_BOXES: dict[str, tuple[int, int, int, int]] = {
    'portrait': (1058, 540, 1240, 706),
    'front': (1045, 745, 1128, 834),
    'side': (1132, 745, 1206, 834),
    'back': (1213, 745, 1290, 834),
}


def paper(rgb: np.ndarray) -> np.ndarray:
    """The page colour: the median of the crop's border (white on the
    portraits, a faint pink inside the overview sheet's cards)."""
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    return np.median(border, axis=0)


def page_mask(rgb: np.ndarray, tol: float) -> np.ndarray:
    """Page-coloured pixels connected to the crop's border."""
    near = np.abs(rgb - paper(rgb)).max(axis=2) < tol
    lab, _ = ndimage.label(near)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    edge = edge[edge > 0]
    return np.isin(lab, edge)


def cut(rgb: np.ndarray, tol: float = 14.0, keep: str = 'largest') -> np.ndarray:
    """RGBA from an RGB crop on a white page."""
    rgbf = rgb.astype(np.float64)
    page = page_mask(rgbf, tol)
    fg = ~page
    if keep == 'largest':
        lab, n = ndimage.label(fg)
        if n > 1:
            sizes = ndimage.sum(fg, lab, range(1, n + 1))
            fg = lab == (1 + int(np.argmax(sizes)))
        fg = ndimage.binary_fill_holes(fg)
    # Soft edge: inside a 2 px band outside the solid shape, alpha follows how
    # far the pixel is from white.
    band = ndimage.binary_dilation(fg, iterations=2) & ~fg
    bg = paper(rgbf)
    dist = np.abs(rgbf - bg).max(axis=2) / 255.0
    alpha = np.where(fg, 1.0, 0.0)
    alpha = np.where(band, np.clip(dist * 3.0, 0, 1), alpha)
    # The first ring inside the outline is often anti-aliased against white too.
    inner = fg & ~ndimage.binary_erosion(fg, iterations=1)
    alpha = np.where(inner, np.clip(0.35 + dist * 3.0, 0, 1), alpha)
    a = alpha[..., None]
    with np.errstate(divide='ignore', invalid='ignore'):
        col = np.where(a > 0.02, (rgbf - (1 - a) * bg) / np.maximum(a, 1e-6), rgbf)
    col = np.clip(col, 0, 255)
    out = np.dstack([col, alpha * 255.0]).round().astype(np.uint8)
    return out


def trim(rgba: np.ndarray, pad: int = 4) -> np.ndarray:
    ys, xs = np.nonzero(rgba[..., 3] > 8)
    y0, y1 = max(ys.min() - pad, 0), ys.max() + 1
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + 1 + pad, rgba.shape[1])
    # No padding under the feet: the lowest opaque row is the floor.
    return rgba[y0:y1, x0:x1]


def figures_in_strip(sheet: np.ndarray, strip: tuple[int, int, int, int], tol: float) -> list[np.ndarray]:
    """The three figures of a 3-view strip, left to right."""
    x0, y0, x1, y1 = strip
    crop = sheet[y0:y1, x0:x1].astype(np.float64)
    fg = ~page_mask(crop, tol)
    fg = ndimage.binary_closing(fg, iterations=2)
    lab, n = ndimage.label(fg)
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(fg, lab, range(1, n + 1))
    order = [i for i in np.argsort(sizes)[::-1] if sizes[i] > 1500][:3]
    if len(order) < 3:
        raise SystemExit(f'expected 3 figures in strip {strip}, found {len(order)}')
    order.sort(key=lambda i: objs[i][1].start)
    figs = []
    for i in order:
        sy, sx = objs[i]
        m = 6
        ys = slice(max(sy.start - m, 0), min(sy.stop + m, crop.shape[0]))
        xs = slice(max(sx.start - m, 0), min(sx.stop + m, crop.shape[1]))
        piece = crop[ys, xs].copy()
        # Blank out other labelled figures that poke into this box.
        other = (lab[ys, xs] > 0) & (lab[ys, xs] != i + 1)
        piece[other] = paper(crop)
        figs.append(piece.astype(np.uint8))
    return figs


def save(rgba: np.ndarray, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'{name}.png'
    Image.fromarray(trim(rgba)).save(path, optimize=True)
    h, w = trim(rgba).shape[:2]
    print(f'{path.relative_to(ROOT)}  {w}x{h}')


def run(cid: str) -> None:
    if cid == 'reven':
        sheet = np.asarray(Image.open(SRC / 'crew_overview_sheet.png').convert('RGB'))
        for view, (x0, y0, x1, y1) in REVEN_BOXES.items():
            save(cut(sheet[y0:y1, x0:x1], tol=16.0), f'reven_{view}')
        return
    portrait = np.asarray(Image.open(SRC / f'{cid}_portrait.png').convert('RGB'))
    save(cut(portrait), f'{cid}_portrait')
    sheet = np.asarray(Image.open(SRC / f'{cid}_sheet.png').convert('RGB'))
    front, side, back = figures_in_strip(sheet, VIEW_STRIPS[cid], tol=16.0)
    for view, piece in (('front', front), ('side', side), ('back', back)):
        save(cut(piece, tol=16.0), f'{cid}_{view}')


def main() -> None:
    ids = sys.argv[1:] or ['momo', 'nunu', 'ruki', 'poko', 'yomi', 'reven']
    for cid in ids:
        run(cid)


if __name__ == '__main__':
    main()
