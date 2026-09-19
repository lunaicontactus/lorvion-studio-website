import { describe, expect, it } from 'vitest'
import { SneakRound, starsFor, TIMING, NOISE } from '@/games/sneak/round'
import { seededRandom } from '@/scenes/npc'

/** Play 45 seconds with a policy that decides, each frame, whether YOMI eats. */
function play(seed: number, policy: (r: SneakRound, t: number, sinceNotice: number) => boolean) {
  const r = new SneakRound({ random: seededRandom(seed) })
  const dt = 1 / 60
  let sinceNotice = Infinity
  const events: string[] = []
  for (let t = 0; t < 45 && !r.over; t += dt) {
    r.setEating(policy(r, t, sinceNotice))
    for (const e of r.step(dt)) {
      events.push(e.kind)
      if (e.kind === 'notice') sinceNotice = 0
    }
    if (r.poko === 'NOTICE' || r.poko === 'TURN' || r.poko === 'WATCH') sinceNotice += dt
    else sinceNotice = Infinity
  }
  return { r, events }
}

/** Eats whenever POKO works; lets go `reaction` seconds after its head comes up, whatever POKO does next. */
const attentive = (reaction: number) => (r: SneakRound, _t: number, since: number) =>
  r.poko === 'WORK' || r.poko === 'RECOVER' || since < reaction

describe('요미의 과자 몰래 먹기', () => {
  it('an attentive player is never caught, and earns stars for it', () => {
    for (const seed of [1, 2, 3, 7, 11, 42]) {
      const { r } = play(seed, attentive(0.2))
      expect(r.caught, `seed ${seed}`).toBe(0)
      expect(starsFor(r.score), `seed ${seed}: ${r.score}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('a greedy player who never lets go is caught three times, fast', () => {
    for (const seed of [1, 2, 3]) {
      const { r, events } = play(seed, () => true)
      expect(r.over, `seed ${seed}`).toBe(true)
      expect(r.caught).toBe(3)
      expect(events.filter((e) => e === 'caught')).toHaveLength(3)
    }
  })

  it('doing nothing is safe and worth nothing', () => {
    const { r } = play(5, () => false)
    expect(r.score).toBe(0)
    expect(r.caught).toBe(0)
    expect(r.noise).toBe(0)
  })

  it('the warning is long enough to react to, and noise shortens it', () => {
    expect(TIMING.notice[0]).toBeGreaterThan(0.5)
    expect(TIMING.noticeLoud).toBeLessThan(TIMING.notice[0])
    // A slow reaction (0.9 s) against a quiet room still usually makes it;
    // against a loud one it does not.
    const slow = [1, 2, 3, 4, 5, 6].map((s) => play(s, attentive(0.9)).r.caught)
    expect(slow.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
  })

  it('eating is noise, and a long run of it is louder and worth more', () => {
    // The longest quiet spell POKO keeps (random at its top): two seconds of
    // eating is inside it, and by then the room is loud.
    const r = new SneakRound({ random: () => 0.99 })
    r.setEating(true)
    let bites = 0
    for (let t = 0; t < 2; t += 0.05) for (const e of r.step(0.05)) if (e.kind === 'bite') bites += 1
    expect(r.poko).toBe('WORK')
    expect(r.noise).toBeGreaterThanOrEqual(NOISE.loud)
    expect(r.multiplier).toBe(2)
    expect(bites).toBeGreaterThanOrEqual(4)
    // Ten a second, doubled after a second and a half: about 25 in two seconds.
    expect(r.score).toBeGreaterThanOrEqual(24)
    r.setEating(false)
    expect(r.multiplier).toBe(1)
    const loud = r.noise
    r.step(1)
    expect(r.noise).toBeLessThan(loud)
  })

  it('POKO sometimes looks up and goes back to work without turning', () => {
    let fakeouts = 0
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) fakeouts += play(seed, () => false).events.filter((e) => e === 'fakeout').length
    expect(fakeouts).toBeGreaterThan(0)
  })

  it('is the same round for the same seed', () => {
    expect(play(9, attentive(0.2)).r.score).toBe(play(9, attentive(0.2)).r.score)
  })

  it('stars: patient, good, daring', () => {
    expect([0, 99, 100, 199, 200, 269, 270].map(starsFor)).toEqual([0, 0, 1, 1, 2, 2, 3])
  })
})
