"""Night over a pink-graded plate (EUNGARAGE 2.0): mids and darks sink into
lavender-navy, the brightest parts (lamps, lit windows) keep their light.
    python3 scripts/pink_night.py in.png out.png [strength]"""
import sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
k = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
im = Image.open(src)
alpha = im.getchannel('A') if im.mode == 'RGBA' else None
a = np.asarray(im.convert('RGB')).astype(np.float32) / 255
lum = 0.299*a[...,0] + 0.587*a[...,1] + 0.114*a[...,2]
night = (a ** (1 + 0.55*k)) * np.array([0.80, 0.70, 0.98])
keep = np.clip((lum - 0.80) / 0.15, 0, 1)[..., None]          # lamp-bright stays
glow = np.clip((lum - 0.88) / 0.12, 0, 1)[..., None]
out = night*(1-keep) + a*keep + glow*np.array([0.06, 0.0, 0.03])
img = Image.fromarray((np.clip(out, 0, 1)*255).astype(np.uint8))
if alpha is not None: img = img.convert('RGBA'); img.putalpha(alpha)
img.save(dst)
