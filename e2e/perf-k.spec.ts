import { test, expect, type Page } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

/**
 * PHASE K: performance budgets (docs/SITE_UPGRADE_PHASE_K.md). Each is the
 * value measured after PHASE K plus some room, so ordinary work fits and a
 * sudden large regression does not: the 695 KB painting back behind a blur,
 * the garage's code on every page, a full-size picture where a thumbnail was.
 *
 * Bytes are the built files (dist/), gzipped as the CDN serves them; image
 * payloads are what the browser fetched for the first screen, cold.
 */
const KB = 1024
const BUDGET = {
  mainJs: 26 * KB, // 21 KB after PHASE K (gzip)
  worldJs: 95 * KB, // 85 KB
  css: 34 * KB, // 31 KB
  worksImages: 420 * KB, // 268 KB desktop, 258 KB phone
  archiveImages: 1000 * KB, // 782 KB desktop, 665 KB phone
}

const asset = (prefix: string, ext: string): string => {
  const f = readdirSync('dist/assets').filter((x) => x.startsWith(prefix) && x.endsWith(ext))
  expect(f, `${prefix}*${ext}`).toHaveLength(1)
  return `dist/assets/${f[0]}`
}
const gz = (file: string): number => gzipSync(readFileSync(file), { level: 9 }).length

test('the core script, the garage chunk and the stylesheet stay within budget', () => {
  expect(gz(asset('main-', '.js')), 'main JS (gzip)').toBeLessThanOrEqual(BUDGET.mainJs)
  expect(gz(asset('world-', '.js')), 'garage chunk JS (gzip)').toBeLessThanOrEqual(BUDGET.worldJs)
  expect(gz(asset('main-', '.css')), 'CSS (gzip)').toBeLessThanOrEqual(BUDGET.css)
})

/** Everything the page fetched, cold, until it settles. */
async function fetched(page: Page, path: string): Promise<{ url: string; type: string; bytes: number }[]> {
  const list: { url: string; type: string; bytes: number }[] = []
  page.on('response', async (r) => {
    const req = r.request()
    let bytes = 0
    try { bytes = (await r.body()).length } catch { /* redirects and the like */ }
    list.push({ url: new URL(r.url()).pathname, type: req.resourceType(), bytes })
  })
  await page.goto(path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  return list
}

for (const [name, view] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
] as const) {
  test.describe(`first screen, ${name}`, () => {
    test.use(view)

    for (const [path, budget] of [['/works.html', BUDGET.worksImages], ['/archive.html', BUDGET.archiveImages]] as const) {
      test(`${path}: pictures within budget, the room only as its small backdrop`, async ({ page }) => {
        const got = await fetched(page, path)
        const images = got.filter((r) => r.type === 'image')
        const total = images.reduce((s, r) => s + r.bytes, 0)
        expect(total, images.map((r) => `${r.url} ${Math.round(r.bytes / KB)}KB`).join('\n')).toBeLessThanOrEqual(budget)
        expect(got.map((r) => r.url).filter((u) => /room_(landscape|portrait)\.webp$/.test(u)), 'the full painting behind a blur').toEqual([])
      })
    }

    test('only the home page loads the garage; no page loads sound before it is asked for', async ({ page }) => {
      for (const path of ['/works.html', '/works/lumiora.html', '/archive.html', '/studio.html', '/press.html', '/privacy.html']) {
        const got = await fetched(page, path)
        expect(got.filter((r) => /\/assets\/world-.*\.js$/.test(r.url)).map((r) => r.url), `${path}: the garage's code`).toEqual([])
        expect(got.filter((r) => r.type === 'media' || /\.(m4a|mp3|ogg|wav)$/.test(r.url)).map((r) => r.url), `${path}: sound`).toEqual([])
      }
      const home = await fetched(page, '/')
      expect(home.some((r) => /\/assets\/world-.*\.js$/.test(r.url)), 'home: the garage chunk').toBe(true)
      expect(home.filter((r) => r.type === 'media' || /\.(m4a|mp3|ogg|wav)$/.test(r.url)).map((r) => r.url), 'home: sound before a gesture').toEqual([])
      expect(await page.locator('link[rel="modulepreload"][href*="/assets/world-"]').count(), 'home preloads the garage chunk').toBe(1)
    })
  })
}
