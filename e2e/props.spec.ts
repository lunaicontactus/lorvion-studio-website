import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The parcel on the floor, the labels under the pointer, the monitor's panel
 * beside the room, and the light a game throws over it.
 *
 * All of it was ported from a copy of the site edited elsewhere and re-cut
 * for the crew; this is where it is checked against the real room, with
 * real clicks and taps. Nothing here is forced.
 */

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
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(400)
}

/**
 * How far apart two elements' boxes are, read on one frame.
 *
 * Two `boundingBox()` calls are two round trips, and between them the room
 * can move: the camera is still easing after `bring`, and a panel is still
 * scaling in after `toBeVisible` first says yes. Measured that way, one box
 * of art read twice came back six pixels apart and the test called it two
 * boxes. This reads both rects inside a single evaluate, so they are from
 * the same layout, whatever it is doing.
 */
async function apart(page: Page, a: string, b: string): Promise<number> {
  return page.evaluate(([sa, sb]) => {
    const ra = document.querySelector(sa!)!.getBoundingClientRect()
    const rb = document.querySelector(sb!)!.getBoundingClientRect()
    return Math.abs(ra.x - rb.x) + Math.abs(ra.y - rb.y)
      + Math.abs(ra.width - rb.width) + Math.abs(ra.height - rb.height)
  }, [a, b])
}

/** Bring a thing into view by touching nothing: the camera is asked directly. */
async function bring(page: Page, id: string): Promise<void> {
  await page.evaluate((id) => {
    const el = document.querySelector<HTMLElement>(`.thing--${id}`)
    el?.scrollIntoView?.()
  }, id)
  // The room is one transform, not a scroller; pan the camera with the keys
  // until the thing's box is inside the viewport.
  for (let i = 0; i < 40; i++) {
    const box = await page.locator(`.thing--${id}`).boundingBox()
    const vp = page.viewportSize()!
    if (box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height) return
    if (!box) break
    const dir = vp.width > vp.height ? (box.x < 0 ? 'ArrowLeft' : 'ArrowRight') : box.y < 0 ? 'ArrowUp' : 'ArrowDown'
    await page.keyboard.down(dir)
    await page.waitForTimeout(160)
    await page.keyboard.up(dir)
  }
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the parcel opens where it stands, and nothing else opens', async ({ page }) => {
    await enter(page)
    await bring(page, 'parcel')
    const parcel = page.locator('.thing--parcel')
    await expect(parcel).toBeVisible()
    const closed = parcel.locator('.thing__art--closed')
    const open = parcel.locator('.thing__art--open')
    // One canvas, one box: the open state may not move by a pixel.
    expect(await apart(page, '.thing--parcel .thing__art--closed', '.thing--parcel .thing__art--open'))
      .toBeLessThan(1)
    await expect(open).toHaveCSS('opacity', '0')

    await parcel.click()
    await expect(parcel).toHaveClass(/is-open/)
    await expect(parcel).toHaveAttribute('aria-pressed', 'true')
    await expect(open).toHaveCSS('opacity', '1')
    await expect(closed).toHaveCSS('opacity', '0')
    // Not a panel. The room is still the room.
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    expect(page.url()).not.toContain('#parcel')

    await parcel.click()
    await expect(parcel).not.toHaveClass(/is-open/)
    await expect(open).toHaveCSS('opacity', '0')
  })

  test('a thing says what it is under the pointer, beside its outline', async ({ page }) => {
    await enter(page)
    const pc = page.locator('.thing--pc')
    const label = pc.locator('.thing__label')
    await expect(label).toHaveCSS('opacity', '0')
    await pc.hover()
    await expect(label).toHaveText('PC · 작품과 미니게임')
    await expect(label).toHaveCSS('opacity', '1')
    await expect(pc.locator('.thing__outline')).toHaveCSS('opacity', '1')
    // Readable: 13px on screen whatever the room's scale.
    const size = await label.evaluate((el) => parseFloat(getComputedStyle(el).fontSize) * (el.getBoundingClientRect().height / el.offsetHeight))
    expect(size).toBeGreaterThan(11)
    expect(size).toBeLessThan(16)
    await page.mouse.move(5, 5)
    await expect(label).toHaveCSS('opacity', '0')
  })

  test('the monitor panel stands beside the room and leaves the PC in view', async ({ page }) => {
    await enter(page)
    await page.locator('.thing--pc').click()
    await expect(page.locator('.panel-layer.is-open')).toBeVisible()
    await expect(page.locator('.hub__row').first()).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(600) // the camera settles
    const panel = (await page.locator('.panel').boundingBox())!
    const pc = (await page.locator('.thing--pc').boundingBox())!
    const vp = page.viewportSize()!
    // Right-hand side, and the PC entirely to its left and on screen.
    expect(panel.x).toBeGreaterThan(vp.width / 2)
    expect(pc.x).toBeGreaterThanOrEqual(0)
    expect(pc.x + pc.width).toBeLessThan(panel.x)
    // The cut-out of the monitor is not shown: the real one is beside it.
    await expect(page.locator('.panel__portrait')).toBeHidden()
  })

  test('one game lights the room while the monitor shows it', async ({ page }) => {
    await enter(page)
    const garage = page.locator('[data-garage]')
    await page.locator('.thing--pc').click()
    await expect(page.locator('[data-game="lunai"]')).toBeVisible({ timeout: 5000 })
    await expect(garage).not.toHaveAttribute('data-world', /./)
    await page.locator('[data-game="lunai"]').click()
    await expect(page.locator('.crtgame__name')).toHaveText('LUNAI')
    await expect(garage).toHaveAttribute('data-world', 'lunai')
    await expect(page.locator('[data-panel-root]')).toHaveAttribute('data-world', 'lunai')
    await expect(page.locator('.garage__wash')).toHaveCSS('opacity', '1')
    // Back to the list: the light goes with the game.
    await page.locator('[data-crt-back]').click()
    await expect(garage).not.toHaveAttribute('data-world', /./)
    // And a game that lives behind the door lights the door.
    await page.locator('[data-game="liminal"]').click()
    await expect(garage).toHaveAttribute('data-world', 'liminal')
    await expect(page.locator('.garage__doorlight')).toHaveCSS('opacity', '1')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    await expect(garage).not.toHaveAttribute('data-world', /./)
    await expect(page.locator('.garage__wash')).toHaveCSS('opacity', '0')
  })

  test('the bench holds the toy car in two states on one box, and the fridge the new snacks', async ({ page }) => {
    await enter(page)
    await page.locator('.thing--workbench').click()
    const car = page.locator('[data-bench-car]')
    await expect(car).toBeVisible({ timeout: 5000 })
    const closed = car.locator('img[data-state="closed"]')
    expect(await apart(page, '[data-bench-car] img[data-state="open"]', '[data-bench-car] img[data-state="closed"]'))
      .toBeLessThan(1)
    await expect(closed).toHaveCSS('opacity', '0')
    await car.click()
    await expect(car).toHaveAttribute('aria-pressed', 'true')
    await expect(closed).toHaveCSS('opacity', '1')
    await expect(page.locator('[data-bench-note]')).toContainText('닫았다')
    // The projects are still listed under it.
    await expect(page.locator('.note__row')).toHaveCount(4)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()

    await page.locator('.thing--fridge').click()
    await expect(page.locator('.chill')).toHaveCount(7, { timeout: 5000 })
    await expect(page.locator('.chill[data-item="ramen-open"] .chill__label')).toHaveText('먹던 컵라면')
    await expect(page.locator('.chill[data-item="drink"] .chill__label')).toHaveText('음료')
    for (const id of ['ramen-open', 'drink']) {
      const ok = await page.locator(`.chill[data-item="${id}"] .chill__art`).evaluate(async (el) => {
        const url = /url\(["']?([^"')]+)/.exec(getComputedStyle(el).backgroundImage)?.[1]
        if (!url) return false
        const img = new Image()
        img.src = url
        try { await img.decode() } catch { return false }
        return img.naturalWidth > 0
      })
      expect(ok, id).toBe(true)
    }
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the parcel is a fingertip wide and answers a tap', async ({ page }) => {
    await enter(page)
    await bring(page, 'parcel')
    const parcel = page.locator('.thing--parcel')
    const box = (await parcel.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await parcel.tap()
    await expect(parcel).toHaveClass(/is-open/)
    // No label lingers after the finger lifts.
    await page.waitForTimeout(400)
    await expect(parcel.locator('.thing__label')).toHaveCSS('opacity', '0')
  })

  test('the monitor panel is still centred on a phone', async ({ page }) => {
    await enter(page)
    await page.locator('.thing--pc').tap()
    await expect(page.locator('.hub__row').first()).toBeVisible({ timeout: 5000 })
    const panel = (await page.locator('.panel').boundingBox())!
    const vp = page.viewportSize()!
    expect(Math.abs(panel.x + panel.width / 2 - vp.width / 2)).toBeLessThan(4)
  })
})
