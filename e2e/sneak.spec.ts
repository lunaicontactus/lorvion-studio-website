import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 요미의 과자 몰래 먹기 (WORLD 2.1), in the browser.
 *
 * The rules are held in test/sneak.test.ts, over thousands of simulated
 * rounds. Here: that it is a pixel game in its own world, that holding eats
 * and letting go stops, that the eating is heard, that POKO's head coming up
 * is the moment to stop and stopping then is safe, that eating through the
 * turn is being caught — with its sound, its words and a heart — and that a
 * phone holds it with a thumb.
 */
declare global {
  interface Window { __plays?: string[] }
}

const root = '[data-game-box].sneak'

async function open(page: Page, seed = 4): Promise<void> {
  await page.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, soundEnabled: true })) } catch { /* */ }
    window.__plays = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__plays!.push((this.currentSrc || this.src).split('/').pop() ?? '')
      return play.call(this)
    }
  })
  await page.goto(`/?play=mugunghwa&sneakseed=${seed}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-game-start]')).toBeVisible({ timeout: 15_000 })
  await page.locator('[data-game-start]').click()
  await expect(page.locator('[data-game-overlay]')).toBeHidden({ timeout: 6000 })
}

const state = (page: Page) => page.locator(root).evaluate((el) => ({ ...(el as HTMLElement).dataset }))
const score = async (page: Page): Promise<number> => Number(await page.locator('[data-game-score]').textContent())

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('it is a pixel game in its own world, with YOMI, POKO and the other three', async ({ page }) => {
    await open(page)
    await expect(page.locator('#gameTitle')).toHaveText('요미의 과자 몰래 먹기')
    const canvas = page.locator(`${root} canvas.pixel-stage__screen`)
    await expect(canvas).toBeVisible()
    // Drawn at a whole multiple of its 240 × 160, never smoothed.
    const size = await canvas.evaluate((c) => ({ w: c.getBoundingClientRect().width, r: getComputedStyle(c).imageRendering }))
    expect(size.w % 240).toBe(0)
    expect(size.r).toMatch(/pixelated|crisp-edges/)
    expect(await page.locator('.game-layer').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(7, 6, 13)')
    // Something is drawn: the screen is not one flat colour.
    const colours = await canvas.evaluate((c) => {
      const d = (c as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 240, 160).data
      const seen = new Set<number>()
      for (let i = 0; i < d.length; i += 16) seen.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!)
      return seen.size
    })
    expect(colours).toBeGreaterThan(20)
    expect((await state(page))['poko']).toBe('WORK')
    expect((await state(page))['hearts']).toBe('3')
  })

  test('holding eats, and is heard; letting go stops, and the room quietens', async ({ page }) => {
    await open(page, 9)
    await page.keyboard.down(' ')
    await expect.poll(async () => (await state(page))['eating'], { timeout: 2000 }).toBe('true')
    await expect.poll(() => score(page), { timeout: 3000 }).toBeGreaterThan(0)
    await expect.poll(() => page.evaluate(() => window.__plays!.filter((p) => /^eat(_soft)?\.m4a$/.test(p)).length), { timeout: 3000 }).toBeGreaterThan(0)
    const loud = Number((await state(page))['noise'])
    expect(loud).toBeGreaterThan(0)
    await page.keyboard.up(' ')
    await expect.poll(async () => (await state(page))['eating']).toBe('false')
    const held = await score(page)
    await page.waitForTimeout(900)
    expect(await score(page), 'working earned points').toBe(held)
    expect(Number((await state(page))['noise'])).toBeLessThan(loud)
  })

  test('let go when POKO looks up, and being looked at is safe', async ({ page }) => {
    test.setTimeout(60_000)
    await open(page, 7)
    await page.keyboard.down(' ')
    await expect.poll(async () => (await state(page))['poko'], { timeout: 20_000, intervals: [30] }).toBe('NOTICE')
    await page.keyboard.up(' ')
    // Through whatever comes next — a turn and a stare, or a false alarm.
    await page.waitForTimeout(3500)
    expect((await state(page))['hearts']).toBe('3')
  })

  test('eat through the turn and POKO sees: its sound, the words, a heart', async ({ page }) => {
    test.setTimeout(60_000)
    await open(page, 7)
    await page.keyboard.down(' ')
    await expect.poll(async () => (await state(page))['hearts'], { timeout: 25_000 }).toBe('2')
    await page.keyboard.up(' ')
    await expect(page.locator(`${root} .pixel-game__toast`)).toContainText('들켰다')
    expect(await page.evaluate(() => window.__plays!.includes('poko_turn.m4a'))).toBe(true)
  })

  test('losing the window lets go, and does not come back caught', async ({ page }) => {
    await open(page, 9)
    await page.keyboard.down(' ')
    await expect.poll(async () => (await state(page))['eating']).toBe('true')
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.locator('[data-game-resume]')).toBeVisible()
    await page.keyboard.up(' ')
    await page.locator('[data-game-resume]').click()
    await page.waitForTimeout(400)
    expect((await state(page))['eating']).toBe('false')
    expect((await state(page))['hearts']).toBe('3')
  })
})

test.describe('on a phone', () => {
  for (const [name, viewport] of [['upright', { width: 390, height: 844 }], ['sideways', { width: 844, height: 390 }]] as const) {
    test(`${name}: the screen fits, and a thumb on the pad eats`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true })
      const page = await ctx.newPage()
      await open(page, 9)
      const canvas = (await page.locator(`${root} canvas`).boundingBox())!
      expect(canvas.x).toBeGreaterThanOrEqual(0)
      expect(canvas.y + canvas.height).toBeLessThanOrEqual(viewport.height + 1)
      expect(canvas.x + canvas.width).toBeLessThanOrEqual(viewport.width + 1)
      const pad = (await page.locator('[data-sneak-pad]').boundingBox())!
      expect(Math.min(pad.width, pad.height)).toBeGreaterThanOrEqual(name === 'upright' ? 44 : 20)
      await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2)
      await page.mouse.down()
      await expect.poll(async () => (await state(page))['eating'], { timeout: 2000 }).toBe('true')
      await page.mouse.up()
      await expect.poll(async () => (await state(page))['eating']).toBe('false')
      await ctx.close()
    })
  }
})
