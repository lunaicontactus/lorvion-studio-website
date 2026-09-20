import { test, expect } from '@playwright/test'

/**
 * WORKS in every engine: the index, a work's own page, the old GAMES address
 * and Back. Run by Chromium, WebKit and Firefox alike (playwright.config.ts).
 */
test('the works open in this browser, and Back comes back', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  await page.goto('/works.html', { waitUntil: 'load' })
  await expect(page.locator('h1')).toHaveText('도깨비들이 만든 세계들')
  await expect(page.locator('[data-record]')).toHaveCount(5)
  await page.locator('[data-record="lumiora"]').click()
  await expect(page).toHaveURL(/\/works\/lumiora\.html$/)
  await expect(page.locator('h1')).toHaveText('LUMIORA')
  await expect(page.locator('.work-build__item').first()).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/works\.html$/)
  await expect(page.locator('[data-record]')).toHaveCount(5)
  // The old address still lands, and its #<work> links land on the work.
  await page.goto('/games.html#rubato')
  await expect(page).toHaveURL(/\/works\/rubato\.html$/)
  await expect(page.locator('h1')).toHaveText('RUBATO')
  expect(errors).toEqual([])
})
