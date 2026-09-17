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
