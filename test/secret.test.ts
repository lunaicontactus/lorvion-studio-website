import { describe, expect, it } from 'vitest'
import { starsAmong, SECRET_GAMES } from '@/systems/secret'

/**
 * The lock on the secret door: one star in each of the three, no more and
 * no less. A best score is not a star; a star in one game three times over
 * is not three games.
 */
const p = (stars: Record<string, number>) =>
  Object.fromEntries(Object.entries(stars).map(([id, s]) => [id, { best: 100, stars: s, plays: 1 }]))

describe('the secret door', () => {
  it('needs the three games the signpost points to', () => {
    expect(SECRET_GAMES).toEqual(['mugunghwa', 'snack', 'parcel'])
  })

  it('counts a game once it has a star, and not before', () => {
    expect(starsAmong({})).toBe(0)
    expect(starsAmong(p({ mugunghwa: 0, snack: 0, parcel: 0 }))).toBe(0)
    expect(starsAmong(p({ mugunghwa: 1 }))).toBe(1)
    expect(starsAmong(p({ mugunghwa: 3, snack: 1 }))).toBe(2)
    expect(starsAmong(p({ mugunghwa: 1, snack: 1, parcel: 1 }))).toBe(3)
  })

  it('does not count a best score without a star, or a game that is not one of the three', () => {
    expect(starsAmong({ mugunghwa: { best: 900, stars: 0, plays: 9 } })).toBe(0)
    expect(starsAmong(p({ build: 3, mock: 3 }))).toBe(0)
  })
})
