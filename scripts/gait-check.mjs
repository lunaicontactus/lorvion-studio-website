/**
 * Does the floor go past at the speed the feet claim?
 *
 * Watches each dokkaebi in the live room and, every time its walk animation
 * wraps from the last frame back to the first, measures how far it actually
 * travelled. That distance is the stride the sprite was rendered with, or the
 * character is sliding.
 *
 * The interesting number is the best cycle, not the average one. Every reason
 * a cycle can be short is real — it ended on arrival, or the dokkaebi was
 * squeezing past somebody and slowed down, and the walk slows with it — so
 * the mean measures how busy the room was. An unimpeded cycle measures the
 * cadence, which is what this is for.
 */
import { chromium } from '@playwright/test'

const WANT = { momo: 89.0, nunu: 90.8 }
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4173/', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
const seconds = Number(process.argv[2] ?? 90)
const out = await p.evaluate(async (secs) => {
  const npcs = [...document.querySelectorAll('[data-npc]')]
  const state = npcs.map((el) => ({
    id: el.dataset.npc, img: el.querySelector('img'), el,
    last: null, from: null, cycles: [],
  }))
  const feet = (el) => {
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform)
    return { x: +(m?.[1] ?? 0), y: +(m?.[2] ?? 0) }
  }
  const t0 = Date.now()
  while (Date.now() - t0 < secs * 1000) {
    for (const s of state) {
      const m = /_(walk)_(\w+)_(\d+)\.webp$/.exec(s.img.getAttribute('src') ?? '')
      if (!m) { s.last = null; s.from = null; continue }
      const n = +m[3]
      if (s.last !== null && n < s.last && s.from) {
        const now = feet(s.el)
        s.cycles.push(Math.hypot(now.x - s.from.x, now.y - s.from.y))
        s.from = now
      } else if (s.from === null) {
        s.from = feet(s.el)
      }
      s.last = n
    }
    await new Promise((r) => setTimeout(r, 16))
  }
  return state.map((s) => ({ id: s.id, cycles: s.cycles }))
}, seconds)
for (const { id, cycles } of out) {
  const clean = cycles.filter((d) => d > 20).sort((a, b) => a - b)
  if (clean.length === 0) { console.log(`${id}: never completed a cycle`); continue }
  const p = (q) => clean[Math.min(clean.length - 1, Math.floor(q * clean.length))]
  const want = WANT[id]
  const err = ((p(0.9) - want) / want) * 100
  console.log(`${id}: ${clean.length} cycles   median ${p(0.5).toFixed(1)}   `
    + `p90 ${p(0.9).toFixed(1)}   max ${clean[clean.length - 1].toFixed(1)}   `
    + `stride ${want}   unimpeded error ${err >= 0 ? '+' : ''}${err.toFixed(1)}%`)
}
await b.close()
