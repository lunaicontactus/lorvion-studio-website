// The radio where it stands, at the three sizes, with the camera brought to
// it and the crew given time to be around it. node scripts/radio-shots.mjs out
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/radio'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  await page.waitForTimeout(2500)
  const radio = page.locator('[data-object="radio"]')
  await radio.focus()
  await page.waitForTimeout(1600)
  for (let i = 0; i < 3; i++) {
    const box = await radio.boundingBox()
    await page.screenshot({ path: `${out}/${name}_${i}.png`, clip: box ? {
      x: Math.max(0, box.x - box.width * 2.2), y: Math.max(0, box.y - box.height * 2.2),
      width: Math.min(w, box.width * 5.4), height: Math.min(h, box.height * 4.4) } : undefined })
    await page.waitForTimeout(4000)
  }
  // The hit area against the drawing: outline the thing's box.
  await page.addStyleTag({ content: '[data-object="radio"]{outline:2px solid #ff00ff;outline-offset:-2px}' })
  const box = await radio.boundingBox()
  await page.screenshot({ path: `${out}/${name}_hit.png`, clip: box ? {
    x: Math.max(0, box.x - box.width), y: Math.max(0, box.y - box.height),
    width: Math.min(w, box.width * 3), height: Math.min(h, box.height * 3) } : undefined })
  console.log('  ', name, box)
  await ctx.close()
}
await b.close()
