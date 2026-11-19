import sys, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
hsv = np.asarray(im.convert('HSV')).astype(np.float32)
H = hsv[...,0]*360/255; S = hsv[...,1]/255; V = hsv[...,2]/255
Vn = np.clip(V ** 0.7 * 0.96 + 0.04, 0, 1)
warm = np.clip(1 - np.minimum(np.abs(((H - 30 + 180) % 360) - 180) / 33, 1), 0, 1)  # 1 at hue 30, 0 beyond ±45
red = np.clip(1 - np.minimum(np.abs(((H - 355 + 180) % 360) - 180) / 25, 1), 0, 1)
blue = np.clip(1 - np.minimum(np.abs(((H - 215 + 180) % 360) - 180) / 45, 1), 0, 1)
green = np.clip(1 - np.minimum(np.abs(((H - 90 + 180) % 360) - 180) / 40, 1), 0, 1)
# targets
h_warm = 282 + (342 - 282) * np.clip((Vn - 0.35) / 0.5, 0, 1)   # dark wood → lavender-mauve, light plaster → pink
h_red = np.full_like(H, 340.0)
h_blue = np.full_like(H, 258.0)
h_green = np.full_like(H, 150.0)
def mix(base, tgt, w):
    d = ((tgt - base + 180) % 360) - 180
    return (base + d * w) % 360
Hn = H.copy()
Hn = mix(Hn, h_warm, warm); Hn = mix(Hn, h_red, red); Hn = mix(Hn, h_blue, blue); Hn = mix(Hn, h_green, green*0.85)
Sn = S * (0.75*warm + 0.8*red + 0.7*blue + 0.6*green + 0.8*(1-np.clip(warm+red+blue+green,0,1)))
Sn = np.clip(Sn, 0, 0.42) * (1 - 0.35*np.clip((Vn-0.75)/0.25,0,1))
out = np.stack([Hn/360*255, Sn*255, Vn*255], -1).astype(np.uint8)
res = np.asarray(Image.fromarray(out, 'HSV').convert('RGB')).astype(np.float32)
wash = np.array([236, 214, 246], np.float32)
res = res*0.9 + wash*0.1
Image.fromarray(np.clip(res,0,255).astype(np.uint8)).save(dst, quality=92)
