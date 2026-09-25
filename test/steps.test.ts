import { describe, expect, it } from 'vitest'
import { footfalls, STEP_EVERY } from '@/games/delivery/steps'

/**
 * MOMO's footfalls (WORLD 2.4): one per fifth of a second of grounded
 * walking, counted between two readings of the walk clock, so the game
 * plays one clip per step and never a machine gun.
 */
describe('footfalls', () => {
  it('fall every fifth of a second of walking', () => {
    expect(STEP_EVERY).toBe(0.2)
    let t = 0
    let n = 0
    // Sixty frames a second, for two seconds of walking.
    for (let i = 0; i < 120; i++) {
      const next = t + 1 / 60
      n += footfalls(t, next)
      t = next
    }
    expect(n).toBe(10)
  })

  it('never more than one per frame at the game\'s frame cap', () => {
    // The game clamps a frame to 50 ms, a quarter of a step.
    let t = 0
    for (let i = 0; i < 200; i++) {
      const next = t + 0.05
      expect(footfalls(t, next)).toBeLessThanOrEqual(1)
      t = next
    }
  })

  it('is nothing when the clock does not move (standing, or in the air)', () => {
    expect(footfalls(1.3, 1.3)).toBe(0)
    expect(footfalls(2.0, 1.9)).toBe(0)
  })

  it('counts a long gap honestly, but the game only ever asks frame by frame', () => {
    expect(footfalls(0, 1)).toBe(5)
  })

  it('lands exactly on the boundary', () => {
    expect(footfalls(0.19, 0.2)).toBe(1)
    expect(footfalls(0.2, 0.39)).toBe(0)
    expect(footfalls(0.39, 0.4)).toBe(1)
  })
})
