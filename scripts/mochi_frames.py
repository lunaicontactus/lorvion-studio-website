"""Animation frames for the mochi crew (EUNGARAGE 2.0), from the cut-outs.

The art is never redrawn. Every frame is the character's own picture, bent:
a mochi body is soft, so a walk is a body that dips, lifts one foot, leans,
lands flat and springs back, and the top of the body (head, ears, pin,
headphones) follows the bottom a beat late. All of that is a smooth warp of
the cut-out — a squash about the floor, a shear that grows with height and
lags with it, and a lift of one bottom lobe — sampled at twice the output
size and scaled down, so edges stay clean.

Why frames and not bones in the browser: the room already plays frame sets
through one shared ticker (src/systems/spriteAnimator.ts, src/data/sprites.ts)
for every character, with measured cadence, hit boxes and preloading. Feeding
it frames keeps all of that — six characters cost six <img> swaps per tick,
not six warps per frame on a phone.

Contract (docs/SPRITE_PIPELINE.md, same as the previous crews):
  public/assets/images/crew-mochi/<id>/<action>/<dir>/<id>_<action>_<dir>_NN.webp
  every frame FRAME_H px tall, one width per character, the bottom edge is
  the floor (feet), the figure is FIGURE_H px tall when standing.

Views: front = the single portrait (largest, sharpest art); left = the sheet's
side view (every sheet draws it facing left); right = that, mirrored; back =
the sheet's back view.

    python3 scripts/mochi_frames.py            # all six
    python3 scripts/mochi_frames.py momo       # one
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
CUT = ROOT / 'assets/crew-mochi/cut'
OUT = ROOT / 'public/assets/images/crew-mochi'

FRAME_H = 420
FIGURE_H = 372          # standing figure height in the frame
SS = 2                  # supersampling

# Which directions each action is drawn in (the room falls back to front).
DIRS = {
    'idle': ('front', 'back', 'left', 'right'),
    'walk': ('front', 'back', 'left', 'right'),
    'work': ('front', 'back'),
    'sit': ('front', 'left', 'right'),
    'wave': ('front',),
    'look': ('front',),
}
FRAMES = {'idle': 4, 'walk': 8, 'work': 6, 'sit': 4, 'wave': 6, 'look': 6}

# How soft each one is. Bigger = wobblier. Measured by eye against the sheets'
# own motion strips, which show how far each character squashes and leans.
SOFT = {'momo': 1.0, 'nunu': 0.85, 'ruki': 0.9, 'poko': 0.8, 'yomi': 1.1, 'reven': 0.9}


def load(cid: str, view: str) -> Image.Image:
    name = {'front': 'portrait', 'left': 'side', 'right': 'side', 'back': 'back'}[view]
    im = Image.open(CUT / f'{cid}_{name}.png').convert('RGBA')
    if view == 'right':
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    return im


def figure_height(im: Image.Image) -> int:
    a = np.asarray(im)[..., 3]
    ys = np.nonzero(a.max(axis=1) > 128)[0]
    return int(ys.max() - ys.min() + 1)


def premult(im: Image.Image, scale: float) -> np.ndarray:
    w, h = round(im.width * scale), round(im.height * scale)
    im = im.resize((w, h), Image.LANCZOS)
    a = np.asarray(im).astype(np.float64) / 255.0
    a[..., :3] *= a[..., 3:4]
    return a


class Pose:
    """One frame's warp, in figure units: v = 0 at the floor, 1 at the top;
    u = 0 at the figure's centre line, ±0.5 at its sides."""

    def __init__(self, sy=1.0, lean=0.0, lag=0.0, lean_phase=0.0, lift_l=0.0, lift_r=0.0,
                 rise=0.0, spread=0.0, tilt=0.0):
        self.sy = sy            # vertical scale about the floor
        self.lean = lean        # horizontal shift of the top, in figure heights
        self.lag = lag          # extra lean of the top only (jelly follow-through)
        self.lift_l = lift_l    # how far the left bottom lobe is raised (figure heights)
        self.lift_r = lift_r
        self.rise = rise        # whole figure off the floor (figure heights)
        self.spread = spread    # extra widening at the bottom when squashed
        self.tilt = tilt        # head tilt: shear of the top third only


def smooth(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def render(src: np.ndarray, fw: int, fh_px: float, pose: Pose) -> np.ndarray:
    """Warp `src` (premultiplied RGBA, figure fills its height `fh_px`, feet on
    its last row) into a frame of width fw*SS and height FRAME_H*SS."""
    H, W = FRAME_H * SS, fw * SS
    sh, sw = src.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    base = H - 1
    cx = W / 2.0
    # Output pixel in figure units.
    v = (base - yy) / fh_px
    u = (xx - cx) / fh_px
    # Lift the whole figure (jump).
    v = v - pose.rise
    # Squash/stretch about the floor, keeping volume: narrower when tall,
    # wider when flat, and widest near the floor (the mochi spreads).
    sy = pose.sy
    sx = (1.0 / math.sqrt(sy)) * (1.0 + pose.spread * np.clip(1.0 - v, 0, 1))
    vs = v / sy
    # Lean grows with height; the top lags further (follow-through).
    lean = pose.lean * np.clip(vs, 0, 1.3) ** 1.25 + pose.lag * smooth(0.45, 1.0, vs)
    lean += pose.tilt * smooth(0.55, 1.0, vs)
    us = (u - lean) / sx
    # Raise a bottom lobe: pixels just above the floor on that side come from
    # lower in the source, which pulls the foot's bottom edge up.
    foot = smooth(0.17, 0.0, vs)
    side_l = smooth(0.02, -0.16, us)
    side_r = smooth(-0.02, 0.16, us)
    vs = vs - (pose.lift_l * side_l + pose.lift_r * side_r) * foot
    # Back to source pixels.
    sy_px = (sh - 1) - vs * fh_px
    sx_px = sw / 2.0 + us * fh_px
    out = np.zeros((H, W, 4))
    coords = np.array([sy_px, sx_px])
    for c in range(4):
        out[..., c] = ndimage.map_coordinates(src[..., c], coords, order=1, mode='constant', cval=0.0)
    # Nothing below the floor and nothing under a lifted foot comes back.
    out[(v < 0)] = 0
    return out


def to_image(arr: np.ndarray, fw: int) -> Image.Image:
    a = arr.copy()
    alpha = a[..., 3:4]
    with np.errstate(divide='ignore', invalid='ignore'):
        a[..., :3] = np.where(alpha > 1e-4, a[..., :3] / np.maximum(alpha, 1e-4), 0)
    im = Image.fromarray(np.clip(a * 255, 0, 255).round().astype(np.uint8))
    return im.resize((fw, FRAME_H), Image.LANCZOS)


def poses(action: str, view: str, n: int, k: float) -> list[Pose]:
    out = []
    side = view in ('left', 'right')
    facing = -1.0 if view == 'left' else 1.0
    for i in range(n):
        t = i / n
        s = math.sin(2 * math.pi * t)
        c = math.cos(2 * math.pi * t)
        if action == 'idle':
            # A breath: a little taller, a little flatter, the top half a beat late.
            out.append(Pose(sy=1.0 + 0.022 * k * s, lag=0.008 * k * math.sin(2 * math.pi * (t - 0.2))))
        elif action == 'walk':
            # Two steps per cycle: dip, lift, lean over, land flat, spring back.
            step = (i % (n // 2)) / (n // 2)          # 0..1 within one step
            first = i < n // 2
            lift = 0.075 * k * math.sin(math.pi * step)
            squash = 1.0 - 0.06 * k * math.cos(math.pi * step) ** 2
            sway = 0.035 * k * math.sin(math.pi * step) * (1 if first else -1)
            if side:
                lean = 0.03 * k * facing + 0.012 * k * math.sin(2 * math.pi * step)
                out.append(Pose(sy=squash, lean=lean, lag=0.012 * k * facing * math.cos(math.pi * step),
                                lift_l=lift if first else 0.0, lift_r=0.0 if first else lift,
                                spread=0.05 * (1 - squash) * 10, rise=0.012 * k * math.sin(math.pi * step)))
            else:
                out.append(Pose(sy=squash, lean=sway, lag=-0.5 * sway,
                                lift_l=lift if first else 0.0, lift_r=0.0 if first else lift,
                                spread=0.05 * (1 - squash) * 10, rise=0.010 * k * math.sin(math.pi * step)))
        elif action == 'work':
            # Busy hands: a quick small bob, leaning into the task.
            bob = 0.018 * k * abs(math.sin(2 * math.pi * t * 2))
            out.append(Pose(sy=1.0 - bob, lean=0.012 * k * s, lag=0.01 * k * c, spread=bob))
        elif action == 'sit':
            # Settled: flat and wide, still breathing.
            out.append(Pose(sy=0.86 + 0.015 * k * s, spread=0.10, lag=0.006 * k * c))
        elif action == 'wave':
            # A happy hop: squash, spring up, hang, land flat, recover.
            seq = [(0.88, 0.0), (1.10, 0.06), (1.04, 0.11), (1.0, 0.07), (0.86, 0.0), (0.97, 0.0)]
            sy, rise = seq[i % len(seq)]
            out.append(Pose(sy=1 + (sy - 1) * k, rise=rise * k, spread=max(0.0, 1 - sy) * 0.8,
                            lag=0.015 * k * (1 if i in (2, 3) else 0)))
        elif action == 'look':
            # Head on one side, then the other: only the top third tilts.
            seq = [0.0, 0.05, 0.07, 0.03, -0.04, -0.06]
            out.append(Pose(tilt=seq[i % len(seq)] * k, sy=1.0 + 0.01 * k * s))
    return out


def build(cid: str) -> dict:
    k = SOFT[cid]
    views = {v: load(cid, v) for v in ('front', 'left', 'right', 'back')}
    # Scale every view so its figure is FIGURE_H tall (in supersampled pixels).
    fh_px = FIGURE_H * SS
    srcs = {v: premult(im, fh_px / figure_height(im)) for v, im in views.items()}
    # One frame width for the character: the widest view, plus room to lean,
    # spread and tilt.
    widest = max(s.shape[1] for s in srcs.values()) / SS
    fw = int(math.ceil(widest * 1.18 / 2) * 2)
    meta = {'frameWidth': fw, 'frameHeight': FRAME_H, 'figureHeight': FIGURE_H, 'frames': FRAMES}
    for action, dirs in DIRS.items():
        for d in dirs:
            folder = OUT / cid / action / d
            folder.mkdir(parents=True, exist_ok=True)
            for i, pose in enumerate(poses(action, d, FRAMES[action], k), start=1):
                im = to_image(render(srcs[d], fw, fh_px, pose), fw)
                im.save(folder / f'{cid}_{action}_{d}_{i:02d}.webp', 'WEBP', quality=88, method=6)
    # Measure what the room needs off the standing frames, like the old crews.
    idle = Image.open(OUT / cid / 'idle' / 'front' / f'{cid}_idle_front_01.webp')
    a = np.asarray(idle)[..., 3]
    ys = np.nonzero(a.max(axis=1) > 128)[0]
    xs = np.nonzero(a.max(axis=0) > 128)[0]
    meta['figureRatio'] = round((ys.max() - ys.min() + 1) / FRAME_H, 4)
    meta['bodyWidth'] = round((xs.max() - xs.min() + 1) / fw, 4)
    meta['aspect'] = f'{fw} / {FRAME_H}'
    print(cid, json.dumps(meta))
    return meta


def main() -> None:
    ids = sys.argv[1:] or ['momo', 'nunu', 'ruki', 'poko', 'yomi', 'reven']
    metas = {cid: build(cid) for cid in ids}
    path = OUT / 'metrics.json'
    old = json.loads(path.read_text()) if path.exists() else {}
    old.update(metas)
    path.write_text(json.dumps(old, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
