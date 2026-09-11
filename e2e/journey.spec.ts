import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * One visitor, start to finish, with nothing forced.
 *
 * Alley → shutter → the crew living in the room → PC → 빌드 중입니다, 부장님
 * → caught → retry → back to the garage → TV → the email link. Then the
 * things that break a page that is really one document: the browser's Back,
 * a reload, a tab that loses focus mid-game, going in a second time.
 *
 * Three windows: a desktop, a phone held upright, a phone held sideways.
 * Every click is a click on the pixel a person would hit; nothing is
 * dispatched at an element behind something else.
 */

const WINDOWS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false, crew: 5 },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, mobile: true, crew: 3 },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, mobile: true, crew: 5 },
] as const

async function fresh(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
  })
}

async function enter(page: Page, mobile: boolean): Promise<void> {
  await page.goto('/', { waitUntil: 'load' })
  await expect(page.locator('[data-alley-enter]')).toBeVisible()
  await expect(page.locator('[data-garage]')).toBeHidden()
  const enterBtn = page.locator('[data-alley-enter]')
  if (mobile) await enterBtn.tap(); else await enterBtn.click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 8000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
}

/** A real press on the middle of a thing; the panel it opens must follow. */
async function touch(page: Page, selector: string, mobile: boolean): Promise<void> {
  const el = page.locator(selector)
  await expect(el).toBeVisible()
  if (mobile) await el.tap(); else await el.click()
}

for (const w of WINDOWS) {
  test.describe(w.name, () => {
    test.use({
      viewport: w.viewport,
      ...(w.mobile ? { isMobile: true, hasTouch: true } : {}),
    })

    test('from the alley to the first game and back, then the television', async ({ page }) => {
      test.setTimeout(120_000)
      await fresh(page)
      await enter(page, w.mobile)

      // The crew are here, the right number of them, and they live.
      await expect(page.locator('[data-npc]')).toHaveCount(w.crew)
      const before = await page.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => (e as HTMLElement).style.transform))
      let moved = false
      for (let i = 0; i < 25 && !moved; i++) {
        await page.waitForTimeout(1000)
        const now = await page.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => (e as HTMLElement).style.transform))
        moved = now.some((t, k) => t !== before[k])
      }
      expect(moved, 'somebody in the room moved within 25s').toBe(true)

      // PC → the game.
      await touch(page, '.thing--pc', w.mobile)
      await expect(page.locator('[data-minigame="build"]')).toBeVisible({ timeout: 6000 })
      await touch(page, '[data-minigame="build"]', w.mobile)
      await expect(page.locator('[data-game-start]')).toBeVisible()
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      await touch(page, '[data-game-start]', w.mobile)
      await expect(page.locator('[data-game-time]')).not.toHaveText('45', { timeout: 5000 })

      // A tab that loses focus mid-game pauses it; only the button resumes.
      await page.evaluate(() => window.dispatchEvent(new Event('blur')))
      await expect(page.locator('[data-game-resume]')).toBeVisible()
      const frozen = await page.locator('[data-game-time]').textContent()
      await page.waitForTimeout(1500)
      expect(await page.locator('[data-game-time]').textContent()).toBe(frozen)
      await touch(page, '[data-game-resume]', w.mobile)
      await expect(page.locator('[data-game-resume]')).toBeHidden()

      // Ignore the boss until caught.
      for (let i = 0; i < 400; i++) {
        if (await page.locator('[data-game-result]').count()) break
        if (i % 4 === 0) {
          if (w.mobile) await page.locator('[data-build-jump]').tap().catch(() => {})
          else await page.keyboard.press('Space')
        }
        await page.waitForTimeout(80)
      }
      await expect(page.locator('[data-game-result]')).toHaveAttribute('data-reason', 'caught')
      // Retry starts from nothing, and straight away: a fresh round, 45s on
      // the clock, no score, no result on screen.
      await touch(page, '[data-game-retry]', w.mobile)
      await expect(page.locator('[data-game-result]')).toHaveCount(0)
      await expect(page.locator('[data-game-score]')).toHaveText('0')
      const clock = Number(await page.locator('[data-game-time]').textContent())
      expect(clock).toBeGreaterThan(40)
      expect(clock).toBeLessThanOrEqual(45)
      // Back to the garage, through the pause: same room, same crew.
      await page.evaluate(() => window.dispatchEvent(new Event('blur')))
      await expect(page.locator('[data-game-exit]')).toBeVisible()
      await touch(page, '[data-game-exit]', w.mobile)
      await expect(page.locator('[data-game-root]')).toBeHidden()
      await expect(page.locator('[data-garage]')).toBeVisible()
      await expect(page.locator('[data-npc]')).toHaveCount(w.crew)

      // The television → the studio's address, as a real mailto link.
      await page.waitForTimeout(600)
      await touch(page, '.thing--tv', w.mobile)
      const mail = page.locator('.tvrow__value[href^="mailto:"]')
      await expect(mail).toBeVisible({ timeout: 6000 })
      await expect(mail).toHaveAttribute('href', 'mailto:eungarage@gmail.com')
      await expect(mail).toHaveText('eungarage@gmail.com')
      // The nav is still there, over the room, and its links are real.
      await expect(page.locator('.site-nav .brand')).toBeVisible()
    })

    test('back, a reload, and going in a second time', async ({ page }) => {
      await fresh(page)
      await enter(page, w.mobile)
      // The browser's Back closes what is open and stays in the room.
      await touch(page, '.thing--fridge', w.mobile)
      await expect(page.locator('.fridge')).toBeVisible({ timeout: 6000 })
      expect(page.url()).toContain('#fridge')
      await page.goBack()
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      await expect(page.locator('[data-garage]')).toBeVisible()
      expect(page.url()).not.toContain('#fridge')

      // A reload puts the visitor back outside; ENTER works a second time.
      await page.reload({ waitUntil: 'load' })
      await expect(page.locator('[data-alley-enter]')).toBeVisible()
      await expect(page.locator('[data-garage]')).toBeHidden()
      const enterBtn = page.locator('[data-alley-enter]')
      if (w.mobile) await enterBtn.tap(); else await enterBtn.click()
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 8000 })
      await expect(page.locator('[data-npc]')).toHaveCount(w.crew)
      // And the parcel, with a real press, on every window.
      await page.waitForTimeout(400)
      const parcel = page.locator('.thing--parcel')
      for (let i = 0; i < 30; i++) {
        const box = await parcel.boundingBox()
        const vp = page.viewportSize()!
        if (box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height) break
        const key = vp.width > vp.height ? 'ArrowRight' : 'ArrowDown'
        await page.keyboard.down(key)
        await page.waitForTimeout(150)
        await page.keyboard.up(key)
        await page.waitForTimeout(250)
      }
      await page.waitForTimeout(1200)
      const box = (await parcel.boundingBox())!
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44)
      await touch(page, '.thing--parcel', w.mobile)
      await expect(parcel).toHaveClass(/is-open/)
      await expect(page.locator('[data-panel-root]')).toBeHidden()
    })
  })
}

test('a visitor who does not want motion gets the same journey, without the wait', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await fresh(page)
  await enter(page, false)
  await page.locator('.thing--pc').click()
  await expect(page.locator('[data-minigame="build"]')).toBeVisible({ timeout: 3000 })
  await page.locator('[data-game="lunai"]').click()
  await expect(page.locator('[data-garage]')).toHaveAttribute('data-world', 'lunai')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-panel-root]')).toBeHidden()
  await expect(page.locator('[data-garage]')).not.toHaveAttribute('data-world', /./)
  await ctx.close()
})
