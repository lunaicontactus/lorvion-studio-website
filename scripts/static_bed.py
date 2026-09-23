"""
A seamless static bed from the studio's own 2-second radio_static clip.

    python3 scripts/static_bed.py

The clip was looped as the NEWS and STATIC stations' track, and a 2-second
clip that restarts hard every 2 seconds sounds like a switch being thrown
again and again. This tiles the same clip with equal-power crossfades into a
longer bed and blends its tail into its head, so the loop seam and every
join are on noise, not on a restart. Nothing new is made: every sample is
the delivered clip's.
"""
import os, subprocess, tempfile
import numpy as np
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, '..', 'public', 'assets', 'audio')
SRC = os.path.join(AUDIO, 'sfx', 'radio_static.m4a')
DST = os.path.join(AUDIO, 'sfx', 'radio_static_bed.m4a')
TILES, XFADE = 14, 0.45

with tempfile.TemporaryDirectory() as tmp:
    wav_in, wav_out = os.path.join(tmp, 'in.wav'), os.path.join(tmp, 'out.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', SRC, wav_in], check=True)
    sr, x = wavfile.read(wav_in)
    x = x.astype(np.float32) / 32768.0
    if x.ndim == 1: x = x[:, None]
    xf = int(XFADE * sr)
    t = np.linspace(0, np.pi / 2, xf, dtype=np.float32)[:, None]
    g_out, g_in = np.cos(t), np.sin(t)
    # Alternate the clip forwards and reversed so no two joins sound alike.
    tiles = [x if i % 2 == 0 else x[::-1] for i in range(TILES)]
    out = tiles[0].copy()
    for tile in tiles[1:]:
        out[-xf:] = out[-xf:] * g_out + tile[:xf] * g_in
        out = np.concatenate([out, tile[xf:]])
    # The loop seam: the tail blended into the head, then the tail dropped.
    head = out[:xf].copy()
    out[-xf:] = out[-xf:] * g_out + head * g_in
    out = out[xf:]
    peak = float(np.abs(out).max())
    out = out / max(peak, 1e-6) * float(np.abs(x).max())
    wavfile.write(wav_out, sr, (out * 32767).astype(np.int16))
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', wav_out, DST], check=True)
    n = len(out)
    rms = lambda a: float(np.sqrt(np.mean(a.astype(np.float64) ** 2)))
    print(f'{DST}: {n / sr:.1f}s from {len(x) / sr:.1f}s, seam rms end {rms(out[-sr // 4:]):.4f} / start {rms(out[:sr // 4]):.4f}')
