/**
 * Play 빌드 중입니다, 부장님 the way a visitor would, and photograph it.
 *
 *   PC → 미니게임 → 시작 → jump a while → get caught on purpose →
 *   재도전 → hide every time the boss warns, and survive the round →
 *   차고로, and check the room is itself again.
 *
 *     node scripts/play-build.mjs [phone]
 */
import { chromium } from '@playwright/test'

const phone = process.argv[2] === 'phone'
const b = await chromium.launch()
const ctx = await b.newContext(phone
  ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
  : { viewport: { width: 1280, height: 800 } })
const p = await ctx.newPage()
const errors = []
p.on('pageerror', (e) => errors.push(String(e)))
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
const shot = (n) => p.screenshot({ path: `/tmp/play_${phone ? 'phone_' : ''}${n}.png` })
const state = () => p.evaluate(() => ({
  runner: document.querySelector('.game-layer') ? 'open' : 'closed',
  overlay: document.querySelector('[data-game-overlay]')?.hidden === false
    ? (document.querySelector('[data-game-result]') ? 'result'
      : document.querySelector('[data-game-resume]') ? 'paused' : 'ready') : 'playing',
  boss: document.querySelector('[data-build-boss]')?.dataset.state,
  screen: document.querySelector('[data-build-work]')?.hidden === false ? 'WORK' : 'GAME',
  score: document.querySelector('[data-game-score]')?.textContent,
  time: document.querySelector('[data-game-time]')?.textContent,
}))

await p.goto('http://localhost:4180/', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click()
await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(1200)
await p.evaluate(() => document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await p.locator('[data-minigame="build"]').waitFor({ state: 'visible', timeout: 8000 })
await shot('1_hub')
await p.locator('[data-minigame="build"]').click()
await p.locator('[data-game-start]').waitFor({ state: 'visible' })
console.log('ready:', await state())
await shot('2_ready')
await p.locator('[data-game-start]').click()
await p.waitForTimeout(1200)

const jump = async () => phone ? p.locator('[data-build-jump]').dispatchEvent('pointerdown') : p.keyboard.press('Space')
const swap = async () => phone ? p.locator('[data-build-swap]').dispatchEvent('pointerdown') : p.keyboard.press('Shift')
let caughtShot = false, warnShot = false
for (let i = 0; i < 260; i++) {
  const s = await state()
  if (s.boss === 'WARN' && !warnShot) { await shot('3_warning'); warnShot = true }
  if (s.overlay === 'result') { await shot('4_caught'); caughtShot = true; console.log('caught:', s); break }
  if (i % 4 === 0) await jump()
  await p.waitForTimeout(90)
}
if (!caughtShot) console.log('!! never caught in 23s of ignoring the boss')
console.log('result reason:', await p.evaluate(() => document.querySelector('[data-game-result]')?.dataset.reason), ' text:', await p.locator('.game__reason').textContent())

await p.locator('[data-game-retry]').click()
await p.waitForTimeout(300)
console.log('after retry:', await state())
let hid = 0, unhid = 0, hideShot = false
for (let i = 0; i < 700; i++) {
  const s = await state()
  if (s.overlay === 'result') { console.log('round over:', s); break }
  if ((s.boss === 'WARN' || s.boss === 'CHECK') && s.screen === 'GAME') { await swap(); hid++; if (!hideShot) { await p.waitForTimeout(150); await shot('5_hidden'); hideShot = true } }
  else if (s.boss !== 'WARN' && s.boss !== 'CHECK' && s.screen === 'WORK') { await swap(); unhid++ }
  else if (s.screen === 'GAME' && i % 4 === 0) await jump()
  await p.waitForTimeout(80)
}
console.log(`hid ${hid} times, came back ${unhid} times`)
console.log('second result:', await p.evaluate(() => document.querySelector('[data-game-result]')?.dataset.reason), await p.locator('.game__score b').textContent(), 'pts;', await p.locator('.game__meta').textContent())
await shot('6_timeout')

await p.locator('[data-game-retry]').click()
await p.waitForTimeout(800)
await p.evaluate(() => window.dispatchEvent(new Event('blur')))
await p.waitForTimeout(300)
const paused = await state()
console.log('after blur:', paused.overlay)
const t1 = paused.time
await p.waitForTimeout(1500)
console.log('timer while paused:', t1, '->', (await state()).time)
await shot('7_paused')
await p.locator('[data-game-resume]').click()
await p.waitForTimeout(500)
console.log('after resume:', (await state()).overlay)

await p.keyboard.press('Escape')
await p.locator('[data-game-exit]').click()
await p.waitForTimeout(600)
const back = await p.evaluate(() => ({
  layer: document.querySelector('.game-layer') !== null,
  rootHidden: document.querySelector('[data-game-root]').hidden,
  panel: document.querySelector('[data-panel-root]').hidden,
  crew: document.querySelectorAll('[data-npc]').length,
  paused: document.querySelector('.garage')?.classList.contains('is-paused'),
}))
console.log('back in the garage:', back)
const a = await p.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => e.style.transform))
await p.waitForTimeout(6000)
const c = await p.evaluate(() => [...document.querySelectorAll('[data-npc]')].map((e) => e.style.transform))
console.log('crew moved after return:', a.some((t, i) => t !== c[i]))
await p.evaluate(() => document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await p.locator('.hub__row').first().waitFor({ state: 'visible', timeout: 8000 })
console.log('PC opens again: yes')
await shot('8_back')
console.log('errors:', errors.length ? errors : 0)
await b.close()
