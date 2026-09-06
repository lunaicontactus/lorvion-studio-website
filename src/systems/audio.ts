/**
 * One player for the whole site.
 *
 * Components ask for a sound by name; they never construct Audio themselves, so
 * there is a single place that respects the mute preference, a single place
 * that knows browsers will not play anything before a gesture, and no risk of a
 * dozen elements decoding the same file.
 *
 * Nothing is fetched until it is first needed, and the ambient track — by far
 * the largest file — is only fetched if someone turns the radio on.
 */
import { sound as pref } from '@/systems/sound'
import { log } from '@/systems/log'

const SFX = '/assets/audio'

const CLIPS = {
  click: `${SFX}/click.m4a`,
  door: `${SFX}/door.m4a`,
  drawer: `${SFX}/drawer.m4a`,
  bell: `${SFX}/bell.m4a`,
  discovery: `${SFX}/discovery.m4a`,
  keyboard: `${SFX}/keyboard.m4a`,
  surprise: `${SFX}/surprise.m4a`,
  wrapper: `${SFX}/wrapper.m4a`,
} as const

export type ClipName = keyof typeof CLIPS

class AudioManager {
  private cache = new Map<string, HTMLAudioElement>()
  private ambient: HTMLAudioElement | null = null
  private ambientOn = false
  /** Nothing plays before the visitor has interacted; browsers refuse anyway. */
  private unlocked = false

  unlock(): void {
    this.unlocked = true
  }

  get enabled(): boolean {
    return pref.enabled
  }

  play(name: string, volume = 0.5): void {
    if (!this.unlocked || !pref.enabled) return
    const src = CLIPS[name as ClipName]
    if (!src) return
    try {
      let el = this.cache.get(name)
      if (!el) {
        el = new Audio(src)
        el.preload = 'auto'
        this.cache.set(name, el)
      }
      el.currentTime = 0
      el.volume = volume
      void el.play().catch(() => undefined)
    } catch (err) {
      log.debug('audio: play failed', err)
    }
  }

  /** The radio. Fetches the track the first time it is switched on. */
  toggleAmbient(on: boolean, volume = 0.32): void {
    this.ambientOn = on
    if (!on) {
      this.ambient?.pause()
      return
    }
    if (!this.unlocked || !pref.enabled) return
    if (!this.ambient) {
      this.ambient = new Audio(`${SFX}/ambient.m4a`)
      this.ambient.loop = true
      this.ambient.preload = 'none'
    }
    this.ambient.volume = volume
    void this.ambient.play().catch(() => undefined)
  }

  get ambientPlaying(): boolean {
    return this.ambientOn && !!this.ambient && !this.ambient.paused
  }

  /** Called when the mute preference changes. */
  syncPreference(): void {
    if (!pref.enabled) {
      this.ambient?.pause()
      for (const el of this.cache.values()) el.pause()
    } else if (this.ambientOn) {
      this.toggleAmbient(true)
    }
  }
}

export const audio = new AudioManager()
