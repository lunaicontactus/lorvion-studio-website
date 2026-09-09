/**
 * Runtime QA for the dokkaebi sprites, against a running preview.
 *
 * Everything here is measured in a real browser rather than reasoned about:
 * frame rate under load, what the anchor does across a pose change, whether
 * the feet keep up with the floor, and what the first screen actually costs.
 *
 *   node scripts/npc-qa.mjs [origin] [outdir]
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const ORIGIN = process.argv[2] ?? 'http://localhost:4173'
const OUT = process.argv[3] ?? '/tmp/npcqa'
mkdirSync(OUT, { recursive: true })
const R = {}

const browser = await chromium.launch()

async function room(opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1440, height: 900 },
    hasTouch: !!opts.touch, isMobile: !!opts.touch,
    ...(opts.reducedMotion ? { reducedMotion: 'reduce' } : {}),
  })
  const page = await ctx.newPage()
  const errors = []
  const net = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('response', async (r) => {
    try {
      net.push({ url: r.url(), size: Number((await r.allHeaders())['content-length'] ?? 0) })
    } catch {
      /* a response that vanished before its headers could be read */
    }
  })
  await page.goto(ORIGIN + (opts.query ?? ''), { waitUntil: 'load' })
  return { ctx, page, errors, net }
}

async function enter(page) {
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForFunction(() => document.querySelector('.npc__art')?.getAttribute('src'))
  await page.waitForTimeout(800)
}

const fps = (page, ms) => page.evaluate(async (ms) => {
  let n = 0; const t0 = performance.now()
  await new Promise((done) => {
    const tick = () => {
      n++
      if (performance.now() - t0 < ms) requestAnimationFrame(tick)
      else done()
    }
    requestAnimationFrame(tick)
  })
  return +(n / ((performance.now() - t0) / 1000)).toFixed(1)
}, ms)

const heap = (page) => page.evaluate(() =>
  +(((performance.memory?.usedJSHeapSize ?? 0) / 1048576).toFixed(1)))

// ── 1. desktop: cost of the first screen, then of the room ─────────────────
{
  const { ctx, page, errors, net } = await room()
  const before = net.reduce((a, x) => a + x.size, 0)
  await enter(page)
  await page.waitForTimeout(4000)
  const after = net.reduce((a, x) => a + x.size, 0)
  const sprite = net.filter((x) => x.url.includes('/dokkaebi/momo/'))
  R.load = {
    entranceKB: Math.round(before / 1024),
    roomKB: Math.round((after - before) / 1024),
    spriteFrames: sprite.length,
    spriteKB: Math.round(sprite.reduce((a, x) => a + x.size, 0) / 1024),
  }
  R.dom = await page.evaluate(() => ({
    total: document.querySelectorAll('*').length,
    npc: document.querySelectorAll('.npc').length,
    npcChildren: document.querySelectorAll('.npc *').length,
  }))
  R.fps1 = await fps(page, 5000)
  R.heap1 = await heap(page)
  R.errors = errors.length ? errors : 'none'

  // Poses over a minute: direction changes, action changes, and whether the
  // idle after a walk keeps the direction the walk ended on.
  const trace = await page.evaluate(async () => {
    const art = document.querySelector('.npc__art')
    const seen = []
    const t0 = Date.now()
    while (Date.now() - t0 < 60000) {
      const m = art.getAttribute('src')?.match(/momo\/(\w+)\/(\w+)\//)
      if (m) {
        const k = `${m[1]}:${m[2]}`
        if (seen[seen.length - 1]?.k !== k) seen.push({ k, t: Date.now() - t0 })
      }
      await new Promise((r) => setTimeout(r, 50))
    }
    return seen
  })
  R.trace = trace
  let flaps = 0
  for (let i = 1; i < trace.length; i++) {
    if (trace[i].t - trace[i - 1].t < 300) flaps++
  }
  R.poseChanges = trace.length
  R.rapidChanges = flaps
  R.idleKeepsDirection = trace.filter((s, i) =>
    i > 0 && s.k.startsWith('idle:') && trace[i - 1].k.startsWith('walk:') &&
    s.k.split(':')[1] === trace[i - 1].k.split(':')[1]).length
  R.idleAfterWalk = trace.filter((s, i) =>
    i > 0 && s.k.startsWith('idle:') && trace[i - 1].k.startsWith('walk:')).length
  await ctx.close()
}

// ── 2. walk cadence: floor covered per animation cycle ─────────────────────
{
  const { ctx, page } = await room({ query: '?npcseed=7' })
  await enter(page)
  const m = await page.evaluate(async () => {
    const el = document.querySelector('.npc')
    const art = el.querySelector('.npc__art')
    const wx = () => +/translate3d\((-?[\d.]+)px/.exec(el.style.transform)[1]
    const t0 = Date.now()
    let started = null, frames = 0, last = null, x0 = 0, x1 = 0
    while (Date.now() - t0 < 40000) {
      const src = art.getAttribute('src') ?? ''
      const walk = src.includes('/walk/')
      if (walk && started === null) { started = Date.now(); x0 = wx(); last = src }
      if (walk && started !== null && src !== last) { frames++; last = src; x1 = wx() }
      if (!walk && started !== null && frames >= 8) {
        return { seconds: (Date.now() - started) / 1000, frames, world: Math.abs(x1 - x0) }
      }
      await new Promise((r) => setTimeout(r, 16))
    }
    return null
  })
  if (m) {
    const cycles = m.frames / 8
    R.cadence = {
      framesPlayed: m.frames,
      seconds: +m.seconds.toFixed(2),
      measuredFps: +(m.frames / m.seconds).toFixed(1),
      worldTravelled: Math.round(m.world),
      floorPerCycle: Math.round(m.world / cycles),
      stridePerCycle: 89,
    }
  }
  await ctx.close()
}

// ── 3. anchor across a pose change, and the hit box ────────────────────────
{
  const { ctx, page } = await room()
  await enter(page)
  const anchor = await page.evaluate(async () => {
    const art = document.querySelector('.npc__art')
    const out = []
    const t0 = Date.now()
    while (Date.now() - t0 < 30000) {
      const r = art.getBoundingClientRect()
      const src = art.getAttribute('src') ?? ''
      out.push({ bottom: +r.bottom.toFixed(1), cx: +((r.left + r.right) / 2).toFixed(1),
                 h: +r.height.toFixed(1), walk: src.includes('/walk/') })
      await new Promise((r2) => setTimeout(r2, 100))
    }
    return out
  })
  const still = anchor.filter((a) => !a.walk)
  R.anchor = {
    heightSpread: +(Math.max(...anchor.map(a => a.h)) - Math.min(...anchor.map(a => a.h))).toFixed(1),
    idleBottomSpread: still.length ? +(Math.max(...still.map(a => a.bottom)) - Math.min(...still.map(a => a.bottom))).toFixed(1) : null,
    samples: anchor.length,
  }
  R.hit = await page.evaluate(() => {
    const h = document.querySelector('.npc__hit')
    const b = h.getBoundingClientRect()
    const art = document.querySelector('.npc__art').getBoundingClientRect()
    const at = (x, y) => document.elementFromPoint(x, y)?.className ?? 'none'
    return {
      box: { w: Math.round(b.width), h: Math.round(b.height) },
      art: { w: Math.round(art.width), h: Math.round(art.height) },
      onBody: at(b.left + b.width / 2, b.bottom - b.height / 2),
      besideBody: at(art.left + 6, art.top + art.height / 2),
    }
  })
  R.depth = await page.evaluate(() => {
    const npc = document.querySelector('.npc')
    const things = [...document.querySelectorAll('.thing')].map((t) => ({
      id: [...t.classList].find((c) => c.startsWith('thing--'))?.replace('thing--', ''),
      z: getComputedStyle(t).zIndex,
    }))
    return { npcZ: npc.style.zIndex, things: things.slice(0, 4) }
  })
  await ctx.close()
}

// ── 4. five at once ────────────────────────────────────────────────────────
{
  const { ctx, page } = await room()
  await enter(page)
  await page.evaluate(() => {
    const npc = document.querySelector('.npc')
    for (let i = 1; i <= 4; i++) {
      const c = npc.cloneNode(true)
      c.dataset.clone = '1'
      npc.parentElement.append(c)
    }
    // Drive the clones off the same clock the real one uses.
    const arts = [...document.querySelectorAll('.npc[data-clone] .npc__art')]
    let n = 0
    setInterval(() => {
      n++
      arts.forEach((a, i) => {
        const f = String(((n + i * 2) % 8) + 1).padStart(2, '0')
        a.src = `/assets/images/dokkaebi/momo/walk/left/momo_walk_left_${f}.webp`
      })
    }, 111)
  })
  await page.waitForTimeout(3000)
  R.fps5 = await fps(page, 5000)
  R.heap5 = await heap(page)
  R.dom5 = await page.evaluate(() => document.querySelectorAll('*').length)
  await ctx.close()
}

// ── 5. mobile ──────────────────────────────────────────────────────────────
R.mobile = []
for (const vp of [{ w: 360, h: 800 }, { w: 390, h: 844 }, { w: 430, h: 932 }]) {
  const { ctx, page, errors } = await room({ viewport: { width: vp.w, height: vp.h }, touch: true })
  await enter(page)
  await page.waitForTimeout(1500)
  const m = await page.evaluate(() => {
    const art = document.querySelector('.npc__art')
    const hit = document.querySelector('.npc__hit')
    const a = art?.getBoundingClientRect(); const h = hit?.getBoundingClientRect()
    return {
      spritePx: a ? Math.round(a.height) : null,
      hitPx: h ? `${Math.round(h.width)}x${Math.round(h.height)}` : null,
      onScreen: a ? (a.right > 0 && a.left < innerWidth && a.bottom > 0 && a.top < innerHeight) : null,
    }
  })
  R.mobile.push({ vp: `${vp.w}x${vp.h}`, ...m, fps: await fps(page, 4000), errors: errors.length })
  await ctx.close()
}

// ── 6. reduced motion, and a hidden tab ────────────────────────────────────
{
  const { ctx, page } = await room({ reducedMotion: true })
  await enter(page)
  const rm = await page.evaluate(async () => {
    const art = document.querySelector('.npc__art')
    const el = document.querySelector('.npc')
    const seen = new Set(); const pos = new Set()
    const t0 = Date.now()
    while (Date.now() - t0 < 6000) {
      seen.add(art.getAttribute('src')); pos.add(el.style.transform)
      await new Promise((r) => setTimeout(r, 100))
    }
    return { present: !!art, frames: seen.size, positions: pos.size }
  })
  R.reducedMotion = rm
  await ctx.close()
}

writeFileSync(`${OUT}/qa.json`, JSON.stringify(R, null, 2))
console.log(JSON.stringify(R, null, 2))
await browser.close()
