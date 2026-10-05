import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { ARCHIVE_CATEGORIES, PUBLIC_ARCHIVE, shelves, type ArchivePicture } from '@/data/publicArchive'
import { POLAROIDS, fullOf } from '@/data/polaroids'
import { MEMOS } from '@/data/memos'
import { AUDIO_ROLES } from '@/data/audioRoles'
import { NAV, ROUTES } from '@/data/sitemap'
import { PROJECTS, workPicture } from '@/data/projects'

/** Width and height from a WebP's own header (VP8, VP8L or VP8X). */
function webpSize(path: string): { w: number; h: number } {
  const b = readFileSync(path)
  const kind = b.toString('ascii', 12, 16)
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) }
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21)
    return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >> 14) & 0x3fff) }
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff }
}

const hash = (path: string): string => createHash('sha1').update(readFileSync(`public${path}`)).digest('hex')
const pictures = PUBLIC_ARCHIVE.filter((e): e is ArchivePicture => e.kind === 'picture')

describe('PUBLIC ARCHIVE (PHASE G)', () => {
  it('every entry has its own id and a category the page knows', () => {
    expect(new Set(PUBLIC_ARCHIVE.map((e) => e.id)).size).toBe(PUBLIC_ARCHIVE.length)
    const known = new Set(ARCHIVE_CATEGORIES.map((c) => c.id))
    for (const e of PUBLIC_ARCHIVE) expect(known.has(e.category), e.id).toBe(true)
  })

  it('shows only shelves with something on them: no placeholder, no coming soon', () => {
    for (const s of shelves()) expect(s.entries.length, s.category.id).toBeGreaterThan(0)
    expect(JSON.stringify(PUBLIC_ARCHIVE)).not.toMatch(/coming soon|준비 중|placeholder/i)
  })

  it('every picture is a real file, and the size it is given is the size it is', () => {
    for (const p of pictures) {
      for (const f of [p.thumb, p.full]) expect(existsSync(`public${f}`), `${p.id}: ${f}`).toBe(true)
      const real = webpSize(`public${p.full}`)
      expect(Math.abs(real.w / real.h - p.w / p.h), `${p.id} ${real.w}x${real.h} vs ${p.w}x${p.h}`).toBeLessThan(0.02)
    }
  })

  it('says where each picture came from: a date and a commit', () => {
    for (const p of pictures) {
      expect(p.date, p.id).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
      expect(p.source, p.id).toMatch(/^[0-9a-f]{7}$/)
    }
  })

  it("points to a work's screenshots instead of copying them", () => {
    const galleries = new Set(PROJECTS.flatMap((p) => p.gallery.map((g) => workPicture(p.id, g.name, 'full'))))
    for (const p of pictures) expect(galleries.has(p.full), `${p.id} copies a gallery picture`).toBe(false)
    const links = PUBLIC_ARCHIVE.filter((e) => e.kind === 'gallery')
    expect(links.length).toBe(PROJECTS.filter((p) => p.gallery.length).length)
    for (const l of links) expect(l.kind === 'gallery' && l.href).toMatch(/^\/works\/[a-z]+\.html#gallery-h$/)
  })

  it("plays only the site's own songs, and leaves the secret storage's two to it", () => {
    for (const e of PUBLIC_ARCHIVE) {
      if (e.kind !== 'track') continue
      expect(existsSync(`public${e.src}`), e.src).toBe(true)
      expect(AUDIO_ROLES[e.src]?.role, e.src).toBe('MUSIC')
      expect(e.src).not.toMatch(/archive\.m4a|music_box\.m4a/)
    }
  })

  it('is a live, indexed page with a place in the nav', () => {
    const route = ROUTES.find((r) => r.path === '/archive.html')
    expect(route?.live).toBe(true)
    expect(route?.indexed).toBe(true)
    expect(NAV.some((l) => l.href === '/archive.html')).toBe(true)
  })
})

describe('SECRET STORAGE keeps what the public archive does not (PHASE G)', () => {
  it("never holds the same picture as the public archive, nor any public page's", () => {
    const publicFiles = new Set(pictures.flatMap((p) => [p.thumb, p.full]).map(hash))
    for (const p of POLAROIDS) {
      for (const f of [p.src, fullOf(p)]) {
        expect(existsSync(`public${f}`), `${p.id}: ${f}`).toBe(true)
        expect(publicFiles.has(hash(f)), `${p.id} is also in the public archive`).toBe(false)
        expect(f, p.id).toMatch(/^\/assets\/images\/archive\/secret\//)
      }
    }
  })

  it('is not empty, and every photo has a day', () => {
    expect(POLAROIDS.length).toBeGreaterThanOrEqual(3)
    for (const p of POLAROIDS) expect(p.date, p.id).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
  })

  it("keeps the crew's notes in the memory box, each dated and from a real commit", () => {
    expect(MEMOS.length).toBeGreaterThanOrEqual(3)
    expect(new Set(MEMOS.map((m) => m.id)).size).toBe(MEMOS.length)
    for (const m of MEMOS) {
      expect(m.date, m.id).toMatch(/^\d{4}\.\d{2}\.\d{2}$/)
      expect(m.commit, m.id).toMatch(/^[0-9a-f]{7}$/)
      expect(m.text.length, m.id).toBeLessThanOrEqual(60)
    }
  })
})
