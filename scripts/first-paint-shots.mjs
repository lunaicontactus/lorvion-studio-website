/**
 * What a visitor actually sees in the first few seconds, and what the browser
 * asked for to show it.
 *
 * The site once opened with a curtain in front of the entrance, so "it looks
 * right once it settles" was not the question worth asking. This walks the
 * first frames one by one, then presses ENTER and keeps walking, so the whole
 * arrival can be read as a strip: load → entrance → ENTER → shutter → room.
 *
 *   node scripts/first-paint-shots.mjs [origin] [outDir]
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const origin = process.argv[2] ?? 'http://localhost:4173'
const out = process.argv[3] ?? 'e2e/shots/first-paint'
const LEGACY = '#intro, .intro__curtain, .intro__skip, #introSkip, .intro__art'
const OLD_DOOR = /brand\/eungarage_planet_garage_symbol/

const VIEWPORTS = [
  { name: '1920', width: 1920, height: 1080, touch: false },
  { name: '1440', width: 1440, height: 900, touch: false },
  { name: '768', width: 768, height: 1024, touch: true },
  { name: '430', width: 430, height: 932, touch: true },
  { name: '390', width: 390, height: 844, touch: true },
]

mkdirSync(out, { recursive: true })
const browser = await chromium.launch()
let bad = 0

for (const vp of VIEWPORTS) {
  // A visitor with nothing cached and nothing remembered.
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    hasTouch: vp.touch,
    isMobile: vp.touch,
  })
  const page = await ctx.newPage()
  const requests = []
  const problems = []
  page.on('request', (r) => requests.push(r.url()))
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`))

  const t0 = Date.now()
  await page.goto(origin, { waitUntil: 'commit' })
  const frames = []
  const shoot = async (label) => {
    frames.push({ label, t: Date.now() - t0, buf: await page.screenshot() })
  }
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(i === 0 ? 120 : 240)
    await shoot('load')
  }
  const legacy = await page.locator(LEGACY).count()
  const topmost = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2)
    return el?.closest('[data-alley]') ? 'entrance' : `${el?.tagName}.${el?.className}`
  })

  await page.locator('[data-alley-enter]').click()
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(300)
    await shoot('enter')
  }
  const inside = await page.evaluate(
    () => !document.querySelector('[data-garage]').hidden,
  )

  frames.forEach((f, i) =>
    writeFileSync(`${out}/${vp.name}-${String(i).padStart(2, '0')}-${f.label}-${f.t}ms.png`, f.buf),
  )
  const oldDoor = requests.filter((u) => OLD_DOOR.test(u))
  const ok = legacy === 0 && oldDoor.length === 0 && topmost === 'entrance' && inside && !problems.length
  if (!ok) bad++
  console.log(
    `${vp.name.padEnd(5)} legacy:${legacy} oldDoorArt:${oldDoor.length} firstScreen:${topmost} ` +
      `inside:${inside} problems:${problems.length ? problems.join(' | ') : 'none'} ${ok ? 'OK' : 'FAIL'}`,
  )
  await ctx.close()
}

await browser.close()
console.log(bad ? `\n${bad} viewport(s) failed` : '\nall viewports clean')
process.exit(bad ? 1 : 0)
