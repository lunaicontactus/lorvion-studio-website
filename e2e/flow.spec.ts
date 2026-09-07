import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The visit itself: in through the shutter, open the things in the room, read
 * what they say, close them again. Every object is opened through the room's
 * own click path, so this fails if the routing, the panel shell or the data
 * behind a panel breaks — not only if a selector moves.
 */

async function enterGarage(page: Page): Promise<void> {
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
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(900)
}

/** Objects can be off-camera; the room's own handler is what we are testing. */
async function touch(page: Page, id: string): Promise<void> {
  await page.evaluate((name) => {
    document
      .querySelector(`.thing--${name}`)
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, id)
  await expect(page.locator('[data-panel]')).toBeVisible()
}

const panel = '[data-panel]'

for (const vp of [
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'phone', width: 390, height: 844, touch: true },
]) {
  test.describe(vp.name, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      hasTouch: vp.touch,
      isMobile: vp.touch,
    })

    test('a visitor can walk in and find the games', async ({ page }) => {
      await enterGarage(page)

      // The PC is the hub: every project, with the facts that exist.
      await touch(page, 'pc')
      await expect(page.locator('.hub__row')).toHaveCount(4)
      await expect(page.locator(panel)).toContainText('LUNAI')
      await expect(page.locator(panel)).toContainText('Emotion diary')
      await expect(page.locator(panel)).toContainText('IN DEVELOPMENT')

      // Into a game and back out.
      await page.locator('[data-game="liminal"]').click()
      await expect(page.locator('.proj__facts')).toContainText('Narrative mystery')
      await expect(page.locator('.proj__facts')).toContainText('PC')
      await page.locator('[data-panel-close]').click()
      await expect(page.locator('[data-panel-root]')).toBeHidden()

      // A poster opens the same page as the hub did, from the same data.
      await touch(page, 'poster-liminal')
      await expect(page.locator('.panel__title')).toHaveText('LIMINAL')
      await expect(page.locator('.proj__facts')).toContainText('Narrative mystery')
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()

      // The TV is contact, and it shows only what the config actually has.
      await touch(page, 'tv')
      await expect(page.locator(panel)).toContainText('eungarage@gmail.com')
      await expect(page.locator(panel)).not.toContainText('PHONE')
      // Away from the panel itself, or the click lands on the dialog.
      await page.locator('[data-panel-scrim]').click({ position: { x: 6, y: 6 } })
      await expect(page.locator('[data-panel-root]')).toBeHidden()

      // The fridge is a line of studio life, not an information screen.
      await touch(page, 'fridge')
      const line = await page.locator('.fridge__line').textContent()
      expect(line?.trim().length).toBeGreaterThan(4)
      await page.keyboard.press('Escape')

      // The cabinet is the studio's own file; the workbench is what is on it.
      await touch(page, 'cabinet')
      await expect(page.locator(panel)).toContainText('independent game studio')
      await expect(page.locator(panel)).toContainText('Privacy')
      await page.keyboard.press('Escape')

      await touch(page, 'workbench')
      await expect(page.locator('.build__row')).toHaveCount(4)
      await expect(page.locator(panel)).not.toContainText('%')
      await page.keyboard.press('Escape')

      // The door stays shut, and says what it is waiting for.
      await touch(page, 'secret-door')
      await expect(page.locator('.secret__steps li')).toHaveCount(3)
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
    })

    test('reading all four games unlocks nothing on its own', async ({ page }) => {
      await enterGarage(page)
      for (const id of ['poster-lunai', 'poster-liminal', 'poster-wormup', 'poster-rubato']) {
        await touch(page, id)
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-panel-root]')).toBeHidden()
      }
      // Four games read, but the fridge has not been opened enough yet.
      await touch(page, 'secret-door')
      await expect(page.locator('.secret__lock')).toBeVisible()
      await expect(page.locator('.secret__steps li.is-done')).toHaveCount(1)
    })
  })
}
