/**
 * The games' own pixel art, for the few things no delivered picture is
 * (WORLD 2.1): hearts and stars for the HUD, the snack YOMI sneaks, the
 * village's ghosts, a crate, a lantern, the "!" over a head.
 *
 * One palette for the series — a summer night in the dokkaebi village —
 * so the three games look like they came on the same cartridge; each game
 * picks its own corner of it (the office's lamplight, the stall's red, the
 * village's blue).
 */
import { fromRows, type PixelSprite } from '@/games/pixel/sprites'

export const PAL = {
  ink: '#0b0a14',
  night: '#141733',
  night2: '#1e2350',
  night3: '#2b3268',
  star: '#ffe9a8',
  moon: '#fff4cf',
  grass: '#2f6b45',
  grass2: '#47904f',
  grass3: '#6fb85e',
  leaf: '#1f4a37',
  dirt: '#6b4630',
  dirt2: '#8a5d3b',
  wood: '#9c6436',
  wood2: '#6e4222',
  wood3: '#c48a52',
  stone: '#7e839c',
  stone2: '#565a73',
  lamp: '#ffcf6b',
  lamp2: '#ff9f43',
  red: '#e0584a',
  red2: '#a8352d',
  white: '#f6f1e6',
  paper: '#efe2c4',
  ghost: '#d9ecff',
  ghost2: '#94b9ea',
  pink: '#ff8fb1',
  gold: '#ffd257',
} as const

const make = (rows: readonly string[], p: Readonly<Record<string, string>>): (() => PixelSprite) => {
  let s: PixelSprite | null = null
  return () => (s ??= fromRows(rows, p))
}

export const HEART = make([
  '.##.##.',
  '#######',
  '#######',
  '.#####.',
  '..###..',
  '...#...',
], { '#': PAL.red })

export const HEART_EMPTY = make([
  '.##.##.',
  '#..#..#',
  '#.....#',
  '.#...#.',
  '..#.#..',
  '...#...',
], { '#': PAL.stone2 })

export const STAR = make([
  '...#...',
  '..###..',
  '#######',
  '.#####.',
  '.##.##.',
  '#.....#',
], { '#': PAL.gold })

/** YOMI's snack: a little bag of crisps, torn open at the top. */
export const SNACK = make([
  '.o.o.o.',
  'ooooooo',
  'rrrrrrr',
  'rwwwwwr',
  'rwyyywr',
  'rwyyywr',
  'rwwwwwr',
  'rrrrrrr',
  '.rrrrr.',
], { o: PAL.lamp, r: PAL.red, w: PAL.white, y: PAL.gold })

/** A crumb, for when a bite is taken. */
export const CRUMB = make(['#'], { '#': PAL.lamp })

/** The "!" over a head. */
export const ALERT = make([
  'kkkk',
  'kyyk',
  'kyyk',
  'kyyk',
  'kkkk',
  'kyyk',
  'kkkk',
], { k: PAL.ink, y: PAL.lamp })

/** The village's ghost: a sheet with a horn, soft and round, not scary. */
export const GHOST = make([
  '....k....',
  '...kgk...',
  '..kgggk..',
  '.kgggggk.',
  'kgggggggk',
  'kgkgggkgk',
  'kgkgggkgk',
  'kgggggggk',
  'kggpgpggk',
  'kgggggggk',
  'kgbgbgbgk',
  '.k.k.k.k.',
], { k: PAL.ink, g: PAL.ghost, b: PAL.ghost2, p: PAL.pink })

export const GHOST_B = make([
  '....k....',
  '...kgk...',
  '..kgggk..',
  '.kgggggk.',
  'kgggggggk',
  'kgkgggkgk',
  'kgkgggkgk',
  'kgggggggk',
  'kggpgpggk',
  'kgggggggk',
  'kbgbgbgbk',
  'k.k.k.k.k',
], { k: PAL.ink, g: PAL.ghost, b: PAL.ghost2, p: PAL.pink })

export const CRATE = make([
  'kkkkkkkkkk',
  'kwwwwwwwwk',
  'kwdwwwwdwk',
  'kwwdwwdwwk',
  'kwwwddwwwk',
  'kwwwddwwwk',
  'kwwdwwdwwk',
  'kwdwwwwdwk',
  'kwwwwwwwwk',
  'kkkkkkkkkk',
], { k: PAL.wood2, w: PAL.wood, d: PAL.wood2 })

export const LANTERN = make([
  '..k..',
  '.kkk.',
  'klllk',
  'klyak',
  'klyak',
  'klllk',
  '.kkk.',
], { k: PAL.ink, l: PAL.lamp2, y: PAL.moon, a: PAL.lamp })

/** Sparkle frames for a burst: four small shapes, largest last. */
export const SPARK = [
  make(['#'], { '#': PAL.star }),
  make(['.#.', '###', '.#.'], { '#': PAL.star }),
  make(['..#..', '..#..', '##.##', '..#..', '..#..'], { '#': PAL.gold }),
  make(['#...#', '.#.#.', '.....', '.#.#.', '#...#'], { '#': PAL.white }),
] as const
