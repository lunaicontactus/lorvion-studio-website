/**
 * Reduced motion, read live rather than once.
 *
 * A visitor can turn the OS setting on mid-session; the old site sampled it at
 * load and never looked again, which meant the preference silently failed for
 * anyone who changed it while reading.
 */

export type MotionListener = (reduced: boolean) => void

const QUERY = '(prefers-reduced-motion: reduce)'

export class MotionPreference {
  #mq: MediaQueryList | null
  #listeners = new Set<MotionListener>()

  constructor(mq: MediaQueryList | null = safeMatch(QUERY)) {
    this.#mq = mq
    this.#mq?.addEventListener('change', this.#onChange)
  }

  get reduced(): boolean {
    return this.#mq?.matches ?? false
  }

  subscribe(fn: MotionListener): () => void {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  destroy(): void {
    this.#mq?.removeEventListener('change', this.#onChange)
    this.#listeners.clear()
  }

  #onChange = (): void => {
    for (const l of this.#listeners) l(this.reduced)
  }
}

function safeMatch(q: string): MediaQueryList | null {
  try {
    return globalThis.matchMedia?.(q) ?? null
  } catch {
    return null
  }
}

export const motion = new MotionPreference()

/** Scale a duration to zero when the visitor asked for less movement. */
export function motionDuration(ms: number, reduced = motion.reduced): number {
  return reduced ? 0 : ms
}
