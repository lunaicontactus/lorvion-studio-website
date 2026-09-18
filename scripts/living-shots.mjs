// PHASE 6 — the garage living: the new standing places, the lights the
// visitor turns on, the broom mid-sweep, the depth at the wall, and the radio
// after the nav switch, at the three sizes the brief names.
//
//   QA_ORIGIN=http://localhost:4180 node scripts/living-shots.mjs ../shots/living
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
const out = process.argv[2] ?? '../shots/living'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
// Wait for the preview to answer.
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin)).ok) break } catch { /* not yet */ }
  await new Promise((r) => setTimeout(r, 500))
}
const b = await chromium.launch()
let bad = 0
const note = (page) => {
  page.on('pageerror', (e) => { console.log('  page error', String(e)); bad += 1 })
  page.on('console', (m) => { if (m.type() === 'error') { console.log('  console error', m.text()); bad += 1 } })
  page.on('response', (r) => { if (r.status() >= 400) { console.log('  http', r.status(), r.url()); bad += 1 } })
}
for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['portrait', 390, 844, true], ['landscape', 844, 390, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 })
  const open = async (query = '') => {
    const page = await ctx.newPage()
    note(page)
    await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear() } catch { /* */ } })
    await page.goto(`${origin}/${query}`, { waitUntil: 'load' })
    const enter = page.locator('[data-alley-enter]')
    if (mobile) await enter.tap(); else await enter.click()
    await page.waitForSelector('[data-garage-room] .thing', { timeout: 20000 })
    return page
  }
  // 1. The waypoints, drawn, so the new places can be seen against the plate.
  {
    const page = await open('?npc=debug')
    await page.waitForTimeout(2500)
    // The rest end is off the first view on a desk: pan there.
    if (!mobile) {
      await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(2600); await page.keyboard.up('ArrowLeft')
      await page.waitForTimeout(900)
    }
    await page.screenshot({ path: `${out}/${name}_01_waypoints_left.png` })
    await page.close()
  }
  // 2. The lights: cabinet and the outside door.
  {
    const page = await open()
    await page.waitForTimeout(1500)
    for (const [id, light] of [['cabinet', 'cabinet'], ['outside-door', 'moon']]) {
      const t = page.locator(`[data-object="${id}"]`)
      await t.focus(); await page.waitForTimeout(600); await t.press('Enter')
      await page.waitForSelector(`[data-light="${light}"].is-on`, { timeout: 4000 }).catch(() => { console.log('  no light', id); bad += 1 })
      await page.waitForSelector('[data-panel-root].is-open', { timeout: 8000 }).catch(() => { console.log('  did not open', id); bad += 1 })
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${out}/${name}_02_light_${id}.png` })
      // The light in the room itself, with the panel hidden for the shot.
      await page.evaluate(() => { document.querySelector('[data-panel-root]').style.visibility = 'hidden' })
      await page.waitForTimeout(150)
      await page.screenshot({ path: `${out}/${name}_02_light_${id}_room.png` })
      await page.evaluate(() => { document.querySelector('[data-panel-root]').style.visibility = '' })
      await page.keyboard.press('Escape'); await page.waitForTimeout(800)
    }
    await page.close()
  }
  // 3. The broom, mid-sweep. It comes out when there is a clear stretch.
  {
    const page = await open()
    const broom = page.locator('.garage__broom')
    const came = await broom.waitFor({ state: 'attached' }).then(() =>
      page.waitForFunction(() => document.querySelector('.garage__broom')?.dataset.phase === 'sweep', null, { timeout: 130000 }).then(() => true, () => false))
    if (!came) { console.log('  broom never came out'); bad += 1 } else {
      // Bring it into view.
      const x = await page.evaluate(() => {
        const el = document.querySelector('.garage__broom')
        return Number(/translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(el.style.transform)?.[1] ?? 0)
      })
      const y = await page.evaluate(() => Number(/, (-?[\d.]+)px/.exec(document.querySelector('.garage__broom').style.transform)?.[1] ?? 0))
      await page.evaluate(([bx, by]) => {
        const thing = document.querySelector('[data-garage-room]')
        thing.dataset.broomAt = `${bx},${by}`
      }, [x, y])
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${out}/${name}_03_broom_sweep.png` })
      await page.waitForFunction(() => document.querySelector('.garage__broom')?.dataset.phase === 'move', null, { timeout: 6000 }).catch(() => {})
      await page.waitForTimeout(900)
      await page.screenshot({ path: `${out}/${name}_03_broom_move.png` })
      // A close crop of the broom itself.
      const r = await page.evaluate(() => { const b = document.querySelector('.garage__broom').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height } })
      if (r.w > 0) await page.screenshot({ path: `${out}/${name}_03_broom_close.png`, clip: { x: Math.max(0, r.x - 160), y: Math.max(0, r.y - 60), width: Math.min(w, r.w + 320), height: Math.min(h, r.h + 120) } })
    }
    await page.close()
  }
  // 4. Depth at the wall: drag the room to one end.
  {
    const page = await open()
    await page.waitForTimeout(1200)
    await page.keyboard.down(mobile && h > w ? 'ArrowDown' : 'ArrowRight'); await page.waitForTimeout(3000); await page.keyboard.up(mobile && h > w ? 'ArrowDown' : 'ArrowRight')
    await page.waitForTimeout(1000)
    const fg = await page.evaluate(() => [document.querySelector('[data-garage-room]').style.getPropertyValue('--fgx'), document.querySelector('[data-garage-room]').style.getPropertyValue('--fgy'), document.querySelector('.garage__sky')?.style.transform ?? '-'])
    console.log('  ', name, 'depth at wall', fg.join(' '))
    await page.screenshot({ path: `${out}/${name}_04_depth_wall.png` })
    await page.close()
  }
  // 5. Sound on from the nav, then the radio says the same.
  {
    const page = await open()
    await page.waitForTimeout(800)
    const nav = page.locator('[data-sound-toggle]')
    if (mobile) await nav.tap(); else await nav.click()
    await page.waitForTimeout(600)
    const t = page.locator('[data-object="radio"]')
    await t.focus(); await page.waitForTimeout(500); await t.press('Enter')
    await page.waitForSelector('[data-panel-root].is-open', { timeout: 8000 }).catch(() => { bad += 1 })
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${out}/${name}_05_radio_after_nav.png` })
    await page.close()
  }
  await ctx.close()
  console.log('  ', name)
}
await b.close()
console.log(bad ? `${bad} problem(s)` : 'living shots done, no errors')
process.exitCode = bad ? 1 : 0
