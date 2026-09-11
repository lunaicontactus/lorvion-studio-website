/**
 * Where the room's light comes from, and what moves in it.
 *
 * All world coordinates, measured off the painting, so the camera and the
 * window size are somebody else's problem. Nothing here is a light engine:
 * each source is one soft radial wash sitting over the plate at low opacity,
 * which is enough to say "the bench is warm and the monitor is cold" and
 * cheap enough to leave on.
 */
export interface LightSource {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly r: number
  /** The wash itself. Kept dim on purpose — this is not bloom. */
  readonly colour: string
}

export interface SkyBox {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

/** Measured off the plate: the glass, above the painted skyline. */
export const SKY: SkyBox = { x: 1600, y: 305, w: 320, h: 150 }

export const LIGHTS: readonly LightSource[] = [
  // The bench lamp. The warmest thing in the room and the only one always lit.
  { id: 'bench', x: 1780, y: 700, r: 620, colour: 'rgba(255,186,96,.13)' },
  // The monitor: small, cold, and the reason the desk reads as a workplace.
  { id: 'pc', x: 1578, y: 650, r: 300, colour: 'rgba(150,205,255,.10)' },
  // The television, off unless something is on it.
  { id: 'tv', x: 2832, y: 686, r: 260, colour: 'rgba(150,210,255,.09)' },
  // The door at the end. Almost nothing, almost never.
  { id: 'secret', x: 3317, y: 789, r: 200, colour: 'rgba(140,255,214,.07)' },
]

/**
 * Small things in the painting that move now and then: the pencils in the
 * cup, a magnet on the fridge, a note on the wall. Each is a piece of the
 * plate redrawn over itself (the trick the foreground uses) and given a
 * little animation, so nothing is repainted and nothing can drift from the
 * room behind it. World rects, measured off the plate.
 */
export interface Bit {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly motion: 'wiggle' | 'wobble' | 'sway'
  /** Where it is fixed: pencils at the bottom of the cup, a note at its pin. */
  readonly origin: string
  readonly every: { readonly min: number; readonly max: number }
  readonly duration: number
}

export const BITS: readonly Bit[] = [
  { id: 'pencils', x: 1900, y: 600, w: 100, h: 140, motion: 'wiggle', origin: '50% 100%', every: { min: 22000, max: 55000 }, duration: 1600 },
  { id: 'magnet', x: 2384, y: 672, w: 56, h: 44, motion: 'wobble', origin: '50% 50%', every: { min: 30000, max: 70000 }, duration: 1400 },
  { id: 'memo', x: 1392, y: 362, w: 40, h: 92, motion: 'sway', origin: '50% 0%', every: { min: 18000, max: 48000 }, duration: 2600 },
]

/** The mug on the low table: where its steam rises from. */
export const STEAM = { x: 666, y: 868 }

/** The glass of the television, for the flicker. */
export const TV_SCREEN = { x: 2700, y: 600, w: 262, h: 172 }

/** Stars, as fractions of the sky box, so the box can move without redoing them. */
export const STARS: readonly { readonly x: number; readonly y: number; readonly s: number }[] = [
  { x: 0.08, y: 0.22, s: 2 },
  { x: 0.17, y: 0.54, s: 1.5 },
  { x: 0.26, y: 0.13, s: 2.5 },
  { x: 0.35, y: 0.4, s: 1.5 },
  { x: 0.46, y: 0.2, s: 2 },
  { x: 0.55, y: 0.62, s: 1.5 },
  { x: 0.63, y: 0.3, s: 2 },
  { x: 0.74, y: 0.15, s: 1.5 },
  { x: 0.82, y: 0.5, s: 2 },
  { x: 0.92, y: 0.28, s: 1.5 },
]
