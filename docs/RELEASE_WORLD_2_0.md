# EUNGARAGE WORLD 2.0 — release record

## Rollback point (recorded before the merge, 2026-09-18)

| | |
|---|---|
| world-2.0 final commit | `7c5663c` — Out through the door, and in through the bookcase |
| main before the merge | `511c30b` — Five of them sharing a room |
| relation | main is an ancestor of world-2.0 (no commit on main outside it); the merge is `--no-ff` so the release has a boundary commit |
| production | GitHub Pages, `.github/workflows/deploy-pages.yml`: a push to main runs lint, typecheck, unit, `vite build`, the legacy brand scan, the whole Playwright suite (all projects), then deploys `dist/` |
| last production deploy before this | run 34842002107, 2026-09-14, commit `511c30b`; bundle `/assets/main-BGQQn1mg.js`, `/assets/main-CWSCvj4q.css` |
| production URL | https://eungarage.com/ (CNAME) |
| caching | no service worker; HTML served with `cache-control: max-age=600`; scripts and styles are content-hashed, so an old page can only ever load its own old bundle, for at most ten minutes |
| tags before | none |

**Rollback procedure** (no force push, ever): on main, `git revert -m 1 <merge commit>` and push; the same workflow redeploys `511c30b`'s tree. Confirmed possible: the workflow needs nothing but the tree.

## Pre-deploy gate on world-2.0 (`7c5663c`)

- PHASE A — the last look: `scripts/release-review.mjs` at 1440 × 900, 390 × 844, 844 × 390 — the alley, every thing in the room (posters, the RUBATO picture, PC, shelf, fridge, parcel, TV, radio, cabinet, workbench), a crew member touched, the broom, the playground and all three games, home, the unlock ceremony (in view), the archive and each of its things, the shooting star through the telescope and in Healing Mode, Back home. Captures in `docs/shots/release`.
- PHASE C — legacy scan: `scripts/brand-scan.mjs dist` clean (terms and retired-file hashes); the only "lorvion" left in the repository is the README's note that the GitHub repository keeps its old name, and the scan's own term list. Contacts in the build: eungarage.com, eungarage@gmail.com only.
- PHASE H — build audit: the 13 frozen URLs present in `dist/`; all 61 asset paths referenced from HTML, CSS, JS and the manifest exist; title, icons, canonical, Open Graph, Twitter card, JSON-LD all EUNGARAGE.
- PHASE D — on the tree of `7c5663c`: typecheck clean, lint clean, unit 236/236, Playwright all projects `--retries=0` **307/307** (chromium 269, shell 12, webkit 13, firefox 13) in 51.7 min, 0 failed, 0 skipped.

## Known BLOCKED_ASSET (release does not wait for them)

archive_polaroid_bundle_v01 · alley/playground ambience · POKO-specific SFX · music-box audio. None is referenced at runtime; no placeholder stands in.

## The first push to main (6953e99): CI verify failed, deploy skipped

Run 35353748244: lint, typecheck, unit, build and the brand scan passed;
`npm run e2e` finished 306/307 — one failure, `[shell]`
gameshell.spec "leaving puts the room back, with nobody left waiting in it":
"the crew were still frozen after the game closed". The deploy job was
skipped, so production stayed on `511c30b`.

Root cause: the assertion was a proxy — it waited for a transform to change
on a crew member in twelve seconds — and the proxy has two blind spots the
room has by design: crew outside the view are not drawn (culled), and one
mid-work or seated stays put for as long as its work takes. On the slower
runner nobody happened to cross the view in the window. Reproduced the
check locally at 1×, 6× and 12× CPU throttling: the room was unpaused every
time (the scene's `is-paused` class gone, every crew state restored), and
the proxy still passed here, which is what a timing proxy does.

Fix (commit below): each crew member's `data-state` now mirrors the pause
(it read the held state while paused — the mirror was stale), and the test
asserts the direct signals — the scene not paused, no crew in PAUSED — and
then keeps the twelve-second window for a step *or* a change of state. No
timeout was raised, nothing skipped; the assertion that was wrong about the
world was replaced by the one that is not.

## The gate on the fix (d0de2c9): 306/307, one different failure

`[chromium]` npc.spec "somebody says something, and never two of them at
once": "nobody said anything in two minutes". Whether anyone speaks in a
given two minutes is the room's own dice — MOMO greets at the character's
social chance, idle lines fire at a few percent per idle — so a silent two
minutes is rare and real, not a fault (speech keys on the internal state,
not on the attribute the previous fix touched). The spec already pins the
crew's dice with the product's `?npcseed` hook for every walk it asserts;
this test now uses the same hook. Verified three runs in a row locally.

## Production release — 2026-09-19

| | |
|---|---|
| main merge | `6953e99` Merge EUNGARAGE WORLD 2.0 (tag `world-2.0-final`, the release boundary) |
| deployed commit | `cec93cc` = origin/main (tag `release-world-2.0`) — the merge plus the two test fixes above |
| deploy | GitHub Actions run 35401164291: verify ✓ (lint, typecheck, unit, build, brand scan, Playwright 307/307), deploy ✓ 2026-09-18T23:15Z; Pages deployment sha `cec93cc` |
| production | https://eungarage.com/ — serving `/assets/main-DFfT4J6m.js` and `/assets/main-DZQoAvEq.css`, identical to the local build of `cec93cc` |
| main gate before the push | typecheck ✓ lint ✓ unit 236/236 ✓ build ✓ brand scan ✓ Playwright 307/307 `--retries=0`, 0 failed, 0 skipped |

main is left exactly at the deployed commit; this record is committed on
`world-2.0` so that writing it down does not redeploy the site.

### Live QA (against https://eungarage.com)

- **Smoke, three sizes** (`scripts/live-smoke.mjs`, 1440 × 900, 390 × 844,
  844 × 390): served bundle = build; title, Open Graph, Twitter card,
  JSON-LD, canonical, manifest all EUNGARAGE; the alley, the room, PC, TV,
  fridge, radio (retuned), mute and unmute, the door, the playground, all
  three games entered and left, Back and Forward between the worlds three
  times each way (Back reaches the room from the playground after one press
  per place opened there, from the archive after one), the archive with
  the door open, Healing Mode, the tab hidden (sound stops) and back (it
  returns), reload in the archive (back in the archive), the sound
  preference kept across a reload. 0 console errors, 0 page errors,
  0 failed responses. One music at a time throughout: the room plays its
  tone and one track; the playground, each game and the archive one track
  each.
- **The door and the games** (`scripts/live-progress.mjs`): the label at
  0/3, 1/3, 2/3; a locked touch hints and stays in the room; the ceremony
  once at the third star, on screen; the save remembers; a reload finds the
  door open with no ceremony and no second sound; through it to the archive;
  POKO, Snack and Parcel each started, played and left. The first pass saw
  one `503` on one crew frame (`yomi_idle_left_02.webp`) in the CDN's first
  minutes after the deploy; the file is in the build, answered 200 ten times
  of ten from the edge cache, and the second pass was clean.
- **Brand**: every live page (index, 404, privacy, terms, support,
  account deletion, community guidelines, games, studio), the manifest,
  robots, the sitemap and the live bundle — 0 legacy terms. The icons, the
  favicon, the apple-touch icon, the OG image and the logo lockup served
  live are byte-identical to the build.
- **Performance** (`scripts/perf-spot.mjs`): to the alley 15 requests,
  1.8 MB (JS 69 KB, CSS 19 KB, the rest the alley's plates and the room's
  plate behind the shutter), no audio, nothing from the playground or the
  archive; after entering, still no audio before sound is turned on, no
  other world, no game music; 61 fps in the room.
- **Loop** (`scripts/leak-audit.mjs` against production, 30 round trips —
  15 to the playground with a game every other trip, 15 to the archive):
  DOM 368 nodes, 32 window/document listeners, 5 crew, 11 places, heap
  3.4 → 3.7 MB, flat from the fifth trip; 0 errors.
- **Cache**: no service worker (sw.js 404); HTML `max-age=600`; scripts and
  styles content-hashed — the live HTML names this build's files and they
  load.

Captures: `docs/shots/live`.

### Rollback

Previous stable production: `511c30b` (run 34842002107, bundle
`main-BGQQn1mg.js`). Procedure: on main, `git revert -m 1 6953e99` (and the
two commits after it, which only touch tests and docs besides one line in
`npc.ts`), push; the same workflow redeploys. No force push.

### BLOCKED_ASSET (unchanged, none requested at runtime)

archive_polaroid_bundle_v01 · alley/playground ambience · POKO-specific SFX ·
music-box audio.
