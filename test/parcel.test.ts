import { describe, expect, it } from 'vitest'
import { ParcelRound, STARS, WRONG_MS, starsFor } from '@/games/parcel/round'
import { PROJECTS } from '@/data/projects'

/**
 * 택배 정리: what came in this week, split between the five things being made.
 *
 * The interesting question is the difficulty, because the easy way to make
 * sorting harder is to make the label smaller — and a game you lose because
 * you could not read something is not a game. What grows here is how many
 * piles are out, and these check that it grows, that it stops at five, and
 * that the right pile is always one of them.
 */

function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

describe('the piles', () => {
  it('always has the parcel\'s own pile out', () => {
    const round = new ParcelRound({ random: seeded(2) })
    for (let i = 0; i < 200; i++) {
      round.setProgress(i / 200)
      const p = round.parcel
      expect(p.piles.some((q) => q.id === p.project.id),
        `a parcel for ${p.project.id} with no ${p.project.id} pile`).toBe(true)
      round.sort(p.project.id)
    }
  })

  it('only ever offers real projects, each one once', () => {
    const known = new Set(PROJECTS.map((p) => p.id))
    const round = new ParcelRound({ random: seeded(8) })
    for (let i = 0; i < 120; i++) {
      round.setProgress(i / 120)
      const piles = round.parcel.piles
      for (const q of piles) expect(known.has(q.id), `${q.id} is not a project`).toBe(true)
      expect(new Set(piles.map((q) => q.id)).size, 'the same pile twice').toBe(piles.length)
      round.sort(round.parcel.project.id)
    }
  })

  it('gets harder by putting more piles out, and stops at all of them', () => {
    const at = (t: number): number => {
      const round = new ParcelRound({ random: seeded(4) })
      round.setProgress(t)
      round.sort(round.parcel.project.id)
      return round.parcel.piles.length
    }
    expect(at(0)).toBe(3)
    expect(at(1)).toBe(PROJECTS.length)
    expect(at(1), 'more piles than there are projects').toBeLessThanOrEqual(PROJECTS.length)
    expect(at(0.5)).toBeGreaterThanOrEqual(at(0))
    expect(at(1)).toBeGreaterThan(at(0))
  })

  it('keeps the piles in the same order, so the row can be learned', () => {
    const round = new ParcelRound({ random: seeded(6) })
    round.setProgress(1)
    round.sort(round.parcel.project.id)
    for (let i = 0; i < 40; i++) {
      const order = round.parcel.piles.map((p) => PROJECTS.indexOf(p))
      expect([...order].sort((a, b) => a - b), 'the row reshuffled itself').toEqual(order)
      round.sort(round.parcel.project.id)
    }
  })
})

describe('sorting', () => {
  it('pays for the right pile and brings the next parcel', () => {
    const round = new ParcelRound({ random: seeded(3) })
    const first = round.parcel.project.id
    expect(round.sort(first)).toBe(true)
    expect(round.score).toBeGreaterThan(0)
    expect(round.sorted).toBe(1)
  })

  it('pays nothing for the wrong one, and keeps the parcel', () => {
    const round = new ParcelRound({ random: seeded(3) })
    const p = round.parcel
    const wrong = p.piles.find((q) => q.id !== p.project.id)!
    expect(round.sort(wrong.id)).toBe(false)
    expect(round.score).toBe(0)
    expect(round.wrong).toBe(1)
    expect(round.parcel.project.id, 'a wrong pile moved the parcel on').toBe(p.project.id)
  })

  it('costs the run, which is what makes accuracy worth something', () => {
    const round = new ParcelRound({ random: seeded(3) })
    for (let i = 0; i < 5; i++) round.sort(round.parcel.project.id)
    const rich = round.multiplier
    expect(rich).toBeGreaterThan(1)
    const p = round.parcel
    round.sort(p.piles.find((q) => q.id !== p.project.id)!.id)
    expect(round.run).toBe(0)
    expect(round.multiplier).toBeLessThan(rich)
  })

  it('never ends the round on a mistake', () => {
    const round = new ParcelRound({ random: seeded(3) })
    for (let i = 0; i < 30; i++) {
      const p = round.parcel
      round.sort(p.piles.find((q) => q.id !== p.project.id)!.id)
    }
    expect(round.done).toBe(false)
    expect(round.sort(round.parcel.project.id)).toBe(true)
  })

  it('charges the same as the other errand game, and says so once', () => {
    expect(WRONG_MS).toBe(1500)
  })
})

describe('what a round is worth', () => {
  const play = (seed: number, ms: number, wrongRate: number): ParcelRound => {
    const rng = seeded(seed)
    const round = new ParcelRound({ random: seeded(seed * 7 + 1) })
    let left = 30_000
    let next = ms
    while (left > 0) {
      left -= 16
      next -= 16
      round.setProgress(1 - left / 30_000)
      if (next <= 0) {
        const p = round.parcel
        const pick = rng() < wrongRate
          ? p.piles.find((q) => q.id !== p.project.id)!.id
          : p.project.id
        if (!round.sort(pick)) left -= WRONG_MS
        next = ms
      }
    }
    round.finish()
    return round
  }

  it('rewards being right over being fast', () => {
    for (let seed = 1; seed <= 4; seed++) {
      const careful = play(seed, 1000, 0.05)
      const sloppy = play(seed, 500, 0.3)
      expect(sloppy.wrong).toBeGreaterThan(careful.wrong)
      expect(sloppy.score, `seed ${seed}: sloppy paid better`).toBeLessThan(careful.score)
    }
  })

  it('has stars that need both', () => {
    expect(starsFor(play(1, 650, 0.02).score))
      .toBeGreaterThan(starsFor(play(1, 1700, 0.03).score))
    expect(starsFor(0)).toBe(0)
    expect(starsFor(STARS[2])).toBe(3)
    expect([...STARS].sort((a, b) => a - b)).toEqual([...STARS])
  })
})
