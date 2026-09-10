/**
 * What the room costs to arrive at, and what it costs to keep.
 *
 * Reported at the four moments that matter rather than as one total: what the
 * entrance needs before it can be looked at, what the room needs before it
 * can be walked into, what the crew's standing frames add, and what five
 * minutes of living in it adds after that. A single figure hides the only
 * question worth asking, which is what the visitor waits for.
 *
 *     node scripts/transfer.mjs [width] [height]
 */
import { chromium } from '@playwright/test'

const W = Number(process.argv[2] ?? 1440)
const H = Number(process.argv[3] ?? 900)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H } })

let bytes = 0
const byKind = {}
const seen = new Set()
let repeats = 0
p.on('response', async (r) => {
  const len = Number(r.headers()['content-length'] ?? 0)
  const size = len || (await r.body().catch(() => Buffer.alloc(0))).length
  bytes += size
  const url = r.url()
  if (seen.has(url)) repeats++
  seen.add(url)
  const kind = /dokkaebi\/(\w+)\//.exec(url)?.[1]
    ?? (url.endsWith('.webp') ? 'room art' : url.endsWith('.css') ? 'css'
      : url.endsWith('.js') ? 'js' : 'other')
  byKind[kind] = (byKind[kind] ?? 0) + size
})

const kb = (n) => `${(n / 1024).toFixed(0)}KB`
const marks = []
await p.goto('http://localhost:4180/', { waitUntil: 'load' })
await p.waitForTimeout(1200)
marks.push(['entrance, ready to click', bytes])
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(600)
marks.push(['garage first visible', bytes])
await p.waitForTimeout(4000)
marks.push(['crew standing (idle frames in)', bytes])
await p.waitForTimeout(26000)
marks.push(['everything staged in (30s)', bytes])
await p.waitForTimeout(270000)
marks.push(['after five minutes', bytes])

console.log(`\n=== transferred, ${W}x${H} ===`)
let last = 0
for (const [name, at] of marks) {
  console.log(`  ${name.padEnd(34)} ${kb(at).padStart(8)}   (+${kb(at - last)})`)
  last = at
}
console.log('\n  by kind:')
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(12)} ${kb(v).padStart(8)}`)
}
const mem = await p.evaluate(() => ({
  heap: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(2) : null,
  dom: document.querySelectorAll('*').length,
  images: performance.getEntriesByType('resource').filter((r) => r.initiatorType === 'img').length,
}))
console.log(`\n  ${seen.size} distinct files, ${repeats} re-requests`)
console.log(`  heap ${mem.heap}MB   DOM ${mem.dom} nodes   ${mem.images} images fetched`)
await b.close()
