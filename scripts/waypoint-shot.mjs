/** The room with its waypoints drawn, panned so the whole floor is seen. */
import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4180/?npc=debug', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(1200)
for (const [name, x] of [['left', 1500], ['mid', 2100], ['right', 2900]]) {
  await p.evaluate((tx) => {
    const room = document.querySelector('.garage__room')
    const stage = getComputedStyle(document.querySelector('.garage__stage'))
    const s = +stage.getPropertyValue('--scale')
    room.style.transition = 'none'
    room.style.transform = `translate3d(${-(tx - 720 / s) * s}px, ${-(600 - 450 / s) * s}px, 0) scale(${s})`
  }, x)
  await p.waitForTimeout(250)
  await p.screenshot({ path: `/tmp/wp_${name}.png` })
}
await b.close()
