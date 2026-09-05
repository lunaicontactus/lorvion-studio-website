import { describe, expect, it } from 'vitest'
import { resolveFlags } from '@/systems/flags'

describe('resolveFlags', () => {
  it('ships only what is finished', () => {
    const f = resolveFlags('')
    expect(f.alley).toBe(true)
    expect(f.garage).toBe(false)
    expect(f.characters).toBe(false)
    expect(f.miniGames).toBe(false)
  })

  it('accepts several truthy spellings', () => {
    for (const v of ['1', 'true', 'on', 'yes', '']) {
      expect(resolveFlags(`?garage=${v}`).garage).toBe(true)
    }
  })

  it('accepts falsy spellings', () => {
    for (const v of ['0', 'false', 'off', 'no']) {
      expect(resolveFlags(`?alley=${v}`).alley).toBe(false)
    }
  })

  it('ignores unknown keys and junk values', () => {
    const f = resolveFlags('?nope=on&garage=maybe')
    expect(f).not.toHaveProperty('nope')
    expect(f.garage).toBe(false)
  })
})
