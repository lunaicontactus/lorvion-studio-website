import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The room's small movements, seen from outside.
 *
 * The scheduling rules are settled in test/ambient.test.ts, where a clock can
 * be turned by hand and a minute of room time costs a millisecond. What is
 * checked here is the wiring: that the things the manager switches are
 * actually in the room, that a panel over the room stops them, and that a
 * visitor who asked for less motion gets a still room rather than a slower
 * one.
 *
 * Nothing here waits for a particular event to happen. Waiting for something
 * that fires every forty seconds is how a suite gets a flake; these watch a
 * window and assert about what did and did not appear in it.
 */

/** Anything the visitor would look at: the lights, and the parcel knocking. */
const STRONG = '.garage__light.is-lit, .thing--parcel.is-knocked'
/** Everything else: flickers, stars, steam, a note lifting. */
const ANY = `${STRONG}, .garage__bit.is-live, .garage__star.is-bright, .garage__shooting.is-falling`

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
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
}

/**
 * Watch for `ms` and report the most that was moving at once, and whether
 * anything moved at all. Sampled inside the page on animation frames, so a
 * movement shorter than a poll cannot slip between two looks.
 */
async function watch(page: Page, selector: string, ms: number): Promise<{ most: number; any: boolean }> {
  return page.evaluate(async ([sel, span]) => {
    let most = 0
    let any = false
    const t0 = performance.now()
    while (performance.now() - t0 < (span as number)) {
      const n = document.querySelectorAll(sel as string).length
      most = Math.max(most, n)
      any ||= n > 0
      await new Promise((r) => requestAnimationFrame(() => r(null)))
    }
    return { most, any }
  }, [selector, ms] as const)
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the room moves, and never more than two things at once', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    const seen = await watch(page, ANY, 40_000)
    expect(seen.any, 'nothing in the room moved in forty seconds').toBe(true)
    const strong = await watch(page, STRONG, 25_000)
    expect(strong.most, `${strong.most} things worth watching moved at once`).toBeLessThanOrEqual(2)
  })

  test('a panel over the room stops the room moving behind it', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    // The monitor's own glow fires every five to thirteen seconds, so twenty
    // seconds of nothing is not luck.
    await page.locator('[data-object="cabinet"]').click()
    await expect(page.locator('[data-panel-root]')).toBeVisible({ timeout: 8000 })
    const behind = await watch(page, ANY, 20_000)
    expect(behind.any, 'the room carried on moving behind an open panel').toBe(false)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    // And starts again afterwards.
    const after = await watch(page, ANY, 30_000)
    expect(after.any, 'the room never started again').toBe(true)
  })

  test('a hidden tab is a still room', async ({ page }) => {
    test.setTimeout(60_000)
    await enter(page)
    await page.waitForTimeout(8000)
    // The clock the whole room runs on stops with the tab; nothing schedules
    // itself, so nothing can pile up while nobody is looking.
    const stopped = await page.evaluate(async () => {
      const at = (): number => {
        const el = document.querySelector<HTMLElement>('[data-npc]')
        const m = /translate3d\((-?[\d.]+)px/.exec(el?.style.transform ?? '')
        return Number(m?.[1] ?? 0)
      }
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((r) => setTimeout(r, 1200))
      const a = at()
      await new Promise((r) => setTimeout(r, 2500))
      const b = at()
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      return { a, b }
    })
    expect(stopped.b, 'the room kept running while the tab was hidden').toBe(stopped.a)
  })
})

test.describe('less motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('a visitor who asked for less motion gets a still room, not a slow one', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    // Everything marked restless — the flicker, the steam, the note, the
    // magnet, the falling star, the parcel — is not registered at all, so
    // there is nothing to slow down and nothing to catch the eye.
    const seen = await watch(page, '.garage__bit.is-live, .garage__shooting.is-falling, .thing--parcel.is-knocked', 30_000)
    expect(seen.any, 'the room fidgeted at somebody who asked it not to').toBe(false)
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the phone room is alive without being busy', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    const seen = await watch(page, ANY, 45_000)
    expect(seen.any, 'nothing moved on a phone at all').toBe(true)
    expect(seen.most, `${seen.most} things at once on a phone`).toBeLessThanOrEqual(3)
  })
})
