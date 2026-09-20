/**
 * The polaroids on the archive's table (WORLD 2.1, PHASE A).
 *
 * Not one finished picture: a record that grows. Every photo is one entry
 * here — a game, a day of making it, an early sketch, a test screen — and
 * the table lays out however many there are.
 *
 * To add one:
 *   1. put the image in `public/assets/images/polaroids/` (webp or jpg,
 *      any shape — the frame crops to a square, like a real polaroid);
 *   2. add an entry to `ADDED` below. Only `id` and `src` are required.
 *
 * The rest is optional and simply left off the card when it is missing: no
 * title means the photo alone, no date means no date line. An empty list is
 * fine too — the table says the record is still being kept, and that is all.
 *
 * What is here to start with is only what the site already has for real:
 * the five works' own pictures, a couple of working screens from each
 * (the works' galleries, src/data/projects.ts), and the working record the
 * workbench keeps (each with the day and the commit it came from). Nothing
 * is invented.
 */
import { PROJECTS, workPicture } from '@/data/projects'
import { artworkFor, wallSrc } from '@/data/artwork'
import { WORKBENCH_ENTRIES } from '@/data/garage/workbench'

export type PolaroidCategory = 'game' | 'dev' | 'sketch' | 'memory'

export interface Polaroid {
  readonly id: string
  /** Path under `public/`, starting with a slash. */
  readonly src: string
  readonly title?: string
  readonly note?: string
  /** As written on the back: `2026.09.16`. */
  readonly date?: string
  readonly category?: PolaroidCategory
  /** The work it belongs to, if one: a work's page shows its own (src/ui/works.ts). */
  readonly projectId?: string
}

/**
 * Photos added by hand. Newest first reads best on the table, but any order
 * works. Example:
 *
 *   { id: 'lunai-first-sketch', src: '/assets/images/polaroids/lunai_first_sketch.webp',
 *     title: 'LUNAI 첫 스케치', date: '2026.03.02', category: 'sketch' },
 */
const ADDED: readonly Polaroid[] = []

/** The five works, each by its own picture (the wall print, or the work's hero). */
const GAMES: readonly Polaroid[] = PROJECTS.flatMap((p) => {
  const art = artworkFor(p.id)
  const src = p.hero ? workPicture(p.id, p.hero.name, 'thumb') : art ? wallSrc(art) : null
  return src ? [{ id: `game-${p.id}`, src, title: p.title, note: p.taglineKo, category: 'game' as const, projectId: p.id }] : []
})

/**
 * Working traces from the works themselves: a screen of the running build, a
 * greybox — two at most from each, from its page's own gallery.
 */
const TRACES: readonly Polaroid[] = PROJECTS.flatMap((p) =>
  p.gallery.filter((g) => g.kind === 'screen' || g.kind === 'greybox').slice(0, 2).map((g) => ({
    id: `trace-${p.id}-${g.name}`, src: workPicture(p.id, g.name, 'thumb'), title: g.caption, note: p.title,
    category: 'dev' as const, projectId: p.id,
  })))

/** The days of making, from the workbench's own record. */
const MAKING: readonly Polaroid[] = WORKBENCH_ENTRIES.flatMap((w) =>
  w.asset
    ? [{ id: `dev-${w.id}`, src: w.asset, title: w.title, note: w.description, date: w.date, category: 'dev' as const }]
    : [])

export const POLAROIDS: readonly Polaroid[] = [...ADDED, ...MAKING, ...TRACES, ...GAMES]

/** A work's own photos, for its page. */
export function polaroidsOf(projectId: string): readonly Polaroid[] {
  return POLAROIDS.filter((p) => p.projectId === projectId)
}

/**
 * Where a card lies on the table: the same place every visit, per photo.
 *
 * `cols` is chosen by whoever knows the table's shape (a short, wide table
 * wants more columns and fewer rows, so nothing is buried under the row in
 * front of it); without it the grid is from the count alone. Positions are
 * fractions of the table's inner box, whose edge is kept half a card in.
 */
export function scatter(id: string, index: number, count: number, cols?: number): { x: number; y: number; turn: number } {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  const r = (n: number): number => (((h >>> (n * 5)) & 1023) / 1023)
  const c0 = cols ?? (count <= 4 ? count : count <= 9 ? 3 : 4)
  const k = Math.max(1, Math.min(Math.max(count, 1), Math.round(c0)))
  const rows = Math.max(1, Math.ceil(count / k))
  const c = index % k
  const row = Math.floor(index / k)
  // A short last row sits in the middle of its row, not at the left end.
  const inRow = row === rows - 1 ? count - row * k : k
  const shift = (k - inRow) / 2
  // Even spacing edge to edge, so the outer cards sit on the inner edge.
  const cx = k === 1 ? 0.5 : (c + shift) / (k - 1)
  const cy = rows === 1 ? 0.5 : row / (rows - 1)
  const jx = (r(0) - 0.5) * (0.35 / k)
  const jy = (r(1) - 0.5) * (0.3 / rows)
  return {
    x: Math.min(1, Math.max(0, cx + jx)),
    y: Math.min(1, Math.max(0, cy + jy)),
    turn: Math.round((r(2) - 0.5) * 22 * 10) / 10,
  }
}

/**
 * How many columns a table of this size wants for `count` cards of this
 * size. Every row count is tried: cards that would lie on top of their
 * neighbours cost the most, cards jammed edge to edge cost a little, and of
 * what is left the arrangement whose gaps are most even across and down
 * wins — so a wide, short table gets two long rows and a tall one gets a
 * column of threes, and neither leaves a band of empty table in the middle.
 */
export function columnsFor(count: number, tableW: number, tableH: number, cardW: number, cardH: number): number {
  if (count <= 1) return 1
  let best = { cols: count, score: Infinity }
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows)
    if (Math.ceil(count / cols) !== rows) continue
    const sx = cols > 1 ? tableW / (cols - 1) : Infinity
    const sy = rows > 1 ? tableH / (rows - 1) : Infinity
    const buried = Math.max(0, cardW * 0.9 - sx) / cardW + Math.max(0, cardH * 0.62 - sy) / cardH
    const jammed = Math.max(0, cardW * 1.05 - sx) / cardW
    const gx = Number.isFinite(sx) ? sx / cardW : null
    const gy = Number.isFinite(sy) ? sy / cardH : null
    const uneven = gx !== null && gy !== null ? Math.abs(gx - gy) : 0.6
    const score = buried * 10 + jammed * 2 + uneven
    if (score < best.score) best = { cols, score }
  }
  return best.cols
}
