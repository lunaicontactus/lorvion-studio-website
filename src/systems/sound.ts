/**
 * Sound preference and the Web Audio unlock dance.
 *
 * Sound is off until asked for — nobody should get noise from opening a link.
 * No AudioContext is created until the visitor turns it on, because a context
 * built before a gesture starts suspended and browsers count it against us.
 */
import type { SaveStore } from '@/systems/storage'
import { save } from '@/systems/storage'

export type SoundListener = (enabled: boolean) => void

export class SoundPreference {
  #store: SaveStore
  #listeners = new Set<SoundListener>()
  #ctx: AudioContext | null = null
  /** Set once a real gesture has let us start a context. */
  #unlocked = false

  constructor(store: SaveStore = save) {
    this.#store = store
  }

  get enabled(): boolean {
    return this.#store.data.soundEnabled
  }

  get unlocked(): boolean {
    return this.#unlocked
  }

  /** The live context, or null while sound is off / not yet unlocked. */
  get context(): AudioContext | null {
    return this.#ctx
  }

  subscribe(fn: SoundListener): () => void {
    this.#listeners.add(fn)
    return () => this.#listeners.delete(fn)
  }

  async setEnabled(on: boolean): Promise<void> {
    if (on === this.enabled && (!on || this.#unlocked)) return
    this.#store.update((d) => {
      d.soundEnabled = on
    })
    if (on) await this.unlock()
    else this.#suspend()
    for (const l of this.#listeners) l(on)
  }

  toggle(): Promise<void> {
    return this.setEnabled(!this.enabled)
  }

  /**
   * Must be called from inside a user gesture. Safe to call repeatedly.
   * Failure is not fatal: the site keeps working, silently.
   */
  async unlock(): Promise<boolean> {
    if (!this.enabled) return false
    try {
      const Ctor =
        globalThis.AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctor) return false
      this.#ctx ??= new Ctor()
      if (this.#ctx.state === 'suspended') await this.#ctx.resume()
      this.#unlocked = this.#ctx.state === 'running'
      return this.#unlocked
    } catch {
      this.#unlocked = false
      return false
    }
  }

  #suspend(): void {
    this.#unlocked = false
    void this.#ctx?.suspend().catch(() => undefined)
  }
}

export const sound = new SoundPreference()
