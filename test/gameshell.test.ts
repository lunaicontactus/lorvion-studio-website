import { describe, expect, it, beforeEach } from 'vitest'
import { GameStateMachine, TRANSITIONS, may, type GameState } from '@/games/state'
import { RoundClock } from '@/games/clock'
import { bestFor, forget, progressFor, record } from '@/games/scores'

/** A localStorage stand-in: the tests run in node, which has none. */
class MemoryStorage implements Storage {
  #m = new Map<string, string>()
  get length(): number { return this.#m.size }
  clear(): void { this.#m.clear() }
  getItem(k: string): string | null { return this.#m.get(k) ?? null }
  key(i: number): string | null { return [...this.#m.keys()][i] ?? null }
  removeItem(k: string): void { this.#m.delete(k) }
  setItem(k: string, v: string): void { this.#m.set(k, v) }
}
globalThis.localStorage = new MemoryStorage()

/**
 * The promises the shell makes to all three games, settled where they can be
 * settled: in a loop, with a clock that is handed to us.
 *
 * The browser half — that a lost window pauses, that a retry does not leave a
 * second copy of every listener — is in e2e/gameshell.spec.ts. What is here is
 * the part that must be true before any of that: the table of what may happen
 * next, a clock that cannot run twice, and a store that will not believe
 * nonsense or forget a record.
 */

describe('the state table', () => {
  it('has a way in and a way out of everything', () => {
    const states = Object.keys(TRANSITIONS) as GameState[]
    for (const s of states) {
      if (s !== 'CLOSED') {
        expect(states.some((from) => may(from, s)), `nothing reaches ${s}`).toBe(true)
      }
      expect(may(s, 'CLOSED') || s === 'CLOSED', `no way out of ${s}`).toBe(true)
    }
  })

  it('walks the round the visitor actually walks', () => {
    const m = new GameStateMachine()
    expect(m.to('READY')).toBe(true)
    expect(m.to('COUNTDOWN')).toBe(true)
    expect(m.to('PLAYING')).toBe(true)
    expect(m.to('PAUSED')).toBe(true)
    expect(m.to('PLAYING')).toBe(true)
    expect(m.to('RESULT')).toBe(true)
    expect(m.to('COUNTDOWN')).toBe(true)
    expect(m.state).toBe('COUNTDOWN')
  })

  it('refuses what cannot happen, and stays where it was', () => {
    const m = new GameStateMachine()
    m.to('READY')
    // Straight from the ready screen to a result would be a score for a round
    // nobody played.
    expect(m.to('RESULT')).toBe(false)
    expect(m.state).toBe('READY')
    m.to('COUNTDOWN')
    m.to('PLAYING')
    m.to('PAUSED')
    // And giving up is leaving, not finishing.
    expect(m.to('RESULT')).toBe(false)
    expect(m.state).toBe('PAUSED')
  })

  it('lets a countdown be lost the way a round can', () => {
    const m = new GameStateMachine()
    m.to('READY')
    m.to('COUNTDOWN')
    expect(m.to('PAUSED'), 'alt-tabbing during "3, 2, 1" carried on regardless').toBe(true)
  })

  it('tells whoever is listening, once per move', () => {
    const seen: string[] = []
    const m = new GameStateMachine((to, from) => seen.push(`${from}>${to}`))
    m.to('READY')
    m.to('READY')
    m.to('COUNTDOWN')
    expect(seen).toEqual(['CLOSED>READY', 'READY>COUNTDOWN'])
  })
})

describe('the round clock', () => {
  /** A second of frames at the rate the room draws them. */
  const second = (c: RoundClock): void => {
    for (let i = 0; i < 1000 / 16; i++) c.step(16)
  }

  it('counts down only while it is running', () => {
    const c = new RoundClock(10)
    second(c)
    expect(c.left, 'ran before it was started').toBe(10)
    c.start()
    second(c)
    expect(c.left).toBeCloseTo(9, 1)
    c.pause()
    for (let i = 0; i < 200; i++) c.step(16)
    expect(c.left, 'ran while paused').toBeCloseTo(9, 1)
    c.resume()
    second(c)
    expect(c.left).toBeCloseTo(8, 1)
  })

  it('cannot be made to run twice', () => {
    // The bug this shape of clock exists to forbid: start, then resume, and
    // the round runs at double speed with two timers subtracting from it.
    const c = new RoundClock(10)
    c.start()
    c.start()
    c.resume()
    c.resume()
    for (let i = 0; i < 1000 / 16; i++) c.step(16)
    expect(c.left).toBeCloseTo(9, 1)
  })

  it('stops at zero and says so exactly once', () => {
    const c = new RoundClock(1)
    c.start()
    let ended = 0
    for (let i = 0; i < 40; i++) if (c.step(64)) ended += 1
    expect(ended, 'the end of the round happened more than once').toBe(1)
    expect(c.left).toBe(0)
    expect(c.done).toBe(true)
    expect(c.running).toBe(false)
    // And stays stopped.
    for (let i = 0; i < 10; i++) expect(c.step(64)).toBe(false)
  })

  it('will not resume a round that is over', () => {
    const c = new RoundClock(1)
    c.start()
    while (!c.done) c.step(64)
    c.resume()
    expect(c.running).toBe(false)
  })

  it('gives a retry a whole round back', () => {
    const c = new RoundClock(5)
    c.start()
    for (let i = 0; i < 40; i++) c.step(64)
    expect(c.left).toBeLessThan(5)
    c.reset()
    expect(c.left).toBe(5)
    expect(c.done).toBe(false)
    expect(c.running, 'a reset clock started itself').toBe(false)
  })

  it('refuses a minute handed to it by a tab that was away', () => {
    // The room's ticker stops in a hidden tab, but a slow frame can still
    // arrive large, and a forty-five second round must not lose four seconds
    // to one of them.
    const c = new RoundClock(10)
    c.start()
    c.step(60_000)
    expect(c.left).toBeGreaterThanOrEqual(9.9)
  })
})

describe('what the games remember', () => {
  beforeEach(() => {
    for (const id of ['t1', 't2']) forget(id)
  })

  it('starts at nothing', () => {
    expect(bestFor('t1')).toBe(0)
    expect(progressFor('t1')).toEqual({ best: 0, stars: 0, plays: 0 })
  })

  it('keeps the best score and never lowers it', () => {
    record('t1', 40, 2)
    expect(bestFor('t1')).toBe(40)
    record('t1', 12, 1)
    expect(bestFor('t1'), 'a worse round replaced a better one').toBe(40)
    expect(progressFor('t1').stars, 'fewer stars replaced more').toBe(2)
    record('t1', 55, 3)
    expect(bestFor('t1')).toBe(55)
    expect(progressFor('t1')).toEqual({ best: 55, stars: 3, plays: 3 })
  })

  it('counts every finished round, good or bad', () => {
    record('t2', 0, 0)
    record('t2', 0, 0)
    expect(progressFor('t2').plays).toBe(2)
  })

  it('does not believe nonsense somebody left in storage', () => {
    localStorage.setItem('eungarage.progress.t1', 'not json at all')
    expect(progressFor('t1'), 'a stray character broke the page').toEqual({ best: 0, stars: 0, plays: 0 })
    localStorage.setItem('eungarage.progress.t1', '{"best":"lots","stars":99,"plays":-4}')
    const p = progressFor('t1')
    expect(p.best).toBe(0)
    expect(p.stars, 'ninety-nine stars').toBe(0)
    expect(p.plays).toBe(0)
    localStorage.setItem('eungarage.minigame.t1.best', 'NaN')
    expect(bestFor('t1')).toBe(0)
  })

  it('keeps its own corner of storage', () => {
    record('t1', 7, 1)
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.includes('t1')) keys.push(k)
    }
    expect(keys.sort()).toEqual(['eungarage.minigame.t1.best', 'eungarage.progress.t1'])
  })
})
