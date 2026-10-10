import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * PHASE I: keyboard, focus and the accessibility tree (docs/SITE_UPGRADE_PHASE_I.md).
 *
 * The audit (docs/SITE_UPGRADE_PHASE_I_AUDIT.md) found the TV's VIEW PROJECT
 * under an invisible layer (I-1), Tab leaving the parcel's dialog (I-2), eleven
 * invisible stops in the home page's own links (I-3), the phone menu letting
 * Tab and taps through (I-4), and an aria-checked on the radio itself (I-12).
 * Each has a check here, and axe runs over every page and four open panels.
 */

const ROUTES = ['/works.html', '/works/lunai.html', '/works/liminal.html', '/archive.html', '/studio.html', '/support.html', '/contact.html', '/press.html', '/privacy.html', '/terms.html', '/account-deletion.html', '/community-guidelines.html', '/404.html']
const PANELS = ['pc', 'tv', 'radio', 'fridge', 'cabinet', 'shelf', 'workbench', 'parcel'] as const

async function enterGarage(page: Page, touch = false): Promise<void> {
  await page.addInitScript(() => {
    try {
      if (sessionStorage.getItem('a11y-i')) return
      sessionStorage.setItem('a11y-i', '1')
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
  await page.waitForTimeout(1500)
}

async function openByKeyboard(page: Page, id: string): Promise<void> {
  const thing = page.locator(`[data-object="${id}"]`)
  await thing.focus()
  await page.waitForTimeout(400)
  await thing.press('Enter')
  await expect(page.locator('[data-panel-root]')).toBeVisible()
  await page.waitForTimeout(1200)
}

/** Where focus is: inside the open panel or not, and what it is. */
const focusInPanel = (page: Page): Promise<{ inPanel: boolean; what: string }> =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return { inPanel: !!el?.closest('[data-panel-root]'), what: `${el?.tagName.toLowerCase()}.${String(el?.className ?? '').split(' ')[0]}` }
  })

test.describe('axe — WCAG 2.2 A/AA, no violations', () => {
  for (const [name, view] of [
    ['phone 390×844', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ['desktop 1440×900', { viewport: { width: 1440, height: 900 } }],
  ] as const) {
    test.describe(name, () => {
      test.use(view)

      test('every page', async ({ page }) => {
        const found: string[] = []
        for (const route of ROUTES) {
          await page.goto(route, { waitUntil: 'networkidle' })
          await page.waitForTimeout(300)
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
          for (const v of r.violations) found.push(`${route} ${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
        }
        expect(found).toEqual([])
      })

      test('the alley, the garage and its panels', async ({ page }) => {
        const found: string[] = []
        const scan = async (state: string): Promise<void> => {
          const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
          for (const v of r.violations) {
            // The archive shelf's painted things are as small as the painting
            // makes them (15-41 px wide on a phone); the card's 44 px ‹ › steps
            // through all fourteen — WCAG 2.5.8's "equivalent" exception, which
            // axe cannot see. Anything else that is too small still fails.
            const nodes = v.id === 'target-size' ? v.nodes.filter((n) => !n.target.join(' ').includes('data-cab=')) : v.nodes
            if (nodes.length) found.push(`${state} ${v.impact} ${v.id}: ${nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
          }
        }
        await page.goto('/', { waitUntil: 'load' })
        await scan('alley')
        await enterGarage(page, 'hasTouch' in view)
        await scan('garage')
        for (const id of ['pc', 'tv', 'radio', 'cabinet', 'shelf', 'fridge']) {
          await openByKeyboard(page, id)
          await scan(`panel:${id}`)
          await page.keyboard.press('Escape')
          await page.waitForTimeout(800)
        }
        expect(found).toEqual([])
      })
    })
  }
})

test.describe('keyboard and focus — desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('no page puts anything ahead of the reading order (no tabindex > 0)', async ({ page }) => {
    const ahead: string[] = []
    for (const route of ['/', ...ROUTES]) {
      await page.goto(route, { waitUntil: 'load' })
      const n = await page.evaluate(() => [...document.querySelectorAll('[tabindex]')].filter((e) => Number(e.getAttribute('tabindex')) > 0).length)
      if (n) ahead.push(`${route}: ${n}`)
    }
    expect(ahead).toEqual([])
  })

  for (const id of PANELS) {
    test(`${id}: focus goes in, Tab and Shift+Tab stay in, Escape gives it back to the ${id}`, async ({ page }) => {
      await enterGarage(page)
      await openByKeyboard(page, id)
      expect((await focusInPanel(page)).inPanel).toBe(true)
      const out: string[] = []
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Tab')
        const f = await focusInPanel(page)
        if (!f.inPanel) out.push(`Tab ${i}: ${f.what}`)
      }
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press('Shift+Tab')
        const f = await focusInPanel(page)
        if (!f.inPanel) out.push(`Shift+Tab ${i}: ${f.what}`)
      }
      expect(out).toEqual([])
      // The room behind is not reachable while the dialog is up.
      const dialog = await page.evaluate(() => {
        const d = document.querySelector('[data-panel-root] [role="dialog"]')
        return { modal: d?.getAttribute('aria-modal'), labelled: !!(d?.getAttribute('aria-labelledby') || d?.getAttribute('aria-label')) }
      })
      expect(dialog).toEqual({ modal: 'true', labelled: true })
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      await expect(page.locator(`[data-object="${id}"]`)).toBeFocused()
    })
  }

  test('the home page\'s own links are seen when they are reached by Tab (I-3)', async ({ page }) => {
    await enterGarage(page)
    // By the keyboard, from the last thing in the room onwards.
    let reached = false
    for (let i = 0; i < 80 && !reached; i++) {
      await page.keyboard.press('Tab')
      reached = await page.evaluate(() => !!document.activeElement?.matches('nav.page-links a'))
    }
    expect(reached).toBe(true)
    const link = page.locator('nav.page-links a:focus')
    const seen = await link.evaluate((a) => {
      const r = a.getBoundingClientRect()
      const cs = getComputedStyle(a)
      return {
        onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        big: r.width >= 44 && r.height >= 44,
        ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
        topmost: !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('nav.page-links'),
      }
    })
    expect(seen).toEqual({ onScreen: true, big: true, ring: true, topmost: true })
    // And away again once focus leaves them.
    await page.locator('[data-object="tv"]').focus()
    const gone = await page.locator('nav.page-links').evaluate((n) => n.getBoundingClientRect().width <= 2)
    expect(gone).toBe(true)
  })

  test('the TV: VIEW PROJECT takes a click, the noise over the tube does not (I-1)', async ({ page }) => {
    await enterGarage(page)
    await openByKeyboard(page, 'tv')
    await page.locator('[data-tv-go][aria-label^="CH01"]').click()
    const go = page.locator('[data-tv-view-project]')
    await expect(go).toBeVisible()
    await page.waitForTimeout(700)
    const top = await go.evaluate((a) => {
      const r = a.getBoundingClientRect()
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-tv-view-project]') === a
    })
    expect(top).toBe(true)
    await go.click()
    await expect(page).toHaveURL(/\/works\/lunai(\.html)?$/, { timeout: 10_000 })
  })

  test('the radio: only the stations are radios (I-12)', async ({ page }) => {
    await enterGarage(page)
    await openByKeyboard(page, 'radio')
    await page.locator('[data-station="2"]').click()
    const tree = await page.evaluate(() => ({
      rootChecked: document.querySelector('[data-radio]')?.hasAttribute('aria-checked'),
      checked: [...document.querySelectorAll('[aria-checked]')].map((e) => `${e.getAttribute('role')}:${e.getAttribute('aria-checked')}`),
    }))
    expect(tree.rootChecked).toBe(false)
    expect(tree.checked).toEqual(['radio:false', 'radio:false', 'radio:true', 'radio:false'])
    // Arrow-free radio group: each station is its own Tab stop, Space picks it.
    await page.locator('[data-station="0"]').focus()
    await page.keyboard.press('Space')
    await expect(page.locator('[data-station="0"]')).toHaveAttribute('aria-checked', 'true')
  })
})

test.describe('the phone menu (I-4)', () => {
  for (const [name, vp] of [['390×844', { width: 390, height: 844 }], ['320×568', { width: 320, height: 568 }], ['568×320', { width: 568, height: 320 }], ['844×390', { width: 844, height: 390 }]] as const) {
    test.describe(name, () => {
      test.use({ viewport: vp, isMobile: true, hasTouch: true })

      test('opens, keeps Tab in, scroll-locks, every link reachable, Escape and an outside tap close it', async ({ page }) => {
        await page.goto('/works.html', { waitUntil: 'load' })
        const toggle = page.locator('.menu-toggle')
        await toggle.focus()
        await page.keyboard.press('Enter')
        await expect(page.locator('#primaryNav')).toHaveClass(/open/)
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
        const locked = await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden' || getComputedStyle(document.documentElement).overflow === 'hidden')
        expect(locked).toBe(true)
        const out: string[] = []
        for (const key of ['Tab', 'Shift+Tab']) {
          for (let i = 0; i < 10; i++) {
            await page.keyboard.press(key)
            const inNav = await page.evaluate(() => !!document.activeElement?.closest('.site-nav'))
            if (!inNav) out.push(`${key} ${i}`)
          }
        }
        expect(out).toEqual([])
        // Every link: scrolled to if it must be, then wholly on screen and the thing under the finger.
        const links = page.locator('#primaryNav a')
        for (let i = 0; i < (await links.count()); i++) {
          const a = links.nth(i)
          await a.scrollIntoViewIfNeeded()
          const ok = await a.evaluate((el) => {
            const r = el.getBoundingClientRect()
            return r.top >= 0 && r.bottom <= innerHeight && r.height >= 44 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('a') === el
          })
          expect(ok, await a.innerText()).toBe(true)
        }
        await page.keyboard.press('Escape')
        await expect(page.locator('#primaryNav')).not.toHaveClass(/open/)
        await expect(toggle).toBeFocused()
        // Outside the links: the shade itself closes it.
        await toggle.tap()
        await expect(page.locator('#primaryNav')).toHaveClass(/open/)
        await page.touchscreen.tap(8, vp.height - 8)
        await expect(page.locator('#primaryNav')).not.toHaveClass(/open/)
      })
    })
  }
})

test.describe('turning the phone (orientation, no reload)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('the garage and the open cabinet follow, and the case tab stays the finger\'s', async ({ page }) => {
    await enterGarage(page, true)
    await expect(page.locator('[data-garage]')).toHaveAttribute('data-orientation', 'portrait')
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.locator('[data-garage]')).toHaveAttribute('data-orientation', 'landscape')
    await page.waitForTimeout(1200)
    await openByKeyboard(page, 'cabinet')
    await expect(page.locator('.prop--cabinet')).toHaveClass(/is-tray/)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1200)
    await expect(page.locator('.prop--cabinet')).not.toHaveClass(/is-tray/)
    const tab = await page.locator('[data-case-file]').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return r.bottom <= innerHeight && r.top >= 0 && document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-case-file]') === el
    })
    expect(tab).toBe(true)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('focus still shows on a thing, without anything moving', async ({ page }) => {
    await enterGarage(page)
    const tv = page.locator('[data-object="tv"]')
    // Reached by the keyboard, so it is :focus-visible.
    await tv.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(tv).toBeFocused()
    const s = await tv.evaluate((el) => {
      const self = el.querySelector<HTMLElement>('.thing__self')!
      const cs = getComputedStyle(self)
      return { shown: Number(cs.opacity) === 1, ring: cs.filter.includes('drop-shadow'), still: cs.transform === 'none', instant: cs.transitionDuration.split(',').every((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000) <= 1) }
    })
    expect(s).toEqual({ shown: true, ring: true, still: true, instant: true })
  })
})
