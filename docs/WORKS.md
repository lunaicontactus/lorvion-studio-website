# WORKS — where every line on the pages came from

`src/data/projects.ts` is the one record the garage PC, `works.html` and
`works/<id>.html` read. Each fact in it was checked against the project's own
repository on 2026-09-19. Where the brief and the repository disagreed, the
repository's newest record won, and the difference is listed here so it can be
decided rather than lost. Pictures are copied by `scripts/works_images.py`,
which keeps each source path.

## LUNAI — `~/Desktop/lunai`

- What it is: `CLAUDE.md` ("감정 기반 AI 음악일기 앱": 감정 기록 → 음악 → 앨범 저장).
  The README is still the Expo template; `docs/v1-product-definition.md` (June)
  is superseded by the code.
- Features, each found in source: emotion select/intensity/diary
  (`src/app/emotion-select.tsx`, `emotion-intensity.tsx`, `diary-input.tsx`),
  30-second daily check-in with a character reply (`daily-checkin.tsx`),
  ten characters with rooms (`src/constants/lunaiCharacters.ts`,
  `(tabs)/character-room.tsx`), character chat, song generation and playback
  (`supabase/functions/ai-music-generate`), album cover and album, weekly and
  monthly reports, friend rooms with invite codes, sharing and reactions
  (`room-*.tsx`, `room/[id].tsx`).
- Music is real generated audio, verified on a real iPhone against the **test
  server** (`docs/lunai-music-integration-status.md`, 09-11/12); full-lyric
  vocals are not yet passing (`docs/lunai-music-model-fitness.md`). The page
  says so: vocal quality is "진행 중".
- Status TESTFLIGHT QA: QA builds on TestFlight (build 39 confirmed,
  `docs/lunai-song-engine-master-progress.md`); build 40 built 09-12, upload
  recorded as pending. No App Store release; payment SDK not connected
  (`app-review/README.md`). Links: only the site's own SUPPORT and PRIVACY
  pages; TestFlight is shown as private, not linked.
- Dev log: `git log` of the repo (fa9816c … 10f5d51).
- Pictures: app icon, two in-app screens from `~/Desktop/lunai-qa/web-preview-1.1.0`
  (web preview renders, captioned so; the home screen was left out because it
  shows a personal name), two room illustrations, the default album cover.

## LIMINAL — `~/Desktop/리미널_게임기획/game`

- The story was replaced on 2026-08-29; the runtime data wins over the July
  planning notes (`game/docs/CANONICAL_STORY_INDEX.md`). The protagonist is not
  dead: unconscious after an attack, at the 경계관리국, a temporary counselor
  who can return (`src/data/scenes/s1_prologue.ts`, `src/data/characters.ts`).
  Year 2036 (`scripts/canon_lock.test.ts`).
- Six staff: 해령, 발쇠, 야연, 담비, 설매, 비향 (`characters.ts`).
- Season 1: prologue, seven cases, final chapter and epilogue
  (`src/data/scenes/index.ts`). Free roam: `docs/PHASE_E_FREEROAM.md`. Staff
  memories: `docs/PHASE_F_MEMORY.md`. CASE04 3D: `docs/3d/CASE04_FINAL_REPORT.md`,
  `CASE04_TECHNICAL_LOCK.md` (technical PASS, human playtest pending),
  `CASE04_RESONANCE_SLICE_REPORT.md`.
- Engine: React + three.js 0.186 (`game/package.json`) — not Unity.
- Dev log: `git log --all` (bc5ca5e … ff30fc1). No public links.
- Pictures: three backgrounds from `public/assets/backgrounds`, one in-game
  capture (`qa/memory_unlock/02_backyard_balsoe.png`), two 3D greybox frames
  (`qa/3d/c04/prod_c/`), captioned as greybox. The marketing key art in
  `public/assets/marketing` was left out (garbled lettering, off-canon figures).

## WORM UP! — `~/Projects/worm-up` (404 commits; `~/Desktop/climb!` is an older copy)

- Counts from source: 200 stages / 20 worlds (`src/stages/stageTypes.ts`,
  `biomes.ts`), 13 bosses (`bossDefs.ts`), 9 companions (`src/game/companions.ts`),
  6 skins, 24 accessories, 12 dash trails.
- Story: the worm climbs to rescue his girlfriend, taken by a bird; the crow
  까악이 is the stage-50 boss (`stageTypes.ts`).
- Status TESTFLIGHT QA: builds have gone to TestFlight; Build 19 was installed on
  an iPhone (`docs/qa/v2/B20_P0_VISUAL_RECOVERY.md`); Build 21 is the release
  candidate, not yet uploaded (`docs/qa/v2/B21_RC0_AUDIT.md`). Release NO-GO
  (`docs/RELEASE_GO_NO_GO.md`). No public links.
- Dev log: `git log` (d4fed636 … e2ffbdaf).
- Pictures: story art and the crow-boss CG from `assets/images/story`, the app
  icon. The project's own release doc marks commercial rights for its art as
  **unverified** — flagged for the studio to confirm.

## LUMIORA — `~/Desktop/LUMIORA_GAME` + `~/Desktop/LUMIORA_CLAUDE_PROJECT_v2`

- Canon: `CLAUDE_START_HERE.md`, `01_MASTER_GAME_DESIGN.md`,
  `03_SIX_COMPOSER_NARRATIVE_MAP.md`, `04_CORE_MUSIC_PHYSICS.md`,
  `14_DECISION_LOG.md`, `15_CLAUDE_FULL_IMPLEMENTATION_DIRECTIVE.md` (all
  2026-09-14). Genre "Stylized 3D Musical Narrative Adventure"; PC/Steam;
  "클래식이 BGM이 아니라 세계의 물리법칙이 된다".
- Composer order (LOCKED in `14`): Vivaldi, Saint-Saëns, Beethoven, Tchaikovsky,
  Rimsky-Korsakov, Debussy, then YOUR SCORE. Each world's theme from `03`.
- Build: Unity 6000.5.9f1 / URP 17.5 (`TheBrokenScore/ProjectSettings/ProjectVersion.txt`);
  the Aquarium greybox, seven zones, four music-physics systems implemented
  (dynamics, articulation, timbre, pitch), tests EditMode 61 / PlayMode 43;
  GATE 1 human playtest pending; Crystal Heart finale not built
  (`docs/AQUARIUM_VERIFICATION_REPORT.md`, 2026-09-17).
- Dev log: `git log` (00b3306 … 6820bbc).
- Pictures: five real greybox build frames (`docs/aquarium_build_shots`,
  captioned as greybox), and one Aquarium concept image from
  `~/Desktop/lumiora/new photo` (2026-09-16), captioned as concept art — it is
  not registered in the canon docs, so it is flagged for the studio to confirm.
- The old children's music-app direction (`~/Desktop/lumiora`, `lumiora-app`)
  is not used anywhere on the page; a unit test keeps it out.

## RUBATO — `~/Desktop/RUBATO/RUBATO` (`~/Desktop/미연시` does not exist)

- Canon: the v3 master script `RUBATO_1791_100점_최종마스터대본_D00_D30 (1).md`
  (named by `docs/canon/CANON_IDENTITY.md`). Tagline "빼앗긴 시간에서, 당신을
  만났다." (`README.md`, title screen). Genre "타임슬립 음악 미스터리 로맨스 ADV".
- Cast and speech styles: script §0 line 38. Routes: 베토벤, 모차르트, 슈베르트,
  브람스, 말러. Six endings, each a present-day reunion
  (`docs/release/ENDING_AUDIT.md`).
- Build: 232 scenes, DAY 0–30 and epilogue reachable, 6/6 endings by automated
  play; CG 0/39, SE and ambience not made; Steam not connected
  (`docs/release/RELEASE_BLOCKERS.md`, `IMPLEMENTATION_STATUS.md`, `game/data/steam.json`).
- Dev log: `git log` (1651f05 … 260c6f6). No public links.
- Pictures: the title screen and a café scene from `.qa-shots`, four backgrounds
  from `game/assets/bg`.

## Where the brief and the repositories disagreed

| Brief | Repository | On the page |
|---|---|---|
| LUMIORA "Action Adventure" | "Narrative Adventure" (no "Action") | Stylized 3D Musical Narrative Adventure |
| "음악이 세계의 물리법칙이다" | "클래식이 BGM이 아니라 세계의 물리법칙이 된다" | the canon's own wording |
| Vivaldi = rhythm / seasons | Vivaldi = BODY / BREATH (seasons are the setting) | 몸과 호흡 |
| Dissonance → Chapter Boss, The Perfect Score | Dissonance is an enemy type; bosses from the composers' pain are forbidden; "The Perfect Score" is in no file | left out |
| LIMINAL "Truth Graph" as a feature | a design/QA document | described as 추론과 판단 |
| LIMINAL on Unity | React + three.js | React · three.js |
| RUBATO: Paganini; Salieri as mentor | Paganini is not in the v3 script; nothing calls Salieri a mentor | Paganini left out; Salieri as the one who pairs up investigations |
| WORM UP! TestFlight build number | Build 21 not yet uploaded; Build 19 on device | "Build 21 출시 후보 · 실기기 QA 대기", no number claimed as live |

## Still open for the studio

- LUMIORA's key art for the current game was delivered 2026-09-20 and now hangs
  on the wall, on the PC and on its page (`lumiora-keyart`, 1122×1402); the old
  children's-app splash is deleted. Its own line — "a musical action-adventure
  where sound shapes the world" — is what the page says in English.
- WORM UP!'s art rights (unverified in its own release doc) and the LUMIORA
  concept image (not in the canon docs): confirm before this goes live.
