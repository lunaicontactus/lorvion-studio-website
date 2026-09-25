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

  test('the shelf is the archive: every work on it, each where it is painted', async ({ page }) => {
    await enter(page)
    await touch(page, 'shelf')
    await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
    await expect(page.locator('.cab__spot')).toHaveCount(14)
    await page.waitForFunction(() => document.querySelector<HTMLImageElement>('.prop--shelf .prop__art')?.complete)
    await page.waitForTimeout(700)
    // The spot a finger lands on is the spot for the thing painted there,
    // and no spot lies on another.
    const spots = await page.locator('.cab__spot').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return { id: (el as HTMLElement).dataset['cab'], hit: hit?.closest<HTMLElement>('[data-cab]')?.dataset['cab'],
        l: r.left, t: r.top, r: r.right, b: r.bottom }
    }))
    for (const s of spots) expect(s.hit, `${s.id} is covered by ${s.hit}`).toBe(s.id)
    for (const a of spots) {
      for (const b of spots) {
        if (a === b) continue
        const w = Math.min(a.r, b.r) - Math.max(a.l, b.l)
        const h = Math.min(a.b, b.b) - Math.max(a.t, b.t)
        const area = Math.min((a.r - a.l) * (a.b - a.t), (b.r - b.l) * (b.b - b.t))
        expect(Math.max(0, w) * Math.max(0, h) / area, `${a.id} lies on ${b.id}`).toBeLessThan(0.03)
      }
    }
    // Round the cabinet once: every work is on it, and the drawers are the
    // studio's own records.
    await page.locator('.cab__spot').first().click()
    const seen = new Set<string>()
    for (let i = 0; i < 14; i++) {
      seen.add((await page.locator('[data-cab-project]').textContent())!.trim())
      await page.keyboard.press('ArrowRight')
    }
    for (const w of WORKS) expect(seen.has(w), `${w} is not on the shelf`).toBe(true)
    await page.locator('[data-cab="drawer-tools"]').click()
    await expect(page.locator('.cab__record code')).toHaveText(/^[0-9a-f]{7}$/)
    await page.locator('[data-cab="drawer-records"]').click()
    const photos = page.locator('.cab__photo img')
    await expect(photos).toHaveCount(3)
    await expect.poll(() => photos.evaluateAll((els) =>
      els.every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)), { timeout: 8000 }).toBe(true)
  })

  test('a thing on the shelf leads to its work on the PC', async ({ page }) => {
    await enter(page)
    await touch(page, 'shelf')
    await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
    await page.locator('[data-cab="lunai-diary"]').click()
    await expect(page.locator('[data-cab-go]')).toHaveText(/PC에서 자세히 보기/)
    await page.locator('[data-cab-go]').click()
    await expect(page.locator('.crtgame__name')).toHaveText('LUNAI', { timeout: 8000 })
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

  test('the radio brings the sound on with it, its knob is its own, and the switch stays', async ({ page, context }) => {
    await enter(page)
    await touch(page, 'radio')
    const power = page.locator('[data-radio-power]')
    await expect(power).toHaveAttribute('aria-pressed', 'false', { timeout: 6000 })
    // Asking for a station with the site silent is asking for sound too.
    await page.locator('[data-station="2"]').click()
    await expect(power).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-radio]')).toHaveAttribute('data-station', 'news')
    await expect(page.locator('[data-radio-talk]')).not.toBeEmpty()
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true')
    // The knob is the radio's: off here is the room's own song, not silence.
    await power.click()
    await expect(power).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true')
    await close(page)
    // The nav switch is the master: off, and on again.
    await page.locator('[data-sound-toggle]').click()
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'false')
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
    // …and outside is a place (PHASE 8/9). Back is the way home.
    await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 6000 })
    await page.goBack()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('[data-panel-root]')).toBeHidden()
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
      ['shelf', '.cab__spot'], ['workbench', '.bench2__img']] as const) {
      const thing = page.locator(`.thing--${id}`)
      const box = await thing.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height } })
      expect(Math.min(box.w, box.h), `${id} is smaller than a finger`).toBeGreaterThanOrEqual(44)
      await touch(page, id)
      await expect(page.locator(sel).first()).toBeVisible({ timeout: 8000 })
      await close(page)
    }
  })
})

for (const view of [
  { name: 'phone portrait', viewport: { width: 390, height: 844 } },
  { name: 'phone landscape', viewport: { width: 844, height: 390 } },
] as const) {
  test.describe(view.name, () => {
    test.use({ ...view, isMobile: true, hasTouch: true })

    test('what the shelf says about a thing never covers the shelf', async ({ page }) => {
      await enter(page)
      await touch(page, 'shelf')
      await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
      await page.waitForTimeout(900)
      for (const id of ['wormup-crown', 'liminal-book', 'rubato-ticket', 'drawer-records']) {
        await page.locator(`[data-cab="${id}"]`).tap()
        await expect(page.locator('[data-cab-card]')).toBeVisible()
        await page.waitForTimeout(300)
        const got = await page.evaluate(() => {
          const card = document.querySelector('[data-cab-card]')!.getBoundingClientRect()
          const over = [...document.querySelectorAll<HTMLElement>('.cab__spot')].filter((s) => {
            const r = s.getBoundingClientRect()
            return Math.min(r.right, card.right) - Math.max(r.left, card.left) > 2
              && Math.min(r.bottom, card.bottom) - Math.max(r.top, card.top) > 2
          }).map((s) => s.dataset['cab'])
          const buttons = [...document.querySelectorAll<HTMLElement>('[data-cab-card] button:not([hidden])')]
            .map((b) => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height) })
          return { over, card: { l: card.left, t: card.top, r: card.right, b: card.bottom }, vw: innerWidth, vh: innerHeight, buttons }
        })
        expect(got.over, `${id}: the card lies on ${got.over.join(', ')}`).toEqual([])
        expect(got.card.l, `${id}: off the left`).toBeGreaterThanOrEqual(0)
        expect(got.card.t, `${id}: off the top`).toBeGreaterThanOrEqual(0)
        expect(got.card.r, `${id}: off the right`).toBeLessThanOrEqual(got.vw)
        expect(got.card.b, `${id}: off the bottom`).toBeLessThanOrEqual(got.vh)
        for (const b of got.buttons) expect(b, `${id}: a button smaller than a finger`).toBeGreaterThanOrEqual(44)
      }
    })
  })
}
