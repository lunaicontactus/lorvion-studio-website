/**
 * The room on a slow phone: what the visitor waits for, in order.
 *
 * Chromium's own throttling, through CDP: the DevTools "Slow 4G" profile
 * (1.6Mbps down, 750kbps up, 150ms round trip) and a 4x CPU slowdown. This is
 * an emulation on a desktop machine, not a phone — it says how the site
 * behaves under those constraints, not how a specific handset does.
 *
 * Four moments are timed from navigation start, and then one question is
 * asked: while the crew's frames are still arriving, can the visitor already
 * use the room?
 *
 *     node scripts/slow-phone.mjs [origin]
 */
import { chromium } from '@playwright/test'

const origin = process.argv[2] ?? 'http://localhost:4180'
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
const cdp = await ctx.newCDPSession(p)
await cdp.send('Network.enable')
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8,
})
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

let bytes = 0
p.on('response', async (r) => {
  const len = Number(r.headers()['content-length'] ?? 0)
  bytes += len || (await r.body().catch(() => Buffer.alloc(0))).length
})
const t0 = Date.now()
const at = () => Date.now() - t0
const marks = []

await p.goto(`${origin}/`, { waitUntil: 'commit' })
// The entrance is usable when its plate has arrived and dressed, and ENTER
// takes a tap.
await p.waitForFunction(() => document.querySelector('.alley--dressed') !== null)
await p.locator('[data-alley-enter]').waitFor({ state: 'visible' })
marks.push(['entrance usable (dressed, ENTER present)', at(), bytes])

await p.locator('[data-alley-enter]').tap()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
// The plate is a CSS background, so "visible" is "the image it names has
// arrived": load the same URL through an Image and wait for it.
await p.waitForFunction(async () => {
  const room = document.querySelector('[data-garage-room]')
  const url = room && /url\(['"]?([^'")]+)/.exec(room.style.backgroundImage)?.[1]
  if (!url) return false
  const img = new Image(); img.src = url
  if (img.complete && img.naturalWidth > 0) return true
  return await new Promise((r) => { img.onload = () => r(true); img.onerror = () => r(false) })
})
marks.push(['garage plate visible', at(), bytes])

await p.waitForFunction(() => [...document.querySelectorAll('[data-npc] img')]
  .some((i) => i.complete && i.naturalWidth > 0))
marks.push(['first dokkaebi drawn', at(), bytes])

await p.waitForFunction(() => [...document.querySelectorAll('[data-npc] img')]
  .every((i) => i.complete && i.naturalWidth > 0))
marks.push(['every dokkaebi drawn', at(), bytes])

// While frames are still streaming in, tap the PC. Is the room responsive?
const stillLoading = await p.evaluate(() =>
  performance.getEntriesByType('resource').filter((r) => r.name.includes('/dokkaebi/')).length)
const tTap = at()
await p.evaluate(() =>
  document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await p.locator('.hub__row').first().waitFor({ state: 'visible', timeout: 20000 })
marks.push([`PC panel open after tap (${stillLoading} frames fetched so far)`, at(), bytes, at() - tTap])
await p.keyboard.press('Escape')

// And the menu.
const tMenu = at()
await p.locator('.menu-toggle').tap().catch(() => {})
await p.waitForTimeout(400)
const menuOpen = await p.evaluate(() => document.querySelector('.nav-links.open') !== null)
marks.push([`menu opens while loading: ${menuOpen}`, at(), bytes, at() - tMenu])

await p.waitForTimeout(20000)
marks.push(['20s later', at(), bytes])
// Control: the same tap once nothing is loading. The difference between this
// and the earlier one is what the frames cost the visitor's first click.
const tTap2 = at()
await p.evaluate(() =>
  document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await p.locator('.hub__row').first().waitFor({ state: 'visible', timeout: 20000 })
marks.push(['PC panel open after tap, room quiet', at(), bytes, at() - tTap2])
await p.keyboard.press('Escape')

console.log(`\n=== slow phone (Slow 4G, CPU x4), 390x844, ${origin} ===`)
for (const [name, t, kb, dt] of marks) {
  console.log(`  ${(t / 1000).toFixed(1).padStart(6)}s  ${(kb / 1024).toFixed(0).padStart(6)}KB  ${name}${dt !== undefined ? `  (response ${dt}ms)` : ''}`)
}
await b.close()
