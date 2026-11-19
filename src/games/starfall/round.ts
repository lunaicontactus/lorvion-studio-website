/**
 * 별똥별 받기 — the rules, with no pictures (EUNGARAGE 2.0, PART 14.2).
 *
 * Stars fall; the catcher walks left and right along the floor and catches
 * them. A plain star is 10, a pink wish-star 50. Nothing is lost by missing
 * one — it is a round against the clock, not against lives — but the fall
 * gets quicker and the stars come thicker as the minute goes on.
 *
 * Units are the pixel screen's (240 × 160). Pure: a seed in, the same round out.
 */
export const FIELD = { w: 240, h: 160, floor: 148 } as const
export const CATCHER = { halfWidth: 13, reach: 22, speed: 120 } as const

export interface FallingStar {
  readonly id: number
  x: number
  y: number
  readonly vy: number
  readonly wish: boolean
}

export type StarfallEvent =
  | { readonly kind: 'catch'; readonly x: number; readonly y: number; readonly points: number; readonly wish: boolean }
  | { readonly kind: 'miss'; readonly x: number }

export function starsFor(score: number): number {
  return score >= 600 ? 3 : score >= 350 ? 2 : score >= 150 ? 1 : 0
}

export class StarfallRound {
  readonly #random: () => number
  x: number = FIELD.w / 2
  /** -1, 0 or 1. */
  facing = 1
  vx = 0
  score = 0
  caught = 0
  wishes = 0
  missed = 0
  stars: FallingStar[] = []
  #t = 0
  #next = 0.4
  #id = 0
  #left = false
  #right = false
  /** Pointer target, when the player steers by finger or mouse. */
  #goal: number | null = null

  constructor(opts: { random?: () => number } = {}) {
    this.#random = opts.random ?? Math.random
  }

  control(name: string, down: boolean): void {
    if (name === 'left') this.#left = down
    if (name === 'right') this.#right = down
    if (down) this.#goal = null
  }

  /** Walk towards a point on the floor (a finger, a mouse). */
  aim(x: number | null): void {
    this.#goal = x === null ? null : Math.max(CATCHER.halfWidth, Math.min(FIELD.w - CATCHER.halfWidth, x))
  }

  /** How fast things fall and how often, by how far into the round we are. */
  get pace(): number {
    return 1 + Math.min(this.#t / 60, 1) * 0.9
  }

  step(s: number): StarfallEvent[] {
    const out: StarfallEvent[] = []
    this.#t += s
    // Steering: keys win; otherwise walk to the pointer.
    let dir = (this.#right ? 1 : 0) - (this.#left ? 1 : 0)
    if (dir === 0 && this.#goal !== null) {
      const d = this.#goal - this.x
      dir = Math.abs(d) < 2 ? 0 : Math.sign(d)
    }
    this.vx = dir * CATCHER.speed
    if (dir !== 0) this.facing = dir
    this.x = Math.max(CATCHER.halfWidth, Math.min(FIELD.w - CATCHER.halfWidth, this.x + this.vx * s))
    // New stars.
    this.#next -= s
    while (this.#next <= 0) {
      const wish = this.#random() < 0.1
      this.stars.push({
        id: ++this.#id,
        x: 10 + this.#random() * (FIELD.w - 20),
        y: -6,
        vy: (34 + this.#random() * 26) * this.pace * (wish ? 1.25 : 1),
        wish,
      })
      this.#next += (0.85 - this.#random() * 0.3) / this.pace
    }
    // Fall, catch, miss.
    const keep: FallingStar[] = []
    for (const st of this.stars) {
      st.y += st.vy * s
      const atHands = st.y >= FIELD.floor - CATCHER.reach && st.y <= FIELD.floor - 4
      if (atHands && Math.abs(st.x - this.x) <= CATCHER.halfWidth + 3) {
        const points = st.wish ? 50 : 10
        this.score += points
        this.caught += 1
        if (st.wish) this.wishes += 1
        out.push({ kind: 'catch', x: st.x, y: st.y, points, wish: st.wish })
        continue
      }
      if (st.y > FIELD.floor + 4) {
        this.missed += 1
        out.push({ kind: 'miss', x: st.x })
        continue
      }
      keep.push(st)
    }
    this.stars = keep
    return out
  }
}
