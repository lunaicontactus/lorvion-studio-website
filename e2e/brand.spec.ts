import { test, expect } from '@playwright/test'

/**
 * The brand, as a browser gets it: every logo, icon and share image the pages
 * point at actually loads, and is the v02 set.
 */
const PAGES = ['/', '/games.html', '/studio.html', '/support.html', '/privacy.html', '/404.html']

test.describe('brand files', () => {
  for (const path of PAGES) {
    test(`${path} — logo, icons, manifest and share image all load`, async ({ page, request }) => {
      await page.goto(path, { waitUntil: 'load' })
      const logo = page.locator('.site-nav .brand-logo')
      await expect(logo).toBeVisible()
      expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), 'nav logo did not decode').toBe(true)
      await expect(logo).toHaveAttribute('alt', 'EUNGARAGE')

      const urls = await page.evaluate(() => {
        const pick = (sel: string, attr: string): string[] =>
          [...document.querySelectorAll(sel)].map((el) => el.getAttribute(attr) ?? '')
        return [
          ...pick('link[rel~="icon"]', 'href'),
          ...pick('link[rel="apple-touch-icon"]', 'href'),
          ...pick('link[rel="manifest"]', 'href'),
          ...pick('meta[property="og:image"]', 'content'),
          ...pick('meta[name="twitter:image"]', 'content'),
          ...pick('img.footer-logo', 'src'),
        ].filter(Boolean)
      })
      expect(urls.length).toBeGreaterThanOrEqual(6)
      for (const url of urls) {
        // Share URLs are absolute to production; check the same file locally.
        const local = url.replace('https://eungarage.com', '')
        const res = await request.get(local)
        expect(res.status(), `${url} (from ${path})`).toBe(200)
      }
      const title = await page.title()
      expect(title).toContain('EUNGARAGE')
      expect(title.toLowerCase()).not.toContain('lorvion')
    })
  }

  test('the manifest icons load', async ({ request }) => {
    const m = await (await request.get('/manifest.webmanifest')).json()
    for (const icon of m.icons) {
      const res = await request.get(new URL(icon.src, 'http://x/').pathname)
      expect(res.status(), icon.src).toBe(200)
    }
  })
})
