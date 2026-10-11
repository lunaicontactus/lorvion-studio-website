import { test, expect } from '@playwright/test'

/**
 * PHASE J: the built site as a crawler meets it. Every page in the sitemap
 * answers, every link and picture on every page (as drawn, scripts run)
 * answers, every #anchor lands on something, no page is an orphan, and every
 * link-preview image is a real JPEG. Absolute eungarage.com addresses are
 * checked against the origin under test.
 */
const SITE = 'https://eungarage.com'

test('sitemap, robots, every link, every anchor, every preview image', async ({ page, request, baseURL }) => {
  test.setTimeout(240_000)
  const origin = new URL(baseURL!).origin
  const local = (u: string): string => (u.startsWith(SITE) ? origin + u.slice(SITE.length) : u)

  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const routes = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!)
  expect(routes.length).toBe(16)

  const links = new Map<string, string>() // url → first page it was seen on
  const anchors: { url: string; id: string; from: string }[] = []
  const linkedFrom = new Map<string, Set<string>>()
  const previews: string[] = []
  for (const r of [...routes, `${SITE}/404.html`]) {
    const res = await page.goto(local(r), { waitUntil: 'networkidle' })
    expect(res?.status(), r).toBe(200)
    const found = await page.evaluate(() => ({
      hrefs: [...document.querySelectorAll('a[href]')].map((a) => (a as HTMLAnchorElement).href),
      res: [...document.querySelectorAll('img[src], script[src], link[href][rel~="stylesheet"], link[rel~="icon"], link[rel="manifest"], audio[src], source[srcset]')]
        .map((e) => (e as HTMLImageElement).src || (e as HTMLLinkElement).href || (e.getAttribute('srcset') ?? '').split(/\s/)[0] || ''),
      og: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
      // One h1, and no level skipped on the way down (h2 → h4).
      levels: [...document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')].map((h) => Number(h.tagName[1])),
    }))
    expect(found.levels.filter((l) => l === 1).length, `${r}: one h1`).toBe(1)
    expect(found.levels.some((l, i) => i > 0 && l > found.levels[i - 1]! + 1), `${r}: a heading level skipped`).toBe(false)
    if (!r.endsWith('/404.html')) expect(found.canonical, r).toBe(r)
    if (found.og) previews.push(found.og)
    for (const u of [...found.hrefs, ...found.res]) {
      if (!u || !/^https?:/.test(u)) continue
      const url = new URL(local(u), origin)
      if (url.origin !== origin) continue
      const bare = url.origin + url.pathname
      if (!links.has(bare)) links.set(bare, r)
      if (url.hash.length > 1) anchors.push({ url: bare, id: decodeURIComponent(url.hash.slice(1)), from: r })
      const key = url.pathname === '/index.html' ? '/' : url.pathname
      if (key !== new URL(local(r)).pathname) (linkedFrom.get(key) ?? linkedFrom.set(key, new Set()).get(key)!).add(r)
    }
  }

  const broken: string[] = []
  for (const [u, from] of links) {
    const res = await request.get(u)
    if (res.status() !== 200) broken.push(`${u} (${res.status()}) on ${from}`)
  }
  expect(broken).toEqual([])

  const missing: string[] = []
  for (const a of anchors) {
    await page.goto(a.url, { waitUntil: 'networkidle' })
    if (!(await page.evaluate((id) => !!document.getElementById(id), a.id))) missing.push(`${a.url}#${a.id} (from ${a.from})`)
  }
  expect([...new Set(missing)]).toEqual([])

  // No orphans: every page in the sitemap is linked from another page.
  const orphans = routes.map((r) => new URL(r).pathname).filter((p) => !linkedFrom.get(p)?.size)
  expect(orphans).toEqual([])

  for (const img of new Set(previews)) {
    const res = await request.get(local(img))
    expect(res.status(), img).toBe(200)
    expect(res.headers()['content-type'], img).toContain('image/jpeg')
  }
})

test('the old /games.html forwards to /works.html', async ({ page }) => {
  await page.goto('/games.html')
  await expect(page).toHaveURL(/\/works\.html$/)
})
