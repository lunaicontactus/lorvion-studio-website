/**
 * The broom that sweeps on its own (PHASE 6).
 *
 * One of the room's ambient events (src/systems/ambient.ts), not a scheduler
 * of its own: the manager decides when, this decides where and what the
 * broom does once it is going. It is deliberately slow, short and rare — it
 * fades in where it stands, sweeps once, rests, and fades — because a broom
 * that crosses the room at a run is a cartoon, a broom that never stops is a
 * screensaver, and a broom that is the liveliest thing on screen has taken
 * the room from the dokkaebi.
 *
 * Where it sweeps is chosen when it fires, from where the crew are: it takes
 * the stretch of boards with nobody near it and nobody heading there, and
 * never the one in front of whatever the visitor has open. If there is no
 * such stretch it does not come out at all, which is better than coming out
 * through somebody.
 *
 * No DOM in here. The room hands in a `paint` callback and drives `step`
 * from its own ticker, so a test can run the whole sweep in a loop.
 */
import type { BroomZone } from '@/data/ambience'

export type BroomPhase = 'enter' | 'sweep' | 'pause' | 'leave'

/**
 * The routine, in order (WORLD 2.1: calmer). It fades in almost where it
 * stands, gives the boards one slow sweep, rests a moment, and fades out.
 * No shuffle along the floor, no second sweep, nothing that bounces: the
 * broom is the room's small aside, never the thing being watched.
 */
export const PLAN: readonly (readonly [BroomPhase, number])[] = [
  ['enter', 2000],
  ['sweep', 2600],
  ['pause', 1600],
  ['leave', 2200],
]

/** How rarely it comes out: every two and a half to four and a half minutes. */
export const BROOM_EVERY = { min: 150_000, max: 270_000 } as const
/** Not in the first minute of a visit, when the room is still being looked at. */
export const BROOM_NOT_BEFORE = 70_000

/** How long the whole thing takes; the ambient event's duration. */
export const BROOM_MS = PLAN.reduce((a, [, ms]) => a + ms, 0)

/**
 * How far from a stretch somebody may be for the broom still to use it:
 * half a dokkaebi (55) and half a broom (36), and a little. At 130 the desk
 * stretch was inside the clearance of whoever was at the monitor and the
 * right one inside the fridge's, and the broom went a whole visit without
 * finding anywhere to sweep.
 */
const CLEAR = 96

/** How far off the near end it starts and finishes, fading. */
/** Never quite solid: it is a thing in the room's corner of the eye. */
const MAX_OPACITY = 0.9

/** How far it glides in and out, in world units: a step, not a run. */
const OFFSET = 18

export interface BroomState {
  readonly x: number
  readonly y: number
  readonly phase: BroomPhase
  /** 0..1 through the current phase. */
  readonly t: number
  /** 0..1, how much of it is showing. */
  readonly opacity: number
  /** Which way it is going along the boards. */
  readonly dir: 1 | -1
}

export interface BroomOptions {
  readonly zones: readonly BroomZone[]
  readonly random?: () => number
  /** Every frame it is out. */
  readonly paint: (state: BroomState | null) => void
  /** The bristles start moving: play the sweep. Called once per sweep. */
  readonly onSweep?: () => void
}

export interface Body {
  readonly x: number
  readonly y: number
  /** Where it is walking to, if anywhere. */
  readonly headingX?: number | null
}

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export class Broom {
  #zones: readonly BroomZone[]
  #random: () => number
  #paint: (state: BroomState | null) => void
  #onSweep: (() => void) | undefined
  #zone: BroomZone | null = null
  #dir: 1 | -1 = 1
  #index = 0
  #into = 0
  #sweptThisPhase = false

  constructor(opts: BroomOptions) {
    this.#zones = opts.zones
    this.#random = opts.random ?? Math.random
    this.#paint = opts.paint
    this.#onSweep = opts.onSweep
  }

  get active(): boolean {
    return this.#zone !== null
  }

  get phase(): BroomPhase | null {
    return this.#zone ? PLAN[this.#index]![0] : null
  }

  get zone(): BroomZone | null {
    return this.#zone
  }

  /**
   * A stretch nobody is on and nobody is heading for, clear of `avoid` (the
   * thing the visitor has open, if any). The emptiest one; null when there
   * is none, in which case the broom stays wherever brooms are kept.
   */
  pickZone(crew: readonly Body[], avoid: Rect | null = null, height = 170): BroomZone | null {
    let best: BroomZone | null = null
    let bestGap = -Infinity
    for (const z of this.#zones) {
      if (avoid && overlaps({ x: z.x0 - OFFSET, y: z.y - height, w: z.x1 - z.x0 + OFFSET * 2, h: height }, avoid)) continue
      let gap = Infinity
      for (const c of crew) {
        gap = Math.min(gap, distanceTo(z, c.x))
        if (c.headingX !== undefined && c.headingX !== null) gap = Math.min(gap, distanceTo(z, c.headingX))
      }
      if (gap < CLEAR) continue
      if (gap > bestGap) {
        bestGap = gap
        best = z
      }
    }
    return best
  }

  /** Come out at `zone`. False if already out. */
  start(zone: BroomZone): boolean {
    if (this.#zone) return false
    this.#zone = zone
    // From whichever end; the sweep goes the other way.
    this.#dir = this.#random() < 0.5 ? 1 : -1
    this.#index = 0
    this.#into = 0
    this.#sweptThisPhase = false
    this.#paint(this.state())
    return true
  }

  /** Put it away, wherever it had got to. */
  stop(): void {
    if (!this.#zone) return
    this.#zone = null
    this.#paint(null)
  }

  step(dt: number): void {
    if (!this.#zone) return
    this.#into += dt
    while (this.#into >= PLAN[this.#index]![1]) {
      this.#into -= PLAN[this.#index]![1]
      this.#index += 1
      this.#sweptThisPhase = false
      if (this.#index >= PLAN.length) {
        this.stop()
        return
      }
    }
    if (PLAN[this.#index]![0] === 'sweep' && !this.#sweptThisPhase) {
      this.#sweptThisPhase = true
      this.#onSweep?.()
    }
    this.#paint(this.state())
  }

  /** Where it is and what it is doing, for the room to draw. */
  state(): BroomState | null {
    const z = this.#zone
    if (!z) return null
    const [phase, ms] = PLAN[this.#index]!
    const t = Math.min(1, this.#into / ms)
    // Fades in a step short of its spot, sweeps there once, rests, and
    // fades a step on.
    const near = this.#dir === 1 ? z.x0 : z.x1
    const far = this.#dir === 1 ? z.x1 : z.x0
    const out = near + (far - near) * 0.35 - this.#dir * OFFSET
    // It works one spot: a little in from the near end of its stretch.
    const spot = near + (far - near) * 0.35
    let x = spot
    let opacity = MAX_OPACITY
    if (phase === 'enter') {
      x = out + (spot - out) * ease(t)
      opacity = MAX_OPACITY * ease(t)
    } else if (phase === 'leave') {
      x = spot + this.#dir * OFFSET * ease(t)
      opacity = MAX_OPACITY * (1 - ease(t))
    }
    return { x, y: z.y, phase, t, opacity, dir: this.#dir }
  }
}

function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function distanceTo(z: BroomZone, x: number): number {
  if (x < z.x0) return z.x0 - x
  if (x > z.x1) return x - z.x1
  return 0
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
