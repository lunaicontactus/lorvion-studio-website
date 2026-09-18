// Watches the crew for vanishing in the room and walking on the spot, and says who, where, when.
import { chromium } from '@playwright/test'
const secs = Number(process.argv[2] ?? 150)
const b = await chromium.launch()
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto('http://localhost:4180/', { waitUntil: 'load' })
await page.locator('[data-alley-enter]').click()
await page.waitForSelector('[data-garage-room] .thing')
const out = await page.evaluate(async (span) => {
  const xOf = (n) => Number(/translate3d\((-?[\d.]+)px/.exec(n.style.transform)?.[1] ?? NaN)
  const events = []
  const wasAway = new Map()
  const still = new Map()
  const t0 = performance.now()
  while (performance.now() - t0 < span * 1000) {
    const t = Math.round((performance.now() - t0) / 100) / 10
    for (const n of document.querySelectorAll('[data-npc]')) {
      const id = n.dataset.npc, away = n.classList.contains('is-away'), x = xOf(n), st = n.dataset.state
      if (wasAway.has(id) && away !== wasAway.get(id)) events.push(`${t}s ${id} ${away ? 'AWAY' : 'BACK'} at ${Math.round(x)} state=${st}`)
      wasAway.set(id, away)
      if (st === 'WALK' && !away) {
        const s = still.get(id)
        if (!s || Math.abs(s.x - x) > 12) still.set(id, { x, since: performance.now(), said: false })
        else if (performance.now() - s.since > 6000 && !s.said) { s.said = true; events.push(`${t}s ${id} on the spot at ${Math.round(x)} for 6s+ (others: ${[...document.querySelectorAll('[data-npc]')].filter(o => o !== n && !o.classList.contains('is-away')).map(o => `${o.dataset.npc}:${o.dataset.state}@${Math.round(xOf(o))}`).join(' ')})`) }
      } else still.delete(id)
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return events
}, secs)
console.log(out.join('\n') || 'nothing to report')
await b.close()
