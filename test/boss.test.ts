import { describe, expect, it } from 'vitest'
import { Boss, CHECK_MS, WARN_MIN } from '@/games/build/boss'

/** Advance in small ticks, recording every state the machine passes through. */
function run(boss: Boss, ms: number, tick = 16): string[] {
  const seen: string[] = []
  for (let t = 0; t < ms; t += tick) {
    boss.step(tick)
    if (seen[seen.length - 1] !== boss.state) seen.push(boss.state)
  }
  return seen
}

describe('the boss', () => {
  it('never looks up without warning first', () => {
    const boss = new Boss({ random: () => 0.5 })
    const seen = run(boss, 120_000)
    for (let i = 1; i < seen.length; i++) {
      if (seen[i] === 'CHECK') expect(seen[i - 1]).toBe('WARN')
    }
    expect(seen.filter((s) => s === 'CHECK').length).toBeGreaterThan(5)
  })

  it('holds every warning for at least the promised time', () => {
    const boss = new Boss({ random: () => 0.9 })
    let inWarn = 0
    const warns: number[] = []
    for (let t = 0; t < 120_000; t += 16) {
      boss.step(16)
      if (boss.state === 'WARN') inWarn += 16
      else if (inWarn > 0) {
        warns.push(inWarn)
        inWarn = 0
      }
    }
    expect(warns.length).toBeGreaterThan(5)
    for (const w of warns) expect(w).toBeGreaterThanOrEqual(WARN_MIN - 16)
  })

  it('tightens the cycle across the round but never the warning', () => {
    const boss = new Boss({ random: () => 0.5, seconds: 45 })
    const gaps: number[] = []
    let since = 0
    for (let t = 0; t < 45_000; t += 16) {
      boss.step(16)
      since += 16
      if (boss.state === 'CHECK' && since > CHECK_MS) {
        gaps.push(since)
        since = 0
      }
    }
    expect(gaps.length).toBeGreaterThan(3)
    expect(gaps[gaps.length - 1]!).toBeLessThan(gaps[0]!)
    expect(Math.min(...gaps)).toBeGreaterThan(2500)
  })

  it('counts its checks, and a doze is only a look', () => {
    const boss = new Boss({ random: () => 0.1 })
    run(boss, 60_000)
    expect(boss.checks).toBeGreaterThan(3)
    expect(run(new Boss({ random: () => 0.1 }), 60_000)).toContain('DOZE')
    expect(run(new Boss({ random: () => 0.9 }), 60_000)).not.toContain('DOZE')
  })
})
