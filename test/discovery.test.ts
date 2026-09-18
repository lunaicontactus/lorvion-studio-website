import { describe, expect, it } from 'vitest'
import { GarageDiscoveryPool, RECENT, hashString } from '@/systems/discovery'
import type { DiscoveryEntry } from '@/systems/discovery'
import { SHELF_ENTRIES } from '@/data/garage/shelf'
import { PARCEL_ENTRIES } from '@/data/garage/parcels'
import { CABINET_ENTRIES } from '@/data/garage/cabinet'
import { TV_ENTRIES } from '@/data/garage/tv'
import { RADIO_ENTRIES } from '@/data/garage/radio'
import { WORKBENCH_ENTRIES } from '@/data/garage/workbench'
import { FRIDGE_FOOD } from '@/data/garage/fridge'
import { seededRandom } from '@/scenes/npc'
import { existsSync } from 'node:fs'

/**
 * Opening something twice should not give the same thing twice, and a pool
 * that is fed something broken should skip it rather than break the room.
 */
const entry = (id: string, over: Partial<DiscoveryEntry> = {}): DiscoveryEntry => ({
  id, category: 'shelf', title: id, description: '', asset: null, weight: 1, rarity: 'common',
  cooldown: 0, oncePerSession: false, ...over,
})

describe('GarageDiscoveryPool', () => {
  it('never shows the same thing twice in a row, over a thousand opens', () => {
    for (const [name, entries] of [['shelf', SHELF_ENTRIES], ['parcel', PARCEL_ENTRIES], ['cabinet', CABINET_ENTRIES],
      ['tv', TV_ENTRIES], ['radio', RADIO_ENTRIES], ['workbench', WORKBENCH_ENTRIES]] as const) {
      const pool = new GarageDiscoveryPool(entries, { random: seededRandom(11) })
      let last = ''
      for (let i = 0; i < 1000; i++) {
        const got = pool.draw(entries[0]!.category)!
        expect(got.id, `${name}: repeat at ${i}`).not.toBe(last)
        last = got.id
      }
    }
  })

  it(`keeps the last ${RECENT} out of the next draw when there are enough to choose from`, () => {
    const pool = new GarageDiscoveryPool(SHELF_ENTRIES, { random: seededRandom(3) })
    const seen: string[] = []
    for (let i = 0; i < 400; i++) {
      const got = pool.draw('shelf')!
      expect(seen.slice(-RECENT), `recent repeat at ${i}`).not.toContain(got.id)
      seen.push(got.id)
    }
  })

  it('is the same sequence for the same seed, and a different one for another', () => {
    const run = (seed: number): string[] => {
      const pool = new GarageDiscoveryPool(PARCEL_ENTRIES, { random: seededRandom(seed) })
      return Array.from({ length: 30 }, () => pool.draw('parcel')!.id)
    }
    expect(run(7)).toEqual(run(7))
    expect(run(7)).not.toEqual(run(8))
  })

  it('skips invalid entries and keeps working', () => {
    const pool = new GarageDiscoveryPool([
      entry('ok-a'), entry('ok-b'),
      entry('ok-a'), // duplicate
      { ...entry('no-weight'), weight: 0 },
      { ...entry('bad-cat'), category: 'kitchen' as never },
      { id: '', category: 'shelf' } as Partial<DiscoveryEntry>,
      { ...entry('bad-rarity'), rarity: 'legendary' as never },
      { ...entry('neg-cool'), cooldown: -1 },
    ], { random: seededRandom(1) })
    expect(pool.rejected).toHaveLength(6)
    expect(pool.entries('shelf').map((e) => e.id)).toEqual(['ok-a', 'ok-b'])
    for (let i = 0; i < 20; i++) expect(['ok-a', 'ok-b']).toContain(pool.draw('shelf')!.id)
    expect(pool.draw('radio')).toBeNull()
  })

  it('respects a cooldown until it has passed', () => {
    let now = 0
    const pool = new GarageDiscoveryPool([entry('slow', { cooldown: 10_000 }), entry('a'), entry('b')],
      { random: () => 0, now: () => now, recent: 1 })
    const order: string[] = []
    for (let i = 0; i < 6; i++) {
      order.push(pool.draw('shelf')!.id)
      now += 1000
    }
    // 'slow' is first, then held back for ten seconds.
    expect(order[0]).toBe('slow')
    expect(order.slice(1)).not.toContain('slow')
    now += 10_000
    const later = Array.from({ length: 4 }, () => pool.draw('shelf')!.id)
    expect(later).toContain('slow')
  })

  it('gives a once-a-visit entry once, and remembers it across a reload of the pool', () => {
    const entries = [entry('once', { oncePerSession: true, weight: 50 }), entry('a'), entry('b'), entry('c')]
    const pool = new GarageDiscoveryPool(entries, { random: seededRandom(2) })
    const got = Array.from({ length: 60 }, () => pool.draw('shelf')!.id)
    expect(got.filter((g) => g === 'once')).toHaveLength(1)
    const again = new GarageDiscoveryPool(entries, { random: seededRandom(2), spent: pool.spent })
    expect(Array.from({ length: 60 }, () => again.draw('shelf')!.id)).not.toContain('once')
  })

  it('makes rare things rarer, without making them impossible', () => {
    const pool = new GarageDiscoveryPool(SHELF_ENTRIES, { random: seededRandom(5) })
    const counts = new Map<string, number>()
    for (let i = 0; i < 6000; i++) {
      const id = pool.draw('shelf')!.id
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    const rare = SHELF_ENTRIES.filter((e) => e.rarity === 'rare').map((e) => counts.get(e.id) ?? 0)
    const common = SHELF_ENTRIES.filter((e) => e.rarity === 'common').map((e) => counts.get(e.id) ?? 0)
    expect(Math.min(...rare)).toBeGreaterThan(0)
    expect(Math.max(...rare)).toBeLessThan(Math.min(...common))
  })

  it('draws distinct things when several are shown at once', () => {
    const pool = new GarageDiscoveryPool(SHELF_ENTRIES, { random: seededRandom(9) })
    for (let i = 0; i < 50; i++) {
      const three = pool.drawMany('shelf', 3).map((e) => e.id)
      expect(new Set(three).size).toBe(3)
    }
  })

  it('hashes a date the same way every time', () => {
    expect(hashString('2026-09-16')).toBe(hashString('2026-09-16'))
    expect(hashString('2026-09-16')).not.toBe(hashString('2026-09-17'))
  })
})

describe('the content behind each object', () => {
  it('has enough of everything, and all of it loads cleanly', () => {
    const minimum: [string, readonly DiscoveryEntry[], number][] = [
      ['shelf', SHELF_ENTRIES, 15], ['parcel', PARCEL_ENTRIES, 12], ['cabinet', CABINET_ENTRIES, 10],
      ['tv', TV_ENTRIES, 5], ['radio', RADIO_ENTRIES, 5], ['workbench', WORKBENCH_ENTRIES, 5], ['fridge', FRIDGE_FOOD, 7],
    ]
    for (const [name, list, min] of minimum) {
      expect(list.length, `${name} pool`).toBeGreaterThanOrEqual(min)
      const pool = new GarageDiscoveryPool(list)
      expect(pool.rejected, `${name}: ${pool.rejected.join('; ')}`).toEqual([])
    }
  })

  it('points only at pictures that exist', () => {
    for (const e of [...SHELF_ENTRIES, ...PARCEL_ENTRIES, ...WORKBENCH_ENTRIES, ...FRIDGE_FOOD]) {
      if (!e.asset) continue
      expect(existsSync(`public${e.asset}`), `${e.id}: ${e.asset}`).toBe(true)
    }
  })

  it('never puts a game on the shelf, in a parcel, in the fridge or on the bench', () => {
    const titles = /\b(LUNAI|LIMINAL|WORM UP!?|LUMIORA|RUBATO)\b/
    for (const e of [...SHELF_ENTRIES, ...PARCEL_ENTRIES, ...FRIDGE_FOOD]) {
      expect(`${e.title} ${e.description}`, e.id).not.toMatch(titles)
    }
    for (const e of WORKBENCH_ENTRIES) expect(e.title, e.id).not.toMatch(titles)
  })

  it('dates every development note and names a real commit', () => {
    for (const w of WORKBENCH_ENTRIES) {
      expect(w.date, w.id).toMatch(/^2026\.\d\d\.\d\d$/)
      expect(w.commit, w.id).toMatch(/^[0-9a-f]{7}$/)
    }
  })
})
