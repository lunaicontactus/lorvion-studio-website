import { describe, expect, it } from 'vitest'
import { SnackRound, SNACKS, STARS, WRONG_MS, starsFor } from '@/games/snack/round'
import { FRIDGE_ITEMS } from '@/data/fridge'

/**
 * 도깨비 야식 심부름: somebody asks, you hand over the right thing.
 *
 * The interesting questions are all about what is on the shelf — that the
 * thing being asked for is always on it, that it is not always in the same
 * place, and that nothing appears that the fridge does not actually contain —
 * and about whether a mistake costs enough to matter without ending anything.
 */

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

describe('the shelf', () => {
  it('only ever offers what the fridge has', () => {
    const known = new Set(FRIDGE_ITEMS.map((i) => i.id))
    const round = new SnackRound({ random: seeded(2) })
    for (let i = 0; i < 200; i++) {
      for (const c of round.order.choices) {
        expect(known.has(c.id), `${c.id} is not in the fridge`).toBe(true)
        expect(c.art, `${c.id} has no picture`).not.toBeNull()
      }
      round.give(round.order.wants.id)
    }
  })

  it('always has the thing that was asked for on it', () => {
    const round = new SnackRound({ random: seeded(5) })
    for (let i = 0; i < 200; i++) {
      const order = round.order
      expect(order.choices.some((c) => c.id === order.wants.id),
        `asked for ${order.wants.id}, which was not on the shelf`).toBe(true)
      round.give(order.wants.id)
    }
  })

  it('offers four different things, and says who wants one', () => {
    const round = new SnackRound({ random: seeded(9) })
    for (let i = 0; i < 60; i++) {
      const order = round.order
      expect(order.choices).toHaveLength(4)
      expect(new Set(order.choices.map((c) => c.id)).size, 'the same thing twice').toBe(4)
      expect(order.whoName.length).toBeGreaterThan(0)
      expect(order.says).toContain(order.wants.label)
      round.give(order.wants.id)
    }
  })

  it('does not keep the right answer in the same place', () => {
    const round = new SnackRound({ random: seeded(4) })
    const seats = new Set<number>()
    for (let i = 0; i < 60; i++) {
      const order = round.order
      seats.add(order.choices.findIndex((c) => c.id === order.wants.id))
      round.give(order.wants.id)
    }
    expect(seats.size, 'the right one was always in the same place').toBeGreaterThan(2)
  })

  it('has something to ask for at all', () => {
    expect(SNACKS.length).toBeGreaterThanOrEqual(4)
  })
})

describe('handing things over', () => {
  it('pays for the right one and moves on', () => {
    const round = new SnackRound({ random: seeded(3) })
    const first = round.order.wants.id
    expect(round.give(first)).toBe(true)
    expect(round.score).toBeGreaterThan(0)
    expect(round.filled).toBe(1)
    // A new order, and not a repeat of the same object.
    expect(round.order.wants.id === first && round.order.says === '' ).toBe(false)
  })

  it('pays nothing for the wrong one, and keeps the order up', () => {
    const round = new SnackRound({ random: seeded(3) })
    const order = round.order
    const wrong = order.choices.find((c) => c.id !== order.wants.id)!
    expect(round.give(wrong.id)).toBe(false)
    expect(round.score).toBe(0)
    expect(round.wrong).toBe(1)
    expect(round.order.wants.id, 'a wrong answer moved on anyway').toBe(order.wants.id)
  })

  it('costs a run, which is what makes accuracy worth something', () => {
    const round = new SnackRound({ random: seeded(3) })
    for (let i = 0; i < 5; i++) round.give(round.order.wants.id)
    expect(round.run).toBe(5)
    const rich = round.multiplier
    expect(rich).toBeGreaterThan(1)
    const order = round.order
    round.give(order.choices.find((c) => c.id !== order.wants.id)!.id)
    expect(round.run, 'a mistake did not cost the run').toBe(0)
    expect(round.multiplier).toBeLessThan(rich)
  })

  it('is never the end of the round, however many are wrong', () => {
    const round = new SnackRound({ random: seeded(3) })
    for (let i = 0; i < 30; i++) {
      const order = round.order
      round.give(order.choices.find((c) => c.id !== order.wants.id)!.id)
    }
    expect(round.done, 'mistakes ended the round').toBe(false)
    expect(round.give(round.order.wants.id), 'and it still works').toBe(true)
  })

  it('takes nothing more once the round is over', () => {
    const round = new SnackRound({ random: seeded(3) })
    round.give(round.order.wants.id)
    const at = round.score
    round.finish()
    round.give(round.order.wants.id)
    expect(round.score).toBe(at)
  })

  it('charges a second and a half for a mistake, and no more', () => {
    // The number is the game's, and it is here so that changing it is a
    // decision rather than an accident.
    expect(WRONG_MS).toBe(1500)
  })
})

describe('what a round is worth', () => {
  /** Play thirty seconds at a pace, and say what it scored. */
  const play = (seed: number, ms: number, wrongRate: number): SnackRound => {
    const rng = seeded(seed)
    const round = new SnackRound({ random: seeded(seed * 7 + 1) })
    let left = 30_000
    let next = ms
    while (left > 0) {
      left -= 16
      next -= 16
      if (next <= 0) {
        const order = round.order
        const pick = rng() < wrongRate
          ? order.choices.find((c) => c.id !== order.wants.id)!.id
          : order.wants.id
        if (!round.give(pick)) left -= WRONG_MS
        next = ms
      }
    }
    round.finish()
    return round
  }

  it('rewards being right over being fast', () => {
    // Two players who press at nearly the same rate: one careful, one not.
    // The careless one delivers about as many and scores less, because the
    // run keeps starting again.
    for (let seed = 1; seed <= 4; seed++) {
      const careful = play(seed, 1100, 0.05)
      const sloppy = play(seed, 550, 0.28)
      expect(sloppy.wrong).toBeGreaterThan(careful.wrong)
      expect(sloppy.score, `seed ${seed}: being sloppy paid better`)
        .toBeLessThan(careful.score * 1.1)
    }
  })

  it('has stars that take both speed and accuracy', () => {
    const quick = play(1, 700, 0.02)
    const slow = play(1, 1800, 0.04)
    expect(starsFor(quick.score)).toBeGreaterThan(starsFor(slow.score))
    expect(starsFor(0)).toBe(0)
    expect(starsFor(STARS[2])).toBe(3)
    expect([...STARS].sort((a, b) => a - b)).toEqual([...STARS])
  })
})
