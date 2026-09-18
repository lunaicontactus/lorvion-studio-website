// The game, photographed at each of the six moments that matter.
//
//   node scripts/poko-shots.mjs ../reboot/poko
//
// Nothing waits for the boss to happen to turn round: the patrol is pinned
// with ?pokoseed, and the shots are taken by watching the state the game puts
// on the DOM. A test that waits for a random event is a test that hangs.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? '../reboot/poko'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()

const VIEWS = [
  ['desktop_1440x900', 1440, 900, false],
  ['phone_portrait_390x844', 390, 844, true],
  ['phone_landscape_844x390', 844, 390, true],
]

let bad = 0
for (const [name, w, h, mobile] of VIEWS) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e)))
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private */ }
  })
  await page.goto(`${origin}/?play=mugunghwa&pokoseed=7`, { waitUntil: 'load' })
  const enter = page.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await page.waitForSelector('[data-game-start]', { timeout: 20000 })
  await page.screenshot({ path: `${out}/${name}_0_ready.png` })

  if (mobile) await page.locator('[data-game-start]').tap()
  else await page.locator('[data-game-start]').click()
  await page.waitForFunction(() => document.querySelector('[data-game-overlay]')?.hidden === true, null, { timeout: 12000 })

  const state = () => page.getAttribute('[data-poko-boss]', 'data-state')
  const shootWhen = async (want, file, extra) => {
    const deadline = Date.now() + 45000
    while (Date.now() < deadline) {
      if (await state() === want) {
        if (extra) await extra()
        await page.screenshot({ path: `${out}/${file}.png` })
        console.log(`  ${name} ${file}: ok`)
        return true
      }
      await page.waitForTimeout(40)
    }
    console.log(`  ${name} ${file}: NOT SEEN`)
    bad += 1
    return false
  }

  // 1. Patrolling, nobody slacking.
  await shootWhen('PATROLLING', `${name}_1_patrol`)

  // 2. Slacking, with the button held down.
  const hold = async () => {
    if (mobile) {
      const pad = await page.locator('[data-poko-hold]').boundingBox()
      await page.mouse.move(pad.x + pad.width / 2, pad.y + pad.height / 2)
      await page.mouse.down()
    } else {
      await page.keyboard.down(' ')
    }
    await page.waitForTimeout(220)
  }
  const release = async () => {
    if (mobile) await page.mouse.up()
    else await page.keyboard.up(' ')
    await page.waitForTimeout(120)
  }
  await hold()
  await page.screenshot({ path: `${out}/${name}_2_slacking.png` })
  const slackScore = await page.locator('[data-game-score]').textContent()
  console.log(`  ${name} 2_slacking: score ${slackScore}`)
  if (Number(slackScore) <= 0) { console.log('    scored nothing while slacking'); bad += 1 }

  // 3. The warning, still holding — this is the moment the game is about.
  await shootWhen('WARNING', `${name}_3_warning`)
  // 4. Let go in time, and be looked at while working: safe.
  await release()
  await shootWhen('WATCHING', `${name}_4_watching_safe`)
  const safe = await page.locator('[data-game-result]').count()
  if (safe) { console.log(`  ${name}: caught after letting go in time`); bad += 1 }

  // 5. Now do it wrong on purpose: hold through a warning into the look.
  await page.waitForTimeout(400)
  await hold()
  const gotCaught = await page.waitForSelector('[data-game-result]', { timeout: 45000 }).catch(() => null)
  await release()
  if (gotCaught) {
    await page.screenshot({ path: `${out}/${name}_6_result.png` })
    const reason = await page.getAttribute('[data-game-result]', 'data-reason')
    const stars = await page.getAttribute('[data-game-result]', 'data-stars')
    console.log(`  ${name} 6_result: ${reason}, ${stars} stars`)
    if (reason !== 'caught') { console.log('    expected to be caught'); bad += 1 }
  } else {
    console.log(`  ${name} 6_result: NOT SEEN`)
    bad += 1
  }
  if (errs.length) { console.log('  errors:', errs); bad += errs.length }
  await ctx.close()
}
await b.close()
console.log(bad ? `\n${bad} problem(s)` : '\nall clear')
process.exitCode = bad ? 1 : 0
