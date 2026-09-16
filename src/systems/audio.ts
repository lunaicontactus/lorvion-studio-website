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

  /**
   * Looping room tone. Fetches the track the first time it is switched on.
   * The radio's 91.7 NIGHT station plays the same file through `tune`.
   */
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

  // ── The radio: one station at a time ───────────────────────────────────
  private station: HTMLAudioElement | null = null
  private stationSrc: string | null = null
  private stationVolume = 0.3

  /**
   * Tune the one station stream to a looping track, or to nothing. There is
   * only ever one element: tuning replaces its source rather than starting a
   * second player, so switching stations quickly cannot stack audio.
   */
  tune(src: string | null, volume = 0.3): void {
    this.stationSrc = src
    this.stationVolume = volume
    if (!src) {
      this.station?.pause()
      return
    }
    if (!this.unlocked || !pref.enabled) return
    if (!this.station) {
      this.station = new Audio()
      this.station.loop = true
      this.station.preload = 'none'
    }
    const abs = new URL(src, location.href).href
    if (this.station.src !== abs) this.station.src = src
    this.station.volume = volume
    void this.station.play().catch((err: unknown) => log.debug('audio: station', err))
  }

  /** What the radio is tuned to, and whether anything is actually coming out. */
  get stationPlaying(): boolean {
    return !!this.stationSrc && !!this.station && !this.station.paused
  }

  get tunedTo(): string | null {
    return this.stationSrc
  }

  /** Called when the mute preference changes. */
  syncPreference(): void {
    if (!pref.enabled) {
      this.ambient?.pause()
      this.station?.pause()
      for (const el of this.cache.values()) el.pause()
      return
    }
    this.unlocked = true
    if (this.ambientOn) this.toggleAmbient(true)
    if (this.stationSrc) this.tune(this.stationSrc, this.stationVolume)
  }

  /** The tab went away: nothing keeps playing to an empty room. */
  onHidden(hidden: boolean): void {
    if (hidden) {
      this.station?.pause()
      this.ambient?.pause()
    } else if (pref.enabled && this.unlocked) {
      if (this.stationSrc) this.tune(this.stationSrc, this.stationVolume)
      if (this.ambientOn) this.toggleAmbient(true)
    }
  }
}

export const audio = new AudioManager()
// One subscription for the life of the page: the preference is the switch.
pref.subscribe(() => audio.syncPreference())
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => audio.onHidden(document.hidden))
}
