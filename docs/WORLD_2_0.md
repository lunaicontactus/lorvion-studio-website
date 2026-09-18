# EUNGARAGE WORLD 2.0 — progress log

Branch `world-2.0` (from `world-1.0`). Not deployed; production stays on `main`
until the final QA phase.

## Checkpoint 1 — benchmark · audit · brand · wall · garage IA

| Phase | Commit | What |
|---|---|---|
| POKO glasses | `0d2633b` | SVG overlay, per-frame eye anchors (see `src/games/poko/glasses.ts`) |
| A / 1 Benchmark + audit | `e3ecbe5` | `docs/BENCHMARK_WORLD_2.md`, `docs/WORLD_2_BASELINE.md` |
| 2 Brand | `f96bcdd` | v02 logo/icons/OG everywhere, metadata, JSON-LD, legacy scan in CI |
| 3 Wall art | `5170ded` | white/cream matte removed, frames = picture shape, mixed mounts |
| 4 Garage IA | (this checkpoint) | one role per object, discovery pool, radio, mute |

### Object-role map (after PHASE 4)

| Object | Role | Content source | Repeat behaviour |
|---|---|---|---|
| PC | **WORKS LIBRARY** — the 5 real games, detail per game | `PROJECTS` | — (the only list of works) |
| Wall (4 posters + RUBATO frame) | **ART GALLERY** — enlarge, title, one line, `PC에서 자세히 보기` | `data/artwork.ts` | — |
| Shelf | **DOKKA CREW COLLECTION** — 3 of 18 crew-owned items | `data/garage/shelf.ts` | pool, last 4 never repeat |
| Fridge | **CREW LIFE** — 오늘의 냉장고, 5 foods + a memo | `data/garage/fridge.ts` | seeded by local date: same all day |
| Parcel | **RANDOM DELIVERY** — the box opens in the room, one of 14 things comes out | `data/garage/parcels.ts` | pool; one rare item once per visit |
| TV | **EUNGARAGE TV** — CH01 news · CH02 DOKKA CAM (real room plate) · CH03 teaser · CH04 contact · CH05 no signal | `data/garage/tv.ts`, `SITE_CONFIG` | news pool |
| Radio | **NIGHT RADIO** — 4 stations, its power is the site mute | `data/garage/radio.ts` | DOKKA NEWS segments pool |
| Cabinet | **RECORDS / LORE** — one paper out (logs, lost property, receipts, real dated dev notes, lore); legal folder always present | `data/garage/cabinet.ts`, `DOCUMENTS` | pool |
| Workbench | **WIP** — one real dev capture/sheet with date + commit | `data/garage/workbench.ts` | pool |
| Arched door | **OUTSIDE DOOR** → Dokkaebi Playground (not built: says so) | — | — |
| Secret door | **SECRET ARCHIVE** — to be placed (PHASE 15) | — | — |
| Nav | function layer: logo, Games→PC, Studio page, Support page, Contact→TV CH04, **mute** | — | — |

The site mini-games are no longer on the PC. Until the Playground exists they
are reachable only by `/?play=<id>` (used by the game tests).

### Checkpoint 1 verification (2026-09-17)

**Full chromium e2e, build before the regression pass:** 171 total · 139 passed · 32 failed · 0 skipped.
Every failure classified; none was hidden by a timeout, a skip or a removed assertion.

| # | TEST | EXPECTED | ACTUAL | ROOT CAUSE | KIND | FIX |
|---|---|---|---|---|---|---|
| 1–2, 18 | entrance ×2, npc reduced-motion: `.thing` count | 13 | 14 | the radio is a new thing in the room | TEST | count 14, with the reason in the assertion |
| 3 | flow: every thing opens its own thing | `.note` (old studio note) | not found | workbench is WIP now; radio and parcel open panels | TEST | proofs: `.bench2`, `.radio`, `.delivery`; parcel out of TOGGLES |
| 4 | flow: room holds exactly the registry | 13 | 14 | same as 1 | TEST | derived from the maps |
| 5, 7, 9 | journey ×3: PC → build game | `[data-minigame=build]` on PC | absent | mini-games left the PC by design (works only) | TEST | the game is entered by its `?play=build` deep link, through the same door |
| 6, 8, 10 | journey ×3: parcel is a toggle | no panel | delivery panel opened | parcel is RANDOM DELIVERY now | TEST | expect the delivery, Escape, box shuts |
| 11 | journey reduced-motion | minigame row visible | absent | as 5 | TEST | wait for the works row |
| 12–17 | minigame ×6: open from PC | minigame row | absent | as 5 | TEST | `openGame` uses the deep link; first test now asserts the games are *not* on the PC |
| 19, 21 | objects: PC title | `EUNGARAGE SOFTWARE` | `EUNGARAGE OS` | renamed with the IA | TEST | title updated |
| 20, 22 | objects: bench/TV | studio note + TV power switch | WIP board + channels | re-roled | TEST | assert WIP capture + commit, CH04 contact, CH05 no signal |
| 23 | objects: hammering | `.note__lede` | not found | as 20 | TEST | `.bench2` |
| 24 | objects: nav | STUDIO opens the workbench panel | it is a page link now | STUDIO routes to studio.html (workbench ≠ studio intro) | TEST | assert the href |
| 25 | objects: reduced-motion TV | `.tvrow__value` | TV opens on CH01 | channels | TEST | assert CH01 is on with no warm-up |
| 26 | props: parcel toggle | no panel | delivery panel | as 6 | TEST | rewritten |
| 27 | props: PC caption | `PC · 작품과 미니게임` | `PC · 작품 라이브러리` | caption changed with the role | TEST | updated |
| 28 | props: bench + fridge | `.note__row` ×5, `.chill` ×7 with named items | WIP board; 5 date-seeded items | re-roled; today's shelves vary | TEST | keep toy car; assert every pictured item decodes |
| 29, 31 | secondary: fridge | 7 named items | 5 seeded items | as 28 | TEST | first/second item |
| 30, 32 | secondary: shelf | 4 relics + "VIEW LIMINAL" → PC | 3 crew items, no game link | shelf is the crew collection | TEST | rewritten; asserts no game reaches the shelf |

**Rerun of the affected specs after the fixes (79 tests):** 3 more failures, all in tests written today:

| TEST | ACTUAL | ROOT CAUSE | KIND | FIX |
|---|---|---|---|---|
| ia: shelf second look | same three items | the test read the *previous* panel's markup, which stays in the DOM until the next panel replaces it; `toHaveCount(3)` was true on the stale nodes | TEST | wait for the panel layer to be open, then read |
| ia: radio persists over reload | toggle off after reload | the spec's own init script wipes localStorage on every navigation, reload included | TEST | check on a fresh page of the same context (storage is real: `eungarage:save`) |
| journey ×3: TV email | mailto row not found | the TV comes on at CH01 news; CONTACT is CH04 | TEST | tune to CH04, as a visitor would |

The pool was checked against this in the browser afterwards (second open ≠ first), so the
"same three items" was the test, not the product.

**Glasses (13 captures, `scripts/glasses-shots.mjs`, ×4 crops):** front, patrol, walking left, walking
right, the four warning frames, watching, and warning/watching on both phones. White plate 0 ·
white lens 0 · goggles 0 · temple direction right on both sides · eyes clear · frame on the head in
every frame incl. the head turn · sprite untouched. **Glasses FROZEN.**

**Radio placement (`scripts/radio-shots.mjs`):** on the floor at the corner of NUNU's rug beside the
cup, in all three sizes; NUNU on the cushion never overlaps it; crew walking the front lane pass in
front of it (correct depth); hit box = art box + padding; nothing off-screen on the phone.

**archive_polaroid_bundle_v01:** searched the whole home directory by name (polaroid / 폴라로이드 /
archive_*bundle* / *bundle*_v01, case-insensitive), Spotlight, and opened every image added since
2026-09-14 outside inventoried folders (one in Downloads — a LUMIORA sprout emote sheet; the rest are
LUMIORA project art). Not present. Stays BLOCKED_ASSET.

**Panel review for PHASE 5 (what still reads as the same card):**

| Object | Generic today | PHASE 5 target |
|---|---|---|
| PC | cream card with a cut-out on top; the CRT inside is the only object-specific part | camera to the desk, the painted monitor *is* the screen |
| Wall | picture on the cream card | picture lifts off the wall in place |
| Shelf | three cream tiles, most without a picture | the shelf cut-out with the chosen item coming forward |
| Fridge | card + door cut-out + tile row | the door opens, shelves are inside the door |
| Parcel | card with box + reveal | box lid opens in the room, the thing rises out |
| TV | card + set cut-out + screen | the set itself, in place, powers on |
| Radio | card + station tiles | the radio face: dial pointer moves, buttons |
| Cabinet | card + paper + file list | the drawer slides, the paper is pulled up |
| Workbench | card with car + capture | camera looks down at the bench |
| Outside door | plain dark box | handle, door swings, light, transition |
| Landscape phone (844×390) | PC/TV/radio panels taller than the window; channel and station buttons below the fold | every object's presentation must fit 390px tall |

## Checkpoint 2 — PHASE 5, object-specific presentation

Frozen and untouched: glasses, radio position, Garage IA, discovery pools,
PC works list, TV channels, content pools, MiniGameShell/RoundClock/game logic.

**Mechanism** (`src/data/props.ts`, `src/ui/panels.ts`, `src/styles/props.css`).
The accessible shell is unchanged (dialog, focus trap, Escape, close, focus
restore); it now paints nothing. What opens is the thing's own cut-out — the
same felt furniture painted into the plate — growing out of the thing's place
on screen, with the content laid into the part of it that would hold it. Each
surface region was measured off the cut-out with a 5% grid. When the whole
cut-out cannot be shown with its surface readable (`min` px), the layer zooms
into the surface: a phone gets the monitor's screen filling the window with
the bezel round it, not a shrunken monitor.

**Sequence**, every object: click → camera to the thing (FOCUS_MS 220) + the
thing lights in the room (`reactObject`: monitor spill, tube flicker, fridge
inside, radio dial, door glow) + its own sound at that same moment → its
cut-out grows (380 ms) → doors/drawer/leaf move (240–260 ms later, 520–640 ms)
→ content. Escape: content and cut-out shrink back (260 ms) → thing unlit →
camera returns (CLOSE_MS 200). Sounds are the user's delivered effects
(`sfx_pc_on`, `sfx_tv_channel`, `sfx_fridge_open`, `sfx_drawer_open`,
`sfx_paper`, `sfx_radio_tune`, `sfx_door_open`), played at the reaction, not at
the panel; channel and station changes play the set's own click.

| Object | Old (PHASE 4) | New (PHASE 5) | "Could this be pasted on another object?" |
|---|---|---|---|
| PC | cream card, cut-out on top, dark list | the monitor; EUNGARAGE OS inside the screen; a work's detail inside the same screen | No — a screen list |
| TV | card, cut-out, dark screen, buttons below | the set; tube shows the channel; the two knobs are prev/next, the bezel holds 01–05 | No — knobs and tube |
| Fridge | card with a tile row and a yellow memo | both doors swing (3D) on the fridge, the inside lights, today's things on two shelves, the memo on the inside wall | No — doors |
| Parcel | card with box image | the box in the room opens; a tag rises above the box with the thing in it; no card, faint scrim | No — anchored to the room object |
| Shelf | three cream tiles | the shelf; the three things stand on its three shelves; the picked one comes forward with its note | No — on shelves |
| Cabinet | card, paper, file list | the right drawer pulls out, the paper rises out of it and stands over the doors; the legal folder tabs hang on the lower doors | No — drawer and paper |
| Workbench | card with car + capture | the bench: the capture propped on the pegboard with a pin, the note pinned on the drawer block, the car and tray on the mats | No — pinboard |
| Radio | card with station tiles | the radio: stations along the dial strip, the red needle moves to the frequency, left knob = power (turns), right knob = next, the news segment as a bubble over the set | No — a tuner |
| Wall | picture on a cream card | the picture alone, grown out of the poster, caption below | No — a picture |
| Outside door | dark box | the arch; the leaf swings open on a night sky with stars; the line about the Playground | No — a door |

**844×390:** document overflow 0 on every object (asserted), close always on
screen (asserted), content within its surface (asserted); the PC, TV and radio
zoom into the surface by construction.

**Answered by eye, per object** ("패널이 아니라 실제 물건을 만지는 느낌인가?"):
yes for all ten; the shelf is the least distinct (small item badges on real
shelves) and gets the first attention in the polish phase.

## Checkpoint 3 — PHASE 6, the garage living

Nothing new to touch: no object, no game, no panel. What changed is what the
room does by itself, built on the managers that were already there
(`Ambient`, `CrewInteractions`, `Crowd`, `behaviour.ts`), with no second
scheduler.

**6.1 Residents.** Preferences are pulls on the same state machine, not
posts: MOMO → pc, parcel; RUKI → workbench, pc; NUNU → fridge (home: the
rug); YOMI → shelf, parcel, outside door; POKO → tv, cabinet (a little more
wandering, for the round of the room). Three standing places were missing
and were measured off the plate with a grid (`docs/shots/…`, `inv/p6/`):
`shelf-front` (330,1012) in front of the bookcase, `cabinet-front` (980,1012)
before the big cushion, `radio-side` (1176,1040) beside the radio looking
across at it; portrait gets `radio-side` (330,1630). Two seats were found
sitting *inside* the radio — landscape `cushions` (1330,1040) and portrait
`floor` (424,1640) — and moved (1452,1046 by the noodle cup; 610,1642 between
the stool and the rug). The radio itself did not move. A bare `rest-floor`
point a body width from both new places was removed. Every favourite has a
standing place (asserted), every place is clear of the placed props
(asserted), no two places are within a body width (the existing crowd test).

**6.3 Cause and effect.** `CrewInteractions.notice()` now reads a table
(`CAUSES`): parcel wiggle → YOMI, then MOMO (walks over if close); shelf
lantern swing (new plate bit, measured 260,296 86×124) → YOMI checks; TV
static → POKO glances; fridge click (new: its light lifts 700 ms, no sound
because none was delivered) → RUKI or NUNU; PC beep (new: light lift +
`sfx_pc_click` at 0.12) → MOMO. The one it belongs to takes it 80% of the
time, whoever is nearest otherwise; one reaction at a time; nothing while
another scene runs. The attention order is the existing one — interaction 40
> scene 34 > crew 30 > object 20 > background 10 — and the thing the visitor
has touched is *held* from the touch (yieldTo) until the panel closes, so no
scene goes near it in the 220 ms before the panel either.

**6.4 Broom.** `garage_broom_v01` (1024×1536 alpha → `prop_broom.webp`
260×622), 172 world units tall. `src/systems/broom.ts`: enter 1.5 s → sweep
2 s → move 3 s → sweep 2 s → pause 0.9 s → leave 1.5 s (10.9 s), one of the
ambient events at the `object` priority, so it counts against the two-strong
limit and never runs under a panel. Where: three stretches of bare boards
(rest 1090–1215, desk 1700–1840, right 2570–2720; portrait 566–636,
760–836), chosen when it fires by which has nobody within 130 units and
nobody walking there, and never one over the thing the visitor has open;
none clear → it waits (new `ready` hook on `AmbientEvent`). While out it is
a body in the crowd, so walkers steer round it. Fastest moment 96 u/s
against the crew's 76 (measured in the browser: no overlap with anybody
across repeated appearances). `sfx_broom` (2.0 s) plays at each sweep's start —
the phase change is what triggers it, so it is on the bristles.

**6.5 Footsteps.** `sfx_crew_step_01` at 0.12/0.10 alternating, once per
stride measured in ground covered (33.8 units, from the rendered cycle), only
for feet in view, and one gate for the whole room (260 ms), so two walkers
are a little more than one and never a drum roll.

**6.6 Light.** Added: cabinet (warm, faint, while open) and the moon on the
mat while the outside door stands open (cool; the green under the door stays
LIMINAL's). The rest were already there from PHASE 5.

**6.7 Depth.** Three planes from what exists: the sky through the window
hangs back (×0.022 of the camera's distance from the room's middle), the
plate is the middle, the things on the boards (cup, gear, broom) come forward
(×0.012 → `--fgx/--fgy`). At the far wall on a desk that is 12 px; half on a
phone upright; ×0.35 sideways; 0 under reduced motion.

**6.8–6.9 Sound.** The room tone (`ambient.m4a`, 0.16) and the garage's
music are on whenever sound is on and the visitor is inside: the music is the
radio's GARAGE 88.1, tuned by the room when sound comes on, so the radio in
the corner and the nav switch are the same dial. The station is remembered
(`radioStation` on the v3 save). NIGHT 91.7 is the same file as the room
tone, so tuning to it silences the tone underneath (one file, one player;
asserted in the browser). Effects reuse one element per clip (never over
itself). Nothing plays before ENTER (asserted with a play spy on a save that
has sound on). Hidden tab pauses, return resumes, leaving through the
shutter stops the room's sound.

**6.2 Paths, checked by watching.** A headless probe (`scripts/broom-probe.mjs`,
`scripts/crew-vanish-probe.mjs`) logged crew positions and states at 844×390
and 1440×900 for 150 s each. It found two real faults in the walk, both
older than this phase and both made more likely by three of them favouring
the door end:

- *Walking on the spot.* The stuck check compared against the last
  position and reset whenever the figure crept two units, so two of them
  wanting the same gap at the door creeped for thirty seconds (RUKI, 60–90 s
  in the first watch). Progress is now measured as getting six units nearer
  the target than ever before in that walk; anything else for 3.8 s is stuck.
- *Vanishing in the room.* The walk off the plate sets `exiting`, and nothing
  cleared it when that walk was abandoned (stuck, poked, summoned, told to
  yield) — so the next arrival anywhere counted as having left, and RUKI went
  away in front of the bench at 2252, MOMO at 2652. Every way a walk is
  replaced now clears it (`stayAfterAll`).

Both are asserted in `e2e/living.spec.ts` over 150 s: nobody in view goes
away except at the ends of the boards, and nobody in view walks on the spot
for more than nine seconds. (Off-screen crew are culled and stop writing
their transform, so only what is in view is judged — the first version of
the test read stale positions and accused two of them wrongly.)

**Opening cast.** With MOMO at the monitor and RUKI at the bench, the first
view had nobody resting, and the room's own contract (somebody works,
somebody sits, somebody looks about, inside three minutes) failed on `sit`.
NUNU is in the opening cast on the rug now instead of YOMI, whose places are
at the two ends of the room; YOMI walks in with the first rotation.

**Real product bugs fixed in this phase:** the two walk faults above; two
seats that sat inside the radio (landscape `cushions`, portrait `floor`);
the ambient scheduler deferred an event that fell on a raised attention
floor (a bubble, a scene between two of them) by *half its gap* — nothing
for a ten-second flicker, half a minute every time for the broom, which
went whole visits without coming out; the retry is capped at 3 s (the
floor still blocks, it just does not also punish);
the radio's tuned readout ("FM 88.1 · GARAGE") ran into the station buttons
hanging over the dial — "OFF" had been short enough to miss them — so the
readout sits at the top of the grille now (`props.css`, one rule); the room
tone (`toggleAmbient`) was never called by anything, so the garage had no
ambience at all.

**PHASE 6 gate (2026-09-17).** Unit 233 / 233 (24 new in `test/living.test.ts`:
favourites reachable, places clear of props, broom zones, broom order and
speed, strong limit with the broom, the `ready` hook, visitor beats ambient,
held object, cause → who, footstep cap). Lint clean. Full Playwright
`--retries=0`: **263 passed · 0 failed · 0 skipped** (46.1 min; 213 before +
50 new/regrouped, 12 of them in `e2e/living.spec.ts`: waypoints present,
broom comes out and goes round the crew, nobody vanishes or walks on the
spot in view, lights on/off, depth a few px and 0 under reduced motion,
nothing plays before a gesture, nav ↔ radio one switch across a reload, no
file plays over itself, footsteps only while walking). Captures in
`docs/shots/checkpoint3/` (1440×900 / 390×844 / 844×390: waypoints, cabinet
and moon lights in the room, broom mid-sweep and close, depth at the wall,
the radio after the nav switch). Two intermediate full runs (255/263 and a
stopped one) found the eight things fixed above; the third is the clean one.

## Checkpoint 4 — PHASE 7, the entrance

The door was already a door (PHASE 3 of WORLD 1.0: knock, flicker,
hesitate, rise, light, peek, push, 2.3 s). What was added:

- **First vs returning.** `visitCount` on the save (written once a session
  at boot) decides at ENTER: a second visit gets the same door in 1.1 s
  (`alley--quick`: no knock or hesitation, shutter straight up, shorter
  transitions), and so does a second pass through the alley in one page.
  Reduced motion stays instant.
- **Skip.** A `건너뛰기` button appears with the sequence (focus lands on it,
  so Enter twice is in); any click or tap on the lane, Enter, Space or
  Escape does the same. Skipping adds every class the beats would have, so
  the room takes over from the same picture.
- **MOMO notices you.** The greeting on arrival is MOMO's when MOMO is in
  (it is, at the monitor), whoever is nearest the middle otherwise.
- **Loading, honest.** When the camera is through and the room's plate is
  still on its way, one line — "MOMO가 차고 문을 여는 중…" — and the door
  finishes the moment the plate lands (8 s cap so nobody is kept at the
  door). With the plate already here (the warm-up starts 0.9 s after boot)
  the line is never shown; asserted both ways, with the plate held back by a
  route delay for the positive case.
- **Sound on the picture.** The one gesture unlocks audio; the shutter's
  own sound plays on `rise`; on `light` the room's air comes up over 1.4 s
  and its song 0.7 s later over 2.2 s (new ramps in `AudioManager`, one fade
  per entrance; retuning the radio afterwards is immediate). Nothing plays
  before the gesture even for a visitor who left sound on. **BLOCKED_ASSET
  exterior night ambience:** no outdoor ambience was delivered, and the
  brief's "night ambience → shutter" first beat cannot play before the
  gesture in any case, so the sequence is shutter → air → song.
- Keyboard (focus + Enter) and touch (tap) both open the door; on 844×390
  the skip is inside the viewport at ≥ 44 px.

## Checkpoint 5 — PHASE 8 · 9 · 10, outside

**8. The door is a door.** Touching the outside door does what PHASE 5 built
(moonlight on the mat, `sfx_door_open`, the arch grows out of the door, the
leaf swings onto the night) and then, 1.15 s after the leaf, the night comes
in over everything (`.crossing`, 660 ms), the room's tone and station fade
out over 0.7 s, the garage is hidden *and left exactly as it is* (paused,
crew and camera in place), the playground is shown and its music comes up
from silence over 1.4 s, and the night goes out. About two seconds from the
touch; Escape before the night comes in is a change of mind and nothing
crosses. `#playground` is pushed; Back is the crossing in reverse (music
down, garage un-paused, room tone and station back up under the door
fade); the arch outside does the same and consumes the entry; Forward goes
out again; arriving on `/#playground` goes straight out once the shutter is
up; reload outside comes back outside. Reduced motion: a 170 ms cut both
ways. **BLOCKED_ASSET playground ambience:** no outdoor night-air track was
delivered; the only outdoor audio is the playground's music, so the
crossing is music ↔ music (plus the room tone on the garage side).

**9. The playground.** The user's masters (`playground_world_landscape_v01`
1672×941, `playground_world_portrait_v01` 941×1672, opaque) already paint
the POKO office (top left), the snack stall (top centre), the parcel office
(top right), the arch back into the garage and a small signpost by it. So,
as in the garage, the places are hit areas over what is painted — measured
off the plates with a 100-unit grid — and **nothing is painted twice**: the
delivered building cut-outs (`playground_poko_office/snack_stall/
parcel_office_v01`, trimmed and scaled to ~770 px, real alpha) are used only
as the thing that grows out of its place when it is touched, the garage's
own mechanism (`Panels.openPlace`). `playground_foreground_v01` is the
foreground layer, bottom-anchored over everything, `pointer-events: none`
(asserted: the middle of every place hits the place). `playground_dokkaebi_
fire_v01` is three fires — over the water on the left, by the bridge, low by
the pond — each its own size, period and phase (6.2/7.4/5.6 s, floats of a
few px, breathing 1→1.04, opacity .86→.98), none under reduced motion.
`playground_signpost_v01` grows out of the painted post; its three arms are
buttons that take the camera to look at that place and open nothing. The
camera fits the short axis and covers the long one, starts on the arch, and
on 844×390 sits high enough that the three buildings and the arch are all in
the first view (asserted, along with ≥ 44 px per place). Portrait uses the
portrait master, not a crop. Depth: plate → places/fires → foreground.

**10. The games are in their buildings.** Touching a building shows its
cut-out with its name, one line and 들어가기; that opens the existing game
through the existing runner (MiniGameShell, RoundClock, GameInput, scores —
nothing new), with the playground paused behind it and the way out
labelled 놀이터로; closing puts the playground back, unringed, camera
restored. POKO's game keeps its logic, its glasses and its transparent
layer; outside, the layer shows POKO's office behind the two figures
instead of the garage (`[data-game-root].is-outside`). The parcel game
(`src/games/parcel`, built earlier: 30 s, the five works as piles, drag /
tap / 1–5, −1.5 s and a broken combo on a wrong pile, stars) is the parcel
office's. Audio added, all delivered clips: `game_start` at the end of the
countdown, `star_get` for a round worth a star, `game_fail` when caught or
for nothing, `stall_bell` for a right order at the stall, and the music
ducks −4 dB for 1.4 s on POKO's turn so the warning is never under it.
POKO's own walking/turning/caught/glasses sounds were not delivered and are
not invented (BLOCKED_ASSET).

## Checkpoint 6 — PHASE 11 · 12 · 13, the door in the bookcase

**11. The lock.** The garage's one painted door is the outside door, so the
secret door is where the WORLD 2.0 audit said it would go: the lower
cabinet of the tall bookcase (landscape 246,628 168×214; portrait 142,456
148×118, below the shelf's own hit area), a fifteenth thing over the plate's
own pixels, nothing new drawn.
It is a cabinet until POKO, Snack and Parcel each have a star
(`src/systems/secret.ts`, from what the games recorded). Locked: its label
says `비밀문 · ★ n/3`, touching it rattles and shows a moment of starlight
along the seam — no popup, no LOCKED. The first time all three have a star
the room shows it opening, once, when the room is in front of the visitor
(on entering, on coming back from the playground, after a round): the seam
bright, the face giving a little, the bookcase light, `sfx_secret_unlock` —
and seen: the room opens on the desk, and at 1440 × 900 and 844 × 390 the
bookcase is off to the left, so the camera goes to the door first (the
three-size journey caught it playing out of view); the save's
`secretProgress` remembers, so a reload finds it open quietly
(asserted both ways). Then it is a door: the same night crossing as the
outside door, `#archive` in history, Back and the arch home.

**12. The archive.** The user's masters (`secret_archive_landscape/
portrait_v01`, 1672×941 / 941×1672) paint the room — the glass dome of
stars, the telescope, the jar of stars, the dome on the table, the chest,
the lantern, the cushions — so, as in the playground, the six things are
hit areas over what is painted (grid-measured) and the delivered cut-outs
grow out of them when touched. `secret_archive_foreground_v01` is the
foreground layer, pointer-events off. What each does: the **star jar** —
a handful of tiny stars up and gone in 1.6 s, the ring glows, `star_get`
small; the **music box** — its cut-out (open, as delivered) grows out of
the dome and sways a little; no music-box track was delivered, so
`discovery` at 0.24 and the sway are the whole of it (BLOCKED_ASSET
music-box audio); the **telescope** — the glass fills the window, the
plate's own sky brought close, a star goes over, any click or Escape
returns; the **memory box** — its cut-out grows out of the chest with one
real day of making laid on the lid (a capture, sheet or fix from the
workbench's record, with its date and commit; nothing invented); the
**lantern** — its own warm wash, a few percent, on and off, `sfx_lantern`;
the **cushions** — Healing Mode. Six stars in the glass breathe on their
own beats; a star falls on its own every 60–120 s and never otherwise
except through the telescope and in Healing Mode. Music: `Secret
Archive.wav` ends in a fade, so a loop derivative (cut 159.5 s, 2.5 s
crossfade, 157 s) plays; the room tone under it at 0.1. **BLOCKED_ASSET
archive_polaroid_bundle_v01:** searched again (name, Spotlight, recent
images, `*bundle*`): the only "bundle" on the machine is LIMINAL's passport
prop. No polaroid interaction, nothing invented in its place.

**13. Healing Mode.** Touch the cushions: the nav and the labels fade, the
rings go, the stars stay and breathe faster, a star falls 2.5 s in and then
every 12–25 s, the camera drifts ±26 × ±12 units on a 26 s ellipse, one line
says how to come back. Any click, tap or key (not Tab) ends it at once, and
Back or the door end it too — and the touch that ends it is spent: Space on
the cushion's own button (whose click follows on keyup) or a click that
lands on a place does not open anything in the same breath. Reduced
motion: no drift, twinkles still, the star fades in place.

Captures: `docs/shots/checkpoint6` (the door locked with its label and hint,
opening, the archive, each thing, the sky, Healing Mode, home; three
sizes). Gate: `e2e/archive.spec.ts` 13, plus the room's specs with the
fifteenth thing.

## Checkpoint 7 — PHASE 14 (first pass), the music as loops

Every delivered BGM was measured at its end (RMS of the last seconds,
`scripts/loop_derivative.py` reports it): all six end in a fade or a
cadence to silence, so none may loop raw. Each has a web loop derivative —
the original is never touched — cut before its ending and crossfaded (equal
power) into its own opening, so the seam sits on music:

| Track | Delivered | Cut | Crossfade | Loop |
|---|---|---|---|---|
| Garage 메인 | 146.4 s, fades from ~137 s | 136.0 s | 2.5 s | 133.5 s |
| Dokkaebi Playground | 118.8 s, silent from ~117 s | 115.4 s | 2.0 s | 113.4 s |
| Secret Archive | 164.2 s, fades over the last 3 s | 159.5 s | 2.5 s | 157.0 s |
| POKO 부장님 몰래 딴짓 | 119.6 s, silent from ~118 s | 117.0 s | 2.0 s | 115.0 s |
| 도깨비 야식 심부름 | 33.0 s, fades over the last second | 32.0 s | 1.5 s | 30.5 s |
| 택배 정리 | 118.8 s, silent from ~117 s | 116.4 s | 2.0 s | 114.4 s |

The garage's track had looped raw since PHASE 4; it is the derivative now.
Each game plays its own track while it is up (0.24, up over 0.9 s): in the
garage the room's tone and station go down first and come back after, in
the playground the playground's music gives way and returns — one music at
a time, never a second under it. Preload is on intent only: the playground
track when the outside door opens, the archive track's on the secret door,
a game's when its building is open (on a warming element, never the
player's own). **Second pass.** Where one track follows another on the world player
(a building's game over the playground's music, and back) the change was a
source swap — a cut. It is a crossfade now: the track playing goes down on
its own element (≤ 700 ms) while the next comes up on a fresh one, the
warmed element when the file was fetched ahead, so nothing is ever cut and
nothing is ever doubled for longer than the fade. Unmuting, or coming back
to the tab, now restores whatever the state says is on wherever the visitor
is: in the room the tone and the station, elsewhere the world's music and —
in the archive — the same tone at its lower level, which before came back
only in the room.

The levels, as one table (the preference is the one switch; there is no
mixer, by design — the audio preference system is frozen):

| Layer | Level | Where |
|---|---|---|
| Room tone | 0.16 / 0.10 | the garage / the archive |
| Station (the garage's music) | per station (`src/data/garage/radio.ts`) | the garage |
| World music | 0.30 / 0.26 | the playground / the archive |
| Game music | 0.24 | any game, over a duck of the music under it |
| Effects | 0.12 – 0.50 | per cue, at the call |

Not delivered, so not built: the alley's own ambience, a playground
ambience, POKO's own effects, the music box's own tune (BLOCKED_ASSET, each).

## Checkpoint 8 — PHASE 15 · 24, the audits

**15. Brand.** The only marks on the site are EUNGARAGE's own (nav and
lockup, v02; `og-image.jpg` 1200 × 630 with the same lockup). No third-party
logo anywhere: the social fields in `src/data/site.ts` are null, so no
Instagram or YouTube mark is drawn; the metadata (Open Graph, Twitter card,
JSON-LD Organization, `manifest.webmanifest` with its three icons) names
EUNGARAGE alone. The user's playground and archive plates carry no brand
text. Nothing to purge.

**16. Copy.** Every caption, label, hint and line read through (`src/data`,
the scenes, the panels, the games): Korean for the visitor, the works'
own taglines in both languages, the zone names English (data only, never
shown). The one English UI word left is the alley's ENTER. The mock game's
line ("셸을 확인하기 위한 것입니다") ships only in DEV builds.

**17. Responsive.** The full journey captured at 1440 × 900, 390 × 844 and
844 × 390 (`scripts/journey.mjs`; `docs/shots/checkpoint8`, all twenty beats at
1440 × 900 and the key beats at the two phone sizes): the alley, the room and four of its things, the door and the
playground, each game's board, home, the ceremony, the archive and each of
its things, Healing Mode, home again. The one layout fault found on the way
(the workbench at 844 × 390, PHASE 7) had been fixed already; nothing new.

**18. Accessibility.** Every interactive element in the room, outside and in
the archive has a name (the things by their captions, the places by their
labels, the crew by their names); the crew's boxes used to sit inside an
`aria-hidden` container — a focusable stop with no name — and now only the
picture and its shadow are hidden. Decorative images are `alt=""`. Panels
are `role="dialog"` with `aria-modal`; the archive's sky is a dialog of its
own. Escape closes everything in order (sky → panel → healing → world).
Reduced motion is honoured in every world (asserted in `archive.spec`,
`outside.spec`, `cinematic.spec`, `living.spec`). Phone targets are at least
44 px (the fingertip padding grows a hit area but never into a neighbour —
which is why the portrait door moved 18 units down from the shelf).

**19. Performance** (`vite preview`, Chromium, DPR 1):

| | 1440 × 900 | 390 × 844 |
|---|---|---|
| First contentful paint (alley) | 112 ms | 64 ms |
| Transferred to the alley | 1.8 MB (the alley's plates and props, and the room's plate behind the shutter) | 1.8 MB |
| Transferred after entering | 4.6 MB | 3.9 MB |
| Frames in the room | 61 fps | 61 fps |
| Long tasks in the room's first seconds | one, 83 ms | one, 82 ms |
| Script | 214 KB (71 KB gzip) | |

Nothing outside the current world is fetched: no audio until sound is on,
no playground or archive plate until its door is touched (their music on
intent only, on a warming element). The loops are AAC at 1.4–2.0 MB each.

**21. The journey** (`scripts/journey.mjs`): three sizes, 20 beats each,
0 console errors, 0 page errors, 0 failed responses, no panel left open and
no world's music left running at the end.

**23. Assets.** Every request the journey made answered (404 = 0). The
delivered cut-outs keep their own alpha (the archive's six, the playground's
three, the shooting star; nothing re-cut). The playground's and the
archive's buildings and things are painted once, in the master plate, and
the hit areas sit over them (double building = 0).

**24. Errors and leaks** (`scripts/leak-audit.mjs`, 30 round trips: the
playground with a game every other trip, the archive with its jar and
lantern, on a page that saw the unlock ceremony first):

| round | DOM nodes | window/document listeners | crew | spots | JS heap |
|---|---|---|---|---|---|
| 0 (room only) | 316 | 20 | 5 | 0 | 3.0 MB |
| 5 | 368 | 32 | 5 | 11 | 3.4 MB |
| 30 | 368 | 32 | 5 | 11 | 3.7 MB |

The step from 0 to 5 is the two worlds mounting once (11 places, their
listeners); from then on nothing grows. No error on the way.

**22. Visual QA**, fifteen questions asked of the journey captures
(three sizes; `docs/shots/checkpoint6` and `docs/shots/checkpoint8`):

| # | Question | Answer |
|---|---|---|
| 1 | Are the five crew the approved sprites, untouched, POKO with glasses? | Yes — no sprite, face or body edit in PHASE 7–14; POKO's glasses as frozen. |
| 2 | Is the radio where it was frozen, its readout above the grille? | Yes, at both sizes. |
| 3 | Any building or thing drawn twice (plate + cut-out)? | No: the cut-outs appear only inside a panel; the plates carry the world. |
| 4 | Any broken alpha (halo, hard edge, black box) on a cut-out or overlay? | None seen: the archive's six, the playground's three, the shooting star, the LIMINAL print (fixed in PHASE 7). |
| 5 | Is every label legible over its art, at every size? | Yes; the music box's line sits on the box front with a shadow, readable at 390 wide. |
| 6 | Does any text overflow or clip at 844 × 390? | No (the workbench's photo row was the one case, fixed). |
| 7 | Does the nav stay clear of the safe areas and out of the way in Healing Mode? | Yes; in Healing Mode it fades to nothing and comes back on the touch. |
| 8 | Is the night crossing a clean dark with no flash of the next world? | Yes: the world is shown only after the crossing is dark. |
| 9 | Is the unlock ceremony visible when it plays? | Now yes at all three sizes (camera to the door). |
| 10 | Does the telescope's sky fit the glass at every size? | Yes: the overlay is fitted to the plate's own sky rect per orientation. |
| 11 | Does Healing Mode read as rest (labels gone, rings gone, one line)? | Yes. |
| 12 | Are the games' boards inside their buildings outside, and the room the board for POKO inside? | Yes (checkpoint5 and the journey). |
| 13 | Does Back always land somewhere sensible (never a blank page)? | Yes: each world's things leave one entry each, then the room; a deep link keeps the browser's own Back. |
| 14 | Does the room look the same coming home as it did leaving? | Yes: camera restored, crew where they were, the print in. |
| 15 | Anything placeholder, invented, or a real brand? | No. The polaroid bundle, the alley/playground ambience, POKO's effects and the music box's tune are BLOCKED_ASSET, not stand-ins. |

**20. The gate** (2026-09-18, after every fix above, `--retries=0`):
typecheck clean, lint clean, unit 236/236, Playwright 307/307 —
chromium 269 (48.7 min), shell 12, webkit 13, firefox 13 — 0 failed,
0 skipped. No timeout was raised, no assertion removed, nothing skipped
to get there; the two assertions that changed were wrong about the world
(a dotted date, Playwright's own blank history entry) and one was scoped
to what it meant (the panel's dialog, not every dialog on the page).
