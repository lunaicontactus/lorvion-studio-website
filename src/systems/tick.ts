/**
 * The single animation clock for the whole site.
 *
 * Every moving thing — characters, dokka fire, scene transitions — subscribes
 * here instead of opening its own requestAnimationFrame. One loop keeps the
 * cost predictable as the cast grows, and it means "pause everything" is one
 * decision in one place rather than a rule each feature has to remember.
 */

export interface TickInfo {
  /** Milliseconds since the previous frame, clamped so a backgrounded tab
   *  cannot resume with one enormous jump. Already scaled by `timeScale`. */
  readonly delta: number
  /** Monotonic scaled time since the loop first ran, in ms. */
  readonly elapsed: number
  /** Raw performance.now() of this frame, for absolute scheduling. */
  readonly now: number
}

export type TickListener = (info: TickInfo) => void

interface Subscriber {
  fn: TickListener
  priority: number
  id: number
}

/** A long frame (alt-tab, sleeping laptop) is clamped to this. */
const MAX_DELTA = 64

export class Ticker {
  #subs: Subscriber[] = []
  #raf: number | null = null
  /** null until the first frame. 0 is a legitimate timestamp, so it cannot
   *  double as the sentinel. */
  #lastNow: number | null = null
  #elapsed = 0
  #nextId = 1
  #timeScale = 1
  #paused = false
  /** Set while iterating so a listener can safely unsubscribe itself. */
  #dirty = false

  get running(): boolean {
    return this.#raf !== null
  }

  get elapsed(): number {
    return this.#elapsed
  }

  get timeScale(): number {
    return this.#timeScale
  }

  /** QA/dev affordance: slow the world down or speed it up. */
  setTimeScale(scale: number): void {
    this.#timeScale = Math.max(0, Math.min(8, scale))
  }

  /**
   * Register a listener. Lower priority runs first, so world simulation can
   * settle before anything that reads its result paints.
   * Returns an unsubscribe function — always call it on teardown.
   */
  subscribe(fn: TickListener, priority = 0): () => void {
    const sub: Subscriber = { fn, priority, id: this.#nextId++ }
    this.#subs.push(sub)
    this.#subs.sort((a, b) => a.priority - b.priority || a.id - b.id)
    this.#start()
    return () => {
      const i = this.#subs.indexOf(sub)
      if (i >= 0) {
        this.#subs.splice(i, 1)
        this.#dirty = true
      }
      if (this.#subs.length === 0) this.stop()
    }
  }

  /** Pause without losing subscribers (used by the visibility gate). */
  pause(): void {
    this.#paused = true
    this.stop()
  }

  resume(): void {
    if (!this.#paused) return
    this.#paused = false
    this.#start()
  }

  stop(): void {
    if (this.#raf !== null) {
      cancelAnimationFrame(this.#raf)
      this.#raf = null
    }
  }

  /** Drive one frame by hand. Tests use this; so does a synchronous first paint. */
  step(now: number): void {
    const raw = this.#lastNow === null ? 16 : now - this.#lastNow
    this.#lastNow = now
    const delta = Math.min(MAX_DELTA, Math.max(0, raw)) * this.#timeScale
    this.#elapsed += delta
    const info: TickInfo = { delta, elapsed: this.#elapsed, now }

    // Iterate a copy: a listener may unsubscribe itself or a sibling.
    const snapshot = this.#subs.slice()
    this.#dirty = false
    for (const sub of snapshot) {
      if (this.#dirty && !this.#subs.includes(sub)) continue
      try {
        sub.fn(info)
      } catch (err) {
        // One broken listener must never take the whole world down with it.
         
        console.error('[tick] listener failed, dropping it', err)
        const i = this.#subs.indexOf(sub)
        if (i >= 0) this.#subs.splice(i, 1)
        this.#dirty = true
      }
    }
  }

  #start(): void {
    if (this.#raf !== null || this.#paused || this.#subs.length === 0) return
    // No rAF means no self-driving loop (a prerender, a test, a very old
    // browser). Subscribers stay registered and step() still drives them.
    if (typeof requestAnimationFrame !== 'function') return
    this.#lastNow = null
    const loop = (now: number): void => {
      this.step(now)
      this.#raf = this.#subs.length > 0 ? requestAnimationFrame(loop) : null
    }
    this.#raf = requestAnimationFrame(loop)
  }
}

export const ticker = new Ticker()

/** Stop the clock whenever the tab is hidden; resume when it returns. */
export function installVisibilityGate(doc: Document = document): () => void {
  const onChange = (): void => {
    if (doc.hidden) ticker.pause()
    else ticker.resume()
  }
  doc.addEventListener('visibilitychange', onChange)
  onChange()
  return () => doc.removeEventListener('visibilitychange', onChange)
}
