import { test, expect } from '@playwright/test'

/**
 * The way in. There is one screen before the room and nothing underneath it:
 * a visitor who scrolls instead of entering must not find a second, older
 * version of the site sitting below the shutter.
 */

for (const vp of [
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'phone', width: 390, height: 844, touch: true },
]) {
  test.describe(vp.name, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
    })

    test('the entrance is the whole page, and the door leads inside', async ({ page }) => {
      await page.addInitScript(() => {
        try {
          sessionStorage.clear()
          localStorage.clear()
        } catch {
          /* private mode */
        }
      })
      await page.goto('/', { waitUntil: 'load' })
      await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
      await page.waitForTimeout(800)

      // Nothing to scroll to.
      const page1 = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        wide: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }))
      expect(page1.scrollHeight).toBeLessThanOrEqual(page1.clientHeight + 1)
      expect(page1.wide).toBe(false)
      await page.mouse.wheel(0, 3000)
      await page.waitForTimeout(250)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)

      // The old landing is gone from this page.
      for (const gone of ['.marquee', '.manifesto', '.project', '.site-footer']) {
        await expect(page.locator(gone)).toHaveCount(0)
      }
      // But every page it held is still reachable from here.
      for (const href of ['./games.html', './studio.html', './support.html', './privacy.html']) {
        await expect(page.locator(`a[href="${href}"]`).first()).toHaveCount(1)
      }

      await expect(page.locator('[data-garage]')).toBeHidden()
      const started = Date.now()
      await page.locator('[data-alley-enter]').click()
      // Timed on the frame the room appears, not on an assertion's poll.
      await page.waitForFunction(
        () => !(document.querySelector('[data-garage]') as HTMLElement).hidden,
        undefined,
        { timeout: 8000 },
      )
      const took = Date.now() - started
      await expect(page.locator('[data-garage]')).toBeVisible()
      // Long enough to be a door opening, short enough to sit through again.
      expect(took).toBeGreaterThan(1200)
      expect(took).toBeLessThan(3000)

      await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
      await expect(page.locator('.thing')).toHaveCount(11)
    })
  })
}

test('a visitor who does not want motion is taken straight in', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.goto('/', { waitUntil: 'load' })
  await page.waitForSelector('[data-alley-enter]', { state: 'visible' })
  const started = Date.now()
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(
    () => !(document.querySelector('[data-garage]') as HTMLElement).hidden,
    undefined,
    { timeout: 8000 },
  )
  expect(Date.now() - started).toBeLessThan(700)
  await expect(page.locator('[data-garage]')).toBeVisible()
  await context.close()
})

test('the pages that hold the same content still work on their own', async ({ page }) => {
  await page.goto('/games.html', { waitUntil: 'load' })
  await expect(page.locator('.fb-game')).toHaveCount(4)
  await expect(page.locator('body')).toContainText('LUNAI')
  // `.intro` on these pages is a lead paragraph. It must stay one — a bare
  // `.intro` rule once turned it into a full-screen box.
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector('main p.intro')!).position),
  ).toBe('static')

  await page.goto('/studio.html', { waitUntil: 'load' })
  await expect(page.locator('.fb-block')).toHaveCount(3)
  await expect(page.locator('body')).toContainText('eungarage@gmail.com')

  await page.goto('/support.html', { waitUntil: 'load' })
  expect(
    await page.evaluate(() => getComputedStyle(document.querySelector('main p.intro')!).position),
  ).toBe('static')
})
