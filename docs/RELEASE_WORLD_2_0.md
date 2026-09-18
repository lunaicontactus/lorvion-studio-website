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
