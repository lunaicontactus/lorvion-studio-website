/**
 * The final captures: the crew in the room, at the sizes people use it.
 *
 * Waits for something worth photographing rather than shooting on a timer —
 * a room caught between beats is a picture of nothing.
 *
 *     node scripts/crew-shots.mjs
 */
import { chromium } from '@playwright/test'

const VIEWPORTS = [
  ['desktop', 1440, 900], ['laptop', 1280, 800],
  ['phone-360', 360, 780], ['phone-390', 390, 844], ['phone-430', 430, 932],
]

const b = await chromium.launch()
for (const [name, w, h] of VIEWPORTS) {
  const p = await b.newPage({ viewport: { width: w, height: h }, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) })
  await p.goto('http://localhost:4173/', { waitUntil: 'load' })
  await p.locator('[data-alley-enter]').click()
  await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await p.waitForTimeout(6000)
  await p.screenshot({ path: `/tmp/crew_${name}.png` })
  // And again once the room has had time to spread out and get busy.
  await p.waitForTimeout(40000)
  await p.screenshot({ path: `/tmp/crew_${name}_later.png` })
  const state = await p.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((el) => {
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(el.style.transform)
    const f = /\/dokkaebi\/\w+\/(\w+)\/(\w+)\//.exec(el.querySelector('img')?.src ?? '')
    return `${el.dataset.npc} ${f ? `${f[1]}:${f[2]}` : '-'} @${Math.round(+(m?.[1] ?? 0))}`
  }))
  console.log(name.padEnd(10), state.join('   '))
  await p.close()
}
await b.close()
