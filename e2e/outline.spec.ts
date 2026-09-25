import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The thing under the pointer, checked in every engine the site claims to
 * support. A thing reacts by moving — the painting's own pixels, clipped to
 * its silhouette, coming forward — and objectBoundingBox clip units and
 * transformed filters are where one browser quietly disagrees with another.
 */

/** The camera eases in on entry; hovering before it stops misses the object. */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const room = document.querySelector('.garage__room') as HTMLElement | null
    if (!room) return false
    const now = room.style.transform
    const w = window as unknown as { __lastT?: string; __same?: number }
    w.__same = now === w.__lastT ? (w.__same ?? 0) + 1 : 0
    w.__lastT = now
    return (w.__same ?? 0) > 6
  }, undefined, { timeout: 20000 })
}

const PROPS = [
  'parcelStack',
  'zeroCola',
  'packetRamen',
  'bag',
  'eggs',
  'waterPack',
  'cupRamen',
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto('/', { waitUntil: 'load' })
})

test('the entrance puts the week outside the door, and none of it is clickable', async ({
  page,
}) => {
  const props = page.locator('[data-alley-prop]')
  await expect(props).toHaveCount(7)
  // An image that has not decoded yet measures nothing, and the geometry
  // checks below would then pass or fail on the weather.
  // The scene re-lays the plate whenever an image lands or the window moves,
  // so wait for the pictures to decode and then for the geometry to hold
  // still. Measuring in between is how this test used to fail once in a while
  // on WebKit and never on its own.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('img.alley__prop')].every(
        (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
      ),
    undefined,
    { timeout: 20000 },
  )
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-alley-prop="parcelStack"]')
      if (!el) return false
      const now = JSON.stringify(el.getBoundingClientRect())
      const w = window as unknown as { __box?: string; __steady?: number }
      w.__steady = now === w.__box ? (w.__steady ?? 0) + 1 : 0
      w.__box = now
      return (w.__steady ?? 0) > 4
    },
    undefined,
    { timeout: 20000 },
  )
  for (const name of PROPS) {
    const el = page.locator(`[data-alley-prop="${name}"]`)
    await expect(el).toBeVisible()
    // Decoration: not a button, not focusable, and it does not take the click.
    expect(await el.evaluate((n) => n.tagName)).toBe('IMG')
    expect(await el.evaluate((n) => n.getAttribute('tabindex'))).toBeNull()
    expect(await el.evaluate((n) => getComputedStyle(n).cursor)).not.toBe('pointer')
    expect(
      await el.evaluate((n) => {
        const b = n.getBoundingClientRect()
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
        return hit === n
      }),
    ).toBe(false)
  }
  // The door line stays walkable: every prop is wholly to one side of it.
  const door = await page.locator('[data-alley-layer="shutter"]').boundingBox()
  for (const name of PROPS) {
    const b = await page.locator(`[data-alley-prop="${name}"]`).boundingBox()
    const clear = b!.x + b!.width <= door!.x + 1 || b!.x >= door!.x + door!.width - 1
    expect(clear, `${name} must not stand in the doorway`).toBe(true)
  }
})

test('hover lifts the thing itself — no line, no box — and lets it down again', async ({
  page,
}) => {
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await settle(page)

  const target = page.locator('.thing--pc')
  await target.hover()
  // The one thing under the pointer is the one that has come forward.
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.thing')]
            .filter((t) => {
              const self = t.querySelector('.thing__self, .thing__art')
              return self ? Number(getComputedStyle(self).opacity) > 0.5 && getComputedStyle(self).transform !== 'none' : false
            })
            .map((t) => (t as HTMLElement).dataset['object']),
        ),
      { timeout: 5000 },
    )
    .toEqual(['pc'])

  const drawn = await target.evaluate((el) => {
    const self = el.querySelector('.thing__self') as HTMLElement
    const cs = getComputedStyle(self)
    const m = new DOMMatrixReadOnly(cs.transform)
    const paint = self.querySelector('.thing__paint') as HTMLElement
    return {
      scale: m.a,
      filter: cs.filter,
      // The lift is the object's own pixels: the same plate, positioned on itself.
      plate: getComputedStyle(paint).backgroundImage,
      clipped: getComputedStyle(paint).clipPath,
      // Nothing is stroked, nothing is outlined, nothing is boxed.
      strokes: el.querySelectorAll('.thing__stroke, .thing__edge, .thing__outline').length,
      outline: getComputedStyle(el).outlineStyle,
      border: getComputedStyle(el).borderStyle,
      ringSelf: cs.outlineStyle,
    }
  })
  expect(drawn.scale).toBeGreaterThan(1)
  expect(drawn.scale).toBeLessThan(1.05)
  expect(drawn.filter).toContain('drop-shadow')
  expect(drawn.plate).toContain('room_')
  expect(drawn.clipped).toContain('url(')
  expect(drawn.strokes).toBe(0)
  expect(drawn.outline).toBe('none')
  expect(drawn.border).toBe('none')
  expect(drawn.ringSelf).toBe('none')

  await page.mouse.move(20, 700)
  // Where the pointer came to rest is not another thing: if it were, that
  // thing lifting would be right, and this test would be measuring it.
  const under = await page.evaluate(() => (document.elementFromPoint(20, 700)?.closest('.thing') as HTMLElement | null)?.dataset['object'] ?? null)
  expect(under, 'the pointer came to rest on another thing').toBeNull()
  // And everything settles: the lift fades out over its own 120 ms, which
  // a fixed wait raced on a loaded runner. Waited for as an end state, not
  // sampled at one moment; a thing that stays lifted still fails, by name.
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.thing')]
            .map((t) => ({ t: t as HTMLElement, self: t.querySelector('.thing__self') }))
            .filter(({ self }) => (self ? Number(getComputedStyle(self).opacity) > 0.5 : false))
            .map(({ t, self }) => `${t.dataset['object']} [${t.className}] hover=${t.matches(':hover')} focus=${t.matches(':focus-visible')} opacity=${getComputedStyle(self!).opacity}`),
        ),
      { timeout: 2000, message: 'a thing stayed lifted after the pointer left' },
    )
    .toEqual([])
})
