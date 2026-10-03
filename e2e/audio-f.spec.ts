import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * SITE UPGRADE PHASE F — one audio system.
 *
 * MASTER → AMBIENT · MUSIC · SFX · UI. What these hold the site to: nothing
 * before a gesture, mute means silent everywhere, one song at a time
 * (the music box included), the radio's switch and dial always telling the
 * truth, no player piling up behind a panel opened twice, no double clicks,
 * the tab and the page cleaned up after, and the console quiet.
 */
declare global {
  interface Window {
    __a: { created: number; contexts: number; plays: { t: number; src: string; gesture: boolean }[]; gesture: boolean }
    __audio?: {
      musicSounding: readonly string[]
      radioOn: boolean
      station: string | null
      stationPlaying: boolean
      mixer: { snapshot(): { routed: boolean; elements: Record<string, number> }; busOf(el: HTMLMediaElement): string | null }
      play(name: string, v?: number): void
      playWorld(src: string, v: number, ms?: number, owner?: string): void
      holdWorld(held: boolean, ms?: number): void
      loop(key: string, src: string, v: number, ms?: number): void
      unloop(key: string, ms?: number): void
      stopWorld(ms?: number): void
    }
  }
}

test.use({ launchOptions: { args: ['--autoplay-policy=user-gesture-required'] } })

async function instrument(page: Page, errors: string[]): Promise<void> {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('kept')) {
        localStorage.clear()
        localStorage.setItem('eungarage:garageHinted', 'true')
      }
    } catch { /* private mode */ }
    const w = window
    w.__a = { created: 0, contexts: 0, plays: [], gesture: false }
    const A = w.Audio
    const Counted = function (this: unknown, src?: string) { w.__a.created++; return new A(src) } as unknown as typeof Audio
    Counted.prototype = A.prototype
    w.Audio = Counted
    const AC = w.AudioContext
    if (AC) w.AudioContext = class extends AC { constructor(o?: AudioContextOptions) { super(o); w.__a.contexts++ } }
    const play = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__a.plays.push({ t: performance.now(), src: (this.currentSrc || this.src).replace(location.origin, ''), gesture: w.__a.gesture })
      return play.call(this)
    }
    for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, () => { w.__a.gesture = true }, true)
  })
}

const soundOn = async (page: Page, touch = false): Promise<void> => {
  const b = page.locator('[data-sound-toggle]').first()
  if (touch) await b.tap()
  else await b.click()
  await expect(b).toHaveAttribute('aria-pressed', 'true')
}

async function enter(page: Page, touch = false): Promise<void> {
  const e = page.locator('[data-alley-enter]')
  if (touch) await e.tap()
  else await e.click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(3500)
}

async function open(page: Page, id: string): Promise<void> {
  const t = page.locator(`[data-object="${id}"]`)
  await t.focus()
  await page.waitForTimeout(300)
  await t.press('Enter')
  await expect(page.locator('[data-panel-root]')).toBeVisible({ timeout: 6000 })
  await page.waitForTimeout(700)
}

async function close(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-panel-root]')).toBeHidden({ timeout: 6000 })
  await page.waitForTimeout(400)
}

const sounding = (page: Page) => page.evaluate(() => window.__audio!.musicSounding.map((s) => s.replace(location.origin, '')))

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('nothing sounds, and no context exists, before the visitor does something; after, everything played came from a gesture', async ({ page }) => {
    const errors: string[] = []
    await instrument(page, errors)
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await page.waitForTimeout(3000)
    expect(await page.evaluate(() => ({ plays: window.__a.plays.length, contexts: window.__a.contexts }))).toEqual({ plays: 0, contexts: 0 })
    await soundOn(page)
    await enter(page)
    const r = await page.evaluate(() => ({ contexts: window.__a.contexts, early: window.__a.plays.filter((p) => !p.gesture).length, routed: window.__audio!.mixer.snapshot().routed }))
    expect(r.contexts, 'one context for the whole site').toBe(1)
    expect(r.early, 'something played before any gesture').toBe(0)
    expect(r.routed, 'the buses are not in use').toBe(true)
    expect(await sounding(page)).toEqual(['/assets/audio/music/garage.m4a'])
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('MASTER mute: every bus silent, nothing new starts, and unmuting brings back exactly what was on', async ({ page }) => {
    const errors: string[] = []
    await instrument(page, errors)
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    await open(page, 'radio')
    await page.locator('[data-radio-power]').click()
    await page.locator('[data-station="2"]').click()
    await page.waitForTimeout(1500)
    await close(page)
    const before = await sounding(page)
    expect(before).toEqual(['/assets/audio/sfx/radio_static_bed.m4a'])
    await page.locator('[data-sound-toggle]').first().click()
    await page.waitForTimeout(500)
    const n = await page.evaluate(() => window.__a.plays.length)
    for (const id of ['pc', 'tv', 'fridge', 'radio', 'cabinet']) {
      await open(page, id)
      await close(page)
    }
    const muted = await page.evaluate((n) => ({
      newPlays: window.__a.plays.slice(n).map((p) => p.src),
      sounding: [...document.querySelectorAll('audio, video')].length,
      music: window.__audio!.musicSounding.length,
    }), n)
    expect(muted.newPlays, 'sound leaked while muted').toEqual([])
    expect(muted.music).toBe(0)
    await page.locator('[data-sound-toggle]').first().click()
    await page.waitForTimeout(1500)
    expect(await sounding(page), 'not the same station after unmuting').toEqual(before)
    expect(errors).toEqual([])
  })

  test('one song at a time: the room, the radio on every station, off again — and the music box takes the archive song\'s place, not a place beside it', async ({ page }) => {
    const errors: string[] = []
    await instrument(page, errors)
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    const most: number[] = []
    const watch = async (ms: number) => {
      const t0 = Date.now()
      while (Date.now() - t0 < ms) {
        most.push((await sounding(page)).length)
        await page.waitForTimeout(100)
      }
    }
    await open(page, 'radio')
    await page.locator('[data-radio-power]').click()
    await watch(1500)
    for (const i of [0, 1, 2, 3, 1]) {
      await page.locator(`[data-station="${i}"]`).click()
      await watch(900)
    }
    await page.locator('[data-radio-power]').click()
    await watch(1800)
    await close(page)
    expect(Math.max(...most), 'two songs at once').toBeLessThanOrEqual(1)
    expect(await sounding(page)).toEqual(['/assets/audio/music/garage.m4a'])
    // The archive and its music box, driven directly.
    await page.evaluate(() => window.__audio!.playWorld('/assets/audio/music/archive.m4a', 0.26, 0, 'archive'))
    await page.waitForTimeout(1200)
    expect(await sounding(page)).toEqual(['/assets/audio/music/archive.m4a'])
    await page.evaluate(() => { window.__audio!.holdWorld(true, 300); window.__audio!.loop('musicBox', '/assets/audio/music/music_box.m4a', 0.34, 0) })
    await page.waitForTimeout(900)
    expect(await sounding(page), 'the box played over the archive song').toEqual(['/assets/audio/music/music_box.m4a'])
    await page.evaluate(() => { window.__audio!.unloop('musicBox', 0); window.__audio!.holdWorld(false, 300) })
    await page.waitForTimeout(900)
    expect(await sounding(page)).toEqual(['/assets/audio/music/archive.m4a'])
    expect(errors).toEqual([])
  })

  test('the radio: opened and closed five times, retuned each time — its switch and dial tell the truth, and no player piles up', async ({ page }) => {
    const errors: string[] = []
    await instrument(page, errors)
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    await open(page, 'radio')
    await page.locator('[data-radio-power]').click()
    await page.waitForTimeout(1200)
    await close(page)
    const made = await page.evaluate(() => window.__a.created)
    const tracks = ['/assets/audio/music/garage.m4a', '/assets/audio/ambient.m4a', '/assets/audio/sfx/radio_static_bed.m4a', '/assets/audio/sfx/radio_static_bed.m4a']
    for (let i = 0; i < 5; i++) {
      await open(page, 'radio')
      // Opening it shows what is on, without starting anything again.
      await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'true')
      const st = i % 4
      await page.locator(`[data-station="${st}"]`).click()
      await page.waitForTimeout(900)
      await expect(page.locator(`[data-station="${st}"]`)).toHaveAttribute('aria-checked', 'true')
      expect(await sounding(page)).toEqual([tracks[st]])
      await close(page)
    }
    const grew = await page.evaluate((m) => window.__a.created - m, made)
    // At most the one stream player and the two station clips made once.
    expect(grew, `${grew} new players for five visits`).toBeLessThanOrEqual(2)
    await open(page, 'radio')
    await page.locator('[data-radio-power]').click()
    await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'false')
    await page.waitForTimeout(1600)
    expect(await page.evaluate(() => window.__audio!.radioOn)).toBe(false)
    expect(await sounding(page)).toEqual(['/assets/audio/music/garage.m4a'])
    expect(errors).toEqual([])
  })

  test('a click twice in one frame is one sound, and a burst of effects never piles past four', async ({ page }) => {
    await instrument(page, [])
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    const r = await page.evaluate(async () => {
      const a = window.__audio!
      const n0 = window.__a.plays.length
      a.play('pc_click', 0.2)
      a.play('pc_click', 0.2)
      const twice = window.__a.plays.length - n0
      for (const c of ['paper', 'door_open', 'drawer_open', 'fridge_open', 'star_get', 'broom', 'lantern']) a.play(c, 0.2)
      await new Promise((r) => setTimeout(r, 50))
      const els = [...new Set([...document.querySelectorAll<HTMLMediaElement>('audio')])]
      void els
      return { twice, burst: window.__a.plays.slice(n0).length }
    })
    expect(r.twice, 'a double trigger played twice').toBe(1)
    // pc_click + at most three more while it rings.
    expect(r.burst).toBeLessThanOrEqual(4)
  })

  test('every element that sounds belongs to a bus', async ({ page }) => {
    await instrument(page, [])
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    await open(page, 'pc')
    await close(page)
    await open(page, 'fridge')
    await close(page)
    const snap = await page.evaluate(() => window.__audio!.mixer.snapshot())
    expect(snap.routed).toBe(true)
    expect(snap.elements['music']).toBeGreaterThanOrEqual(1)
    expect(snap.elements['ui']).toBeGreaterThanOrEqual(1)
    expect(snap.elements['sfx']).toBeGreaterThanOrEqual(1)
  })

  test('the tab hidden is silent; back, the same song and no new player', async ({ page }) => {
    await instrument(page, [])
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    const before = await sounding(page)
    const made = await page.evaluate(() => window.__a.created)
    const vis = (hidden: boolean) => page.evaluate((h) => {
      Object.defineProperty(document, 'hidden', { value: h, configurable: true })
      Object.defineProperty(document, 'visibilityState', { value: h ? 'hidden' : 'visible', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }, hidden)
    await vis(true)
    await page.waitForTimeout(500)
    expect(await sounding(page)).toEqual([])
    await vis(false)
    await page.waitForTimeout(1200)
    expect(await sounding(page)).toEqual(before)
    expect(await page.evaluate((m) => window.__a.created - m, made)).toBe(0)
  })

  test('the sound switch is remembered, and remembering it never starts anything before a gesture', async ({ page }) => {
    await instrument(page, [])
    await page.goto('/?audiodebug', { waitUntil: 'load' })
    await soundOn(page)
    await page.evaluate(() => sessionStorage.setItem('kept', '1'))
    await page.reload({ waitUntil: 'load' })
    await expect(page.locator('[data-sound-toggle]').first()).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(2500)
    expect(await page.evaluate(() => ({ plays: window.__a.plays.length, contexts: window.__a.contexts }))).toEqual({ plays: 0, contexts: 0 })
    await page.locator('[data-sound-toggle]').first().click()
    await page.reload({ waitUntil: 'load' })
    await expect(page.locator('[data-sound-toggle]').first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('the crew\'s footsteps stop while a panel is up, even if somebody is still walking behind it', async ({ page }) => {
    await instrument(page, [])
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    // Somebody walking, on screen.
    await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('.npc')].some((el) => {
      if (el.dataset['state'] !== 'WALK' || el.classList.contains('is-away')) return false
      const r = el.querySelector('.npc__art')!.getBoundingClientRect()
      return r.right > 0 && r.left < innerWidth
    }), null, { timeout: 60_000, polling: 100 })
    const t = page.locator('[data-object="tv"]')
    await t.focus()
    await t.press('Enter')
    await expect(page.locator('[data-panel-root]')).toBeVisible({ timeout: 6000 })
    const n = await page.evaluate(() => window.__a.plays.length)
    await page.waitForTimeout(4000)
    const steps = await page.evaluate((n) => window.__a.plays.slice(n).filter((p) => /crew_step/.test(p.src)).length, n)
    expect(steps, 'footsteps under an open panel').toBe(0)
  })

  test('going to a work\'s page ends the garage\'s sound with the page', async ({ page }) => {
    await instrument(page, [])
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    expect((await sounding(page)).length).toBe(1)
    await page.evaluate(() => sessionStorage.setItem('kept', '1'))
    await open(page, 'pc')
    await page.locator('[data-game="lunai"]').click()
    await expect(page).toHaveURL(/\/works\/lunai\.html$/)
    await page.waitForTimeout(1500)
    expect(await page.evaluate(() => window.__a.plays.length), 'the works page made a sound').toBe(0)
  })
})

test.describe('reduced motion', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

  test('asks for less movement, not for less sound', async ({ page }) => {
    await instrument(page, [])
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await soundOn(page)
    await enter(page)
    expect(await sounding(page)).toEqual(['/assets/audio/music/garage.m4a'])
  })
})

test.describe('a phone (touch, like iOS Safari)', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('nothing is played before ENTER is tapped, and everything after came from a tap', async ({ page }) => {
    const errors: string[] = []
    await instrument(page, errors)
    await page.goto('/?audiodebug&npcseed=7', { waitUntil: 'load' })
    await page.waitForTimeout(2500)
    expect(await page.evaluate(() => window.__a.plays.length)).toBe(0)
    await soundOn(page, true)
    expect(await page.evaluate(() => window.__a.plays.length), 'turning sound on in the alley played something').toBe(0)
    await enter(page, true)
    const early = await page.evaluate(() => window.__a.plays.filter((p) => !p.gesture).length)
    expect(early).toBe(0)
    expect((await sounding(page)).length).toBe(1)
    expect(errors).toEqual([])
  })
})
