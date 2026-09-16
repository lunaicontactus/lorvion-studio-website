#!/bin/sh
# Web copies of the user's delivered audio (sources stay out of git: the WAVs
# are 6–31 MB each). Source folder: ~/Desktop/eungarage-website/assets/new/
#
#   sh scripts/audio.sh
#
# AAC in M4A at 96 kbps for music, 128 kbps for short effects, via macOS
# afconvert. `밤의 작은 마법.m4a` is Opus-in-M4A, which afconvert cannot read;
# decoded through Chromium (scripts/decode-audio.mjs) it measured as the same
# recording as `Garage 메인.wav` (RMS envelope correlation 0.994 at 0 lag,
# 146.4 s both), so it is recorded as a DUPLICATE and not encoded again.
set -e
SRC="${SRC:-$HOME/Desktop/eungarage-website/assets/new}"
OUT="public/assets/audio"
mkdir -p "$OUT/music" "$OUT/sfx"
afconvert -f m4af -d aac -b 96000 "$SRC/Garage 메인.wav" "$OUT/music/garage.m4a"
afconvert -f m4af -d aac -b 128000 "$SRC/sfx_radio_tune.wav" "$OUT/sfx/radio_static.m4a"
echo "audio written"
