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
  workbench: '.bench2',
  tv: '.tvset',
  radio: '.radio',
  parcel: '.delivery',
  cabinet: '.drawer',
  fridge: '.fridge',
  shelf: '.shelf',
  'outside-door': '.dark',
  'poster-lunai': '[data-kind~="poster--lunai"] .wall',
  'poster-liminal': '[data-kind~="poster--liminal"] .wall',
  'poster-wormup': '[data-kind~="poster--wormup"] .wall',
  'poster-lumiora': '[data-kind~="poster--lumiora"] .wall',
  'picture-rubato': '[data-kind~="poster--rubato"] .wall',
}

/** Things that open nothing: touching one changes the thing itself. The
 *  parcel used to be one; it opens a delivery now, and the box in the room
 *  opens with it. */
// The door in the bookcase (PHASE 11) opens nothing until the three games
// each have a star; touched before that, the thing itself answers.
const TOGGLES: readonly string[] = ['secret-door']

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
      if (id === 'outside-door') {
        // The door is a door (PHASE 8): a moment after it opens, the night
        // comes in and the playground is on the other side. Back is the
        // way home, and the room is as it was.
        await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 6000 })
        await page.goBack()
        await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
        await expect(page.locator('[data-panel-root]')).toBeHidden()
        await expect(page.locator(proof)).toBeHidden()
        continue
      }
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      // The markup stays until the next thing replaces it; it must not show.
      await expect(page.locator(proof)).toBeHidden()
    }
  })

  test('the room holds exactly the things the registry lists', async ({ page }) => {
    await enter(page)
    await expect(page.locator('.thing')).toHaveCount(Object.keys(OPENS).length + TOGGLES.length)
    for (const id of [...Object.keys(OPENS), ...TOGGLES]) {
      await expect(page.locator(`.thing--${id}`)).toHaveCount(1)
    }
  })

  test('the games are reachable, through the PC and as a page', async ({ page }) => {
    await enter(page)
    await touch(page, 'pc')
    await expect(page.locator('[data-game]')).toHaveCount(5, { timeout: 6000 })
    // The works are the only list on the monitor: the site's mini-games are
    // not on the PC.
    for (const title of ['LUNAI', 'LIMINAL', 'WORM UP!', 'LUMIORA', 'RUBATO']) {
      await expect(page.locator('.hub').last()).toContainText(title)
    }
    await page.goto('/games.html', { waitUntil: 'load' })
    await expect(page.locator('.fb-game')).toHaveCount(5)
  })
})
