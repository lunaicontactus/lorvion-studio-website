/**
 * Footsteps (PHASE 6).
 *
 * One sound, played once per stride, and never as a drum roll: with two of
 * them walking at once the room's clock only lets a step through every so
 * often, so two walkers make a little more sound than one and five would
 * make no more than two. Off-screen feet are silent — a step you cannot see
 * is a click from nowhere.
 *
 * No clock of its own; the room turns it.
 */
export interface FootstepsOptions {
  readonly play: (volume: number) => void
  /** Least time between any two steps in the room, in ms. */
  readonly gap?: number
  readonly volume?: number
}

export class Footsteps {
  #play: (volume: number) => void
  #gap: number
  #volume: number
  #clock = 0
  #last = -Infinity
  #count = 0

  constructor(opts: FootstepsOptions) {
    this.#play = opts.play
    this.#gap = opts.gap ?? 260
    this.#volume = opts.volume ?? 0.12
  }

  step(dt: number): void {
    this.#clock += dt
  }

  /** How many have actually sounded. For tests. */
  get played(): number {
    return this.#count
  }

  /**
   * A foot came down. Sounds if the walker is in view and the room has had
   * a moment's quiet since the last one. Left and right feet differ by a
   * hair, and no more than that: a random volume is a limp.
   */
  stride(onscreen: boolean): boolean {
    if (!onscreen) return false
    if (this.#clock - this.#last < this.#gap) return false
    this.#last = this.#clock
    this.#count += 1
    this.#play(this.#count % 2 ? this.#volume : this.#volume * 0.85)
    return true
  }
}
