import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * What is switched on, and what is only in the room.
 *
 * The registry decides this, and this test is the contract: the PC, the bench
 * and the television open; everything else is present, outlined and touchable,
 * and quietly does nothing until its own phase. If a thing is turned on
 * without an interface behind it, this fails.
 */

const LIVE = ['pc', 'workbench', 'tv']
const NOT_YET = [
  'shelf',
  'cabinet',
  'fridge',
  'secret-door',
  'poster-lunai',
  'poster-liminal',
  'poster-wormup',
  'poster-rubato',
]

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
  const skip = page.locator('#introSkip')
  if (await skip.count()) await skip.click().catch(() => undefined)
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(900)
}

async function touch(page: Page, id: string): Promise<void> {
  await page.evaluate((name) => {
    document
      .querySelector(`.thing--${name}`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, id)
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the three that are finished open, and each says what it is', async ({ page }) => {
    await enter(page)
    const expected: Record<string, string> = {
      pc: 'EUNGARAGE SOFTWARE',
      workbench: 'Made in our garage.',
      tv: 'eungarage@gmail.com',
    }
    for (const id of LIVE) {
      await touch(page, id)
      await expect(page.locator('[data-panel]')).toContainText(expected[id]!, { timeout: 6000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
    }
  })

  test('the rest are in the room but open nothing yet', async ({ page }) => {
    await enter(page)
    for (const id of NOT_YET) {
      await expect(page.locator(`.thing--${id}`)).toHaveCount(1)
      await touch(page, id)
      await page.waitForTimeout(350)
      await expect(page.locator('[data-panel-root]'), `${id} must not open`).toBeHidden()
    }
    // And the room still works afterwards.
    await touch(page, 'pc')
    await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 6000 })
  })

  test('the games are reachable, through the PC and as a page', async ({ page }) => {
    await enter(page)
    await touch(page, 'pc')
    await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 6000 })
    for (const title of ['LUNAI', 'LIMINAL', 'WORM UP!', 'RUBATO']) {
      await expect(page.locator('.hub')).toContainText(title)
    }
    await page.goto('/games.html', { waitUntil: 'load' })
    await expect(page.locator('.fb-game')).toHaveCount(4)
  })
})
