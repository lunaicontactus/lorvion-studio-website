import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * PHASE 6 — the garage as a place where five of them live.
 *
 * The rules are settled in test/living.test.ts, where a minute costs a
 * millisecond. What is checked here is the wiring a unit test cannot see:
 * that the broom really comes out and goes round the crew, that the lights
 * the visitor turns on come on, that the two sound switches are one switch
 * and survive a reload, that nothing plays before a gesture, that no file
 * ever plays over itself, and that the room's depth is a few pixels and not
 * a lurch.
 */

declare global {
  interface Window {
    __plays?: { src: string; at: number }[]
    __media?: HTMLMediaElement[]
  }
}

/** Every play() on any media element, with what it was playing. */
async function spyOnPlay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__plays = []
    window.__media = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__plays!.push({ src: this.currentSrc || this.src, at: performance.now() })
      if (!window.__media!.includes(this)) window.__media!.push(this)
      return play.call(this)
    }
  })
}

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
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('[data-npc]').length > 0)
}

const NAV_SOUND = '[data-sound-toggle]'

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the crew have somewhere to stand for everything they like', async ({ page }) => {
    await enter(page, '?npc=debug')
    // The debug overlay draws every waypoint; the new ones are among them.
    for (const id of ['shelf-front', 'cabinet-front', 'radio-side']) {
      await expect(page.locator(`.npc__waypoint[data-point="${id}"]`).first()).toHaveCount(1)
    }
  })

  test('the broom comes out, sweeps, and goes round the crew rather than through them', async ({ page }) => {
    test.setTimeout(150_000)
    await enter(page)
    const broom = page.locator('.garage__broom')
    await expect(broom).toHaveClass(/is-live/, { timeout: 120_000 })
    // While it is out: it never stands on anybody, and it moves slowly.
    const seen = await page.evaluate(async () => {
      const el = document.querySelector<HTMLElement>('.garage__broom')!
      const read = (): { x: number; w: number } => {
        const m = /translate3d\((-?[\d.]+)px/.exec(el.style.transform)
        return { x: Number(m?.[1] ?? 0), w: el.offsetWidth }
      }
      const feet = (): number[] => [...document.querySelectorAll<HTMLElement>('[data-npc]:not(.is-away)')]
        .map((n) => Number(/translate3d\((-?[\d.]+)px/.exec(n.style.transform)?.[1] ?? NaN))
        .filter((x) => Number.isFinite(x))
      let overlaps = 0
      let fastest = 0
      const phases = new Set<string>()
      let last = read().x
      let lastAt = performance.now()
      while (el.classList.contains('is-live')) {
        const now = read()
        const t = performance.now()
        if (el.dataset['phase']) phases.add(el.dataset['phase'])
        // A dokkaebi is about 110 wide; standing inside the broom's box is
        // an overlap, passing near it is not.
        for (const fx of feet()) if (Math.abs(fx - (now.x + now.w / 2)) < 40) overlaps += 1
        if (t - lastAt > 200) {
          fastest = Math.max(fastest, Math.abs(now.x - last) / (t - lastAt) * 1000)
          last = now.x
          lastAt = t
        }
        await new Promise((r) => requestAnimationFrame(() => r(null)))
      }
      return { overlaps, fastest, phases: [...phases] }
    })
    expect(seen.phases).toContain('sweep')
    expect(seen.phases).toContain('leave')
    expect(seen.overlaps, 'somebody stood inside the broom').toBe(0)
    // The transform is in world units (the room is scaled as a whole), so
    // this is world units a second: the crew walk at 76, and the broom's
    // eased peak is under 100.
    expect(seen.fastest).toBeLessThan(120)
    await expect(broom).not.toHaveClass(/is-live/)
  })

  test('nobody vanishes in the middle of the room, and nobody walks on the spot', async ({ page }) => {
    test.setTimeout(200_000)
    await enter(page)
    // Two minutes is long enough for the stage to send two or three of them
    // out and bring others in, and for the door end to get crowded.
    const seen = await page.evaluate(async () => {
      const xOf = (n: HTMLElement): number => Number(/translate3d\((-?[\d.]+)px/.exec(n.style.transform)?.[1] ?? NaN)
      // Off-screen crew keep thinking but stop writing their transform (the
      // room culls them past the view plus a margin), so a position can only
      // be trusted while it is inside the view. Anyone outside it is not
      // judged: the room cannot show them vanishing there.
      const room = document.querySelector<HTMLElement>('[data-garage-room]')!
      const stage = document.querySelector<HTMLElement>('[data-garage-stage]')!
      const view = (): { x0: number; x1: number } => {
        const m = /translate3d\((-?[\d.]+)px.*scale\(([\d.]+)\)/.exec(room.style.transform)
        const scale = Number(m?.[2] ?? 1)
        const x0 = -Number(m?.[1] ?? 0) / scale
        return { x0: x0 + 40, x1: x0 + stage.clientWidth / scale - 40 }
      }
      const vanished: { who: string; x: number }[] = []
      const wasAway = new Map<string, boolean>()
      const stillWalking = new Map<string, { x: number; since: number }>()
      let longestOnTheSpot = 0
      const t0 = performance.now()
      while (performance.now() - t0 < 150_000) {
        const v = view()
        for (const n of document.querySelectorAll<HTMLElement>('[data-npc]')) {
          const id = n.dataset['npc']!
          const away = n.classList.contains('is-away')
          const x = xOf(n)
          const inView = x > v.x0 && x < v.x1
          // Went off while in view: it must have been at an edge of the
          // boards (the exits are 170 past the last places, 330 and 3306).
          if (away && wasAway.get(id) === false && inView && x > 400 && x < 3240) vanished.push({ who: id, x })
          wasAway.set(id, away)
          if (n.dataset['state'] === 'WALK' && !away && inView) {
            const s = stillWalking.get(id)
            if (!s || Math.abs(s.x - x) > 12) stillWalking.set(id, { x, since: performance.now() })
            else longestOnTheSpot = Math.max(longestOnTheSpot, performance.now() - s.since)
          } else stillWalking.delete(id)
        }
        await new Promise((r) => setTimeout(r, 250))
      }
      return { vanished, longestOnTheSpot }
    })
    expect(seen.vanished, 'somebody disappeared in the room').toEqual([])
    // Standing aside for somebody is a second; the old stuck check let it go
    // on for half a minute.
    expect(seen.longestOnTheSpot, 'walked on the spot').toBeLessThan(9000)
  })

  test('the things the visitor opens light up, and go dark again', async ({ page }) => {
    await enter(page)
    // The door's moonlight is in e2e/outside.spec.ts, with the crossing.
    for (const [id, light] of [['cabinet', 'cabinet'], ['fridge', 'fridge']] as const) {
      // Focus, then Enter: the room pans to a focused thing, where a click
      // on one outside the view has nothing to scroll.
      const thing = page.locator(`[data-object="${id}"]`)
      await thing.focus()
      await page.waitForTimeout(500)
      await thing.press('Enter')
      await expect(page.locator(`[data-light="${light}"]`)).toHaveClass(/is-on/, { timeout: 3000 })
      await expect(page.locator('[data-panel-root].is-open')).toBeVisible({ timeout: 8000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      await expect(page.locator(`[data-light="${light}"]`)).not.toHaveClass(/is-on/)
    }
  })

  test('depth is a few pixels, and only while the camera moves', async ({ page }) => {
    await enter(page)
    const room = page.locator('[data-garage-room]')
    const at = async (): Promise<number> => Number((await room.evaluate((el) => el.style.getPropertyValue('--fgx'))).replace('px', ''))
    const middle = await at()
    expect(Math.abs(middle)).toBeLessThan(1)
    // Drag the room all the way to one wall.
    const box = (await page.locator('[data-garage-stage]').boundingBox())!
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
    await page.mouse.down()
    for (let i = 0; i < 12; i++) await page.mouse.move(box.x + box.width * 0.8 - i * 100, box.y + box.height / 2)
    await page.mouse.up()
    await page.waitForTimeout(1200)
    const wall = await at()
    expect(Math.abs(wall), 'nothing came forward').toBeGreaterThan(2)
    expect(Math.abs(wall), 'too much depth: this would lurch').toBeLessThan(16)
    const sky = await page.locator('.garage__sky').evaluate((el) => el.style.transform)
    expect(sky).toMatch(/translate3d\(-?[\d.]+px/)
  })

  test('nothing plays before the visitor has done anything', async ({ page }) => {
    await spyOnPlay(page)
    await page.addInitScript(() => {
      // A visitor who left sound on last time.
      localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, soundEnabled: true }))
    })
    await page.goto('/', { waitUntil: 'load' })
    await page.waitForTimeout(1500)
    const before = await page.evaluate(() => window.__plays!.length)
    expect(before, 'played before any gesture').toBe(0)
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(1500)
    const after = await page.evaluate(() => window.__plays!.map((p) => p.src))
    // The room's own sound came on with the room: its station and its tone.
    expect(after.some((s) => s.includes('/music/garage'))).toBe(true)
    expect(after.some((s) => s.includes('/ambient'))).toBe(true)
  })

  test('the nav switch and the radio are one switch, and it survives a reload', async ({ page, context }) => {
    await enter(page)
    const nav = page.locator(NAV_SOUND)
    await expect(nav).toHaveAttribute('data-state', 'off')
    await nav.click()
    await expect(nav).toHaveAttribute('data-state', 'on')
    // The radio in the room says the same, and shows what came on with it.
    await page.locator('[data-object="radio"]').click()
    await expect(page.locator('[data-panel-root].is-open')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-radio-freq]')).toContainText('88.1')
    // Off at the radio is off in the nav.
    await page.locator('[data-radio-power]').click()
    await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'false')
    await expect(nav).toHaveAttribute('data-state', 'off')
    // Tune to NIGHT with the power off: that turns it on, from the radio.
    await page.locator('[data-station="1"]').click()
    await expect(nav).toHaveAttribute('data-state', 'on')
    await expect(page.locator('[data-radio-freq]')).toContainText('91.7')
    await page.keyboard.press('Escape')
    // A fresh page in the same browser: the init script that wipes storage
    // is per page, so this one keeps what was saved.
    const again = await context.newPage()
    await again.goto('/', { waitUntil: 'load' })
    await expect(again.locator(NAV_SOUND)).toHaveAttribute('data-state', 'on')
    await again.locator('[data-alley-enter]').click()
    await expect(again.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
    await again.locator('[data-object="radio"]').click()
    await expect(again.locator('[data-panel-root].is-open')).toBeVisible({ timeout: 8000 })
    await expect(again.locator('[data-radio-freq]')).toContainText('91.7')
    await again.close()
  })

  test('no file ever plays over itself', async ({ page }) => {
    test.setTimeout(90_000)
    await spyOnPlay(page)
    await enter(page)
    await page.locator(NAV_SOUND).click()
    await expect(page.locator(NAV_SOUND)).toHaveAttribute('data-state', 'on')
    // The room's tone and NIGHT 91.7 are the same file: tuning to it must
    // not leave the room humming it underneath as well.
    await page.locator('[data-object="radio"]').click()
    await expect(page.locator('[data-panel-root].is-open')).toBeVisible({ timeout: 8000 })
    await page.locator('[data-station="1"]').click()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    const worst = await page.evaluate(async () => {
      let most = 0
      const t0 = performance.now()
      while (performance.now() - t0 < 12_000) {
        const playing = window.__media!.filter((m) => !m.paused && !m.ended).map((m) => m.currentSrc || m.src)
        const counts = new Map<string, number>()
        for (const s of playing) counts.set(s, (counts.get(s) ?? 0) + 1)
        for (const n of counts.values()) most = Math.max(most, n)
        await new Promise((r) => setTimeout(r, 150))
      }
      return most
    })
    expect(worst, 'the same file was playing twice at once').toBeLessThanOrEqual(1)
  })

  test('feet make a sound, one at a time, and only while walking', async ({ page }) => {
    test.setTimeout(90_000)
    await spyOnPlay(page)
    await enter(page)
    await page.locator(NAV_SOUND).click()
    await expect(page.locator(NAV_SOUND)).toHaveAttribute('data-state', 'on')
    const steps = await page.evaluate(async () => {
      const t0 = performance.now()
      // Stretches with nobody walking, as time windows. A step is judged by
      // the window it falls in, not by a sample taken near it: a stalled
      // frame can put two strides inside one sample, and a walker can stop
      // between a stride and the next look.
      const still: { from: number; to: number }[] = []
      let stillSince: number | null = null
      while (performance.now() - t0 < 30_000) {
        const walking = document.querySelectorAll('[data-npc][data-state="WALK"]:not(.is-away)').length
        const now = performance.now()
        if (walking === 0) stillSince ??= now
        else if (stillSince !== null) {
          still.push({ from: stillSince, to: now })
          stillSince = null
        }
        await new Promise((r) => setTimeout(r, 50))
      }
      if (stillSince !== null) still.push({ from: stillSince, to: performance.now() })
      const at = window.__plays!.filter((p) => p.src.includes('crew_step')).map((p) => p.at)
      let gap = Infinity
      for (let i = 1; i < at.length; i++) gap = Math.min(gap, at[i]! - at[i - 1]!)
      // A step well inside a still stretch — past the edges, where a stride
      // and a state change can land in either order — is a step from nobody.
      const orphan = at.filter((t) => still.some((w) => t > w.from + 300 && t < w.to - 300))
      return { count: at.length, gap, orphan: orphan.length }
    })
    expect(steps.count, 'nobody walked in half a minute').toBeGreaterThan(0)
    expect(steps.gap, 'two steps too close together').toBeGreaterThanOrEqual(240)
    expect(steps.orphan, 'footsteps with nobody walking').toBe(0)
  })
})

test.describe('less motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('no broom, no depth', async ({ page }) => {
    await enter(page)
    await page.waitForTimeout(3000)
    await expect(page.locator('.garage__broom')).not.toHaveClass(/is-live/)
    const box = (await page.locator('[data-garage-stage]').boundingBox())!
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
    await page.mouse.down()
    for (let i = 0; i < 12; i++) await page.mouse.move(box.x + box.width * 0.8 - i * 100, box.y + box.height / 2)
    await page.mouse.up()
    await page.waitForTimeout(600)
    const fg = await page.locator('[data-garage-room]').evaluate((el) => el.style.getPropertyValue('--fgx'))
    expect(Number(fg.replace('px', '')) || 0).toBe(0)
  })
})

test.describe('phone, upright', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the radio has somebody beside it and the seat is off it', async ({ page }) => {
    await enter(page, '?npc=debug')
    await expect(page.locator('.npc__waypoint[data-point="radio-side"]').first()).toHaveCount(1)
    // Depth on a strip: vertical, and small.
    const fgy = await page.locator('[data-garage-room]').evaluate((el) => el.style.getPropertyValue('--fgy'))
    expect(Math.abs(Number(fgy.replace('px', '')) || 0)).toBeLessThan(8)
  })
})

test.describe('phone, sideways', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true })

  test('depth is nearly off where the view is already most of the room', async ({ page }) => {
    await enter(page)
    const box = (await page.locator('[data-garage-stage]').boundingBox())!
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2)
    await page.mouse.down()
    for (let i = 0; i < 10; i++) await page.mouse.move(box.x + box.width * 0.8 - i * 70, box.y + box.height / 2)
    await page.mouse.up()
    await page.waitForTimeout(1200)
    const fg = await page.locator('[data-garage-room]').evaluate((el) => el.style.getPropertyValue('--fgx'))
    expect(Math.abs(Number(fg.replace('px', '')) || 0)).toBeLessThan(4)
  })
})
