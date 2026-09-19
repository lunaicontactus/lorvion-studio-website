import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 모모의 택배 배달 (WORLD 2.1), in the browser.
 *
 * test/delivery.test.ts proves the stage can be walked from the pile to both
 * doors, and holds the rules for ghosts, hearts and stars. Here: that it is
 * a pixel game in its own world, that MOMO answers the arrows and the jump —
 * two held at once — picks the parcel up from the pile, and that on a phone
 * the d-pad and JUMP are there, big enough, and work.
 */
const root = '[data-game-box].delivery'

async function open(page: Page, seed = 3): Promise<void> {
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  await page.goto(`/?play=parcel&parcelseed=${seed}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-game-start]')).toBeVisible({ timeout: 15_000 })
  await page.locator('[data-game-start]').click()
  await expect(page.locator('[data-game-overlay]')).toBeHidden({ timeout: 6000 })
}

const at = async (page: Page): Promise<{ x: number; y: number; carrying: string; lives: string }> =>
  page.locator(root).evaluate((el) => {
    const d = (el as HTMLElement).dataset
    return { x: Number(d['x']), y: Number(d['y']), carrying: d['carrying'] ?? '', lives: d['lives'] ?? '' }
  })

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('MOMO walks, jumps while walking, and picks the parcel up from the pile', async ({ page }) => {
    await open(page)
    await expect(page.locator('#gameTitle')).toHaveText('모모의 택배 배달')
    await expect(page.locator(`${root} canvas.pixel-stage__screen`)).toBeVisible()
    await expect.poll(async () => (await at(page)).x, { timeout: 3000 }).toBe(30)
    await page.keyboard.down('ArrowRight')
    await page.waitForTimeout(350)
    const right = (await at(page)).x
    expect(right).toBeGreaterThan(40)
    // Two held at once: right and jump.
    await page.keyboard.down(' ')
    await expect.poll(async () => (await at(page)).y, { timeout: 1000, intervals: [16] }).toBeLessThan(135)
    await page.keyboard.up(' ')
    await page.keyboard.up('ArrowRight')
    expect((await at(page)).x).toBeGreaterThan(right)
    await expect.poll(async () => (await at(page)).y, { timeout: 2000 }).toBe(144)
    // Left, to the pile by the gate: MOMO has a parcel.
    await page.keyboard.down('ArrowLeft')
    await expect.poll(async () => (await at(page)).carrying, { timeout: 4000 }).toBe('true')
    await page.keyboard.up('ArrowLeft')
    expect((await at(page)).lives).toBe('3')
  })
})

test.describe('on a phone', () => {
  for (const [name, viewport] of [['upright', { width: 390, height: 844 }], ['sideways', { width: 844, height: 390 }]] as const) {
    test(`${name}: the d-pad and JUMP are there, big enough, and move MOMO`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true })
      const page = await ctx.newPage()
      await open(page)
      const canvas = (await page.locator(`${root} canvas`).boundingBox())!
      expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height + 1)
      for (const c of ['left', 'right', 'jump']) {
        const b = (await page.locator(`[data-control="${c}"]`).boundingBox())!
        expect(Math.min(b.width, b.height), c).toBeGreaterThanOrEqual(44)
        expect(b.y + b.height, `${c} is off the screen`).toBeLessThanOrEqual(viewport.height + 1)
      }
      await expect.poll(async () => (await at(page)).x, { timeout: 3000 }).toBe(30)
      const r = (await page.locator('[data-control="right"]').boundingBox())!
      await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(400)
      await page.mouse.up()
      expect((await at(page)).x).toBeGreaterThan(40)
      const j = (await page.locator('[data-control="jump"]').boundingBox())!
      await page.mouse.move(j.x + j.width / 2, j.y + j.height / 2)
      await page.mouse.down()
      await expect.poll(async () => (await at(page)).y, { timeout: 1000, intervals: [16] }).toBeLessThan(135)
      await page.mouse.up()
      await ctx.close()
    })
  }
})
