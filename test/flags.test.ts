import { describe, expect, it } from 'vitest'
import { resolveFlags } from '@/systems/flags'

describe('resolveFlags', () => {
  it('defaults to the safe answer', () => {
    const f = resolveFlags('')
    expect(f.legacyHero).toBe(true)
    expect(f.alley).toBe(false)
    expect(f.miniGames).toBe(false)
  })

  it('accepts several truthy spellings', () => {
    for (const v of ['1', 'true', 'on', 'yes', '']) {
      expect(resolveFlags(`?alley=${v}`).alley).toBe(true)
    }
  })

  it('accepts falsy spellings', () => {
    for (const v of ['0', 'false', 'off', 'no']) {
      expect(resolveFlags(`?legacyHero=${v}`).legacyHero).toBe(false)
    }
  })

  it('ignores unknown keys and junk values', () => {
    const f = resolveFlags('?nope=on&alley=maybe')
    expect(f).not.toHaveProperty('nope')
    expect(f.alley).toBe(false)
  })
})
