// Every object in the garage, opened, at the three sizes the brief names.
//
//   node scripts/ia-shots.mjs ../shots/ia
//
// Opened the way a keyboard user opens them (focus, Enter), with the camera
// given time to arrive, so the shot is what a visitor sees.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/ia'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const OBJECTS = ['pc', 'poster-lunai', 'shelf', 'fridge', 'parcel', 'tv', 'radio', 'cabinet', 'workbench', 'outside-door']
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
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${out}/${name}_00_room.png` })
  for (const [i, id] of OBJECTS.entries()) {
    const t = page.locator(`[data-object="${id}"]`)
    await t.focus()
    await page.waitForTimeout(700)
    await t.press('Enter')
    await page.waitForSelector('[data-panel-root].is-open', { timeout: 8000 }).catch(() => { console.log('  did not open', id); bad += 1 })
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${out}/${name}_${String(i + 1).padStart(2, '0')}_${id}.png` })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
  }
  // The TV's other channels, on the desktop.
  if (!mobile) {
    const tv = page.locator('[data-object="tv"]')
    await tv.focus(); await page.waitForTimeout(600); await tv.press('Enter')
    for (const ch of [1, 2, 3]) {
      await page.locator(`[data-tv-go="${ch}"]`).click()
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${out}/${name}_tv_ch${ch + 1}.png` })
    }
    await page.keyboard.press('Escape')
  }
  await ctx.close()
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'all objects shot, no errors')
process.exitCode = bad ? 1 : 0
