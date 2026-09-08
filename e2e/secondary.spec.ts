import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The four things this phase switched on: the cabinet, the fridge, the shelf
 * and the door that has nothing behind it. Plus the posters, which stayed
 * posters.
 *
 * The point of most of these is that they do not become something they are
 * not: the paperwork is never a puzzle, the fridge counts nothing, the shelf
 * does not become a second games menu, and the door invents no project.
 */

const panel = '[data-panel-root]'

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

    test('the cabinet holds the paperwork, and every page is a real link', async ({ page }) => {
      await enter(page)
      await touch(page, 'cabinet')
      await expect(page.locator('.file')).toHaveCount(5, { timeout: 6000 })
      const wanted = [
        './support.html',
        './privacy.html',
        './terms.html',
        './community-guidelines.html',
        './account-deletion.html',
      ]
      for (const href of wanted) {
        await expect(page.locator(`.file__tab[href="${href}"]`)).toHaveCount(1)
      }
      // Nothing here is hidden behind a discovery: the nav still goes direct.
      await expect(page.locator('.nav-links a', { hasText: 'Support' })).toHaveAttribute(
        'href',
        './support.html',
      )
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })

    test('the fridge says one thing at a time and keeps no score', async ({ page }) => {
      await enter(page)
      await touch(page, 'fridge')
      await expect(page.locator('.chill')).toHaveCount(5, { timeout: 6000 })
      await expect(page.locator('[data-fridge-say]')).toHaveText('')
      await page.locator('[data-item="eggs"]').click()
      const first = await page.locator('[data-fridge-say]').textContent()
      expect(first?.length).toBeGreaterThan(2)
      await page.locator('[data-item="cup-ramen"]').click()
      const second = await page.locator('[data-fridge-say]').textContent()
      expect(second).not.toBe(first)
      // One line, not a paragraph, and nothing is counted.
      expect(second!.length).toBeLessThan(40)
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })

    test('the shelf shows the leftovers and hands the game to the PC', async ({ page }) => {
      await enter(page)
      await touch(page, 'shelf')
      await expect(page.locator('.relic')).toHaveCount(4, { timeout: 6000 })
      await expect(page.locator('.figure')).toHaveCount(5)
      await page.locator('[data-relic="liminal-file"]').click()
      await expect(page.locator('.shelf__note')).toBeVisible()
      // The shelf points at the PC rather than repeating what the PC says.
      await expect(page.locator('.shelf__note')).not.toContainText('Narrative mystery')
      await page.locator('[data-shelf-go]').click()
      await expect(page.locator('.crtgame__name')).toHaveText('LIMINAL', { timeout: 8000 })
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })

    test('the door has nothing behind it, and says so both times', async ({ page }) => {
      await enter(page)
      await touch(page, 'secret-door')
      await expect(page.locator('.dark__line')).toBeVisible({ timeout: 6000 })
      const first = await page.locator('.dark__line').textContent()
      // No invented project, date or teaser.
      await expect(page.locator('[data-panel]')).not.toContainText(/20\d\d/)
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()

      await touch(page, 'secret-door')
      await expect(page.locator('.dark__line')).toBeVisible({ timeout: 6000 })
      // It remembers, for this visit, that you already tried it.
      expect(await page.locator('.dark__line').textContent()).not.toBe(first)
      await page.keyboard.press('Escape')
    })

    test('a poster stays a poster', async ({ page }) => {
      await enter(page)
      await touch(page, 'poster-lunai')
      await expect(page.locator('.wall__paper')).toBeVisible({ timeout: 6000 })
      await expect(page.locator('.panel__title')).toHaveText('LUNAI')
      // No second copy of the project description on the wall.
      await expect(page.locator('[data-panel]')).not.toContainText('Emotion diary')
      await page.locator('[data-poster-go]').click()
      await expect(page.locator('.crtgame__name')).toHaveText('LUNAI', { timeout: 8000 })
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })
  })
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('only one thing is ever open, however fast they are touched', async ({ page }) => {
    await enter(page)
    await touch(page, 'fridge')
    await touch(page, 'cabinet')
    await touch(page, 'shelf')
    await page.waitForTimeout(1400)
    expect(
      await page.evaluate(
        () => document.querySelectorAll('[data-panel-root] [role="dialog"]').length,
      ),
    ).toBe(1)
    // And the room is still usable afterwards.
    await page.keyboard.press('Escape')
    await expect(page.locator(panel)).toBeHidden()
    await touch(page, 'cabinet')
    await expect(page.locator('.file')).toHaveCount(5, { timeout: 6000 })
    await page.goBack()
    await expect(page.locator(panel)).toBeHidden()
    await expect(page.locator('[data-garage]')).toBeVisible()
  })

  test('reduced motion opens the same things, without the theatre', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    await enter(page)
    await touch(page, 'cabinet')
    await expect(page.locator('.drawer.is-open')).toBeVisible({ timeout: 2000 })
    await page.keyboard.press('Escape')
    // The room is locked while it is closing; wait, as a visitor would.
    await expect(page.locator(panel)).toBeHidden()
    await touch(page, 'secret-door')
    await expect(page.locator('.dark.is-ajar')).toBeVisible({ timeout: 2000 })
    await context.close()
  })
})
