import { test, expect } from '@playwright/test'

/**
 * One door.
 *
 * The site used to open with a curtain of its own — a slatted door and the
 * studio symbol — that rolled up by itself and handed over to the entrance,
 * whose shutter then rolled up again on ENTER. Two doors, one of them opening
 * without being asked. The first screen is now the entrance itself, and the
 * only door that moves is the one the visitor opens.
 */

const LEGACY = '#intro, .intro__curtain, .intro__skip, #introSkip, .intro__art'
const OLD_DOOR_ART = /brand\/eungarage_planet_garage_symbol/

for (const vp of [
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'wide', width: 1920, height: 1080, touch: false },
  { name: 'tablet', width: 768, height: 1024, touch: true },
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'phone-large', width: 430, height: 932, touch: true },
]) {
  test.describe(vp.name, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
    })

    test('the entrance is the first thing on screen, and it is the only door', async ({
      page,
    }) => {
      const requests: string[] = []
      const problems: string[] = []
      page.on('request', (r) => requests.push(r.url()))
      page.on('console', (m) => {
        if (m.type() === 'error') problems.push(`console: ${m.text()}`)
      })
      page.on('response', (r) => {
        if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`)
      })
      // A visitor who has never been here, in a tab that remembers nothing.
      await page.addInitScript(() => {
        try {
          sessionStorage.clear()
          localStorage.clear()
        } catch {
          /* private mode */
        }
      })

      await page.goto('/', { waitUntil: 'load' })

      // No legacy curtain, in any form: not hidden, not transparent — absent.
      await expect(page.locator(LEGACY)).toHaveCount(0)

      // Whatever is under the middle of the screen belongs to the entrance.
      // A curtain over it would be the thing the pointer finds instead.
      const onTop = await page.evaluate(() => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
        return { inAlley: !!el?.closest('[data-alley]'), tag: el?.tagName ?? 'none' }
      })
      expect(onTop.inAlley, `topmost element was ${onTop.tag}`).toBe(true)

      // And the entrance art is really there, at a real size.
      const plate = await page
        .locator('[data-alley-plate]')
        .evaluate((el) => el.getBoundingClientRect().width)
      expect(plate).toBeGreaterThan(vp.width * 0.9)
      await expect(page.locator('[data-alley-base]')).toBeVisible()
      await expect(page.locator('[data-alley-enter]')).toBeVisible()

      // The room waits behind the shutter.
      await expect(page.locator('[data-garage]')).toBeHidden()

      // Nothing fetched the old door.
      expect(requests.filter((u) => OLD_DOOR_ART.test(u))).toEqual([])

      // The visitor opens the door. The slats move — that is the shutter.
      const restingSlats = await page
        .locator('.alley__slats')
        .evaluate((el) => getComputedStyle(el).transform)
      await page.locator('[data-alley-enter]').click()
      await expect(page.locator('[data-alley]')).toHaveClass(/alley--rise/, { timeout: 2000 })
      const liftedSlats = await page
        .locator('.alley__slats')
        .evaluate((el) => getComputedStyle(el).transform)
      expect(liftedSlats).not.toBe(restingSlats)

      // …and it leads inside.
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
      await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)

      // ENTER ran once. Pressing it again does not start a second entrance.
      await expect(page.locator('[data-alley]')).toHaveAttribute('data-phase', 'inside')
      await page.locator('[data-alley-enter]').click({ force: true }).catch(() => undefined)
      await page.waitForTimeout(400)
      await expect(page.locator('[data-alley]')).toHaveAttribute('data-phase', 'inside')
      await expect(page.locator('[data-garage]')).toBeVisible()
      await expect(page.locator(LEGACY)).toHaveCount(0)

      expect(problems).toEqual([])
    })
  })
}

test('a second visit in the same tab starts exactly the same way', async ({ page }) => {
  const seen: string[] = []
  page.on('request', (r) => seen.push(r.url()))
  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator(LEGACY)).toHaveCount(0)
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })

  // Reload: the curtain used to play only for a tab that had not seen it, so
  // the first visit and the second looked like different sites.
  await page.reload({ waitUntil: 'load' })
  await expect(page.locator(LEGACY)).toHaveCount(0)
  await expect(page.locator('[data-alley-base]')).toBeVisible()
  await expect(page.locator('[data-garage]')).toBeHidden()
  expect(seen.filter((u) => OLD_DOOR_ART.test(u))).toEqual([])

  // Nothing is left remembering an opening.
  const keys = await page.evaluate(() => {
    const out: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) out.push(sessionStorage.key(i) ?? '')
    for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i) ?? '')
    return out
  })
  expect(keys.filter((k) => /intro|opening|skip|splash/i.test(k))).toEqual([])
})

test('a visitor who asked for less motion gets the entrance, not a blank page', async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator(LEGACY)).toHaveCount(0)
  await expect(page.locator('[data-alley-base]')).toBeVisible()
  await expect(page.locator('[data-alley-enter]')).toBeVisible()
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 4000 })
  await context.close()
})

test('a deep link still lands on the entrance and opens its thing after ENTER', async ({
  page,
}) => {
  await page.goto('/#pc', { waitUntil: 'load' })
  await expect(page.locator(LEGACY)).toHaveCount(0)
  await expect(page.locator('[data-alley-base]')).toBeVisible()
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-crt]')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 8000 })
})

test('the door is never shown open before the shutter arrives', async ({ page }) => {
  // The base plate has the doorway painted open; the shutter is a separate
  // image on top of it. Held back, the entrance used to paint the open
  // doorway first and drop the shutter in afterwards — a door that shuts
  // itself while you look at it.
  await page.route('**/alley_shutter.webp', async (route) => {
    await new Promise((r) => setTimeout(r, 900))
    await route.continue()
  })
  await page.goto('/', { waitUntil: 'commit' })

  const readings: string[] = []
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(90)
    const r = await page.evaluate(() => {
      const plate = document.querySelector('[data-alley-plate]')
      const shutter = document.querySelector<HTMLImageElement>('[data-alley-shutter-img]')
      if (!plate || !shutter) return 'not built'
      return `${Number(getComputedStyle(plate).opacity) > 0.02 ? 'shown' : 'held'}:${
        shutter.complete ? 'shutter' : 'no-shutter'
      }`
    })
    readings.push(r)
  }
  // Never shown while the shutter is still missing.
  expect(readings.filter((r) => r === 'shown:no-shutter')).toEqual([])
  // And it does appear.
  await expect(page.locator('[data-alley]')).toHaveClass(/alley--dressed/, { timeout: 4000 })
  await expect(page.locator('[data-alley-base]')).toBeVisible()
})

test('a shutter that never arrives does not leave the entrance blank', async ({ page }) => {
  await page.route('**/alley_shutter.webp', (route) => route.abort())
  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('[data-alley]')).toHaveClass(/alley--dressed/, { timeout: 4000 })
  await expect
    .poll(
      async () =>
        await page
          .locator('[data-alley-plate]')
          .evaluate((el) => Number(getComputedStyle(el).opacity)),
      { timeout: 3000 },
    )
    .toBe(1)
  await expect(page.locator('[data-alley-enter]')).toBeVisible()
})
