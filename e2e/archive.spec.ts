import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * PHASE 11/12/13 — the door in the bookcase, and what is behind it.
 *
 * The door is the cabinet it is painted as until the three games each have
 * a star: touched before that it answers by itself (a moment of seam, no
 * message) and its label says how far things have got. The first time all
 * three have a star, the room shows the door opening — once, with its
 * sound — and a reload finds it open quietly. Behind it the archive: six
 * painted things, each with its own small answer, the sky through the
 * telescope, and Healing Mode, which anything ends.
 */

declare global {
  interface Window {
    __plays?: { src: string; at: number; volume: number }[]
  }
}

async function spyOnPlay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__plays = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__plays!.push({ src: this.currentSrc || this.src, at: performance.now(), volume: this.volume })
      return play.call(this)
    }
  })
}

/** A tab with the games at these stars, and the room's own memory of them. */
async function seed(page: Page, stars: Partial<Record<'mugunghwa' | 'snack' | 'parcel', number>>, acknowledged = 0, sound = false): Promise<void> {
  await page.addInitScript(([s, ack, on]) => {
    try {
      sessionStorage.clear()
      localStorage.clear()
      for (const [id, n] of Object.entries(s as Record<string, number>)) {
        localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: n, plays: 1 }))
      }
      localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, secretProgress: ack, soundEnabled: on }))
    } catch {
      /* private mode */
    }
  }, [stars, acknowledged, sound] as const)
}

async function enter(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
}

async function touch(page: Page, id: string): Promise<void> {
  const thing = page.locator(`[data-object="${id}"]`)
  await thing.focus()
  await page.waitForTimeout(400)
  await thing.press('Enter')
}

const ALL = { mugunghwa: 1, snack: 1, parcel: 1 }
const archive = (page: Page, timeout = 6000): Promise<void> => expect(page.locator('[data-archive]')).toBeVisible({ timeout })

async function goIn(page: Page): Promise<void> {
  await touch(page, 'secret-door')
  await archive(page)
  await page.waitForTimeout(800)
}

test.describe('the lock', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('locked, the door says how far things have got and answers by itself', async ({ page }) => {
    await seed(page, {})
    await enter(page)
    const door = page.locator('[data-object="secret-door"]')
    await expect(door).toHaveAttribute('data-secret', 'locked', { timeout: 4000 })
    await expect(door.locator('.thing__label')).toHaveText('비밀문 · ★ 0/3')
    await touch(page, 'secret-door')
    await expect(door).toHaveClass(/is-hinting|is-rattling/)
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    await expect(page.locator('[data-archive]')).toBeHidden()
    // No popup, no LOCKED: the label is the whole message.
    await expect(page.locator('body')).not.toContainText(/LOCKED|잠겨 있습니다|3 GAMES/)
  })

  test('two of three is still locked, and says two', async ({ page }) => {
    await seed(page, { mugunghwa: 2, snack: 1 })
    await enter(page)
    const door = page.locator('[data-object="secret-door"]')
    await expect(door).toHaveAttribute('data-secret', 'locked', { timeout: 4000 })
    await expect(door.locator('.thing__label')).toHaveText('비밀문 · ★ 2/3')
  })

  test('the third star opens the door, once, with its sound; a reload finds it open quietly', async ({ page, context }) => {
    await spyOnPlay(page)
    await seed(page, ALL, 2, true)
    await enter(page)
    const door = page.locator('[data-object="secret-door"]')
    await expect(door).toHaveClass(/is-unlocking/, { timeout: 5000 })
    await expect(door).toHaveAttribute('data-secret', 'unlocked')
    await expect(page.locator('.garage__light[data-light="bookcase"]')).toHaveClass(/is-on/)
    // And seen: the camera brings the door into the view for it (the room
    // opens on the desk, and on a wide screen the bookcase is off to the left).
    await expect.poll(async () => {
      const r = await door.boundingBox()
      const vw = page.viewportSize()!.width, vh = page.viewportSize()!.height
      return !!r && r.x + r.width / 2 > 0 && r.x + r.width / 2 < vw && r.y + r.height / 2 > 0 && r.y + r.height / 2 < vh
    }, { timeout: 2500 }).toBe(true)
    const unlockPlays = await page.evaluate(() => window.__plays!.filter((p) => p.src.includes('secret_unlock')).length)
    expect(unlockPlays).toBe(1)
    await expect(door).not.toHaveClass(/is-unlocking/, { timeout: 5000 })
    // Remembered.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eungarage:save') ?? '{}').secretProgress)).toBe(3)
    // A fresh page in the same browser: open, and no ceremony.
    const again = await context.newPage()
    await spyOnPlay(again)
    await again.goto('/', { waitUntil: 'load' })
    await again.locator('[data-alley-enter]').click()
    await expect(again.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
    const door2 = again.locator('[data-object="secret-door"]')
    await expect(door2).toHaveAttribute('data-secret', 'unlocked', { timeout: 5000 })
    await again.waitForTimeout(2000)
    await expect(door2).not.toHaveClass(/is-unlocking/)
    expect(await again.evaluate(() => window.__plays!.filter((p) => p.src.includes('secret_unlock')).length)).toBe(0)
    await again.close()
  })
})

for (const view of [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: 'phone, upright', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'phone, sideways', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
] as const) {
  test.describe(view.name, () => {
    test.use(view)

    test('the open door leads to the archive, and Back leads home', async ({ page }) => {
      await spyOnPlay(page)
      await seed(page, ALL, 3, true)
      await enter(page)
      await touch(page, 'secret-door')
      await expect(page.locator('[data-crossing]')).toHaveClass(/is-dark/, { timeout: 3000 })
      await archive(page)
      expect(await page.evaluate(() => location.hash)).toBe('#archive')
      await expect(page.locator('[data-garage]')).toBeHidden()
      await expect(page.locator('.spot')).toHaveCount(6)
      await expect(page.locator('.archive__front')).toBeVisible()
      await page.waitForTimeout(1800)
      const music = await page.evaluate(() => window.__plays!.some((p) => p.src.includes('music/archive')))
      expect(music, 'no music in the archive').toBe(true)
      await page.goBack()
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
      await expect(page.locator('[data-archive]')).toBeHidden()
      expect(await page.evaluate(() => location.hash)).toBe('')
      await expect(page.locator('[data-npc]').first()).toBeAttached()
    })

    test('every thing in the archive answers in its own way', async ({ page }) => {
      test.setTimeout(90_000)
      await seed(page, ALL, 3)
      await enter(page)
      await goIn(page)
      const spot = (id: string) => page.locator(`[data-place="${id}"]`)
      const tap = async (id: string): Promise<void> => {
        await spot(id).focus()
        await page.waitForTimeout(700)
        await spot(id).press('Enter')
      }
      for (const id of ['star-jar', 'music-box', 'telescope', 'memory-box', 'lantern', 'cushion']) {
        const box = (await spot(id).boundingBox())!
        expect(Math.min(box.width, box.height), `${id} is smaller than a finger`).toBeGreaterThanOrEqual(44)
      }
      // The jar: a handful of stars, then still.
      await tap('star-jar')
      await expect(spot('star-jar')).toHaveClass(/is-glowing/)
      expect(await page.locator('.archive__mote').count()).toBeGreaterThan(0)
      await expect(spot('star-jar')).not.toHaveClass(/is-glowing/, { timeout: 4000 })
      await expect(page.locator('.archive__mote')).toHaveCount(0, { timeout: 4000 })
      // The lantern: its light, on and off.
      await tap('lantern')
      await expect(page.locator('.archive__lamp')).toHaveClass(/is-on/)
      await tap('lantern')
      await expect(page.locator('.archive__lamp')).not.toHaveClass(/is-on/)
      // The music box: grows out of its place, and sways.
      await tap('music-box')
      await expect(page.locator('.prop--archive[data-prop="music-box"]')).toBeVisible({ timeout: 6000 })
      await expect(page.locator('.prop--archive[data-prop="music-box"]')).toHaveClass(/is-playing/, { timeout: 3000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      // The memory box: a real day of making, with its date and commit.
      await tap('memory-box')
      await expect(page.locator('.prop--archive[data-prop="memory-box"]')).toBeVisible({ timeout: 6000 })
      await expect(page.locator('.memory__img')).toBeVisible()
      // The workbench's own line: a dotted date and the short commit.
      await expect(page.locator('.memory__when')).toHaveText(/20\d\d\.\d\d\.\d\d · [0-9a-f]{7}/)
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      // The telescope: the glass fills the window, a star goes over, Escape.
      await tap('telescope')
      await expect(page.locator('[data-archive-sky]')).toHaveClass(/is-open/, { timeout: 3000 })
      await expect(page.locator('[data-archive-sky] .archive__shooting')).toHaveClass(/is-falling/, { timeout: 3000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-archive-sky]')).not.toHaveClass(/is-open/)
      // The cushion: Healing Mode.
      await tap('cushion')
      await expect(page.locator('[data-archive]')).toHaveClass(/is-healing/)
      await expect(page.locator('body')).toHaveClass(/is-healing/)
      await expect(page.locator('[data-archive-rest]')).toBeVisible()
      // A star falls soon after settling in.
      await expect(page.locator('[data-archive-world] .archive__shooting')).toHaveClass(/is-falling/, { timeout: 8000 })
      // Anything ends it — including Space on the cushion's own button,
      // whose click (on keyup) must not start the rest again.
      await page.keyboard.press('Space')
      await expect(page.locator('[data-archive]')).not.toHaveClass(/is-healing/)
      await expect(page.locator('body')).not.toHaveClass(/is-healing/)
      await page.waitForTimeout(700)
      await expect(page.locator('[data-archive]')).not.toHaveClass(/is-healing/)
    })
  })
}

test.describe('desktop only', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('Healing Mode drifts the camera and takes the nav away; a click ends it', async ({ page }) => {
    await seed(page, ALL, 3)
    await enter(page)
    await goIn(page)
    const world = page.locator('[data-archive-world]')
    const before = await world.evaluate((el) => el.style.transform)
    await page.locator('[data-place="cushion"]').click()
    await expect(page.locator('[data-archive]')).toHaveClass(/is-healing/)
    const navOpacity = async (): Promise<number> => Number(await page.locator('.site-nav').evaluate((el) => getComputedStyle(el).opacity))
    await expect.poll(navOpacity, { timeout: 3000 }).toBeLessThan(0.2)
    await page.waitForTimeout(3500)
    expect(await world.evaluate((el) => el.style.transform)).not.toBe(before)
    await page.mouse.click(700, 450)
    await expect(page.locator('[data-archive]')).not.toHaveClass(/is-healing/)
    await expect.poll(navOpacity, { timeout: 3000 }).toBeGreaterThan(0.8)
  })

  test('arriving on #archive with the door open goes straight in; locked, it stays in the room', async ({ page }) => {
    await seed(page, ALL, 3)
    await page.goto('/#archive', { waitUntil: 'load' })
    await page.locator('[data-alley-enter]').click()
    await archive(page, 8000)
    // A deep link is the page's own entry, as anywhere: nothing is pushed
    // on arrival, so the browser's Back still leaves the way it came.
    await expect(page.locator('[data-garage]')).toBeHidden()
    expect(await page.evaluate(() => location.hash)).toBe('#archive')
    expect(await page.evaluate(() => history.state)).toBeNull()
  })

  test('with the door locked, #archive is just the room', async ({ page }) => {
    await seed(page, { snack: 1 })
    await page.goto('/#archive', { waitUntil: 'load' })
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(2500)
    await expect(page.locator('[data-archive]')).toBeHidden()
  })
})

test.describe('less motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('the crossing is a cut, the stars stand, and Healing Mode does not drift', async ({ page }) => {
    await seed(page, ALL, 3)
    await enter(page)
    const t0 = Date.now()
    await touch(page, 'secret-door')
    await archive(page, 3000)
    expect(Date.now() - t0).toBeLessThan(1800)
    const world = page.locator('[data-archive-world]')
    const before = await world.evaluate((el) => el.style.transform)
    await page.locator('[data-place="cushion"]').click()
    await expect(page.locator('[data-archive]')).toHaveClass(/is-healing/)
    await page.waitForTimeout(3000)
    expect(await world.evaluate((el) => el.style.transform)).toBe(before)
  })
})
