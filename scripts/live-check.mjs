/**
 * The live site, after a deploy: what it serves, what it costs, what breaks.
 *
 * Not the preview and not the cache-imitating server — the real host, with
 * its real headers. Reports the bundle actually being served, who is in the
 * room, transferred bytes at the same four moments as transfer.mjs, every
 * response over 400, every console error, and whether anything was fetched
 * twice.
 *
 *     node scripts/live-check.mjs [origin]
 */
import { chromium } from '@playwright/test'
const ORIGIN = process.argv[2] ?? 'https://eungarage.com'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errors = [], bad = [], headers = {}
let bytes = 0; const seen = new Set(); let repeats = 0
p.on('pageerror', (e) => errors.push(String(e)))
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
p.on('response', async (r) => {
  const u = r.url(); if (r.status() >= 400) bad.push(`${r.status()} ${u}`)
  const len = Number(r.headers()['content-length'] ?? 0)
  bytes += len || (await r.body().catch(() => Buffer.alloc(0))).length
  if (seen.has(u)) repeats++; seen.add(u)
  if (u.includes('/dokkaebi/') && !headers.frame) headers.frame = r.headers()['cache-control']
  if (u.endsWith('.js') && !headers.js) headers.js = r.headers()['cache-control']
})
const kb = (n) => `${(n / 1024).toFixed(0)}KB`
const marks = []
await p.goto(`${ORIGIN}/`, { waitUntil: 'load' }); await p.waitForTimeout(1200)
marks.push(['entrance', bytes])
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0); await p.waitForTimeout(600)
marks.push(['garage first visible', bytes])
await p.waitForTimeout(4000); marks.push(['crew standing', bytes])
await p.waitForTimeout(26000); marks.push(['everything staged (30s)', bytes])
await p.waitForTimeout(120000); marks.push(['after 2.5 min', bytes])
const who = await p.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => e.dataset.npc))
const bundle = await p.evaluate(() => [...document.scripts].map((s) => s.src).find((s) => s.includes('/assets/main-')))
console.log(`\n=== LIVE ${ORIGIN} ===\nbundle ${bundle}\ncrew ${who.join(' ')}`)
let last = 0; for (const [n, at] of marks) { console.log(`  ${n.padEnd(26)} ${kb(at).padStart(8)}  (+${kb(at - last)})`); last = at }
console.log(`  ${seen.size} distinct files, ${repeats} re-requests`)
console.log(`  cache-control  js: ${headers.js}   frames: ${headers.frame}`)
console.log('  4xx/5xx:', bad.length ? bad : 0, '\n  console errors:', errors.length ? errors : 0)
await p.screenshot({ path: '/tmp/live_desktop.png' })
await b.close()
