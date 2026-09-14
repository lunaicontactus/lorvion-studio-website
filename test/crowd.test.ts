import { describe, expect, it } from 'vitest'
import { Crowd, type CrowdMember } from '@/systems/crowd'
import { navFor } from '@/data/navigation'

/** A stand-in for a dokkaebi: a position and a willingness to talk. */
function member(id: string, x: number, y = 1030, social = 1): CrowdMember & {
  greeted: string[]
  place: { x: number; y: number }
  free: boolean
  onErrand: boolean
} {
  const m = {
    id,
    greeted: [] as string[],
    seated: false,
    place: { x, y },
    free: true,
    onErrand: false,
    social,
    get passing() {
      return m.onErrand
    },
    get at() {
      return m.place
    },
    get busy() {
      return !m.free
    },
    radius: 1,
    greet(other: CrowdMember) {
      m.greeted.push(other.id)
    },
  }
  return m
}

describe('occupancy', () => {
  it('gives a place to one of them and refuses the other', () => {
    const crowd = new Crowd()
    expect(crowd.claim('fridge-front', 'nunu')).toBe(true)
    expect(crowd.claim('fridge-front', 'momo')).toBe(false)
    expect(crowd.free('fridge-front', 'momo')).toBe(false)
    // Asking again for what you already hold is not a conflict.
    expect(crowd.claim('fridge-front', 'nunu')).toBe(true)
    expect(crowd.free('fridge-front', 'nunu')).toBe(true)
  })

  it('lets go, and lets go only of its own', () => {
    const crowd = new Crowd()
    crowd.claim('rug', 'poko')
    crowd.release('rug', 'yomi')
    expect(crowd.holder('rug')).toBe('poko')
    crowd.release('rug', 'poko')
    expect(crowd.holder('rug')).toBeNull()
  })

  it('expires a booking, so an interrupted errand does not lock a place out', () => {
    const crowd = new Crowd()
    crowd.claim('workbench-a', 'ruki', 5000)
    crowd.step(4000)
    expect(crowd.free('workbench-a', 'momo')).toBe(false)
    crowd.step(2000)
    expect(crowd.free('workbench-a', 'momo')).toBe(true)
  })

  it('forgets everything one of them held when it leaves', () => {
    const crowd = new Crowd()
    const m = member('yomi', 2400)
    crowd.join(m)
    crowd.claim('tv-left', 'yomi')
    crowd.leave('yomi')
    expect(crowd.holder('tv-left')).toBeNull()
    expect(crowd.size).toBe(0)
  })
})

describe('the walking budget', () => {
  it('lets two go and holds the third', () => {
    const crowd = new Crowd()
    crowd.startWalk('a')
    crowd.startWalk('b')
    expect(crowd.walkers).toBe(2)
    expect(crowd.mayWalk('c')).toBe(false)
    // Already walking is always allowed: the budget decides who sets off.
    expect(crowd.mayWalk('a')).toBe(true)
    crowd.endWalk('a')
    expect(crowd.mayWalk('c')).toBe(true)
  })
})

describe('personal space', () => {
  it('is nothing at all when nobody is near', () => {
    const crowd = new Crowd()
    crowd.join(member('momo', 1300))
    crowd.join(member('nunu', 2400))
    const push = crowd.separation('momo', 1300, 1030)
    expect(push).toEqual({ x: 0, y: 0, slow: 1 })
  })

  it('pushes apart, hardest when closest, and slows them while it does', () => {
    const crowd = new Crowd()
    crowd.join(member('momo', 1300))
    crowd.join(member('nunu', 1340))
    const push = crowd.separation('momo', 1300, 1030)
    // MOMO is to the left of NUNU, so it is pushed further left.
    expect(push.x).toBeLessThan(0)
    expect(push.slow).toBeLessThan(1)
  })

  it('lets one stand closer to a dokkaebi that is sitting, but not through it', () => {
    // 95 units apart: inside a standing dokkaebi's personal space (108) and
    // outside a seated one's (108 x 0.8 = 86).
    const standing = new Crowd()
    standing.join(member('momo', 1300))
    standing.join(member('nunu', 1395))
    expect(standing.separation('momo', 1300, 1030).x).toBeLessThan(0)

    const seated = new Crowd()
    const sitting = member('nunu', 1395)
    Object.defineProperty(sitting, 'radius', { value: 0.8, writable: true })
    seated.join(member('momo', 1300))
    seated.join(sitting)
    expect(seated.separation('momo', 1300, 1030)).toEqual({ x: 0, y: 0, slow: 1 })

    // But standing on one is still standing on one — which is what a plain
    // "sitting dokkaebi are not solid" got wrong, by letting a walker pass
    // straight through somebody sitting on the rug.
    expect(seated.separation('momo', 1345, 1030).x).toBeLessThan(0)
  })

  it('counts distance along the boards for more than depth, and never lets one hide behind another', () => {
    // The floor is a shallow strip and the figures are taller than it is
    // deep: two dokkaebi 45 units apart in depth at the same x are one on
    // top of the other on screen, and read as a single creature. Both cases
    // push, and the one directly behind is pushed sideways, not deeper.
    const beside = new Crowd()
    beside.join(member('momo', 1300, 1030))
    beside.join(member('nunu', 1345, 1030))
    expect(beside.separation('momo', 1300, 1030).x).toBeLessThan(0)

    const behind = new Crowd()
    behind.join(member('momo', 1300, 1030))
    behind.join(member('nunu', 1300, 1075))
    const push = behind.separation('momo', 1300, 1030)
    expect(push.x).toBeLessThan(0)
    expect(Math.abs(push.x)).toBeGreaterThan(Math.abs(push.y))
  })

  it('has the later name stand aside when two walkers would meet', () => {
    const crowd = new Crowd()
    crowd.join(member('momo', 1300, 1030))
    crowd.join(member('nunu', 1400, 1040))
    crowd.startWalk('momo')
    crowd.startWalk('nunu')
    // NUNU walks left toward MOMO, 100 units ahead: NUNU yields, MOMO does not.
    expect(crowd.shouldYield('nunu', 1400, 1040, -1)).toBe(true)
    expect(crowd.shouldYield('momo', 1300, 1030, 1)).toBe(false)
    // Walking away from each other, nobody yields.
    expect(crowd.shouldYield('nunu', 1400, 1040, 1)).toBe(false)
    // Nor when the other one is standing still.
    crowd.endWalk('momo')
    expect(crowd.shouldYield('nunu', 1400, 1040, -1)).toBe(false)
  })
})

describe('talking', () => {
  it('holds the room to one bubble on a phone', () => {
    const crowd = new Crowd({ narrow: true })
    crowd.step(30_000)
    expect(crowd.maySpeak('momo')).toBe(true)
    crowd.startSpeaking('momo')
    expect(crowd.maySpeak('nunu')).toBe(false)
    crowd.stopSpeaking('momo')
    // Still spaced out in time, even once the budget is free again.
    expect(crowd.maySpeak('nunu')).toBe(false)
    crowd.step(6000)
    expect(crowd.maySpeak('nunu')).toBe(true)
  })

  it('will not let the same one talk twice in a row', () => {
    const crowd = new Crowd()
    crowd.step(30_000)
    crowd.startSpeaking('yomi')
    crowd.stopSpeaking('yomi')
    crowd.step(10_000)
    expect(crowd.maySpeak('yomi')).toBe(false)
    crowd.step(20_000)
    expect(crowd.maySpeak('yomi')).toBe(true)
  })
})

describe('meeting each other', () => {
  it('says nothing at all for the first stretch after arriving', () => {
    const crowd = new Crowd({ random: () => 0 })
    const a = member('momo', 1300)
    const b = member('yomi', 1360)
    crowd.join(a)
    crowd.join(b)
    for (let i = 0; i < 10; i++) crowd.step(1600)
    expect(a.greeted).toEqual([])
  })

  it('introduces two who are standing near each other, once', () => {
    const crowd = new Crowd({ random: () => 0 })
    const a = member('momo', 1300)
    const b = member('yomi', 1360)
    crowd.join(a)
    crowd.join(b)
    crowd.step(25_000)
    crowd.step(1600)
    expect(a.greeted).toEqual(['yomi'])
    expect(b.greeted).toEqual(['momo'])
    // And not again straight afterwards.
    crowd.step(31_000)
    crowd.step(1600)
    expect(a.greeted).toEqual(['yomi'])
  })

  it('leaves alone anybody who is in the middle of something', () => {
    const crowd = new Crowd({ random: () => 0 })
    const a = member('ruki', 1300)
    const b = member('yomi', 1360)
    a.free = false
    crowd.join(a)
    crowd.join(b)
    crowd.step(30_000)
    crowd.step(1600)
    expect(b.greeted).toEqual([])
  })

  it('does not shout across the room', () => {
    const crowd = new Crowd({ random: () => 0 })
    const a = member('momo', 1300)
    const b = member('yomi', 2600)
    crowd.join(a)
    crowd.join(b)
    crowd.step(30_000)
    crowd.step(1600)
    expect(a.greeted).toEqual([])
  })

  it('lets two quiet ones pass without a word', () => {
    // Both willing 30% of the time, so the pair clears the bar 9% of the
    // time; a draw of 0.5 is a pass for the gregarious and a miss for these.
    const crowd = new Crowd({ random: () => 0.5 })
    const a = member('nunu', 1300, 1030, 0.3)
    const b = member('poko', 1360, 1030, 0.3)
    crowd.join(a)
    crowd.join(b)
    crowd.step(30_000)
    crowd.step(1600)
    expect(a.greeted).toEqual([])
  })
})

describe('the ambience floor', () => {
  const levels = { crew: 30, object: 20 }
  it('is nothing when the room is quiet', () => {
    const crowd = new Crowd()
    expect(crowd.attention(levels)).toBe(0)
  })
  it('lets one of them cross the floor without stopping the room', () => {
    const crowd = new Crowd()
    crowd.startWalk('momo')
    expect(crowd.attention(levels)).toBe(0)
  })
  it('holds off the background when two are in transit', () => {
    const crowd = new Crowd()
    crowd.startWalk('momo')
    crowd.startWalk('yomi')
    expect(crowd.attention(levels)).toBe(20)
  })
  it('gives way entirely to somebody talking', () => {
    const crowd = new Crowd()
    crowd.startSpeaking('momo')
    expect(crowd.attention(levels)).toBe(30)
  })
})

/**
 * The room's own geometry, checked as data.
 *
 * Two waypoints closer together than a dokkaebi is wide are one waypoint with
 * a fight over it: whoever arrives second is pushed by the separation and
 * pulled by its target at the same time, and walks on the spot until it gives
 * up. Both of these were found by watching the room rather than by reading
 * the file, which is exactly the sort of thing a test is for.
 */
describe('where they may stand', () => {
  // Mirrors PERSONAL and the seated radius in src/systems/crowd.ts.
  const PERSONAL = 108
  const SEATED = 0.8

  for (const portrait of [false, true]) {
    const graph = navFor(portrait)
    const where = portrait ? 'portrait' : 'landscape'
    const all = [
      ...graph.points.map((p) => ({ ...p, seated: false })),
      ...graph.sits.map((p) => ({ ...p, seated: true })),
    ]

    it(`${where}: every place has its own name`, () => {
      const ids = all.map((p) => p.id)
      expect(new Set(ids).size, ids.join(' ')).toBe(ids.length)
    })

    it(`${where}: no two places are inside each other`, () => {
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i]!
          const b = all[j]!
          // Distance along the boards counts for more than depth, as in
          // Crowd.separation, and a seat takes a little less room than a stance.
          const d = Math.hypot(a.x - b.x, (a.y - b.y) * 0.5)
          const room = PERSONAL * (a.seated || b.seated ? SEATED : 1)
          expect(d, `${a.id} and ${b.id} are ${d.toFixed(0)} apart`).toBeGreaterThan(room)
        }
      }
    })

    it(`${where}: every place is on the floor`, () => {
      for (const p of all) {
        expect(p.y, p.id).toBeGreaterThanOrEqual(graph.floor.top)
        expect(p.y, p.id).toBeLessThanOrEqual(graph.floor.bottom)
      }
    })
  }

  it('stands aside for somebody, then gets on with it', () => {
    // What this stops, measured in a real room: the test behind `shouldYield`
    // is "is somebody ahead of me on this stretch", which stays true for as
    // long as they are ahead of me. A dokkaebi walking behind a slower one
    // yielded, stepped once, yielded again, and did that nineteen times in a
    // row without moving — seventeen seconds of standing aside for somebody
    // who was never going to pass.
    const crowd = new Crowd()
    const ahead = member('aaa', 400, 1000)
    const behind = member('zzz', 300, 1000)
    crowd.join(ahead)
    crowd.join(behind)
    crowd.startWalk('aaa')
    crowd.startWalk('zzz')
    let yields = 0
    for (let t = 0; t < 12_000; t += 100) {
      // Neither of them moves: the worst case, and the one that hung.
      if (crowd.shouldYield('zzz', 300, 1000, 1)) yields += 1
      crowd.step(100)
    }
    expect(yields, `stood aside ${yields} times in twelve seconds`).toBeLessThanOrEqual(3)
    expect(yields, 'never stood aside at all').toBeGreaterThan(0)
  })

  it('lets two of them say hello in passing, and keeps the errand', () => {
    // Both standing still, close together, at the same moment is rare enough
    // in a room this size that a rule which insisted on it meant they never
    // said hello at all — nought greetings in five and a half minutes with
    // three of them in the room. Somebody walking past is the commonest way
    // two people in one room end up speaking.
    const crowd = new Crowd()
    const a = member('aaa', 1000)
    const b = member('bbb', 1200)
    a.free = false
    a.onErrand = true
    crowd.join(a)
    crowd.join(b)
    for (let t = 0; t < 60_000; t += 500) crowd.step(500)
    expect(a.greeted, 'the one walking past never said hello').toContain('bbb')
    expect(b.greeted).toContain('aaa')
  })

  it('still leaves alone somebody who is busy and not going anywhere', () => {
    const crowd = new Crowd()
    const a = member('aaa', 1000)
    const b = member('bbb', 1100)
    a.free = false
    b.free = false
    crowd.join(a)
    crowd.join(b)
    for (let t = 0; t < 60_000; t += 500) crowd.step(500)
    expect(a.greeted, 'interrupted two of them mid-job').toEqual([])
  })
})
