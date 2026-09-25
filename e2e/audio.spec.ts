import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The radio, and the rule that music is one thing at a time (WORLD 2.4).
 *
 * Every `play()` on every media element is recorded before the page runs,
 * so what is counted is what the browser was actually asked to sound, not
 * what the code meant. Music is the garage's song, the radio's station or
 * the world's track — and the file that used to hum under everything as a
 * "room tone" (ambient.m4a) is a track too, and counted as one. The loops
 * under the music (the night air outside, the music box) are not music.
 */
declare global {
  interface Window { __plays?: { t: number; src: string }[]; __els?: Set<HTMLMediaElement> }
}
const MUSIC = /garage\.m4a|ambient\.m4a|playground\.m4a|archive\.m4a|poko\.m4a|snack\.m4a|parcel\.m4a|radio_static/

async function spy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear() } catch { /* private mode */ }
    window.__plays = []
    window.__els = new Set()
    const orig = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      window.__els!.add(this)
      window.__plays!.push({ t: Math.round(performance.now()), src: (this.currentSrc || this.src || '').split('/').pop() ?? '' })
      return orig.call(this)
    }
  })
}
const plays = (page: Page, name: string): Promise<number> =>
  page.evaluate((n) => (window.__plays ?? []).filter((p) => p.src === n).length, name)
/** The music sounding now: elements not paused whose file is a track. */
const music = (page: Page): Promise<string[]> =>
  page.evaluate((re) => [...(window.__els ?? [])].filter((e) => !e.paused && new RegExp(re).test(e.currentSrc || e.src))
    .map((e) => (e.currentSrc || e.src).split('/').pop() ?? ''), MUSIC.source)
/** Where a track is, in seconds, paused or not. */
const at = (page: Page, name: string): Promise<number> =>
  page.evaluate((n) => [...(window.__els ?? [])].find((e) => (e.currentSrc || e.src).endsWith(n))?.currentTime ?? -1, name)

async function enter(page: Page, soundOn: boolean): Promise<void> {
  await spy(page)
  await page.goto('/?npcseed=7', { waitUntil: 'load' })
  if (soundOn) await page.locator('[data-sound-toggle]').click()
  await page.locator('[data-alley-enter]').click()
  await page.waitForFunction(() => document.querySelectorAll('.thing').length > 0)
  await page.waitForTimeout(2500)
}
async function openRadio(page: Page): Promise<void> {
  const radio = page.locator('[data-object="radio"]')
  await radio.focus()
  await page.waitForTimeout(600)
  await radio.press('Enter')
  await expect(page.locator('[data-radio]')).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(600)
}
/** Sample what is sounding every `every` ms for `ms`, and insist it was never two. */
async function neverTwo(page: Page, ms: number, every = 250): Promise<string[][]> {
  const seen: string[][] = []
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    seen.push(await music(page))
    await page.waitForTimeout(every)
  }
  for (const m of seen) expect(m.length, `two at once: ${m.join(' + ')}`).toBeLessThanOrEqual(1)
  return seen
}

// Headless Chromium is asked to let media play without a gesture, so what
// is measured is the site's own arbitration and not the browser's gate.
test.use({ viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

test.describe('the garage\'s song', () => {

  test('sound on in the room is the garage\'s own song, and nothing hums under it', async ({ page }) => {
    await enter(page, true)
    await page.waitForTimeout(1500)
    expect(await music(page)).toEqual(['garage.m4a'])
    // Not the track that used to play as a "room tone" under it.
    expect(await plays(page, 'ambient.m4a')).toBe(0)
    // And the radio in the corner is off: its knob is its own.
    await openRadio(page)
    await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('[data-radio-freq]')).toHaveText('OFF')
    expect(await music(page)).toEqual(['garage.m4a'])
  })
})

test.describe('the radio', () => {

  test('on: the song goes down and out, then the station; thirty seconds; channels; off: the song comes back where it was', async ({ page }) => {
    test.setTimeout(120_000)
    await enter(page, true)
    await openRadio(page)
    const power = page.locator('[data-radio-power]')
    const wasAt = await at(page, 'garage.m4a')
    expect(wasAt).toBeGreaterThan(1)
    // ON. Sampled closely through the handover: the song down to nothing
    // and paused, only then the station up — never both.
    await power.click()
    await expect(power).toHaveAttribute('aria-pressed', 'true')
    const hand = await neverTwo(page, 2200, 100)
    expect(hand[0]).toEqual(['garage.m4a'])
    // In order: the song, then the station, and the song never after it.
    const firstStation = hand.findIndex((m) => m.includes('ambient.m4a'))
    expect(firstStation, 'the station never came').toBeGreaterThan(0)
    expect(hand.slice(firstStation).some((m) => m.includes('garage.m4a')), 'the song came back under the station').toBe(false)
    expect(hand[hand.length - 1]).toEqual(['ambient.m4a'])
    expect(await page.locator('[data-radio-freq]').textContent()).toContain('91.7')
    expect(await plays(page, 'radio_tune.m4a'), 'the knob, once').toBe(1)
    // Thirty seconds on the air: one thing sounding, and never the song.
    const long = await neverTwo(page, 30_000, 500)
    for (const m of long) expect(m, 'the garage song came back under the station').not.toContain('garage.m4a')
    expect(long.every((m) => m.length === 1), 'the station dropped out').toBe(true)
    // Three changes of station: one at a time, and the song stays away.
    const next = page.locator('[data-radio-next]')
    await next.click()
    await neverTwo(page, 900, 100)
    expect(await music(page)).toEqual(['radio_static_bed.m4a'])
    await next.click()
    await neverTwo(page, 900, 100)
    expect(await music(page)).toEqual(['radio_static_bed.m4a'])
    await expect(page.locator('[data-radio]')).toHaveAttribute('data-station', 'static')
    await next.click()
    await neverTwo(page, 900, 100)
    // 88.1 GARAGE is the room's own song, on the dial: that is the radio.
    expect(await music(page)).toEqual(['garage.m4a'])
    await next.click()
    await neverTwo(page, 900, 100)
    expect(await music(page)).toEqual(['ambient.m4a'])
    expect(await plays(page, 'radio_tune.m4a'), 'a station change is not the knob').toBe(1)
    // OFF: the station down and out, then the song — from where it was
    // left, not from the top.
    const left = await at(page, 'garage.m4a')
    await power.click()
    await expect(power).toHaveAttribute('aria-pressed', 'false')
    const back = await neverTwo(page, 2000, 100)
    expect(back[0]).toEqual(['ambient.m4a'])
    const firstSong = back.findIndex((m) => m.includes('garage.m4a'))
    expect(firstSong, 'the song never came back').toBeGreaterThan(0)
    expect(back.slice(firstSong).some((m) => m.includes('ambient.m4a')), 'the station stayed under the song').toBe(false)
    expect(back[back.length - 1]).toEqual(['garage.m4a'])
    expect(await at(page, 'garage.m4a')).toBeGreaterThanOrEqual(left - 0.5)
    expect(await at(page, 'garage.m4a')).toBeLessThan(left + 3)
    // And the site's sound is still on: the knob is the radio's.
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true')
    expect(await plays(page, 'radio_tune.m4a'), 'off is not the power sound').toBe(1)
  })

  test('its power sound plays once, on off → on, and never again', async ({ page }) => {
    await enter(page, false)
    await openRadio(page)
    expect(await plays(page, 'radio_tune.m4a'), 'a click just for opening it').toBe(0)
    // The knob with the site silent: sound comes on, and the radio with it.
    await page.locator('[data-radio-power]').click()
    await expect(page.locator('[data-radio-power]')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-sound-toggle]')).toHaveAttribute('aria-pressed', 'true')
    await page.waitForTimeout(1500)
    expect(await plays(page, 'radio_tune.m4a')).toBe(1)
    // Ten seconds on: nothing about being on repeats it.
    await page.waitForTimeout(10000)
    expect(await plays(page, 'radio_tune.m4a')).toBe(1)
    // Changing the station is not switching it on.
    for (let i = 0; i < 4; i++) {
      await page.locator('[data-radio-next]').click()
      await page.waitForTimeout(700)
    }
    expect(await plays(page, 'radio_tune.m4a')).toBe(1)
    // The site's switch off and on is not the knob either.
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    await page.locator('[data-sound-toggle]').click()
    await page.waitForTimeout(400)
    await page.locator('[data-sound-toggle]').click()
    await page.waitForTimeout(900)
    expect(await plays(page, 'radio_tune.m4a'), 'the master switch is not the knob').toBe(1)
    // Off and on again at the knob is the one way to hear it again.
    await openRadio(page)
    await page.locator('[data-radio-power]').click()
    await page.waitForTimeout(600)
    await page.locator('[data-radio-power]').click()
    await page.waitForTimeout(600)
    expect(await plays(page, 'radio_tune.m4a')).toBe(2)
  })

  test('the static stations are a bed, not a two-second burst restarting', async ({ page }) => {
    await enter(page, true)
    await openRadio(page)
    await page.locator('[data-station="3"]').click()
    await page.waitForTimeout(1800)
    const src = await page.evaluate(() => [...(window.__els ?? [])].filter((e) => !e.paused).map((e) => e.currentSrc).find((s) => s.includes('radio_static')) ?? '')
    expect(src).toContain('radio_static_bed.m4a')
    const duration = await page.evaluate(() => [...(window.__els ?? [])].find((e) => e.currentSrc.includes('radio_static'))?.duration ?? 0)
    expect(duration).toBeGreaterThan(15)
  })

  test('music is one thing at a time: station, world, and back', async ({ page }) => {
    await enter(page, true)
    await page.waitForTimeout(1500)
    expect(await music(page)).toEqual(['garage.m4a'])
    await openRadio(page)
    // A: one station. B: the other, and A is gone.
    await page.locator('[data-station="3"]').click()
    await page.waitForTimeout(1800)
    expect(await music(page)).toEqual(['radio_static_bed.m4a'])
    await page.locator('[data-station="1"]').click()
    await page.waitForTimeout(900)
    expect(await music(page)).toEqual(['ambient.m4a'])
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-panel-root]')).toBeHidden()
    // Choosing that first station was the knob: its click, once.
    expect(await plays(page, 'radio_tune.m4a')).toBe(1)
    // Out through the door: the station goes before the playground's music
    // comes; never both. Sampled through the whole crossing.
    const door = page.locator('[data-object="outside-door"]')
    await door.focus()
    await page.waitForTimeout(500)
    await door.press('Enter')
    await neverTwo(page, 7000)
    await page.waitForFunction(() => !document.querySelector<HTMLElement>('[data-playground]')!.hidden)
    await page.waitForTimeout(1500)
    expect(await music(page)).toEqual(['playground.m4a'])
    // And back: the same, the other way — to the station it was on.
    await page.goBack()
    await neverTwo(page, 7000)
    await page.waitForTimeout(1500)
    expect(await music(page)).toEqual(['ambient.m4a'])
    expect(await plays(page, 'radio_tune.m4a'), 'coming back in is not switching it on').toBe(1)
  })

  test('a hidden tab is silent, and a visible one has exactly what it had', async ({ page }) => {
    await enter(page, true)
    await page.waitForTimeout(1200)
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(600)
    expect(await music(page)).toEqual([])
    // Nothing at all — not a footstep mid-air.
    expect(await page.evaluate(() => [...(window.__els ?? [])].filter((e) => !e.paused).map((e) => (e.currentSrc || e.src).split('/').pop()))).toEqual([])
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(1200)
    expect(await music(page)).toEqual(['garage.m4a'])
    expect(await plays(page, 'radio_tune.m4a'), 'the tab coming back is not the switch').toBe(0)
  })
})
