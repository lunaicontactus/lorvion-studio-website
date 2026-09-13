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
