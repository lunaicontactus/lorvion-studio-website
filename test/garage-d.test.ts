import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { PROJECTS, workHref } from '@/data/projects'
import { CHANNELS, WORK_PROGRAMMES, programmeOf } from '@/data/garage/tv'
import { LIMINAL_CASE_FILE } from '@/data/garage/caseFile'
import { NEWS, nextNews } from '@/data/news'
import type { NewsItem } from '@/data/news'

/**
 * SITE UPGRADE PHASE D: the garage's things lead to the site. What goes wrong
 * here is a channel showing a picture that is not there, a work the TV forgets,
 * a case file that is not the game's, and news that nobody wrote.
 */
const pub = (src: string): string => `public${src}`

describe('the TV shows each work', () => {
  it('has a channel for every work, first, in the works\' order, then the old ones', () => {
    expect(CHANNELS.map((c) => c.id)).toEqual([
      ...PROJECTS.map((p) => `work-${p.id}`), 'news', 'cam', 'contact', 'nosignal'])
    expect(CHANNELS.map((c) => c.number)).toEqual(['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06', 'CH07', 'CH08', 'CH00'])
    for (const p of PROJECTS) expect(CHANNELS.find((c) => c.id === `work-${p.id}`)!.name, p.id).toBe(p.title)
  })

  it('shows one to three of the work\'s own pictures, every one of them on the site', () => {
    expect(WORK_PROGRAMMES.map((w) => w.work)).toEqual(PROJECTS.map((p) => p.id))
    for (const w of WORK_PROGRAMMES) {
      expect(w.frames.length, w.work).toBeGreaterThanOrEqual(1)
      expect(w.frames.length, w.work).toBeLessThanOrEqual(3)
      for (const f of w.frames) {
        expect(f.kind, w.work).toBe('image')
        expect(existsSync(pub(f.src)), f.src).toBe(true)
        // Its own pictures: nothing from another work, nothing from the archive.
        expect(f.src, w.work).toMatch(new RegExp(`/(works/${w.work}/|artwork/${w.work}-)`))
        expect(f.caption.trim(), f.src).not.toBe('')
      }
    }
  })

  it('finds a work\'s programme by its channel and nothing for the others', () => {
    for (const p of PROJECTS) expect(programmeOf(`work-${p.id}`)?.work).toBe(p.id)
    for (const id of ['news', 'cam', 'contact', 'nosignal'] as const) expect(programmeOf(id)).toBeNull()
  })

  it('has no trailer it does not have', () => {
    const tv = readFileSync('src/data/garage/tv.ts', 'utf8')
    expect(tv).not.toMatch(/kind: 'video'/)
    expect(tv).not.toMatch(/teaser|trailer\.mp4/i)
  })
})

describe('the records drawer holds LIMINAL\'s case', () => {
  it('is the game\'s own case, with its picture, and goes to the work', () => {
    expect(LIMINAL_CASE_FILE.work).toBe('liminal')
    expect(LIMINAL_CASE_FILE.title).toBe('두 개의 이름표')
    expect(LIMINAL_CASE_FILE.href).toBe(workHref('liminal'))
    expect(existsSync(pub(LIMINAL_CASE_FILE.picture)), LIMINAL_CASE_FILE.picture).toBe(true)
    // No case number: the game's scripts number the cases differently.
    expect(JSON.stringify(LIMINAL_CASE_FILE)).not.toMatch(/CASE[_ -]?\d|#\d|제\s?\d+\s?호/)
  })

  it('is not the secret door: that stays the star-collecting storage', () => {
    const panels = readFileSync('src/ui/panels.ts', 'utf8')
    expect(panels).not.toMatch(/secret[^\n]*liminal|liminal[^\n]*secret/i)
  })
})

describe('the parcel brings news only when there is some', () => {
  it('has none yet, so it keeps bringing the shopping', () => {
    expect(NEWS).toEqual([])
    expect(nextNews([])).toBeNull()
  })

  it('brings the newest one not opened yet, and nothing once all are', () => {
    const items: NewsItem[] = [
      { id: 'a', date: '2026.09.01', title: 'A', body: 'a' },
      { id: 'c', date: '2026.10.02', title: 'C', body: 'c' },
      { id: 'b', date: '2026.09.20', title: 'B', body: 'b' },
    ]
    expect(nextNews([], items)?.id).toBe('c')
    expect(nextNews(['c'], items)?.id).toBe('b')
    expect(nextNews(['a', 'b', 'c'], items)).toBeNull()
  })
})

describe('the PC desktop and the first visit', () => {
  const panels = readFileSync('src/ui/panels.ts', 'utf8')

  it('links only to pages that exist', () => {
    // ARCHIVE is a page since PHASE G.
    expect(panels).toMatch(/href="\/archive\.html" data-desk-item="archive"/)
    expect(existsSync('archive.html')).toBe(true)
    expect(panels).toMatch(/href="\/contact\.html" data-desk-item="mail"/)
    expect(existsSync('contact.html')).toBe(true)
  })

  it('shows the phone hint once per visitor, not once per tab', () => {
    const garage = readFileSync('src/scenes/garage.ts', 'utf8')
    expect(garage).toMatch(/HINT_KEY = 'eungarage:garageHinted'/)
    expect(garage).toMatch(/localStorage\.getItem\(HINT_KEY\)/)
    expect(garage).toMatch(/localStorage\.setItem\(HINT_KEY, 'true'\)/)
    expect(garage).not.toMatch(/sessionStorage\.\w+\(HINT_KEY/)
  })
})
