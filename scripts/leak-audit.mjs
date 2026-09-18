// PHASE 24 — dozens of round trips between the worlds, watching for what
// should not grow: DOM nodes, audio elements, listeners on window/document
// (counted through a patched addEventListener), animation frames in flight,
// and the JS heap (Chromium's precise memory, when exposed). Any console or
// page error on the way is a failure.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/leak-audit.mjs 30
import { chromium } from '@playwright/test'
const rounds = Number(process.argv[2] ?? 30)
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}
const b = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const problems = []
page.on('pageerror', (e) => problems.push(`page error ${String(e)}`))
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error ${m.text()}`) })
page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()} ${r.url()}`) })
await page.addInitScript(() => {
  try { localStorage.clear(); sessionStorage.clear() } catch { /* */ }
  // Every game finished once: the bookcase door is open.
  for (const id of ['mugunghwa', 'snack', 'parcel']) localStorage.setItem(`eungarage.progress.${id}`, JSON.stringify({ best: 100, stars: 1, plays: 1 }))
  localStorage.setItem('eungarage:save', JSON.stringify({ v: 3, visitCount: 3, secretProgress: 3 }))
  // Count listeners that are added to the window and the document and never removed.
  const live = new Map()
  window.__listeners = live
  for (const target of [window, document]) {
    const add = target.addEventListener.bind(target)
    const remove = target.removeEventListener.bind(target)
    target.addEventListener = (type, fn, opts) => { live.set(fn, (live.get(fn) ?? 0) + 1); add(type, fn, opts) }
    target.removeEventListener = (type, fn, opts) => { const n = (live.get(fn) ?? 0) - 1; if (n <= 0) live.delete(fn); else live.set(fn, n); remove(type, fn, opts) }
  }
  // Frames requested and not yet run.
  let inFlight = 0
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = (cb) => { inFlight += 1; return raf((t) => { inFlight -= 1; cb(t) }) }
  window.__rafInFlight = () => inFlight
})
await page.goto(`${origin}/`, { waitUntil: 'load' })
await page.locator('[data-alley-enter]').click()
await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
await page.waitForTimeout(4000) // the unlock ceremony, once
const shown = (sel, ms = 8000) => page.waitForFunction((s) => { const el = document.querySelector(s); return !!el && !el.hidden }, sel, { timeout: ms })
const press = async (sel) => { const el = page.locator(sel).first(); await el.focus(); await page.waitForTimeout(350); await el.press('Enter') }
const measure = async () => page.evaluate(() => {
  if (window.gc) window.gc()
  const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null
  return { nodes: document.getElementsByTagName('*').length, audio: document.querySelectorAll('audio').length, listeners: window.__listeners.size, raf: window.__rafInFlight(), heapMB: mem, crew: document.querySelectorAll('[data-npc]').length, spots: document.querySelectorAll('.spot').length }
})
const samples = []
const roundTrip = async (i) => {
  if (i % 2 === 0) {
    await press('[data-object="outside-door"]')
    await shown('[data-playground]')
    await page.waitForTimeout(900)
    if (i % 4 === 0) {
      // A game as well, every other trip out.
      await press('[data-place="snack-stall"]')
      await page.waitForSelector('.prop--place[data-prop="snack-stall"]', { timeout: 6000 })
      await page.locator('.place__enter').click()
      await page.waitForSelector('[data-game-shell]', { timeout: 6000 })
      await page.waitForTimeout(400)
      await page.locator('[data-game-exit]').click()
      await page.waitForFunction(() => !document.querySelector('[data-game-shell]'), null, { timeout: 4000 })
      await page.waitForTimeout(400)
    }
    await page.locator('[data-place="garage-door"]').click()
  } else {
    await press('[data-object="secret-door"]')
    await shown('[data-archive]')
    await page.waitForTimeout(900)
    await press('[data-place="star-jar"]')
    await page.waitForTimeout(300)
    await press('[data-place="lantern"]')
    await page.waitForTimeout(300)
    await page.goBack()
  }
  await shown('[data-garage]')
  await page.waitForTimeout(1100) // the crossing back, and the room's sound
}
samples.push({ round: 0, ...(await measure()) })
for (let i = 1; i <= rounds; i++) {
  await roundTrip(i)
  if (i % 5 === 0 || i === rounds) { const m = await measure(); samples.push({ round: i, ...m }); console.log(JSON.stringify({ round: i, ...m })) }
}
const first = samples[1] ?? samples[0], last = samples[samples.length - 1]
const grew = (k, tol) => last[k] != null && first[k] != null && last[k] - first[k] > tol
if (grew('nodes', 40)) problems.push(`DOM grew: ${first.nodes} → ${last.nodes} nodes`)
if (grew('audio', 0)) problems.push(`audio elements grew: ${first.audio} → ${last.audio}`)
if (grew('listeners', 4)) problems.push(`window/document listeners grew: ${first.listeners} → ${last.listeners}`)
if (grew('crew', 0)) problems.push(`crew grew: ${first.crew} → ${last.crew}`)
if (grew('spots', 0)) problems.push(`spots grew: ${first.spots} → ${last.spots}`)
if (first.heapMB != null && last.heapMB - first.heapMB > 12) problems.push(`heap grew: ${first.heapMB} → ${last.heapMB} MB`)
console.log(`\n${rounds} round trips (garage↔playground with a game every other, garage↔archive):`)
console.table(samples)
console.log(problems.length ? `${problems.length} problem(s):\n${problems.join('\n')}` : 'leak audit clean')
await b.close()
process.exitCode = problems.length ? 1 : 0
