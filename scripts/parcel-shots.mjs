import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../reboot/parcel'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()
let bad = 0
for (const [name, w, h, mobile] of [
  ['desktop_1440x900', 1440, 900, false],
  ['phone_portrait_390x844', 390, 844, true],
  ['phone_landscape_844x390', 844, 390, true],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => { console.log('  error', String(e)); bad += 1 })
  await p.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* private */ } })
  await p.goto(`${origin}/?play=parcel&parcelseed=3`, { waitUntil: 'load' })
  const enter = p.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await p.waitForSelector('[data-game-start]', { timeout: 20000 })
  if (mobile) await p.locator('[data-game-start]').tap(); else await p.locator('[data-game-start]').click()
  await p.waitForFunction(() => document.querySelector('[data-game-overlay]')?.hidden === true, null, { timeout: 12000 })
  await p.waitForTimeout(250)
  await p.screenshot({ path: `${out}/${name}_1_early.png` })
  const right = async () => p.evaluate(() => {
    const label = document.querySelector('[data-parcel-label]').textContent
    return [...document.querySelectorAll('.parcel__pile')]
      .find((el) => el.querySelector('.parcel__pileName').textContent === label).dataset.choice
  })
  const tap = async (id) => {
    const el = p.locator(`[data-choice="${id}"]`)
    if (mobile) await el.tap(); else await el.click()
  }
  // Play on until the round is nearly over: the piles come out as it goes,
  // and a picture taken two seconds in is a picture of the easy half.
  const clock = async () => Number(await p.locator('[data-game-time]').textContent())
  while (await clock() > 11) {
    if (await p.locator('[data-game-result]').count()) break
    await tap(await right())
    await p.waitForTimeout(90)
  }
  await p.screenshot({ path: `${out}/${name}_2_late.png` })
  const piles = await p.locator('.parcel__pile').count()
  const score = await p.locator('[data-game-score]').textContent()
  console.log(`  ${name}: ${piles} piles out, score ${score}`)
  if (Number(score) <= 0) { console.log('    scored nothing'); bad += 1 }
  await ctx.close()
}
await b.close()
console.log(bad ? `\n${bad} problem(s)` : '\nall clear')
process.exitCode = bad ? 1 : 0
