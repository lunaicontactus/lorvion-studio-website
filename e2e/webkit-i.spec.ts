import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * PHASE I: simulated iPhone QA, in Playwright's WebKit (the `webkit` project).
 *
 * This is WebKit, the engine iOS Safari uses, in a phone-sized window with a
 * phone's touch and user agent. It is NOT an iPhone: no Safari toolbar that
 * comes and goes, no real safe-area insets, no iOS text autosizing, no real
 * touch latency. docs/SITE_UPGRADE_PHASE_I.md keeps the two apart and lists
 * what only a real device can answer.
 */

const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'

async function enterGarage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('webkit-i')) return
      sessionStorage.setItem('webkit-i', '1')
      localStorage.clear()
      localStorage.setItem('eungarage:garageHinted', 'true')
    } catch { /* private mode */ }
  })
  await page.goto('/?npcseed=7', { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').tap()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(2500)
}

for (const [name, viewport] of [['portrait 390×844', { width: 390, height: 844 }], ['landscape 844×390', { width: 844, height: 390 }], ['SE 320×568', { width: 320, height: 568 }]] as const) {
  test.describe(`WebKit phone — ${name}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true, userAgent: IPHONE_UA })

    test('every page: one h1, nothing sideways, the text readable', async ({ page }) => {
      const bad: string[] = []
      for (const path of ['/works.html', '/works/lunai.html', '/archive.html', '/studio.html', '/support.html', '/contact.html', '/press.html', '/privacy.html', '/terms.html', '/account-deletion.html', '/community-guidelines.html', '/404.html']) {
        await page.goto(path, { waitUntil: 'load' })
        await page.waitForTimeout(300)
        const f = await page.evaluate(() => ({
          h1: document.querySelectorAll('h1').length,
          over: document.documentElement.scrollWidth - innerWidth,
          tiny: [...document.querySelectorAll('main *')].filter((e) => {
            const r = e.getBoundingClientRect()
            return r.width > 2 && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim()) && parseFloat(getComputedStyle(e).fontSize) < 9.95 && !e.closest('.visually-hidden')
          }).length,
        }))
        if (f.h1 !== 1 || f.over > 0 || f.tiny) bad.push(`${path} ${JSON.stringify(f)}`)
      }
      expect(bad).toEqual([])
    })

    test('the menu: a tap opens it, every link is reachable, a tap outside closes it', async ({ page }) => {
      await page.goto('/works.html', { waitUntil: 'load' })
      const toggle = page.locator('.menu-toggle')
      await toggle.tap()
      await expect(page.locator('#primaryNav')).toHaveClass(/open/)
      const links = page.locator('#primaryNav a')
      for (let i = 0; i < (await links.count()); i++) {
        await links.nth(i).scrollIntoViewIfNeeded()
        const ok = await links.nth(i).evaluate((a) => { const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height >= 44 })
        expect(ok).toBe(true)
      }
      await page.touchscreen.tap(8, viewport.height - 8)
      await expect(page.locator('#primaryNav')).not.toHaveClass(/open/)
    })

    test('the image viewer opens and closes by touch', async ({ page }) => {
      await page.goto('/works/lunai.html', { waitUntil: 'load' })
      await page.locator('[data-shot]').first().tap()
      await expect(page.locator('.work-view')).toBeVisible()
      const close = page.locator('.work-view__close')
      const free = await close.evaluate((c) => { const r = c.getBoundingClientRect(); return r.bottom <= innerHeight && r.width >= 44 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.work-view__close') === c })
      expect(free).toBe(true)
      await close.tap()
      await expect(page.locator('.work-view')).toBeHidden()
    })

    test('the garage by touch: the TV\'s VIEW PROJECT, and LIMINAL\'s case file', async ({ page }) => {
      await enterGarage(page)
      const tv = page.locator('[data-object="tv"]')
      await tv.focus()
      await page.waitForTimeout(500)
      await tv.press('Enter')
      await expect(page.locator('[data-panel-root]')).toBeVisible()
      await page.waitForTimeout(1500)
      await page.locator('[data-tv-go][aria-label^="CH01"]').tap()
      const go = page.locator('[data-tv-view-project]')
      await expect(go).toBeVisible()
      await page.waitForTimeout(800)
      await go.tap()
      await expect(page).toHaveURL(/\/works\/lunai(\.html)?$/, { timeout: 10_000 })

      await enterGarage(page)
      const cab = page.locator('[data-object="cabinet"]')
      await cab.focus()
      await page.waitForTimeout(500)
      await cab.press('Enter')
      await expect(page.locator('[data-case-file]')).toBeVisible({ timeout: 8000 })
      await page.waitForTimeout(1400)
      await page.locator('[data-case-file]').tap()
      const go2 = page.locator('[data-case-go]')
      await expect(go2).toBeVisible()
      await go2.scrollIntoViewIfNeeded()
      const reach = await go2.evaluate((a) => { const r = a.getBoundingClientRect(); return r.bottom <= innerHeight + 1 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-case-go]') === a })
      expect(reach).toBe(true)
    })
  })
}

test.describe('WebKit phone — turning it', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE_UA })

  test('portrait → landscape → portrait without a reload', async ({ page }) => {
    await enterGarage(page)
    for (const [vp, want] of [[{ width: 844, height: 390 }, 'landscape'], [{ width: 390, height: 844 }, 'portrait']] as const) {
      await page.setViewportSize(vp)
      await expect(page.locator('[data-garage]')).toHaveAttribute('data-orientation', want)
      await page.waitForTimeout(800)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
    }
  })
})
