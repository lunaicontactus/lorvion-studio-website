# EUNGARAGE WORLD 2.1 — the rework

Branch `world-2.1`, from the released WORLD 2.0 (`cec93cc`, live at
https://eungarage.com). Not deployed: main is untouched, because a push to
main redeploys the site.

What changed, in the order the brief set.

## PHASE A — the broom, the ways between worlds, the polaroids, the sounds

**Polaroids** (`c055d57`). The single "polaroid bundle" picture is gone as an
idea. The archive's round table is a record: one photo per entry in
`src/data/polaroids.ts` (`id`, `src`, optional `title`, `note`, `date`,
`category: game | dev | sketch | memory`). To add one: put the image in
`public/assets/images/polaroids/` and add a line to `ADDED`. An empty record
shows "기록이 아직 쌓이는 중입니다" and nothing breaks (`?album=empty` shows it).
It starts from what the site already has for real — the five games' key art
and the workbench's six working records with their dates and commits. The
table is laid out for however many photos there are, columns chosen from the
table's real shape so no card is ever buried; a photo is picked up with a
touch, turned with ‹ ›, the arrow keys or a swipe, and put back with Escape.

**Sounds** (`d478b21`). Only what the studio delivered. The eight stock clips
(click, door, drawer, bell, discovery, keyboard, surprise, wrapper) and their
files are gone. A garage thing used to play its stock clip *on top of* its
own delivered sound; now one touch is one sound (asserted in
`e2e/presentation.spec.ts`). Things with no sound of their own — the parcel,
the shelf, a locked door — are silent. From the 09-19 delivery:

| Delivered file | Web file | Use |
|---|---|---|
| `FOODEat-video_game_eat_sound-Elevenlabs.wav` | `sfx/eat.m4a`, `sfx/eat_soft.m4a` | YOMI's bites (the big first bite, the small second), louder as the room gets louder |
| `sfx_poko_turn_v01.wav` | `sfx/poko_turn.m4a` | POKO spinning round; the music ducks under it |
| `sfx_poko_step_v01.wav` (20 s of steps) | `sfx/poko_step.m4a` (its clearest 1.2 s) | POKO's head coming up |
| `archive_music_box_loop_v01.wav` | `music/music_box.m4a` | the music box's own tune, the archive's song dimmed under it |
| `ambience_entrance_alley.wav` | `ambience/alley.m4a` (levelled +30 dB) | the alley's air, from ENTER until the room takes over |
| `ambience_playground_night_v01.wav` | `ambience/playground_night.m4a` (levelled +25 dB, looped with a crossfade) | the playground's night air, under its music; steps out during a game |

**The broom** (`d478b21`). Rare (every 2½–4½ minutes, never in the first
minute), smaller than a dokkaebi, never fully opaque, on the floor line only.
It fades in a step from its spot, sweeps once, rests, and fades a step on —
no shuffle along the boards, no bounce, no second sweep; under 40 world units
of travel and a quarter of the crew's walking speed (unit- and
browser-tested). `?broom=now` brings it forward so its routine can be seen.

**The way out to the playground** (`d478b21`). The door opens; the room's
sound goes down with the light; the night comes in blue, the doorway's warm
light in it; a breath of dark in which the playground's air starts; the
playground arrives a little close and dim and settles back to itself; its
places come up only as the night lifts. About four seconds from the door,
asserted both ways (more than 3.5 s: not a cut; under 6 s: not a drag).

**Into a game** (`d478b21`). Touch a building: it grows out of its place, its
sign lights with the lantern's sound, and a moment later the screen is
covered in pixels block by block, the game's name on the dark, and the game
is there. Leaving is the same, backwards. 들어가기 is still the immediate way;
Escape during the moment says no.

## PHASE B — 요미의 과자 몰래 먹기 (replaces 무궁화꽃이 피었습니다)

The old game and its tests are gone (`src/games/poko/{game,round,boss,glasses}.ts`,
`test/poko.test.ts`, `e2e/poko.spec.ts`; the measured eye anchors stay). The
id `mugunghwa` stays, so a star already earned still counts at the door.

A summer night in the woods behind POKO's office. Everyone is at a desk on
the grass — RUKI and NUNU in the middle, MOMO and YOMI in front — and POKO at
the back, its back to them all, at its desk under the lamp. **YOMI is the
player.** Hold the button (Space, or a thumb on the pad): YOMI sneaks bites
of a crisp bag under the desk, the eating sound crunches (louder as the room
gets louder), the score runs ×1 → ×2 → ×3 the longer the bites go on, and
the SOUND meter fills. POKO's head comes up — "?", and a step — that is the
moment to stop. Sometimes it is nothing and POKO goes back to work; sometimes
it spins round (its own sound, the glasses catching the lamp) and stares. Seen
with a mouthful: the screen shakes, "들켰다!", a heart. Three hearts, or 45
seconds.

The rules are a pure state machine (`src/games/sneak/round.ts`: WORK →
NOTICE → TURN → WATCH → RECOVER, noise shortening the quiet and the
warning), tested by simulation (`test/sneak.test.ts`): a player who lets go
within 0.2 s of the "?" is never caught and scores 210–255 over 40 seeds;
one who eats into the turn is caught three times and rarely passes 150; a
greedy one is out fast. Stars at 100 / 200 / 270.

## PHASE C — 모모의 택배 배달 (replaces 택배 정리)

The sorting game and its tests are gone (`src/games/parcel/*`,
`test/parcel.test.ts`, `e2e/parcel.spec.ts`, `scripts/parcel-balance.mjs`).
The id `parcel` stays.

Stage 1, the dokkaebi village at night, one screen in the old arcade way:
the ground, one-way roof-tile ledges to jump up through, the parcel pile by
the gate, and two doors up top — the parcel office on the right roof, a
house on the left — taken in turn, the waiting one lit with a bouncing
arrow. **MOMO is the player**: walk, jump (a short hop if the button is let
go early; a moment's grace off a ledge's edge), carry the parcel overhead
(a little slower, a little lower jump). The village's ghosts drift on the
ledges and one floats across the sky; touching one costs a heart and the
parcel falls back to the pile, with a moment of flickering safety. A
delivery bursts into sparks with its score; deliveries in a row are worth
more; every second delivery another ghost comes out. Three hearts, or 60
seconds.

`src/games/delivery/round.ts` is the rules with no drawing; the unit test
walks MOMO from the pile to *both* doors on the controls alone, so the stage
is proven playable, not just drawn (`test/delivery.test.ts`).

## PHASE D — one pixel series, one way in and out

**The pixel engine** (`src/games/pixel/`). Every game draws on the same
240 × 160 screen, scaled by whole multiples when there is room, never
smoothed (`stage.ts`). The cast are the approved crew frames, brought down
to 20–46 pixels tall, colours stepped to a few flat ones, a one-pixel dark
outline round each (`sprites.ts`) — nothing about a face is redrawn, and
POKO's glasses are drawn at its measured eye anchors in the frozen design
of the POKO game — two thin round rims, empty lenses, a bridge — in
pixels. A 3 × 5 bitmap face for numbers and short
words (`font.ts`), and a small shared palette and pixel art for what no
delivered picture is: hearts, stars, the crisp bag, the ghosts, crates,
lanterns, sparks, the "!" (`art.ts`).

**The shell** (`src/styles/games.css`). A game is its own world: a dark
screen with faint scanlines, nothing of the painted site round it, a frame
in whole pixels, pixel lettering, blocky buttons that press down; the
ready / pause / result screens are dialog boxes from an old game. The same
for all three.

**도깨비 야식 심부름** is on the pixel screen too: the stall's red awning and
steaming pot, the customer from their own wave frames, what they want as a
pixel picture in their bubble, the shelf a row of pixel cards drawn from the
fridge's own cut-outs. Its rules are unchanged.

**One way in.** Works are in the garage (the PC, the wall); games are in the
playground's buildings, and only there — `?play=<id>` now steps out to the
playground first. The legacy "빌드 중입니다, 부장님" game, reachable only by
that link and not a pixel game, is gone with its tests; the shell checks it
carried (pause on a lost window, only the button resumes, retry from zero,
the way back) moved to 요미의 과자 몰래 먹기 in `e2e/journey.spec.ts`. The
input manager learned named controls held at once (left, right, jump) from
keys or `data-control` buttons, for the platformer.

## Images that would make the pixel games hand-drawn

Everything above is built from what exists: the crew's approved frames
brought down to pixels, the fridge's cut-outs, and pixel art authored in
code for the stages. If the studio wants hand-drawn pixel art instead, these
are the files. The games already draw everything from sprite frames and
tiles, so swapping them in is a change to each game's loader — not wired
yet, because looking for files that do not exist would put 404s in the
site's requests:

| File | Use | Size | Transparency |
|---|---|---|---|
| `snack_yomi_work_v01.png` | YOMI at the desk, pretending to work (2–4 frames in a strip) | 32 × 40 per frame | yes |
| `snack_yomi_eat_v01.png` | YOMI sneaking a bite (2–4 frames) | 32 × 40 per frame | yes |
| `snack_yomi_caught_v01.png` | YOMI startled | 32 × 40 | yes |
| `snack_poko_work_back_v01.png` | POKO working, from behind (2–4 frames) | 28 × 32 per frame | yes |
| `snack_poko_notice_v01.png` | POKO's head coming up | 28 × 32 | yes |
| `snack_poko_turn_v01.png` | POKO mid-turn | 28 × 32 | yes |
| `snack_poko_watch_v01.png` | POKO staring, in glasses | 28 × 32 | yes |
| `snack_cookie_v01.png` | the snack (bag or cookie) | 8 × 10 | yes |
| `snack_bg_forest_night_v01.png` | the woods and the desks | 240 × 160 | no |
| `delivery_momo_v01.png` | MOMO: idle, 4 walk, jump, hurt, each with and without a parcel | 16 × 20 per frame | yes |
| `delivery_ghost_v01.png` | a ghost, 2 frames | 10 × 12 per frame | yes |
| `delivery_tiles_v01.png` | ground, ledge, door, pile (8 × 8 tiles) | 64 × 64 sheet | yes |
| `delivery_bg_village_v01.png` | stage 1's sky and houses | 240 × 160 | no |
| A Korean pixel font (e.g. Galmuri, OFL) | the games' words | — | — |

A Korean pixel face needs bundling a font file, which is a download; it has
not been done. Until then numbers and short English words are drawn in the
games' own bitmap face and Korean falls back to a monospace face.

## PHASE E — tests

On `da35147`, `--retries=0`, 2026-09-19:

| | |
|---|---|
| typecheck | clean |
| lint | clean |
| unit (vitest) | 220 / 220 |
| Playwright, all projects | 287 / 287 — chromium 249, shell 12, webkit 13, firefox 13; 0 failed, 0 skipped (48.9 min) |

Tests added: `test/polaroids.test.ts`, `test/sneak.test.ts` (simulated
rounds), `test/delivery.test.ts` (MOMO walked to both doors), the broom's
rarity/travel/speed/opacity/floor-line cases in `test/living.test.ts`,
`e2e/sneak.spec.ts`, `e2e/delivery.spec.ts`, the album and empty-record
cases in `e2e/archive.spec.ts`. Tests removed with the games they tested:
`test/poko.test.ts`, `test/parcel.test.ts`, `test/boss.test.ts`,
`e2e/poko.spec.ts`, `e2e/parcel.spec.ts`, `e2e/minigame.spec.ts`. Tests
changed because the product changed: the crossing now asserts it takes
3.5–6 s (it asserted under 3.2 s); leaving a game returns to the
playground (it asserted the garage); the snack shelf's pictures are
checked by the cut-out each pixel icon is drawn from; the shelf is
asserted silent and every touch one sound. No timeout was raised to pass
anything, nothing skipped.

Found and fixed on the way, by the tests and the captures: the album's
cards buried one another on a short landscape table (columns now chosen
from the table's real shape); the pixel screen overflowed its box on a
landscape phone (it now fits its own cell); the snack shelf's cards were
40 px wide on a landscape phone (a shared pad style overrode their grid);
the wipe's title never reached full strength before the screen uncovered.

Captures: `docs/shots/world21` (the album; each game's sign, ready screen,
play and result, at 1440 × 900, 390 × 844, 844 × 390).
