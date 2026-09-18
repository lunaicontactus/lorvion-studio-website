import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * PHASE 7 — the entrance as a way into somewhere.
 *
 * e2e/entrance.spec.ts and e2e/first-paint.spec.ts already hold the door to
 * its basics: one screen, one shutter, two to three seconds, reduced motion
 * straight in. What is checked here is what was added on top: that somebody
 * who has been before gets the short door, that the sequence can be skipped
 * by hand or key, that the sound rides the picture and comes up rather than
 * cutting in, that the loading line appears only while the room is honestly
 * on its way, and that MOMO is the one who notices you.
 */

declare global {
  interface Window {
    __plays?: { src: string; at: number; volume: number }[]
    __media?: HTMLMediaElement[]
  }
}

async function spyOnPlay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__plays = []
    window.__media = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__plays!.push({ src: this.currentSrc || this.src, at: performance.now(), volume: this.volume })
      if (!window.__media!.includes(this)) window.__media!.push(this)
      return play.call(this)
    }
  })
}

/** A tab that remembers nothing: the first visit. */
async function fresh(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
}

/** Somebody who has been here before, with sound as they left it. */
async function returning(page: Page, soundEnabled = false): Promise<void> {
  await page.addInitScript((on) => {
    try {
      sessionStorage.clear()
      localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, soundEnabled: on }))
    } catch {
      /* private mode */
    }
  }, soundEnabled)
}

const garageShown = (page: Page, timeout = 8000): Promise<unknown> =>
  page.waitForFunction(() => !(document.querySelector('[data-garage]') as HTMLElement).hidden, undefined, { timeout })

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a returning visitor gets the short door, and it is still a door', async ({ page }) => {
    await returning(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    await expect(page.locator('[data-garage]')).toBeHidden()
    const started = Date.now()
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-alley]')).toHaveClass(/alley--quick/)
    await garageShown(page)
    const took = Date.now() - started
    expect(took, 'the short door was not short').toBeLessThan(1500)
    expect(took, 'the short door was a cut').toBeGreaterThan(600)
  })

  test('the sequence can be skipped with a key, and with a click', async ({ page }) => {
    await fresh(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    const started = Date.now()
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-alley-skip]')).toBeVisible()
    await page.waitForTimeout(350)
    await page.keyboard.press('Escape')
    await garageShown(page, 1500)
    expect(Date.now() - started).toBeLessThan(1200)
    // The picture the room took over from is the finished one.
    await expect(page.locator('[data-alley]')).toHaveClass(/alley--rise/)
    await expect(page.locator('[data-alley]')).toHaveClass(/alley--push/)
    await expect(page.locator('[data-alley]')).toHaveAttribute('data-phase', 'inside')
  })

  test('a click on the lane while the door opens is a skip too', async ({ page }) => {
    await fresh(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    const started = Date.now()
    await page.locator('[data-alley-enter]').click()
    await page.waitForTimeout(300)
    await page.mouse.click(200, 200)
    await garageShown(page, 1500)
    expect(Date.now() - started).toBeLessThan(1100)
  })

  test('the keyboard opens the door', async ({ page }) => {
    await fresh(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    await page.locator('[data-alley-enter]').focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-alley]')).toHaveAttribute('data-phase', 'entering')
    await garageShown(page)
  })

  test('the sound rides the picture: shutter, then the room\'s air, then its song, nothing cut in', async ({ page }) => {
    await spyOnPlay(page)
    await returning(page, true)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    // Nothing before the gesture, even with sound left on.
    expect(await page.evaluate(() => window.__plays!.length)).toBe(0)
    await page.locator('[data-alley-enter]').click()
    await garageShown(page)
    await page.waitForTimeout(400)
    const early = await page.evaluate(() => {
      const plays = window.__plays!
      const name = (s: string): string => s.split('/').pop() ?? s
      const first = (re: RegExp) => plays.find((p) => re.test(p.src))
      const el = (re: RegExp) => window.__media!.find((m) => re.test(m.currentSrc || m.src))
      return {
        order: plays.map((p) => name(p.src)),
        shutterAt: first(/shutter_open/)?.at ?? null,
        toneAt: first(/ambient\.m4a/)?.at ?? null,
        musicAt: first(/music\/garage/)?.at ?? null,
        toneStartVolume: first(/ambient\.m4a/)?.volume ?? null,
        musicStartVolume: first(/music\/garage/)?.volume ?? null,
        toneNow: el(/ambient\.m4a/)?.volume ?? null,
        musicNow: el(/music\/garage/)?.volume ?? null,
      }
    })
    expect(early.shutterAt, 'no shutter').not.toBeNull()
    expect(early.toneAt, 'no room tone').not.toBeNull()
    expect(early.musicAt, 'no music').not.toBeNull()
    expect(early.shutterAt!).toBeLessThan(early.toneAt!)
    expect(early.shutterAt!).toBeLessThan(early.musicAt!)
    // Neither the air nor the song starts at full volume: they come up.
    expect(early.toneStartVolume!).toBeLessThan(0.05)
    expect(early.musicStartVolume!).toBeLessThan(0.05)
    // Just after the room appears the air is up and the song still on its way.
    expect(early.toneNow!).toBeGreaterThan(0.05)
    expect(early.musicNow!).toBeLessThan(0.34)
    await page.waitForTimeout(2600)
    const settled = await page.evaluate(() => {
      const el = (re: RegExp) => window.__media!.find((m) => re.test(m.currentSrc || m.src))
      return { tone: el(/ambient\.m4a/)?.volume, music: el(/music\/garage/)?.volume }
    })
    expect(settled.tone).toBeCloseTo(0.16, 2)
    expect(settled.music).toBeCloseTo(0.34, 2)
  })

  test('the loading line appears only while the room is honestly on its way', async ({ page }) => {
    await fresh(page)
    // The room's plate held back for four seconds. Nothing else is.
    await page.route('**/room_landscape.webp', async (route) => {
      await new Promise((r) => setTimeout(r, 4000))
      await route.continue()
    })
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    const started = Date.now()
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-alley-loading]')).toBeVisible({ timeout: 3500 })
    await expect(page.locator('[data-alley-loading]')).toContainText('MOMO')
    await expect(page.locator('[data-garage]')).toBeHidden()
    await garageShown(page, 9000)
    expect(Date.now() - started).toBeGreaterThan(3200)
    await expect(page.locator('[data-alley-loading]')).not.toBeVisible()
  })

  test('with the room already here, the loading line never shows', async ({ page }) => {
    await fresh(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    // Long enough for the warm-up to have fetched the plate.
    await page.waitForTimeout(2500)
    let shown = false
    const watch = page.waitForFunction(() => !(document.querySelector('[data-alley-loading]') as HTMLElement).hidden, undefined, { timeout: 4000 })
      .then(() => { shown = true }, () => undefined)
    await page.locator('[data-alley-enter]').click()
    await garageShown(page)
    await watch
    expect(shown, 'said the room was loading when it was not').toBe(false)
  })

  test('MOMO notices the visitor', async ({ page }) => {
    await fresh(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    await page.addInitScript(() => undefined)
    await page.locator('[data-alley-enter]').click()
    await garageShown(page)
    await expect(page.locator('[data-npc="momo"]')).toHaveAttribute('data-state', 'REACT', { timeout: 3000 })
  })
})

test.describe('phone, upright', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('a tap opens the door, and a second tap skips', async ({ page }) => {
    await fresh(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    const started = Date.now()
    await page.locator('[data-alley-enter]').tap()
    await page.waitForTimeout(400)
    await page.touchscreen.tap(60, 120)
    await garageShown(page, 1500)
    expect(Date.now() - started).toBeLessThan(1300)
  })

  test('the returning door on a phone', async ({ page }) => {
    await returning(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    const started = Date.now()
    await page.locator('[data-alley-enter]').tap()
    await garageShown(page)
    expect(Date.now() - started).toBeLessThan(1500)
  })
})

test.describe('phone, sideways', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })

  test('the full door plays, and the skip is on screen', async ({ page }) => {
    await fresh(page)
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    const started = Date.now()
    await page.locator('[data-alley-enter]').tap()
    const skip = page.locator('[data-alley-skip]')
    await expect(skip).toBeVisible()
    const box = (await skip.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(844)
    expect(box.y + box.height).toBeLessThanOrEqual(390)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await garageShown(page)
    const took = Date.now() - started
    expect(took).toBeGreaterThan(1200)
    expect(took).toBeLessThan(3200)
  })
})
