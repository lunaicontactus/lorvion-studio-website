// The wall, and a piece off it, at the three sizes that matter.
//
//   node scripts/wall-shots.mjs ../shots/wall/after
//
// The camera is moved the way a keyboard user moves it — focus on a poster —
// and given 1.4s to settle before anything is photographed.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/wall'
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
  await page.waitForSelector('[data-garage-room]', { timeout: 20000 })
  await page.waitForFunction(() => [...document.querySelectorAll('.print img, .frame img')].length >= 5 &&
    [...document.querySelectorAll('.print img, .frame img')].every((i) => i.naturalWidth > 0), null, { timeout: 20000 })
  const ids = await page.evaluate(() => [...document.querySelectorAll('[data-artwork]')]
    .map((el) => el.closest('[data-object]')?.getAttribute('data-object')).filter(Boolean))
  const seen = new Set()
  for (const id of ids) {
    await page.locator(`[data-object="${id}"]`).focus()
    await page.waitForTimeout(1500)
    const shot = `${out}/${name}_wall_${id}.png`
    if (!seen.has(id)) await page.screenshot({ path: shot })
    seen.add(id)
  }
  for (const id of ids.filter((i) => /rubato|lunai/.test(i))) {
    const t = page.locator(`[data-object="${id}"]`)
    await t.focus(); await page.waitForTimeout(800)
    await t.press('Enter')
    await page.waitForSelector('[data-artwork-view] img', { timeout: 8000 })
    await page.waitForFunction(() => document.querySelector('[data-artwork-view] img')?.complete)
    await page.waitForTimeout(500)
    await page.screenshot({ path: `${out}/${name}_view_${id}.png` })
    await page.keyboard.press('Escape'); await page.waitForTimeout(600)
  }
  await ctx.close()
  console.log('  ', name, ids.join(' '))
}
await b.close()
