import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The wall, and what is actually hanging on it.
 *
 * The room's painting has four posters painted into it — felt-and-thread
 * decoration, not the games' own art. What hangs there is the real work:
 * LUNAI's, LIMINAL's and WORM UP!'s key visuals and LUMIORA's splash, each in
 * its own stitched felt frame with a name plate, cut from the studio's own
 * painting of this wall (src/data/wallFrames.ts); and RUBATO's opera house in
 * the wooden landscape frame painted over the television.
 *
 * What these check is what goes wrong with a wall like this: a picture forced
 * into a window of another shape (cropped, or stretched), a painted poster
 * peeking out from behind its frame, frames that do not hang as a set. The
 * measurement is always the box the browser drew against the picture the
 * browser decoded.
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
  await page.waitForFunction(() => document.querySelectorAll('.print img, .frame img').length >= 9)
  // Decoded, not merely in the DOM: naturalWidth is what the shape is judged
  // against, and it is zero until the file has arrived.
  await page.waitForFunction(
    () => [...document.querySelectorAll<HTMLImageElement>('.print img, .frame img')].every((i) => i.naturalWidth > 0),
    null,
    { timeout: 15_000 },
  )
}

/** Every hung piece: what it is, the shape drawn, the shape decoded, its window. */
async function prints(page: Page): Promise<{
  id: string; drawn: number; natural: number; inside: boolean; src: string
}[]> {
  return page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-artwork]')].map((sheet) => {
    // In a felt frame the picture sits in the window's mount; in the wooden
    // frame, in the sheet itself.
    const img = sheet.querySelector<HTMLImageElement>('.frame__img, .print__img')!
    const box = img.parentElement!
    // Layout boxes, not bounding rects: what is judged is the box the picture
    // was laid into.
    return {
      id: sheet.dataset['artwork'] ?? '',
      drawn: img.offsetHeight ? img.offsetWidth / img.offsetHeight : 0,
      natural: img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0,
      // Inside its own window: a picture that reaches past it is cut off.
      inside: img.offsetLeft >= -1 && img.offsetTop >= -1
        && img.offsetLeft + img.offsetWidth <= box.offsetWidth + 1
        && img.offsetTop + img.offsetHeight <= box.offsetHeight + 1,
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

    test('the four works hang in felt frames as one set, RUBATO in the wooden one', async ({ page }) => {
      await enter(page)
      const hung = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-artwork]')].map((sheet) => {
        const felt = sheet.querySelector<HTMLImageElement>('.frame__felt')
        const mount = sheet.querySelector<HTMLElement>('.frame__mount')
        const img = sheet.querySelector<HTMLImageElement>('.frame__img, .print__img')!
        const r = sheet.getBoundingClientRect()
        return {
          id: sheet.dataset['artwork'], mount: sheet.dataset['mount'],
          felt: felt ? felt.naturalWidth : null,
          // How much of the window is picture, and what the rest of it is.
          filled: mount ? (img.offsetWidth * img.offsetHeight) / (mount.offsetWidth * mount.offsetHeight) : 1,
          matBg: mount ? getComputedStyle(mount).backgroundColor : '',
          top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height,
          caption: !!sheet.querySelector('.print__cap, .print__tape'),
        }
      }))
      const frames = hung.filter((f) => f.mount === 'frame')
      expect(frames.map((f) => f.id).sort()).toEqual(['liminal-keyart', 'lumiora-splash', 'lunai-keyart', 'wormup-keyart'])
      expect(hung.filter((f) => f.mount === 'wood').map((f) => f.id)).toEqual(['rubato-opera'])
      for (const f of frames) {
        expect(f.felt, `${f.id}: its felt frame never arrived`).toBeGreaterThan(0)
        expect(f.caption, `${f.id} still has tape or a paper strip`).toBe(false)
        // A mount, not a margin: most of the window is the picture…
        expect(f.filled, `${f.id} floats in its window`).toBeGreaterThan(0.84)
        // …and what is not is felt, never paper.
        const [r, g, b] = (f.matBg.match(/\d+/g) ?? ['255', '255', '255']).map(Number)
        expect(Math.max(r!, g!, b!), `${f.id} mount is ${f.matBg}`).toBeLessThan(120)
      }
      // One row: the frames are much the same height, top to top, and hang
      // apart from each other, left to right.
      const row = [...frames].sort((a, b) => a.left - b.left)
      const tallest = Math.max(...row.map((f) => f.h))
      for (const f of row) {
        expect(Math.abs(f.top - row[0]!.top), `${f.id} hangs out of line`).toBeLessThan(tallest * 0.03)
        expect(f.h / tallest, `${f.id} is not the others' size`).toBeGreaterThan(0.95)
      }
      for (let i = 1; i < row.length; i++) {
        expect(row[i]!.left - row[i - 1]!.right, `${row[i - 1]!.id} and ${row[i]!.id} touch`).toBeGreaterThan(0)
      }
    })

    test('each frame covers the painted poster it hangs over', async ({ page }) => {
      await enter(page)
      const cover = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.thing[data-painted]')].map((t) => {
        const sheet = t.querySelector<HTMLElement>('.frame')!
        const [px, py, pw, ph] = t.dataset['painted']!.split(' ').map(Number)
        const [bx, by, bw, bh] = sheet.dataset['body']!.split(' ').map(Number)
        // All in the thing's own (world) units: offsets, not screen pixels.
        const x = sheet.offsetLeft + bx! * sheet.offsetWidth
        const y = sheet.offsetTop + by! * sheet.offsetHeight
        return { id: t.dataset['object'], body: { l: x, t: y, r: x + bw! * sheet.offsetWidth, b: y + bh! * sheet.offsetHeight },
          painted: { l: px!, t: py!, r: px! + pw!, b: py! + ph! } }
      }))
      expect(cover.length).toBe(4)
      for (const c of cover) {
        expect(c.body.l, `${c.id}: painted poster shows on the left`).toBeLessThanOrEqual(c.painted.l)
        expect(c.body.t, `${c.id}: painted poster shows at the top`).toBeLessThanOrEqual(c.painted.t)
        expect(c.body.r, `${c.id}: painted poster shows on the right`).toBeGreaterThanOrEqual(c.painted.r)
        expect(c.body.b, `${c.id}: painted poster shows at the bottom`).toBeGreaterThanOrEqual(c.painted.b)
      }
      // RUBATO's print covers the painted frame it hangs in (the lift layer is
      // laid on the painted rect).
      const wood = await page.locator('[data-object="picture-rubato"]').evaluate((t) => {
        const sheet = t.querySelector<HTMLElement>('.print')!
        const lift = t.querySelector<HTMLElement>('.thing__lift')!
        return { w: sheet.offsetWidth, h: sheet.offsetHeight, pw: lift.offsetWidth, ph: lift.offsetHeight }
      })
      expect(wood.pw).toBeGreaterThan(0)
      expect(wood.w).toBeGreaterThanOrEqual(wood.pw)
      expect(wood.h).toBeGreaterThanOrEqual(wood.ph)
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
    const frames: { url: string; size: number }[] = []
    page.on('response', async (r) => {
      if (r.url().includes('/garage/frames/')) {
        frames.push({ url: r.url(), size: Number(r.headers()['content-length'] ?? 0) })
        return
      }
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
    // And the four felt frames round them, a fraction of that again.
    expect(frames.length, 'the frames were not fetched').toBe(4)
    const felt = frames.reduce((n, g) => n + g.size, 0)
    expect(felt, `felt frames total ${felt} bytes`).toBeLessThan(100_000)
  })
})
