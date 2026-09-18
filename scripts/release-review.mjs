// PHASE A — the last look before the merge: every thing in every world,
// the crew, the broom, the shooting star, at the three sizes. Captures to
// look at, and every error, 4xx/5xx and failed request counted.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/release'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4180'
const b = await chromium.launch()
const problems = [], notes = []
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const note = (k, t) => { problems.push(`${name}: ${k} ${t}`); console.log('  !', name, k, t) }
  const wire = (pg) => { pg.on('pageerror', (e) => note('page error', String(e))); pg.on('console', (m) => { if (m.type() === 'error') note('console error', m.text()) }); pg.on('response', (r) => { if (r.status() >= 400) note(`http ${r.status()}`, r.url()) }); pg.on('requestfailed', (r) => { if (!/abort/i.test(r.failure()?.errorText ?? '')) note('request failed', r.url()) }); return pg }
  let page = wire(await ctx.newPage())
  await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
  let n = 0
  const shot = async (tag) => { n += 1; await page.screenshot({ path: `${out}/${name}_${String(n).padStart(2, '0')}_${tag}.jpg`, type: 'jpeg', quality: 82 }) }
  const shown = (sel, ms = 8000) => page.waitForFunction((s) => { const el = document.querySelector(s); return !!el && !el.hidden }, sel, { timeout: ms })
  const press = async (sel, wait = 500) => { const el = page.locator(sel).first(); await el.focus(); await page.waitForTimeout(wait); await el.press('Enter') }
  const closeOff = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-panel-root].is-open'), null, { timeout: 4000 }).catch(() => note('panel did not close', '')); await page.waitForTimeout(400) }
  // Is the close control of an open panel inside the viewport?
  const closeInView = async (what) => { const r = await page.locator('[data-panel-root].is-open [data-panel-close]').first().boundingBox().catch(() => null); if (!r || r.x < 0 || r.y < 0 || r.x + r.width > w || r.y + r.height > h) note('close control off-screen or missing', what) }

  await page.goto(`${origin}/`, { waitUntil: 'load' })
  await shot('alley')
  const t0 = Date.now()
  const enter = page.locator('[data-alley-enter]'); if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  notes.push(`${name}: alley → room ${Date.now() - t0} ms after ENTER`)
  await page.waitForTimeout(1500)
  await shot('room')
  // Every thing in the room.
  for (const id of ['poster-lunai', 'picture-rubato', 'pc', 'shelf', 'fridge', 'parcel', 'tv', 'radio', 'cabinet', 'workbench']) {
    await press(`[data-object="${id}"]`)
    const ok = await page.waitForSelector('[data-panel-root].is-open', { timeout: 8000 }).then(() => true, () => false)
    if (!ok) { note('did not open', id); continue }
    await page.waitForTimeout(900)
    await closeInView(id)
    await shot(`thing_${id}`)
    await closeOff()
  }
  // The crew: touch one.
  const hit = page.locator('[data-npc] .npc__hit').first()
  if (await hit.count()) { await hit.focus(); await page.waitForTimeout(300); await hit.press('Enter'); await page.waitForTimeout(700); await shot('crew_touched') } else note('no crew hit', '')
  // The broom: give it up to 100 s to come through.
  const broom = await page.waitForFunction(() => document.querySelector('.garage__broom')?.classList.contains('is-live'), null, { timeout: 100000 }).then(() => true, () => false)
  if (broom) { await page.waitForTimeout(1200); await shot('broom') } else notes.push(`${name}: broom did not appear within 100 s (its schedule is minutes; see broom-probe)`)
  // Out.
  await press('[data-object="outside-door"]')
  await shown('[data-playground]', 10000).catch(() => note('no playground', ''))
  await page.waitForTimeout(1500)
  await shot('playground')
  for (const id of ['poko-office', 'snack-stall', 'parcel-office']) {
    await press(`[data-place="${id}"]`, 600)
    await page.waitForSelector(`.prop--place[data-prop="${id}"]`, { timeout: 6000 }).catch(() => note('no place', id))
    await page.waitForTimeout(700)
    await page.locator('.place__enter').click()
    await page.waitForSelector('[data-game-shell]', { timeout: 6000 }).catch(() => note('no game', id))
    await page.waitForTimeout(500)
    await page.locator('[data-game-start]').click().catch(() => note('no start', id))
    await page.waitForTimeout(3500)
    await shot(`game_${id}`)
    // Escape pauses a round (or does nothing on a result screen); the way
    // out is the one visible exit button, and it has to be on screen.
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    const exit = page.locator('[data-game-exit]:visible').first()
    const ex = await exit.boundingBox().catch(() => null)
    if (!ex || ex.x < 0 || ex.y < 0 || ex.x + ex.width > w || ex.y + ex.height > h) note('game exit off-screen or missing', id)
    await exit.click().catch(() => note('no exit', id))
    await page.waitForFunction(() => !document.querySelector('[data-game-shell]'), null, { timeout: 4000 }).catch(() => note('game did not close', id))
    await page.waitForTimeout(600)
  }
  await page.locator('[data-place="garage-door"]').click()
  await shown('[data-garage]').catch(() => note('no way home', ''))
  await page.waitForTimeout(1200)
  await shot('home')
  // The stars, as a visitor who cleared each game once would have them.
  await page.evaluate(() => { for (const id of ['mugunghwa', 'snack', 'parcel']) { const k = `eungarage.progress.${id}`; const p = JSON.parse(localStorage.getItem(k) ?? '{}'); if (!p.stars) localStorage.setItem(k, JSON.stringify({ best: 100, stars: 1, plays: (p.plays ?? 0) + 1 })) } })
  await page.close()
  page = wire(await ctx.newPage())
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  if (mobile) await page.locator('[data-alley-enter]').tap(); else await page.locator('[data-alley-enter]').click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
  const cer = await page.waitForSelector('[data-object="secret-door"].is-unlocking', { timeout: 6000 }).then(() => true, () => false)
  if (!cer) note('no unlock ceremony', '')
  await page.waitForTimeout(900)
  const dr = await page.locator('[data-object="secret-door"]').boundingBox()
  if (!dr || dr.x + dr.width / 2 < 0 || dr.x + dr.width / 2 > w || dr.y + dr.height / 2 < 0 || dr.y + dr.height / 2 > h) note('ceremony out of view', '')
  await shot('door_unlocking')
  await page.waitForTimeout(2600)
  await press('[data-object="secret-door"]', 600)
  await shown('[data-archive]', 10000).catch(() => note('no archive', ''))
  await page.waitForTimeout(1500)
  await shot('archive')
  for (const id of ['star-jar', 'music-box', 'telescope', 'memory-box', 'lantern']) {
    await press(`[data-place="${id}"]`, 500)
    if (id === 'music-box' || id === 'memory-box') { await page.waitForSelector('[data-panel-root].is-open', { timeout: 6000 }).catch(() => note('did not open', id)); await page.waitForTimeout(900); await closeInView(id) }
    else if (id === 'telescope') { await page.waitForSelector('[data-archive-sky].is-open', { timeout: 4000 }).catch(() => note('no sky', '')); const star = await page.waitForSelector('[data-archive-sky] .archive__shooting.is-falling', { timeout: 5000 }).then(() => true, () => false); if (!star) note('no shooting star through the telescope', ''); await page.waitForTimeout(400) }
    else await page.waitForTimeout(900)
    await shot(`archive_${id}`)
    await page.keyboard.press('Escape'); await page.waitForTimeout(700)
  }
  await press('[data-place="cushion"]', 500)
  await page.waitForSelector('[data-archive].is-healing', { timeout: 3000 }).catch(() => note('no healing', ''))
  const hs = await page.waitForSelector('[data-archive-world] .archive__shooting.is-falling', { timeout: 9000 }).then(() => true, () => false)
  if (!hs) note('no shooting star in Healing Mode', '')
  await page.waitForTimeout(600)
  await shot('healing_star')
  await page.keyboard.press('Space')
  await page.waitForTimeout(800)
  let home = false
  for (let i = 0; i < 8 && !home; i++) { await page.goBack(); home = await shown('[data-garage]', 2500).then(() => true, () => false) }
  if (!home) note('Back never reached the room', '')
  await page.waitForTimeout(1200)
  await shot('home_from_archive')
  await ctx.close()
  console.log('  ', name, 'done')
}
await b.close()
console.log(notes.join('\n'))
console.log(problems.length ? `${problems.length} problem(s):\n${problems.join('\n')}` : 'release review clean: 0 console errors, 0 page errors, 0 failed responses')
process.exitCode = problems.length ? 1 : 0
