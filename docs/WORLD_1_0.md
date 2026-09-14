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
