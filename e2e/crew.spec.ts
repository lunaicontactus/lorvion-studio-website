import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Five of them in one room, and what that is supposed to look like.
 *
 * The rules are settled deterministically in test/interactions.test.ts, where
 * the manager is handed a clock and a minute costs a millisecond. What is
 * checked here is the part a unit test cannot see: that the room really does
 * arrange scenes, that a click on a dokkaebi reaches it and gives it back,
 * that a fast hand cannot stack reactions on top of each other, and — the one
 * that must never break again — that nothing any of this does can leave the
 * picture with nobody's face in it.
 */

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

/** Watch the room say what it is doing, and report every scene it ran. */
async function scenes(page: Page, ms: number): Promise<string[]> {
  return page.evaluate(async (span) => {
    const room = document.querySelector<HTMLElement>('[data-garage-room]')
    if (!room) return []
    const seen: string[] = []
    const note = (): void => {
      const now = room.dataset['scene']
      if (now && seen[seen.length - 1] !== now) seen.push(now)
    }
    const watcher = new MutationObserver(note)
    watcher.observe(room, { attributes: true, attributeFilter: ['data-scene'] })
    note()
    await new Promise((r) => setTimeout(r, span))
    watcher.disconnect()
    return seen
  }, ms)
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('things happen between them, one at a time', async ({ page }) => {
    test.setTimeout(180_000)
    await enter(page)
    // Long enough to clear the settling period and get a few attempts in.
    const ran = await scenes(page, 110_000)
    expect(ran.length, 'nothing ever happened between any of them').toBeGreaterThan(0)
    // The room only ever names one at a time, because only one runs.
    const overlapping = await page.evaluate(() =>
      (document.querySelector<HTMLElement>('[data-garage-room]')?.dataset['scene'] ?? '').includes(' '))
    expect(overlapping).toBe(false)
  })

  test('touching one stops it, and gives it back what it was doing', async ({ page }) => {
    await enter(page)
    const who = page.locator('[data-npc]').first()
    const id = await who.getAttribute('data-npc')
    const hit = page.locator(`[data-npc="${id}"] .npc__hit`)
    await hit.click({ force: true })
    await expect(who).toHaveAttribute('data-state', 'REACT', { timeout: 4000 })
    // And it does not stay reacting: the room takes it back.
    await expect(who).not.toHaveAttribute('data-state', 'REACT', { timeout: 12_000 })
  })

  test('a fast hand gets one reaction, not a stutter', async ({ page }) => {
    await enter(page)
    const who = page.locator('[data-npc]').first()
    const id = await who.getAttribute('data-npc')
    const hit = page.locator(`[data-npc="${id}"] .npc__hit`)
    // Count every time it *enters* REACT, so a restarted reaction shows up
    // as a second entry rather than as a longer one.
    await page.evaluate((npc) => {
      const el = document.querySelector<HTMLElement>(`[data-npc="${npc}"]`)!
      const w = window as unknown as Record<string, unknown>
      w['__reacts'] = 0
      let was = el.dataset['state']
      new MutationObserver(() => {
        const now = el.dataset['state']
        if (now === 'REACT' && was !== 'REACT') w['__reacts'] = (w['__reacts'] as number) + 1
        was = now
      }).observe(el, { attributes: true, attributeFilter: ['data-state'] })
    }, id)
    for (let i = 0; i < 8; i++) {
      await hit.click({ force: true })
      await page.waitForTimeout(60)
    }
    await page.waitForTimeout(500)
    const reacts = await page.evaluate(() => (window as unknown as Record<string, number>)['__reacts'])
    expect(reacts, `eight clicks in half a second became ${reacts} reactions`).toBe(1)
  })

  test('a click on a dokkaebi beats whatever the room had planned', async ({ page }) => {
    // The order the whole phase is built on: the visitor outranks the room.
    // Whatever it was doing, a touch reaches it.
    await enter(page)
    const who = page.locator('[data-npc]').first()
    const id = await who.getAttribute('data-npc')
    const hit = page.locator(`[data-npc="${id}"] .npc__hit`)
    await page.waitForTimeout(14_000)
    await hit.click({ force: true })
    await expect(who).toHaveAttribute('data-state', 'REACT', { timeout: 4000 })
  })

  test('nothing any of this does empties the picture of faces', async ({ page }) => {
    test.setTimeout(180_000)
    // The regression this phase must not cause. Measured the way the fix was
    // measured: a drop has to survive a frame to count, because a look taken
    // from outside the room's own frame can catch it mid-sentence.
    await enter(page)
    const fewest = await page.evaluate(async () => {
      const count = (): number =>
        [...document.querySelectorAll('.npc')]
          .filter((e) => !e.classList.contains('is-away'))
          .filter((e) => {
            const src = (e.querySelector('img') as HTMLImageElement | null)?.src ?? ''
            const m = /\/dokkaebi(?:-v2)?\/\w+\/\w+\/(\w+)\//.exec(src)
            return m !== null && m[1] !== 'back'
          }).length
      const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()))
      let worst = Infinity
      const t0 = performance.now()
      while (performance.now() - t0 < 100_000) {
        if (count() < worst) {
          await frame()
          worst = Math.min(worst, count())
        }
        await frame()
      }
      return worst
    })
    expect(fewest, 'the room was all backs while the crew were busy with each other')
      .toBeGreaterThanOrEqual(1)
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('two of them in a narrow room keep out of each other\'s way', async ({ page }) => {
    test.setTimeout(120_000)
    await enter(page)
    // The scenes pull them towards each other on purpose, so this is where
    // that would show: a phone is a third of the room and the spacing rules
    // have less floor to work with.
    const closest = await page.evaluate(async () => {
      const feet = (): { x: number; y: number }[] =>
        [...document.querySelectorAll<HTMLElement>('.npc:not(.is-away)')].map((e) => {
          const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(e.style.transform)
          return { x: Number(m?.[1] ?? 0), y: Number(m?.[2] ?? 0) }
        })
      let worst = Infinity
      const t0 = performance.now()
      while (performance.now() - t0 < 70_000) {
        const all = feet()
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            worst = Math.min(worst, Math.hypot(all[i]!.x - all[j]!.x, all[i]!.y - all[j]!.y))
          }
        }
        await new Promise((r) => setTimeout(r, 250))
      }
      return worst
    })
    // Not a body width — that is the crowd's own business and it pushes them
    // apart over a few frames. This is the floor under "they overlapped".
    expect(closest, `two of them got within ${Math.round(closest)} units`).toBeGreaterThan(40)
  })
})
