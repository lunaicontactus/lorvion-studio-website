import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 택배 정리, in a browser.
 *
 * The rules are settled in test/parcel.test.ts. What is here is the part that
 * only exists once there is a page, and most of it is about input: this game
 * has three ways to answer, and a game that can only be dragged is a game
 * somebody cannot play. Drag, tap and a number key all have to reach the same
 * place.
 */

async function open(page: Page, seed = 3): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto(`/?play=parcel&parcelseed=${seed}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-game-start]')).toBeVisible({ timeout: 20_000 })
  await page.locator('[data-game-start]').click({ timeout: 5000 })
  await page.waitForFunction(
    () => (document.querySelector('[data-game-overlay]') as HTMLElement | null)?.hidden === true,
    null, { timeout: 12_000 })
}

/** What the parcel says, and which pile is right. */
async function parcel(page: Page): Promise<{ label: string; right: string; wrong: string }> {
  return page.evaluate(() => {
    const label = document.querySelector('[data-parcel-label]')!.textContent ?? ''
    const piles = [...document.querySelectorAll<HTMLElement>('.parcel__pile')]
    const right = piles.find((el) => el.querySelector('.parcel__pileName')!.textContent === label)!
    const wrong = piles.find((el) => el !== right)!
    return { label, right: right.dataset['choice']!, wrong: wrong.dataset['choice']! }
  })
}

const score = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-game-score]').textContent())
const clock = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-game-time]').textContent())

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the parcel says where it goes, and the piles say what they are', async ({ page }) => {
    await open(page)
    const now = await parcel(page)
    expect(now.label.length, 'an unlabelled parcel').toBeGreaterThan(1)
    // Three cues on every pile: its colour, its name, and its own key art.
    const piles = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.parcel__pile')]
      .map((el) => ({
        name: el.querySelector('.parcel__pileName')!.textContent ?? '',
        accent: el.style.getPropertyValue('--accent'),
        art: (el.querySelector('.parcel__pileArt') as HTMLElement).style.backgroundImage,
      })))
    expect(piles.length).toBeGreaterThanOrEqual(3)
    for (const p of piles) {
      expect(p.name.length, 'a pile with no name').toBeGreaterThan(1)
      expect(p.accent, 'a pile with no colour').toMatch(/#|rgb/)
      expect(p.art, 'a pile with no picture').toContain('/artwork/')
    }
    expect(new Set(piles.map((p) => p.accent)).size, 'two piles the same colour').toBe(piles.length)
  })

  test('tapping the right pile pays, and the wrong one costs time', async ({ page }) => {
    await open(page)
    const now = await parcel(page)
    const before = await clock(page)
    await page.locator(`[data-choice="${now.wrong}"]`).click({ timeout: 4000 })
    await expect.poll(() => clock(page), { timeout: 3000 }).toBeLessThanOrEqual(before - 1)
    expect(await score(page), 'a wrong pile paid').toBe(0)
    await expect(page.locator('[data-game-result]'), 'a mistake ended the round').toHaveCount(0)
    // Same parcel, still there.
    const still = await parcel(page)
    expect(still.label).toBe(now.label)
    await page.locator(`[data-choice="${still.right}"]`).click({ timeout: 4000 })
    await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
  })

  test('a number key puts it on the nth pile', async ({ page }) => {
    await open(page)
    const seat = await page.evaluate(() => {
      const label = document.querySelector('[data-parcel-label]')!.textContent
      return [...document.querySelectorAll('.parcel__pileName')]
        .findIndex((el) => el.textContent === label) + 1
    })
    expect(seat).toBeGreaterThan(0)
    await page.keyboard.press(String(seat))
    await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
  })

  test('dragging it onto a pile is the same answer', async ({ page }) => {
    await open(page)
    const now = await parcel(page)
    const box = (await page.locator('[data-parcel-box]').boundingBox())!
    const pile = (await page.locator(`[data-choice="${now.right}"]`).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    // Moved in steps, so the game sees a drag rather than a teleport.
    await page.mouse.move(pile.x + pile.width / 2, pile.y + pile.height / 2, { steps: 12 })
    await expect(page.locator(`[data-choice="${now.right}"]`)).toHaveClass(/is-over/)
    await page.mouse.up()
    await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
  })

  test('a drag that is cancelled costs nothing', async ({ page }) => {
    await open(page)
    const now = await parcel(page)
    const box = (await page.locator('[data-parcel-box]').boundingBox())!
    const wrong = (await page.locator(`[data-choice="${now.wrong}"]`).boundingBox())!
    const before = await clock(page)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(wrong.x + wrong.width / 2, wrong.y + wrong.height / 2, { steps: 8 })
    // The window goes mid-drag. That is not an answer.
    await page.evaluate(() => dispatchEvent(new Event('blur')))
    await expect(page.locator('[data-game-resume]')).toBeVisible({ timeout: 5000 })
    await page.mouse.up()
    expect(await score(page)).toBe(0)
    expect(await clock(page), 'a cancelled drag was charged as a mistake')
      .toBeGreaterThanOrEqual(before - 1)
    const still = await parcel(page)
    expect(still.label).toBe(now.label)
  })

  test('more piles come out as the round goes on', async ({ page }) => {
    test.setTimeout(120_000)
    await open(page)
    const at = async (): Promise<number> => page.locator('.parcel__pile').count()
    const early = await at()
    // Play through to the second half.
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      if (await page.locator('[data-game-result]').count()) break
      if (await clock(page) <= 10) break
      const now = await parcel(page).catch(() => null)
      if (!now) break
      await page.locator(`[data-choice="${now.right}"]`).click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(50)
    }
    const late = await at()
    expect(early, `started with ${early} piles`).toBe(3)
    expect(late, `ended with ${late} piles`).toBeGreaterThan(early)
  })

  test('the round ends on the clock, with a result and stars', async ({ page }) => {
    test.setTimeout(120_000)
    await open(page)
    const deadline = Date.now() + 70_000
    while (Date.now() < deadline) {
      if (await page.locator('[data-game-result]').count()) break
      const now = await parcel(page).catch(() => null)
      if (!now) break
      await page.locator(`[data-choice="${now.right}"]`).click({ timeout: 3000 }).catch(() => {})
      await page.waitForTimeout(50)
    }
    await expect(page.locator('[data-game-result]')).toBeVisible({ timeout: 20_000 })
    const shown = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-game-result]')!
      return { score: Number(el.dataset['score']), stars: Number(el.dataset['stars']) }
    })
    expect(shown.score).toBeGreaterThan(0)
    expect(shown.stars).toBeGreaterThanOrEqual(1)
    const best = await page.evaluate(() => localStorage.getItem('eungarage.minigame.parcel.best'))
    expect(best, 'nothing was written down').not.toBeNull()
  })
})

test.describe('on a phone', () => {
  for (const view of [
    { name: 'portrait', viewport: { width: 390, height: 844 } },
    { name: 'sideways', viewport: { width: 844, height: 390 } },
  ]) {
    test.describe(view.name, () => {
      test.use({ viewport: view.viewport, isMobile: true, hasTouch: true })

      test('every pile is big enough for a thumb, and a tap sorts it', async ({ page }) => {
        await open(page)
        const bad = await page.evaluate(() => {
          const out: string[] = []
          for (const el of document.querySelectorAll<HTMLElement>('.parcel__pile')) {
            const r = el.getBoundingClientRect()
            if (r.width < 44 || r.height < 44) out.push(`${Math.round(r.width)}x${Math.round(r.height)}`)
            if (r.left < 0 || r.right > innerWidth + 0.5) out.push('off the side')
          }
          return out
        })
        expect(bad, bad.join(', ')).toEqual([])
        const now = await parcel(page)
        await page.locator(`[data-choice="${now.right}"]`).tap({ timeout: 4000 })
        await expect.poll(() => score(page), { timeout: 4000 }).toBeGreaterThan(0)
      })
    })
  }
})
