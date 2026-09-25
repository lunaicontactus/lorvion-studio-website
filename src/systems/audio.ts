/**
 * One player for the whole site.
 *
 * Components ask for a sound by name; they never construct Audio themselves, so
 * there is a single place that respects the mute preference, a single place
 * that knows browsers will not play anything before a gesture, and no risk of a
 * dozen elements decoding the same file.
 *
 * Three kinds of sound:
 *   effects   one element per clip, restarted rather than stacked, so a clip
 *             can never play over itself;
 *   music     one owner at a time (src/systems/musicOwner.ts): the garage's
 *             own song, the radio's station, or the world's (the playground,
 *             the archive, a game). Whatever is going out is silent before
 *             the next comes in;
 *   loops     the air of a place and the music box's tune, under the music.
 *
 * WORLD 2.4: the radio and the site's sound switch are two switches. Sound
 * on with the radio off is the garage's own song; the radio's knob takes the
 * song down and out and puts its station on, and off again brings the song
 * back where it was. The room has no separate "tone": the file that used to
 * hum under everything (ambient.m4a) is a tonal track, and it was the second
 * song the studio kept hearing under the radio. It is NIGHT 91.7 on the dial
 * now, and nothing else.
 *
 * Nothing is fetched until it is first needed, and nothing plays before a
 * gesture.
 */
import { sound as pref } from '@/systems/sound'
import { save } from '@/systems/storage'
import { STATIONS, type StationId } from '@/data/garage/radio'
import { HANDS, ownerFor, type MusicOwner, type WorldOwner } from '@/systems/musicOwner'
import { log } from '@/systems/log'

const SFX = '/assets/audio'

/** The garage's own song, and its level in the room. */
export const GARAGE_TRACK = `${SFX}/music/garage.m4a`
const GARAGE_VOLUME = 0.34
/** What the radio plays the first time it is switched on. */
const DEFAULT_STATION: StationId = 'night'

/**
 * Every effect on the site is one the studio chose and delivered (WORLD 2.1,
 * PHASE B): nothing generic, nothing doubled. A thing with no sound of its own
 * is silent, which is better than a borrowed click.
 */
const CLIPS = {
  // The objects, at the moment they react.
  pc_on: `${SFX}/sfx/pc_on.m4a`,
  pc_click: `${SFX}/sfx/pc_click.m4a`,
  tv_channel: `${SFX}/sfx/tv_channel.m4a`,
  fridge_open: `${SFX}/sfx/fridge_open.m4a`,
  drawer_open: `${SFX}/sfx/drawer_open.m4a`,
  paper: `${SFX}/sfx/paper.m4a`,
  radio_tune: `${SFX}/sfx/radio_tune.m4a`,
  door_open: `${SFX}/sfx/door_open.m4a`,
  shutter_open: `${SFX}/sfx/shutter_open.m4a`,
  // The room living.
  broom: `${SFX}/sfx/broom.m4a`,
  crew_step: `${SFX}/sfx/crew_step_01.m4a`,
  // MOMO running in the parcel game (WORLD 2.4), one footfall at a time at
  // the walk's own cadence. The studio's crew footstep stands in until the
  // running sound it has made is pointed at (docs/WORLD_2_4.md).
  run_step: `${SFX}/sfx/crew_step_01.m4a`,
  // The games and the archive.
  game_start: `${SFX}/sfx/game_start.m4a`,
  game_fail: `${SFX}/sfx/game_fail.m4a`,
  star_get: `${SFX}/sfx/star_get.m4a`,
  secret_unlock: `${SFX}/sfx/secret_unlock.m4a`,
  lantern: `${SFX}/sfx/lantern.m4a`,
  stall_bell: `${SFX}/sfx/stall_bell.m4a`,
  // WORLD 2.1: YOMI's snack (the first, loud bite of the delivered eating
  // sound, and its small second bite), and POKO turning round and getting up.
  eat: `${SFX}/sfx/eat.m4a`,
  eat_soft: `${SFX}/sfx/eat_soft.m4a`,
  poko_turn: `${SFX}/sfx/poko_turn.m4a`,
  poko_step: `${SFX}/sfx/poko_step.m4a`,
} as const

/** Loops that are not music: the air of a place, and the music box's tune. */
export const LOOPS = {
  alley: `${SFX}/ambience/alley.m4a`,
  playground: `${SFX}/ambience/playground_night.m4a`,
  musicBox: `${SFX}/music/music_box.m4a`,
} as const

export type ClipName = keyof typeof CLIPS

interface Hand {
  /** The one sounding goes down and out over this long. */
  readonly outMs: number
  /** The next comes up over this long, after `delay`. */
  readonly inMs: number
  readonly delay?: number
}

class AudioManager {
  private cache = new Map<string, HTMLAudioElement>()
  /** Nothing plays before the visitor has interacted; browsers refuse anyway. */
  private unlocked = false
  /** Inside the garage. */
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

  // ── Music: the players ──────────────────────────────────────────────────
  /** The garage's own song. One element for its life, so it resumes where it was. */
  private bgm: HTMLAudioElement | null = null
  /** The radio: one element, retuned. */
  private stream: HTMLAudioElement | null = null
  /** The world's: the playground's, the archive's, a game's. */
  private world: HTMLAudioElement | null = null
  /** World elements on their way out after a change of track. */
  private retired = new Set<HTMLAudioElement>()

  private radioIsOn = save.data.radioOn
  private stationId: StationId | null = null
  private stationSrc: string | null = null
  private stationVolume = 0.3

  private worldOwner: WorldOwner | null = null
  private worldSrc: string | null = null
  private worldVolume = 0.3
  /** How far the world's music is stepped back under something (the music box). */
  private worldDim = 1

  /** Files fetched ahead of a door, so the crossing does not wait on the network. */
  private warmed = new Map<string, HTMLAudioElement>()

  /** Every element that is music. */
  private players(): HTMLAudioElement[] {
    const out: HTMLAudioElement[] = []
    for (const el of [this.bgm, this.stream, this.world, ...this.retired]) if (el) out.push(el)
    return out
  }

  /** Who the music belongs to right now — never more than one. */
  get musicOwner(): MusicOwner {
    return ownerFor({ inRoom: this.inRoom, radioOn: this.radioIsOn, world: this.worldOwner })
  }

  /** The music sounding right now — never more than one. For the tests. */
  get musicSounding(): readonly string[] {
    return this.players()
      .filter((el) => !el.paused)
      .map((el) => el.currentSrc || el.src)
  }

  /**
   * Make `el` the one music sounding. Whatever else is sounding goes down
   * and out over `outMs` (paused where it is, so it can come back from
   * there), and only then `el` comes up over `inMs`. Already sounding, with
   * the same file: only its level, nothing restarts. `prepare` runs just
   * before the start — the station's source swap, so a track never cuts
   * another on the same element.
   */
  private switchTo(el: HTMLAudioElement, volume: number, hand: Hand, src?: string): void {
    const abs = src ? new URL(src, location.href).href : null
    const same = !abs || el.src === abs
    if (!el.paused && same) {
      this.pending++
      if (!this.ramps.has(el)) el.volume = volume
      for (const o of this.players()) if (o !== el && !o.paused) this.ramp(o, 0, hand.outMs, true)
      return
    }
    let wait = 0
    for (const o of this.players()) {
      if (o === el && same) continue
      if (o.paused) continue
      this.ramp(o, 0, hand.outMs, true)
      wait = Math.max(wait, hand.outMs + 20)
    }
    this.after(wait, () => {
      if (abs && el.src !== abs) el.src = src!
      if (hand.inMs > 0 || (hand.delay ?? 0) > 0) this.fadeUp(el, volume, hand.inMs, hand.delay ?? 0)
      else {
        const r = this.ramps.get(el)
        if (r !== undefined) cancelAnimationFrame(r)
        this.ramps.delete(el)
        el.volume = volume
      }
      void el.play().catch((err: unknown) => log.debug('audio: music', err))
      for (const r of this.retired) if (r.paused) this.retired.delete(r)
    })
  }

  /** Everything that is music, down and out over `ms` (0: at once). */
  private silence(ms: number): void {
    this.pending++
    for (const el of this.players()) {
      if (el.paused) continue
      if (ms > 0) this.ramp(el, 0, ms, true)
      else {
        const r = this.ramps.get(el)
        if (r !== undefined) cancelAnimationFrame(r)
        this.ramps.delete(el)
        el.pause()
      }
    }
  }

  // ── The room ───────────────────────────────────────────────────────────

  /**
   * The visitor came into the garage. If sound is on, the room's song comes
   * on with them — or the radio's station, if the radio was left on. If
   * sound is off, the same happens the moment it is turned on.
   *
   * With `fade` (PHASE 7) the music comes up over that many milliseconds,
   * after `after`: no hard start under the door.
   */
  enterRoom(fade: { readonly music: number; readonly after: number } | null = null): void {
    this.inRoom = true
    this.fadeIn = fade
    this.reconcile()
  }

  /** Out through the shutter, or a door: the room's music stays in the room, where it was. */
  leaveRoom(fadeMs = 0): void {
    this.inRoom = false
    this.fadeIn = null
    this.pending++
    for (const el of [this.bgm, this.stream]) {
      if (!el || el.paused) continue
      if (fadeMs > 0) this.ramp(el, 0, fadeMs, true)
      else el.pause()
    }
  }

  /** The garage's own song, from where it left off. */
  private playGarage(hand: Hand): void {
    if (!this.unlocked || !pref.enabled || !this.inRoom) return
    if (!this.bgm) {
      this.bgm = new Audio()
      this.bgm.loop = true
      this.bgm.preload = 'auto'
      this.bgm.src = GARAGE_TRACK
    }
    this.switchTo(this.bgm, GARAGE_VOLUME, hand)
  }

  // ── The radio: its own switch, one station at a time ────────────────────

  /** Whether the radio is on. Sound off with the radio on is a radio waiting. */
  get radioOn(): boolean {
    return this.radioIsOn
  }

  /** The station on the dial, by name. */
  get station(): StationId | null {
    return this.stationId ?? (STATIONS.some((s) => s.id === save.data.radioStation) ? (save.data.radioStation as StationId) : null)
  }

  get tunedTo(): string | null {
    return this.stationSrc
  }

  /** Whether anything is actually coming out of the radio. */
  get stationPlaying(): boolean {
    if (!this.radioIsOn || !this.stationSrc) return false
    const el = this.stationSrc === GARAGE_TRACK ? this.bgm : this.stream
    return !!el && !el.paused
  }

  /**
   * The knob. On: the power sound, once, then the garage's song down and
   * out, then the station up — the station asked for, or the one it was
   * left on. Off: the station down and out, then the song back from where
   * it was. Nothing crosses; nothing restarts that need not.
   */
  setRadio(on: boolean, station?: StationId): void {
    const was = this.radioIsOn
    this.radioIsOn = on
    save.update((d) => {
      d.radioOn = on
    })
    if (on) {
      const id = station ?? this.station ?? DEFAULT_STATION
      const st = STATIONS.find((s) => s.id === id) ?? STATIONS[1]!
      this.stationId = st.id
      this.stationSrc = st.track
      this.stationVolume = st.volume
      save.update((d) => {
        d.radioStation = st.id
      })
      if (!this.inRoom || !this.unlocked || !pref.enabled) return
      if (!was) this.play('radio_tune', 0.22)
      this.tune(st.track, st.volume, { outMs: HANDS.garageOut, inMs: HANDS.radioIn })
      return
    }
    if (!this.inRoom || !this.unlocked || !pref.enabled) return
    this.playGarage({ outMs: HANDS.radioOut, inMs: HANDS.garageIn })
  }

  /**
   * Put a track on the air: the one sounding down first, then this one up.
   * GARAGE 88.1 is the room's own song, on its own element: on that station
   * the radio is simply where the song is coming from, and nothing restarts.
   */
  private tune(src: string | null, volume: number, hand: Hand): void {
    if (!src) return
    if (!this.unlocked || !pref.enabled || !this.inRoom) return
    if (src === GARAGE_TRACK) {
      if (!this.bgm) {
        this.bgm = new Audio()
        this.bgm.loop = true
        this.bgm.preload = 'auto'
        this.bgm.src = GARAGE_TRACK
      }
      this.switchTo(this.bgm, volume, hand)
      return
    }
    if (!this.stream) {
      this.stream = new Audio()
      this.stream.loop = true
      this.stream.preload = 'auto'
    }
    this.switchTo(this.stream, volume, hand, src)
  }

  /** Tune by name, and remember it for next time. The radio must be on. */
  tuneStation(id: StationId): void {
    const st = STATIONS.find((s) => s.id === id)
    if (!st) return
    this.stationId = st.id
    this.stationSrc = st.track
    this.stationVolume = st.volume
    save.update((d) => {
      d.radioStation = st.id
    })
    if (!this.radioIsOn) return
    this.tune(st.track, st.volume, { outMs: HANDS.stationOut, inMs: HANDS.stationIn })
  }

  /** Put the room's music where the state says it should be. */
  private reconcile(): void {
    if (!this.inRoom || !this.unlocked || !pref.enabled) return
    const f = this.fadeIn
    this.fadeIn = null
    const hand: Hand = { outMs: HANDS.world, inMs: f?.music ?? 0, delay: f?.after ?? 0 }
    if (this.radioIsOn) {
      const st = STATIONS.find((s) => s.id === (this.stationId ?? this.station ?? DEFAULT_STATION)) ?? STATIONS[1]!
      this.stationId = st.id
      this.stationSrc = st.track
      this.stationVolume = st.volume
      this.tune(st.track, st.volume, hand)
    } else this.playGarage(hand)
  }

  // ── The world outside (PHASE 8/9) ───────────────────────────────────────

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
   * A world's music, looping, up from silence over `fadeMs` (0 for at once),
   * once whatever was sounding has gone out. Another track while one is
   * playing: the old one goes out on its own element and the new one comes
   * up on a fresh one (the warmed element, if the file was fetched ahead),
   * one after the other. Same track: nothing is restarted.
   */
  playWorld(src: string, volume: number, fadeMs = 0, owner: WorldOwner = 'playground'): void {
    this.worldSrc = src
    this.worldVolume = volume
    this.worldOwner = owner
    if (!this.unlocked || !pref.enabled) return
    const abs = new URL(src, location.href).href
    let el = this.world
    if (el && el.src !== abs) {
      if (!el.paused) this.retired.add(el)
      else el.pause()
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
    this.switchTo(el, volume * this.worldDim, { outMs: HANDS.world, inMs: fadeMs })
  }

  /** Down and out over `fadeMs`. */
  stopWorld(fadeMs = 0): void {
    this.worldOwner = null
    this.pending++
    for (const el of [this.world, ...this.retired]) {
      if (!el || el.paused) continue
      if (fadeMs > 0) this.ramp(el, 0, fadeMs, true)
      else el.pause()
    }
  }

  get worldPlaying(): boolean {
    return !!this.worldOwner && !!this.world && !this.world.paused
  }

  /**
   * Hold the world's music lower (a fraction of its level) until asked back
   * to 1: the music box plays its tune over the archive's song, not beside
   * it; the sky through the telescope is a little quieter.
   */
  dimWorld(factor: number, ms = 600): void {
    this.worldDim = Math.max(0, Math.min(1, factor))
    if (this.world && !this.world.paused) this.ramp(this.world, this.worldVolume * this.worldDim, ms)
  }

  // ── Loops that are not music (WORLD 2.1) ────────────────────────────────
  private loops = new Map<string, { el: HTMLAudioElement; src: string; volume: number; on: boolean }>()

  /**
   * Start a loop under the music — the air of a place, the music box's tune —
   * up from silence over `fadeMs`. One element per key; asking again for the
   * same file only changes its level.
   */
  loop(key: string, src: string, volume: number, fadeMs = 0): void {
    let l = this.loops.get(key)
    if (!l) {
      const el = new Audio()
      el.loop = true
      el.preload = 'auto'
      l = { el, src: '', volume, on: false }
      this.loops.set(key, l)
    }
    l.src = src
    l.volume = volume
    l.on = true
    if (!this.unlocked || !pref.enabled) return
    const abs = new URL(src, location.href).href
    if (l.el.src !== abs) l.el.src = src
    if (!l.el.paused) {
      if (!this.ramps.has(l.el)) l.el.volume = volume
      return
    }
    if (fadeMs > 0) this.fadeUp(l.el, volume, fadeMs)
    else {
      const r = this.ramps.get(l.el)
      if (r !== undefined) cancelAnimationFrame(r)
      this.ramps.delete(l.el)
      l.el.volume = volume
    }
    void l.el.play().catch((err: unknown) => log.debug('audio: loop', key, err))
  }

  /** The loop down and out over `fadeMs`. */
  unloop(key: string, fadeMs = 0): void {
    const l = this.loops.get(key)
    if (!l) return
    l.on = false
    if (fadeMs > 0 && !l.el.paused) this.ramp(l.el, 0, fadeMs, true)
    else l.el.pause()
  }

  loopPlaying(key: string): boolean {
    const l = this.loops.get(key)
    return !!l && l.on && !l.el.paused
  }

  /**
   * Step the music back for a moment (about −4 dB) so a cue can be heard
   * over it, and bring it back.
   */
  duck(ms = 1200): void {
    const el = this.players().find((p) => !p.paused) ?? null
    if (!el) return
    const full = el === this.world ? this.worldVolume * this.worldDim : el === this.bgm ? (this.radioIsOn && this.stationSrc === GARAGE_TRACK ? this.stationVolume : GARAGE_VOLUME) : this.stationVolume
    this.ramp(el, full * 0.6, 160)
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
  private fadeIn: { readonly music: number; readonly after: number } | null = null
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

  /** A start asked for later; a newer ask cancels it. */
  private pending = 0

  /**
   * Run `fn` once `ms` have passed, unless another start has been asked for
   * since — so a handoff that was overtaken never starts a stale player.
   */
  private after(ms: number, fn: () => void): void {
    const token = ++this.pending
    if (ms <= 0) {
      fn()
      return
    }
    const t0 = performance.now()
    const wait = (): void => {
      if (token !== this.pending) return
      if (performance.now() - t0 < ms) {
        requestAnimationFrame(wait)
        return
      }
      fn()
    }
    requestAnimationFrame(wait)
  }

  // ── The switch, and the tab ────────────────────────────────────────────

  /**
   * Called when the site's sound preference changes. Off: everything stops
   * where it is. On: whatever the state says is on plays again — the room's
   * song or the radio's station inside, the world's music outside. The
   * radio's power sound belongs to the radio's own knob (`setRadio`), not to
   * this switch, and not to the tab coming back.
   */
  syncPreference(): void {
    if (!pref.enabled) {
      this.silence(0)
      for (const el of this.cache.values()) el.pause()
      for (const l of this.loops.values()) l.el.pause()
      return
    }
    this.unlocked = true
    this.resume()
  }

  /** Sound came back (the switch, or the tab): what the state says is on, again. */
  private resume(): void {
    if (this.worldOwner && this.worldSrc) this.playWorld(this.worldSrc, this.worldVolume, 0, this.worldOwner)
    else this.reconcile()
    for (const [key, l] of this.loops) if (l.on && l.src) this.loop(key, l.src, l.volume)
  }

  /** The tab went away: nothing keeps playing to an empty room. */
  onHidden(hidden: boolean): void {
    if (hidden) {
      this.silence(0)
      for (const l of this.loops.values()) l.el.pause()
      // And whatever short sound was mid-air: a footstep does not finish
      // in a tab nobody is looking at.
      for (const el of this.cache.values()) el.pause()
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
