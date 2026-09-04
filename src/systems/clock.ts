/**
 * World time. Drives the day/night dressing from STEP 9 onward.
 *
 * Phases follow the visitor's own clock so the workshop feels like it shares a
 * timezone with them. `?t=` forces a phase for QA without touching the machine.
 */

export type DayPhase = 'morning' | 'day' | 'evening' | 'night' | 'lateNight'

export const DAY_PHASES: readonly DayPhase[] = [
  'morning',
  'day',
  'evening',
  'night',
  'lateNight',
] as const

/** Local hour (0-23) to phase. */
export function phaseForHour(hour: number): DayPhase {
  const h = ((Math.trunc(hour) % 24) + 24) % 24
  if (h < 5) return 'lateNight'
  if (h < 10) return 'morning'
  if (h < 17) return 'day'
  if (h < 20) return 'evening'
  if (h < 24) return 'night'
  return 'night'
}

/** Match a phase name ignoring case, so ?t=latenight and ?t=lateNight both
 *  work — the only multi-word phase would otherwise be unreachable. */
function matchPhase(v: string): DayPhase | null {
  const needle = v.toLowerCase()
  return DAY_PHASES.find((p) => p.toLowerCase() === needle) ?? null
}

/**
 * Resolve the phase, honouring an override.
 * `?t=night` pins a phase; `?t=23` pins an hour.
 */
export function resolvePhase(search = '', now: Date = new Date()): DayPhase {
  let raw: string | null = null
  try {
    raw = new URLSearchParams(search).get('t')
  } catch {
    raw = null
  }
  if (raw) {
    const v = raw.trim()
    const named = matchPhase(v)
    if (named) return named
    const asHour = Number(v)
    if (Number.isFinite(asHour)) return phaseForHour(asHour)
  }
  return phaseForHour(now.getHours())
}

export class WorldClock {
  #phase: DayPhase
  #listeners = new Set<(p: DayPhase) => void>()
  #timer: ReturnType<typeof setInterval> | null = null
  readonly #search: string

  constructor(search = typeof location === 'undefined' ? '' : location.search) {
    this.#search = search
    this.#phase = resolvePhase(search)
  }

  get phase(): DayPhase {
    return this.#phase
  }

  /** Re-check every minute; a visitor can sit through a phase boundary. */
  start(intervalMs = 60_000): void {
    if (this.#timer !== null) return
    this.#timer = setInterval(() => this.refresh(), intervalMs)
  }

  stop(): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer)
      this.#timer = null
    }
  }

  refresh(now: Date = new Date()): void {
    const next = resolvePhase(this.#search, now)
    if (next === this.#phase) return
    this.#phase = next
    for (const l of this.#listeners) l(next)
  }

  subscribe(fn: (p: DayPhase) => void): () => void {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }
}

export const clock = new WorldClock()
