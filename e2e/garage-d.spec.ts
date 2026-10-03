import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * SITE UPGRADE PHASE D — the garage's things lead to the site.
 *
 * The alley says what the place is and its mailbox is the way to write; the
 * PC is the works' desktop; the TV shows each work; the records drawer holds
 * LIMINAL's case file; every thing's hit area is its own, at every size.
 */
const SIZES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { name: 'phone, upright', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'phone, sideways', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
] as const

async function fresh(page: Page, hinted = true): Promise<void> {
  await page.addInitScript((h) => {
    try {
      localStorage.clear()
      sessionStorage.clear()
      if (h) localStorage.setItem('eungarage:garageHinted', 'true')
    } catch { /* private mode */ }
  }, hinted)
}

async function enter(page: Page, touch: boolean): Promise<void> {
  const e = page.locator('[data-alley-enter]')
  if (touch) await e.tap()
  else await e.click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(1500)
}

async function open(page: Page, id: string): Promise<void> {
  const t = page.locator(`[data-object="${id}"]`)
  await t.focus()
  await page.waitForTimeout(500)
  await t.press('Enter')
  await expect(page.locator('[data-panel-root]')).toBeVisible({ timeout: 6000 })
  await page.waitForTimeout(900)
}

for (const size of SIZES) {
  test.describe(size.name, () => {
    test.use({ viewport: size.viewport, isMobile: size.isMobile, hasTouch: size.hasTouch })

    test('the alley says what this is, small, and its mailbox is the way to write', async ({ page }) => {
      await fresh(page)
      await page.goto('/', { waitUntil: 'load' })
      const line = page.locator('[data-alley-tagline]')
      await expect(line).toBeVisible({ timeout: 6000 })
      await expect(line).toContainText('게임을 만드는 도깨비들의 밤 작업실')
      await expect(line).toContainText('Games made after dark')
      // A line, not a banner: it never covers the door or the button.
      const l = (await line.boundingBox())!
      const enterBox = (await page.locator('[data-alley-enter]').boundingBox())!
      const shutter = (await page.locator('[data-alley-layer="shutter"]').boundingBox())!
      expect(l.y + l.height <= enterBox.y + 1 || l.y >= enterBox.y + enterBox.height - 1, 'the line sits on the button').toBe(true)
      expect(l.y, 'the line is over the shutter').toBeGreaterThanOrEqual(shutter.y + shutter.height * 0.6)
      expect(l.width).toBeLessThan(size.viewport.width)
      // The mailbox: a real link, a fingertip wide, on the painted mailbox.
      const mail = page.locator('[data-alley-mailbox]')
      await expect(mail).toHaveAttribute('href', '/contact.html')
      const m = (await mail.boundingBox())!
      expect(Math.min(m.width, m.height)).toBeGreaterThanOrEqual(44)
      expect(m.x).toBeGreaterThan(size.viewport.width / 2)
      // Gone once the door starts.
      await enter(page, size.hasTouch)
      await expect(line).toHaveCSS('opacity', '0')
      await expect(mail).toBeHidden()
    })

    test('the mailbox goes to the contact page', async ({ page }) => {
      await fresh(page)
      await page.goto('/', { waitUntil: 'load' })
      const mail = page.locator('[data-alley-mailbox]')
      await expect(mail).toBeVisible({ timeout: 6000 })
      if (size.hasTouch) await mail.tap()
      else await mail.click()
      await expect(page).toHaveURL(/\/contact\.html$/)
      await expect(page.locator('[data-contact]')).toHaveCount(4)
    })

    test('every thing\'s hit area is its own: its middle is itself, none overlap, none under a fingertip', async ({ page }) => {
      await fresh(page)
      await page.goto('/?npcseed=7', { waitUntil: 'load' })
      await enter(page, size.hasTouch)
      const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.thing')].map((t) => t.dataset['object']!))
      expect(ids.length).toBe(15)
      for (const id of ids) {
        // Bring it into view the way the keyboard does, then let go of it.
        await page.locator(`[data-object="${id}"]`).focus()
        await page.waitForTimeout(700)
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
        await page.waitForTimeout(250)
        const r = await page.evaluate((id) => {
          const el = document.querySelector<HTMLElement>(`[data-object="${id}"]`)!
          const self = el.querySelector('.thing__self, .thing__art') ?? el
          const sr = self.getBoundingClientRect()
          const hr = el.getBoundingClientRect()
          const hit = document.elementFromPoint(sr.x + sr.width / 2, sr.y + sr.height / 2)
          const owner = (hit?.closest('.thing') as HTMLElement | null)?.dataset['object'] ?? (hit?.closest('[data-npc]') ? 'npc' : 'other')
          let overlap = 0
          for (const o of document.querySelectorAll<HTMLElement>('.thing')) {
            if (o === el) continue
            const q = o.getBoundingClientRect()
            overlap += Math.max(0, Math.min(hr.right, q.right) - Math.max(hr.left, q.left)) * Math.max(0, Math.min(hr.bottom, q.bottom) - Math.max(hr.top, q.top))
          }
          return { owner, w: hr.width, h: hr.height, overlap }
        }, id)
        // A walking dokkaebi may stand in front of a thing for a moment; that
        // is the crew, not a hit area, and the crew yields to a touch.
        expect(['npc', id], `${id}: its middle belongs to ${r.owner}`).toContain(r.owner)
        expect(Math.min(r.w, r.h), `${id} is smaller than a fingertip`).toBeGreaterThanOrEqual(44)
        expect(r.overlap, `${id} overlaps another thing`).toBe(0)
      }
    })

    test('the PC is the works\' desktop, the TV shows each work, the drawer holds LIMINAL\'s case file — all inside the screen', async ({ page }) => {
      await fresh(page)
      await page.goto('/?npcseed=7', { waitUntil: 'load' })
      await enter(page, size.hasTouch)
      const vw = size.viewport
      const inside = async (sel: string): Promise<void> => {
        const b = (await page.locator(sel).first().boundingBox())!
        expect(b.x, `${sel} off the left`).toBeGreaterThanOrEqual(-1)
        expect(b.x + b.width, `${sel} off the right`).toBeLessThanOrEqual(vw.width + 1)
      }
      const fingertip = async (sel: string): Promise<void> => {
        for (const b of await page.locator(sel).all()) {
          const r = (await b.boundingBox())!
          expect(Math.min(r.width, r.height), `${sel} under a fingertip`).toBeGreaterThanOrEqual(44)
        }
      }
      // PC
      await open(page, 'pc')
      await expect(page.locator('.desk__icon')).toHaveCount(8)
      await inside('.prop--pc .desk')
      await fingertip('.desk__icon')
      await expect(page.locator('.panel__close, [data-panel-close]').first()).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      // TV: one picture fetched at a time, the way to the work's page
      const before = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/works/')).length)
      await open(page, 'tv')
      await expect(page.locator('[data-tv-work="lunai"] .tvwork__frame')).toHaveCount(1)
      await expect(page.locator('[data-tv-view-project]')).toHaveAttribute('href', '/works/lunai.html')
      await page.waitForTimeout(600)
      const fetched = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/works/')).map((e) => e.name.split('/').pop()))
      expect(fetched.length - before, `the TV fetched a whole programme: ${fetched.join(', ')}`).toBeLessThanOrEqual(1)
      await inside('.prop--tv .tvset__screen')
      await fingertip('[data-tv-view-project]')
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
      // The records drawer: LIMINAL's case, one case, the way to the work
      await open(page, 'cabinet')
      const tab = page.locator('[data-case-file]')
      await expect(tab).toBeVisible()
      await fingertip('.prop--cabinet .file__tab')
      // Reachable: nothing in the drawer lies over the tab.
      const reach = await tab.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-case-file]') === el
      })
      expect(reach, 'the case tab is under something').toBe(true)
      if (size.hasTouch) await tab.tap()
      else await tab.click()
      const paper = page.locator('[data-paper="liminal-case"]')
      await expect(paper).toBeVisible()
      await expect(paper).toContainText('두 개의 이름표')
      await expect(paper.locator('[data-case-go]')).toHaveAttribute('href', '/works/liminal.html')
      await inside('[data-paper="liminal-case"]')
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-panel-root]')).toBeHidden()
    })
  })
}

test.describe('the keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('reaches every icon on the PC, shows where it is, and Escape closes', async ({ page }) => {
    await fresh(page)
    await page.goto('/?npcseed=7', { waitUntil: 'load' })
    await enter(page, false)
    await open(page, 'pc')
    const seen = new Set<string>()
    for (let i = 0; i < 20 && seen.size < 8; i++) {
      await page.keyboard.press('Tab')
      const id = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null
        return a?.dataset['game'] ?? a?.dataset['deskItem'] ?? null
      })
      if (id) {
        seen.add(id)
        const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)
        expect(outline, `${id} shows no focus`).not.toBe('none')
      }
    }
    expect([...seen].sort()).toEqual(['archive', 'liminal', 'lumiora', 'lunai', 'mail', 'rubato', 'trash', 'wormup'])
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
  })

  test('the secret door is still the secret storage\'s, and the parcel still brings the week\'s shopping', async ({ page }) => {
    await fresh(page)
    await page.goto('/?npcseed=7', { waitUntil: 'load' })
    await enter(page, false)
    const door = page.locator('[data-object="secret-door"]')
    await expect(door).toHaveAttribute('aria-label', /비밀문/)
    await expect(door.locator('.thing__star')).toHaveCount(3)
    await open(page, 'parcel')
    const got = await page.locator('[data-delivery]').getAttribute('data-delivery')
    expect(got, 'the parcel brought news that does not exist').not.toMatch(/^news:/)
    expect(got).toBeTruthy()
  })
})
