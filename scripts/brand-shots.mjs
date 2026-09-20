// The logo where a visitor meets it: entrance, garage, a dark page, on a
// desktop and on a phone. node scripts/brand-shots.mjs ../shots/brand
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/brand'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/${name}_1_entrance.png` })
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room]', { timeout: 20000 })
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${out}/${name}_2_garage.png` })
  await page.goto(`${origin}/works.html`, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${out}/${name}_3_games.png`, fullPage: false })
  await ctx.close()
  console.log('  ', name)
}
await b.close()
