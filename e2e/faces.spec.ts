import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Somebody is always looking at you.
 *
 * The room's furniture is all against the back wall, so the honest pose at
 * every useful place is "turned away", and honest is how the first build of
 * this looked: three small creatures seen from behind and a visitor with no
 * reason to think anybody lived there. These are the floor under that — not a
 * rule that everybody faces the camera, which is the opposite failure, but a
 * guarantee that the picture is never entirely backs.
 *
 * Timed from when the room appears rather than from the click. The entrance is
 * a deliberate two-and-a-bit seconds of shutter, and a contract measured
 * through it would be a test of the shutter.
 */

/** Faces on screen, counted off the frame each one is actually showing. */
async function faces(page: Page): Promise<number> {
  return page.evaluate(() =>
    [...document.querySelectorAll('.npc')]
      .filter((e) => !e.classList.contains('is-away'))
      .filter((e) => {
        const src = (e.querySelector('img') as HTMLImageElement | null)?.src ?? ''
        const m = /\/dokkaebi\/\w+\/\w+\/(\w+)\//.exec(src)
        // No frame yet is not a face, and not a failure either — the sample
        // loop below starts once somebody is actually rendered.
        return m !== null && m[1] !== 'back'
      }).length)
}

/** On stage, whatever they are showing. */
async function onStage(page: Page): Promise<number> {
  return page.locator('.npc:not(.is-away)').count()
}

/**
 * Open the room and return the moment it became visible.
 *
 * Condition-based throughout: waiting a fixed number of seconds for a room
 * whose arrival depends on a plate download is how a suite gets a flake.
 */
async function open(page: Page): Promise<void> {
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
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('.npc:not(.is-away)').length > 0)
}

/**
 * Watch for `ms`, and report the fewest faces seen in any sample. Sampling
 * rather than checking once: the thing being asserted is that there is no
 * moment without a face, and one look cannot see a moment it missed.
 */
async function fewestFaces(page: Page, ms: number): Promise<number> {
  return page.evaluate(async (window_) => {
    const count = (): number =>
      [...document.querySelectorAll('.npc')]
        .filter((e) => !e.classList.contains('is-away'))
        .filter((e) => {
          const src = (e.querySelector('img') as HTMLImageElement | null)?.src ?? ''
          const m = /\/dokkaebi\/\w+\/\w+\/(\w+)\//.exec(src)
          return m !== null && m[1] !== 'back'
        }).length
    let fewest = Infinity
    const t0 = performance.now()
    while (performance.now() - t0 < window_) {
      fewest = Math.min(fewest, count())
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    }
    return fewest
  }, ms)
}

const VIEWS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
] as const

for (const view of VIEWS) {
  test.describe(view.name, () => {
    test.use(view)

    test('the room opens with a face already in it', async ({ page }) => {
      await open(page)
      // The room and the crew arrive on the same frame, so "within a second"
      // is generous by design — it is the promise being kept, not the margin.
      expect(await faces(page), 'no face on the frame the room appeared').toBeGreaterThanOrEqual(1)
      expect(await fewestFaces(page, 1000), 'a face went away inside the first second')
        .toBeGreaterThanOrEqual(1)
    })

    test('two of them are looking at the room within three seconds', async ({ page }) => {
      await open(page)
      // Two, unless there is only one on stage to ask — the phone runs a
      // smaller cast and the contract cannot want more than the room holds.
      const want = Math.min(2, await onStage(page))
      await expect.poll(() => faces(page), { timeout: 3000, intervals: [100] })
        .toBeGreaterThanOrEqual(want)
    })

    test('the picture is never all backs', async ({ page }) => {
      await open(page)
      // Long enough to cover a stage change, an errand and a shift at the
      // bench, which are the three ways everybody ended up turned away.
      expect(await fewestFaces(page, 30_000)).toBeGreaterThanOrEqual(1)
    })
  })
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const thing of ['pc', 'tv', 'fridge']) {
    test(`coming back from the ${thing} there is still somebody to look at`, async ({ page }) => {
      await open(page)
      await page.locator(`.thing--${thing}`).click()
      await expect(page.locator('[data-panel]')).toBeVisible()
      // Long enough that the crew have finished whatever they were doing and
      // settled wherever the panel left them.
      await page.waitForTimeout(4000)
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel]')).toBeHidden()
      expect(await faces(page), 'the room came back showing only backs')
        .toBeGreaterThanOrEqual(1)
      expect(await fewestFaces(page, 1500)).toBeGreaterThanOrEqual(1)
    })
  }
})
