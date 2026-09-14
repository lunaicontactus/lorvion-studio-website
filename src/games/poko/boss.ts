/**
 * When the boss looks round.
 *
 * The whole game is fair or unfair on the strength of this one machine, so it
 * is pure timing with no DOM in it and it can be argued with to the
 * millisecond. It is the timing from the older game (src/games/build/boss.ts)
 * with the states the brief names, because that timing was already the
 * careful part: the rules it keeps are the ones worth keeping.
 *
 *   - Nobody is ever caught without a warning. WATCHING is only ever reached
 *     through WARNING, and a WARNING is never shorter than `WARN_FLOOR` —
 *     which is four times a human reaction and does not move with difficulty.
 *   - No double look, no fake warning, no instant turn. Those might be fun
 *     later; in a first version they are only unfair.
 *   - What difficulty changes is how long the quiet stretches are and how
 *     much they vary — never the warning.
 *
 * The five states are one loop:
 *
 *   PATROLLING or AWAY  →  WARNING  →  WATCHING  →  RECOVER  →  back round
 *
 * PATROLLING is the boss walking the back of the room with its back to the
 * workers. AWAY is the boss at the far end, out of the picture — the long
 * window, and the one worth taking a risk in. WARNING is the boss stopping
 * and straightening its glasses. WATCHING is the boss looking, and the only
 * state in which anything is judged. RECOVER is it turning back.
 */
export type BossState = 'PATROLLING' | 'AWAY' | 'WARNING' | 'WATCHING' | 'RECOVER'

/**
 * The warning the player is owed, whatever else changes, in milliseconds.
 *
 * A second is four times a comfortable reaction and it is a floor, not a
 * target: the first warnings of a round are nearly twice this. Difficulty may
 * take the quiet stretches down; it may not touch this number.
 */
export const WARN_FLOOR = 1000

export interface BossOptions {
  /** Seeded from the game, so a patrol can be replayed exactly. */
  readonly random?: () => number
  /** Seconds in the round. The quiet stretches tighten across it. */
  readonly seconds?: number
}

/** Everything about the boss, for the game to draw and judge against. */
export interface BossLook {
  readonly state: BossState
  /** How far along the back wall it is, 0 to 1. */
  readonly at: number
  /** Which way it is walking: 1 right, -1 left, 0 stopped. */
  readonly facing: number
  /** How far through the current state, 0 to 1. For the warning bar. */
  readonly through: number
}

const SPAN = {
  /** Walking the back of the room, back turned. */
  patrol: [2600, 4200],
  /** Right out of the picture. The window worth taking. */
  away: [2200, 3800],
  /** Stopped, glasses being straightened. Never below the floor. */
  warn: [1900, 1200],
  /** Looking. Long enough to be a real hold, short enough not to be a wall. */
  watch: [1500, 2100],
  /** Turning back to the wall. */
  recover: [520, 820],
} as const

export class PokoBoss {
  #state: BossState = 'PATROLLING'
  #left: number
  #span: number
  #elapsed = 0
  #looks = 0
  #at = 0.18
  #facing = 1
  readonly #rng: () => number
  readonly #round: number

  constructor(opts: BossOptions = {}) {
    this.#rng = opts.random ?? Math.random
    this.#round = (opts.seconds ?? 45) * 1000
    this.#span = this.#quiet()
    this.#left = this.#span
  }

  get state(): BossState {
    return this.#state
  }

  /** The only state in which anything is judged. */
  get watching(): boolean {
    return this.#state === 'WATCHING'
  }

  /** About to look. Not yet dangerous, and the whole point of the game. */
  get warning(): boolean {
    return this.#state === 'WARNING'
  }

  /** Milliseconds left in the state it is in. */
  get left(): number {
    return this.#left
  }

  /** How many times it has looked round. */
  get looks(): number {
    return this.#looks
  }

  get look(): BossLook {
    return {
      state: this.#state,
      at: this.#at,
      facing: this.#facing,
      through: this.#span > 0 ? 1 - Math.max(0, this.#left) / this.#span : 1,
    }
  }

  /** How far through the round, 0 to 1. Difficulty is a function of this. */
  get progress(): number {
    return Math.min(1, this.#elapsed / Math.max(1, this.#round))
  }

  /**
   * A quiet stretch, shorter and more variable as the round goes on.
   *
   * The variation is what stops the round being a sequence to memorise: by
   * the end the same state can be half again as long as its neighbour, so
   * counting does not work and watching does.
   */
  #quiet(): number {
    const t = this.progress
    const [lo, hi] = this.#state === 'AWAY' ? SPAN.away : SPAN.patrol
    const base = lo + (hi - lo) * this.#rng()
    const tighten = 1 - 0.32 * t
    const spread = 1 + (this.#rng() - 0.5) * 0.5 * t
    return Math.max(1400, base * tighten * spread)
  }

  /** The warning, which shortens a little and stops at the floor. */
  #warn(): number {
    const [start, end] = SPAN.warn
    return Math.max(WARN_FLOOR, start + (end - start) * this.progress)
  }

  #watch(): number {
    const [lo, hi] = SPAN.watch
    return lo + (hi - lo) * this.#rng()
  }

  step(dt: number): void {
    this.#elapsed += dt
    this.#left -= dt
    // Walking happens in the two states where it is walking, at a pace that
    // crosses the back of the room in about eight seconds.
    if (this.#state === 'PATROLLING') {
      this.#at += (this.#facing * dt) / 8000
      if (this.#at > 0.92) {
        this.#at = 0.92
        this.#facing = -1
      }
      if (this.#at < 0.08) {
        this.#at = 0.08
        this.#facing = 1
      }
    }
    while (this.#left <= 0) {
      switch (this.#state) {
        case 'PATROLLING':
        case 'AWAY':
          this.#state = 'WARNING'
          this.#facing = 0
          this.#span = this.#warn()
          break
        case 'WARNING':
          this.#state = 'WATCHING'
          this.#looks += 1
          this.#span = this.#watch()
          break
        case 'WATCHING':
          this.#state = 'RECOVER'
          this.#span = SPAN.recover[0] + (SPAN.recover[1] - SPAN.recover[0]) * this.#rng()
          break
        case 'RECOVER':
          // Back to work. Sometimes it goes right out of the picture, which
          // is the long window and the one worth taking a risk in.
          this.#state = this.#rng() < 0.34 ? 'AWAY' : 'PATROLLING'
          this.#facing = this.#at > 0.5 ? -1 : 1
          this.#span = this.#quiet()
          break
      }
      this.#left += this.#span
    }
  }
}
