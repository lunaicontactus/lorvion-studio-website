/**
 * Watch the room for a while and report what everybody actually did.
 *
 * The question is not whether the machine works — the state machine has unit
 * tests. It is whether the numbers in behaviour.ts turn into a room where one
 * of them is always at the bench and another is always near the food, which
 * is only answerable by watching and counting.
 *
 *     node scripts/crew-qa.mjs [seconds] [width] [height]
 */
import { chromium } from '@playwright/test'

const secs = Number(process.argv[2] ?? 300)
const W = Number(process.argv[3] ?? 1440)
const H = Number(process.argv[4] ?? 900)

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: W, height: H } })
const errors = []
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
p.on('pageerror', (e) => errors.push(String(e)))
const bad = []
p.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`) })
await p.goto('http://localhost:4173/', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)

const report = await p.evaluate(async (seconds) => {
  const npcs = [...document.querySelectorAll('[data-npc]')].map((el) => ({
    id: el.dataset.npc, el, img: el.querySelector('img'),
    actions: {}, dirs: {}, visits: {}, bubbles: 0, lastBubble: false,
    last: null, distance: 0,
  }))
  const feet = (el) => {
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform)
    return { x: +(m?.[1] ?? 0), y: +(m?.[2] ?? 0) }
  }
  let samples = 0
  let walkersHistogram = {}
  let closest = Infinity
  let stuckWarnings = 0
  const frames = []
  let lastFrame = performance.now()
  const t0 = Date.now()
  while (Date.now() - t0 < seconds * 1000) {
    const now = performance.now()
    frames.push(now - lastFrame); lastFrame = now
    let walking = 0
    for (const n of npcs) {
      const m = /\/dokkaebi\/\w+\/(\w+)\/(\w+)\//.exec(n.img.src)
      if (m) {
        n.actions[m[1]] = (n.actions[m[1]] ?? 0) + 1
        n.dirs[`${m[1]}:${m[2]}`] = (n.dirs[`${m[1]}:${m[2]}`] ?? 0) + 1
        if (m[1] === 'walk') walking++
      }
      const at = feet(n.el)
      if (n.last) n.distance += Math.hypot(at.x - n.last.x, at.y - n.last.y)
      n.last = at
      const bubble = n.el.querySelector('.npc__bubble')
      const up = bubble && !bubble.hidden
      if (up && !n.lastBubble) n.bubbles++
      n.lastBubble = up
    }
    walkersHistogram[walking] = (walkersHistogram[walking] ?? 0) + 1
    for (let a = 0; a < npcs.length; a++) {
      for (let c = a + 1; c < npcs.length; c++) {
        const p1 = npcs[a].last, p2 = npcs[c].last
        closest = Math.min(closest, Math.hypot(p1.x - p2.x, (p1.y - p2.y) * 2.2))
      }
    }
    samples++
    await new Promise((r) => setTimeout(r, 120))
  }
  frames.sort((a, b) => a - b)
  return {
    samples,
    seconds,
    walkersHistogram,
    closest,
    stuckWarnings,
    frameP95: frames[Math.floor(frames.length * 0.95)],
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    dom: document.querySelectorAll('*').length,
    npcs: npcs.map((n) => ({
      id: n.id, actions: n.actions, dirs: n.dirs,
      bubbles: n.bubbles, distance: Math.round(n.distance),
    })),
  }
}, secs)

const pct = (o) => {
  const t = Object.values(o).reduce((a, v) => a + v, 0) || 1
  return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => [k, `${((v / t) * 100).toFixed(1)}%`]))
}
console.log(`\n=== ${report.seconds}s, ${report.samples} samples, ${W}x${H} ===`)
for (const n of report.npcs) {
  console.log(`\n${n.id.toUpperCase()}  travelled ${n.distance} units, ${n.bubbles} bubbles`)
  console.log('  ', JSON.stringify(pct(n.actions)))
  const top = Object.entries(pct(n.dirs)).slice(0, 5)
  console.log('   top poses', JSON.stringify(Object.fromEntries(top)))
}
console.log('\nwalking at once', JSON.stringify(pct(report.walkersHistogram)))
console.log('closest approach', report.closest.toFixed(1), 'world units')
console.log('frame p95', report.frameP95.toFixed(0), 'ms   heap', report.heapMB, 'MB   DOM', report.dom)
console.log('console errors', errors.length ? errors.slice(0, 5) : 0)
console.log('failed requests', bad.length ? bad.slice(0, 5) : 0)
await b.close()
