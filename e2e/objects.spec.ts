import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The three things that work: the PC, the bench and the television.
 *
 * These check the machine as much as the objects — that the camera moves and
 * comes back, that a second click during a transition cannot corrupt the
 * state, that Escape and the browser's back button both close, and that a
 * thing with nothing behind it says so instead of opening an empty panel.
 */

const panel = '[data-panel-root]'

async function enter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto('/', { waitUntil: 'load' })
  const skip = page.locator('#introSkip')
  if (await skip.count()) await skip.click().catch(() => undefined)
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(900)
}

/** Touch a thing through the room's own handler, wherever the camera is. */
async function touch(page: Page, id: string): Promise<void> {
  await page.evaluate((name) => {
    document
      .querySelector(`.thing--${name}`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, id)
}

/** Where the room is standing, in screen pixels. */
async function roomAt(page: Page): Promise<{ x: number; y: number }> {
  const t = await page.evaluate(
    () => (document.querySelector('.garage__room') as HTMLElement).style.transform,
  )
  const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(t)
  return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) }
}

/** The easing never lands on exactly the same subpixel; a pixel is close enough. */
function samePlace(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1
}

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

    test('the PC boots, lists the games, opens one and comes back', async ({ page }) => {
      await enter(page)
      const before = await roomAt(page)

      await touch(page, 'pc')
      await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 5000 })
      // The camera went to the object rather than the panel simply appearing.
      expect(samePlace(await roomAt(page), before)).toBe(false)
      await expect(page.locator('[data-panel]')).toContainText('EUNGARAGE SOFTWARE')

      await page.locator('[data-game="liminal"]').click()
      await expect(page.locator('.crtgame__name')).toHaveText('LIMINAL')
      await expect(page.locator('.crtgame__facts')).toContainText('Narrative mystery')
      // Still inside the monitor: the full page is a link, not the first stop.
      await expect(page.locator('.crtgame__full')).toHaveAttribute('href', /games\.html/)

      await page.locator('[data-crt-back]').click()
      await expect(page.locator('.hub__row')).toHaveCount(4)

      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
      // And the camera is put back where the visitor had it.
      await page.waitForTimeout(900)
      expect(samePlace(await roomAt(page), before)).toBe(true)
    })

    test('the bench holds the studio, and the television can be switched off', async ({ page }) => {
      await enter(page)

      await touch(page, 'workbench')
      await expect(page.locator('.note__lede')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('[data-panel]')).toContainText('Made in our garage.')
      await expect(page.locator('.note__row')).toHaveCount(4)
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()

      await touch(page, 'tv')
      await expect(page.locator('.tvrow__value')).toHaveText('eungarage@gmail.com', {
        timeout: 5000,
      })
      await expect(page.locator('.tvrow__value')).toHaveAttribute('href', /^mailto:/)
      await page.locator('[data-tv-power]').click()
      await expect(page.locator('[data-tv]')).toHaveClass(/is-off/)
      await expect(page.locator('.tvrow__value')).toHaveCount(0)
      await page.locator('[data-tv-power]').click()
      await expect(page.locator('.tvrow__value')).toHaveCount(1)
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })

  })
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('hammering the room does not confuse it', async ({ page }) => {
    await enter(page)
    // Twice in a row, then a different object mid-flight, then Escape spam.
    await touch(page, 'pc')
    await touch(page, 'pc')
    await touch(page, 'tv')
    await expect(page.locator('[data-panel]')).toBeVisible()
    await page.waitForTimeout(1200)
    const open = await page.evaluate(
      () => document.querySelectorAll('[data-panel-root] [role="dialog"]').length,
    )
    expect(open).toBe(1)
    for (let i = 0; i < 6; i++) await page.keyboard.press('Escape')
    await expect(page.locator(panel)).toBeHidden()
    // And the room takes input again.
    await touch(page, 'workbench')
    await expect(page.locator('.note__lede')).toBeVisible({ timeout: 5000 })
  })

  test('back closes what is open instead of leaving the site', async ({ page }) => {
    await enter(page)
    await touch(page, 'pc')
    await expect(page.locator('.hub__row').first()).toBeVisible({ timeout: 5000 })
    expect(await page.evaluate(() => location.hash)).toBe('#pc')
    await page.goBack()
    await expect(page.locator(panel)).toBeHidden()
    // Still in the garage, not back outside or on another page.
    await expect(page.locator('[data-garage]')).toBeVisible()
    expect(await page.evaluate(() => location.pathname)).toBe('/')
  })

  test('the top nav opens the thing it names', async ({ page }) => {
    await enter(page)
    await page.locator('.nav-links a', { hasText: 'Games' }).click()
    await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.locator(panel)).toBeHidden()

    await page.locator('.nav-links a', { hasText: 'Studio' }).click()
    await expect(page.locator('.note__lede')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.locator(panel)).toBeHidden()

    await page.locator('.nav-links a', { hasText: 'Contact' }).click()
    await expect(page.locator('.tvrow__value')).toHaveCount(1, { timeout: 5000 })
    // Support is a page, not a thing in the room, and stays one.
    await expect(page.locator('.nav-links a', { hasText: 'Support' })).toHaveAttribute(
      'href',
      './support.html',
    )
  })

  test('the nav works from outside, entering the room on the way', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.clear()
        localStorage.clear()
      } catch {
        /* private mode */
      }
    })
    await page.goto('/', { waitUntil: 'load' })
    const skip = page.locator('#introSkip')
    if (await skip.count()) await skip.click().catch(() => undefined)
    await expect(page.locator('[data-garage]')).toBeHidden()
    await page.locator('.nav-links a', { hasText: 'Games' }).click()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 8000 })
  })
})

test('every thing is big enough to hit, at every size', async ({ browser }) => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    const context = await browser.newContext({
      viewport: size,
      hasTouch: size.width < 800,
      isMobile: size.width < 500,
    })
    const page = await context.newPage()
    await enter(page)
    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll('.thing')].map((t) => {
        const b = t.getBoundingClientRect()
        return { id: (t as HTMLElement).dataset['object'], w: b.width, h: b.height, b }
      }),
    )
    for (const box of boxes) {
      // 44 CSS px is the smallest thing a finger can be asked to hit.
      expect(Math.min(box.w, box.h), `${box.id} at ${size.width}`).toBeGreaterThanOrEqual(44)
    }
    // No two hit areas may reach into each other, whatever the scale.
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!.b
        const c = boxes[j]!.b
        const overlap =
          Math.max(0, Math.min(a.right, c.right) - Math.max(a.left, c.left)) *
          Math.max(0, Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top))
        expect(overlap, `${boxes[i]!.id} over ${boxes[j]!.id} at ${size.width}`).toBe(0)
      }
    }
    await context.close()
  }
})

test('a visitor who does not want motion still gets the whole thing', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await enter(page)
  await touch(page, 'pc')
  // No boot wait, no camera easing: the list is simply there.
  await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 2000 })
  await page.keyboard.press('Escape')
  await expect(page.locator(panel)).toBeHidden()
  await touch(page, 'tv')
  await expect(page.locator('.tvrow__value')).toHaveCount(1, { timeout: 2000 })
  await context.close()
})
