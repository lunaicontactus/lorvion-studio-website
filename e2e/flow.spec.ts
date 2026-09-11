import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Every thing in the room opens its own thing.
 *
 * The registry decides what exists; this is the contract that each entry has
 * an interface behind it and that no two things open the same one. If a thing
 * is added and left unwired, this fails.
 */

/**
 * Every thing in the room, and the element that proves the right one opened.
 * A selector, not a phrase: two objects may both mention the studio's email,
 * and a test that matches on words cannot tell them apart.
 */
const OPENS: Readonly<Record<string, string>> = {
  pc: '.crt',
  workbench: '.note',
  tv: '.tvset',
  cabinet: '.drawer',
  fridge: '.fridge',
  shelf: '.shelf',
  'secret-door': '.dark',
  'poster-lunai': '[data-kind~="poster--lunai"] .wall',
  'poster-liminal': '[data-kind~="poster--liminal"] .wall',
  'poster-wormup': '[data-kind~="poster--wormup"] .wall',
  'poster-rubato': '[data-kind~="poster--rubato"] .wall',
}

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

  test('every thing opens its own thing', async ({ page }) => {
    await enter(page)
    for (const [id, proof] of Object.entries(OPENS)) {
      await touch(page, id)
      await expect(page.locator(proof), id).toBeVisible({ timeout: 6000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      // The markup stays until the next thing replaces it; it must not show.
      await expect(page.locator(proof)).toBeHidden()
    }
  })

  test('the room holds exactly the things the registry lists', async ({ page }) => {
    await enter(page)
    await expect(page.locator('.thing')).toHaveCount(Object.keys(OPENS).length)
    for (const id of Object.keys(OPENS)) {
      await expect(page.locator(`.thing--${id}`)).toHaveCount(1)
    }
  })

  test('the games are reachable, through the PC and as a page', async ({ page }) => {
    await enter(page)
    await touch(page, 'pc')
    await expect(page.locator('[data-game]')).toHaveCount(4, { timeout: 6000 })
    // The projects are the second list on the monitor; the mini-games sit
    // above them in a list of their own.
    for (const title of ['LUNAI', 'LIMINAL', 'WORM UP!', 'RUBATO']) {
      await expect(page.locator('.hub').last()).toContainText(title)
    }
    await page.goto('/games.html', { waitUntil: 'load' })
    await expect(page.locator('.fb-game')).toHaveCount(4)
  })
})
