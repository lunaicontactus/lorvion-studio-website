// What the first screen costs, and what is (not) fetched before it is needed.
//   node scripts/perf-spot.mjs https://eungarage.com
import { chromium } from '@playwright/test'
const origin = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '')
const b = await chromium.launch()
const out = []
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.goto(`${origin}/`, { waitUntil: 'load' })
  await page.waitForTimeout(1500)
  const alley = await page.evaluate(() => {
    const res = performance.getEntriesByType('resource')
    const kb = (rs) => Math.round(rs.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024)
    const by = (re) => res.filter((r) => re.test(r.name))
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]))
    return { ...paints, requests: res.length, totalKB: kb(res), jsKB: kb(by(/\.js$/)), cssKB: kb(by(/\.css$/)), imageKB: kb(by(/\.(webp|png|jpg)$/)), audio: by(/\.m4a$/).length, otherWorlds: by(/playground|archive/).length }
  })
  const n0 = await page.evaluate(() => performance.getEntriesByType('resource').length)
  await page.locator('[data-alley-enter]').click()
  await page.waitForSelector('[data-garage-room] .thing', { timeout: 25000 })
  await page.waitForTimeout(4000)
  const room = await page.evaluate((n0) => {
    const res = performance.getEntriesByType('resource').slice(n0)
    const kb = (rs) => Math.round(rs.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024)
    return { requests: res.length, totalKB: kb(res), audio: res.filter((r) => /\.m4a$/.test(r.name)).map((r) => r.name.replace(location.origin, '')), otherWorlds: res.filter((r) => /playground|archive/.test(r.name)).map((r) => r.name.replace(location.origin, '')), gameAudio: res.filter((r) => /music\/(poko|snack|parcel)/.test(r.name)).length }
  }, n0)
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const tick = () => { n += 1; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else res(Math.round(n / 2)) }; requestAnimationFrame(tick) }))
  out.push({ name, alley, room, roomFps: fps })
  await ctx.close()
}
console.log(JSON.stringify(out, null, 1))
await b.close()
