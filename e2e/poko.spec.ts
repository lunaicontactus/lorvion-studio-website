import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 무궁화꽃이 피었습니다, in a real browser.
 *
 * The rules are settled to the millisecond in test/poko.test.ts. What is here
 * is everything that only exists once there is a page: that the room is still
 * the room behind it, that a held key is a held key and a let-go key is a
 * let-go key, that losing the window cannot come back as a caught player, and
 * that leaving puts the garage back.
 *
 * Nothing waits for the boss to happen to turn round. The patrol is pinned
 * with `?pokoseed`, and every wait is for a state the game has written onto
 * the page — `data-state` on the boss, `data-slacking` on the player. Waiting
 * on a clock for a random event is how a suite gets a flake.
 */

const BOSS = '[data-poko-boss]'
const PLAYER = '[data-poko-player]'

async function open(page: Page, seed = 7): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto(`/?play=mugunghwa&pokoseed=${seed}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-game-start]')).toBeVisible({ timeout: 20_000 })
}

async function begin(page: Page): Promise<void> {
  await page.locator('[data-game-start]').click({ timeout: 5000 })
  await page.waitForFunction(
    () => (document.querySelector('[data-game-overlay]') as HTMLElement | null)?.hidden === true,
    null, { timeout: 12_000 })
}

/** Wait for the boss to be in a state. The patrol is pinned, so this arrives. */
async function boss(page: Page, want: string, timeout = 30_000): Promise<void> {
  await page.waitForFunction(
    (state) => document.querySelector<HTMLElement>('[data-poko-boss]')?.dataset['state'] === state,
    want, { timeout })
}

const score = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-game-score]').textContent())

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the garage is the board, and the boss is wearing glasses', async ({ page }) => {
    await open(page)
    await begin(page)
    // The room, not a game map: the painted plate and the rest of the crew
    // are behind the game, and they are not frozen.
    await expect(page.locator('[data-garage]')).toBeVisible()
    // The crew are still on the plate behind the game, drawing real frames.
    // Counted rather than asked whether they are "visible": the camera shows
    // a slice of a room wider than the window, so somebody perfectly alive
    // can be off the side of it.
    const behind = await page.evaluate(() => [...document.querySelectorAll('.npc:not(.is-away)')]
      .filter((e) => (e.querySelector('img') as HTMLImageElement | null)?.naturalWidth).length)
    expect(behind, 'the room behind the game was empty').toBeGreaterThanOrEqual(2)
    // The glasses are on, and on the face rather than beside it.
    const fit = await page.evaluate(() => {
      const g = document.querySelector<HTMLElement>('[data-poko-glasses]')!.getBoundingClientRect()
      const b = document.querySelector<HTMLElement>('[data-poko-boss]')!.getBoundingClientRect()
      return {
        inside: g.left >= b.left - 1 && g.right <= b.right + 1
          && g.top >= b.top - 1 && g.bottom <= b.bottom + 1,
        // On the head, which is the top half of the frame.
        onTheHead: (g.top + g.bottom) / 2 < b.top + b.height * 0.6,
        wide: g.width / b.width,
      }
    })
    expect(fit.inside, 'the glasses are off the face').toBe(true)
    expect(fit.onTheHead, 'the glasses are round its middle').toBe(true)
    expect(fit.wide).toBeGreaterThan(0.1)
  })

  test('holding pays, letting go does not, and neither costs a wrong verdict', async ({ page }) => {
    await open(page)
    await begin(page)
    await boss(page, 'PATROLLING')
    // Working earns nothing.
    await page.waitForTimeout(700)
    expect(await score(page), 'working earned something').toBe(0)
    // Holding earns.
    await page.keyboard.down(' ')
    await expect(page.locator(PLAYER)).toHaveAttribute('data-slacking', 'SLACK')
    await page.waitForTimeout(900)
    const earned = await score(page)
    expect(earned, 'slacking earned nothing').toBeGreaterThan(0)
    // Letting go is instant, and stops the earning.
    await page.keyboard.up(' ')
    await expect(page.locator(PLAYER)).toHaveAttribute('data-slacking', 'WORK')
    const at = await score(page)
    await page.waitForTimeout(800)
    expect(await score(page), 'a working player went on earning').toBe(at)
  })

  test('let go when it warns, and being looked at is safe', async ({ page }) => {
    await open(page)
    await begin(page)
    await boss(page, 'PATROLLING')
    await page.keyboard.down(' ')
    // The warning comes before the look, always. That is the promise.
    await boss(page, 'WARNING')
    await page.keyboard.up(' ')
    await boss(page, 'WATCHING')
    await expect(page.locator(PLAYER)).toHaveAttribute('data-slacking', 'WORK')
    await expect(page.locator('[data-game-result]'),
      'caught after letting go when it warned').toHaveCount(0)
    // And the round carries on.
    await boss(page, 'RECOVER')
    await expect(page.locator('[data-game-result]')).toHaveCount(0)
  })

  test('hold through the warning and it is the end of the round', async ({ page }) => {
    await open(page)
    await begin(page)
    await boss(page, 'PATROLLING')
    await page.keyboard.down(' ')
    await boss(page, 'WARNING')
    // Do not let go. This is the whole game, done wrong on purpose.
    await expect(page.locator('[data-game-result]')).toBeVisible({ timeout: 20_000 })
    await page.keyboard.up(' ')
    await expect(page.locator('[data-game-result]')).toHaveAttribute('data-reason', 'caught')
    // A result, with a score and stars on it.
    const shown = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-game-result]')!
      return { stars: Number(el.dataset['stars']), best: Number(el.dataset['best']) }
    })
    expect(shown.stars).toBeGreaterThanOrEqual(0)
    expect(shown.best).toBeGreaterThanOrEqual(0)
  })

  test('losing the window lets go of the button, and does not come back caught',
    async ({ page }) => {
      await open(page)
      await begin(page)
      await boss(page, 'PATROLLING')
      await page.keyboard.down(' ')
      await expect(page.locator(PLAYER)).toHaveAttribute('data-slacking', 'SLACK')
      // The window goes while the key is down. No keyup will ever arrive for
      // it, so if the hold survived this the player would be caught the
      // moment they came back, through no fault of their own.
      await page.evaluate(() => dispatchEvent(new Event('blur')))
      await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 5000 })
      await expect(page.locator(PLAYER),
        'still slacking after the window went').toHaveAttribute('data-slacking', 'WORK')
      // Nothing moves while it is paused.
      const state = await page.getAttribute(BOSS, 'data-state')
      const at = await score(page)
      await page.waitForTimeout(1600)
      expect(await page.getAttribute(BOSS, 'data-state'), 'the boss carried on').toBe(state)
      expect(await score(page)).toBe(at)
      await page.keyboard.up(' ')
      await page.locator('[data-game-resume]').click({ timeout: 5000 })
      await expect(page.locator('[data-game-result]')).toHaveCount(0)
    })

  test('retry is a fresh round, and leaving puts the garage back', async ({ page }) => {
    test.setTimeout(120_000)
    await open(page)
    await begin(page)
    await boss(page, 'PATROLLING')
    await page.keyboard.down(' ')
    await expect(page.locator('[data-game-result]')).toBeVisible({ timeout: 25_000 })
    await page.keyboard.up(' ')
    await page.locator('[data-game-retry]').click({ timeout: 5000 })
    await page.waitForFunction(
      () => (document.querySelector('[data-game-overlay]') as HTMLElement | null)?.hidden === true,
      null, { timeout: 12_000 })
    expect(await score(page), 'the score carried over into a new round').toBe(0)
    await expect(page.locator('[data-poko-boss]')).toHaveCount(1)

    await page.locator('[data-game-quit]').click({ timeout: 5000 })
    await expect(page.locator('[data-game-shell]')).toHaveCount(0, { timeout: 5000 })
    await expect(page.locator('[data-garage]')).toBeVisible()
    // The room is its own again: POKO walked back on, and somebody moves.
    await expect(page.locator('[data-npc="poko"]')).toBeAttached()
    const moved = await page.evaluate(async () => {
      const where = (): string => [...document.querySelectorAll<HTMLElement>('.npc:not(.is-away)')]
        .map((e) => e.style.transform).join('|')
      const before = where()
      const t0 = performance.now()
      while (performance.now() - t0 < 15_000) {
        if (where() !== before) return true
        await new Promise((r) => setTimeout(r, 200))
      }
      return false
    })
    expect(moved, 'the crew were left frozen after the game').toBe(true)
  })

  test('a pinned patrol is the same patrol twice', async ({ page }) => {
    const walk = async (): Promise<string> => {
      await open(page, 11)
      await begin(page)
      const seen: string[] = []
      const t0 = Date.now()
      while (Date.now() - t0 < 9000) {
        const s = await page.getAttribute(BOSS, 'data-state')
        if (s && seen[seen.length - 1] !== s) seen.push(s)
        await page.waitForTimeout(50)
      }
      await page.locator('[data-game-quit]').click({ timeout: 5000 }).catch(() => {})
      return seen.join('>')
    }
    test.setTimeout(90_000)
    const first = await walk()
    const second = await walk()
    expect(first.length, 'the boss never did anything').toBeGreaterThan(4)
    expect(second).toBe(first)
  })
})

test.describe('on a phone', () => {
  for (const view of [
    { name: 'portrait', viewport: { width: 390, height: 844 } },
    { name: 'sideways', viewport: { width: 844, height: 390 } },
  ]) {
    test.describe(view.name, () => {
      test.use({ viewport: view.viewport, isMobile: true, hasTouch: true })

      test('one button, big enough, and never over the player', async ({ page }) => {
        await open(page)
        await begin(page)
        const layout = await page.evaluate(() => {
          const hold = document.querySelector<HTMLElement>('[data-poko-hold]')
          if (!hold) return null
          const h = hold.getBoundingClientRect()
          const p = document.querySelector<HTMLElement>('[data-poko-player]')!.getBoundingClientRect()
          const overlap = !(h.right < p.left || h.left > p.right || h.bottom < p.top || h.top > p.bottom)
          return {
            w: h.width, hgt: h.height, overlap,
            onScreen: h.left >= 0 && h.top >= 0 && h.right <= innerWidth + 0.5 && h.bottom <= innerHeight + 0.5,
          }
        })
        expect(layout, 'no hold button on a touch screen').not.toBeNull()
        expect(layout!.w, 'the button is too small for a thumb').toBeGreaterThanOrEqual(44)
        expect(layout!.hgt).toBeGreaterThanOrEqual(44)
        expect(layout!.onScreen, 'the button is off the screen').toBe(true)
        expect(layout!.overlap, 'the button covers the player').toBe(false)
      })

      test('holding the button is slacking, and letting go is working', async ({ page }) => {
        await open(page)
        await begin(page)
        await boss(page, 'PATROLLING')
        const pad = (await page.locator('[data-poko-hold]').boundingBox())!
        await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2)
        await page.mouse.down()
        await expect(page.locator(PLAYER)).toHaveAttribute('data-slacking', 'SLACK')
        await page.waitForTimeout(700)
        expect(await score(page)).toBeGreaterThan(0)
        await page.mouse.up()
        await expect(page.locator(PLAYER)).toHaveAttribute('data-slacking', 'WORK')
      })

      test('a cancelled touch lets go, the way a lifted finger does', async ({ page }) => {
        // A call comes in, or the browser takes the gesture. No touchend
        // arrives — so without this the finger is still down for ever.
        await open(page)
        await begin(page)
        await boss(page, 'PATROLLING')
        const pad = (await page.locator('[data-poko-hold]').boundingBox())!
        await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2)
        await page.mouse.down()
        await expect(page.locator(PLAYER)).toHaveAttribute('data-slacking', 'SLACK')
        await page.evaluate(() => {
          document.querySelector('[data-game-box]')!
            .dispatchEvent(new Event('touchcancel', { bubbles: true }))
        })
        await expect(page.locator(PLAYER),
          'a cancelled touch left the player slacking').toHaveAttribute('data-slacking', 'WORK')
        await page.mouse.up()
      })
    })
  }
})
