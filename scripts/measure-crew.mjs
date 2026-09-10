import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:4173/', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(2500)
console.log(JSON.stringify(await p.evaluate(async () => {
  const out = []
  for (const el of document.querySelectorAll('[data-npc]')) {
    const img = el.querySelector('img')
    await img.decode().catch(() => {})
    const r = img.getBoundingClientRect()
    const hit = el.querySelector('.npc__hit')?.getBoundingClientRect()
    // Measure the actual painted figure inside the frame.
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data
    let top = -1, bot = -1
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (top < 0) top = y; bot = y; break }
    }
    const scale = r.height / c.height
    out.push({
      id: el.dataset.npc,
      frameCss: +r.height.toFixed(1),
      figureCss: +((bot - top + 1) * scale).toFixed(1),
      hit: hit ? `${hit.width.toFixed(0)}x${hit.height.toFixed(0)}` : '-',
    })
  }
  return out
}), null, 1))
await b.close()
