import { describe, expect, it, vi } from 'vitest'
import { Ticker } from '@/systems/tick'

describe('Ticker', () => {
  it('clamps a long frame so a backgrounded tab cannot jump', () => {
    const t = new Ticker()
    let delta = -1
    t.subscribe((i) => { delta = i.delta })
    t.step(0)
    t.step(60_000)
    expect(delta).toBeLessThanOrEqual(64)
  })

  it('runs listeners in priority order', () => {
    const t = new Ticker()
    const order: string[] = []
    t.subscribe(() => order.push('late'), 10)
    t.subscribe(() => order.push('early'), -10)
    t.step(0)
    expect(order).toEqual(['early', 'late'])
  })

  it('lets a listener unsubscribe itself mid-frame', () => {
    const t = new Ticker()
    const calls: string[] = []
    const off = t.subscribe(() => { calls.push('a'); off() }, 0)
    t.subscribe(() => calls.push('b'), 1)
    t.step(0)
    t.step(16)
    expect(calls).toEqual(['a', 'b', 'b'])
  })

  it('drops a throwing listener instead of stopping the world', () => {
    const t = new Ticker()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let good = 0
    t.subscribe(() => { throw new Error('boom') })
    t.subscribe(() => { good++ })
    t.step(0)
    t.step(16)
    expect(good).toBe(2)
    spy.mockRestore()
  })

  it('scales time', () => {
    const t = new Ticker()
    let delta = 0
    t.subscribe((i) => { delta = i.delta })
    t.setTimeScale(2)
    t.step(0)
    t.step(10)
    expect(delta).toBe(20)
  })

  it('accumulates elapsed time', () => {
    const t = new Ticker()
    t.subscribe(() => undefined)
    t.step(0)
    t.step(10)
    t.step(20)
    expect(t.elapsed).toBeGreaterThan(0)
  })
})
