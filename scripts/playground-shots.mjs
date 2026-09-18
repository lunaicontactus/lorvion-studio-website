// PHASE 8/9/10 — the door as a crossing, the playground, its places and
// its games, at the three sizes.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/playground-shots.mjs ../shots/playground
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/playground'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}
const b = await chromium.launch()
let bad = 0
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
  page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
  page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  await page.waitForTimeout(1200)
  const shot = (tag) => page.screenshot({ path: `${out}/${name}_${tag}.jpg`, type: 'jpeg', quality: 84 })
  // The door: its cut-out open on the night, then the night coming in.
  const door = page.locator('[data-object="outside-door"]')
  await door.focus(); await page.waitForTimeout(500); await door.press('Enter')
  await page.waitForSelector('.prop--outside-door .dark.is-ajar', { timeout: 6000 }).catch(() => { bad += 1 })
  await page.waitForTimeout(350)
  await shot('01_door_open')
  await page.waitForSelector('[data-crossing].is-dark', { timeout: 4000 }).catch(() => { bad += 1 })
  await page.waitForTimeout(300)
  await shot('02_crossing')
  await page.waitForFunction(() => !document.querySelector('[data-playground]').hidden, null, { timeout: 8000 })
  await page.waitForTimeout(1400)
  await shot('03_playground')
  // A place under the pointer (desktop), or focused (phone).
  const poko = page.locator('[data-place="poko-office"]')
  if (mobile) await poko.focus(); else await poko.hover()
  await page.waitForTimeout(500)
  await shot('04_place_ring')
  // The signpost.
  const sign = page.locator('[data-place="signpost"]')
  await sign.focus(); await page.waitForTimeout(500); await sign.press('Enter')
  await page.waitForSelector('[data-signpost]', { timeout: 6000 }).catch(() => { bad += 1 })
  await page.waitForTimeout(700)
  await shot('05_signpost')
  await page.keyboard.press('Escape'); await page.waitForTimeout(600)
  // Each building open, and its game's ready screen inside it.
  for (const [id, tag] of [['poko-office', '06_poko'], ['snack-stall', '07_snack'], ['parcel-office', '08_parcel']]) {
    const spot = page.locator(`[data-place="${id}"]`)
    await spot.focus(); await page.waitForTimeout(600); await spot.press('Enter')
    await page.waitForSelector(`.prop--place[data-prop="${id}"]`, { timeout: 6000 }).catch(() => { console.log('  no place', id); bad += 1 })
    await page.waitForTimeout(800)
    await shot(`${tag}_place`)
    await page.locator('.place__enter').click()
    await page.waitForSelector('[data-game-shell]', { timeout: 6000 }).catch(() => { console.log('  no game', id); bad += 1 })
    await page.waitForTimeout(600)
    await shot(`${tag}_game_ready`)
    if (id === 'poko-office') {
      // Into the round, for the office behind the two figures.
      await page.locator('[data-game-start]').click()
      await page.waitForTimeout(2600)
      await shot(`${tag}_game_playing`)
      await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    }
    await page.locator('[data-game-exit]').click()
    await page.waitForFunction(() => !document.querySelector('[data-game-shell]'), null, { timeout: 4000 })
    await page.waitForTimeout(500)
  }
  await shot('09_back_in_playground')
  // Home through the arch.
  await page.locator('[data-place="garage-door"]').click()
  await page.waitForFunction(() => !document.querySelector('[data-garage]').hidden, null, { timeout: 6000 })
  await page.waitForTimeout(1200)
  await shot('10_home')
  await ctx.close()
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'playground shots done, no errors')
process.exitCode = bad ? 1 : 0
