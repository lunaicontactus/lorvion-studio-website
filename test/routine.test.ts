import { describe, expect, it } from 'vitest'
import { navFor, type FloorObstacle, type NavGraph } from '@/data/navigation'
import { worldFor } from '@/data/world'
import { CHARACTERS } from '@/data/characters'
import { allRoutines, routinesFor, type Routine } from '@/data/routines'
import { chooseRoutine, detour, feasible, insideObstacle, resolveStep, tendencyFor, type PlanContext } from '@/systems/routine'
import { seededRandom } from '@/scenes/npc'
import { Crowd } from '@/systems/crowd'
import { Stage } from '@/systems/stage'
import { CrewInteractions, type InteractionMember } from '@/systems/interactions'
import { DAY_PHASES } from '@/systems/clock'
import type { NpcHandle } from '@/scenes/npc'

/**
 * SITE UPGRADE PHASE E: the crew at work. What goes wrong with a living room
 * is a job that cannot be done here, a chain that never ends where it began,
 * a walk through the radio, five of them on the move at once, and a room that
 * plays differently every time a test watches it.
 */
const wide = navFor(false)
const tall = navFor(true)
const CREW = CHARACTERS.map((c) => c.id)

const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({
  free: () => true, avoid: null, origin: null, crewAt: () => ({ x: 2000, y: 1000 }), ...over,
})

describe('1 · the action scheduler', () => {
  it('every one of the crew has jobs, and every job names places that exist', () => {
    const places = new Set([...wide.points, ...wide.sits, ...tall.points, ...tall.sits].map((p) => p.id))
    for (const id of CREW) {
      const list = routinesFor(id)
      expect(list.length, `${id} has nothing to do`).toBeGreaterThanOrEqual(2)
      for (const r of list) {
        for (const s of r.steps) {
          const ids = 'go' in s ? s.go : 'sit' in s ? s.sit : []
          for (const p of ids) expect(places.has(p), `${id}/${r.id} names '${p}', which is nowhere`).toBe(true)
        }
        expect(feasible(wide, r), `${id}/${r.id} cannot be done in the room it was written for`).toBe(true)
      }
    }
  })

  it('a job is a chain with a reason: two places at least, and it never just shows an animation', () => {
    for (const [id, list] of Object.entries(allRoutines())) {
      for (const r of list) {
        const places = r.steps.filter((s) => 'go' in s || 'sit' in s || 'back' in s).length
        expect(places, `${id}/${r.id} goes nowhere`).toBeGreaterThanOrEqual(2)
        // No gesture for its own sake: a wave is for somebody, never a step.
        expect(JSON.stringify(r.steps), `${id}/${r.id}`).not.toMatch(/wave|sleep|carry|drink|eat|clean/)
        expect(r.reads.trim(), `${id}/${r.id} has no description`).not.toBe('')
      }
    }
  })

  it('each of them works where the canon puts them (docs/CREW_REBOOT.md)', () => {
    const where = (id: string): string => JSON.stringify(routinesFor(id).map((r) => r.steps))
    expect(where('momo')).toMatch(/workbench/)
    expect(where('ruki')).toMatch(/workbench-a/)
    expect(where('ruki')).toMatch(/cushions/)
    expect(where('yomi')).toMatch(/fridge-front/)
    expect(where('yomi')).toMatch(/secret-front/)
    expect(where('poko')).toMatch(/tv-left/)
    expect(where('nunu')).toMatch(/big-cushion/)
    // And they do not share one table of jobs.
    const shapes = CREW.map((id) => routinesFor(id).map((r) => r.id).join(','))
    expect(new Set(shapes).size).toBe(CREW.length)
  })

  it('never picks the same job twice running when there is another, nor one the room cannot hold', () => {
    const rng = seededRandom(7)
    for (const id of CREW) {
      let last: string | null = null
      for (let i = 0; i < 40; i++) {
        const r: Routine = chooseRoutine(wide, routinesFor(id), last, rng)!
        expect(r.id, `${id} did ${r.id} twice in a row`).not.toBe(last)
        last = r.id
      }
    }
    // The phone room has no fridge or television: those jobs are not offered.
    for (const id of CREW) {
      for (let i = 0; i < 20; i++) {
        const r = chooseRoutine(tall, routinesFor(id), null, rng)
        if (r) expect(feasible(tall, r), `${id}/${r.id} offered on the phone`).toBe(true)
      }
    }
  })

  it('a step whose place is taken is passed over, and the last step goes back where the job began', () => {
    const taken = ctx({ free: (p) => p !== 'workbench-b' })
    const step = { go: ['workbench-b', 'workbench-a'] } as const
    expect(resolveStep(wide, step, taken, Math.random)).toMatchObject({ kind: 'go', point: { id: 'workbench-a' } })
    expect(resolveStep(wide, { go: ['workbench-b'] }, taken, Math.random)).toBeNull()
    // Nobody walks to the thing the visitor has open.
    expect(resolveStep(wide, { go: ['fridge-front'] }, ctx({ avoid: 'fridge' }), Math.random)).toBeNull()
    expect(resolveStep(wide, { back: true }, ctx({ origin: { kind: 'point', id: 'pc-front' } }), Math.random))
      .toMatchObject({ kind: 'go', point: { id: 'pc-front' } })
    expect(resolveStep(wide, { back: true }, ctx({ origin: { kind: 'sit', id: 'big-cushion' } }), Math.random))
      .toMatchObject({ kind: 'sit', seat: { id: 'big-cushion' } })
    expect(resolveStep(wide, { back: true }, ctx(), Math.random)).toBeNull()
    // Looking at a thing on the wall is looking up at it, from where it is.
    const face = resolveStep(wide, { face: 'workbench' }, ctx(), Math.random)
    expect(face?.kind).toBe('face')
    if (face?.kind === 'face') expect(face.at.y).toBeLessThan(wide.floor.top)
  })

  it('jobs end where they began, or at the character\'s own place', () => {
    const own: Record<string, RegExp> = {
      momo: /pc-front|workbench/, ruki: /workbench|cushions/, yomi: /fridge-front|mid-floor/,
      poko: /tv-|right-floor/, nunu: /cushion|rug|floor/,
    }
    for (const id of CREW) {
      for (const r of routinesFor(id)) {
        const last = r.steps[r.steps.length - 1]!
        const ok = 'back' in last || ('go' in last && own[id]!.test(last.go.join())) || ('sit' in last && own[id]!.test(last.sit.join()))
        expect(ok, `${id}/${r.id} ends somewhere that is not home`).toBe(true)
      }
    }
  })
})

describe('2 · the same seed plays the same room', () => {
  it('choosing jobs from one seed gives one sequence', () => {
    const play = (seed: number): string[] => {
      const rng = seededRandom(seed)
      const out: string[] = []
      for (const id of CREW) {
        let last: string | null = null
        for (let i = 0; i < 8; i++) {
          const r: Routine = chooseRoutine(wide, routinesFor(id), last, rng)!
          out.push(`${id}:${r.id}`)
          last = r.id
        }
      }
      return out
    }
    expect(play(7)).toEqual(play(7))
    expect(play(7)).not.toEqual(play(8))
  })
})

describe('3 · zones and paths', () => {
  /** Walk feet from a to b the way the room does: toward the next corner, a little at a time. */
  function walk(graph: NavGraph, a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number }[] {
    const path = [{ ...a }]
    let p = { ...a }
    for (let i = 0; i < 4000; i++) {
      if (Math.hypot(b.x - p.x, b.y - p.y) <= 4) break
      const aim = detour(graph.obstacles, p, b)
      const d = Math.hypot(aim.x - p.x, aim.y - p.y) || 1
      const step = Math.min(1, 2.5 / d)
      p = { x: p.x + (aim.x - p.x) * step, y: p.y + (aim.y - p.y) * step }
      path.push(p)
    }
    return path
  }

  for (const portrait of [false, true]) {
    const graph = navFor(portrait)
    const layout = worldFor(portrait)
    const where = portrait ? 'phone' : 'desk'

    it(`${where}: the boxes on the walkway are the radio and the parcel where they are drawn`, () => {
      for (const o of graph.obstacles) {
        const r = layout.objects.find((q) => q.id === o.id)!.rect
        expect(o.x0, o.id).toBeLessThanOrEqual(r.x)
        expect(o.x1, o.id).toBeGreaterThanOrEqual(r.x + r.w)
        // Behind it means the box hides less than half a standing figure.
        expect((o.behind - r.y) / graph.height, o.id).toBeLessThan(0.45)
        expect(o.behind, o.id).toBeGreaterThan(graph.floor.top)
      }
      // Every art thing standing on this walkway is one of them.
      for (const thing of layout.objects.filter((q) => q.art)) {
        const onWalkway = thing.rect.y + thing.rect.h > graph.floor.top && thing.rect.y < graph.floor.bottom
        if (onWalkway) expect(graph.obstacles.map((o) => o.id), `${thing.id} stands on the walkway`).toContain(thing.id)
      }
    })

    it(`${where}: nobody stands in a box, and every walk between two places goes behind it`, () => {
      const places = [...graph.points, ...graph.sits]
      for (const p of places) expect(insideObstacle(graph.obstacles, p.x, p.y), `${p.id} is inside a box`).toBeNull()
      for (const a of places) {
        for (const b of places) {
          if (a === b) continue
          for (const f of walk(graph, a, b)) {
            const box: FloorObstacle | null = insideObstacle(graph.obstacles, f.x, f.y)
            expect(box, `${a.id} → ${b.id} goes through the ${box?.id} at (${Math.round(f.x)}, ${Math.round(f.y)})`).toBeNull()
            expect(f.y, `${a.id} → ${b.id} leaves the boards`).toBeGreaterThanOrEqual(graph.floor.top - 0.5)
          }
        }
      }
    })
  }
})

describe('4 · no more than two on the move', () => {
  it('a second walker usually waits a beat; a third never goes', () => {
    const crowd = new Crowd({ random: seededRandom(3) })
    expect(crowd.maySetOff('a')).toBe(true)
    crowd.startWalk('a')
    let went = 0
    for (let i = 0; i < 1000; i++) if (crowd.maySetOff('b')) went++
    expect(went / 1000).toBeGreaterThan(0.15)
    expect(went / 1000).toBeLessThan(0.45)
    crowd.startWalk('b')
    for (let i = 0; i < 200; i++) expect(crowd.maySetOff('c')).toBe(false)
    expect(crowd.maySetOff('a'), 'already walking is always allowed').toBe(true)
  })

  it('one small movement at a time while anybody walks', () => {
    const crowd = new Crowd()
    expect(crowd.mayFidget('a')).toBe(true)
    crowd.startFidget('a')
    expect(crowd.mayFidget('b')).toBe(true)
    crowd.startWalk('w')
    expect(crowd.mayFidget('b')).toBe(false)
    expect(crowd.mayFidget('a')).toBe(true)
  })

  it('nobody comes on or goes off while two are already crossing the floor', () => {
    const one = (id: string, walking: boolean, away = false): NpcHandle & { left: number; came: number } => {
      const h = {
        id, walking, away, state: walking ? 'WALK' : 'IDLE', left: 0, came: 0,
        leave() { h.left++; return true }, comeBack() { h.came++; return true },
      }
      return h as unknown as NpcHandle & { left: number; came: number }
    }
    const crew = [one('a', true), one('b', true), one('c', false), one('d', false, true)]
    const stage = new Stage(crew, { present: 3, random: seededRandom(1) })
    for (let t = 0; t < 120_000; t += 100) stage.step(100)
    expect(crew.reduce((n, c) => n + c.left + c.came, 0)).toBe(0)
  })
})

describe('5 · the visitor opens something', () => {
  const PLACES = {
    pc: { at: { x: 1578, y: 660 }, objectId: 'pc' },
    tv: { at: { x: 2832, y: 686 }, objectId: 'tv' },
    fridge: { at: { x: 2462, y: 770 }, objectId: 'fridge' },
    cabinet: { at: { x: 921, y: 830 }, objectId: 'cabinet' },
  }
  const fake = (id: string, x: number, state = 'IDLE'): InteractionMember & { looked: number } => {
    const f = {
      id, state, away: false, openTo: true, looked: 0, at: { x, y: 1012 },
      glanceAt() { f.looked++; return true }, linger() { return false }, summon() { return false },
    }
    return f
  }

  it('one of the crew nearby looks over — not the one standing at it, not somebody at a job, not anybody far', () => {
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    const at = fake('momo', 1578)
    const working = fake('ruki', 1400, 'WORK')
    const near = fake('nunu', 1860)
    const nearer = fake('yomi', 1760)
    const far = fake('poko', 2900)
    for (const f of [at, working, near, nearer, far]) m.join(f)
    expect(m.visitorOpened('pc')).toBe('yomi')
    expect([at, working, near, far].map((f) => f.looked)).toEqual([0, 0, 0, 0])
    expect(nearer.looked).toBe(1)
  })

  it('only for the things with a light or a sound, and nobody when nobody is near', () => {
    const m = new CrewInteractions({ random: () => 0.5, places: PLACES })
    const f = fake('yomi', 1100)
    m.join(f)
    expect(m.visitorOpened('cabinet')).toBeNull()
    expect(m.visitorOpened('tv')).toBeNull()
    expect(f.looked).toBe(0)
  })
})

describe('6 · the time of night leans, never transforms', () => {
  it('every lean is small', () => {
    for (const p of DAY_PHASES) {
      for (const v of Object.values(tendencyFor(p))) {
        expect(v, p).toBeGreaterThanOrEqual(0.8)
        expect(v, p).toBeLessThanOrEqual(1.3)
      }
    }
    expect(tendencyFor('evening').work).toBeGreaterThan(tendencyFor('day').work)
    expect(tendencyFor('lateNight').sit).toBeGreaterThan(tendencyFor('day').sit)
    expect(tendencyFor('morning').wander).toBeLessThan(tendencyFor('day').wander)
  })
})
