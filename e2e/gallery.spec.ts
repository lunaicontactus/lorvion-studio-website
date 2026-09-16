import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The wall, and what is actually hanging on it.
 *
 * The room's painting has four posters painted into it. They are decoration —
 * felt-and-thread illustrations of the studio's games, not the games' own art
 * — and for a studio site that is the wrong thing on the wall. What hangs
 * there now is the real work: LUNAI's and LIMINAL's and WORM UP!'s key
 * visuals, LUMIORA's splash, and one of RUBATO's own backgrounds in the painted
 * wooden landscape frame over the television.
 *
 * What these check is the thing that was broken: every one of those pictures
 * is a different shape, and the room used to have one shape for all of them.
 * A 1024x1536 key visual in a 16:9 frame set to `cover` is a picture with two
 * thirds of itself missing, and nothing about the page said so — it just
 * looked like a bad crop. So the measurement here is always the same one: the
 * box the browser drew, against the picture the browser decoded.
 */

const PIECES = [
  { thing: 'poster-lunai', art: 'lunai-keyart', tall: true },
  { thing: 'poster-liminal', art: 'liminal-keyart', tall: true },
  { thing: 'poster-wormup', art: 'wormup-keyart', tall: true },
  { thing: 'poster-lumiora', art: 'lumiora-splash', tall: true },
  { thing: 'picture-rubato', art: 'rubato-opera', tall: false },
] as const

async function enter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.clear()
      localStorage.clear()
    } catch {
      /* private mode */
    }
  })
  await page.goto('/', { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('.print img').length >= 5)
  // Decoded, not merely in the DOM: naturalWidth is what the shape is judged
  // against, and it is zero until the file has arrived.
  await page.waitForFunction(
    () => [...document.querySelectorAll<HTMLImageElement>('.print img')].every((i) => i.naturalWidth > 0),
    null,
    { timeout: 15_000 },
  )
}

/** Every print: what it is, the shape drawn, the shape decoded, the sheet. */
async function prints(page: Page): Promise<{
  id: string; drawn: number; natural: number; inside: boolean; src: string
}[]> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.print')].map((sheet) => {
    const img = sheet.querySelector('img')!
    // Layout boxes, not bounding rects: the sheets are tilted by hand, and a
    // rotated rectangle's bounding box is a different shape from the
    // rectangle. What is being judged is the box the picture was laid into.
    return {
      id: sheet.dataset['artwork'] ?? '',
      drawn: img.offsetHeight ? img.offsetWidth / img.offsetHeight : 0,
      natural: img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0,
      // Inside its own sheet: a picture that reaches past the frame is a
      // picture the frame is not big enough for.
      inside: img.offsetLeft >= -1 && img.offsetTop >= -1
        && img.offsetLeft + img.offsetWidth <= sheet.offsetWidth + 1
        && img.offsetTop + img.offsetHeight <= sheet.offsetHeight + 1,
      src: img.getAttribute('src') ?? '',
    }
  }))
}

for (const view of [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'phone portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'phone landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
] as const) {
  test.describe(view.name, () => {
    test.use(view)

    test('the studio\'s own work is on the wall, one piece per project', async ({ page }) => {
      await enter(page)
      const hung = await prints(page)
      expect(hung.map((p) => p.id).sort()).toEqual(PIECES.map((p) => p.art).slice().sort())
      for (const p of hung) {
        expect(p.src, p.id).toContain(`/artwork/${p.id}-wall.webp`)
      }
    })

    test('no picture on the wall is cropped, whatever shape it is', async ({ page }) => {
      await enter(page)
      for (const p of await prints(page)) {
        expect(p.natural, `${p.id} never decoded`).toBeGreaterThan(0)
        expect(Math.abs(p.drawn - p.natural) / p.natural, `${p.id} is not its own shape`)
          .toBeLessThan(0.03)
        expect(p.inside, `${p.id} hangs off its own paper`).toBe(true)
      }
    })

    test('no white or cream matte: every frame is the picture\'s own shape', async ({ page }) => {
      // The wall used to put every piece on a cream sheet shaped like the
      // painted poster, so a wide picture floated in paper. The frame is now
      // the picture plus an even edge, and that edge is never paper.
      await enter(page)
      const frames = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.print')].map((sheet) => {
        const img = sheet.querySelector('img')!
        const edge = parseFloat(getComputedStyle(sheet).getPropertyValue('--edge')) || 0
        const s = { w: sheet.offsetWidth, h: sheet.offsetHeight }
        const i = { w: img.offsetWidth, h: img.offsetHeight, l: img.offsetLeft, t: img.offsetTop }
        const bg = getComputedStyle(sheet).backgroundColor
        return { id: sheet.dataset['artwork'], mount: sheet.dataset['mount'], s, i, edge, bg,
          hasCaptionStrip: !!sheet.querySelector('.print__cap') }
      }))
      expect(frames).toHaveLength(5)
      for (const f of frames) {
        expect(f.hasCaptionStrip, `${f.id} still has a paper caption strip`).toBe(false)
        // Even edge all round: sheet = picture + 2×edge, picture at (edge, edge).
        expect(Math.abs(f.s.w - (f.i.w + 2 * f.edge)), `${f.id} width matte`).toBeLessThanOrEqual(1)
        expect(Math.abs(f.s.h - (f.i.h + 2 * f.edge)), `${f.id} height matte`).toBeLessThanOrEqual(1)
        expect(f.i.l).toBeCloseTo(f.edge, 0)
        expect(f.i.t).toBeCloseTo(f.edge, 0)
        expect(f.edge, `${f.id} edge is a frame, not a mat`).toBeLessThanOrEqual(6)
        // Whatever the edge is painted, it is not paper-white.
        const [r, g, b] = (f.bg.match(/\d+/g) ?? ['0', '0', '0']).map(Number)
        const alpha = /rgba\(.*,\s*0\)$/.test(f.bg) ? 0 : 1
        if (alpha) expect(Math.min(r!, g!, b!), `${f.id} frame is ${f.bg}`).toBeLessThan(200)
      }
      expect(new Set(frames.map((f) => f.mount)).size, 'one mount for everything is a grid').toBeGreaterThanOrEqual(2)
    })

    test('each print covers the painted thing it hangs over', async ({ page }) => {
      await enter(page)
      const cover = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.thing')]
        .filter((t) => t.querySelector('.print')).map((t) => {
          const sheet = t.querySelector<HTMLElement>('.print')!
          const lift = t.querySelector<HTMLElement>('.thing__lift')
          // The painted rect is the thing minus its hit padding, which is
          // where the lift layer is laid.
          const paintW = lift ? lift.offsetWidth : 0
          const paintH = lift ? lift.offsetHeight : 0
          return { id: t.dataset['object'], w: sheet.offsetWidth, h: sheet.offsetHeight, paintW, paintH }
        }))
      expect(cover.length).toBe(5)
      for (const c of cover) {
        expect(c.paintW, `${c.id}: no painted rect measured`).toBeGreaterThan(0)
        expect(c.w, `${c.id} narrower than the painted one`).toBeGreaterThanOrEqual(c.paintW)
        expect(c.h, `${c.id} shorter than the painted one`).toBeGreaterThanOrEqual(c.paintH)
      }
    })

    test('a tall picture is tall and a wide one is wide', async ({ page }) => {
      // Not a restatement of the last one: this is the thing a single house
      // shape would destroy. If the wall ever goes back to one frame for
      // everything, these two lines are what notices.
      await enter(page)
      const hung = await prints(page)
      const by = new Map(hung.map((p) => [p.id, p]))
      for (const piece of PIECES) {
        const shown = by.get(piece.art)!
        if (piece.tall) expect(shown.drawn, piece.art).toBeLessThan(1)
        else expect(shown.drawn, piece.art).toBeGreaterThan(1)
      }
    })

    test('touching a picture opens it whole, and gives the focus back', async ({ page }) => {
      await enter(page)
      for (const piece of [PIECES[0], PIECES[3]]) {
        const thing = page.locator(`[data-object="${piece.thing}"]`)
        await thing.focus()
        await page.waitForTimeout(600)
        if (view.isMobile) await thing.tap(); else await thing.click()
        const shot = page.locator('[data-artwork-view] img')
        await expect(shot).toBeVisible({ timeout: 8000 })
        await expect(shot).toHaveJSProperty('complete', true)
        const fit = await shot.evaluate((img: HTMLImageElement) => {
          const r = img.getBoundingClientRect()
          return {
            drawn: r.width / r.height,
            natural: img.naturalWidth / img.naturalHeight,
            w: r.width, h: r.height, vw: innerWidth, vh: innerHeight,
            src: img.getAttribute('src') ?? '',
          }
        })
        expect(fit.src, piece.art).toContain(`/artwork/${piece.art}-full.webp`)
        // Opened on the panel itself: no cream mat drawn around the picture.
        const mat = await page.locator('[data-artwork-view]').evaluate((el) => {
          const cs = getComputedStyle(el)
          return { pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft], bg: cs.backgroundColor }
        })
        expect(mat.pad, `${piece.art} viewer has a mat`).toEqual(['0px', '0px', '0px', '0px'])
        expect(mat.bg, `${piece.art} viewer mat colour`).toBe('rgba(0, 0, 0, 0)')
        expect(Math.abs(fit.drawn - fit.natural) / fit.natural, piece.art).toBeLessThan(0.02)
        // Big, but never bigger than the window it opened in.
        expect(fit.w, `${piece.art} wider than the window`).toBeLessThanOrEqual(fit.vw * 0.92)
        expect(fit.h, `${piece.art} taller than the window`).toBeLessThanOrEqual(fit.vh * 0.87)
        await page.keyboard.press('Escape')
        await expect(page.locator('[data-panel-root]')).toBeHidden()
        await expect(thing, 'the focus did not come back').toBeFocused()
      }
    })
  })
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the wall carries the room, not a slideshow of it', async ({ page }) => {
    // The prints are small files, because they are small things: at most a
    // couple of hundred world units across. The big copies are for the
    // viewer and must not be on the way in. A wall that arrives as five
    // 1600px pictures is a wall nobody on a phone gets to see.
    const got: { url: string; size: number }[] = []
    page.on('response', async (r) => {
      if (!r.url().includes('/artwork/')) return
      const len = Number(r.headers()['content-length'] ?? 0)
      got.push({ url: r.url(), size: len })
    })
    await enter(page)
    await page.waitForTimeout(1200)
    expect(got.length, 'nothing was fetched for the wall').toBeGreaterThanOrEqual(5)
    for (const g of got) {
      expect(g.url, 'a full-size picture was fetched before anyone asked for one')
        .toContain('-wall.webp')
    }
    const total = got.reduce((n, g) => n + g.size, 0)
    // The five wall prints together are well under a fifth of a megabyte.
    expect(total, `wall prints total ${total} bytes`).toBeLessThan(220_000)
  })
})
