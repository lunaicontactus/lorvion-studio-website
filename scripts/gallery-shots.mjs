// What the wall actually looks like, and what opens when you touch it.
//
//   node scripts/gallery-shots.mjs ../reboot/gallery
//
// Pans to each piece rather than screenshotting the middle of the room and
// hoping: the camera is told to focus the thing by id, which is the same path
// the keyboard takes, so the shot is of the piece under a real camera move.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? '../reboot/gallery'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const b = await chromium.launch()
let bad = 0

/** Put a thing in the middle of the window, however far away it is. */
async function focus(p, id) {
  await p.evaluate((objectId) => {
    const el = document.querySelector(`[data-object="${objectId}"]`)
    el?.focus()
  }, id)
  await p.waitForTimeout(900)
}

for (const [name, w, h, mobile] of [
  ['desktop_1440x900', 1440, 900, false],
  ['phone_portrait_390x844', 390, 844, true],
  ['phone_landscape_844x390', 844, 390, true],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(String(e)))
  p.on('requestfailed', (r) => { if (r.url().includes('/artwork/')) errs.push(`failed ${r.url()}`) })
  p.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/artwork/')) errs.push(`${r.status()} ${r.url()}`) })

  await p.goto(`${origin}/`, { waitUntil: 'load' })
  const enter = p.locator('[data-alley-enter]')
  if (mobile) await enter.tap(); else await enter.click()
  await p.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await p.waitForTimeout(1600)

  await focus(p, 'poster-lunai')
  await p.screenshot({ path: `${out}/${name}_wall.png` })
  await focus(p, 'picture-lumiora')
  await p.screenshot({ path: `${out}/${name}_lumiora.png` })

  // Every print, measured: the frame the scene drew against the picture the
  // browser actually decoded. A crop would show up as a mismatch here.
  const prints = await p.evaluate(() => [...document.querySelectorAll('.print')].map((s) => {
    const img = s.querySelector('img')
    const r = img.getBoundingClientRect()
    return {
      id: s.dataset.artwork,
      declared: Number(s.dataset.aspect),
      natural: img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0,
      drawn: r.height ? r.width / r.height : 0,
      sheet: (() => { const q = s.getBoundingClientRect(); return q.height ? q.width / q.height : 0 })(),
      inside: (() => {
        const q = s.getBoundingClientRect()
        return r.left >= q.left - 0.6 && r.right <= q.right + 0.6
          && r.top >= q.top - 0.6 && r.bottom <= q.bottom + 0.6
      })(),
    }
  }))
  console.log(`\n${name}`)
  for (const pr of prints) {
    const off = Math.abs(pr.drawn - pr.natural) / (pr.natural || 1)
    const verdict = off < 0.02 && pr.inside ? 'ok' : 'CROPPED/ESCAPED'
    console.log(`  ${pr.id.padEnd(16)} declared ${pr.declared.toFixed(3)} natural ${pr.natural.toFixed(3)}`
      + ` drawn ${pr.drawn.toFixed(3)} sheet ${pr.sheet.toFixed(3)}  ${verdict}`)
    if (verdict !== 'ok') bad += 1
  }
  if (prints.length !== 5) { console.log(`  only ${prints.length} prints hung`); bad += 1 }

  // The viewer, on a tall picture and on a wide one.
  for (const [thing, shot] of [['poster-lunai', 'viewer_portrait'], ['poster-rubato', 'viewer_landscape']]) {
    await focus(p, thing)
    const el = p.locator(`[data-object="${thing}"]`)
    if (mobile) await el.tap(); else await el.click()
    await p.waitForSelector('[data-artwork-view]', { timeout: 6000 })
    await p.waitForTimeout(700)
    await p.screenshot({ path: `${out}/${name}_${shot}.png` })
    const fit = await p.evaluate(() => {
      const img = document.querySelector('[data-artwork-view] img')
      const r = img.getBoundingClientRect()
      return {
        drawn: r.width / r.height,
        natural: img.naturalWidth / img.naturalHeight,
        w: r.width, h: r.height,
        vw: innerWidth, vh: innerHeight,
      }
    })
    const off = Math.abs(fit.drawn - fit.natural) / fit.natural
    const ok = off < 0.02 && fit.w <= fit.vw * 0.92 && fit.h <= fit.vh * 0.88
    console.log(`  viewer ${thing.padEnd(14)} ${fit.w.toFixed(0)}x${fit.h.toFixed(0)}`
      + ` drawn ${fit.drawn.toFixed(3)} natural ${fit.natural.toFixed(3)} ${ok ? 'ok' : 'BAD'}`)
    if (!ok) bad += 1
    await p.keyboard.press('Escape')
    await p.waitForTimeout(400)
  }
  if (errs.length) { console.log('  errors:', errs); bad += errs.length }
  await ctx.close()
}
await b.close()
console.log(bad ? `\n${bad} problem(s)` : '\nall clear')
process.exitCode = bad ? 1 : 0
