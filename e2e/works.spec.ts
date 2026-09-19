import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * WORKS: the worlds the dokkaebi made, and each one's bench.
 *
 * What these check is what a visitor would notice first: the page is not the
 * old black portfolio, every work opens and shows its pictures, the viewer
 * lets go of the keyboard when it closes, the garage PC leads to the right
 * work, and nothing breaks on the way (no console error, no picture that
 * never arrives).
 */
const WORKS = ['lunai', 'liminal', 'wormup', 'lumiora', 'rubato'] as const

function watch(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`) })
  return errors
}

/** Every picture on the page that has a source has arrived, and none is broken. */
async function picturesArrived(page: Page): Promise<string[]> {
  await page.evaluate(async () => {
    for (const img of document.images) {
      if (!img.getAttribute('src')) continue
      img.loading = 'eager'
      if (!img.complete) await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }) })
    }
  })
  return page.evaluate(() => [...document.images].filter((i) => i.getAttribute('src') && i.naturalWidth === 0).map((i) => i.src))
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the index is the dokkaebi\'s table, not the old portfolio', async ({ page }) => {
    const errors = watch(page)
    await page.goto('/works.html', { waitUntil: 'load' })
    await expect(page).toHaveTitle('WORKS — EUNGARAGE')
    await expect(page.locator('h1')).toHaveText('도깨비들이 만든 세계들')
    await expect(page.locator('body')).not.toContainText(/OUR\s*GAMES|SELECTED WORLDS/i)
    // Five works, each its own kind of object, each leading to its own page.
    const records = page.locator('[data-record]')
    await expect(records).toHaveCount(5)
    for (const id of WORKS) {
      await expect(page.locator(`[data-record="${id}"]`)).toHaveAttribute('href', `/works/${id}.html`)
      await expect(page.locator(`.record--${id}`)).toHaveCount(1)
    }
    // Not five of the same card: the objects are drawn differently.
    const grounds = await records.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundImage))
    expect(new Set(grounds).size).toBe(5)
    // The way back to the garage is right there.
    await expect(page.locator('[data-works-home]')).toHaveAttribute('href', '/index.html')
    expect(await picturesArrived(page)).toEqual([])
    expect(errors).toEqual([])
  })

  for (const id of WORKS) {
    test(`${id}: its bench, whole`, async ({ page }) => {
      const errors = watch(page)
      await page.goto(`/works/${id}.html`, { waitUntil: 'load' })
      await expect(page).toHaveTitle(/ — EUNGARAGE$/)
      for (const h of ['WHAT IS THIS?', 'CORE EXPERIENCE', 'CURRENT BUILD', 'DEV LOG', 'GALLERY']) {
        await expect(page.locator('.work-sec__h', { hasText: h })).toHaveCount(1)
      }
      await expect(page.locator('.work-tags dt')).toHaveText(['TYPE', 'PLATFORM', 'STATUS', 'ENGINE', 'NOW'])
      // Never RELEASED: nothing has a store page.
      await expect(page.locator('.work-tags [data-status]')).not.toHaveText('RELEASED')
      await expect(page.locator('.work-build__item[data-state="done"]').first()).toBeVisible()
      // Every log entry is a dated commit.
      for (const ref of await page.locator('.work-log__ref').allTextContents()) expect(ref).toMatch(/^[0-9a-f]{7,8}$/)
      await expect(page.locator('.work-hero__frame img')).toHaveCount(1)
      expect(await picturesArrived(page)).toEqual([])
      expect(errors).toEqual([])
    })
  }

  test('a picture opens whole, turns, and gives the keyboard back', async ({ page }) => {
    await page.goto('/works/lumiora.html', { waitUntil: 'load' })
    const first = page.locator('[data-shot="1"]')
    await first.click()
    const view = page.locator('.work-view')
    await expect(view).toBeVisible()
    const img = page.locator('.work-view__img')
    await expect(img).toHaveAttribute('src', /-full\.webp$/)
    await expect(img).toHaveJSProperty('complete', true)
    // Whole: at its own shape, inside the window.
    const fit = await img.evaluate((el: HTMLImageElement) => {
      const r = el.getBoundingClientRect()
      return { drawn: r.width / r.height, natural: el.naturalWidth / el.naturalHeight, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight }
    })
    expect(Math.abs(fit.drawn - fit.natural) / fit.natural).toBeLessThan(0.02)
    expect(fit.r).toBeLessThanOrEqual(fit.vw)
    expect(fit.b).toBeLessThanOrEqual(fit.vh)
    await expect(page.locator('[data-view-count]')).toHaveText('2 / 6')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-view-count]')).toHaveText('3 / 6')
    await page.keyboard.press('Escape')
    await expect(view).toBeHidden()
    await expect(first).toBeFocused()
  })

  test('the traces are the work\'s own polaroids', async ({ page }) => {
    await page.goto('/works/liminal.html', { waitUntil: 'load' })
    await page.locator('[data-traces]').click()
    await expect(page.locator('.work-view.is-polaroid')).toBeVisible()
    await expect(page.locator('.work-view__img')).toHaveJSProperty('complete', true)
    expect(await page.locator('.work-view__img').evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
    await page.keyboard.press('Escape')
    await expect(page.locator('.work-view')).toBeHidden()
  })

  test('the garage PC leads to the work it is showing', async ({ page }) => {
    await page.addInitScript(() => {
      try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
    })
    await page.goto('/', { waitUntil: 'load' })
    await page.locator('[data-alley-enter]').click()
    await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
    await page.locator('.nav-links a', { hasText: 'Works' }).click()
    await page.locator('[data-game="lumiora"]').click({ timeout: 8000 })
    const open = page.locator('[data-crt-open]')
    await expect(open).toHaveAttribute('href', '/works/lumiora.html')
    await open.click()
    await expect(page).toHaveURL(/\/works\/lumiora\.html$/, { timeout: 8000 })
    await expect(page.locator('h1')).toHaveText('LUMIORA')
    // And Back is the garage again.
    await page.goBack()
    await expect(page).toHaveURL(/\/(index\.html)?(#.*)?$/)
  })

  test('the nav says WORKS everywhere, and it leads to WORKS', async ({ page }) => {
    for (const path of ['/works.html', '/studio.html', '/support.html']) {
      await page.goto(path, { waitUntil: 'load' })
      const link = page.locator('.nav-links a').first()
      await expect(link).toHaveText(/works/i)
      await expect(page.locator('.nav-links a', { hasText: /^Games$/ })).toHaveCount(0)
    }
    await page.goto('/studio.html', { waitUntil: 'load' })
    await page.locator('.nav-links a', { hasText: 'Works' }).click()
    await expect(page).toHaveURL(/\/works\.html$/)
  })
})

for (const view of [
  { name: 'phone portrait', viewport: { width: 390, height: 844 } },
  { name: 'phone landscape', viewport: { width: 844, height: 390 } },
] as const) {
  test.describe(view.name, () => {
    test.use({ ...view, isMobile: true, hasTouch: true })

    test('nothing spills sideways, and everything is a fingertip', async ({ page }) => {
      for (const path of ['/works.html', '/works/lumiora.html', '/works/rubato.html']) {
        await page.goto(path, { waitUntil: 'load' })
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
        expect(wide, `${path} scrolls sideways`).toBeLessThanOrEqual(1)
        const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main a, main button')]
          .filter((el) => el.offsetParent !== null && !el.closest('[hidden]'))
          .map((el) => { const r = el.getBoundingClientRect(); return { t: el.textContent?.trim().slice(0, 20), w: r.width, h: r.height } })
          .filter((b) => Math.min(b.w, b.h) < 44))
        expect(small, `${path}: too small to hit`).toEqual([])
      }
    })

    test('a record opens its work with a tap', async ({ page }) => {
      await page.goto('/works.html', { waitUntil: 'load' })
      await page.locator('[data-record="liminal"]').tap()
      await expect(page).toHaveURL(/\/works\/liminal\.html$/)
      await page.locator('[data-shot="0"]').tap()
      await expect(page.locator('.work-view')).toBeVisible()
      await page.locator('.work-view__close').tap()
      await expect(page.locator('.work-view')).toBeHidden()
    })
  })
}
