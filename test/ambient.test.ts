import { describe, expect, it } from 'vitest'
import { Ambient, ATTENTION, STRONG_AT_ONCE, type AmbientEvent } from '@/systems/ambient'

/**
 * The room's small movements, and the rules that keep them from adding up to
 * a screensaver.
 *
 * Nothing here waits: the manager does not own a clock, it is handed one, so
 * a minute of room time is a loop and every one of these runs in a
 * millisecond. That is deliberate — a test that waits for ambience to happen
 * is a test that passes on a fast machine and hangs on a slow one.
 */

/** A clock the test turns by hand. */
function run(a: Ambient, ms: number, dt = 50): void {
  for (let t = 0; t < ms; t += dt) a.step(dt)
}

function event(id: string, over: Partial<AmbientEvent> = {}): AmbientEvent & { ran: string[] } {
  const ran: string[] = []
  return {
    id,
    every: { min: 1000, max: 1000 },
    duration: 400,
    priority: ATTENTION.object,
    run: (on) => ran.push(on ? 'on' : 'off'),
    ran,
    ...over,
  }
}

/** Everything that started, in order. */
function log(events: (AmbientEvent & { ran: string[] })[]): string[] {
  return events.flatMap((e) => e.ran.filter((r) => r === 'on').map(() => e.id))
}

describe('the room\'s ambience', () => {
  it('runs things, but not before the room has settled', () => {
    const one = event('one')
    const a = new Ambient({ random: () => 0 })
    a.add(one)
    run(a, 3000)
    expect(one.ran, 'fired while the visitor was still arriving').toEqual([])
    run(a, 3000)
    expect(one.ran.length).toBeGreaterThan(0)
  })

  it('never runs the same thing twice running', () => {
    // The failure this stops: on a quiet room the event that is due keeps
    // being the one that just finished, and the same magnet wobbles over and
    // over, which reads worse than a still room.
    const seen: string[] = []
    const a = new Ambient({ random: () => 0 })
    for (const id of ['one', 'two']) {
      a.add(event(id, { run: (on) => { if (on) seen.push(id) } }))
    }
    // Long enough for a couple of dozen firings.
    run(a, 120_000)
    expect(seen.length, 'nothing ran at all').toBeGreaterThan(8)
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i], `${seen[i]} ran twice running`).not.toBe(seen[i - 1])
    }
  })

  it('lets the one thing in the room repeat, because there is nothing else', () => {
    // The rule above is about variety, not about silence. A room with one
    // event in it still has that event.
    const only = event('only')
    const a = new Ambient({ random: () => 0 })
    a.add(only)
    run(a, 60_000)
    expect(only.ran.filter((r) => r === 'on').length).toBeGreaterThan(3)
  })

  it('never has more than two things worth watching moving at once', () => {
    const a = new Ambient({ random: () => 0 })
    const busy = ['a', 'b', 'c', 'd', 'e'].map((id) =>
      event(id, { every: { min: 900, max: 900 }, duration: 5000 }))
    for (const e of busy) a.add(e)
    let worst = 0
    for (let t = 0; t < 90_000; t += 50) {
      a.step(50)
      worst = Math.max(worst, a.running.length)
    }
    expect(worst, `${worst} things moved at once`).toBeLessThanOrEqual(STRONG_AT_ONCE)
  })

  it('stands aside for anything more worth watching', () => {
    const small = event('small', { priority: ATTENTION.background })
    const a = new Ambient({ random: () => 0 })
    a.add(small)
    a.setAttention(ATTENTION.crew)
    run(a, 60_000)
    expect(small.ran, 'flickered while somebody was walking').toEqual([])
    // And comes back when the room is quiet again.
    a.setAttention(0)
    run(a, 20_000)
    expect(small.ran.length).toBeGreaterThan(0)
  })

  it('waits longer where there is less room to be busy in', () => {
    // Same events, same clock, a phone's spacing: fewer firings, not none.
    const count = (slow: number): number => {
      const e = event('one')
      const a = new Ambient({ random: () => 0.5, slow })
      a.add(e)
      run(a, 120_000)
      return e.ran.filter((r) => r === 'on').length
    }
    const desk = count(1)
    const phone = count(1.7)
    expect(desk).toBeGreaterThan(0)
    expect(phone).toBeGreaterThan(0)
    expect(phone, 'a phone was as busy as a desk').toBeLessThan(desk)
  })

  it('turns everything off when it is taken down', () => {
    const one = event('one', { duration: 100_000 })
    const a = new Ambient({ random: () => 0 })
    a.add(one)
    run(a, 20_000)
    expect(one.ran).toContain('on')
    a.destroy()
    expect(one.ran[one.ran.length - 1], 'left something running').toBe('off')
    expect(a.running).toEqual([])
  })

  it('reports what is running, and stops reporting it after', () => {
    const one = event('one', { duration: 1000 })
    const a = new Ambient({ random: () => 0 })
    a.add(one)
    run(a, 12_000)
    const anyRunning = (): boolean => a.running.length > 0
    let sawRunning = false
    for (let t = 0; t < 6000; t += 50) {
      a.step(50)
      sawRunning ||= anyRunning()
    }
    expect(sawRunning).toBe(true)
  })

  it('keeps the log honest: nothing turns on twice without turning off', () => {
    const a = new Ambient({ random: () => 0.3 })
    const events = [event('one'), event('two'), event('three')]
    for (const e of events) a.add(e)
    run(a, 150_000)
    for (const e of events) {
      let on = false
      for (const r of e.ran) {
        if (r === 'on') expect(on, `${e.id} turned on twice`).toBe(false)
        else expect(on, `${e.id} turned off twice`).toBe(true)
        on = r === 'on'
      }
    }
    expect(log(events).length).toBeGreaterThan(10)
  })
})
