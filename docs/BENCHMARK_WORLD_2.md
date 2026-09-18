# BENCHMARK — EUNGARAGE WORLD 2.0

Five references, read for their **interaction grammar** only. Nothing here is
copied: no image, model, UI, graphic or line of copy is taken from any of them.
EUNGARAGE stays its own IP — *게임을 만드는 다섯 한국 도깨비의 밤 작업실*.

## How this was researched (2026-09-16)

| Reference | Source actually used | Hands-on? |
|---|---|---|
| Aurel's Grand Theater | Codrops making-of (Aurelien Vigne, 2025-05), Awwwards SOTD page | Source read; WebGL not played in the headless pane |
| Drake Related | Complex / Hypebeast / NME coverage of the 2021 house tour, Shopify case study, Webflow "Drake Related Rebuild" | **Live site checked: the room tour is retired** — `drakerelated.com/rooms/*` now redirects to a near-empty landing page. Analysis is of the documented version. |
| Bruno Simon | Awwwards "Bruno's Portfolio Case Study", Medium case study, devlog summary | Source read |
| New Game+ | `ngplus.studio` — **opened in a browser at desktop and 375×812** | Yes: dollhouse office, characters at desks with `Meet ___` pins, phone crops to one character |
| Raku Studio | `rakustudio.io`, itch.io page | Page read |

Where a claim below is an inference rather than something seen or stated by the
source, it says so.

---

## 01 — Aurel's Grand Theater

1. **Strongest idea** — the space *is* the portfolio, and it is somebody's
   place: dirt, tools, stacks of books, trash. Lived-in, not staged.
2. **Navigation model** — two layers that never fight: free exploration of the
   3D theater, and ordinary readable case-study pages. A camera move carries you
   from one to the other.
3. **Interaction model** — physics you can poke (smash things, ropes that
   swing); mysteries whose solution unlocks a *secret page*.
4. **World-building** — around 150 interactive items per scene, most of which
   do nothing important. The density of small incidental detail is what makes
   it read as inhabited.
5. **Sound / motion** — collision sounds tied to physics; cinematic camera
   transitions between the 3D and DOM layers so a mode change never feels like
   a page load.
6. **Mobile** — the author calls out optimisation for mobile as the main
   engineering cost of that many models (inference: quality is reduced rather
   than the layout redesigned).
7. **Apply to EUNGARAGE** — life-logic in the garage (every prop answers "who
   left this here and why"); a secret that is *earned* (Secret Door ← stars);
   the case study (PC) stays a readable page reached through a camera move.
8. **Do not apply** — player avatar and physics smashing; a full 3D scene.

## 02 — Drake Related

1. **Strongest idea** — a pre-rendered, beautifully lit room *is enough*. The
   sense of place comes from the rendering, not from real-time 3D.
2. **Navigation model** — room to room by explicit, labelled exits ("Enter
   Kitchen", "Enter Studio") from a front door; a conventional menu (Albums,
   Shop) lives beside the tour rather than inside it.
3. **Interaction model** — objects in the picture are the content (a hoodie on
   a chair, a floatie in the pool). Hotspots sit on real objects.
4. **World-building** — one real, recognisable house with a name; every room
   has a purpose.
5. **Sound / motion** — minimal; the still render carries the mood.
6. **Mobile** — the menu collapses; the rooms stay images (inference: no
   separate mobile composition).
7. **Apply** — keep and upgrade the painted garage plate; hotspots strictly on
   painted objects; separate the **exploration layer** (room) from the
   **function layer** (a contact link, mute) so function never clutters the
   picture; a named front door.
8. **Do not apply** — a shop; room-to-room arrows as the *only* movement; a
   dead static image with nothing alive in it.

## 03 — Bruno Simon

1. **Strongest idea** — moving around is itself fun, with no goal. The world
   rewards aimlessness.
2. **Navigation model** — roam; projects are places in the world, not items in
   a list.
3. **Interaction model** — everything reacts (foliage, water, bowling pins);
   achievements, leaderboards and cryptic secrets give optional goals.
4. **World-building** — weather, day/night, seasons: the world changes whether
   or not you act.
5. **Sound / motion** — layered and spatialised: environment (birds, crickets,
   wind), object sounds (anvil, oven, campfire), vehicle sounds; UI clicks too.
   Constant, quiet feedback.
6. **Mobile** — automatic quality presets (no depth of field, lower shadows).
7. **Apply** — every click answers with a small sound and motion; variation on
   repeat clicks (discovery pools); a few cryptic secrets; the world has its own
   rhythm (ambient events, crew routines) that continues without the visitor.
8. **Do not apply** — driving, a car, physics sandbox, WebGPU/Three.js world,
   leaderboards.

## 04 — New Game+ (ngplus.studio)

1. **Strongest idea** — a dollhouse office: the team *are* characters sitting
   at their own desks, and meeting the studio means meeting them.
2. **Navigation model** — the room sits under a short headline; characters
   carry `Meet ___` pins, so people are the entry points to information.
   Scrolling moves through the scene and on to work and contact.
3. **Interaction model** — spatial storytelling over menus; the site states
   its own thesis: static pages lose visitors within seconds.
4. **World-building** — each character has a role and a desk that says so.
5. **Sound / motion** — idle character animation; scroll-led reveal.
6. **Mobile (seen)** — the room is not shrunk: the phone crops in tight to one
   or two characters. **Zone framing, not a scaled-down desktop.**
7. **Apply** — the five dokkaebi as residents with territories (MOMO→PC and
   parcels, RUKI→workbench, NUNU→rug and fridge, YOMI→shelf, POKO→cabinet, TV
   and patrol); a crew member can point you at a thing; portrait phones frame a
   zone of the garage rather than the whole room.
8. **Do not apply** — real-time 3D office; the pin-label style; a scroll
   narrative that replaces free exploration.

## 05 — Raku Studio

1. **Strongest idea** — *brands you can play*: the mascot is the interaction
   subject, and the portfolio includes something actually playable.
2. **Navigation model** — a conventional scroll site (Archive → Capabilities →
   Studio → Platforms → Media) with a playable demo inside it.
3. **Interaction model** — the arcade demo is the moment the brand becomes
   felt; everything else is information.
4. **World-building** — characters × worlds × games as one system: characters
   inhabit worlds, games deliver both.
5. **Sound / motion** — motion-rich stylised worlds.
6. **Mobile** — standard responsive scroll.
7. **Apply** — EUNGARAGE as one IP system: the **real games** (LUNAI, LIMINAL,
   WORM UP!, LUMIORA, RUBATO) live on the PC; the **site mini-games** live
   outside, in the Dokkaebi Playground, starring the same crew. Characters ×
   world × games, never mixed up.
8. **Do not apply** — agency sales structure, service pitch, booking forms.

---

## Conclusions for EUNGARAGE

| Principle | Source | EUNGARAGE decision |
|---|---|---|
| A place with life-logic | Aurel | Every prop has an owner and a reason; crew have territories |
| Pre-rendered is enough | Drake | Keep the painted plates; add depth layers, not 3D |
| Exploration layer ≠ function layer | Drake | Hotspots only on painted objects; contact/mute outside the picture |
| Aimless clicking is fun | Bruno | Discovery pools, no immediate repeats, small sound on every answer |
| People are the navigation | New Game+ | Residents, not NPCs; a crew member reacts to what you open |
| Zone framing on phones | New Game+ (seen) | Portrait frames a zone of the garage; no shrunken desktop |
| Brand you can play | Raku | Playground outside, real works inside; never mixed |
| Secrets are earned | Aurel | Secret Door ← one star in each of the three games |

**One role per object.** The strongest shared lesson, and the thing the current
garage breaks most: in every good reference an object means one thing. The
garage today has several objects that all open the game list (see
`WORLD_2_BASELINE.md`).
