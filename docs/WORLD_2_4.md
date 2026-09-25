# EUNGARAGE WORLD 2.4 — second pass: the radio, MOMO's steps, the telescope

Branch `world-2.4`, from `d822641` (live). Three things the studio found by
playing the site after WORLD 2.3, each traced to its cause before it was
touched. Not deployed: READY FOR HUMAN REVIEW.

## 1. The garage's music was still under the radio

**Cause.** The room had two music tracks by design, and the earlier fix
never looked at the second one. `ambient.m4a` was the garage's "room tone",
looping at 0.16 under whatever the radio played, and again at 0.10 under
the archive's song. It is not air: it is a 122-second tonal track (spectral
flatness 0.016 — the garage song's is 0.041; both sit at −14.6 dBFS), from
the site's first build in September, before the studio delivered its
music. Every station on the dial played over it. The e2e test that swore
music was "one at a time" did not count it as music, which is why it passed.

The second half of the cause: the radio's knob *was* the site's sound
switch. There was no state in which the room's song played with the radio
off, so "radio off → garage music back" could not exist.

**What changed** (`src/systems/audio.ts`, `src/systems/musicOwner.ts`):

- Music has one owner at a time — `garage`, `radio`, `archive`,
  `playground`, `game` or nobody — written as a pure rule
  (`ownerFor`) and applied by the manager. `musicSounding` and
  `musicOwner` report it.
- The room's own song (`garage.m4a`, 0.34) lives on one element for the
  life of the page, so it resumes from where it was.
- The radio has its own switch, `setRadio(on, station?)`, remembered in
  the save as `radioOn`. The nav switch is the master. Asking the radio for
  a station with the site silent turns the sound on too; turning the radio
  off leaves the sound on, with the room's song.
- Handovers are sequential, never a crossfade (`HANDS`): on the knob, the
  song goes down to 0 over 800 ms and pauses, *then* the station comes up
  over 600 ms; off, the station goes down over 500 ms, *then* the song comes
  back over 800 ms from the second it was paused at; a station change is
  180 ms down, 260 ms up. Between worlds the old music is out (420 ms)
  before the new one starts, on a different element as before.
- 88.1 GARAGE is the room's own song on the dial: on that station the radio
  is where the song comes from, and nothing restarts. The first time the
  radio is switched on it is on 91.7 NIGHT (the track that used to be the
  tone), so switching it on is audibly a change.
- The room tone is gone: no `toggleAmbient`, no `ambient` element. The
  archive plays its own song only. `ambient.m4a` is NIGHT 91.7 and nothing
  else. Room air outside (the alley, the playground's night) is unchanged:
  those are not music.
- The power sound is the knob's alone: once, off → on. Not the master
  switch, not the tab coming back, not a station change.

**Heard, on the built site** (headless Chromium, every media element
watched): in the room, `garage.m4a` alone. Knob on: `radio_tune` once;
the song 0.34 → 0 over 800 ms and paused at 6.3 s; a moment of nothing;
`ambient.m4a` up to 0.38. Thirty seconds: one track sounding, never the
song. Four station changes: one at a time (`radio_static_bed` ×2, then
88.1 = the song resumed at 7.0 s, then NIGHT). Knob off: the station out,
the song back from where it stopped. `e2e/audio.spec.ts` does the same,
sampling every 100 ms through each handover and every 500 ms for thirty
seconds, with `ambient.m4a` now counted as music.

## 2. Pages turning while MOMO ran with the parcel

**Cause.** `src/games/delivery/game.ts` played `paper` — the studio's
three-second page-rustle (`sfx_paper.wav`, audible for 2.2 s) — on the
`pickup` event. Picking the parcel up is the moment MOMO starts running
with it, so the rustle ran over the whole way to the door, and again after
every drop and every delivery. There was no running sound at all: the only
other clip in the game was the crew footstep on the jump.

**What changed.** `paper` is off the pickup (the pickup has no sound of its
own now — nothing borrowed). Running has footfalls: one clip per step, on
the walk cycle's own cadence (`src/games/delivery/steps.ts`: four frames at
ten a second, a foot down every 200 ms of grounded walking, carrying or
not), alternating a little in level, never standing still and never in the
air. `test/steps.test.ts` holds the cadence;
`e2e/delivery.spec.ts` listens: nothing standing, no `paper` at the pile,
four to eight footfalls in 1.2 s of running with the parcel, nothing
standing with it, no footfall in a jump.

**The jump.** The studio's own retro jump —
`~/Desktop/eungarage-website/assets/a_videogame_retro_ju-1790301919116.wav`
(ElevenLabs, 2026-09-25 11:05, 1.07 s, audible for 0.3 s: a clean rise from
234 Hz to 3.3 kHz, loud for the first 130 ms) — is the one new audio file
in the project, and it is a jump. Encoded to
`public/assets/audio/sfx/momo_jump.m4a` (`scripts/audio.sh`) and bound as
`momo_jump` to the delivery game's `jump` event, which the round raises
only on the frame MOMO leaves the ground: holding the key is one jump, a
press in the air is nothing until the ground, landing is not a jump
(`test/delivery.test.ts`; `e2e/delivery.spec.ts` listens through press,
hold, air, landing, a second press, and carrying: 1, 1, 1, 2, 3). The crew
footstep that used to stand in for the jump is off it.

**Running.** No running sound has been delivered: the jump above is the
only new audio anywhere in the project or nearby, and it is not a run.
`run_step` stays on the studio's crew footstep (`crew_step_01.m4a`) until
one is; swapping it in is one line plus an `afconvert`. Effect elements
now carry their clip name (`data-clip`), since two names may share a file
and the tests listen by name.

## 3. The telescope was the room, enlarged

**Cause.** `openSky` in `src/scenes/archive.ts` called `fitSky`, which set
the plate itself as the background of a full-window layer, cropped to the
plate's `sky` rectangle and scaled to cover — the room's own glass, bigger,
with the dome's ironwork in it. The one shooting star was the user's
overlay, always on the same path.

**What changed.**

- A sky of its own (`src/scenes/sky.ts`, canvas, no dependency): 1,146
  stars in three depths — 900 far and small (55% of them along a faint
  band across the sky, with a breath of light under it), 220 nearer, 26
  bright with a soft glow — each with its own size, light and colour
  (white, warm, blue). About a quarter breathe, each on its own period
  (2.2–6.4 s) and phase; never all, never together. The depths drift at
  0.55 / 1.05 / 1.7 px a second and wrap: a parallax you feel, not see.
  Still stars are painted once per depth to a layer; only the breathing
  ones and the falling ones are drawn each frame.
- A star falls after 3.5–7 s, then every 5–15 s (12% of the time a second
  one 0.3–0.7 s behind): from somewhere in the upper sky, down and to one
  side, 150–270 px, 0.65–1.05 s, a trail that fades. Never the same path.
  `test/sky.test.ts` holds all of it from a seed.
- The view: the sky fades in over 700 ms (the view settling from 1.06 to
  1), the room's stage is hidden under it, the nav goes, the eyepiece is a
  soft dark at the corners with a faint ring — the round is 46% of the
  longer side, so most of the window is sky on every size. Nothing of the
  room is in it: no plate, no furniture, no card, no name.
- Out: one pill in the top corner, "✕ 별 보기 닫기", 44 px tall, always
  there; Escape; focus goes to it on open and back to the telescope on
  close. The archive's song is ducked to 72% under the sky and comes back.
  No sound for a falling star, none for looking up.
- Reduced motion: the field holds still, a star falls without travelling.

## 4. The way home from the archive

The archive had no way back but the browser's Back. Now the felt door the
visitor came through is beside them, from this side — the studio's own
`secret_door.webp`, in the corner nearest the visitor, always in view, on
every size (104–168 px tall, clamped to the viewport), never a button.
Under the pointer it comes forward with the garage's warm light behind it
and a small label, "차고로 돌아가기"; pressed, it gives; released, the leaf
(the same picture, cut to itself) swings on its hinge with the light in
the gap, and 460 ms later the crossing to the garage. Tab reaches it;
Enter and Space open it. It steps aside under the sky and in Healing Mode.
`#archive` is cleared from the address on the way out.

## 5. Tests

- Unit: `test/music.test.ts` (the owner rule, the hand timings),
  `test/steps.test.ts`, `test/sky.test.ts`; 260 passing (with the jump's own).
- Playwright: `e2e/audio.spec.ts` rewritten (the song alone; knob on → out
  → station, 30 s, four changes, off → back where it was; the power sound
  once and not from the master switch; the static bed; out and back through
  the door; a hidden tab), `e2e/delivery.spec.ts` (the steps),
  `e2e/archive.spec.ts` (the sky at three sizes: opaque, whole, no plate,
  stage hidden, stars, the control, a star falls, Escape, the control, the
  door pressed → opening → garage; the keyboard's way home);
  `cinematic`, `outside`, `living`, `ia`, `presentation` updated for a room
  with one song and a radio with its own knob.

## 6. Captures

`docs/shots/world24/`, at 1440×900, 390×844 and 844×390: the archive, the
door under the pointer (desktop), the sky coming in, the sky, the frame a
star fell on, the control under the pointer (desktop), the way out, the
archive again, the door pressed, the door opening, the garage.
