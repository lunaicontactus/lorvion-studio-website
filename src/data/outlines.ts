/**
 * The shape each object really is.
 *
 * A hit region may be a little larger than its object so it is comfortable to
 * click. The outline must not be — it traces the thing in the painting, so the
 * two are kept apart: `rect` in world.ts is the hit region, and the path here
 * is the silhouette drawn inside it.
 *
 * Paths are in a 0..1 box so one string serves both jobs: stroked in an SVG
 * with `vector-effect="non-scaling-stroke"`, and reused as a clip on the very
 * slight brightness lift, which is what keeps the lift the object's shape
 * rather than a rectangle over it.
 */
export type OutlineShape =
  | 'rect'
  | 'poster'
  | 'monitor'
  | 'tv'
  | 'fridge'
  | 'arch'
  | 'cabinet'
  | 'shelf'

/** Rounded rectangle, corners as a fraction of the box. */
function roundedRect(r: number): string {
  const k = r
  return [
    `M${k},0`,
    `H${1 - k}`,
    `Q1,0 1,${k}`,
    `V${1 - k}`,
    `Q1,1 ${1 - k},1`,
    `H${k}`,
    `Q0,1 0,${1 - k}`,
    `V${k}`,
    `Q0,0 ${k},0`,
    'Z',
  ].join(' ')
}

export const OUTLINE_PATHS: Readonly<Record<OutlineShape, string>> = {
  rect: roundedRect(0.02),
  /** A sheet of paper pinned to a board. */
  poster: roundedRect(0.03),
  /** Monitor above, keyboard on the desk below it. */
  monitor:
    'M0.06,0 H0.94 Q1,0 1,0.06 V0.64 Q1,0.70 0.94,0.70 H0.60 V0.80 H0.86 ' +
    'Q0.90,0.80 0.90,0.84 V0.96 Q0.90,1 0.86,1 H0.14 Q0.10,1 0.10,0.96 ' +
    'V0.84 Q0.10,0.80 0.14,0.80 H0.40 V0.70 H0.06 Q0,0.70 0,0.64 V0.06 Q0,0 0.06,0 Z',
  /** A set with a rounded case and two small feet. */
  tv:
    'M0.07,0.03 H0.93 Q1,0.03 1,0.11 V0.80 Q1,0.88 0.93,0.88 H0.80 L0.83,1 ' +
    'H0.68 L0.65,0.88 H0.35 L0.32,1 H0.17 L0.20,0.88 H0.07 Q0,0.88 0,0.80 ' +
    'V0.11 Q0,0.03 0.07,0.03 Z',
  /** Tall body, door seam left implicit — the outline is the body only. */
  fridge:
    'M0.08,0 H0.92 Q1,0 1,0.05 V0.96 Q1,1 0.94,1 H0.06 Q0,1 0,0.96 V0.05 Q0,0 0.08,0 Z',
  /** Arched door: a half-round head on straight jambs. */
  arch: 'M0,1 V0.38 Q0,0 0.5,0 Q1,0 1,0.38 V1 Z',
  cabinet: roundedRect(0.025),
  shelf: roundedRect(0.015),
}

/** How much bigger than the object its hit region is, in world units. */
export const HIT_PADDING = 12
