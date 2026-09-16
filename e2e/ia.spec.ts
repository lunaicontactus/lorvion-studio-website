import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * WORLD 2.0 — one role per object.
 *
 * The garage used to answer "what games are there?" from four places. Now the
 * PC is the only place the works are listed, and every other thing in the
 * room is its own thing: the shelf is the crew's collection, the fridge is
 * today's fridge, the parcel is a delivery, the TV is a set of channels, the
 * radio is the sound, the cabinet is records, the workbench is work in
 * progress, and the door goes outside.
 */
const panel = '[data-panel-root]'
const WORKS = ['LUNAI', 'LIMINAL', 'WORM UP!', 'LUMIORA', 'RUBATO']
const TITLE = /\b(LUNAI|LIMINAL|WORM UP!?|LUMIORA|RUBATO)\b/

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
    document.querySelector(`.thing--${name}`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, id)
}

async function close(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(page.locator(panel)).toBeHidden()
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the PC holds the works, and only the works', async ({ page }) => {
    await enter(page)
    await touch(page, 'pc')
    const rows = page.locator('[data-works] [data-game]')
    await expect(rows).toHaveCount(5, { timeout: 8000 })
    expect((await page.locator('.hub__name').allTextContents()).map((t) => t.trim())).toEqual(WORKS)
    await expect(page.locator('[data-minigame]'), 'a site mini-game is on the PC').toHaveCount(0)
    await expect(page.locator('[data-panel]')).not.toContainText('미니게임')
  })

  test('the shelf is the crew\'s things, and a second look brings out others', async ({ page }) => {
    await enter(page)
    await touch(page, 'shelf')
    const items = page.locator('[data-shelf-items]')
    // The previous panel's markup stays in the DOM until the next one
    // replaces it, so wait for the layer to be open, not for the count.
    await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
    await expect(page.locator('.relic')).toHaveCount(3)
    const first = (await items.getAttribute('data-shelf-items'))!.split(' ')
    await expect(page.locator('[data-panel]')).not.toContainText(TITLE)
    await expect(page.locator('[data-game]')).toHaveCount(0)
    // Owners are the approved crew, not the retired v1 figures.
    for (const src of await page.locator('.owner__face').evaluateAll((els) => els.map((e) => e.getAttribute('src')))) {
      expect(src).toContain('/dokkaebi-v2/')
    }
    await close(page)
    await touch(page, 'shelf')
    await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
    await expect(page.locator('.relic')).toHaveCount(3)
    const second = (await items.getAttribute('data-shelf-items'))!.split(' ')
    expect(second, 'the shelf showed exactly the same things again').not.toEqual(first)
    // Picking one says what it is.
    await page.locator('.relic').first().click()
    await expect(page.locator('.shelf__note')).not.toBeEmpty()
  })

  test('the fridge is today\'s fridge: no games, and the same shelves all day', async ({ page }) => {
    await enter(page)
    await touch(page, 'fridge')
    await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
    await expect(page.locator('.chill')).toHaveCount(5)
    const first = await page.locator('.chill').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['item']))
    await expect(page.locator('[data-panel]')).not.toContainText(TITLE)
    await expect(page.locator('.fridge__memo')).not.toBeEmpty()
    await close(page)
    await touch(page, 'fridge')
    await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
    await expect(page.locator('.chill')).toHaveCount(5)
    expect(await page.locator('.chill').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset['item']))).toEqual(first)
  })

  test('the parcel opens in the room, and the next one holds something else', async ({ page }) => {
    await enter(page)
    await touch(page, 'parcel')
    const reveal = page.locator('[data-delivery]')
    await expect(reveal).toBeVisible({ timeout: 6000 })
    await expect(page.locator('.thing--parcel')).toHaveClass(/is-open/)
    const first = await reveal.getAttribute('data-delivery')
    expect(first).toBeTruthy()
    await expect(page.locator('[data-panel]')).not.toContainText(TITLE)
    await close(page)
    await expect(page.locator('.thing--parcel'), 'the box stayed open after it was put down').not.toHaveClass(/is-open/)
    await touch(page, 'parcel')
    await expect(reveal).toBeVisible({ timeout: 6000 })
    expect(await reveal.getAttribute('data-delivery')).not.toBe(first)
  })

  test('the TV is five channels, and none of them is the PC\'s list', async ({ page }) => {
    await enter(page)
    await touch(page, 'tv')
    const set = page.locator('[data-tv]')
    await expect(set).toHaveAttribute('data-channel', 'news', { timeout: 6000 })
    await expect(page.locator('[data-tv-news]')).toBeVisible()
    const seen: string[] = []
    for (let i = 0; i < 5; i++) {
      seen.push((await set.getAttribute('data-channel'))!)
      await expect(page.locator('[data-works], .hub__row'), 'the TV repeats the works list').toHaveCount(0)
      await page.locator('[data-tv-next]').click()
      await expect(set).not.toHaveAttribute('data-channel', seen[seen.length - 1]!, { timeout: 3000 })
    }
    expect(seen).toEqual(['news', 'cam', 'teaser', 'contact', 'nosignal'])
    await page.locator('[data-tv-go="3"]').click()
    await expect(page.locator('.tvrow__value')).toHaveText('eungarage@gmail.com', { timeout: 3000 })
    await expect(page.locator('.tvrow__value')).toHaveAttribute('href', 'mailto:eungarage@gmail.com')
    await page.locator('[data-tv-go="1"]').click()
    await expect(page.locator('[data-tv-cam]')).toBeVisible({ timeout: 3000 })
  })

  test('the nav CONTACT opens the TV on the contact channel', async ({ page }) => {
    await enter(page)
    await page.locator('.nav-links a', { hasText: /contact/i }).click()
    await expect(page.locator('[data-tv]')).toHaveAttribute('data-channel', 'contact', { timeout: 6000 })
  })

  test('the radio is the sound: its power is the site\'s mute, and it stays that way', async ({ page, context }) => {
    await enter(page)
    await touch(page, 'radio')
    const power = page.locator('[data-radio-power]')
    await expect(power).toHaveAttribute('aria-pressed', 'false', { timeout: 6000 })
    await page.locator('[data-station="2"]').click()
    await expect(power).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-radio]')).toHaveAttribute('data-station', 'news')
    await expect(page.locator('[data-radio-talk]')).not.toBeEmpty()
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true')
    await power.click()
    await expect(power).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'false')
    await close(page)
    // And the nav switch is the same switch.
    await page.locator('[data-sound-toggle]').click()
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true')
    // Kept: a new page in the same browser (the init script above wipes
    // storage on every navigation of *this* page, so a reload cannot show it).
    const again = await context.newPage()
    await again.goto('/', { waitUntil: 'load' })
    await expect(again.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true')
    await again.close()
  })

  test('the cabinet pulls out a record, and keeps the legal folder at the back', async ({ page }) => {
    await enter(page)
    await touch(page, 'cabinet')
    const paper = page.locator('[data-paper]')
    await expect(paper).toBeVisible({ timeout: 6000 })
    const first = await paper.getAttribute('data-paper')
    await expect(page.locator('.file')).toHaveCount(5)
    await close(page)
    await touch(page, 'cabinet')
    await expect(paper).toBeVisible({ timeout: 6000 })
    expect(await paper.getAttribute('data-paper')).not.toBe(first)
  })

  test('the workbench is work in progress, with a real capture on it', async ({ page }) => {
    await enter(page)
    await touch(page, 'workbench')
    const img = page.locator('.bench2__img')
    await expect(img).toBeVisible({ timeout: 6000 })
    await expect(img).toHaveJSProperty('complete', true)
    expect(await img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0)
    await expect(page.locator('.bench2__commit')).toHaveText(/^[0-9a-f]{7}$/)
    await expect(page.locator('[data-game], .note__row')).toHaveCount(0)
    const first = await page.locator('[data-bench]').getAttribute('data-piece')
    await close(page)
    await touch(page, 'workbench')
    await expect(img).toBeVisible({ timeout: 6000 })
    expect(await page.locator('[data-bench]').getAttribute('data-piece')).not.toBe(first)
  })

  test('the door goes outside, and a picture sends you to the PC for the rest', async ({ page }) => {
    await enter(page)
    await touch(page, 'outside-door')
    await expect(page.locator('[data-outside-door]')).toBeVisible({ timeout: 6000 })
    await close(page)
    await touch(page, 'poster-lumiora')
    await page.locator('[data-poster-go]').click()
    await expect(page.locator('.crtgame__name')).toHaveText('LUMIORA', { timeout: 8000 })
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('every new thing can be reached and opened with a finger', async ({ page }) => {
    await enter(page)
    for (const [id, sel] of [['radio', '[data-radio]'], ['parcel', '[data-delivery]'], ['tv', '[data-tv]'],
      ['shelf', '.relic'], ['workbench', '.bench2__img']] as const) {
      const thing = page.locator(`.thing--${id}`)
      const box = await thing.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height } })
      expect(Math.min(box.w, box.h), `${id} is smaller than a finger`).toBeGreaterThanOrEqual(44)
      await touch(page, id)
      await expect(page.locator(sel).first()).toBeVisible({ timeout: 8000 })
      await close(page)
    }
  })
})
