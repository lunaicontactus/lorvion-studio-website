/**
 * The broom that sweeps on its own (PHASE 6).
 *
 * One of the room's ambient events (src/systems/ambient.ts), not a scheduler
 * of its own: the manager decides when, this decides where and what the
 * broom does once it is going. It is deliberately slow and short — it comes
 * in, sweeps a little, shuffles along, sweeps a little more, stands there,
 * and goes — because a broom that crosses the room at a run is a cartoon
 * and a broom that never stops is a screensaver.
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

export type BroomPhase = 'enter' | 'sweep' | 'move' | 'pause' | 'leave'

/** The routine, in order. Two sweeps, each the length of the sweep sound. */
export const PLAN: readonly (readonly [BroomPhase, number])[] = [
  // In and out cover 70 units; at 1.1 s the eased peak was 127 units a
  // second, faster than anybody in the room walks. 1.5 s keeps it under.
  ['enter', 1500],
  ['sweep', 2000],
  // Slow: the longest stretch is 144 units, and an eased move peaks at
  // about twice its average, so this keeps even that under 100 a second
  // against the crew's 76.
  ['move', 3000],
  ['sweep', 2000],
  ['pause', 900],
  ['leave', 1500],
]

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
const OFFSET = 70

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
    // Starts at the near end, sweeps, moves to the far end, sweeps, goes
    // back out the way it came.
    const near = this.#dir === 1 ? z.x0 : z.x1
    const far = this.#dir === 1 ? z.x1 : z.x0
    const out = near - this.#dir * OFFSET
    let x = near
    let opacity = 1
    if (phase === 'enter') {
      x = out + (near - out) * ease(t)
      opacity = t
    } else if (phase === 'move') {
      x = near + (far - near) * ease(t)
    } else if (this.#index > 2) {
      // After the move, everything happens at the far end.
      x = far
      if (phase === 'leave') {
        const back = far + this.#dir * OFFSET
        x = far + (back - far) * ease(t)
        opacity = 1 - t
      }
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
