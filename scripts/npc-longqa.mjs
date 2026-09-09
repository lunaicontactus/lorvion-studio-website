/**
 * Twenty minutes of watching one dokkaebi.
 *
 * Short runs prove the machine works; only a long one shows whether it is
 * worth watching. This records where it goes, what it does, how long it does
 * nothing, and what the room does around it — then reports the distribution,
 * because "it looked fine" is not a measurement.
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const MINUTES = Number(process.argv[2] ?? 20)
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
await page.goto('http://localhost:4173/', { waitUntil: 'load' })
await page.locator('[data-alley-enter]').click()
await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await page.waitForTimeout(2000)

const out = await page.evaluate(async (minutes) => {
  const art = document.querySelector('.npc__art')
  const el = document.querySelector('.npc')
  const poses = {}
  const spots = {}
  const amb = {}
  const heap = []
  let last = null
  let lastAt = 0
  const runs = []
  const t0 = Date.now()
  const wasOn = {}
  while (Date.now() - t0 < minutes * 60000) {
    const t = Date.now() - t0
    const m = /momo\/(\w+)\/(\w+)\//.exec(art.getAttribute('src') ?? '')
    const key = m ? `${m[1]}:${m[2]}` : 'still'
    poses[key] = (poses[key] ?? 0) + 1
    if (key !== last) {
      if (last) runs.push({ k: last, ms: t - lastAt })
      last = key
      lastAt = t
    }
    const tr = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform)
    if (tr) {
      const bucket = `${Math.round(+tr[1] / 200) * 200},${Math.round(+tr[2] / 40) * 40}`
      spots[bucket] = (spots[bucket] ?? 0) + 1
    }
    for (const [k, sel] of [['pcGlow', '.garage__light[data-light="pc"]'],
                            ['tvStatic', '.garage__light[data-light="tv"]'],
                            ['secretGlow', '.garage__light[data-light="secret"]'],
                            ['shootingStar', '.garage__shooting']]) {
      const e = document.querySelector(sel)
      const on = e?.classList.contains('is-lit') || e?.classList.contains('is-falling')
      if (on && !wasOn[k]) amb[k] = (amb[k] ?? 0) + 1
      wasOn[k] = on
    }
    if (t % 60000 < 400) {
      heap.push({ min: Math.round(t / 60000), mb: +((performance.memory?.usedJSHeapSize ?? 0) / 1048576).toFixed(2),
                  dom: document.querySelectorAll('*').length })
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return { poses, spots, amb, heap, runs }
}, MINUTES)

const total = Object.values(out.poses).reduce((a, n) => a + n, 0)
const share = Object.fromEntries(Object.entries(out.poses)
  .sort((a, b2) => b2[1] - a[1]).map(([k, n]) => [k, `${((n / total) * 100).toFixed(1)}%`]))
const walkShare = Object.entries(out.poses).filter(([k]) => k.startsWith('walk:'))
  .reduce((a, [, n]) => a + n, 0) / total
const spots = Object.entries(out.spots).sort((a, b2) => b2[1] - a[1])
const longestStill = Math.max(...out.runs.filter((r) => r.k.startsWith('idle:')).map((r) => r.ms), 0)
const report = {
  minutes: MINUTES,
  poseShare: share,
  movingShare: `${(walkShare * 100).toFixed(1)}%`,
  distinctSpots: spots.length,
  topSpots: spots.slice(0, 6),
  ambientCounts: out.amb,
  longestStillSeconds: Math.round(longestStill / 1000),
  poseChanges: out.runs.length,
  memory: out.heap,
  errors: errors.length ? errors : 'none',
}
writeFileSync('/tmp/longqa.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
await b.close()
