import { describe, expect, it } from 'vitest'
import { DeliveryRound, DOORS, GROUND, jumpHeight, LEDGES, starsFor, type DeliveryEvent } from '@/games/delivery/round'
import { seededRandom } from '@/scenes/npc'

/** Run `seconds` with these controls held, collecting what happened. */
function hold(r: DeliveryRound, seconds: number, held: readonly string[], log: string[] = []): string[] {
  for (const c of ['left', 'right', 'jump']) r.control(c, held.includes(c))
  for (let t = 0; t < seconds; t += 1 / 60) for (const e of r.step(1 / 60)) log.push((e as DeliveryEvent).kind)
  return log
}

/** Walk to x on whatever MOMO stands on. */
function walkTo(r: DeliveryRound, x: number, log: string[]): void {
  for (let i = 0; i < 600 && Math.abs(r.x - x) > 1.5; i++) hold(r, 1 / 60, [r.x < x ? 'right' : 'left'], log)
  hold(r, 0.05, [], log)
}

/** Jump, drifting toward `dir`, and wait to land. */
function jump(r: DeliveryRound, dir: 'left' | 'right' | null, log: string[]): void {
  hold(r, 0.3, dir ? ['jump', dir] : ['jump'], log)
  for (let i = 0; i < 120 && !r.grounded; i++) hold(r, 1 / 60, dir ? [dir] : [], log)
}

describe('모모의 택배 배달', () => {
  it('a jump is one event, however long the key is held, and none in the air; a second press is a second', () => {
    const r = new DeliveryRound({ empty: true })
    const log: string[] = []
    hold(r, 0.5, [], log)
    expect(log.filter((k) => k === 'jump')).toHaveLength(0)
    // Held for two whole seconds: up, down, and standing on the ground with
    // the key still down — one jump.
    hold(r, 2, ['jump'], log)
    expect(r.grounded).toBe(true)
    expect(log.filter((k) => k === 'jump')).toHaveLength(1)
    expect(log.filter((k) => k === 'land')).toHaveLength(1)
    // Let go, press again: the second.
    hold(r, 0.2, [], log)
    hold(r, 0.05, ['jump'], log)
    expect(r.grounded).toBe(false)
    expect(log.filter((k) => k === 'jump')).toHaveLength(2)
    // In the air, pressing again does nothing until the ground.
    hold(r, 0.1, [], log)
    hold(r, 0.1, ['jump'], log)
    hold(r, 0.1, [], log)
    expect(log.filter((k) => k === 'jump')).toHaveLength(2)
    for (let i = 0; i < 120 && !r.grounded; i++) hold(r, 1 / 60, [], log)
    expect(r.grounded).toBe(true)
    expect(log.filter((k) => k === 'jump')).toHaveLength(2)
  })

  it('every ledge is in reach of a jump, even carrying', () => {
    const tops = [GROUND, ...LEDGES.map((l) => l.y)].sort((a, b) => b - a)
    let biggest = 0
    for (let i = 1; i < tops.length; i++) biggest = Math.max(biggest, tops[i - 1]! - tops[i]!)
    expect(jumpHeight(true)).toBeGreaterThan(biggest + 4)
    expect(jumpHeight(false)).toBeGreaterThan(jumpHeight(true))
  })

  it('a parcel can be carried from the pile to the office on the roof, and then to the house', () => {
    const r = new DeliveryRound({ empty: true })
    const log: string[] = []
    walkTo(r, 12, log)
    expect(r.carrying).toBe(true)
    // Up: the low ledge, the middle one, the office's.
    walkTo(r, 56, log)
    jump(r, null, log)
    expect(r.y).toBe(116)
    walkTo(r, 72, log)
    jump(r, 'right', log)
    expect(r.y).toBe(90)
    walkTo(r, 142, log)
    jump(r, 'right', log)
    expect(r.y).toBe(58)
    walkTo(r, DOORS[0]!.x + 6, log)
    expect(log).toContain('deliver')
    expect(r.delivered).toBe(1)
    expect(r.target).toBe(1)
    // Down for the next, and up the other side to the house.
    walkTo(r, 150 - 12, log)
    for (let i = 0; i < 200 && r.y !== GROUND; i++) hold(r, 1 / 60, ['left'], log)
    walkTo(r, 12, log)
    expect(r.carrying).toBe(true)
    walkTo(r, 56, log)
    jump(r, null, log)
    walkTo(r, 72, log)
    jump(r, 'right', log)
    walkTo(r, 98, log)
    jump(r, 'left', log)
    expect(r.y).toBe(64)
    walkTo(r, DOORS[1]!.x + 6, log)
    expect(r.delivered).toBe(2)
    expect(r.score).toBe(100 + 125)
  })

  it('a ghost costs a heart, drops the parcel back on the pile, and gives a moment of safety', () => {
    const r = new DeliveryRound({ random: seededRandom(3) })
    r.carrying = true
    r.streak = 2
    const g = r.ghosts[0]!
    r.x = g.x
    r.y = g.y + 2
    const log = hold(r, 1 / 60, [])
    expect(log).toContain('hit')
    expect(r.lives).toBe(2)
    expect(r.carrying).toBe(false)
    expect(r.streak).toBe(0)
    expect(r.safe).toBeGreaterThan(1)
    // Safe for now: standing in the same ghost does nothing.
    r.x = g.x
    r.y = g.y + 2
    expect(hold(r, 1 / 60, [])).not.toContain('hit')
  })

  it('three hearts and the round is over', () => {
    const r = new DeliveryRound({ random: seededRandom(5) })
    for (let n = 0; n < 3; n++) {
      r.safe = 0
      const g = r.ghosts[0]!
      r.x = g.x
      r.y = g.y + 2
      hold(r, 1 / 60, [])
    }
    expect(r.over).toBe(true)
    expect(r.lives).toBe(0)
  })

  it('more of the village comes out as the deliveries go on', () => {
    const r = new DeliveryRound({ random: seededRandom(2) })
    expect(r.ghosts).toHaveLength(2)
    for (let i = 0; i < 2; i++) {
      r.carrying = true
      const d = DOORS[r.target]!
      r.x = d.x + 6
      r.y = d.y + d.h
      r.safe = 99
      hold(r, 1 / 60, [])
    }
    expect(r.delivered).toBe(2)
    expect(r.ghosts).toHaveLength(3)
  })

  it('stars: a delivery, a good round, a great one', () => {
    expect([0, 99, 100, 399, 400, 699, 700].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3])
  })
})
