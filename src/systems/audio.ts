/**
 * One player for the whole site.
 *
 * Components ask for a sound by name; they never construct Audio themselves, so
 * there is a single place that respects the mute preference, a single place
 * that knows browsers will not play anything before a gesture, and no risk of a
 * dozen elements decoding the same file.
 *
 * Three kinds of sound, three players (PHASE 6):
 *   effects   one element per clip, restarted rather than stacked, so a clip
 *             can never play over itself;
 *   the room  the garage's tone, looping while the visitor is inside;
 *   the radio one station stream, which is also the garage's music: the
 *             room tunes it to GARAGE when sound comes on inside, and the
 *             radio in the corner is the same dial.
 *
 * The mute switch in the nav and the power knob on the radio are one
 * preference (src/systems/sound.ts): whichever is used, this reacts. Nothing
 * is fetched until it is first needed, and nothing plays before a gesture.
 */
import { sound as pref } from '@/systems/sound'
import { save } from '@/systems/storage'
import { STATIONS, type StationId } from '@/data/garage/radio'
import { log } from '@/systems/log'

const SFX = '/assets/audio'

/** The room at night. Also NIGHT 91.7 on the radio, which is the same file. */
const ROOM_TONE = `${SFX}/ambient.m4a`
const ROOM_TONE_VOLUME = 0.16

const CLIPS = {
  click: `${SFX}/click.m4a`,
  door: `${SFX}/door.m4a`,
  drawer: `${SFX}/drawer.m4a`,
  bell: `${SFX}/bell.m4a`,
  discovery: `${SFX}/discovery.m4a`,
  keyboard: `${SFX}/keyboard.m4a`,
  surprise: `${SFX}/surprise.m4a`,
  wrapper: `${SFX}/wrapper.m4a`,
  // The objects, at the moment they react (the user's own effects, PHASE 5).
  pc_on: `${SFX}/sfx/pc_on.m4a`,
  pc_click: `${SFX}/sfx/pc_click.m4a`,
  tv_channel: `${SFX}/sfx/tv_channel.m4a`,
  fridge_open: `${SFX}/sfx/fridge_open.m4a`,
  drawer_open: `${SFX}/sfx/drawer_open.m4a`,
  paper: `${SFX}/sfx/paper.m4a`,
  radio_tune: `${SFX}/sfx/radio_tune.m4a`,
  door_open: `${SFX}/sfx/door_open.m4a`,
  shutter_open: `${SFX}/sfx/shutter_open.m4a`,
  // The room living (PHASE 6).
  broom: `${SFX}/sfx/broom.m4a`,
  crew_step: `${SFX}/sfx/crew_step_01.m4a`,
  // The games and the archive, for the phases after this one.
  game_start: `${SFX}/sfx/game_start.m4a`,
  game_fail: `${SFX}/sfx/game_fail.m4a`,
  star_get: `${SFX}/sfx/star_get.m4a`,
  secret_unlock: `${SFX}/sfx/secret_unlock.m4a`,
  lantern: `${SFX}/sfx/lantern.m4a`,
  stall_bell: `${SFX}/sfx/stall_bell.m4a`,
} as const

export type ClipName = keyof typeof CLIPS

class AudioManager {
  private cache = new Map<string, HTMLAudioElement>()
  private ambient: HTMLAudioElement | null = null
  private ambientOn = false
  /** Nothing plays before the visitor has interacted; browsers refuse anyway. */
  private unlocked = false
  /** Inside the garage: the room's tone and its station belong on. */
  private inRoom = false

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

  // ── The room ───────────────────────────────────────────────────────────

  /**
   * The visitor came into the garage. If sound is on, the room's tone comes
   * on with them and the radio plays what it was left on — its own station,
   * the first time. If sound is off, the same happens the moment it is
   * turned on, from either switch.
   */
  enterRoom(): void {
    this.inRoom = true
    this.ambientOn = true
    this.reconcile()
  }

  /** Out through the shutter: the room's sound stays in the room. */
  leaveRoom(): void {
    this.inRoom = false
    this.ambientOn = false
    this.ambient?.pause()
    this.stream?.pause()
  }

  /**
   * Looping room tone. Fetches the track the first time it is switched on.
   * The radio's 91.7 NIGHT station plays the same file through `tune`, and
   * while it does, this one stays quiet: one file, one player.
   */
  toggleAmbient(on: boolean, volume = ROOM_TONE_VOLUME): void {
    this.ambientOn = on
    if (!on) {
      this.ambient?.pause()
      return
    }
    if (!this.unlocked || !pref.enabled) return
    if (this.stationSrc === ROOM_TONE && this.stream && !this.stream.paused) {
      this.ambient?.pause()
      return
    }
    if (!this.ambient) {
      this.ambient = new Audio(ROOM_TONE)
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
  private stream: HTMLAudioElement | null = null
  private stationSrc: string | null = null
  private stationVolume = 0.3
  private stationId: StationId | null = null

  /**
   * Tune the one station stream to a looping track, or to nothing. There is
   * only ever one element: tuning replaces its source rather than starting a
   * second player, so switching stations quickly cannot stack audio.
   */
  tune(src: string | null, volume = 0.3): void {
    this.stationSrc = src
    this.stationVolume = volume
    if (!src) {
      this.stream?.pause()
      this.toggleAmbient(this.ambientOn)
      return
    }
    if (!this.unlocked || !pref.enabled) return
    if (!this.stream) {
      this.stream = new Audio()
      this.stream.loop = true
      this.stream.preload = 'none'
    }
    const abs = new URL(src, location.href).href
    if (this.stream.src !== abs) this.stream.src = src
    this.stream.volume = volume
    void this.stream.play().catch((err: unknown) => log.debug('audio: station', err))
    // NIGHT is the room's own tone: while it is on the dial the room does
    // not also hum it underneath.
    this.toggleAmbient(this.ambientOn)
  }

  /** Tune by name, and remember it for next time. */
  tuneStation(id: StationId | null): void {
    const st = id ? STATIONS.find((s) => s.id === id) : undefined
    this.stationId = st?.id ?? null
    save.update((d) => {
      d.radioStation = this.stationId
    })
    this.tune(st?.track ?? null, st?.volume)
  }

  /** What the radio is tuned to, and whether anything is actually coming out. */
  get stationPlaying(): boolean {
    return !!this.stationSrc && !!this.stream && !this.stream.paused
  }

  get tunedTo(): string | null {
    return this.stationSrc
  }

  /** The station on the dial, by name. */
  get station(): StationId | null {
    return this.stationId
  }

  /** Put the room's sound where the state says it should be. */
  private reconcile(): void {
    if (!this.inRoom || !this.unlocked || !pref.enabled) return
    if (!this.stationId) {
      const saved = save.data.radioStation
      const id = STATIONS.some((s) => s.id === saved) ? (saved as StationId) : 'garage'
      this.tuneStation(id)
    } else if (this.stationSrc) {
      this.tune(this.stationSrc, this.stationVolume)
    }
    this.toggleAmbient(this.ambientOn)
  }

  /** Called when the mute preference changes. */
  syncPreference(): void {
    if (!pref.enabled) {
      this.ambient?.pause()
      this.stream?.pause()
      for (const el of this.cache.values()) el.pause()
      return
    }
    this.unlocked = true
    this.reconcile()
    if (!this.inRoom && this.stationSrc) this.tune(this.stationSrc, this.stationVolume)
  }

  /** The tab went away: nothing keeps playing to an empty room. */
  onHidden(hidden: boolean): void {
    if (hidden) {
      this.stream?.pause()
      this.ambient?.pause()
    } else if (pref.enabled && this.unlocked) {
      this.reconcile()
      if (!this.inRoom && this.stationSrc) this.tune(this.stationSrc, this.stationVolume)
    }
  }
}

export const audio = new AudioManager()
// One subscription for the life of the page: the preference is the switch.
pref.subscribe(() => audio.syncPreference())
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => audio.onHidden(document.hidden))
}
