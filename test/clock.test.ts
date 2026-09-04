import { describe, expect, it } from 'vitest'
import { phaseForHour, resolvePhase } from '@/systems/clock'

describe('phaseForHour', () => {
  it('maps the day', () => {
    expect(phaseForHour(2)).toBe('lateNight')
    expect(phaseForHour(7)).toBe('morning')
    expect(phaseForHour(13)).toBe('day')
    expect(phaseForHour(18)).toBe('evening')
    expect(phaseForHour(22)).toBe('night')
  })

  it('wraps out-of-range hours', () => {
    expect(phaseForHour(26)).toBe('lateNight')
    expect(phaseForHour(-1)).toBe('night')
  })
})

describe('resolvePhase', () => {
  it('honours a named override in either casing', () => {
    expect(resolvePhase('?t=lateNight')).toBe('lateNight')
    expect(resolvePhase('?t=latenight')).toBe('lateNight')
    expect(resolvePhase('?t=EVENING')).toBe('evening')
  })

  it('honours an hour override', () => {
    expect(resolvePhase('?t=23')).toBe('night')
  })

  it('falls back to the real hour for junk', () => {
    const noon = new Date(2026, 0, 1, 12, 0, 0)
    expect(resolvePhase('?t=banana', noon)).toBe('day')
    expect(resolvePhase('', noon)).toBe('day')
  })
})
