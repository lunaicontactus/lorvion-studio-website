// The archive cabinet (the shelf), at the three sizes that matter: closed,
// one thing picked on a shelf, and the photo drawer picked.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/cabinet-shots.mjs ../shots/cabinet
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/cabinet'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()
let bad = 0
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
  page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
  page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room]', { timeout: 20000 })
  await page.waitForTimeout(1200)
  const shelf = page.locator('[data-object="shelf"]')
  await shelf.focus(); await page.waitForTimeout(900); await shelf.press('Enter')
  await page.waitForSelector('[data-panel-root].is-open [data-cabinet]', { timeout: 8000 })
  await page.waitForFunction(() => document.querySelector('.prop--shelf .prop__art')?.complete)
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/${name}_0_cabinet.png` })
  if (!mobile) {
    await page.locator('[data-cab="lumiora-musicbox"]').hover(); await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/${name}_1_hover.png` })
  }
  const tap = async (sel) => { const l = page.locator(sel); if (mobile) await l.tap(); else await l.click() }
  await tap('[data-cab="liminal-book"]'); await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${name}_2_liminal.png` })
  await tap('[data-cab="drawer-records"]'); await page.waitForTimeout(900)
  await page.screenshot({ path: `${out}/${name}_3_drawer.png` })
  await ctx.close()
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'cabinet shots clean')
