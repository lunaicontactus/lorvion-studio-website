import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The crew.
 *
 * Most of these are about restraint rather than motion: that there is exactly
 * one of each however you come and go, that they never take a click away from
 * the visitor, that they stop choosing errands while something is open, and
 * that they stand still for long stretches. The route of the first one is
 * pinned with ?npcseed so a walk can be asserted at all.
 *
 * Assertions about one dokkaebi name it. Whoever has rendered frames is in
 * the room, so a bare `[data-npc]` count grows every time a character's
 * frames land, and a test that counted them would fail on delivery rather
 * than on breakage.
 */

const NPC = '[data-npc]'
const MOMO = '[data-npc="momo"]'

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

/** Where one dokkaebi's feet are, in world units. */
async function feet(page: Page, who = MOMO): Promise<{ x: number; y: number }> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform)
    return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) }
  }, who)
}

async function view(page: Page, who = MOMO): Promise<string> {
  return page.evaluate((sel) => {
    const img = document.querySelector(`${sel} img`) as HTMLImageElement
    return img.src.split('/').pop() ?? ''
  }, who)
}

/** `action:direction` from the frame on screen, e.g. "walk:left". */
async function pose(page: Page, who = MOMO): Promise<string> {
  return page.evaluate((sel) => {
    const img = document.querySelector(`${sel} img`) as HTMLImageElement
    const m = /\/dokkaebi\/\w+\/(\w+)\/(\w+)\//.exec(img.src)
    return m ? `${m[1]}:${m[2]}` : 'still'
  }, who)
}

/** Everybody in the room, by id. */
async function whoIsHere(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-npc]')].map((e) => (e as HTMLElement).dataset['npc'] ?? ''))
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('everybody is on the floor, and no two of them in the same place', async ({ page }) => {
    await enter(page)
    const here = await whoIsHere(page)
    expect(here.length).toBeGreaterThan(0)
    // No duplicates: one element per character, however the room was built.
    expect(new Set(here).size).toBe(here.length)
    const places = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
    for (const p of places) {
      expect(p.y).toBeGreaterThan(980)
      expect(p.y).toBeLessThan(1080)
    }
    // Found where they live, not all stacked on one spawn point.
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        expect(Math.hypot(places[i]!.x - places[j]!.x, places[i]!.y - places[j]!.y),
          `${here[i]} and ${here[j]} started on top of each other`).toBeGreaterThan(80)
      }
    }
  })

  test('they never all walk at once', async ({ page }) => {
    await enter(page)
    const here = await whoIsHere(page)
    test.skip(here.length < 2, 'needs more than one to budget')
    let worst = 0
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(700)
      const a = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
      await page.waitForTimeout(260)
      const b = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
      const moving = a.filter((p, k) => Math.hypot(p.x - b[k]!.x, p.y - b[k]!.y) > 6).length
      worst = Math.max(worst, moving)
    }
    // Two, by budget. A third can be caught mid-shuffle as it steps out of
    // somebody's way, which is not an errand and is not what the budget counts.
    expect(worst).toBeLessThanOrEqual(3)
  })

  test('two of them never end up standing in the same place', async ({ page }) => {
    await enter(page)
    const here = await whoIsHere(page)
    test.skip(here.length < 2, 'needs more than one to collide')
    let closest = Infinity
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(900)
      const now = await Promise.all(here.map((id) => feet(page, `[data-npc="${id}"]`)))
      for (let a = 0; a < now.length; a++) {
        for (let b = a + 1; b < now.length; b++) {
          closest = Math.min(closest,
            Math.hypot(now[a]!.x - now[b]!.x, (now[a]!.y - now[b]!.y) * 2.2))
        }
      }
    }
    // They may pass each other; they may not merge. Half a body width is the
    // point at which two silhouettes stop reading as two.
    expect(closest).toBeGreaterThan(40)
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
    // a second — but the room now holds five of them and only two may be
    // walking at once, so any one of them spends most of a minute waiting its
    // turn. This is a floor for "moved about the room", not a target.
    expect(travelled).toBeGreaterThan(240)
    // Walking towards something, and facing it once there. Any back-facing
    // pose will do: leaning over the bench is `work:back` and standing at the
    // fridge is `idle:back`, and which one it happens to be doing in any
    // given minute is not the point. Naming `idle:back` specifically made
    // this fail the day the dokkaebi learned to turn round afterwards, which
    // was an improvement.
    expect(seen.some((s) => s.startsWith('walk:'))).toBe(true)
    expect(seen.some((s) => s.endsWith(':back'))).toBe(true)
    // And most of the time it is doing nothing at all.
    const still = seen.filter((s) => s.startsWith('idle:')).length
    expect(still / seen.length).toBeGreaterThan(0.4)
  })

  test('the frames it plays are real files, and the walk actually cycles', async ({ page }) => {
    await enter(page)
    const frames = await page.evaluate(async () => {
      const img = document.querySelector('[data-npc="momo"] img') as HTMLImageElement
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
    const hit = page.locator(`${MOMO} .npc__hit`)
    await expect(hit).toHaveCount(1)
    // Big enough to hit on a phone, and the same floor the room's things use.
    const box = await hit.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    // Over the dokkaebi, which sounds too obvious to test until it is not.
    // The hit area was anchored to the bottom of a box that hung below the
    // feet, so for a while it sat entirely on the floor underneath the
    // character and a visitor clicking one hit nothing at all. Every test
    // here passed, because they all clicked with { force: true }.
    const art = (await page.locator(`${MOMO} img`).boundingBox())!
    expect(box!.y).toBeGreaterThan(art.y)
    expect(box!.y + box!.height).toBeLessThanOrEqual(art.y + art.height + 2)
    // So: a real click, at the middle of the sprite, with nothing forced.
    await page.mouse.click(art.x + art.width / 2, art.y + art.height * 0.55)
    await page.waitForTimeout(400)
    // It stops what it was doing and turns to whoever touched it. Whether it
    // waves, looks up, or was already facing you is a coin weighted by the
    // character; all of those are correct and none of them is walking.
    expect(await pose(page)).toMatch(/^(idle|wave|look):(front|left|right)$/)
  })

  test('somebody works, somebody sits, somebody looks about', async ({ page }) => {
    // Longer than the default: this one is about what the weights reach over
    // time, and there is no way to hurry a machine whose whole point is that
    // it does not rush.
    //
    // Asked of the room rather than of one dokkaebi. With five of them the
    // seats and the benches are shared, and one character reaching all five
    // states inside three minutes stopped being a fair contract the moment
    // somebody else could be sitting in the chair — NUNU sits 40% of the
    // time, and it only takes one long stint to keep MOMO standing.
    test.setTimeout(240_000)
    await enter(page)
    const seen = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll('[data-npc] img')] as HTMLImageElement[]
      const out = new Set<string>()
      const t0 = Date.now()
      while (Date.now() - t0 < 170000) {
        for (const img of imgs) {
          const m = /\/dokkaebi\/\w+\/(\w+)\//.exec(img.src)
          if (m) out.add(m[1]!)
        }
        await new Promise((r) => setTimeout(r, 150))
      }
      return [...out]
    })
    for (const action of ['idle', 'walk', 'work', 'sit', 'look']) {
      expect(seen, `nobody in the room ever ${action}`).toContain(action)
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
    const fronts = [1578, 2116, 2252, 2470, 2790, 2900]
    expect(Math.min(...fronts.map((f) => Math.abs(at!.x - f)))).toBeLessThan(20)
  })

  test('somebody says something, and never two of them at once', async ({ page }) => {
    // Chatter is deliberately rare — the room is a workshop, not a chat
    // window — so this watches for a while and asserts the shape of it
    // rather than a count.
    test.setTimeout(180_000)
    await enter(page)
    const result = await page.evaluate(async () => {
      const bubbles = [...document.querySelectorAll('.npc__bubble')]
      const lines = new Set<string>()
      let mostAtOnce = 0
      const t0 = Date.now()
      while (Date.now() - t0 < 120000) {
        const up = bubbles.filter((b) => !(b as HTMLElement).hidden)
        mostAtOnce = Math.max(mostAtOnce, up.length)
        for (const b of up) lines.add(b.textContent ?? '')
        await new Promise((r) => setTimeout(r, 100))
      }
      return { said: [...lines], mostAtOnce }
    })
    expect(result.said.length, 'nobody said anything in two minutes').toBeGreaterThan(0)
    // The budget is two on a desktop. Three would be a comic strip.
    expect(result.mostAtOnce).toBeLessThanOrEqual(2)
    for (const line of result.said) expect(line.length).toBeLessThan(20)
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
      () => document.querySelector('[data-npc="momo"]')!.getBoundingClientRect().x,
    )
    await page.mouse.move(700, 500)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(700 - i * 40, 500)
    await page.mouse.up()
    await page.waitForTimeout(700)
    const after = await page.evaluate(
      () => document.querySelector('[data-npc="momo"]')!.getBoundingClientRect().x,
    )
    // Its place in the room did not change; its place on the screen did.
    const nowWorld = await feet(page)
    expect(Math.abs(nowWorld.x - world.x)).toBeLessThan(200)
    expect(Math.abs(after - before)).toBeGreaterThan(50)
  })

  test('leaving and coming back does not leave two of them', async ({ page }) => {
    await enter(page)
    const before = await whoIsHere(page)
    await page.goto('/games.html', { waitUntil: 'load' })
    await page.goBack()
    await page.waitForTimeout(500)
    await page.locator('[data-alley-enter]').click()
    await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
    await page.waitForTimeout(900)
    expect(await whoIsHere(page)).toEqual(before)
  })

  test('turning the phone does not clone them', async ({ page }) => {
    await enter(page)
    const before = await whoIsHere(page)
    expect(before.length).toBeGreaterThan(3)

    // Portrait is a smaller room — the upper half of the workshop, with a
    // wall below it — and fewer of them live in it. Fewer, never duplicated.
    await page.setViewportSize({ width: 900, height: 1200 })
    await page.waitForTimeout(900)
    const upstairs = await whoIsHere(page)
    expect(upstairs.length).toBeLessThan(before.length)
    expect(new Set(upstairs).size).toBe(upstairs.length)
    expect(before).toEqual(expect.arrayContaining(upstairs))

    // And back again: the same crew, once each.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(900)
    expect(await whoIsHere(page)).toEqual(before)
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
    await expect(page.locator(NPC).first()).toBeAttached()
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
  await expect(page.locator(NPC).first()).toBeAttached()
  const settled = await page.evaluate(async () => {
    const el = document.querySelector('[data-npc="momo"]') as HTMLElement
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
