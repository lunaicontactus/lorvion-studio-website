import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { POLAROIDS, columnsFor, scatter } from '@/data/polaroids'
import { ARCHIVE_LANDSCAPE, ARCHIVE_PORTRAIT } from '@/data/archive'

describe('the polaroids are a record, not a picture', () => {
  it('starts from what the site really has: the five games and the days of making', () => {
    expect(POLAROIDS.filter((p) => p.category === 'game')).toHaveLength(5)
    expect(POLAROIDS.filter((p) => p.category === 'dev').length).toBeGreaterThanOrEqual(6)
  })

  it('every photo has its own id and a file that exists', () => {
    const ids = new Set(POLAROIDS.map((p) => p.id))
    expect(ids.size).toBe(POLAROIDS.length)
    for (const p of POLAROIDS) {
      expect(p.src.startsWith('/assets/'), p.id).toBe(true)
      expect(existsSync(`public${p.src}`), `${p.id}: ${p.src}`).toBe(true)
      if (p.date) expect(p.date, p.id).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
    }
  })

  it('lays any number of photos on the table, and each in the same place every time', () => {
    for (const n of [1, 2, 5, 11, 17, 40]) {
      for (let i = 0; i < n; i++) {
        const a = scatter(`p${i}`, i, n)
        expect(a).toEqual(scatter(`p${i}`, i, n))
        expect(a.x).toBeGreaterThanOrEqual(0)
        expect(a.x).toBeLessThanOrEqual(1)
        expect(a.y).toBeGreaterThanOrEqual(0)
        expect(a.y).toBeLessThanOrEqual(1)
        expect(Math.abs(a.turn)).toBeLessThanOrEqual(11)
      }
    }
  })

  it('a short, wide table gets more columns than a tall one, and no card is buried', () => {
    const wide = columnsFor(11, 700, 150, 76, 110)
    const tall = columnsFor(11, 300, 560, 90, 130)
    expect(wide).toBeGreaterThan(tall)
    for (const [w, h, cw, ch] of [[700, 150, 76, 110], [300, 560, 90, 130], [1000, 560, 130, 190]] as const) {
      const cols = columnsFor(11, w, h, cw, ch)
      const rows = Math.ceil(11 / cols)
      // Rows at least three-fifths of a card apart, or a single row.
      if (rows > 1) expect(h / (rows - 1), `${w}x${h}`).toBeGreaterThanOrEqual(ch * 0.6 - 0.5)
    }
  })

  it('has a place on the table in both orientations, clear of every other thing', () => {
    for (const layout of [ARCHIVE_LANDSCAPE, ARCHIVE_PORTRAIT]) {
      const table = layout.places.find((p) => p.id === 'polaroids')!
      expect(table).toBeTruthy()
      for (const other of layout.places) {
        if (other === table) continue
        const a = table.rect, b = other.rect
        const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
        expect(overlap, `polaroids over ${other.id}`).toBe(false)
      }
    }
  })
})
