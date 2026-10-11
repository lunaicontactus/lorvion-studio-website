import { test, expect, type Page } from '@playwright/test'
// TEMPORARY diagnostic for PR #30: why Enter on the playground's garage door does not bring the room back on Linux WebKit.
test.use({ viewport: { width: 1440, height: 900 } })
const state = (page: Page): Promise<unknown> => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null
  const pg = document.querySelector<HTMLElement>('[data-playground]')
  return {
    active: a ? `${a.tagName}.${a.className.split(' ')[0]}[${a.dataset['place'] ?? ''}]` : null,
    pgHidden: pg?.hidden, pgClass: pg?.className, garageHidden: document.querySelector<HTMLElement>('[data-garage]')?.hidden,
    crossingHidden: document.querySelector<HTMLElement>('[data-crossing]')?.hidden,
    panelHidden: document.querySelector<HTMLElement>('[data-panel-root]')?.hidden ?? null,
    inert: [...document.querySelectorAll('[inert]')].map((e) => `${e.tagName}#${e.id}.${String(e.className).split(' ')[0]}`),
    hash: location.hash, bootError: document.documentElement.dataset['bootError'] ?? null,
  }
})
for (const mode of ['journey-b-stars', 'stars-only', 'journey-b-stars']) {
  test(`out and back by keyboard, sound via ${mode}`, async ({ page }) => {
    const log: string[] = []
    page.on('console', (m) => log.push(`console.${m.type()}: ${m.text()}`))
    page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`))
    await page.addInitScript(() => {
      try {
        if (sessionStorage.getItem('d')) return
        sessionStorage.setItem('d', '1'); localStorage.clear(); localStorage.setItem('eungarage:garageHinted', 'true')
        for (const id of ['mugunghwa', 'snack', 'parcel']) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 }))
      } catch { /* private mode */ }
    })
    await page.goto('/?npcseed=7', { waitUntil: 'load' })
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20000 })
    await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
    await page.waitForTimeout(1500)
    const open = async (id: string): Promise<void> => { const t = page.locator(`[data-object="${id}"]`); await t.focus(); await page.waitForTimeout(450); await t.press('Enter'); await page.waitForTimeout(1200) }
        if (mode === 'journey-b-stars') {
      for (const id of ['tv', 'radio', 'fridge']) {
        await open(id)
        if (id === 'radio') await page.locator('[data-station="1"]').click()
        await page.keyboard.press('Escape'); await page.waitForTimeout(500)
      }
      { await open('cabinet'); await page.locator('[data-case-file]').click(); await page.waitForTimeout(800); await page.keyboard.press('Escape'); await page.waitForTimeout(500) }
    }
    console.log('SOUND', mode, await page.evaluate(() => document.querySelector('[data-sound-toggle]')?.getAttribute('aria-pressed')))
    const door = page.locator('[data-object="outside-door"]')
    await door.focus(); await page.waitForTimeout(450); await door.press('Enter')
    await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-crossing]')).toBeHidden({ timeout: 15000 })
    await expect(page.locator('[data-playground]')).not.toHaveClass(/is-hushed/, { timeout: 15000 })
    console.log('ARRIVED', JSON.stringify(await state(page)))
    await page.locator('[data-place="garage-door"]').focus()
    await page.waitForTimeout(500)
    console.log('FOCUSED', JSON.stringify(await state(page)))
    await page.keyboard.press('Enter')
    await page.waitForTimeout(4000)
    console.log('AFTER ENTER', JSON.stringify(await state(page)))
    if (await page.locator('[data-garage]').isHidden()) {
      await page.locator('[data-place="garage-door"]').click()
      await page.waitForTimeout(4000)
      console.log('AFTER CLICK', JSON.stringify(await state(page)))
    }
    console.log('LOG', log.join(' | ').slice(0, 2000))
  })
}
