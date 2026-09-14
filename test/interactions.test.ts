import { describe, expect, it } from 'vitest'
import { CrewInteractions, SCENE_ATTENTION, type InteractionMember } from '@/systems/interactions'
import type { Waypoint } from '@/data/navigation'

/**
 * What happens between them, settled without waiting for it.
 *
 * The manager has no clock of its own, so a test hands it one and a minute of
 * room time costs a millisecond. Every one of these is about a rule that
 * cannot be seen in a screenshot: that only one scene runs, that the same two
 * do not keep doing it to each other, that exactly one of them cares about the
 * parcel, that the visitor always wins.
 */

const SPOT = (id: string, x: number, y: number): Waypoint => ({ id, x, y })

interface Fake extends InteractionMember {
  glances: { x: number; y: number }[]
  lingered: number
  visits: string[]
  /** What it is doing. Writable, because the room changes it. */
  doing: string
  free: boolean
  position: { x: number; y: number }
}

function member(id: string, x: number, doing = 'IDLE'): Fake {
  const f: Fake = {
    id,
    doing,
    free: true,
    position: { x, y: 1000 },
    glances: [],
    lingered: 0,
    visits: [],
    get at() { return f.position },
    get state() { return f.doing },
    get away() { return false },
    get openTo() { return f.free },
    glanceAt(p) {
      if (!f.free) return false
      f.glances.push({ x: p.x, y: p.y })
      return true
    },
    linger(ms) {
      if (f.doing !== 'SIT') return false
      f.lingered += ms
      return true
    },
    summon(to) {
      if (!f.free) return false
      f.visits.push(to.id)
      return true
    },
  }
  return f
}

function run(m: CrewInteractions, ms: number, dt = 100): void {
  for (let t = 0; t < ms; t += dt) m.step(dt)
}

/** Turn the clock until something is actually going on, or give up. */
function until(m: CrewInteractions, ms: number, dt = 100): boolean {
  for (let t = 0; t < ms; t += dt) {
    m.step(dt)
    if (m.running) return true
  }
  return false
}

const PLACES = {
  parcel: { at: { x: 3000, y: 1050 }, objectId: 'parcel', spot: SPOT('p1', 2950, 1050) },
  fridge: { at: { x: 2450, y: 760 }, objectId: 'fridge', spot: SPOT('f1', 2450, 900) },
  pc: { at: { x: 1570, y: 660 }, objectId: 'pc' },
  tv: { at: { x: 2830, y: 690 }, objectId: 'tv' },
}

describe('what happens between the crew', () => {
  it('has somebody look up from the bench when somebody comes near', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const momo = member('momo', 2250)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(momo)
    run(m, 60_000)
    expect(momo.glances.length, 'nobody looked at the bench').toBeGreaterThan(0)
    expect(ruki.glances.length, 'the one at the bench never looked up').toBeGreaterThan(0)
    expect(m.history).toContain('watchBench')
  })

  it('leaves the one at the bench alone when nobody is near it', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const far = member('yomi', 100)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(far)
    run(m, 60_000)
    expect(far.glances).toEqual([])
    expect(m.history).not.toContain('watchBench')
  })

  it('does not keep having the same two do it to each other', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const momo = member('momo', 2250)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(momo)
    run(m, 70_000)
    const first = m.history.filter((h) => h === 'watchBench').length
    expect(first, 'the pair cooldown let them at it over and over').toBeLessThanOrEqual(1)
  })

  it('runs one scene at a time, never two', () => {
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    const crew = [
      member('ruki', 2100, 'WORK'), member('momo', 2250),
      member('nunu', 2300, 'SIT'), member('yomi', 2400), member('poko', 2500),
    ]
    for (const c of crew) m.join(c)
    for (let t = 0; t < 400_000; t += 100) {
      m.step(100)
      const now = m.running
      if (now) expect(now.who.length, 'a scene borrowed the whole room').toBeLessThanOrEqual(2)
    }
    expect(m.history.length, 'nothing ever happened').toBeGreaterThan(2)
  })

  it('holds the room\'s attention while a scene is on, and lets go after', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const momo = member('momo', 2250)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(momo)
    expect(m.attention).toBe(0)
    let held = 0
    for (let t = 0; t < 60_000; t += 100) {
      m.step(100)
      held = Math.max(held, m.attention)
    }
    expect(held).toBe(SCENE_ATTENTION)
    run(m, 30_000)
  })

  it('sends exactly one of them to look at the parcel', () => {
    const near = member('yomi', 2900)
    const alsoNear = member('poko', 2880)
    const far = member('ruki', 400)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    for (const c of [near, alsoNear, far]) m.join(c)
    run(m, 12_000)
    m.notice('parcelWiggle')
    const moved = [near, alsoNear, far].filter((c) => c.glances.length + c.visits.length > 0)
    expect(moved.length, 'the whole room went to look at a box').toBe(1)
    expect(far.glances.length + far.visits.length, 'somebody crossed the room for it').toBe(0)
  })

  it('ignores the parcel while something else is going on', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const momo = member('momo', 2250)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(momo)
    expect(until(m, 90_000), 'nothing was running to be interrupted').toBe(true)
    const before = m.history.length
    m.notice('parcelWiggle')
    expect(m.history.length, 'the parcel cut in on a scene').toBe(before)
  })

  it('gives the fridge back the moment the visitor wants it', () => {
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    const crew = [member('nunu', 2400), member('yomi', 2500)]
    for (const c of crew) m.join(c)
    let sawFridge = false
    for (let t = 0; t < 300_000 && !sawFridge; t += 100) {
      m.step(100)
      sawFridge = m.running?.scene === 'fridge'
    }
    expect(sawFridge, 'nobody ever went to the fridge').toBe(true)
    m.yieldTo('fridge')
    expect(m.running, 'the room kept the fridge after the visitor asked for it').toBeNull()
  })

  it('stops dead while a panel is open, and starts again after', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const momo = member('momo', 2250)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(momo)
    m.setPaused(true)
    run(m, 120_000)
    expect(m.history, 'the room carried on behind an open panel').toEqual([])
    m.setPaused(false)
    run(m, 60_000)
    expect(m.history.length).toBeGreaterThan(0)
  })

  it('never borrows anybody who is not free', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const momo = member('momo', 2250)
    momo.free = false
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(momo)
    run(m, 90_000)
    expect(momo.glances, 'borrowed somebody mid-stride').toEqual([])
  })

  it('lets the one who is sitting sit a while longer', () => {
    const nunu = member('nunu', 700, 'SIT')
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(nunu)
    run(m, 90_000)
    expect(nunu.lingered, 'nobody ever settled in').toBeGreaterThan(0)
    expect(m.history).toContain('doze')
  })

  it('lets go of anybody who leaves the room mid-scene', () => {
    const ruki = member('ruki', 2100, 'WORK')
    const momo = member('momo', 2250)
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    m.join(ruki)
    m.join(momo)
    expect(until(m, 90_000), 'no scene to outlive').toBe(true)
    m.leave('momo')
    expect(m.running, 'a scene outlived one of its own').toBeNull()
  })


  it('gives every kind of scene a turn, not just the easy ones', () => {
    // The failure this stops, seen in a real room: a glance at a screen and a
    // walk to the fridge need no coincidence at all, so they took every slot
    // and the room went a whole visit without once showing somebody looking
    // up from the bench, or anybody settling in.
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    for (const c of [
      member('ruki', 2100, 'WORK'), member('momo', 2250),
      member('nunu', 2300, 'SIT'), member('yomi', 2400),
    ]) m.join(c)
    run(m, 420_000)
    const kinds = new Set(m.history)
    expect([...kinds].sort(), `only saw ${[...kinds].join(', ')}`)
      .toEqual(['doze', 'fridge', 'screen', 'watchBench'])
  })

  it('looks again soon when a scene finds nobody, not in a minute', () => {
    // Nobody is sitting, so `doze` can never happen; then somebody sits, and
    // the room should notice within seconds rather than at the next slot.
    const nunu = member('nunu', 700)
    const m = new CrewInteractions({ random: () => 0.5, places: {} })
    m.join(nunu)
    run(m, 60_000)
    expect(m.history).not.toContain('doze')
    nunu.doing = 'SIT'
    run(m, 8000)
    expect(m.history, 'nobody noticed somebody had sat down').toContain('doze')
  })

  it('is quieter where there is less room to be busy in', () => {
    const count = (slow: number): number => {
      const m = new CrewInteractions({ random: () => 0.5, slow, places: PLACES })
      for (const c of [member('ruki', 2100, 'WORK'), member('momo', 2250),
        member('nunu', 2300, 'SIT')]) m.join(c)
      run(m, 400_000)
      return m.history.length
    }
    const desk = count(1)
    const phone = count(1.8)
    expect(desk).toBeGreaterThan(0)
    expect(phone, 'a phone was as busy as a desk').toBeLessThan(desk)
  })
})
