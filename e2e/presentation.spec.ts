import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * PHASE 5 — every thing opens as itself.
 *
 * Click → the thing answers in the room (its light, its sound) → its cut-out
 * grows out of it → the content is inside the part of it that would hold it.
 * Close runs backwards: content gone, thing back, camera back. And on the
 * shortest window there is (a phone on its side, 844×390) nothing runs off
 * the page: the layer looks into the surface instead.
 */
const panel = '[data-panel-root]'

/** The things, what they open, and where the content has to be. */
const THINGS = [
  // The list scrolls inside the screen by design; the first row is what has to be in it.
  { id: 'pc', prop: 'pc', surface: '.prop--pc .crt', content: '.prop--pc .hub__row', sfx: 'pc_on', light: 'pc' },
  { id: 'tv', prop: 'tv', surface: '.prop--tv .tvset__screen', content: '.prop--tv .tvnews__line', sfx: 'tv_channel', light: 'tv' },
  { id: 'fridge', prop: 'fridge', surface: '.prop--fridge .fridge__inside', content: '.prop--fridge .fridge__shelves--low', sfx: 'fridge_open', light: 'fridge' },
  // PHASE 6: the open drawer gets a faint warm light of its own.
  { id: 'cabinet', prop: 'cabinet', surface: '.prop--cabinet .drawer__lift', content: '.prop--cabinet .paper', sfx: 'drawer_open', light: 'cabinet' },
  // The shelf has no sound of its own (WORLD 2.1: only delivered sounds), so
  // it is heard as nothing at all — no borrowed click in its place.
  { id: 'shelf', prop: 'shelf', surface: '.prop--shelf', content: '.prop--shelf .cab__spot', sfx: null, light: null },
  { id: 'workbench', prop: 'workbench', surface: '.prop--workbench', content: '.prop--workbench .bench2__img', sfx: 'paper', light: null },
  { id: 'radio', prop: 'radio', surface: '.prop--radio', content: '.prop--radio [data-radio-freq]', sfx: null, light: 'radio' },
  // The outside door is not here: since PHASE 8 it is a crossing, not a
  // thing that stays open, and e2e/outside.spec.ts holds it to the same
  // "reacts first, opens as itself" contract on its way out.
] as const

async function enter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
    // What was played, and when — without the product knowing it is watched.
    const log: { src: string; at: number }[] = []
    ;(window as unknown as { __played: typeof log }).__played = log
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      log.push({ src: this.currentSrc || this.src, at: performance.now() })
      return play.call(this).catch(() => undefined)
    }
  })
  await page.goto('/', { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(900)
  // Sound on, so the effects are actually asked for.
  await page.locator('[data-sound-toggle]').click()
}

async function touch(page: Page, id: string): Promise<void> {
  await page.evaluate((name) => {
    document.querySelector(`.thing--${name}`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }, id)
}

const played = (page: Page): Promise<{ src: string; at: number }[]> =>
  page.evaluate(() => (window as unknown as { __played: { src: string; at: number }[] }).__played)

/** Where the camera is, as numbers: it eases home and lands within a hundredth of a pixel. */
const roomAt = (page: Page): Promise<number[]> =>
  page.evaluate(() => ((document.querySelector('[data-garage-room]') as HTMLElement).style.transform.match(/-?\d+(\.\d+)?/g) ?? []).map(Number))
const near = (a: number[], b: number[]): boolean => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]!) < 1)

async function within(page: Page, inner: string, outer: string, slack = 2): Promise<void> {
  const r = await page.evaluate(([a, b]) => {
    const i = document.querySelector(a!)!.getBoundingClientRect()
    const o = document.querySelector(b!)!.getBoundingClientRect()
    return { i: [i.left, i.top, i.right, i.bottom], o: [o.left, o.top, o.right, o.bottom] }
  }, [inner, outer])
  expect(r.i[0], `${inner} left of ${outer}`).toBeGreaterThanOrEqual(r.o[0]! - slack)
  expect(r.i[1], `${inner} above ${outer}`).toBeGreaterThanOrEqual(r.o[1]! - slack)
  expect(r.i[2], `${inner} right of ${outer}`).toBeLessThanOrEqual(r.o[2]! + slack)
  expect(r.i[3], `${inner} below ${outer}`).toBeLessThanOrEqual(r.o[3]! + slack)
}

for (const view of [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
] as const) {
  test.describe(view.name, () => {
    test.use(view)

    for (const t of THINGS) {
      test(`${t.id}: reacts first, opens as itself, content inside, closes back`, async ({ page }) => {
        await enter(page)
        const before = await roomAt(page)
        const t0 = await page.evaluate(() => performance.now())
        await touch(page, t.id)
        // 1. The thing answers before anything opens: lit, and heard.
        await expect(page.locator(`.thing--${t.id}`)).toHaveClass(/is-active/)
        if (t.light) await expect(page.locator(`.garage__light[data-light="${t.light}"]`)).toHaveClass(/is-on/)
        const sounds = (await played(page)).filter((p) => p.at >= t0)
        const effects = sounds.filter((p) => p.src.includes('/sfx/'))
        if (t.sfx) expect(sounds.some((p) => p.src.includes(`/${t.sfx}.m4a`)), `${t.sfx} was not played (${sounds.map((p) => p.src.split('/').pop()).join(',')})`).toBe(true)
        else expect(effects.map((p) => p.src.split('/').pop()), 'a thing with no sound of its own made one').toEqual([])
        // One sound per touch, never a stock clip on top of the delivered one.
        expect(effects.length, `more than one effect for one touch (${effects.map((p) => p.src.split('/').pop()).join(',')})`).toBeLessThanOrEqual(1)
        expect(sounds.some((p) => /\/(click|door|drawer|bell|discovery|keyboard|surprise|wrapper)\.m4a/.test(p.src)), 'a stock clip played').toBe(false)
        expect(page.locator(panel)).not.toHaveClass(/is-open/)
        // 2. Then its own cut-out, with the content inside its surface.
        await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
        if (t.sfx) {
          const openedAt = (await played(page)).find((p) => p.src.includes(`/${t.sfx}.m4a`))!.at
          expect(openedAt, 'the sound came after the thing opened').toBeLessThan(t0 + 400)
        }
        await expect(page.locator(`.prop[data-prop="${t.prop}"]`)).toBeVisible()
        await expect(page.locator(t.content).first()).toBeVisible({ timeout: 4000 })
        await page.waitForTimeout(700) // the prop has arrived and its doors have swung
        await within(page, t.content, t.surface, 4)
        // No card: the dialog paints nothing of its own.
        expect(await page.locator('.panel').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
        // Nothing runs off the document, and the way out is on screen.
        const over = await page.evaluate(() => ({
          doc: document.documentElement.scrollHeight - innerHeight, x: document.documentElement.scrollWidth - innerWidth,
        }))
        expect(over.doc, 'the page grew taller than the window').toBeLessThanOrEqual(0)
        expect(over.x, 'the page grew wider than the window').toBeLessThanOrEqual(0)
        const close = (await page.locator('.panel__close').boundingBox())!
        expect(close.y + close.height).toBeLessThanOrEqual(view.viewport.height)
        expect(close.x + close.width).toBeLessThanOrEqual(view.viewport.width)
        // 3. Escape: content goes, the thing is put back, the camera returns.
        await page.keyboard.press('Escape')
        await expect(page.locator(panel)).toBeHidden()
        await expect(page.locator(`.thing--${t.id}`)).not.toHaveClass(/is-active/)
        if (t.light) await expect(page.locator(`.garage__light[data-light="${t.light}"]`)).not.toHaveClass(/is-on/)
        await expect.poll(async () => near(await roomAt(page), before), { timeout: 4000 }).toBe(true)
      })
    }

    test('the parcel: lid in the room, the thing above it; the picture: only the picture', async ({ page }) => {
      await enter(page)
      await touch(page, 'parcel')
      await expect(page.locator('.thing--parcel')).toHaveClass(/is-open/)
      await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
      await page.waitForTimeout(1500) // the camera has arrived and the tag has followed it
      const { tag, box } = await page.evaluate(() => {
        const r = (sel: string) => { const b = document.querySelector(sel)!.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height } }
        return { tag: r('[data-delivery]'), box: r('.thing--parcel') }
      })
      // Over the box, not in the middle of the window.
      expect(tag.y + tag.height, 'the tag is not above the box').toBeLessThanOrEqual(box.y + box.height * 0.6)
      expect(Math.abs(tag.x + tag.width / 2 - (box.x + box.width / 2)), 'the tag is not over the box').toBeLessThan(box.width + 60)
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
      await expect(page.locator('.thing--parcel')).not.toHaveClass(/is-open/)

      await touch(page, 'poster-lunai')
      await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
      const img = page.locator('[data-artwork-view] img')
      await expect(img).toBeVisible()
      await page.waitForTimeout(500)
      const pic = (await img.boundingBox())!
      const layer = (await page.locator('.prop--wall').boundingBox())!
      // The picture is most of what opened — on a short window the caption
      // stands beside it, so the share is measured against the prop's height.
      expect(pic.width * pic.height / (layer.width * layer.height)).toBeGreaterThan(view.viewport.height <= 520 ? 0.6 : 0.75)
      expect(pic.height / layer.height).toBeGreaterThan(0.85)
      expect(pic.y).toBeGreaterThanOrEqual(0)
      expect(pic.y + pic.height).toBeLessThanOrEqual(view.viewport.height)
    })
  })
}

test.describe('the fridge, the cabinet and the door move as things', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('doors swing, the drawer pulls, the leaf opens — and each is put back', async ({ page }) => {
    await enter(page)
    await touch(page, 'fridge')
    await expect(page.locator('.prop--fridge')).toHaveClass(/is-open/, { timeout: 6000 })
    const door = page.locator('[data-fridge-door="upper"]')
    await expect.poll(() => door.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11), { timeout: 3000 })
      .toBeLessThan(0.6)
    await expect(page.locator('.fridge__memo')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator(panel)).toBeHidden()

    await touch(page, 'cabinet')
    await expect(page.locator('.prop--cabinet')).toHaveClass(/is-open/, { timeout: 6000 })
    await expect.poll(() => page.locator('[data-cabinet-drawer]').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42), { timeout: 3000 })
      .toBeGreaterThan(4)
    await expect(page.locator('[data-paper]')).toHaveCSS('opacity', '1')
    await expect(page.locator('.file')).toHaveCount(5)
    await page.keyboard.press('Escape')
    await expect(page.locator(panel)).toBeHidden()

    await touch(page, 'outside-door')
    await expect(page.locator('.prop--outside-door')).toHaveClass(/is-open/, { timeout: 6000 })
    await expect.poll(() => page.locator('[data-door-leaf]').evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11), { timeout: 3000 })
      .toBeLessThan(0.7)
    await expect(page.locator('[data-outside-door]')).toHaveClass(/is-ajar/)
    await page.keyboard.press('Escape')
    await expect(page.locator(panel)).toBeHidden()
  })

  test('the radio is tuned on its dial, and the nav switch agrees', async ({ page }) => {
    await enter(page)
    await touch(page, 'radio')
    await expect(page.locator('.prop--radio')).toBeVisible({ timeout: 6000 })
    await page.waitForTimeout(500)
    const needle = page.locator('[data-radio-needle]')
    await page.locator('[data-station="3"]').click()
    await expect(page.locator('[data-radio]')).toHaveAttribute('data-station', 'static')
    await expect.poll(() => needle.evaluate((el) => parseFloat(el.style.getPropertyValue('--at')))).toBeGreaterThan(90)
    await page.locator('[data-station="0"]').click()
    await expect.poll(() => needle.evaluate((el) => parseFloat(el.style.getPropertyValue('--at')))).toBeLessThan(5)
    // The knob is the power. Off here is off in the nav.
    await page.locator('[data-radio-power]').click()
    await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'false')
  })

  test('the room stops using a thing the visitor has open', async ({ page }) => {
    await enter(page)
    await touch(page, 'fridge')
    await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
    await page.waitForTimeout(2500)
    // Nobody is sent to the fridge while it is the visitor's.
    const scene = await page.locator('[data-garage-room]').getAttribute('data-scene')
    expect(scene ?? '').not.toMatch(/fridge/)
    await page.keyboard.press('Escape')
  })

  test('opening and closing ten times leaves one dialog and one set of listeners', async ({ page }) => {
    await enter(page)
    for (let i = 0; i < 10; i++) {
      await touch(page, i % 2 ? 'tv' : 'radio')
      await expect(page.locator(panel)).toHaveClass(/is-open/, { timeout: 6000 })
      await page.keyboard.press('Escape')
      await expect(page.locator(panel)).toBeHidden()
    }
    // The panel's own dialog, once (the archive's sky is another, static
    // and hidden, in the page from the start).
    expect(await page.locator('.panel[role="dialog"]').count()).toBe(1)
    expect(await page.locator('.prop').count()).toBeLessThanOrEqual(1)
    // The sound switch still flips exactly once per press.
    const before = await page.locator('[data-sound-toggle]').getAttribute('aria-pressed')
    await page.locator('[data-sound-toggle]').click()
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true')
  })
})
