import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The one dokkaebi.
 *
 * Most of these are about restraint rather than motion: that there is exactly
 * one of them however you come and go, that it never takes a click away from
 * the visitor, that it stops choosing errands while something is open, and
 * that it stands still for long stretches. The route is pinned with ?npcseed
 * so the walk can be asserted at all.
 */

const NPC = '[data-npc]'

async function enter(page: Page, query = ''): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto(`/${query}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(900)
}

/** Where the feet are, in world units. */
async function feet(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-npc]') as HTMLElement
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform)
    return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) }
  })
}

async function view(page: Page): Promise<string> {
  return page.evaluate(() => {
    const img = document.querySelector('[data-npc] img') as HTMLImageElement
    return img.src.split('/').pop() ?? ''
  })
}

/** `action:direction` from the frame on screen, e.g. "walk:left". */
async function pose(page: Page): Promise<string> {
  return page.evaluate(() => {
    const img = document.querySelector('[data-npc] img') as HTMLImageElement
    const m = /\/dokkaebi\/\w+\/(\w+)\/(\w+)\//.exec(img.src)
    return m ? `${m[1]}:${m[2]}` : 'still'
  })
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('there is exactly one, and it is not in the middle of the room', async ({ page }) => {
    await enter(page)
    await expect(page.locator(NPC)).toHaveCount(1)
    const where = await feet(page)
    // Off to one side, on the floor band, so the room is seen before they are.
    expect(where.y).toBeGreaterThan(980)
    expect(where.y).toBeLessThan(1080)
    expect(where.x).toBeLessThan(1500)
  })

  test('it walks somewhere, stands at it, and stands about between', async ({ page }) => {
    await enter(page, '?npcseed=7')
    const seen: string[] = []
    let travelled = 0
    let previous = await feet(page)
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1200)
      const now = await feet(page)
      travelled += Math.hypot(now.x - previous.x, now.y - previous.y)
      previous = now
      seen.push(await pose(page))
    }
    // It went somewhere. The pace is set by the walk cycle — 100 world units
    // a second — so this is about a third of the room's width.
    expect(travelled).toBeGreaterThan(400)
    // Walking towards something, and facing it once there.
    expect(seen.some((s) => s.startsWith('walk:'))).toBe(true)
    expect(seen.some((s) => s === 'idle:back')).toBe(true)
    // And most of the time it is doing nothing at all.
    const still = seen.filter((s) => s.startsWith('idle:')).length
    expect(still / seen.length).toBeGreaterThan(0.4)
  })

  test('the frames it plays are real files, and the walk actually cycles', async ({ page }) => {
    await enter(page)
    const frames = await page.evaluate(async () => {
      const img = document.querySelector('[data-npc] img') as HTMLImageElement
      const seen = new Set<string>()
      const t0 = Date.now()
      while (Date.now() - t0 < 6000) {
        seen.add(img.getAttribute('src') ?? '')
        await new Promise((r) => setTimeout(r, 60))
      }
      return [...seen]
    })
    // A breath is four frames; standing on one of them is a still image.
    expect(frames.length).toBeGreaterThan(1)
    for (const f of frames) {
      const res = await page.request.get(f)
      expect(res.status(), f).toBe(200)
    }
  })

  test('touching it stops it and turns it to face the visitor', async ({ page }) => {
    await enter(page)
    const hit = page.locator('.npc__hit')
    await expect(hit).toHaveCount(1)
    // Big enough to hit on a phone, and the same floor the room's things use.
    const box = await hit.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await hit.click({ force: true })
    await page.waitForTimeout(400)
    // It stops what it was doing and turns to whoever touched it. Whether it
    // waves is a coin weighted by the character; both answers are correct.
    expect(await pose(page)).toMatch(/^(idle|wave):front$/)
  })

  test('it works at the bench, sits down, and looks about', async ({ page }) => {
    // Longer than the default: this one is about what the weights reach over
    // time, and there is no way to hurry a machine whose whole point is that
    // it does not rush.
    test.setTimeout(240_000)
    await enter(page)
    const seen = await page.evaluate(async () => {
      const img = document.querySelector('[data-npc] img') as HTMLImageElement
      const out = new Set<string>()
      const t0 = Date.now()
      while (Date.now() - t0 < 170000) {
        const m = /\/dokkaebi\/\w+\/(\w+)\//.exec(img.src)
        if (m) out.add(m[1]!)
        await new Promise((r) => setTimeout(r, 150))
      }
      return [...out]
    })
    for (const action of ['idle', 'walk', 'work', 'sit', 'look']) {
      expect(seen, `never reached ${action}`).toContain(action)
    }
  })

  test('it stands at the things it uses, not on them', async ({ page }) => {
    await enter(page, '?npcseed=7')
    // Watch until it faces away, which only happens at a thing.
    let at: { x: number; y: number } | null = null
    for (let i = 0; i < 40 && !at; i++) {
      await page.waitForTimeout(800)
      if ((await view(page)).includes('back')) at = await feet(page)
    }
    expect(at, 'never used anything in 32s').not.toBeNull()
    // On the floor in front of it, never up on the furniture.
    expect(at!.y).toBeGreaterThan(980)
    const fronts = [1578, 2185, 2470]
    expect(Math.min(...fronts.map((f) => Math.abs(at!.x - f)))).toBeLessThan(20)
  })

  test('it never takes a click from the visitor', async ({ page }) => {
    await enter(page)
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('[data-npc]')!).pointerEvents),
    ).toBe('none')
    // Whatever is under it stays reachable: the point it stands on is floor,
    // and the things on the wall still open.
    await page.evaluate(() =>
      document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    await expect(page.locator('.hub__row')).toHaveCount(4, { timeout: 6000 })
  })

  test('it stops choosing errands while something is open, and starts again after', async ({
    page,
  }) => {
    await enter(page, '?npcseed=7')
    await page.evaluate(() =>
      document.querySelector('.thing--tv')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    )
    await expect(page.locator('.tvset')).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(1500)
    const a = await feet(page)
    await page.waitForTimeout(6000)
    const b = await feet(page)
    // It may finish a step it had started, but it does not set off again.
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(60)

    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    let moved = 0
    let previous = await feet(page)
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(1000)
      const now = await feet(page)
      moved += Math.hypot(now.x - previous.x, now.y - previous.y)
      previous = now
    }
    expect(moved).toBeGreaterThan(50)
  })

  test('it moves with the room when the camera does', async ({ page }) => {
    await enter(page)
    const world = await feet(page)
    const before = await page.evaluate(
      () => document.querySelector('[data-npc]')!.getBoundingClientRect().x,
    )
    await page.mouse.move(700, 500)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(700 - i * 40, 500)
    await page.mouse.up()
    await page.waitForTimeout(700)
    const after = await page.evaluate(
      () => document.querySelector('[data-npc]')!.getBoundingClientRect().x,
    )
    // Its place in the room did not change; its place on the screen did.
    const nowWorld = await feet(page)
    expect(Math.abs(nowWorld.x - world.x)).toBeLessThan(200)
    expect(Math.abs(after - before)).toBeGreaterThan(50)
  })

  test('leaving and coming back does not leave two of them', async ({ page }) => {
    await enter(page)
    await expect(page.locator(NPC)).toHaveCount(1)
    await page.goto('/games.html', { waitUntil: 'load' })
    await page.goBack()
    await page.waitForTimeout(500)
    await page.locator('[data-alley-enter]').click()
    await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
    await page.waitForTimeout(900)
    await expect(page.locator(NPC)).toHaveCount(1)
  })

  test('resizing the window does not clone it', async ({ page }) => {
    await enter(page)
    await page.setViewportSize({ width: 900, height: 1200 })
    await page.waitForTimeout(900)
    await expect(page.locator(NPC)).toHaveCount(1)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(900)
    await expect(page.locator(NPC)).toHaveCount(1)
  })

  test('the debug overlay is off unless it is asked for', async ({ page }) => {
    await enter(page)
    await expect(page.locator('.npc__waypoint')).toHaveCount(0)
    await expect(page.locator('.npc__debug')).toHaveCount(0)
    await enter(page, '?npc=debug')
    await expect(page.locator('.npc__waypoint').first()).toBeAttached()
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('there is one, on the floor of the room it is in', async ({ page }) => {
    await enter(page, '?npcseed=7')
    await expect(page.locator(NPC)).toHaveCount(1)
    const where = await feet(page)
    expect(where.y).toBeGreaterThan(1570)
    expect(where.y).toBeLessThan(1670)
    let travelled = 0
    let previous = where
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(1200)
      const now = await feet(page)
      travelled += Math.hypot(now.x - previous.x, now.y - previous.y)
      previous = now
    }
    expect(travelled).toBeGreaterThan(200)
  })
})

test('a visitor who does not want motion gets somebody standing still', async ({ browser }) => {
  // An empty room is not the same courtesy as a quiet one: the dokkaebi is
  // there, and simply does not pace or breathe.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await enter(page)
  await expect(page.locator(NPC)).toHaveCount(1)
  const settled = await page.evaluate(async () => {
    const el = document.querySelector('[data-npc]') as HTMLElement
    const img = el.querySelector('img') as HTMLImageElement
    const frames = new Set<string>()
    const places = new Set<string>()
    const t0 = Date.now()
    while (Date.now() - t0 < 4000) {
      frames.add(img.getAttribute('src') ?? '')
      places.add(el.style.transform)
      await new Promise((r) => setTimeout(r, 100))
    }
    return { frames: frames.size, places: places.size }
  })
  expect(settled.frames).toBe(1)
  expect(settled.places).toBe(1)
  // And the room is otherwise complete.
  await expect(page.locator('.thing')).toHaveCount(11)
  await context.close()
})
