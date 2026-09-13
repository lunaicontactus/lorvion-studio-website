import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The selection outline, checked in every engine the site claims to support.
 * Geometry is the thing that breaks across engines: objectBoundingBox clip
 * units, non-scaling strokes and an overflowing SVG are all places where one
 * browser quietly disagrees with the others.
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

test('hover draws one heavy silhouette, sized to the object, and takes it away', async ({
  page,
}) => {
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await settle(page)

  const target = page.locator('.thing--pc')
  await target.hover()
  await expect
    .poll(
      async () =>
        page.evaluate(() =>
          [...document.querySelectorAll('.thing')]
            // Placed art (the parcel) has no silhouette to draw; it is never lit.
            .filter((t) => {
              const o = t.querySelector('.thing__outline')
              return o ? Number(getComputedStyle(o).opacity) > 0.5 : false
            })
            .map((t) => (t as HTMLElement).dataset['object']),
        ),
      { timeout: 5000 },
    )
    .toEqual(['pc'])

  const drawn = await target.evaluate((el) => {
    const svg = el.querySelector('.thing__outline') as SVGElement
    const face = getComputedStyle(svg.querySelector('.thing__stroke')!)
    const edge = getComputedStyle(svg.querySelector('.thing__edge')!)
    const box = svg.getBoundingClientRect()
    const hit = el.getBoundingClientRect()
    const room = document.querySelector('.garage__room') as HTMLElement
    const scale = room.getBoundingClientRect().width / room.offsetWidth
    return {
      face: face.strokeWidth,
      edge: edge.strokeWidth,
      shadow: face.filter,
      // The outline is the object's own box pushed out, not the padded hit box.
      grownBy: Math.round((hit.width - box.width) / 2 / scale),
    }
  })

  // Heavy enough to read as a selected object, not a focus ring.
  expect(parseFloat(drawn.face)).toBeGreaterThanOrEqual(4.5)
  expect(parseFloat(drawn.edge)).toBeGreaterThan(parseFloat(drawn.face))
  // No glow, no halo: the contrast comes from the dark path behind.
  expect(drawn.shadow === 'none' || drawn.shadow === '').toBe(true)
  // 12px of hit padding on each side, 3px of outline offset back out.
  expect(drawn.grownBy).toBeGreaterThanOrEqual(7)
  expect(drawn.grownBy).toBeLessThanOrEqual(11)

  await page.mouse.move(20, 700)
  await page.waitForTimeout(300)
  const after = await page.evaluate(
    () =>
      [...document.querySelectorAll('.thing')].filter(
        (t) => (t.querySelector('.thing__outline') ? Number(getComputedStyle(t.querySelector('.thing__outline')!).opacity) > 0.5 : false),
      ).length,
  )
  expect(after).toBe(0)
})
