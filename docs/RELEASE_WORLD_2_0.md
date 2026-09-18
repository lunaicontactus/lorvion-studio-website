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
