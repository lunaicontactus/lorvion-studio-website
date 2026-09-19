/**
 * 모모의 택배 배달 — the rules, with no drawing in them (WORLD 2.1).
 *
 * One screen of the dokkaebi village at night, 240 × 160 game pixels. MOMO
 * picks a parcel up from the pile by the gate, carries it up the ledges and
 * roofs to whichever door is waiting for it, and comes back for the next.
 * The village's ghosts drift along the ledges; touching one costs a heart,
 * and a parcel in MOMO's arms falls back onto the pile. Deliver in a row
 * without being touched and each is worth more. A minute a round.
 *
 * Platforms are one-way, the old arcade way: jump up through them, land on
 * them. The ground and the screen's sides are solid. Carrying a parcel MOMO
 * is a little slower and jumps a little lower — every ledge is still in
 * reach (tested: test/delivery.test.ts).
 */
export const W = 240
export const H = 160

export interface Box { x: number; y: number; w: number; h: number }

/** A ledge: its top edge, from x0 to x1. */
export interface Ledge { readonly x0: number; readonly x1: number; readonly y: number }

export const GROUND = 144

export const LEDGES: readonly Ledge[] = [
  { x0: 20, x1: 76, y: 116 },
  { x0: 164, x1: 220, y: 116 },
  { x0: 92, x1: 150, y: 90 },
  { x0: 16, x1: 84, y: 64 },
  { x0: 150, x1: 226, y: 58 },
]

/** Where parcels come from, and the doors they go to. */
export const DEPOT: Box = { x: 4, y: GROUND - 14, w: 20, h: 14 }
export const DOORS: readonly (Box & { readonly id: 'office' | 'house' })[] = [
  { id: 'office', x: 204, y: 58 - 20, w: 14, h: 20 },
  { id: 'house', x: 22, y: 64 - 20, w: 14, h: 20 },
]

export const PHYSICS = {
  speed: 74,
  speedCarrying: 62,
  gravity: 560,
  jump: 232,
  jumpCarrying: 214,
  maxFall: 260,
} as const

export const SIZE = { w: 12, h: 18 } as const

export interface Ghost {
  x: number
  y: number
  /** Which ledge it drifts on, or -1 for the one that floats across the sky. */
  readonly ledge: number
  dir: 1 | -1
  readonly speed: number
  phase: number
}

export interface DeliveryEvent {
  readonly kind: 'jump' | 'land' | 'pickup' | 'deliver' | 'hit' | 'out' | 'ghost'
}

export interface DeliveryOptions {
  readonly random?: () => number
  readonly lives?: number
  /** No ghosts at all: for proving the stage can be walked. */
  readonly empty?: boolean
}

export class DeliveryRound {
  readonly #random: () => number
  // MOMO.
  x = 30
  y = GROUND
  vx = 0
  vy = 0
  facing: 1 | -1 = 1
  grounded = true
  carrying = false
  /** Seconds of flicker after a hit, in which nothing can touch MOMO. */
  safe = 0
  lives: number
  // The round.
  score = 0
  delivered = 0
  /** Deliveries in a row without a hit. */
  streak = 0
  /** Which door the parcel in hand (or on the pile) is for. */
  target: 0 | 1 = 0
  ghosts: Ghost[] = []
  #left = false
  #right = false
  #jumpHeld = false
  #jumpBuffer = 0
  #coyote = 0

  constructor(opts: DeliveryOptions = {}) {
    this.#random = opts.random ?? Math.random
    this.lives = opts.lives ?? 3
    this.#empty = opts.empty ?? false
    if (!this.#empty) {
      this.#addGhost(2)
      this.#addGhost(4)
    }
  }

  readonly #empty: boolean

  get over(): boolean {
    return this.lives <= 0
  }

  /** MOMO's box, feet at `y`. */
  get box(): Box {
    return { x: this.x - SIZE.w / 2, y: this.y - SIZE.h, w: SIZE.w, h: SIZE.h }
  }

  control(name: string, down: boolean): void {
    if (name === 'left') this.#left = down
    else if (name === 'right') this.#right = down
    else if (name === 'jump') {
      if (down && !this.#jumpHeld) this.#jumpBuffer = 0.12
      this.#jumpHeld = down
    }
  }

  step(dt: number): DeliveryEvent[] {
    const out: DeliveryEvent[] = []
    if (this.over) return out
    this.safe = Math.max(0, this.safe - dt)
    // Walking.
    const speed = this.carrying ? PHYSICS.speedCarrying : PHYSICS.speed
    const dir = (this.#right ? 1 : 0) - (this.#left ? 1 : 0)
    this.vx = dir * speed
    if (dir) this.facing = dir > 0 ? 1 : -1
    // Jumping: a moment's grace off a ledge's edge, and a press remembered a moment.
    this.#coyote = this.grounded ? 0.08 : Math.max(0, this.#coyote - dt)
    this.#jumpBuffer = Math.max(0, this.#jumpBuffer - dt)
    if (this.#jumpBuffer > 0 && this.#coyote > 0) {
      this.vy = -(this.carrying ? PHYSICS.jumpCarrying : PHYSICS.jump)
      this.grounded = false
      this.#coyote = 0
      this.#jumpBuffer = 0
      out.push({ kind: 'jump' })
    }
    // A short hop when the button is let go early.
    if (!this.#jumpHeld && this.vy < -80) this.vy = -80
    this.vy = Math.min(PHYSICS.maxFall, this.vy + PHYSICS.gravity * dt)
    const was = this.y
    this.x = Math.max(SIZE.w / 2, Math.min(W - SIZE.w / 2, this.x + this.vx * dt))
    this.y += this.vy * dt
    // Landing: the ground, or a ledge MOMO was above a moment ago.
    const air = !this.grounded
    this.grounded = false
    if (this.y >= GROUND) {
      this.y = GROUND
      this.vy = 0
      this.grounded = true
    } else if (this.vy >= 0) {
      for (const l of LEDGES) {
        if (this.x + 4 < l.x0 || this.x - 4 > l.x1) continue
        if (was <= l.y + 0.5 && this.y >= l.y) {
          this.y = l.y
          this.vy = 0
          this.grounded = true
          break
        }
      }
    }
    if (air && this.grounded) out.push({ kind: 'land' })
    // The pile and the doors.
    const me = this.box
    if (!this.carrying && hits(me, DEPOT)) {
      this.carrying = true
      out.push({ kind: 'pickup' })
    }
    const door = DOORS[this.target]!
    if (this.carrying && hits(me, door)) {
      this.carrying = false
      this.streak += 1
      this.delivered += 1
      this.score += 100 + (this.streak - 1) * 25
      this.target = this.target === 0 ? 1 : 0
      out.push({ kind: 'deliver' })
      // More of the village comes out to watch as the night goes on.
      if (!this.#empty && this.delivered % 2 === 0 && this.ghosts.length < 5) {
        this.#addGhost(this.ghosts.length === 2 ? -1 : [0, 1, 3][this.ghosts.length - 3] ?? 1)
        out.push({ kind: 'ghost' })
      }
    }
    // The ghosts.
    for (const g of this.ghosts) {
      g.phase += dt
      if (g.ledge < 0) {
        g.x += g.dir * g.speed * dt
        if (g.x < 8 || g.x > W - 8) g.dir = g.dir === 1 ? -1 : 1
        g.y = 30 + Math.sin(g.phase * 1.6) * 10
      } else {
        const l = LEDGES[g.ledge] ?? { x0: 8, x1: W - 8, y: GROUND }
        g.x += g.dir * g.speed * dt
        if (g.x < l.x0 + 5) { g.x = l.x0 + 5; g.dir = 1 }
        if (g.x > l.x1 - 5) { g.x = l.x1 - 5; g.dir = -1 }
        g.y = l.y - 2 + Math.sin(g.phase * 3) * 1.5
      }
      if (this.safe <= 0 && hits(shrink(me, 2), { x: g.x - 4, y: g.y - 11, w: 8, h: 10 })) {
        this.lives -= 1
        this.streak = 0
        this.safe = 1.6
        this.carrying = false
        this.vy = -150
        this.facing = g.x > this.x ? -1 : 1
        this.x = Math.max(SIZE.w / 2, Math.min(W - SIZE.w / 2, this.x - (g.x > this.x ? 10 : -10)))
        out.push({ kind: 'hit' })
        if (this.lives <= 0) out.push({ kind: 'out' })
        break
      }
    }
    return out
  }

  /** A ghost on ledge `ledge` (index into LEDGES, 4 for the ground's width, -1 for the sky). */
  #addGhost(ledge: number): void {
    const l = ledge >= 0 && ledge < LEDGES.length ? LEDGES[ledge]! : null
    this.ghosts.push({
      x: l ? l.x0 + (l.x1 - l.x0) * (0.3 + this.#random() * 0.4) : 60 + this.#random() * 120,
      y: l ? l.y - 2 : 30,
      ledge: l ? ledge : -1,
      dir: this.#random() < 0.5 ? 1 : -1,
      speed: 16 + this.#random() * 10,
      phase: this.#random() * 6,
    })
  }
}

export function hits(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function shrink(b: Box, n: number): Box {
  return { x: b.x + n, y: b.y + n, w: b.w - n * 2, h: b.h - n * 2 }
}

/** How high a jump goes, in pixels, carrying or not. */
export function jumpHeight(carrying: boolean): number {
  const v = carrying ? PHYSICS.jumpCarrying : PHYSICS.jump
  return (v * v) / (2 * PHYSICS.gravity)
}

/** Stars: a round's worth of deliveries. */
export function starsFor(score: number): number {
  return score >= 700 ? 3 : score >= 400 ? 2 : score >= 100 ? 1 : 0
}
