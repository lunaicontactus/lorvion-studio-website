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
