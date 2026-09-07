"""Pull a green-screen prop out of its background without leaving a green rim.

The order matters. Keying on green *dominance* (g minus the stronger of r and
b) survives shadows and dark edges that a plain colour distance throws away.
Only green that reaches the border is background, though — a green bag in the
middle of the frame is the subject — so the key is confined to the region
connected to the edge of the picture. Despill then removes the green the
screen threw onto the object. Finally the resize is done on premultiplied
pixels: a transparent pixel still carries its old RGB, and LANCZOS will
happily drag that green back into the silhouette if you resize straight RGBA.

    python3 scripts/key_green.py <in.png> <out.webp> [max_edge]
"""
import sys
import cv2
import numpy as np
from PIL import Image

LOW, HIGH = 22, 78          # green dominance: fully object, fully screen
MAX_EDGE = 520


def key(path: str, out: str, max_edge: int = MAX_EDGE) -> None:
    src = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    dominance = g - np.maximum(r, b)

    alpha = np.clip((HIGH - dominance) / (HIGH - LOW), 0, 1)

    # Only the green that touches the edge of the frame is the screen. Anything
    # green enclosed by the subject stays fully opaque.
    screenish = (dominance > LOW).astype(np.uint8)
    screenish = cv2.morphologyEx(screenish, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    count, labels = cv2.connectedComponents(screenish, 4)
    border = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border.discard(0)
    background = np.isin(labels, list(border))
    alpha = np.where(background, alpha, 1.0)

    # Despill: hold green down to what the red/blue around it can justify.
    ceiling = np.maximum(r, b) + 0.12 * np.abs(r - b)
    spill = g > ceiling
    rgb = src.copy()
    rgb[..., 1] = np.where(spill, ceiling, g)

    # Premultiply, resize, unpremultiply: transparent pixels cannot bleed.
    pm = rgb * alpha[..., None]
    h, w = alpha.shape
    scale = min(1.0, max_edge / max(w, h))
    if scale < 1.0:
        size = (max(1, int(round(w * scale))), max(1, int(round(h * scale))))
        pm = np.asarray(Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8))
                        .resize(size, Image.LANCZOS)).astype(np.float32)
        alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8))
                           .resize(size, Image.LANCZOS)).astype(np.float32) / 255
    safe = np.maximum(alpha, 1e-4)[..., None]
    rgb = np.clip(pm / safe, 0, 255)

    # Unpremultiplying divides by a small alpha, which amplifies whatever green
    # survived along the edge. Every partly transparent pixel therefore gets a
    # hard clamp: green may not exceed the red or blue beside it. Interior
    # pixels are left alone so a genuinely green object keeps its colour.
    rim = alpha < 0.995
    ceiling = np.maximum(rgb[..., 0], rgb[..., 2])
    rgb[..., 1] = np.where(rim, np.minimum(rgb[..., 1], ceiling), rgb[..., 1])

    out_img = Image.fromarray(
        np.dstack([rgb, np.clip(alpha * 255, 0, 255)]).astype(np.uint8), 'RGBA')
    box = out_img.getchannel('A').point(lambda v: 255 if v > 6 else 0).getbbox()
    if box:
        out_img = out_img.crop(box)
    out_img.save(out, 'WEBP', quality=90, method=6)

    # Report the fringe rather than hope for it: the greenest edge pixel left.
    a = np.asarray(out_img.getchannel('A')).astype(int)
    px = np.asarray(out_img.convert('RGB')).astype(int)
    edge = (a > 20) & (a < 235)
    dom = px[..., 1] - np.maximum(px[..., 0], px[..., 2])
    worst = int(dom[edge].max()) if edge.any() else 0
    print(f'{out}  {out_img.size}  edge px {int(edge.sum())}  worst green dominance {worst:+d}')


if __name__ == '__main__':
    key(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else MAX_EDGE)
