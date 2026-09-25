import { describe, expect, it } from 'vitest'
import { HANDS, ownerFor } from '@/systems/musicOwner'

/**
 * Who owns the music (WORLD 2.4): exactly one at a time, and the hands are
 * sequential — the one going out is silent before the next comes in.
 */
describe('the music owner', () => {
  it('is the garage with sound on and the radio off', () => {
    expect(ownerFor({ inRoom: true, radioOn: false, world: null })).toBe('garage')
  })

  it('is the radio when its knob is on, in the room', () => {
    expect(ownerFor({ inRoom: true, radioOn: true, world: null })).toBe('radio')
  })

  it('is the world outside, whatever the radio was left on', () => {
    expect(ownerFor({ inRoom: false, radioOn: true, world: 'playground' })).toBe('playground')
    expect(ownerFor({ inRoom: false, radioOn: false, world: 'archive' })).toBe('archive')
    expect(ownerFor({ inRoom: false, radioOn: true, world: 'game' })).toBe('game')
  })

  it('is nobody between worlds', () => {
    expect(ownerFor({ inRoom: false, radioOn: true, world: null })).toBeNull()
  })

  it('never names two', () => {
    for (const inRoom of [true, false]) for (const radioOn of [true, false]) for (const world of [null, 'playground', 'archive', 'game'] as const) {
      const o = ownerFor({ inRoom, radioOn, world })
      expect([null, 'garage', 'radio', 'playground', 'archive', 'game']).toContain(o)
    }
  })

  it('hands over in order, in the range the studio asked for', () => {
    expect(HANDS.garageOut).toBeGreaterThanOrEqual(700)
    expect(HANDS.garageOut).toBeLessThanOrEqual(1000)
    expect(HANDS.radioIn).toBeGreaterThanOrEqual(500)
    expect(HANDS.radioIn).toBeLessThanOrEqual(800)
    expect(HANDS.garageIn).toBeGreaterThanOrEqual(700)
    expect(HANDS.garageIn).toBeLessThanOrEqual(1000)
    expect(HANDS.radioOut).toBeGreaterThan(0)
  })
})
