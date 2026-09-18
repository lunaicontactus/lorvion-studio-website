import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * PHASE 8/9/10 — through the door, and the world outside.
 *
 * The outside door is a crossing, not a thing that stays open: it reacts
 * like the rest of the room (moonlight, its own sound, its cut-out), and
 * then the night comes in and the playground is on the other side. Back
 * is the way home and finds the room as it was. Outside, the three
 * buildings, the signpost and the arch are places in the painting with
 * nothing drawn twice; each building grows out of its place when touched,
 * and its game is played inside it and comes back to the playground.
 */

declare global {
  interface Window {
    __plays?: { src: string; at: number; volume: number }[]
    __media?: HTMLMediaElement[]
  }
}

async function spyOnPlay(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__plays = []
    window.__media = []
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__plays!.push({ src: this.currentSrc || this.src, at: performance.now(), volume: this.volume })
      if (!window.__media!.includes(this)) window.__media!.push(this)
      return play.call(this)
    }
  })
}

async function enter(page: Page, opts: { readonly sound?: boolean; readonly hash?: string } = {}): Promise<void> {
  await page.addInitScript((on) => {
    try {
      sessionStorage.clear()
      localStorage.clear()
      if (on) localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, soundEnabled: true }))
    } catch {
      /* private mode */
    }
  }, opts.sound === true)
  await page.goto(`/${opts.hash ?? ''}`, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
}

/** Open a thing the way a keyboard user does: the room pans to it first. */
async function touch(page: Page, id: string): Promise<void> {
  const thing = page.locator(`[data-object="${id}"]`)
  await thing.focus()
  await page.waitForTimeout(400)
  await thing.press('Enter')
}

const outside = (page: Page, timeout = 6000): Promise<void> =>
  expect(page.locator('[data-playground]')).toBeVisible({ timeout })

async function goOut(page: Page): Promise<void> {
  await touch(page, 'outside-door')
  await outside(page)
  await page.waitForTimeout(800) // the night has gone out again
}

const worldTransform = (page: Page): Promise<string> =>
  page.locator('[data-playground-world]').evaluate((el) => el.style.transform)

for (const view of [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: 'phone, upright', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'phone, sideways', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
] as const) {
  test.describe(view.name, () => {
    test.use(view)

    test('the door reacts, opens as itself, and then the night comes in and the playground is there', async ({ page }) => {
      await spyOnPlay(page)
      await enter(page, { sound: true })
      const t0 = await page.evaluate(() => performance.now())
      await touch(page, 'outside-door')
      // 1. Reacts first: lit, and heard, before anything opens.
      await expect(page.locator('.thing--outside-door')).toHaveClass(/is-active/)
      await expect(page.locator('.garage__light[data-light="moon"]')).toHaveClass(/is-on/)
      // 2. Its own cut-out, the leaf swinging onto the night — and the
      // sound came before it, on the reaction, not on the panel.
      await expect(page.locator('.prop--outside-door .dark.is-ajar')).toBeVisible({ timeout: 4000 })
      const ajarAt = await page.evaluate(() => performance.now())
      const sounds = await page.evaluate(() => window.__plays!.map((p) => ({ n: p.src.split('/').pop(), at: p.at })))
      const door = sounds.find((s) => s.n === 'door_open.m4a')
      expect(door, 'the door made no sound').toBeDefined()
      expect(door!.at).toBeGreaterThanOrEqual(t0)
      expect(door!.at, 'the sound came after the leaf swung').toBeLessThan(ajarAt)
      // 3. The crossing: night in, the room gone, the playground up, night out.
      await expect(page.locator('[data-crossing]')).toHaveClass(/is-dark/, { timeout: 3000 })
      await outside(page)
      const crossedAt = await page.evaluate(() => performance.now())
      expect(crossedAt - t0, 'the crossing took too long').toBeLessThan(3200)
      await expect(page.locator('[data-garage]')).toBeHidden()
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      expect(await page.evaluate(() => location.hash)).toBe('#playground')
      await expect(page.locator('[data-crossing]')).not.toHaveClass(/is-dark/, { timeout: 2000 })
      // The world outside: five places, three fires, the foreground over all.
      await expect(page.locator('.spot')).toHaveCount(5)
      expect(await page.locator('.playground__fire').count()).toBeGreaterThanOrEqual(2)
      expect(await page.locator('.playground__fire').count()).toBeLessThanOrEqual(4)
      await expect(page.locator('.playground__front')).toBeVisible()
      // 4. The sound crossed with it: the room's music down and paused, the
      // playground's up from silence.
      await page.waitForTimeout(1600)
      const after = await page.evaluate(() => {
        const el = (re: RegExp) => window.__media!.find((m) => re.test(m.currentSrc || m.src))
        const world = el(/music\/playground/)
        return {
          station: el(/music\/garage/)?.paused ?? null,
          tone: el(/ambient\.m4a/)?.paused ?? null,
          world: world ? { paused: world.paused, volume: world.volume } : null,
          worldStart: window.__plays!.find((p) => /music\/playground/.test(p.src))?.volume ?? null,
        }
      })
      expect(after.station, 'the garage music kept playing outside').toBe(true)
      expect(after.tone, 'the room tone kept playing outside').toBe(true)
      expect(after.world?.paused, 'no music outside').toBe(false)
      expect(after.worldStart!, 'the playground music cut in').toBeLessThan(0.05)
      expect(after.world!.volume).toBeGreaterThan(0.2)
    })

    test('Back is the way home, and the room is as it was', async ({ page }) => {
      await spyOnPlay(page)
      await enter(page, { sound: true })
      const crewBefore = await page.locator('[data-npc]').count()
      await goOut(page)
      await page.goBack()
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
      await expect(page.locator('[data-playground]')).toBeHidden()
      expect(await page.evaluate(() => location.hash)).toBe('')
      await expect(page.locator('.garage__light[data-light="moon"]')).not.toHaveClass(/is-on/)
      await expect(page.locator('.thing--outside-door')).not.toHaveClass(/is-active/)
      // The crew are still the crew, and still moving.
      expect(await page.locator('[data-npc]').count()).toBe(crewBefore)
      const states = await page.evaluate(async () => {
        const seen = new Set<string>()
        const t0 = performance.now()
        while (performance.now() - t0 < 6000) {
          for (const n of document.querySelectorAll<HTMLElement>('[data-npc]:not(.is-away)')) seen.add(n.dataset['state'] ?? '')
          await new Promise((r) => setTimeout(r, 200))
        }
        return [...seen]
      })
      expect(states.length, 'the crew stood frozen after coming back').toBeGreaterThan(1)
      // The room's sound is back and the playground's is not.
      await page.waitForTimeout(1200)
      const audio = await page.evaluate(() => {
        const el = (re: RegExp) => window.__media!.find((m) => re.test(m.currentSrc || m.src))
        return { station: el(/music\/garage/)?.paused, world: el(/music\/playground/)?.paused }
      })
      expect(audio.station).toBe(false)
      expect(audio.world).toBe(true)
      // And the things in the room still open.
      await touch(page, 'cabinet')
      await expect(page.locator('[data-panel-root].is-open')).toBeVisible({ timeout: 6000 })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
    })

    test('the arch outside is the way home too, and Forward goes out again', async ({ page }) => {
      await enter(page)
      await goOut(page)
      await page.locator('[data-place="garage-door"]').click()
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
      await expect(page.locator('[data-playground]')).toBeHidden()
      // Out again, then Back, then Forward: still one playground, one room.
      await goOut(page)
      await page.goBack()
      await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 6000 })
      await page.goForward()
      await outside(page)
      await expect(page.locator('[data-playground-world]')).toHaveCount(1)
      await expect(page.locator('.spot')).toHaveCount(5)
    })

    test('every place is a real target, and the foreground never covers one', async ({ page }) => {
      await enter(page)
      await goOut(page)
      for (const id of ['poko-office', 'snack-stall', 'parcel-office', 'signpost', 'garage-door']) {
        const spot = page.locator(`[data-place="${id}"]`)
        await spot.focus()
        await page.waitForTimeout(900)
        const box = (await spot.boundingBox())!
        expect(Math.min(box.width, box.height), `${id} is smaller than a finger`).toBeGreaterThanOrEqual(44)
        // In the viewport, and what is under its middle is the place itself.
        const cx = box.x + box.width / 2
        const cy = box.y + box.height / 2
        expect(cx, `${id} is off screen`).toBeGreaterThan(0)
        expect(cx, `${id} is off screen`).toBeLessThan(view.viewport.width)
        expect(cy, `${id} is off screen`).toBeGreaterThan(0)
        expect(cy, `${id} is off screen`).toBeLessThan(view.viewport.height)
        const under = await page.evaluate(([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('.spot')?.getAttribute('data-place') ?? null, [cx, cy] as const)
        expect(under, `${id} is covered`).toBe(id)
      }
      // The foreground takes no pointer, and the buildings are not drawn twice:
      // only the plate paints them; the cut-outs live in the panel, when open.
      expect(await page.locator('.playground__front').evaluate((el) => getComputedStyle(el).pointerEvents)).toBe('none')
      await expect(page.locator('[data-playground-world] img[src*="poko_office"], [data-playground-world] img[src*="snack_stall"], [data-playground-world] img[src*="parcel_office"]')).toHaveCount(0)
    })

    test('a building grows out of its place, and its game is played inside it and comes back', async ({ page }) => {
      test.setTimeout(90_000)
      await enter(page)
      await goOut(page)
      for (const [id, title] of [['poko-office', '무궁화'], ['snack-stall', '야식'], ['parcel-office', '택배']] as const) {
        const spot = page.locator(`[data-place="${id}"]`)
        await spot.focus()
        await page.waitForTimeout(700)
        await spot.press('Enter')
        await expect(page.locator(`.prop--place[data-prop="${id}"]`)).toBeVisible({ timeout: 6000 })
        await expect(spot).toHaveClass(/is-active/)
        await expect(page.locator('.place__enter')).toBeVisible()
        await page.locator('.place__enter').click()
        await expect(page.locator('[data-game-shell]')).toBeVisible({ timeout: 6000 })
        await expect(page.locator('#gameTitle')).toContainText(title)
        // The way out says where it goes.
        await expect(page.locator('[data-game-exit]')).toHaveText('놀이터로')
        await page.locator('[data-game-exit]').click()
        await expect(page.locator('[data-game-shell]')).toHaveCount(0)
        await outside(page, 3000)
        await expect(page.locator('[data-panel-root]')).toBeHidden()
        await expect(spot).not.toHaveClass(/is-active/)
      }
    })

    test('the signpost is a hint, not a menu: an arm takes you to look', async ({ page }) => {
      await enter(page)
      await goOut(page)
      const sign = page.locator('[data-place="signpost"]')
      await expect(sign).toHaveAttribute('aria-label', '이정표')
      await sign.focus()
      await page.waitForTimeout(700)
      await sign.press('Enter')
      await expect(page.locator('[data-signpost]')).toBeVisible({ timeout: 6000 })
      await expect(page.locator('.sign__arm')).toHaveCount(3)
      await expect(page.locator('.sign__arm').nth(2)).toHaveAttribute('aria-label', '택배 사무소 쪽')
      const before = await worldTransform(page)
      await page.locator('.sign__arm').nth(2).click()
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      await page.waitForTimeout(900)
      // The camera went to look, and nothing opened.
      expect(await worldTransform(page)).not.toBe(before)
      await expect(page.locator('[data-game-shell]')).toHaveCount(0)
    })
  })
}

test.describe('desktop only', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a change of mind at the door stays in the room', async ({ page }) => {
    await enter(page)
    await touch(page, 'outside-door')
    await expect(page.locator('.prop--outside-door')).toBeVisible({ timeout: 4000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    await page.waitForTimeout(2500)
    await expect(page.locator('[data-playground]')).toBeHidden()
    await expect(page.locator('[data-garage]')).toBeVisible()
    await expect(page.locator('.garage__light[data-light="moon"]')).not.toHaveClass(/is-on/)
  })

  test('arriving on #playground goes straight out once the door is open', async ({ page }) => {
    await enter(page, { hash: '#playground' })
    await outside(page, 4000)
    await expect(page.locator('[data-garage]')).toBeHidden()
  })

  test('a reload outside comes back outside', async ({ page }) => {
    await enter(page)
    await goOut(page)
    await page.reload({ waitUntil: 'load' })
    await page.locator('[data-alley-enter]').click()
    await outside(page, 8000)
  })

  test('Escape closes a place outside, and Back does too', async ({ page }) => {
    await enter(page)
    await goOut(page)
    const spot = page.locator('[data-place="snack-stall"]')
    await spot.focus()
    await page.waitForTimeout(600)
    await spot.press('Enter')
    await expect(page.locator('.prop--place')).toBeVisible({ timeout: 6000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    await expect(spot).not.toHaveClass(/is-active/)
    await spot.press('Enter')
    await expect(page.locator('.prop--place')).toBeVisible({ timeout: 6000 })
    await page.goBack()
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    await outside(page, 2000)
  })
})

test.describe('less motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('the crossing is a cut, both ways, and the fires stand still', async ({ page }) => {
    await enter(page)
    const t0 = Date.now()
    await touch(page, 'outside-door')
    await outside(page, 3000)
    expect(Date.now() - t0).toBeLessThan(1800)
    await expect(page.locator('.playground__fire')).toHaveCount(0)
    await page.goBack()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 2000 })
  })
})
