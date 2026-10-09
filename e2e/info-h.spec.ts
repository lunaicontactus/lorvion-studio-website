import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * SITE UPGRADE PHASE H — the info pages as one system: Studio · Support ·
 * Contact · Press · the four LUNAI documents · 404. Readable on paper, at a
 * desk and on a phone either way up, by keyboard, and without motion.
 */
const PAGES = ['/studio.html', '/support.html', '/contact.html', '/press.html', '/privacy.html', '/terms.html', '/account-deletion.html', '/community-guidelines.html', '/404.html']

/** Links and buttons that stand on their own (inline links in a sentence are exempt, WCAG 2.5.8). */
const STANDALONE = [
  '.info-back a', '.doc-nav a', '.contact-card__links a', '.link-list a', '.support-others a', '.info-button', '.cta-button',
  '.press-brand__one > a', '.doc-toc a', '.cta-box ul li a', '.studio-work a', '.doc-toc > summary',
].join(', ')

async function small(page: Page): Promise<string[]> {
  return page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(sel)]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 44 })
    .map((e) => `${e.className || e.tagName}:${(e.textContent ?? '').trim().slice(0, 18)}:${Math.round(e.getBoundingClientRect().height)}`), STANDALONE)
}

for (const [name, view] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ['phone sideways', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
] as const) {
  test.describe(`INFO PAGES — ${name}`, () => {
    test.use(view)
    for (const path of PAGES) {
      test(`${path}: one heading, the paper on screen, nothing wider than the screen, every target 44px`, async ({ page }) => {
        const errors: string[] = []
        page.on('pageerror', (e) => errors.push(String(e)))
        await page.goto(path, { waitUntil: 'load' })
        await expect(page.locator('body')).toHaveClass(/info-page/)
        await expect(page.locator('h1')).toHaveCount(1)
        const doc = page.locator('article.doc')
        await expect(doc).toBeVisible()
        // No reveal to wait for: the paper is simply there, at full strength.
        await expect(doc).toHaveCSS('opacity', '1')
        await expect.poll(() => doc.evaluate((el) => el.textContent?.trim().length ?? 0)).toBeGreaterThan(20)
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
        expect(await small(page)).toEqual([])
        expect(errors).toEqual([])
      })
    }
  })
}

test.describe('INFO PAGES — reading them', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the keyboard goes back to the garage first, and every focus is seen', async ({ page }) => {
    await page.goto('/privacy.html', { waitUntil: 'load' })
    const ring = async (): Promise<string> => page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      const cs = getComputedStyle(el)
      return `${el.textContent?.trim().slice(0, 14)}|${cs.outlineStyle}|${cs.outlineWidth}`
    })
    // Through the nav to the page's own first link.
    let found = false
    for (let i = 0; i < 20 && !found; i++) {
      await page.keyboard.press('Tab')
      found = await page.evaluate(() => !!(document.activeElement as HTMLElement | null)?.closest('.info-back'))
    }
    expect(found, 'reached the back link by keyboard').toBe(true)
    expect(await ring()).not.toMatch(/\|none\|/)
    // The documents strip, then into the paper: each one visibly focused.
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      expect(await ring(), `step ${i}`).not.toMatch(/\|none\|/)
    }
  })

  test('without motion the pages are the same pages', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const path of ['/studio.html', '/press.html', '/privacy.html']) {
      await page.goto(path, { waitUntil: 'load' })
      await expect(page.locator('article.doc')).toHaveCSS('opacity', '1')
    }
  })

  test('the LUNAI documents point at each other, and mark the one you are on', async ({ page }) => {
    for (const path of ['/privacy.html', '/terms.html', '/account-deletion.html', '/community-guidelines.html']) {
      await page.goto(path, { waitUntil: 'load' })
      await expect(page.locator('.doc-nav a')).toHaveCount(5)
      await expect(page.locator(`.doc-nav a[href="${path}"]`)).toHaveAttribute('aria-current', 'page')
      await expect(page.locator('.doc-owner')).toHaveText('LUNAI는 EUNGARAGE가 만드는 앱입니다.')
    }
  })

  test('SUPPORT: LUNAI first, at #lunai, its documents at #policy-links; the other four say they are not out yet', async ({ page }) => {
    await page.goto('/support.html#policy-links', { waitUntil: 'load' })
    await expect(page.locator('#policy-links')).toBeInViewport()
    await expect(page.locator('#lunai h2')).toHaveText('LUNAI')
    await expect(page.locator('[data-other-works] li')).toHaveCount(4)
    await expect(page.locator('.cta-button')).toHaveAttribute('href', 'mailto:eungarage@gmail.com?subject=[LUNAI] 고객지원 문의')
  })

  test('STUDIO: the five works with their state, the crew of five, and the ways to reach them', async ({ page }) => {
    await page.goto('/studio.html', { waitUntil: 'load' })
    await expect(page.locator('.studio-work')).toHaveCount(5)
    await expect(page.locator('.studio-crew__one')).toHaveCount(5)
    for (const img of await page.locator('.studio-crew__one img').all()) {
      await img.scrollIntoViewIfNeeded()
      await expect(img).toHaveJSProperty('complete', true)
      expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
    }
    await expect(page.locator('a.info-button[href="/contact.html"]')).toBeVisible()
    await expect(page.locator('a[href="/press.html"]').first()).toBeVisible()
  })

  test('PRESS: five works, every download is a real file, and the press mail', async ({ page, request }) => {
    await page.goto('/press.html', { waitUntil: 'load' })
    await expect(page.locator('[data-press-work]')).toHaveCount(5)
    const files = await page.locator('a[download]').evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!))
    expect(files.length).toBe(10)
    for (const f of files) expect((await request.get(f)).status(), f).toBe(200)
    await expect(page.locator('[data-press-mail]')).toHaveAttribute('href', 'mailto:eungarage@gmail.com?subject=%5B%EC%96%B8%EB%A1%A0%5D%20')
    await expect(page.locator('footer a[href="/press.html"]')).toHaveCount(1)
  })

  test('CONTACT: four doors, each with its subject; PRESS also opens the press kit', async ({ page }) => {
    await page.goto('/contact.html', { waitUntil: 'load' })
    await expect(page.locator('[data-contact]')).toHaveCount(4)
    await expect(page.locator('[data-contact="press"] a[href="/press.html"]')).toBeVisible()
    await expect(page.locator('[data-contact] a[href^="mailto:"]')).toHaveCount(4)
  })
})
