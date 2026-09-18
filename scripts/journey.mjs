// PHASE 21 — one real visit, end to end, at the three sizes: the alley, the
// room and its things, out through the door, a game in each building, home
// through the arch, the door in the bookcase once the stars are there, the
// archive and its things, Healing Mode, and Back all the way home. Every
// console error, page error and 4xx/5xx response is counted; the visit is
// captured at each beat.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/journey.mjs ../shots/journey
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/journey'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}
const b = await chromium.launch()
const problems = []
const report = []
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const note = (kind, text) => { problems.push(`${name}: ${kind} ${text}`); console.log('  !', name, kind, text) }
  const wire = (pg) => {
    pg.on('pageerror', (e) => note('page error', String(e)))
    pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') note(`console ${m.type()}`, m.text()) })
    pg.on('response', (r) => { if (r.status() >= 400) note(`http ${r.status()}`, r.url()) })
    pg.on('requestfailed', (r) => { if (!/abort/i.test(r.failure()?.errorText ?? '')) note('request failed', `${r.url()} ${r.failure()?.errorText}`) })
    return pg
  }
  let page = wire(await ctx.newPage())
  // A first visit: nothing remembered. (An init script runs on every
  // navigation, so the second visit below is a new page without it.)
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  let n = 0
  const shot = async (tag) => { n += 1; await page.screenshot({ path: `${out}/${name}_${String(n).padStart(2, '0')}_${tag}.jpg`, type: 'jpeg', quality: 82 }) }
  const t0 = Date.now()
  const beat = (what) => report.push(`${name} ${String(Date.now() - t0).padStart(6)}ms ${what}`)
  const shown = async (sel, ms = 8000) => page.waitForFunction((s) => { const el = document.querySelector(s); return !!el && !el.hidden }, sel, { timeout: ms })
  const press = async (sel, wait = 500) => { const el = page.locator(sel).first(); await el.focus(); await page.waitForTimeout(wait); await el.press('Enter') }

  // 1. The alley.
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  await shot('alley')
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  beat('in the room')
  await page.waitForTimeout(1800)
  await shot('room')
  // 2. Things in the room: a poster, the PC, the radio, the shelf.
  for (const id of ['poster-lunai', 'pc', 'radio', 'shelf']) {
    await press(`[data-object="${id}"]`)
    await page.waitForSelector('[data-panel-root].is-open', { timeout: 8000 }).catch(() => note('no panel', id))
    await page.waitForTimeout(900)
    await shot(`thing_${id}`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }
  // 3. The door, the crossing, the playground.
  await press('[data-object="outside-door"]')
  await shown('[data-playground]', 10000).catch(() => note('no playground', ''))
  beat('outside')
  await page.waitForTimeout(1500)
  await shot('playground')
  // 4. Every building, and its game started and left.
  for (const id of ['poko-office', 'snack-stall', 'parcel-office']) {
    await press(`[data-place="${id}"]`, 600)
    await page.waitForSelector(`.prop--place[data-prop="${id}"]`, { timeout: 6000 }).catch(() => note('no place', id))
    await page.waitForTimeout(700)
    await page.locator('.place__enter').click()
    await page.waitForSelector('[data-game-shell]', { timeout: 6000 }).catch(() => note('no game', id))
    await page.waitForTimeout(500)
    await page.locator('[data-game-start]').click().catch(() => note('no start', id))
    await page.waitForTimeout(4500)
    await shot(`game_${id}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await page.locator('[data-game-exit]').click().catch(() => note('no exit', id))
    await page.waitForFunction(() => !document.querySelector('[data-game-shell]'), null, { timeout: 4000 }).catch(() => note('game did not close', id))
    await page.waitForTimeout(600)
  }
  beat('three games played')
  // 5. Home through the arch.
  await page.locator('[data-place="garage-door"]').click()
  await shown('[data-garage]').catch(() => note('no way home', ''))
  await page.waitForTimeout(1200)
  await shot('home_again')
  beat('home')
  // 6. The stars: as a visitor who finished each game once would have them.
  const stars = await page.evaluate(() => ['mugunghwa', 'snack', 'parcel'].map((id) => JSON.parse(localStorage.getItem(`eungarage.progress.${id}`) ?? '{}').stars ?? 0))
  report.push(`${name} stars after one round each: ${stars.join('/')}`)
  await page.evaluate(() => { for (const id of ['mugunghwa', 'snack', 'parcel']) { const k = `eungarage.progress.${id}`; const p = JSON.parse(localStorage.getItem(k) ?? '{}'); if (!p.stars) localStorage.setItem(k, JSON.stringify({ best: 100, stars: 1, plays: (p.plays ?? 0) + 1 })) } })
  // A second visit, in the same browser: the room finds the door open (the
  // unlock ceremony, once).
  await page.close()
  page = wire(await ctx.newPage())
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  if (mobile) await page.locator('[data-alley-enter]').tap(); else await page.locator('[data-alley-enter]').click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  await page.waitForSelector('[data-object="secret-door"].is-unlocking', { timeout: 6000 }).catch(() => note('no unlock ceremony', ''))
  await page.waitForTimeout(900)
  await shot('door_unlocking')
  await page.waitForTimeout(2600)
  // 7. Through the door.
  await press('[data-object="secret-door"]', 600)
  await shown('[data-archive]', 10000).catch(() => note('no archive', ''))
  beat('in the archive')
  await page.waitForTimeout(1500)
  await shot('archive')
  for (const id of ['star-jar', 'lantern', 'music-box', 'memory-box', 'telescope']) {
    await press(`[data-place="${id}"]`, 500)
    await page.waitForTimeout(id === 'telescope' ? 1500 : 900)
    await shot(`archive_${id}`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
  }
  await press('[data-place="cushion"]', 500)
  await page.waitForSelector('[data-archive].is-healing', { timeout: 3000 }).catch(() => note('no healing', ''))
  await page.waitForTimeout(3500)
  await shot('healing')
  await page.keyboard.press('Space')
  await page.waitForTimeout(800)
  // 8. Back, all the way home.
  let home = false
  for (let i = 0; i < 8 && !home; i++) {
    await page.goBack()
    home = await shown('[data-garage]', 2500).then(() => true, () => false)
  }
  if (!home) note('Back never reached the room', '')
  await page.waitForTimeout(1200)
  await shot('home_from_archive')
  beat('home from the archive')
  const audio = await page.evaluate(() => ({ playing: [...document.querySelectorAll('audio')].filter((a) => !a.paused).length, panels: !!document.querySelector('[data-panel-root].is-open') }))
  report.push(`${name} at the end: audio elements playing ${audio.playing}, panel open ${audio.panels}`)
  await ctx.close()
  console.log('  ', name, 'done')
}
await b.close()
console.log(report.join('\n'))
console.log(problems.length ? `${problems.length} problem(s):\n${problems.join('\n')}` : 'journey clean: 0 console errors, 0 page errors, 0 failed responses')
process.exitCode = problems.length ? 1 : 0
