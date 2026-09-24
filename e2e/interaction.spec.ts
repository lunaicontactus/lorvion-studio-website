import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Touching things, the way a point-and-click game has it: the thing itself
 * comes forward under the pointer, gives under the finger, and nothing is
 * ever drawn round it. And the places outside are where the painting shows
 * them: the point a visitor would aim at lands on the right hit area, at
 * every size of window, measured on the rendered page.
 */
const VIEWS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, mobile: false },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, mobile: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, mobile: true },
] as const

/** Where a visitor aims, in the plate's own units: the middle of what is painted. */
const AIM = {
  landscape: { 'poko-office': [290, 255], 'snack-stall': [800, 300], 'parcel-office': [1450, 290], signpost: [460, 670], 'garage-door': [865, 650] },
  portrait: { 'poko-office': [258, 315], 'snack-stall': [415, 650], 'parcel-office': [820, 540], signpost: [145, 1170], 'garage-door': [480, 1150] },
} as const

async function enterGarage(page: Page): Promise<void> {
  await page.addInitScript(() => { try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ } })
  await page.goto('/?npcseed=7', { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(1500)
}

async function enterPlayground(page: Page, mobile: boolean): Promise<void> {
  await page.addInitScript(() => { try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ } })
  await page.goto('/#playground', { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForFunction(() => !document.querySelector<HTMLElement>('[data-playground]')!.hidden, null, { timeout: 15000 })
  await page.waitForTimeout(5500)
}

/** What a thing's own layer is doing. */
const state = (page: Page, sel: string) => page.locator(sel).evaluate((el) => {
  const self = el.querySelector<HTMLElement>('.thing__self, .thing__art, .spot__self')!
  const cs = getComputedStyle(self)
  const m = new DOMMatrixReadOnly(cs.transform === 'none' ? 'matrix(1,0,0,1,0,0)' : cs.transform)
  return { opacity: Number(cs.opacity), scale: m.a, filter: cs.filter }
})

/** Anything that would read as a box: a stroked path, a ring, an outline, a border. */
const boxes = (page: Page) => page.evaluate(() => {
  const out: string[] = []
  for (const el of document.querySelectorAll<HTMLElement>('.thing, .spot')) {
    const cs = getComputedStyle(el)
    if (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') out.push(`${el.className}: outline`)
    if (cs.borderStyle !== 'none' && cs.borderWidth !== '0px') out.push(`${el.className}: border`)
    if (el.querySelector('.thing__outline, .thing__stroke, .thing__edge')) out.push(`${el.className}: stroke`)
    const ring = el.querySelector<HTMLElement>('.spot__ring')
    if (ring && Number(getComputedStyle(ring).opacity) > 0.05) out.push(`${el.className}: ring`)
  }
  return out
})

for (const view of VIEWS) {
  test.describe(view.name, () => {
    test.use({ viewport: view.viewport, isMobile: view.mobile, hasTouch: view.mobile })

    test('in the garage, every thing reacts as itself and nothing is boxed', async ({ page }) => {
      await enterGarage(page)
      const ids: string[] = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.thing')].map((t) => t.dataset['object']!))
      expect(ids.length).toBeGreaterThan(10)
      for (const id of ids) {
        const thing = page.locator(`[data-object="${id}"]`)
        // Bring it into view the way a keyboard user would; then, with
        // nothing focused and the pointer away, it must be doing nothing.
        await thing.focus()
        await page.waitForTimeout(700)
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.mouse.move(2, view.viewport.height / 2)
        await page.waitForTimeout(200)
        const rest = await state(page, `[data-object="${id}"]`)
        expect(rest.opacity === 0 || rest.scale === 1, `${id} is doing something at rest`).toBe(true)
        if (!view.mobile) {
          const box = (await thing.boundingBox())!
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          await page.waitForTimeout(260)
          const hover = await state(page, `[data-object="${id}"]`)
          expect(hover.opacity, `${id} does not react to the pointer`).toBeGreaterThan(0.5)
          expect(hover.scale, `${id} does not come forward`).toBeGreaterThan(1)
          expect(hover.scale, `${id} jumps`).toBeLessThan(1.06)
          expect(hover.filter, `${id} throws no shadow`).toContain('drop-shadow')
        }
        // Pressed (the pointer down, not yet a click): the thing gives.
        await thing.dispatchEvent('pointerdown')
        await page.waitForTimeout(120)
        const down = await state(page, `[data-object="${id}"]`)
        expect(down.scale, `${id} does not give when pressed`).toBeLessThan(1)
        await thing.dispatchEvent('pointerup')
        await page.mouse.move(2, view.viewport.height / 2)
        await page.waitForTimeout(300)
        expect(await boxes(page), `${id}: something is drawn round a thing`).toEqual([])
      }
    })

    test('outside, every place is where it is painted, and reacts as itself', async ({ page }) => {
      await enterPlayground(page, view.mobile)
      const portrait = view.viewport.height > view.viewport.width
      const aim = AIM[portrait ? 'portrait' : 'landscape']
      for (const [id, [px, py]] of Object.entries(aim)) {
        const spot = page.locator(`[data-place="${id}"]`)
        // Bring the place into the view, then aim where the painting shows it.
        await spot.focus()
        await page.waitForTimeout(900)
        const hit = await page.evaluate(([x, y]) => {
          const world = document.querySelector<HTMLElement>('[data-playground-world]')!
          const r = world.getBoundingClientRect()
          const s = r.width / world.offsetWidth
          const sx = r.left + x * s
          const sy = r.top + y * s
          const el = document.elementFromPoint(sx, sy)
          return { place: el?.closest<HTMLElement>('[data-place]')?.dataset['place'] ?? null, sx, sy }
        }, [px, py] as const)
        expect(hit.place, `${id}: aiming at the painting lands on ${hit.place}`).toBe(id)
        // The hit area is generous, but its middle is the painting's middle.
        const box = (await spot.boundingBox())!
        const dx = Math.abs(box.x + box.width / 2 - hit.sx)
        const dy = Math.abs(box.y + box.height / 2 - hit.sy)
        expect(dx, `${id} hit area is off sideways`).toBeLessThan(box.width * 0.25)
        expect(dy, `${id} hit area is off up or down`).toBeLessThan(box.height * 0.25)
        if (!view.mobile) {
          await page.mouse.move(hit.sx, hit.sy)
          await page.waitForTimeout(260)
          const hover = await state(page, `[data-place="${id}"]`)
          expect(hover.opacity, `${id} does not react`).toBeGreaterThan(0.5)
          expect(hover.scale, `${id} does not come forward`).toBeGreaterThan(1)
          expect(hover.filter).toContain('drop-shadow')
          await page.mouse.move(2, 2)
        }
      }
      expect(await boxes(page)).toEqual([])
      // The fires are few, small, and never over a place or under a finger.
      const fires = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.playground__fire')].map((f) => {
        const r = f.getBoundingClientRect()
        const cs = getComputedStyle(f)
        const over = [...document.querySelectorAll<HTMLElement>('[data-place]')].filter((p) => {
          const b = p.getBoundingClientRect()
          const cx = r.left + r.width / 2
          const cy = r.top + r.height * 0.7
          return cx > b.left && cx < b.right && cy > b.top && cy < b.bottom
        }).map((p) => p.dataset['place'])
        return { w: r.width, opacity: Number(cs.opacity), pointer: cs.pointerEvents, over }
      }))
      expect(fires.length).toBeLessThanOrEqual(3)
      for (const f of fires) {
        expect(f.pointer).toBe('none')
        expect(f.opacity).toBeLessThan(0.7)
        expect(f.over, `a fire sits over ${f.over.join(',')}`).toEqual([])
      }
    })
  })
}

test.describe('the doors', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('a door is pressed, gives, and then opens — never a highlighted box', async ({ page }) => {
    await enterGarage(page)
    const door = page.locator('[data-object="outside-door"]')
    await door.focus()
    await page.waitForTimeout(800)
    const box = (await door.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.waitForTimeout(260)
    const hover = await state(page, '[data-object="outside-door"]')
    expect(hover.scale).toBeGreaterThan(1)
    await page.mouse.down()
    await page.waitForTimeout(100)
    const pressed = await state(page, '[data-object="outside-door"]')
    expect(pressed.scale, 'the door does not give').toBeLessThan(1)
    await page.mouse.up()
    // Released: the door itself opens (its leaf swings in its cut-out) and
    // the light comes through, before the night takes over.
    await expect(page.locator('.prop--outside-door')).toHaveClass(/is-open/, { timeout: 6000 })
    await expect(page.locator('[data-outside-door]')).toHaveClass(/is-ajar/)
    expect(await boxes(page)).toEqual([])
    await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 10000 })
  })
})
