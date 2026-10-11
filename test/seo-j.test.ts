import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { PROJECTS } from '@/data/projects'
import { SITE_CONFIG } from '@/data/site'
import { sitemapXml } from '@/data/sitemap'

/**
 * PHASE J: what search engines and link previews read, page by page
 * (docs/SITE_UPGRADE_PHASE_J.md). Reads the pages' own markup; the e2e spec
 * (e2e/seo-j.spec.ts) checks the built site and its links.
 */
const B = 'https://eungarage.com'
const PAGES = [
  ...readdirSync('.').filter((f) => f.endsWith('.html')),
  ...readdirSync('works').filter((f) => f.endsWith('.html')).map((f) => `works/${f}`),
]
/** Pages that are not for search: the not-found page, and the old /games.html that forwards to /works.html. */
const NOINDEX = ['404.html', 'games.html']
const INDEXED = PAGES.filter((p) => !NOINDEX.includes(p))
const route = (p: string): string => (p === 'index.html' ? `${B}/` : `${B}/${p}`)

const read = (p: string): string => readFileSync(p, 'utf8')
const meta = (html: string, key: 'name' | 'property', v: string): string | undefined =>
  new RegExp(`<meta ${key}="${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content="([^"]*)">`).exec(html)?.[1]
const title = (html: string): string => /<title>([\s\S]*?)<\/title>/.exec(html)![1]!.trim()
const ld = (html: string): Record<string, unknown>[] =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as Record<string, unknown>)

/** A JPEG's pixel size, from its first frame header. */
function jpegSize(file: string): { w: number; h: number } {
  const b = readFileSync(file)
  let i = 2
  while (i < b.length) {
    const marker = b[i + 1]!
    const len = b.readUInt16BE(i + 2)
    if (marker >= 0xc0 && marker <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }
    i += 2 + len
  }
  throw new Error(`${file}: no frame header`)
}

describe('titles and descriptions', () => {
  it('every page has its own title and its own description, and the two say different things', () => {
    // /games.html only forwards to /works.html, under that page's name.
    const titles = PAGES.filter((p) => p !== 'games.html').map((p) => title(read(p)))
    const descs = INDEXED.map((p) => meta(read(p), 'name', 'description'))
    expect(new Set(titles).size, titles.join(' | ')).toBe(titles.length)
    expect(new Set(descs).size).toBe(descs.length)
    for (const p of INDEXED) {
      const d = meta(read(p), 'name', 'description')!
      expect(d, p).toBeTruthy()
      expect(d, `${p}: the description is more than the title`).not.toBe(title(read(p)).replace(/ — EUNGARAGE$/, ''))
      expect(d.length, `${p}: description length`).toBeGreaterThanOrEqual(25)
      expect(d.length, `${p}: description length`).toBeLessThanOrEqual(160)
      expect(title(read(p)), p).toMatch(/EUNGARAGE/)
    }
  })

  it('a work is described by its own record: its line, genre and platforms', () => {
    for (const w of PROJECTS) {
      const d = meta(read(`works/${w.id}.html`), 'name', 'description')!
      expect(d.startsWith(w.taglineKo), w.id).toBe(true)
      expect(d, w.id).toContain(w.genre)
      for (const x of w.platforms) expect(d, w.id).toContain(x)
    }
  })
})

describe('canonical, robots and the sitemap', () => {
  it('each indexed page names itself as canonical, at its real .html address; og:url is the same', () => {
    for (const p of INDEXED) {
      const html = read(p)
      expect(html, p).toContain(`<link rel="canonical" href="${route(p)}">`)
      expect(meta(html, 'property', 'og:url'), p).toBe(route(p))
      expect(html, `${p}: indexed`).not.toMatch(/<meta name="robots" content="[^"]*noindex/)
    }
  })

  it('the not-found page and the old /games.html are not indexed', () => {
    expect(read('404.html')).toMatch(/<meta name="robots" content="noindex/)
    expect(read('404.html')).not.toContain('rel="canonical"')
    expect(read('games.html')).toMatch(/<meta name="robots" content="noindex/)
    expect(read('games.html')).toContain(`<link rel="canonical" href="${B}/works.html">`)
  })

  it('the sitemap lists exactly the indexed pages, with absolute addresses', () => {
    const ids = PROJECTS.map((p) => p.id)
    const locs = [...sitemapXml(ids).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort()
    expect(locs).toEqual(INDEXED.map(route).sort())
    const robots = read('public/robots.txt')
    expect(robots).toContain(`Sitemap: ${B}/sitemap.xml`)
    expect(robots).not.toMatch(/Disallow: \/\S/)
  })
})

describe('link previews', () => {
  it('every page has a whole Open Graph and X card, with an absolute 1200×630 image that exists', () => {
    for (const p of PAGES.filter((x) => x !== 'games.html')) {
      const html = read(p)
      for (const k of ['og:title', 'og:description', 'og:type', 'og:image', 'og:image:alt', 'og:site_name', 'og:locale']) expect(meta(html, 'property', k), `${p}: ${k}`).toBeTruthy()
      expect(meta(html, 'property', 'og:image:width'), p).toBe('1200')
      expect(meta(html, 'property', 'og:image:height'), p).toBe('630')
      const img = meta(html, 'property', 'og:image')!
      expect(img.startsWith(`${B}/assets/images/`), `${p}: absolute og:image`).toBe(true)
      const file = `public${img.slice(B.length)}`
      expect(existsSync(file), `${p}: ${file}`).toBe(true)
      expect(jpegSize(file), file).toEqual({ w: 1200, h: 630 })
      expect(meta(html, 'name', 'twitter:card'), p).toBe('summary_large_image')
      expect(meta(html, 'name', 'twitter:image'), p).toBe(img)
      expect(meta(html, 'name', 'twitter:title'), p).toBe(meta(html, 'property', 'og:title'))
      expect(meta(html, 'name', 'twitter:description'), p).toBe(meta(html, 'property', 'og:description'))
      expect(meta(html, 'name', 'twitter:image:alt'), p).toBe(meta(html, 'property', 'og:image:alt'))
    }
  })

  it('a work\'s card is its own key art', () => {
    for (const w of PROJECTS) {
      const html = read(`works/${w.id}.html`)
      expect(meta(html, 'property', 'og:image'), w.id).toBe(`${B}/assets/images/social/${w.id}.jpg`)
      expect(meta(html, 'property', 'og:image:alt'), w.id).toContain(w.title)
    }
  })
})

describe('structured data', () => {
  /** Nothing the studio cannot stand behind: no ratings, reviews, prices, dates, founding, headcount, awards. */
  const FORBIDDEN = ['aggregateRating', 'review', 'reviews', 'offers', 'price', 'priceCurrency', 'releaseDate', 'datePublished', 'dateCreated', 'foundingDate', 'numberOfEmployees', 'award', 'awards', 'sameAs', 'telephone', 'streetAddress', 'postalCode']
  const keys = (v: unknown): string[] => (v && typeof v === 'object' ? Object.entries(v as object).flatMap(([k, x]) => [k, ...keys(x)]) : [])

  it('only on the pages it describes, valid, and with no invented facts', () => {
    for (const p of PAGES) {
      const blocks = ld(read(p))
      if (p === 'index.html' || p.startsWith('works/')) expect(blocks.length, p).toBe(1)
      else expect(blocks, p).toEqual([])
      for (const b of blocks) {
        expect(b['@context']).toBe('https://schema.org')
        for (const k of FORBIDDEN) expect(keys(b), `${p}: ${k}`).not.toContain(k)
      }
    }
  })

  it('the home page: the studio (its city from src/data/site.ts) and the site it publishes', () => {
    const [b] = ld(read('index.html'))
    const graph = b!['@graph'] as Record<string, unknown>[]
    const org = graph.find((n) => n['@type'] === 'Organization')!
    expect(org).toMatchObject({ name: SITE_CONFIG.companyName, url: `${B}/`, email: SITE_CONFIG.email, address: { addressLocality: 'Seoul', addressCountry: 'KR' } })
    expect(SITE_CONFIG.location).toMatch(/^Seoul, Republic of Korea$/)
    expect(graph.find((n) => n['@type'] === 'WebSite')).toMatchObject({ name: 'EUNGARAGE', url: `${B}/`, publisher: { '@id': org['@id'] } })
  })

  it('each work as what it is — the app as an app, the games as games — from its own record', () => {
    for (const w of PROJECTS) {
      const [b] = ld(read(`works/${w.id}.html`))
      expect(b!['@type'], w.id).toBe(w.id === 'lunai' ? 'MobileApplication' : 'VideoGame')
      expect(b).toMatchObject({ name: w.title, genre: w.genre, url: `${B}/works/${w.id}.html`, creativeWorkStatus: 'In development', creator: { name: 'EUNGARAGE' } })
      expect(String(b!['description']).startsWith(w.taglineKo), w.id).toBe(true)
      if (w.id === 'lunai') expect(b!['operatingSystem']).toBe(w.platforms.join(', '))
      else expect(b!['gamePlatform']).toEqual(w.platforms)
      const img = String(b!['image'])
      expect(existsSync(`public${img.slice(B.length)}`), img).toBe(true)
    }
  })
})
