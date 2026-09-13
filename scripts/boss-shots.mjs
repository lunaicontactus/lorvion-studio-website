/** Photograph every state the boss can be in, hiding on the warning until
 *  CHECK and DOZE are in the bag, then standing in the open to be caught. */
import { chromium } from '@playwright/test'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto('http://localhost:4180/', { waitUntil: 'load' })
await p.locator('[data-alley-enter]').click(); await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
await p.waitForTimeout(800)
await p.evaluate(() => document.querySelector('.thing--pc')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
await p.locator('[data-minigame="build"]').click(); await p.locator('[data-game-start]').click()
const want = new Set(['WORK', 'DOZE', 'WARN', 'CHECK', 'CAUGHT']); const got = {}
for (let i = 0; i < 900 && want.size; i++) {
  const s = await p.evaluate(() => document.querySelector('[data-build-boss]')?.dataset.state)
  if (s && want.has(s)) { await p.locator('[data-build-boss]').screenshot({ path: `/tmp/boss_${s}.png` }); want.delete(s); got[s] = 1 }
  const hidden = await p.evaluate(() => document.querySelector('[data-build-work]')?.hidden === false)
  const done = !want.has('CHECK') && !want.has('DOZE')
  if (!done && (s === 'WARN' || s === 'CHECK') && !hidden) await p.keyboard.press('Shift')
  if (!done && s !== 'WARN' && s !== 'CHECK' && hidden) await p.keyboard.press('Shift')
  if (done && hidden) await p.keyboard.press('Shift')
  if (i % 3 === 0 && !hidden && s !== 'WARN' && s !== 'CHECK') await p.keyboard.press('Space')
  await p.waitForTimeout(60)
}
console.log('captured', Object.keys(got).join(' '), ' missing', [...want].join(' ') || 'none')
await b.close()
