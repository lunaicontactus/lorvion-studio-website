import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * SITE UPGRADE PHASE G — PUBLIC ARCHIVE (/archive.html) and SECRET STORAGE.
 *
 * The record room anyone can walk into, shelf by shelf; the crew's own box
 * behind the garage, which keeps only what the record room does not.
 */

const SHELVES = ['concept', 'characters', 'development', 'screenshots', 'old', 'sound']

async function shelfImagesLoaded(page: Page): Promise<string[]> {
  // Bring every lazy picture in, then report the ones that failed.
  for (const id of SHELVES) {
    await page.evaluate((id) => document.getElementById(id)?.scrollIntoView({ block: 'start' }), id)
    await page.waitForTimeout(250)
  }
  await page.waitForLoadState('networkidle')
  return page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>('[data-records-shelves] img')]
    .filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src') ?? ''))
}

for (const [name, view] of [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ['phone sideways', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }],
] as const) {
  test.describe(`PUBLIC ARCHIVE — ${name}`, () => {
    test.use(view)

    test('every shelf in order, every picture there, nothing wider than the screen', async ({ page }) => {
      await page.goto('/archive.html', { waitUntil: 'load' })
      await expect(page.locator('h1')).toHaveText('공식 기록실')
      const ids = await page.locator('.records-shelf').evaluateAll((els) => els.map((e) => e.id))
      expect(ids).toEqual(SHELVES)
      for (const id of SHELVES) await expect(page.locator(`#${id} li`).first()).toBeVisible()
      expect(await shelfImagesLoaded(page)).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
      await page.screenshot({ path: `e2e/shots/archive-g-${name.replace(' ', '-')}.png` })
    })
  })
}

test.describe('PUBLIC ARCHIVE — reading it', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('is in the nav, marked as the page you are on', async ({ page }) => {
    await page.goto('/archive.html', { waitUntil: 'load' })
    await expect(page.locator('.nav-links a[href="/archive.html"]')).toHaveAttribute('aria-current', 'page')
    await page.goto('/works.html', { waitUntil: 'load' })
    await expect(page.locator('.nav-links a[href="/archive.html"]')).toBeVisible()
  })

  test('a picture opens over the page, on screen, and the arrows go through its shelf', async ({ page }) => {
    await page.goto('/archive.html', { waitUntil: 'load' })
    const first = page.locator('#characters [data-record-shot]').first()
    await first.scrollIntoViewIfNeeded()
    await first.click()
    const img = page.locator('.work-view__img')
    await expect(page.locator('.work-view')).toBeVisible()
    await expect(img).toHaveJSProperty('complete', true)
    const box = (await img.boundingBox())!
    // Fixed to the screen, not to the shelf it came from.
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(900)
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
    await expect(page.locator('[data-view-count]')).toHaveText('1 / 5')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-view-count]')).toHaveText('2 / 5')
    await expect(page.locator('.work-view__tag')).toHaveText(/2026\.\d\d\.\d\d · [0-9a-f]{7}/)
    await page.keyboard.press('Escape')
    await expect(page.locator('.work-view')).toBeHidden()
    await expect(first).toBeFocused()
  })

  test('the WORM UP! runner is marked EARLY PROTOTYPE on the card and in the viewer', async ({ page }) => {
    await page.goto('/archive.html', { waitUntil: 'load' })
    const runner = page.locator('#old [data-record-shot]', { hasText: 'WORM UP!' })
    expect(await runner.count()).toBeGreaterThanOrEqual(1)
    for (const card of await runner.all()) await expect(card.locator('[data-badge]')).toHaveText('EARLY PROTOTYPE')
    await runner.first().scrollIntoViewIfNeeded()
    await runner.first().click()
    await expect(page.locator('.work-view__tag')).toContainText('EARLY PROTOTYPE')
    await expect(page.locator('[data-view-cap]')).toContainText('초기 프로토타입')
    await page.keyboard.press('Escape')
    // The Steam WORM UP! in CONCEPT ART carries no such label.
    await expect(page.locator('#concept [data-badge]')).toHaveCount(0)
  })

  test('the keyboard reaches each shelf from the index', async ({ page }) => {
    await page.goto('/archive.html', { waitUntil: 'load' })
    const link = page.locator('.records-index__a[href="#old"]')
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#old$/)
    await expect(page.locator('#old h2')).toBeInViewport()
  })

  test("a work's screenshots are its own gallery, one click away", async ({ page }) => {
    await page.goto('/archive.html', { waitUntil: 'load' })
    const card = page.locator('[data-record-gallery="liminal"]')
    await card.scrollIntoViewIfNeeded()
    await card.click()
    await expect(page).toHaveURL(/\/works\/liminal\.html#gallery-h$/)
    await expect(page.locator('[data-shot]').first()).toBeVisible()
  })

  test('one song at a time', async ({ page }) => {
    await page.goto('/archive.html', { waitUntil: 'load' })
    const playing = await page.evaluate(async () => {
      const [a, b] = [...document.querySelectorAll<HTMLAudioElement>('[data-shelf="sound"] audio')]
      a!.muted = true
      b!.muted = true
      await a!.play()
      await b!.play()
      await new Promise((r) => setTimeout(r, 200))
      return { a: !a!.paused, b: !b!.paused }
    })
    expect(playing).toEqual({ a: false, b: true })
  })
})

test.describe('SECRET STORAGE keeps its own', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("the PC's ARCHIVE goes to the record room, and the secret table holds none of its pictures", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.clear()
        localStorage.clear()
        for (const id of ['mugunghwa', 'snack', 'parcel']) {
          localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 }))
        }
        localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, secretProgress: 3, soundEnabled: false }))
      } catch { /* private mode */ }
    })
    // What the record room shows.
    await page.goto('/archive.html', { waitUntil: 'load' })
    const shown = await page.locator('[data-records-shelves] img').evaluateAll((els) =>
      els.map((e) => new URL((e as HTMLImageElement).getAttribute('src')!, location.href).pathname))
    expect(shown.length).toBeGreaterThan(20)

    // Into the garage, and the desktop's ARCHIVE.
    await page.goto('/', { waitUntil: 'load' })
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
    const pc = page.locator('[data-object="pc"]')
    await pc.focus()
    await page.waitForTimeout(400)
    await pc.press('Enter')
    await expect(page.locator('[data-desk-item="archive"]')).toHaveAttribute('href', '/archive.html')
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()

    // Behind the door: the table of polaroids.
    const door = page.locator('[data-object="secret-door"]')
    await door.focus()
    await page.waitForTimeout(400)
    await door.press('Enter')
    await expect(page.locator('[data-archive]')).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(800)
    const table = page.locator('[data-place="polaroids"]')
    await table.focus()
    await table.press('Enter')
    await expect(page.locator('[data-album]')).toBeVisible({ timeout: 6000 })
    const secret = await page.locator('[data-album] [data-polaroid] img').evaluateAll((els) =>
      els.map((e) => new URL((e as HTMLImageElement).getAttribute('src')!, location.href).pathname))
    expect(secret.length).toBeGreaterThanOrEqual(3)
    expect(secret.filter((s) => shown.includes(s))).toEqual([])
    for (const s of secret) expect(s).toMatch(/^\/assets\/images\/archive\/secret\//)
    // Picked up, a card shows its full picture.
    await page.locator('[data-album] [data-polaroid]').first().click()
    await expect(page.locator('[data-album-img]')).toHaveAttribute('src', /-full\.webp$/)
  })
})
