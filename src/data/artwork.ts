/**
 * The studio's real work, and the shape each piece actually is.
 *
 * Everything here was made for the game it belongs to — a key visual, a
 * marketing poster, an in-game background — and is used at the proportions it
 * was drawn at. Nothing was made for this website, and nothing is a stand-in.
 *
 * `width` and `height` are the source's, measured by `scripts/artwork.py` when
 * the web copies were written. They are the whole point of this file: every
 * frame in the room and in the viewer is sized *from* the picture, so a tall
 * picture gets a tall frame and a wide one gets a wide frame. Nothing is ever
 * cropped to fit a shape that was decided before the picture was chosen.
 *
 * Two files per piece. `wall` is the print hanging in the room, which is at
 * most a couple of hundred world units across; `full` is what opens when the
 * visitor clicks it, and is fetched then rather than on the way in.
 */

export type ArtworkKind = 'keyart' | 'still'

/**
 * How a piece hangs.
 *
 *   frame   in a stitched felt frame with a name plate (src/data/wallFrames.ts)
 *   wood    full bleed in a wooden picture frame (hung in a painted one)
 *
 * The four main works hang in felt frames, each its own felt and its own
 * plate: a set, not a grid. RUBATO's opera house is wide, and hangs where a
 * wide picture fits, in the wooden frame over the television.
 */
export type Mount = 'frame' | 'wood'
export type Orientation = 'portrait' | 'landscape' | 'square'

export interface Artwork {
  readonly id: string
  readonly projectId: string
  readonly kind: ArtworkKind
  /** The source's own size, in its own pixels. */
  readonly width: number
  readonly height: number
  readonly mount: Mount
  /** Degrees, set by hand. Framed pieces hang straight. */
  readonly tilt: number
}

const ART = '/assets/images/artwork'

const PIECES: readonly Artwork[] = [
  { id: 'lunai-keyart', projectId: 'lunai', kind: 'keyart', width: 1024, height: 1536, mount: 'frame', tilt: 0 },
  { id: 'liminal-keyart', projectId: 'liminal', kind: 'keyart', width: 1024, height: 1536, mount: 'frame', tilt: 0 },
  { id: 'wormup-keyart', projectId: 'wormup', kind: 'keyart', width: 941, height: 1672, mount: 'frame', tilt: 0 },
  { id: 'rubato-opera', projectId: 'rubato', kind: 'still', width: 1920, height: 1080, mount: 'wood', tilt: 0 },
  { id: 'lumiora-keyart', projectId: 'lumiora', kind: 'keyart', width: 941, height: 1672, mount: 'frame', tilt: 0 },
] as const

export const ARTWORK: readonly Artwork[] = PIECES

export function artworkFor(projectId: string): Artwork | undefined {
  return PIECES.find((a) => a.projectId === projectId)
}

export function artworkById(id: string): Artwork | undefined {
  return PIECES.find((a) => a.id === id)
}

/** Width over height. The number every frame is built from. */
export function aspectOf(a: Artwork): number {
  return a.width / a.height
}

export function orientationOf(a: Artwork): Orientation {
  const r = aspectOf(a)
  if (r < 1 / 1.05) return 'portrait'
  if (r > 1.05) return 'landscape'
  return 'square'
}

/** The print on the wall: small, and fetched with the room. */
export function wallSrc(a: Artwork): string {
  return `${ART}/${a.id}-wall.webp`
}

/** The picture itself: fetched when somebody asks to see it. */
export function fullSrc(a: Artwork): string {
  return `${ART}/${a.id}-full.webp`
}
