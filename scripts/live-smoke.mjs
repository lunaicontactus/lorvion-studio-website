// The live site, after a deploy: is the new build the one being served, does
// the visit work at the three sizes, is the brand right on every surface,
// does sound behave, does Back and Forward always land somewhere, and is
// nothing old coming back from a cache.
//
//   node scripts/live-smoke.mjs https://eungarage.com
import { chromium } from '@playwright/test'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
const origin = (process.argv[2] ?? 'https://eungarage.com').replace(/\/$/, '')
const out = process.argv[3] ?? '../shots/live'
mkdirSync(out, { recursive: true })
const problems = [], notes = []
const bad = (t) => { problems.push(t); console.log('  !', t) }
const ok = (t) => { notes.push(t); console.log('  ', t) }

// ── The build being served ────────────────────────────────────────────────
const html = await (await fetch(`${origin}/?nocache=${Date.now()}`, { cache: 'no-store' })).text()
const served = [...html.matchAll(/assets\/main-[A-Za-z0-9_-]+\.(?:js|css)/g)].map((m) => m[0]).sort()
const local = existsSync('dist/index.html') ? [...readFileSync('dist/index.html', 'utf8').matchAll(/assets\/main-[A-Za-z0-9_-]+\.(?:js|css)/g)].map((m) => m[0]).sort() : null
if (local && (served.join() !== local.join())) bad(`served bundle ${served.join(', ')} ≠ local build ${local.join(', ')}`)
else ok(`served bundle: ${served.join(', ')}${local ? ' = local build' : ''}`)
const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''
if (!/EUNGARAGE/.test(title) || /lorvion|worlds beyond/i.test(title)) bad(`title: ${title}`); else ok(`title: ${title}`)
for (const t of [/lorvion/i, /worlds beyond the ordinary/i]) if (t.test(html)) bad(`legacy term in live HTML: ${t}`)
// ── The surfaces search engines and messengers read ───────────────────────
const meta = (p) => html.match(new RegExp(`<meta (?:property|name)="${p}" content="([^"]*)"`))?.[1]
for (const p of ['og:title', 'og:image', 'twitter:card', 'twitter:image', 'og:url']) { const v = meta(p); if (!v) bad(`missing ${p}`); else if (/lorvion/i.test(v)) bad(`${p} legacy: ${v}`) }
const ld = html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)?.[1]
try { const j = JSON.parse(ld ?? ''); if (j.name !== 'EUNGARAGE' || !/eungarage\.com/.test(j.url) || /lorvion/i.test(ld)) bad(`JSON-LD: ${ld?.slice(0, 120)}`); else ok(`JSON-LD Organization ${j.name}, ${j.email}`) } catch { bad('JSON-LD does not parse') }
const canon = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1]; if (canon !== 'https://eungarage.com/') bad(`canonical ${canon}`)
for (const p of ['/manifest.webmanifest', '/apple-touch-icon.png', '/assets/images/favicon-48.png', '/assets/images/favicon.png', '/assets/images/og-image.jpg', '/assets/images/brand/eungarage_logo_nav.webp', '/robots.txt', '/sitemap.xml', '/404.html', '/assets/images/playground/world_landscape.webp', '/assets/images/archive/world_landscape.webp', '/assets/audio/music/archive.m4a', '/assets/audio/music/playground.m4a', ...served.map((s) => `/${s}`)]) {
  const r = await fetch(`${origin}${p}`, { method: 'HEAD', cache: 'no-store' }).catch(() => null)
  if (!r || r.status !== 200) bad(`${p} → ${r?.status ?? 'no response'}`)
}
const man = await (await fetch(`${origin}/manifest.webmanifest`, { cache: 'no-store' })).json().catch(() => null)
if (!man || man.name !== 'EUNGARAGE') bad('manifest name'); else ok(`manifest ${man.name}, ${man.icons?.length} icons`)
ok(`no service worker: ${(await fetch(`${origin}/sw.js`, { method: 'HEAD' })).status === 404 ? 'sw.js 404' : 'sw.js PRESENT?'}`)

// ── The visit ──────────────────────────────────────────────────────────────
const b = await chromium.launch()
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const note = (k, t) => bad(`${name}: ${k} ${t}`)
  const audioWarnings = []
  const wire = (pg) => {
    pg.on('pageerror', (e) => note('page error', String(e)))
    pg.on('console', (m) => { if (m.type() === 'error') note('console error', m.text()); if (/play\(\)|autoplay|NotAllowedError/i.test(m.text())) audioWarnings.push(m.text()) })
    pg.on('response', (r) => { if (r.status() >= 400) note(`http ${r.status()}`, r.url()) })
    pg.on('requestfailed', (r) => { if (!/abort/i.test(r.failure()?.errorText ?? '')) note('request failed', r.url()) })
    return pg
  }
  let page = wire(await ctx.newPage())
  let n = 0
  const shot = async (tag) => { n += 1; await page.screenshot({ path: `${out}/${name}_${String(n).padStart(2, '0')}_${tag}.jpg`, type: 'jpeg', quality: 80 }) }
  const shown = (sel, ms = 10000) => page.waitForFunction((s) => { const el = document.querySelector(s); return !!el && !el.hidden }, sel, { timeout: ms })
  const press = async (sel, wait = 500) => { const el = page.locator(sel).first(); await el.focus(); await page.waitForTimeout(wait); await el.press('Enter') }
  const closeOff = async () => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[data-panel-root].is-open'), null, { timeout: 4000 }).catch(() => note('panel did not close', '')); await page.waitForTimeout(400) }
  const playing = () => page.evaluate(() => (window.__eg_audio ?? []).filter((a) => !a.paused && !a.ended).map((a) => a.src.replace(location.origin, '')))
  // Every Audio element the page makes, so what is playing can be counted.
  await page.addInitScript(() => { window.__eg_audio = []; const A = window.Audio; window.Audio = function (...a) { const el = new A(...a); window.__eg_audio.push(el); return el }; window.Audio.prototype = A.prototype })
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  const servedNow = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter((s) => /assets\/main-/.test(s)).map((s) => s.replace(location.origin + '/', '')))
  if (local && servedNow.join() !== local.filter((s) => s.endsWith('.js')).join()) note('page loaded a different bundle', servedNow.join())
  await shot('alley')
  const logo = await page.locator('.brand-logo').first().getAttribute('src'); if (!/eungarage_logo_nav/.test(logo ?? '')) note('nav logo', logo ?? 'none')
  // No sound before any gesture.
  await page.waitForTimeout(1200)
  if ((await playing()).length) note('audio before a gesture', (await playing()).join(','))
  const enter = page.locator('[data-alley-enter]'); if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 25000 })
  await page.waitForTimeout(1500)
  await shot('room')
  // Sound on: the room's tone and its station, and nothing else.
  const toggle = page.locator('[data-sound-toggle]')
  const wasOn = (await toggle.getAttribute('aria-pressed')) === 'true'
  if (!wasOn) { await toggle.click(); await page.waitForTimeout(1500) }
  let p = await playing()
  const music = p.filter((s) => /music\//.test(s))
  if (music.length !== 1) note('room music count', `${music.length}: ${p.join(',')}`); else ok(`${name}: sound on → ${p.length} playing (${music[0]})`)
  for (const id of ['pc', 'tv', 'fridge', 'radio']) {
    await press(`[data-object="${id}"]`)
    const opened = await page.waitForSelector('[data-panel-root].is-open', { timeout: 8000 }).then(() => true, () => false)
    if (!opened) note('did not open', id)
    await page.waitForTimeout(700)
    if (id === 'radio') { const st = page.locator('.radio__st').nth(1); if (await st.count()) { await st.click(); await page.waitForTimeout(900); p = await playing(); if (p.filter((s) => /music\/|ambient/.test(s)).length > 2) note('radio retune stacked audio', p.join(',')) } }
    await shot(`thing_${id}`)
    await closeOff()
  }
  // Mute: everything stops. Unmute: it comes back.
  await toggle.click(); await page.waitForTimeout(800)
  if ((await playing()).length) note('still playing after mute', (await playing()).join(','))
  await toggle.click(); await page.waitForTimeout(1200)
  if (!(await playing()).length) note('nothing came back after unmute', '')
  // Out.
  await press('[data-object="outside-door"]')
  await shown('[data-playground]', 12000).catch(() => note('no playground', ''))
  await page.waitForTimeout(2500)
  p = await playing()
  if (p.filter((s) => /music\//.test(s)).length !== 1) note('playground music count', p.join(','))
  await shot('playground')
  for (const id of ['poko-office', 'snack-stall', 'parcel-office']) {
    await press(`[data-place="${id}"]`, 600)
    await page.waitForSelector(`.prop--place[data-prop="${id}"]`, { timeout: 8000 }).catch(() => note('no place', id))
    await page.waitForTimeout(600)
    await page.locator('.place__enter').click()
    await page.waitForSelector('[data-game-shell]', { timeout: 8000 }).catch(() => note('no game', id))
    await page.waitForTimeout(1500)
    p = await playing(); if (p.filter((s) => /music\//.test(s)).length > 1) note('two musics in a game', p.join(','))
    await shot(`game_${id}`)
    await page.locator('[data-game-exit]:visible').first().click().catch(() => note('no exit', id))
    await page.waitForFunction(() => !document.querySelector('[data-game-shell]'), null, { timeout: 5000 }).catch(() => note('game did not close', id))
    await page.waitForTimeout(700)
  }
  // Back and Forward, between the worlds, several times.
  for (let i = 0; i < 3; i++) {
    await page.goBack(); await shown('[data-garage]', 8000).catch(() => note('Back from the playground', `round ${i}`)); await page.waitForTimeout(900)
    await page.goForward(); await shown('[data-playground]', 8000).catch(() => note('Forward to the playground', `round ${i}`)); await page.waitForTimeout(900)
  }
  await page.locator('[data-place="garage-door"]').click()
  await shown('[data-garage]', 8000).catch(() => note('no way home through the arch', ''))
  await page.waitForTimeout(1200)
  p = await playing(); if (p.filter((s) => /music\/(playground|poko|snack|parcel)/.test(s)).length) note('outside music still on at home', p.join(','))
  await shot('home')
  // The door: locked for a first visit (state shown), then open for a visitor with the stars.
  const label = await page.locator('[data-object="secret-door"]').getAttribute('aria-label')
  ok(`${name}: secret door on first visit → "${label}"`)
  await page.evaluate(() => { for (const id of ['mugunghwa', 'snack', 'parcel']) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 })) })
  await page.close()
  page = wire(await ctx.newPage())
  await page.addInitScript(() => { window.__eg_audio = []; const A = window.Audio; window.Audio = function (...a) { const el = new A(...a); window.__eg_audio.push(el); return el }; window.Audio.prototype = A.prototype })
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  if (mobile) await page.locator('[data-alley-enter]').tap(); else await page.locator('[data-alley-enter]').click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 25000 })
  // The preference survived the reload.
  const pressed = await page.locator('[data-sound-toggle]').getAttribute('aria-pressed')
  if (pressed !== 'true') note('sound preference did not persist', pressed ?? 'none')
  await page.waitForSelector('[data-object="secret-door"].is-unlocking', { timeout: 8000 }).catch(() => note('no unlock ceremony', ''))
  await page.waitForTimeout(3500)
  await press('[data-object="secret-door"]', 600)
  await shown('[data-archive]', 12000).catch(() => note('no archive', ''))
  await page.waitForTimeout(2500)
  p = await playing(); if (p.filter((s) => /music\//.test(s)).length !== 1) note('archive music count', p.join(','))
  await shot('archive')
  for (let i = 0; i < 2; i++) {
    await page.goBack(); await shown('[data-garage]', 8000).catch(() => note('Back from the archive', `round ${i}`)); await page.waitForTimeout(900)
    await page.goForward(); await shown('[data-archive]', 8000).catch(() => note('Forward to the archive', `round ${i}`)); await page.waitForTimeout(900)
  }
  await press('[data-place="cushion"]', 500)
  await page.waitForSelector('[data-archive].is-healing', { timeout: 4000 }).catch(() => note('no healing', ''))
  await page.waitForTimeout(3000)
  await shot('healing')
  await page.keyboard.press('Space'); await page.waitForTimeout(600)
  // Tab hidden: sound stops; back: it returns.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await page.waitForTimeout(500)
  if ((await playing()).length) note('audio kept playing with the tab hidden', (await playing()).join(','))
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')) })
  await page.waitForTimeout(1200)
  if (!(await playing()).length) note('audio did not resume when the tab came back', '')
  // Reload in the archive: the archive again.
  await page.reload({ waitUntil: 'load' })
  if (mobile) await page.locator('[data-alley-enter]').tap(); else await page.locator('[data-alley-enter]').click()
  await shown('[data-archive]', 15000).catch(() => note('reload did not come back to the archive', ''))
  await shot('archive_after_reload')
  if (audioWarnings.length) note('autoplay warnings', audioWarnings.slice(0, 2).join(' | '))
  await ctx.close()
  console.log('  ', name, 'done')
}
await b.close()
console.log(notes.join('\n'))
console.log(problems.length ? `${problems.length} problem(s):\n${problems.join('\n')}` : `live smoke clean at ${origin}: 0 console errors, 0 page errors, 0 failed responses, brand and audio and navigation as expected`)
process.exitCode = problems.length ? 1 : 0
