import { test, expect, type Page } from '@playwright/test'
// TEMPORARY diagnostic for PR #30: Linux WebKit, playground with earned stars. Not for merge.
test.use({ viewport: { width: 1440, height: 900 } })
const fps = (page: Page): Promise<unknown> => page.evaluate(() => new Promise((resolve) => {
  let frames = 0; let long = 0; let longMs = 0
  const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) { long++; longMs += e.duration } })
  try { po.observe({ type: 'longtask', buffered: false }) } catch { /* unsupported */ }
  const t0 = performance.now()
  const step = (): void => { frames++; if (performance.now() - t0 < 2000) requestAnimationFrame(step); else { po.disconnect(); resolve({ fps: Math.round(frames / 2), long, longMs: Math.round(longMs), anims: document.getAnimations().length }) } }
  requestAnimationFrame(step)
}))
for (const [n, mode] of ['hide-all', 'hide-all', 'hide-all', 'hide-all'].entries()) {
  test(`${mode} #${n}`, async ({ page }) => {
    page.on('crash', () => console.log(`CRASH ${mode} #${n}`))
    await page.addInitScript((m) => {
      try {
        if (sessionStorage.getItem('d')) return
        sessionStorage.setItem('d', '1'); localStorage.clear(); localStorage.setItem('eungarage:garageHinted', 'true')
        if (m !== 'nostars') for (const id of ['mugunghwa', 'snack', 'parcel']) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 }))
        localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, secretProgress: 3 }))
        document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.spot__socket,.thing__seam,.thing__stars{display:none !important}'; document.head.append(st) })

      } catch { /* private mode */ }
    }, mode)
    await page.goto('/?npcseed=7', { waitUntil: 'load' })
    await page.locator('[data-alley-enter]').click()
    await expect(page.locator('[data-garage]')).toBeVisible({ timeout: 20000 })
    await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
    await page.waitForTimeout(3000)
    console.log(mode, n, 'GARAGE', JSON.stringify(await fps(page)), await page.locator('[data-object="secret-door"]').getAttribute('class'))
    const door = page.locator('[data-object="outside-door"]')
    await door.focus(); await page.waitForTimeout(450); await door.press('Enter')
    await expect(page.locator('[data-playground]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-crossing]')).toBeHidden({ timeout: 15000 })
    await expect(page.locator('[data-playground]')).not.toHaveClass(/is-hushed/, { timeout: 15000 })
    console.log(mode, n, 'PLAYGROUND', JSON.stringify(await fps(page)))
    await page.locator('[data-place="garage-door"]').focus()
    await page.waitForTimeout(500)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(4000)
    console.log(mode, n, 'BACK', await page.locator('[data-garage]').isVisible())
  })
}
