/**
 * One place that listens, for all three games.
 *
 * A game should not know about `keydown` versus `pointerdown` versus
 * `touchstart`; it should know that somebody is holding the button down, or
 * chose a thing, or started dragging one. So this turns the browser's events
 * into those, and the games read those.
 *
 * Two failures it exists to prevent.
 *
 * Listeners that pile up. Every listener this adds is remembered and removed
 * by `destroy`, and the runner destroys the whole thing on retry rather than
 * resetting it — so "retry five times" cannot mean "five copies of every
 * handler", which is the classic way a game ends up jumping five squares per
 * press.
 *
 * A hold that outlives the window. If somebody is holding Space and alt-tabs
 * away, the browser sends no `keyup` — the key is still down as far as this
 * page knows, for ever. The POKO game is built entirely on that hold: a
 * SLACK that never ends is a player who is caught the instant they come back,
 * through no fault of their own. So blur, `pointercancel`, `touchcancel` and
 * a hidden tab all release everything held, and say so, before the pause.
 */

export type GameInputKind =
  /** The action button went down, by any means. */
  | 'HOLD_START'
  /** …and came up, or was let go of on the page's behalf. */
  | 'HOLD_END'
  /** A discrete choice: a tap on a thing, Enter, a number key. */
  | 'SELECT'
  | 'DRAG_START'
  | 'DRAG_MOVE'
  | 'DRAG_END'
  /** Somewhere in the game's own box, for games that want a position. */
  | 'POINT'
  /**
   * A named control went down or came up (WORLD 2.1): left, right, jump —
   * for a game that needs more than one thing held at once. From a key in
   * `controls`, or a finger on an element with `data-control`.
   */
  | 'PRESS'
  | 'RELEASE'

export interface GameInputEvent {
  readonly kind: GameInputKind
  /** Where, in the box's own pixels, when the event had a position. */
  readonly x?: number
  readonly y?: number
  /** What was chosen, for SELECT: whatever `data-choice` said. */
  readonly choice?: string
  /** The key, when a key caused it. */
  readonly key?: string
  /** Which control, for PRESS and RELEASE. */
  readonly control?: string
  /**
   * True when the page let go on the player's behalf — a lost window, a
   * cancelled touch — rather than the player letting go. A game may want to
   * be kind about that; none of them may ignore it.
   */
  readonly forced?: boolean
}

export interface GameInputOptions {
  /** The element the game is drawn into. Positions are relative to it. */
  readonly root: HTMLElement
  /** Keys that count as the action button. */
  readonly holdKeys?: readonly string[]
  /** Keys that count as a choice. */
  readonly selectKeys?: readonly string[]
  /** Keys that are named controls, each held on its own: `{ ArrowLeft: 'left' }`. */
  readonly controls?: Readonly<Record<string, string>>
  /** Somewhere to send everything. */
  readonly on: (event: GameInputEvent) => void
}

const DEFAULT_HOLD = [' ', 'Spacebar', 'ArrowUp', 'w', 'W']
const DEFAULT_SELECT = ['Enter']

export class GameInput {
  #root: HTMLElement
  #hold: ReadonlySet<string>
  #select: ReadonlySet<string>
  #on: (event: GameInputEvent) => void
  #offs: (() => void)[] = []
  /** Every key currently down that we care about. */
  #keys = new Set<string>()
  /** Pointer ids currently down inside the box. */
  #pointers = new Set<number>()
  #holding = false
  #dragging = false
  #enabled = true
  #dead = false
  /** Named controls: which keys map to which, and what is down right now. */
  #controls: Readonly<Record<string, string>>
  #controlKeys = new Map<string, string>()
  #controlPointers = new Map<number, string>()

  constructor(opts: GameInputOptions) {
    this.#root = opts.root
    this.#controls = opts.controls ?? {}
    this.#hold = new Set(opts.holdKeys ?? DEFAULT_HOLD)
    this.#select = new Set(opts.selectKeys ?? DEFAULT_SELECT)
    this.#on = opts.on
    this.#listen()
  }

  /** Whether anything is being held right now. */
  get holding(): boolean {
    return this.#holding
  }

  /** How many listeners are attached. For the test that says they go away. */
  get listeners(): number {
    return this.#offs.length
  }

  /**
   * Stop passing anything on, and let go of everything held first.
   *
   * Used by the pause: the game must not see input while it is not running,
   * and must not still be holding whatever was held when it stopped.
   */
  setEnabled(enabled: boolean): void {
    if (enabled === this.#enabled) return
    if (!enabled) this.releaseAll(true)
    this.#enabled = enabled
  }

  /**
   * Let go of everything, as if the player had. `forced` says the page did it
   * rather than the player — a lost window, a cancelled touch.
   */
  releaseAll(forced = false): void {
    const down = new Set([...this.#controlKeys.values(), ...this.#controlPointers.values()])
    this.#controlKeys.clear()
    this.#controlPointers.clear()
    for (const control of down) this.#send({ kind: 'RELEASE', control, ...(forced ? { forced } : {}) })
    this.#keys.clear()
    this.#pointers.clear()
    if (this.#dragging) {
      this.#dragging = false
      this.#send({ kind: 'DRAG_END', ...(forced ? { forced } : {}) })
    }
    if (this.#holding) {
      this.#holding = false
      this.#send({ kind: 'HOLD_END', ...(forced ? { forced } : {}) })
    }
  }

  destroy(): void {
    this.releaseAll(true)
    for (const off of this.#offs) off()
    this.#offs = []
    this.#dead = true
  }

  #send(event: GameInputEvent): void {
    if (this.#dead) return
    this.#on(event)
  }

  #add<K extends keyof DocumentEventMap>(
    target: EventTarget, type: K, fn: (e: DocumentEventMap[K]) => void,
    opts?: AddEventListenerOptions,
  ): void {
    const handler = fn as EventListener
    target.addEventListener(type, handler, opts)
    this.#offs.push(() => target.removeEventListener(type, handler, opts))
  }

  #startHold(): void {
    if (this.#holding) return
    this.#holding = true
    this.#send({ kind: 'HOLD_START' })
  }

  #endHold(forced = false): void {
    if (!this.#holding) return
    // Still held by something else: a finger down while a key comes up is
    // one hold, not two.
    if (this.#keys.size || this.#pointers.size) return
    this.#holding = false
    this.#send({ kind: 'HOLD_END', ...(forced ? { forced } : {}) })
  }

  /** Is this control held by any key or finger? */
  #isDown(control: string): boolean {
    for (const c of this.#controlKeys.values()) if (c === control) return true
    for (const c of this.#controlPointers.values()) if (c === control) return true
    return false
  }

  #at(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.#root.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  #listen(): void {
    // Keys are taken on the document in capture, so the room behind never
    // sees a game key — the arrows pan the camera, and Space is the hold.
    this.#add(document, 'keydown', (e: KeyboardEvent) => {
      if (!this.#enabled) return
      const control = this.#controls[e.key]
      if (control) {
        e.preventDefault()
        if (e.repeat || this.#controlKeys.has(e.key)) return
        const was = this.#isDown(control)
        this.#controlKeys.set(e.key, control)
        if (!was) this.#send({ kind: 'PRESS', control, key: e.key })
        return
      }
      if (e.repeat) return
      if (this.#hold.has(e.key)) {
        e.preventDefault()
        this.#keys.add(e.key)
        this.#startHold()
        return
      }
      if (this.#select.has(e.key)) {
        e.preventDefault()
        this.#send({ kind: 'SELECT', key: e.key })
        return
      }
      // A digit chooses the nth thing, for the games that are a row of
      // things. Cheap, and the only way through them from a keyboard.
      if (/^[1-9]$/.test(e.key)) {
        this.#send({ kind: 'SELECT', key: e.key, choice: e.key })
      }
    }, { capture: true })

    this.#add(document, 'keyup', (e: KeyboardEvent) => {
      const control = this.#controlKeys.get(e.key)
      if (control) {
        this.#controlKeys.delete(e.key)
        if (!this.#isDown(control)) this.#send({ kind: 'RELEASE', control, key: e.key })
        return
      }
      if (!this.#hold.has(e.key)) return
      this.#keys.delete(e.key)
      this.#endHold()
    }, { capture: true })

    this.#add(this.#root, 'pointerdown', (e: PointerEvent) => {
      if (!this.#enabled) return
      // An on-screen button for a named control: held while the finger is on it.
      const pad = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-control]')
      if (pad) {
        e.preventDefault()
        const control = pad.dataset['control']!
        const was = this.#isDown(control)
        this.#controlPointers.set(e.pointerId, control)
        try {
          pad.setPointerCapture(e.pointerId)
        } catch {
          /* already gone */
        }
        if (!was) this.#send({ kind: 'PRESS', control })
        return
      }
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-choice]')
      if (target) {
        // A thing to choose, not a surface to hold.
        e.preventDefault()
        this.#send({ kind: 'SELECT', choice: target.dataset['choice']!, ...this.#at(e) })
        return
      }
      this.#pointers.add(e.pointerId)
      // Captured, so a finger that slides off the button still ends the hold
      // on this element rather than silently never ending it.
      try {
        this.#root.setPointerCapture(e.pointerId)
      } catch {
        /* a pointer that has already gone */
      }
      this.#send({ kind: 'DRAG_START', ...this.#at(e) })
      this.#dragging = true
      this.#startHold()
    })

    this.#add(this.#root, 'pointermove', (e: PointerEvent) => {
      if (!this.#enabled || !this.#dragging) return
      this.#send({ kind: 'DRAG_MOVE', ...this.#at(e) })
    })

    const up = (e: PointerEvent, forced: boolean): void => {
      const control = this.#controlPointers.get(e.pointerId)
      if (control) {
        this.#controlPointers.delete(e.pointerId)
        if (!this.#isDown(control)) this.#send({ kind: 'RELEASE', control, ...(forced ? { forced } : {}) })
        return
      }
      if (!this.#pointers.delete(e.pointerId)) return
      try {
        this.#root.releasePointerCapture(e.pointerId)
      } catch {
        /* already gone */
      }
      if (this.#dragging) {
        this.#dragging = false
        this.#send({ kind: 'DRAG_END', ...this.#at(e), ...(forced ? { forced } : {}) })
      }
      this.#endHold(forced)
    }
    this.#add(this.#root, 'pointerup', (e: PointerEvent) => up(e, false))
    this.#add(this.#root, 'pointercancel', (e: PointerEvent) => up(e, true))
    this.#add(this.#root, 'lostpointercapture', (e: PointerEvent) => up(e, true))
    // Touch has its own cancel, and it is the one that fires when a call
    // comes in or the gesture is taken over by the browser.
    this.#add(this.#root, 'touchcancel', () => this.releaseAll(true))

    // The window going is the important one. No keyup ever arrives for a key
    // that was down when the window left, so without this the hold is still
    // held when the player comes back.
    this.#add(window, 'blur', () => this.releaseAll(true))
    this.#add(document, 'visibilitychange', () => {
      if (document.visibilityState !== 'visible') this.releaseAll(true)
    })
  }
}
