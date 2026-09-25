/**
 * The sky through the telescope (WORLD 2.4).
 *
 * Not the room's glass brought close — a night sky of its own, drawn: three
 * depths of stars (far and small and many; nearer and fewer; a handful that
 * are bright), each with its own size and light, a few of them breathing on
 * their own beat, the whole field drifting so slowly it is only noticed by
 * not being still. A star falls now and then, never on the same path, never
 * on a timer you could set a watch by. Nothing else is in the view: no
 * building, no furniture, no card.
 *
 * The field and the timings are pure functions of a random source, so the
 * tests can hold them to the rules; `mountSky` paints them on a canvas.
 */

export interface Star {
  /** In the unit square; the canvas maps it to its own size. */
  readonly x: number
  readonly y: number
  /** Radius in CSS pixels, and light. */
  readonly r: number
  readonly a: number
  /** Breathing: how much (0 for a still star), how slowly, and from where. */
  readonly tw: number
  readonly period: number
  readonly phase: number
  /** 0 white, 1 warm, 2 blue. */
  readonly hue: 0 | 1 | 2
}

export interface StarField {
  readonly far: readonly Star[]
  readonly mid: readonly Star[]
  readonly near: readonly Star[]
}

export type Random = () => number

/** How many of each. */
export const COUNTS = { far: 900, mid: 220, near: 26 } as const

/** How many of each depth breathe: never all, never together. */
const BREATHING = { far: 0.22, mid: 0.3, near: 0.55 } as const

/** How the depths drift, in CSS pixels a second — a parallax you feel, not see. */
export const DRIFT = { far: 0.55, mid: 1.05, near: 1.7, dx: -0.985, dy: 0.17 } as const

/** A star's colour. */
const HUES: readonly (readonly [number, number, number])[] = [[255, 250, 240], [255, 232, 200], [200, 216, 255]]

const between = (rnd: Random, lo: number, hi: number): number => lo + rnd() * (hi - lo)

/** A rough normal, for the band. */
const gauss = (rnd: Random): number => (rnd() + rnd() + rnd() - 1.5) * 1.4

function hue(rnd: Random): 0 | 1 | 2 {
  const k = rnd()
  return k < 0.6 ? 0 : k < 0.85 ? 1 : 2
}

function star(rnd: Random, r: readonly [number, number], a: readonly [number, number], breathe: number, at?: { x: number; y: number }): Star {
  const tw = rnd() < breathe ? between(rnd, 0.25, 0.55) : 0
  return {
    x: at?.x ?? rnd(),
    y: at?.y ?? rnd(),
    r: between(rnd, r[0], r[1]),
    a: between(rnd, a[0], a[1]),
    tw,
    period: between(rnd, 2200, 6400),
    phase: rnd() * Math.PI * 2,
    hue: hue(rnd),
  }
}

/** A point along the band across the sky — the faint river of far stars. */
function onBand(rnd: Random): { x: number; y: number } {
  const t = rnd()
  const spread = gauss(rnd) * 0.09
  // From low left to high right, curving a little.
  const x = 0.04 + t * 0.92 + spread * 0.3
  const y = 0.86 - t * 0.7 + Math.sin(t * Math.PI) * 0.06 + spread
  return { x: ((x % 1) + 1) % 1, y: ((y % 1) + 1) % 1 }
}

/** The whole field, from one random source: the same seed, the same sky. */
export function makeStars(rnd: Random, counts: { far: number; mid: number; near: number } = COUNTS): StarField {
  const far: Star[] = []
  for (let i = 0; i < counts.far; i++) {
    // Nearly half the far stars lie along the band; the rest are everywhere.
    far.push(star(rnd, [0.55, 1.25], [0.3, 0.78], BREATHING.far, rnd() < 0.55 ? onBand(rnd) : undefined))
  }
  const mid: Star[] = []
  for (let i = 0; i < counts.mid; i++) mid.push(star(rnd, [1.3, 1.9], [0.55, 0.95], BREATHING.mid))
  const near: Star[] = []
  for (let i = 0; i < counts.near; i++) near.push(star(rnd, [2.0, 3.0], [0.85, 1], BREATHING.near))
  return { far, mid, near }
}

/** When a star falls: a small wait for the first, then now and then. */
export const SHOOTING = { firstMin: 3500, firstMax: 7000, min: 5000, max: 15000, twinChance: 0.12, twinGapMin: 260, twinGapMax: 700 } as const

export function nextShootingGap(rnd: Random, first = false): number {
  return first ? between(rnd, SHOOTING.firstMin, SHOOTING.firstMax) : between(rnd, SHOOTING.min, SHOOTING.max)
}

export interface Shot {
  /** Where it starts, in the unit square. */
  readonly x: number
  readonly y: number
  /** Which way, in radians (y down), and how far, in CSS pixels. */
  readonly angle: number
  readonly len: number
  /** How long it takes, and when it began. */
  readonly dur: number
  readonly t0: number
}

/** A falling star: somewhere in the upper sky, down and to one side, never twice the same. */
export function makeShot(rnd: Random, t0: number): Shot {
  const side = rnd() < 0.5 ? 1 : -1
  return {
    x: between(rnd, 0.12, 0.88),
    y: between(rnd, 0.06, 0.58),
    angle: side > 0 ? between(rnd, Math.PI / 9, (2 * Math.PI) / 9) : Math.PI - between(rnd, Math.PI / 9, (2 * Math.PI) / 9),
    len: between(rnd, 150, 270),
    dur: between(rnd, 650, 1050),
    t0,
  }
}

export interface SkyOptions {
  readonly random?: Random
  /** Less motion asked for: the field holds still, and a star falls without travelling. */
  readonly reduced?: () => boolean
  /** A star has just fallen. */
  readonly onShot?: () => void
}

export interface SkyHandle {
  start(): void
  stop(): void
  resize(): void
  /** How many stars are in the field, and how many have fallen. */
  readonly stars: number
  readonly shots: number
  readonly running: boolean
}

/**
 * Paint the sky on `canvas`, filling its own box. The still stars of each
 * depth are drawn once to a layer and the layers drift and wrap; the
 * breathing stars and the falling ones are drawn each frame.
 */
export function mountSky(canvas: HTMLCanvasElement, opts: SkyOptions = {}): SkyHandle {
  const rnd = opts.random ?? Math.random
  const reduced = opts.reduced ?? (() => false)
  const field = makeStars(rnd)
  const total = field.far.length + field.mid.length + field.near.length
  const ctx = canvas.getContext('2d')
  let w = 0
  let h = 0
  let dpr = 1
  let layers: { canvas: HTMLCanvasElement; speed: number }[] = []
  let breathing: Star[] = []
  let raf = 0
  let running = false
  let t0 = 0
  let last = 0
  let nextShot = 0
  let shots: Shot[] = []
  let fallen = 0
  let twinAt = 0

  const colour = (s: Star, a: number): string => {
    const [r, g, b] = HUES[s.hue]!
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`
  }

  const dot = (c: CanvasRenderingContext2D, x: number, y: number, s: Star, a: number): void => {
    c.beginPath()
    c.arc(x, y, s.r, 0, Math.PI * 2)
    c.fillStyle = colour(s, a)
    c.fill()
    if (s.r >= 2.0) {
      // The bright ones carry a soft light around them.
      const [r, g, b] = HUES[s.hue]!
      const glow = c.createRadialGradient(x, y, s.r * 0.6, x, y, s.r * 4.2)
      glow.addColorStop(0, `rgba(${r},${g},${b},${(0.55 * a).toFixed(3)})`)
      glow.addColorStop(0.4, `rgba(${r},${g},${b},${(0.16 * a).toFixed(3)})`)
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      c.beginPath()
      c.arc(x, y, s.r * 4.2, 0, Math.PI * 2)
      c.fillStyle = glow
      c.fill()
    }
  }

  const layer = (stars: readonly Star[], speed: number, band: boolean): { canvas: HTMLCanvasElement; speed: number } => {
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(w * dpr))
    c.height = Math.max(1, Math.round(h * dpr))
    const cx = c.getContext('2d')
    if (cx) {
      cx.scale(dpr, dpr)
      if (band) {
        // The river of far stars has a breath of light under it.
        const g = cx.createLinearGradient(0, h, w, 0)
        g.addColorStop(0, 'rgba(150,160,220,0)')
        g.addColorStop(0.4, 'rgba(150,160,220,0.06)')
        g.addColorStop(0.5, 'rgba(185,175,235,0.10)')
        g.addColorStop(0.6, 'rgba(150,160,220,0.06)')
        g.addColorStop(1, 'rgba(150,160,220,0)')
        cx.fillStyle = g
        cx.fillRect(0, 0, w, h)
      }
      for (const s of stars) if (!s.tw) dot(cx, s.x * w, s.y * h, s, s.a)
    }
    return { canvas: c, speed }
  }

  const resize = (): void => {
    const r = canvas.getBoundingClientRect()
    w = Math.max(1, Math.round(r.width))
    h = Math.max(1, Math.round(r.height))
    dpr = Math.min(2, Math.max(1, devicePixelRatio || 1))
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    layers = [layer(field.far, DRIFT.far, true), layer(field.mid, DRIFT.mid, false), layer(field.near, DRIFT.near, false)]
    breathing = [...field.far, ...field.mid, ...field.near].filter((s) => s.tw > 0)
    canvas.dataset['stars'] = String(total)
  }

  const frame = (now: number): void => {
    if (!running || !ctx) return
    raf = requestAnimationFrame(frame)
    // A hidden tab hands back huge deltas; the sky just picks up where it is.
    const dt = Math.min(64, now - last)
    last = now
    twinAt += dt
    const still = reduced()
    const t = (now - t0) / 1000
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    // The depths, drifting and wrapping.
    for (const l of layers) {
      const ox = still ? 0 : ((t * l.speed * DRIFT.dx) % w + w) % w
      const oy = still ? 0 : ((t * l.speed * DRIFT.dy) % h + h) % h
      ctx.drawImage(l.canvas, ox, oy, w, h)
      if (ox) ctx.drawImage(l.canvas, ox - w, oy, w, h)
      if (oy) ctx.drawImage(l.canvas, ox, oy - h, w, h)
      if (ox && oy) ctx.drawImage(l.canvas, ox - w, oy - h, w, h)
    }
    // The ones that breathe, each on its own beat, with its own depth's drift.
    for (const s of breathing) {
      const speed = s.r >= 2.0 ? DRIFT.near : s.r >= 1.3 ? DRIFT.mid : DRIFT.far
      const x = still ? s.x * w : (((s.x * w + t * speed * DRIFT.dx) % w) + w) % w
      const y = still ? s.y * h : (((s.y * h + t * speed * DRIFT.dy) % h) + h) % h
      const k = still ? 1 : 1 + s.tw * Math.sin((twinAt / s.period) * Math.PI * 2 + s.phase)
      dot(ctx, x, y, s, s.a * k)
    }
    // A star falls.
    if (twinAt >= nextShot) {
      shots.push(makeShot(rnd, now))
      fallen += 1
      canvas.dataset['shots'] = String(fallen)
      opts.onShot?.()
      nextShot = twinAt + nextShootingGap(rnd)
      // Rarely, a second close behind it.
      if (rnd() < SHOOTING.twinChance) nextShot = twinAt + between(rnd, SHOOTING.twinGapMin, SHOOTING.twinGapMax)
    }
    shots = shots.filter((s) => now - s.t0 < s.dur)
    for (const s of shots) {
      const p = (now - s.t0) / s.dur
      const fade = Math.min(1, p / 0.15) * Math.min(1, (1 - p) / 0.35)
      const dx = Math.cos(s.angle)
      const dy = Math.sin(s.angle)
      const travel = still ? s.len * 0.5 : s.len * 1.6 * p
      const hx = s.x * w + dx * travel
      const hy = s.y * h + dy * travel
      const tail = still ? s.len * 0.6 : s.len * Math.min(1, p * 2) * (1 - p * 0.3)
      const g = ctx.createLinearGradient(hx, hy, hx - dx * tail, hy - dy * tail)
      g.addColorStop(0, `rgba(255,252,240,${(0.95 * fade).toFixed(3)})`)
      g.addColorStop(0.25, `rgba(255,246,225,${(0.55 * fade).toFixed(3)})`)
      g.addColorStop(1, 'rgba(255,240,210,0)')
      ctx.strokeStyle = g
      ctx.lineWidth = 1.6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.lineTo(hx - dx * tail, hy - dy * tail)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(hx, hy, 2.2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,250,${(0.9 * fade).toFixed(3)})`
      ctx.fill()
    }
  }

  const start = (): void => {
    if (running) return
    running = true
    resize()
    t0 = performance.now()
    last = t0
    twinAt = 0
    shots = []
    nextShot = nextShootingGap(rnd, true)
    raf = requestAnimationFrame(frame)
  }
  const stop = (): void => {
    running = false
    cancelAnimationFrame(raf)
  }

  return {
    start,
    stop,
    resize: () => { if (running) resize() },
    get stars() { return total },
    get shots() { return fallen },
    get running() { return running },
  }
}
