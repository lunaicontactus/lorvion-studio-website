import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * SITE UPGRADE PHASE E — the crew at work, watched.
 *
 * Four visitors: one who only watches, one who clicks through the room, one
 * on a phone, and one who has asked for less motion. What each must never
 * see is a dokkaebi in the radio, five of them on the move, a thing they
 * cannot touch because somebody is standing in front of it, or a crew that
 * forgets what it was doing because it was touched.
 */

/** The boxes on the walkway, as src/data/navigation.ts has them. */
const BOXES = {
  landscape: [{ id: 'radio', x0: 1241, x1: 1391, behind: 1026 }, { id: 'parcel', x0: 3013, x1: 3177, behind: 1065 }],
  portrait: [{ id: 'radio', x0: 388, x1: 498, behind: 1614 }],
}

async function enter(page: Page, query = '?npcseed=7', touch = false): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
      localStorage.setItem('eungarage:garageHinted', 'true')
    } catch { /* private mode */ }
  })
  await page.goto(`/${query}`, { waitUntil: 'load' })
  const e = page.locator('[data-alley-enter]')
  if (touch) await e.tap()
  else await e.click()
  await page.waitForFunction(() => document.querySelectorAll('.npc').length > 0)
  await page.waitForTimeout(1200)
}

interface Sample {
  /** The page's clock when this was read. */
  t: number
  npcs: { id: string; state: string; away: boolean; x: number; y: number; src: string; routine: string | null; seen: boolean }[]
  blocked: string[]
  /** Dokkaebi on screen whose own hit box, at its middle, gives the touch to something else. */
  unreachable: string[]
}

/** Everything the tests below look at, read in one go. */
async function sample(page: Page): Promise<Sample> {
  return page.evaluate(() => {
    const npcs = [...document.querySelectorAll<HTMLElement>('.npc')].map((el) => {
      const m = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(el.style.transform)
      return {
        id: el.dataset['npc']!, state: el.dataset['state'] ?? '', away: el.classList.contains('is-away'),
        x: m ? Number(m[1]) : NaN, y: m ? Number(m[2]) : NaN,
        src: el.querySelector('.npc__art')?.getAttribute('src') ?? '',
        routine: el.dataset['routine'] ?? null,
        // On screen. Off it the room stops writing positions (setOnscreen),
        // so the stored one is stale and catches up when it comes back.
        seen: (() => {
          const r = el.querySelector('.npc__art')!.getBoundingClientRect()
          return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
        })(),
      }
    })
    const blocked: string[] = []
    for (const t of document.querySelectorAll<HTMLElement>('.thing')) {
      const self = t.querySelector('.thing__self, .thing__art') ?? t
      const r = self.getBoundingClientRect()
      if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) continue
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      if (hit?.closest('[data-npc]')) blocked.push(t.dataset['object']!)
    }
    const unreachable: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('.npc:not(.is-away)')) {
      const hit = el.querySelector<HTMLElement>('.npc__hit')
      if (!hit || Number(el.style.opacity || 1) < 0.5) continue
      const r = hit.getBoundingClientRect()
      // The middle of the box, kept on the screen: a finger touches the half
      // of a dokkaebi that is visible. Chrome hit-tests x >= innerWidth - 0.5 as
      // outside the page (elementFromPoint gives null), and a dokkaebi walking
      // off the right edge has its middle exactly on it for one frame —
      // positions are whole world units, and at 1440x900 the room's edge is
      // world x 2760. Sampled there, a reachable dokkaebi read as "→nothing"
      // (runner run 37257478848); the last on-screen column was its own hit box.
      const mid = r.x + r.width / 2
      const cx = Math.min(mid, innerWidth - 1)
      const cy = r.y + r.height / 2
      if (mid < 0 || cx < r.x || cy < 60 || cy > innerHeight) continue
      const got = document.elementFromPoint(cx, cy)
      if (!got?.closest('[data-npc]')) unreachable.push(`${el.dataset['npc']}→${(got?.closest('[data-object]') as HTMLElement | null)?.dataset['object'] ?? got?.className ?? 'nothing'}`)
    }
    return { t: performance.now(), npcs, blocked, unreachable }
  })
}

test.describe('OBSERVER — a visitor who only watches', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a minute of the room: two on the move at most, nobody in the radio, nobody jumping, and jobs being done', async ({ page }) => {
    test.setTimeout(150_000)
    await enter(page)
    const seen: Sample[] = []
    const t0 = Date.now()
    while (Date.now() - t0 < 75_000) {
      seen.push(await sample(page))
      await page.waitForTimeout(300)
    }
    const unreachable = new Set(seen.flatMap((s) => s.unreachable))
    expect([...unreachable], 'a touch on these dokkaebi went to something else').toEqual([])
    expect([...new Set(seen.flatMap((s) => s.blocked))], 'a dokkaebi covered the middle of these').toEqual([])
    const routines = new Set<string>()
    const prev = new Map<string, { x: number; y: number; away: boolean; t: number; seen: boolean }>()
    for (const s of seen) {
      const walking = s.npcs.filter((n) => !n.away && n.state === 'WALK').length
      expect(walking, 'more than two of them walking at once').toBeLessThanOrEqual(2)
      for (const n of s.npcs) {
        if (n.routine) routines.add(`${n.id}:${n.routine}`)
        if (n.away) continue
        for (const b of BOXES.landscape) {
          const inside = n.x > b.x0 && n.x < b.x1 && n.y > b.behind + 0.5
          expect(inside, `${n.id} is standing in the ${b.id} at (${n.x}, ${n.y})`).toBe(false)
        }
        // A wave is for somebody: never while just standing about.
        if (n.state === 'LOOK') expect(n.src, `${n.id} waved at nobody`).not.toMatch(/\/wave\//)
        // Nobody the visitor can see covers more ground than walking can in
        // the time between two looks (no teleports). Only between two looks
        // where it was on screen: off it, the position is not kept up. Measured against the page's own clock: on a
        // busy machine two looks can be seconds apart, and a walk covers
        // hundreds of units in that time. The fastest walk is 87 units a
        // second; being steered round somebody adds at most as much again.
        const p = prev.get(n.id)
        if (p && !p.away && p.seen && n.seen) {
          const secs = (s.t - p.t) / 1000
          expect(Math.hypot(n.x - p.x, n.y - p.y), `${n.id} jumped in ${secs.toFixed(2)}s`).toBeLessThan(180 * secs + 30)
        }
        prev.set(n.id, { x: n.x, y: n.y, away: n.away, t: s.t, seen: n.seen })
      }
    }
    expect(routines.size, `only these jobs were done: ${[...routines].join(', ')}`).toBeGreaterThanOrEqual(2)
  })
})

for (const phone of [false, true]) {
  test.describe(phone ? 'ACTIVE USER — on a phone' : 'ACTIVE USER — at a desk', () => {
    test.use(phone
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
      : { viewport: { width: 1440, height: 900 } })

    test('the PC, the TV, the fridge and the radio, one after another, each opens to the first touch', async ({ page }) => {
      test.setTimeout(120_000)
      await enter(page, '?npcseed=7', phone)
      // Let the crew get going first: the interesting case is somebody walking.
      await page.waitForTimeout(6000)
      for (const id of ['pc', 'tv', 'fridge', 'radio']) {
        const thing = page.locator(`[data-object="${id}"]`)
        // Bring it into view the way the keyboard does, then let go of focus.
        await thing.focus()
        await page.waitForTimeout(700)
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.waitForTimeout(300)
        const at = await thing.evaluate((el) => {
          const r = (el.querySelector('.thing__self, .thing__art') ?? el).getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
        })
        // A real touch at the middle of the thing: nothing forced.
        if (phone) await page.touchscreen.tap(at.x, at.y)
        else await page.mouse.click(at.x, at.y)
        await expect(page.locator('[data-panel-root]'), `${id} did not open`).toBeVisible({ timeout: 6000 })
        await page.waitForTimeout(700)
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-panel-root]')).toBeHidden({ timeout: 6000 })
        await page.waitForTimeout(500)
      }
    })
  })
}

test.describe('STACKING — a dokkaebi drawn in front takes its own touch', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  // The runner once gave a touch on RUKI to the fridge: it had walked in at
  // the back of the boards, drawn over the fridge's feet, while the fridge's
  // touch layer stacked above it (its base, 977, reaches into the boards).
  // Where anybody is standing is chance; the order is not, so it is read here.
  test('nothing but the boxes on the walkway stacks over somebody at the back of the boards', async ({ page }) => {
    await enter(page)
    const got = await page.evaluate(() => {
      // The room's own rule, read off a dokkaebi rather than restated.
      const npc = [...document.querySelectorAll<HTMLElement>('.npc')].find((n) => /translate3d/.test(n.style.transform))!
      const y = Number(/translate3d\((?:-?[\d.]+)px, (-?[\d.]+)px/.exec(npc.style.transform)![1])
      const ownZ = Number(npc.style.zIndex)
      const back = 100 + Math.round(960 / 8)
      const over = [...document.querySelectorAll<HTMLElement>('.thing')]
        .filter((t) => !['radio', 'parcel'].includes(t.dataset['object']!) && Number(t.style.zIndex) >= back)
        .map((t) => `${t.dataset['object']} z${t.style.zIndex}`)
      return { rule: ownZ === 100 + Math.round(y / 8), back, over }
    })
    expect(got.rule, 'a dokkaebi no longer stacks by its feet: this test reads the wrong rule').toBe(true)
    expect(got.over, `over somebody standing at the back of the boards (z${got.back})`).toEqual([])
  })
})

test.describe('MOBILE — 390×844', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('for forty seconds, no dokkaebi stands between a finger and the middle of a thing', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page, '?npcseed=7', true)
    const t0 = Date.now()
    const blocked = new Set<string>()
    while (Date.now() - t0 < 40_000) {
      const s = await sample(page)
      for (const b of s.blocked) blocked.add(b)
      for (const u of s.unreachable) blocked.add(`unreachable ${u}`)
      for (const n of s.npcs) {
        if (n.away) continue
        for (const b of BOXES.portrait) {
          expect(n.x > b.x0 && n.x < b.x1 && n.y > b.behind + 0.5, `${n.id} is standing in the ${b.id}`).toBe(false)
        }
      }
      await page.waitForTimeout(250)
    }
    expect([...blocked], 'a dokkaebi covered these').toEqual([])
  })
})

test.describe('a touch is a moment, not the end of the job', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('touched at the bench, it looks up and goes back to the bench', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    // Somebody working, in view.
    const id = await page.waitForFunction(() => {
      for (const el of document.querySelectorAll<HTMLElement>('.npc')) {
        if (el.dataset['state'] !== 'WORK' || el.classList.contains('is-away')) continue
        const r = el.querySelector('.npc__hit')!.getBoundingClientRect()
        if (r.left > 0 && r.right < innerWidth && r.top > 0 && r.bottom < innerHeight) return el.dataset['npc']
      }
      return null
    }, null, { timeout: 60_000, polling: 200 }).then((h) => h.jsonValue() as Promise<string>)
    const who = page.locator(`[data-npc="${id}"]`)
    const before = await who.evaluate((el) => el.style.transform)
    await page.locator(`[data-npc="${id}"] .npc__hit`).click({ force: true })
    await expect(who).toHaveAttribute('data-state', 'REACT', { timeout: 3000 })
    await expect(who).toHaveAttribute('data-state', 'WORK', { timeout: 8000 })
    expect(await who.evaluate((el) => el.style.transform), 'it went somewhere else').toBe(before)
  })
})

test.describe('REDUCED MOTION', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('nobody moves an inch; a touch is answered and then put back', async ({ page }) => {
    test.setTimeout(90_000)
    await enter(page)
    const first = await sample(page)
    const t0 = Date.now()
    while (Date.now() - t0 < 12_000) {
      const s = await sample(page)
      for (const n of s.npcs) {
        const was = first.npcs.find((m) => m.id === n.id)!
        expect(`${n.x},${n.y}`, `${n.id} moved`).toBe(`${was.x},${was.y}`)
      }
      await page.waitForTimeout(400)
    }
    const id = first.npcs.find((n) => !n.away)!.id
    const who = page.locator(`[data-npc="${id}"]`)
    const pose = await who.evaluate((el) => el.querySelector('.npc__art')!.getAttribute('src'))
    await page.locator(`[data-npc="${id}"] .npc__hit`).click({ force: true })
    await expect(who).toHaveAttribute('data-state', 'REACT', { timeout: 3000 })
    await expect(who).not.toHaveAttribute('data-state', 'REACT', { timeout: 6000 })
    // Back to the picture it was showing, not frozen mid-wave.
    expect(await who.evaluate((el) => el.querySelector('.npc__art')!.getAttribute('src'))).toBe(pose)
    // And the room is all there.
    await expect(page.locator('.thing')).toHaveCount(15)
  })
})
