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
    // The room is panned by transform, so Playwright cannot scroll anything
    // into view: drive the camera across the room and hover whatever the
    // viewport is actually showing at each stop, until every object is seen.
    const seen = new Set<string>()
    const drag = async (dx: number): Promise<void> => {
      await page.mouse.move(vp.w / 2, vp.h / 2)
      await page.mouse.down()
      for (let i = 1; i <= 6; i++) await page.mouse.move(vp.w / 2 + (dx * i) / 6, vp.h / 2)
      await page.mouse.up()
      await page.waitForTimeout(500)
    }
    const total = a.things
    for (const step of [0, 900, 900, 900, -900, -900, -900, -900, -900]) {
      if (step !== 0) await drag(step)
      const onScreen: string[] = await page.evaluate(() =>
        [...document.querySelectorAll('.thing')]
          .filter((t) => {
            const b = t.getBoundingClientRect()
            return b.left >= 4 && b.right <= innerWidth - 4 && b.top >= 64 && b.bottom <= innerHeight - 4
          })
          .map((t) => (t as HTMLElement).dataset['object'] ?? ''))
      for (const id of onScreen) {
        if (seen.has(id)) continue
        seen.add(id)
        await page.locator(`.thing--${id}`).hover()
        await expect.poll(async () => page.evaluate(() =>
          [...document.querySelectorAll('.thing')]
            .filter((t) => Number(getComputedStyle(t.querySelector('.thing__outline')!).opacity) > 0.5)
            .map((t) => (t as HTMLElement).dataset['object'])), { timeout: 5000 }).toEqual([id])
        await page.screenshot({ path: `e2e/shots/live-${vp.w}-hover-${id}.png` })
      }
      if (seen.size === total) break
    }
    expect([...seen].sort()).toEqual(
      ['cabinet','fridge','pc','poster-liminal','poster-lunai','poster-rubato','poster-wormup',
       'secret-door','shelf','tv','workbench'])
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

  // What a finger sees: the outline while it is down, and only that one.
  await page.locator('.thing--pc').dispatchEvent('pointerdown')
  await page.waitForTimeout(120)
  const litOnTouch = await page.evaluate(() =>
    [...document.querySelectorAll('.thing')]
      .filter((t) => Number(getComputedStyle(t.querySelector('.thing__outline')!).opacity) > 0.5)
      .map((t) => (t as HTMLElement).dataset['object']))
  expect(litOnTouch).toEqual(['pc'])
  await page.screenshot({ path: 'e2e/shots/live-390-02-tap-outline.png' })
  await page.locator('.thing--pc').dispatchEvent('pointerup')

  await page.locator('.thing--pc').click()
  await page.waitForTimeout(700)
  await expect(page.locator('[data-panel-root]')).toBeVisible()
  await page.screenshot({ path: 'e2e/shots/live-390-03-pc.png' })
  })
})
