/**
 * A round of it, with no pictures.
 *
 * The boss (src/games/poko/boss.ts) says when it is looking; this says what
 * that means. Keeping the two apart and keeping both out of the DOM is what
 * makes the balance measurable: a script can play a thousand rounds of this
 * in a second and report what an honest worker scores against what a chancer
 * does, which is the only way to know whether the game has a decision in it.
 *
 * The contract, and it is the whole game:
 *
 *     boss away    + SLACK  →  points
 *     boss away    + WORK   →  nothing
 *     boss watching + WORK  →  safe
 *     boss watching + SLACK →  caught, and that is the end of it
 *
 * The player's state is a `logical` one. It changes the instant the button is
 * let go, and the drawing catches up when it catches up — because the
 * unfairest thing a game like this can do is catch somebody who let go in
 * time and lost to an animation.
 */
import { PokoBoss, type BossOptions, type BossState } from '@/games/poko/boss'

export type Slacking = 'WORK' | 'SLACK'
export type Verdict = 'PLAYING' | 'CAUGHT' | 'CLEARED'

/**
 * Points for a tenth of a second of not working, before the multiplier.
 * Small, because the multiplier is where the interesting part is.
 */
const PER_TENTH = 0.5

/** What surviving one look is worth on its own. */
const SURVIVED = 1

/**
 * Nerve is rewarded: the longer a stretch of slacking runs, the more each
 * tenth of it is worth, up to this. Reset by working, and by being looked at.
 */
const NERVE_CAP = 2.5
const NERVE_PER_SECOND = 0.22

/** And every look survived after a stretch of slacking raises the floor. */
const COMBO_STEP = 0.2
const COMBO_CAP = 1.5

/** What the stars are worth. Measured, not guessed — see scripts/poko-balance.mjs. */
export const STARS: readonly [number, number, number] = [45, 150, 230]

export function starsFor(score: number): number {
  return STARS.filter((s) => score >= s).length
}

export interface RoundOptions extends BossOptions {
  readonly seconds?: number
}

export class PokoRound {
  readonly boss: PokoBoss
  #score = 0
  #verdict: Verdict = 'PLAYING'
  /** Their state, decided by the input and nothing else. */
  #logical: Slacking = 'WORK'
  /** How long the current stretch of slacking has run. */
  #run = 0
  #combo = 0
  /** Whether they risked anything at all during this look's build-up. */
  #risked = false
  #survived = 0

  constructor(opts: RoundOptions = {}) {
    this.boss = new PokoBoss(opts)
  }

  get score(): number {
    return Math.floor(this.#score)
  }

  get verdict(): Verdict {
    return this.#verdict
  }

  get slacking(): Slacking {
    return this.#logical
  }

  get bossState(): BossState {
    return this.boss.state
  }

  /** Looks survived after actually having risked something. */
  get combo(): number {
    return this.#combo
  }

  get survived(): number {
    return this.#survived
  }

  /** What a tenth of a second of slacking is worth right now. */
  get multiplier(): number {
    const nerve = Math.min(NERVE_CAP, 1 + (this.#run / 1000) * NERVE_PER_SECOND)
    return nerve + Math.min(COMBO_CAP, this.#combo * COMBO_STEP)
  }

  /**
   * Hold, or let go. Instant, and the only thing that decides the state they
   * are judged in.
   */
  setSlacking(on: boolean): void {
    if (this.#verdict !== 'PLAYING') return
    const next: Slacking = on ? 'SLACK' : 'WORK'
    if (next === this.#logical) return
    this.#logical = next
    if (next === 'WORK') this.#run = 0
  }

  /** The round ran out. Nothing else ends it well. */
  clear(): void {
    if (this.#verdict === 'PLAYING') this.#verdict = 'CLEARED'
  }

  step(dt: number): void {
    if (this.#verdict !== 'PLAYING') return
    const was = this.boss.state
    this.boss.step(dt)
    const now = this.boss.state

    if (now === 'WATCHING') {
      if (this.#logical === 'SLACK') {
        // Judged on the logical state, on the same tick the boss is read. A
        // button let go of a frame ago is a button let go of.
        this.#verdict = 'CAUGHT'
        return
      }
      // Being looked at is not a moment to be earning anything.
      this.#run = 0
      return
    }

    // A look that has just ended, having not caught them. `now` cannot be
    // WATCHING here — that branch returned above — so the test is only on
    // what it was.
    if (was === 'WATCHING') {
      this.#survived += 1
      this.#score += SURVIVED
      // Nerve only counts if there was any. Somebody who works through every
      // look is safe and is not building anything.
      this.#combo = this.#risked ? this.#combo + 1 : 0
      this.#risked = false
    }

    if (this.#logical === 'SLACK') {
      this.#run += dt
      this.#risked = true
      this.#score += (dt / 100) * PER_TENTH * this.multiplier
    }
  }
}
