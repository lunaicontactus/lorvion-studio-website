# EUNGARAGE WORLD 1.0

What each phase changed, and what it could not.

## PHASE 1 — the wall

The four posters in the room's painting are felt-and-thread illustrations of
the studio's games. They are decoration, not the games' art, and a studio site
should have the work on the wall.

Hanging now, each on its own sheet of paper over the painted one:

| piece | project | source | shape |
|---|---|---|---|
| `lunai-keyart` | LUNAI | key visual (already in this repo) | 1024×1536 portrait |
| `liminal-keyart` | LIMINAL | key visual (already in this repo) | 1024×1536 portrait |
| `wormup-keyart` | WORM UP! | key visual (already in this repo) | 941×1672 portrait |
| `rubato-opera` | RUBATO | `bg_court_opera_auditorium.jpg`, one of the game's own backgrounds | 1920×1080 landscape |
| `lumiora-splash` | LUMIORA | `lumiora_splash_world.webp`, the app's splash | 900×1599 portrait |

Sources are named one by one in `scripts/artwork.py`; a glob would quietly
pick up a draft. Nothing was generated for this website.

RUBATO has no key visual, so it has one of its own backgrounds instead, and
stays `comingSoon` in its facts. Having a picture of a game and having a
release are different things.

**Not cropped, anywhere.** `src/data/artwork.ts` records what each source
measures. The print on the wall is sized from those numbers; the viewer lets
the picture's own width and height lay it out; the boxes in the PC, the
project panel and the fallback pages take the ratio as `--shot`. There is no
`cover` left on a piece of artwork in this project.

LUMIORA is on the site for the first time: five projects where there were
four, in the small frame that was already hanging by the fridge, so the wall
has one big size and one small one rather than five identical frames.

### Known, and left alone
The portrait plate re-composes the room into three stacked bands, and the
middle band has two more painted posters in it. They are the room's own
decoration seen from another angle, not a second gallery, and covering them
would mean measuring a wall nobody reads as a gallery.

## PHASE 2 — ambience

`src/systems/ambient.ts` was already the central manager the brief asks for:
scheduled, not looped; riding the room's ticker, so a hidden tab is a still
room; one priority floor, so nothing competes with somebody walking. What it
gained:

- **never the same thing twice running** — on a quiet room the event that is
  due kept being the one that just finished
- **at most two things worth watching at once**, counted across the whole room
  rather than per priority level (`STRONG_AT_ONCE`)
- **a phone waits longer** (`slow`), because the same number of events a
  minute lands in a third of the picture
- **`parcelWiggle`** — the week's parcel settling, one knock
- **the shooting star at 40–90s**, per the brief
- **ambience on a phone at all.** Every light, flicker and wisp of steam was
  measured off the landscape plate and skipped on the other one, so a phone
  visitor's room never moved. The lights, the steam and the television now
  have portrait coordinates, each anchored to a rect the portrait layout
  already places.

Still landscape-only, and deliberately: the sky, the stars, the shooting star,
and the three pieces of plate that move (pencils, magnet, note). The portrait
plate's window is a different window in a different place, and those rects
would land on plaster.

### BLOCKER — `broom_clean`
There is no broom. Not in `public/assets/images/`, not painted into either
plate — the long-handled thing by the door is a hook. A sweeping broom needs a
broom, and drawing one would be new art for the website, which this project
does not do. Everything else in the brief's ambient list is implemented.

## PHASE 3 — living in the room

`src/systems/interactions.ts` is the coordinator. Nothing in it belongs to any
one character — it belongs *between* them, which is the whole reason it is one
file and not five: a dokkaebi scheduling its own scenes has no way of knowing
that two others are already in one.

Five scenes, one at a time:

| scene | what it is |
|---|---|
| `watchBench` | somebody at the bench, and somebody passing looks up at them — and they look back |
| `doze` | whoever is sitting stays sitting a while longer; anyone passing may glance |
| `parcel` | the parcel knocks and **exactly one** of them cares, from wherever they are |
| `fridge` | one goes to the fridge, at most one watches from behind |
| `screen` | somebody looks at the monitor or the television for a second |

Rules the room is held together by:

- **One scene at a time.** With the ambient ceiling of two that puts the room
  at three moving things at most, and a scene raises the attention floor
  (`SCENE_ATTENTION`) so the ambience stands aside rather than adding to it.
- **The visitor outranks all of it.** Clicking a dokkaebi cuts through
  anything; opening a thing makes the room give it back (`yieldTo`).
- **Nothing is abandoned.** `glanceAt` remembers the job and hands it back.
  Somebody who stops mid-walk resumes the same errand, with the same place
  still booked.
- **Not always the same two.** A pair cooldown, and the scene picks whoever
  has been left out longest.
- **Every kind gets a turn.** A glance at a screen needs no coincidence and
  a scene at the bench needs two people in the right place, so without a
  fairness rule the easy scenes took every slot — measured: `watchBench` and
  `doze` ran zero times in five minutes while `screen` and `parcel` ran nine.

### Two defects found by measuring, and fixed

**The crew were walking 77% of the time and almost never arriving.** Sampled
over three minutes: `WALK` 1662 samples, everything else 489. One walk took
seventy seconds; one dokkaebi went `WALK 17ms → GLANCE 900ms` nineteen times
in a row without moving.

The cause was two rules meeting. `Crowd.shouldYield` asks "is somebody ahead
of me on this stretch", which stays true for as long as they are ahead of me —
so walking behind a slower one, you stand aside, step once, and stand aside
again, for ever. And resuming after standing aside reset the patience clock,
so the stuck check never got its four consecutive seconds to notice.

Both fixed: standing aside has a cooldown (`YIELD_COOLDOWN`), and resuming a
walk is not a new walk. After: `WALK` 24%, average walk 7.2s, `INTERACT` 28%,
`WORK` 15%. The room does things now.

**They never said hello.** Nought greetings in five and a half minutes. The
rule wanted both of them standing still, close together, at the same moment,
which in a room 3600 units wide almost never happens. Somebody walking past is
the commonest way two people in one room end up speaking, so `passing` was
added: a walker may stop to say hello and keeps its errand and its booking.
After: greetings every minute or so.

### Faces
`glanceAt` never poses `back`. Looking up at somebody behind you is a turn of
the head, not of the whole body — so a scene can only ever *add* a face, and
the floor under `src/systems/faces.ts` cannot be broken by anything here.
Checked in `e2e/crew.spec.ts` over a hundred seconds of a busy room.

## PHASE 4 — the shell the three games sit in

### 4-1 audit: what was already there

`src/games/runner.ts` was already most of this, and it is kept.

| already there | verdict | why |
|---|---|---|
| `GameRunner` — ready screen, HUD, pause on blur/hidden, result, best score, retry-as-fresh-instance, listener cleanup, focus restore | **reuse** | it is the shell, and it works; rewriting it would be churn against a tested thing |
| adapter contract `GameDef.mount(host) → {start,pause,resume,destroy}`, host gives `end/sfx/hud` | **reuse** | already the separation PHASE 4 asks for: a game never touches shell DOM |
| Escape policy (PLAYING → pause, otherwise close) | **reuse** | exactly the policy asked for |
| `build` — the running game with the boss | **keep, do not extend** | it is not one of the three canonical games; PHASE 5 supersedes it |
| per-game clock inside `build` | **leave alone** | it works and is tested; new games use the shared clock instead |
| best score in `save.data.games` | **replace** | one object read and rewritten whole; a best score every round rewrote the visitor's whole history |

| added | file |
|---|---|
| `COUNTDOWN` + one table of what may happen next | `src/games/state.ts` |
| round clock that owns no timer | `src/games/clock.ts` |
| one input manager, semantic events, releases holds on blur | `src/games/input.ts` |
| namespaced storage with validation | `src/games/scores.ts` |
| a game that is barely a game, for walking the shell | `src/games/mock.ts` (dev-only) |
| stars and `success` on the result | `src/games/types.ts` |

### The two leaks this shape makes impossible

**A clock that runs twice.** `RoundClock` cannot start a timer — it is handed
milliseconds and subtracts them. A game that starts an interval on `start` and
another on `resume` runs at double speed and the second one outlives the
first; a clock that cannot start anything cannot leak one. The runner holds
**one** ticker subscription for the whole round and drives the countdown, the
clock and the game's frame from it, in that order.

**Listeners that pile up.** `GameInput` remembers every listener it adds and
`destroy` removes them. A retry destroys the whole thing and mounts a new one
rather than resetting the old, so "retry five times" cannot mean five copies
of every handler. There is a test that measures the clock rate after three
retries, because a stacked subscription shows up there as a round that runs
four times too fast.

### A hold that outlives the window

Nothing sends `keyup` for a key that was down when the window went. The POKO
game is built entirely on a hold, and a SLACK that never ends is a player
caught the instant they come back through no fault of their own. So blur,
`pointercancel`, `touchcancel` and a hidden tab all release everything held
and say `forced: true` before the pause happens.

### The mock, and why it is not in the bundle
`src/games/mock.ts` is behind `import.meta.env.DEV`, so a built bundle does
not contain it. The lifecycle spec therefore runs against the dev server —
one extra `webServer` and one extra project in the Playwright config — while
everything else runs against the built bundle. A mock game somebody can reach
is a mock game somebody eventually plays.

### Costs
`?play=<id>` opens a game on arrival. It is how the shell spec gets to the
mock, and a real deep link for the games the PC lists. The ✕ was 34px and is
now 44, which is the floor every other hit area in this project is held to.
`build`'s tests pressed start and waited a second; there is a countdown now,
so they wait for the countdown to end instead.

## PHASE 5 — 무궁화꽃이 피었습니다, 부장님 감시 편

### 5-1 audit of the running game

| from `build` | verdict |
|---|---|
| `boss.ts` — the timing: a warning always before a look, a floor under the warning, difficulty in the quiet stretches only | **reused**, as `poko/boss.ts` with the five states the brief names |
| the glasses — a CSS layer over the face with per-pose eye positions | **reused**; re-measured for the approved crew by `scripts/eye_measure.py` |
| the shell — HUD, result, best score, sounds, entry from the PC | **reused** (PHASE 4) |
| its tests' shape — wait on state, not on a clock | **reused** |
| running, jumping, obstacles, a finish line, the build screen | **discarded**; none of it is in the new game |

`build` is left in place and still listed, untouched, until the new game is
signed off.

### The five states

`PATROLLING` walks the back wall with its back turned · `AWAY` is right out of
the picture, the long window · `WARNING` stops and straightens the glasses ·
`WATCHING` looks, and is the only state anything is judged in · `RECOVER`
turns back.

Never a look without a warning, and never a warning below `WARN_FLOOR`
(1000ms — four times a comfortable reaction, and it does not move with
difficulty). What difficulty changes is the length and variation of the quiet
stretches, so late in a round counting does not work and watching does.
Seeded, so `?pokoseed=7` replays a patrol exactly.

### Judged on the button, never on the picture
`setSlacking` changes the logical state the instant the key comes up, and the
verdict is read from that on the same tick the boss is read. A sprite that
takes four frames to turn round cannot catch somebody who let go in time.
There is a test that holds, lets go, and then walks into a look.

### Balance, measured rather than guessed

`scripts/poko-balance.mjs` plays a thousand rounds each for five policies,
with 180ms of hand on every decision:

| player | caught | mean score | stars |
|---|---|---|---|
| never slacks | 0% | 6 | 0.00 |
| only while it is out of the picture | 0% | 40 | 0.23 |
| uses every quiet stretch, lets go at the warning | 0% | 189 | 2.53 |
| pushes halfway into the warning | 0% | 246 | 3.00 |
| holds until the warning is nearly over | **100%** | 44 | 0.00 |
| never lets go | **100%** | 44 | 0.00 |

Which is the shape the game needs: working through the whole round is
survivable and worth almost nothing; using the quiet is worth thirty times as
much and is never punished if you react; and holding past the point where
less of the warning is left than a hand takes is caught every time. Stars at
45 / 150 / 230.

A round's own shape, seed 7: six looks, warnings 1296–1900ms, quiet stretches
averaging 2.9s and totalling 20s of a 45s round.

### In the garage, not in front of it
The layer is transparent and the room is the board: the plate is behind it,
the rest of the crew are at their benches, and `setCalm` rather than a full
pause is what the room gets — so they go on working without starting new
errands. `CrewInteractions` is suspended, strong ambience is suppressed, and
the room's own POKO walks off the plate for the duration and walks back on
afterwards, so there is only ever one of him. Nothing about the garage's state
is changed permanently.
