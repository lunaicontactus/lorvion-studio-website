/**
 * The round clock, shared by every mini-game.
 *
 * It owns no timer. Nothing here calls `setInterval`, `setTimeout` or
 * `requestAnimationFrame`; it is handed milliseconds and subtracts them. That
 * is the whole design, and it is the design because of the bug it makes
 * impossible: a game that starts an interval on `start` and another on
 * `resume` runs its clock twice as fast, and the second one keeps running
 * after the first is cleared. A clock that cannot start anything cannot leak
 * one.
 *
 * Everything else follows from the same fact. It does not tick while paused
 * because nobody steps it while paused. It does not tick in a hidden tab
 * because the room's ticker stops there (src/systems/tick.ts). It stops at
 * the end of the round because it clamps at zero and says so.
 */
export class RoundClock {
  #total: number
  #left: number
  #running = false

  constructor(seconds: number) {
    this.#total = Math.max(0, seconds) * 1000
    this.#left = this.#total
  }

  /** Seconds on the clock, never below zero. */
  get left(): number {
    return this.#left / 1000
  }

  /** Seconds gone. */
  get elapsed(): number {
    return (this.#total - this.#left) / 1000
  }

  get running(): boolean {
    return this.#running
  }

  /** The round is over. Stays true until a reset. */
  get done(): boolean {
    return this.#left <= 0
  }

  start(): void {
    this.#running = true
  }

  pause(): void {
    this.#running = false
  }

  resume(): void {
    if (!this.done) this.#running = true
  }

  /** A fresh round. The only way back from `done`. */
  reset(seconds = this.#total / 1000): void {
    this.#total = Math.max(0, seconds) * 1000
    this.#left = this.#total
    this.#running = false
  }

  /**
   * Take a penalty off the clock, for a game whose cost of getting something
   * wrong is time. Never below zero, and never a way to end the round: the
   * round ends in `step`, once, and nowhere else.
   */
  take(ms: number): void {
    if (!this.#running) return
    this.#left = Math.max(1, this.#left - Math.max(0, ms))
  }

  /**
   * Take `dt` milliseconds off the clock, and say whether that ended the
   * round. Returns true exactly once per round: on the step that reached
   * zero, and never again until a reset.
   */
  step(dt: number): boolean {
    if (!this.#running || this.#left <= 0) return false
    // The same cap the room uses. A tab that was away for a minute must not
    // hand a minute to a forty-five second round; and a machine drawing five
    // frames a second plays the round in slow motion rather than skipping
    // through it, which is the honest thing for a game to do.
    this.#left -= Math.min(Math.max(dt, 0), 64)
    if (this.#left > 0) return false
    this.#left = 0
    this.#running = false
    return true
  }
}
