// POKO's glasses, close enough to judge.
//
//   node scripts/glasses-shots.mjs ../shots/glasses
//
// POKO as it normally is, the glasses from the front and from the side, the
// warning, and the game on a desktop and a phone. Head crops are taken at
// deviceScaleFactor 4, so they are exactly what the player sees, four times
// bigger (the rim is non-scaling-stroke). Every shot waits on the state the
// game writes to the DOM, with the patrol pinned by ?pokoseed.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? '../shots/glasses'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()
let bad = 0

async function enterGame(page, mobile) {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private */ }
  })
  await page.goto(`${origin}/?play=mugunghwa&pokoseed=7`, { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-game-start]', { timeout: 20000 })
  if (mobile) await page.locator('[data-game-start]').tap()
  else await page.locator('[data-game-start]').click()
  await page.waitForFunction(
    () => document.querySelector('[data-game-overlay]')?.hidden === true, null, { timeout: 12000 })
}

async function head(page, file) {
  const box = await page.locator('[data-poko-boss]').boundingBox()
  if (!box) { console.log(`  ${file}: no boss`); bad += 1; return }
  await page.screenshot({
    path: `${out}/${file}.png`,
    clip: { x: box.x - box.width * 0.18, y: box.y - 2, width: box.width * 1.36, height: box.height * 0.62 },
  })
  console.log(`  ${file}: ok`)
}

async function when(page, want, then) {
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    if (await page.getAttribute('[data-poko-boss]', 'data-state') === want) return then()
    await page.waitForTimeout(30)
  }
  console.log(`  never saw ${want}`)
  bad += 1
  return undefined
}

/** A head crop the first time POKO is seen walking each way. */
async function sides(page, tag) {
  const want = new Set(['left', 'right'])
  const until = Date.now() + 60000
  while (want.size && Date.now() < until) {
    const src = (await page.getAttribute('[data-poko-bossimg]', 'src')) ?? ''
    const state = await page.getAttribute('[data-poko-boss]', 'data-state')
    const m = /_walk_(left|right)_/.exec(src)
    if (state === 'PATROLLING' && m && want.has(m[1])) {
      want.delete(m[1])
      await head(page, `${tag}_side_${m[1]}`)
    }
    await page.waitForTimeout(30)
  }
  if (want.size) { console.log(`  never saw walking ${[...want].join(', ')}`); bad += 1 }
}

{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 4 })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { console.log('  page error:', String(e)); bad += 1 })
  await enterGame(page, false)
  await when(page, 'WATCHING', async () => {
    const tag = await page.addStyleTag({ content: '.poko__glasses{display:none!important}' })
    await head(page, 'desktop_1_plain')
    await tag.evaluate((el) => el.remove())
    await head(page, 'desktop_2_front')
  })
  await when(page, 'PATROLLING', () => head(page, 'desktop_3_patrol'))
  await sides(page, 'desktop_4')
  // The warning plays the head-turn: one crop per distinct frame.
  await when(page, 'WARNING', async () => {
    const done = new Set()
    const until = Date.now() + 1400
    while (Date.now() < until && done.size < 4) {
      const src = await page.getAttribute('[data-poko-bossimg]', 'src')
      if (src && !done.has(src) && await page.getAttribute('[data-poko-boss]', 'data-state') === 'WARNING') {
        done.add(src)
        await head(page, `desktop_5_warning_${done.size}`)
      }
      await page.waitForTimeout(20)
    }
  })
  await when(page, 'WATCHING', () => head(page, 'desktop_6_watching'))
  await ctx.close()
}

// The phone, both ways up: the warning and the look, at the size they are.
for (const [name, w, h] of [['portrait', 390, 844], ['landscape', 844, 390]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 4 })
  const page = await ctx.newPage()
  await enterGame(page, true)
  await when(page, 'WARNING', async () => { await page.waitForTimeout(150); await head(page, `${name}_warning`) })
  await when(page, 'WATCHING', () => head(page, `${name}_watching`))
  await ctx.close()
}

for (const [file, w, h, mobile] of [
  ['5_game_desktop_1440x900', 1440, 900, false],
  ['6_game_phone_390x844', 390, 844, true],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await enterGame(page, mobile)
  await when(page, 'WATCHING', async () => {
    await page.screenshot({ path: `${out}/${file}.png` })
    console.log(`  ${file}: ok`)
  })
  await ctx.close()
}

await b.close()
console.log(bad ? `${bad} problem(s)` : 'all taken')
process.exitCode = bad ? 1 : 0
