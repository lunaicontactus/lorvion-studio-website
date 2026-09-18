// The door in the bookcase on a live site: its label at 0, 1, 2 and 3 stars,
// the ceremony once at the third (on screen, with its sound once), and a
// reload that finds it open quietly. Also the three games, each played to
// a result and left, as a visitor would.
//
//   node scripts/live-progress.mjs https://eungarage.com
import { chromium } from '@playwright/test'
const origin = (process.argv[2] ?? 'https://eungarage.com').replace(/\/$/, '')
const problems = [], notes = []
const bad = (t) => { problems.push(t); console.log('  !', t) }
const ok = (t) => { notes.push(t); console.log('  ', t) }
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const spy = (pg) => pg.addInitScript(() => { window.__plays = []; const p = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__plays.push(this.src.replace(location.origin, '')); return p.call(this) } })
const wire = (pg) => { pg.on('pageerror', (e) => bad(`page error ${e}`)); pg.on('console', (m) => { if (m.type() === 'error') bad(`console error ${m.text()}`) }); pg.on('response', (r) => { if (r.status() >= 400) bad(`http ${r.status()} ${r.url()}`) }); return pg }
const seed = (pg, stars, ack) => pg.addInitScript(([s, a]) => { localStorage.clear(); for (const [id, n] of Object.entries(s)) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: n, plays: 1 })); localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 2, secretProgress: a })) }, [stars, ack])
const enter = async (pg) => { await pg.goto(`${origin}/`, { waitUntil: 'load' }); await pg.locator('[data-alley-enter]').click(); await pg.waitForSelector('[data-garage-room] .thing', { timeout: 25000 }) }
// The ladder.
for (const [stars, want] of [[{}, '별 0/3'], [{ mugunghwa: 1 }, '별 1/3'], [{ mugunghwa: 1, snack: 1 }, '별 2/3']]) {
  const pg = wire(await ctx.newPage()); await spy(pg); await seed(pg, stars, Object.keys(stars).length); await enter(pg)
  // The label is written once the room has read the scores (data-secret set).
  await pg.waitForSelector('[data-object="secret-door"][data-secret]', { timeout: 8000 }).catch(() => bad(`door never got its state at ${want}`))
  const label = await pg.locator('[data-object="secret-door"]').getAttribute('aria-label')
  if (!label?.includes(want)) bad(`door label at ${want}: "${label}"`); else ok(`door ${want}: "${label}"`)
  await pg.waitForTimeout(1500)
  if (await pg.locator('[data-object="secret-door"].is-unlocking').count()) bad(`ceremony at ${want}`)
  // Touching it locked: the hint, no panel, no crossing.
  const d = pg.locator('[data-object="secret-door"]'); await d.focus(); await pg.waitForTimeout(400); await d.press('Enter'); await pg.waitForTimeout(600)
  if (await pg.locator('[data-panel-root].is-open').count()) bad(`locked door opened a panel at ${want}`)
  if (!(await pg.locator('[data-garage]').isVisible())) bad(`locked door left the room at ${want}`)
  await pg.close()
}
// The third star: the ceremony, once, on screen, with its sound once.
{
  const pg = wire(await ctx.newPage()); await spy(pg); await seed(pg, { mugunghwa: 1, snack: 1, parcel: 1 }, 2); await enter(pg)
  const door = pg.locator('[data-object="secret-door"]')
  const cer = await pg.waitForSelector('[data-object="secret-door"].is-unlocking', { timeout: 8000 }).then(() => true, () => false)
  if (!cer) bad('no ceremony at the third star'); else ok('ceremony at the third star')
  const r = await door.boundingBox(); if (!r || r.x + r.width / 2 < 0 || r.x + r.width / 2 > 1440 || r.y + r.height / 2 < 0 || r.y + r.height / 2 > 900) bad('ceremony out of view')
  await pg.waitForTimeout(3000)
  const plays = await pg.evaluate(() => window.__plays.filter((s) => s.includes('secret_unlock')).length)
  // Sound is off by default on a first visit, so the cue plays only if sound is on; either 0 (muted) or 1.
  if (plays > 1) bad(`unlock sound played ${plays} times`); else ok(`unlock sound plays: ${plays} (sound ${plays ? 'on' : 'off by default'})`)
  const saved = await pg.evaluate(() => JSON.parse(localStorage.getItem('eungarage:save') ?? '{}').secretProgress)
  if (saved !== 3) bad(`secretProgress after ceremony: ${saved}`)
  // A reload: open, quietly.
  const again = wire(await ctx.newPage()); await spy(again)
  await again.goto(`${origin}/`, { waitUntil: 'load' }); await again.locator('[data-alley-enter]').click(); await again.waitForSelector('[data-garage-room] .thing', { timeout: 25000 })
  await again.waitForSelector('[data-object="secret-door"][data-secret]', { timeout: 8000 }).catch(() => bad('door never got its state after reload'))
  await again.waitForTimeout(2500)
  const label2 = await again.locator('[data-object="secret-door"]').getAttribute('aria-label')
  if (label2 !== '비밀문') bad(`door after reload: "${label2}"`); else ok(`door after reload: "${label2}" (open)`)
  if (await again.locator('[data-object="secret-door"].is-unlocking').count()) bad('ceremony repeated after reload')
  if (await again.evaluate(() => window.__plays.filter((s) => s.includes('secret_unlock')).length)) bad('unlock sound repeated after reload')
  // Through it.
  const d2 = again.locator('[data-object="secret-door"]'); await d2.focus(); await again.waitForTimeout(500); await d2.press('Enter')
  const inArchive = await again.waitForFunction(() => !document.querySelector('[data-archive]').hidden, null, { timeout: 12000 }).then(() => true, () => false)
  if (!inArchive) bad('open door did not lead to the archive'); else ok('open door → archive')
  await again.close(); await pg.close()
}
// The games, as played: each to a result and out.
{
  const pg = wire(await ctx.newPage()); await spy(pg); await seed(pg, {}, 0); await enter(pg)
  const door = pg.locator('[data-object="outside-door"]'); await door.focus(); await pg.waitForTimeout(500); await door.press('Enter')
  await pg.waitForFunction(() => !document.querySelector('[data-playground]').hidden, null, { timeout: 12000 })
  await pg.waitForTimeout(1200)
  for (const [id, secs] of [['poko-office', 8], ['snack-stall', 6], ['parcel-office', 6]]) {
    const s = pg.locator(`[data-place="${id}"]`); await s.focus(); await pg.waitForTimeout(600); await s.press('Enter')
    await pg.waitForSelector(`.prop--place[data-prop="${id}"]`, { timeout: 8000 })
    await pg.locator('.place__enter').click()
    await pg.waitForSelector('[data-game-shell]', { timeout: 8000 })
    await pg.locator('[data-game-start]').click()
    await pg.waitForTimeout(secs * 1000)
    // Play a little: keys the games listen to.
    for (let i = 0; i < 6; i++) { await pg.keyboard.press(id === 'poko-office' ? 'Space' : String(1 + (i % 3))); await pg.waitForTimeout(250) }
    const hud = await pg.locator('[data-game-shell] .game__hud, [data-game-shell] header').first().boundingBox().catch(() => null)
    if (!hud) bad(`${id}: no HUD box`)
    await pg.keyboard.press('Escape'); await pg.waitForTimeout(400)
    const exit = pg.locator('[data-game-exit]:visible').first()
    const t = await exit.textContent().catch(() => '')
    await exit.click().catch(() => bad(`${id}: no exit`))
    await pg.waitForFunction(() => !document.querySelector('[data-game-shell]'), null, { timeout: 5000 }).catch(() => bad(`${id}: did not close`))
    ok(`${id}: entered, played, left via "${t?.trim()}"`)
    await pg.waitForTimeout(800)
  }
  const prog = await pg.evaluate(() => ['mugunghwa', 'snack', 'parcel'].map((id) => localStorage.getItem(`eungarage.progress.${id}`)))
  ok(`progress records after play: ${prog.map((p) => (p ? 'saved' : 'none')).join('/')}`)
  await pg.close()
}
await b.close()
console.log(problems.length ? `${problems.length} problem(s):\n${problems.join('\n')}` : 'live progress QA clean')
process.exitCode = problems.length ? 1 : 0
