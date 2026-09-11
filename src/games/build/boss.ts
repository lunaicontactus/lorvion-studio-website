/**
 * When the boss looks up.
 *
 * Pure timing, no DOM, so it can be tested to the millisecond. The whole game
 * is fair or unfair on the strength of this one machine, and the rules it
 * keeps are:
 *
 *   - a CHECK is always preceded by a WARN, and a WARN is never shorter than
 *     WARN_MIN. The cycle between checks may shorten as the round goes on;
 *     the warning may not;
 *   - there is no CHECK without a WARN, no double-check, no fake warning.
 *     Those may be fun later; in a first version they are only unfair.
 *
 * A warning is the boss adjusting its glasses and lifting its head. A check
 * is the boss looking at you. Being on the game screen during a check is
 * being caught, and the caller decides that on the same tick it reads
 * `state`, so a switch that landed before the check is honoured and one that
 * landed after it is not.
 */
export type BossState = 'WORK' | 'DOZE' | 'WARN' | 'CHECK'

/** The warning the player is owed, whatever else changes. */
export const WARN_MIN = 1500
export const CHECK_MS = 1800

export interface BossOptions {
  readonly random?: () => number
  /** Seconds in the round; the cycle tightens across it. */
  readonly seconds?: number
}

export class Boss {
  #state: BossState = 'WORK'
  #left = 0
  #elapsed = 0
  #checks = 0
  readonly #rng: () => number
  readonly #round: number

  constructor(opts: BossOptions = {}) {
    this.#rng = opts.random ?? Math.random
    this.#round = (opts.seconds ?? 45) * 1000
    this.#left = this.#quiet()
  }

  get state(): BossState {
    return this.#state
  }

  /** Milliseconds left in the current state. */
  get left(): number {
    return this.#left
  }

  /** How many times it has looked up so far. */
  get checks(): number {
    return this.#checks
  }

  /** How long the next quiet stretch lasts: from about seven seconds at the
   *  start of the round down to about four at the end, never less. */
  #quiet(): number {
    const t = Math.min(1, this.#elapsed / Math.max(1, this.#round))
    const base = 7000 - 3000 * t
    return base * (0.75 + this.#rng() * 0.5)
  }

  step(dt: number): void {
    this.#elapsed += dt
    this.#left -= dt
    while (this.#left <= 0) {
      switch (this.#state) {
        case 'WORK':
        case 'DOZE':
          this.#state = 'WARN'
          this.#left += WARN_MIN
          break
        case 'WARN':
          this.#state = 'CHECK'
          this.#checks += 1
          this.#left += CHECK_MS
          break
        case 'CHECK':
          // Back to it. Sometimes it nods off instead, which looks different
          // and lasts the same: the doze is flavour, not a longer window.
          this.#state = this.#rng() < 0.3 ? 'DOZE' : 'WORK'
          this.#left += this.#quiet()
          break
      }
    }
  }
}
