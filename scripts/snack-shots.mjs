// The errand game at each viewport, with a wrong answer and a right one.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../reboot/snack'
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
  await p.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch {} })
  await p.goto(`${origin}/?play=snack&snackseed=5`, { waitUntil: 'load' })
  const enter = p.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await p.waitForSelector('[data-game-start]', { timeout: 20000 })
  await p.screenshot({ path: `${out}/${name}_0_ready.png` })
  if (mobile) await p.locator('[data-game-start]').tap(); else await p.locator('[data-game-start]').click()
  await p.waitForFunction(() => document.querySelector('[data-game-overlay]')?.hidden === true, null, { timeout: 12000 })
  await p.waitForTimeout(200)
  await p.screenshot({ path: `${out}/${name}_1_order.png` })
  const pick = await p.evaluate(() => {
    const says = document.querySelector('[data-snack-says]').textContent
    const items = [...document.querySelectorAll('.snack__item')]
    const right = items.find((el) => says.includes(el.querySelector('.snack__label').textContent))
    const wrong = items.find((el) => el !== right)
    return { says, right: right.dataset.choice, wrong: wrong.dataset.choice }
  })
  console.log(`  ${name}: "${pick.says}" → ${pick.right}`)
  // Wrong on purpose, for the picture of what that looks like.
  const tap = async (id) => {
    const el = p.locator(`[data-choice="${id}"]`)
    if (mobile) await el.tap(); else await el.click()
  }
  await tap(pick.wrong)
  await p.waitForTimeout(120)
  await p.screenshot({ path: `${out}/${name}_2_wrong.png` })
  // Then a few right ones, for the run counter.
  for (let i = 0; i < 4; i++) {
    const right = await p.evaluate(() => {
      const says = document.querySelector('[data-snack-says]').textContent
      return [...document.querySelectorAll('.snack__item')]
        .find((el) => says.includes(el.querySelector('.snack__label').textContent)).dataset.choice
    })
    await tap(right)
    await p.waitForTimeout(90)
  }
  await p.screenshot({ path: `${out}/${name}_3_run.png` })
  const score = await p.locator('[data-game-score]').textContent()
  console.log(`  ${name}: score after four ${score}`)
  if (Number(score) <= 0) { console.log('    scored nothing'); bad += 1 }
  await ctx.close()
}
await b.close()
console.log(bad ? `\n${bad} problem(s)` : '\nall clear')
process.exitCode = bad ? 1 : 0
