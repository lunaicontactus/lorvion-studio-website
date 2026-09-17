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
