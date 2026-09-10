import { chromium } from '@playwright/test'
const [out, w='1440', h='900', wait='2500', query=''] = process.argv.slice(2)
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: +w, height: +h } })
const errs = []
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
p.on('pageerror', (e) => errs.push(String(e)))
const bad = []
p.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`) })
await p.goto(`http://localhost:4173/${query}`, { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(+wait)
await p.screenshot({ path: out })
const who = await p.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => {
  const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(e.style.transform)
  const img = e.querySelector('img')
  const f = /\/dokkaebi\/\w+\/(\w+)\/(\w+)\//.exec(img?.src ?? '')
  return { id: e.dataset.npc, x: +(m?.[1] ?? 0), y: +(m?.[2] ?? 0), pose: f ? `${f[1]}:${f[2]}` : '-' }
}))
console.log(JSON.stringify(who, null, 1))
console.log('errors:', errs.length ? errs : 0, ' 4xx/5xx:', bad.length ? bad : 0)
await b.close()
