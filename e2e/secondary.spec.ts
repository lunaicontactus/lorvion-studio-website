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
      await page.locator('.chill').nth(0).click()
      const first = await page.locator('[data-fridge-say]').textContent()
      expect(first?.length).toBeGreaterThan(2)
      await page.locator('.chill').nth(1).click()
      const second = await page.locator('[data-fridge-say]').textContent()
      expect(second).not.toBe(first)
      // One line, not a paragraph, and nothing is counted.
      expect(second!.length).toBeLessThan(48)
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })

    test('the shelf is the crew\'s own things, and never a second games menu', async ({ page }) => {
      await enter(page)
      await touch(page, 'shelf')
      await expect(page.locator('.relic')).toHaveCount(3, { timeout: 6000 })
      await expect(page.locator('[data-game], [data-shelf-go]')).toHaveCount(0)
      await page.locator('.relic').first().click()
      await expect(page.locator('.shelf__note')).toBeVisible()
      await expect(page.locator('.shelf__note')).not.toContainText(/LUNAI|LIMINAL|WORM UP|LUMIORA|RUBATO/)
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })

    test('the outside door remembers, for this visit, that you have been out', async ({ page }) => {
      await enter(page)
      await touch(page, 'outside-door')
      await expect(page.locator('.dark__line')).toBeVisible({ timeout: 6000 })
      const first = await page.locator('.dark__line').textContent()
      // No invented project, date or teaser.
      await expect(page.locator('[data-panel]')).not.toContainText(/20\d\d/)
      // Then it is a door (PHASE 8): outside, and Back.
      await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 6000 })
      await page.goBack()
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
      await expect(page.locator(panel)).toBeHidden()

      await touch(page, 'outside-door')
      await expect(page.locator('.dark__line')).toBeVisible({ timeout: 6000 })
      // A different line the second time.
      expect(await page.locator('.dark__line').textContent()).not.toBe(first)
      await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 6000 })
      await page.goBack()
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
    })

    test('a poster stays a poster, and the picture keeps its shape', async ({ page }) => {
      await enter(page)
      await touch(page, 'poster-lunai')
      const shot = page.locator('[data-artwork-view] img')
      await expect(shot).toBeVisible({ timeout: 6000 })
      // Decoded, not merely laid out: the picture opens at once now, and the
      // shape is judged against the file, which arrives a moment later.
      await expect(shot).toHaveJSProperty('complete', true)
      await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
      await expect(page.locator('.panel__title')).toHaveText('LUNAI')
      // Shown at the size it was drawn, not at the size of a box somebody
      // picked first. LUNAI's key visual is 1024x1536; a 16:9 frame with the
      // picture set to cover it — which is what this used to be — leaves a
      // third of the height on screen and throws the rest away.
      const fit = await shot.evaluate((img: HTMLImageElement) => {
        const r = img.getBoundingClientRect()
        return { drawn: r.width / r.height, natural: img.naturalWidth / img.naturalHeight }
      })
      expect(Math.abs(fit.drawn - fit.natural) / fit.natural,
        'the picture is not the shape it was drawn').toBeLessThan(0.02)
      expect(fit.natural, 'LUNAI is a tall picture').toBeLessThan(1)
      // No second copy of the project description on the wall.
      await expect(page.locator('[data-panel]')).not.toContainText('Emotion diary')
      await page.locator('[data-poster-go]').click()
      await expect(page.locator('.crtgame__name')).toHaveText('LUNAI', { timeout: 8000 })
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    })

    test('a wide picture opens wide, and closes every way it can be closed', async ({ page }) => {
      // The other half of the same promise. RUBATO's piece is one of the
      // game's own backgrounds, 1920x1080, hung in a small wooden frame — so if any of this measured the paper instead of the picture,
      // this is where it would show.
      await enter(page)
      await touch(page, 'picture-rubato')
      const shot = page.locator('[data-artwork-view] img')
      await expect(shot).toBeVisible({ timeout: 6000 })
      await expect(shot).toHaveJSProperty('complete', true)
      await expect.poll(() => shot.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
      const fit = await shot.evaluate((img: HTMLImageElement) => {
        const r = img.getBoundingClientRect()
        return {
          drawn: r.width / r.height,
          natural: img.naturalWidth / img.naturalHeight,
          w: r.width, h: r.height, vw: innerWidth, vh: innerHeight,
        }
      })
      expect(Math.abs(fit.drawn - fit.natural) / fit.natural).toBeLessThan(0.02)
      expect(fit.natural, 'RUBATO is a wide picture').toBeGreaterThan(1)
      expect(fit.w, 'wider than the window').toBeLessThanOrEqual(fit.vw * 0.92)
      expect(fit.h, 'taller than the window').toBeLessThanOrEqual(fit.vh * 0.86)
      // The way out of a picture: the backdrop, and Escape.
      //
      // In the corner, not in the middle. The backdrop covers the window and
      // the panel sits on top of it, so a click at the backdrop's centre is a
      // click on the picture — `force` skips the actionability check but
      // still aims at the same covered point, which is a click that closes
      // nothing.
      await page.locator('[data-panel-scrim]').click({ position: { x: 6, y: 6 } })
      await expect(page.locator(panel)).toBeHidden()
      // Opened from the keyboard this time, because the point of the next
      // line is where the focus goes back to. `touch` above dispatches an
      // event at the button without focusing it, so there would be nothing
      // to go back to.
      const poster = page.locator('[data-object="picture-rubato"]')
      await poster.focus()
      await poster.press('Enter')
      await expect(shot).toBeVisible({ timeout: 6000 })
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
      // And the thing it came from has the focus back.
      await expect(poster).toBeFocused()
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
    await touch(page, 'outside-door')
    // No journey: the door is open and the playground is there.
    await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 2500 })
    await context.close()
  })
})
