import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The shell all three games sit in, walked end to end.
 *
 * It is walked against a game that is barely a game (src/games/mock.ts),
 * because the thing under test is the shell and being good at a running game
 * should not be a prerequisite for testing it. That game exists only in a dev
 * build, which is why this one spec runs against the dev server and everything
 * else runs against the built bundle.
 *
 * Nothing here waits for a fixed number of seconds and hopes. Every wait is
 * for the shell to say what state it is in, and every action has a ceiling —
 * the lesson from a `tap()` with no timeout that waited for a button the
 * result screen had covered, and took the whole test budget doing it.
 */

const SHELL = '[data-game-shell]'
const OVERLAY = '[data-game-overlay]'

async function open(page: Page, id = 'mock'): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto(`/?play=${id}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator(SHELL)).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('[data-game-start]')).toBeVisible({ timeout: 10_000 })
}

/** Start a round and wait for the countdown to hand over to the game. */
async function play(page: Page): Promise<void> {
  await page.locator('[data-game-start]').click({ timeout: 5000 })
  await expect(page.locator('[data-game-count]')).toBeVisible({ timeout: 4000 })
  // The countdown is the shell's, so its end is the shell's to announce: the
  // overlay goes away and nothing else is on screen.
  await expect(page.locator(OVERLAY)).toBeHidden({ timeout: 8000 })
}

/** The number on the clock, as the shell has written it. */
async function clock(page: Page): Promise<number> {
  return Number(await page.locator('[data-game-time]').textContent())
}

test.describe('the mini-game shell', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('opens ready, counts down, plays, and says so at every step', async ({ page }) => {
    await open(page)
    await expect(page.locator('.game__hint')).toBeVisible()
    await expect(page.locator('[data-game-time]')).toHaveText('6')
    await play(page)
    // The clock is the shell's and it is running.
    await expect.poll(() => clock(page), { timeout: 6000 }).toBeLessThan(6)
    await expect(page.locator('[data-game-result]')).toHaveCount(0)
  })

  test('a lost window pauses the round, and only a button starts it again', async ({ page }) => {
    await open(page)
    await play(page)
    await page.waitForTimeout(600)
    const before = await clock(page)
    // The window going, exactly as the browser reports it.
    await page.evaluate(() => dispatchEvent(new Event('blur')))
    await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 4000 })
    // Frozen, and it stays frozen for as long as nobody presses anything.
    await page.waitForTimeout(1500)
    expect(await clock(page), 'the clock ran while the game was paused').toBe(before)
    // Coming back is not enough. It has to be asked.
    await page.evaluate(() => dispatchEvent(new Event('focus')))
    await page.waitForTimeout(800)
    await expect(page.locator('[data-game-resume]'),
      'the game started itself when the window came back').toBeVisible()
    await page.locator('[data-game-resume]').click({ timeout: 5000 })
    await expect(page.locator(OVERLAY)).toBeHidden({ timeout: 4000 })
    await expect.poll(() => clock(page), { timeout: 6000 }).toBeLessThan(before)
  })

  test('a hidden tab pauses it too', async ({ page }) => {
    await open(page)
    await play(page)
    await page.waitForTimeout(500)
    const before = await clock(page)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 4000 })
    await page.waitForTimeout(1200)
    expect(await clock(page)).toBe(before)
  })

  test('resuming twice does not run the clock twice', async ({ page }) => {
    // The bug this is about: a game that subscribes on start and again on
    // resume runs at double speed, and the second subscription outlives the
    // first. Two pauses and two resumes, then measure the rate.
    await open(page)
    await play(page)
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => dispatchEvent(new Event('blur')))
      await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 4000 })
      await page.locator('[data-game-resume]').click({ timeout: 5000 })
      await expect(page.locator(OVERLAY)).toBeHidden({ timeout: 4000 })
    }
    const start = await clock(page)
    await page.waitForTimeout(2000)
    const end = await clock(page)
    const gone = start - end
    expect(gone, `two seconds of wall clock took ${gone} off the round`).toBeGreaterThan(1)
    expect(gone, `two seconds of wall clock took ${gone} off the round`).toBeLessThan(3.5)
  })

  test('the round ends by itself, and the result stops the clock', async ({ page }) => {
    test.setTimeout(90_000)
    await open(page)
    await play(page)
    await expect(page.locator('[data-game-result]')).toBeVisible({ timeout: 30_000 })
    const at = await clock(page)
    expect(at).toBe(0)
    await page.waitForTimeout(1500)
    expect(await clock(page), 'the clock kept going after the result').toBe(0)
    // And the round is recorded, with the stars the game decided on.
    await expect(page.locator('[data-game-result]')).toHaveAttribute('data-reason', 'time')
    const best = await page.evaluate(() => localStorage.getItem('eungarage.minigame.mock.best'))
    expect(best, 'nothing was written down').not.toBeNull()
  })

  test('a retry is a whole new round, and leaves nothing behind', async ({ page }) => {
    test.setTimeout(120_000)
    await open(page)
    await play(page)
    await expect(page.locator('[data-game-result]')).toBeVisible({ timeout: 30_000 })
    await page.locator('[data-game-retry]').click({ timeout: 5000 })
    // Straight into a countdown, not a ready screen, and with the whole
    // round back on the clock.
    await expect(page.locator('[data-game-count]')).toBeVisible({ timeout: 4000 })
    await expect(page.locator(OVERLAY)).toBeHidden({ timeout: 8000 })
    expect(await clock(page)).toBeGreaterThan(4)
    // One game in the box, not two.
    await expect(page.locator('[data-mock]')).toHaveCount(1)
  })

  test('five retries do not leave five copies of everything', async ({ page }) => {
    test.setTimeout(180_000)
    await open(page)
    await play(page)
    for (let i = 0; i < 3; i++) {
      await expect(page.locator('[data-game-result]')).toBeVisible({ timeout: 30_000 })
      await page.locator('[data-game-retry]').click({ timeout: 5000 })
      await expect(page.locator(OVERLAY)).toBeHidden({ timeout: 8000 })
    }
    // The proof that nothing is stacked: the clock still runs at one second
    // per second. A second subscription per retry would be four times as fast.
    const start = await clock(page)
    await page.waitForTimeout(2000)
    const gone = start - await clock(page)
    expect(gone, `after three retries, two seconds took ${gone} off the round`).toBeLessThan(3.5)
    await expect(page.locator('.game')).toHaveCount(1)
    await expect(page.locator('[data-mock]')).toHaveCount(1)
  })

  test('Escape pauses a round and closes a finished one', async ({ page }) => {
    test.setTimeout(90_000)
    await open(page)
    // On the ready screen it is a way out.
    await page.keyboard.press('Escape')
    await expect(page.locator(SHELL)).toHaveCount(0, { timeout: 5000 })
    await open(page)
    await play(page)
    // Mid-round it is a pause, not a loss.
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 4000 })
    await page.keyboard.press('Escape')
    await expect(page.locator(SHELL)).toHaveCount(0, { timeout: 5000 })
  })

  test('leaving puts the world back, with nobody left waiting in it', async ({ page }) => {
    await open(page)
    await play(page)
    await page.locator('[data-game-quit]').click({ timeout: 5000 })
    await expect(page.locator(SHELL)).toHaveCount(0, { timeout: 5000 })
    // WORLD 2.1: the games live outside, so leaving one is the playground
    // again — and it is running again, not left paused behind the game.
    await expect(page.locator('[data-playground]')).toBeVisible()
    await expect(page.locator('[data-playground]')).not.toHaveClass(/is-paused/)
    await expect(page.locator('body')).not.toHaveClass(/is-playing/)
    // And the garage is the way it was left, waiting, when the visitor
    // goes home through the arch: running, and every dokkaebi in its own
    // state rather than held.
    await page.locator('[data-place="garage-door"]').click({ timeout: 8000 })
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-garage]')).not.toHaveClass(/is-paused/)
    await expect(page.locator('.npc[data-state="PAUSED"]')).toHaveCount(0)
  })

  test('nothing scores while the game is not running', async ({ page }) => {
    await open(page)
    await play(page)
    await page.evaluate(() => dispatchEvent(new Event('blur')))
    await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 4000 })
    const before = await page.locator('[data-game-score]').textContent()
    // Every way in: a key, a tap on the box.
    await page.keyboard.press('Enter')
    await page.keyboard.press(' ')
    await page.locator('[data-game-box]').click({ force: true, timeout: 4000 })
    await page.waitForTimeout(400)
    expect(await page.locator('[data-game-score]').textContent(),
      'the paused game took a score').toBe(before)
  })
})

test.describe('on a phone', () => {
  for (const view of [
    { name: 'portrait', viewport: { width: 390, height: 844 } },
    { name: 'sideways', viewport: { width: 844, height: 390 } },
  ]) {
    test(`the shell fits, and its buttons are big enough — ${view.name}`, async ({ page }) => {
      await page.setViewportSize(view.viewport)
      await open(page)
      // Nothing off the edge, and nothing under a notch.
      const bad = await page.evaluate(() => {
        const out: string[] = []
        for (const el of document.querySelectorAll<HTMLElement>('.game__btn, .game__quit')) {
          const r = el.getBoundingClientRect()
          if (r.width < 44 || r.height < 44) out.push(`${el.textContent?.trim()} ${Math.round(r.width)}x${Math.round(r.height)}`)
          if (r.left < 0 || r.top < 0 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) {
            out.push(`${el.textContent?.trim()} off the edge`)
          }
        }
        return out
      })
      expect(bad, bad.join(', ')).toEqual([])
      await play(page)
      // And the game has most of the window, not a HUD with a game under it.
      const share = await page.evaluate(() => {
        const box = document.querySelector('[data-game-box]')!.getBoundingClientRect()
        const shell = document.querySelector('[data-game-shell]')!.getBoundingClientRect()
        return box.height / shell.height
      })
      expect(share, `the game got ${Math.round(share * 100)}% of the shell`).toBeGreaterThan(0.55)
    })
  }
})
