/**
 * What the room is doing, and who is allowed to interrupt it.
 *
 * Every object goes through this: touch it, the camera moves to it, its own
 * interface opens; close it and the camera goes back. Holding that in one
 * small machine is what stops the bugs that show up the moment two things are
 * touched quickly — a second click while the first is still moving, a
 * different object mid-flight, Escape hammered during a close.
 *
 * The rule is simple and deliberate: input is locked while the room is moving.
 * A request that arrives during a transition is dropped, not queued, because a
 * queue would replay a click the visitor has already forgotten making.
 */
import { log } from '@/systems/log'

export type GarageState = 'GARAGE_IDLE' | 'OBJECT_FOCUSING' | 'OBJECT_OPEN' | 'OBJECT_CLOSING'

export interface InteractionHost {
  /** Move the camera onto the object and hold it there. */
  readonly focus: (id: string) => void
  /** Put the camera back where the visitor left it. */
  readonly restore: () => void
  /** Build the object's own interface. */
  readonly open: (id: string) => void
  /** Take it away. */
  readonly close: () => void
  /** Stop the room accepting drags and keys while something is open. */
  readonly setPaused: (paused: boolean) => void
  /** Something was touched that has nothing behind it yet. */
  readonly onUnavailable?: (id: string) => void
}

/**
 * How long the camera is given to arrive before the interface opens.
 *
 * The camera eases at 0.14 a frame and is nine-tenths of the way there by
 * 220ms; the panel's own fade covers the last tenth. It was 320, which on a
 * throttled phone was a third of the wait between the tap and the list.
 */
export const FOCUS_MS = 220
/**
 * How long the interface is given to leave before the camera goes back.
 *
 * Shorter than the panel's own 320ms exit on purpose, so the room is taking
 * instructions again by the time the last panel has finished disappearing.
 * The other way round leaves a window where the panel looks gone and the room
 * still refuses to open the next thing.
 */
export const CLOSE_MS = 200

export class Interaction {
  #state: GarageState = 'GARAGE_IDLE'
  #active: string | null = null
  #host: InteractionHost
  #timers = new Set<ReturnType<typeof setTimeout>>()
  #listeners = new Set<(state: GarageState, id: string | null) => void>()

  constructor(host: InteractionHost) {
    this.#host = host
  }

  get state(): GarageState {
    return this.#state
  }
  get activeObjectId(): string | null {
    return this.#active
  }
  /** True while the room is moving and must not take another instruction. */
  get locked(): boolean {
    return this.#state === 'OBJECT_FOCUSING' || this.#state === 'OBJECT_CLOSING'
  }

  subscribe(fn: (state: GarageState, id: string | null) => void): () => void {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  #set(state: GarageState, id: string | null): void {
    this.#state = state
    this.#active = id
    for (const fn of this.#listeners) fn(state, id)
  }

  #later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.#timers.delete(t)
      fn()
    }, ms)
    this.#timers.add(t)
  }

  /**
   * Touch an object. Returns false when the room was busy or the object is the
   * one already open, so the caller can leave history and sound alone.
   */
  request(id: string, options: { readonly enabled?: boolean; readonly instant?: boolean } = {}): boolean {
    if (this.locked) {
      log.debug('interaction: busy in', this.#state, 'ignoring', id)
      return false
    }
    if (options.enabled === false) {
      this.#host.onUnavailable?.(id)
      return false
    }
    if (this.#state === 'OBJECT_OPEN') {
      if (this.#active === id) return false
      // Swapping straight from one object to another: close, then go.
      this.#swap(id, options.instant === true)
      return true
    }
    this.#begin(id, options.instant === true)
    return true
  }

  #begin(id: string, instant: boolean): void {
    this.#set('OBJECT_FOCUSING', id)
    this.#host.setPaused(true)
    this.#host.focus(id)
    const go = (): void => {
      // A close may have overtaken us while the camera was moving.
      if (this.#state !== 'OBJECT_FOCUSING' || this.#active !== id) return
      this.#host.open(id)
      this.#set('OBJECT_OPEN', id)
    }
    if (instant) go()
    else this.#later(go, FOCUS_MS)
  }

  #swap(id: string, instant: boolean): void {
    this.#set('OBJECT_CLOSING', this.#active)
    this.#host.close()
    this.#later(() => this.#begin(id, instant), instant ? 0 : CLOSE_MS)
  }

  /** Escape, the close button, or the browser's back button. */
  dismiss(options: { readonly instant?: boolean } = {}): boolean {
    if (this.#state === 'OBJECT_FOCUSING') {
      // Changed their mind while the camera was still travelling. The pending
      // open checks the active id and drops itself.
      this.#set('GARAGE_IDLE', null)
      this.#host.restore()
      this.#host.setPaused(false)
      return true
    }
    if (this.#state !== 'OBJECT_OPEN') return false
    this.#set('OBJECT_CLOSING', this.#active)
    this.#host.close()
    const done = (): void => {
      this.#host.restore()
      this.#host.setPaused(false)
      this.#set('GARAGE_IDLE', null)
    }
    if (options.instant === true) done()
    else this.#later(done, CLOSE_MS)
    return true
  }

  destroy(): void {
    for (const t of this.#timers) clearTimeout(t)
    this.#timers.clear()
    this.#listeners.clear()
  }
}
