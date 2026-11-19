import { describe, expect, it } from 'vitest'
import { StarfallRound, FIELD, CATCHER, starsFor as starfallStars } from '@/games/starfall/round'
import { BugRound, CELLS, starsFor as bugStars } from '@/games/bugs/round'
import { ARCADE_GAMES, GAMES, gameById } from '@/games/registry'
import { SECRET_GAMES } from '@/systems/secret'
import { seededRandom } from '@/scenes/npc'

/** EUNGARAGE 2.0 PART 14: the two arcade games, rules only. */
describe('별똥별 받기', () => {
  it('catches what falls on the catcher, and only that', () => {
    const r = new StarfallRound({ random: () => 0.5 })
    r.stars = [
      { id: 1, x: r.x, y: FIELD.floor - CATCHER.reach + 1, vy: 0, wish: false },
      { id: 2, x: r.x + 60, y: FIELD.floor - CATCHER.reach + 1, vy: 0, wish: false },
      { id: 3, x: r.x - 4, y: FIELD.floor - 10, vy: 0, wish: true },
    ]
    const ev = r.step(0.001)
    expect(ev.filter((e) => e.kind === 'catch').map((e) => e.kind === 'catch' && e.points).sort()).toEqual([10, 50])
    expect(r.score).toBe(60)
    expect(r.wishes).toBe(1)
    expect(r.stars.map((s) => s.id)).toEqual([2])
  })

  it('walks with the keys and with a pointer, and never off the roof', () => {
    const r = new StarfallRound({ random: () => 0.99 })
    r.control('left', true)
    for (let i = 0; i < 200; i++) r.step(0.02)
    expect(r.x).toBe(CATCHER.halfWidth)
    r.control('left', false)
    r.aim(200)
    for (let i = 0; i < 200; i++) r.step(0.02)
    expect(Math.abs(r.x - 200)).toBeLessThan(3)
    r.aim(10_000)
    for (let i = 0; i < 200; i++) r.step(0.02)
    expect(r.x).toBeGreaterThan(FIELD.w - CATCHER.halfWidth - 2)
    expect(r.x).toBeLessThanOrEqual(FIELD.w - CATCHER.halfWidth)
  })

  it('is the same round for the same seed, and a minute holds plenty of stars', () => {
    const play = (): number => {
      const r = new StarfallRound({ random: seededRandom(42) })
      let spawned = 0
      for (let i = 0; i < 60 * 30; i++) { r.step(1 / 30); spawned = Math.max(spawned, r.stars.length) }
      return r.caught + r.missed + r.stars.length
    }
    const a = play()
    expect(a).toBe(play())
    expect(a).toBeGreaterThan(60)
  })

  it('gives stars for a good score', () => {
    expect([0, 150, 350, 600].map(starfallStars)).toEqual([0, 1, 2, 3])
  })
})

describe('김로드의 버그 잡기', () => {
  it('a bug is points and a streak; code and the build badge cost points and break it', () => {
    const r = new BugRound({ random: () => 0.1 })
    r.pops = [{ id: 1, cell: 0, kind: 'bug', left: 1 }, { id: 2, cell: 1, kind: 'bug', left: 1 }, { id: 3, cell: 2, kind: 'code', left: 1 }, { id: 4, cell: 3, kind: 'build', left: 1 }]
    expect(r.hit(0)).toMatchObject({ kind: 'squash', points: 10, streak: 1 })
    expect(r.hit(1)).toMatchObject({ kind: 'squash', points: 12, streak: 2 })
    expect(r.hit(2)).toMatchObject({ kind: 'oops', what: 'code', points: -15 })
    expect(r.streak).toBe(0)
    expect(r.hit(3)).toMatchObject({ kind: 'oops', what: 'build', points: -25 })
    expect(r.score).toBe(0) // never below zero
    expect(r.hit(5)).toEqual({ kind: 'empty', cell: 5 })
  })

  it('pops things on free screens only, lets bugs get away, and speeds up', () => {
    const r = new BugRound({ random: seededRandom(7), seconds: 45 })
    let escaped = 0
    for (let i = 0; i < 45 * 30; i++) {
      for (const e of r.step(1 / 30)) if (e.kind === 'escape') escaped++
      const cells = r.pops.map((p) => p.cell)
      expect(new Set(cells).size).toBe(cells.length)
      expect(cells.every((c) => c >= 0 && c < CELLS)).toBe(true)
    }
    expect(escaped).toBeGreaterThan(10)
    expect(r.pace).toBeCloseTo(1.8, 5)
  })

  it('gives stars for a good score', () => {
    expect([0, 90, 220, 400].map(bugStars)).toEqual([0, 1, 2, 3])
  })
})

describe('the arcade', () => {
  it('has both games by id, outside the playground and outside the secret door', () => {
    expect(ARCADE_GAMES.map((g) => g.id)).toEqual(['starfall', 'bugs'])
    for (const g of ARCADE_GAMES) {
      expect(gameById(g.id)).toBe(g)
      expect(GAMES).not.toContain(g)
      expect(SECRET_GAMES).not.toContain(g.id)
      expect(g.controls.length).toBeGreaterThan(0)
      expect(g.hint.length).toBeGreaterThan(10)
    }
  })
})

describe('the ARCADE page list', () => {
  it('describes exactly the games there are, as they describe themselves', async () => {
    const { ARCADE } = await import('@/data/arcade')
    const all = [...ARCADE_GAMES, ...GAMES]
    expect(ARCADE.map((a) => a.id).sort()).toEqual(all.map((g) => g.id).sort())
    for (const a of ARCADE) {
      const g = gameById(a.id)!
      expect(a.title, a.id).toBe(g.title)
      expect(a.hint, a.id).toBe(g.hint)
      expect(a.seconds, a.id).toBe(g.seconds)
      expect(a.secret, a.id).toBe(SECRET_GAMES.includes(a.id))
      expect(a.where, a.id).toBe(ARCADE_GAMES.includes(g) ? 'arcade' : 'playground')
    }
  })
})
