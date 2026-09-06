/**
 * Hovers every object in the garage and saves what the screen actually shows.
 * The camera is driven across the room because the room moves by transform and
 * nothing can be scrolled into view. Run against the local preview:
 *   npx vite preview --port 4173 &
 *   node scripts/hover-shots.mjs [origin] [chromium|webkit|firefox]
 * Output: e2e/shots/hover-<width>-<id>.png
 */
import { chromium, webkit, firefox } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const origin = process.argv[2] ?? 'http://localhost:4173'
const engineName = process.argv[3] ?? 'chromium'
const engine = { chromium, webkit, firefox }[engineName]
if (!engine) throw new Error(`unknown engine: ${engineName}`)
const tag = engineName === 'chromium' ? '' : `-${engineName}`
const browser = await engine.launch()
mkdirSync('e2e/shots', { recursive: true })

const sizes = engineName === 'chromium'
  ? [{ w: 1440, h: 900 }, { w: 1920, h: 1080 }]
  : [{ w: 1440, h: 900 }]
for (const vp of sizes) {
  const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
  })
  await page.goto(origin, { waitUntil: 'load' })
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(1400)

  const seen = new Set()
  const drag = async (dx) => {
    await page.mouse.move(vp.w / 2, vp.h / 2)
    await page.mouse.down()
    for (let i = 1; i <= 6; i++) await page.mouse.move(vp.w / 2 + (dx * i) / 6, vp.h / 2)
    await page.mouse.up()
    await page.waitForTimeout(450)
  }
  for (const step of [0, 900, 900, 900, -900, -900, -900, -900, -900]) {
    if (step !== 0) await drag(step)
    const onScreen = await page.evaluate(() =>
      [...document.querySelectorAll('.thing')]
        .filter((t) => {
          const b = t.getBoundingClientRect()
          return b.left >= 4 && b.right <= innerWidth - 4 && b.top >= 64 && b.bottom <= innerHeight - 4
        })
        .map((t) => t.dataset.object))
    for (const id of onScreen) {
      if (seen.has(id)) continue
      seen.add(id)
      await page.locator(`.thing--${id}`).hover()
      await page.waitForTimeout(220)
      await page.screenshot({ path: `e2e/shots/hover${tag}-${vp.w}-${id}.png` })
    }
    if (seen.size === 11) break
  }
  console.warn(engineName, vp.w, [...seen].sort().join(' '))
  await page.close()
}
await browser.close()
