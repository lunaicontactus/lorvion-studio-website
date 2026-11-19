/**
 * 김로드의 버그 잡기 — the rules, with no pictures (EUNGARAGE 2.0, PART 14.3).
 *
 * Nine little screens. Bugs pop up on them for a moment; catch a bug and it
 * is 10, more for a streak. Working code pops up too, and NUNU's own build
 * badge — press either and it is a mistake: points off and the streak gone.
 * Faster towards the end of the round.
 *
 * Pure: time in seconds, a seed in, the same round out.
 */
export const CELLS = 9

export type Kind = 'bug' | 'code' | 'build'

export interface Pop {
  readonly id: number
  readonly cell: number
  readonly kind: Kind
  /** Seconds left on screen. */
  left: number
}

export type BugEvent =
  | { readonly kind: 'squash'; readonly cell: number; readonly points: number; readonly streak: number }
  | { readonly kind: 'oops'; readonly cell: number; readonly what: Kind; readonly points: number }
  | { readonly kind: 'escape'; readonly cell: number }
  | { readonly kind: 'empty'; readonly cell: number }

export function starsFor(score: number): number {
  return score >= 400 ? 3 : score >= 220 ? 2 : score >= 90 ? 1 : 0
}

export class BugRound {
  readonly #random: () => number
  score = 0
  streak = 0
  squashed = 0
  mistakes = 0
  escaped = 0
  pops: Pop[] = []
  #t = 0
  #next = 0.5
  #id = 0
  readonly #length: number

  constructor(opts: { random?: () => number; seconds?: number } = {}) {
    this.#random = opts.random ?? Math.random
    this.#length = opts.seconds ?? 45
  }

  /** 1 at the start, up to 1.8 by the end. */
  get pace(): number {
    return 1 + Math.min(this.#t / this.#length, 1) * 0.8
  }

  step(s: number): BugEvent[] {
    const out: BugEvent[] = []
    this.#t += s
    for (const p of this.pops) p.left -= s
    for (const p of this.pops.filter((q) => q.left <= 0 && q.kind === 'bug')) {
      this.escaped += 1
      out.push({ kind: 'escape', cell: p.cell })
    }
    this.pops = this.pops.filter((p) => p.left > 0)
    this.#next -= s
    while (this.#next <= 0) {
      const free = Array.from({ length: CELLS }, (_, i) => i).filter((i) => !this.pops.some((p) => p.cell === i))
      if (free.length > 0) {
        const cell = free[Math.floor(this.#random() * free.length)]!
        const r = this.#random()
        const kind: Kind = r < 0.68 ? 'bug' : r < 0.9 ? 'code' : 'build'
        this.pops.push({ id: ++this.#id, cell, kind, left: (1.5 - this.#random() * 0.4) / this.pace })
      }
      this.#next += (0.62 - this.#random() * 0.2) / this.pace
    }
    return out
  }

  /** A press on a cell. */
  hit(cell: number): BugEvent {
    const p = this.pops.find((q) => q.cell === cell)
    if (!p) return { kind: 'empty', cell }
    this.pops = this.pops.filter((q) => q !== p)
    if (p.kind === 'bug') {
      this.streak += 1
      this.squashed += 1
      const points = 10 + Math.min(this.streak - 1, 5) * 2
      this.score += points
      return { kind: 'squash', cell, points, streak: this.streak }
    }
    this.streak = 0
    this.mistakes += 1
    const points = p.kind === 'build' ? -25 : -15
    this.score = Math.max(0, this.score + points)
    return { kind: 'oops', cell, what: p.kind, points }
  }
}
