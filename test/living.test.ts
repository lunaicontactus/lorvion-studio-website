import { describe, expect, it } from 'vitest'
import { navFor } from '@/data/navigation'
import { behaviourFor } from '@/data/behaviour'
import { CHARACTERS } from '@/data/characters'
import { worldFor } from '@/data/world'
import { BROOM_ZONES, BROOM_ZONES_PORTRAIT } from '@/data/ambience'
import { Ambient, ATTENTION, STRONG_AT_ONCE } from '@/systems/ambient'
import { Broom, BROOM_MS, PLAN } from '@/systems/broom'
import { Footsteps } from '@/systems/footsteps'
import { CrewInteractions, type InteractionMember } from '@/systems/interactions'
import type { Waypoint } from '@/data/navigation'

/**
 * PHASE 6: the garage as somewhere five of them live.
 *
 * What is checked here is what a screenshot cannot show: that every place a
 * character is said to like is a place it can actually stand, that nothing
 * the room does by itself goes near what the visitor has open, that the
 * broom never comes out through anybody, and that the feet make a sound the
 * room can bear.
 */

const CREW = CHARACTERS.map((c) => c.id)

describe('the crew live somewhere', () => {
  const wide = navFor(false)

  it('every favourite thing has a place to stand in front of it', () => {
    for (const id of CREW) {
      for (const liked of behaviourFor(id).favours) {
        const spot = wide.points.find((p) => p.objectId === liked)
        expect(spot, `${id} likes ${liked} but nowhere stands in front of it`).toBeDefined()
      }
    }
  })

  it('each of them likes something different, and nobody is fixed to one thing', () => {
    const lists = CREW.map((id) => behaviourFor(id).favours.join(','))
    expect(new Set(lists).size, 'two of them have the same tastes').toBe(lists.length)
    // A preference, not a post: wandering stays possible for everyone.
    for (const id of CREW) expect(behaviourFor(id).wander, `${id} never wanders`).toBeGreaterThan(0)
  })

  it('everybody starts somewhere that exists', () => {
    for (const id of CREW) {
      const home = behaviourFor(id).home
      const found = wide.points.some((p) => p.id === home) || wide.sits.some((p) => p.id === home)
      expect(found, `${id}'s home '${home}' is not a place`).toBe(true)
    }
  })

  for (const portrait of [false, true]) {
    const graph = navFor(portrait)
    const layout = worldFor(portrait)
    const where = portrait ? 'portrait' : 'landscape'
    const placed = layout.objects.filter((o) => o.art)
    const half = 56

    it(`${where}: nobody stands or sits on the radio or the parcel`, () => {
      // The figure is about 110 wide over its feet and 160 tall above them
      // (110 sitting). Standing behind a box on the floor is fine — the
      // parcel is looked at from behind, and its box hides the feet — but a
      // place where the thing in front covers most of the body is a place
      // inside it, which is where the old rug seat put whoever sat there.
      for (const p of [...graph.points.map((q) => ({ ...q, seated: false })), ...graph.sits.map((q) => ({ ...q, seated: true }))]) {
        for (const o of placed) {
          const r = o.rect
          const across = p.x > r.x - half * 0.3 && p.x < r.x + r.w + half * 0.3
          const behind = p.y > r.y && p.y <= r.y + r.h + 8
          if (!across || !behind) continue
          const hidden = Math.max(0, p.y - r.y) / (p.seated ? 110 : 160)
          expect(hidden, `${p.id} (${p.x},${p.y}) is inside the ${o.id}`).toBeLessThan(0.4)
        }
      }
    })

    it(`${where}: the broom's stretches are on the floor and off the furniture`, () => {
      for (const z of portrait ? BROOM_ZONES_PORTRAIT : BROOM_ZONES) {
        expect(z.x1 - z.x0, z.id).toBeGreaterThan(60)
        expect(z.y, z.id).toBeGreaterThanOrEqual(graph.floor.top)
        expect(z.y, z.id).toBeLessThanOrEqual(layout.floor.bottom)
        for (const o of placed) {
          const r = o.rect
          // Only things on the same floor: the portrait plate has two.
          if (Math.abs(r.y + r.h - z.y) > 200) continue
          const clear = z.x1 + 40 <= r.x || z.x0 - 40 >= r.x + r.w
          expect(clear, `broom stretch ${z.id} runs over the ${o.id}`).toBe(true)
        }
      }
    })
  }
})

describe('the broom', () => {
  const zones = BROOM_ZONES
  const paints: (string | null)[] = []
  const make = (onSweep?: () => void): Broom =>
    new Broom({ zones, random: () => 0.2, paint: (s) => { paints.push(s ? s.phase : null) }, ...(onSweep ? { onSweep } : {}) })

  it('picks the stretch with nobody on it, and nobody heading for it', () => {
    const b = make()
    // Somebody on the desk stretch, somebody walking to the right one.
    const zone = b.pickZone([
      { x: 1760, y: 1040, headingX: null },
      { x: 2200, y: 1040, headingX: 2652 },
    ])
    expect(zone?.id).toBe('rest')
    // Somebody at the monitor or at the fridge door does not block the
    // stretch beside them: that is exactly when the broom should be out.
    expect(b.pickZone([{ x: 1578, y: 1012, headingX: null }, { x: 2470, y: 1020, headingX: null }, { x: 1176, y: 1040, headingX: null }])).not.toBeNull()
  })

  it('stays put when every stretch has somebody near it', () => {
    const b = make()
    const zone = b.pickZone(zones.map((z) => ({ x: (z.x0 + z.x1) / 2, y: z.y, headingX: null })))
    expect(zone).toBeNull()
  })

  it('never comes out in front of the thing the visitor has open', () => {
    const b = make()
    const radio = { x: 1258, y: 978, w: 116, h: 102 }
    // The rest stretch ends at 1215, and the broom's run-in reaches past it.
    const without = b.pickZone([], radio)
    expect(without?.id).not.toBe('rest')
    // The desk's monitor is on the wall well above the boards: no overlap.
    const pc = { x: 1462, y: 563, w: 233, h: 200 }
    expect(b.pickZone([], pc)?.id).toBe('rest')
  })

  it('comes in, sweeps twice, and goes, in that order, then is gone', () => {
    const sweeps: number[] = []
    let clock = 0
    // The step that crosses into the sweep is the step that sounds it, so
    // the time noted is the end of that step.
    const b = make(() => sweeps.push(clock + 50))
    paints.length = 0
    expect(b.start(zones[1]!)).toBe(true)
    expect(b.start(zones[1]!), 'came out twice').toBe(false)
    for (; clock < BROOM_MS + 100; clock += 50) b.step(50)
    expect(b.active).toBe(false)
    expect(paints[paints.length - 1]).toBeNull()
    const seen = paints.filter((p): p is string => p !== null)
    const order = seen.filter((p, i) => p !== seen[i - 1])
    expect(order).toEqual(PLAN.map(([p]) => p))
    // The sound goes with the bristles: once per sweep, at the sweep.
    expect(sweeps.length).toBe(2)
    expect(sweeps[0]).toBeGreaterThanOrEqual(PLAN[0]![1])
    expect(sweeps[0]).toBeLessThan(PLAN[0]![1] + 100)
  })

  it('never moves faster than the crew walk', () => {
    const b = new Broom({ zones, random: () => 0.9, paint: () => undefined })
    b.start(zones[2]!)
    let last = b.state()!.x
    let fastest = 0
    for (let t = 0; t < BROOM_MS; t += 16) {
      b.step(16)
      const s = b.state()
      if (!s) break
      fastest = Math.max(fastest, Math.abs(s.x - last) / 16 * 1000)
      last = s.x
    }
    // The crew walk at 76 world units a second; the broom's fastest moment,
    // mid-ease, stays within a third of that.
    expect(fastest).toBeLessThan(100)
  })

  it('is one of the things worth watching, so two of them plus it never happens', () => {
    const a = new Ambient({ random: () => 0 })
    const running: string[] = []
    const track = (id: string) => (on: boolean) => {
      if (on) running.push(id)
      else running.splice(running.indexOf(id), 1)
    }
    a.add({ id: 'broom', every: { min: 800, max: 800 }, duration: BROOM_MS, priority: ATTENTION.object, run: track('broom') })
    a.add({ id: 'one', every: { min: 800, max: 800 }, duration: 4000, priority: ATTENTION.object, run: track('one') })
    a.add({ id: 'two', every: { min: 800, max: 800 }, duration: 4000, priority: ATTENTION.object, run: track('two') })
    let worst = 0
    for (let t = 0; t < 60_000; t += 50) {
      a.step(50)
      worst = Math.max(worst, running.length)
    }
    expect(worst).toBeLessThanOrEqual(STRONG_AT_ONCE)
  })

  it('waits when there is nowhere clear, rather than skipping its turn', () => {
    const a = new Ambient({ random: () => 0 })
    let clear = false
    let started = 0
    a.add({
      id: 'broom', every: { min: 500, max: 500 }, duration: 1000, priority: ATTENTION.object,
      ready: () => clear, run: (on) => { if (on) started += 1 },
    })
    for (let t = 0; t < 20_000; t += 50) a.step(50)
    expect(started, 'came out with nowhere to go').toBe(0)
    clear = true
    for (let t = 0; t < 10_000; t += 50) a.step(50)
    expect(started).toBeGreaterThan(0)
  })
})

describe('the visitor comes first', () => {
  it('nothing in the room moves while the visitor is doing something', () => {
    const a = new Ambient({ random: () => 0 })
    let ran = 0
    a.add({ id: 'x', every: { min: 500, max: 500 }, duration: 300, priority: ATTENTION.object, run: (on) => { if (on) ran += 1 } })
    a.setAttention(ATTENTION.interaction)
    for (let t = 0; t < 30_000; t += 50) a.step(50)
    expect(ran).toBe(0)
    a.setAttention(0)
    for (let t = 0; t < 5_000; t += 50) a.step(50)
    expect(ran).toBeGreaterThan(0)
  })

  const SPOT = (id: string, x: number): Waypoint => ({ id, x, y: 1010, objectId: id.replace(/-.*/, '') })
  const member = (id: string, x: number): InteractionMember & { glances: number; visits: string[] } => {
    const m = {
      id, glances: 0, visits: [] as string[],
      at: { x, y: 1010 }, state: 'IDLE', away: false, openTo: true,
      glanceAt() { m.glances += 1; return true },
      linger() { return false },
      summon(to: Waypoint) { m.visits.push(to.id); return true },
    }
    return m
  }
  const places = {
    parcel: { at: { x: 3095, y: 1058 }, objectId: 'parcel', spot: SPOT('parcel-side', 3062) },
    shelf: { at: { x: 330, y: 411 }, objectId: 'shelf', spot: SPOT('shelf-front', 330) },
    tv: { at: { x: 2832, y: 686 }, objectId: 'tv' },
    fridge: { at: { x: 2462, y: 771 }, objectId: 'fridge', spot: SPOT('fridge-front', 2470) },
    pc: { at: { x: 1578, y: 663 }, objectId: 'pc' },
  }
  const settled = (m: CrewInteractions): void => {
    for (let t = 0; t < 10_000; t += 100) m.step(100)
  }

  it('nobody goes near the thing the visitor has open, even before its panel is up', () => {
    const yomi = member('yomi', 2900)
    const m = new CrewInteractions({ random: () => 0.1, places })
    m.join(yomi)
    settled(m)
    m.yieldTo('parcel')
    m.notice('parcelWiggle')
    expect(yomi.visits, 'walked over to what the visitor has').toEqual([])
    expect(yomi.glances).toBe(0)
    expect(m.running).toBeNull()
    // Given back when the panel closes.
    m.setPaused(true)
    m.setPaused(false)
    expect(m.held).toBeNull()
    m.notice('parcelWiggle')
    expect(yomi.visits).toEqual(['parcel-side'])
  })

  it('the box shifts and YOMI, mostly, is the one who goes', () => {
    let goes = 0
    for (let seed = 0; seed < 40; seed++) {
      const yomi = member('yomi', 2800)
      const poko = member('poko', 2830)
      const m = new CrewInteractions({ random: () => (seed % 10) / 10, places })
      m.join(poko)
      m.join(yomi)
      settled(m)
      m.notice('parcelWiggle')
      if (yomi.visits.length) goes += 1
    }
    // Usually, and not always: a rule the visitor can learn is a machine.
    expect(goes).toBeGreaterThan(20)
    expect(goes).toBeLessThan(40)
  })

  it('the television flickers and POKO glances, from where it stands', () => {
    const poko = member('poko', 2830)
    const momo = member('momo', 2650)
    const m = new CrewInteractions({ random: () => 0.1, places })
    m.join(momo)
    m.join(poko)
    settled(m)
    m.notice('tvStatic')
    expect(poko.glances).toBe(1)
    expect(poko.visits).toEqual([])
    expect(m.running?.scene).toBe('notice')
  })

  it('the lantern swings and YOMI goes to see, if already near the shelf', () => {
    const yomi = member('yomi', 900)
    const m = new CrewInteractions({ random: () => 0.1, places })
    m.join(yomi)
    settled(m)
    m.notice('shelfLantern')
    expect(yomi.visits).toEqual(['shelf-front'])
  })

  it('a cause nobody is near is a cause nobody notices', () => {
    const ruki = member('ruki', 400)
    const m = new CrewInteractions({ random: () => 0.1, places })
    m.join(ruki)
    settled(m)
    m.notice('fridgeClick')
    expect(ruki.glances).toBe(0)
    expect(m.running).toBeNull()
  })

  it('ignores a cause it has no word for', () => {
    const m = new CrewInteractions({ random: () => 0.1, places })
    m.join(member('momo', 1500))
    settled(m)
    m.notice('somethingElse')
    expect(m.running).toBeNull()
  })
})

describe('footsteps', () => {
  it('sounds once per stride, and not for feet nobody can see', () => {
    const vols: number[] = []
    const f = new Footsteps({ play: (v) => vols.push(v), gap: 260 })
    f.step(1000)
    expect(f.stride(false)).toBe(false)
    expect(f.stride(true)).toBe(true)
    expect(vols.length).toBe(1)
  })

  it('two of them walking is a little more sound than one, never a drum roll', () => {
    let played = 0
    const f = new Footsteps({ play: () => { played += 1 }, gap: 260 })
    // Two walkers, each putting a foot down every 444ms, out of phase.
    for (let t = 0; t < 10_000; t += 4) {
      f.step(4)
      if (t % 444 === 0) f.stride(true)
      if ((t + 222) % 444 === 0) f.stride(true)
    }
    const perSecond = played / 10
    expect(perSecond).toBeLessThanOrEqual(1000 / 260 + 0.1)
    expect(perSecond).toBeGreaterThan(2)
  })

  it('keeps the volume steady: two feet, no more different than that', () => {
    const vols: number[] = []
    const f = new Footsteps({ play: (v) => vols.push(v), gap: 0, volume: 0.12 })
    for (let i = 0; i < 6; i++) {
      f.step(300)
      f.stride(true)
    }
    expect(new Set(vols).size).toBe(2)
    expect(Math.max(...vols) / Math.min(...vols)).toBeLessThan(1.25)
  })
})
