import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * PHASE I: the touch-target and screen-geometry contract
 * (docs/SITE_UPGRADE_PHASE_I.md, "Touch target contract").
 *
 * On five screens — the smallest phone, a phone either way up, a tablet and a
 * desktop — every control that is shown:
 *   1. is at least 44×44 CSS px, unless it is a link inside a sentence
 *      (WCAG 2.5.8's inline exception) or one of the painted things on the
 *      archive shelf, which have a 44 px equivalent (below);
 *   2. has a 44×44 square of its own that nothing lies over — a scattered
 *      polaroid partly under its neighbour still has one — or, if it is
 *      smaller than that, is the thing under its own middle;
 *   3. is on the screen, unless it lives in a world that pans to it or in a
 *      box that scrolls to it;
 * and no text that is shown is under 10 px, and nothing overflows sideways.
 * This is the audit harness (scratchpad probe audit-i.mjs) made a test.
 */

type Report = { overflowX: number; offscreen: string[]; small: string[]; covered: string[]; tiny: string[] }

function scan([scopeSel, allowUnder]: [string | null, string | null]): Report {
  const scope: ParentNode = (scopeSel ? document.querySelector(scopeSel) : null) ?? document
  const vis = (el: Element): boolean => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return false
    for (let e: Element | null = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05 || (e as HTMLElement).hidden || e.getAttribute('aria-hidden') === 'true') return false
    }
    return !(el.closest('details:not([open])') && !el.matches('summary'))
  }
  const srOnly = (el: Element): boolean => {
    if (el.closest('.visually-hidden:not(:focus-within), .sr-only')) return true
    const r = el.getBoundingClientRect()
    return r.width <= 2 && r.height <= 2
  }
  // A world the visitor pans (the garage, the playground, the secret room): what is past the edge is reached by panning.
  const panned = (el: Element): boolean => !!el.closest('.thing, .npc, [data-place]') && !!el.closest('[data-garage], [data-playground], [data-archive]')
  const scroller = (el: Element): boolean => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e)
      if ((/auto|scroll/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) || (/auto|scroll/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 1)) return true
    }
    return false
  }
  const name = (el: Element): string => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)
  const id = (el: Element): string => `${el.tagName.toLowerCase()}.${String((el as HTMLElement).className || '').trim().split(/\s+/)[0]}[${name(el)}]`
  const inline = (el: Element): boolean => {
    if (el.tagName !== 'A') return false
    const cs = getComputedStyle(el)
    if (cs.display !== 'inline') return false
    const p = el.parentElement
    return !!p && (p.textContent || '').trim().length > (el.textContent || '').trim().length + 8
  }
  // The archive shelf's painted things are as big as the painting makes them;
  // the card's ‹ › (44 px) steps through every one of them (asserted apart).
  const painted = (el: Element): boolean => el.matches('.cab__spot')
  const W = innerWidth
  const H = innerHeight
  const out: Report = { overflowX: 0, offscreen: [], small: [], covered: [], tiny: [] }
  const ctl = [...scope.querySelectorAll('a[href], button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])')].filter((el) => vis(el) && !srOnly(el))
  for (const el of ctl) {
    const r = el.getBoundingClientRect()
    if ((r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) && !panned(el) && !scroller(el) && scopeSel) out.offscreen.push(`${id(el)} ${Math.round(r.left)},${Math.round(r.top)}`)
    if ((r.left < -1 || r.right > W + 1) && !panned(el) && !scroller(el) && !scopeSel) out.offscreen.push(`${id(el)} ${Math.round(r.left)},${Math.round(r.top)}`)
    if (!inline(el) && !painted(el) && Math.min(r.width, r.height) < 43.5) out.small.push(`${id(el)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    if (cx > 0 && cx < W - 1 && cy > 0 && cy < H - 1 && !scroller(el) && !(allowUnder && el.matches(allowUnder))) {
      const own = (x: number, y: number): boolean => { const at = document.elementFromPoint(x, y); return !!at && (el.contains(at) || at.contains(el)) }
      // Its own middle, or — for a big one partly under a neighbour — any 44 px square of its own.
      let free = own(cx, cy)
      if (!free && Math.min(r.width, r.height) >= 44) {
        // A grid at 4 px over what is on screen of it; any 44 px square wholly its own will do.
        const step = 4
        const x0 = Math.max(0, r.left)
        const y0 = Math.max(0, r.top)
        const cols = Math.floor((Math.min(W, r.right) - x0) / step)
        const rows = Math.floor((Math.min(H, r.bottom) - y0) / step)
        const g: boolean[][] = []
        for (let j = 0; j < rows; j++) { g.push([]); for (let i = 0; i < cols; i++) g[j]!.push(own(x0 + i * step + 2, y0 + j * step + 2)) }
        const n = Math.ceil(44 / step)
        for (let j = 0; j + n <= rows && !free; j++) for (let i = 0; i + n <= cols && !free; i++) {
          let all = true
          for (let b = j; b < j + n && all; b++) for (let a = i; a < i + n && all; a++) all = g[b]![a]!
          free = all
        }
      }
      if (!free) out.covered.push(`${id(el)} ← ${id(document.elementFromPoint(cx, cy) ?? document.body)}`)
    }
  }
  for (const el of scope.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,label,span,a,button,figcaption,small,strong,b')) {
    if (!vis(el) || srOnly(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())) continue
    const fs = parseFloat(getComputedStyle(el).fontSize)
    if (fs < 9.95) out.tiny.push(`${id(el)} ${fs.toFixed(1)}px`)
  }
  out.overflowX = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - W
  for (const k of ['offscreen', 'small', 'covered', 'tiny'] as const) out[k] = [...new Set(out[k])]
  return out
}

const clean = { overflowX: 0, offscreen: [], small: [], covered: [], tiny: [] }
/**
 * `allowUnder`: controls that may lie under something by design, said where
 * the check is made. Only one: LIMINAL's case paper, risen on an upright
 * phone, lies over its own tab — the tab that raised it — until it is put
 * away (Escape or ×). Every other tab stays clear of it.
 */
const check = async (page: Page, scope: string | null = null, allowUnder: string | null = null): Promise<Report> => {
  const r = await page.evaluate(scan, [scope, allowUnder] as [string | null, string | null])
  return { ...r, overflowX: Math.max(0, r.overflowX) }
}

const SCREENS = [
  ['320×568', { width: 320, height: 568 }, true],
  ['390×844', { width: 390, height: 844 }, true],
  ['568×320', { width: 568, height: 320 }, true],
  ['844×390', { width: 844, height: 390 }, true],
  ['768×1024', { width: 768, height: 1024 }, true],
  ['1440×900', { width: 1440, height: 900 }, false],
] as const

const PAGES = ['/works.html', '/works/lunai.html', '/works/wormup.html', '/archive.html', '/studio.html', '/support.html', '/contact.html', '/press.html', '/privacy.html', '/terms.html', '/404.html']

async function enterGarage(page: Page, touch: boolean): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('touch-i')) return
      sessionStorage.setItem('touch-i', '1')
      localStorage.clear()
      localStorage.setItem('eungarage:garageHinted', 'true')
      for (const id of ['mugunghwa', 'snack', 'parcel']) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 }))
    } catch { /* private mode */ }
  })
  await page.goto('/?npcseed=7', { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (touch) await enter.tap()
  else await enter.click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(2500)
}

for (const [name, viewport, touch] of SCREENS) {
  test.describe(`touch contract — ${name}`, () => {
    test.use({ viewport, isMobile: touch && viewport.width < 1000, hasTouch: touch })

    test('every page', async ({ page }) => {
      const bad: Record<string, Report> = {}
      for (const path of PAGES) {
        await page.goto(path, { waitUntil: 'networkidle' })
        await page.waitForTimeout(300)
        const r = await check(page)
        if (JSON.stringify(r) !== JSON.stringify(clean)) bad[path] = r
      }
      expect(bad).toEqual({})
    })

    if (viewport.width < 900) {
      test('the menu, open', async ({ page }) => {
        await page.goto('/studio.html', { waitUntil: 'load' })
        await page.locator('.menu-toggle').click()
        await expect(page.locator('#primaryNav')).toHaveClass(/open/)
        await page.waitForTimeout(500)
        // The open sheet covers the bar under it (the brand, the sound switch):
        // what is checked is the sheet and the button that closes it.
        expect(await check(page, '#primaryNav')).toEqual(clean)
        const toggle = await page.locator('.menu-toggle').evaluate((t) => { const r = t.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.menu-toggle') === t })
        expect(toggle).toBe(true)
      })
    }

    test('the image viewers', async ({ page }) => {
      await page.goto('/works/lunai.html', { waitUntil: 'networkidle' })
      await page.locator('[data-shot]').first().click()
      await expect(page.locator('.work-view')).toBeVisible()
      await page.waitForTimeout(600)
      expect(await check(page, '.work-view')).toEqual(clean)
    })

    test('the garage and every thing opened in it', async ({ page }) => {
      await enterGarage(page, touch)
      const bad: Record<string, Report> = {}
      const room = await check(page, '[data-garage]')
      if (JSON.stringify(room) !== JSON.stringify(clean)) bad['garage'] = room
      for (const id of ['pc', 'tv', 'radio', 'fridge', 'shelf', 'workbench', 'parcel', 'cabinet']) {
        const thing = page.locator(`[data-object="${id}"]`)
        await thing.focus()
        await page.waitForTimeout(400)
        await thing.press('Enter')
        await expect(page.locator('[data-panel-root]')).toBeVisible()
        await page.waitForTimeout(1700)
        if (id === 'tv') {
          // A work's channel: its pictures' dots and the way to its page.
          await page.locator('[data-tv-go][aria-label^="CH01"]').click()
          await page.waitForTimeout(1200)
        }
        if (id === 'shelf') {
          // The painted things' equivalent: the card's steppers, after one pick.
          await page.locator('.cab__spot').first().click()
          await page.waitForTimeout(400)
          const steps = await page.locator('[data-cab-step]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height) >= 44 }))
          expect(steps).toEqual([true, true])
        }
        const r = await check(page, '[data-panel-root]')
        if (JSON.stringify(r) !== JSON.stringify(clean)) bad[`panel:${id}`] = r
        if (id === 'cabinet') {
          await page.locator('[data-case-file]').click()
          await page.waitForTimeout(900)
          const c = await check(page, '[data-panel-root]', viewport.height > viewport.width ? '.file__tab--case' : null)
          if (JSON.stringify(c) !== JSON.stringify(clean)) bad['panel:case'] = c
        }
        await page.keyboard.press('Escape')
        await page.waitForTimeout(900)
      }
      // The secret storage (its three stars are seeded above), and its photos.
      const door = page.locator('[data-object="secret-door"]')
      await door.focus()
      await page.waitForTimeout(400)
      await door.press('Enter')
      await page.waitForTimeout(1500)
      if (!(await page.locator('[data-archive]').isVisible())) {
        await door.press('Enter')
        await page.waitForTimeout(2500)
      }
      await expect(page.locator('[data-archive]')).toBeVisible()
      await page.waitForTimeout(1500)
      const store = await check(page, '[data-archive]')
      if (JSON.stringify(store) !== JSON.stringify(clean)) bad['secret-storage'] = store
      const table = page.locator('[data-place="polaroids"]')
      await table.focus()
      await table.press('Enter')
      await page.waitForTimeout(1500)
      const album = await check(page, '[data-panel-root]')
      if (JSON.stringify(album) !== JSON.stringify(clean)) bad['secret:polaroids'] = album
      expect(bad).toEqual({})
    })

    test('the three mini-games, before and during play', async ({ page }) => {
      const bad: Record<string, Report> = {}
      for (const game of ['mugunghwa', 'snack', 'parcel']) {
        await page.goto(`/?play=${game}`, { waitUntil: 'load' })
        const enter = page.locator('[data-alley-enter]')
        if (touch) await enter.tap()
        else await enter.click()
        await expect(page.locator('[data-game-shell]')).toBeVisible({ timeout: 20_000 })
        await page.waitForTimeout(1200)
        // Before play the card is up over the game and its pads, as it should be: the card is what is checked.
        const intro = await check(page, '.game__overlay')
        if (JSON.stringify(intro) !== JSON.stringify(clean)) bad[`${game}:intro`] = intro
        await page.locator('[data-game-start]').click()
        await page.waitForTimeout(3500)
        const play = await check(page, '[data-game-shell]')
        if (JSON.stringify(play) !== JSON.stringify(clean)) bad[`${game}:play`] = play
      }
      expect(bad).toEqual({})
    })
  })
}
