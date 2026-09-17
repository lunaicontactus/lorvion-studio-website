import { chromium } from '@playwright/test'
const [w, h] = (process.argv[2] ?? '844x390').split('x').map(Number)
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 1000, hasTouch: w < 1000 })
const page = await ctx.newPage()
await page.goto('http://localhost:4180/', { waitUntil: 'load' })
await page.locator('[data-alley-enter]').click()
await page.waitForSelector('[data-garage-room] .thing')
const t0 = Date.now()
let lastPhase = ''
while (Date.now() - t0 < 150000) {
  const s = await page.evaluate(() => {
    const crew = [...document.querySelectorAll('[data-npc]')].map((n) => `${n.dataset.npc}:${n.dataset.state}@${Math.round(Number(/translate3d\((-?[\d.]+)px/.exec(n.style.transform)?.[1] ?? 0))}${n.classList.contains('is-away') ? '(away)' : ''}`)
    const br = document.querySelector('.garage__broom')
    return { crew, phase: br?.dataset.phase ?? '', live: br?.classList.contains('is-live'), lights: [...document.querySelectorAll('.garage__light.is-lit,.garage__light.is-on')].map((l) => l.dataset.light), scene: document.querySelector('[data-garage-room]').dataset.scene ?? '' }
  })
  const t = Math.round((Date.now() - t0) / 1000)
  if (s.phase !== lastPhase) { console.log(t, 'broom', s.phase || '-', s.crew.join(' ')); lastPhase = s.phase }
  else if (t % 10 === 0) console.log(t, s.crew.join(' '), 'lights', s.lights.join(','), 'scene', s.scene)
  await page.waitForTimeout(1000)
}
await b.close()
