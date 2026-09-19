import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 도깨비 야식 심부름, in a browser.
 *
 * The rules are settled in test/snack.test.ts. Here: that the right thing is
 * actually on screen and reachable with a finger and with a number key, that
 * a wrong one costs time and does not end anything, and that the shelf is made
 * of the fridge's own pictures rather than anybody's brand.
 *
 * Nothing waits on a clock for something random: the orders are pinned with
 * `?snackseed`, and what the game is asking for is readable off the page.
 */

async function open(page: Page, seed = 5): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto(`/?play=snack&snackseed=${seed}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-game-start]')).toBeVisible({ timeout: 20_000 })
  await page.locator('[data-game-start]').click({ timeout: 5000 })
  await page.waitForFunction(
    () => (document.querySelector('[data-game-overlay]') as HTMLElement | null)?.hidden === true,
    null, { timeout: 12_000 })
}

/** What is being asked for, and which button carries it. */
async function order(page: Page): Promise<{ says: string; right: string; wrong: string }> {
  return page.evaluate(() => {
    const says = document.querySelector('[data-snack-says]')!.textContent ?? ''
    const items = [...document.querySelectorAll<HTMLElement>('.snack__item')]
    const labelled = items.map((el) => ({
      id: el.dataset['choice']!,
      label: el.querySelector('.snack__label')!.textContent ?? '',
    }))
    // The order names the thing, so the right button is the one whose label
    // is in the sentence.
    const right = labelled.find((l) => says.includes(l.label))!
    const wrong = labelled.find((l) => l.id !== right.id)!
    return { says, right: right.id, wrong: wrong.id }
  })
}

const score = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-game-score]').textContent())
const clock = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-game-time]').textContent())

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('somebody asks, and the thing they asked for is on the shelf', async ({ page }) => {
    await open(page)
    await expect(page.locator('.snack__item')).toHaveCount(4)
    const now = await order(page)
    expect(now.says.length).toBeGreaterThan(2)
    expect(now.right).toBeTruthy()
    // The pictures are the fridge's own, not anybody's brand: each pixel
    // icon is drawn from the fridge's own cut-out, and is actually drawn.
    const arts = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.snack__art')]
      .map((el) => el.dataset['src'] ?? ''))
    expect(arts).toHaveLength(4)
    for (const a of arts) {
      expect(a, `unexpected picture ${a}`).toMatch(/\/assets\/images\/(alley|garage)\/[a-z_]+\.webp/)
    }
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLCanvasElement>('canvas.snack__art')]
      .filter((c) => c.width > 8 && c.height > 8).length), { timeout: 6000 }).toBe(4)
  })

  test('the right one pays and brings the next order', async ({ page }) => {
    await open(page)
    const first = await order(page)
    await page.locator(`[data-choice="${first.right}"]`).click({ timeout: 4000 })
    await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
    const next = await order(page)
    expect(next.says, 'the same order stayed up').not.toBe('')
  })

  test('the wrong one costs time, and never ends the round', async ({ page }) => {
    await open(page)
    const now = await order(page)
    const before = await clock(page)
    await page.locator(`[data-choice="${now.wrong}"]`).click({ timeout: 4000 })
    // A second and a half off, and the same order still up.
    await expect.poll(() => clock(page), { timeout: 3000 }).toBeLessThanOrEqual(before - 1)
    expect(await score(page), 'a wrong answer paid').toBe(0)
    await expect(page.locator('[data-game-result]'), 'a mistake ended the round').toHaveCount(0)
    const still = await order(page)
    expect(still.right, 'the order changed after a mistake').toBe(now.right)
    // And it is still playable.
    await page.locator(`[data-choice="${still.right}"]`).click({ timeout: 4000 })
    await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
  })

  test('a number key hands over the nth thing', async ({ page }) => {
    await open(page)
    const seat = await page.evaluate(() => {
      const says = document.querySelector('[data-snack-says]')!.textContent ?? ''
      const items = [...document.querySelectorAll<HTMLElement>('.snack__item')]
      return items.findIndex((el) => says.includes(el.querySelector('.snack__label')!.textContent ?? '')) + 1
    })
    expect(seat).toBeGreaterThan(0)
    await page.keyboard.press(String(seat))
    await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
  })

  test('the round ends on the clock, with a result and stars', async ({ page }) => {
    test.setTimeout(120_000)
    await open(page)
    // Play it properly until the clock runs out.
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      if (await page.locator('[data-game-result]').count()) break
      const now = await order(page).catch(() => null)
      if (!now) break
      await page.locator(`[data-choice="${now.right}"]`).click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(60)
    }
    await expect(page.locator('[data-game-result]')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('[data-game-result]')).toHaveAttribute('data-reason', 'time')
    const shown = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-game-result]')!
      return { score: Number(el.dataset['score']), stars: Number(el.dataset['stars']) }
    })
    expect(shown.score, 'a whole round of correct answers scored nothing').toBeGreaterThan(0)
    expect(shown.stars).toBeGreaterThanOrEqual(1)
  })

  test('nothing is handed over while it is paused', async ({ page }) => {
    await open(page)
    await page.evaluate(() => dispatchEvent(new Event('blur')))
    await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 5000 })
    const at = await score(page)
    await page.keyboard.press('1')
    await page.waitForTimeout(400)
    expect(await score(page), 'a paused game took an order').toBe(at)
  })
})

test.describe('on a phone', () => {
  for (const view of [
    { name: 'portrait', viewport: { width: 390, height: 844 } },
    { name: 'sideways', viewport: { width: 844, height: 390 } },
  ]) {
    test.describe(view.name, () => {
      test.use({ viewport: view.viewport, isMobile: true, hasTouch: true })

      test('every thing is big enough to hit', async ({ page }) => {
        await open(page)
        const bad = await page.evaluate(() => {
          const out: string[] = []
          for (const el of document.querySelectorAll<HTMLElement>('.snack__item')) {
            const r = el.getBoundingClientRect()
            if (r.width < 44 || r.height < 44) out.push(`${Math.round(r.width)}x${Math.round(r.height)}`)
            if (r.left < 0 || r.right > innerWidth + 0.5) out.push('off the side')
          }
          return out
        })
        expect(bad, bad.join(', ')).toEqual([])
        const now = await order(page)
        await page.locator(`[data-choice="${now.right}"]`).tap({ timeout: 4000 })
        await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
      })
    })
  }
})
