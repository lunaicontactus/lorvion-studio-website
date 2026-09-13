# Hiding the neck

The five meshes came out of Meshy with a column between the shoulders and the
jaw. At the size the garage draws them — about 130 px of figure — that column
is what turned a soft toy into a small person with a long thin neck.

`scripts/hide_neck.py` takes each mesh, finds its own neck, squashes that band
to a quarter of its height, lowers everything above it rigidly by exactly what
the band lost, and thickens what remains so that any of it still visible in the
outline reads as the body continuing rather than as a stalk.

Nothing above the band is reshaped: the face, eyes, ears, horns and hair are
carried down by one number. Nothing below it moves at all.

## Source

The input is the **arm-hotfix** set (`shless2` / `posed_fix`), the same meshes
the live 300 frames were rendered from — not `final_glb`, which predates the
hotfix and whose neck measures differently. Running the script against the
wrong source silently produces different numbers.

## Per character — measured, never copied

| id   | neck band (of figure height) | half-width | head lowered | as % of height |
|------|------------------------------|-----------|--------------|----------------|
| momo | 0.44 – 0.52 h                | 0.0826    | 41.6 mm      | 6.00 %         |
| nunu | 0.42 – 0.50 h                | 0.0813    | 42.0 mm      | 6.00 %         |
| ruki | 0.43 – 0.51 h                | 0.0866    | 41.9 mm      | 6.00 %         |
| yomi | 0.40 – 0.48 h                | 0.0866    | 45.0 mm      | 6.00 %         |
| poko | 0.40 – 0.50 h                | 0.0616    | 37.1 mm      | 7.50 %         |

POKO is the shortest of the five (458 mm against 650–705 mm) and carried the
longest neck for its size, so its detected band is proportionally wider and it
loses 7.5 % rather than 6.0 %. The value is the mesh's own, not MOMO's.

## What the transform is allowed to touch

Verified vertex by vertex against the source meshes:

- below the band: maximum difference **0.0000 mm** — legs, briefs, arms, the
  whole arm hotfix, untouched;
- above the band: x and z identical, y shifted by one constant (spread
  0.03 µm, which is float32 export rounding) — the head cannot be squashed,
  the hair cannot flatten;
- the widening applies only inside the squashed band, on a sine profile that
  returns to zero at both ends, so it cannot step.

## Known, accepted

At 4× the size the site ever draws, a faint collar ring is visible where the
band was compressed. It is present in the approved MOMO too, and it is not
resolvable at 130 px.

Sheets: `neck/ab_front_side.png`, `neck/ab_back_threequarter.png`,
`neck/ab_room_scale_130.png`, `neck/after_zoom.png`.

---

# YOMI's tail

The neck sheet showed a pink-tipped growth on YOMI's back. It is not something
the neck work caused: it is in the pre-neck meshes and in the live sprites too.
It is the tail this reconstruction gives every one of the five, and YOMI's is
the one that was never actually removed — the earlier pass checked the back
view, where a centre-line tail reads as a small nub, and never looked from the
side, where seventy millimetres of it stick out.

| | back reach at the waist | its neighbours |
|---|---|---|
| yomi | −158 mm | −77 mm above, −62 mm below |
| momo, nunu, ruki, poko | within 4 mm of trend | — |

## Why `excise.py` could not do it

`excise.py` rebuilds the surface a lump interrupted from the ring around the
lump. That needs the lump to be small next to the surface. This one is not: any
ring wide enough to contain it contains the whole buttock, and the quadric
fitted to that ring flattened the seat along with the tail — 663 vertices
moved, 40 mm on average, the bottom pulled forward by 30 mm.

## What replaced it

`scripts/debulge.py` measures the back instead of the growth. A polynomial
surface is fitted to the back of the hips, then refitted five more times with
everything sitting behind it thrown out, so the tail cannot vote on where the
skin is (final residual 1.2 mm). Whatever is still behind that skin by more
than 4 mm is pushed onto it and 6 mm further in, tapered by how far it stood
out, so the tip travels and the root does not.

`scripts/reclothe.py` then deals with the texture, which is what defeated every
earlier attempt — a flattened tail keeps its own beige and the red of its tip,
painted flat across the briefs. The atlas island is never searched for. The
faces that moved are known, so each is given the texture coordinate of the
point on the skin it now rests on, taken barycentrically from the nearest
untouched triangle. Those faces get their own copies of the vertices they share
with the body (379 of them), so the body's own texture is not disturbed.

Result: 336 vertices moved, all of them on the back between 0.18 h and 0.34 h.
Head, neck, ears, horns, hair, arms and the whole front: not one vertex.

Sheets: `neck/yomi_tail_four_views.png`, `neck/yomi_tail_closeup.png`,
`neck/crew_130_before_after.png`.

---

# The ring under the jaw

Under every chin there was a horizontal line: a collar, a crease, a seam
drawn across the chest. It is not shading and not the texture. It is the
widening this document describes a few paragraphs above — `widen = 1.30`,
applied on a sine profile that is 1.0 at both ends of the band and 1.30 in
the middle. A radius that grows and then shrinks again inside fourteen
millimetres is a torus, and a torus around a neck is a collar.

`widen = 1.0` removes it. Nothing else changes: the same band is detected,
the same squash is applied, the head comes down by the same 41.6 mm, and
every y in the mesh is identical to the approved version to four decimal
places. Only x and z inside the band differ, and only by the bulge that is
no longer added.

## What was tried first, and why it was worse

Four attempts treated the line as a junction to be filled, and all four made
it worse, because filling a fourteen-millimetre band radially turns a lip
into a skirt:

| attempt | what it did | result |
|---|---|---|
| fill 10 mm short of the head, 0.07 h | pushed the body out under the jaw | a wider plate with a hard rim |
| fill 22 mm short, 0.09 h | gentler version of the same | same plate, softer |
| re-cone inside the band | scaled each slice to a smooth profile | a lampshade |
| fill to the head's own radius, 0.10 h / 0.14 h | removed the step entirely | a ruff collar |

The line was never the junction. It was the bulge.
