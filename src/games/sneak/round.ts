/**
 * 요미의 과자 몰래 먹기 — the rules, with no drawing in them (WORLD 2.1).
 *
 * Everyone is at work. YOMI, in the front row, holds the button to eat a
 * snack on the sly; every bite scores, and a run of bites scores more. But
 * every bite is also noise, and POKO, at the desk at the back with its back
 * to them all, is listening.
 *
 *   WORK     POKO works. The quieter the room, the longer it stays that way.
 *   NOTICE   POKO's head comes up. The warning — let go now. Sometimes it is
 *            nothing and POKO goes back to work; sometimes it turns.
 *   TURN     POKO spins round. A moment's grace, then it is looking.
 *   WATCH    POKO stares at them all. Eating now is being caught.
 *   RECOVER  POKO turns back to its desk.
 *
 * Caught costs a heart and the room calms down; three hearts and the round
 * is over. Noise is the whole game: it rises while YOMI eats and fades while
 * YOMI works, and the louder it is the sooner and the quicker POKO reacts —
 * a greedy run of bites is worth more and is exactly what gets noticed.
 */
export type PokoState = 'WORK' | 'NOTICE' | 'TURN' | 'WATCH' | 'RECOVER'

export interface SneakEvent {
  readonly kind: 'bite' | 'notice' | 'turn' | 'watch' | 'relax' | 'fakeout' | 'caught' | 'out'
}

export interface SneakOptions {
  readonly random?: () => number
  readonly hearts?: number
}

/** The timings, in seconds; kept here so tests and tuning read the same numbers. */
export const TIMING = {
  work: [1.6, 4.2] as const,
  notice: [0.75, 1.1] as const,
  noticeLoud: 0.42,
  turn: 0.22,
  grace: 0.12,
  watch: [1.3, 2.5] as const,
  recover: 0.35,
  caughtHold: 1.4,
  bite: 0.42,
} as const

/** Noise, 0–100: up while eating, down while not. */
export const NOISE = { eat: 38, fade: 30, loud: 72 } as const

export class SneakRound {
  readonly #random: () => number
  poko: PokoState = 'WORK'
  /** Seconds left in POKO's current state. */
  #left: number
  eating = false
  noise = 0
  score = 0
  hearts: number
  /** Unbroken seconds of eating, for the run bonus. */
  run = 0
  bites = 0
  caught = 0
  /** A moment after being caught when nothing counts and nobody moves. */
  #stunned = 0
  #biteIn = 0
  #fraction = 0

  constructor(opts: SneakOptions = {}) {
    this.#random = opts.random ?? Math.random
    this.hearts = opts.hearts ?? 3
    this.#left = this.#span(TIMING.work)
  }

  get over(): boolean {
    return this.hearts <= 0
  }

  get stunned(): boolean {
    return this.#stunned > 0
  }

  /** The run bonus: ×1, then ×2 after a second and a half, ×3 after three. */
  get multiplier(): number {
    return this.run >= 3 ? 3 : this.run >= 1.5 ? 2 : 1
  }

  /** POKO can see YOMI right now (a moment into the turn, and while watching). */
  get looking(): boolean {
    return (this.poko === 'TURN' && this.#left < TIMING.turn - TIMING.grace) || this.poko === 'WATCH'
  }

  setEating(on: boolean): void {
    if (this.over) on = false
    if (this.#stunned > 0) on = false
    if (on && !this.eating) this.#biteIn = 0
    this.eating = on
    if (!on) this.run = 0
  }

  /** Advance `dt` seconds. Returns what happened, in order. */
  step(dt: number): SneakEvent[] {
    const out: SneakEvent[] = []
    if (this.over) return out
    if (this.#stunned > 0) {
      this.#stunned -= dt
      this.noise = Math.max(0, this.noise - NOISE.fade * 2 * dt)
      if (this.#stunned <= 0) {
        this.#stunned = 0
        this.poko = 'RECOVER'
        this.#left = TIMING.recover
      }
      return out
    }
    // YOMI.
    if (this.eating) {
      this.run += dt
      this.noise = Math.min(100, this.noise + NOISE.eat * dt * (this.run > 3 ? 1.35 : 1))
      // Ten points a second, times the run.
      this.#fraction += 10 * this.multiplier * dt
      const whole = Math.floor(this.#fraction)
      this.#fraction -= whole
      this.score += whole
      this.#biteIn -= dt
      if (this.#biteIn <= 0) {
        this.#biteIn = TIMING.bite
        this.bites += 1
        out.push({ kind: 'bite' })
      }
    } else {
      this.noise = Math.max(0, this.noise - NOISE.fade * dt)
    }
    // POKO.
    const loud = this.noise >= NOISE.loud
    // A loud room brings POKO's head up sooner.
    this.#left -= this.poko === 'WORK' ? dt * (1 + this.noise / 45) : dt
    if (this.#left <= 0) {
      switch (this.poko) {
        case 'WORK':
          this.poko = 'NOTICE'
          this.#left = loud ? TIMING.noticeLoud : this.#span(TIMING.notice)
          out.push({ kind: 'notice' })
          break
        case 'NOTICE':
          // A quiet room, sometimes, is just a quiet room.
          if (this.noise < 40 && this.#random() < 0.3) {
            this.poko = 'WORK'
            this.#left = this.#span(TIMING.work)
            out.push({ kind: 'fakeout' })
          } else {
            this.poko = 'TURN'
            this.#left = TIMING.turn
            out.push({ kind: 'turn' })
          }
          break
        case 'TURN':
          this.poko = 'WATCH'
          this.#left = this.#span(TIMING.watch)
          out.push({ kind: 'watch' })
          break
        case 'WATCH':
          this.poko = 'RECOVER'
          this.#left = TIMING.recover
          break
        case 'RECOVER':
          this.poko = 'WORK'
          this.#left = this.#span(TIMING.work)
          out.push({ kind: 'relax' })
          break
      }
    }
    // Seen with a mouthful.
    if (this.eating && this.looking) {
      this.hearts -= 1
      this.caught += 1
      this.eating = false
      this.run = 0
      this.#stunned = TIMING.caughtHold
      this.poko = 'WATCH'
      out.push({ kind: 'caught' })
      if (this.hearts <= 0) out.push({ kind: 'out' })
    }
    return out
  }

  #span([a, b]: readonly [number, number]): number {
    return a + (b - a) * this.#random()
  }
}

/**
 * Stars for a round: a patient one, a good one, a daring one. Measured on
 * simulated play over 40 seeds: letting go the moment POKO's head comes up
 * scores 210–255; a well-timed player who reads the false alarms reaches
 * 270; one who keeps eating into the turn is caught three times and rarely
 * passes 150.
 */
export function starsFor(score: number): number {
  return score >= 270 ? 3 : score >= 200 ? 2 : score >= 100 ? 1 : 0
}
