/**
 * Plays a frame sequence onto one <img>.
 *
 * It does not own a clock. The room already has one — a single ticker that is
 * gated on visibility and clamps long frames — and a second loop per character
 * would undo that the moment there is more than one of them.
 *
 * Time is accumulated rather than counted in frames, so a dropped browser
 * frame shortens the next hold instead of slowing the whole walk down.
 */
import type { SpriteAnimation } from '@/types/character'

export class SpriteAnimator {
  readonly #img: HTMLImageElement
  readonly #phase: number
  #anim: SpriteAnimation | null = null
  #key = ''
  #index = 0
  #acc = 0

  /**
   * `phase` (0 to 1) is where in a sequence this animator starts.
   *
   * It matters once there is more than one character. Five dokkaebi all
   * beginning their idle at frame one breathe in unison, which no five living
   * things do, and the eye picks it up long before it works out why. Giving
   * each one a fixed offset costs nothing and the room stops pulsing.
   */
  constructor(img: HTMLImageElement, phase = 0) {
    this.#img = img
    this.#phase = phase
  }

  /** Which sequence is playing. Empty before the first play(). */
  get key(): string {
    return this.#key
  }

  get frame(): number {
    return this.#index
  }

  /**
   * Start a sequence. Re-playing the one already running is ignored, so a
   * state machine may call this every tick without resetting the cycle to
   * frame one and freezing the legs.
   */
  play(key: string, anim: SpriteAnimation): void {
    if (key === this.#key) return
    this.#key = key
    this.#anim = anim
    this.#index = Math.floor(this.#phase * anim.frames.length) % Math.max(anim.frames.length, 1)
    this.#acc = 0
    this.#show()
  }

  /** Advance by `dt` milliseconds. */
  step(dt: number): void {
    const a = this.#anim
    if (!a || a.frames.length < 2 || a.fps <= 0) return
    const hold = 1000 / a.fps
    this.#acc += dt
    if (this.#acc < hold) return
    const advance = Math.floor(this.#acc / hold)
    this.#acc -= advance * hold
    const next = this.#index + advance
    if (next >= a.frames.length && !a.loop) {
      this.#index = a.frames.length - 1
    } else {
      this.#index = next % a.frames.length
    }
    this.#show()
  }

  #show(): void {
    const src = this.#anim?.frames[this.#index]
    if (src && this.#img.getAttribute('src') !== src) this.#img.src = src
  }
}

/**
 * Warm the browser cache for a set of frames without putting them in the
 * document. A walk that fetches its second frame when the first is already on
 * screen shows a hole where the character was.
 *
 * The images are kept. An Image with nothing referring to it can be collected,
 * and once it is, the next play of that frame is at the mercy of the HTTP
 * cache — which, on a host that serves `no-cache`, means fetching it again.
 * Five characters cycling through four hundred frames did that a thousand
 * times in two minutes. Holding the references costs the encoded bytes, about
 * 35KB a frame, and the frames are the whole reason the room is worth looking
 * at.
 */
const held = new Map<string, HTMLImageElement>()

export function preloadFrames(frames: readonly string[]): void {
  for (const src of frames) {
    if (held.has(src)) continue
    const img = new Image()
    img.decoding = 'async'
    img.setAttribute('fetchpriority', 'low')
    img.src = src
    held.set(src, img)
  }
}

/** How many frames are being held. Used by the memory check in the QA. */
export function heldFrames(): number {
  return held.size
}
