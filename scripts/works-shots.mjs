// WORKS, at the three sizes that matter: the index, each work's bench (top
// and the whole page), the picture viewer, and the polaroid traces. Records
// console errors, failed requests and pictures that never decoded.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/works-shots.mjs ../shots/works
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/works'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const b = await chromium.launch()
let bad = 0
const ids = ['lunai', 'liminal', 'wormup', 'lumiora', 'rubato']
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  if (only && !only.includes(name)) continue
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
  page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
  page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
  const settle = async () => {
    await page.waitForLoadState('load')
    await page.evaluate(async () => { for (const i of document.images) { i.loading = 'eager'; if (!i.complete) await new Promise((r) => { i.onload = r; i.onerror = r }) } })
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0).map((i) => i.src))
    for (const s of broken) { console.log('  broken image', s); bad += 1 }
    await page.waitForTimeout(300)
  }
  await page.goto(`${origin}/works.html`); await settle()
  await page.screenshot({ path: `${out}/${name}_index.png` })
  await page.screenshot({ path: `${out}/${name}_index_full.png`, fullPage: true })
  for (const id of ids) {
    await page.goto(`${origin}/works/${id}.html`); await settle()
    await page.screenshot({ path: `${out}/${name}_${id}_top.png` })
    await page.screenshot({ path: `${out}/${name}_${id}_full.png`, fullPage: true })
  }
  await page.goto(`${origin}/works/lumiora.html`); await settle()
  await page.locator('[data-shot="1"]').click()
  await page.waitForFunction(() => document.querySelector('.work-view__img')?.complete)
  await page.screenshot({ path: `${out}/${name}_viewer.png` })
  await page.keyboard.press('Escape')
  await page.locator('[data-traces]').click()
  await page.waitForFunction(() => document.querySelector('.work-view__img')?.complete)
  await page.screenshot({ path: `${out}/${name}_traces.png` })
  await ctx.close()
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'works shots clean')
