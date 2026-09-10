/**
 * What the crew costs in memory, beyond the JS heap.
 *
 * The heap is 9.5MB and says nothing about images. A WebP frame is ~35KB on
 * the wire and w*h*4 bytes once decoded, and the browser keeps decoded
 * bitmaps for whatever is on screen plus whatever it chooses to cache. So this
 * reports three things separately: the encoded bytes held by the preloader,
 * the decoded size of what is on screen right now, and the decoded size of
 * every frame if the browser kept them all — the ceiling, not the expectation.
 *
 * Chromium's process-level numbers come from CDP Performance.getMetrics. This
 * is a desktop emulation of a phone viewport, not a phone: a real device's
 * image cache budget is smaller and its behaviour under pressure is its own.
 *
 *     node scripts/decode-memory.mjs [width] [height]
 */
import { chromium } from '@playwright/test'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const W = Number(process.argv[2] ?? 1440)
const H = Number(process.argv[3] ?? 900)
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: W, height: H }, ...(W < 500 ? { isMobile: true, hasTouch: true } : {}) })
const p = await ctx.newPage()
const cdp = await ctx.newCDPSession(p)
await cdp.send('Performance.enable')
await p.goto('http://localhost:4180/', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(35000)   // everything staged in

const onScreen = await p.evaluate(() => [...document.querySelectorAll('[data-npc] img')]
  .map((i) => ({ w: i.naturalWidth, h: i.naturalHeight })))
const held = await p.evaluate(() => performance.getEntriesByType('resource')
  .filter((r) => r.name.includes('/dokkaebi/'))
  .reduce((a, r) => a + (r.encodedBodySize || r.transferSize || 0), 0))
const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))

// Every shipped frame, by size on disk and decoded.
let files = 0, encoded = 0, decoded = 0
const walk = (d) => { for (const f of readdirSync(d)) { const q = join(d, f); const s = statSync(q)
  if (s.isDirectory()) walk(q); else if (f.endsWith('.webp')) { files++; encoded += s.size } } }
walk('public/assets/images/dokkaebi')
for (const id of ['momo', 'nunu', 'ruki', 'yomi', 'poko']) {
  const dir = `public/assets/images/dokkaebi/${id}`
  let n = 0; const w2 = (d) => { for (const f of readdirSync(d)) { const q = join(d, f)
    if (statSync(q).isDirectory()) w2(q); else if (f.endsWith('.webp')) n++ } }; w2(dir)
  const sz = { momo: [298, 420], nunu: [342, 420], ruki: [337, 420], yomi: [331, 420], poko: [337, 420] }[id]
  decoded += n * sz[0] * sz[1] * 4
}
const mb = (n) => (n / 1048576).toFixed(1)
console.log(`\n=== memory, ${W}x${H} (Chromium desktop emulation, not a device) ===`)
console.log(`  shipped frames        ${files} files, ${mb(encoded)}MB encoded on disk`)
console.log(`  fetched by this page  ${mb(held)}MB encoded (held by the preloader, never re-fetched)`)
console.log(`  on screen now         ${onScreen.length} frames, ${mb(onScreen.reduce((a, s) => a + s.w * s.h * 4, 0))}MB decoded`)
console.log(`  ceiling if all decoded at once   ${mb(decoded)}MB   (browser image cache decides; it evicts under pressure)`)
console.log(`  CDP  JSHeapUsed ${mb(metrics.JSHeapUsedSize)}MB   JSHeapTotal ${mb(metrics.JSHeapTotalSize)}MB   Nodes ${metrics.Nodes}   Documents ${metrics.Documents}`)
await b.close()
