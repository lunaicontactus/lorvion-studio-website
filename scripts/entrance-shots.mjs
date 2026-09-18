// PHASE 7 — the entrance: the first visit's beats, the returning visitor's
// short door, reduced motion, and the loading line, at the three sizes.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/entrance-shots.mjs ../shots/entrance
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/entrance'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}
const b = await chromium.launch()
let bad = 0
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const mk = async (init, reduced = false) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference' })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
    page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
    page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
    await page.addInitScript(init)
    return { ctx, page }
  }
  const first = () => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } }
  const again = () => { try { sessionStorage.clear(); localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2 })) } catch { /* */ } }
  // First visit: the lane, then four beats of the door.
  {
    const { ctx, page } = await mk(first)
    await page.goto(`${origin}/`, { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${out}/${name}_first_00_lane.png` })
    const enter = page.locator('[data-alley-enter]')
    const t0 = Date.now()
    if (mobile) await enter.tap(); else await enter.click()
    // A screenshot costs real time, so each frame is named by when it was
    // actually taken, not by when it was meant to be.
    for (const [ms, tag] of [[450, '01_bump'], [1000, '02_rise'], [1450, '03_light_peek'], [1950, '04_push']]) {
      const wait = ms - (Date.now() - t0)
      if (wait > 0) await page.waitForTimeout(wait)
      const at = Date.now() - t0
      await page.screenshot({ path: `${out}/${name}_first_${tag}_${at}ms.jpg`, type: 'jpeg', quality: 82 })
    }
    await page.waitForFunction(() => !document.querySelector('[data-garage]').hidden, null, { timeout: 8000 })
    await page.waitForTimeout(1100)
    await page.screenshot({ path: `${out}/${name}_first_05_garage_momo.png` })
    await ctx.close()
  }
  // Returning: the short door, caught halfway.
  {
    const { ctx, page } = await mk(again)
    await page.goto(`${origin}/`, { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    await page.waitForTimeout(1200)
    const enter = page.locator('[data-alley-enter]')
    const t0 = Date.now()
    if (mobile) await enter.tap(); else await enter.click()
    const wait = 450 - (Date.now() - t0)
    if (wait > 0) await page.waitForTimeout(wait)
    await page.screenshot({ path: `${out}/${name}_returning_01_quick_${Date.now() - t0}ms.jpg`, type: 'jpeg', quality: 82 })
    await page.waitForFunction(() => !document.querySelector('[data-garage]').hidden, null, { timeout: 8000 })
    console.log('  ', name, 'returning door took', Date.now() - t0, 'ms')
    await ctx.close()
  }
  // Reduced motion: straight in.
  {
    const { ctx, page } = await mk(first, true)
    await page.goto(`${origin}/`, { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-enter]', { state: 'visible' })
    await page.waitForTimeout(800)
    const enter = page.locator('[data-alley-enter]')
    if (mobile) await enter.tap(); else await enter.click()
    await page.waitForFunction(() => !document.querySelector('[data-garage]').hidden, null, { timeout: 8000 })
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${out}/${name}_reduced_01_inside.png` })
    await ctx.close()
  }
  // The loading line, with the room's plate held back.
  {
    const { ctx, page } = await mk(first)
    await page.route(/room_(landscape|portrait)\.webp/, async (route) => { await new Promise((r) => setTimeout(r, 5000)); await route.continue() })
    await page.goto(`${origin}/`, { waitUntil: 'load' })
    await page.waitForSelector('[data-alley-prop]', { state: 'visible' })
    const enter = page.locator('[data-alley-enter]')
    if (mobile) await enter.tap(); else await enter.click()
    await page.waitForSelector('[data-alley-loading]', { state: 'visible', timeout: 4000 }).catch(() => { console.log('  no loading line', name); bad += 1 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${out}/${name}_loading_01_line.png` })
    await ctx.close()
  }
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'entrance shots done, no errors')
process.exitCode = bad ? 1 : 0
