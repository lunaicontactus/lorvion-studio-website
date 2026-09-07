/**
 * Opens every panel and photographs it, at desktop and phone size, so the
 * contents are judged as pages rather than as markup. Run against the preview:
 *   npx vite preview --port 4173 &
 *   node scripts/panel-shots.mjs [origin]
 * Output: e2e/shots/panel-<width>-<name>.png
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const origin = process.argv[2] ?? 'http://localhost:4173'
const browser = await chromium.launch()
mkdirSync('e2e/shots', { recursive: true })

const objects = ['pc', 'tv', 'fridge', 'cabinet', 'workbench', 'shelf', 'secret-door', 'poster-lunai']

for (const vp of [{ w: 1440, h: 900 }, { w: 390, h: 844 }]) {
  const page = await browser.newPage({
    viewport: { width: vp.w, height: vp.h },
    hasTouch: vp.w < 500,
    isMobile: vp.w < 500,
  })
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
  })
  await page.goto(origin, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(1400)

  for (const id of objects) {
    // Open straight from the room's own click path, whatever the camera shows.
    await page.evaluate((name) => {
      document.querySelector(`.thing--${name}`)?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }))
    }, id)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `e2e/shots/panel-${vp.w}-${id}.png` })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }
  // The hub's own route into a game.
  await page.evaluate(() => {
    document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  await page.locator('[data-game="rubato"]').click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `e2e/shots/panel-${vp.w}-hub-rubato.png` })
  console.warn(vp.w, 'done')
  await page.close()
}
await browser.close()
