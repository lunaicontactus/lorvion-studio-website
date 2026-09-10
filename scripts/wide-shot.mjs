/**
 * The whole room in one frame.
 *
 * The camera shows about half the workshop at a time, which is right for
 * using it and useless for checking it: whether the crew has spread out, or
 * quietly collected in one corner, is a question about the room and not about
 * the view. A viewport wide enough to hold all 3,600 world units answers it.
 *
 * Also waits for the busiest moment it can find rather than shooting on a
 * timer — the density check is about the worst case, and the worst case does
 * not arrive on cue.
 */
import { chromium } from '@playwright/test'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 2560, height: 860 } })
await p.goto('http://localhost:4180/', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(4000)
await p.screenshot({ path: '/tmp/wide_start.png' })

// Hunt for the busiest frame: most walking, plus anybody talking.
const busiest = await p.evaluate(async () => {
  const npcs = [...document.querySelectorAll('[data-npc]')]
  let best = -1
  const t0 = Date.now()
  const score = () => {
    let n = 0
    for (const el of npcs) {
      const m = /\/dokkaebi\/\w+\/(\w+)\//.exec(el.querySelector('img')?.src ?? '')
      if (m && m[1] === 'walk') n += 2
      if (m && (m[1] === 'wave' || m[1] === 'work')) n += 1
    }
    n += [...document.querySelectorAll('.npc__bubble')].filter((x) => !x.hidden).length * 3
    return n
  }
  while (Date.now() - t0 < 150000) {
    const s = score()
    if (s > best) { best = s; window.__peak = true } else { window.__peak = false }
    if (window.__peak && best >= 6) return best
    await new Promise((r) => setTimeout(r, 90))
  }
  return best
})
await p.screenshot({ path: '/tmp/wide_busy.png' })
const state = await p.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((el) => {
  const m = /translate3d\((-?[\d.]+)px/.exec(el.style.transform)
  const f = /\/dokkaebi\/\w+\/(\w+)\/(\w+)\//.exec(el.querySelector('img')?.src ?? '')
  return `${el.dataset.npc} ${f ? f[1] + ':' + f[2] : '-'} @${Math.round(+(m?.[1] ?? 0))}`
}))
console.log('busiest score', busiest)
console.log(state.join('\n'))
await b.close()
