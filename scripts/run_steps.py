"""
MOMO's footfalls in the parcel game, from the studio's own walking clip.

    python3 scripts/run_steps.py

The delivered clip (ElevenLabs, `FEETHmn-A_boy_walking_on_the-Elevenlabs.wav`,
2.0 s) is three footsteps at a walk, about 600 ms apart. MOMO runs: a foot
comes down every 200 ms (src/games/delivery/steps.ts). Looping the clip
would put a step every 600 ms under feet landing three times as fast, so
each of the three steps is cut out on its own — the heel, and the short
scuff after it — and the game plays one per footfall, taking them in turn.

Nothing new is made: every sample is the delivered clip's. Each cut gets a
2 ms fade in and a 25 ms fade out so it starts and stops without a click,
and the three are brought to one peak so no step stands out; the game sets
the level.
"""
import os, subprocess, tempfile
import numpy as np
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.expanduser(os.environ.get(
    'SRC', '~/Desktop/eungarage-website/FEETHmn-A_boy_walking_on_the-Elevenlabs.wav'))
OUT = os.path.join(HERE, '..', 'public', 'assets', 'audio', 'sfx')
# Measured off the clip in 5 ms frames (floor −52 dB): each step from just
# before its heel strike to the end of its scuff.
STEPS = [(0.350, 0.500), (0.990, 1.100), (1.560, 1.705)]
FADE_IN, FADE_OUT = 0.002, 0.025
PEAK = 10 ** (-3 / 20)

sr, x = wavfile.read(SRC)
x = x.astype(np.float32) / 32768.0
if x.ndim > 1:
    x = x.mean(axis=1)

with tempfile.TemporaryDirectory() as tmp:
    for n, (a, b) in enumerate(STEPS, start=1):
        seg = x[int(a * sr):int(b * sr)].copy()
        fi, fo = int(FADE_IN * sr), int(FADE_OUT * sr)
        seg[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
        seg[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)
        seg *= PEAK / max(1e-6, float(np.abs(seg).max()))
        wav = os.path.join(tmp, f'step{n}.wav')
        wavfile.write(wav, sr, (seg * 32767).astype(np.int16))
        dst = os.path.join(OUT, f'momo_run_{n}.m4a')
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', wav, dst], check=True)
        print(f'{os.path.basename(dst)}: {len(seg) / sr * 1000:.0f} ms')
