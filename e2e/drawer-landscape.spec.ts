import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * The records drawer on every screen (fixed 2026-10-09).
 *
 * On a phone on its side the folder's 44 px tabs outgrew the cabinet's doors
 * and rose under the drawn paper: the paper already lay over the top 12 px of
 * LIMINAL's case tab at 844×390, one more wrapped line (Linux fonts) covered
 * its middle, and the cabinet ran 51 px off the bottom. Now a short landscape
 * window shows the cabinet whole with the paper and the folder in two columns
 * beside it. Every paper in the pool is tried, two lines longer than it is.
 */
const SRC = readFileSync('src/data/garage/cabinet.ts', 'utf8')
const PAPERS = [...SRC.matchAll(/\{ id: '([^']+)', kind: '(\w+)', title: '([^']+)', description: (['"])(.*?)\4/g)]
  .map((m) => ({ id: m[1]!, kind: m[2]!, title: m[3]!, text: m[5]! }))
const LONGER = ' 다른 글꼴에서 한 줄이 더 감기는 경우를 흉내 내려고 붙인 문장이 이어진다.'

async function openDrawer(page: Page, touch: boolean): Promise<void> {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear(); localStorage.setItem('eungarage:garageHinted', 'true') } catch { /* private mode */ }
  })
  await page.goto('/?npcseed=7', { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (touch) await enter.tap()
  else await enter.click()
  await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20_000 })
  const cabinet = page.locator('[data-object="cabinet"]')
  await cabinet.focus()
  await page.waitForTimeout(500)
  await cabinet.press('Enter')
  await expect(page.locator('[data-case-file]')).toBeVisible({ timeout: 8000 })
  // The drawer has come out and the paper has risen.
  await expect(page.locator('.prop--cabinet')).toHaveClass(/is-open/)
  await page.waitForTimeout(900)
}

for (const [name, view, tray] of [
  ['phone sideways 844×390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, true],
  ['phone sideways 812×375', { viewport: { width: 812, height: 375 }, isMobile: true, hasTouch: true }, true],
  ['phone upright 390×844', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, false],
  ['desktop 1440×900', { viewport: { width: 1440, height: 900 } }, false],
] as const) {
  test.describe(`records drawer — ${name}`, () => {
    test.use(view)

    test('every paper, even two lines longer, leaves the whole case tab to the finger; the drawer is on screen', async ({ page }) => {
      await openDrawer(page, 'hasTouch' in view)
      await expect(page.locator('.prop--cabinet')).toHaveClass(tray ? /is-tray/ : /^(?!.*is-tray)/)
      // On the screen: the folder, every tab, the paper's place.
      const fits = await page.evaluate(() => {
        const inView = (r: DOMRect): boolean => r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
        return {
          tabs: [...document.querySelectorAll('.prop--cabinet .file__tab')].every((e) => inView(e.getBoundingClientRect())),
          folder: inView(document.querySelector('[data-drawer]')!.getBoundingClientRect()),
          lift: inView(document.querySelector('[data-cabinet-lift]')!.getBoundingClientRect()),
        }
      })
      expect(fits).toEqual({ tabs: true, folder: true, lift: true })
      if (tray) {
        // The cabinet itself is whole too (it ran 51 px off the bottom).
        const art = (await page.locator('.prop--cabinet .prop__art').boundingBox())!
        expect(art.y + art.height).toBeLessThanOrEqual(view.viewport.height + 1)
      }
      expect(PAPERS.length).toBeGreaterThanOrEqual(10)
      for (const paper of PAPERS) {
        for (const extra of [0, 1, 2]) {
          const stolen = await page.evaluate(([p, text]) => {
            const lift = document.querySelector('[data-cabinet-lift]')!
            lift.innerHTML = `<article class="paper paper--${p.kind}" data-paper="${p.id}"><h3 class="paper__title">${p.title}</h3><p class="paper__body">${text}</p></article>`
            const el = document.querySelector('[data-case-file]')!
            const tab = el.getBoundingClientRect()
            const out: string[] = []
            for (let x = tab.left + 2; x < tab.right - 1; x += 6) {
              for (let y = tab.top + 2; y < tab.bottom - 1; y += 6) {
                const at = document.elementFromPoint(x, y)
                if (!at?.closest('[data-case-file]')) out.push(at ? `${at.tagName.toLowerCase()}.${String(at.className)}` : 'nothing')
              }
            }
            return [...new Set(out)]
          }, [paper, paper.text + LONGER.repeat(extra)] as const)
          expect(stolen, `${paper.id} +${extra} lines takes part of the case tab`).toEqual([])
        }
      }
    })

    test("the case file opens beside the folder, the tab stays readable, and the way to LIMINAL is there", async ({ page }) => {
      await openDrawer(page, 'hasTouch' in view)
      const tab = page.locator('[data-case-file]')
      if ('hasTouch' in view) await tab.tap()
      else await tab.click()
      await expect(page.locator('[data-paper="liminal-case"]')).toBeVisible()
      // A tapped tab keeps its hover on a touch screen: it must stay dark.
      await expect(tab).toHaveCSS('background-color', /rgb\((44, 47, 58|58, 62, 76)\)/)
      const go = page.locator('[data-case-go]')
      await expect(go).toBeInViewport()
      const reach = await go.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-case-go]') === el
      })
      expect(reach).toBe(true)
      await expect(go).toHaveAttribute('href', /liminal/)
    })
  })
}
