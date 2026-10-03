import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { Mixer, BUSES } from '@/systems/mixer'
import { AUDIO_ROLES, type AudioRole } from '@/data/audioRoles'
import { STATIONS } from '@/data/garage/radio'

/**
 * SITE UPGRADE PHASE F: one audio system. What goes wrong is a level that
 * means nothing on a phone, a file filed under the wrong bus because of its
 * name, two songs at once, and a correction pointing at a file that is gone.
 */

/** Enough of Web Audio to watch the routing. */
function fakeContext() {
  const made: { kind: string; gain: { value: number }; to: unknown[] }[] = []
  const node = (kind: string) => {
    const n = { kind, gain: { value: 1 }, to: [] as unknown[], connect(o: unknown) { n.to.push(o); return o } }
    made.push(n)
    return n
  }
  const ctx = {
    destination: { kind: 'destination' },
    createGain: () => node('gain'),
    createMediaElementSource: () => node('source'),
  }
  return { ctx: ctx as unknown as AudioContext, made }
}

/** An element whose volume is honoured (desktop) or ignored (iOS). */
function element(honoured: boolean): HTMLMediaElement {
  let v = 1
  return {
    get volume() { return v },
    set volume(x: number) { if (honoured) v = x },
  } as unknown as HTMLMediaElement
}

function withAudio(honoured: boolean, fn: () => void): void {
  const g = globalThis as Record<string, unknown>
  const had = g['Audio']
  g['Audio'] = function () { return element(honoured) }
  try { fn() } finally { g['Audio'] = had }
}

describe('the mixer: MASTER → AMBIENT · MUSIC · SFX · UI', () => {
  it('routes every element through its own gain, its bus and the master, once the site has a context', () => {
    withAudio(true, () => {
      const mix = new Mixer()
      const song = element(true)
      const click = element(true)
      mix.assign(song, 'music')
      mix.assign(click, 'ui')
      expect(mix.routed).toBe(false)
      const { ctx, made } = fakeContext()
      mix.attach(ctx)
      expect(mix.routed).toBe(true)
      // master + four buses + (source + gain) per element
      expect(made.filter((n) => n.kind === 'source')).toHaveLength(2)
      expect(made.filter((n) => n.kind === 'gain')).toHaveLength(1 + BUSES.length + 2)
      expect(mix.snapshot().elements).toEqual({ ambient: 0, music: 1, sfx: 0, ui: 1 })
    })
  })

  it('on a desk the element keeps its level; its gain carries only what is above 1', () => {
    withAudio(true, () => {
      const mix = new Mixer()
      const el = element(true)
      mix.assign(el, 'sfx')
      const { ctx, made } = fakeContext()
      mix.attach(ctx)
      const gain = made.filter((n) => n.kind === 'gain').at(-1)!
      mix.level(el, 0.3)
      expect(el.volume).toBeCloseTo(0.3)
      expect(gain.gain.value).toBeCloseTo(1)
      mix.level(el, 1.37)
      expect(el.volume).toBeCloseTo(1)
      expect(gain.gain.value).toBeCloseTo(1.37)
    })
  })

  it('where the volume is ignored (iOS), the gain carries all of it', () => {
    withAudio(false, () => {
      const mix = new Mixer()
      const el = element(false)
      mix.assign(el, 'music')
      const { ctx, made } = fakeContext()
      mix.attach(ctx)
      const gain = made.filter((n) => n.kind === 'gain').at(-1)!
      mix.level(el, 0.34)
      expect(gain.gain.value).toBeCloseTo(0.34)
    })
  })

  it('each bus and the master have their own gain', () => {
    withAudio(true, () => {
      const mix = new Mixer()
      const { ctx, made } = fakeContext()
      mix.attach(ctx)
      const [master, ...buses] = made
      mix.setBus('music', 0.5)
      mix.setMaster(0.8)
      expect(master!.gain.value).toBeCloseTo(0.8)
      expect(buses[BUSES.indexOf('music')]!.gain.value).toBeCloseTo(0.5)
      expect(buses[BUSES.indexOf('sfx')]!.gain.value).toBeCloseTo(1)
    })
  })

  it('without a context, the element volume carries the bus and the master', () => {
    withAudio(true, () => {
      const mix = new Mixer()
      const el = element(true)
      mix.assign(el, 'ambient')
      mix.level(el, 0.5)
      mix.setBus('ambient', 0.5)
      expect(el.volume).toBeCloseTo(0.25)
      mix.setMaster(0)
      expect(el.volume).toBe(0)
    })
  })
})

describe('every sound on the site has a role, from what it is, not what it is called', () => {
  const files = readFileSync('src/systems/audio.ts', 'utf8')

  it('the role table covers every audio file in the repository, and only real ones', () => {
    const tracked = new Set(Object.keys(AUDIO_ROLES))
    for (const f of tracked) expect(existsSync(`public${f}`), f).toBe(true)
    const onDisk = (readdirSync('public/assets/audio', { recursive: true }) as string[])
      .filter((f) => /\.(m4a|mp3|wav|ogg|oga|opus|webm|aac|flac)$/i.test(f))
      .map((f) => `/assets/audio/${f}`)
    expect([...tracked].sort()).toEqual(onDisk.sort())
    const counts = Object.values(AUDIO_ROLES).reduce<Record<AudioRole, number>>((a, r) => {
      a[r.role]++
      return a
    }, { AMBIENT: 0, MUSIC: 0, SFX: 0, UI: 0, UNUSED: 0, UNKNOWN: 0 })
    expect(counts.UNKNOWN, 'something is still unclassified').toBe(0)
  })

  it('the file named ambient is music, and is only ever a radio station', () => {
    expect(AUDIO_ROLES['/assets/audio/ambient.m4a']!.role).toBe('MUSIC')
    expect(STATIONS.find((s) => s.track === '/assets/audio/ambient.m4a')?.id).toBe('night')
    expect(files).not.toMatch(/LOOPS = \{[^}]*ambient\.m4a/)
  })

  it('nothing that is music is on the ambient bus, and the music box is music', () => {
    expect(files).toMatch(/musicBox: 'music'/)
    expect(files).toMatch(/alley: 'ambient', playground: 'ambient'/)
    for (const [f, r] of Object.entries(AUDIO_ROLES)) {
      if (r.role === 'AMBIENT') expect(f, f).toMatch(/\/ambience\//)
    }
  })

  it('every loudness correction points at a file that exists, and none is absurd', async () => {
    const { TRIM } = await import('@/systems/audio')
    for (const [f, k] of Object.entries(TRIM)) {
      expect(existsSync(`public${f}`), f).toBe(true)
      expect(k, f).toBeGreaterThan(0.2)
      expect(k, f).toBeLessThan(4.5)
    }
  })

  it('no sound on hover, anywhere', () => {
    for (const f of ['src/ui/panels.ts', 'src/scenes/garage.ts', 'src/app/world.ts', 'src/scenes/alley.ts']) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).not.toMatch(/(pointerenter|mouseenter|mouseover)[^\n]*\n?[^\n]*audio\.play/)
    }
  })
})

describe('the radio stations', () => {
  it('play only delivered files, on the MUSIC bus — no game gets a borrowed song', () => {
    for (const s of STATIONS) {
      if (!s.track) continue
      expect(existsSync(`public${s.track}`), s.id).toBe(true)
    }
    const names = STATIONS.map((s) => s.name).join(' ')
    expect(names).not.toMatch(/LUNAI|LIMINAL|WORM|LUMIORA|RUBATO/)
  })
})

