// Catch the room being a room, and photograph it.
//
//   node scripts/crew-scenes.mjs ../reboot/crew
//
// Nothing here makes a scene happen: the room arranges its own, and this
// watches for each one and takes the picture when it arrives. One loop for all
// of them rather than one wait each — waiting for a greeting for four minutes
// while a scene at the bench comes and goes unphotographed is how the first
// version of this missed half of them.
//
// The camera is moved by focusing the thing the scene is about, which is the
// same path the keyboard takes, so every shot is of a room a visitor could be
// looking at.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? '../reboot/crew'
mkdirSync(out, { recursive: true })
const origin = process.env.QA_ORIGIN ?? 'http://localhost:4173'
const BUDGET = Number(process.env.BUDGET ?? 360_000)

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

await page.addInitScript(() => {
  try { sessionStorage.clear(); localStorage.clear() } catch { /* private */ }
})
await page.goto(`${origin}/`, { waitUntil: 'load' })
await page.locator('[data-alley-enter]').click()
await page.waitForFunction(() => document.querySelectorAll('[data-npc]').length > 0)
await page.waitForTimeout(1500)

// Everything the room does, written down as it happens, so the loop can ask
// "has this happened" instead of trying to be looking at the right moment.
await page.evaluate(() => {
  const w = window
  w.__log = { scenes: [], greets: 0, sits: 0 }
  const room = document.querySelector('[data-garage-room]')
  if (room) {
    new MutationObserver(() => {
      const s = room.dataset.scene
      if (s) w.__log.scenes.push(s)
    }).observe(room, { attributes: true, attributeFilter: ['data-scene'] })
  }
  for (const el of document.querySelectorAll('[data-npc]')) {
    new MutationObserver(() => {
      if (el.dataset.state === 'GREET') w.__log.greets += 1
      if (el.dataset.state === 'SIT') w.__log.sits += 1
    }).observe(el, { attributes: true, attributeFilter: ['data-state'] })
  }
})

const look = async (objectId) => {
  await page.evaluate((id) => document.querySelector(`[data-object="${id}"]`)?.focus(), objectId)
  await page.waitForTimeout(800)
}

// What to catch, and where to stand to see it.
//
// The camera is parked *before* the wait, not after. A scene at the bench
// lasts a second and a half and the pan takes most of one, so panning when it
// starts photographs the room a moment after everybody has gone back to work
// — which is what the first version of this did, and the picture showed an
// empty bench.
const WANTED = [
  {
    name: '4_parcel',
    park: 'parcel',
    when: () => document.querySelector('[data-garage-room]')?.dataset.scene === 'parcel',
  },
  {
    name: '1_greeting',
    park: null,
    when: () => [...document.querySelectorAll('[data-npc]')]
      .filter((e) => e.dataset.state === 'GREET').length >= 2,
  },
  {
    name: '2_bench_watch',
    park: 'workbench',
    when: () => document.querySelector('[data-garage-room]')?.dataset.scene === 'watchBench',
  },
  {
    name: '3_sitting',
    park: 'cabinet',
    when: () => [...document.querySelectorAll('[data-npc]')].some((e) => e.dataset.state === 'SIT'),
  },
  {
    name: '5_fridge',
    park: 'fridge',
    when: () => document.querySelector('[data-garage-room]')?.dataset.scene === 'fridge',
  },
]

console.log('watching the room...')
const caught = new Set()
const started = Date.now()
for (const target of WANTED) {
  if (target.park) await look(target.park)
  const share = Math.max(20_000, (started + BUDGET - Date.now()) / (WANTED.length - caught.size))
  const until = Date.now() + share
  while (Date.now() < until) {
    if (await page.evaluate(target.when)) {
      await page.screenshot({ path: `${out}/${target.name}.png` })
      caught.add(target.name)
      console.log(`  ${target.name}: caught (${Math.round((Date.now() - started) / 1000)}s)`)
      break
    }
    await page.waitForTimeout(150)
  }
  if (!caught.has(target.name)) console.log(`  ${target.name}: not seen from here`)
}

// The one shot that is ours to cause. Whoever is actually on screen — a hit
// area off the side of the window is one the pointer cannot reach, and a
// click that lands nowhere photographs nothing.
{
  const who = await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-npc]:not(.is-away)')) {
      const hit = el.querySelector('.npc__hit')
      if (!hit) continue
      const r = hit.getBoundingClientRect()
      if (!r.width) continue
      if (r.left < 40 || r.right > innerWidth - 40 || r.top < 80 || r.bottom > innerHeight - 40) continue
      // And not standing behind something the pointer would hit first. The
      // parcel's hit area is a button and it sits on the floor by the door,
      // which is exactly where one of them likes to stand.
      const top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)
      if (top && !hit.contains(top) && top !== hit) continue
      return el.dataset.npc
    }
    return null
  })
  if (!who) {
    console.log('  6_touched: nobody was on screen to touch')
  } else {
    await page.locator(`[data-npc="${who}"] .npc__hit`).click({ timeout: 8000 })
    await page.waitForTimeout(300)
    const state = await page.getAttribute(`[data-npc="${who}"]`, 'data-state')
    await page.screenshot({ path: `${out}/6_touched.png` })
    if (state === 'REACT') caught.add('6_touched')
    console.log(`  6_touched: ${who} is ${state}`)
  }
}

const log = await page.evaluate(() => window.__log)
const tally = {}
for (const s of log.scenes) tally[s] = (tally[s] ?? 0) + 1
console.log('\nscenes the room ran:', JSON.stringify(tally))
console.log('greetings:', log.greets, ' sits:', log.sits)
const missing = [...WANTED.map((w) => w.name), '6_touched'].filter((n) => !caught.has(n))
console.log(missing.length ? `\nnot captured: ${missing.join(', ')}` : '\nall six captured')
await b.close()
process.exitCode = missing.length ? 1 : 0
