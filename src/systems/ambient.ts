/**
 * The room's small movements.
 *
 * A garage where nothing moves is a photograph, and one where everything moves
 * is a slot machine. So events are scheduled rather than looped, they run one
 * at a time, and each is quiet enough that a visitor notices it only if they
 * happen to be looking that way.
 *
 * The rule that matters is attention. A dokkaebi walking across the floor is
 * the thing worth watching; a flicker on the television is not, and must never
 * pull the eye off it. So the manager holds a priority floor: while something
 * more important is happening, anything below it stays off. Nothing here fires
 * on a timer of its own — it all rides the room's ticker, so a hidden tab is
 * a still room and nothing piles up.
 */
import { ticker } from '@/systems/tick'
import { motion } from '@/systems/motion'

/**
 * How many things worth looking at may move at once.
 *
 * Two. A third one does not make the room livelier, it makes it hard to
 * follow: the eye has nowhere to settle and the whole thing reads as a
 * screensaver. Background flickers are allowed one more than this between
 * them, because they are not things anybody looks at.
 */
export const STRONG_AT_ONCE = 2

/** Bigger interrupts smaller. Kept as numbers so a caller can compare. */
export const ATTENTION = {
  /** The visitor is doing something. */
  interaction: 40,
  /** Somebody is walking. */
  crew: 30,
  /** A thing in the room. */
  object: 20,
  /** Outside the window. */
  background: 10,
} as const

export interface AmbientEvent {
  readonly id: string
  /** Milliseconds between firings; a fresh gap is drawn inside this range. */
  readonly every: { readonly min: number; readonly max: number }
  /** How long one firing lasts. */
  readonly duration: number
  readonly priority: number
  /** Do the thing. Returning nothing is fine; the manager handles timing. */
  readonly run: (on: boolean) => void
  /** Skipped entirely when the visitor has asked for less motion. */
  readonly restless?: boolean
  /**
   * Earliest this may fire, in ms after the room opens. Arriving to a
   * shooting star reads as a title card rather than as a room that happens to
   * be alive, so the rare things wait out the first minute.
   */
  readonly notBefore?: number
}

interface Scheduled {
  event: AmbientEvent
  next: number
  until: number
  running: boolean
}

export interface AmbientOptions {
  readonly random?: () => number
  /**
   * Everything waits longer between firings. A phone shows a third of the
   * room at a time, so the same number of events per minute lands in a much
   * smaller picture and reads as fidgeting rather than as a room breathing.
   */
  readonly slow?: number
}

export class Ambient {
  #items: Scheduled[] = []
  #off: (() => void) | null = null
  #now = 0
  #floor = 0
  #random: () => number
  #slow: number
  /** The last thing that ran, so it cannot be the next thing that runs. */
  #previous: string | null = null

  constructor(options: AmbientOptions | (() => number) = {}) {
    const opts = typeof options === 'function' ? { random: options } : options
    this.#random = opts.random ?? Math.random
    this.#slow = opts.slow ?? 1
  }

  /** What is running right now, by id. For tests, and for nothing else. */
  get running(): readonly string[] {
    return this.#items.filter((i) => i.running).map((i) => i.event.id)
  }

  /** What is happening that ambience must not compete with. */
  setAttention(level: number): void {
    this.#floor = level
  }

  add(event: AmbientEvent): void {
    if (motion.reduced && event.restless) return
    // Nothing fires in the first seconds, and the rare things wait longer.
    const settle = Math.max(4000 + this.#random() * 6000, event.notBefore ?? 0)
    this.#items.push({ event, next: this.#now + settle, until: 0, running: false })
  }

  start(): void {
    if (this.#off) return
    this.#off = ticker.subscribe((info) => this.step(info.delta), 20)
  }

  /**
   * Advance by `dt` milliseconds. Public because the room drives it from the
   * ticker and a test drives it from a loop, and both want the same thing: a
   * clock this class does not own. Nothing here starts a timer.
   */
  step(dt: number): void {
    this.#now += dt
    for (const item of this.#items) {
      if (item.running) {
        if (this.#now >= item.until) {
          item.running = false
          item.event.run(false)
          item.next = this.#now + this.#gap(item.event)
        }
        continue
      }
      if (this.#now < item.next) continue
      if (item.event.priority < this.#floor) {
        // Something more worth watching is going on. Wait, do not queue up.
        item.next = this.#now + this.#gap(item.event) / 2
        continue
      }
      // Never the same thing twice running. On a quiet room — a phone, where
      // half the events belong to things that are off-screen — the one event
      // that is due keeps being the one that just finished, and a room where
      // the same magnet wobbles over and over is worse than a still one.
      if (item.event.id === this.#previous && this.#items.length > 1) {
        item.next = this.#now + this.#gap(item.event) / 2
        continue
      }
      // Two things at once is a room that is alive; more is a room that is
      // busy. Counted over everything that is worth looking at rather than
      // per priority level, so three small movements cannot add up to a
      // busier room than two big ones. Anything above this one still holds
      // it off.
      const strong = this.#items.filter((o) => o.running && o.event.priority > ATTENTION.background)
      const above = this.#items.some((o) => o.running && o.event.priority > item.event.priority)
      const busy = item.event.priority > ATTENTION.background
        ? strong.length >= STRONG_AT_ONCE
        : this.#items.filter((o) => o.running).length >= STRONG_AT_ONCE + 1
      if (busy || above) {
        item.next = this.#now + 1500
        continue
      }
      item.running = true
      item.until = this.#now + item.event.duration
      this.#previous = item.event.id
      item.event.run(true)
    }
  }

  #gap(e: AmbientEvent): number {
    const { min, max } = e.every
    const span = (motion.reduced ? 3 : 1) * this.#slow
    return (min + this.#random() * (max - min)) * span
  }

  destroy(): void {
    this.#off?.()
    this.#off = null
    for (const item of this.#items) {
      if (item.running) item.event.run(false)
    }
    this.#items = []
  }
}
