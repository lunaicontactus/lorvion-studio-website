# EUNGARAGE WORLD 2.2 — the wall and the shelf

Branch `world-2.2`, from `world-2.1` (live at https://eungarage.com as
`ac41c24`). Not deployed: a push to main redeploys the site.

The brief: the poster wall and the shelf were the two places the room read
as a web page with pictures on it. The wall had taped-on thumbnails; the shelf
was a box of crew knick-knacks drawn three at a time. Both are now things the
studio painted, holding the studio's work.

Two reference paintings were delivered on 2026-09-19 (in `~/Downloads`):

| Reference | Size | What it is | What was taken |
|---|---|---|---|
| `ChatGPT Image 2026년 9월 19일 오후 08_33_47.png` | 1586 × 992 | the garage wall, four works in felt frames with name plates | the four frames and plates, cut out; **not** the posters inside them (redrawn copies, lettering mangled) |
| `ChatGPT Image 2026년 9월 19일 오후 08_37_43.png` | 1122 × 1402 | the felt cabinet, stocked with the works' things | the whole cabinet, cut out, contents and all |

Nothing was generated; both are the studio's own pictures.

## The wall

`scripts/wall_frames.py` cuts each frame out of the reference along its own
silhouette (felt body, the ornament on top, the name plate), punches the
window out, and writes `public/assets/images/garage/frames/<id>.webp` (15–18 KB
each) with the window, body and plate as fractions (`src/data/wallFrames.ts`).
The site hangs the real key art behind the window at its own shape; where the
window is a different shape from the picture (WORM UP!'s and LUMIORA's are
narrower) the rest is felt in the frame's own colour — a mount, never a crop,
never paper.

Each frame is scaled and centred over the painted poster it replaces so its
body covers it (painted posters measured off both plates at 2×, kept as
`painted` on the object), and the four share one hanging line: the same body
top, bottoms just under their painted posters, 12–14 world units apart on the
desktop plate. The hit area and the hover outline are the frame, ornament to
plate (`OutlineShape 'frame'`). Touching a frame opens the work as before
(`panels.openPoster`). RUBATO stays where a wide picture fits, in the wooden
frame over the television.

Gone: the tape strips, the paper name memos, the tilt, the thin dark print
frame (`print--poster`, `print--print`), and the painted posters' old WebP
copies (`garage/poster_*.webp`, unreferenced).

## The shelf — the archive cabinet

The shelf panel shows the cabinet from the reference (`garage/archive_cabinet.webp`,
900 × 1075, cut out with a seeded GrabCut: a traced outline, the crest's two
notches and the lamp's glow seeded as room). Everything on it is already painted;
`src/data/garage/shelf.ts` says where each thing is and what it is — fourteen
spots, each naming the work it came from:

| Shelf | Things | Work |
|---|---|---|
| top | 두건 쓴 지렁이 · 아주 작은 왕관 · 산길 팻말과 등반 장비 | WORM UP! |
| middle | 밤의 기록부 · 어긋난 서류 · 다리의 등불 | LIMINAL |
| middle | 달 표지 일기장 · 별을 담은 병 | LUNAI |
| bottom | RUBATO 악보 · 메트로놈 · 오페라 입장권 | RUBATO |
| bottom | 작은 피아노 오르골 | LUMIORA |
| drawers | 초안과 도구 (the bench's newest record, date and commit) · 인화한 작업 사진 (three of the bench's real photos) | the studio |

Every note says only what the project says of itself (`src/data/projects.ts`),
what is in the room, or what is true of the thing (a rubato is a tempo).
Picking a thing lights it and brings a stitched felt tag with its work, its
note, ‹ › to the next thing, and "PC에서 자세히 보기" to the work's page (the
tools drawer leads to the workbench). The tag never covers the cabinet: under
it on a tall window (the panel keeps room, `PropDef.reserveBelow`), to its left
on a wide one. Arrow keys step, Escape puts the thing down, Escape again
closes. On a touch screen each thing wears a small felt stud.

Gone: the DOKKA CREW COLLECTION (eighteen crew knick-knacks drawn three at a
time), its unused sibling list `src/data/shelf.ts`, and the old cut-outs
`garage/shelf.webp`, `garage/shelf_alt.webp`.

## Tests

Unit: `test/cabinet.test.ts` (every work on the shelf, each note names its
work, each thing on its own shelf, no two on top of each other); the discovery
pool's mechanics tests moved from the shelf's pool to the parcel's.

e2e, rewritten for what the room now is: `gallery.spec.ts` (four felt frames
and one wooden; picture at its own shape inside its window; the window mostly
picture, the rest felt; one hanging line; each frame's body covering its
painted poster, read from the page; frame files under 100 KB together),
`ia.spec.ts` (the spot a finger lands on is that thing's; no spot on another;
every work found going round; drawer records real; a thing leads to its work on
the PC; on a phone either way up the tag covers no spot, stays on screen, and
its buttons are finger-sized), `secondary.spec.ts` (fourteen things, no games
menu, ‹ › and arrow keys, Escape in two steps), `presentation.spec.ts` (the
cabinet's spots inside its surface).

Captures: `scripts/wall-shots.mjs`, `scripts/cabinet-shots.mjs`.
