/**
 * The poster wall's felt frames.
 *
 * Each of the four main works hangs in its own stitched felt frame with a
 * name plate under it, the way the studio's reference painting of this wall
 * (2026-09-19) hangs them. The frames are cut out of that painting by
 * `scripts/wall_frames.py`, window punched out; the posters inside it were
 * redrawn copies with their lettering mangled, so the real key art hangs
 * behind each window instead, whole.
 *
 * Every box is a fraction of the frame's own cut-out, so one set of numbers
 * serves both room plates and any zoom. `win` is the hole the picture shows
 * through, `body` the felt frame below its ornament (what has to cover the
 * painted poster underneath), `plate` the name plate.
 *
 * A window is the shape the painting gave it, not the picture's. Where the
 * two differ the picture is shown whole and the rest of the window is felt,
 * the frame's own colour darkened: a mount, not a crop.
 */
import type { Frac } from '@/data/props'

export interface WallFrame {
  readonly src: string
  /** The cut-out's own pixel size. */
  readonly w: number
  readonly h: number
  readonly win: Frac
  readonly body: Frac
  readonly plate: Frac
  /** The felt round a picture that does not fill its window. */
  readonly mat: string
}

const F = '/assets/images/garage/frames'

export const WALL_FRAMES: Readonly<Record<string, WallFrame>> = {
  'lunai-keyart': {
    src: `${F}/lunai.webp`, w: 266, h: 459,
    win: { x: 0.0827, y: 0.1242, w: 0.8365, h: 0.7244 },
    body: { x: 0.0075, y: 0.0534, w: 0.9831, h: 0.8431 },
    plate: { x: 0.1861, y: 0.8878, w: 0.6485, h: 0.1078 },
    mat: '#23263d',
  },
  'liminal-keyart': {
    src: `${F}/liminal.webp`, w: 263, h: 470,
    win: { x: 0.0875, y: 0.1351, w: 0.8289, h: 0.7234 },
    body: { x: 0.0076, y: 0.066, w: 0.9848, h: 0.8404 },
    plate: { x: 0.1502, y: 0.8936, w: 0.7034, h: 0.1032 },
    mat: '#2a1d15',
  },
  'wormup-keyart': {
    src: `${F}/wormup.webp`, w: 269, h: 474,
    win: { x: 0.0818, y: 0.1255, w: 0.8401, h: 0.7278 },
    body: { x: 0.0074, y: 0.0622, w: 0.9851, h: 0.8386 },
    plate: { x: 0.1413, y: 0.8903, w: 0.7063, h: 0.1055 },
    mat: '#29304a',
  },
  'lumiora-keyart': {
    src: `${F}/lumiora.webp`, w: 276, h: 482,
    win: { x: 0.0888, y: 0.1338, w: 0.8188, h: 0.721 },
    body: { x: 0.0072, y: 0.0664, w: 0.9873, h: 0.8351 },
    plate: { x: 0.1522, y: 0.8911, w: 0.7011, h: 0.1037 },
    // Its key art is a touch narrower than this window; the mount is the deep
    // water at the picture's own edge, so the slivers read as mount.
    mat: '#1d4a66',
  },
}

export function wallFrameFor(artworkId: string | undefined): WallFrame | undefined {
  return artworkId ? WALL_FRAMES[artworkId] : undefined
}
