import { test, expect } from '@playwright/test'

/**
 * A page's text appears however tall it is. The reveal used to wait for 18% of
 * an element's own height to be on screen: LUNAI's privacy policy is about
 * 6,000 px on a phone, so on an 844 px screen its text never appeared, not
 * even after scrolling the whole page (production, 2026-10-08).
 */
const PAGES = ['/privacy.html', '/terms.html', '/community-guidelines.html', '/account-deletion.html', '/support.html']

for (const [name, view] of [
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ['phone sideways', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
  ['desktop', { viewport: { width: 1440, height: 900 } }],
] as const) {
  test.describe(`tall documents — ${name}`, () => {
    test.use(view)
    for (const path of PAGES) {
      test(`${path}: the text is there once scrolled to`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'load' })
        const doc = page.locator('article.doc')
        await doc.scrollIntoViewIfNeeded()
        await expect(doc).toHaveCSS('opacity', '1', { timeout: 3000 })
        // And reading on down, it stays.
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight / 2))
        await expect(doc).toHaveCSS('opacity', '1')
      })
    }
  })
}
