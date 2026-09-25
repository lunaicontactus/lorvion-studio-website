// WORLD 2.4 — the sky through the telescope, and the door back: the archive
// as it is, the sky coming in, the sky, a star falling, the way out, the
// door under the pointer and opening, and the garage again — at three sizes.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/telescope-shots.mjs docs/shots/world24
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? 'docs/shots/world24'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
let bad = 0
const seed = () => {
  try {
    localStorage.clear(); sessionStorage.clear()
    for (const id of ['mugunghwa', 'snack', 'parcel']) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 }))
    localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, secretProgress: 3, soundEnabled: true }))
  } catch { /* */ }
}
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
  page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
  page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
  await page.addInitScript(seed)
  const shot = (tag) => page.screenshot({ path: `${out}/${name}_${tag}.jpg`, type: 'jpeg', quality: 84 })
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]'); if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  await page.waitForTimeout(1500)
  const d = page.locator('[data-object="secret-door"]'); await d.focus(); await page.waitForTimeout(600); await d.press('Enter')
  await page.waitForFunction(() => !document.querySelector('[data-archive]').hidden, null, { timeout: 8000 })
  await page.waitForTimeout(1600)
  await shot('01_archive')
  // The door back, under the pointer (a phone has no hover: the label stays away).
  const door = page.locator('[data-archive-door]')
  if (!mobile) { await door.hover(); await page.waitForTimeout(300); await shot('02_door_hover') }
  // The telescope.
  const tel = page.locator('[data-place="telescope"]'); await tel.focus(); await page.waitForTimeout(500); await tel.press('Enter')
  await page.waitForSelector('[data-archive-sky].is-open', { timeout: 4000 }).catch(() => { console.log('  no sky', name); bad += 1 })
  await page.waitForTimeout(260)
  await shot('03_telescope_entering')
  await page.waitForTimeout(1600)
  await shot('04_telescope_sky')
  // A star falls, eventually: the frame it is on.
  const fell = await page.waitForFunction(() => Number(document.querySelector('[data-archive-stars]')?.dataset.shots ?? 0) >= 1, null, { timeout: 12000 }).then(() => true, () => false)
  if (!fell) { console.log('  no shooting star in 12 s', name); bad += 1 }
  await page.waitForTimeout(260)
  await shot('05_shooting_star')
  if (!mobile) { await page.locator('[data-archive-sky-close]').hover(); await page.waitForTimeout(200); await shot('06_sky_close_hover') }
  // Out, by the visible control.
  const close = page.locator('[data-archive-sky-close]'); if (mobile) await close.tap(); else await close.click()
  await page.waitForTimeout(400)
  await shot('07_sky_exit')
  await page.waitForTimeout(700)
  await shot('08_archive_again')
  // The door: pressed, opening, and the garage.
  const r = await door.boundingBox()
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
  await page.mouse.down(); await page.waitForTimeout(120); await shot('09_door_pressed')
  await page.mouse.up(); await page.waitForTimeout(240); await shot('10_door_opening')
  const home = await page.waitForFunction(() => !document.querySelector('[data-garage]').hidden, null, { timeout: 8000 }).then(() => true, () => false)
  if (!home) { console.log('  the door did not lead home', name); bad += 1 }
  await page.waitForTimeout(1500)
  await shot('11_garage')
  await ctx.close()
  console.log(name, 'done')
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'clean')
process.exitCode = bad ? 1 : 0
