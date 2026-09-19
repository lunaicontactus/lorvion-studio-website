// WORLD 2.1 — the three pixel games: the way in from the playground (the lit
// sign and the pixel wipe), each game's ready screen, a moment of play, and
// its result, at the three sizes. Every error and failed request counted.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/pixel-games-shots.mjs ../shots/pixel
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/pixel'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()
let bad = 0
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
  page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
  page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  const shot = (tag) => page.screenshot({ path: `${out}/${name}_${tag}.jpg`, type: 'jpeg', quality: 84 })
  // In through the playground, the way a visitor comes.
  await page.goto(`${origin}/#playground`, { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]'); if (mobile) await enter.tap(); else await enter.click()
  await page.waitForFunction(() => !document.querySelector('[data-playground]').hidden, null, { timeout: 15000 })
  await page.waitForTimeout(1500)
  const games = [['poko-office', 'sneak'], ['snack-stall', 'snack'], ['parcel-office', 'delivery']]
  for (const [place, g] of games) {
    const spot = page.locator(`[data-place="${place}"]`)
    await spot.focus(); await page.waitForTimeout(600); await spot.press('Enter')
    await page.waitForSelector(`.prop--place[data-prop="${place}"].is-lit`, { timeout: 4000 }).catch(() => { bad += 1 })
    await page.waitForTimeout(300)
    await shot(`${g}_0_sign`)
    await page.waitForSelector('[data-pixel-wipe-title]', { state: 'visible', timeout: 4000 }).catch(() => { bad += 1 })
    await page.waitForFunction(() => document.querySelector('[data-pixel-wipe-title]')?.classList.contains('is-on'), null, { timeout: 4000 }).catch(() => { bad += 1 })
    // is-on starts a 200 ms step-in from nothing; shoot once it is in.
    await page.waitForTimeout(300)
    await shot(`${g}_1_wipe`)
    await page.waitForSelector('[data-game-start]', { timeout: 8000 })
    await page.waitForTimeout(700)
    await shot(`${g}_2_ready`)
    await page.locator('[data-game-start]').click()
    await page.waitForSelector('[data-game-overlay]', { state: 'hidden', timeout: 6000 })
    if (g === 'sneak') { await page.keyboard.down(' '); await page.waitForTimeout(1800); await shot(`${g}_3_play`); await page.waitForTimeout(9000); await page.keyboard.up(' ') }
    if (g === 'snack') {
      for (let i = 0; i < 3; i++) { await page.keyboard.press(String(1 + (i % 4))); await page.waitForTimeout(400) }
      await shot(`${g}_3_play`)
    }
    if (g === 'delivery') {
      await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(500); await page.keyboard.up('ArrowLeft')
      await page.keyboard.down('ArrowRight'); await page.waitForTimeout(450); await page.keyboard.down(' '); await page.waitForTimeout(220)
      await shot(`${g}_3_play`)
      await page.keyboard.up(' '); await page.keyboard.up('ArrowRight')
    }
    // The result, early: pause and leave is not a result, so run the clock out.
    await page.waitForSelector('[data-game-result]', { timeout: 70_000 }).catch(() => { console.log('  no result', g); bad += 1 })
    await page.waitForTimeout(500)
    await shot(`${g}_4_result`)
    await page.locator('[data-game-exit]').click()
    await page.waitForSelector('[data-game-shell]', { state: 'detached', timeout: 6000 })
    await page.waitForSelector('[data-pixel-wipe]', { state: 'hidden', timeout: 6000 })
    await page.waitForTimeout(800)
  }
  await ctx.close()
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'pixel games shots done, no errors')
process.exitCode = bad ? 1 : 0
