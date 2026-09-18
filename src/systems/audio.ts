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
  /** The level the tone was last asked for: the room's, or lower elsewhere. */
  private ambientVolume = ROOM_TONE_VOLUME
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
   *
   * With `fade` (PHASE 7) the tone comes up over that many milliseconds and
   * the music follows it, a little later and a little longer: the room's air
   * first, its song under it, and no hard start on either.
   */
  enterRoom(fade: { readonly tone: number; readonly music: number; readonly musicAfter: number } | null = null): void {
    this.inRoom = true
    this.ambientOn = true
    this.fadeIn = fade
    this.reconcile()
  }

  /** Out through the shutter: the room's sound stays in the room. */
  leaveRoom(fadeMs = 0): void {
    this.inRoom = false
    this.ambientOn = false
    this.fadeIn = null
    if (fadeMs > 0) {
      if (this.ambient) this.ramp(this.ambient, 0, fadeMs, true)
      if (this.stream) this.ramp(this.stream, 0, fadeMs, true)
      return
    }
    this.ambient?.pause()
    this.stream?.pause()
  }

  // ── The world outside (PHASE 8/9) ───────────────────────────────────────
  private world: HTMLAudioElement | null = null
  private worldSrc: string | null = null
  private worldVolume = 0.3
  private worldOn = false

  /** Files fetched ahead of a door, so the crossing does not wait on the network. */
  private warmed = new Map<string, HTMLAudioElement>()

  /**
   * Fetch a world's music ahead of the door. On its own element, never the
   * player's — swapping the player's source would cut whatever is playing —
   * so the bytes are in the cache when the player asks for them. Only on
   * intent, only once per file.
   */
  preloadWorld(src: string): void {
    if (this.warmed.has(src)) return
    const el = new Audio()
    el.preload = 'auto'
    el.src = src
    el.load()
    this.warmed.set(src, el)
  }

  /**
   * A world's music, looping, up from silence over `fadeMs` (0 for at once).
   *
   * Another track while one is playing is a crossfade (PHASE 14): the one
   * playing goes down on its own element while the new one comes up on a
   * fresh one (the warmed element, if the file was fetched ahead), so no
   * track is ever cut by a source swap. Same track: nothing is restarted.
   */
  playWorld(src: string, volume: number, fadeMs = 0): void {
    this.worldSrc = src
    this.worldVolume = volume
    this.worldOn = true
    if (!this.unlocked || !pref.enabled) return
    const abs = new URL(src, location.href).href
    let el = this.world
    if (el && el.src !== abs) {
      if (!el.paused && fadeMs > 0) this.ramp(el, 0, Math.min(fadeMs, 700), true)
      else {
        const r = this.ramps.get(el)
        if (r !== undefined) cancelAnimationFrame(r)
        this.ramps.delete(el)
        el.pause()
      }
      el = null
    }
    if (!el) {
      el = this.warmed.get(src) ?? new Audio()
      this.warmed.delete(src)
      el.loop = true
      el.preload = 'auto'
      if (el.src !== abs) el.src = src
      this.world = el
    }
    if (fadeMs > 0) this.fadeUp(el, volume, fadeMs)
    else {
      const r = this.ramps.get(el)
      if (r !== undefined) cancelAnimationFrame(r)
      this.ramps.delete(el)
      el.volume = volume
    }
    void el.play().catch((err: unknown) => log.debug('audio: world', err))
  }

  /** Down and out over `fadeMs`. */
  stopWorld(fadeMs = 0): void {
    this.worldOn = false
    if (!this.world) return
    if (fadeMs > 0 && !this.world.paused) this.ramp(this.world, 0, fadeMs, true)
    else this.world.pause()
  }

  get worldPlaying(): boolean {
    return this.worldOn && !!this.world && !this.world.paused
  }

  /**
   * Step the music back for a moment (about −4 dB) so a cue can be heard
   * over it, then bring it back. Not a compressor: one dip, one recovery.
   */
  duck(ms = 1200): void {
    const el = this.world && !this.world.paused ? this.world : this.stream && !this.stream.paused ? this.stream : null
    if (!el) return
    const full = el === this.world ? this.worldVolume : this.stationVolume
    this.ramp(el, full * 0.62, 160)
    const t0 = performance.now()
    const back = (): void => {
      if (performance.now() - t0 < ms) {
        requestAnimationFrame(back)
        return
      }
      if (!el.paused) this.ramp(el, full, 600)
    }
    requestAnimationFrame(back)
  }

  // ── Fades ───────────────────────────────────────────────────────────────
  /** The fade asked for by `enterRoom`, spent by the first play after it. */
  private fadeIn: { readonly tone: number; readonly music: number; readonly musicAfter: number } | null = null
  private ramps = new Map<HTMLMediaElement, number>()

  /**
   * Move an element's volume to `to` over `ms`, on animation frames, and
   * pause it at the end if `thenPause`. A new ramp on the same element
   * replaces the old one, so a fade-out interrupted by a fade-in never
   * fights it.
   */
  private ramp(el: HTMLMediaElement, to: number, ms: number, thenPause = false): void {
    const old = this.ramps.get(el)
    if (old !== undefined) cancelAnimationFrame(old)
    const from = el.volume
    const t0 = performance.now()
    const tick = (): void => {
      const k = Math.min(1, (performance.now() - t0) / Math.max(ms, 1))
      el.volume = from + (to - from) * k
      if (k < 1) {
        this.ramps.set(el, requestAnimationFrame(tick))
        return
      }
      this.ramps.delete(el)
      if (thenPause) el.pause()
    }
    this.ramps.set(el, requestAnimationFrame(tick))
  }

  /** Start `el` at silence and bring it to `volume` over `ms`, after `delay`. */
  private fadeUp(el: HTMLMediaElement, volume: number, ms: number, delay = 0): void {
    const old = this.ramps.get(el)
    if (old !== undefined) cancelAnimationFrame(old)
    el.volume = 0
    if (delay > 0) {
      const t0 = performance.now()
      const wait = (): void => {
        if (performance.now() - t0 < delay) {
          this.ramps.set(el, requestAnimationFrame(wait))
          return
        }
        this.ramp(el, volume, ms)
      }
      this.ramps.set(el, requestAnimationFrame(wait))
      return
    }
    this.ramp(el, volume, ms)
  }

  /**
   * Looping room tone. Fetches the track the first time it is switched on.
   * The radio's 91.7 NIGHT station plays the same file through `tune`, and
   * while it does, this one stays quiet: one file, one player.
   */
  toggleAmbient(on: boolean, volume = ROOM_TONE_VOLUME): void {
    this.ambientOn = on
    this.ambientVolume = volume
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
    if (this.fadeIn) this.fadeUp(this.ambient, volume, this.fadeIn.tone)
    else {
      const r = this.ramps.get(this.ambient)
      if (r !== undefined) cancelAnimationFrame(r)
      this.ramps.delete(this.ambient)
      this.ambient.volume = volume
    }
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
    if (this.fadeIn) {
      this.fadeUp(this.stream, volume, this.fadeIn.music, this.fadeIn.musicAfter)
    } else {
      const r = this.ramps.get(this.stream)
      if (r !== undefined) cancelAnimationFrame(r)
      this.ramps.delete(this.stream)
      this.stream.volume = volume
    }
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
    // One fade per entrance, spent now that both players have had it:
    // retuning the radio afterwards is immediate.
    this.fadeIn = null
  }

  /** Called when the mute preference changes. */
  syncPreference(): void {
    if (!pref.enabled) {
      this.ambient?.pause()
      this.stream?.pause()
      this.world?.pause()
      for (const el of this.cache.values()) el.pause()
      return
    }
    this.unlocked = true
    this.resume()
  }

  /**
   * Sound came back (the switch, or the tab): whatever the state says is on
   * plays again. In the room that is the tone and the station; elsewhere
   * the world's music, and the tone too if it was on there (the archive
   * keeps the same night air, lower).
   */
  private resume(): void {
    this.reconcile()
    if (!this.inRoom && this.ambientOn) this.toggleAmbient(true, this.ambientVolume)
    if (this.worldOn && this.worldSrc) this.playWorld(this.worldSrc, this.worldVolume)
  }

  /** The tab went away: nothing keeps playing to an empty room. */
  onHidden(hidden: boolean): void {
    if (hidden) {
      this.stream?.pause()
      this.ambient?.pause()
      this.world?.pause()
    } else if (pref.enabled && this.unlocked) {
      this.resume()
    }
  }
}

export const audio = new AudioManager()
// One subscription for the life of the page: the preference is the switch.
pref.subscribe(() => audio.syncPreference())
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => audio.onHidden(document.hidden))
}
