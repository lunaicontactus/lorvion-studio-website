# WORLD 2.0 — BASELINE AUDIT

State of the site on branch `world-2.0` at `0d2633b` (= `world-1.0` + the POKO
glasses fix), audited 2026-09-16 before any WORLD 2.0 change. Everything below
was read out of the repository, the running build, or the user's asset folder
— nothing is assumed.

## 1. Garage objects — current role → new role

Source: `src/data/world.ts` (hit areas), `src/app/world.ts` (dispatch),
`src/ui/panels.ts` (what opens).

| OBJECT | CURRENT ROLE | NEW ROLE | CURRENT ASSET | NEW ASSET | MODULE | KEEP / MODIFY / REMOVE | NOTES |
|---|---|---|---|---|---|---|---|
| PC | Monitor panel listing **4 site mini-games** above the 5 works; work detail | **WORKS LIBRARY** — the 5 real games only, most detailed info | painted monitor + `garage/pc.webp` | same | `panels.openPc` | MODIFY | Mini-game rows leave the PC. They move to the Playground (PHASE 11+); until then reachable only by `?play=` deep link. |
| Posters ×4 + LUMIORA print | Enlarged artwork + "VIEW X" → PC | **ART GALLERY** — image, title, one line, `[PC에서 자세히 보기]` | `/artwork/*-wall.webp` hung over painted posters | same (white-matte audit PHASE 3) | `panels.openPoster`, `garage.hangPrint` | KEEP (clean up) | Already a gallery, not a menu. |
| Shelf | 4 "relics", **one per project**, each linking to the PC; crew figures drawn from the **retired v1 crew** (`dokka/*_front.webp`) | **DOKKA CREW COLLECTION** — ≥15 personal items, varied on every open | painted shelf, no item art | item art from existing repo cut-outs where they exist; label plates otherwise | `panels.openShelf`, `data/shelf.ts` | MODIFY | Today it is a second game list. |
| Workbench | Studio "about" note + toy car + **full project status list** + crew list + email | **WIP** — real work in progress from this repo (crew reboot sheets, sprite masters, dev notes) | painted bench, toy-car + parts-tray cut-outs | real dev assets under `assets/crew-reboot/`, `assets/sprites-v2/` | `panels.openStudioDesk` | MODIFY | Third game list today. |
| TV | CONTACT only (email + copy) | **EUNGARAGE BROADCAST** — CH01 GARAGE NEWS · CH02 DOKKA CAM · CH03 PROJECT TEASER · CH04 CONTACT · CH05 NO SIGNAL | painted TV + `garage/tv.webp` | same; DOKKA CAM crops the live room | `panels.openContact` | MODIFY | CONTACT keeps `SITE_CONFIG` as the one source. |
| Fridge | Fixed 7 items, one line each | **CREW LIFE** — 오늘의 냉장고, date-seeded, notes | painted fridge + alley/garage food cut-outs | same | `panels.openFridge`, `data/fridge.ts` | MODIFY | |
| Cabinet | Legal/support documents (5 links) | **RECORDS / LORE** — 업무일지, 분실물, 영수증, 개발 메모, world notes; legal files stay in one drawer | painted cabinet + `garage/cabinet.webp` | same | `panels.openCabinet`, `data/documents.ts` | MODIFY | Legal URLs are frozen (linked from the LUNAI app); they stay reachable here and in the nav. |
| Parcel | Open/closed toggle | **RANDOM DELIVERY** — box opens, one of ≥12 contents | `prop_parcel_closed/open.webp` | same | `garage.ts` toggle | MODIFY | Not the parcel mini-game. |
| Secret door (arched dokkaebi door) | "Nothing is behind it yet" | **OUTSIDE DOOR → Playground** | painted arched door | — | `panels.openSecret` | MODIFY (re-role) | Decision, see §1a. |
| Secret door (new) | — | **SECRET DOOR → Archive**, unlock at ★1 in all 3 games | — | — | new | ADD (PHASE 15) | Location decision, see §1a. |
| Radio | **does not exist** — not painted in either plate | **NIGHT RADIO** — audio hub, mute | — | `garage/radio.webp` (felt dokkaebi radio, 560×493, committed in `9292c1c` and never placed) | new | ADD | Corrected after the first pass of this audit, which missed the cut-out: not blocked. |
| Broom | `broom_clean` = BLOCKED_ASSET | ambient sweep | — | `garage_broom_v01` (now FOUND) | `systems/ambient.ts` | ADD (PHASE 7) | Unblocked by the user's asset. |
| Top nav | Games · Studio · Support · Contact + text wordmark | Function layer only: logo, contact, support, mute | text `EUNGARAGE` span (CSS) | new lockup | `index.html` | MODIFY | |
| `games.html` / `studio.html` | Standalone pages | Readable "case study" pages reached from the PC / TV | — | — | static | KEEP | Store reviewers and deep links rely on them. |

### 1a. Which door is which

The garage plate has exactly one painted door: the arched wooden door with the
dokkaebi face, bell and lantern (landscape x≈3170–3440). The user's
`playground_world_landscape_v01` shows the **same kind of arched door set into
the hill** at the bottom of the Playground — the way back in. So the painted
door is the **OUTSIDE DOOR**; using it for the Archive would make the Playground
return door lead nowhere.

The **SECRET DOOR** therefore has no painted door of its own. It will be a
hidden door in an existing painted object (candidate: the tall left bookcase,
x≈100–400) animated from the plate's own pixels — no new drawing. Decided in
PHASE 15; recorded here so the IA does not silently double-book the door.

## 2. Brand audit

| Check | Result |
|---|---|
| `LORVION` / `Lorvion` / `lorvion` / `lorvionstudio` in tracked text files | **1** — `README.md:8`, explaining that the GitHub repo is still named `lorvion-studio-website`. Not user-visible; the repo name itself is not changed (would break the deploy remote). |
| Old emails | **0** — every address in the repo is `eungarage@gmail.com` (26 occurrences) |
| Old domain | **0** — canonical/OG all `https://eungarage.com/` |
| Logo images at runtime | **none** — the nav logo is a CSS text wordmark. `public/assets/images/brand/*.png` (Sept 10 flat mark) are referenced nowhere: **UNUSED** |
| Icons | `favicon.png`, `apple-touch-icon.png`, `icon-192/512`, `icon-maskable-512`, `og-image.jpg` — all the **Sept 9 flat brown mark** (commit `25fb251`) |
| Latest approved logo | `assets/new/…11_58_24.png` lockup, `…01_14_20.png` app icon, `…12_07_14.png` OG — dated Sept 15–16, delivered with the rest of the WORLD 2.0 assets. The Sept 10 lockup in `Downloads/eungarage-immersive-v1` is byte-identical (md5 `f01f69be…`) to the repo's unused one, i.e. the older set. |
| Stale copy | `index.html` title/OG "Worlds Beyond the Ordinary" (old tagline; new lockup says CHARACTERS · EMOTIONS · WORLDS); meta description lists 3 of 5 works; `games.html` OG lists 4 of 5 |
| Missing metadata | `twitter:title/description/image`, `application-name`, JSON-LD `Organization` — absent on every page |

## 3. Image assets delivered for WORLD 2.0

Identified by opening each file (contact sheets), not by filename — every file
arrived named `ChatGPT Image …`. Alpha checked numerically and on a magenta
ground: **no baked checkerboards, no black or white boxes** in any transparent
file.

| ASSET (identified by viewing) | SOURCE FILE (~/Desktop/eungarage-website/assets/) | DIMENSIONS | ALPHA | SIZE | INTENDED USE | STATUS |
|---|---|---|---|---|---|---|
| `eungarage_logo_lockup_v02` | `new/ChatGPT Image 2026년 9월 16일 오전 11_58_24.png` | 2172×724 | real alpha (85% clear, 1.8% soft edge) | 385 KB | brand: site logo lockup (mark + wordmark + CHARACTERS·EMOTIONS·WORLDS) | FOUND |
| `eungarage_app_icon_v02` | `new/ChatGPT Image 2026년 9월 16일 오후 01_14_20.png` | 1254×1254 | none (opaque RGB) | 1408 KB | brand: favicon / apple-touch / PWA icon (black rounded-corner canvas, not transparent) | FOUND |
| `eungarage_og_v02` | `new/ChatGPT Image 2026년 9월 16일 오후 12_07_14.png` | 1672×941 | none (opaque RGB) | 1642 KB | brand: OG / Twitter share image | FOUND |
| `playground_parcel_office_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_34 (1).png` | 1122×1402 | real alpha (35% clear, 1.1% soft edge) | 1921 KB | Playground building: parcel office | FOUND |
| `playground_signpost_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_35 (2).png` | 1122×1402 | real alpha (55% clear, 2.3% soft edge) | 1598 KB | Playground signpost (glasses / bowl / parcel) | FOUND |
| `playground_dokkaebi_fire_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_36 (3).png` | 1254×1254 | real alpha (67% clear, 4.8% soft edge) | 1225 KB | Playground dokkaebi fire | FOUND |
| `secret_archive_landscape_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_36 (4).png` | 1672×941 | none (opaque RGB) | 2675 KB | Archive master, landscape | FOUND |
| `secret_archive_portrait_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_37 (5).png` | 941×1672 | none (opaque RGB) | 2568 KB | Archive master, portrait | FOUND |
| `secret_archive_foreground_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_38 (6).png` | 1672×941 | real alpha (63% clear, 4.7% soft edge) | 1442 KB | Archive foreground frame | FOUND |
| `archive_star_jar_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_39 (7).png` | 1254×1254 | real alpha (52% clear, 1.0% soft edge) | 1778 KB | Archive object: star jar | FOUND |
| `archive_memory_box_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_40 (10).png` | 1254×1254 | real alpha (45% clear, 0.5% soft edge) | 1911 KB | Archive object: memory box | FOUND |
| `archive_music_box_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_40 (8).png` | 1254×1254 | real alpha (55% clear, 0.6% soft edge) | 1598 KB | Archive object: music box (open) | FOUND |
| `archive_telescope_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_16_40 (9).png` | 1024×1536 | real alpha (66% clear, 1.2% soft edge) | 2010 KB | Archive object: telescope | FOUND |
| `archive_small_lantern_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_36_30 (1).png` | 1254×1254 | real alpha (75% clear, 0.6% soft edge) | 777 KB | Archive object: small lantern | FOUND |
| `archive_cushion_blanket_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_36_30 (2).png` | 1448×1086 | real alpha (53% clear, 0.6% soft edge) | 1323 KB | Archive object: cushions + blanket | FOUND |
| `archive_shooting_star_overlay_v01` | `new/ChatGPT Image 2026년 9월 15일 오후 09_36_30 (3).png` | 1672×941 | real alpha (68% clear, 21.7% soft edge) | 1389 KB | Archive overlay: shooting-star ring | FOUND |
| `playground_world_landscape_v01` | `images/ChatGPT Image 2026년 9월 15일 오후 08_37_41 (1).png` | 1672×941 | none (opaque RGB) | 2567 KB | Playground master, landscape | FOUND |
| `playground_world_portrait_v01` | `images/ChatGPT Image 2026년 9월 15일 오후 08_37_41 (2).png` | 941×1672 | none (opaque RGB) | 2772 KB | Playground master, portrait | FOUND |
| `playground_foreground_v01` | `images/ChatGPT Image 2026년 9월 15일 오후 08_37_42 (3).png` | 1672×941 | real alpha (62% clear, 2.3% soft edge) | 1390 KB | Playground foreground frame | FOUND |
| `garage_broom_v01` | `images/ChatGPT Image 2026년 9월 15일 오후 08_37_42 (4).png` | 1024×1536 | real alpha (84% clear, 1.2% soft edge) | 1426 KB | Garage ambient: broom | FOUND |
| `playground_poko_office_v01` | `images/ChatGPT Image 2026년 9월 15일 오후 08_37_43 (5).png` | 1122×1402 | real alpha (45% clear, 1.7% soft edge) | 1956 KB | Playground building: POKO office / workshop | FOUND |
| `playground_snack_stall_v01` | `images/ChatGPT Image 2026년 9월 15일 오후 08_37_43 (6).png` | 1122×1402 | real alpha (50% clear, 3.2% soft edge) | 1695 KB | Playground building: snack stall | FOUND |
| `archive_polaroid_bundle_v01` | — | — | — | — | Archive object: polaroid bundle | **MISSING** |

Notes: the Playground and Archive masters are 1672×941 / 941×1672 — a third of
the garage plate's 3600 px width. Usable, but they will be upscaled on a
1440-wide retina screen; the depth layers must not zoom them further.
`eungarage_app_icon_v02` has an opaque black rounded-corner canvas; iOS and the
maskable icon need a full-bleed square cropped from it, not the black corners.

## 4. Audio assets

| ASSET | PATH | FORMAT | DURATION | SIZE | PURPOSE | STATUS |
|---|---|---|---|---|---|---|
| Garage 메인 | `assets/new/Garage 메인.wav` | WAV 48k/16 stereo | 146.4 s | 26.8 MB | Garage BGM | FOUND (needs web encode + loop check) |
| Dokkaebi Playground | `assets/new/Dokkaebi Playground.wav` | WAV | 118.8 s | 21.8 MB | Playground BGM | FOUND |
| Secret Archive | `assets/new/Secret Archive.wav` | WAV | 164.2 s | 30.1 MB | Archive BGM | FOUND |
| POKO 부장님 몰래 딴짓 | `assets/new/POKO 부장님 몰래 딴짓.wav` | WAV | 119.6 s | 21.9 MB | POKO game BGM | FOUND |
| 도깨비 야식 심부름 | `assets/new/도깨비 야식 심부름.wav` | WAV | 33.0 s | 6.1 MB | Snack game BGM | FOUND |
| 택배 정리 | `assets/new/택배 정리.wav` | WAV | 118.8 s | 21.8 MB | Parcel game BGM | FOUND |
| 밤의 작은 마법 | `assets/new/밤의 작은 마법.m4a` | Opus in M4A (decoded via Chromium, `scripts/decode-audio.mjs`) | 146.4 s | 2.4 MB | — | **DUPLICATE** of `Garage 메인.wav`: RMS envelope correlation 0.994 at zero lag, same length |
| sfx_shutter_open | `assets/new/` | WAV | 2.0 s | 375 KB | entrance shutter | FOUND |
| sfx_door_open | 〃 | WAV | 2.0 s | 375 KB | outside/secret door | FOUND |
| sfx_pc_on / sfx_pc_click | 〃 | WAV | 1.0 s each | 188 KB each | PC | FOUND |
| sfx_tv_channel | 〃 | WAV | 2.0 s | 375 KB | TV channel | FOUND |
| sfx_fridge_open | 〃 | WAV | 0.6 s | 113 KB | fridge | FOUND |
| sfx_drawer_open | 〃 | WAV | 2.0 s | 375 KB | cabinet | FOUND |
| sfx_paper | 〃 | WAV | 3.0 s | 563 KB | cabinet papers / wall | FOUND |
| sfx_radio_tune | 〃 | WAV | 2.0 s | 375 KB | radio | FOUND — wired to the radio (static station, tuning) |
| sfx_broom | 〃 | WAV | 2.0 s | 375 KB | broom ambient | FOUND |
| sfx_crew_step_01 | 〃 | WAV | 0.48 s | 90 KB | crew footsteps | FOUND |
| sfx_lantern | 〃 | WAV | 2.0 s | 375 KB | Playground / Archive lantern | FOUND |
| sfx_stall_bell | 〃 | WAV | 6.68 s | 1.2 MB | snack stall | FOUND |
| sfx_game_start / sfx_game_fail | 〃 | WAV | 1.0 s each | 188 KB each | mini-games | FOUND |
| sfx_star_get | 〃 | WAV | 1.5 s | 281 KB | star obtained | FOUND |
| sfx_secret_unlock | 〃 | WAV | 2.0 s | 375 KB | Secret Door | FOUND |
| ambient.m4a | `public/assets/audio/` | AAC | 122.5 s | 1.5 MB | current garage room tone | IN REPO |
| bell, click, discovery, door, drawer, keyboard, surprise, wrapper | `public/assets/audio/` | AAC | 1–3 s | 10–25 KB | current SFX | IN REPO |

Not delivered: Playground ambience, Archive ambience, parcel spawn/pick/drop,
snack order/serve, POKO walk/warning/turn/caught, TV click, cardboard tap, night
insects. Each becomes BLOCKED_ASSET or reuses an existing SFX in PHASE 18.

## 5. BLOCKED_ASSET (as of this audit)

```
BLOCKED_ASSET
filename: archive_polaroid_bundle_v01.png
purpose: Secret Archive — polaroid bundle object (flip through real dev photos)
size: 1254×1254
aspect: 1:1
alpha/background: transparent PNG, no baked checkerboard
exact visual description: a small stack of 4–5 polaroid photos tied with a navy ribbon and a tiny brass star charm, top photo slightly fanned, warm lantern light, same painted storybook style and palette as archive_memory_box_v01
one-line generation prompt: "small bundle of polaroid photos tied with navy ribbon and brass star charm, cozy painted storybook game prop, warm lantern light, transparent background, matches starry memory box style"
```

(The radio BLOCKED_ASSET that was here was withdrawn: `public/assets/images/garage/radio.webp` exists.)
