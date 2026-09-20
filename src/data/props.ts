/**
 * The furniture as presentation surfaces.
 *
 * When a thing in the room is touched, its cut-out (the same felt furniture
 * that is painted into the plate) grows out of the thing on screen and its
 * content is laid into the part of the cut-out that would actually hold it:
 * the monitor's screen, the television's tube, the fridge's doors, the
 * cabinet's drawer, the shelf's shelves, the radio's dial, the bench top.
 *
 * Every rectangle here is a fraction of the cut-out, measured off the image
 * with a 5% grid (scripts: ../inv/grid_*.png). `min` is the smallest the
 * surface may be on screen and still be read; when the whole cut-out cannot
 * be shown that big, the layer zooms into the surface instead — a phone gets
 * the monitor's screen filling the window with the bezel showing round it,
 * not a shrunken monitor with unreadable text on it.
 */

export interface Frac {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface PropDef {
  readonly art: string
  /** The cut-out's own pixel size. */
  readonly w: number
  readonly h: number
  /** Where the content goes, as fractions of the cut-out. */
  readonly surface: Frac
  /** Smallest readable surface, in CSS px. */
  readonly min: { readonly w: number; readonly h: number }
  /** Extra regions the presentation animates (doors, drawers, a door leaf). */
  readonly parts?: Readonly<Record<string, Frac>>
  /**
   * CSS px kept free under the cut-out on a tall window, for what it says
   * about the thing picked (the shelf's note goes there, not over the shelf).
   */
  readonly reserveBelow?: number
}

const G = '/assets/images/garage'

export const PROPS: Readonly<Record<string, PropDef>> = {
  pc: {
    art: `${G}/pc.webp`, w: 560, h: 572,
    surface: { x: 0.19, y: 0.2, w: 0.49, h: 0.36 },
    min: { w: 400, h: 250 },
  },
  tv: {
    art: `${G}/tv.webp`, w: 560, h: 441,
    surface: { x: 0.19, y: 0.27, w: 0.47, h: 0.51 },
    min: { w: 320, h: 210 },
    parts: {
      knobs: { x: 0.72, y: 0.3, w: 0.2, h: 0.32 },
      bezel: { x: 0.19, y: 0.8, w: 0.47, h: 0.08 },
    },
  },
  fridge: {
    art: `${G}/fridge.webp`, w: 560, h: 870,
    // Both doors: the inside is what shows when they swing.
    surface: { x: 0.04, y: 0.1, w: 0.72, h: 0.78 },
    min: { w: 260, h: 300 },
    parts: {
      upper: { x: 0.02, y: 0.09, w: 0.76, h: 0.32 },
      lower: { x: 0.02, y: 0.43, w: 0.76, h: 0.46 },
    },
  },
  cabinet: {
    art: `${G}/cabinet.webp`, w: 560, h: 606,
    // The paper rises out of the right-hand drawer and stands over the doors.
    surface: { x: 0.2, y: 0.06, w: 0.62, h: 0.76 },
    min: { w: 300, h: 340 },
    parts: {
      drawer: { x: 0.55, y: 0.22, w: 0.35, h: 0.16 },
      doors: { x: 0.17, y: 0.4, w: 0.73, h: 0.42 },
    },
  },
  shelf: {
    // The archive cabinet (src/data/garage/shelf.ts): the surface is its
    // three shelves and the two open drawers, where everything is.
    art: `${G}/archive_cabinet.webp`, w: 900, h: 1075,
    surface: { x: 0.15, y: 0.17, w: 0.7, h: 0.79 },
    // Everything on it is a picture to point at, not text to read: a phone
    // shows the whole cabinet rather than zooming into it.
    min: { w: 220, h: 280 },
    reserveBelow: 340,
  },
  radio: {
    art: `${G}/radio.webp`, w: 560, h: 493,
    surface: { x: 0.15, y: 0.24, w: 0.75, h: 0.6 },
    min: { w: 360, h: 290 },
    parts: {
      dial: { x: 0.35, y: 0.67, w: 0.39, h: 0.08 },
      left: { x: 0.19, y: 0.66, w: 0.15, h: 0.2 },
      right: { x: 0.79, y: 0.65, w: 0.14, h: 0.2 },
      grille: { x: 0.15, y: 0.24, w: 0.75, h: 0.38 },
    },
  },
  workbench: {
    art: `${G}/workbench.webp`, w: 560, h: 495,
    surface: { x: 0.03, y: 0.15, w: 0.93, h: 0.45 },
    min: { w: 420, h: 220 },
    parts: {
      board: { x: 0.19, y: 0.17, w: 0.38, h: 0.4 },
      block: { x: 0.59, y: 0.2, w: 0.32, h: 0.36 },
      matLeft: { x: 0.18, y: 0.45, w: 0.32, h: 0.13 },
      matRight: { x: 0.55, y: 0.45, w: 0.28, h: 0.13 },
    },
  },
  'outside-door': {
    art: `${G}/secret_door.webp`, w: 560, h: 660,
    surface: { x: 0.26, y: 0.32, w: 0.45, h: 0.54 },
    min: { w: 220, h: 260 },
    parts: {
      leaf: { x: 0.26, y: 0.32, w: 0.45, h: 0.54 },
    },
  },
}

/** Frequencies along the radio's dial, left to right, as fractions of the strip. */
export function dialPosition(freq: number): number {
  const lo = 88.1
  const hi = 103.2
  return Math.max(0, Math.min(1, (freq - lo) / (hi - lo)))
}
