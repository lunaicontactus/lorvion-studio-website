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
# Object sounds, played at the moment the object reacts (PHASE 5).
for f in pc_on pc_click tv_channel fridge_open drawer_open paper radio_tune door_open shutter_open broom crew_step_01 game_start game_fail star_get secret_unlock lantern stall_bell; do
  afconvert -f m4af -d aac -b 96000 "$SRC/sfx_$f.wav" "$OUT/sfx/$f.m4a"
done
# MOMO's jump in the parcel game (WORLD 2.4): the studio's own retro jump,
# delivered to assets/ rather than assets/new/.
afconvert -f m4af -d aac -b 96000 "$SRC/../a_videogame_retro_ju-1790301919116.wav" "$OUT/sfx/momo_jump.m4a"
echo "audio written"
