import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
// @ts-expect-error — a plain .mjs script, shared with CI
import { scan } from '../scripts/brand-scan.mjs'

/**
 * EUNGARAGE, and nothing older. The scanner is the same one CI runs against
 * the built site; here it covers everything a build is made from.
 */
const pages = readdirSync('.').filter((f) => f.endsWith('.html'))

describe('the brand', () => {
  it('has no legacy brand text or retired logo file anywhere a visitor can reach', () => {
    const hits = scan(process.cwd(), ['src', 'public', ...pages]) as string[]
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('puts the v02 logo, icons and share tags on every page', () => {
    for (const page of pages) {
      const html = readFileSync(page, 'utf8')
      expect(html, `${page}: nav logo`).toMatch(/class="brand-logo" src="\/assets\/images\/brand\/eungarage_logo_nav(_light)?\.webp"/)
      expect(html, `${page}: no text wordmark`).not.toContain('brand-wordmark')
      expect(html, `${page}: favicon`).toContain('/assets/images/favicon-48.png')
      expect(html, `${page}: apple icon`).toContain('/apple-touch-icon.png')
      expect(html, `${page}: manifest`).toContain('/manifest.webmanifest')
      for (const tag of ['og:title', 'og:description', 'og:image', 'og:site_name', 'twitter:card',
        'twitter:title', 'twitter:description', 'twitter:image', 'application-name']) {
        expect(html, `${page}: ${tag}`).toContain(`"${tag}"`)
      }
      expect(html, `${page}: site name`).toContain('content="EUNGARAGE"')
    }
  })

  it('describes the studio as one Organization with the official contact', () => {
    const html = readFileSync('index.html', 'utf8')
    const raw = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
    expect(raw).toBeDefined()
    const org = JSON.parse(raw!)
    expect(org['@type']).toBe('Organization')
    expect(org.name).toBe('EUNGARAGE')
    expect(org.url).toBe('https://eungarage.com/')
    expect(org.email).toBe('eungarage@gmail.com')
    expect(org.logo).toMatch(/^https:\/\/eungarage\.com\/assets\/images\/brand\/eungarage_logo_lockup\.png$/)
  })

  it('keeps the manifest on the EUNGARAGE name and icons', () => {
    const m = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'))
    expect(m.name).toBe('EUNGARAGE')
    expect(m.short_name).toBe('EUNGARAGE')
    expect(m.icons.map((i: { src: string }) => i.src)).toEqual(expect.arrayContaining([
      './assets/images/icon-192.png', './assets/images/icon-512.png', './assets/images/icon-maskable-512.png']))
  })
})
