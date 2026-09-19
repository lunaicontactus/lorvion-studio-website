/**
 * The door between the site and a game (WORLD 2.1).
 *
 * The site is painted; the games are pixels. Going from one to the other is
 * not a fade: the screen is covered block by block, the game's name comes up
 * on the dark for a moment the way a cartridge's title does, and the blocks
 * come away again onto the game. Coming out is the same, backwards.
 *
 * One canvas, fixed over everything, drawn only while a wipe is running.
 * A visitor who asked for less motion gets a plain cut.
 */
import { motion } from '@/systems/motion'

const INK = '#07060d'

export class PixelWipe {
  readonly #el: HTMLElement
  readonly #canvas: HTMLCanvasElement
  readonly #title: HTMLElement
  #order: number[] = []
  #cols = 0
  #rows = 0
  #cell = 0
  #raf = 0

  constructor(parent: HTMLElement = document.body) {
    const el = document.createElement('div')
    el.className = 'pixel-wipe'
    el.hidden = true
    el.dataset['pixelWipe'] = ''
    el.setAttribute('aria-hidden', 'true')
    el.innerHTML = `<canvas class="pixel-wipe__blocks"></canvas><p class="pixel-wipe__title" data-pixel-wipe-title></p>`
    parent.append(el)
    this.#el = el
    this.#canvas = el.querySelector('canvas')!
    this.#title = el.querySelector('[data-pixel-wipe-title]')!
  }

  /** The screen covered, block by block; resolves when it is all dark. */
  cover(title = '', ms = 460): Promise<void> {
    this.#title.textContent = title
    this.#title.classList.remove('is-on')
    this.#el.hidden = false
    this.#layout()
    if (motion.reduced) {
      this.#paint(1)
      if (title) this.#title.classList.add('is-on')
      return Promise.resolve()
    }
    return this.#run(ms, (k) => this.#paint(k)).then(() => {
      if (title) this.#title.classList.add('is-on')
    })
  }

  /** The blocks come away, onto whatever is underneath now. */
  uncover(ms = 420): Promise<void> {
    this.#title.classList.remove('is-on')
    if (this.#el.hidden) return Promise.resolve()
    if (motion.reduced) {
      this.#el.hidden = true
      return Promise.resolve()
    }
    return this.#run(ms, (k) => this.#paint(1 - k)).then(() => {
      this.#el.hidden = true
    })
  }

  get covering(): boolean {
    return !this.#el.hidden
  }

  destroy(): void {
    cancelAnimationFrame(this.#raf)
    this.#el.remove()
  }

  #layout(): void {
    const w = innerWidth
    const h = innerHeight
    // Big blocks on a phone, a few more on a desktop: always chunky.
    this.#cols = w > 900 ? 28 : 16
    this.#cell = Math.ceil(w / this.#cols)
    this.#rows = Math.ceil(h / this.#cell)
    this.#canvas.width = this.#cols
    this.#canvas.height = this.#rows
    this.#canvas.style.width = `${this.#cols * this.#cell}px`
    this.#canvas.style.height = `${this.#rows * this.#cell}px`
    // A fixed shuffle, weighted to start from the middle and end at the edges,
    // like a light going out from where the visitor was looking.
    const cx = (this.#cols - 1) / 2
    const cy = (this.#rows - 1) / 2
    const cells: { i: number; d: number }[] = []
    let seed = 7
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let y = 0; y < this.#rows; y++) {
      for (let x = 0; x < this.#cols; x++) {
        const d = Math.hypot((x - cx) / this.#cols, (y - cy) / this.#rows)
        cells.push({ i: y * this.#cols + x, d: d + rnd() * 0.45 })
      }
    }
    this.#order = cells.sort((a, b) => a.d - b.d).map((c) => c.i)
  }

  #paint(k: number): void {
    const ctx = this.#canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, this.#cols, this.#rows)
    ctx.fillStyle = INK
    const n = Math.round(this.#order.length * Math.max(0, Math.min(1, k)))
    for (let j = 0; j < n; j++) {
      const i = this.#order[j]!
      ctx.fillRect(i % this.#cols, Math.floor(i / this.#cols), 1, 1)
    }
  }

  #run(ms: number, frame: (k: number) => void): Promise<void> {
    cancelAnimationFrame(this.#raf)
    return new Promise((resolve) => {
      const t0 = performance.now()
      const step = (): void => {
        const k = Math.min(1, (performance.now() - t0) / ms)
        frame(k)
        if (k < 1) this.#raf = requestAnimationFrame(step)
        else resolve()
      }
      this.#raf = requestAnimationFrame(step)
    })
  }
}
