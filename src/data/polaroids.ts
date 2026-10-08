/**
 * The polaroids on the secret storage's table (WORLD 2.1; SITE UPGRADE PHASE G).
 *
 * The secret storage is the crew's own box behind the garage, so the table
 * holds only what the PUBLIC ARCHIVE (/archive.html, src/data/publicArchive.ts)
 * does not: a design given up, a try that taught something, the working sheets
 * nobody was meant to see. Never the works' own pictures, never the archive's
 * (test/archive-g.test.ts) — before PHASE G every photo here was also on a
 * public page.
 *
 * To add one:
 *   1. put the image in `public/assets/images/archive/secret/` (webp or jpg,
 *      any shape — the frame crops to a square, like a real polaroid), or
 *      add its source to scripts/archive_images.py;
 *   2. add an entry to `ADDED` below. Only `id` and `src` are required.
 *
 * The rest is optional and simply left off the card when it is missing: no
 * title means the photo alone, no date means no date line. An empty list is
 * fine too — the table says the record is still being kept, and that is all.
 */
export type PolaroidCategory = 'draft' | 'try' | 'working'

export interface Polaroid {
  readonly id: string
  /** Path under `public/`, starting with a slash. */
  readonly src: string
  readonly title?: string
  readonly note?: string
  /** As written on the back: `2026.09.16`. */
  readonly date?: string
  readonly category?: PolaroidCategory
}

/**
 * Photos added by hand. Newest first reads best on the table, but any order
 * works. Example:
 *
 *   { id: 'lunai-first-sketch', src: '/assets/images/archive/secret/lunai_first_sketch.webp',
 *     title: 'LUNAI 첫 스케치', date: '2026.03.02', category: 'draft' },
 */
const ADDED: readonly Polaroid[] = []

const S = '/assets/images/archive/secret'

/** From the crew's rebuild (assets/crew-reboot, its GENERATION_LOG and NECK_COMPRESSION). */
const KEPT: readonly Polaroid[] = [
  { id: 'momo-redesign', src: `${S}/momo-redesign-thumb.webp`, category: 'draft', date: '2026.09.12',
    title: '다시 그리다 그만둔 모모', note: '머리를 줄였더니 귀가 같이 작아지고 털이 매끈해졌다. 원래 그림을 지키기로 했다.' },
  { id: 'momo-shortpile', src: `${S}/momo-shortpile-thumb.webp`, category: 'try', date: '2026.09.13',
    title: '짧은 털 시험', note: '긴 털은 입체로 옮기면 조각조각 떠다녔다. 이 시험 뒤로 다섯 모두 짧고 촘촘한 털.' },
  { id: 'momo-ring-views', src: `${S}/momo-ring-views-thumb.webp`, category: 'working', date: '2026.09.13',
    title: '턱 밑 링, 네 방향', note: '위가 그때, 아래가 링을 뗀 뒤.' },
  { id: 'crew-scale-130', src: `${S}/crew-scale-130-thumb.webp`, category: 'working', date: '2026.09.13',
    title: '차고 크기에서 목 숨기기', note: '차고에 서는 키에서는 목이 길어 보였다. 머리를 몸 쪽으로 내렸다.' },
  { id: 'room-before-after', src: `${S}/room-before-after-thumb.webp`, category: 'working', date: '2026.09.13',
    title: '차고에 세워 본 전과 후', note: '위가 전, 아래가 후. 목을 숨기고 요미의 없던 꼬리를 지웠다.' },
]

export const POLAROIDS: readonly Polaroid[] = [...ADDED, ...KEPT]

/** The full-size picture for a card, where there is one beside the thumb. */
export function fullOf(p: Polaroid): string {
  return p.src.replace(/-thumb\.webp$/, '-full.webp')
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
