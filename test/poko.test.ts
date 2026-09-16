import { describe, expect, it } from 'vitest'
import { PokoBoss, WARN_FLOOR, type BossState } from '@/games/poko/boss'
import { PokoRound, starsFor, STARS } from '@/games/poko/round'

/**
 * The four lines the whole game is:
 *
 *     boss away     + SLACK  →  points
 *     boss away     + WORK   →  nothing
 *     boss watching + WORK   →  safe
 *     boss watching + SLACK  →  caught
 *
 * and the promise underneath them, which matters more than any of them: that
 * nobody is ever caught for something they could not have reacted to. Every
 * one of these is settled by handing the round a clock, so a minute of play
 * costs a millisecond and none of it waits.
 */

/** A patrol that can be replayed exactly. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Run until the boss is in `state`, and stop on the first tick of it. */
function until(round: PokoRound, state: BossState, cap = 60_000): boolean {
  for (let t = 0; t < cap; t += 16) {
    round.step(16)
    if (round.bossState === state) return true
    if (round.verdict !== 'PLAYING') return false
  }
  return false
}

function run(round: PokoRound, ms: number): void {
  for (let t = 0; t < ms; t += 16) round.step(16)
}

describe('the boss', () => {
  it('never looks without warning first', () => {
    // The one rule that makes the game fair. Ten rounds, every transition
    // into WATCHING checked for what came before it.
    for (let seed = 1; seed <= 10; seed++) {
      const boss = new PokoBoss({ random: seeded(seed), seconds: 45 })
      let previous = boss.state
      for (let t = 0; t < 45_000; t += 16) {
        boss.step(16)
        if (boss.state === 'WATCHING' && previous !== 'WATCHING') {
          expect(previous, `seed ${seed}: looked straight from ${previous}`).toBe('WARNING')
        }
        previous = boss.state
      }
    }
  })

  it('never gives a warning shorter than a person can use', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const boss = new PokoBoss({ random: seeded(seed), seconds: 45 })
      let previous = boss.state
      let since = 0
      for (let t = 0; t < 45_000; t += 16) {
        boss.step(16)
        since += 16
        if (boss.state !== previous) {
          if (previous === 'WARNING') {
            expect(since, `seed ${seed}: a ${since}ms warning`).toBeGreaterThanOrEqual(WARN_FLOOR)
          }
          previous = boss.state
          since = 0
        }
      }
    }
  })

  it('gets harder by shortening the quiet, never the warning', () => {
    const boss = new PokoBoss({ random: () => 0.5, seconds: 45 })
    const spans: { state: BossState; ms: number }[] = []
    let previous = boss.state
    let since = 0
    for (let t = 0; t < 45_000; t += 16) {
      boss.step(16)
      since += 16
      if (boss.state !== previous) {
        spans.push({ state: previous, ms: since })
        previous = boss.state
        since = 0
      }
    }
    const quiet = spans.filter((s) => s.state === 'PATROLLING' || s.state === 'AWAY')
    const warns = spans.filter((s) => s.state === 'WARNING')
    expect(quiet.length, 'no quiet stretches at all').toBeGreaterThan(3)
    expect(quiet[0]!.ms, 'the round did not get harder')
      .toBeGreaterThan(quiet[quiet.length - 1]!.ms)
    for (const w of warns) expect(w.ms).toBeGreaterThanOrEqual(WARN_FLOOR)
  })

  it('replays exactly from the same seed, and differently from another', () => {
    const walk = (seed: number): string => {
      const boss = new PokoBoss({ random: seeded(seed), seconds: 45 })
      const out: string[] = []
      let previous = boss.state
      for (let t = 0; t < 45_000; t += 16) {
        boss.step(16)
        if (boss.state !== previous) {
          out.push(`${boss.state}@${t}`)
          previous = boss.state
        }
      }
      return out.join(',')
    }
    expect(walk(4)).toBe(walk(4))
    expect(walk(4)).not.toBe(walk(5))
  })

  it('walks the back of the room and turns round at the ends', () => {
    const boss = new PokoBoss({ random: () => 0.9, seconds: 45 })
    const seen: number[] = []
    for (let t = 0; t < 30_000; t += 16) {
      boss.step(16)
      seen.push(boss.look.at)
    }
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0.07)
    expect(Math.max(...seen)).toBeLessThanOrEqual(0.93)
    expect(Math.max(...seen) - Math.min(...seen), 'it never went anywhere').toBeGreaterThan(0.3)
  })
})

describe('the four lines the game is', () => {
  it('pays for slacking while nobody is looking', () => {
    const round = new PokoRound({ random: seeded(3), seconds: 45 })
    expect(until(round, 'PATROLLING') || round.bossState === 'PATROLLING').toBe(true)
    round.setSlacking(true)
    const before = round.score
    run(round, 800)
    expect(round.score, 'slacking earned nothing').toBeGreaterThan(before)
  })

  it('pays nothing at all for working', () => {
    const round = new PokoRound({ random: seeded(3), seconds: 45 })
    run(round, 3000)
    expect(round.score, 'working earned something').toBe(0)
  })

  it('is safe to be working when it looks', () => {
    const round = new PokoRound({ random: seeded(6), seconds: 45 })
    expect(until(round, 'WATCHING')).toBe(true)
    run(round, 1200)
    expect(round.verdict).toBe('PLAYING')
  })

  it('is the end of the round to be slacking when it looks', () => {
    const round = new PokoRound({ random: seeded(6), seconds: 45 })
    expect(until(round, 'WARNING')).toBe(true)
    round.setSlacking(true)
    // Caught on the very tick it starts looking, which is why the helper
    // reports having reached WATCHING: the verdict is what is being asked.
    until(round, 'WATCHING')
    expect(round.verdict).toBe('CAUGHT')
  })

  it('does not catch anybody for the warning itself', () => {
    // The warning is the chance to react, not the punishment.
    const round = new PokoRound({ random: seeded(6), seconds: 45 })
    expect(until(round, 'WARNING')).toBe(true)
    round.setSlacking(true)
    run(round, WARN_FLOOR - 300)
    expect(round.verdict, 'caught during the warning').toBe('PLAYING')
  })

  it('lets go the instant the button does, whatever the picture is doing', () => {
    // The unfairest thing this game could do: catch somebody who let go in
    // time because a sprite took four frames to turn round. The judgement is
    // the logical state and only ever the logical state.
    const round = new PokoRound({ random: seeded(6), seconds: 45 })
    expect(until(round, 'WARNING')).toBe(true)
    round.setSlacking(true)
    run(round, 200)
    round.setSlacking(false)
    expect(round.slacking).toBe('WORK')
    expect(until(round, 'WATCHING')).toBe(true)
    run(round, 1500)
    expect(round.verdict, 'caught after letting go').toBe('PLAYING')
  })

  it('stops paying the moment somebody is caught', () => {
    const round = new PokoRound({ random: seeded(6), seconds: 45 })
    until(round, 'WARNING')
    round.setSlacking(true)
    until(round, 'WATCHING')
    expect(round.verdict).toBe('CAUGHT')
    const at = round.score
    run(round, 3000)
    expect(round.score, 'a caught player went on scoring').toBe(at)
  })

  it('earns nothing while it is being looked at, even working', () => {
    const round = new PokoRound({ random: seeded(6), seconds: 45 })
    until(round, 'WATCHING')
    const at = round.score
    run(round, 800)
    expect(round.score).toBe(at)
  })
})

describe('risk and reward', () => {
  /** Play a whole round with one policy, and say what it scored. */
  const play = (seed: number, wants: (r: PokoRound) => boolean, lag = 180): PokoRound => {
    const round = new PokoRound({ random: seeded(seed), seconds: 45 })
    const queue: { at: number; want: boolean }[] = []
    for (let t = 0; t < 45_000; t += 16) {
      queue.push({ at: t + lag, want: wants(round) })
      while (queue.length && queue[0]!.at <= t) round.setSlacking(queue.shift()!.want)
      round.step(16)
      if (round.verdict !== 'PLAYING') break
    }
    round.clear()
    return round
  }

  const honest = (): boolean => false
  const sensible = (r: PokoRound): boolean =>
    r.bossState === 'AWAY' || r.bossState === 'PATROLLING'
  const reckless = (): boolean => true

  it('lets somebody survive by working, and gives them almost nothing', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const r = play(seed, honest)
      expect(r.verdict, `seed ${seed}`).toBe('CLEARED')
      expect(r.score, `an honest round scored ${r.score}`).toBeLessThan(STARS[0])
    }
  })

  it('pays properly for using the quiet stretches', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const brave = play(seed, sensible)
      const dull = play(seed, honest)
      expect(brave.verdict, `seed ${seed}: caught while reacting to every warning`).toBe('CLEARED')
      expect(brave.score, `seed ${seed}`).toBeGreaterThan(dull.score * 8)
      expect(starsFor(brave.score), `seed ${seed} earned ${brave.score}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('catches somebody who never lets go', () => {
    for (let seed = 1; seed <= 5; seed++) {
      expect(play(seed, reckless).verdict, `seed ${seed}`).toBe('CAUGHT')
    }
  })

  it('has stars that mean something', () => {
    expect(starsFor(0)).toBe(0)
    expect(starsFor(STARS[0])).toBe(1)
    expect(starsFor(STARS[1])).toBe(2)
    expect(starsFor(STARS[2])).toBe(3)
    expect(starsFor(9999)).toBe(3)
    expect([...STARS].sort((a, b) => a - b)).toEqual([...STARS])
  })
})

describe('pausing', () => {
  it('freezes the boss and the score, because nothing is stepped', () => {
    // The shell stops calling `step` while it is paused, so this is the whole
    // of it: no clock in here to keep running.
    const round = new PokoRound({ random: seeded(3), seconds: 45 })
    round.setSlacking(true)
    run(round, 600)
    const state = round.bossState
    const score = round.score
    // A pause, i.e. nobody steps it for a while.
    expect(round.bossState).toBe(state)
    expect(round.score).toBe(score)
  })

  it('is working again after a hold is let go of on the player\'s behalf', () => {
    // What the shell does when the window goes: release the input, and the
    // game's own pause sets the logical state back to work.
    const round = new PokoRound({ random: seeded(3), seconds: 45 })
    round.setSlacking(true)
    expect(round.slacking).toBe('SLACK')
    round.setSlacking(false)
    expect(round.slacking, 'still slacking after the window went').toBe('WORK')
  })
})

describe('the glasses', () => {
  it('have a measured anchor for every frame the boss can show', async () => {
    const { readdirSync } = await import('node:fs')
    const { EYE_ANCHORS } = await import('@/games/poko/eyes')
    const root = 'public/assets/images/dokkaebi-v2/poko'
    // The poses POKO takes in the game, and one it could fall back to.
    for (const [action, dir] of [['idle', 'front'], ['look', 'front'], ['walk', 'front'],
      ['walk', 'left'], ['walk', 'right']] as const) {
      const frames = readdirSync(`${root}/${action}/${dir}`).filter((f) => f.endsWith('.webp'))
      expect(frames.length).toBeGreaterThan(0)
      for (const f of frames) {
        const key = `/assets/images/dokkaebi-v2/poko/${action}/${dir}/${f}`
        expect(EYE_ANCHORS[key], `${key} has no eyes measured`).toBeDefined()
      }
    }
  })

  it('knows the head turns: look is not one anchor', async () => {
    const { EYE_ANCHORS } = await import('@/games/poko/eyes')
    const xs = Object.entries(EYE_ANCHORS)
      .filter(([k]) => k.includes('/look/front/')).map(([, a]) => a[0])
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(20)
  })
})
