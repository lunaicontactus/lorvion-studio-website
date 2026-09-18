// PHASE 11/12/13 — the door in the bookcase (locked, opening, open), the
// archive and its things, the sky, Healing Mode, at the three sizes.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/archive-shots.mjs ../shots/archive
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/archive'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}
const b = await chromium.launch()
let bad = 0
const seed = ([s, a]) => { try { localStorage.clear(); sessionStorage.clear(); for (const [id, n] of Object.entries(s)) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: n, plays: 1 })); localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, secretProgress: a })) } catch { /* */ } }
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const open = async (stars, ack) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
    page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
    page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
    await page.addInitScript(seed, [stars, ack])
    await page.goto(`${origin}/`, { waitUntil: 'load' })
    const enter = page.locator('[data-alley-enter]'); if (mobile) await enter.tap(); else await enter.click()
    await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
    await page.waitForTimeout(1500)
    return { ctx, page, shot: (tag) => page.screenshot({ path: `${out}/${name}_${tag}.jpg`, type: 'jpeg', quality: 84 }) }
  }
  const door = async (page) => { const d = page.locator('[data-object="secret-door"]'); await d.focus(); await page.waitForTimeout(600); return d }
  // Locked: the label and the hint.
  {
    const { ctx, page, shot } = await open({ snack: 1 }, 1)
    const d = await door(page)
    if (!mobile) await d.hover()
    await page.waitForTimeout(300)
    await shot('01_door_locked_label')
    await d.press('Enter')
    await page.waitForTimeout(250)
    await shot('02_door_hint')
    await ctx.close()
  }
  // Opening: the third star just earned.
  {
    const { ctx, page, shot } = await open({ mugunghwa: 1, snack: 1, parcel: 1 }, 2)
    await page.waitForSelector('[data-object="secret-door"].is-unlocking', { timeout: 5000 }).catch(() => { console.log('  no unlock', name); bad += 1 })
    await page.waitForTimeout(500)
    await shot('03_door_opening')
    await ctx.close()
  }
  // Open: through, and the room behind.
  {
    const { ctx, page, shot } = await open({ mugunghwa: 1, snack: 1, parcel: 1 }, 3)
    const d = await door(page)
    await d.press('Enter')
    await page.waitForFunction(() => !document.querySelector('[data-archive]').hidden, null, { timeout: 8000 })
    await page.waitForTimeout(1400)
    await shot('04_archive')
    const tap = async (id) => { const s = page.locator(`[data-place="${id}"]`); await s.focus(); await page.waitForTimeout(500); await s.press('Enter') }
    await tap('star-jar'); await page.waitForTimeout(500); await shot('05_star_jar')
    await page.waitForTimeout(1500)
    await tap('lantern'); await page.waitForTimeout(800); await shot('06_lantern_on')
    await tap('music-box'); await page.waitForSelector('.prop--archive[data-prop="music-box"]', { timeout: 6000 }).catch(() => { bad += 1 }); await page.waitForTimeout(800); await shot('07_music_box')
    await page.keyboard.press('Escape'); await page.waitForTimeout(600)
    await tap('memory-box'); await page.waitForSelector('.prop--archive[data-prop="memory-box"]', { timeout: 6000 }).catch(() => { bad += 1 }); await page.waitForTimeout(900); await shot('08_memory_box')
    await page.keyboard.press('Escape'); await page.waitForTimeout(600)
    await tap('telescope'); await page.waitForSelector('[data-archive-sky].is-open', { timeout: 4000 }).catch(() => { bad += 1 }); await page.waitForTimeout(1400); await shot('09_telescope_sky')
    await page.keyboard.press('Escape'); await page.waitForTimeout(900)
    await tap('cushion'); await page.waitForTimeout(3200); await shot('10_healing')
    await page.keyboard.press('Space'); await page.waitForTimeout(800)
    // Each thing opened in a world leaves one history entry behind (the same
    // as the garage's things), so Back is pressed until the room shows.
    for (let i = 0; i < 5; i++) {
      await page.goBack()
      const home = await page.waitForFunction(() => !document.querySelector('[data-garage]').hidden, null, { timeout: 2500 }).then(() => true, () => false)
      if (home) break
    }
    await page.waitForTimeout(1200)
    await shot('11_home')
    await ctx.close()
  }
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'archive shots done, no errors')
process.exitCode = bad ? 1 : 0
