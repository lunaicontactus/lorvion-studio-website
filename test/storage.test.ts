import { describe, expect, it } from 'vitest'
import { SaveStore, createDefaultSave, migrate, isStorageAvailable } from '@/systems/storage'
import { SAVE_VERSION } from '@/types/save'

/** A localStorage stand-in we can break on purpose. */
class MemoryStorage implements Storage {
  #m = new Map<string, string>()
  throwOnWrite = false
  get length(): number { return this.#m.size }
  clear(): void { this.#m.clear() }
  getItem(k: string): string | null { return this.#m.get(k) ?? null }
  key(i: number): string | null { return [...this.#m.keys()][i] ?? null }
  removeItem(k: string): void { this.#m.delete(k) }
  setItem(k: string, v: string): void {
    if (this.throwOnWrite) throw new DOMException('QuotaExceededError')
    this.#m.set(k, v)
  }
}

const KEY = 'eungarage:save'

describe('migrate', () => {
  it('returns defaults for junk', () => {
    for (const junk of [null, undefined, 0, 'nope', [], true]) {
      expect(migrate(junk)).toEqual(createDefaultSave())
    }
  })

  it('rejects a save from an unknown schema version', () => {
    expect(migrate({ v: 99, secretProgress: 3 })).toEqual(createDefaultSave())
  })

  it('keeps valid fields and drops unknown ones', () => {
    const out = migrate({
      v: SAVE_VERSION,
      visitCount: 4,
      visitedProjects: ['lunai', 'liminal'],
      soundEnabled: true,
      somethingElse: 'ignored',
    })
    expect(out.visitCount).toBe(4)
    expect(out.visitedProjects).toEqual(['lunai', 'liminal'])
    expect(out.soundEnabled).toBe(true)
    expect(out).not.toHaveProperty('somethingElse')
  })

  it('clamps secretProgress into 0-3', () => {
    expect(migrate({ v: SAVE_VERSION, secretProgress: 99 }).secretProgress).toBe(3)
    expect(migrate({ v: SAVE_VERSION, secretProgress: -5 }).secretProgress).toBe(0)
    expect(migrate({ v: SAVE_VERSION, secretProgress: NaN }).secretProgress).toBe(0)
  })

  it('strips non-string entries from id arrays', () => {
    const out = migrate({ v: SAVE_VERSION, discoveredCharacters: ['momo', 7, null, 'nunu'] })
    expect(out.discoveredCharacters).toEqual(['momo', 'nunu'])
  })
})

describe('SaveStore', () => {
  it('round-trips through storage', () => {
    const s = new MemoryStorage()
    new SaveStore(s).update((d) => { d.secretProgress = 2 })
    expect(new SaveStore(s).data.secretProgress).toBe(2)
  })

  it('recovers from corrupt JSON and clears it', () => {
    const s = new MemoryStorage()
    s.setItem(KEY, '{not json')
    const store = new SaveStore(s)
    expect(store.data).toEqual(createDefaultSave())
    expect(s.getItem(KEY)).toBeNull()
  })

  it('keeps working in memory when storage is unavailable', () => {
    const store = new SaveStore(null)
    expect(store.persistent).toBe(false)
    store.update((d) => { d.visitCount = 3 })
    expect(store.data.visitCount).toBe(3)
  })

  it('survives a quota error mid-session', () => {
    const s = new MemoryStorage()
    const store = new SaveStore(s)
    s.throwOnWrite = true
    expect(() => store.update((d) => { d.visitCount = 1 })).not.toThrow()
    expect(store.data.visitCount).toBe(1)
    expect(store.persistent).toBe(false)
  })

  it('re-validates writes so a caller cannot store a bad save', () => {
    const store = new SaveStore(new MemoryStorage())
    store.update((d) => { d.secretProgress = 12 })
    expect(store.data.secretProgress).toBe(3)
  })

  it('notifies subscribers', () => {
    const store = new SaveStore(new MemoryStorage())
    let seen = 0
    const off = store.subscribe((d) => { seen = d.visitCount })
    store.update((d) => { d.visitCount = 9 })
    expect(seen).toBe(9)
    off()
    store.update((d) => { d.visitCount = 10 })
    expect(seen).toBe(9)
  })

  it('reports availability of a hostile storage', () => {
    const s = new MemoryStorage()
    s.throwOnWrite = true
    expect(isStorageAvailable(s)).toBe(false)
    expect(isStorageAvailable(null)).toBe(false)
  })
})
