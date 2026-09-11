import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * 빌드 중입니다, 부장님 — played rather than inspected.
 *
 * What these hold the game to: it opens from the PC and not instead of it,
 * the controls on the ready screen are the controls that work, getting caught
 * says why, a retry starts from nothing, losing the window pauses and only a
 * button resumes, the build screen earns no points, and leaving puts the
 * garage back exactly as it was.
 */
async function enter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
  })
  await page.goto('/', { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(600)
}

async function openGame(page: Page): Promise<void> {
  await page.evaluate(() =>
    document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.locator('[data-minigame="build"]').click()
  await expect(page.locator('[data-game-start]')).toBeVisible()
}

const boss = (page: Page) => page.evaluate(() => document.querySelector('[data-build-boss]')?.dataset['state'])
const hidden = (page: Page) => page.evaluate(() => document.querySelector('[data-build-work]')?.hidden === false)
const score = (page: Page) => page.locator('[data-game-score]').textContent()
const time = (page: Page) => page.locator('[data-game-time]').textContent()

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('opens from the PC, next to the projects and not instead of them', async ({ page }) => {
    await enter(page)
    await page.evaluate(() =>
      document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await expect(page.locator('[data-minigame="build"]')).toBeVisible()
    await expect(page.locator('[data-game]')).toHaveCount(4)
    await page.locator('[data-minigame="build"]').click()
    await expect(page.locator('.game-layer')).toBeVisible()
    await expect(page.locator('.game__controls kbd').nth(0)).toHaveText('Space')
    await expect(page.locator('.game__controls kbd').nth(1)).toHaveText('Shift')
    expect(await page.evaluate(() => document.querySelector('.garage')?.classList.contains('is-paused'))).toBe(true)
  })

  test('ignoring the boss gets you caught, and the result says so', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    let sawWarning = false
    for (let i = 0; i < 300; i++) {
      const s = await boss(page)
      if (s === 'WARN') sawWarning = true
      if (await page.locator('[data-game-result]').count()) break
      if (i % 4 === 0) await page.keyboard.press('Space')
      await page.waitForTimeout(80)
    }
    expect(sawWarning, 'a check without a warning first').toBe(true)
    await expect(page.locator('[data-game-result]')).toHaveAttribute('data-reason', 'caught')
    await expect(page.locator('.game__reason')).toContainText('발각')
    await expect(page.locator('.game__reason')).toContainText('게임 화면')
  })

  test('the build screen earns nothing, and hiding in time is safe', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(1000)
    await page.keyboard.press('Shift')
    expect(await hidden(page)).toBe(true)
    const before = await score(page)
    let checked = false
    for (let i = 0; i < 200 && !checked; i++) {
      if ((await boss(page)) === 'CHECK') checked = true
      await page.keyboard.press('Space')
      await page.waitForTimeout(80)
    }
    expect(checked).toBe(true)
    await page.waitForTimeout(2200)
    expect(await page.locator('[data-game-result]').count(), 'caught while hidden').toBe(0)
    expect(await score(page)).toBe(before)
  })

  test('losing the window pauses; only the button resumes; retry starts over', async ({ page }) => {
    await enter(page)
    await openGame(page)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(2500)
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.locator('[data-game-resume]')).toBeVisible()
    const t = await time(page)
    await page.waitForTimeout(1500)
    expect(await time(page)).toBe(t)
    await page.keyboard.press('Space')
    await page.waitForTimeout(300)
    await expect(page.locator('[data-game-resume]')).toBeVisible()
    await page.locator('[data-game-resume]').click()
    await page.waitForTimeout(1500)
    expect(Number(await time(page))).toBeLessThan(Number(t))
    await page.keyboard.press('Escape')
    await page.locator('[data-game-exit]').click()
    await expect(page.locator('.game-layer')).toHaveCount(0)
    await openGame(page)
    await expect(page.locator('[data-game-time]')).toHaveText('45')
    await expect(page.locator('[data-game-score]')).toHaveText('0')
  })

  test('leaving puts the garage back', async ({ page }) => {
    await enter(page)
    const crewBefore = await page.locator('[data-npc]').count()
    await openGame(page)
    await page.locator('[data-game-exit]').click()
    await expect(page.locator('.game-layer')).toHaveCount(0)
    expect(await page.evaluate(() => document.querySelector('[data-game-root]')?.hidden)).toBe(true)
    expect(await page.evaluate(() => document.querySelector('.garage')?.classList.contains('is-paused'))).toBe(false)
    await expect(page.locator('[data-npc]')).toHaveCount(crewBefore)
    const a = await page.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => (e as HTMLElement).style.transform))
    await page.waitForTimeout(6000)
    const b = await page.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => (e as HTMLElement).style.transform))
    expect(a.some((t, i) => t !== b[i])).toBe(true)
    await page.evaluate(() =>
      document.querySelector('.thing--tv')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await expect(page.locator('.tvset')).toBeVisible({ timeout: 6000 })
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('has two pads, and they are the whole game', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    await openGame(page)
    await expect(page.locator('.game__controls kbd').nth(0)).toHaveText('점프')
    await page.locator('[data-game-start]').tap()
    const jump = page.locator('[data-build-jump]')
    const swap = page.locator('[data-build-swap]')
    await expect(jump).toBeVisible()
    for (const pad of [jump, swap]) {
      const box = (await pad.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(120)
    }
    const shell = (await page.locator('[data-game-shell]').boundingBox())!
    expect(shell.y + shell.height).toBeLessThanOrEqual(844)
    let checked = false
    for (let i = 0; i < 260 && !checked; i++) {
      const s = await boss(page)
      const h = await hidden(page)
      if ((s === 'WARN' || s === 'CHECK') && !h) await swap.dispatchEvent('pointerdown')
      if (s === 'CHECK') checked = true
      if (!h && i % 4 === 0) await jump.dispatchEvent('pointerdown')
      await page.waitForTimeout(80)
    }
    expect(checked).toBe(true)
    await page.waitForTimeout(2200)
    expect(await page.locator('[data-game-result]').count()).toBe(0)
  })
})
