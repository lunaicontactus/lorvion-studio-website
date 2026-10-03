/**
 * Four buses and a master (SITE UPGRADE PHASE F).
 *
 *   MASTER
 *   ├─ AMBIENT  the air of a place: the alley, the night outside
 *   ├─ MUSIC    one at a time: the garage's song, the radio, the world's, a game's, the music box
 *   ├─ SFX      things in the room and in the games
 *   └─ UI       the machines answering: the PC, the television, the radio's knob
 *
 * The players stay HTMLAudioElements (src/systems/audio.ts); this only
 * decides where each one's sound goes. Once the site's one AudioContext
 * exists (src/systems/sound.ts creates it when the visitor turns sound on),
 * every element is routed through its own gain, its bus and the master. Until
 * then — and wherever Web Audio is missing — the element's own volume carries
 * the bus and master levels.
 *
 * Why route at all: iOS Safari ignores `HTMLMediaElement.volume` (it reads
 * back 1 whatever is set), so on a phone every level in the site — the PC's
 * click at 0.3, the song at 0.34, every fade — was full volume. Measured on
 * desktop Chromium and WebKit, the element's volume is applied before the
 * graph, so there the element keeps its level exactly as before and its own
 * gain only carries what a volume cannot: a level above 1. Where the volume
 * is ignored, the element's gain carries all of it.
 */
export type Bus = 'ambient' | 'music' | 'sfx' | 'ui'
export const BUSES: readonly Bus[] = ['ambient', 'music', 'sfx', 'ui']

interface Graph {
  readonly ctx: AudioContext
  readonly master: GainNode
  readonly bus: Readonly<Record<Bus, GainNode>>
}

interface Routed {
  bus: Bus
  level: number
  gain: GainNode | null
}

export class Mixer {
  #gains: Record<Bus, number> = { ambient: 1, music: 1, sfx: 1, ui: 1 }
  #master = 1
  #graph: Graph | null = null
  #els = new Map<HTMLMediaElement, Routed>()
  /** Whether setting an element's volume does anything (not on iOS). */
  #volumeWorks: boolean | null = null

  /** The bus an element belongs to. Once, when the element is made. */
  assign(el: HTMLMediaElement, bus: Bus): void {
    const r = this.#els.get(el)
    if (r) {
      r.bus = bus
      return
    }
    this.#els.set(el, { bus, level: el.volume, gain: null })
    if (this.#graph) this.#connect(el)
  }

  /** The site's context exists now: route everything already made. */
  attach(ctx: AudioContext | null): void {
    if (!ctx || this.#graph?.ctx === ctx) return
    try {
      const master = ctx.createGain()
      master.connect(ctx.destination)
      const bus = {} as Record<Bus, GainNode>
      for (const b of BUSES) {
        bus[b] = ctx.createGain()
        bus[b].connect(master)
      }
      this.#graph = { ctx, master, bus }
      this.#applyGains()
      for (const el of this.#els.keys()) this.#connect(el)
    } catch {
      this.#graph = null
    }
  }

  get routed(): boolean {
    return this.#graph !== null
  }

  /** An element's own level (what the site used to write to `volume`). May exceed 1. */
  level(el: HTMLMediaElement, v: number): void {
    const r = this.#els.get(el)
    if (!r) {
      el.volume = clamp01(v)
      return
    }
    r.level = Math.max(0, v)
    this.#write(el, r)
  }

  /** The level last asked of an element. */
  levelOf(el: HTMLMediaElement): number {
    return this.#els.get(el)?.level ?? el.volume
  }

  setBus(bus: Bus, v: number): void {
    this.#gains[bus] = Math.max(0, v)
    this.#applyGains()
  }

  setMaster(v: number): void {
    this.#master = Math.max(0, v)
    this.#applyGains()
  }

  /** For the tests and the report. */
  snapshot(): { master: number; buses: Record<Bus, number>; routed: boolean; elements: Record<Bus, number> } {
    const elements = { ambient: 0, music: 0, sfx: 0, ui: 0 }
    for (const r of this.#els.values()) elements[r.bus]++
    return { master: this.#master, buses: { ...this.#gains }, routed: this.routed, elements }
  }

  /**
   * A listener on the master, for the PHASE F measurements (`?audiodebug`
   * only): what the site actually renders, after every gain. Made on request,
   * never otherwise.
   */
  tap(bus?: Bus): AnalyserNode | null {
    const g = this.#graph
    if (!g) return null
    const a = g.ctx.createAnalyser()
    a.fftSize = 4096
    ;(bus ? g.bus[bus] : g.master).connect(a)
    return a
  }

  /** Whether the site's context is rendering at all (mute suspends it). */
  get state(): AudioContextState | 'none' {
    return this.#graph?.ctx.state ?? 'none'
  }

  busOf(el: HTMLMediaElement): Bus | null {
    return this.#els.get(el)?.bus ?? null
  }

  #volumeIsHonoured(): boolean {
    if (this.#volumeWorks === null) {
      try {
        const probe = new Audio()
        probe.volume = 0.5
        this.#volumeWorks = Math.abs(probe.volume - 0.5) < 0.01
      } catch {
        this.#volumeWorks = true
      }
    }
    return this.#volumeWorks
  }

  #connect(el: HTMLMediaElement): void {
    const g = this.#graph
    const r = this.#els.get(el)
    if (!g || !r || r.gain) return
    try {
      const src = g.ctx.createMediaElementSource(el)
      const gain = g.ctx.createGain()
      src.connect(gain)
      gain.connect(g.bus[r.bus])
      r.gain = gain
    } catch {
      r.gain = null
    }
    this.#write(el, r)
  }

  #write(el: HTMLMediaElement, r: Routed): void {
    if (r.gain) {
      const vol = clamp01(r.level)
      if (this.#volumeIsHonoured()) {
        // The element keeps its level; its gain only carries what is above 1.
        el.volume = vol
        r.gain.gain.value = vol > 0 ? r.level / vol : 0
      } else {
        el.volume = 1
        r.gain.gain.value = r.level
      }
      return
    }
    // Not routed: the element's own volume is all there is.
    el.volume = clamp01(r.level * this.#gains[r.bus] * this.#master)
  }

  #applyGains(): void {
    const g = this.#graph
    if (g) {
      g.master.gain.value = this.#master
      for (const b of BUSES) g.bus[b].gain.value = this.#gains[b]
      return
    }
    for (const [el, r] of this.#els) this.#write(el, r)
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
