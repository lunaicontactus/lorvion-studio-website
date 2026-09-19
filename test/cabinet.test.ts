import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { CABINET_ITEMS } from '@/data/garage/shelf'
import { PROJECTS } from '@/data/projects'
import { PROPS } from '@/data/props'

/**
 * The archive cabinet: the shelf is the studio's work, kept. Every thing on
 * it has to be drawn where it says it is, belong to a work that exists, and
 * say which one; the drawers are the working records.
 */
describe('the archive cabinet', () => {
  const def = PROPS['shelf']!

  it('is the cut-out it says it is', () => {
    expect(def.art).toContain('archive_cabinet.webp')
    expect(existsSync(`public${def.art}`)).toBe(true)
  })

  it('has every work on it, and both drawers', () => {
    const on = new Set(CABINET_ITEMS.map((i) => i.projectId).filter(Boolean))
    for (const p of PROJECTS) expect(on.has(p.id), `${p.id} is not on the shelf`).toBe(true)
    const drawers = CABINET_ITEMS.filter((i) => i.shelf === 'drawer')
    expect(drawers.map((d) => d.id).sort()).toEqual(['drawer-records', 'drawer-tools'])
    for (const d of drawers) expect(d.projectId, d.id).toBeUndefined()
  })

  it('names the work each thing came from, and only works that exist', () => {
    for (const i of CABINET_ITEMS) {
      if (!i.projectId) continue
      const project = PROJECTS.find((p) => p.id === i.projectId)
      expect(project, `${i.id}: no project ${i.projectId}`).toBeDefined()
      expect(i.note, i.id).toContain(project!.title)
    }
  })

  it('keeps each thing on its own shelf, and none on top of another', () => {
    // The shelves, as fractions of the cut-out, read off the reference.
    const band = { top: [0.17, 0.34], middle: [0.36, 0.54], bottom: [0.555, 0.735], drawer: [0.74, 0.97] } as const
    for (const i of CABINET_ITEMS) {
      const [lo, hi] = band[i.shelf]
      expect(i.box.y, `${i.id} above its shelf`).toBeGreaterThanOrEqual(lo)
      expect(i.box.y + i.box.h, `${i.id} below its shelf`).toBeLessThanOrEqual(hi)
      expect(i.box.x).toBeGreaterThanOrEqual(0)
      expect(i.box.x + i.box.w).toBeLessThanOrEqual(1)
    }
    for (const a of CABINET_ITEMS) {
      for (const b of CABINET_ITEMS) {
        if (a === b) continue
        const w = Math.min(a.box.x + a.box.w, b.box.x + b.box.w) - Math.max(a.box.x, b.box.x)
        const h = Math.min(a.box.y + a.box.h, b.box.y + b.box.h) - Math.max(a.box.y, b.box.y)
        const overlap = Math.max(0, w) * Math.max(0, h)
        const smaller = Math.min(a.box.w * a.box.h, b.box.w * b.box.h)
        expect(overlap / smaller, `${a.id} and ${b.id} overlap`).toBeLessThan(0.02)
      }
    }
  })

  it('every id is unique', () => {
    expect(new Set(CABINET_ITEMS.map((i) => i.id)).size).toBe(CABINET_ITEMS.length)
  })
})
