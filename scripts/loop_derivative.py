"""
A web loop derivative of a delivered BGM that ends in a fade or a cadence.

The original is never touched. The derivative cuts the track before its
ending and crossfades the last stretch into the opening, so the seam sits on
music rather than on silence:

    python3 scripts/loop_derivative.py "in.wav" out.wav --cut 115.2 --xfade 2.0

`--cut` is where the ending starts (seconds); `--xfade` is how long the last
seconds are blended into the first. Reports the RMS around the seam so a
bad choice is visible in numbers as well as by ear.
"""
import argparse, math, struct, wave

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--cut', type=float, required=True)
ap.add_argument('--xfade', type=float, default=2.0)
a = ap.parse_args()

w = wave.open(a.src); sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
assert sw == 2, 'expects 16-bit PCM'
raw = w.readframes(n); w.close()
vals = struct.unpack('<' + 'h' * (len(raw) // 2), raw)
frames = [vals[i * ch:(i + 1) * ch] for i in range(n)]
cut = int(a.cut * sr); xf = int(a.xfade * sr)
assert xf < cut < n
# Body: 0 .. cut. The last xf frames of the body are blended with the first
# xf frames (equal-power), and the output loop is body[xf:] + blended head.
body = frames[:cut]
out = []
for i in range(xf, cut - xf):
    out.append(body[i])
for k in range(xf):
    t = k / xf
    g_tail = math.cos(t * math.pi / 2); g_head = math.sin(t * math.pi / 2)
    tail = body[cut - xf + k]; head = body[k]
    out.append(tuple(max(-32768, min(32767, int(tail[c] * g_tail + head[c] * g_head))) for c in range(ch)))
def rms(seg):
    flat = [s for f in seg for s in f]
    return math.sqrt(sum(s * s for s in flat) / max(1, len(flat))) / 32768
print(f'loop {len(out)/sr:.2f}s; rms start {rms(out[:sr//2]):.4f} end {rms(out[-sr//2:]):.4f} seam-in {rms(out[-xf:-xf+sr//2]):.4f}')
o = wave.open(a.dst, 'wb'); o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr)
o.writeframes(struct.pack('<' + 'h' * (len(out) * ch), *[s for f in out for s in f])); o.close()
