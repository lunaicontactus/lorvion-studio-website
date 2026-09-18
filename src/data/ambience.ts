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
  // Inside the fridge, seen only while its door is open (PHASE 5).
  { id: 'fridge', x: 2462, y: 760, r: 250, colour: 'rgba(255,236,190,.18)' },
  // Moonlight through the outside door while it stands open (PHASE 6): cool,
  // on the mat at its foot, and nothing like the green under it for LIMINAL.
  { id: 'moon', x: 3317, y: 995, r: 260, colour: 'rgba(188,214,255,.24)' },
  // The radio's dial, while it is being tuned.
  { id: 'radio', x: 1316, y: 1030, r: 110, colour: 'rgba(255,200,120,.16)' },
  // The cabinet's open drawer: paper under a lamp, very faintly (PHASE 6).
  { id: 'cabinet', x: 921, y: 830, r: 150, colour: 'rgba(255,214,150,.11)' },
  // Starlight through the seam of the door in the bookcase, the moment it
  // unlocks and while it is open (PHASE 11).
  { id: 'bookcase', x: 330, y: 735, r: 190, colour: 'rgba(196,214,255,.16)' },
]

/**
 * The same room, stacked for a phone.
 *
 * Every one of these sits on a thing the portrait layout already places
 * (src/data/world.ts), so they are not a second set of measurements that can
 * drift from the first: the monitor's glow is the centre of the monitor's hit
 * area, the television's is the centre of the television's, the door's is the
 * foot of the door. The radii are the landscape ones as a share of the room's
 * width, which is a third of what it was.
 *
 * What is deliberately not here: the sky. The window in the portrait plate is
 * a different window in a different place, and stars measured off the
 * landscape one would be scattered across the plaster.
 */
export const LIGHTS_PORTRAIT: readonly LightSource[] = [
  // Over the desk, which is where the room's warmth is in this layout too.
  { id: 'bench', x: 540, y: 1330, r: 300, colour: 'rgba(255,186,96,.13)' },
  // pc rect { x: 439, y: 1251, w: 158, h: 135 }
  { id: 'pc', x: 518, y: 1318, r: 155, colour: 'rgba(150,205,255,.10)' },
  // tv rect { x: 508, y: 2138, w: 190, h: 147 }
  { id: 'tv', x: 603, y: 2211, r: 140, colour: 'rgba(150,210,255,.09)' },
  // outside-door rect { x: 862, y: 2149, w: 129, h: 270 }, at its foot
  { id: 'secret', x: 926, y: 2390, r: 110, colour: 'rgba(140,255,214,.07)' },
  // fridge rect { x: 276, y: 2121, w: 158, h: 306 }
  { id: 'fridge', x: 355, y: 2270, r: 180, colour: 'rgba(255,236,190,.18)' },
  { id: 'moon', x: 926, y: 2425, r: 150, colour: 'rgba(188,214,255,.24)' },
  // radio rect { x: 405, y: 1566, w: 76, h: 67 }
  { id: 'radio', x: 443, y: 1600, r: 70, colour: 'rgba(255,200,120,.16)' },
  // cabinet rect { x: 424, y: 522, w: 142, h: 82 }
  { id: 'cabinet', x: 495, y: 563, r: 95, colour: 'rgba(255,214,150,.11)' },
  // secret-door rect { x: 142, y: 456, w: 148, h: 118 }
  { id: 'bookcase', x: 216, y: 515, r: 120, colour: 'rgba(196,214,255,.16)' },
]

/** The cup of noodles the portrait layout puts beside the rug (DECOR). */
export const STEAM_PORTRAIT = { x: 482, y: 1626 }

/** The glass of the portrait television, inset from its hit area. */
export const TV_SCREEN_PORTRAIT = { x: 520, y: 2150, w: 166, h: 123 }

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
  // The lantern hanging on the top shelf of the bookcase (PHASE 6). The one
  // thing on the shelf that can move without anything falling off it; YOMI
  // is the one who goes to check (src/systems/interactions.ts).
  { id: 'shelfLantern', x: 260, y: 296, w: 86, h: 124, motion: 'sway', origin: '50% 0%', every: { min: 40000, max: 95000 }, duration: 2400 },
]

/**
 * Where the broom sweeps (PHASE 6): stretches of the front boards with
 * nothing painted on them and no place to stand inside them. Its bristles
 * are on the walkway (`y`), so the crew pass in front of it or behind it the
 * way they pass the parcel. Which stretch is used is decided when it fires,
 * from where the crew are (src/systems/broom.ts).
 */
export interface BroomZone {
  readonly id: string
  readonly x0: number
  readonly x1: number
  /** The base line. */
  readonly y: number
}

export const BROOM_ZONES: readonly BroomZone[] = [
  // In front of the rest area's cushions, short of the radio at 1258.
  { id: 'rest', x0: 1090, x1: 1215, y: 1064 },
  // The boards in front of the desk, between the monitor's place (1578)
  // and the pot; a body width clear of the one at the monitor.
  { id: 'desk', x0: 1716, x1: 1840, y: 1064 },
  // Between the fridge's place (2470) and the television stand.
  { id: 'right', x0: 2596, x1: 2740, y: 1064 },
]

export const BROOM_ZONES_PORTRAIT: readonly BroomZone[] = [
  // Between the stool and the round rug.
  { id: 'stool', x0: 566, x1: 636, y: 1658 },
  // Between the rug and the bench.
  { id: 'rug', x0: 760, x1: 836, y: 1658 },
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
