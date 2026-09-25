import { describe, expect, it } from 'vitest'
import { COUNTS, makeShot, makeStars, nextShootingGap, SHOOTING } from '@/scenes/sky'

/** A small seeded generator, so the sky is the same twice. */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 0x1_0000_0000
  }
}

/**
 * The sky through the telescope (WORLD 2.4): depth, not a handful of dots;
 * some stars breathe and not all together; a star falls after a wait,
 * never on the same path.
 */
describe('the star field', () => {
  const field = makeStars(seeded(7))

  it('has three depths, many far and few near', () => {
    expect(field.far).toHaveLength(COUNTS.far)
    expect(field.mid).toHaveLength(COUNTS.mid)
    expect(field.near).toHaveLength(COUNTS.near)
    expect(COUNTS.far + COUNTS.mid + COUNTS.near).toBeGreaterThan(500)
    expect(COUNTS.far).toBeGreaterThan(COUNTS.mid * 2)
    expect(COUNTS.mid).toBeGreaterThan(COUNTS.near * 4)
  })

  it('keeps every star in the sky', () => {
    for (const s of [...field.far, ...field.mid, ...field.near]) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThan(1)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThan(1)
    }
  })

  it('gives each depth its own size and light, and no two stars the same', () => {
    const size = (stars: readonly { r: number }[]): number => stars.reduce((a, s) => a + s.r, 0) / stars.length
    const light = (stars: readonly { a: number }[]): number => stars.reduce((a, s) => a + s.a, 0) / stars.length
    expect(size(field.far)).toBeLessThan(size(field.mid))
    expect(size(field.mid)).toBeLessThan(size(field.near))
    expect(light(field.far)).toBeLessThan(light(field.mid))
    expect(light(field.mid)).toBeLessThan(light(field.near))
    const seen = new Set([...field.far, ...field.mid, ...field.near].map((s) => `${s.r.toFixed(3)}:${s.a.toFixed(3)}`))
    expect(seen.size).toBeGreaterThan(600)
  })

  it('has some stars breathing, never all, each on its own beat', () => {
    const all = [...field.far, ...field.mid, ...field.near]
    const breathing = all.filter((s) => s.tw > 0)
    expect(breathing.length / all.length).toBeGreaterThan(0.15)
    expect(breathing.length / all.length).toBeLessThan(0.4)
    for (const s of breathing) {
      expect(s.tw).toBeLessThanOrEqual(0.55)
      expect(s.period).toBeGreaterThanOrEqual(2200)
      expect(s.period).toBeLessThanOrEqual(6400)
    }
    const periods = new Set(breathing.map((s) => Math.round(s.period / 100)))
    expect(periods.size).toBeGreaterThan(20)
    const phases = new Set(breathing.map((s) => Math.round(s.phase * 10)))
    expect(phases.size).toBeGreaterThan(20)
  })

  it('is the same sky from the same seed, and another from another', () => {
    const again = makeStars(seeded(7))
    expect(again).toEqual(field)
    const other = makeStars(seeded(8))
    expect(other.far[0]).not.toEqual(field.far[0])
  })
})

describe('a falling star', () => {
  it('waits a little the first time, then comes every five to fifteen seconds', () => {
    const rnd = seeded(3)
    for (let i = 0; i < 200; i++) {
      const first = nextShootingGap(rnd, true)
      expect(first).toBeGreaterThanOrEqual(SHOOTING.firstMin)
      expect(first).toBeLessThanOrEqual(SHOOTING.firstMax)
      const gap = nextShootingGap(rnd)
      expect(gap).toBeGreaterThanOrEqual(5000)
      expect(gap).toBeLessThanOrEqual(15000)
    }
    expect(SHOOTING.twinChance).toBeLessThan(0.2)
  })

  it('starts somewhere in the upper sky, goes down and to a side, never the same path twice', () => {
    const rnd = seeded(11)
    const shots = Array.from({ length: 60 }, (_, i) => makeShot(rnd, i * 1000))
    const paths = new Set(shots.map((s) => `${s.x.toFixed(2)}:${s.y.toFixed(2)}:${s.angle.toFixed(2)}`))
    expect(paths.size).toBe(60)
    let left = 0
    for (const s of shots) {
      expect(s.y).toBeLessThan(0.6)
      expect(s.x).toBeGreaterThan(0.1)
      expect(s.x).toBeLessThan(0.9)
      // Downward (y down): the sine of the angle is positive.
      expect(Math.sin(s.angle)).toBeGreaterThan(0)
      if (Math.cos(s.angle) < 0) left += 1
      expect(s.len).toBeGreaterThanOrEqual(150)
      expect(s.dur).toBeGreaterThanOrEqual(650)
      expect(s.dur).toBeLessThanOrEqual(1050)
    }
    expect(left).toBeGreaterThan(10)
    expect(left).toBeLessThan(50)
  })
})
