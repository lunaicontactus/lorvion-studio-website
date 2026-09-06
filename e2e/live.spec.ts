import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
const SHA = process.env['QA_SHA'] ?? 'main'
const URL = `https://eungarage.com/?qa=${SHA}`

async function audit(page: Page) {
  return page.evaluate(() => {
    const q = (s: string) => document.querySelectorAll(s).length
    const garage = document.querySelector('.garage')!
    const circles = [...garage.querySelectorAll('*')].filter((el) => {
      const c = getComputedStyle(el)
      const b = el.getBoundingClientRect()
      if (b.width < 1 || b.height < 1 || c.display === 'none' || Number(c.opacity) === 0) return false
      return c.backgroundImage.includes('radial-gradient') || c.borderRadius.includes('50%')
    }).map((el) => (el as HTMLElement).className)
    const words = ['GAMES', 'ABOUT', 'ARCHIVE', 'CONTACT', 'OUT']
    const inGarage = words.filter((w) =>
      [...garage.querySelectorAll('*')].some((el) => el.children.length === 0 && el.textContent?.trim() === w))
    return {
      jumpAttr: q('[data-jump]'), jumpBar: q('.garage__jump'), npc: q('.npc'),
      hint: q('.thing__hint'), face: q('.thing__face'), silhouette: q('.alley__silhouette'),
      things: q('.thing'), outlines: q('.thing__outline'), circles,
      jumpWordsInGarage: inGarage,
      panelHidden: (document.querySelector('[data-panel-root]') as HTMLElement).hidden,
      css: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => (l as HTMLLinkElement).href.split('/').pop()),
    }
  })
}

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }]) {
  test(`live origin, ${vp.w}x${vp.h}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h })
    await page.addInitScript(() => { try { sessionStorage.clear(); localStorage.clear() } catch { /* */ } })
    await page.goto(URL, { waitUntil: 'load' })
    await page.screenshot({ path: `e2e/shots/live-${vp.w}-00-alley.png` })
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20000 })
    await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
    await page.waitForTimeout(1500)
    const a = await audit(page)
    console.log(vp.w, JSON.stringify(a))
    for (const k of ['jumpAttr','jumpBar','npc','hint','face','silhouette'] as const) expect(a[k]).toBe(0)
    expect(a.circles).toEqual([])
    expect(a.jumpWordsInGarage).toEqual([])
    expect(a.panelHidden).toBe(true)
    expect(a.outlines).toBe(a.things)
    await page.screenshot({ path: `e2e/shots/live-${vp.w}-01-garage.png` })
    // Only what the camera is actually showing: the room is panned by
    // transform, so Playwright cannot scroll an off-screen object into view.
    const onScreen: string[] = await page.evaluate(() =>
      [...document.querySelectorAll('.thing')]
        .filter((t) => {
          const b = t.getBoundingClientRect()
          return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight
        })
        .map((t) => (t as HTMLElement).dataset['object'] ?? ''))
    expect(onScreen.length).toBeGreaterThan(2)
    for (const id of onScreen) {
      await page.locator(`.thing--${id}`).hover()
      await page.waitForTimeout(250)
      const lit = await page.evaluate(() => [...document.querySelectorAll('.thing')]
        .filter((t) => Number(getComputedStyle(t.querySelector('.thing__outline')!).opacity) > 0.5)
        .map((t) => (t as HTMLElement).dataset['object']))
      expect(lit).toEqual([id])
      await page.screenshot({ path: `e2e/shots/live-${vp.w}-hover-${id}.png` })
    }
    await page.mouse.move(vp.w / 2, vp.h - 30)
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => [...document.querySelectorAll('.thing')]
      .filter((t) => Number(getComputedStyle(t.querySelector('.thing__outline')!).opacity) > 0.5).length)
    expect(after).toBe(0)
  })
}

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test('live origin, 390x844 tap', async ({ page }) => {
  await page.addInitScript(() => { try { sessionStorage.clear(); localStorage.clear() } catch { /* */ } })
  await page.goto(URL, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(1200)
  await expect(page.locator('.garage__hint')).toBeVisible()
  await page.screenshot({ path: 'e2e/shots/live-390-01-garage.png' })
  await page.locator('.thing--pc').click()
  await page.waitForTimeout(700)
  await expect(page.locator('[data-panel-root]')).toBeVisible()
  await page.screenshot({ path: 'e2e/shots/live-390-02-pc.png' })
  })
})
