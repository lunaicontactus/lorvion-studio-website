import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { FOOTER, groupOf, NAV, NAV_UTIL, renderFooter, renderNav, renderPageIndex, ROUTES, sitemapXml } from '@/data/sitemap'
import { PROJECTS } from '@/data/projects'

/**
 * The site map (SITE UPGRADE PHASE B): one table for the nav, the footer and
 * the sitemap, and nothing linked that is not built.
 */
const pages = readdirSync('.').filter((f) => f.endsWith('.html'))
const workPages = readdirSync('works').filter((f) => f.endsWith('.html'))

describe('the site map', () => {
  it('knows every page at the root, and every work has its page', () => {
    for (const f of pages) expect(ROUTES.map((r) => r.path), f).toContain(f === 'index.html' ? '/' : `/${f}`)
    expect(workPages.map((f) => f.replace('.html', '')).sort()).toEqual(PROJECTS.map((p) => p.id).sort())
  })

  it('links only pages that exist', () => {
    const live = new Set(ROUTES.filter((r) => r.live).map((r) => r.path))
    // An in-page address (/#garage) is the home page, opened at a place.
    for (const l of [...NAV, ...FOOTER.flatMap((g) => g.links)]) expect(live.has(l.href.startsWith('/#') ? '/' : l.href), l.href).toBe(true)
    for (const r of ROUTES.filter((r) => r.live && r.path !== '/')) {
      expect(pages, r.path).toContain(r.path.slice(1))
    }
  })

  it('is the 2.0 minihompy tabs in the brief\'s order, and no OUR GAMES', () => {
    // EUNGARAGE 2.0 PART 3.2. Tabs whose page is not built yet are left out.
    const order = ['Home', 'Garage', 'Games', 'Crew', 'Diary', 'Photo', 'Guestbook', 'Arcade', 'Stars', 'Radio', 'Contact', 'Settings']
    const labels = NAV.map((l) => l.label)
    expect(labels.slice(0, 5)).toEqual(['Home', 'Garage', 'Games', 'Crew', 'Diary'])
    expect([...labels].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(labels)
    // GAMES is the works index under its 2.0 name, not a second page.
    expect(NAV.find((l) => l.label === 'Games')?.href).toBe('/works.html')
    expect(renderNav('/')).not.toMatch(/OUR GAMES/i)
  })

  it('keeps STUDIO and SUPPORT in the bar of every page, after the tabs', () => {
    // SUPPORT is LUNAI's store-listed support address; the garage has no footer.
    expect(NAV_UTIL.map((l) => l.href)).toEqual(['/studio.html', '/support.html'])
    for (const path of ['/', '/works.html', '/crew.html', '/support.html']) {
      const html = renderNav(path)
      expect(html).toContain('href="/support.html"')
      expect(html.indexOf('href="/settings.html"')).toBeLessThan(html.indexOf('href="/studio.html"'))
    }
  })

  it('every page carries the markers, not its own copy of the nav or footer', () => {
    for (const f of [...pages, ...workPages.map((w) => `works/${w}`)]) {
      const html = readFileSync(f, 'utf8')
      if (f === 'games.html') continue // a redirect, no chrome
      expect(html, f).toContain('<!--@nav-->')
      expect(html, f).not.toContain('class="site-nav"')
      expect(html, f).not.toContain('class="site-footer"')
      if (f !== 'index.html') expect(html, f).toContain('<!--@footer-->')
    }
    expect(readFileSync('index.html', 'utf8')).toContain('<!--@pages-->')
  })

  it('marks where the visitor is', () => {
    expect(renderNav('/contact.html')).toContain('<a href="/contact.html" aria-current="page">')
    expect(renderNav('/works/lunai.html')).toContain('<a href="/works.html" aria-current="true">')
    expect(groupOf('/index.html')).toBe('home')
    expect(renderFooter('/terms.html')).toContain('<a href="/">Garage</a>')
    expect(renderFooter('/terms.html')).toContain('<a href="/terms.html" aria-current="page">Terms</a>')
  })

  it('gives every page the dark logo on the 2.0 light bar', () => {
    expect(renderNav('/')).toContain('eungarage_logo_nav.webp')
    expect(renderNav('/studio.html')).toContain('eungarage_logo_nav.webp')
  })

  it('lists every live, indexed page and every work in the sitemap, and nothing else', () => {
    const map = sitemapXml(PROJECTS.map((p) => p.id))
    for (const p of PROJECTS) expect(map).toContain(`https://eungarage.com/works/${p.id}.html`)
    for (const p of ['/', '/works.html', '/archive.html', '/studio.html', '/support.html', '/contact.html', '/press.html']) expect(map).toContain(`<loc>https://eungarage.com${p}</loc>`)
    for (const p of ['/404.html', '/games.html']) expect(map).not.toContain(p)
  })

  it('gives the garage a hidden list of every page, for a visitor without scripts', () => {
    const idx = renderPageIndex()
    for (const l of NAV.filter((l) => l.href !== '/')) expect(idx).toContain(`href="${l.href}"`)
    expect(idx).toContain('mailto:eungarage@gmail.com')
  })
})
