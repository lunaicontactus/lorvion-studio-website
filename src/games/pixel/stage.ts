/**
 * The pixel screen every mini-game is drawn on (WORLD 2.1).
 *
 * The site is painted at whatever size the window is; the games are not.
 * Every game draws into the same small screen — 240 × 160, a handheld's —
 * and that screen is blown up to fit its box with no smoothing, the largest
 * whole multiple when there is room for one. Same resolution, same pixel
 * size on the same window, for all three: a series, not three apps.
 */
export const SCREEN = { w: 240, h: 160 } as const

export interface StageOptions {
  /** The box to fill. The stage sizes itself to it and keeps doing so. */
  readonly root: HTMLElement
  /** What shows round the screen when the box is not 3:2. */
  readonly border?: string
}

export class PixelStage {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly el: HTMLElement
  #root: HTMLElement
  #scale = 1
  #observer: ResizeObserver | null = null

  constructor(opts: StageOptions) {
    this.#root = opts.root
    const el = document.createElement('div')
    el.className = 'pixel-stage'
    if (opts.border) el.style.background = opts.border
    const canvas = document.createElement('canvas')
    canvas.className = 'pixel-stage__screen'
    canvas.width = SCREEN.w
    canvas.height = SCREEN.h
    el.append(canvas)
    this.#root.append(el)
    this.el = el
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.imageSmoothingEnabled = false
    this.ctx = ctx
    this.fit()
    if (typeof ResizeObserver !== 'undefined') {
      this.#observer = new ResizeObserver(() => this.fit())
      this.#observer.observe(this.el)
    }
  }

  /** How many screen pixels one game pixel is, right now. */
  get scale(): number {
    return this.#scale
  }

  /** Size the screen to its own cell: whole multiples when they fit, never blurred. */
  fit(): void {
    const r = this.el.getBoundingClientRect()
    if (!r.width || !r.height) return
    const exact = Math.min(r.width / SCREEN.w, r.height / SCREEN.h)
    const scale = exact >= 2 ? Math.floor(exact) : exact
    this.#scale = scale
    this.canvas.style.width = `${Math.floor(SCREEN.w * scale)}px`
    this.canvas.style.height = `${Math.floor(SCREEN.h * scale)}px`
  }

  /** A point in the box's own pixels, as a point on the game's screen. */
  toScreen(x: number, y: number): { x: number; y: number } {
    const box = this.#root.getBoundingClientRect()
    const c = this.canvas.getBoundingClientRect()
    return {
      x: ((x + box.left - c.left) / c.width) * SCREEN.w,
      y: ((y + box.top - c.top) / c.height) * SCREEN.h,
    }
  }

  clear(color: string): void {
    this.ctx.fillStyle = color
    this.ctx.fillRect(0, 0, SCREEN.w, SCREEN.h)
  }

  destroy(): void {
    this.#observer?.disconnect()
    this.#observer = null
    this.el.remove()
  }
}
