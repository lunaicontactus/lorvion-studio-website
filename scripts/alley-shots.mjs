/**
 * Screenshots the entrance at the sizes it has to work at, so the props are
 * judged as a composition rather than as numbers. Run against the preview:
 *   npx vite preview --port 4173 &
 *   node scripts/alley-shots.mjs [origin]
 * Output: e2e/shots/alley-<width>.png
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const origin = process.argv[2] ?? 'http://localhost:4173'
const browser = await chromium.launch()
mkdirSync('e2e/shots', { recursive: true })

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }, { w: 390, h: 844 }]) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
  })
  await page.goto(origin, { waitUntil: 'load' })
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `e2e/shots/alley-${vp.w}.png` })
  const props = await page.evaluate(() =>
    [...document.querySelectorAll('[data-alley-prop]')].map((el) => {
      const b = el.getBoundingClientRect()
      return `${el.dataset.alleyProp} ${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}`
    }))
  console.warn(vp.w, props.join(' | '))
  await page.close()
}
await browser.close()
